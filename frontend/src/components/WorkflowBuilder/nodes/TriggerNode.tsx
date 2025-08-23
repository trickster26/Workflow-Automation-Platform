import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FaPlay } from 'react-icons/fa';
import './nodes.css';

export const TriggerNode = memo<NodeProps>(({ data, selected }) => {
  return (
    <div className={`custom-node trigger-node ${selected ? 'selected' : ''}`}>
      <div className="node-header" style={{ backgroundColor: data.color || '#10b981' }}>
        <div className="node-icon">
          {React.isValidElement(data.icon) ? data.icon : (typeof data.icon === 'function' ? React.createElement(data.icon) : <FaPlay />)}
        </div>
        <div className="node-title">{data.label}</div>
      </div>
      <div className="node-body">
        {data.description && (
          <div className="node-description">{data.description}</div>
        )}
        {data.parameters && Object.keys(data.parameters).length > 0 && (
          <div className="node-params">
            {Object.entries(data.parameters).slice(0, 2).map(([key, value]: [string, any]) => (
              <div key={key} className="param-item">
                <span className="param-key">{key}:</span>
                <span className="param-value">{String(value)}</span>
              </div>
            ))}
            {Object.keys(data.parameters).length > 2 && (
              <div className="param-more">+{Object.keys(data.parameters).length - 2} more</div>
            )}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="handle handle-source"
        style={{ background: data.color || '#10b981' }}
      />
    </div>
  );
});