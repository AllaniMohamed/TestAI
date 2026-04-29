import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Pages publiques
import LoginPage from "./pages/LoginPage";

// Pages protégées
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";

// Auth
import authService from "./services/authService";
import UsersPage from "./pages/admin/UsersPage";
import ServiceHealthPage from "./pages/admin/ServiceHealthPage";
import AdminProjectPage from "./pages/admin/AdminProjectPage";
import { NotificationProvider } from "./context/NotificationContext";

// Garde de route
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = authService.isAuthenticated();
  if (isAuthenticated){
    const userStr = sessionStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (user && user?.role !== "ADMIN") {
      return <Navigate to="/login" replace />;
    }
    else{
      return <>{children}</>;
    }
  }
  else{
    return <Navigate to="/login" replace />;
  }
  
};

const App: React.FC = () => {
  return (
  <NotificationProvider>
    <Router>
      <Routes>
        {/* ─── Routes publiques ─── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ─── Routes protégées ─── */}

        {/* Dashboard : KPIs globaux, activité récente (sans liste de projets) */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </NotificationProvider>
  );
};

export default App;