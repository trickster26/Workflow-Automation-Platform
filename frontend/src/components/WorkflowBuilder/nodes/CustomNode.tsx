import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FaCube } from 'react-icons/fa';
import './nodes.css';

export const CustomNode = memo<NodeProps>(({ data, selected }) => {
  const hasInput = data.type !== 'trigger' && data.type !== 'manual' && data.type !== 'schedule';
  const hasOutput = true;

  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`}>
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="handle handle-target"
          style={{ background: data.color || '#6366f1' }}
        />
      )}
      <div className="node-header" style={{ backgroundColor: data.color || '#6366f1' }}>
        <div className="node-icon">
          {React.isValidElement(data.icon) ? data.icon : (typeof data.icon === 'function' ? React.createElement(data.icon) : <FaCube />)}
        </div>
        <div className="node-title">{data.label}</div>
      </div>
      <div className="node-body">
        {data.description && (
          <div className="node-description">{data.description}</div>
        )}
        {data.parameters && Object.keys(data.parameters).length > 0 && (
          <div className="node-params">
            {Object.entries(data.parameters).slice(0, 3).map(([key, value]: [string, any]) => (
              <div key={key} className="param-item">
                <span className="param-key">{key}:</span>
                <span className="param-value">{String(value)}</span>
              </div>
            ))}
            {Object.keys(data.parameters).length > 3 && (
              <div className="param-more">+{Object.keys(data.parameters).length - 3} more</div>
            )}
          </div>
        )}
      </div>
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="handle handle-source"
          style={{ background: data.color || '#6366f1' }}
        />
      )}
    </div>
  );
});