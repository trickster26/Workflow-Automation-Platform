import { useState } from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import {
  PlayIcon,
  RefreshCwIcon,
  FilterIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
} from 'lucide-react';
import { executionApi } from '@/services/api';
import { ExecutionStatus, IExecution } from '@/types/workflow';
import { formatDistanceToNow, format } from 'date-fns';

const statusIcons = {
  [ExecutionStatus.SUCCESS]: CheckCircleIcon,
  [ExecutionStatus.FAILED]: XCircleIcon,
  [ExecutionStatus.RUNNING]: PlayIcon,
  [ExecutionStatus.PENDING]: ClockIcon,
  [ExecutionStatus.CANCELLED]: PauseCircleIcon,
  [ExecutionStatus.WAITING]: ClockIcon,
};

const statusColors = {
  [ExecutionStatus.SUCCESS]: 'text-green-600 bg-green-100',
  [ExecutionStatus.FAILED]: 'text-red-600 bg-red-100',
  [ExecutionStatus.RUNNING]: 'text-blue-600 bg-blue-100',
  [ExecutionStatus.PENDING]: 'text-yellow-600 bg-yellow-100',
  [ExecutionStatus.CANCELLED]: 'text-gray-600 bg-gray-100',
  [ExecutionStatus.WAITING]: 'text-orange-600 bg-orange-100',
};

export function ExecutionsPage() {
  const { workflowId } = useParams<{ workflowId?: string }>();
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: executions = [], isLoading, error } = useQuery(
    ['executions', workflowId, page],
    () => executionApi.getAll(workflowId, limit, page * limit),
    {
      keepPreviousData: true,
    }
  );

  const filteredExecutions = executions.filter(execution =>
    statusFilter === 'all' || execution.status === statusFilter
  );

  const formatDuration = (startedAt: string, stoppedAt?: string) => {
    const start = new Date(startedAt);
    const end = stoppedAt ? new Date(stoppedAt) : new Date();
    const duration = end.getTime() - start.getTime();
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    if (duration < 3600000) return `${Math.round(duration / 60000)}m`;
    return `${Math.round(duration / 3600000)}h`;
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
          <p>Failed to load executions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workflowId ? 'Workflow Executions' : 'All Executions'}
          </h1>
          <p className="text-gray-600">
            {workflowId 
              ? 'View executions for this specific workflow'
              : 'Monitor all workflow executions across your platform'
            }
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCwIcon className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <FilterIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Status:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ExecutionStatus | 'all')}
          className="input w-auto"
        >
          <option value="all">All Status</option>
          <option value={ExecutionStatus.SUCCESS}>Success</option>
          <option value={ExecutionStatus.FAILED}>Failed</option>
          <option value={ExecutionStatus.RUNNING}>Running</option>
          <option value={ExecutionStatus.PENDING}>Pending</option>
          <option value={ExecutionStatus.CANCELLED}>Cancelled</option>
        </select>
      </div>

      {/* Executions List */}
      {filteredExecutions.length === 0 ? (
        <div className="text-center py-12">
          <PlayIcon className="w-24 h-24 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No executions found</h3>
          <p className="text-gray-600">
            {statusFilter !== 'all'
              ? `No executions with status "${statusFilter}" found.`
              : 'No executions have been run yet.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExecutions.map((execution) => {
                  const StatusIcon = statusIcons[execution.status];
                  const statusColor = statusColors[execution.status];

                  return (
                    <tr key={execution.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {execution.workflowData.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {execution.id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {execution.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {execution.mode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {execution.finished 
                          ? formatDuration(execution.startedAt, execution.stoppedAt)
                          : execution.status === ExecutionStatus.RUNNING
                            ? `${formatDuration(execution.startedAt)} (ongoing)`
                            : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(execution.startedAt), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(execution.startedAt), 'HH:mm:ss')} 
                          <span className="ml-1">
                            ({formatDistanceToNow(new Date(execution.startedAt))} ago)
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, filteredExecutions.length)} of{' '}
                {filteredExecutions.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="btn-secondary btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={filteredExecutions.length < limit}
                  className="btn-secondary btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}