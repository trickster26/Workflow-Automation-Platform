import { useCallback, useEffect, useRef } from 'react';
import { websocketService } from '@/services/websocket';
import { useWorkflowStore } from '@/stores/workflowStore';

export function useWebSocket() {
  const isConnectedRef = useRef(false);
  const { setNodeExecutionState, setExecutionState } = useWorkflowStore();

  const connect = useCallback(async () => {
    if (isConnectedRef.current) return;

    try {
      const token = localStorage.getItem('auth_token');
      await websocketService.connect(token || undefined);
      isConnectedRef.current = true;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    isConnectedRef.current = false;
  }, []);

  useEffect(() => {
    const handleExecutionStarted = (data: any) => {
      console.log('Execution started:', data);
      setExecutionState(true);
    };

    const handleExecutionCompleted = (data: any) => {
      console.log('Execution completed:', data);
      setExecutionState(false);
    };

    const handleExecutionFailed = (data: any) => {
      console.log('Execution failed:', data);
      setExecutionState(false);
    };

    const handleNodeExecutionStarted = (data: any) => {
      console.log('Node execution started:', data);
      setNodeExecutionState(data.node.id, 'running');
    };

    const handleNodeExecutionCompleted = (data: any) => {
      console.log('Node execution completed:', data);
      setNodeExecutionState(data.node.id, 'success');
    };

    const handleNodeExecutionFailed = (data: any) => {
      console.log('Node execution failed:', data);
      setNodeExecutionState(data.node.id, 'error');
    };

    const handleConnected = () => {
      console.log('WebSocket connected');
      isConnectedRef.current = true;
    };

    const handleDisconnected = () => {
      console.log('WebSocket disconnected');
      isConnectedRef.current = false;
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
      isConnectedRef.current = false;
    };

    // Register event listeners
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);
    websocketService.on('execution_started', handleExecutionStarted);
    websocketService.on('execution_completed', handleExecutionCompleted);
    websocketService.on('execution_failed', handleExecutionFailed);
    websocketService.on('node_execution_started', handleNodeExecutionStarted);
    websocketService.on('node_execution_completed', handleNodeExecutionCompleted);
    websocketService.on('node_execution_failed', handleNodeExecutionFailed);

    // Cleanup listeners on unmount
    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
      websocketService.off('execution_started', handleExecutionStarted);
      websocketService.off('execution_completed', handleExecutionCompleted);
      websocketService.off('execution_failed', handleExecutionFailed);
      websocketService.off('node_execution_started', handleNodeExecutionStarted);
      websocketService.off('node_execution_completed', handleNodeExecutionCompleted);
      websocketService.off('node_execution_failed', handleNodeExecutionFailed);
    };
  }, [setNodeExecutionState, setExecutionState]);

  return {
    connect,
    disconnect,
    isConnected: websocketService.isConnected,
    subscribeToExecution: websocketService.subscribeToExecution.bind(websocketService),
    unsubscribeFromExecution: websocketService.unsubscribeFromExecution.bind(websocketService),
    subscribeToWorkflowExecutions: websocketService.subscribeToWorkflowExecutions.bind(websocketService),
    unsubscribeFromWorkflowExecutions: websocketService.unsubscribeFromWorkflowExecutions.bind(websocketService),
  };
}