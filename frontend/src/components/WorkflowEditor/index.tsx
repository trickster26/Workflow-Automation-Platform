import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { CustomNode } from './CustomNode';
import { NodeSidebar } from './NodeSidebar';
import { PropertyPanel } from './PropertyPanel';
import { ExecutionControls } from './ExecutionControls';
import { useWorkflowStore } from '@/stores/workflowStore';
import { INode as WorkflowNode, IConnection } from '@/types/workflow';

const nodeTypes = {
  custom: CustomNode,
};

interface WorkflowEditorProps {
  workflowId?: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const {
    currentWorkflow,
    selectedNodeId,
    addConnection,
    deleteConnection,
    selectNode,
    executionProgress,
    isExecuting,
  } = useWorkflowStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert workflow nodes to ReactFlow nodes
  const reactFlowNodes = useMemo(() => {
    if (!currentWorkflow) return [];

    return currentWorkflow.nodes.map((workflowNode: WorkflowNode) => ({
      id: workflowNode.id,
      type: 'custom',
      position: workflowNode.position,
      data: {
        ...workflowNode,
        executionState: executionProgress[workflowNode.id] || 'idle',
        isSelected: selectedNodeId === workflowNode.id,
      },
      selected: selectedNodeId === workflowNode.id,
    }));
  }, [currentWorkflow, executionProgress, selectedNodeId]);

  // Convert workflow connections to ReactFlow edges
  const reactFlowEdges = useMemo(() => {
    if (!currentWorkflow) return [];

    return currentWorkflow.connections.map((connection: IConnection, index: number) => ({
      id: `edge-${index}`,
      source: connection.source.nodeId,
      target: connection.target.nodeId,
      sourceHandle: `output-${connection.source.outputIndex}`,
      targetHandle: `input-${connection.target.inputIndex}`,
      animated: isExecuting,
      style: { stroke: '#64748b', strokeWidth: 2 },
    }));
  }, [currentWorkflow, isExecuting]);

  // Update ReactFlow nodes and edges when workflow changes
  useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addConnection(connection.source, connection.target);
      }
    },
    [addConnection]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      // Handle edge selection if needed
    },
    []
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (!currentWorkflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Workflow Selected</h2>
          <p className="text-gray-600">Select a workflow to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Node Sidebar */}
      <NodeSidebar />

      {/* Main Editor */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="workflow-editor"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor="#e2e8f0"
            nodeStrokeColor="#64748b"
            nodeStrokeWidth={2}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          
          {/* Execution Controls */}
          <Panel position="top-right">
            <ExecutionControls />
          </Panel>
        </ReactFlow>
      </div>

      {/* Property Panel */}
      {selectedNodeId && <PropertyPanel />}
    </div>
  );
}