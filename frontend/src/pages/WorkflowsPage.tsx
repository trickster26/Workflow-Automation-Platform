import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  SearchIcon,
  PlayIcon,
  PauseIcon,
  EditIcon,
  TrashIcon,
  MoreVerticalIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowApi } from '../services/api';
import { IWorkflow, WorkflowStatus } from '../types/workflow';
import { formatDistanceToNow } from 'date-fns';

export function WorkflowsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading, error } = useQuery(
    'workflows',
    workflowApi.getAll
  );

  const activateWorkflowMutation = useMutation(workflowApi.activate, {
    onSuccess: (_, workflowId) => {
      queryClient.invalidateQueries('workflows');
      toast.success('Workflow activated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to activate workflow');
    },
  });

  const deactivateWorkflowMutation = useMutation(workflowApi.deactivate, {
    onSuccess: (_, workflowId) => {
      queryClient.invalidateQueries('workflows');
      toast.success('Workflow deactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to deactivate workflow');
    },
  });

  const deleteWorkflowMutation = useMutation(workflowApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('workflows');
      toast.success('Workflow deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete workflow');
    },
  });

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleActive = async (workflow: IWorkflow) => {
    if (workflow.active) {
      deactivateWorkflowMutation.mutate(workflow.id);
    } else {
      activateWorkflowMutation.mutate(workflow.id);
    }
  };

  const handleDelete = async (workflow: IWorkflow) => {
    if (window.confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      deleteWorkflowMutation.mutate(workflow.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p>Failed to load workflows</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600">Manage your automation workflows</p>
        </div>
        
        <Link to="/workflows/new" className="btn-primary flex items-center space-x-2">
          <PlusIcon className="w-5 h-5" />
          <span>New Workflow</span>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Workflows List */}
      {filteredWorkflows.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <PlayIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {workflows.length === 0 ? 'No workflows yet' : 'No workflows found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {workflows.length === 0 
              ? 'Create your first workflow to get started with automation.'
              : 'Try adjusting your search terms.'
            }
          </p>
          {workflows.length === 0 && (
            <Link to="/workflows/new" className="btn-primary">
              Create Workflow
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Link
                      to={`/workflows/${workflow.id}/edit`}
                      className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {workflow.name}
                    </Link>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      workflow.isActive 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </span>

                    <span className={`status-badge ${
                      workflow.status === WorkflowStatus.DRAFT ? 'bg-yellow-100 text-yellow-800' :
                      workflow.status === WorkflowStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                      workflow.status === WorkflowStatus.ERROR ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {workflow.status}
                    </span>
                  </div>

                  {workflow.description && (
                    <p className="text-gray-600 mb-3 line-clamp-2">{workflow.description}</p>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{workflow.nodes.length} nodes</span>
                    <span>{workflow.connections.length} connections</span>
                    <span>v{workflow.version}</span>
                    <span>Updated {formatDistanceToNow(new Date(workflow.updatedAt))} ago</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(workflow)}
                    disabled={activateWorkflowMutation.isLoading || deactivateWorkflowMutation.isLoading}
                    className={`btn-sm ${
                      workflow.active 
                        ? 'btn bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'btn-primary'
                    } flex items-center space-x-1`}
                    title={workflow.active ? 'Deactivate workflow' : 'Activate workflow'}
                  >
                    {workflow.active ? (
                      <>
                        <PauseIcon className="w-4 h-4" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>

                  <Link
                    to={`/workflows/${workflow.id}/edit`}
                    className="btn-secondary btn-sm flex items-center space-x-1"
                    title="Edit workflow"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Edit</span>
                  </Link>

                  <button
                    onClick={() => handleDelete(workflow)}
                    disabled={deleteWorkflowMutation.isLoading}
                    className="btn bg-red-600 text-white hover:bg-red-700 btn-sm flex items-center space-x-1"
                    title="Delete workflow"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}