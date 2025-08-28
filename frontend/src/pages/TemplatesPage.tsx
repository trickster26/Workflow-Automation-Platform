import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  FileTextIcon, 
  DownloadIcon, 
  CopyIcon, 
  StarIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  GridIcon,
  ListIcon
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  isPublic: boolean;
  createdAt: string;
  tags: string[];
  type?: 'node' | 'workflow' | 'scenario';
  difficulty?: string;
  icon?: string;
  color?: string;
  estimatedTime?: string;
  complexity?: string;
  industry?: string;
  estimatedSavings?: string;
}

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = [
    'all',
    'trigger',
    'transform', 
    'integration',
    'data-processing',
    'alerting'
  ];

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Fetch different types of templates
      const [nodesResponse, workflowsResponse, scenariosResponse] = await Promise.all([
        api.get('/templates/nodes', { 
          params: selectedCategory !== 'all' ? { category: selectedCategory } : {} 
        }),
        api.get('/templates/workflows', { 
          params: selectedCategory !== 'all' ? { category: selectedCategory } : {} 
        }),
        api.get('/templates/scenarios', { 
          params: selectedCategory !== 'all' ? { category: selectedCategory } : {} 
        })
      ]);

      // Combine all templates with type information
      const allTemplates = [
        ...nodesResponse.data.data.map((t: any) => ({
          id: t.templateId,
          name: t.name,
          description: t.description,
          category: t.category,
          author: 'System',
          version: '1.0.0',
          downloads: Math.floor(Math.random() * 1000),
          rating: 4.2 + Math.random() * 0.8,
          isPublic: true,
          createdAt: new Date().toISOString(),
          tags: t.tags,
          type: 'node',
          difficulty: t.difficulty,
          icon: t.icon,
          color: t.color
        })),
        ...workflowsResponse.data.data.map((t: any) => ({
          id: t.templateId,
          name: t.name,
          description: t.description,
          category: t.category,
          author: 'System',
          version: '1.0.0',
          downloads: Math.floor(Math.random() * 500),
          rating: 4.0 + Math.random() * 1.0,
          isPublic: true,
          createdAt: new Date().toISOString(),
          tags: t.tags,
          type: 'workflow',
          difficulty: t.difficulty,
          estimatedTime: t.estimatedExecutionTime,
          complexity: t.complexity
        })),
        ...scenariosResponse.data.data.map((t: any) => ({
          id: t.templateId,
          name: t.name,
          description: t.description,
          category: t.category,
          author: 'System',
          version: '1.0.0',
          downloads: Math.floor(Math.random() * 200),
          rating: 4.5 + Math.random() * 0.5,
          isPublic: true,
          createdAt: new Date().toISOString(),
          tags: t.tags,
          type: 'scenario',
          difficulty: t.difficulty,
          industry: t.industry,
          estimatedSavings: t.estimatedSavings
        }))
      ];

      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const response = await api.post(`/templates/${templateId}/fork`);
      navigate(`/workflows/${response.data.workflowId}/edit`);
    } catch (error) {
      console.error('Failed to use template:', error);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Workflow Templates</h1>
        <p className="text-gray-600">Discover and use pre-built workflow templates</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {viewMode === 'grid' ? <ListIcon className="h-5 w-5" /> : <GridIcon className="h-5 w-5" />}
            </button>
            
            <button
              onClick={() => navigate('/templates/create')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <FileTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No templates found</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 
          'space-y-4'
        }>
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {template.icon && (
                        <span className="text-lg">{template.icon}</span>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {template.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                        {template.type || 'template'}
                      </span>
                      {template.difficulty && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          template.difficulty === 'beginner' ? 'bg-green-100 text-green-600' :
                          template.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {template.difficulty}
                        </span>
                      )}
                      <p className="text-sm text-gray-500">v{template.version}</p>
                    </div>
                  </div>
                  {template.rating > 0 && (
                    <div className="flex items-center text-yellow-500">
                      <StarIcon className="h-4 w-4 fill-current" />
                      <span className="ml-1 text-sm">{template.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags?.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{template.author}</span>
                  <span className="flex items-center gap-1">
                    <DownloadIcon className="h-4 w-4" />
                    {template.downloads}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUseTemplate(template.id)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <CopyIcon className="h-4 w-4" />
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};