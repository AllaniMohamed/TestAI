import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Pages publiques
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyPhonePage from "./pages/VerifyPhonePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import InvitationPage from "./pages/InvitationPage";
import RegisterInvitationPage from "./pages/RegisterInvitationPage";
import VerificationPendingPage from "./pages/VerificationPendingPage";

// Pages protégées
import Dashboard from "./pages/Dashboard";
import ProjectsPage from "./pages/ProjectsPage";           // ⭐ NOUVEAU
import AddServicePage from "./pages/AddServicePage";
import ServiceDetailsPage from "./pages/ProjectDetailsPage";
import ReportsPage from "./pages/ReportsPage";
import ProfilePage from "./pages/ProfilePage";
import SharedProjectsPage from "./pages/SharedProjectsPage";
import ManageSharesPage from "./pages/ManageSharesPage";
import ProjectSharesPage from "./pages/SharedProjectsPage";
import ExecuteRapideApiPage from "./pages/ExecuteRapideApiPage";

// Auth
import authService from "./services/authService";
import JenkinsPage from "./pages/JenkinsPage";
import UsersPage from "./pages/admin/UsersPage";
import ServiceHealthPage from "./pages/admin/ServiceHealthPage";
import AdminProjectPage from "./pages/admin/AdminProjectPage";
import { NotificationProvider } from "./context/NotificationContext";

// Garde de route
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
  <NotificationProvider>
    <Router>
      <Routes>
        {/* ─── Routes publiques ─── */}
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

        {/* ─── Routes protégées ─── */}

        {/* Dashboard : KPIs globaux, activité récente (sans liste de projets) */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* ⭐ NOUVEAU : page dédiée à la liste des projets */}
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <ProjectsPage />
            </PrivateRoute>
          }
        />

        {/* Ajout d'un projet (accessible depuis /projects) */}
        <Route
          path="/add-service"
          element={
            <PrivateRoute>
              <AddServicePage />
            </PrivateRoute>
          }
        />

        {/* Détail d'un projet — onglets Endpoints / Tests / Exécution / Historique / Rapports / Paramètres */}
        <Route
          path="/service/:id"
          element={
            <PrivateRoute>
              <ServiceDetailsPage />
            </PrivateRoute>
          }
        />

        {/* L'overlay Exécution est maintenant géré EN INTERNE dans ServiceDetailsPage,
            mais on conserve la route pour la compatibilité des anciens liens */}
        <Route
          path="/service/:id/execute"
          element={
            <PrivateRoute>
              <ServiceDetailsPage defaultTab="execution" />
            </PrivateRoute>
          }
        />

        {/* Partages d'un projet */}
        <Route
          path="/service/:id/shares"
          element={
            <PrivateRoute>
              <ProjectSharesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/service/:projectId/shares"
          element={
            <PrivateRoute>
              <ManageSharesPage />
            </PrivateRoute>
          }
        />

        {/* ⭐ NOUVEAU : historique global de toutes les exécutions */}
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Rapports globaux (métriques cross-projets) */}
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <ReportsPage />
            </PrivateRoute>
          }
        />

        {/* Profil utilisateur (paramètres dans la sidebar) */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route path="/execute-rapide" 
        element={
          <PrivateRoute>
            <ExecuteRapideApiPage />
          </PrivateRoute>
        } />

         <Route path="/jenkins" 
        element={
          <PrivateRoute>
            <JenkinsPage />
          </PrivateRoute>
        } />

        <Route path="/users"
        element={
          <PrivateRoute>
            <UsersPage/>
          </PrivateRoute>
        } />

        <Route path="/service-health"
        element={
          <PrivateRoute>
            <ServiceHealthPage/>
          </PrivateRoute>
        } />

        <Route path="/projects-stats"
        element={
          <PrivateRoute>
            <AdminProjectPage/>
          </PrivateRoute>
        } />

        {/* Projets partagés (accès legacy) */}
        <Route path="/shared-projects" element={<SharedProjectsPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </NotificationProvider>
  );
};

export default App;
/*
import React from "react";
import {
  BrowserRouter as Router, // ⭐️ CHANGÉ : BrowserRouter au lieu de HashRouter
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
import InvitationPage from "./pages/InvitationPage";
import SharedProjectsPage from "./pages/SharedProjectsPage";
import ManageSharesPage from "./pages/ManageSharesPage";
import ProjectSharesPage from "./pages/SharedProjectsPage";
// Services
import authService from "./services/authService";
import VerificationPendingPage from "./pages/VerificationPendingPage";
import RegisterInvitationPage from "./pages/RegisterInvitationPage";
import ProfilePage from "./pages/ProfilePage";

// Composant de protection des routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/verification-pending"
          element={<VerificationPendingPage />}
        />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-phone" element={<VerifyPhonePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/register-invitation"
          element={<RegisterInvitationPage />}
        />
        <Route path="/invite/:token" element={<InvitationPage />} />

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
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route path="/invite/:token" element={<InvitationPage />} />
        <Route path="/shared-projects" element={<SharedProjectsPage />} />
        <Route
          path="/service/:projectId/shares"
          element={<ManageSharesPage />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
*/