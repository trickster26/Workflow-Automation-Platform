import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FaCodeBranch } from 'react-icons/fa';
import './nodes.css';

export const ConditionNode = memo<NodeProps>(({ data, selected }) => {
  return (
    <div className={`custom-node condition-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="handle handle-target"
        style={{ background: data.color || '#f59e0b' }}
      />
      <div className="node-header" style={{ backgroundColor: data.color || '#f59e0b' }}>
        <div className="node-icon">
          {React.isValidElement(data.icon) ? data.icon : (typeof data.icon === 'function' ? React.createElement(data.icon) : <FaCodeBranch />)}
        </div>
        <div className="node-title">{data.label}</div>
      </div>
      <div className="node-body">
        {data.description && (
          <div className="node-description">{data.description}</div>
        )}
        {data.parameters?.condition && (
          <div className="condition-display">
            <span className="condition-field">{data.parameters.condition.field}</span>
            <span className="condition-operator">{data.parameters.condition.operator}</span>
            <span className="condition-value">{data.parameters.condition.value}</span>
          </div>
        )}
      </div>
      <div className="condition-outputs">
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className="handle handle-source handle-true"
          style={{ top: '30%', background: '#10b981' }}
        />
        <div className="output-label output-true">True</div>
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="handle handle-source handle-false"
          style={{ top: '70%', background: '#ef4444' }}
        />
        <div className="output-label output-false">False</div>
      </div>
    </div>
  );
});