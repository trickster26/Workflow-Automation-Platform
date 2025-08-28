import React from 'react';
import { 
  FaPlay, 
  FaClock, 
  FaGlobe, 
  FaDatabase, 
  FaEnvelope, 
  FaCode, 
  FaRandom, 
  FaFilter,
  FaCodeBranch,
  FaSyncAlt,
  FaPause,
  FaCopy,
  FaExchangeAlt,
  FaCalculator,
  FaFileAlt,
  FaFileUpload,
  FaFileDownload,
  FaCloud,
  FaBell,
  FaRobot,
  FaChartBar,
  FaFileExport,
  FaTable,
  FaAws
} from 'react-icons/fa';
import './NodePalette.css';

interface NodeTemplate {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  category: string;
  description: string;
  nodeType: string;
}

const nodeTemplates: NodeTemplate[] = [
  // Triggers
  {
    type: 'manual',
    label: 'Manual Trigger',
    icon: <FaPlay />,
    color: '#10b981',
    category: 'Triggers',
    description: 'Start workflow manually',
    nodeType: 'trigger',
  },
  {
    type: 'schedule',
    label: 'Schedule',
    icon: <FaClock />,
    color: '#10b981',
    category: 'Triggers',
    description: 'Trigger on schedule',
    nodeType: 'trigger',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: <FaGlobe />,
    color: '#10b981',
    category: 'Triggers',
    description: 'Trigger via webhook',
    nodeType: 'trigger',
  },
  
  // Actions
  {
    type: 'http',
    label: 'HTTP Request',
    icon: <FaGlobe />,
    color: '#6366f1',
    category: 'Actions',
    description: 'Make HTTP requests',
    nodeType: 'action',
  },
  {
    type: 'database',
    label: 'Database',
    icon: <FaDatabase />,
    color: '#6366f1',
    category: 'Actions',
    description: 'Database operations',
    nodeType: 'action',
  },
  {
    type: 'email',
    label: 'Email',
    icon: <FaEnvelope />,
    color: '#6366f1',
    category: 'Actions',
    description: 'Send emails',
    nodeType: 'action',
  },
  {
    type: 'code',
    label: 'Code',
    icon: <FaCode />,
    color: '#6366f1',
    category: 'Actions',
    description: 'Execute custom code',
    nodeType: 'action',
  },
  {
    type: 'fileUpload',
    label: 'File Upload',
    icon: <FaFileUpload />,
    color: '#10b981',
    category: 'Actions',
    description: 'Upload files to server storage',
    nodeType: 'action',
  },
  {
    type: 'fileDownload',
    label: 'File Download',
    icon: <FaFileDownload />,
    color: '#3b82f6',
    category: 'Actions',
    description: 'Download files from URLs or storage',
    nodeType: 'action',
  },
  {
    type: 'aws',
    label: 'AWS',
    icon: <FaAws />,
    color: '#ff9900',
    category: 'Actions', 
    description: 'Amazon Web Services (S3, Lambda, SQS, SNS, SES)',
    nodeType: 'action',
  },
  
  // Flow Control
  {
    type: 'condition',
    label: 'IF Condition',
    icon: <FaCodeBranch />,
    color: '#f59e0b',
    category: 'Flow Control',
    description: 'Conditional branching',
    nodeType: 'condition',
  },
  {
    type: 'switch',
    label: 'Switch',
    icon: <FaRandom />,
    color: '#f59e0b',
    category: 'Flow Control',
    description: 'Multiple branches',
    nodeType: 'condition',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: <FaSyncAlt />,
    color: '#f59e0b',
    category: 'Flow Control',
    description: 'Iterate over items',
    nodeType: 'action',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: <FaPause />,
    color: '#f59e0b',
    category: 'Flow Control',
    description: 'Wait before continuing',
    nodeType: 'action',
  },
  
  // Data Processing
  {
    type: 'transformer',
    label: 'Transform Data',
    icon: <FaExchangeAlt />,
    color: '#8b5cf6',
    category: 'Data Processing',
    description: 'Transform data structure',
    nodeType: 'action',
  },
  {
    type: 'filter',
    label: 'Filter',
    icon: <FaFilter />,
    color: '#8b5cf6',
    category: 'Data Processing',
    description: 'Filter data items',
    nodeType: 'action',
  },
  {
    type: 'merge',
    label: 'Merge',
    icon: <FaCopy />,
    color: '#8b5cf6',
    category: 'Data Processing',
    description: 'Merge data streams',
    nodeType: 'action',
  },
  {
    type: 'split',
    label: 'Split',
    icon: <FaRandom />,
    color: '#8b5cf6',
    category: 'Data Processing',
    description: 'Split data into parts',
    nodeType: 'action',
  },
  {
    type: 'aggregate',
    label: 'Aggregate',
    icon: <FaCalculator />,
    color: '#8b5cf6',
    category: 'Data Processing',
    description: 'Aggregate data',
    nodeType: 'action',
  },
  {
    type: 'export',
    label: 'Export Data',
    icon: <FaFileExport />,
    color: '#8b5cf6',
    category: 'Data Processing',
    description: 'Export data to Excel/CSV',
    nodeType: 'action',
  },
  
  // Advanced
  {
    type: 'ai',
    label: 'AI/ML',
    icon: <FaRobot />,
    color: '#ec4899',
    category: 'Advanced',
    description: 'AI/ML operations',
    nodeType: 'action',
  },
  {
    type: 'notification',
    label: 'Notification',
    icon: <FaBell />,
    color: '#ec4899',
    category: 'Advanced',
    description: 'Send notifications',
    nodeType: 'action',
  },
  {
    type: 'analytics',
    label: 'Analytics',
    icon: <FaChartBar />,
    color: '#ec4899',
    category: 'Advanced',
    description: 'Track analytics',
    nodeType: 'action',
  },
];

export const NodePalette: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  
  const categories = Array.from(new Set(nodeTemplates.map(n => n.category)));
  
  const filteredNodes = nodeTemplates.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const onDragStart = (event: React.DragEvent, nodeType: string, nodeData: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };
  
  return (
    <div className="node-palette">
      <div className="node-palette-header">
        <h3>Node Library</h3>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="node-search"
        />
      </div>
      
      <div className="node-categories">
        <button
          className={`category-tab ${!selectedCategory ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>
        {categories.map(category => (
          <button
            key={category}
            className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      <div className="node-list">
        {filteredNodes.map(node => (
          <div
            key={node.type}
            className="node-item"
            draggable
            onDragStart={(e) => onDragStart(e, node.type, node)}
            style={{ borderLeftColor: node.color }}
          >
            <div className="node-item-icon" style={{ color: node.color }}>
              {node.icon}
            </div>
            <div className="node-item-content">
              <div className="node-item-label">{node.label}</div>
              <div className="node-item-description">{node.description}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="node-palette-footer">
        <p>Drag nodes to canvas</p>
      </div>
    </div>
  );
};