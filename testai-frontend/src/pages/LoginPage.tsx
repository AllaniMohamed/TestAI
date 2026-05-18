// src/pages/LoginPage.tsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import {
  EnvelopeIcon,
  LockClosedIcon,
  ArrowLeftIcon,
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

      // Connexion réussie
      console.log("Connexion réussie:", response.user);

      // Rediriger vers le dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Erreur connexion:", error);

      const errorMessage = error.response?.data?.message;

      // Gérer les cas spécifiques
      if (errorMessage?.includes("vérifier votre email")) {
        setError("Please verify your email first.");
        // Proposer de renvoyer l'email
        setTimeout(() => {
          navigate("/verify-email", { state: { email } });
        }, 2000);
      } else if (errorMessage?.includes("vérifier votre téléphone")) {
        setError("Please verify your phone number first.");
        setTimeout(() => {
          navigate("/verify-phone", { state: { email } });
        }, 2000);
      } else {
        setError(errorMessage || "Incorrect email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <Link
        to="/"
        className="mb-8 flex items-center text-gray-500 hover:text-primary transition"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back to home
      </Link>

      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex w-12 h-12 bg-primary rounded-xl items-center justify-center mb-4">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
            <p className="text-gray-500 mt-2">
              Sign in to access your tests.
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
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleLogin}>
            <Input
              label="Professional email"
              type="email"
              placeholder="votre@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<EnvelopeIcon className="h-5 w-5" />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<LockClosedIcon className="h-5 w-5" />}
            />

            <div className="flex items-center justify-between mb-6">

              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

          
          {/* Lien inscription */}
          <p className="mt-10 text-center text-gray-600">
            New to TestAI?{" "}
            <Link
              to="/register"
              className="font-bold text-primary hover:underline"
            >
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;