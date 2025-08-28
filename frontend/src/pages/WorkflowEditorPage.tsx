import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Node, Edge } from 'reactflow';
import { WorkflowBuilder } from '../components/WorkflowBuilder/WorkflowBuilder';
import { ExecutionResults } from '../components/WorkflowBuilder/ExecutionResults';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './WorkflowEditorPage.css';

const WorkflowEditorPage: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executionJobId, setExecutionJobId] = useState<string | null>(null);

  useEffect(() => {
    if (workflowId && workflowId !== 'new') {
      loadWorkflow();
    } else {
      setLoading(false);
    }
  }, [workflowId]);

  const loadWorkflow = async () => {
    try {
      const response = await api.get(`/workflows/${workflowId}`);
      setWorkflow(response.data);
    } catch (error) {
      console.error('Failed to load workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    setSaving(true);
    try {
      const workflowData = {
        name: workflow?.name || 'New Workflow',
        description: workflow?.description || '',
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.data.type,
          position: node.position,
          data: node.data,
          parameters: node.data.parameters || {},
        })),
        connections: edges.map(edge => ({
          source: {
            nodeId: edge.source,
            outputIndex: edge.sourceHandle ? parseInt(edge.sourceHandle) : 0,
          },
          target: {
            nodeId: edge.target,
            inputIndex: edge.targetHandle ? parseInt(edge.targetHandle) : 0,
          },
        })),
        settings: workflow?.settings || {},
        isActive: workflow?.isActive || false,
      };

      let response;
      if (workflowId && workflowId !== 'new') {
        response = await api.put(`/workflows/${workflowId}`, workflowData);
      } else {
        response = await api.post('/workflows', workflowData);
        navigate(`/workflows/${response.data.id}/edit`, { replace: true });
      }
      
      setWorkflow(response.data);
      console.log('Workflow saved successfully');
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (nodes: Node[], edges: Edge[]) => {
    try {
      // First save the workflow
      await handleSave(nodes, edges);
      
      // Validate workflow has nodes
      if (nodes.length === 0) {
        alert('Please add at least one node to test the workflow');
        return;
      }
      
      // Then test it
      const response = await api.post(`/executions`, {
        workflowId: workflow?.id || workflowId,
        mode: 'manual',
      });
      
      console.log('Test execution started:', response.data);
      
      // Show execution results panel
      if (response.data.jobId) {
        setExecutionJobId(response.data.jobId);
      }
    } catch (error) {
      console.error('Failed to test workflow:', error);
      alert(`❌ Failed to test workflow: ${error.response?.data?.error || error.message}`);
    }
  };

  const convertWorkflowToReactFlow = (workflow: any): { nodes: Node[], edges: Edge[] } => {
    if (!workflow) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = (workflow.nodes || []).map((node: any) => ({
      id: node.id,
      type: getNodeType(node.type),
      position: node.position || { x: 100, y: 100 },
      data: {
        label: node.data?.label || node.name || node.type,
        type: node.type,
        description: node.data?.description || '',
        parameters: node.parameters || {},
        ...node.data,
      },
    }));

    const edges: Edge[] = (workflow.connections || []).map((conn: any, index: number) => {
      // Handle both connection formats: new template format and existing format
      let sourceNodeId: string;
      let targetNodeId: string;
      let sourceHandle: string | undefined;
      let targetHandle: string | undefined;

      if (conn.from && conn.to) {
        // Template format: { from: 'nodeId', to: 'nodeId' }
        sourceNodeId = conn.from;
        targetNodeId = conn.to;
        sourceHandle = conn.output?.toString();
        targetHandle = conn.input?.toString();
      } else if (conn.source?.nodeId && conn.target?.nodeId) {
        // Existing format: { source: { nodeId: 'id' }, target: { nodeId: 'id' } }
        sourceNodeId = conn.source.nodeId;
        targetNodeId = conn.target.nodeId;
        sourceHandle = conn.source.outputIndex?.toString();
        targetHandle = conn.target.inputIndex?.toString();
      } else {
        // Fallback - skip invalid connections
        console.warn('Invalid connection format:', conn);
        return null;
      }

      return {
        id: `${sourceNodeId}-${targetNodeId}-${index}`,
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: true,
      };
    }).filter(Boolean); // Remove null connections

    return { nodes, edges };
  };

  const getNodeType = (type: string): string => {
    const triggerTypes = ['manual', 'schedule', 'webhook'];
    const conditionTypes = ['condition', 'switch'];
    const actionTypes = ['http', 'database', 'email', 'export', 'code', 'delay', 'loop'];
    
    if (triggerTypes.includes(type)) return 'trigger';
    if (conditionTypes.includes(type)) return 'condition';
    if (actionTypes.includes(type)) return 'action';
    
    return 'custom';
  };

  if (loading) {
    return (
      <div className="workflow-editor-loading">
        <div className="spinner"></div>
        <p>Loading workflow...</p>
      </div>
    );
  }

  const { nodes, edges } = convertWorkflowToReactFlow(workflow);

  return (
    <div className="workflow-editor-page">
      <div className="workflow-editor-header">
        <div className="header-content">
          <button 
            className="btn-back" 
            onClick={() => navigate('/workflows')}
          >
            ← Back to Workflows
          </button>
          {saving && <span className="saving-indicator">Saving...</span>}
        </div>
      </div>
      
      <div className="workflow-editor-content">
        <WorkflowBuilder
          workflowId={workflowId}
          initialNodes={nodes}
          initialEdges={edges}
          onSave={handleSave}
          onTest={handleTest}
          readOnly={false}
          workflowName={workflow?.name || 'New Workflow'}
          workflowDescription={workflow?.description || ''}
          onWorkflowNameChange={(name) => setWorkflow({ ...workflow, name })}
          onWorkflowDescriptionChange={(description) => setWorkflow({ ...workflow, description })}
        />
      </div>

      {/* Execution Results Modal */}
      {executionJobId && (
        <ExecutionResults
          jobId={executionJobId}
          onClose={() => setExecutionJobId(null)}
        />
      )}
    </div>
  );
};

export default WorkflowEditorPage;