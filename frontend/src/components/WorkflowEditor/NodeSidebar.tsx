import { useState } from 'react';
import { useDrag } from 'react-dnd';
import { useQuery } from 'react-query';
import clsx from 'clsx';
import {
  SearchIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
} from 'lucide-react';
import { nodeTypesApi } from '@/services/api';
import { INodeTypeDescription, NodeType } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflowStore';

interface DraggableNodeProps {
  nodeType: INodeTypeDescription;
}

function DraggableNode({ nodeType }: DraggableNodeProps) {
  const { addNode } = useWorkflowStore();

  const handleAddNode = () => {
    // Add node at center of viewport
    addNode(nodeType.name, { x: 250, y: 250 });
  };

  return (
    <div
      className="group flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm cursor-pointer transition-all duration-200"
      onClick={handleAddNode}
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 bg-primary-500 rounded"></div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {nodeType.displayName}
          </div>
          <div className="text-xs text-gray-500 line-clamp-1">
            {nodeType.description}
          </div>
        </div>
      </div>
      <PlusIcon className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
    </div>
  );
}

interface NodeCategoryProps {
  category: string;
  nodes: INodeTypeDescription[];
  isOpen: boolean;
  onToggle: () => void;
}

function NodeCategory({ category, nodes, isOpen, onToggle }: NodeCategoryProps) {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        <span className="capitalize">{category}</span>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {nodes.length}
          </span>
          {isOpen ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="mt-2 space-y-2">
          {nodes.map((nodeType) => (
            <DraggableNode key={nodeType.name} nodeType={nodeType} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NodeSidebar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['trigger', 'transform']));

  const { data: nodeTypes = [], isLoading, error } = useQuery(
    'nodeTypes',
    nodeTypesApi.getAll,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Group nodes by category
  const nodesByCategory = nodeTypes.reduce((acc, nodeType) => {
    nodeType.group.forEach(category => {
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(nodeType);
    });
    return acc;
  }, {} as Record<string, INodeTypeDescription[]>);

  // Filter nodes based on search term
  const filteredNodesByCategory = Object.entries(nodesByCategory).reduce((acc, [category, nodes]) => {
    const filteredNodes = nodes.filter(node =>
      node.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredNodes.length > 0) {
      acc[category] = filteredNodes;
    }
    
    return acc;
  }, {} as Record<string, INodeTypeDescription[]>);

  const toggleCategory = (category: string) => {
    const newOpenCategories = new Set(openCategories);
    if (newOpenCategories.has(category)) {
      newOpenCategories.delete(category);
    } else {
      newOpenCategories.add(category);
    }
    setOpenCategories(newOpenCategories);
  };

  if (error) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="text-center text-red-600">
          <p className="text-sm">Failed to load node types</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Nodes</h2>
        
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {Object.entries(filteredNodesByCategory).map(([category, nodes]) => (
              <NodeCategory
                key={category}
                category={category}
                nodes={nodes}
                isOpen={openCategories.has(category) || !!searchTerm}
                onToggle={() => toggleCategory(category)}
              />
            ))}

            {Object.keys(filteredNodesByCategory).length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-sm">
                  {searchTerm ? 'No nodes found matching your search' : 'No nodes available'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}