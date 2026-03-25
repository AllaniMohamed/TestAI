import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { projectService } from "../services/api";
import ShareProjectModal from "../components/modals/ShareProjectModal";
import {
  PencilSquareIcon,
  TrashIcon,
  PlayIcon,
  DocumentArrowDownIcon,
  ListBulletIcon,
  BeakerIcon,
  PresentationChartLineIcon,
  CogIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  UsersIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Types
interface Project {
  id: string;
  name: string;
  description: string;
  projectUrl: string;
  docMode: string;
  authType: string;
  createdAt: string;
  userId: string;
}

interface Endpoint {
  id: string;
  method: string;
  path: string;
  description: string;
  parameters?: string;
  requestBody?: string;
  responseBody?: string;
  statusCodes?: string;
  requiresAuth: boolean;
  discoveryType: string;
}

interface Parameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  type?: string;
  schema?: any;
}

interface LocationState {
  managerEmail?: string;
  accessLevel?: 'READ_ONLY' | 'READ_WRITE';
  sharedAt?: string;
}

const PIE_DATA = [
  { name: "Réussis", value: 85, color: "#28a745" },
  { name: "Échoués", value: 15, color: "#dc3545" },
];

const ServiceDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [activeTab, setActiveTab] = useState("endpoints");

  const [project, setProject] = useState<Project | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointsCount, setEndpointsCount] = useState(0);
  const [rescanning, setRescanning] = useState(false);
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<'READ_ONLY' | 'READ_WRITE' | null>(null);
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [sharedAt, setSharedAt] = useState<string | null>(null);

  // Récupérer le rôle depuis localStorage
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || "MANAGER");
      } catch (e) {
        console.error("Erreur parsing user", e);
      }
    }
  }, []);

  // Récupérer les infos de partage depuis le state (pour les développeurs)
  useEffect(() => {
    if (state) {
      setAccessLevel(state.accessLevel || null);
      setManagerEmail(state.managerEmail || null);
      setSharedAt(state.sharedAt || null);
    }
  }, [state]);

  // Charger le projet et ses endpoints
  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const projectResponse = await projectService.getProjectById(id!);
      console.log("✅ Projet chargé:", projectResponse.data);
      setProject(projectResponse.data);

      const userStr = localStorage.getItem("user");
      const currentUserId = userStr ? JSON.parse(userStr).id : null;
      setIsOwner(projectResponse.data.userId === currentUserId);

      const endpointsResponse = await projectService.getProjectEndpoints(id!);
      console.log("✅ Endpoints chargés:", endpointsResponse.data);
      setEndpoints(endpointsResponse.data);

      const countResponse = await projectService.countProjectEndpoints(id!);
      setEndpointsCount(countResponse.data.count || endpointsResponse.data.length);
    } catch (err: any) {
      console.error("❌ Erreur lors du chargement:", err);
      setError(err.response?.data?.message || "Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleRescanEndpoints = async () => {
    if (!id) return;
    try {
      setRescanning(true);
      await projectService.scanProjectEndpoints(id);
      await loadProjectData();
    } catch (err: any) {
      console.error("❌ Erreur lors du rescan:", err);
      setError(err.response?.data?.message || "Erreur lors du rescan");
    } finally {
      setRescanning(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!id || !window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) return;
    try {
      await projectService.deleteProject(id);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("❌ Erreur lors de la suppression:", err);
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const toggleEndpointDetails = (endpointId: string) => {
    setExpandedEndpointId((prev) => (prev === endpointId ? null : endpointId));
  };

  // Définir les permissions
  const canEdit = isOwner; // Seul le propriétaire peut éditer
  const canDelete = isOwner;
  const canShare = isOwner;
  const canRescan = isOwner; // Rescanner réservé au propriétaire
  const canExecuteTests = isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");
  const canGenerateTests = isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <ArrowPathIcon className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Chargement du projet...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-medium">{error || "Projet non trouvé"}</p>
              <Button onClick={() => navigate("/dashboard")} className="mt-4" variant="outline">
                Retour au Dashboard
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 text-primary rounded-2xl flex items-center justify-center">
                <BeakerIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-gray-500 font-mono text-sm">{project.projectUrl}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="info">{project.docMode}</Badge>
                  <Badge variant="default">{project.authType}</Badge>
                </div>
                {/* Informations de partage pour les développeurs */}
                {userRole === "DEVELOPER" && managerEmail && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-blue-800">
                      <span className="font-semibold">Partagé par :</span> {managerEmail}
                    </p>
                    <p className="text-blue-800">
                      <span className="font-semibold">Niveau d'accès :</span>{" "}
                      {accessLevel === "READ_WRITE" ? "Lecture/Écriture" : "Lecture seule"}
                    </p>
                    {sharedAt && (
                      <p className="text-blue-800">
                        <span className="font-semibold">Partagé le :</span>{" "}
                        {new Date(sharedAt).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Boutons d'action conditionnels selon les permissions */}
            <div className="flex gap-2">
              {canShare && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<UsersIcon className="w-4 h-4" />}
                    onClick={() => navigate(`/service/${id}/shares`)}
                  >
                    Gérer les partages
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ShareIcon className="w-4 h-4" />}
                    onClick={() => setShowShareModal(true)}
                  >
                    Partager
                  </Button>
                </>
              )}

              {canEdit && (
                <Button variant="outline" size="sm" icon={<PencilSquareIcon className="w-4 h-4" />}>
                  Éditer
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  icon={<TrashIcon className="w-4 h-4" />}
                  onClick={handleDeleteProject}
                >
                  Supprimer
                </Button>
              )}

              {canExecuteTests && (
                <Link to={`/service/${id}/execute`}>
                  <Button icon={<PlayIcon className="w-5 h-5" />}>Exécuter Tests</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-gray-200 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <TabItem active={activeTab === "endpoints"} label="Endpoints" onClick={() => setActiveTab("endpoints")} icon={<ListBulletIcon className="w-5 h-5" />} />
            <TabItem active={activeTab === "tests"} label="Tests" onClick={() => setActiveTab("tests")} icon={<BeakerIcon className="w-5 h-5" />} />
            <TabItem active={activeTab === "reports"} label="Rapports" onClick={() => setActiveTab("reports")} icon={<PresentationChartLineIcon className="w-5 h-5" />} />
            <TabItem active={activeTab === "settings"} label="Paramètres" onClick={() => setActiveTab("settings")} icon={<CogIcon className="w-5 h-5" />} />
          </div>

          {/* Tab Content */}
          <div className="animate-fadeIn">
            {activeTab === "endpoints" && (
              <Card className="p-0">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">Endpoints Détectés ({endpointsCount})</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {endpoints.length === 0
                        ? "Aucun endpoint détecté"
                        : `${endpoints.filter((e) => e.discoveryType === "SWAGGER").length} depuis Swagger, ${endpoints.filter((e) => e.discoveryType === "MANUAL").length} manuels`}
                    </p>
                  </div>
                  {canRescan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRescanEndpoints}
                      loading={rescanning}
                      icon={!rescanning && <ArrowPathIcon className="w-4 h-4" />}
                    >
                      Rescanner
                    </Button>
                  )}
                </div>

                {endpoints.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <ListBulletIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Aucun endpoint trouvé</p>
                    <p className="text-sm mt-2">
                      {project.docMode === "SWAGGER"
                        ? "Le scan Swagger n'a détecté aucun endpoint."
                        : "Ajoutez des endpoints manuellement."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-left">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase"></th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Méthode</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Chemin</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Description</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Type</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Auth</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {endpoints.map((ep) => (
                          <React.Fragment key={ep.id}>
                            <tr
                              className="hover:bg-gray-50 transition cursor-pointer"
                              onClick={() => toggleEndpointDetails(ep.id)}
                            >
                              <td className="px-6 py-4 w-8">
                                {expandedEndpointId === ep.id ? (
                                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="method" method={ep.method as any}>
                                  {ep.method}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 font-mono text-sm text-gray-700">{ep.path}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{ep.description || "-"}</td>
                              <td className="px-6 py-4">
                                <Badge variant={ep.discoveryType === "SWAGGER" ? "success" : "default"}>
                                  {ep.discoveryType}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                {ep.requiresAuth ? (
                                  <Badge variant="warning">Oui</Badge>
                                ) : (
                                  <Badge variant="default">Aucune</Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {canGenerateTests ? (
                                  <button
                                    className="text-primary font-bold text-sm hover:underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Logique pour générer tests (à implémenter)
                                    }}
                                  >
                                    Générer tests
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-sm cursor-not-allowed">Générer tests</span>
                                )}
                              </td>
                            </tr>
                            {expandedEndpointId === ep.id && (
                              <tr>
                                <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                  <EndpointDetails endpoint={ep} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {activeTab === "tests" && (
              <div className="text-center p-12 text-gray-500">
                <BeakerIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Fonctionnalité en cours de développement</p>
                <p className="text-sm mt-2">Les tests seront bientôt disponibles</p>
              </div>
            )}

            {activeTab === "reports" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="Répartition des résultats">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={PIE_DATA} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {PIE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-4">
                      {PIE_DATA.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                          <span className="text-sm font-medium text-gray-600">{d.name} ({d.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
                <Card
                  title="Historique de succès"
                  footer={
                    <Button variant="outline" className="w-full" icon={<DocumentArrowDownIcon className="w-5 h-5" />}>
                      Exporter Rapport PDF
                    </Button>
                  }
                >
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { name: "Lun", success: 90 },
                        { name: "Mar", success: 92 },
                        { name: "Mer", success: 85 },
                        { name: "Jeu", success: 95 },
                        { name: "Ven", success: 98 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="success" stroke="#2E75B6" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="max-w-2xl mx-auto space-y-8">
                <Card title="Informations du Projet">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input type="text" className="w-full p-2 border rounded" value={project.name} disabled />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea className="w-full p-2 border rounded" rows={3} value={project.description} disabled />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                      <input type="text" className="w-full p-2 border rounded" value={project.projectUrl} disabled />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mode Documentation</label>
                        <input type="text" className="w-full p-2 border rounded" value={project.docMode} disabled />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type d'Auth</label>
                        <input type="text" className="w-full p-2 border rounded" value={project.authType} disabled />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Configuration Jenkins">
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300" defaultChecked />
                      <span className="text-gray-700">Activer le déclenchement automatique</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence (Cron expression)</label>
                      <input type="text" className="w-full p-2 border rounded" defaultValue="0 0 * * *" />
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Modal de partage */}
          {showShareModal && project && (
            <ShareProjectModal
              projectId={id!}
              projectName={project.name}
              onClose={() => setShowShareModal(false)}
              onSuccess={() => {
                loadProjectData();
                setShowShareModal(false);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

// Composant pour afficher les détails d'un endpoint (inchangé)
const EndpointDetails: React.FC<{ endpoint: Endpoint }> = ({ endpoint }) => {
  let parameters: any[] = [];
  let requestBody: any = null;
  let responseBody: any = null;
  let statusCodes: string[] = [];

  try {
    if (endpoint.parameters) {
      parameters = JSON.parse(endpoint.parameters);
    }
  } catch (e) {
    console.warn("Erreur parsing parameters", e);
  }

  try {
    if (endpoint.requestBody) {
      requestBody = JSON.parse(endpoint.requestBody);
    }
  } catch (e) {
    console.warn("Erreur parsing requestBody", e);
  }

  try {
    if (endpoint.responseBody) {
      responseBody = JSON.parse(endpoint.responseBody);
    }
  } catch (e) {
    console.warn("Erreur parsing responseBody", e);
  }

  if (endpoint.statusCodes) {
    statusCodes = endpoint.statusCodes.split(",").map((s) => s.trim());
  }

  return (
    <div className="space-y-6">
      {parameters.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
            <CodeBracketIcon className="w-5 h-5 text-gray-400" />
            Paramètres
          </h4>
          <ParameterTable parameters={parameters} />
        </div>
      )}

      {requestBody && (
        <div>
          <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
            <CodeBracketIcon className="w-5 h-5 text-gray-400" />
            Corps de la requête
          </h4>
          <SchemaViewer schema={requestBody} />
        </div>
      )}

      {responseBody && (
        <div>
          <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
            <CodeBracketIcon className="w-5 h-5 text-gray-400" />
            Corps de la réponse
          </h4>
          <SchemaViewer schema={responseBody} />
        </div>
      )}

      {statusCodes.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-700 mb-2">Codes de statut</h4>
          <div className="flex flex-wrap gap-2">
            {statusCodes.map((code) => (
              <Badge
                key={code}
                variant={
                  code.startsWith("2")
                    ? "success"
                    : code.startsWith("4")
                      ? "warning"
                      : code.startsWith("5")
                        ? "danger"
                        : "default"
                }
              >
                {code}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {parameters.length === 0 &&
        !requestBody &&
        !responseBody &&
        statusCodes.length === 0 && (
          <p className="text-gray-500 italic">Aucun détail supplémentaire</p>
        )}
    </div>
  );
};

// Tableau des paramètres (inchangé)
const ParameterTable: React.FC<{ parameters: any[] }> = ({ parameters }) => {
  const rows = parameters.map((p, idx) => {
    const name = p.name || p.$ref || "?";
    const in_ = p.in || (p.$ref ? "référence" : "-");
    const required = p.required ? "Oui" : "Non";
    let type = p.type || (p.schema ? p.schema.type : "object");
    if (p.schema && p.schema.type) type = p.schema.type;
    const description = p.description || "-";
    return { name, in_, required, type, description };
  });

  return (
    <div className="overflow-x-auto bg-white rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Nom</th>
            <th className="px-4 py-2 text-left">Emplacement</th>
            <th className="px-4 py-2 text-left">Requis</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-4 py-2 font-mono">{row.name}</td>
              <td className="px-4 py-2">{row.in_}</td>
              <td className="px-4 py-2">{row.required}</td>
              <td className="px-4 py-2">{row.type}</td>
              <td className="px-4 py-2">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Visualiseur de schéma (inchangé)
const SchemaViewer: React.FC<{ schema: any }> = ({ schema }) => {
  const target = schema.schema || schema;

  if (target.$ref) {
    return <div className="text-yellow-600">Référence : {target.$ref}</div>;
  }

  if (target.type === "object" && target.properties) {
    const requiredSet = new Set(target.required || []);
    const properties = Object.entries(target.properties).map(
      ([name, prop]: [string, any]) => ({
        name,
        type: prop.type || "any",
        required: requiredSet.has(name),
        description: prop.description || "",
        format: prop.format,
        example: prop.example,
        enum: prop.enum,
      }),
    );

    return (
      <div className="space-y-2">
        {properties.length === 0 ? (
          <p className="text-gray-500">Aucune propriété</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Propriété</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Requis</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Contraintes</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2 font-mono">{prop.name}</td>
                    <td className="px-4 py-2">
                      {prop.type}
                      {prop.format ? ` (${prop.format})` : ""}
                    </td>
                    <td className="px-4 py-2">
                      {prop.required ? "Oui" : "Non"}
                    </td>
                    <td className="px-4 py-2">{prop.description || "-"}</td>
                    <td className="px-4 py-2">
                      {prop.enum && <span>enum: {prop.enum.join(", ")}</span>}
                      {prop.example && (
                        <span>ex: {JSON.stringify(prop.example)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (target.type === "array" && target.items) {
    return (
      <div className="space-y-2">
        <p className="font-mono">Tableau d'éléments :</p>
        <div className="ml-4">
          <SchemaViewer schema={target.items} />
        </div>
      </div>
    );
  }

  return (
    <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
      {JSON.stringify(target, null, 2)}
    </pre>
  );
};

// TabItem (inchangé)
const TabItem = ({ active, label, onClick, icon }: { active: boolean; label: string; onClick: () => void; icon: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 pb-4 px-2 font-semibold transition-all duration-200 border-b-2 
      ${active ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900"}`}
  >
    {icon}
    {label}
  </button>
);

export default ServiceDetailsPage;