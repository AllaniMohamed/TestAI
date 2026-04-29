// src/pages/ResetPasswordPage.tsx

import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { LockClosedIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import authService from "../services/authService";

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Token manquant. Veuillez demander un nouveau lien.");
      return;
    }

    if (formData.newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authService.resetPassword(
        token,
        formData.newPassword,
        formData.confirmPassword,
      );

      setSuccess(true);

      // Rediriger vers login après 2 secondes
      setTimeout(() => {
        navigate("/login", {
          state: {
            message: "Mot de passe réinitialisé ! Vous pouvez vous connecter.",
          },
        });
      }, 2000);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Une erreur est survenue. Le lien a peut-être expiré.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl text-center">
            <div className="inline-flex w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-6">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Mot de passe réinitialisé !
            </h1>

            <p className="text-gray-600">
              Votre mot de passe a été modifié avec succès.
              <br />
              Redirection vers la connexion...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Nouveau mot de passe
            </h1>
            <p className="text-gray-500 mt-2">
              Choisissez un mot de passe sécurisé
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              type="password"
              placeholder="••••••••"
              required
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              icon={<LockClosedIcon className="h-5 w-5" />}
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="••••••••"
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              icon={<LockClosedIcon className="h-5 w-5" />}
            />

            <div className="pt-2">
              <Button type="submit" className="w-full" loading={loading}>
                Réinitialiser le mot de passe
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
