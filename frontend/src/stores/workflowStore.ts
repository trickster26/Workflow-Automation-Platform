import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { IWorkflow, INode, IConnection, NodeType, WorkflowStatus } from '@/types/workflow';

interface WorkflowState {
  currentWorkflow: IWorkflow | null;
  workflows: IWorkflow[];
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  isExecuting: boolean;
  executionProgress: Record<string, 'idle' | 'running' | 'success' | 'error'>;
  
  // Actions
  setCurrentWorkflow: (workflow: IWorkflow | null) => void;
  setWorkflows: (workflows: IWorkflow[]) => void;
  selectNode: (nodeId: string | null) => void;
  selectConnection: (connectionId: string | null) => void;
  addNode: (nodeType: string, position: { x: number; y: number }) => string;
  updateNode: (nodeId: string, updates: Partial<INode>) => void;
  deleteNode: (nodeId: string) => void;
  addConnection: (source: string, target: string) => void;
  deleteConnection: (connectionId: string) => void;
  updateWorkflow: (updates: Partial<IWorkflow>) => void;
  setExecutionState: (isExecuting: boolean) => void;
  setNodeExecutionState: (nodeId: string, state: 'idle' | 'running' | 'success' | 'error') => void;
  clearExecutionStates: () => void;
  createNewWorkflow: () => IWorkflow;
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    (set, get) => ({
      currentWorkflow: null,
      workflows: [],
      selectedNodeId: null,
      selectedConnectionId: null,
      isExecuting: false,
      executionProgress: {},

      setCurrentWorkflow: (workflow) => 
        set({ currentWorkflow: workflow }, false, 'setCurrentWorkflow'),

      setWorkflows: (workflows) => 
        set({ workflows }, false, 'setWorkflows'),

      selectNode: (nodeId) => 
        set({ selectedNodeId: nodeId, selectedConnectionId: null }, false, 'selectNode'),

      selectConnection: (connectionId) => 
        set({ selectedConnectionId: connectionId, selectedNodeId: null }, false, 'selectConnection'),

      addNode: (nodeType, position) => {
        const state = get();
        if (!state.currentWorkflow) return '';

        const nodeId = `node_${uuidv4()}`;
        const newNode: INode = {
          id: nodeId,
          name: getDefaultNodeName(nodeType),
          type: nodeType as NodeType,
          typeVersion: 1,
          position,
          parameters: getDefaultNodeParameters(nodeType),
          disabled: false,
          retryOnFail: false,
          continueOnFail: false,
          executeOnce: true,
        };

        const updatedWorkflow = {
          ...state.currentWorkflow,
          nodes: [...state.currentWorkflow.nodes, newNode],
          updatedAt: new Date().toISOString(),
        };

        set({ currentWorkflow: updatedWorkflow }, false, 'addNode');
        return nodeId;
      },

      updateNode: (nodeId, updates) => {
        const state = get();
        if (!state.currentWorkflow) return;

        const updatedWorkflow = {
          ...state.currentWorkflow,
          nodes: state.currentWorkflow.nodes.map(node =>
            node.id === nodeId ? { ...node, ...updates } : node
          ),
          updatedAt: new Date().toISOString(),
        };

        set({ currentWorkflow: updatedWorkflow }, false, 'updateNode');
      },

      deleteNode: (nodeId) => {
        const state = get();
        if (!state.currentWorkflow) return;

        const updatedWorkflow = {
          ...state.currentWorkflow,
          nodes: state.currentWorkflow.nodes.filter(node => node.id !== nodeId),
          connections: state.currentWorkflow.connections.filter(
            connection => 
              connection.source.nodeId !== nodeId && 
              connection.target.nodeId !== nodeId
          ),
          updatedAt: new Date().toISOString(),
        };

        set({ 
          currentWorkflow: updatedWorkflow,
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        }, false, 'deleteNode');
      },

      addConnection: (sourceNodeId, targetNodeId) => {
        const state = get();
        if (!state.currentWorkflow) return;

        const connectionId = `connection_${uuidv4()}`;
        const newConnection: IConnection = {
          source: {
            nodeId: sourceNodeId,
            outputIndex: 0,
          },
          target: {
            nodeId: targetNodeId,
            inputIndex: 0,
          },
        };

        const updatedWorkflow = {
          ...state.currentWorkflow,
          connections: [...state.currentWorkflow.connections, newConnection],
          updatedAt: new Date().toISOString(),
        };

        set({ currentWorkflow: updatedWorkflow }, false, 'addConnection');
      },

      deleteConnection: (connectionId) => {
        const state = get();
        if (!state.currentWorkflow) return;

        const updatedWorkflow = {
          ...state.currentWorkflow,
          connections: state.currentWorkflow.connections.filter(
            (_, index) => `connection_${index}` !== connectionId
          ),
          updatedAt: new Date().toISOString(),
        };

        set({ 
          currentWorkflow: updatedWorkflow,
          selectedConnectionId: state.selectedConnectionId === connectionId ? null : state.selectedConnectionId,
        }, false, 'deleteConnection');
      },

      updateWorkflow: (updates) => {
        const state = get();
        if (!state.currentWorkflow) return;

        const updatedWorkflow = {
          ...state.currentWorkflow,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        set({ currentWorkflow: updatedWorkflow }, false, 'updateWorkflow');
      },

      setExecutionState: (isExecuting) => 
        set({ isExecuting }, false, 'setExecutionState'),

      setNodeExecutionState: (nodeId, state) => {
        const currentStates = get().executionProgress;
        set({
          executionProgress: {
            ...currentStates,
            [nodeId]: state,
          }
        }, false, 'setNodeExecutionState');
      },

      clearExecutionStates: () => 
        set({ executionProgress: {} }, false, 'clearExecutionStates'),

      createNewWorkflow: () => {
        const newWorkflow: IWorkflow = {
          id: uuidv4(),
          name: 'New Workflow',
          description: '',
          nodes: [],
          connections: [],
          settings: {},
          staticData: {},
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: false,
          status: WorkflowStatus.DRAFT,
          version: 1,
        };

        set({ currentWorkflow: newWorkflow }, false, 'createNewWorkflow');
        return newWorkflow;
      },
    }),
    {
      name: 'workflow-store',
    }
  )
);

function getDefaultNodeName(nodeType: string): string {
  const names: Record<string, string> = {
    [NodeType.HTTP_REQUEST]: 'HTTP Request',
    [NodeType.WEBHOOK]: 'Webhook',
    [NodeType.SCHEDULE]: 'Schedule Trigger',
    [NodeType.TRANSFORMER]: 'Transform Data',
    [NodeType.CONDITION]: 'IF',
    [NodeType.LOOP]: 'Loop',
    [NodeType.CODE]: 'Code',
    [NodeType.DELAY]: 'Delay',
    [NodeType.MERGE]: 'Merge',
    [NodeType.SPLIT]: 'Split',
    [NodeType.EMAIL]: 'Email',
    [NodeType.DATABASE]: 'Database',
  };

  return names[nodeType] || 'Node';
}

function getDefaultNodeParameters(nodeType: string): Record<string, any> {
  const defaultParams: Record<string, Record<string, any>> = {
    [NodeType.HTTP_REQUEST]: {
      method: 'GET',
      url: '',
      headers: {},
    },
    [NodeType.WEBHOOK]: {
      path: '/webhook',
      method: 'POST',
      responseMode: 'onReceived',
    },
    [NodeType.SCHEDULE]: {
      cronExpression: '0 * * * *',
      timezone: 'UTC',
    },
    [NodeType.TRANSFORMER]: {
      operations: [],
    },
    [NodeType.CONDITION]: {
      conditions: {},
    },
    [NodeType.LOOP]: {
      iterations: 1,
    },
    [NodeType.CODE]: {
      language: 'javascript',
      code: '// Your code here\nreturn $input;',
    },
    [NodeType.DELAY]: {
      delay: 1000,
    },
    [NodeType.MERGE]: {
      mode: 'append',
    },
    [NodeType.SPLIT]: {
      batchSize: 10,
    },
    [NodeType.EMAIL]: {
      to: '',
      subject: '',
      body: '',
    },
    [NodeType.DATABASE]: {
      operation: 'select',
      table: '',
      query: '',
    },
  };

  return defaultParams[nodeType] || {};
}