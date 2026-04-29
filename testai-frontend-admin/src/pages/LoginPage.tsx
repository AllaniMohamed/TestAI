// src/pages/LoginPage.tsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import {
  EnvelopeIcon,
  LockClosedIcon,
  UsersIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import authService from "../services/authService";

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Afficher un message de succès si présent
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Effacer après 5 secondes
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authService.login({ email, password });
      const user = response.user;
      if (user && user.role !== "ADMIN") {
        setError("Platforme réservée aux administrateurs.<br>"+
          "Platforme d'autres utilisateurs: <a style='color: #3b82f6 !important; text-decoration: underline !important;' href='http://localhost:5173/'>TestAI User</a>");
        return;
      }

      navigate("/");
    } catch (error: any) {
      console.error("Erreur connexion:", error);
      setError(error.response?.data?.message || "Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <button className="absolute top-4 left-4 rounded-full p-2 text-white hover:text-black bg-blue-500 hover:bg-gray-300 transition"
    title="Platforme utilisateur" onClick={() => window.location.replace("http://localhost:5173/")}>
      <UsersIcon className="w-5 h-5" />
    </button>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <p className="text-gray-700 text-xl font-semibold mb-8">TestAI - Admin Dashboard</p>

      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">Bon retour !</h1>
            <p className="text-gray-500 mt-2">
              Connectez-vous pour accéder à votre dashboard.
            </p>
          </div>

          {/* Message de succès */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-md text-center" dangerouslySetInnerHTML={{ __html: error }} />
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleLogin}>
            <Input
              label="Email professionnel"
              type="email"
              placeholder="votre@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<EnvelopeIcon className="h-5 w-5" />}
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<LockClosedIcon className="h-5 w-5" />}
            />

            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">
                  Se souvenir de moi
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Se connecter
            </Button>
          </form>

          {/* Séparateur */}
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Ou continuer avec
              </span>
            </div>
          </div>

          {/* OAuth (Google) */}
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 border border-gray-300 p-3 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5 h-5"
                alt="Google"
              />
              Google
            </button>
          </div>
        </Card>
      </div>
    </div></>
  );
};

export default LoginPage;
