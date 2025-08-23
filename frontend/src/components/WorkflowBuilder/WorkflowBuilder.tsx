import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  Background,
  MiniMap,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  MarkerType,
  Panel,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodePalette } from './NodePalette';
import { CustomNode } from './nodes/CustomNode';
import { TriggerNode } from './nodes/TriggerNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowToolbar } from './WorkflowToolbar';
import './WorkflowBuilder.css';
import { INode, IConnection, NodeType } from '../../types/workflow';
import { useToast } from '../../hooks/useToast';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  // Add custom edge types if needed
};

interface WorkflowBuilderProps {
  workflowId?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onTest?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

const WorkflowBuilderContent: React.FC<WorkflowBuilderProps> = ({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onTest,
  readOnly = false,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const { toast } = useToast();
  const { project } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#6366f1',
        },
        style: {
          stroke: '#6366f1',
          strokeWidth: 2,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      const nodeData = JSON.parse(event.dataTransfer.getData('nodeData') || '{}');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type: nodeData.nodeType || 'custom',
        position,
        data: {
          label: nodeData.label || `${type} node`,
          type: type,
          icon: nodeData.icon,
          color: nodeData.color,
          parameters: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
      toast.success(`Added ${nodeData.label} node`);
    },
    [project, setNodes, toast]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onNodeDelete = useCallback(
    (deleted: Node[]) => {
      if (deleted.some((node) => node.id === selectedNode?.id)) {
        setSelectedNode(null);
      }
      toast.info(`Deleted ${deleted.length} node(s)`);
    },
    [selectedNode, toast]
  );

  const onEdgeDelete = useCallback(
    (deleted: Edge[]) => {
      toast.info(`Deleted ${deleted.length} connection(s)`);
    },
    [toast]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
          }
          return node;
        })
      );
      toast.success('Node configuration updated');
    },
    [setNodes, toast]
  );

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
      toast.success('Workflow saved successfully');
    }
  }, [nodes, edges, onSave, toast]);

  const handleTest = useCallback(() => {
    if (onTest) {
      onTest(nodes, edges);
      toast.info('Testing workflow...');
    }
  }, [nodes, edges, onTest, toast]);

  const handleExport = useCallback(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      const dataStr = JSON.stringify(flow, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `workflow_${workflowId || 'export'}_${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Workflow exported');
    }
  }, [reactFlowInstance, workflowId, toast]);

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const flow = JSON.parse(e.target?.result as string);
            const { nodes: importedNodes = [], edges: importedEdges = [] } = flow;
            setNodes(importedNodes);
            setEdges(importedEdges);
            toast.success('Workflow imported successfully');
          } catch (error) {
            toast.error('Failed to import workflow');
          }
        };
        reader.readAsText(file);
      }
    },
    [setNodes, setEdges, toast]
  );

  return (
    <div className="workflow-builder">
      <WorkflowToolbar
        onSave={handleSave}
        onTest={handleTest}
        onExport={handleExport}
        onImport={handleImport}
        isReadOnly={readOnly}
      />
      
      <div className="workflow-builder-container">
        <NodePalette />
        
        <div className="workflow-canvas" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={readOnly ? undefined : onNodeDelete}
            onEdgesDelete={readOnly ? undefined : onEdgeDelete}
            onInit={setReactFlowInstance}
            onDrop={readOnly ? undefined : onDrop}
            onDragOver={readOnly ? undefined : onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            attributionPosition="bottom-left"
            deleteKeyCode={readOnly ? null : 'Delete'}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="#e5e7eb"
            />
            <Controls />
            <MiniMap
              nodeStrokeColor={(n) => {
                if (n.data?.color) return n.data.color;
                return '#6366f1';
              }}
              nodeColor={(n) => {
                if (n.data?.color) return n.data.color;
                return '#fff';
              }}
              nodeBorderRadius={8}
            />
            <Panel position="top-left">
              <div className="workflow-info">
                <span className="workflow-name">
                  {workflowId ? `Workflow: ${workflowId}` : 'New Workflow'}
                </span>
                <span className="node-count">
                  {nodes.length} nodes, {edges.length} connections
                </span>
              </div>
            </Panel>
          </ReactFlow>
        </div>
        
        {selectedNode && !readOnly && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent {...props} />
    </ReactFlowProvider>
  );
};