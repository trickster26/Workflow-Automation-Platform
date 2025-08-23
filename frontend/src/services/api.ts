import axios from 'axios';
import {
  IWorkflow,
  IExecution,
  INodeTypeDescription,
  ExecutionMetrics,
  QueueStats,
} from '../types/workflow';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all auth tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const nodeTypesApi = {
  getAll: async (): Promise<INodeTypeDescription[]> => {
    const response = await api.get('/node-types');
    return response.data;
  },
  getCategories: async (): Promise<string[]> => {
    const response = await api.get('/node-types/categories');
    return response.data;
  },
  getByCategory: async (category: string): Promise<INodeTypeDescription[]> => {
    const response = await api.get(`/node-types/category/${category}`);
    return response.data;
  },
};

export const workflowApi = {
  getAll: async (): Promise<IWorkflow[]> => {
    const response = await api.get('/workflows');
    return response.data;
  },
  getById: async (id: string): Promise<IWorkflow> => {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },
  create: async (workflow: Partial<IWorkflow>): Promise<IWorkflow> => {
    const response = await api.post('/workflows', workflow);
    return response.data;
  },
  update: async (id: string, workflow: Partial<IWorkflow>): Promise<IWorkflow> => {
    const response = await api.put(`/workflows/${id}`, workflow);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workflows/${id}`);
  },
  activate: async (id: string): Promise<void> => {
    await api.post(`/workflows/${id}/activate`);
  },
  deactivate: async (id: string): Promise<void> => {
    await api.post(`/workflows/${id}/deactivate`);
  },
};

export const executionApi = {
  getAll: async (workflowId?: string, limit = 50, offset = 0): Promise<IExecution[]> => {
    const params = new URLSearchParams();
    if (workflowId) params.append('workflowId', workflowId);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const response = await api.get(`/executions?${params}`);
    return response.data;
  },
  getById: async (id: string): Promise<IExecution> => {
    const response = await api.get(`/executions/${id}`);
    return response.data;
  },
  create: async (data: {
    workflowId: string;
    userId?: string;
    mode?: string;
    startNode?: string;
  }): Promise<{ jobId: string }> => {
    const response = await api.post('/executions', data);
    return response.data;
  },
  getStatus: async (id: string): Promise<{ status: string }> => {
    const response = await api.get(`/executions/${id}/status`);
    return response.data;
  },
  pause: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/executions/${id}/pause`);
    return response.data;
  },
  resume: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/executions/${id}/resume`);
    return response.data;
  },
  cancel: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/executions/${id}/cancel`);
    return response.data;
  },
  retry: async (id: string, userId?: string): Promise<{ jobId: string }> => {
    const response = await api.post(`/executions/${id}/retry`, { userId });
    return response.data;
  },
  getMetrics: async (workflowId?: string, days = 30): Promise<ExecutionMetrics> => {
    const params = new URLSearchParams();
    if (workflowId) params.append('workflowId', workflowId);
    params.append('days', days.toString());
    
    const response = await api.get(`/executions/metrics?${params}`);
    return response.data;
  },
};

export const queueApi = {
  getStats: async (): Promise<QueueStats[]> => {
    const response = await api.get('/queues/stats');
    return response.data;
  },
};

export const triggerApi = {
  getAll: async (): Promise<any[]> => {
    const response = await api.get('/triggers');
    return response.data;
  },
  getStats: async (): Promise<any> => {
    const response = await api.get('/triggers/stats');
    return response.data;
  },
  activate: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/triggers/${id}/activate`);
    return response.data;
  },
  deactivate: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/triggers/${id}/deactivate`);
    return response.data;
  },
};

export const eventApi = {
  emit: async (eventType: string, eventData: any): Promise<{ success: boolean }> => {
    const response = await api.post('/events', { eventType, eventData });
    return response.data;
  },
};

export const healthApi = {
  check: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export { api };
export default api;