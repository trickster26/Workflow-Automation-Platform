import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ArrowLeftIcon } from 'lucide-react';
import { WorkflowEditor } from '@/components/WorkflowEditor';
import { workflowApi } from '@/services/api';
import { useWorkflowStore } from '@/stores/workflowStore';

export function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { setCurrentWorkflow, createNewWorkflow, currentWorkflow } = useWorkflowStore();

  // Fetch workflow if editing existing workflow
  const { data: workflow, isLoading, error } = useQuery(
    ['workflow', workflowId],
    () => workflowApi.getById(workflowId!),
    {
      enabled: !!workflowId,
      onSuccess: (data) => {
        setCurrentWorkflow(data);
      },
    }
  );

  // Create new workflow if no workflowId
  useEffect(() => {
    if (!workflowId) {
      const newWorkflow = createNewWorkflow();
      setCurrentWorkflow(newWorkflow);
    }
  }, [workflowId, createNewWorkflow, setCurrentWorkflow]);

  const handleBack = () => {
    navigate('/workflows');
  };

  if (workflowId && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (workflowId && error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Workflow Not Found</h2>
          <p className="text-gray-600 mb-4">The requested workflow could not be loaded.</p>
          <button onClick={handleBack} className="btn-primary">
            Back to Workflows
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="btn-ghost btn-sm flex items-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {currentWorkflow?.name || 'New Workflow'}
            </h1>
            <p className="text-sm text-gray-600">
              {workflowId ? 'Editing workflow' : 'Creating new workflow'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {currentWorkflow && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentWorkflow.active 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {currentWorkflow.active ? 'Active' : 'Inactive'}
              </span>
              <span>v{currentWorkflow.version}</span>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <WorkflowEditor workflowId={workflowId} />
      </div>
    </div>
  );
}