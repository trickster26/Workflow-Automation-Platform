import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import clsx from 'clsx';
import {
  GlobeIcon,
  ClockIcon,
  CodeIcon,
  DatabaseIcon,
  MailIcon,
  ZapIcon,
  GitBranchIcon,
  RepeatIcon,
  PauseIcon,
  MergeIcon,
  SplitIcon,
  WrenchIcon,
} from 'lucide-react';
import { NodeType } from '@/types/workflow';

interface CustomNodeData {
  id: string;
  name: string;
  type: NodeType;
  disabled?: boolean;
  executionState: 'idle' | 'running' | 'success' | 'error';
  isSelected: boolean;
}

const nodeIcons = {
  [NodeType.HTTP_REQUEST]: GlobeIcon,
  [NodeType.WEBHOOK]: ZapIcon,
  [NodeType.SCHEDULE]: ClockIcon,
  [NodeType.TRANSFORMER]: WrenchIcon,
  [NodeType.CONDITION]: GitBranchIcon,
  [NodeType.LOOP]: RepeatIcon,
  [NodeType.CODE]: CodeIcon,
  [NodeType.DELAY]: PauseIcon,
  [NodeType.MERGE]: MergeIcon,
  [NodeType.SPLIT]: SplitIcon,
  [NodeType.EMAIL]: MailIcon,
  [NodeType.DATABASE]: DatabaseIcon,
  [NodeType.TRIGGER]: ZapIcon,
};

const nodeColors = {
  [NodeType.HTTP_REQUEST]: 'bg-blue-100 border-blue-300 text-blue-700',
  [NodeType.WEBHOOK]: 'bg-orange-100 border-orange-300 text-orange-700',
  [NodeType.SCHEDULE]: 'bg-green-100 border-green-300 text-green-700',
  [NodeType.TRANSFORMER]: 'bg-purple-100 border-purple-300 text-purple-700',
  [NodeType.CONDITION]: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  [NodeType.LOOP]: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  [NodeType.CODE]: 'bg-gray-100 border-gray-300 text-gray-700',
  [NodeType.DELAY]: 'bg-slate-100 border-slate-300 text-slate-700',
  [NodeType.MERGE]: 'bg-pink-100 border-pink-300 text-pink-700',
  [NodeType.SPLIT]: 'bg-cyan-100 border-cyan-300 text-cyan-700',
  [NodeType.EMAIL]: 'bg-red-100 border-red-300 text-red-700',
  [NodeType.DATABASE]: 'bg-indigo-100 border-indigo-300 text-indigo-700',
  [NodeType.TRIGGER]: 'bg-orange-100 border-orange-300 text-orange-700',
};

export const CustomNode = memo<NodeProps<CustomNodeData>>(({ data, selected }) => {
  const Icon = nodeIcons[data.type] || ZapIcon;
  const baseColors = nodeColors[data.type] || 'bg-gray-100 border-gray-300 text-gray-700';
  
  const nodeClassName = clsx(
    'px-4 py-3 shadow-md rounded-lg border-2 min-w-[160px] transition-all duration-200',
    {
      [baseColors]: data.executionState === 'idle',
      'node-running border-yellow-400 bg-yellow-50': data.executionState === 'running',
      'node-success border-green-500 bg-green-50': data.executionState === 'success',
      'node-error border-red-500 bg-red-50': data.executionState === 'error',
      'node-disabled opacity-60': data.disabled,
      'ring-2 ring-primary-500 ring-offset-2': selected,
      'hover:shadow-lg': !data.disabled,
    }
  );

  // Determine if node should have input/output handles
  const hasInput = ![NodeType.WEBHOOK, NodeType.SCHEDULE, NodeType.TRIGGER].includes(data.type);
  const hasOutput = true;

  return (
    <div className={nodeClassName}>
      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id="input-0"
          className="w-3 h-3 !bg-gray-400 border-2 border-white"
        />
      )}

      {/* Node Content */}
      <div className="flex items-center space-x-3">
        <div className={clsx(
          'flex items-center justify-center w-8 h-8 rounded-full',
          data.executionState === 'running' ? 'bg-yellow-200' :
          data.executionState === 'success' ? 'bg-green-200' :
          data.executionState === 'error' ? 'bg-red-200' :
          'bg-white'
        )}>
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-sm truncate" title={data.name}>
            {data.name}
          </div>
          <div className="text-xs opacity-70 capitalize">
            {data.type.replace('_', ' ')}
          </div>
        </div>

        {/* Execution State Indicator */}
        {data.executionState === 'running' && (
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        )}
        {data.executionState === 'success' && (
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        )}
        {data.executionState === 'error' && (
          <div className="w-2 h-2 bg-red-500 rounded-full" />
        )}
      </div>

      {/* Output Handle */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id="output-0"
          className="w-3 h-3 !bg-gray-400 border-2 border-white"
        />
      )}

      {/* Disabled Overlay */}
      {data.disabled && (
        <div className="absolute inset-0 bg-gray-200 bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="text-xs font-medium text-gray-600">Disabled</div>
        </div>
      )}
    </div>
  );
});