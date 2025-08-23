import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { FaTimes, FaSave } from 'react-icons/fa';
import './NodeConfigPanel.css';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (data: any) => void;
  onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onUpdate,
  onClose,
}) => {
  const [formData, setFormData] = useState<any>({
    label: node.data.label || '',
    description: node.data.description || '',
    parameters: node.data.parameters || {},
  });

  useEffect(() => {
    setFormData({
      label: node.data.label || '',
      description: node.data.description || '',
      parameters: node.data.parameters || {},
    });
  }, [node]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleParameterChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }));
  };

  const handleAddParameter = () => {
    const key = prompt('Enter parameter name:');
    if (key) {
      handleParameterChange(key, '');
    }
  };

  const handleRemoveParameter = (key: string) => {
    setFormData((prev: any) => {
      const newParams = { ...prev.parameters };
      delete newParams[key];
      return {
        ...prev,
        parameters: newParams,
      };
    });
  };

  const handleSave = () => {
    onUpdate(formData);
  };

  const renderNodeSpecificFields = () => {
    switch (node.data.type) {
      case 'http':
        return (
          <>
            <div className="form-group">
              <label>URL</label>
              <input
                type="text"
                value={formData.parameters.url || ''}
                onChange={(e) => handleParameterChange('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div className="form-group">
              <label>Method</label>
              <select
                value={formData.parameters.method || 'GET'}
                onChange={(e) => handleParameterChange('method', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="form-group">
              <label>Headers (JSON)</label>
              <textarea
                value={formData.parameters.headers || '{}'}
                onChange={(e) => handleParameterChange('headers', e.target.value)}
                placeholder='{"Content-Type": "application/json"}'
                rows={3}
              />
            </div>
            {['POST', 'PUT', 'PATCH'].includes(formData.parameters.method) && (
              <div className="form-group">
                <label>Body (JSON)</label>
                <textarea
                  value={formData.parameters.body || '{}'}
                  onChange={(e) => handleParameterChange('body', e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={4}
                />
              </div>
            )}
          </>
        );

      case 'email':
        return (
          <>
            <div className="form-group">
              <label>To</label>
              <input
                type="email"
                value={formData.parameters.to || ''}
                onChange={(e) => handleParameterChange('to', e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                value={formData.parameters.subject || ''}
                onChange={(e) => handleParameterChange('subject', e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="form-group">
              <label>Body</label>
              <textarea
                value={formData.parameters.body || ''}
                onChange={(e) => handleParameterChange('body', e.target.value)}
                placeholder="Email body content"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.parameters.isHtml || false}
                  onChange={(e) => handleParameterChange('isHtml', e.target.checked)}
                />
                Send as HTML
              </label>
            </div>
          </>
        );

      case 'database':
        return (
          <>
            <div className="form-group">
              <label>Operation</label>
              <select
                value={formData.parameters.operation || 'select'}
                onChange={(e) => handleParameterChange('operation', e.target.value)}
              >
                <option value="select">SELECT</option>
                <option value="insert">INSERT</option>
                <option value="update">UPDATE</option>
                <option value="delete">DELETE</option>
                <option value="custom">Custom Query</option>
              </select>
            </div>
            <div className="form-group">
              <label>Table</label>
              <input
                type="text"
                value={formData.parameters.table || ''}
                onChange={(e) => handleParameterChange('table', e.target.value)}
                placeholder="table_name"
              />
            </div>
            {formData.parameters.operation === 'custom' && (
              <div className="form-group">
                <label>Query</label>
                <textarea
                  value={formData.parameters.query || ''}
                  onChange={(e) => handleParameterChange('query', e.target.value)}
                  placeholder="SELECT * FROM table WHERE condition"
                  rows={3}
                />
              </div>
            )}
          </>
        );

      case 'condition':
        return (
          <>
            <div className="form-group">
              <label>Field</label>
              <input
                type="text"
                value={formData.parameters.condition?.field || ''}
                onChange={(e) =>
                  handleParameterChange('condition', {
                    ...formData.parameters.condition,
                    field: e.target.value,
                  })
                }
                placeholder="field_name"
              />
            </div>
            <div className="form-group">
              <label>Operator</label>
              <select
                value={formData.parameters.condition?.operator || 'equals'}
                onChange={(e) =>
                  handleParameterChange('condition', {
                    ...formData.parameters.condition,
                    operator: e.target.value,
                  })
                }
              >
                <option value="equals">Equals</option>
                <option value="notEquals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="greater">Greater Than</option>
                <option value="less">Less Than</option>
                <option value="isEmpty">Is Empty</option>
                <option value="isNotEmpty">Is Not Empty</option>
              </select>
            </div>
            <div className="form-group">
              <label>Value</label>
              <input
                type="text"
                value={formData.parameters.condition?.value || ''}
                onChange={(e) =>
                  handleParameterChange('condition', {
                    ...formData.parameters.condition,
                    value: e.target.value,
                  })
                }
                placeholder="comparison value"
              />
            </div>
          </>
        );

      case 'code':
        return (
          <>
            <div className="form-group">
              <label>Language</label>
              <select
                value={formData.parameters.language || 'javascript'}
                onChange={(e) => handleParameterChange('language', e.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="sql">SQL</option>
              </select>
            </div>
            <div className="form-group">
              <label>Code</label>
              <textarea
                value={formData.parameters.code || ''}
                onChange={(e) => handleParameterChange('code', e.target.value)}
                placeholder="// Your code here&#10;return $input;"
                rows={8}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
          </>
        );

      case 'schedule':
        return (
          <>
            <div className="form-group">
              <label>Schedule Type</label>
              <select
                value={formData.parameters.scheduleType || 'cron'}
                onChange={(e) => handleParameterChange('scheduleType', e.target.value)}
              >
                <option value="cron">Cron Expression</option>
                <option value="interval">Interval</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {formData.parameters.scheduleType === 'cron' && (
              <div className="form-group">
                <label>Cron Expression</label>
                <input
                  type="text"
                  value={formData.parameters.cronExpression || ''}
                  onChange={(e) => handleParameterChange('cronExpression', e.target.value)}
                  placeholder="0 0 * * * (every hour)"
                />
              </div>
            )}
            {formData.parameters.scheduleType === 'interval' && (
              <div className="form-group">
                <label>Interval (minutes)</label>
                <input
                  type="number"
                  value={formData.parameters.interval || 60}
                  onChange={(e) => handleParameterChange('interval', parseInt(e.target.value))}
                  min="1"
                />
              </div>
            )}
          </>
        );

      case 'webhook':
        return (
          <>
            <div className="form-group">
              <label>Path</label>
              <input
                type="text"
                value={formData.parameters.path || ''}
                onChange={(e) => handleParameterChange('path', e.target.value)}
                placeholder="/webhook/my-webhook"
              />
            </div>
            <div className="form-group">
              <label>Method</label>
              <select
                value={formData.parameters.method || 'POST'}
                onChange={(e) => handleParameterChange('method', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.parameters.authentication || false}
                  onChange={(e) => handleParameterChange('authentication', e.target.checked)}
                />
                Require Authentication
              </label>
            </div>
          </>
        );

      case 'delay':
        return (
          <>
            <div className="form-group">
              <label>Delay (milliseconds)</label>
              <input
                type="number"
                value={formData.parameters.delay || 1000}
                onChange={(e) => handleParameterChange('delay', parseInt(e.target.value))}
                min="0"
              />
            </div>
          </>
        );

      case 'loop':
        return (
          <>
            <div className="form-group">
              <label>Iterations</label>
              <input
                type="number"
                value={formData.parameters.iterations || 1}
                onChange={(e) => handleParameterChange('iterations', parseInt(e.target.value))}
                min="1"
              />
            </div>
          </>
        );

      case 'export':
        return (
          <>
            <div className="form-group">
              <label>Export Format</label>
              <select
                value={formData.parameters.format || 'xlsx'}
                onChange={(e) => handleParameterChange('format', e.target.value)}
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="json">JSON (.json)</option>
              </select>
            </div>
            <div className="form-group">
              <label>File Name</label>
              <input
                type="text"
                value={formData.parameters.fileName || ''}
                onChange={(e) => handleParameterChange('fileName', e.target.value)}
                placeholder="data_export.xlsx"
              />
            </div>
            {formData.parameters.format === 'xlsx' && (
              <div className="form-group">
                <label>Sheet Name</label>
                <input
                  type="text"
                  value={formData.parameters.sheetName || ''}
                  onChange={(e) => handleParameterChange('sheetName', e.target.value)}
                  placeholder="Sheet1"
                />
              </div>
            )}
            <div className="form-group">
              <label>Data Path</label>
              <input
                type="text"
                value={formData.parameters.dataPath || ''}
                onChange={(e) => handleParameterChange('dataPath', e.target.value)}
                placeholder="$.products (JSONPath to extract data)"
              />
            </div>
            <div className="form-group">
              <label>Custom Headers (comma-separated)</label>
              <input
                type="text"
                value={formData.parameters.headers || ''}
                onChange={(e) => handleParameterChange('headers', e.target.value)}
                placeholder="id,title,price,description"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.parameters.autoDownload || false}
                  onChange={(e) => handleParameterChange('autoDownload', e.target.checked)}
                />
                Auto Download File
              </label>
            </div>
          </>
        );

      default:
        return (
          <div className="custom-parameters">
            <div className="parameters-header">
              <label>Custom Parameters</label>
              <button
                type="button"
                className="btn-add-param"
                onClick={handleAddParameter}
              >
                + Add Parameter
              </button>
            </div>
            {Object.entries(formData.parameters).map(([key, value]) => (
              <div key={key} className="parameter-row">
                <input
                  type="text"
                  value={key}
                  disabled
                  className="param-key-input"
                />
                <input
                  type="text"
                  value={String(value)}
                  onChange={(e) => handleParameterChange(key, e.target.value)}
                  className="param-value-input"
                />
                <button
                  type="button"
                  className="btn-remove-param"
                  onClick={() => handleRemoveParameter(key)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="node-config-panel">
      <div className="panel-header">
        <h3>Configure Node</h3>
        <button className="btn-close" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="panel-body">
        <div className="panel-content">
          <div className="form-section">
            <h4>Basic Settings</h4>
          <div className="form-group">
            <label>Node Name</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              placeholder="Enter node name"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter node description"
              rows={2}
            />
          </div>
        </div>

        <div className="form-section">
          <h4>Node Configuration</h4>
          {renderNodeSpecificFields()}
        </div>

        <div className="form-section">
          <h4>Advanced Settings</h4>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.parameters.continueOnFail || false}
                onChange={(e) => handleParameterChange('continueOnFail', e.target.checked)}
              />
              Continue on Failure
            </label>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.parameters.retryOnFail || false}
                onChange={(e) => handleParameterChange('retryOnFail', e.target.checked)}
              />
              Retry on Failure
            </label>
          </div>
          {formData.parameters.retryOnFail && (
            <div className="form-group">
              <label>Max Retries</label>
              <input
                type="number"
                value={formData.parameters.maxRetries || 3}
                onChange={(e) => handleParameterChange('maxRetries', parseInt(e.target.value))}
                min="1"
                max="10"
              />
            </div>
          )}
          <div className="panel-footer">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-save" onClick={handleSave}>
              <FaSave /> Save Changes
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};