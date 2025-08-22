import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  IWorkflow,
  INode,
  IConnection,
  IExecution,
  IExecutionData,
  ExecutionStatus,
  ITaskDataConnections,
  IExecuteData,
  NodeType,
} from '../types/workflow.types';
import { nodeExecutor } from './NodeExecutor';

export interface IWorkflowExecuteAdditionalData {
  credentials?: Record<string, any>;
  variables?: Record<string, any>;
  userId?: string;
  webhookData?: any;
}

export class WorkflowEngine extends EventEmitter {
  private workflow: IWorkflow;
  private execution: IExecution;
  private additionalData: IWorkflowExecuteAdditionalData;
  private nodeExecutionOrder: string[] = [];
  private executedNodes: Set<string> = new Set();
  private nodeOutputData: Map<string, ITaskDataConnections[]> = new Map();
  private isPaused: boolean = false;
  private isCancelled: boolean = false;

  constructor(
    workflow: IWorkflow,
    additionalData: IWorkflowExecuteAdditionalData = {}
  ) {
    super();
    this.workflow = workflow;
    this.additionalData = additionalData;
    this.execution = this.initializeExecution();
  }

  private initializeExecution(): IExecution {
    return {
      id: uuidv4(),
      workflowId: this.workflow.id,
      workflowData: this.workflow,
      mode: 'manual',
      startedAt: new Date(),
      finished: false,
      data: {
        resultData: {
          runData: {},
        },
      },
      status: ExecutionStatus.RUNNING,
    };
  }

  public async execute(startNode?: string): Promise<IExecution> {
    try {
      this.emit('executionStarted', this.execution);
      
      const startNodes = startNode 
        ? [this.workflow.nodes.find(n => n.id === startNode)!]
        : this.findStartNodes();

      if (startNodes.length === 0) {
        throw new Error('No start nodes found in workflow');
      }

      for (const node of startNodes) {
        if (this.isCancelled) break;
        await this.executeNode(node);
      }

      if (this.isCancelled) {
        this.execution.status = ExecutionStatus.CANCELLED;
      } else {
        this.execution.status = ExecutionStatus.SUCCESS;
      }
      
      this.execution.finished = true;
      this.execution.stoppedAt = new Date();
      
      this.emit('executionCompleted', this.execution);
      return this.execution;
    } catch (error: any) {
      this.execution.status = ExecutionStatus.FAILED;
      this.execution.finished = true;
      this.execution.stoppedAt = new Date();
      this.execution.data.resultData.error = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      };
      
      this.emit('executionFailed', this.execution, error);
      throw error;
    }
  }

  private findStartNodes(): INode[] {
    const targetNodeIds = new Set(
      this.workflow.connections.map(c => c.target.nodeId)
    );
    
    return this.workflow.nodes.filter(node => {
      const isTrigger = node.type === NodeType.TRIGGER || 
                       node.type === NodeType.WEBHOOK || 
                       node.type === NodeType.SCHEDULE;
      const hasNoIncomingConnections = !targetNodeIds.has(node.id);
      
      return isTrigger || hasNoIncomingConnections;
    });
  }

  private async executeNode(node: INode): Promise<void> {
    if (this.executedNodes.has(node.id) && !node.executeOnce === false) {
      return;
    }

    if (node.disabled) {
      this.emit('nodeSkipped', node);
      return;
    }

    while (this.isPaused && !this.isCancelled) {
      await this.sleep(100);
    }

    if (this.isCancelled) {
      return;
    }

    this.emit('nodeExecutionStarted', node);
    this.executedNodes.add(node.id);

    try {
      const inputData = this.getNodeInputData(node);
      const startTime = new Date();
      
      const outputData = await this.processNode(node, inputData);
      
      const executionTime = new Date().getTime() - startTime.getTime();
      
      this.nodeOutputData.set(node.id, [{
        source: inputData.length > 0 ? inputData[0].source : null,
        data: outputData,
        executionTime,
        startTime,
      }]);

      if (!this.execution.data.resultData.runData[node.id]) {
        this.execution.data.resultData.runData[node.id] = [];
      }
      
      this.execution.data.resultData.runData[node.id].push({
        source: inputData.length > 0 ? inputData[0].source : null,
        data: outputData,
        executionTime,
        startTime,
      });

      this.emit('nodeExecutionCompleted', node, outputData);

      const nextNodes = this.getNextNodes(node);
      for (const nextNode of nextNodes) {
        if (this.isCancelled) break;
        await this.executeNode(nextNode);
      }
    } catch (error: any) {
      if (node.continueOnFail) {
        this.emit('nodeExecutionFailed', node, error);
        
        this.nodeOutputData.set(node.id, [{
          source: null,
          data: [{ error: error.message }],
        }]);

        const nextNodes = this.getNextNodes(node);
        for (const nextNode of nextNodes) {
          if (this.isCancelled) break;
          await this.executeNode(nextNode);
        }
      } else if (node.retryOnFail && (node.maxRetries || 0) > 0) {
        let retryCount = 0;
        let lastError = error;
        
        while (retryCount < (node.maxRetries || 0)) {
          await this.sleep(node.waitBetweenRetries || 1000);
          
          try {
            const inputData = this.getNodeInputData(node);
            const outputData = await this.processNode(node, inputData);
            
            this.nodeOutputData.set(node.id, [{
              source: inputData.length > 0 ? inputData[0].source : null,
              data: outputData,
            }]);
            
            this.emit('nodeExecutionCompleted', node, outputData);
            
            const nextNodes = this.getNextNodes(node);
            for (const nextNode of nextNodes) {
              if (this.isCancelled) break;
              await this.executeNode(nextNode);
            }
            
            return;
          } catch (retryError: any) {
            lastError = retryError;
            retryCount++;
            this.emit('nodeRetryAttempt', node, retryCount, retryError);
          }
        }
        
        throw lastError;
      } else {
        throw error;
      }
    }
  }

  private getNodeInputData(node: INode): ITaskDataConnections[] {
    const incomingConnections = this.workflow.connections.filter(
      c => c.target.nodeId === node.id
    );

    if (incomingConnections.length === 0) {
      return [{
        source: null,
        data: [{}],
      }];
    }

    const inputData: ITaskDataConnections[] = [];

    for (const connection of incomingConnections) {
      const sourceNodeData = this.nodeOutputData.get(connection.source.nodeId);
      
      if (sourceNodeData) {
        const outputIndex = connection.source.outputIndex || 0;
        if (sourceNodeData[outputIndex]) {
          inputData.push({
            source: {
              previousNode: connection.source.nodeId,
              previousNodeOutput: outputIndex,
            },
            data: sourceNodeData[outputIndex].data,
          });
        }
      }
    }

    return inputData.length > 0 ? inputData : [{
      source: null,
      data: [{}],
    }];
  }

  private async processNode(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    try {
      // Use the advanced NodeExecutor for all node execution
      const executionContext = {
        node,
        inputData,
        credentials: this.additionalData.credentials,
        variables: this.additionalData.variables,
        userId: this.additionalData.userId,
        workflowId: this.workflow.id,
        executionId: this.execution.id,
      };

      const result = await nodeExecutor.executeNode(executionContext);
      
      // Convert result to expected format if needed
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      // Fall back to basic node processing for unknown types
      return this.executeBasicNode(node, inputData);
    }
  }

  private async executeBasicNode(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    switch (node.type) {
      case NodeType.TRANSFORMER:
        return this.executeTransformer(node, inputData);
      case NodeType.CONDITION:
        return this.executeCondition(node, inputData);
      case NodeType.LOOP:
        return this.executeLoop(node, inputData);
      case NodeType.CODE:
        return this.executeCode(node, inputData);
      case NodeType.DELAY:
        return this.executeDelay(node, inputData);
      case NodeType.MERGE:
        return this.executeMerge(node, inputData);
      case NodeType.SPLIT:
        return this.executeSplit(node, inputData);
      default:
        return inputData.length > 0 ? inputData[0].data : [{}];
    }
  }


  private async executeTransformer(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    const results = [];

    for (const input of inputData) {
      for (const item of input.data) {
        const transformed = { ...item };
        
        if (node.parameters.operations) {
          for (const operation of node.parameters.operations) {
            switch (operation.type) {
              case 'set':
                transformed[operation.field] = this.resolveExpression(operation.value, item);
                break;
              case 'remove':
                delete transformed[operation.field];
                break;
              case 'rename':
                transformed[operation.newField] = transformed[operation.field];
                delete transformed[operation.field];
                break;
            }
          }
        }

        results.push(transformed);
      }
    }

    return results;
  }

  private async executeCondition(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    const results = [];

    for (const input of inputData) {
      for (const item of input.data) {
        const condition = node.parameters.condition;
        let conditionMet = false;

        switch (condition.operator) {
          case 'equals':
            conditionMet = item[condition.field] === condition.value;
            break;
          case 'notEquals':
            conditionMet = item[condition.field] !== condition.value;
            break;
          case 'contains':
            conditionMet = String(item[condition.field]).includes(String(condition.value));
            break;
          case 'greater':
            conditionMet = Number(item[condition.field]) > Number(condition.value);
            break;
          case 'less':
            conditionMet = Number(item[condition.field]) < Number(condition.value);
            break;
          case 'isEmpty':
            conditionMet = !item[condition.field] || item[condition.field].length === 0;
            break;
          case 'isNotEmpty':
            conditionMet = !!item[condition.field] && item[condition.field].length > 0;
            break;
        }

        if (conditionMet) {
          results.push(item);
        }
      }
    }

    return results;
  }

  private async executeLoop(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    const results = [];
    const iterations = node.parameters.iterations || 1;

    for (const input of inputData) {
      for (const item of input.data) {
        for (let i = 0; i < iterations; i++) {
          results.push({
            ...item,
            $iteration: i,
          });
        }
      }
    }

    return results;
  }

  private async executeCode(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    const code = node.parameters.code;
    const results = [];

    for (const input of inputData) {
      for (const item of input.data) {
        try {
          const func = new Function('$input', '$variables', code);
          const result = func(item, this.additionalData.variables || {});
          results.push(result);
        } catch (error: any) {
          if (node.continueOnFail) {
            results.push({ error: error.message });
          } else {
            throw error;
          }
        }
      }
    }

    return results;
  }

  private async executeDelay(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    const delay = node.parameters.delay || 1000;
    await this.sleep(delay);
    return inputData.length > 0 ? inputData[0].data : [{}];
  }

  private async executeMerge(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    const mergeMode = node.parameters.mode || 'append';
    const results = [];

    switch (mergeMode) {
      case 'append':
        for (const input of inputData) {
          results.push(...input.data);
        }
        break;
      case 'combine':
        const combined: any = {};
        for (const input of inputData) {
          for (const item of input.data) {
            Object.assign(combined, item);
          }
        }
        results.push(combined);
        break;
      case 'multiplex':
        const maxLength = Math.max(...inputData.map(input => input.data.length));
        for (let i = 0; i < maxLength; i++) {
          const multiplexed: any = {};
          for (let j = 0; j < inputData.length; j++) {
            if (inputData[j].data[i]) {
              multiplexed[`input${j}`] = inputData[j].data[i];
            }
          }
          results.push(multiplexed);
        }
        break;
    }

    return results;
  }

  private async executeSplit(node: INode, inputData: ITaskDataConnections[]): Promise<any[]> {
    const field = node.parameters.field;
    const results = [];

    for (const input of inputData) {
      for (const item of input.data) {
        const value = item[field];
        if (Array.isArray(value)) {
          for (const element of value) {
            results.push({
              ...item,
              [field]: element,
            });
          }
        } else {
          results.push(item);
        }
      }
    }

    return results;
  }

  private getNextNodes(node: INode): INode[] {
    const outgoingConnections = this.workflow.connections.filter(
      c => c.source.nodeId === node.id
    );

    return outgoingConnections.map(connection => 
      this.workflow.nodes.find(n => n.id === connection.target.nodeId)!
    ).filter(n => n !== undefined);
  }

  private resolveExpression(expression: string, data: any): any {
    if (typeof expression !== 'string') {
      return expression;
    }

    return expression.replace(/\{\{(.+?)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value = data;
      
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          return match;
        }
      }
      
      return value !== undefined ? value : match;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public pause(): void {
    this.isPaused = true;
    this.emit('executionPaused', this.execution);
  }

  public resume(): void {
    this.isPaused = false;
    this.emit('executionResumed', this.execution);
  }

  public cancel(): void {
    this.isCancelled = true;
    this.emit('executionCancelled', this.execution);
  }

  public getExecution(): IExecution {
    return this.execution;
  }

  public getNodeOutputData(nodeId: string): ITaskDataConnections[] | undefined {
    return this.nodeOutputData.get(nodeId);
  }
}