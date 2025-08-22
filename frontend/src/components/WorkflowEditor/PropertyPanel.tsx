import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  XIcon,
  SaveIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  SettingsIcon,
} from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { NodeType } from '@/types/workflow';

interface PropertyPanelProps {}

export function PropertyPanel({}: PropertyPanelProps) {
  const { 
    currentWorkflow, 
    selectedNodeId, 
    selectNode, 
    updateNode, 
    deleteNode 
  } = useWorkflowStore();
  
  const [activeTab, setActiveTab] = useState<'properties' | 'settings'>('properties');

  const selectedNode = currentWorkflow?.nodes.find(node => node.id === selectedNodeId);

  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm({
    defaultValues: selectedNode,
  });

  if (!selectedNode) {
    return null;
  }

  const onSubmit = (data: any) => {
    updateNode(selectedNode.id, data);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this node?')) {
      deleteNode(selectedNode.id);
    }
  };

  const toggleDisabled = () => {
    updateNode(selectedNode.id, { disabled: !selectedNode.disabled });
  };

  const renderPropertyField = (paramName: string, paramConfig: any) => {
    const currentValue = selectedNode.parameters[paramName];

    switch (paramConfig.type) {
      case 'string':
        return (
          <input
            key={paramName}
            type="text"
            className="input"
            placeholder={paramConfig.placeholder || ''}
            defaultValue={currentValue || paramConfig.default || ''}
            onChange={(e) => {
              updateNode(selectedNode.id, {
                parameters: {
                  ...selectedNode.parameters,
                  [paramName]: e.target.value,
                }
              });
            }}
          />
        );

      case 'number':
        return (
          <input
            key={paramName}
            type="number"
            className="input"
            placeholder={paramConfig.placeholder || ''}
            defaultValue={currentValue || paramConfig.default || 0}
            onChange={(e) => {
              updateNode(selectedNode.id, {
                parameters: {
                  ...selectedNode.parameters,
                  [paramName]: parseFloat(e.target.value) || 0,
                }
              });
            }}
          />
        );

      case 'boolean':
        return (
          <label key={paramName} className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              defaultChecked={currentValue || paramConfig.default || false}
              onChange={(e) => {
                updateNode(selectedNode.id, {
                  parameters: {
                    ...selectedNode.parameters,
                    [paramName]: e.target.checked,
                  }
                });
              }}
            />
            <span className="text-sm text-gray-700">Enable</span>
          </label>
        );

      case 'options':
        return (
          <select
            key={paramName}
            className="input"
            defaultValue={currentValue || paramConfig.default}
            onChange={(e) => {
              updateNode(selectedNode.id, {
                parameters: {
                  ...selectedNode.parameters,
                  [paramName]: e.target.value,
                }
              });
            }}
          >
            {paramConfig.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        );

      case 'json':
        return (
          <textarea
            key={paramName}
            className="textarea font-mono text-sm"
            rows={4}
            placeholder={paramConfig.placeholder || '{}'}
            defaultValue={
              typeof currentValue === 'object' 
                ? JSON.stringify(currentValue, null, 2)
                : currentValue || paramConfig.default || '{}'
            }
            onChange={(e) => {
              try {
                const jsonValue = JSON.parse(e.target.value);
                updateNode(selectedNode.id, {
                  parameters: {
                    ...selectedNode.parameters,
                    [paramName]: jsonValue,
                  }
                });
              } catch (error) {
                // Invalid JSON, keep as string for now
              }
            }}
          />
        );

      default:
        return (
          <input
            key={paramName}
            type="text"
            className="input"
            placeholder={paramConfig.placeholder || ''}
            defaultValue={currentValue || paramConfig.default || ''}
            onChange={(e) => {
              updateNode(selectedNode.id, {
                parameters: {
                  ...selectedNode.parameters,
                  [paramName]: e.target.value,
                }
              });
            }}
          />
        );
    }
  };

  const getParameterFields = () => {
    // Define parameter configurations for different node types
    const parameterConfigs: Record<string, Record<string, any>> = {
      [NodeType.HTTP_REQUEST]: {
        method: {
          type: 'options',
          displayName: 'Method',
          options: [
            { name: 'GET', value: 'GET' },
            { name: 'POST', value: 'POST' },
            { name: 'PUT', value: 'PUT' },
            { name: 'DELETE', value: 'DELETE' },
            { name: 'PATCH', value: 'PATCH' },
          ],
          default: 'GET',
        },
        url: {
          type: 'string',
          displayName: 'URL',
          placeholder: 'https://api.example.com/data',
          required: true,
        },
        headers: {
          type: 'json',
          displayName: 'Headers',
          placeholder: '{"Content-Type": "application/json"}',
        },
        body: {
          type: 'json',
          displayName: 'Body',
          placeholder: '{"key": "value"}',
        },
      },
      [NodeType.SCHEDULE]: {
        cronExpression: {
          type: 'string',
          displayName: 'Cron Expression',
          placeholder: '0 * * * *',
          default: '0 * * * *',
        },
        timezone: {
          type: 'string',
          displayName: 'Timezone',
          default: 'UTC',
        },
      },
      [NodeType.DELAY]: {
        delay: {
          type: 'number',
          displayName: 'Delay (ms)',
          default: 1000,
        },
      },
      [NodeType.CODE]: {
        language: {
          type: 'options',
          displayName: 'Language',
          options: [
            { name: 'JavaScript', value: 'javascript' },
            { name: 'Python', value: 'python' },
          ],
          default: 'javascript',
        },
        code: {
          type: 'string',
          displayName: 'Code',
          placeholder: '// Your code here\nreturn $input;',
        },
      },
    };

    return parameterConfigs[selectedNode.type] || {};
  };

  const parameterFields = getParameterFields();

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Node Properties</h3>
        <button
          onClick={() => selectNode(null)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'properties'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'settings'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {/* Basic Properties */}
            <div>
              <label className="label">Node Name</label>
              <input
                type="text"
                className="input mt-1"
                value={selectedNode.name}
                onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="textarea mt-1"
                rows={2}
                value={selectedNode.notes || ''}
                onChange={(e) => updateNode(selectedNode.id, { notes: e.target.value })}
                placeholder="Add notes about this node..."
              />
            </div>

            {/* Node-specific Parameters */}
            {Object.entries(parameterFields).map(([paramName, paramConfig]) => (
              <div key={paramName}>
                <label className="label">
                  {paramConfig.displayName}
                  {paramConfig.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="mt-1">
                  {renderPropertyField(paramName, paramConfig)}
                </div>
                {paramConfig.description && (
                  <p className="text-xs text-gray-500 mt-1">{paramConfig.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Node Settings */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={selectedNode.disabled || false}
                  onChange={toggleDisabled}
                />
                <span className="text-sm font-medium text-gray-700">Disable Node</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Disabled nodes are skipped during execution
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={selectedNode.continueOnFail || false}
                  onChange={(e) => updateNode(selectedNode.id, { continueOnFail: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">Continue on Fail</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Continue execution even if this node fails
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={selectedNode.retryOnFail || false}
                  onChange={(e) => updateNode(selectedNode.id, { retryOnFail: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">Retry on Fail</span>
              </label>
            </div>

            {selectedNode.retryOnFail && (
              <>
                <div>
                  <label className="label">Max Retries</label>
                  <input
                    type="number"
                    className="input mt-1"
                    min="1"
                    max="10"
                    value={selectedNode.maxRetries || 3}
                    onChange={(e) => updateNode(selectedNode.id, { maxRetries: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="label">Wait Between Retries (ms)</label>
                  <input
                    type="number"
                    className="input mt-1"
                    min="100"
                    value={selectedNode.waitBetweenRetries || 1000}
                    onChange={(e) => updateNode(selectedNode.id, { waitBetweenRetries: parseInt(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={toggleDisabled}
          className="w-full btn-secondary flex items-center justify-center space-x-2"
        >
          {selectedNode.disabled ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
          <span>{selectedNode.disabled ? 'Enable Node' : 'Disable Node'}</span>
        </button>

        <button
          onClick={handleDelete}
          className="w-full btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center space-x-2"
        >
          <TrashIcon className="w-4 h-4" />
          <span>Delete Node</span>
        </button>
      </div>
    </div>
  );
}