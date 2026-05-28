import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import {
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  PhoneIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import authService from "../services/authService";

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    company: "",
  });
  const [errors, setErrors] = useState<any>({});
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    const newErrors: any = {};

    // Name
    if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email
    if (!formData.email.includes("@")) {
      newErrors.email = "Invalid email";
    }

    // Password
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Phone (optional but if filled, must be valid)
    if (formData.phoneNumber && formData.phoneNumber.length < 10) {
      newErrors.phoneNumber = "Invalid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    try {
      const response = await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber || undefined,
        company: formData.company || undefined,
        role: "MANAGER",
      });

      // ⭐️ Redirect to waiting page (not verify-email directly)
      navigate("/verification-pending", {
        state: {
          email: formData.email,
          message: response.message,
        },
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      setServerError(
        error.response?.data?.message ||
          "An error occurred during registration. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col md:flex-row items-center justify-center p-4 sm:p-6 lg:p-8 gap-8 lg:gap-12">
      {/* Benefits Section – visible only on large screens */}
      <div className="hidden lg:block max-w-md">
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8 leading-tight">
          Why join <span className="text-primary">TestAI</span>?
        </h2>
        <ul className="space-y-6">
          <li className="flex gap-4">
            <CheckCircleIcon className="w-7 h-7 lg:w-8 lg:h-8 text-primary shrink-0" />
            <div>
              <p className="font-bold text-sm lg:text-base">Massive time savings</p>
              <p className="text-gray-600 text-xs lg:text-sm">
                Save hours of manual test writing.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <CheckCircleIcon className="w-7 h-7 lg:w-8 lg:h-8 text-primary shrink-0" />
            <div>
              <p className="font-bold text-sm lg:text-base">Zero oversight</p>
              <p className="text-gray-600 text-xs lg:text-sm">
                AI tests all scenarios, even the most unlikely ones.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <CheckCircleIcon className="w-7 h-7 lg:w-8 lg:h-8 text-primary shrink-0" />
            <div>
              <p className="font-bold text-sm lg:text-base">Enterprise-ready</p>
              <p className="text-gray-600 text-xs lg:text-sm">
                Jenkins integration and ISO-compliant reports.
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* Registration Form */}
      <div className="w-full max-w-lg">
        <Link
          to="/"
          className="mb-6 flex items-center text-gray-500 hover:text-primary transition lg:hidden text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Link>

        <Card className="shadow-2xl p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Create an account
            </h1>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <Input
              label="Full name"
              placeholder="Ghada Ben Salah"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              error={errors.name}
              icon={<UserIcon className="h-5 w-5" />}
              required
            />

            {/* Email */}
            <Input
              label="Professional email"
              type="email"
              placeholder="ghada@company.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
              icon={<EnvelopeIcon className="h-5 w-5" />}
              required
            />

            {/* Phone (optional) */}
            <Input
              label="Phone number"
              type="tel"
              placeholder="+33612345678"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              error={errors.phoneNumber}
              icon={<PhoneIcon className="h-5 w-5"/>}
              required
            />

            {/* Company (optional) */}
            <Input
              label="Company"
              placeholder="My Company"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              icon={<BuildingOfficeIcon className="h-5 w-5" />}
            />

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                error={errors.password}
                icon={<LockClosedIcon className="h-5 w-5" />}
                required
              />
              <Input
                label="Confirm"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                error={errors.confirmPassword}
                icon={<LockClosedIcon className="h-5 w-5" />}
                required
              />
            </div>

            {/* Button */}
            <Button type="submit" className="w-full" loading={loading}>
              Create my account
            </Button>
          </form>

          {/* Login link */}
          <p className="mt-8 text-center text-gray-600 text-sm sm:text-base">
            Already registered?{" "}
            <Link
              to="/login"
              className="font-bold text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;