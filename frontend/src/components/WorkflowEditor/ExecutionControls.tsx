import { useState } from 'react';
import { useMutation } from 'react-query';
import {
  PlayIcon,
  PauseIcon,
  SquareIcon,
  RotateCcwIcon,
  SettingsIcon,
  SaveIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { executionApi, workflowApi } from '@/services/api';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useWebSocket } from '@/hooks/useWebSocket';

export function ExecutionControls() {
  const { currentWorkflow, isExecuting, clearExecutionStates } = useWorkflowStore();
  const { subscribeToWorkflowExecutions, unsubscribeFromWorkflowExecutions } = useWebSocket();
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  const executeWorkflowMutation = useMutation(executionApi.create, {
    onSuccess: (data) => {
      toast.success('Workflow execution started');
      setCurrentExecutionId(data.jobId);
      if (currentWorkflow) {
        subscribeToWorkflowExecutions(currentWorkflow.id);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start execution');
    },
  });

  const pauseExecutionMutation = useMutation(executionApi.pause, {
    onSuccess: () => {
      toast.success('Execution paused');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to pause execution');
    },
  });

  const resumeExecutionMutation = useMutation(executionApi.resume, {
    onSuccess: () => {
      toast.success('Execution resumed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to resume execution');
    },
  });

  const cancelExecutionMutation = useMutation(executionApi.cancel, {
    onSuccess: () => {
      toast.success('Execution cancelled');
      setCurrentExecutionId(null);
      clearExecutionStates();
      if (currentWorkflow) {
        unsubscribeFromWorkflowExecutions(currentWorkflow.id);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel execution');
    },
  });

  const saveWorkflowMutation = useMutation(
    (workflow: any) => workflowApi.update(workflow.id, workflow),
    {
      onSuccess: () => {
        toast.success('Workflow saved');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to save workflow');
      },
    }
  );

  const handleExecute = () => {
    if (!currentWorkflow) {
      toast.error('No workflow to execute');
      return;
    }

    if (currentWorkflow.nodes.length === 0) {
      toast.error('Workflow has no nodes');
      return;
    }

    executeWorkflowMutation.mutate({
      workflowId: currentWorkflow.id,
      mode: 'manual',
    });
  };

  const handlePause = () => {
    if (currentExecutionId) {
      pauseExecutionMutation.mutate(currentExecutionId);
    }
  };

  const handleResume = () => {
    if (currentExecutionId) {
      resumeExecutionMutation.mutate(currentExecutionId);
    }
  };

  const handleStop = () => {
    if (currentExecutionId) {
      cancelExecutionMutation.mutate(currentExecutionId);
    }
  };

  const handleSave = () => {
    if (currentWorkflow) {
      saveWorkflowMutation.mutate(currentWorkflow);
    }
  };

  if (!currentWorkflow) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg shadow-lg p-2 border border-gray-200">
      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saveWorkflowMutation.isLoading}
        className="btn-ghost btn-sm flex items-center space-x-1"
        title="Save workflow"
      >
        <SaveIcon className="w-4 h-4" />
        <span>Save</span>
      </button>

      <div className="w-px h-6 bg-gray-300" />

      {/* Execution Controls */}
      {!isExecuting ? (
        <button
          onClick={handleExecute}
          disabled={executeWorkflowMutation.isLoading}
          className="btn-primary btn-sm flex items-center space-x-1"
          title="Execute workflow"
        >
          <PlayIcon className="w-4 h-4" />
          <span>Execute</span>
        </button>
      ) : (
        <>
          <button
            onClick={handlePause}
            disabled={pauseExecutionMutation.isLoading}
            className="btn-secondary btn-sm flex items-center space-x-1"
            title="Pause execution"
          >
            <PauseIcon className="w-4 h-4" />
            <span>Pause</span>
          </button>

          <button
            onClick={handleResume}
            disabled={resumeExecutionMutation.isLoading}
            className="btn-secondary btn-sm flex items-center space-x-1"
            title="Resume execution"
          >
            <PlayIcon className="w-4 h-4" />
            <span>Resume</span>
          </button>

          <button
            onClick={handleStop}
            disabled={cancelExecutionMutation.isLoading}
            className="btn bg-red-600 text-white hover:bg-red-700 btn-sm flex items-center space-x-1"
            title="Stop execution"
          >
            <SquareIcon className="w-4 h-4" />
            <span>Stop</span>
          </button>
        </>
      )}

      {/* Workflow Status */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 ml-4">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            isExecuting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <span>{isExecuting ? 'Running' : 'Ready'}</span>
        </div>
        
        <div className="text-gray-400">•</div>
        
        <span>{currentWorkflow.nodes.length} nodes</span>
        <span>{currentWorkflow.connections.length} connections</span>
      </div>
    </div>
  );
}