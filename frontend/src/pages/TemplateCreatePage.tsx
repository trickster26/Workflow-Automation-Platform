import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { TemplateCanvas } from '../components/TemplateCanvas/TemplateCanvas';
import { 
  ArrowLeftIcon,
  PaletteIcon
} from 'lucide-react';

export const TemplateCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSaveTemplate = async (templateData: any) => {
    setLoading(true);
    try {
      const response = await api.post('/templates/custom', templateData);
      
      if (response.data.success) {
        navigate('/templates', { 
          state: { message: 'Template created successfully!' }
        });
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/templates')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back to Templates
            </button>
            <div className="border-l pl-4">
              <div className="flex items-center gap-2">
                <PaletteIcon className="h-5 w-5 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">Visual Template Builder</h1>
              </div>
              <p className="text-sm text-gray-600">Drag and drop nodes to create your custom template</p>
            </div>
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 text-indigo-600">
              <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <TemplateCanvas onSave={handleSaveTemplate} />
      </div>
    </div>
  );
};

export default TemplateCreatePage;