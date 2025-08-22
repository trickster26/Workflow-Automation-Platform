export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error'
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  WAITING = 'waiting'
}

export enum NodeType {
  TRIGGER = 'trigger',
  ACTION = 'action',
  CONDITION = 'condition',
  LOOP = 'loop',
  TRANSFORMER = 'transformer',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  HTTP_REQUEST = 'http_request',
  DATABASE = 'database',
  EMAIL = 'email',
  DELAY = 'delay',
  CODE = 'code',
  MERGE = 'merge',
  SPLIT = 'split'
}

export interface Position {
  x: number;
  y: number;
}

export interface INode {
  id: string;
  name: string;
  type: NodeType;
  typeVersion: number;
  position: Position;
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
  disabled?: boolean;
  notes?: string;
  retryOnFail?: boolean;
  maxRetries?: number;
  waitBetweenRetries?: number;
  continueOnFail?: boolean;
  executeOnce?: boolean;
}

export interface IConnection {
  source: {
    nodeId: string;
    outputIndex: number;
  };
  target: {
    nodeId: string;
    inputIndex: number;
  };
}

export interface IWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: INode[];
  connections: IConnection[];
  settings?: IWorkflowSettings;
  staticData?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  active: boolean;
  status: WorkflowStatus;
  version: number;
}

export interface IWorkflowSettings {
  errorWorkflow?: string;
  timezone?: string;
  saveDataSuccessExecution?: boolean;
  saveDataErrorExecution?: boolean;
  saveManualExecutions?: boolean;
  executionTimeout?: number;
  maxExecutionTime?: number;
  retryOnFail?: boolean;
  maxRetries?: number;
  waitBetweenRetries?: number;
}

export interface IExecution {
  id: string;
  workflowId: string;
  workflowData: IWorkflow;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry' | 'integrated' | 'cli';
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  retryOf?: string;
  retrySuccessId?: string;
  data: IExecutionData;
  status: ExecutionStatus;
  waitTill?: string;
}

export interface IExecutionData {
  startData?: {
    destinationNode?: string;
    runNodeFilter?: string[];
  };
  resultData: {
    runData: Record<string, ITaskDataConnections[]>;
    lastNodeExecuted?: string;
    error?: IExecutionError;
  };
}

export interface ITaskDataConnections {
  source: ITaskDataConnectionsSource | null;
  data: Record<string, any>[];
  executionTime?: number;
  startTime?: string;
}

export interface ITaskDataConnectionsSource {
  previousNode: string;
  previousNodeOutput?: number;
  previousNodeRun?: number;
}

export interface IExecutionError {
  message: string;
  stack?: string;
  node?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  group: string[];
  version: number;
  description: string;
  defaults: {
    name: string;
    color?: string;
  };
  inputs: string[];
  outputs: string[];
  credentials?: NodeCredential[];
  properties: NodeParameter[];
  icon?: string;
}

export interface NodeCredential {
  name: string;
  required?: boolean;
}

export interface NodeParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'options' | 'collection';
  displayName: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{
    name: string;
    value: string | number;
  }>;
  displayOptions?: {
    show?: Record<string, any>;
    hide?: Record<string, any>;
  };
}

export interface ExecutionMetrics {
  total: number;
  success: number;
  failed: number;
  cancelled: number;
  pending: number;
  running: number;
  averageExecutionTime: number;
  successRate: number;
}

export interface QueueStats {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  jobs: {
    waiting: any[];
    active: any[];
    failed: any[];
  };
}