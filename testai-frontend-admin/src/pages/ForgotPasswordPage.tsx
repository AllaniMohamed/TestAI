// src/pages/ForgotPasswordPage.tsx

import React, { useState } from "react";
import { Link } from "react-router-dom";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import {
  EnvelopeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import authService from "../services/authService";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authService.forgotPassword(email);
      setSuccess(true);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Une erreur est survenue. Veuillez réessayer.",
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
              Email sent !
            </h1>

            <p className="text-gray-600 mb-8">
              If an account exists for <strong>{email}</strong>, you will receive
              an email with instructions to reset your password.
              <br />
              <br />
              The link is valid for 1 hour.
            </p>

            <Link to="/login">
              <Button className="w-full">Return to Login</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <Link
        to="/login"
        className="mb-8 flex items-center text-gray-500 hover:text-primary transition"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Return to Login
      </Link>

      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Forgot Password?
            </h1>
            <p className="text-gray-500 mt-2">
              Enter your email and we will send you a link to reset your password.
              <br />
              The link is valid for 1 hour.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Professional Email"
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<EnvelopeIcon className="h-5 w-5" />}
            />

            <Button type="submit" className="w-full mt-6" loading={loading}>
              Send Link
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
