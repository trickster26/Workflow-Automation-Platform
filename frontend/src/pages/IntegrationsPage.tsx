import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  PlugIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  SettingsIcon,
  PlusIcon,
  KeyIcon,
  RefreshCwIcon
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  isConnected: boolean;
  lastSynced?: string;
  config?: any;
}

const integrationTypes = [
  { id: 'slack', name: 'Slack', icon: '💬', description: 'Send messages and notifications' },
  { id: 'github', name: 'GitHub', icon: '🐙', description: 'Manage repositories and issues' },
  { id: 'google_sheets', name: 'Google Sheets', icon: '📊', description: 'Read and write spreadsheet data' },
  { id: 'aws', name: 'AWS', icon: '☁️', description: 'Manage cloud resources' },
  { id: 'stripe', name: 'Stripe', icon: '💳', description: 'Process payments and subscriptions' },
  { id: 'twilio', name: 'Twilio', icon: '📱', description: 'Send SMS and make calls' },
  { id: 'office365', name: 'Office 365', icon: '📧', description: 'Access emails and calendars' },
  { id: 'mongodb', name: 'MongoDB', icon: '🍃', description: 'Database operations' },
  { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', description: 'SQL database operations' },
  { id: 'redis', name: 'Redis', icon: '⚡', description: 'Cache and message broker' }
];

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations/configs');
      setIntegrations(response.data.configs || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type: string) => {
    try {
      // This would typically open an OAuth flow or configuration modal
      console.log('Connecting to', type);
      setSelectedType(type);
      setShowAddModal(true);
    } catch (error) {
      console.error('Failed to connect integration:', error);
    }
  };

  const handleToggle = async (integrationId: string, isActive: boolean) => {
    try {
      await api.patch(`/integrations/configs/${integrationId}`, { isActive: !isActive });
      fetchIntegrations();
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  const handleTest = async (integrationId: string) => {
    try {
      const response = await api.post(`/integrations/configs/${integrationId}/test`);
      if (response.data.success) {
        alert('Connection test successful!');
      } else {
        alert('Connection test failed: ' + response.data.error);
      }
    } catch (error) {
      console.error('Failed to test integration:', error);
      alert('Connection test failed');
    }
  };

  const connectedIntegrations = integrations.filter(i => i.isConnected);
  const availableTypes = integrationTypes.filter(
    type => !connectedIntegrations.some(i => i.type === type.id)
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">Connect your favorite tools and services</p>
      </div>

      {/* Connected Integrations */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Integrations</h2>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : connectedIntegrations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <PlugIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No integrations connected yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedIntegrations.map(integration => {
              const typeInfo = integrationTypes.find(t => t.id === integration.type);
              return (
                <div
                  key={integration.id}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{typeInfo?.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-500">{typeInfo?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {integration.isActive ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{integration.description}</p>
                  
                  {integration.lastSynced && (
                    <p className="text-xs text-gray-500 mb-4">
                      Last synced: {new Date(integration.lastSynced).toLocaleString()}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggle(integration.id, integration.isActive)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                        integration.isActive
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {integration.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleTest(integration.id)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <RefreshCwIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => console.log('Configure', integration.id)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <SettingsIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableTypes.map(type => (
            <button
              key={type.id}
              onClick={() => handleConnect(type.id)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-indigo-500 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">{type.icon}</span>
                <h3 className="font-semibold text-gray-900">{type.name}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">{type.description}</p>
              <div className="flex items-center text-indigo-600">
                <PlusIcon className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Connect</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Integration Modal (simplified) */}
      {showAddModal && selectedType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Connect {integrationTypes.find(t => t.id === selectedType)?.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Integration Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="My Integration"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key / Credentials
                </label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter API key or credentials"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle connection logic here
                  setShowAddModal(false);
                  fetchIntegrations();
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};