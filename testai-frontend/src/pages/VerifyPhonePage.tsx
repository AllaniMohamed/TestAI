// src/pages/VerifyPhonePage.tsx

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { 
  DevicePhoneMobileIcon, 
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import authService from '../services/authService';

const VerifyPhonePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const email = location.state?.email || sessionStorage.getItem('pendingEmail') || '';

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email manquant. Veuillez vous reconnecter.');
      return;
    }

    if (code.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.verifyPhone({ email, code });
      
      // ⭐️ Afficher le modal de succès
      setShowSuccessModal(true);

    } catch (error: any) {
      setError(
        error.response?.data?.message || 
        'Code incorrect. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError('Email manquant.');
      return;
    }

    setResending(true);
    setError('');

    try {
      const response = await authService.resendPhoneVerification(email);
      // Message de succès temporaire
      setError(''); 
      const successMsg = response.message || '✅ Nouveau code envoyé !';
      setError('✅ ' + successMsg);
      setTimeout(() => setError(''), 3000);
    } catch (error: any) {
      setError(
        error.response?.data?.message || 
        'Impossible de renvoyer le code.'
      );
    } finally {
      setResending(false);
    }
  };

  const handleModalOk = () => {
    sessionStorage.removeItem('pendingEmail');
    navigate('/login', { 
      state: { message: 'Compte activé ! Vous pouvez vous connecter.' } 
    });
  };

  // ⭐️ Modal de succès
  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in">
          {/* Icône de succès */}
          <div className="inline-flex w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>

          {/* Titre */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            🎉 Félicitations !
          </h2>

          {/* Message */}
          <div className="space-y-3 mb-8">
            <p className="text-lg text-gray-700 font-semibold">
              Email et téléphone vérifiés
            </p>
            <p className="text-gray-600">
              Votre compte TestAI est maintenant entièrement activé.
              Vous pouvez vous connecter et commencer à utiliser la plateforme.
            </p>
          </div>

          {/* Bouton OK */}
          <Button
            onClick={handleModalOk}
            className="w-full text-lg py-3"
          >
            OK, se connecter
          </Button>
        </div>
      </div>
    );
  }

  // Page de vérification du code
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          {/* Icône */}
          <div className="text-center mb-6">
            <div className="inline-flex w-16 h-16 bg-blue-100 rounded-full items-center justify-center">
              <DevicePhoneMobileIcon className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Titre */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Vérifiez votre téléphone
            </h1>
            <p className="text-gray-600">
              Un code à 6 chiffres a été envoyé par SMS
              {email && (
                <>
                  <br />
                  au numéro associé à <strong className="text-gray-900">{email}</strong>
                </>
              )}
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleVerifyPhone} className="space-y-6">
            {/* Code SMS */}
            <div>
              <Input
                label="Code de vérification"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                maxLength={6}
                error={error && !error.startsWith('✅') ? error : ''}
                className="text-center text-2xl tracking-widest font-mono"
                required
              />
              
              {/* Message de succès pour renvoi */}
              {error && error.startsWith('✅') && (
                <p className="text-xs text-green-600 mt-2 text-center font-medium">
                  {error}
                </p>
              )}
              
              {!error && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Entrez le code à 6 chiffres reçu par SMS
                </p>
              )}
            </div>

            {/* Bouton Vérifier */}
            <Button 
              type="submit" 
              className="w-full" 
              loading={loading}
              disabled={code.length !== 6}
            >
              Vérifier mon téléphone
            </Button>

            {/* Renvoyer le code */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="text-sm text-primary hover:underline disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                <ArrowPathIcon className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Envoi en cours...' : 'Renvoyer le code'}
              </button>
            </div>
          </form>

          {/* Retour */}
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-500 hover:text-primary transition"
            >
              Retour à la connexion
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VerifyPhonePage;