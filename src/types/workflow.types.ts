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

export enum TriggerType {
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  EVENT = 'event',
  EMAIL = 'email',
  FILE_WATCH = 'file_watch'
}

export interface Position {
  x: number;
  y: number;
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

export interface NodeCredential {
  name: string;
  required?: boolean;
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
  codex?: {
    categories?: string[];
    subcategories?: Record<string, string[]>;
    resources?: Record<string, any>;
  };
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
  createdAt: Date;
  updatedAt: Date;
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

export interface IExecutionData {
  startData?: {
    destinationNode?: string;
    runNodeFilter?: string[];
  };
  resultData: {
    runData: Record<string, ITaskDataConnections[]>;
    lastNodeExecuted?: string;
    error?: IExecutionError;
    executionData?: {
      contextData: Record<string, any>;
      nodeExecutionStack: IExecuteData[];
      waitingExecution: Record<string, IWaitingForExecution>;
      waitingExecutionSource: Record<string, IWaitingForExecutionSource>;
    };
  };
  executionData?: {
    startTime: Date;
    endTime?: Date;
    executionTime?: number;
  };
}

export interface ITaskDataConnections {
  source: ITaskDataConnectionsSource | null;
  data: Record<string, any>[];
  executionTime?: number;
  startTime?: Date;
}

export interface ITaskDataConnectionsSource {
  previousNode: string;
  previousNodeOutput?: number;
  previousNodeRun?: number;
}

export interface IExecuteData {
  node: INode;
  data: Record<string, any>;
  source: ITaskDataConnectionsSource | null;
}

export interface IWaitingForExecution {
  nodeId: string;
  data: Record<string, any>;
}

export interface IWaitingForExecutionSource {
  nodeId: string;
  outputIndex: number;
}

export interface IExecutionError {
  message: string;
  stack?: string;
  node?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface IExecution {
  id: string;
  workflowId: string;
  workflowData: IWorkflow;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry' | 'integrated' | 'cli';
  startedAt: Date;
  stoppedAt?: Date;
  finished: boolean;
  retryOf?: string;
  retrySuccessId?: string;
  data: IExecutionData;
  status: ExecutionStatus;
  waitTill?: Date;
}

export interface ICredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: INodeProperties[];
  authenticate?: IAuthenticate;
}

export interface INodeProperties {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'collection' | 'fixedCollection' | 'json';
  typeOptions?: {
    password?: boolean;
    multipleValues?: boolean;
    multipleValueButtonText?: string;
    loadOptionsMethod?: string;
  };
  default?: any;
  required?: boolean;
  displayOptions?: {
    show?: Record<string, any>;
    hide?: Record<string, any>;
  };
  options?: Array<{
    name: string;
    value: string | number;
    description?: string;
  }>;
  placeholder?: string;
  description?: string;
  hint?: string;
}

export interface IAuthenticate {
  type: 'generic' | 'oauth1' | 'oauth2';
  properties: Record<string, any>;
}

export interface IWebhookData {
  id: string;
  workflowId: string;
  nodeId: string;
  webhookId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  isFullPath?: boolean;
  staticData?: Record<string, any>;
  responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
  responseData?: string;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  isTest?: boolean;
}

export interface ITriggerData {
  id: string;
  workflowId: string;
  nodeId: string;
  type: TriggerType;
  schedule?: string;
  event?: string;
  active: boolean;
  lastTriggered?: Date;
  nextTrigger?: Date;
  metadata?: Record<string, any>;
}

export interface IUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  settings?: IUserSettings;
}

export interface IUserSettings {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    executionErrors?: boolean;
    executionSuccess?: boolean;
  };
}

export interface IVariable {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITag {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}