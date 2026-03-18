import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  EnvelopeIcon, 
  ShieldCheckIcon, 
  CalendarIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { sharedAccessService } from '../services/api';
import type { InvitationInfo } from '../services/api';

const InvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitationInfo();
    }
  }, [token]);

  const loadInvitationInfo = async () => {
    try {
      setLoading(true);
      const response = await sharedAccessService.getInvitationInfo(token!);
      setInvitationInfo(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invitation invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setActivating(true);
    try {
      // Activer l'invitation
      const response = await sharedAccessService.activateInvitation(token!);
      
      // Vérifier si le développeur a un compte
      if (response.data.hasAccount) {
        // A un compte → Rediriger vers login
        navigate('/login', {
          state: {
            message: 'Invitation acceptée ! Connectez-vous pour accéder au service.',
          },
        });
      } else {
        // Pas de compte → Rediriger vers register avec email pré-rempli
        navigate(`/register-invitation?email=${encodeURIComponent(response.data.email)}&token=${token}`, {
          state: {
            email: response.data.email,
            invitationToken: token,
            projectName: response.data.projectName,
          },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ArrowPathIcon className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full p-10 text-center border-2 border-red-200">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircleIcon className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
            Invitation invalide
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Retour à la connexion
          </Button>
        </Card>
      </div>
    );
  }

  if (!invitationInfo) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header avec gradient */}
        <div className="bg-gradient-to-r from-primary to-blue-600 p-10 rounded-t-3xl text-white">
          <div className="flex items-center gap-3 text-white/80 font-bold text-sm uppercase tracking-widest mb-3">
            <EnvelopeIcon className="w-5 h-5" />
            <span>Invitation TestAI</span>
          </div>
          <h1 className="text-4xl font-extrabold mb-2">
            Vous êtes invité !
          </h1>
          <p className="text-blue-100 text-lg">
            Rejoignez un service de test automatisé
          </p>
        </div>

        {/* Body */}
        <Card className="p-8 rounded-t-none space-y-6 border-t-0">
          {/* Détails de l'invitation */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-5 bg-blue-50 rounded-2xl">
              <ShieldCheckIcon className="h-7 w-7 text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Service
                </p>
                <p className="font-black text-slate-900 text-xl mb-2">
                  {invitationInfo.projectName}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {invitationInfo.projectDescription}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl">
              <EnvelopeIcon className="h-7 w-7 text-gray-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Invité par
                </p>
                <p className="font-bold text-slate-900 text-lg">
                  {invitationInfo.managerName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl">
              <ShieldCheckIcon className="h-7 w-7 text-gray-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Niveau d'accès
                </p>
                <p className="font-bold text-slate-900">
                  {invitationInfo.accessLevel === 'READ_ONLY'
                    ? 'Lecture seule'
                    : 'Lecture et exécution'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl">
              <CalendarIcon className="h-7 w-7 text-gray-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Invité le
                </p>
                <p className="font-bold text-slate-900">
                  {new Date(invitationInfo.invitedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5">
            <p className="text-sm text-yellow-800 leading-relaxed">
              <strong className="font-bold">Note :</strong> En acceptant cette invitation, vous aurez accès au
              service "{invitationInfo.projectName}" et pourrez consulter les tests et
              rapports.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="flex-1"
            >
              Refuser
            </Button>
            <Button
              onClick={handleAccept}
              loading={activating}
              className="flex-1"
              icon={!activating && <CheckCircleIcon className="h-5 w-5" />}
            >
              {activating ? 'Activation...' : 'Accepter l\'invitation'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InvitationPage;