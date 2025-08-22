import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage';
import { ExecutionsPage } from '@/pages/ExecutionsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { useWebSocket } from '@/hooks/useWebSocket';

function App() {
  const { connect } = useWebSocket();

  useEffect(() => {
    // Connect to WebSocket on app start
    connect().catch(console.error);
  }, [connect]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="workflows/:workflowId/edit" element={<WorkflowEditorPage />} />
        <Route path="workflows/new" element={<WorkflowEditorPage />} />
        <Route path="executions" element={<ExecutionsPage />} />
        <Route path="executions/:workflowId" element={<ExecutionsPage />} />
      </Route>
    </Routes>
  );
}

export default App;