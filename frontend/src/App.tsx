import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { WorkflowsPage } from './pages/WorkflowsPage';
import WorkflowEditorPage from './pages/WorkflowEditorPage';
import { ExecutionsPage } from './pages/ExecutionsPage';
import { DashboardPage } from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider, ProtectedRoute, useAuth } from './contexts/AuthContext';
import { useWebSocket } from './hooks/useWebSocket';

function AppContent() {
  const { connect } = useWebSocket();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Connect to WebSocket when authenticated
    if (isAuthenticated) {
      connect().catch(console.error);
    }
  }, [connect, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="workflows/:workflowId/edit" element={<WorkflowEditorPage />} />
        <Route path="workflows/new" element={<WorkflowEditorPage />} />
        <Route path="executions" element={<ExecutionsPage />} />
        <Route path="executions/:workflowId" element={<ExecutionsPage />} />
      </Route>

      {/* Catch all - redirect to login if not authenticated, dashboard if authenticated */}
      <Route 
        path="*" 
        element={
          <Navigate 
            to={isAuthenticated ? "/dashboard" : "/login"} 
            replace 
          />
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;