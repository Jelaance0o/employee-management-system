import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import WorkspaceLayout from "./components/layout/WorkspaceLayout";

import DashboardPage from "./features/dashboard/DashboardPage";
import TeamPage from "./features/team/TeamPage";
import ProjectsPage from "./features/projects/ProjectsPage";
import TasksPage from "./features/tasks/TasksPage";
import LoginPage from "./features/auth/LoginPage";

function LoadingScreen() {
  return (
    <div className="ts-page flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-current border-t-transparent opacity-70" />
        <p className="mt-4 text-sm text-slate-500">
          Loading your workspace...
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || !user.is_active) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<WorkspaceLayout />}>
          <Route
            index
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />
          <Route path="/team" element={<TeamPage />} />
          <Route
            path="/projects"
            element={<ProjectsPage />}
          />
          <Route path="/tasks" element={<TasksPage />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
