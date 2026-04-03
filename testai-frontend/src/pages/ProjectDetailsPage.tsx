import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import {
  projectService,
  type Test,
  type Endpoint,
  testService,
  executionService,
  type ProjectExecutionResponse,
} from "../services/api";
import api from "../services/api";
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
  CodeBracketIcon,
  UsersIcon,
  ShareIcon,
  FolderOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  NewspaperIcon,
  ClockIcon,
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

interface LocationState {
  managerEmail?: string;
  accessLevel?: "READ_ONLY" | "READ_WRITE";
  sharedAt?: string;
}

interface TestExecution {
  id: string;
  endpointId: string;
  endpointPath: string;
  httpMethod: string;
  testType: string;
  status: "SUCCESS" | "FAILED" | "ERROR";
  expectedStatusCode: number;
  responseStatusCode: number;
  executedAt: string;
  errorMessage?: string;
}

const PIE_DATA = [
  { name: "Réussis", value: 85, color: "#28a745" },
  { name: "Échoués", value: 15, color: "#dc3545" },
];

const methodColors: Record<string, string> = {
  GET: "bg-secondary-container text-on-secondary-container",
  POST: "bg-primary-container text-on-primary-container",
  PUT: "bg-tertiary-container text-on-tertiary-container",
  DELETE: "bg-error-container text-error",
  PATCH: "bg-secondary-fixed text-on-secondary-fixed",
  OPTIONS: "bg-surface-container-high text-on-surface-variant",
  HEAD: "bg-surface-container-high text-on-surface-variant",
};

const ServiceDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [activeTab, setActiveTab] = useState("endpoints");
  const [project, setProject] = useState<Project | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointsCount, setEndpointsCount] = useState(0);
  const [rescanning, setRescanning] = useState(false);
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(
    null,
  );
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<
    "READ_ONLY" | "READ_WRITE" | null
  >(null);
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [sharedAt, setSharedAt] = useState<string | null>(null);
  const [loadingTests, setLoadingTests] = useState<boolean>(false);

  // Historique
  const [executions, setExecutions] = useState<ProjectExecutionResponse[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ProjectExecutionResponse | null>(null);
  const [testExecutions, setTestExecutions] = useState<TestExecution[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  useEffect(() => {
    if (state) {
      setAccessLevel(state.accessLevel || null);
      setManagerEmail(state.managerEmail || null);
      setSharedAt(state.sharedAt || null);
    }
  }, [state]);

  useEffect(() => {
    if (id) loadProjectData();
  }, [id]);

  useEffect(() => {
    if (activeTab === "history" && id) {
      loadExecutionHistory();
    }
  }, [activeTab, id]);

  function tag_tests(tests: Test[]) {
    return tests.reduce(
      (grouped, test) => {
        const path = test.endpointPath?.split(" ")[1]?.trim();
        const resourceTag = path?.split("/")[1]?.split("?")[0] || "Général";
        if (!grouped[resourceTag]) grouped[resourceTag] = [];
        grouped[resourceTag].push(test);
        return grouped;
      },
      {} as Record<string, Test[]>,
    );
  }

  const refreshTests = async () => {
    if (!id) return;
    const testsResponse = await testService.getTestsByProjectId(id!);
    setTests(testsResponse.data as Test[]);
  };

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectResponse = await projectService.getProjectById(id!);
      setProject(projectResponse.data);
      const userStr = localStorage.getItem("user");
      const currentUserId = userStr ? JSON.parse(userStr).id : null;
      setIsOwner(projectResponse.data.userId === currentUserId);
      const endpointsResponse = await projectService.getProjectEndpoints(id!);
      setEndpoints(endpointsResponse.data as Endpoint[]);
      const countResponse = await projectService.countProjectEndpoints(id!);
      setEndpointsCount(
        countResponse.data.count || endpointsResponse.data.length,
      );
      await refreshTests();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erreur lors du chargement des données",
      );
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
      setError(err.response?.data?.message || "Erreur lors du rescan");
    } finally {
      setRescanning(false);
    }
  };

  const handleDeleteProject = async () => {
    if (
      !id ||
      !window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")
    )
      return;
    try {
      await projectService.deleteProject(id);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const handleGenerateTests = async (endpointsToGenerate: Endpoint[]) => {
    if (
      !confirm(
        `Générer des tests pour ${endpointsToGenerate.length} endpoints ?`,
      )
    ) {
      setLoadingTests(false);
      return;
    }
    try {
      setLoadingTests(true);
      await testService.generate(endpointsToGenerate).then(async () => {
        const testsResponse = await testService.getTestsByProjectId(id!);
        if (tests.length === 0) {
          setTests(testsResponse.data as Test[]);
        } else {
          let newTests = testsResponse.data as Test[];
          setTests((prev) => {
            const updated = prev.map(
              (t) => newTests.find((nt) => nt.id === t.id) || t,
            );
            const newIds = new Set(updated.map((t) => t.id));
            const addedTests = newTests.filter((nt) => !newIds.has(nt.id));
            return [...updated, ...addedTests];
          });
        }
        alert("Tests générés avec succès !");
        setLoadingTests(false);
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erreur lors de la génération des tests",
      );
      setLoadingTests(false);
    }
  };

  const regenerateTests = async (testIds: string[]) => {
    if (!confirm(`Régénérer ${testIds.length} tests ?`)) return;
    try {
      setLoadingTests(true);
      const testsToRegenerate = tests.filter((t) => testIds.includes(t.id));
      const endpointIds = new Set(testsToRegenerate.map((t) => t.endpointId));
      const endpointsRegen = endpoints.filter((ep) => endpointIds.has(ep.id));
      handleGenerateTests(endpointsRegen);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Erreur lors de la régénération des tests",
      );
      setLoadingTests(false);
    }
  };

  const loadExecutionHistory = async () => {
    if (!id) return;
    setLoadingHistory(true);
    try {
      const res = await executionService.getProjectExecutions(id);
      setExecutions(res.data);
      if (res.data.length > 0) {
        setSelectedExecution(res.data[0]);
        await loadTestExecutions(res.data[0].executionId);
      }
    } catch (err) {
      console.error("Erreur chargement historique", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadTestExecutions = async (executionId: string) => {
    try {
      const res = await api.get(
        `execution-service/api/executions/${executionId}/test-executions`,
      );
      setTestExecutions(res.data);
    } catch (err) {
      console.error("Erreur chargement détails", err);
      setTestExecutions([]);
    }
  };

  const canEdit = isOwner;
  const canDelete = isOwner;
  const canShare = isOwner;
  const canRescan = isOwner;
  const canExecuteTests =
    isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");
  const canGenerateTests =
    isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");

  const groupedEndpoints = endpoints.reduce(
    (groups, ep) => {
      const firstTag = ep.tags?.split(",")[0]?.trim() || "Général";
      if (!groups[firstTag]) groups[firstTag] = [];
      groups[firstTag].push(ep);
      return groups;
    },
    {} as Record<string, Endpoint[]>,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 flex items-center justify-center">
            <ArrowPathIcon className="w-12 h-12 text-primary animate-spin" />
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
          <main className="flex-1 ml-64 p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-medium">
                {error || "Projet non trouvé"}
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="mt-4"
                variant="outline"
              >
                Retour au Dashboard
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 md:p-12 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm text-on-surface-variant font-medium">
                <span>Projects</span>
                <span className="material-symbols-outlined text-xs">
                  chevron_right
                </span>
                <span className="text-primary font-bold">{project.name}</span>
              </div>
              <div className="flex items-center space-x-4">
                <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">
                  {project.name}
                </h2>
                <Badge variant="info">{project.docMode}</Badge>
                <Badge variant="default">{project.authType}</Badge>
              </div>
              <p className="text-on-surface-variant max-w-2xl font-body">
                {project.description}
              </p>
              <p className="text-on-surface-variant max-w-2xl font-body">
                {project.projectUrl}
              </p>
              {userRole === "DEVELOPER" && managerEmail && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 space-y-1">
                  <p>
                    <span className="font-semibold">Partagé par :</span>{" "}
                    {managerEmail}
                  </p>
                  <p>
                    <span className="font-semibold">Niveau d'accès :</span>{" "}
                    {accessLevel === "READ_WRITE"
                      ? "Lecture/Écriture"
                      : "Lecture seule"}
                  </p>
                  {sharedAt && (
                    <p>
                      <span className="font-semibold">Partagé le :</span>{" "}
                      {new Date(sharedAt).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              )}
            </div>
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
                <Button
                  variant="outline"
                  size="sm"
                  icon={<PencilSquareIcon className="w-4 h-4" />}
                >
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
                  <Button icon={<PlayIcon className="w-5 h-5" />}>
                    Exécuter Tests
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-outline-variant/30 mb-8">
            <nav className="flex space-x-8">
              <TabItem
                active={activeTab === "endpoints"}
                label="Endpoints"
                onClick={() => setActiveTab("endpoints")}
                icon={<ListBulletIcon className="w-5 h-5" />}
              />
              <TabItem
                active={activeTab === "tests"}
                label="Tests"
                onClick={() => setActiveTab("tests")}
                icon={<BeakerIcon className="w-5 h-5" />}
              />
              <TabItem
                active={activeTab === "reports"}
                label="Rapports"
                onClick={() => setActiveTab("reports")}
                icon={<PresentationChartLineIcon className="w-5 h-5" />}
              />
              <TabItem
                active={activeTab === "settings"}
                label="Paramètres"
                onClick={() => setActiveTab("settings")}
                icon={<CogIcon className="w-5 h-5" />}
              />
              <TabItem
                active={activeTab === "history"}
                label="Historique"
                onClick={() => setActiveTab("history")}
                icon={<ClockIcon className="w-5 h-5" />}
              />
            </nav>
          </div>

          {/* Onglet Endpoints (complet) */}
          {activeTab === "endpoints" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-9 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Endpoints Détectés ({endpointsCount})
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {endpoints.length === 0
                        ? "Aucun endpoint détecté"
                        : `${endpoints.filter((e) => e.discoveryType === "SWAGGER").length} depuis Swagger, ${endpoints.filter((e) => e.discoveryType === "MANUAL").length} manuels`}
                    </p>
                  </div>
                  {endpoints.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateTests(endpoints)}
                      icon={<ClipboardDocumentCheckIcon className="w-4 h-4" />}
                    >
                      Générer tous les tests
                    </Button>
                  )}
                  {canRescan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRescanEndpoints}
                      loading={rescanning}
                      icon={
                        !rescanning && <ArrowPathIcon className="w-4 h-4" />
                      }
                    >
                      Rescanner
                    </Button>
                  )}
                </div>

                {endpoints.length === 0 ? (
                  <div className="bg-surface-container-low p-12 rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
                    <ListBulletIcon className="w-16 h-16 text-outline mb-4" />
                    <h3 className="text-xl font-bold text-on-surface mb-2">
                      Aucun endpoint trouvé
                    </h3>
                    <p className="text-on-surface-variant max-w-sm">
                      {project.docMode === "SWAGGER"
                        ? "Le scan Swagger n'a détecté aucun endpoint."
                        : "Ajoutez des endpoints manuellement."}
                    </p>
                  </div>
                ) : (
                  Object.entries(groupedEndpoints).map(([tag, eps]) => (
                    <div key={tag} className="space-y-4 relative">
                      <div className="flex items-center space-x-2 text-on-surface-variant">
                        <FolderOpenIcon className="w-5 h-5" />
                        <h3 className="font-headline font-bold text-lg">
                          {tag}
                        </h3>
                        <span className="text-xs font-mono text-on-surface-variant">
                          ({eps.length})
                        </span>
                        <Button
                          className="absolute right-0"
                          size="sm"
                          onClick={() => handleGenerateTests(eps)}
                        >
                          Générer les tests de ce groupe
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {eps.map((ep) => (
                          <EndpointAccordion
                            key={ep.id}
                            endpoint={ep}
                            isExpanded={expandedEndpointId === ep.id}
                            onToggle={() =>
                              setExpandedEndpointId((prev) =>
                                prev === ep.id ? null : ep.id,
                              )
                            }
                            canGenerateTests={canGenerateTests}
                            handleGenerateTests={handleGenerateTests}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="lg:col-span-3 space-y-6">
                {userRole === "DEVELOPER" && (
                  <div className="bg-surface-container-highest/30 rounded-xl p-6 space-y-4 border border-outline-variant/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline font-bold">Access Level</h3>
                      <ShieldCheckIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-outline-variant/10">
                      <div className="text-[10px] uppercase font-bold text-primary mb-1">
                        Developer Role
                      </div>
                      <div className="text-sm font-semibold">
                        {accessLevel === "READ_WRITE"
                          ? "READ_WRITE"
                          : "READ_ONLY"}
                      </div>
                    </div>
                    <ul className="space-y-2 text-xs text-on-surface-variant">
                      <li className="flex items-center space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                        <span>Consulter les endpoints</span>
                      </li>
                      {accessLevel === "READ_WRITE" && (
                        <li className="flex items-center space-x-2">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                          <span>Générer des tests</span>
                        </li>
                      )}
                      <li className="flex items-center space-x-2">
                        <XCircleIcon className="w-4 h-4 text-slate-400" />
                        <span>Modifier le service</span>
                      </li>
                    </ul>
                  </div>
                )}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                  <h3 className="font-headline font-bold text-lg">
                    Overall Health
                  </h3>
                  <div className="flex items-center justify-center py-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          className="text-surface-container-high"
                          cx="64"
                          cy="64"
                          fill="transparent"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                        ></circle>
                        <circle
                          className="text-primary"
                          cx="64"
                          cy="64"
                          fill="transparent"
                          r="58"
                          stroke="currentColor"
                          strokeDasharray="364"
                          strokeDashoffset="36"
                          strokeWidth="8"
                        ></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-headline font-bold">
                          92%
                        </span>
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                          Passing
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">
                        Active Tests
                      </span>
                      <span className="font-bold">48/52</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary w-[92%] h-full"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-surface-container-highest/40 p-6 rounded-3xl border border-primary/5">
                  <h4 className="font-bold text-on-surface text-sm mb-4">
                    Upcoming Audits
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                          <ShieldCheckIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Security Pass</p>
                          <p className="text-[10px] text-on-surface-variant">
                            In 2 days
                          </p>
                        </div>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Compliance API</p>
                          <p className="text-[10px] text-on-surface-variant">
                            In 5 days
                          </p>
                        </div>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Tests */}
          {activeTab === "tests" && (
            <>
              {endpoints.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateTests(endpoints)}
                  icon={<ClipboardDocumentCheckIcon className="w-4 h-4" />}
                >
                  Regénérer tous les tests
                </Button>
              )}
              {tests.length === 0 ? (
                <div className="text-center p-12 text-gray-500">
                  <BeakerIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">
                    Il n'y a pas de tests disponibles
                  </p>
                  <p className="text-sm mt-2">
                    Générez des tests pour voir les résultats ici
                  </p>
                </div>
              ) : (
                Object.entries(tag_tests(tests)).map(([tag, tests]) => (
                  <div key={tag} className="space-y-4 mt-4">
                    <div className="flex items-center space-x-2 text-on-surface-variant relative">
                      <NewspaperIcon className="w-5 h-5" />
                      <h3 className="font-headline font-bold text-lg">{tag}</h3>
                      <span className="text-xs font-mono text-on-surface-variant">
                        ({tests.length})
                      </span>
                      <Button
                        className="absolute right-0"
                        size="sm"
                        onClick={() => regenerateTests(tests.map((t) => t.id))}
                      >
                        Regénérer les tests de ce groupe
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {tests.map((test) => (
                        <TestAccordion
                          key={test.id}
                          test={test}
                          isExpanded={expandedTestId === test.id}
                          onToggle={() =>
                            setExpandedTestId((prev) =>
                              prev === test.id ? null : test.id,
                            )
                          }
                          regenerateTests={regenerateTests}
                          canRegenerateTests={canGenerateTests}
                          refreshTests={refreshTests}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Onglet Rapports */}
          {activeTab === "reports" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card title="Répartition des résultats">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={PIE_DATA}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
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
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: d.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-600">
                          {d.name} ({d.value}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card
                title="Historique de succès"
                footer={
                  <Button
                    variant="outline"
                    className="w-full"
                    icon={<DocumentArrowDownIcon className="w-5 h-5" />}
                  >
                    Exporter Rapport PDF
                  </Button>
                }
              >
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { name: "Lun", success: 90 },
                        { name: "Mar", success: 92 },
                        { name: "Mer", success: 85 },
                        { name: "Jeu", success: 95 },
                        { name: "Ven", success: 98 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="success"
                        stroke="#2E75B6"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* Onglet Paramètres */}
          {activeTab === "settings" && (
            <div className="max-w-2xl mx-auto space-y-8">
              <Card title="Informations du Projet">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      value={project.name}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full p-2 border rounded"
                      rows={3}
                      value={project.description}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      value={project.projectUrl}
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mode Documentation
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        value={project.docMode}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type d'Auth
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        value={project.authType}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </Card>
              <Card title="Configuration Jenkins">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300"
                      defaultChecked
                    />
                    <span className="text-gray-700">
                      Activer le déclenchement automatique
                    </span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fréquence (Cron expression)
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      defaultValue="0 0 * * *"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}
 {activeTab === "history" && (
            <div className="space-y-8">
              <h3 className="text-lg font-bold">Historique des exécutions</h3>
              {loadingHistory ? (
                <div className="text-center p-8">Chargement...</div>
              ) : executions.length === 0 ? (
                <div className="text-center p-12 text-gray-500">
                  <ClockIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Aucune exécution pour ce projet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Liste des exécutions */}
                  <div className="lg:col-span-1 space-y-4">
                    {executions.map((exec) => (
                      <div
                        key={exec.executionId}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedExecution?.executionId === exec.executionId
                            ? "border-primary bg-primary/5"
                            : "border-outline-variant/20 hover:bg-surface-container-low"
                        }`}
                        onClick={() => {
                          setSelectedExecution(exec);
                          loadTestExecutions(exec.executionId);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold">{new Date(exec.executedAt).toLocaleDateString()}</p>
                            <p className="text-xs text-on-surface-variant">{new Date(exec.executedAt).toLocaleTimeString()}</p>
                          </div>
                          <Badge variant={exec.status === "COMPLETED" ? "success" : "danger"}>
                            {exec.status}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <p className="font-bold">{exec.testsPassed}</p>
                            <p className="text-on-surface-variant">Réussis</p>
                          </div>
                          <div>
                            <p className="font-bold text-red-600">{exec.testsFailed}</p>
                            <p className="text-on-surface-variant">Échoués</p>
                          </div>
                          <div>
                            <p className="font-bold">{exec.successRate?.toFixed(0) ?? 0}%</p>
                            <p className="text-on-surface-variant">Taux</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Détails de l’exécution sélectionnée */}
                  <div className="lg:col-span-2 space-y-6">
                    {selectedExecution && (
                      <>
                        <Card title="Statistiques">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: "Réussis", value: selectedExecution.testsPassed, color: "#28a745" },
                                    { name: "Échoués", value: selectedExecution.testsFailed, color: "#dc3545" },
                                    { name: "Erreurs", value: selectedExecution.testsError, color: "#ffc107" },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  <Cell fill="#28a745" />
                                  <Cell fill="#dc3545" />
                                  <Cell fill="#ffc107" />
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Réussis ({selectedExecution.testsPassed})</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Échoués ({selectedExecution.testsFailed})</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Erreurs ({selectedExecution.testsError})</span></div>
                          </div>
                        </Card>

                        <Card title="Détail des tests">
                          {testExecutions.length === 0 ? (
                            <p className="text-gray-500">Aucun test exécuté</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-surface-container-high text-on-surface-variant text-xs uppercase">
                                  <tr>
                                    <th className="px-4 py-2 text-left">Endpoint</th>
                                    <th className="px-4 py-2 text-left">Type</th>
                                    <th className="px-4 py-2 text-left">Statut</th>
                                    <th className="px-4 py-2 text-left">Code attendu</th>
                                    <th className="px-4 py-2 text-left">Code reçu</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {testExecutions.map((te) => (
                                    <tr key={te.id} className="border-t border-outline-variant/10">
                                      <td className="px-4 py-2 font-mono text-xs">{te.endpointPath}</td>
                                      <td className="px-4 py-2">{te.testType}</td>
                                      <td className="px-4 py-2"><Badge variant={te.status === "SUCCESS" ? "success" : te.status === "FAILED" ? "danger" : "warning"}>{te.status}</Badge></td>
                                      <td className="px-4 py-2">{te.expectedStatusCode}</td>
                                      <td className="px-4 py-2">{te.responseStatusCode}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </Card>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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

          {loadingTests && (
            <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-4">
                <BeakerIcon className="w-8 h-8 text-primary animate-spin" />
                <span className="text-lg font-medium">
                  Génération des tests en cours...
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// ==========================================
// Composants EndpointAccordion, TestAccordion, TabItem
// ==========================================

const EndpointAccordion: React.FC<{
  endpoint: Endpoint;
  isExpanded: boolean;
  onToggle: () => void;
  handleGenerateTests: (endpoints: Endpoint[]) => void;
  canGenerateTests: boolean;
}> = ({
  endpoint,
  isExpanded,
  onToggle,
  handleGenerateTests,
  canGenerateTests,
}) => {
  const methodColor =
    methodColors[endpoint.method] ||
    "bg-surface-container-high text-on-surface-variant";

  let parameters: any[] = [];
  try {
    if (endpoint.parameters) parameters = JSON.parse(endpoint.parameters);
  } catch (e) {}

  let requestBodyParsed = null;
  let responseBodyParsed = null;
  try {
    if (endpoint.requestBody)
      requestBodyParsed = JSON.parse(endpoint.requestBody);
  } catch (e) {}
  try {
    if (endpoint.responseBody)
      responseBodyParsed = JSON.parse(endpoint.responseBody);
  } catch (e) {}

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-colors group"
      >
        <div className="flex items-center space-x-6 flex-wrap gap-2">
          <span
            className={`px-3 py-1 rounded-full ${methodColor} text-[10px] font-black w-16 text-center`}
          >
            {endpoint.method}
          </span>
          <div className="text-left">
            <div className="font-mono text-sm text-on-surface">
              {endpoint.path}
            </div>
            <div className="text-[11px] text-on-surface-variant">
              {endpoint.description || "Aucune description"}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 aura-pulse"></div>
            <span className="text-xs font-medium text-on-surface-variant">
              Active
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
            {isExpanded ? "unfold_less" : "unfold_more"}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 py-8 border-t border-outline-variant/30 space-y-8">
          {parameters.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <CodeBracketIcon className="w-4 h-4" /> Paramètres
              </h4>
              <div className="overflow-x-auto bg-surface-container-lowest rounded-lg border border-outline-variant/30">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-high text-on-surface-variant text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 text-left">Nom</th>
                      <th className="px-4 py-2 text-left">Emplacement</th>
                      <th className="px-4 py-2 text-left">Requis</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {parameters.map((p, idx) => {
                      const name = p.name || p.$ref || "?";
                      const in_ = p.in || (p.$ref ? "référence" : "-");
                      const required = p.required ? "Oui" : "Non";
                      let type =
                        p.type || (p.schema ? p.schema.type : "object");
                      if (p.schema && p.schema.type) type = p.schema.type;
                      const description = p.description || "-";
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-mono">{name}</td>
                          <td className="px-4 py-2">{in_}</td>
                          <td className="px-4 py-2">{required}</td>
                          <td className="px-4 py-2">{type}</td>
                          <td className="px-4 py-2">{description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {requestBodyParsed && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <CodeBracketIcon className="w-4 h-4" /> Corps de la requête
              </h4>
              <div className="bg-inverse-surface p-4 rounded-xl font-mono text-xs text-on-primary-container overflow-x-auto">
                <pre>{JSON.stringify(requestBodyParsed, null, 2)}</pre>
              </div>
            </div>
          )}
          {responseBodyParsed && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <CodeBracketIcon className="w-4 h-4" /> Corps de la réponse
              </h4>
              <div className="bg-inverse-surface p-4 rounded-xl font-mono text-xs text-on-primary-container overflow-x-auto">
                <pre>{JSON.stringify(responseBodyParsed, null, 2)}</pre>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Codes de statut
              </h4>
              <div className="flex flex-wrap gap-2">
                {endpoint.statusCodes?.split(",").map((code) => (
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
                    {code.trim()}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Authentification
              </h4>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/10">
                <span className="text-sm font-medium">Requiert auth</span>
                <span className="text-xs font-mono px-2 py-0.5 bg-surface-container text-on-surface-variant rounded">
                  {endpoint.requiresAuth ? "Oui" : "Non"}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button
              onClick={() => handleGenerateTests([endpoint])}
              disabled={!canGenerateTests}
              className={`w-full py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg transition-all ${canGenerateTests ? "hover:bg-primary hover:text-white cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
            >
              Générer tests
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TestAccordion: React.FC<{
  test: Test;
  isExpanded: boolean;
  onToggle: () => void;
  regenerateTests: (testIds: string[]) => void;
  canRegenerateTests: boolean;
  refreshTests: () => void;
}> = ({
  test,
  isExpanded,
  onToggle,
  regenerateTests,
  canRegenerateTests,
  refreshTests,
}) => {
  const method = test.endpointPath.split(" ")[0];
  const methodColor =
    methodColors[method] || "bg-surface-container-high text-on-surface-variant";
  const [editMode, setEditMode] = useState<boolean>(false);
  const [rawTestData, setRawTestData] = useState<Record<string, string>>({});

  let testDataParsed: Record<string, any> = {};
  const sections = [
    { key: "positive", label: "Test Positif" },
    { key: "validation", label: "Test de Validation" },
    { key: "boundary", label: "Test de Limite" },
    { key: "wrongType", label: "Test de Type Incorrect" },
    { key: "missingFields", label: "Test de Champ Manquant" },
    { key: "auth", label: "Test de Sécurité" },
  ];

  sections.forEach((section) => {
    try {
      const value = (test as any)[section.key];
      if (value) {
        testDataParsed[section.key] =
          typeof value === "string" ? JSON.parse(value) : value;
      }
    } catch (e) {
      testDataParsed[section.key] = (test as any)[section.key];
    }
  });

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-colors group"
      >
        <div className="flex items-center space-x-6 flex-wrap gap-2">
          <span
            className={`px-3 py-1 rounded-full ${methodColor} text-[10px] font-black w-16 text-center`}
          >
            {method}
          </span>
          <div className="text-left">
            <div className="font-mono text-sm text-on-surface">
              {test.endpointPath}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 aura-pulse"></div>
            <span className="text-xs font-medium text-on-surface-variant">
              Active
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
            {isExpanded ? "unfold_less" : "unfold_more"}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 py-8 border-t border-outline-variant/30 space-y-8">
          {sections.map((section) =>
            testDataParsed[section.key] ? (
              <div key={section.key}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <CodeBracketIcon className="w-4 h-4" /> {section.label}
                </h4>
                {editMode ? (
                  <textarea
                    value={
                      rawTestData[section.key] !== undefined
                        ? rawTestData[section.key]
                        : JSON.stringify(testDataParsed[section.key], null, 2)
                    }
                    className="w-full p-4 bg-inverse-surface text-on-primary-container font-mono text-xs rounded-xl border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={13}
                    onChange={(e) =>
                      setRawTestData((prev) => ({
                        ...prev,
                        [section.key]: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="w-full p-4 bg-inverse-surface text-on-primary-container font-mono text-xs rounded-xl border border-outline-variant/20 overflow-x-auto max-h-96">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(testDataParsed[section.key], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : null,
          )}
          <div className="pt-2 grid grid-cols-2 gap-4">
            <button
              onClick={async () => {
                if (editMode) {
                  let hasChanges = false;
                  let errorMessage = "";
                  const parsedData: Record<string, any> = {};
                  for (const key in rawTestData) {
                    if (rawTestData[key] !== undefined) {
                      try {
                        parsedData[key] = JSON.parse(rawTestData[key]);
                        if (
                          JSON.stringify(parsedData[key]) !==
                          JSON.stringify(testDataParsed[key])
                        )
                          hasChanges = true;
                      } catch (e) {
                        errorMessage = `Erreur JSON dans ${sections.find((s) => s.key === key)?.label || key}`;
                        break;
                      }
                    }
                  }
                  if (errorMessage) {
                    setRawTestData({});
                    if (confirm(errorMessage + "\nContinuer à éditer ?")) {
                      return;
                    } else {
                      setEditMode(false);
                      return;
                    }
                  }
                  if (!hasChanges) {
                    if (
                      !confirm(
                        "Aucune modification détectée. Continuer à éditer ?",
                      )
                    )
                      setRawTestData({});
                    else return;
                  } else {
                    const updatedTest = { ...test };
                    for (const key in parsedData)
                      (updatedTest as any)[key] = parsedData[key];
                    await testService.update(updatedTest as Test);
                    refreshTests();
                    setRawTestData({});
                  }
                }
                setEditMode((prev) => !prev);
              }}
              className="w-full py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg transition-all hover:bg-primary hover:text-white cursor-pointer"
            >
              {editMode ? "Enregistrer les modifications" : "Modifier le test"}
            </button>
            <button
              onClick={() => regenerateTests([test.id])}
              disabled={!canRegenerateTests}
              className={`w-full py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg transition-all ${canRegenerateTests ? "hover:bg-primary hover:text-white cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
            >
              Regénérer tests
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TabItem = ({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 pb-4 px-2 font-semibold transition-all duration-200 border-b-2 
      ${active ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
  >
    {icon}
    {label}
  </button>
);

export default ServiceDetailsPage;
