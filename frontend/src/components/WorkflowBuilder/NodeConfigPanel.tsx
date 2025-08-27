import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { FaTimes, FaSave, FaDatabase, FaCheck, FaSpinner, FaEnvelope, FaFileUpload, FaFileDownload, FaFolder, FaCloud, FaAws, FaCodeBranch, FaPlus, FaTrash, FaSyncAlt, FaListUl, FaStopwatch, FaClock, FaExchangeAlt, FaFilter, FaCopy, FaRandom, FaExpand, FaLayerGroup, FaObjectGroup, FaBrain, FaRobot, FaEye, FaMicrophone, FaLanguage, FaChartLine, FaBell, FaSms, FaSlack, FaDiscord, FaMicrosoft, FaMobile, FaGlobe, FaChartBar, FaChartPie, FaTable, FaCalculator, FaSearch, FaDownload, FaFileExport } from 'react-icons/fa';
import { api } from '../../services/api';
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
  const [credentials, setCredentials] = useState<any[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    setFormData({
      label: node.data.label || '',
      description: node.data.description || '',
      parameters: node.data.parameters || {},
    });
    
    // Load credentials for database and email nodes
    if (node.data.type === 'database') {
      loadCredentials();
    } else if (node.data.type === 'email') {
      loadEmailCredentials();
    } else if (node.data.type === 'aws' || node.data.type === 'cloud') {
      loadCloudCredentials();
    }
  }, [node]);

  const loadCredentials = async () => {
    try {
      const response = await api.get('/credentials?type=database');
      setCredentials(response.data || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      setCredentials([]);
    }
  };

  const loadEmailCredentials = async () => {
    try {
      const response = await api.get('/credentials?type=smtp');
      setCredentials(response.data || []);
    } catch (error) {
      console.error('Failed to load SMTP credentials:', error);
      setCredentials([]);
    }
  };

  const loadCloudCredentials = async () => {
    try {
      const response = await api.get('/credentials?type=aws');
      setCredentials(response.data || []);
    } catch (error) {
      console.error('Failed to load cloud credentials:', error);
      setCredentials([]);
    }
  };

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

  const getNestedValue = (obj: any, path: string): any => {
    if (!path) return obj;
    return path.split('.').reduce((current, key) => 
      current && typeof current === 'object' ? current[key] : undefined, obj
    );
  };

  const testDatabaseConnection = async () => {
    if (node.data.type !== 'database') return;
    
    setTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      let testData;
      
      if (formData.parameters.credentialId) {
        // Test using saved credential
        const response = await api.post(`/credentials/${formData.parameters.credentialId}/test`);
        setConnectionTestResult({
          success: response.data.success,
          message: response.data.message || 'Connection test completed'
        });
      } else if (formData.parameters.connection) {
        // Test using manual connection details
        const response = await api.post('/credentials/test', {
          type: 'database',
          data: formData.parameters.connection
        });
        setConnectionTestResult({
          success: response.data.success,
          message: response.data.message || 'Connection test completed'
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: 'Please configure database connection details first'
        });
      }
    } catch (error: any) {
      setConnectionTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const testEmailConnection = async () => {
    if (node.data.type !== 'email') return;
    
    setTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      if (formData.parameters.credentialId) {
        // Test using saved SMTP credential
        const response = await api.post(`/credentials/${formData.parameters.credentialId}/test`);
        setConnectionTestResult({
          success: response.data.success,
          message: response.data.message || 'SMTP connection test completed'
        });
      } else if (formData.parameters.smtp) {
        // Test using manual SMTP settings
        const response = await api.post('/credentials/test', {
          type: 'smtp',
          data: formData.parameters.smtp
        });
        setConnectionTestResult({
          success: response.data.success,
          message: response.data.message || 'SMTP connection test completed'
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: 'Please configure SMTP connection details first'
        });
      }
    } catch (error: any) {
      setConnectionTestResult({
        success: false,
        message: error.response?.data?.message || 'SMTP connection test failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const testCloudConnection = async () => {
    if (node.data.type !== 'aws' && node.data.type !== 'cloud') return;
    
    setTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      if (formData.parameters.credentialId) {
        // Test using saved AWS credential
        const response = await api.post(`/credentials/${formData.parameters.credentialId}/test`);
        setConnectionTestResult({
          success: response.data.success,
          message: response.data.message || 'AWS credentials test completed'
        });
      } else if (formData.parameters.awsCredentials) {
        // Test using manual AWS settings
        const response = await api.post('/credentials/test', {
          type: 'aws',
          data: formData.parameters.awsCredentials
        });
        setConnectionTestResult({
          success: response.data.success,
          message: response.data.message || 'AWS credentials test completed'
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: 'Please configure AWS credentials first'
        });
      }
    } catch (error: any) {
      setConnectionTestResult({
        success: false,
        message: error.response?.data?.message || 'AWS credentials test failed'
      });
    } finally {
      setTestingConnection(false);
    }
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
            {/* SMTP Connection Configuration */}
            <div className="form-section">
              <h4 className="section-title">
                <FaEnvelope /> SMTP Connection
                <button
                  type="button"
                  onClick={testEmailConnection}
                  disabled={testingConnection}
                  className="test-connection-btn"
                  title="Test SMTP Connection"
                >
                  {testingConnection ? (
                    <FaSpinner className="spinning" />
                  ) : (
                    <FaCheck />
                  )}
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </h4>
              
              {connectionTestResult && (
                <div className={`connection-test-result ${connectionTestResult.success ? 'success' : 'error'}`}>
                  {connectionTestResult.message}
                </div>
              )}

              <div className="form-group">
                <label>Connection Method</label>
                <select
                  value={formData.parameters.connectionMethod || 'credential'}
                  onChange={(e) => {
                    handleParameterChange('connectionMethod', e.target.value);
                    setConnectionTestResult(null);
                  }}
                >
                  <option value="credential">Use Saved SMTP Credential</option>
                  <option value="manual">Manual SMTP Settings</option>
                </select>
              </div>

              {formData.parameters.connectionMethod === 'credential' ? (
                <div className="form-group">
                  <label>Select SMTP Credential</label>
                  <select
                    value={formData.parameters.credentialId || ''}
                    onChange={(e) => {
                      handleParameterChange('credentialId', e.target.value);
                      setConnectionTestResult(null);
                    }}
                  >
                    <option value="">Select an SMTP credential...</option>
                    {credentials.map((cred) => (
                      <option key={cred.id} value={cred.id}>
                        {cred.name} ({cred.type})
                      </option>
                    ))}
                  </select>
                  {credentials.length === 0 && (
                    <p className="help-text">
                      No SMTP credentials found. Create one in the Integrations page.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>SMTP Host</label>
                    <input
                      type="text"
                      value={formData.parameters.smtp?.host || ''}
                      onChange={(e) => {
                        handleParameterChange('smtp', {
                          ...formData.parameters.smtp,
                          host: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Port</label>
                    <input
                      type="number"
                      value={formData.parameters.smtp?.port || ''}
                      onChange={(e) => {
                        handleParameterChange('smtp', {
                          ...formData.parameters.smtp,
                          port: parseInt(e.target.value) || ''
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="587"
                    />
                  </div>
                  <div className="form-group">
                    <label>Security</label>
                    <select
                      value={formData.parameters.smtp?.secure || 'false'}
                      onChange={(e) => {
                        handleParameterChange('smtp', {
                          ...formData.parameters.smtp,
                          secure: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                    >
                      <option value="false">STARTTLS (Port 587)</option>
                      <option value="true">SSL/TLS (Port 465)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      value={formData.parameters.smtp?.username || ''}
                      onChange={(e) => {
                        handleParameterChange('smtp', {
                          ...formData.parameters.smtp,
                          username: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={formData.parameters.smtp?.password || ''}
                      onChange={(e) => {
                        handleParameterChange('smtp', {
                          ...formData.parameters.smtp,
                          password: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="App password or email password"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Email Configuration */}
            <div className="form-section">
              <h4>Email Configuration</h4>
              <div className="form-group">
                <label>From Name (Optional)</label>
                <input
                  type="text"
                  value={formData.parameters.fromName || ''}
                  onChange={(e) => handleParameterChange('fromName', e.target.value)}
                  placeholder="Your Name or Company"
                />
              </div>
              <div className="form-group">
                <label>To</label>
                <input
                  type="text"
                  value={formData.parameters.to || ''}
                  onChange={(e) => handleParameterChange('to', e.target.value)}
                  placeholder="recipient@example.com (comma-separated for multiple)"
                />
              </div>
              <div className="form-group">
                <label>CC (Optional)</label>
                <input
                  type="text"
                  value={formData.parameters.cc || ''}
                  onChange={(e) => handleParameterChange('cc', e.target.value)}
                  placeholder="cc@example.com (comma-separated for multiple)"
                />
              </div>
              <div className="form-group">
                <label>BCC (Optional)</label>
                <input
                  type="text"
                  value={formData.parameters.bcc || ''}
                  onChange={(e) => handleParameterChange('bcc', e.target.value)}
                  placeholder="bcc@example.com (comma-separated for multiple)"
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
                <label>Message</label>
                <textarea
                  value={formData.parameters.message || ''}
                  onChange={(e) => handleParameterChange('message', e.target.value)}
                  placeholder="Plain text email content"
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>HTML Content (Optional)</label>
                <textarea
                  value={formData.parameters.html || ''}
                  onChange={(e) => handleParameterChange('html', e.target.value)}
                  placeholder="<h1>HTML email content</h1>"
                  rows={4}
                  className="query-textarea"
                />
              </div>
              <div className="form-group">
                <label>Attachments (Optional)</label>
                <input
                  type="text"
                  value={formData.parameters.attachments || ''}
                  onChange={(e) => handleParameterChange('attachments', e.target.value)}
                  placeholder="/path/to/file1.pdf,/path/to/file2.jpg"
                />
                <p className="help-text">Comma-separated file paths</p>
              </div>
            </div>
          </>
        );

      case 'fileUpload':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaFileUpload /> File Upload Configuration
              </h4>
              
              <div className="form-group">
                <label>Upload Mode</label>
                <select
                  value={formData.parameters.uploadMode || 'url'}
                  onChange={(e) => handleParameterChange('uploadMode', e.target.value)}
                >
                  <option value="url">From URL</option>
                  <option value="filepath">From File Path</option>
                  <option value="input">From Input Data</option>
                </select>
              </div>

              {formData.parameters.uploadMode === 'url' && (
                <div className="form-group">
                  <label>File URL</label>
                  <input
                    type="text"
                    value={formData.parameters.fileUrl || ''}
                    onChange={(e) => handleParameterChange('fileUrl', e.target.value)}
                    placeholder="https://example.com/file.pdf"
                  />
                </div>
              )}

              {formData.parameters.uploadMode === 'filepath' && (
                <div className="form-group">
                  <label>File Path</label>
                  <input
                    type="text"
                    value={formData.parameters.filePath || ''}
                    onChange={(e) => handleParameterChange('filePath', e.target.value)}
                    placeholder="C:\path\to\file.pdf"
                  />
                </div>
              )}

              {formData.parameters.uploadMode === 'input' && (
                <div className="form-group">
                  <label>Input Data Field</label>
                  <input
                    type="text"
                    value={formData.parameters.inputField || 'fileData'}
                    onChange={(e) => handleParameterChange('inputField', e.target.value)}
                    placeholder="fileData"
                  />
                  <p className="help-text">Field name in input data that contains file content or path</p>
                </div>
              )}

              <div className="form-group">
                <label>Custom File Name (Optional)</label>
                <input
                  type="text"
                  value={formData.parameters.fileName || ''}
                  onChange={(e) => handleParameterChange('fileName', e.target.value)}
                  placeholder="document.pdf"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.addToDownloads || true}
                    onChange={(e) => handleParameterChange('addToDownloads', e.target.checked)}
                  />
                  Make Available for Download
                </label>
                <p className="help-text">Add file to download API endpoints</p>
              </div>
            </div>
          </>
        );

      case 'fileDownload':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaFileDownload /> File Download Configuration
              </h4>
              
              <div className="form-group">
                <label>Download Mode</label>
                <select
                  value={formData.parameters.downloadMode || 'url'}
                  onChange={(e) => handleParameterChange('downloadMode', e.target.value)}
                >
                  <option value="url">From URL</option>
                  <option value="storage">From Storage</option>
                  <option value="input">From Input Data</option>
                </select>
              </div>

              {formData.parameters.downloadMode === 'url' && (
                <div className="form-group">
                  <label>File URL</label>
                  <input
                    type="text"
                    value={formData.parameters.fileUrl || ''}
                    onChange={(e) => handleParameterChange('fileUrl', e.target.value)}
                    placeholder="https://example.com/file.pdf"
                  />
                </div>
              )}

              {formData.parameters.downloadMode === 'storage' && (
                <div className="form-group">
                  <label>File Name</label>
                  <input
                    type="text"
                    value={formData.parameters.fileName || ''}
                    onChange={(e) => handleParameterChange('fileName', e.target.value)}
                    placeholder="document.pdf"
                  />
                  <p className="help-text">Name of file in server storage</p>
                </div>
              )}

              {formData.parameters.downloadMode === 'input' && (
                <div className="form-group">
                  <label>URL Field</label>
                  <input
                    type="text"
                    value={formData.parameters.urlField || 'url'}
                    onChange={(e) => handleParameterChange('urlField', e.target.value)}
                    placeholder="url"
                  />
                  <p className="help-text">Field name in input data that contains the file URL</p>
                </div>
              )}

              <div className="form-group">
                <label>Output Format</label>
                <select
                  value={formData.parameters.outputFormat || 'base64'}
                  onChange={(e) => handleParameterChange('outputFormat', e.target.value)}
                >
                  <option value="base64">File Content (Base64)</option>
                  <option value="buffer">File Content (Buffer)</option>
                  <option value="text">File Content (Text)</option>
                  <option value="path">File Path Only</option>
                  <option value="metadata">File Metadata</option>
                </select>
              </div>

              {(formData.parameters.downloadMode === 'url' || formData.parameters.downloadMode === 'input') && (
                <>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.saveToStorage || false}
                        onChange={(e) => handleParameterChange('saveToStorage', e.target.checked)}
                      />
                      Save to Server Storage
                    </label>
                    <p className="help-text">Keep downloaded file on server for future use</p>
                  </div>

                  {formData.parameters.saveToStorage && (
                    <div className="form-group">
                      <label>Custom File Name (Optional)</label>
                      <input
                        type="text"
                        value={formData.parameters.customFileName || ''}
                        onChange={(e) => handleParameterChange('customFileName', e.target.value)}
                        placeholder="custom_name.pdf"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        );

      case 'aws':
      case 'cloud':
        return (
          <>
            {/* AWS Credentials Configuration */}
            <div className="form-section">
              <h4 className="section-title">
                <FaAws /> AWS Credentials
                <button
                  type="button"
                  onClick={testCloudConnection}
                  disabled={testingConnection}
                  className="test-connection-btn"
                  title="Test AWS Credentials"
                >
                  {testingConnection ? (
                    <FaSpinner className="spinning" />
                  ) : (
                    <FaCheck />
                  )}
                  {testingConnection ? 'Testing...' : 'Test Credentials'}
                </button>
              </h4>
              
              {connectionTestResult && (
                <div className={`connection-test-result ${connectionTestResult.success ? 'success' : 'error'}`}>
                  {connectionTestResult.message}
                </div>
              )}

              <div className="form-group">
                <label>Connection Method</label>
                <select
                  value={formData.parameters.connectionMethod || 'credential'}
                  onChange={(e) => {
                    handleParameterChange('connectionMethod', e.target.value);
                    setConnectionTestResult(null);
                  }}
                >
                  <option value="credential">Use Saved AWS Credential</option>
                  <option value="manual">Manual AWS Settings</option>
                </select>
              </div>

              {formData.parameters.connectionMethod === 'credential' ? (
                <div className="form-group">
                  <label>Select AWS Credential</label>
                  <select
                    value={formData.parameters.credentialId || ''}
                    onChange={(e) => {
                      handleParameterChange('credentialId', e.target.value);
                      setConnectionTestResult(null);
                    }}
                  >
                    <option value="">Select an AWS credential...</option>
                    {credentials.map((cred) => (
                      <option key={cred.id} value={cred.id}>
                        {cred.name} ({cred.type})
                      </option>
                    ))}
                  </select>
                  {credentials.length === 0 && (
                    <p className="help-text">
                      No AWS credentials found. Create one in the Integrations page.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Access Key ID</label>
                    <input
                      type="text"
                      value={formData.parameters.awsCredentials?.accessKeyId || ''}
                      onChange={(e) => {
                        handleParameterChange('awsCredentials', {
                          ...formData.parameters.awsCredentials,
                          accessKeyId: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                    />
                  </div>
                  <div className="form-group">
                    <label>Secret Access Key</label>
                    <input
                      type="password"
                      value={formData.parameters.awsCredentials?.secretAccessKey || ''}
                      onChange={(e) => {
                        handleParameterChange('awsCredentials', {
                          ...formData.parameters.awsCredentials,
                          secretAccessKey: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    />
                  </div>
                  <div className="form-group">
                    <label>Region</label>
                    <select
                      value={formData.parameters.awsCredentials?.region || 'us-east-1'}
                      onChange={(e) => {
                        handleParameterChange('awsCredentials', {
                          ...formData.parameters.awsCredentials,
                          region: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-east-2">US East (Ohio)</option>
                      <option value="us-west-1">US West (N. California)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">Europe (Ireland)</option>
                      <option value="eu-west-2">Europe (London)</option>
                      <option value="eu-west-3">Europe (Paris)</option>
                      <option value="eu-central-1">Europe (Frankfurt)</option>
                      <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                      <option value="ap-northeast-2">Asia Pacific (Seoul)</option>
                      <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                      <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                      <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* AWS Service Configuration */}
            <div className="form-section">
              <h4>AWS Service Configuration</h4>
              <div className="form-group">
                <label>AWS Service</label>
                <select
                  value={formData.parameters.service || 's3'}
                  onChange={(e) => handleParameterChange('service', e.target.value)}
                >
                  <option value="s3">S3 (Simple Storage Service)</option>
                  <option value="lambda">Lambda (Serverless Functions)</option>
                  <option value="sqs">SQS (Simple Queue Service)</option>
                  <option value="sns">SNS (Simple Notification Service)</option>
                  <option value="ses">SES (Simple Email Service)</option>
                </select>
              </div>

              {/* S3 Configuration */}
              {formData.parameters.service === 's3' && (
                <>
                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.s3Operation || 'putObject'}
                      onChange={(e) => handleParameterChange('s3Operation', e.target.value)}
                    >
                      <option value="putObject">Upload Object</option>
                      <option value="getObject">Download Object</option>
                      <option value="deleteObject">Delete Object</option>
                      <option value="listObjects">List Objects</option>
                      <option value="createBucket">Create Bucket</option>
                      <option value="deleteBucket">Delete Bucket</option>
                      <option value="copyObject">Copy Object</option>
                      <option value="getSignedUrl">Get Signed URL</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bucket Name</label>
                    <input
                      type="text"
                      value={formData.parameters.bucketName || ''}
                      onChange={(e) => handleParameterChange('bucketName', e.target.value)}
                      placeholder="my-s3-bucket"
                    />
                  </div>
                  {['putObject', 'getObject', 'deleteObject', 'copyObject', 'getSignedUrl'].includes(formData.parameters.s3Operation) && (
                    <div className="form-group">
                      <label>Object Key</label>
                      <input
                        type="text"
                        value={formData.parameters.objectKey || ''}
                        onChange={(e) => handleParameterChange('objectKey', e.target.value)}
                        placeholder="path/to/file.txt"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Lambda Configuration */}
              {formData.parameters.service === 'lambda' && (
                <>
                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.lambdaOperation || 'invoke'}
                      onChange={(e) => handleParameterChange('lambdaOperation', e.target.value)}
                    >
                      <option value="invoke">Invoke Function</option>
                      <option value="listFunctions">List Functions</option>
                      <option value="getFunction">Get Function</option>
                      <option value="createFunction">Create Function</option>
                      <option value="updateFunctionCode">Update Function Code</option>
                      <option value="deleteFunction">Delete Function</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Function Name</label>
                    <input
                      type="text"
                      value={formData.parameters.functionName || ''}
                      onChange={(e) => handleParameterChange('functionName', e.target.value)}
                      placeholder="my-lambda-function"
                    />
                  </div>
                  {formData.parameters.lambdaOperation === 'invoke' && (
                    <div className="form-group">
                      <label>Payload (JSON)</label>
                      <textarea
                        value={formData.parameters.payload || '{}'}
                        onChange={(e) => handleParameterChange('payload', e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={3}
                        className="query-textarea"
                      />
                    </div>
                  )}
                </>
              )}

              {/* SQS Configuration */}
              {formData.parameters.service === 'sqs' && (
                <>
                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.sqsOperation || 'sendMessage'}
                      onChange={(e) => handleParameterChange('sqsOperation', e.target.value)}
                    >
                      <option value="sendMessage">Send Message</option>
                      <option value="receiveMessage">Receive Messages</option>
                      <option value="deleteMessage">Delete Message</option>
                      <option value="createQueue">Create Queue</option>
                      <option value="deleteQueue">Delete Queue</option>
                      <option value="listQueues">List Queues</option>
                    </select>
                  </div>
                  {['sendMessage', 'receiveMessage', 'deleteMessage', 'deleteQueue'].includes(formData.parameters.sqsOperation) && (
                    <div className="form-group">
                      <label>Queue URL</label>
                      <input
                        type="text"
                        value={formData.parameters.queueUrl || ''}
                        onChange={(e) => handleParameterChange('queueUrl', e.target.value)}
                        placeholder="https://sqs.region.amazonaws.com/account/queue-name"
                      />
                    </div>
                  )}
                  {formData.parameters.sqsOperation === 'createQueue' && (
                    <div className="form-group">
                      <label>Queue Name</label>
                      <input
                        type="text"
                        value={formData.parameters.queueName || ''}
                        onChange={(e) => handleParameterChange('queueName', e.target.value)}
                        placeholder="my-queue"
                      />
                    </div>
                  )}
                  {formData.parameters.sqsOperation === 'sendMessage' && (
                    <div className="form-group">
                      <label>Message Body</label>
                      <textarea
                        value={formData.parameters.messageBody || ''}
                        onChange={(e) => handleParameterChange('messageBody', e.target.value)}
                        placeholder="Your message content"
                        rows={3}
                      />
                    </div>
                  )}
                </>
              )}

              {/* SNS Configuration */}
              {formData.parameters.service === 'sns' && (
                <>
                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.snsOperation || 'publish'}
                      onChange={(e) => handleParameterChange('snsOperation', e.target.value)}
                    >
                      <option value="publish">Publish Message</option>
                      <option value="createTopic">Create Topic</option>
                      <option value="deleteTopic">Delete Topic</option>
                      <option value="subscribe">Subscribe</option>
                      <option value="unsubscribe">Unsubscribe</option>
                      <option value="listTopics">List Topics</option>
                    </select>
                  </div>
                  {['publish', 'deleteTopic', 'subscribe'].includes(formData.parameters.snsOperation) && (
                    <div className="form-group">
                      <label>Topic ARN</label>
                      <input
                        type="text"
                        value={formData.parameters.topicArn || ''}
                        onChange={(e) => handleParameterChange('topicArn', e.target.value)}
                        placeholder="arn:aws:sns:region:account:topic-name"
                      />
                    </div>
                  )}
                  {formData.parameters.snsOperation === 'createTopic' && (
                    <div className="form-group">
                      <label>Topic Name</label>
                      <input
                        type="text"
                        value={formData.parameters.topicName || ''}
                        onChange={(e) => handleParameterChange('topicName', e.target.value)}
                        placeholder="my-topic"
                      />
                    </div>
                  )}
                  {formData.parameters.snsOperation === 'publish' && (
                    <>
                      <div className="form-group">
                        <label>Message</label>
                        <textarea
                          value={formData.parameters.message || ''}
                          onChange={(e) => handleParameterChange('message', e.target.value)}
                          placeholder="Your notification message"
                          rows={3}
                        />
                      </div>
                      <div className="form-group">
                        <label>Subject (Optional)</label>
                        <input
                          type="text"
                          value={formData.parameters.subject || ''}
                          onChange={(e) => handleParameterChange('subject', e.target.value)}
                          placeholder="Message subject"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* SES Configuration */}
              {formData.parameters.service === 'ses' && (
                <>
                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.sesOperation || 'sendEmail'}
                      onChange={(e) => handleParameterChange('sesOperation', e.target.value)}
                    >
                      <option value="sendEmail">Send Email</option>
                      <option value="sendRawEmail">Send Raw Email</option>
                      <option value="verifyEmailIdentity">Verify Email Identity</option>
                      <option value="listVerifiedEmailAddresses">List Verified Emails</option>
                      <option value="getSendQuota">Get Send Quota</option>
                      <option value="getSendStatistics">Get Send Statistics</option>
                    </select>
                  </div>
                  {formData.parameters.sesOperation === 'sendEmail' && (
                    <>
                      <div className="form-group">
                        <label>From Address</label>
                        <input
                          type="email"
                          value={formData.parameters.source || ''}
                          onChange={(e) => handleParameterChange('source', e.target.value)}
                          placeholder="sender@example.com"
                        />
                      </div>
                      <div className="form-group">
                        <label>To Addresses</label>
                        <input
                          type="text"
                          value={formData.parameters.toAddresses || ''}
                          onChange={(e) => handleParameterChange('toAddresses', e.target.value)}
                          placeholder="recipient1@example.com,recipient2@example.com"
                        />
                      </div>
                      <div className="form-group">
                        <label>Subject</label>
                        <input
                          type="text"
                          value={formData.parameters.emailSubject || ''}
                          onChange={(e) => handleParameterChange('emailSubject', e.target.value)}
                          placeholder="Email subject"
                        />
                      </div>
                      <div className="form-group">
                        <label>HTML Body</label>
                        <textarea
                          value={formData.parameters.htmlBody || ''}
                          onChange={(e) => handleParameterChange('htmlBody', e.target.value)}
                          placeholder="<h1>HTML email content</h1>"
                          rows={4}
                          className="query-textarea"
                        />
                      </div>
                      <div className="form-group">
                        <label>Text Body (Optional)</label>
                        <textarea
                          value={formData.parameters.textBody || ''}
                          onChange={(e) => handleParameterChange('textBody', e.target.value)}
                          placeholder="Plain text email content"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        );

      case 'switch':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaCodeBranch /> Switch Configuration
              </h4>
              
              <div className="form-group">
                <label>Data Field</label>
                <input
                  type="text"
                  value={formData.parameters.dataField || ''}
                  onChange={(e) => handleParameterChange('dataField', e.target.value)}
                  placeholder="status"
                />
                <p className="help-text">Field in input data to switch on (use dot notation for nested fields: user.status)</p>
              </div>

              <div className="form-group">
                <label>Matching Mode</label>
                <select
                  value={formData.parameters.mode || 'equals'}
                  onChange={(e) => handleParameterChange('mode', e.target.value)}
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="startsWith">Starts With</option>
                  <option value="endsWith">Ends With</option>
                  <option value="regex">Regular Expression</option>
                </select>
              </div>

              {['equals', 'contains', 'startsWith', 'endsWith'].includes(formData.parameters.mode) && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.parameters.caseSensitive !== false}
                      onChange={(e) => handleParameterChange('caseSensitive', e.target.checked)}
                    />
                    Case Sensitive Matching
                  </label>
                </div>
              )}
            </div>

            <div className="form-section">
              <h4 className="section-title">
                Switch Cases
                <button
                  type="button"
                  onClick={() => {
                    const cases = formData.parameters.cases || [];
                    const newCase = { value: '', outputIndex: cases.length };
                    handleParameterChange('cases', [...cases, newCase]);
                  }}
                  className="test-connection-btn"
                  style={{ fontSize: '12px' }}
                  title="Add Case"
                >
                  <FaPlus /> Add Case
                </button>
              </h4>

              {(formData.parameters.cases || []).map((switchCase: any, index: number) => (
                <div key={index} className="switch-case">
                  <div className="case-header">
                    <h5>Case {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => {
                        const cases = formData.parameters.cases || [];
                        const newCases = cases.filter((_: any, i: number) => i !== index);
                        handleParameterChange('cases', newCases);
                      }}
                      className="delete-case-btn"
                      title="Delete Case"
                    >
                      <FaTrash />
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label>Match Value</label>
                    <input
                      type="text"
                      value={switchCase.value || ''}
                      onChange={(e) => {
                        const cases = [...(formData.parameters.cases || [])];
                        cases[index] = { ...cases[index], value: e.target.value };
                        handleParameterChange('cases', cases);
                      }}
                      placeholder={
                        formData.parameters.mode === 'regex' 
                          ? '^(active|enabled)$' 
                          : formData.parameters.mode === 'contains'
                          ? 'partial text'
                          : 'exact value'
                      }
                    />
                    {formData.parameters.mode === 'regex' && (
                      <p className="help-text">Enter a valid regular expression pattern</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Output Index</label>
                    <input
                      type="number"
                      min="0"
                      value={switchCase.outputIndex !== undefined ? switchCase.outputIndex : index}
                      onChange={(e) => {
                        const cases = [...(formData.parameters.cases || [])];
                        cases[index] = { ...cases[index], outputIndex: parseInt(e.target.value) || 0 };
                        handleParameterChange('cases', cases);
                      }}
                    />
                    <p className="help-text">Which output port to route matching data to</p>
                  </div>
                </div>
              ))}

              {(!formData.parameters.cases || formData.parameters.cases.length === 0) && (
                <div className="empty-cases">
                  <p>No cases defined. Click "Add Case" to create switch conditions.</p>
                </div>
              )}

              <div className="form-group">
                <label>Fallback Output</label>
                <input
                  type="number"
                  min="0"
                  value={formData.parameters.fallbackOutput !== undefined ? formData.parameters.fallbackOutput : 0}
                  onChange={(e) => handleParameterChange('fallbackOutput', parseInt(e.target.value) || 0)}
                />
                <p className="help-text">Output port for data that doesn't match any case</p>
              </div>
            </div>

            <div className="form-section">
              <h4>Test Switch Logic</h4>
              <div className="form-group">
                <label>Test Data (JSON)</label>
                <textarea
                  value={formData.parameters.testData || '{"status": "active"}'}
                  onChange={(e) => handleParameterChange('testData', e.target.value)}
                  placeholder='{"status": "active", "user": {"role": "admin"}}'
                  rows={3}
                  className="query-textarea"
                />
                <p className="help-text">Enter sample JSON data to test your switch logic</p>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  try {
                    const testData = JSON.parse(formData.parameters.testData || '{}');
                    const dataField = formData.parameters.dataField || '';
                    const mode = formData.parameters.mode || 'equals';
                    const cases = formData.parameters.cases || [];
                    const caseSensitive = formData.parameters.caseSensitive !== false;
                    
                    const fieldValue = getNestedValue(testData, dataField);
                    const fieldStr = String(fieldValue || '');
                    
                    let matchedCase = null;
                    let outputIndex = formData.parameters.fallbackOutput || 0;
                    
                    for (let i = 0; i < cases.length; i++) {
                      const switchCase = cases[i];
                      const caseValue = String(switchCase.value || '');
                      let isMatch = false;
                      
                      switch (mode) {
                        case 'equals':
                          isMatch = caseSensitive ? 
                            fieldStr === caseValue : 
                            fieldStr.toLowerCase() === caseValue.toLowerCase();
                          break;
                        case 'contains':
                          isMatch = caseSensitive ? 
                            fieldStr.includes(caseValue) : 
                            fieldStr.toLowerCase().includes(caseValue.toLowerCase());
                          break;
                        case 'startsWith':
                          isMatch = caseSensitive ? 
                            fieldStr.startsWith(caseValue) : 
                            fieldStr.toLowerCase().startsWith(caseValue.toLowerCase());
                          break;
                        case 'endsWith':
                          isMatch = caseSensitive ? 
                            fieldStr.endsWith(caseValue) : 
                            fieldStr.toLowerCase().endsWith(caseValue.toLowerCase());
                          break;
                        case 'regex':
                          try {
                            const regex = new RegExp(caseValue, caseSensitive ? '' : 'i');
                            isMatch = regex.test(fieldStr);
                          } catch (error) {
                            isMatch = false;
                          }
                          break;
                      }
                      
                      if (isMatch) {
                        matchedCase = i + 1;
                        outputIndex = switchCase.outputIndex !== undefined ? switchCase.outputIndex : i;
                        break;
                      }
                    }
                    
                    const result = {
                      fieldValue: fieldValue,
                      matchedCase: matchedCase,
                      outputIndex: outputIndex,
                      isFallback: matchedCase === null
                    };
                    
                    handleParameterChange('testResult', result);
                  } catch (error) {
                    handleParameterChange('testResult', { error: 'Invalid JSON data' });
                  }
                }}
                className="test-connection-btn"
                style={{ marginBottom: '16px' }}
              >
                <FaCheck /> Test Switch Logic
              </button>
              
              {formData.parameters.testResult && (
                <div className="switch-test-result">
                  {formData.parameters.testResult.error ? (
                    <div className="test-result error">
                      <strong>Error:</strong> {formData.parameters.testResult.error}
                    </div>
                  ) : (
                    <div className="test-result success">
                      <p><strong>Field Value:</strong> "{formData.parameters.testResult.fieldValue}"</p>
                      <p><strong>Matched Case:</strong> {
                        formData.parameters.testResult.matchedCase 
                          ? `Case ${formData.parameters.testResult.matchedCase}`
                          : 'No match (fallback)'
                      }</p>
                      <p><strong>Output Port:</strong> {formData.parameters.testResult.outputIndex}</p>
                      {formData.parameters.testResult.isFallback && (
                        <p className="fallback-notice">📌 This data would use the fallback output</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-section">
              <h4>Summary</h4>
              <div className="switch-preview">
                <div className="preview-info">
                  <p><strong>Field:</strong> {formData.parameters.dataField || 'Not set'}</p>
                  <p><strong>Mode:</strong> {formData.parameters.mode || 'equals'}</p>
                  <p><strong>Cases:</strong> {(formData.parameters.cases || []).length}</p>
                  <p><strong>Outputs Needed:</strong> {
                    Math.max(
                      ...(formData.parameters.cases || []).map((c: any) => (c.outputIndex || 0) + 1),
                      (formData.parameters.fallbackOutput || 0) + 1
                    )
                  }</p>
                </div>
              </div>
            </div>
          </>
        );

      case 'database':
        return (
          <>
            {/* Connection Configuration */}
            <div className="form-section">
              <h4 className="section-title">
                <FaDatabase /> Database Connection
                <button
                  type="button"
                  onClick={testDatabaseConnection}
                  disabled={testingConnection}
                  className="test-connection-btn"
                  title="Test Connection"
                >
                  {testingConnection ? (
                    <FaSpinner className="spinning" />
                  ) : (
                    <FaCheck />
                  )}
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </h4>
              
              {connectionTestResult && (
                <div className={`connection-test-result ${connectionTestResult.success ? 'success' : 'error'}`}>
                  {connectionTestResult.message}
                </div>
              )}

              <div className="form-group">
                <label>Connection Method</label>
                <select
                  value={formData.parameters.connectionMethod || 'credential'}
                  onChange={(e) => {
                    handleParameterChange('connectionMethod', e.target.value);
                    setConnectionTestResult(null);
                  }}
                >
                  <option value="credential">Use Saved Credential</option>
                  <option value="manual">Manual Connection</option>
                </select>
              </div>

              {formData.parameters.connectionMethod === 'credential' ? (
                <div className="form-group">
                  <label>Select Credential</label>
                  <select
                    value={formData.parameters.credentialId || ''}
                    onChange={(e) => {
                      handleParameterChange('credentialId', e.target.value);
                      setConnectionTestResult(null);
                    }}
                  >
                    <option value="">Select a database credential...</option>
                    {credentials.map((cred) => (
                      <option key={cred.id} value={cred.id}>
                        {cred.name} ({cred.type})
                      </option>
                    ))}
                  </select>
                  {credentials.length === 0 && (
                    <p className="help-text">
                      No database credentials found. Create one in the Integrations page.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Database Type</label>
                    <select
                      value={formData.parameters.connection?.dbType || 'postgresql'}
                      onChange={(e) => {
                        handleParameterChange('connection', {
                          ...formData.parameters.connection,
                          dbType: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                    >
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="mongodb">MongoDB</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Host</label>
                    <input
                      type="text"
                      value={formData.parameters.connection?.host || ''}
                      onChange={(e) => {
                        handleParameterChange('connection', {
                          ...formData.parameters.connection,
                          host: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="form-group">
                    <label>Port</label>
                    <input
                      type="number"
                      value={formData.parameters.connection?.port || ''}
                      onChange={(e) => {
                        handleParameterChange('connection', {
                          ...formData.parameters.connection,
                          port: parseInt(e.target.value) || ''
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder={formData.parameters.connection?.dbType === 'mongodb' ? '27017' : 
                                 formData.parameters.connection?.dbType === 'mysql' ? '3306' : '5432'}
                    />
                  </div>
                  <div className="form-group">
                    <label>Database Name</label>
                    <input
                      type="text"
                      value={formData.parameters.connection?.database || ''}
                      onChange={(e) => {
                        handleParameterChange('connection', {
                          ...formData.parameters.connection,
                          database: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="database_name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      value={formData.parameters.connection?.username || ''}
                      onChange={(e) => {
                        handleParameterChange('connection', {
                          ...formData.parameters.connection,
                          username: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="username"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={formData.parameters.connection?.password || ''}
                      onChange={(e) => {
                        handleParameterChange('connection', {
                          ...formData.parameters.connection,
                          password: e.target.value
                        });
                        setConnectionTestResult(null);
                      }}
                      placeholder="password"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Query Configuration */}
            <div className="form-section">
              <h4>Query Configuration</h4>
              <div className="form-group">
                <label>Operation</label>
                <select
                  value={formData.parameters.operation || 'executeQuery'}
                  onChange={(e) => handleParameterChange('operation', e.target.value)}
                >
                  <option value="executeQuery">Execute Query</option>
                  <option value="insert">INSERT</option>
                  <option value="update">UPDATE</option>
                  <option value="delete">DELETE</option>
                </select>
              </div>
              
              {formData.parameters.operation === 'executeQuery' && (
                <div className="form-group">
                  <label>Query</label>
                  <textarea
                    value={formData.parameters.query || ''}
                    onChange={(e) => handleParameterChange('query', e.target.value)}
                    placeholder="SELECT * FROM users WHERE active = true"
                    rows={4}
                    className="query-textarea"
                  />
                </div>
              )}
              
              {['insert', 'update', 'delete'].includes(formData.parameters.operation) && (
                <div className="form-group">
                  <label>Table</label>
                  <input
                    type="text"
                    value={formData.parameters.table || ''}
                    onChange={(e) => handleParameterChange('table', e.target.value)}
                    placeholder="table_name"
                  />
                </div>
              )}
              
              {['insert', 'update'].includes(formData.parameters.operation) && (
                <div className="form-group">
                  <label>Columns (JSON)</label>
                  <textarea
                    value={formData.parameters.columns || '{}'}
                    onChange={(e) => handleParameterChange('columns', e.target.value)}
                    placeholder='{"name": "John", "email": "john@example.com"}'
                    rows={3}
                  />
                </div>
              )}
              
              {['update', 'delete'].includes(formData.parameters.operation) && (
                <div className="form-group">
                  <label>Where Condition</label>
                  <input
                    type="text"
                    value={formData.parameters.where || ''}
                    onChange={(e) => handleParameterChange('where', e.target.value)}
                    placeholder="id = 1"
                  />
                </div>
              )}
            </div>
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
            <div className="form-section">
              <h4 className="section-title">
                <FaStopwatch /> Delay Configuration
              </h4>
              
              <div className="form-group">
                <label>Delay Mode</label>
                <select
                  value={formData.parameters.delayMode || 'fixed'}
                  onChange={(e) => handleParameterChange('delayMode', e.target.value)}
                >
                  <option value="fixed">Fixed Delay</option>
                  <option value="random">Random Delay</option>
                  <option value="progressive">Progressive Delay</option>
                  <option value="schedule">Scheduled Delay</option>
                  <option value="cron">Cron Schedule</option>
                </select>
                <p className="help-text">Choose how the delay should be calculated</p>
              </div>

              {/* Fixed Delay */}
              {formData.parameters.delayMode === 'fixed' && (
                <div className="form-group">
                  <label>Delay Duration</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={formData.parameters.duration || 1}
                      onChange={(e) => handleParameterChange('duration', parseInt(e.target.value) || 1)}
                      style={{ flex: '1' }}
                    />
                    <select
                      value={formData.parameters.unit || 'seconds'}
                      onChange={(e) => handleParameterChange('unit', e.target.value)}
                      style={{ flex: '0 0 120px' }}
                    >
                      <option value="milliseconds">Milliseconds</option>
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  <p className="help-text">Fixed delay duration</p>
                </div>
              )}

              {/* Random Delay */}
              {formData.parameters.delayMode === 'random' && (
                <>
                  <div className="form-group">
                    <label>Minimum Delay</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={formData.parameters.minDuration || 1}
                        onChange={(e) => handleParameterChange('minDuration', parseInt(e.target.value) || 1)}
                        style={{ flex: '1' }}
                      />
                      <select
                        value={formData.parameters.unit || 'seconds'}
                        onChange={(e) => handleParameterChange('unit', e.target.value)}
                        style={{ flex: '0 0 120px' }}
                      >
                        <option value="milliseconds">Milliseconds</option>
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Maximum Delay</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={formData.parameters.maxDuration || 10}
                        onChange={(e) => handleParameterChange('maxDuration', parseInt(e.target.value) || 10)}
                        style={{ flex: '1' }}
                      />
                      <span style={{ flex: '0 0 120px', color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
                        {formData.parameters.unit || 'seconds'}
                      </span>
                    </div>
                    <p className="help-text">Random delay between min and max</p>
                  </div>
                </>
              )}

              {/* Progressive Delay */}
              {formData.parameters.delayMode === 'progressive' && (
                <>
                  <div className="form-group">
                    <label>Initial Delay</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={formData.parameters.initialDelay || 1}
                        onChange={(e) => handleParameterChange('initialDelay', parseInt(e.target.value) || 1)}
                        style={{ flex: '1' }}
                      />
                      <select
                        value={formData.parameters.unit || 'seconds'}
                        onChange={(e) => handleParameterChange('unit', e.target.value)}
                        style={{ flex: '0 0 120px' }}
                      >
                        <option value="milliseconds">Milliseconds</option>
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Increment Per Step</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={formData.parameters.increment || 1}
                        onChange={(e) => handleParameterChange('increment', parseInt(e.target.value) || 1)}
                        style={{ flex: '1' }}
                      />
                      <span style={{ flex: '0 0 120px', color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
                        {formData.parameters.unit || 'seconds'}
                      </span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Maximum Delay</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={formData.parameters.maxDelay || 60}
                        onChange={(e) => handleParameterChange('maxDelay', parseInt(e.target.value) || 60)}
                        style={{ flex: '1' }}
                      />
                      <span style={{ flex: '0 0 120px', color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
                        {formData.parameters.unit || 'seconds'}
                      </span>
                    </div>
                    <p className="help-text">Delay increases progressively up to this limit</p>
                  </div>
                </>
              )}

              {/* Schedule Delay */}
              {formData.parameters.delayMode === 'schedule' && (
                <>
                  <div className="form-group">
                    <label>Target Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.parameters.scheduleTime || ''}
                      onChange={(e) => handleParameterChange('scheduleTime', e.target.value)}
                    />
                    <p className="help-text">Delay until this specific date and time</p>
                  </div>
                  <div className="form-group">
                    <label>Timezone</label>
                    <select
                      value={formData.parameters.timezone || 'UTC'}
                      onChange={(e) => handleParameterChange('timezone', e.target.value)}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Shanghai">Shanghai</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.skipWeekends || false}
                        onChange={(e) => handleParameterChange('skipWeekends', e.target.checked)}
                      />
                      Skip Weekends
                    </label>
                    <p className="help-text">If target falls on weekend, move to next business day</p>
                  </div>
                </>
              )}

              {/* Cron Schedule */}
              {formData.parameters.delayMode === 'cron' && (
                <>
                  <div className="form-group">
                    <label>Cron Expression</label>
                    <input
                      type="text"
                      value={formData.parameters.cronExpression || '0 9 * * 1-5'}
                      onChange={(e) => handleParameterChange('cronExpression', e.target.value)}
                      placeholder="0 9 * * 1-5"
                    />
                    <p className="help-text">Standard cron format: minute hour day month weekday</p>
                  </div>
                  <div className="form-group">
                    <label>Timezone</label>
                    <select
                      value={formData.parameters.timezone || 'UTC'}
                      onChange={(e) => handleParameterChange('timezone', e.target.value)}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Shanghai">Shanghai</option>
                    </select>
                  </div>
                  <div className="form-section">
                    <h5>Common Cron Examples:</h5>
                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
                      <p><code>0 9 * * 1-5</code> - 9:00 AM weekdays</p>
                      <p><code>0 */2 * * *</code> - Every 2 hours</p>
                      <p><code>0 0 1 * *</code> - First day of month</p>
                      <p><code>0 0 * * 0</code> - Every Sunday midnight</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="form-section">
              <h4 className="section-title">
                <FaClock /> Delay Preview
              </h4>
              
              <button
                type="button"
                onClick={() => {
                  const mode = formData.parameters.delayMode || 'fixed';
                  let previewText = '';
                  let nextExecution = '';
                  
                  switch (mode) {
                    case 'fixed':
                      const duration = formData.parameters.duration || 1;
                      const unit = formData.parameters.unit || 'seconds';
                      previewText = `Will wait ${duration} ${unit}`;
                      nextExecution = new Date(Date.now() + (duration * (unit === 'milliseconds' ? 1 : unit === 'seconds' ? 1000 : unit === 'minutes' ? 60000 : unit === 'hours' ? 3600000 : 86400000))).toLocaleString();
                      break;
                    case 'random':
                      const minDur = formData.parameters.minDuration || 1;
                      const maxDur = formData.parameters.maxDuration || 10;
                      const unitR = formData.parameters.unit || 'seconds';
                      previewText = `Will wait randomly between ${minDur} and ${maxDur} ${unitR}`;
                      nextExecution = `Random between ${new Date(Date.now() + (minDur * (unitR === 'milliseconds' ? 1 : unitR === 'seconds' ? 1000 : unitR === 'minutes' ? 60000 : unitR === 'hours' ? 3600000 : 86400000))).toLocaleString()} and ${new Date(Date.now() + (maxDur * (unitR === 'milliseconds' ? 1 : unitR === 'seconds' ? 1000 : unitR === 'minutes' ? 60000 : unitR === 'hours' ? 3600000 : 86400000))).toLocaleString()}`;
                      break;
                    case 'progressive':
                      const initial = formData.parameters.initialDelay || 1;
                      const increment = formData.parameters.increment || 1;
                      const unitP = formData.parameters.unit || 'seconds';
                      previewText = `Will start with ${initial} ${unitP}, incrementing by ${increment} ${unitP}`;
                      nextExecution = new Date(Date.now() + (initial * (unitP === 'milliseconds' ? 1 : unitP === 'seconds' ? 1000 : unitP === 'minutes' ? 60000 : unitP === 'hours' ? 3600000 : 86400000))).toLocaleString();
                      break;
                    case 'schedule':
                      const scheduleTime = formData.parameters.scheduleTime || '';
                      if (scheduleTime) {
                        previewText = `Will wait until ${scheduleTime}`;
                        nextExecution = new Date(scheduleTime).toLocaleString();
                      } else {
                        previewText = 'Please set a target date and time';
                        nextExecution = 'Not set';
                      }
                      break;
                    case 'cron':
                      const cronExpr = formData.parameters.cronExpression || '0 9 * * 1-5';
                      previewText = `Will wait for next cron schedule: ${cronExpr}`;
                      nextExecution = 'Next occurrence based on cron expression';
                      break;
                  }
                  
                  const result = {
                    mode: mode,
                    description: previewText,
                    nextExecution: nextExecution
                  };
                  
                  handleParameterChange('previewResult', result);
                }}
                className="test-connection-btn"
                style={{ marginBottom: '16px' }}
              >
                <FaCheck /> Preview Delay
              </button>
              
              {formData.parameters.previewResult && (
                <div className="switch-preview">
                  <div className="preview-info">
                    <p><strong>Mode:</strong> {formData.parameters.previewResult.mode}</p>
                    <p><strong>Description:</strong> {formData.parameters.previewResult.description}</p>
                    <p><strong>Next Execution:</strong> {formData.parameters.previewResult.nextExecution}</p>
                  </div>
                </div>
              )}

              <div className="loop-examples">
                <h5>Delay Metadata Example:</h5>
                <div className="code-preview">
                  <pre>{`{
  "originalData": "...",
  "$delay": {
    "mode": "${formData.parameters.delayMode || 'fixed'}",
    "startedAt": "2024-01-15T10:30:00.000Z",
    "plannedDelay": ${formData.parameters.delayMode === 'fixed' ? (formData.parameters.duration || 1) * 1000 : 'variable'},
    "unit": "${formData.parameters.unit || 'seconds'}",${formData.parameters.delayMode === 'schedule' || formData.parameters.delayMode === 'cron' ? '\n    "targetTime": "2024-01-15T12:00:00.000Z",' : ''}
    "timezone": "${formData.parameters.timezone || 'UTC'}"
  }
}`}</pre>
                </div>
              </div>
            </div>
          </>
        );

      case 'loop':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaSyncAlt /> Loop Configuration
              </h4>
              
              <div className="form-group">
                <label>Loop Mode</label>
                <select
                  value={formData.parameters.loopMode || 'fixed'}
                  onChange={(e) => handleParameterChange('loopMode', e.target.value)}
                >
                  <option value="fixed">Fixed Iterations</option>
                  <option value="forEach">For Each Item</option>
                  <option value="while">While Condition</option>
                  <option value="range">Range Loop</option>
                </select>
                <p className="help-text">Choose how the loop should iterate</p>
              </div>

              {/* Fixed Iterations */}
              {formData.parameters.loopMode === 'fixed' && (
                <div className="form-group">
                  <label>Number of Iterations</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.parameters.iterations || 1}
                    onChange={(e) => handleParameterChange('iterations', parseInt(e.target.value) || 1)}
                  />
                  <p className="help-text">How many times to repeat the loop</p>
                </div>
              )}

              {/* For Each Item */}
              {formData.parameters.loopMode === 'forEach' && (
                <div className="form-group">
                  <label>Array Field</label>
                  <input
                    type="text"
                    value={formData.parameters.arrayField || ''}
                    onChange={(e) => handleParameterChange('arrayField', e.target.value)}
                    placeholder="items"
                  />
                  <p className="help-text">Field containing the array to iterate over (use dot notation: data.items)</p>
                </div>
              )}

              {/* While Condition */}
              {formData.parameters.loopMode === 'while' && (
                <>
                  <div className="form-group">
                    <label>Condition</label>
                    <input
                      type="text"
                      value={formData.parameters.condition || '$iteration < 10'}
                      onChange={(e) => handleParameterChange('condition', e.target.value)}
                      placeholder="$iteration < 10"
                      className="query-textarea"
                    />
                    <p className="help-text">JavaScript condition to continue looping. Available variables: $iteration, $data, $item, $index</p>
                  </div>
                  <div className="form-group">
                    <label>Max Iterations (Safety Limit)</label>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={formData.parameters.maxIterations || 1000}
                      onChange={(e) => handleParameterChange('maxIterations', parseInt(e.target.value) || 1000)}
                    />
                    <p className="help-text">Maximum iterations to prevent infinite loops</p>
                  </div>
                </>
              )}

              {/* Range Loop */}
              {formData.parameters.loopMode === 'range' && (
                <>
                  <div className="form-group">
                    <label>Start Value</label>
                    <input
                      type="number"
                      value={formData.parameters.startValue !== undefined ? formData.parameters.startValue : 0}
                      onChange={(e) => handleParameterChange('startValue', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Value</label>
                    <input
                      type="number"
                      value={formData.parameters.endValue !== undefined ? formData.parameters.endValue : 10}
                      onChange={(e) => handleParameterChange('endValue', parseInt(e.target.value) || 10)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Step Value</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.parameters.stepValue || 1}
                      onChange={(e) => handleParameterChange('stepValue', parseInt(e.target.value) || 1)}
                    />
                    <p className="help-text">Range: {formData.parameters.startValue || 0} to {formData.parameters.endValue || 10} by {formData.parameters.stepValue || 1}</p>
                  </div>
                </>
              )}
            </div>

            <div className="form-section">
              <h4 className="section-title">
                <FaListUl /> Output Options
              </h4>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.addLoopData !== false}
                    onChange={(e) => handleParameterChange('addLoopData', e.target.checked)}
                  />
                  Add Loop Metadata
                </label>
                <p className="help-text">Include loop information ($loop) in output data</p>
              </div>

              <div className="form-group">
                <label>Batch Size</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={formData.parameters.batchSize || 0}
                  onChange={(e) => handleParameterChange('batchSize', parseInt(e.target.value) || 0)}
                />
                <p className="help-text">Process iterations in batches (0 = process individually)</p>
              </div>
            </div>

            <div className="form-section">
              <h4 className="section-title">
                <FaStopwatch /> Loop Preview
              </h4>
              
              <button
                type="button"
                onClick={() => {
                  const mode = formData.parameters.loopMode || 'fixed';
                  let iterationCount = 0;
                  let previewText = '';
                  
                  switch (mode) {
                    case 'fixed':
                      iterationCount = formData.parameters.iterations || 1;
                      previewText = `Will repeat ${iterationCount} time${iterationCount !== 1 ? 's' : ''}`;
                      break;
                    case 'forEach':
                      const field = formData.parameters.arrayField || 'items';
                      previewText = `Will iterate over array in field: ${field}`;
                      iterationCount = '?'; // Unknown until runtime
                      break;
                    case 'while':
                      const condition = formData.parameters.condition || '$iteration < 10';
                      const maxIter = formData.parameters.maxIterations || 1000;
                      previewText = `Will loop while: ${condition} (max ${maxIter} iterations)`;
                      iterationCount = '?'; // Unknown until runtime
                      break;
                    case 'range':
                      const start = formData.parameters.startValue || 0;
                      const end = formData.parameters.endValue || 10;
                      const step = formData.parameters.stepValue || 1;
                      iterationCount = Math.max(0, Math.ceil((end - start) / step));
                      previewText = `Range ${start} to ${end} by ${step} = ${iterationCount} iteration${iterationCount !== 1 ? 's' : ''}`;
                      break;
                  }
                  
                  const batchSize = formData.parameters.batchSize || 0;
                  const batching = batchSize > 0 ? ` (batched by ${batchSize})` : '';
                  const metadata = formData.parameters.addLoopData !== false ? ' with metadata' : ' without metadata';
                  
                  const result = {
                    mode: mode,
                    iterations: iterationCount,
                    description: previewText + batching + metadata
                  };
                  
                  handleParameterChange('previewResult', result);
                }}
                className="test-connection-btn"
                style={{ marginBottom: '16px' }}
              >
                <FaCheck /> Preview Loop
              </button>
              
              {formData.parameters.previewResult && (
                <div className="loop-preview">
                  <div className="preview-info">
                    <p><strong>Mode:</strong> {formData.parameters.previewResult.mode}</p>
                    <p><strong>Expected Iterations:</strong> {formData.parameters.previewResult.iterations}</p>
                    <p><strong>Description:</strong> {formData.parameters.previewResult.description}</p>
                  </div>
                </div>
              )}

              <div className="loop-examples">
                <h5>Loop Metadata Example:</h5>
                <div className="code-preview">
                  <pre>{`{
  "originalData": "...",
  "$loop": {
    "mode": "${formData.parameters.loopMode || 'fixed'}",
    "index": 0,
    "value": ${formData.parameters.loopMode === 'range' ? (formData.parameters.startValue || 0) : 0},
    "total": ${typeof formData.parameters.previewResult?.iterations === 'number' ? formData.parameters.previewResult.iterations : 'N'},
    "isFirst": true,
    "isLast": false${formData.parameters.loopMode === 'forEach' ? ',\n    "item": "arrayItem"' : ''}
  }
}`}</pre>
                </div>
              </div>
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

      case 'transformer':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaExchangeAlt /> Transform Configuration
              </h4>
              
              <div className="form-group">
                <label>Transform Mode</label>
                <select
                  value={formData.parameters.transformMode || 'map'}
                  onChange={(e) => handleParameterChange('transformMode', e.target.value)}
                >
                  <option value="map">Map Fields</option>
                  <option value="filter">Filter Data</option>
                  <option value="aggregate">Aggregate Data</option>
                  <option value="custom">Custom Function</option>
                  <option value="jsonPath">JSONPath Extract</option>
                </select>
                <p className="help-text">Choose how to transform the data</p>
              </div>

              {/* Map Fields Mode */}
              {formData.parameters.transformMode === 'map' && (
                <>
                  <div className="form-group">
                    <label>Field Mapping</label>
                    <div className="parameters-header">
                      <span>Source → Target</span>
                      <button
                        type="button"
                        className="btn-add-param"
                        onClick={() => {
                          const mappings = formData.parameters.fieldMappings || {};
                          const newKey = `field${Object.keys(mappings).length + 1}`;
                          handleParameterChange('fieldMappings', {
                            ...mappings,
                            [newKey]: ''
                          });
                        }}
                      >
                        <FaPlus /> Add Mapping
                      </button>
                    </div>
                    {Object.entries(formData.parameters.fieldMappings || {}).map(([sourceField, targetField]) => (
                      <div key={sourceField} className="parameter-row">
                        <input
                          type="text"
                          value={sourceField}
                          onChange={(e) => {
                            const mappings = { ...formData.parameters.fieldMappings };
                            mappings[e.target.value] = mappings[sourceField];
                            delete mappings[sourceField];
                            handleParameterChange('fieldMappings', mappings);
                          }}
                          className="param-key-input"
                          placeholder="source.field"
                        />
                        <input
                          type="text"
                          value={String(targetField)}
                          onChange={(e) => {
                            const mappings = { ...formData.parameters.fieldMappings };
                            mappings[sourceField] = e.target.value;
                            handleParameterChange('fieldMappings', mappings);
                          }}
                          className="param-value-input"
                          placeholder="target.field"
                        />
                        <button
                          type="button"
                          className="btn-remove-param"
                          onClick={() => {
                            const mappings = { ...formData.parameters.fieldMappings };
                            delete mappings[sourceField];
                            handleParameterChange('fieldMappings', mappings);
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                    <p className="help-text">Map source fields to target fields (use dot notation for nested fields)</p>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.keepUnmapped !== false}
                        onChange={(e) => handleParameterChange('keepUnmapped', e.target.checked)}
                      />
                      Keep Unmapped Fields
                    </label>
                    <p className="help-text">Include fields not explicitly mapped</p>
                  </div>
                </>
              )}

              {/* Filter Mode */}
              {formData.parameters.transformMode === 'filter' && (
                <>
                  <div className="form-group">
                    <label>Filter Conditions</label>
                    <div className="parameters-header">
                      <span>Field Conditions</span>
                      <button
                        type="button"
                        className="btn-add-param"
                        onClick={() => {
                          const conditions = formData.parameters.filterConditions || [];
                          handleParameterChange('filterConditions', [
                            ...conditions,
                            { field: '', operator: 'equals', value: '' }
                          ]);
                        }}
                      >
                        <FaPlus /> Add Condition
                      </button>
                    </div>
                    {(formData.parameters.filterConditions || []).map((condition: any, index: number) => (
                      <div key={index} className="parameter-row" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <input
                          type="text"
                          value={condition.field}
                          onChange={(e) => {
                            const conditions = [...formData.parameters.filterConditions];
                            conditions[index].field = e.target.value;
                            handleParameterChange('filterConditions', conditions);
                          }}
                          className="param-key-input"
                          placeholder="field.name"
                          style={{ flex: '1' }}
                        />
                        <select
                          value={condition.operator}
                          onChange={(e) => {
                            const conditions = [...formData.parameters.filterConditions];
                            conditions[index].operator = e.target.value;
                            handleParameterChange('filterConditions', conditions);
                          }}
                          style={{ flex: '0 0 100px', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
                        >
                          <option value="equals">Equals</option>
                          <option value="notEquals">Not Equals</option>
                          <option value="contains">Contains</option>
                          <option value="startsWith">Starts With</option>
                          <option value="endsWith">Ends With</option>
                          <option value="greaterThan">Greater Than</option>
                          <option value="lessThan">Less Than</option>
                          <option value="exists">Exists</option>
                        </select>
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => {
                            const conditions = [...formData.parameters.filterConditions];
                            conditions[index].value = e.target.value;
                            handleParameterChange('filterConditions', conditions);
                          }}
                          className="param-value-input"
                          placeholder="value"
                          style={{ flex: '1' }}
                          disabled={condition.operator === 'exists'}
                        />
                        <button
                          type="button"
                          className="btn-remove-param"
                          onClick={() => {
                            const conditions = [...formData.parameters.filterConditions];
                            conditions.splice(index, 1);
                            handleParameterChange('filterConditions', conditions);
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                    <p className="help-text">Define conditions to filter data items</p>
                  </div>

                  <div className="form-group">
                    <label>Logic Operator</label>
                    <select
                      value={formData.parameters.logicOperator || 'AND'}
                      onChange={(e) => handleParameterChange('logicOperator', e.target.value)}
                    >
                      <option value="AND">AND (all conditions must match)</option>
                      <option value="OR">OR (any condition can match)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Aggregate Mode */}
              {formData.parameters.transformMode === 'aggregate' && (
                <>
                  <div className="form-group">
                    <label>Group By Field</label>
                    <input
                      type="text"
                      value={formData.parameters.groupByField || ''}
                      onChange={(e) => handleParameterChange('groupByField', e.target.value)}
                      placeholder="category"
                    />
                    <p className="help-text">Field to group data by (leave empty for no grouping)</p>
                  </div>

                  <div className="form-group">
                    <label>Aggregation Functions</label>
                    <div className="parameters-header">
                      <span>Field → Function</span>
                      <button
                        type="button"
                        className="btn-add-param"
                        onClick={() => {
                          const aggregations = formData.parameters.aggregations || {};
                          const newKey = `field${Object.keys(aggregations).length + 1}`;
                          handleParameterChange('aggregations', {
                            ...aggregations,
                            [newKey]: 'sum'
                          });
                        }}
                      >
                        <FaPlus /> Add Aggregation
                      </button>
                    </div>
                    {Object.entries(formData.parameters.aggregations || {}).map(([field, func]) => (
                      <div key={field} className="parameter-row">
                        <input
                          type="text"
                          value={field}
                          onChange={(e) => {
                            const aggregations = { ...formData.parameters.aggregations };
                            aggregations[e.target.value] = aggregations[field];
                            delete aggregations[field];
                            handleParameterChange('aggregations', aggregations);
                          }}
                          className="param-key-input"
                          placeholder="field.name"
                        />
                        <select
                          value={String(func)}
                          onChange={(e) => {
                            const aggregations = { ...formData.parameters.aggregations };
                            aggregations[field] = e.target.value;
                            handleParameterChange('aggregations', aggregations);
                          }}
                          className="param-value-input"
                          style={{ padding: '10px 12px' }}
                        >
                          <option value="sum">Sum</option>
                          <option value="avg">Average</option>
                          <option value="min">Minimum</option>
                          <option value="max">Maximum</option>
                          <option value="count">Count</option>
                          <option value="first">First</option>
                          <option value="last">Last</option>
                        </select>
                        <button
                          type="button"
                          className="btn-remove-param"
                          onClick={() => {
                            const aggregations = { ...formData.parameters.aggregations };
                            delete aggregations[field];
                            handleParameterChange('aggregations', aggregations);
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                    <p className="help-text">Define how to aggregate numeric fields</p>
                  </div>
                </>
              )}

              {/* Custom Function Mode */}
              {formData.parameters.transformMode === 'custom' && (
                <div className="form-group">
                  <label>Custom Transform Function</label>
                  <textarea
                    value={formData.parameters.customFunction || ''}
                    onChange={(e) => handleParameterChange('customFunction', e.target.value)}
                    className="query-textarea"
                    rows={8}
                    placeholder={`// Transform function (JavaScript)
// Input: data - the input data
// Return: transformed data

function transform(data) {
  // Example: Convert all strings to uppercase
  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      name: item.name?.toUpperCase()
    }));
  }
  
  return {
    ...data,
    name: data.name?.toUpperCase()
  };
}`}
                  />
                  <p className="help-text">Write a custom JavaScript function to transform the data</p>
                </div>
              )}

              {/* JSONPath Mode */}
              {formData.parameters.transformMode === 'jsonPath' && (
                <>
                  <div className="form-group">
                    <label>JSONPath Expression</label>
                    <input
                      type="text"
                      value={formData.parameters.jsonPath || ''}
                      onChange={(e) => handleParameterChange('jsonPath', e.target.value)}
                      placeholder="$.users[*].profile"
                    />
                    <p className="help-text">JSONPath expression to extract data (e.g., $.users[*].name)</p>
                  </div>

                  <div className="form-group">
                    <label>Output Field Name</label>
                    <input
                      type="text"
                      value={formData.parameters.outputField || ''}
                      onChange={(e) => handleParameterChange('outputField', e.target.value)}
                      placeholder="extractedData"
                    />
                    <p className="help-text">Field name for extracted data (leave empty to replace root)</p>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.flattenResult || false}
                        onChange={(e) => handleParameterChange('flattenResult', e.target.checked)}
                      />
                      Flatten Single Result
                    </label>
                    <p className="help-text">If result is single item array, return the item directly</p>
                  </div>
                </>
              )}
            </div>

            <div className="form-section">
              <h4 className="section-title">
                <FaCheck /> Transform Preview
              </h4>
              
              <button
                type="button"
                onClick={() => {
                  const mode = formData.parameters.transformMode || 'map';
                  let previewText = '';
                  
                  switch (mode) {
                    case 'map':
                      const mappings = Object.keys(formData.parameters.fieldMappings || {}).length;
                      const keepUnmapped = formData.parameters.keepUnmapped !== false;
                      previewText = `Map ${mappings} field${mappings !== 1 ? 's' : ''} ${keepUnmapped ? '+ keep unmapped fields' : '(only mapped fields)'}`;
                      break;
                    case 'filter':
                      const conditions = (formData.parameters.filterConditions || []).length;
                      const operator = formData.parameters.logicOperator || 'AND';
                      previewText = `Filter using ${conditions} condition${conditions !== 1 ? 's' : ''} with ${operator} logic`;
                      break;
                    case 'aggregate':
                      const groupBy = formData.parameters.groupByField || 'none';
                      const aggregations = Object.keys(formData.parameters.aggregations || {}).length;
                      previewText = `Group by: ${groupBy}, Aggregate ${aggregations} field${aggregations !== 1 ? 's' : ''}`;
                      break;
                    case 'custom':
                      const hasFunction = formData.parameters.customFunction?.trim();
                      previewText = hasFunction ? 'Custom JavaScript function defined' : 'No custom function defined';
                      break;
                    case 'jsonPath':
                      const path = formData.parameters.jsonPath || 'not set';
                      const outputField = formData.parameters.outputField || 'root';
                      previewText = `Extract: ${path} → ${outputField}`;
                      break;
                  }
                  
                  const result = {
                    mode: mode,
                    description: previewText,
                    inputType: Array.isArray(formData.parameters.sampleData) ? 'array' : 'object',
                    outputType: mode === 'aggregate' ? 'object/array' : 'depends on input'
                  };
                  
                  handleParameterChange('previewResult', result);
                }}
                className="test-connection-btn"
                style={{ marginBottom: '16px' }}
              >
                <FaCheck /> Preview Transform
              </button>
              
              {formData.parameters.previewResult && (
                <div className="switch-preview">
                  <div className="preview-info">
                    <p><strong>Mode:</strong> {formData.parameters.previewResult.mode}</p>
                    <p><strong>Description:</strong> {formData.parameters.previewResult.description}</p>
                    <p><strong>Output Type:</strong> {formData.parameters.previewResult.outputType}</p>
                  </div>
                </div>
              )}

              <div className="loop-examples">
                <h5>Transform Output Example:</h5>
                <div className="code-preview">
                  <pre>{`{
  "originalData": { ... },
  "transformedData": ${formData.parameters.transformMode === 'map' ? `{
    "mappedField1": "value1",
    "mappedField2": "value2"
  }` : formData.parameters.transformMode === 'filter' ? `[
    { "item": "matches conditions" }
  ]` : formData.parameters.transformMode === 'aggregate' ? `{
    "group1": { "sum": 100, "count": 5 },
    "group2": { "sum": 200, "count": 3 }
  }` : formData.parameters.transformMode === 'jsonPath' ? `{
    "extractedData": [...]
  }` : `{
    "customResult": "..."
  }`},
  "$transform": {
    "mode": "${formData.parameters.transformMode || 'map'}",
    "processedAt": "2024-01-15T10:30:00.000Z",
    "itemsProcessed": "N"
  }
}`}</pre>
                </div>
              </div>
            </div>
          </>
        );

      case 'merge':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaCodeBranch /> Merge Configuration
              </h4>

              <div className="form-group">
                <label>Merge Mode</label>
                <select
                  value={formData.parameters.mode || 'append'}
                  onChange={(e) => handleParameterChange('mode', e.target.value)}
                >
                  <option value="append">Append - Concatenate data from inputs</option>
                  <option value="mergeByIndex">Merge by Index - Combine items at same positions</option>
                  <option value="mergeByKey">Merge by Key - Combine items with matching properties</option>
                  <option value="multiplex">Multiplex - Create combinations of all inputs</option>
                  <option value="combine">Combine - Various combination strategies</option>
                  <option value="wait">Wait - Wait for data from all inputs</option>
                  <option value="chooseBranch">Choose Branch - Select specific input</option>
                </select>
                <p className="help-text">How to merge data from multiple inputs</p>
              </div>

              {/* Merge by Key Settings */}
              {formData.parameters.mode === 'mergeByKey' && (
                <>
                  <div className="form-group">
                    <label>Property Name (Input 1)</label>
                    <input
                      type="text"
                      value={formData.parameters.propertyName1 || 'id'}
                      onChange={(e) => handleParameterChange('propertyName1', e.target.value)}
                      placeholder="id"
                    />
                    <p className="help-text">Property to match on in first input</p>
                  </div>
                  <div className="form-group">
                    <label>Property Name (Input 2)</label>
                    <input
                      type="text"
                      value={formData.parameters.propertyName2 || 'id'}
                      onChange={(e) => handleParameterChange('propertyName2', e.target.value)}
                      placeholder="id"
                    />
                    <p className="help-text">Property to match on in second input</p>
                  </div>
                  <div className="form-group">
                    <label>Output Data From</label>
                    <select
                      value={formData.parameters.outputDataFrom || 'both'}
                      onChange={(e) => handleParameterChange('outputDataFrom', e.target.value)}
                    >
                      <option value="both">Both Inputs Merged</option>
                      <option value="input1">Input 1 Only</option>
                      <option value="input2">Input 2 Only</option>
                      <option value="enrichInput1">Input 1 Enriched with Input 2</option>
                      <option value="enrichInput2">Input 2 Enriched with Input 1</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeUnmatched || false}
                        onChange={(e) => handleParameterChange('includeUnmatched', e.target.checked)}
                      />
                      Include Unmatched Items
                    </label>
                    <p className="help-text">Include items that don't have matches in both inputs</p>
                  </div>
                </>
              )}

              {/* Merge by Index Settings */}
              {formData.parameters.mode === 'mergeByIndex' && (
                <div className="form-group">
                  <label>Join Type</label>
                  <select
                    value={formData.parameters.join || 'inner'}
                    onChange={(e) => handleParameterChange('join', e.target.value)}
                  >
                    <option value="inner">Inner Join - Only items present in both inputs</option>
                    <option value="left">Left Join - All items from first input</option>
                    <option value="right">Right Join - All items from second input</option>
                    <option value="outer">Outer Join - All items from both inputs</option>
                  </select>
                </div>
              )}

              {/* Choose Branch Settings */}
              {formData.parameters.mode === 'chooseBranch' && (
                <div className="form-group">
                  <label>Choose Input</label>
                  <select
                    value={formData.parameters.chooseBranch || 0}
                    onChange={(e) => handleParameterChange('chooseBranch', parseInt(e.target.value))}
                  >
                    <option value={0}>Input 1</option>
                    <option value={1}>Input 2</option>
                  </select>
                </div>
              )}

              {/* Combine Settings */}
              {formData.parameters.mode === 'combine' && (
                <>
                  <div className="form-group">
                    <label>Combine Mode</label>
                    <select
                      value={formData.parameters.combineMode || 'mergeByPosition'}
                      onChange={(e) => handleParameterChange('combineMode', e.target.value)}
                    >
                      <option value="mergeByPosition">Merge By Position</option>
                      <option value="mergeAllToSingle">Merge All to Single Object</option>
                      <option value="addArray">Add as Arrays</option>
                    </select>
                  </div>
                  {formData.parameters.combineMode === 'addArray' && (
                    <div className="form-group">
                      <label>Array Property Name</label>
                      <input
                        type="text"
                        value={formData.parameters.arrayPropertyName || 'data'}
                        onChange={(e) => handleParameterChange('arrayPropertyName', e.target.value)}
                        placeholder="data"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Append Settings */}
              {formData.parameters.mode === 'append' && (
                <>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.removeDuplicates || false}
                        onChange={(e) => handleParameterChange('removeDuplicates', e.target.checked)}
                      />
                      Remove Duplicates
                    </label>
                  </div>
                  {formData.parameters.removeDuplicates && (
                    <div className="form-group">
                      <label>Duplicate Check Property</label>
                      <input
                        type="text"
                        value={formData.parameters.duplicatePropertyName || 'id'}
                        onChange={(e) => handleParameterChange('duplicatePropertyName', e.target.value)}
                        placeholder="id"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.addSource || false}
                        onChange={(e) => handleParameterChange('addSource', e.target.checked)}
                      />
                      Add Source Field
                    </label>
                    <p className="help-text">Add field indicating which input the data came from</p>
                  </div>
                  {formData.parameters.addSource && (
                    <div className="form-group">
                      <label>Source Field Name</label>
                      <input
                        type="text"
                        value={formData.parameters.sourceFieldName || '_source'}
                        onChange={(e) => handleParameterChange('sourceFieldName', e.target.value)}
                        placeholder="_source"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Wait Settings */}
              {formData.parameters.mode === 'wait' && (
                <>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.waitForAll !== false}
                        onChange={(e) => handleParameterChange('waitForAll', e.target.checked)}
                      />
                      Wait For All Inputs
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Timeout (ms)</label>
                    <input
                      type="number"
                      value={formData.parameters.timeout || 0}
                      onChange={(e) => handleParameterChange('timeout', parseInt(e.target.value) || 0)}
                      placeholder="0 = no timeout"
                    />
                  </div>
                </>
              )}

              {/* General Options */}
              <div className="form-group">
                <label>Property Name Clash Handling</label>
                <select
                  value={formData.parameters.clashHandling || 'preferInput1'}
                  onChange={(e) => handleParameterChange('clashHandling', e.target.value)}
                >
                  <option value="preferInput1">Prefer Input 1</option>
                  <option value="preferInput2">Prefer Input 2</option>
                  <option value="renameSuffix">Rename with Suffix</option>
                  <option value="mergeNested">Deep Merge Objects</option>
                </select>
              </div>

              {formData.parameters.clashHandling === 'renameSuffix' && (
                <>
                  <div className="form-group">
                    <label>Input 1 Suffix</label>
                    <input
                      type="text"
                      value={formData.parameters.suffixInput1 || '_1'}
                      onChange={(e) => handleParameterChange('suffixInput1', e.target.value)}
                      placeholder="_1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Input 2 Suffix</label>
                    <input
                      type="text"
                      value={formData.parameters.suffixInput2 || '_2'}
                      onChange={(e) => handleParameterChange('suffixInput2', e.target.value)}
                      placeholder="_2"
                    />
                  </div>
                </>
              )}
            </div>
          </>
        );

      case 'filter':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaFilter /> Filter Configuration
              </h4>

              <div className="form-group">
                <label>Filter Mode</label>
                <select
                  value={formData.parameters.mode || 'condition'}
                  onChange={(e) => handleParameterChange('mode', e.target.value)}
                >
                  <option value="condition">Condition-based Filter</option>
                  <option value="jsonPath">JSONPath Filter</option>
                  <option value="javascript">JavaScript Filter</option>
                  <option value="schema">Schema Validation Filter</option>
                  <option value="duplicate">Duplicate Filter</option>
                  <option value="limit">Limit Results</option>
                </select>
              </div>

              {/* Condition-based Filter */}
              {formData.parameters.mode === 'condition' && (
                <>
                  <div className="form-group">
                    <label>Logic Operator</label>
                    <select
                      value={formData.parameters.logicOperator || 'AND'}
                      onChange={(e) => handleParameterChange('logicOperator', e.target.value)}
                    >
                      <option value="AND">AND - All conditions must be true</option>
                      <option value="OR">OR - Any condition can be true</option>
                    </select>
                  </div>

                  <div className="conditions-section">
                    <div className="conditions-header">
                      <label>Filter Conditions</label>
                      <button
                        type="button"
                        onClick={() => {
                          const conditions = formData.parameters.conditions || [];
                          handleParameterChange('conditions', [
                            ...conditions,
                            { field: '', operator: 'equals', value: '', type: 'string' }
                          ]);
                        }}
                        className="btn-add-condition"
                      >
                        + Add Condition
                      </button>
                    </div>

                    {(formData.parameters.conditions || []).map((condition: any, index: number) => (
                      <div key={index} className="condition-row">
                        <div className="condition-fields">
                          <input
                            type="text"
                            value={condition.field || ''}
                            onChange={(e) => {
                              const conditions = [...(formData.parameters.conditions || [])];
                              conditions[index] = { ...conditions[index], field: e.target.value };
                              handleParameterChange('conditions', conditions);
                            }}
                            placeholder="Field path (e.g., user.name)"
                          />
                          
                          <select
                            value={condition.operator || 'equals'}
                            onChange={(e) => {
                              const conditions = [...(formData.parameters.conditions || [])];
                              conditions[index] = { ...conditions[index], operator: e.target.value };
                              handleParameterChange('conditions', conditions);
                            }}
                          >
                            <option value="equals">Equals</option>
                            <option value="notEquals">Not Equals</option>
                            <option value="contains">Contains</option>
                            <option value="notContains">Not Contains</option>
                            <option value="startsWith">Starts With</option>
                            <option value="endsWith">Ends With</option>
                            <option value="regex">Regex Match</option>
                            <option value="greaterThan">Greater Than</option>
                            <option value="lessThan">Less Than</option>
                            <option value="greaterThanOrEqual">Greater Than or Equal</option>
                            <option value="lessThanOrEqual">Less Than or Equal</option>
                            <option value="isEmpty">Is Empty</option>
                            <option value="isNotEmpty">Is Not Empty</option>
                            <option value="exists">Field Exists</option>
                            <option value="notExists">Field Not Exists</option>
                          </select>

                          <input
                            type="text"
                            value={condition.value || ''}
                            onChange={(e) => {
                              const conditions = [...(formData.parameters.conditions || [])];
                              conditions[index] = { ...conditions[index], value: e.target.value };
                              handleParameterChange('conditions', conditions);
                            }}
                            placeholder="Value to compare"
                            disabled={['isEmpty', 'isNotEmpty', 'exists', 'notExists'].includes(condition.operator)}
                          />
                          
                          <select
                            value={condition.type || 'string'}
                            onChange={(e) => {
                              const conditions = [...(formData.parameters.conditions || [])];
                              conditions[index] = { ...conditions[index], type: e.target.value };
                              handleParameterChange('conditions', conditions);
                            }}
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="date">Date</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const conditions = formData.parameters.conditions?.filter((_: any, i: number) => i !== index) || [];
                            handleParameterChange('conditions', conditions);
                          }}
                          className="delete-condition-btn"
                          title="Delete Condition"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}

                    {(!formData.parameters.conditions || formData.parameters.conditions.length === 0) && (
                      <p className="help-text">No conditions defined. Add a condition to filter data.</p>
                    )}
                  </div>
                </>
              )}

              {/* JSONPath Filter */}
              {formData.parameters.mode === 'jsonPath' && (
                <div className="form-group">
                  <label>JSONPath Expression</label>
                  <input
                    type="text"
                    value={formData.parameters.jsonPath || ''}
                    onChange={(e) => handleParameterChange('jsonPath', e.target.value)}
                    placeholder="$.items[?(@.active == true)]"
                  />
                  <p className="help-text">JSONPath expression to filter data</p>
                </div>
              )}

              {/* JavaScript Filter */}
              {formData.parameters.mode === 'javascript' && (
                <div className="form-group">
                  <label>JavaScript Filter Function</label>
                  <textarea
                    value={formData.parameters.jsFilter || ''}
                    onChange={(e) => handleParameterChange('jsFilter', e.target.value)}
                    placeholder="// Return true to keep item, false to filter out\nreturn item.status === 'active' && item.score > 50;"
                    rows={6}
                  />
                  <p className="help-text">JavaScript function body. Available variables: item, index, items</p>
                </div>
              )}

              {/* Duplicate Filter */}
              {formData.parameters.mode === 'duplicate' && (
                <>
                  <div className="form-group">
                    <label>Duplicate Check Field</label>
                    <input
                      type="text"
                      value={formData.parameters.duplicateField || 'id'}
                      onChange={(e) => handleParameterChange('duplicateField', e.target.value)}
                      placeholder="id"
                    />
                  </div>
                  <div className="form-group">
                    <label>Keep</label>
                    <select
                      value={formData.parameters.keepDuplicate || 'first'}
                      onChange={(e) => handleParameterChange('keepDuplicate', e.target.value)}
                    >
                      <option value="first">First Occurrence</option>
                      <option value="last">Last Occurrence</option>
                      <option value="none">Remove All Duplicates</option>
                    </select>
                  </div>
                </>
              )}

              {/* Limit Filter */}
              {formData.parameters.mode === 'limit' && (
                <>
                  <div className="form-group">
                    <label>Limit</label>
                    <input
                      type="number"
                      value={formData.parameters.limit || 10}
                      onChange={(e) => handleParameterChange('limit', parseInt(e.target.value) || 10)}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Skip (Offset)</label>
                    <input
                      type="number"
                      value={formData.parameters.skip || 0}
                      onChange={(e) => handleParameterChange('skip', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </>
              )}

              {/* General Options */}
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.caseSensitive || false}
                    onChange={(e) => handleParameterChange('caseSensitive', e.target.checked)}
                  />
                  Case Sensitive Comparison
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.continueOnFail !== false}
                    onChange={(e) => handleParameterChange('continueOnFail', e.target.checked)}
                  />
                  Continue on Failure
                </label>
                <p className="help-text">Continue processing other items if filter fails on one item</p>
              </div>
            </div>
          </>
        );

      case 'split':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaExpand /> Split Configuration
              </h4>

              <div className="form-group">
                <label>Split Mode</label>
                <select
                  value={formData.parameters.mode || 'array'}
                  onChange={(e) => handleParameterChange('mode', e.target.value)}
                >
                  <option value="array">Split Array - Split array into individual items</option>
                  <option value="batch">Batch Split - Split into batches of specified size</option>
                  <option value="field">Field Split - Split by field value</option>
                  <option value="regex">Regex Split - Split text by regex pattern</option>
                  <option value="delimiter">Delimiter Split - Split by delimiter</option>
                  <option value="chunks">Chunk Split - Split into equal chunks</option>
                  <option value="conditional">Conditional Split - Split based on conditions</option>
                </select>
                <p className="help-text">How to split the input data</p>
              </div>

              {/* Array Split Settings */}
              {formData.parameters.mode === 'array' && (
                <>
                  <div className="form-group">
                    <label>Array Path</label>
                    <input
                      type="text"
                      value={formData.parameters.arrayPath || 'items'}
                      onChange={(e) => handleParameterChange('arrayPath', e.target.value)}
                      placeholder="items"
                    />
                    <p className="help-text">Path to the array field to split (use dot notation for nested)</p>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.preserveParent || false}
                        onChange={(e) => handleParameterChange('preserveParent', e.target.checked)}
                      />
                      Preserve Parent Object
                    </label>
                    <p className="help-text">Include parent object properties in each split item</p>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.addIndex || false}
                        onChange={(e) => handleParameterChange('addIndex', e.target.checked)}
                      />
                      Add Index Field
                    </label>
                    <p className="help-text">Add index field to track original position</p>
                  </div>
                  {formData.parameters.addIndex && (
                    <div className="form-group">
                      <label>Index Field Name</label>
                      <input
                        type="text"
                        value={formData.parameters.indexFieldName || '_index'}
                        onChange={(e) => handleParameterChange('indexFieldName', e.target.value)}
                        placeholder="_index"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Batch Split Settings */}
              {formData.parameters.mode === 'batch' && (
                <>
                  <div className="form-group">
                    <label>Batch Size</label>
                    <input
                      type="number"
                      value={formData.parameters.batchSize || 10}
                      onChange={(e) => handleParameterChange('batchSize', parseInt(e.target.value) || 10)}
                      min="1"
                    />
                    <p className="help-text">Number of items per batch</p>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includePartial || true}
                        onChange={(e) => handleParameterChange('includePartial', e.target.checked)}
                      />
                      Include Partial Batches
                    </label>
                    <p className="help-text">Include the last batch even if it's smaller than batch size</p>
                  </div>
                </>
              )}

              {/* Field Split Settings */}
              {formData.parameters.mode === 'field' && (
                <>
                  <div className="form-group">
                    <label>Split Field</label>
                    <input
                      type="text"
                      value={formData.parameters.splitField || 'category'}
                      onChange={(e) => handleParameterChange('splitField', e.target.value)}
                      placeholder="category"
                    />
                    <p className="help-text">Field to group items by</p>
                  </div>
                  <div className="form-group">
                    <label>Output Mode</label>
                    <select
                      value={formData.parameters.outputMode || 'separate'}
                      onChange={(e) => handleParameterChange('outputMode', e.target.value)}
                    >
                      <option value="separate">Separate Items - Each unique value becomes separate output</option>
                      <option value="grouped">Grouped Arrays - Group items by field value</option>
                    </select>
                  </div>
                </>
              )}

              {/* Regex Split Settings */}
              {formData.parameters.mode === 'regex' && (
                <>
                  <div className="form-group">
                    <label>Text Field</label>
                    <input
                      type="text"
                      value={formData.parameters.textField || 'text'}
                      onChange={(e) => handleParameterChange('textField', e.target.value)}
                      placeholder="text"
                    />
                    <p className="help-text">Field containing text to split</p>
                  </div>
                  <div className="form-group">
                    <label>Regex Pattern</label>
                    <input
                      type="text"
                      value={formData.parameters.regexPattern || '\\s+'}
                      onChange={(e) => handleParameterChange('regexPattern', e.target.value)}
                      placeholder="\\s+"
                    />
                    <p className="help-text">Regular expression pattern to split on</p>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.removeEmpty || true}
                        onChange={(e) => handleParameterChange('removeEmpty', e.target.checked)}
                      />
                      Remove Empty Parts
                    </label>
                  </div>
                </>
              )}

              {/* Delimiter Split Settings */}
              {formData.parameters.mode === 'delimiter' && (
                <>
                  <div className="form-group">
                    <label>Text Field</label>
                    <input
                      type="text"
                      value={formData.parameters.textField || 'text'}
                      onChange={(e) => handleParameterChange('textField', e.target.value)}
                      placeholder="text"
                    />
                  </div>
                  <div className="form-group">
                    <label>Delimiter</label>
                    <input
                      type="text"
                      value={formData.parameters.delimiter || ','}
                      onChange={(e) => handleParameterChange('delimiter', e.target.value)}
                      placeholder=","
                    />
                    <p className="help-text">Delimiter to split on (comma, semicolon, pipe, etc.)</p>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.trimWhitespace || true}
                        onChange={(e) => handleParameterChange('trimWhitespace', e.target.checked)}
                      />
                      Trim Whitespace
                    </label>
                  </div>
                </>
              )}

              {/* Chunk Split Settings */}
              {formData.parameters.mode === 'chunks' && (
                <div className="form-group">
                  <label>Number of Chunks</label>
                  <input
                    type="number"
                    value={formData.parameters.chunkCount || 3}
                    onChange={(e) => handleParameterChange('chunkCount', parseInt(e.target.value) || 3)}
                    min="1"
                  />
                  <p className="help-text">Number of equal chunks to split data into</p>
                </div>
              )}

              {/* Conditional Split Settings */}
              {formData.parameters.mode === 'conditional' && (
                <div className="conditions-section">
                  <div className="conditions-header">
                    <label>Split Conditions</label>
                    <button
                      type="button"
                      onClick={() => {
                        const conditions = formData.parameters.splitConditions || [];
                        handleParameterChange('splitConditions', [
                          ...conditions,
                          { field: '', operator: 'equals', value: '', outputName: '' }
                        ]);
                      }}
                      className="btn-add-condition"
                    >
                      + Add Condition
                    </button>
                  </div>

                  {(formData.parameters.splitConditions || []).map((condition: any, index: number) => (
                    <div key={index} className="condition-row">
                      <div className="condition-fields">
                        <input
                          type="text"
                          value={condition.field || ''}
                          onChange={(e) => {
                            const conditions = [...(formData.parameters.splitConditions || [])];
                            conditions[index] = { ...conditions[index], field: e.target.value };
                            handleParameterChange('splitConditions', conditions);
                          }}
                          placeholder="Field path"
                        />
                        
                        <select
                          value={condition.operator || 'equals'}
                          onChange={(e) => {
                            const conditions = [...(formData.parameters.splitConditions || [])];
                            conditions[index] = { ...conditions[index], operator: e.target.value };
                            handleParameterChange('splitConditions', conditions);
                          }}
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="greaterThan">Greater Than</option>
                          <option value="lessThan">Less Than</option>
                        </select>

                        <input
                          type="text"
                          value={condition.value || ''}
                          onChange={(e) => {
                            const conditions = [...(formData.parameters.splitConditions || [])];
                            conditions[index] = { ...conditions[index], value: e.target.value };
                            handleParameterChange('splitConditions', conditions);
                          }}
                          placeholder="Value"
                        />

                        <input
                          type="text"
                          value={condition.outputName || ''}
                          onChange={(e) => {
                            const conditions = [...(formData.parameters.splitConditions || [])];
                            conditions[index] = { ...conditions[index], outputName: e.target.value };
                            handleParameterChange('splitConditions', conditions);
                          }}
                          placeholder="Output name"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const conditions = formData.parameters.splitConditions?.filter((_: any, i: number) => i !== index) || [];
                          handleParameterChange('splitConditions', conditions);
                        }}
                        className="delete-condition-btn"
                        title="Delete Condition"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* General Options */}
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.continueOnFail !== false}
                    onChange={(e) => handleParameterChange('continueOnFail', e.target.checked)}
                  />
                  Continue on Failure
                </label>
                <p className="help-text">Continue processing if split fails on some items</p>
              </div>
            </div>
          </>
        );

      case 'aggregate':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaLayerGroup /> Aggregate Configuration
              </h4>

              <div className="form-group">
                <label>Aggregate Mode</label>
                <select
                  value={formData.parameters.mode || 'group'}
                  onChange={(e) => handleParameterChange('mode', e.target.value)}
                >
                  <option value="group">Group By - Group items by field value</option>
                  <option value="sum">Sum - Calculate sum of numeric fields</option>
                  <option value="count">Count - Count items or field occurrences</option>
                  <option value="average">Average - Calculate average of numeric fields</option>
                  <option value="minMax">Min/Max - Find minimum and maximum values</option>
                  <option value="collect">Collect - Collect field values into arrays</option>
                  <option value="merge">Merge Objects - Merge all objects into one</option>
                  <option value="stats">Statistics - Calculate comprehensive statistics</option>
                </select>
                <p className="help-text">Type of aggregation to perform</p>
              </div>

              {/* Group By Settings */}
              {formData.parameters.mode === 'group' && (
                <>
                  <div className="form-group">
                    <label>Group By Fields</label>
                    <input
                      type="text"
                      value={formData.parameters.groupByFields || 'category'}
                      onChange={(e) => handleParameterChange('groupByFields', e.target.value)}
                      placeholder="category,status (comma-separated for multiple fields)"
                    />
                    <p className="help-text">Fields to group by (use dot notation for nested fields)</p>
                  </div>
                  <div className="form-group">
                    <label>Output Format</label>
                    <select
                      value={formData.parameters.outputFormat || 'grouped'}
                      onChange={(e) => handleParameterChange('outputFormat', e.target.value)}
                    >
                      <option value="grouped">Grouped Object - {`{groupKey: [items]}`}</option>
                      <option value="array">Array with Group Info - Items with group metadata</option>
                      <option value="summary">Summary Only - Group keys and counts</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeGroupKey || true}
                        onChange={(e) => handleParameterChange('includeGroupKey', e.target.checked)}
                      />
                      Include Group Key in Items
                    </label>
                  </div>
                </>
              )}

              {/* Sum Settings */}
              {formData.parameters.mode === 'sum' && (
                <>
                  <div className="form-group">
                    <label>Sum Fields</label>
                    <input
                      type="text"
                      value={formData.parameters.sumFields || 'amount'}
                      onChange={(e) => handleParameterChange('sumFields', e.target.value)}
                      placeholder="amount,price,quantity (comma-separated)"
                    />
                    <p className="help-text">Numeric fields to sum</p>
                  </div>
                  <div className="form-group">
                    <label>Group By (Optional)</label>
                    <input
                      type="text"
                      value={formData.parameters.groupBy || ''}
                      onChange={(e) => handleParameterChange('groupBy', e.target.value)}
                      placeholder="category (leave empty for total sum)"
                    />
                    <p className="help-text">Group by field before summing</p>
                  </div>
                </>
              )}

              {/* Count Settings */}
              {formData.parameters.mode === 'count' && (
                <>
                  <div className="form-group">
                    <label>Count Type</label>
                    <select
                      value={formData.parameters.countType || 'total'}
                      onChange={(e) => handleParameterChange('countType', e.target.value)}
                    >
                      <option value="total">Total Items</option>
                      <option value="unique">Unique Values</option>
                      <option value="field">Non-empty Field Values</option>
                      <option value="grouped">Count by Group</option>
                    </select>
                  </div>
                  {(formData.parameters.countType === 'unique' || formData.parameters.countType === 'field') && (
                    <div className="form-group">
                      <label>Count Field</label>
                      <input
                        type="text"
                        value={formData.parameters.countField || 'id'}
                        onChange={(e) => handleParameterChange('countField', e.target.value)}
                        placeholder="id"
                      />
                    </div>
                  )}
                  {formData.parameters.countType === 'grouped' && (
                    <div className="form-group">
                      <label>Group By Field</label>
                      <input
                        type="text"
                        value={formData.parameters.groupBy || 'category'}
                        onChange={(e) => handleParameterChange('groupBy', e.target.value)}
                        placeholder="category"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Average Settings */}
              {formData.parameters.mode === 'average' && (
                <>
                  <div className="form-group">
                    <label>Average Fields</label>
                    <input
                      type="text"
                      value={formData.parameters.avgFields || 'score'}
                      onChange={(e) => handleParameterChange('avgFields', e.target.value)}
                      placeholder="score,rating,value (comma-separated)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Group By (Optional)</label>
                    <input
                      type="text"
                      value={formData.parameters.groupBy || ''}
                      onChange={(e) => handleParameterChange('groupBy', e.target.value)}
                      placeholder="category"
                    />
                  </div>
                  <div className="form-group">
                    <label>Decimal Places</label>
                    <input
                      type="number"
                      value={formData.parameters.decimalPlaces || 2}
                      onChange={(e) => handleParameterChange('decimalPlaces', parseInt(e.target.value) || 2)}
                      min="0"
                      max="10"
                    />
                  </div>
                </>
              )}

              {/* Min/Max Settings */}
              {formData.parameters.mode === 'minMax' && (
                <>
                  <div className="form-group">
                    <label>Fields to Analyze</label>
                    <input
                      type="text"
                      value={formData.parameters.minMaxFields || 'price'}
                      onChange={(e) => handleParameterChange('minMaxFields', e.target.value)}
                      placeholder="price,score,date (comma-separated)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Output Mode</label>
                    <select
                      value={formData.parameters.minMaxMode || 'both'}
                      onChange={(e) => handleParameterChange('minMaxMode', e.target.value)}
                    >
                      <option value="both">Both Min and Max</option>
                      <option value="min">Minimum Only</option>
                      <option value="max">Maximum Only</option>
                      <option value="items">Min/Max Items (full records)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Group By (Optional)</label>
                    <input
                      type="text"
                      value={formData.parameters.groupBy || ''}
                      onChange={(e) => handleParameterChange('groupBy', e.target.value)}
                      placeholder="category"
                    />
                  </div>
                </>
              )}

              {/* Collect Settings */}
              {formData.parameters.mode === 'collect' && (
                <>
                  <div className="form-group">
                    <label>Fields to Collect</label>
                    <input
                      type="text"
                      value={formData.parameters.collectFields || 'name'}
                      onChange={(e) => handleParameterChange('collectFields', e.target.value)}
                      placeholder="name,email,tags (comma-separated)"
                    />
                    <p className="help-text">Fields to collect into arrays</p>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.removeDuplicates || false}
                        onChange={(e) => handleParameterChange('removeDuplicates', e.target.checked)}
                      />
                      Remove Duplicates
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.flattenArrays || false}
                        onChange={(e) => handleParameterChange('flattenArrays', e.target.checked)}
                      />
                      Flatten Nested Arrays
                    </label>
                  </div>
                </>
              )}

              {/* Merge Objects Settings */}
              {formData.parameters.mode === 'merge' && (
                <>
                  <div className="form-group">
                    <label>Merge Strategy</label>
                    <select
                      value={formData.parameters.mergeStrategy || 'shallow'}
                      onChange={(e) => handleParameterChange('mergeStrategy', e.target.value)}
                    >
                      <option value="shallow">Shallow Merge - Overwrite conflicting properties</option>
                      <option value="deep">Deep Merge - Merge nested objects</option>
                      <option value="array">Array Merge - Combine arrays</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Conflict Resolution</label>
                    <select
                      value={formData.parameters.conflictResolution || 'last'}
                      onChange={(e) => handleParameterChange('conflictResolution', e.target.value)}
                    >
                      <option value="last">Use Last Value</option>
                      <option value="first">Use First Value</option>
                      <option value="array">Combine into Array</option>
                    </select>
                  </div>
                </>
              )}

              {/* Statistics Settings */}
              {formData.parameters.mode === 'stats' && (
                <>
                  <div className="form-group">
                    <label>Numeric Fields</label>
                    <input
                      type="text"
                      value={formData.parameters.statsFields || 'score'}
                      onChange={(e) => handleParameterChange('statsFields', e.target.value)}
                      placeholder="score,price,rating (comma-separated)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Statistics to Calculate</label>
                    <div className="checkbox-group">
                      {['count', 'sum', 'average', 'min', 'max', 'median', 'mode', 'stddev'].map(stat => (
                        <label key={stat} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={(formData.parameters.includeStats || ['count', 'sum', 'average', 'min', 'max']).includes(stat)}
                            onChange={(e) => {
                              const currentStats = formData.parameters.includeStats || ['count', 'sum', 'average', 'min', 'max'];
                              const newStats = e.target.checked
                                ? [...currentStats, stat]
                                : currentStats.filter((s: string) => s !== stat);
                              handleParameterChange('includeStats', newStats);
                            }}
                          />
                          {stat.charAt(0).toUpperCase() + stat.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* General Options */}
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.ignoreNulls !== false}
                    onChange={(e) => handleParameterChange('ignoreNulls', e.target.checked)}
                  />
                  Ignore Null Values
                </label>
                <p className="help-text">Skip null or undefined values in calculations</p>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.continueOnFail !== false}
                    onChange={(e) => handleParameterChange('continueOnFail', e.target.checked)}
                  />
                  Continue on Failure
                </label>
                <p className="help-text">Continue processing if aggregation fails on some items</p>
              </div>
            </div>
          </>
        );

      case 'aiml':
      case 'ai':
      case 'ml':
        return (
          <>
            <div className="form-section">
              <h4 className="section-title">
                <FaBrain /> AI/ML Configuration
              </h4>

              <div className="form-group">
                <label>AI/ML Service</label>
                <select
                  value={formData.parameters.service || 'openai'}
                  onChange={(e) => handleParameterChange('service', e.target.value)}
                >
                  <option value="openai">OpenAI (GPT, DALL-E, Whisper)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="google">Google AI (Gemini, PaLM)</option>
                  <option value="azure">Azure AI Services</option>
                  <option value="aws">AWS AI/ML Services</option>
                  <option value="huggingface">Hugging Face</option>
                  <option value="custom">Custom API</option>
                  <option value="local">Local Model</option>
                </select>
                <p className="help-text">Choose the AI/ML service provider</p>
              </div>

              <div className="form-group">
                <label>Task Type</label>
                <select
                  value={formData.parameters.taskType || 'text'}
                  onChange={(e) => handleParameterChange('taskType', e.target.value)}
                >
                  <option value="text">🔤 Text Processing</option>
                  <option value="image">🖼️ Image Processing</option>
                  <option value="audio">🎵 Audio Processing</option>
                  <option value="video">🎬 Video Processing</option>
                  <option value="embedding">🧮 Embeddings</option>
                  <option value="classification">📊 Classification</option>
                  <option value="prediction">🔮 Prediction</option>
                  <option value="generation">✨ Generation</option>
                </select>
                <p className="help-text">Type of AI/ML task to perform</p>
              </div>

              {/* Authentication */}
              <div className="form-section">
                <h4 className="section-title">
                  <FaCloud /> Authentication
                  <button
                    type="button"
                    onClick={() => {
                      // Test AI service connection
                      console.log('Testing AI service connection...');
                    }}
                    disabled={testingConnection}
                    className="test-connection-btn"
                    title="Test AI Service Connection"
                  >
                    {testingConnection ? (
                      <FaSpinner className="spinning" />
                    ) : (
                      <FaCheck />
                    )}
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                </h4>
                
                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={formData.parameters.apiKey || ''}
                    onChange={(e) => handleParameterChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                  />
                  <p className="help-text">API key for the selected service</p>
                </div>

                {formData.parameters.service === 'azure' && (
                  <>
                    <div className="form-group">
                      <label>Endpoint URL</label>
                      <input
                        type="text"
                        value={formData.parameters.endpoint || ''}
                        onChange={(e) => handleParameterChange('endpoint', e.target.value)}
                        placeholder="https://your-resource.openai.azure.com/"
                      />
                    </div>
                    <div className="form-group">
                      <label>API Version</label>
                      <input
                        type="text"
                        value={formData.parameters.apiVersion || '2024-02-01'}
                        onChange={(e) => handleParameterChange('apiVersion', e.target.value)}
                        placeholder="2024-02-01"
                      />
                    </div>
                  </>
                )}

                {formData.parameters.service === 'custom' && (
                  <div className="form-group">
                    <label>Custom API Endpoint</label>
                    <input
                      type="text"
                      value={formData.parameters.customEndpoint || ''}
                      onChange={(e) => handleParameterChange('customEndpoint', e.target.value)}
                      placeholder="https://api.custom-ai-service.com/v1/chat"
                    />
                  </div>
                )}
              </div>

              {/* Text Processing */}
              {formData.parameters.taskType === 'text' && (
                <div className="form-section">
                  <h4 className="section-title">
                    <FaLanguage /> Text Processing
                  </h4>

                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.textOperation || 'chat'}
                      onChange={(e) => handleParameterChange('textOperation', e.target.value)}
                    >
                      <option value="chat">Chat/Conversation</option>
                      <option value="completion">Text Completion</option>
                      <option value="summarize">Summarization</option>
                      <option value="translate">Translation</option>
                      <option value="sentiment">Sentiment Analysis</option>
                      <option value="extract">Information Extraction</option>
                      <option value="classify">Text Classification</option>
                      <option value="question">Question Answering</option>
                      <option value="rewrite">Text Rewriting</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Model</label>
                    <select
                      value={formData.parameters.model || 'gpt-4'}
                      onChange={(e) => handleParameterChange('model', e.target.value)}
                    >
                      {formData.parameters.service === 'openai' && (
                        <>
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          <option value="text-davinci-003">GPT-3 Davinci</option>
                        </>
                      )}
                      {formData.parameters.service === 'anthropic' && (
                        <>
                          <option value="claude-3-opus">Claude 3 Opus</option>
                          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                          <option value="claude-3-haiku">Claude 3 Haiku</option>
                          <option value="claude-2">Claude 2</option>
                        </>
                      )}
                      {formData.parameters.service === 'google' && (
                        <>
                          <option value="gemini-pro">Gemini Pro</option>
                          <option value="gemini-pro-vision">Gemini Pro Vision</option>
                          <option value="palm-2">PaLM 2</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Input Field</label>
                    <input
                      type="text"
                      value={formData.parameters.inputField || 'text'}
                      onChange={(e) => handleParameterChange('inputField', e.target.value)}
                      placeholder="text"
                    />
                    <p className="help-text">Field containing the input text to process</p>
                  </div>

                  <div className="form-group">
                    <label>System Prompt</label>
                    <textarea
                      value={formData.parameters.systemPrompt || ''}
                      onChange={(e) => handleParameterChange('systemPrompt', e.target.value)}
                      placeholder="You are a helpful AI assistant..."
                      rows={3}
                    />
                    <p className="help-text">System instructions for the AI model</p>
                  </div>

                  <div className="form-group">
                    <label>User Prompt Template</label>
                    <textarea
                      value={formData.parameters.promptTemplate || ''}
                      onChange={(e) => handleParameterChange('promptTemplate', e.target.value)}
                      placeholder="Process this text: {{text}}"
                      rows={4}
                    />
                    <p className="help-text">Template for user prompts (use {{fieldName}} for variables)</p>
                  </div>

                  <div className="form-group">
                    <label>Max Tokens</label>
                    <input
                      type="number"
                      value={formData.parameters.maxTokens || 1000}
                      onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value) || 1000)}
                      min="1"
                      max="32000"
                    />
                    <p className="help-text">Maximum number of tokens to generate</p>
                  </div>

                  <div className="form-group">
                    <label>Temperature</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.parameters.temperature || 0.7}
                      onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                    />
                    <span>{formData.parameters.temperature || 0.7}</span>
                    <p className="help-text">Controls randomness (0 = deterministic, 2 = very random)</p>
                  </div>

                  {formData.parameters.textOperation === 'translate' && (
                    <>
                      <div className="form-group">
                        <label>Source Language</label>
                        <select
                          value={formData.parameters.sourceLanguage || 'auto'}
                          onChange={(e) => handleParameterChange('sourceLanguage', e.target.value)}
                        >
                          <option value="auto">Auto Detect</option>
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="zh">Chinese</option>
                          <option value="ja">Japanese</option>
                          <option value="ko">Korean</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Target Language</label>
                        <select
                          value={formData.parameters.targetLanguage || 'en'}
                          onChange={(e) => handleParameterChange('targetLanguage', e.target.value)}
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="zh">Chinese</option>
                          <option value="ja">Japanese</option>
                          <option value="ko">Korean</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Image Processing */}
              {formData.parameters.taskType === 'image' && (
                <div className="form-section">
                  <h4 className="section-title">
                    <FaEye /> Image Processing
                  </h4>

                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.imageOperation || 'analyze'}
                      onChange={(e) => handleParameterChange('imageOperation', e.target.value)}
                    >
                      <option value="analyze">Image Analysis</option>
                      <option value="generate">Image Generation</option>
                      <option value="edit">Image Editing</option>
                      <option value="enhance">Image Enhancement</option>
                      <option value="ocr">Text Recognition (OCR)</option>
                      <option value="classify">Image Classification</option>
                      <option value="detect">Object Detection</option>
                      <option value="segment">Image Segmentation</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Image Input</label>
                    <select
                      value={formData.parameters.imageInput || 'url'}
                      onChange={(e) => handleParameterChange('imageInput', e.target.value)}
                    >
                      <option value="url">Image URL</option>
                      <option value="base64">Base64 Data</option>
                      <option value="file">File Upload</option>
                      <option value="field">From Data Field</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Image Field/URL</label>
                    <input
                      type="text"
                      value={formData.parameters.imageField || 'imageUrl'}
                      onChange={(e) => handleParameterChange('imageField', e.target.value)}
                      placeholder="imageUrl or field name"
                    />
                  </div>

                  {formData.parameters.imageOperation === 'generate' && (
                    <>
                      <div className="form-group">
                        <label>Generation Prompt</label>
                        <textarea
                          value={formData.parameters.generatePrompt || ''}
                          onChange={(e) => handleParameterChange('generatePrompt', e.target.value)}
                          placeholder="A beautiful landscape with mountains and trees..."
                          rows={3}
                        />
                      </div>
                      <div className="form-group">
                        <label>Image Size</label>
                        <select
                          value={formData.parameters.imageSize || '1024x1024'}
                          onChange={(e) => handleParameterChange('imageSize', e.target.value)}
                        >
                          <option value="256x256">256x256</option>
                          <option value="512x512">512x512</option>
                          <option value="1024x1024">1024x1024</option>
                          <option value="1792x1024">1792x1024 (Landscape)</option>
                          <option value="1024x1792">1024x1792 (Portrait)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Number of Images</label>
                        <input
                          type="number"
                          value={formData.parameters.numImages || 1}
                          onChange={(e) => handleParameterChange('numImages', parseInt(e.target.value) || 1)}
                          min="1"
                          max="10"
                        />
                      </div>
                    </>
                  )}

                  {formData.parameters.imageOperation === 'analyze' && (
                    <div className="form-group">
                      <label>Analysis Type</label>
                      <div className="checkbox-group">
                        {['objects', 'faces', 'text', 'colors', 'emotions', 'landmarks', 'brands', 'nsfw'].map(type => (
                          <label key={type} className="checkbox-item">
                            <input
                              type="checkbox"
                              checked={(formData.parameters.analysisTypes || ['objects']).includes(type)}
                              onChange={(e) => {
                                const current = formData.parameters.analysisTypes || ['objects'];
                                const updated = e.target.checked
                                  ? [...current, type]
                                  : current.filter((t: string) => t !== type);
                                handleParameterChange('analysisTypes', updated);
                              }}
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audio Processing */}
              {formData.parameters.taskType === 'audio' && (
                <div className="form-section">
                  <h4 className="section-title">
                    <FaMicrophone /> Audio Processing
                  </h4>

                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.audioOperation || 'transcribe'}
                      onChange={(e) => handleParameterChange('audioOperation', e.target.value)}
                    >
                      <option value="transcribe">Speech to Text</option>
                      <option value="translate">Audio Translation</option>
                      <option value="generate">Text to Speech</option>
                      <option value="classify">Audio Classification</option>
                      <option value="separate">Audio Separation</option>
                      <option value="enhance">Audio Enhancement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Audio Input</label>
                    <select
                      value={formData.parameters.audioInput || 'url'}
                      onChange={(e) => handleParameterChange('audioInput', e.target.value)}
                    >
                      <option value="url">Audio URL</option>
                      <option value="file">File Upload</option>
                      <option value="field">From Data Field</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Audio Field/URL</label>
                    <input
                      type="text"
                      value={formData.parameters.audioField || 'audioUrl'}
                      onChange={(e) => handleParameterChange('audioField', e.target.value)}
                      placeholder="audioUrl or field name"
                    />
                  </div>

                  {formData.parameters.audioOperation === 'transcribe' && (
                    <>
                      <div className="form-group">
                        <label>Language</label>
                        <select
                          value={formData.parameters.audioLanguage || 'auto'}
                          onChange={(e) => handleParameterChange('audioLanguage', e.target.value)}
                        >
                          <option value="auto">Auto Detect</option>
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="zh">Chinese</option>
                          <option value="ja">Japanese</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={formData.parameters.includeTimestamps || false}
                            onChange={(e) => handleParameterChange('includeTimestamps', e.target.checked)}
                          />
                          Include Timestamps
                        </label>
                      </div>
                    </>
                  )}

                  {formData.parameters.audioOperation === 'generate' && (
                    <>
                      <div className="form-group">
                        <label>Text Field</label>
                        <input
                          type="text"
                          value={formData.parameters.textField || 'text'}
                          onChange={(e) => handleParameterChange('textField', e.target.value)}
                          placeholder="text"
                        />
                      </div>
                      <div className="form-group">
                        <label>Voice</label>
                        <select
                          value={formData.parameters.voice || 'alloy'}
                          onChange={(e) => handleParameterChange('voice', e.target.value)}
                        >
                          <option value="alloy">Alloy</option>
                          <option value="echo">Echo</option>
                          <option value="fable">Fable</option>
                          <option value="onyx">Onyx</option>
                          <option value="nova">Nova</option>
                          <option value="shimmer">Shimmer</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Embeddings */}
              {formData.parameters.taskType === 'embedding' && (
                <div className="form-section">
                  <h4 className="section-title">
                    <FaChartLine /> Embeddings
                  </h4>

                  <div className="form-group">
                    <label>Embedding Model</label>
                    <select
                      value={formData.parameters.embeddingModel || 'text-embedding-ada-002'}
                      onChange={(e) => handleParameterChange('embeddingModel', e.target.value)}
                    >
                      <option value="text-embedding-ada-002">OpenAI Ada 002</option>
                      <option value="text-embedding-3-small">OpenAI v3 Small</option>
                      <option value="text-embedding-3-large">OpenAI v3 Large</option>
                      <option value="sentence-transformers">Sentence Transformers</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Input Field</label>
                    <input
                      type="text"
                      value={formData.parameters.embeddingInput || 'text'}
                      onChange={(e) => handleParameterChange('embeddingInput', e.target.value)}
                      placeholder="text"
                    />
                    <p className="help-text">Field containing text to embed</p>
                  </div>

                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={formData.parameters.embeddingOperation || 'generate'}
                      onChange={(e) => handleParameterChange('embeddingOperation', e.target.value)}
                    >
                      <option value="generate">Generate Embeddings</option>
                      <option value="similarity">Calculate Similarity</option>
                      <option value="search">Semantic Search</option>
                      <option value="cluster">Clustering</option>
                    </select>
                  </div>

                  {formData.parameters.embeddingOperation === 'similarity' && (
                    <div className="form-group">
                      <label>Compare With</label>
                      <input
                        type="text"
                        value={formData.parameters.compareWith || ''}
                        onChange={(e) => handleParameterChange('compareWith', e.target.value)}
                        placeholder="Reference text or embedding"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Output Configuration */}
              <div className="form-section">
                <h4 className="section-title">
                  Output Configuration
                </h4>

                <div className="form-group">
                  <label>Output Field</label>
                  <input
                    type="text"
                    value={formData.parameters.outputField || 'aiResult'}
                    onChange={(e) => handleParameterChange('outputField', e.target.value)}
                    placeholder="aiResult"
                  />
                  <p className="help-text">Field to store the AI/ML result</p>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.parameters.includeMetadata || true}
                      onChange={(e) => handleParameterChange('includeMetadata', e.target.checked)}
                    />
                    Include Metadata
                  </label>
                  <p className="help-text">Include model info, tokens used, confidence scores, etc.</p>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.parameters.streamResponse || false}
                      onChange={(e) => handleParameterChange('streamResponse', e.target.checked)}
                    />
                    Stream Response
                  </label>
                  <p className="help-text">Stream the response for real-time processing</p>
                </div>
              </div>

              {/* Error Handling */}
              <div className="form-section">
                <h4 className="section-title">
                  Error Handling & Retry
                </h4>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.parameters.continueOnError !== false}
                      onChange={(e) => handleParameterChange('continueOnError', e.target.checked)}
                    />
                    Continue on Error
                  </label>
                </div>

                <div className="form-group">
                  <label>Retry Attempts</label>
                  <input
                    type="number"
                    value={formData.parameters.retryAttempts || 3}
                    onChange={(e) => handleParameterChange('retryAttempts', parseInt(e.target.value) || 3)}
                    min="0"
                    max="10"
                  />
                </div>

                <div className="form-group">
                  <label>Timeout (seconds)</label>
                  <input
                    type="number"
                    value={formData.parameters.timeout || 60}
                    onChange={(e) => handleParameterChange('timeout', parseInt(e.target.value) || 60)}
                    min="1"
                    max="300"
                  />
                </div>
              </div>
            </div>
          </>
        );

      case 'notification':
        return (
          <>
            {/* Notification Channel Configuration */}
            <div className="form-section">
              <h4 className="section-title">
                <FaBell /> Notification Channel
              </h4>
              
              <div className="form-group">
                <label>
                  {formData.parameters.channelType === 'email' && <FaEnvelope style={{marginRight: '8px'}} />}
                  {formData.parameters.channelType === 'sms' && <FaMobile style={{marginRight: '8px'}} />}
                  {formData.parameters.channelType === 'slack' && <FaSlack style={{marginRight: '8px'}} />}
                  {formData.parameters.channelType === 'discord' && <FaDiscord style={{marginRight: '8px'}} />}
                  {formData.parameters.channelType === 'teams' && <FaMicrosoft style={{marginRight: '8px'}} />}
                  {formData.parameters.channelType === 'push' && <FaMobile style={{marginRight: '8px'}} />}
                  {formData.parameters.channelType === 'webhook' && <FaGlobe style={{marginRight: '8px'}} />}
                  Channel Type
                </label>
                <select
                  value={formData.parameters.channelType || 'email'}
                  onChange={(e) => handleParameterChange('channelType', e.target.value)}
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="push">Push Notification</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>

              {formData.parameters.channelType === 'email' && (
                <>
                  <div className="form-group">
                    <label>Email Recipients</label>
                    <input
                      type="text"
                      value={formData.parameters.recipients || ''}
                      onChange={(e) => handleParameterChange('recipients', e.target.value)}
                      placeholder="recipient@example.com, user2@example.com"
                    />
                    <small className="help-text">Comma-separated email addresses</small>
                  </div>
                  <div className="form-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      value={formData.parameters.subject || ''}
                      onChange={(e) => handleParameterChange('subject', e.target.value)}
                      placeholder="Notification Subject"
                    />
                  </div>
                </>
              )}

              {formData.parameters.channelType === 'sms' && (
                <div className="form-group">
                  <label>Phone Numbers</label>
                  <input
                    type="text"
                    value={formData.parameters.recipients || ''}
                    onChange={(e) => handleParameterChange('recipients', e.target.value)}
                    placeholder="+1234567890, +0987654321"
                  />
                  <small className="help-text">Comma-separated phone numbers with country codes</small>
                </div>
              )}

              {formData.parameters.channelType === 'slack' && (
                <>
                  <div className="form-group">
                    <label>Slack Configuration</label>
                    <select
                      value={formData.parameters.slackMethod || 'webhook'}
                      onChange={(e) => handleParameterChange('slackMethod', e.target.value)}
                    >
                      <option value="webhook">Webhook URL</option>
                      <option value="bot">Bot Token</option>
                    </select>
                  </div>
                  
                  {formData.parameters.slackMethod === 'webhook' ? (
                    <div className="form-group">
                      <label>Slack Webhook URL</label>
                      <input
                        type="text"
                        value={formData.parameters.slackWebhook || ''}
                        onChange={(e) => handleParameterChange('slackWebhook', e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Bot Token</label>
                        <input
                          type="password"
                          value={formData.parameters.slackToken || ''}
                          onChange={(e) => handleParameterChange('slackToken', e.target.value)}
                          placeholder="xoxb-your-bot-token"
                        />
                      </div>
                      <div className="form-group">
                        <label>Channel</label>
                        <input
                          type="text"
                          value={formData.parameters.slackChannel || ''}
                          onChange={(e) => handleParameterChange('slackChannel', e.target.value)}
                          placeholder="#general or @username"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {formData.parameters.channelType === 'discord' && (
                <div className="form-group">
                  <label>Discord Webhook URL</label>
                  <input
                    type="text"
                    value={formData.parameters.discordWebhook || ''}
                    onChange={(e) => handleParameterChange('discordWebhook', e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                </div>
              )}

              {formData.parameters.channelType === 'teams' && (
                <div className="form-group">
                  <label>Teams Webhook URL</label>
                  <input
                    type="text"
                    value={formData.parameters.teamsWebhook || ''}
                    onChange={(e) => handleParameterChange('teamsWebhook', e.target.value)}
                    placeholder="https://outlook.office.com/webhook/..."
                  />
                </div>
              )}

              {formData.parameters.channelType === 'push' && (
                <>
                  <div className="form-group">
                    <label>Push Service</label>
                    <select
                      value={formData.parameters.pushService || 'firebase'}
                      onChange={(e) => handleParameterChange('pushService', e.target.value)}
                    >
                      <option value="firebase">Firebase FCM</option>
                      <option value="apns">Apple APNS</option>
                      <option value="onesignal">OneSignal</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Device Tokens</label>
                    <textarea
                      value={formData.parameters.deviceTokens || ''}
                      onChange={(e) => handleParameterChange('deviceTokens', e.target.value)}
                      placeholder="device_token_1&#10;device_token_2&#10;..."
                      rows={3}
                    />
                    <small className="help-text">One device token per line</small>
                  </div>
                </>
              )}

              {formData.parameters.channelType === 'webhook' && (
                <>
                  <div className="form-group">
                    <label>Webhook URL</label>
                    <input
                      type="text"
                      value={formData.parameters.webhookUrl || ''}
                      onChange={(e) => handleParameterChange('webhookUrl', e.target.value)}
                      placeholder="https://your-api.com/webhook"
                    />
                  </div>
                  <div className="form-group">
                    <label>HTTP Method</label>
                    <select
                      value={formData.parameters.webhookMethod || 'POST'}
                      onChange={(e) => handleParameterChange('webhookMethod', e.target.value)}
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Custom Headers (JSON)</label>
                    <textarea
                      value={formData.parameters.webhookHeaders || '{}'}
                      onChange={(e) => handleParameterChange('webhookHeaders', e.target.value)}
                      placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Message Configuration */}
            <div className="form-section">
              <h4 className="section-title">Message Configuration</h4>
              
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={formData.parameters.message || ''}
                  onChange={(e) => handleParameterChange('message', e.target.value)}
                  placeholder="Your notification message. Use {{variableName}} for dynamic content."
                  rows={4}
                />
                <small className="help-text">Supports template variables like {"{{"} fieldName {"}}"}  </small>
              </div>

              <div className="form-group">
                <label>Message Template</label>
                <select
                  value={formData.parameters.template || 'custom'}
                  onChange={(e) => handleParameterChange('template', e.target.value)}
                >
                  <option value="custom">Custom Message</option>
                  <option value="alert">Alert Template</option>
                  <option value="info">Information Template</option>
                  <option value="success">Success Template</option>
                  <option value="warning">Warning Template</option>
                  <option value="error">Error Template</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.parameters.priority || 'normal'}
                  onChange={(e) => handleParameterChange('priority', e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="form-section">
              <h4 className="section-title">Advanced Options</h4>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.retryOnFailure || false}
                    onChange={(e) => handleParameterChange('retryOnFailure', e.target.checked)}
                  />
                  Retry on Failure
                </label>
              </div>

              {formData.parameters.retryOnFailure && (
                <div className="form-group">
                  <label>Max Retries</label>
                  <input
                    type="number"
                    value={formData.parameters.maxRetries || 3}
                    onChange={(e) => handleParameterChange('maxRetries', parseInt(e.target.value) || 3)}
                    min="1"
                    max="10"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Schedule For Later</label>
                <input
                  type="datetime-local"
                  value={formData.parameters.scheduled || ''}
                  onChange={(e) => handleParameterChange('scheduled', e.target.value)}
                />
                <small className="help-text">Leave empty for immediate delivery</small>
              </div>

              <div className="form-group">
                <label>Send Condition (JavaScript)</label>
                <textarea
                  value={formData.parameters.condition || ''}
                  onChange={(e) => handleParameterChange('condition', e.target.value)}
                  placeholder="e.g., data.status === 'error' || data.priority > 5"
                  rows={2}
                />
                <small className="help-text">Optional: JavaScript expression that must be true to send notification</small>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.includeAttachments || false}
                    onChange={(e) => handleParameterChange('includeAttachments', e.target.checked)}
                  />
                  Include Attachments (Email only)
                </label>
              </div>

              {formData.parameters.includeAttachments && formData.parameters.channelType === 'email' && (
                <div className="form-group">
                  <label>Attachment Fields</label>
                  <input
                    type="text"
                    value={formData.parameters.attachmentFields || ''}
                    onChange={(e) => handleParameterChange('attachmentFields', e.target.value)}
                    placeholder="file1,file2,reportData"
                  />
                  <small className="help-text">Comma-separated field names containing file paths or data</small>
                </div>
              )}
            </div>
          </>
        );

      case 'analytics':
        return (
          <>
            {/* Analytics Operation Configuration */}
            <div className="form-section">
              <h4 className="section-title">
                <FaChartLine /> Analytics Operation
              </h4>
              
              <div className="form-group">
                <label>
                  {formData.parameters.analysisType === 'descriptive' && <FaTable style={{marginRight: '8px'}} />}
                  {formData.parameters.analysisType === 'statistical' && <FaCalculator style={{marginRight: '8px'}} />}
                  {formData.parameters.analysisType === 'visualization' && <FaChartBar style={{marginRight: '8px'}} />}
                  {formData.parameters.analysisType === 'aggregation' && <FaLayerGroup style={{marginRight: '8px'}} />}
                  {formData.parameters.analysisType === 'filtering' && <FaFilter style={{marginRight: '8px'}} />}
                  {formData.parameters.analysisType === 'correlation' && <FaExchangeAlt style={{marginRight: '8px'}} />}
                  Analysis Type
                </label>
                <select
                  value={formData.parameters.analysisType || 'descriptive'}
                  onChange={(e) => handleParameterChange('analysisType', e.target.value)}
                >
                  <option value="descriptive">Descriptive Statistics</option>
                  <option value="statistical">Statistical Analysis</option>
                  <option value="visualization">Data Visualization</option>
                  <option value="aggregation">Data Aggregation</option>
                  <option value="filtering">Data Filtering</option>
                  <option value="correlation">Correlation Analysis</option>
                  <option value="forecasting">Time Series Forecasting</option>
                  <option value="clustering">Clustering Analysis</option>
                </select>
              </div>

              <div className="form-group">
                <label>Data Source Field</label>
                <input
                  type="text"
                  value={formData.parameters.dataField || ''}
                  onChange={(e) => handleParameterChange('dataField', e.target.value)}
                  placeholder="data"
                />
                <small className="help-text">Field name containing the data to analyze</small>
              </div>
            </div>

            {/* Descriptive Statistics Configuration */}
            {formData.parameters.analysisType === 'descriptive' && (
              <div className="form-section">
                <h4 className="section-title">
                  <FaTable /> Descriptive Statistics
                </h4>
                
                <div className="form-group">
                  <label>Statistics to Calculate</label>
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeCount || true}
                        onChange={(e) => handleParameterChange('includeCount', e.target.checked)}
                      />
                      Count
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeMean || true}
                        onChange={(e) => handleParameterChange('includeMean', e.target.checked)}
                      />
                      Mean
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeMedian || true}
                        onChange={(e) => handleParameterChange('includeMedian', e.target.checked)}
                      />
                      Median
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeMode || false}
                        onChange={(e) => handleParameterChange('includeMode', e.target.checked)}
                      />
                      Mode
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeStdDev || true}
                        onChange={(e) => handleParameterChange('includeStdDev', e.target.checked)}
                      />
                      Standard Deviation
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeVariance || false}
                        onChange={(e) => handleParameterChange('includeVariance', e.target.checked)}
                      />
                      Variance
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeRange || true}
                        onChange={(e) => handleParameterChange('includeRange', e.target.checked)}
                      />
                      Min/Max/Range
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.includePercentiles || false}
                        onChange={(e) => handleParameterChange('includePercentiles', e.target.checked)}
                      />
                      Percentiles (25th, 75th)
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Group By Field (Optional)</label>
                  <input
                    type="text"
                    value={formData.parameters.groupByField || ''}
                    onChange={(e) => handleParameterChange('groupByField', e.target.value)}
                    placeholder="category"
                  />
                  <small className="help-text">Calculate statistics grouped by this field</small>
                </div>
              </div>
            )}

            {/* Statistical Analysis Configuration */}
            {formData.parameters.analysisType === 'statistical' && (
              <div className="form-section">
                <h4 className="section-title">
                  <FaCalculator /> Statistical Analysis
                </h4>
                
                <div className="form-group">
                  <label>Statistical Test</label>
                  <select
                    value={formData.parameters.statisticalTest || 'ttest'}
                    onChange={(e) => handleParameterChange('statisticalTest', e.target.value)}
                  >
                    <option value="ttest">T-Test</option>
                    <option value="anova">ANOVA</option>
                    <option value="chisquare">Chi-Square Test</option>
                    <option value="regression">Linear Regression</option>
                    <option value="normality">Normality Test</option>
                    <option value="correlation">Correlation Test</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Field</label>
                  <input
                    type="text"
                    value={formData.parameters.targetField || ''}
                    onChange={(e) => handleParameterChange('targetField', e.target.value)}
                    placeholder="value"
                  />
                  <small className="help-text">Primary field to analyze</small>
                </div>

                {['ttest', 'regression', 'correlation'].includes(formData.parameters.statisticalTest) && (
                  <div className="form-group">
                    <label>Compare Field</label>
                    <input
                      type="text"
                      value={formData.parameters.compareField || ''}
                      onChange={(e) => handleParameterChange('compareField', e.target.value)}
                      placeholder="comparison_value"
                    />
                    <small className="help-text">Field to compare against</small>
                  </div>
                )}

                <div className="form-group">
                  <label>Confidence Level</label>
                  <select
                    value={formData.parameters.confidenceLevel || '0.95'}
                    onChange={(e) => handleParameterChange('confidenceLevel', e.target.value)}
                  >
                    <option value="0.90">90%</option>
                    <option value="0.95">95%</option>
                    <option value="0.99">99%</option>
                  </select>
                </div>
              </div>
            )}

            {/* Data Visualization Configuration */}
            {formData.parameters.analysisType === 'visualization' && (
              <div className="form-section">
                <h4 className="section-title">
                  <FaChartBar /> Data Visualization
                </h4>
                
                <div className="form-group">
                  <label>Chart Type</label>
                  <select
                    value={formData.parameters.chartType || 'bar'}
                    onChange={(e) => handleParameterChange('chartType', e.target.value)}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="scatter">Scatter Plot</option>
                    <option value="histogram">Histogram</option>
                    <option value="box">Box Plot</option>
                    <option value="heatmap">Heatmap</option>
                    <option value="area">Area Chart</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>X-Axis Field</label>
                  <input
                    type="text"
                    value={formData.parameters.xAxisField || ''}
                    onChange={(e) => handleParameterChange('xAxisField', e.target.value)}
                    placeholder="category"
                  />
                </div>

                <div className="form-group">
                  <label>Y-Axis Field</label>
                  <input
                    type="text"
                    value={formData.parameters.yAxisField || ''}
                    onChange={(e) => handleParameterChange('yAxisField', e.target.value)}
                    placeholder="value"
                  />
                </div>

                <div className="form-group">
                  <label>Chart Title</label>
                  <input
                    type="text"
                    value={formData.parameters.chartTitle || ''}
                    onChange={(e) => handleParameterChange('chartTitle', e.target.value)}
                    placeholder="Data Analysis Chart"
                  />
                </div>

                <div className="form-group">
                  <label>Output Format</label>
                  <select
                    value={formData.parameters.outputFormat || 'base64'}
                    onChange={(e) => handleParameterChange('outputFormat', e.target.value)}
                  >
                    <option value="base64">Base64 Image</option>
                    <option value="file">Save to File</option>
                    <option value="url">Generate URL</option>
                    <option value="svg">SVG String</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Chart Dimensions</label>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <input
                      type="number"
                      value={formData.parameters.chartWidth || 800}
                      onChange={(e) => handleParameterChange('chartWidth', parseInt(e.target.value) || 800)}
                      placeholder="800"
                      style={{width: '50%'}}
                    />
                    <span>×</span>
                    <input
                      type="number"
                      value={formData.parameters.chartHeight || 600}
                      onChange={(e) => handleParameterChange('chartHeight', parseInt(e.target.value) || 600)}
                      placeholder="600"
                      style={{width: '50%'}}
                    />
                  </div>
                  <small className="help-text">Width × Height in pixels</small>
                </div>
              </div>
            )}

            {/* Data Aggregation Configuration */}
            {formData.parameters.analysisType === 'aggregation' && (
              <div className="form-section">
                <h4 className="section-title">
                  <FaLayerGroup /> Data Aggregation
                </h4>
                
                <div className="form-group">
                  <label>Aggregation Functions</label>
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.aggSum || true}
                        onChange={(e) => handleParameterChange('aggSum', e.target.checked)}
                      />
                      Sum
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.aggAverage || true}
                        onChange={(e) => handleParameterChange('aggAverage', e.target.checked)}
                      />
                      Average
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.aggCount || true}
                        onChange={(e) => handleParameterChange('aggCount', e.target.checked)}
                      />
                      Count
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.aggMin || false}
                        onChange={(e) => handleParameterChange('aggMin', e.target.checked)}
                      />
                      Minimum
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.parameters.aggMax || false}
                        onChange={(e) => handleParameterChange('aggMax', e.target.checked)}
                      />
                      Maximum
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Value Field</label>
                  <input
                    type="text"
                    value={formData.parameters.valueField || ''}
                    onChange={(e) => handleParameterChange('valueField', e.target.value)}
                    placeholder="amount"
                  />
                  <small className="help-text">Numeric field to aggregate</small>
                </div>

                <div className="form-group">
                  <label>Group By Fields</label>
                  <input
                    type="text"
                    value={formData.parameters.groupByFields || ''}
                    onChange={(e) => handleParameterChange('groupByFields', e.target.value)}
                    placeholder="category,region"
                  />
                  <small className="help-text">Comma-separated fields to group by</small>
                </div>
              </div>
            )}

            {/* Data Filtering Configuration */}
            {formData.parameters.analysisType === 'filtering' && (
              <div className="form-section">
                <h4 className="section-title">
                  <FaFilter /> Data Filtering
                </h4>
                
                <div className="form-group">
                  <label>Filter Conditions</label>
                  <textarea
                    value={formData.parameters.filterConditions || ''}
                    onChange={(e) => handleParameterChange('filterConditions', e.target.value)}
                    placeholder="value > 100 AND category = 'active'"
                    rows={3}
                  />
                  <small className="help-text">SQL-like filter conditions</small>
                </div>

                <div className="form-group">
                  <label>Date Range Filtering</label>
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <input
                      type="date"
                      value={formData.parameters.startDate || ''}
                      onChange={(e) => handleParameterChange('startDate', e.target.value)}
                      style={{width: '45%'}}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={formData.parameters.endDate || ''}
                      onChange={(e) => handleParameterChange('endDate', e.target.value)}
                      style={{width: '45%'}}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Date Field</label>
                  <input
                    type="text"
                    value={formData.parameters.dateField || ''}
                    onChange={(e) => handleParameterChange('dateField', e.target.value)}
                    placeholder="created_date"
                  />
                  <small className="help-text">Field containing date values for range filtering</small>
                </div>

                <div className="form-group">
                  <label>Sample Size Limit</label>
                  <input
                    type="number"
                    value={formData.parameters.sampleSize || ''}
                    onChange={(e) => handleParameterChange('sampleSize', parseInt(e.target.value) || '')}
                    placeholder="1000"
                  />
                  <small className="help-text">Maximum number of records to analyze (leave empty for all)</small>
                </div>
              </div>
            )}

            {/* Correlation Analysis Configuration */}
            {formData.parameters.analysisType === 'correlation' && (
              <div className="form-section">
                <h4 className="section-title">
                  <FaExchangeAlt /> Correlation Analysis
                </h4>
                
                <div className="form-group">
                  <label>Fields to Correlate</label>
                  <textarea
                    value={formData.parameters.correlationFields || ''}
                    onChange={(e) => handleParameterChange('correlationFields', e.target.value)}
                    placeholder="price,quantity,profit,rating"
                    rows={3}
                  />
                  <small className="help-text">Comma-separated numeric fields to analyze correlations</small>
                </div>

                <div className="form-group">
                  <label>Correlation Method</label>
                  <select
                    value={formData.parameters.correlationMethod || 'pearson'}
                    onChange={(e) => handleParameterChange('correlationMethod', e.target.value)}
                  >
                    <option value="pearson">Pearson</option>
                    <option value="spearman">Spearman</option>
                    <option value="kendall">Kendall</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.parameters.generateHeatmap || false}
                      onChange={(e) => handleParameterChange('generateHeatmap', e.target.checked)}
                    />
                    Generate Correlation Heatmap
                  </label>
                </div>
              </div>
            )}

            {/* Output Configuration */}
            <div className="form-section">
              <h4 className="section-title">
                <FaFileExport /> Output Configuration
              </h4>
              
              <div className="form-group">
                <label>Output Field</label>
                <input
                  type="text"
                  value={formData.parameters.outputField || 'analyticsResult'}
                  onChange={(e) => handleParameterChange('outputField', e.target.value)}
                  placeholder="analyticsResult"
                />
                <small className="help-text">Field to store analysis results</small>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.includeRawData || false}
                    onChange={(e) => handleParameterChange('includeRawData', e.target.checked)}
                  />
                  Include Raw Data in Output
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.generateSummary || true}
                    onChange={(e) => handleParameterChange('generateSummary', e.target.checked)}
                  />
                  Generate Analysis Summary
                </label>
              </div>

              <div className="form-group">
                <label>Export Format</label>
                <select
                  value={formData.parameters.exportFormat || 'json'}
                  onChange={(e) => handleParameterChange('exportFormat', e.target.value)}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF Report</option>
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="form-section">
              <h4 className="section-title">Advanced Options</h4>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.handleMissingValues || true}
                    onChange={(e) => handleParameterChange('handleMissingValues', e.target.checked)}
                  />
                  Handle Missing Values
                </label>
              </div>

              <div className="form-group">
                <label>Missing Value Strategy</label>
                <select
                  value={formData.parameters.missingValueStrategy || 'exclude'}
                  onChange={(e) => handleParameterChange('missingValueStrategy', e.target.value)}
                  disabled={!formData.parameters.handleMissingValues}
                >
                  <option value="exclude">Exclude Missing Values</option>
                  <option value="mean">Replace with Mean</option>
                  <option value="median">Replace with Median</option>
                  <option value="zero">Replace with Zero</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.parameters.enableCaching || false}
                    onChange={(e) => handleParameterChange('enableCaching', e.target.checked)}
                  />
                  Enable Result Caching
                </label>
              </div>

              <div className="form-group">
                <label>Processing Timeout (seconds)</label>
                <input
                  type="number"
                  value={formData.parameters.timeout || 300}
                  onChange={(e) => handleParameterChange('timeout', parseInt(e.target.value) || 300)}
                  min="30"
                  max="1800"
                />
              </div>
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