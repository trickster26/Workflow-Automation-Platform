import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FaTimes, FaDownload, FaSpinner, FaCheck, FaTimes as FaError } from 'react-icons/fa';

interface ExecutionResultsProps {
  jobId: string;
  onClose: () => void;
}

interface ExecutionStatus {
  status: 'running' | 'completed' | 'failed' | 'pending';
  data?: any;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export const ExecutionResults: React.FC<ExecutionResultsProps> = ({ jobId, onClose }) => {
  const [execution, setExecution] = useState<ExecutionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollExecutionStatus = async () => {
      try {
        const response = await api.get(`/jobs/${jobId}/execution/status`);
        const status = response.data.status;
        
        setExecution(status);
        
        // Stop polling if execution is complete
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch execution status:', error);
        setLoading(false);
      }
    };

    // Poll immediately and then every 2 seconds
    pollExecutionStatus();
    pollInterval = setInterval(pollExecutionStatus, 2000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId]);

  const getStatusIcon = () => {
    if (!execution) return <FaSpinner className="spin" />;
    
    switch (execution.status) {
      case 'running':
      case 'pending':
        return <FaSpinner className="spin text-blue-500" />;
      case 'completed':
        return <FaCheck className="text-green-500" />;
      case 'failed':
        return <FaError className="text-red-500" />;
      default:
        return <FaSpinner className="spin" />;
    }
  };

  const getStatusText = () => {
    if (!execution) return 'Loading...';
    
    switch (execution.status) {
      case 'running':
        return 'Executing workflow...';
      case 'pending':
        return 'Workflow queued for execution...';
      case 'completed':
        return 'Workflow completed successfully!';
      case 'failed':
        return 'Workflow execution failed';
      default:
        return 'Unknown status';
    }
  };

  const downloadResults = () => {
    if (execution?.data) {
      const dataStr = JSON.stringify(execution.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `execution_${jobId}_results.json`);
      linkElement.click();
    }
  };

  return (
    <div className="execution-results-overlay">
      <div className="execution-results-panel">
        <div className="panel-header">
          <h3>Workflow Execution Results</h3>
          <button className="btn-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="panel-body">
          <div className="execution-status">
            <div className="status-header">
              {getStatusIcon()}
              <span className="status-text">{getStatusText()}</span>
            </div>
            
            <div className="execution-info">
              <p><strong>Job ID:</strong> {jobId}</p>
              {execution?.startedAt && (
                <p><strong>Started:</strong> {new Date(execution.startedAt).toLocaleString()}</p>
              )}
              {execution?.finishedAt && (
                <p><strong>Finished:</strong> {new Date(execution.finishedAt).toLocaleString()}</p>
              )}
            </div>
          </div>

          {execution?.error && (
            <div className="error-details">
              <h4>Error Details:</h4>
              <pre>{execution.error}</pre>
            </div>
          )}

          {execution?.data && (
            <div className="execution-data">
              <div className="data-header">
                <h4>Execution Data:</h4>
                <button className="btn-download" onClick={downloadResults}>
                  <FaDownload /> Download Results
                </button>
              </div>
              <pre className="data-content">
                {JSON.stringify(execution.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="panel-footer">
          <button className="btn-close-panel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <style>{`
        .execution-results-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .execution-results-panel {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 18px;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
        }

        .btn-close:hover {
          color: #374151;
        }

        .panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .execution-status {
          margin-bottom: 24px;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 16px;
          font-weight: 600;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .execution-info p {
          margin: 8px 0;
          color: #6b7280;
        }

        .error-details {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .error-details h4 {
          margin: 0 0 12px 0;
          color: #dc2626;
        }

        .error-details pre {
          color: #dc2626;
          background: white;
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 14px;
        }

        .execution-data {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .data-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .data-header h4 {
          margin: 0;
          color: #374151;
        }

        .btn-download {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #6366f1;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .btn-download:hover {
          background: #5558e3;
        }

        .data-content {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 12px;
          max-height: 300px;
          overflow: auto;
          font-size: 12px;
          line-height: 1.4;
        }

        .panel-footer {
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f8fafc;
          display: flex;
          justify-content: flex-end;
        }

        .btn-close-panel {
          background: #6b7280;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .btn-close-panel:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
};