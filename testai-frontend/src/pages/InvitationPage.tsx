import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { sharedAccessService } from '../services/api';
import type { InvitationInfo } from '../services/api';

const InvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

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
      const response = await sharedAccessService.activateInvitation(token!);
      if (response.data.hasAccount) {
        navigate('/login', {
          state: {
            message: 'Invitation accepted! Log in to access the service.',
          },
        });
      } else {
        navigate(`/register-invitation?email=${encodeURIComponent(response.data.email)}&token=${token}`, {
          state: {
            email: response.data.email,
            invitationToken: token,
            projectName: response.data.projectName,
          },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error activating invitation');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <ArrowPathIcon className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant font-medium">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-xl p-10 text-center shadow-lg border border-error/20">
          <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-error text-3xl">error</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">Invalid Invitation</h2>
          <p className="text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary text-white py-3 px-6 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!invitationInfo) return null;

  // Manager avatar URL – à remplacer si le backend le fournit
  const managerAvatarUrl = undefined; // invitationInfo.managerAvatar

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased overflow-hidden relative">
      {/* Blobs décoratifs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-surface-tint/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 sm:p-24 overflow-hidden">
        <div className="w-full max-w-4xl flex flex-col md:flex-row items-stretch gap-0 rounded-xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(19,27,46,0.08)] bg-surface-container-lowest">
          {/* Colonne gauche */}
          <div className="w-full md:w-1/2 p-10 lg:p-14 flex flex-col justify-between border-r border-outline-variant/15">
            <div>
              <div className="flex items-center gap-2 mb-12">
                <div className="w-10 h-10 precision-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-white text-2xl">biotech</span>
                </div>
                <span className="font-headline text-2xl font-bold tracking-tighter text-on-surface">TestAI</span>
              </div>
              <h1 className="font-headline text-4xl lg:text-5xl font-bold text-on-surface leading-tight mb-6">
                Welcome to the <span className="text-primary">Precision Lab.</span>
              </h1>
              <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
                You've been invited to join a high-performance engineering environment designed for rigorous API validation.
              </p>
              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-xl">verified_user</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface">Secure Environment</h3>
                    <p className="text-sm text-on-surface-variant">End-to-end encrypted testing protocols.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-xl">bolt</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface">AI-Powered Logic</h3>
                    <p className="text-sm text-on-surface-variant">Automated edge-case detection and resolution.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-outline-variant/15">
              <div className="flex items-center gap-3">
                {managerAvatarUrl && !avatarError ? (
                  <img
                    alt={invitationInfo.managerName}
                    src={managerAvatarUrl}
                    onError={() => setAvatarError(true)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">account_circle</span>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">Invited by</p>
                  <p className="text-sm font-bold text-on-surface">{invitationInfo.managerName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="w-full md:w-1/2 bg-surface-container-low p-10 lg:p-14 flex flex-col justify-center">
            <div className="space-y-8">
              <div className="bg-surface-container-lowest p-8 rounded-xl aura-pulse border border-outline-variant/10">
                <div className="flex items-center justify-between mb-6">
                  <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed-variant text-xs font-bold uppercase tracking-wider">
                    Invitation Details
                  </span>
                  <span className="text-xs font-mono text-outline">ID: {token?.slice(0, 8) || '--------'}</span>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-widest mb-1">
                      Project Name
                    </label>
                    <p className="font-headline text-xl font-bold text-on-surface">{invitationInfo.projectName}</p>
                    <p className="text-sm text-on-surface-variant mt-1">{invitationInfo.projectDescription}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-widest mb-1">
                        Access Level
                      </label>
                      <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined text-lg">shield</span>
                        <span className="font-bold">
                          {invitationInfo.accessLevel === 'READ_ONLY' ? 'Read Only' : 'Read/Write'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-widest mb-1">
                        Expires In
                      </label>
                      <p className="text-on-surface font-medium">48 Hours</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <button
                  onClick={handleAccept}
                  disabled={activating}
                  className="w-full precision-gradient text-white py-4 px-6 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {activating ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      Accept Invitation
                      <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </>
                  )}
                </button>
                <p className="text-center text-sm text-on-surface-variant">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-primary font-bold hover:underline"
                  >
                    Log in here
                  </button>
                </p>
              </div>
              <div className="pt-6">
                <div className="bg-surface-variant/30 p-4 rounded-lg flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">info</span>
                  <p className="text-xs text-on-surface-variant leading-tight">
                    By accepting, you agree to the Precision Lab's terms of service and data processing protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex items-center gap-8 text-outline text-xs font-medium uppercase tracking-[0.2em]">
          <span className="hover:text-primary cursor-pointer transition-colors">Documentation</span>
          <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
          <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
          <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
          <span className="hover:text-primary cursor-pointer transition-colors">Help Center</span>
        </div>
      </div>

      {/* Styles additionnels pour le thème et les icônes Material Symbols */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .precision-gradient {
          background: linear-gradient(135deg, #3525cd 0%, #4f46e5 100%);
        }
        .aura-pulse {
          box-shadow: 0 0 40px -10px rgba(77, 68, 227, 0.3);
        }
      `}</style>
    </div>
  );
};

export default InvitationPage;