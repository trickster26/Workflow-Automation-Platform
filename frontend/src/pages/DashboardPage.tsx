import { useQuery } from 'react-query';
import {
  WorkflowIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { executionApi, workflowApi, queueApi, triggerApi } from '@/services/api';
import { ExecutionStatus } from '@/types/workflow';
import { formatDistanceToNow } from 'date-fns';

export function DashboardPage() {
  const { data: workflows = [] } = useQuery('workflows', workflowApi.getAll);
  const { data: executions = [] } = useQuery('executions', () => executionApi.getAll(undefined, 10));
  const { data: metrics } = useQuery('execution-metrics', () => executionApi.getMetrics());
  const { data: queueStats = [] } = useQuery('queue-stats', queueApi.getStats);
  const { data: triggerStats } = useQuery('trigger-stats', triggerApi.getStats);

  const activeWorkflows = workflows.filter(w => w.active).length;
  const totalWorkflows = workflows.length;

  const stats = [
    {
      name: 'Total Workflows',
      value: totalWorkflows.toString(),
      icon: WorkflowIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Active Workflows',
      value: activeWorkflows.toString(),
      icon: PlayIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Total Executions',
      value: metrics?.total.toString() || '0',
      icon: TrendingUpIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Success Rate',
      value: metrics ? `${metrics.successRate.toFixed(1)}%` : '0%',
      icon: CheckCircleIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your workflow automation platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${stat.bgColor} rounded-lg p-3`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Executions</h3>
          </div>
          <div className="p-6">
            {executions.length === 0 ? (
              <div className="text-center py-8">
                <PlayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No executions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {executions.slice(0, 5).map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        execution.status === ExecutionStatus.SUCCESS ? 'bg-green-500' :
                        execution.status === ExecutionStatus.FAILED ? 'bg-red-500' :
                        execution.status === ExecutionStatus.RUNNING ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {execution.workflowData.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(execution.startedAt))} ago
                        </p>
                      </div>
                    </div>
                    <span className={`status-badge ${
                      execution.status === ExecutionStatus.SUCCESS ? 'status-success' :
                      execution.status === ExecutionStatus.FAILED ? 'status-failed' :
                      execution.status === ExecutionStatus.RUNNING ? 'status-running' :
                      'status-pending'
                    }`}>
                      {execution.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Queue Status */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Queue Status</h3>
          </div>
          <div className="p-6">
            {queueStats.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No queue data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queueStats.map((queue) => (
                  <div key={queue.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {queue.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-yellow-600">
                          {queue.counts.waiting}
                        </div>
                        <div className="text-gray-500">Waiting</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">
                          {queue.counts.active}
                        </div>
                        <div className="text-gray-500">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {queue.counts.completed}
                        </div>
                        <div className="text-gray-500">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">
                          {queue.counts.failed}
                        </div>
                        <div className="text-gray-500">Failed</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution Metrics */}
      {metrics && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Execution Metrics (Last 30 Days)</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">{metrics.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">{metrics.success}</div>
                <div className="text-sm text-gray-600">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-red-600">{metrics.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600">{metrics.running}</div>
                <div className="text-sm text-gray-600">Running</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-purple-600">
                  {Math.round(metrics.averageExecutionTime / 1000)}s
                </div>
                <div className="text-sm text-gray-600">Avg Time</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}