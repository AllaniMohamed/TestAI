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
      setError("Token missing. Please request a new link.");
      return;
    }

    if (formData.newPassword.length < 8) {
      setError("The password must be at least 8 characters long");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("The passwords do not match");
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
            message: "Password reset successfully! You can now log in.",
          },
        });
      }, 2000);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "An error occurred. The link may have expired.",
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
              Password Reset Successfully!
            </h1>

            <p className="text-gray-600">
              Your password has been updated successfully.
              <br />
              Redirecting to login...
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
              New Password
            </h1>
            <p className="text-gray-500 mt-2">
              Choose a secure password
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
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
              label="Confirm New Password"
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
                Reset Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
