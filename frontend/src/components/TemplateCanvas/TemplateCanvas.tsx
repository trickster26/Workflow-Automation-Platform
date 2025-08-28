import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  Panel,
  ReactFlowInstance,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from '../WorkflowBuilder/nodes/CustomNode';
import { TriggerNode } from '../WorkflowBuilder/nodes/TriggerNode';
import { ActionNode } from '../WorkflowBuilder/nodes/ActionNode';
import { ConditionNode } from '../WorkflowBuilder/nodes/ConditionNode';
import { NodePalette } from '../WorkflowBuilder/NodePalette';
import { NodeConfigPanel } from '../WorkflowBuilder/NodeConfigPanel';
import { WorkflowToolbar } from '../WorkflowBuilder/WorkflowToolbar';
import '../WorkflowBuilder/WorkflowBuilder.css';
import '../WorkflowBuilder/NodeConfigPanel.css';
import './TemplateCanvas.css';
import { TemplateInfo } from './TemplateInfo';

interface TemplateCanvasProps {
  onSave: (templateData: any) => void;
  initialData?: any;
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  custom: CustomNode,
};

const TemplateCanvasContent: React.FC<TemplateCanvasProps> = ({ onSave, initialData }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [templateInfo, setTemplateInfo] = useState({
    name: '',
    description: '',
    category: 'integration',
    difficulty: 'beginner',
    tags: [],
    useCase: []
  });

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

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeData = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeData) {
        return;
      }

      const parsedData = JSON.parse(nodeData);
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${parsedData.type}-${Date.now()}`,
        type: parsedData.nodeType || 'custom',
        position,
        data: {
          ...parsedData,
          parameters: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, updates: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node
      )
    );
  }, [setNodes]);

  const handleSaveTemplate = () => {
    if (!templateInfo.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (nodes.length === 0) {
      alert('Please add at least one node to your template');
      return;
    }

    const templateData = {
      ...templateInfo,
      templateId: `custom-${Date.now()}`,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data.type || node.type,
        name: node.data.label || node.data.name,
        position: node.position,
        configuration: node.data.parameters || {},
      })),
      connections: edges.map(edge => ({
        from: edge.source,
        to: edge.target,
      })),
      icon: templateInfo.category === 'trigger' ? '🚀' : 
            templateInfo.category === 'integration' ? '🔌' : 
            templateInfo.category === 'transform' ? '🔄' : '⚙️',
      color: templateInfo.category === 'trigger' ? '#10b981' : 
             templateInfo.category === 'integration' ? '#8b5cf6' : 
             templateInfo.category === 'transform' ? '#3b82f6' : '#6b7280',
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    onSave(templateData);
  };

  return (
    <div className="workflow-builder">
      {/* Left Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Template Builder</h2>
          <p>Create your custom workflow template</p>
        </div>
        
        <div className="sidebar-content">
          <TemplateInfo
            templateInfo={templateInfo}
            onChange={setTemplateInfo}
          />
          
          <NodePalette />
          
          {selectedNode && (
            <NodeConfigPanel
              selectedNode={selectedNode}
              onUpdateNode={updateNodeConfig}
              nodes={nodes}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>

        <div className="sidebar-footer">
          <button 
            onClick={handleSaveTemplate}
            className="save-button"
          >
            Save Template
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="canvas-container" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background variant={BackgroundVariant.Dots} />
          <MiniMap
            nodeColor={(node) => node.data.color || '#6366f1'}
            nodeStrokeWidth={3}
            zoomable
            pannable
          />
          <Controls />
          
          <Panel position="top-right">
            <WorkflowToolbar
              nodes={nodes}
              edges={edges}
              onSave={() => handleSaveTemplate()}
              canSave={templateInfo.name.trim().length > 0 && nodes.length > 0}
              showTest={false}
            />
          </Panel>

          {nodes.length === 0 && (
            <Panel position="top-center" className="welcome-panel">
              <div className="welcome-message">
                <div className="welcome-icon">🎯</div>
                <h3>Build Your Template</h3>
                <p>Drag nodes from the sidebar to create your workflow template</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

export const TemplateCanvas: React.FC<TemplateCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TemplateCanvasContent {...props} />
    </ReactFlowProvider>
  );
};