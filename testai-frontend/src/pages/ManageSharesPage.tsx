import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  UsersIcon, 
  EnvelopeIcon, 
  CalendarIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { sharedAccessService, projectService } from '../services/api';
import type { SharedAccess } from '../services/api';

const ManageSharesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [shares, setShares] = useState<SharedAccess[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  // ⭐ Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectRes, sharesRes] = await Promise.all([
        projectService.getProjectById(projectId!),
        sharedAccessService.getProjectShares(projectId!),
      ]);

      setProjectName(projectRes.data.name);
      setShares(sharesRes.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sharedAccessId: string) => {
    if (!confirm('Voulez-vous vraiment révoquer cet accès ?')) return;

    try {
      await sharedAccessService.revokeAccess(sharedAccessId);
      loadData();
    } catch (error) {
      console.error('Erreur révocation:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { variant: 'warning' as const, label: 'En attente' },
      ACTIVE: { variant: 'success' as const, label: 'Actif' },
      REVOKED: { variant: 'danger' as const, label: 'Révoqué' },
    };
    const { variant, label } = config[status as keyof typeof config];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getAccessLevelBadge = (level: string) => {
    return level === 'READ_ONLY' ? (
      <Badge variant="info">Lecture seule</Badge>
    ) : (
      <Badge variant="default">Lecture + Exécution</Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 ml-0 md:ml-64 p-8 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-center h-96">
              <ArrowPathIcon className="w-12 h-12 text-primary animate-spin" />
            </div>
          </main>
        </div>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 ml-0 md:ml-64 p-6 lg:p-12 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(`/service/${projectId}`)}
              className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-6 font-bold transition group"
            >
              <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              Back to project
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                <UsersIcon className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-headline font-bold text-on-surface tracking-tight">
                  Manage Shares
                </h1>
                <p className="text-on-surface-variant mt-2 font-medium text-sm sm:text-base">{projectName}</p>
              </div>
            </div>
          </div>

          {/* Liste des partages */}
          {shares.length === 0 ? (
            <Card className="p-8 sm:p-16 text-center border-2 border-dashed border-outline-variant/30">
              <UsersIcon className="h-16 w-16 sm:h-20 sm:w-20 text-on-surface-variant/30 mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-headline font-bold text-on-surface mb-2">
                No shares yet
              </h3>
              <p className="text-on-surface-variant max-w-md mx-auto text-sm sm:text-base">
                This service is not yet shared with developers.
              </p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden border border-outline-variant/20">
              <div className="overflow-x-auto">
                <table className="min-w-[600px] w-full divide-y divide-outline-variant/20">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Developer
                      </th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Access
                      </th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Invited on
                      </th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/20">
                    {shares.map((share) => (
                      <tr key={share.id} className="hover:bg-surface-container-low transition">
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <EnvelopeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <div className="ml-3 sm:ml-4">
                              <div className="text-sm font-bold text-on-surface">
                                {share.userName}
                              </div>
                              <div className="text-xs sm:text-sm text-on-surface-variant font-mono truncate max-w-[150px] sm:max-w-full">
                                {share.userEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {getAccessLevelBadge(share.accessLevel)}
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                          {getStatusBadge(share.status)}
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-on-surface-variant">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">{new Date(share.invitedAt).toLocaleDateString('fr-FR')}</span>
                            <span className="sm:hidden">{new Date(share.invitedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right">
                          {share.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleRevoke(share.id)}
                              className="text-error hover:text-error/80 flex items-center gap-1 sm:gap-2 ml-auto font-bold transition group"
                            >
                              <TrashIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              <span className="hidden sm:inline">Revoke</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* ⭐ Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default ManageSharesPage;