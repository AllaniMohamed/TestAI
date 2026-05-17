import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authService } from '../services/api';
import Button from '../components/common/Button';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const RegisterInvitationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Récupérer les infos depuis l'URL ou location.state
    const emailParam = searchParams.get('email') || location.state?.email || '';
    const tokenParam = searchParams.get('token') || location.state?.invitationToken || '';
    const projectParam = location.state?.projectName || '';

    setEmail(emailParam);
    setInvitationToken(tokenParam);
    setProjectName(projectParam);
  }, [searchParams, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ⭐ Use the special invitation endpoint
      await authService.registerWithInvitation({
        email,
        name,
        password,
        phoneNumber,
        invitationToken,
      });

      // Redirect to login
      navigate('/login', {
        state: {
          message: 'Account created successfully! Sign in to access shared services.',
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
            Create your account
          </h1>
          <p className="text-gray-600">
            To access the service <strong>{projectName}</strong>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (disabled) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-2xl cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+216 XX XXX XXX"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
            <strong>Note:</strong> Your account will be created with the <strong>DEVELOPER</strong> role.
          </div>

          {/* Submit */}
          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create my account'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RegisterInvitationPage;