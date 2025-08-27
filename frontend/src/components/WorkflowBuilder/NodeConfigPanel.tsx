import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { FaTimes, FaSave, FaDatabase, FaCheck, FaSpinner, FaEnvelope, FaFileUpload, FaFileDownload, FaFolder, FaCloud, FaAws, FaCodeBranch, FaPlus, FaTrash, FaSyncAlt, FaListUl, FaStopwatch, FaClock, FaExchangeAlt, FaFilter, FaCopy, FaRandom } from 'react-icons/fa';
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