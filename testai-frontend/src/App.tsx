import React from "react";
import {
  BrowserRouter as Router,  // ⭐️ CHANGÉ : BrowserRouter au lieu de HashRouter
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyPhonePage from "./pages/VerifyPhonePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import Dashboard from "./pages/Dashboard";
import AddServicePage from "./pages/AddServicePage";
import ServiceDetailsPage from "./pages/ProjectDetailsPage";
import TestExecutionPage from "./pages/TestExecutionPage";
import ReportsPage from "./pages/ReportsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import InvitationPage from './pages/InvitationPage';
import SharedProjectsPage from './pages/SharedProjectsPage';
import ManageSharesPage from './pages/ManageSharesPage';
import ProjectSharesPage from './pages/SharedProjectsPage';
// Services
import authService from "./services/authService";
import VerificationPendingPage from "./pages/VerificationPendingPage";
import RegisterInvitationPage from "./pages/RegisterInvitationPage";

// Composant de protection des routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verification-pending" element={<VerificationPendingPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-phone" element={<VerifyPhonePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register-invitation" element={<RegisterInvitationPage />} />
        <Route path="/invite/:token" element={<InvitationPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/add-service"
          element={
            <PrivateRoute>
              <AddServicePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/service/:id"
          element={
            <PrivateRoute>
              <ServiceDetailsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/service/:id/execute"
          element={
            <PrivateRoute>
              <TestExecutionPage />
            </PrivateRoute>
          }
        />
        <Route path="/service/:id/shares" element={<ProjectSharesPage />} />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <ReportsPage />
            </PrivateRoute>
          }
        />
        <Route path="/invite/:token" element={<InvitationPage />} />
        <Route path="/shared-projects" element={<SharedProjectsPage />} />
        <Route path="/service/:projectId/shares" element={<ManageSharesPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;