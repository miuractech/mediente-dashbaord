import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider, Loader, Center } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Suspense, lazy, useEffect } from 'react';
import { realtimeService } from './projects/realtime.service';
import './App.css'
// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import { AuthProvider } from './auth/AuthContexttype';

// Lazy load components
const AdminLogin = lazy(() => import('./auth/AdminLogin'));
const AdminLayout = lazy(() => import('./auth/AdminLayout'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const AdminUserManagement = lazy(() => import('./pages/AdminUserManagement'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ProjectCrewAssignment = lazy(() => import('./pages/ProjectCrewAssignment'));
const ProjectCrewManagement = lazy(() => import('./pages/ProjectCrewManagement'));
const AdminTeams = lazy(() => import('./pages/AdminTeams'));
const AdminDepartmentManagementPage = lazy(() => import('./pages/AdminDepartmentManagementPage'));
const AdminRoles = lazy(() => import('./pages/AdminRoles'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const AdminCallSheet = lazy(() => import('./pages/AdminCallSheet'));
const CallSheetDetail = lazy(() => import('./pages/CallSheetDetail'));
const Calendar = lazy(() => import('./pages/Calendar'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const CrewManagement = lazy(() => import('./pages/CrewManagement'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));

const LoadingFallback = () => (
  <Center h="100vh">
    <Loader size="lg" />
  </Center>
);

function App() {
  // Cleanup real-time subscriptions when app unmounts
  useEffect(() => {
    return () => {
      realtimeService.cleanupAllSubscriptions();
    };
  }, []);

  return (
    <MantineProvider>
      <Notifications />
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Redirect root to admin login */}
              <Route path="/" element={<Navigate to="/admin/login" replace />} />
              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="users" element={<AdminUserManagement />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:projectId" element={<ProjectDetail />} />
                <Route path="projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
                <Route path="projects/:projectId/crew-assignment" element={<ProjectCrewAssignment />} />
                <Route path="projects/:projectId/crew-management" element={<ProjectCrewManagement />} />
                <Route path="teams" element={<AdminTeams />} />
                <Route path="departments" element={<AdminDepartmentManagementPage />} />
                <Route path="roles" element={<AdminRoles />} />
                <Route path="crew" element={<CrewManagement />} />
                {/* Template routes with nested paths */}
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="templates/:templateId" element={<TemplatesPage />} />
                <Route path="templates/:templateId/:phaseId" element={<TemplatesPage />} />
                <Route path="templates/:templateId/:phaseId/:stepId" element={<TemplatesPage />} />
                <Route path="callsheet" element={<AdminCallSheet />} />
                <Route path="callsheet/:id" element={<CallSheetDetail />} />
                
                {/* Other navigation routes */}
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/admin/login" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;