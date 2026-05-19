// src/pages/VerificationPendingPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { 
  EnvelopeIcon, 
  CheckCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import authService from '../services/authService';

const VerificationPendingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [email] = useState(location.state?.email || '');
  const [emailVerified, setEmailVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  // Vérifier toutes les 3 secondes si l'email a été vérifié
  useEffect(() => {
    if (!email) return;

    const checkInterval = setInterval(async () => {
      setChecking(true);
      try {
        // Appeler un endpoint pour vérifier le statut
        const response = await authService.checkVerificationStatus(email);
        
        if (response.emailVerified) {
          setEmailVerified(true);
          clearInterval(checkInterval);
        }
      } catch (error) {
        // Continuer à vérifier même en cas d'erreur
      } finally {
        setChecking(false);
      }
    }, 3000); // Toutes les 3 secondes

    return () => clearInterval(checkInterval);
  }, [email]);

  const handleResendEmail = async () => {
    setResending(true);
    try {
      await authService.resendEmailVerification(email);
      alert('Email resent successfully!');
    } catch (error) {
      alert('Error occurred while resending the email');
    } finally {
      setResending(false);
    }
  };

  // Si l'email est vérifié, afficher le formulaire de code PIN
  if (emailVerified) {
    return <PhoneVerificationForm email={email} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl text-center">
          {/* Icône */}
          <div className="mb-6">
            <div className="inline-flex w-16 h-16 bg-blue-100 rounded-full items-center justify-center relative">
              <EnvelopeIcon className="w-8 h-8 text-primary" />
              {checking && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
              )}
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            📧 Email of verification sent
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-8">
            A verification email has been sent to :
            <br />
            <strong className="text-gray-900">{email}</strong>
            <br /><br />
            Please click on the link in the email to continue.
            <br /><br />
            <span className="text-sm text-blue-600">
              {checking && '🔄 Verification in progress...'}
              {!checking && 'Waiting for your validation...'}
            </span>
          </p>

          {/* Actions */}
          <div className="space-y-4">
            <Button
              onClick={handleResendEmail}
              loading={resending}
              variant="outline"
              className="w-full"
            >
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              Resend Email
            </Button>

            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-500 hover:text-primary transition"
            >
              Return to login
            </button>
          </div>

          {/* Note */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              💡 <strong>Tips :</strong> Check your spam folder if you don't see the email.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Composant pour la vérification du téléphone (affiché après email vérifié)
const PhoneVerificationForm: React.FC<{ email: string }> = ({ email }) => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.verifyPhone({ email, code });
      
      // Succès : Afficher modal puis rediriger
      alert('🎉 Email and phone verified! You can now log in.');
      navigate('/login');

    } catch (error: any) {
      setError(error.response?.data?.message || 'Incorrect code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await authService.resendPhoneVerification(email);
      alert('Nouveau code envoyé !');
    } catch (error) {
      alert('Erreur lors du renvoi du code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          {/* Succès email */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-green-900">Email verified!</p>
              <p className="text-sm text-green-700">Last step: verify your phone</p>
            </div>
          </div>

          {/* Titre */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Enter the SMS code
            </h1>
            <p className="text-gray-600">
              6-digit code sent to the number associated with<br />
              <strong>{email}</strong>
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleVerifyPhone} className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                maxLength={6}
                className="w-full text-center text-3xl tracking-widest font-mono p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
              {error && (
                <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              loading={loading}
              disabled={code.length !== 6}
            >
              Verify
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {resending ? 'Envoi...' : 'Renvoyer le code'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default VerificationPendingPage;