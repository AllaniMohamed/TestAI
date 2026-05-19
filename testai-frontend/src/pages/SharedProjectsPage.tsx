import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { sharedAccessService, projectService } from '../services/api';
import type { SharedAccess, Project } from '../services/api';

const ProjectSharesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [shares, setShares] = useState<SharedAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectRes, sharesRes] = await Promise.all([
        projectService.getProjectById(id!),
        sharedAccessService.getProjectShares(id!)
      ]);
      setProject(projectRes.data);
      setShares(sharesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sharedAccessId: string) => {
    if (!window.confirm('Are you sure you want to revoke this access?')) return;
    try {
      await sharedAccessService.revokeAccess(sharedAccessId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error occurred while revoking access');
    }
  };

  const handleChangeAccessLevel = async (sharedAccessId: string, currentLevel: string) => {
    const newLevel = currentLevel === 'READ_ONLY' ? 'READ_WRITE' : 'READ_ONLY';
    try {
      await sharedAccessService.updateAccessLevel(sharedAccessId, newLevel);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error occurred while changing access level');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-center h-96">
              <ArrowPathIcon className="w-12 h-12 text-primary animate-spin" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 max-w-7xl mx-auto w-full">
            <Card className="p-8 text-center">
              <p className="text-error">{error || 'Projet non trouvé'}</p>
              <Button onClick={() => navigate(-1)} className="mt-4">
                Retour
              </Button>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const pendingShares = shares.filter(s => s.status === 'PENDING');
  const activeShares = shares.filter(s => s.status === 'ACTIVE');
  const revokedShares = shares.filter(s => s.status === 'REVOKED');

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 md:p-10 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeftIcon className="w-5 h-5" />}>
              Return
            </Button>
            <div>
              <h1 className="text-3xl font-headline font-bold text-on-surface">Access Management</h1>
              <p className="text-on-surface-variant">Project : {project.name}</p>
            </div>
          </div>

          {/* Liste des invitations */}
          <div className="space-y-8">
            {/* Invitations en attente */}
            {pendingShares.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-warning" />
                  Pending Invitations ({pendingShares.length})
                </h2>
                <div className="space-y-4">
                  {pendingShares.map(share => (
                    <div key={share.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                      <div className="flex items-center gap-4">
                        <EnvelopeIcon className="w-5 h-5 text-on-surface-variant" />
                        <div>
                          <p className="font-medium text-on-surface">{share.userEmail}</p>
                          <p className="text-sm text-on-surface-variant">Invited on {new Date(share.invitedAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="warning">Pending</Badge>
                        <Button variant="outline" size="sm" onClick={() => handleRevoke(share.id)} icon={<TrashIcon className="w-4 h-4" />}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Accès actifs */}
            {activeShares.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  Active Access ({activeShares.length})
                </h2>
                <div className="space-y-4">
                  {activeShares.map(share => (
                    <div key={share.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                      <div className="flex items-center gap-4">
                        <UserIcon className="w-5 h-5 text-on-surface-variant" />
                        <div>
                          <p className="font-medium text-on-surface">{share.userName || share.userEmail}</p>
                          <p className="text-sm text-on-surface-variant">{share.userEmail}</p>
                          <p className="text-xs text-on-surface-variant">Accepted on {new Date(share.activatedAt!).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={share.accessLevel === 'READ_WRITE' ? 'success' : 'info'}>
                          {share.accessLevel === 'READ_WRITE' ? 'Read/Write' : 'Read Only'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangeAccessLevel(share.id, share.accessLevel)}
                          icon={<PencilSquareIcon className="w-4 h-4" />}
                        >
                          Change
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-error border-error/20 hover:bg-error/10"
                          onClick={() => handleRevoke(share.id)}
                          icon={<TrashIcon className="w-4 h-4" />}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Accès révoqués */}
            {revokedShares.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <XCircleIcon className="w-5 h-5 text-on-surface-variant" />
                  Revoked Access ({revokedShares.length})
                </h2>
                <div className="space-y-4">
                  {revokedShares.map(share => (
                    <div key={share.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg opacity-60">
                      <div className="flex items-center gap-4">
                        <EnvelopeIcon className="w-5 h-5 text-on-surface-variant" />
                        <div>
                          <p className="font-medium text-on-surface">{share.userEmail}</p>
                          <p className="text-sm text-on-surface-variant">
                            Revoked on {share.revokedAt ? new Date(share.revokedAt).toLocaleDateString('fr-FR') : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="gray">Revoked</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Aucun partage */}
            {shares.length === 0 && (
              <Card className="p-12 text-center">
                <ShareIcon className="w-16 h-16 mx-auto mb-4 text-on-surface-variant/30" />
                <h3 className="text-xl font-headline font-bold text-on-surface mb-2">No Shares</h3>
                <p className="text-on-surface-variant">This project has not been shared with any developers yet.</p>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectSharesPage;