import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  type ProjectExecution,
  type TestExecution,
  type StartExecutionResponse,
} from "../services/api";
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
  XMarkIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  BoltIcon,
  StopIcon,
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

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

type TabId = "endpoints" | "tests" | "execution" | "history" | "reports" | "settings";

interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ExecutionLog {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "error" | "warning";
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const PIE_DATA = [
  { name: "Réussis", value: 85, color: "#22c55e" },
  { name: "Échoués", value: 15, color: "#ef4444" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-secondary-container text-on-secondary-container",
  POST: "bg-primary-container text-on-primary-container",
  PUT: "bg-tertiary-container text-on-tertiary-container",
  DELETE: "bg-error-container text-error",
  PATCH: "bg-secondary-fixed text-on-secondary-fixed",
  OPTIONS: "bg-surface-container-high text-on-surface-variant",
  HEAD: "bg-surface-container-high text-on-surface-variant",
};

const TEST_SECTIONS = [
  { key: "positive",      label: "Test Positif" },
  { key: "validation",    label: "Test de Validation" },
  { key: "boundary",      label: "Test de Limite" },
  { key: "wrongType",     label: "Test de Type Incorrect" },
  { key: "missingFields", label: "Test de Champ Manquant" },
  { key: "auth",          label: "Test de Sécurité" },
];

// ─────────────────────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm bg-white"
            style={{
              animation: "toastIn 0.22s ease-out",
              borderColor:
                t.type === "success" ? "#bbf7d0" :
                t.type === "error"   ? "#fecaca" :
                                       "#bfdbfe",
            }}
          >
            {t.type === "success" && <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
            {t.type === "error"   && <XCircleIcon     className="w-5 h-5 text-red-500   flex-shrink-0 mt-0.5" />}
            {t.type === "info"    && <SparklesIcon    className="w-5 h-5 text-blue-500  flex-shrink-0 mt-0.5" />}
            <p className="text-sm font-medium text-slate-800 flex-1">{t.message}</p>
            <button
              onClick={() => onRemove(t.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE CONFIRMATION
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, title, message, confirmLabel = "Confirmer", variant = "primary", onConfirm, onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 z-10">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${variant === "danger" ? "bg-red-50" : "bg-indigo-50"}`}>
            {variant === "danger"
              ? <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              : <SparklesIcon           className="w-5 h-5 text-indigo-500" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors
              ${variant === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE BUTTON
// ─────────────────────────────────────────────────────────────────────────────

const GenerateButton: React.FC<{
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon?: React.ReactNode;
  size?: "sm" | "xs";
  fullWidth?: boolean;
}> = ({ loading, onClick, disabled, label, icon, size = "sm", fullWidth }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    className={`
      flex items-center justify-center gap-2 font-semibold border border-outline-variant/30 rounded-lg transition-all
      ${fullWidth ? "w-full" : ""}
      ${size === "sm" ? "px-3 py-2 text-sm" : "px-2.5 py-1.5 text-xs"}
      ${loading
        ? "bg-primary/5 text-primary border-primary/20 cursor-wait"
        : disabled
          ? "opacity-40 cursor-not-allowed bg-surface-container text-on-surface-variant"
          : "bg-white text-on-surface hover:bg-surface-container-low cursor-pointer"
      }
    `}
  >
    {loading ? (
      <>
        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
        <span>En cours de génération…</span>
      </>
    ) : (
      <>
        {icon ?? <SparklesIcon className="w-3.5 h-3.5 flex-shrink-0" />}
        <span>{label}</span>
      </>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon, title, description,
}) => (
  <div className="bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-2xl p-12 flex flex-col items-center text-center">
    <div className="text-outline mb-4 opacity-30">{icon}</div>
    <h3 className="text-lg font-bold text-on-surface mb-2">{title}</h3>
    <p className="text-sm text-on-surface-variant max-w-sm">{description}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TAB ITEM
// ─────────────────────────────────────────────────────────────────────────────

const TabItem: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}> = ({ active, label, onClick, icon, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-2 pb-4 px-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap
      ${active ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}
      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    {icon}{label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL D'EXÉCUTION
// ─────────────────────────────────────────────────────────────────────────────

const ExecutionTerminal: React.FC<{
  logs: ExecutionLog[];
  isRunning: boolean;
  onStop: () => void;
}> = ({ logs, isRunning, onStop }) => {
  const terminalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogIcon = (type: ExecutionLog["type"]) => {
    switch (type) {
      case "success": return "✓";
      case "error":   return "✗";
      case "warning": return "⚠";
      default:        return "→";
    }
  };

  const getLogColor = (type: ExecutionLog["type"]) => {
    switch (type) {
      case "success": return "text-green-400";
      case "error":   return "text-red-400";
      case "warning": return "text-yellow-400";
      default:        return "text-blue-400";
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-800 px-5 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm font-semibold text-slate-300 font-mono">
            Terminal d'exécution
          </span>
          {isRunning && (
            <div className="flex items-center gap-2 ml-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">EN COURS</span>
            </div>
          )}
        </div>
        {isRunning && (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <StopIcon className="w-3.5 h-3.5" />
            Arrêter
          </button>
        )}
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="bg-slate-900 p-4 font-mono text-xs text-slate-300 h-[500px] overflow-y-auto custom-scrollbar"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.02) 19px, rgba(255,255,255,0.02) 20px)`,
        }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>Cliquez sur "Exécuter tout le projet" pour démarrer...</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-1 flex items-start gap-3">
              <span className="text-slate-500 select-none flex-shrink-0">
                [{log.timestamp.toLocaleTimeString("fr-FR")}]
              </span>
              <span className={`${getLogColor(log.type)} flex-shrink-0 font-bold`}>
                {getLogIcon(log.type)}
              </span>
              <span className="flex-1">{log.message}</span>
            </div>
          ))
        )}
        {isRunning && (
          <div className="mt-2 flex items-center gap-2 text-slate-500">
            <div className="w-1 h-3 bg-green-400 animate-pulse" />
            <span className="animate-pulse">Exécution en cours...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const ServiceDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [activeTab, setActiveTab] = useState<TabId>("endpoints");

  // Data
  const [project,        setProject]        = useState<Project | null>(null);
  const [endpoints,      setEndpoints]      = useState<Endpoint[]>([]);
  const [tests,          setTests]          = useState<Test[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [endpointsCount, setEndpointsCount] = useState(0);

  // UI
  const [rescanning,          setRescanning]          = useState(false);
  const [expandedEndpointId,  setExpandedEndpointId]  = useState<string | null>(null);
  const [expandedTestId,      setExpandedTestId]      = useState<string | null>(null);
  const [showShareModal,      setShowShareModal]      = useState(false);

  // Génération
  const [generatingKeys, setGeneratingKeys] = useState<Set<string>>(new Set());

  // Toast
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string;
    variant?: "danger" | "primary"; confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  // Auth / rôle
  const [isOwner,      setIsOwner]      = useState(false);
  const [userRole,     setUserRole]     = useState<string>("");
  const [accessLevel,  setAccessLevel]  = useState<"READ_ONLY" | "READ_WRITE" | null>(null);
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [sharedAt,     setSharedAt]     = useState<string | null>(null);

  // Historique
  const [executions,       setExecutions]       = useState<ProjectExecution[]>([]);
  const [selectedExecution,setSelectedExecution]= useState<ProjectExecution | null>(null);
  const [testExecutions,   setTestExecutions]   = useState<TestExecution[]>([]);
  const [loadingHistory,   setLoadingHistory]   = useState(false);

  // ⭐ TERMINAL D'EXÉCUTION
  const [executionLogs,    setExecutionLogs]    = useState<ExecutionLog[]>([]);
  const [isExecuting,      setIsExecuting]      = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentExecutionIdRef = useRef<string | null>(null);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastItem["type"], message: string) => {
    const toastId = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  }, []);

  const removeToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // ── Confirm helpers ────────────────────────────────────────────────────────
  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: "danger" | "primary" = "primary",
    confirmLabel = "Confirmer"
  ) => setConfirmModal({ open: true, title, message, variant, confirmLabel, onConfirm });

  const closeConfirm = () => setConfirmModal((p) => ({ ...p, open: false }));

  // ── Log helpers ────────────────────────────────────────────────────────────
  const addLog = useCallback((type: ExecutionLog["type"], message: string) => {
    const logId = Math.random().toString(36).slice(2);
    setExecutionLogs((prev) => [...prev, { id: logId, timestamp: new Date(), type, message }]);
  }, []);

  const clearLogs = useCallback(() => setExecutionLogs([]), []);

  // ── Nettoyage du polling ───────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ── Arrêt de l'exécution (annulation UI, pas d'API stop) ───────────────────
  const handleStopExecution = () => {
    stopPolling();
    setIsExecuting(false);
    currentExecutionIdRef.current = null;
    addLog("warning", "⚠️  Exécution interrompue par l'utilisateur (arrêt local).");
    addToast("info", "Exécution arrêtée.");
  };

  // ── Effets ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try { const u = JSON.parse(userStr); setUserRole(u.role || "MANAGER"); } catch {}
    }
  }, []);

  useEffect(() => {
    if (state) {
      setAccessLevel(state.accessLevel ?? null);
      setManagerEmail(state.managerEmail ?? null);
      setSharedAt(state.sharedAt ?? null);
    }
  }, [state]);

  useEffect(() => { if (id) loadProjectData(); }, [id]);
  useEffect(() => { if (activeTab === "history" && id) loadExecutionHistory(); }, [activeTab, id]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ── Chargement ─────────────────────────────────────────────────────────────
  const refreshTests = async () => {
    if (!id) return;
    const res = await testService.getTestsByProjectId(id);
    setTests(res.data as Test[]);
  };

  const loadProjectData = async () => {
    try {
      setLoading(true); setError(null);
      const projectRes = await projectService.getProjectById(id!);
      setProject(projectRes.data);
      const userStr = localStorage.getItem("user");
      const currentUserId = userStr ? JSON.parse(userStr).id : null;
      setIsOwner(projectRes.data.userId === currentUserId);
      const endpointsRes = await projectService.getProjectEndpoints(id!);
      setEndpoints(endpointsRes.data as Endpoint[]);
      const countRes = await projectService.countProjectEndpoints(id!);
      setEndpointsCount(countRes.data.count || endpointsRes.data.length);
      await refreshTests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionHistory = async () => {
    if (!id) return;
    setLoadingHistory(true);
    try {
      const res = await executionService.getProjectExecutions(id);
      const list: ProjectExecution[] = res.data;
      setExecutions(list);
      if (list.length > 0) { setSelectedExecution(list[0]); await loadTestExecutions(list[0].id); }
    } catch { console.error("Erreur historique"); }
    finally { setLoadingHistory(false); }
  };

  const loadTestExecutions = async (executionId: string) => {
    try {
      const res = await executionService.getTestExecutionsByExecutionId(executionId);
      setTestExecutions(res.data);
    } catch { setTestExecutions([]); }
  };

  // ── Rescan ─────────────────────────────────────────────────────────────────
  const handleRescanEndpoints = async () => {
    if (!id) return;
    try {
      setRescanning(true);
      await projectService.scanProjectEndpoints(id);
      await loadProjectData();
      addToast("success", "Endpoints rescannés avec succès.");
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erreur lors du rescan.");
    } finally { setRescanning(false); }
  };

  // ── Suppression ────────────────────────────────────────────────────────────
  const handleDeleteProject = () => {
    openConfirm(
      "Supprimer le projet",
      `Êtes-vous sûr de vouloir supprimer "${project?.name}" ? Cette action est irréversible.`,
      async () => {
        closeConfirm();
        try { await projectService.deleteProject(id!); navigate("/projects"); }
        catch (err: any) { addToast("error", err.response?.data?.message || "Erreur lors de la suppression."); }
      },
      "danger", "Supprimer définitivement"
    );
  };

  // ── Génération ─────────────────────────────────────────────────────────────
  const doGenerate = async (endpointsToGenerate: Endpoint[], key: string) => {
    setGeneratingKeys((prev) => new Set(prev).add(key));
    try {
      await testService.generate(endpointsToGenerate);
      const res = await testService.getTestsByProjectId(id!);
      setTests(res.data as Test[]);
      addToast(
        "success",
        endpointsToGenerate.length === 1
          ? `Tests générés pour "${endpointsToGenerate[0].path}".`
          : `Tests générés pour ${endpointsToGenerate.length} endpoints.`
      );
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erreur lors de la génération.");
    } finally {
      setGeneratingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleGenerateTests = (endpointsToGenerate: Endpoint[], key: string) => {
    openConfirm(
      "Générer les tests",
      endpointsToGenerate.length === 1
        ? `Générer les tests pour "${endpointsToGenerate[0].path}" ?`
        : `Générer des tests pour ${endpointsToGenerate.length} endpoint(s) ?`,
      () => { closeConfirm(); doGenerate(endpointsToGenerate, key); },
      "primary", "Générer"
    );
  };

  const handleRegenerateTests = (testIds: string[], key: string) => {
    const testsToRegen = tests.filter((t) => testIds.includes(t.id));
    const epIds = new Set(testsToRegen.map((t) => t.endpointId));
    const endpointsRegen = endpoints.filter((ep) => epIds.has(ep.id));
    openConfirm(
      "Régénérer les tests",
      `Régénérer ${testIds.length} test(s) ? Les données seront écrasées.`,
      () => { closeConfirm(); doGenerate(endpointsRegen, key); },
      "primary", "Régénérer"
    );
  };

  // ── EXÉCUTION RÉELLE AVEC POLLING ─────────────────────────────────────────
  const handleExecuteAllProject = async () => {
    if (!id || !project) return;

    // Nettoyer l'état précédent
    stopPolling();
    clearLogs();
    setIsExecuting(true);
    currentExecutionIdRef.current = null;

    try {
      const userStr = localStorage.getItem("user");
      const userId = userStr ? JSON.parse(userStr).id : null;

      addLog("info", `🚀 Démarrage de l'exécution du projet "${project.name}"`);
      addLog("info", `📡 Envoi de la requête au serveur...`);

      const response = await executionService.startExecution({
        projectId: id,
        executedBy: userId,
        executionContext: "manual",
      });

      const executionId = response.data.executionId;
      currentExecutionIdRef.current = executionId;

      addLog("success", `✓ Exécution lancée avec l'ID : ${executionId}`);
      addLog("info", "⏳ Attente du démarrage de l'exécution...");

      // Démarrer le polling
      pollingIntervalRef.current = setInterval(async () => {
        try {
          if (!currentExecutionIdRef.current) {
            stopPolling();
            return;
          }

          // Récupérer le statut actuel
          const statusRes = await executionService.getExecutionStatus(currentExecutionIdRef.current);
          const status = statusRes.data;

          // Récupérer les logs
          const logsRes = await executionService.getExecutionLogs(currentExecutionIdRef.current);
          const rawLogs = logsRes.data; // string[]

          // Transformer les logs bruts en ExecutionLog (on évite les doublons)
          const existingMessages = new Set(executionLogs.map(l => l.message));
          const newLogs: ExecutionLog[] = [];
          for (const raw of rawLogs) {
            if (!existingMessages.has(raw)) {
              let type: ExecutionLog["type"] = "info";
              if (raw.toLowerCase().includes("error") || raw.includes("✗")) type = "error";
              else if (raw.toLowerCase().includes("success") || raw.includes("✓")) type = "success";
              else if (raw.toLowerCase().includes("warning") || raw.includes("⚠")) type = "warning";
              newLogs.push({
                id: Math.random().toString(36).slice(2),
                timestamp: new Date(),
                type,
                message: raw,
              });
            }
          }
          if (newLogs.length > 0) {
            setExecutionLogs(prev => [...prev, ...newLogs]);
          }

          // Vérifier si l'exécution est terminée
          if (status.status === "COMPLETED" || status.status === "FAILED") {
            stopPolling();
            setIsExecuting(false);
            currentExecutionIdRef.current = null;

            addLog(
              status.status === "COMPLETED" ? "success" : "error",
              `🏁 Exécution terminée avec le statut : ${status.status}`
            );
            addLog("info", `📊 Taux de succès : ${status.successRate?.toFixed(1)}%`);
            addLog("info", `✅ Réussis : ${status.testsPassed} | ❌ Échoués : ${status.testsFailed} | ⚠️ Erreurs : ${status.testsError}`);

            addToast(
              status.status === "COMPLETED" ? "success" : "error",
              `Exécution ${status.status === "COMPLETED" ? "réussie" : "échouée"} ! Consultez l'historique.`
            );

            // Recharger l'historique après un court délai
            setTimeout(() => {
              if (activeTab === "execution" || activeTab === "history") {
                loadExecutionHistory();
              }
            }, 1500);
          }
        } catch (pollErr: any) {
          console.error("Erreur lors du polling :", pollErr);
          // On continue malgré les erreurs transitoires
        }
      }, 2000);

    } catch (err: any) {
      stopPolling();
      setIsExecuting(false);
      currentExecutionIdRef.current = null;
      addLog("error", `✗ Erreur lors du lancement de l'exécution : ${err.response?.data?.message || err.message}`);
      addToast("error", "Échec du lancement de l'exécution.");
    }
  };

  // ── Permissions ────────────────────────────────────────────────────────────
  const canEdit          = isOwner;
  const canDelete        = isOwner;
  const canShare         = isOwner;
  const canRescan        = isOwner;
  const canExecuteTests  = isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");
  const canGenerateTests = isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");

  // ── Groupements ────────────────────────────────────────────────────────────
  const groupedEndpoints = endpoints.reduce((g, ep) => {
    const tag = ep.tags?.split(",")[0]?.trim() || "Général";
    if (!g[tag]) g[tag] = [];
    g[tag].push(ep);
    return g;
  }, {} as Record<string, Endpoint[]>);

  const groupedTests = tests.reduce((g, test) => {
    const path = test.endpointPath?.split(" ")[1]?.trim();
    const tag = path?.split("/")[1]?.split("?")[0] || "Général";
    if (!g[tag]) g[tag] = [];
    g[tag].push(test);
    return g;
  }, {} as Record<string, Test[]>);

  const testsByEndpoint = tests.reduce((map, test) => {
    if (!map[test.endpointId]) map[test.endpointId] = [];
    map[test.endpointId].push(test);
    return map;
  }, {} as Record<string, Test[]>);

  const endpointsWithTests = endpoints.filter((ep) => (testsByEndpoint[ep.id]?.length ?? 0) > 0);

  let totalTestsCount = 0;
  endpointsWithTests.forEach(ep => {
    const epTests = testsByEndpoint[ep.id] || [];
    epTests.forEach(test => {
      TEST_SECTIONS.forEach(({ key }) => {
        try { if ((test as any)[key]) totalTestsCount++; } catch {}
      });
    });
  });

  // ── States chargement / erreur ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-surface"><Navbar /><div className="flex"><Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center min-h-screen">
          <ArrowPathIcon className="w-10 h-10 text-primary animate-spin" />
        </main></div></div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-surface"><Navbar /><div className="flex"><Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium mb-4">{error || "Projet non trouvé"}</p>
            <Button onClick={() => navigate("/projects")} variant="outline">Retour aux projets</Button>
          </div>
        </main></div></div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 md:p-12 max-w-7xl mx-auto w-full">

          {/* ════════════════════════ EN-TÊTE ════════════════════════ */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="space-y-2">
              <nav className="flex items-center gap-2 text-sm text-on-surface-variant font-medium">
                <button onClick={() => navigate("/projects")} className="hover:text-primary transition-colors">Projets</button>
                <span>/</span>
                <span className="text-primary font-bold">{project.name}</span>
              </nav>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">{project.name}</h2>
                <Badge variant="info">{project.docMode}</Badge>
                <Badge variant="default">{project.authType}</Badge>
              </div>
              <p className="text-on-surface-variant max-w-2xl">{project.description}</p>
              <p className="text-xs font-mono text-on-surface-variant">{project.projectUrl}</p>
              {userRole === "DEVELOPER" && managerEmail && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 space-y-1">
                  <p><span className="font-semibold">Partagé par :</span> {managerEmail}</p>
                  <p><span className="font-semibold">Accès :</span> {accessLevel === "READ_WRITE" ? "Lecture / Écriture" : "Lecture seule"}</p>
                  {sharedAt && <p><span className="font-semibold">Depuis le :</span> {new Date(sharedAt).toLocaleDateString("fr-FR")}</p>}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {canShare && (
                <>
                  <Button variant="outline" size="sm" icon={<UsersIcon className="w-4 h-4" />} onClick={() => navigate(`/service/${id}/shares`)}>Gérer partages</Button>
                  <Button variant="outline" size="sm" icon={<ShareIcon className="w-4 h-4" />} onClick={() => setShowShareModal(true)}>Partager</Button>
                </>
              )}
              {canEdit   && <Button variant="outline" size="sm" icon={<PencilSquareIcon className="w-4 h-4" />}>Éditer</Button>}
              {canDelete && <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" icon={<TrashIcon className="w-4 h-4" />} onClick={handleDeleteProject}>Supprimer</Button>}
              {canExecuteTests && <Button icon={<PlayIcon className="w-5 h-5" />} onClick={() => setActiveTab("execution")}>Exécuter Tests</Button>}
            </div>
          </div>

          {/* ════════════════════════ ONGLETS ════════════════════════ */}
          <div className="border-b border-outline-variant/30 mb-8">
            <nav className="flex space-x-1 overflow-x-auto">
              <TabItem active={activeTab==="endpoints"} label="Endpoints"  icon={<ListBulletIcon className="w-4 h-4"/>}             onClick={() => setActiveTab("endpoints")} />
              <TabItem active={activeTab==="tests"}     label="Tests"       icon={<BeakerIcon className="w-4 h-4"/>}                 onClick={() => setActiveTab("tests")} />
              <TabItem active={activeTab==="execution"} label="Exécution"   icon={<PlayIcon className="w-4 h-4"/>}                   onClick={() => setActiveTab("execution")} disabled={!canExecuteTests} />
              <TabItem active={activeTab==="history"}   label="Historique"  icon={<ClockIcon className="w-4 h-4"/>}                  onClick={() => setActiveTab("history")} />
              <TabItem active={activeTab==="reports"}   label="Rapports"    icon={<PresentationChartLineIcon className="w-4 h-4"/>}  onClick={() => setActiveTab("reports")} />
              <TabItem active={activeTab==="settings"}  label="Paramètres"  icon={<CogIcon className="w-4 h-4"/>}                   onClick={() => setActiveTab("settings")} />
            </nav>
          </div>

          {/* ════════════════════════════════════════════════════════════
              ONGLET : ENDPOINTS
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "endpoints" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-9 space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">Endpoints détectés ({endpointsCount})</h3>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      {endpoints.filter(e => e.discoveryType==="SWAGGER").length} depuis Swagger
                      {" · "}
                      {endpoints.filter(e => e.discoveryType==="MANUAL").length} manuels
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {endpoints.length > 0 && canGenerateTests && (
                      <GenerateButton
                        loading={generatingKeys.has("all")}
                        onClick={() => handleGenerateTests(endpoints, "all")}
                        label="Générer tous les tests"
                        icon={<ClipboardDocumentCheckIcon className="w-4 h-4" />}
                      />
                    )}
                    {canRescan && (
                      <Button variant="outline" size="sm" loading={rescanning}
                        icon={!rescanning ? <ArrowPathIcon className="w-4 h-4"/> : undefined}
                        onClick={handleRescanEndpoints}>
                        {rescanning ? "Rescan…" : "Rescanner"}
                      </Button>
                    )}
                  </div>
                </div>

                {endpoints.length === 0 ? (
                  <EmptyState icon={<ListBulletIcon className="w-12 h-12"/>} title="Aucun endpoint trouvé"
                    description={project.docMode === "SWAGGER" ? "Le scan Swagger n'a détecté aucun endpoint." : "Ajoutez des endpoints manuellement."} />
                ) : (
                  Object.entries(groupedEndpoints).map(([tag, eps]) => (
                    <div key={tag} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <FolderOpenIcon className="w-4 h-4"/>
                          <h3 className="font-bold">{tag}</h3>
                          <span className="text-xs font-mono">({eps.length})</span>
                        </div>
                        {canGenerateTests && (
                          <GenerateButton loading={generatingKeys.has(`group-${tag}`)}
                            onClick={() => handleGenerateTests(eps, `group-${tag}`)}
                            label="Générer ce groupe" size="xs" />
                        )}
                      </div>
                      <div className="space-y-2">
                        {eps.map(ep => (
                          <EndpointAccordion key={ep.id} endpoint={ep}
                            isExpanded={expandedEndpointId === ep.id}
                            onToggle={() => setExpandedEndpointId(p => p === ep.id ? null : ep.id)}
                            canGenerateTests={canGenerateTests}
                            generating={generatingKeys.has(ep.id)}
                            onGenerate={() => handleGenerateTests([ep], ep.id)}
                            hasTests={!!(testsByEndpoint[ep.id]?.length)}
                            testCount={testsByEndpoint[ep.id]?.length ?? 0}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Side panel */}
              <div className="lg:col-span-3 space-y-6">
                {userRole === "DEVELOPER" && (
                  <div className="bg-surface-container-highest/30 rounded-xl p-5 border border-outline-variant/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-sm">Niveau d'accès</h3>
                      <ShieldCheckIcon className="w-5 h-5 text-primary"/>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-outline-variant/10 mb-3">
                      <p className="text-[10px] uppercase font-bold text-primary mb-1">Developer</p>
                      <p className="text-sm font-semibold">{accessLevel ?? "READ_ONLY"}</p>
                    </div>
                    <ul className="space-y-2 text-xs text-on-surface-variant">
                      <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-500"/>Consulter les endpoints</li>
                      {accessLevel === "READ_WRITE" && <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-500"/>Générer des tests</li>}
                      <li className="flex items-center gap-2"><XCircleIcon className="w-4 h-4 text-slate-300"/>Modifier le service</li>
                    </ul>
                  </div>
                )}
                <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
                  <h3 className="font-bold mb-4">Overall Health</h3>
                  <div className="flex items-center justify-center py-4">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="8" className="text-surface-container-high"/>
                        <circle cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeDasharray="264" strokeDashoffset="21" strokeWidth="8" className="text-primary"/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">92%</span>
                        <span className="text-[10px] uppercase text-on-surface-variant">Passing</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-on-surface-variant">Tests actifs</span><span className="font-bold">48 / 52</span></div>
                    <div className="h-1.5 bg-surface-container rounded-full overflow-hidden"><div className="bg-primary h-full w-[92%]"/></div>
                  </div>
                </div>
                <div className="bg-surface-container-highest/40 p-5 rounded-2xl border border-primary/5">
                  <h4 className="font-bold text-sm mb-4">Upcoming Audits</h4>
                  <div className="space-y-3">
                    {[
                      { icon: <ShieldCheckIcon className="w-5 h-5"/>, title: "Security Pass",  sub: "In 2 days", cls: "bg-orange-50 text-orange-600" },
                      { icon: <CalendarIcon    className="w-5 h-5"/>, title: "Compliance API", sub: "In 5 days", cls: "bg-blue-50   text-blue-600"   },
                    ].map(a => (
                      <div key={a.title} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.cls}`}>{a.icon}</div>
                          <div><p className="text-xs font-bold">{a.title}</p><p className="text-[10px] text-on-surface-variant">{a.sub}</p></div>
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-slate-300"/>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ONGLET : TESTS
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "tests" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold">Tests générés ({tests.length})</h3>
                {endpoints.length > 0 && canGenerateTests && (
                  <GenerateButton loading={generatingKeys.has("all")}
                    onClick={() => handleGenerateTests(endpoints, "all")}
                    label="Regénérer tous les tests"
                    icon={<ClipboardDocumentCheckIcon className="w-4 h-4"/>}/>
                )}
              </div>
              {tests.length === 0 ? (
                <EmptyState icon={<BeakerIcon className="w-12 h-12"/>} title="Aucun test disponible" description="Générez des tests depuis l'onglet Endpoints."/>
              ) : (
                Object.entries(groupedTests).map(([tag, gTests]) => (
                  <div key={tag} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <NewspaperIcon className="w-4 h-4"/>
                        <h3 className="font-bold">{tag}</h3>
                        <span className="text-xs font-mono">({gTests.length})</span>
                      </div>
                      {canGenerateTests && (
                        <GenerateButton loading={generatingKeys.has(`test-group-${tag}`)}
                          onClick={() => handleRegenerateTests(gTests.map(t => t.id), `test-group-${tag}`)}
                          label="Regénérer ce groupe" size="xs"/>
                      )}
                    </div>
                    <div className="space-y-2">
                      {gTests.map(test => (
                        <TestAccordion key={test.id} test={test}
                          isExpanded={expandedTestId === test.id}
                          onToggle={() => setExpandedTestId(p => p === test.id ? null : test.id)}
                          canRegenerateTests={canGenerateTests}
                          generating={generatingKeys.has(`test-single-${test.id}`)}
                          onRegenerate={() => handleRegenerateTests([test.id], `test-single-${test.id}`)}
                          refreshTests={refreshTests}
                          addToast={addToast}/>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ONGLET : EXÉCUTION AVEC TERMINAL
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "execution" && (
            <div className="space-y-8">
              {/* Header avec stats */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Console d'exécution</h3>
                    <p className="text-sm text-slate-600">
                      Exécutez l'ensemble des tests de votre projet et suivez la progression en temps réel
                    </p>
                  </div>
                  <BoltIcon className="w-10 h-10 text-indigo-500" />
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 border border-indigo-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Endpoints avec tests</p>
                    <p className="text-3xl font-bold text-indigo-600">{endpointsWithTests.length}</p>
                    <p className="text-xs text-slate-500 mt-1">sur {endpoints.length} total</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tests disponibles</p>
                    <p className="text-3xl font-bold text-emerald-600">{totalTestsCount}</p>
                    <p className="text-xs text-slate-500 mt-1">prêts à être exécutés</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Statut</p>
                    <div className="flex items-center gap-2 mt-2">
                      {isExecuting ? (
                        <>
                          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-sm font-semibold text-green-600">En cours</span>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 rounded-full bg-slate-300" />
                          <span className="text-sm font-semibold text-slate-600">Prêt</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bouton d'exécution */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleExecuteAllProject}
                    disabled={isExecuting || endpointsWithTests.length === 0}
                    className={`flex items-center gap-3 px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg
                      ${isExecuting || endpointsWithTests.length === 0
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:scale-95"
                      }`}
                  >
                    {isExecuting ? (
                      <>
                        <ArrowPathIcon className="w-6 h-6 animate-spin" />
                        Exécution en cours...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-6 h-6" />
                        Exécuter tout le projet ({totalTestsCount} tests)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Terminal d'exécution */}
              <ExecutionTerminal
                logs={executionLogs}
                isRunning={isExecuting}
                onStop={handleStopExecution}
              />

              {/* Liste des endpoints avec tests (informative) */}
              {endpointsWithTests.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-bold">Endpoints à tester</h4>
                  <div className="space-y-2">
                    {endpointsWithTests.map(ep => {
                      const epTests = testsByEndpoint[ep.id] || [];
                      let testsCount = 0;
                      epTests.forEach(test => {
                        TEST_SECTIONS.forEach(({ key }) => {
                          try { if ((test as any)[key]) testsCount++; } catch {}
                        });
                      });
                      const methodColor = METHOD_COLORS[ep.method] ?? "bg-surface-container-high text-on-surface-variant";

                      return (
                        <div key={ep.id} className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center ${methodColor}`}>
                                {ep.method}
                              </span>
                              <div>
                                <p className="font-mono text-sm font-semibold">{ep.path}</p>
                                <p className="text-xs text-on-surface-variant">{ep.description || "Aucune description"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full">
                                {testsCount} test{testsCount > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message si aucun test */}
              {endpointsWithTests.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">Aucun test à exécuter</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Générez d'abord des tests depuis l'onglet Endpoints ou Tests.
                    </p>
                    <button
                      onClick={() => setActiveTab("endpoints")}
                      className="mt-3 text-sm font-semibold text-amber-800 underline underline-offset-2"
                    >
                      Aller aux endpoints →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ONGLET : HISTORIQUE
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Historique des exécutions</h3>
              {loadingHistory ? (
                <div className="flex justify-center p-12"><ArrowPathIcon className="w-8 h-8 text-primary animate-spin"/></div>
              ) : executions.length === 0 ? (
                <EmptyState icon={<ClockIcon className="w-12 h-12"/>} title="Aucune exécution" description="Exécutez vos tests pour voir l'historique ici."/>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    {executions.map(exec => (
                      <div key={exec.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all
                          ${selectedExecution?.id === exec.id ? "border-primary bg-primary/5 shadow-sm" : "border-outline-variant/20 hover:bg-surface-container-low"}`}
                        onClick={() => { setSelectedExecution(exec); loadTestExecutions(exec.id); }}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-bold">{new Date(exec.executedAt).toLocaleDateString("fr-FR")}</p>
                            <p className="text-xs text-on-surface-variant">{new Date(exec.executedAt).toLocaleTimeString("fr-FR")}</p>
                          </div>
                          <Badge variant={exec.status==="COMPLETED"?"success":exec.status==="RUNNING"?"warning":"danger"}>{exec.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div><p className="font-bold text-green-600">{exec.testsPassed}</p><p className="text-on-surface-variant">Réussis</p></div>
                          <div><p className="font-bold text-red-600">{exec.testsFailed}</p><p className="text-on-surface-variant">Échoués</p></div>
                          <div><p className="font-bold">{exec.successRate?.toFixed(0) ?? 0}%</p><p className="text-on-surface-variant">Taux</p></div>
                        </div>
                        {exec.totalDurationMs && <p className="text-xs text-on-surface-variant mt-2">Durée : {(exec.totalDurationMs/1000).toFixed(2)}s</p>}
                      </div>
                    ))}
                  </div>
                  <div className="lg:col-span-2 space-y-5">
                    {selectedExecution && (
                      <>
                        <Card title="Statistiques">
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4}
                                  data={[
                                    {name:"Réussis",value:selectedExecution.testsPassed},
                                    {name:"Échoués",value:selectedExecution.testsFailed},
                                    {name:"Erreurs", value:selectedExecution.testsError},
                                  ]}>
                                  <Cell fill="#22c55e"/><Cell fill="#ef4444"/><Cell fill="#f59e0b"/>
                                </Pie>
                                <Tooltip/>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center gap-6 text-xs mt-2">
                            {[
                              {label:"Réussis",count:selectedExecution.testsPassed,color:"bg-green-500"},
                              {label:"Échoués",count:selectedExecution.testsFailed,color:"bg-red-500"},
                              {label:"Erreurs", count:selectedExecution.testsError, color:"bg-amber-500"},
                            ].map(d => (
                              <div key={d.label} className="flex items-center gap-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${d.color}`}/>
                                <span>{d.label} ({d.count})</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                        <Card title="Détail des tests">
                          {testExecutions.length === 0 ? (
                            <p className="text-center text-on-surface-variant p-6 text-sm">Aucun test exécuté.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-surface-container-high text-xs text-on-surface-variant uppercase">
                                  <tr>{["Endpoint","Méthode","Type","Statut","Attendu","Reçu","Temps"].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                  {testExecutions.map(te => (
                                    <tr key={te.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low">
                                      <td className="px-3 py-2 font-mono text-xs truncate max-w-[140px]">{te.endpointPath}</td>
                                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${METHOD_COLORS[te.httpMethod]??""}`}>{te.httpMethod}</span></td>
                                      <td className="px-3 py-2 text-xs">{te.testType}</td>
                                      <td className="px-3 py-2"><Badge variant={te.status==="SUCCESS"?"success":te.status==="FAILED"?"danger":"warning"}>{te.status}</Badge></td>
                                      <td className="px-3 py-2 text-center">{te.expectedStatusCode}</td>
                                      <td className="px-3 py-2 text-center font-bold font-mono" style={{color:te.statusCodeMatch?"#22c55e":"#ef4444"}}>{te.responseStatusCode}</td>
                                      <td className="px-3 py-2 text-xs text-on-surface-variant">{te.responseTimeMs}ms</td>
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

          {/* ════════════════════════════════════════════════════════════
              ONGLET : RAPPORTS
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card title="Répartition des résultats">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={PIE_DATA} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {PIE_DATA.map((entry,i) => <Cell key={i} fill={entry.color}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 text-sm mt-2">
                    {PIE_DATA.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor:d.color}}/>
                        <span>{d.name} ({d.value}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card title="Historique de succès" footer={<Button variant="outline" className="w-full" icon={<DocumentArrowDownIcon className="w-4 h-4"/>}>Exporter rapport PDF</Button>}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{name:"Lun",success:90},{name:"Mar",success:92},{name:"Mer",success:85},{name:"Jeu",success:95},{name:"Ven",success:98}]}>
                      <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/>
                      <Line type="monotone" dataKey="success" stroke="#6366f1" strokeWidth={2.5} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ONGLET : PARAMÈTRES
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <div className="max-w-2xl space-y-6">
              <Card title="Informations du projet">
                <div className="space-y-4">
                  {[{label:"Nom",value:project.name},{label:"URL",value:project.projectUrl},{label:"Mode doc",value:project.docMode},{label:"Auth",value:project.authType}].map(({label,value}) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{label}</label>
                      <input type="text" value={value} disabled className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-surface-container-low"/>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Description</label>
                    <textarea rows={3} value={project.description} disabled className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-surface-container-low"/>
                  </div>
                </div>
              </Card>
              <Card title="Configuration Jenkins">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded" defaultChecked/>
                    <span className="text-sm">Activer le déclenchement automatique</span>
                  </label>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Fréquence (cron)</label>
                    <input type="text" defaultValue="0 0 * * *" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm"/>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </main>
      </div>

      {/* ════════════════════════ PORTAILS ════════════════════════ */}
      <ConfirmModal
        open={confirmModal.open} title={confirmModal.title} message={confirmModal.message}
        variant={confirmModal.variant} confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm} onCancel={closeConfirm}/>

      {showShareModal && project && (
        <ShareProjectModal projectId={id!} projectName={project.name}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => { loadProjectData(); setShowShareModal(false); }}/>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast}/>

      {/* Custom scrollbar style */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

const EndpointAccordion: React.FC<{
  endpoint: Endpoint;
  isExpanded: boolean;
  onToggle: () => void;
  canGenerateTests: boolean;
  generating: boolean;
  onGenerate: () => void;
  hasTests: boolean;
  testCount: number;
}> = ({ endpoint, isExpanded, onToggle, canGenerateTests, generating, onGenerate, hasTests, testCount }) => {
  const methodColor = METHOD_COLORS[endpoint.method] ?? "bg-surface-container-high text-on-surface-variant";
  let parameters: any[] = [];
  let requestBodyParsed = null, responseBodyParsed = null;
  try { if (endpoint.parameters) parameters = JSON.parse(endpoint.parameters); } catch {}
  try { if (endpoint.requestBody)  requestBodyParsed  = JSON.parse(endpoint.requestBody);  } catch {}
  try { if (endpoint.responseBody) responseBodyParsed = JSON.parse(endpoint.responseBody); } catch {}

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container-low transition-colors group">
        <div className="flex items-center gap-4 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center ${methodColor}`}>{endpoint.method}</span>
          <div className="text-left">
            <p className="font-mono text-sm text-on-surface">{endpoint.path}</p>
            <p className="text-xs text-on-surface-variant">{endpoint.description || "Aucune description"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasTests && (
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {testCount} test{testCount>1?"s":""}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
            <span className="text-xs text-on-surface-variant">Active</span>
          </div>
          <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">
            {isExpanded?"unfold_less":"unfold_more"}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 py-6 border-t border-outline-variant/10 space-y-6">
          {parameters.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <CodeBracketIcon className="w-4 h-4"/> Paramètres
              </h4>
              <div className="overflow-x-auto border border-outline-variant/20 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-high text-[10px] text-on-surface-variant uppercase">
                    <tr>{["Nom","Emplacement","Requis","Type","Description"].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {parameters.map((p,i)=>(
                      <tr key={i}>
                        <td className="px-4 py-2 font-mono">{p.name??p.$ref??"?"}</td>
                        <td className="px-4 py-2">{p.in??"-"}</td>
                        <td className="px-4 py-2">{p.required?"Oui":"Non"}</td>
                        <td className="px-4 py-2">{p.type??p.schema?.type??"object"}</td>
                        <td className="px-4 py-2 text-on-surface-variant">{p.description??"-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {requestBodyParsed && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Corps requête</h4>
              <pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-64">{JSON.stringify(requestBodyParsed,null,2)}</pre>
            </div>
          )}
          {responseBodyParsed && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Corps réponse</h4>
              <pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-64">{JSON.stringify(responseBodyParsed,null,2)}</pre>
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Codes de statut</h4>
              <div className="flex flex-wrap gap-1">
                {endpoint.statusCodes?.split(",").map(code=>(
                  <Badge key={code} variant={code.trim().startsWith("2")?"success":code.trim().startsWith("4")?"warning":"danger"}>{code.trim()}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Auth requise</h4>
              <Badge variant={endpoint.requiresAuth?"warning":"default"}>{endpoint.requiresAuth?"Oui":"Non"}</Badge>
            </div>
          </div>
          <GenerateButton
            loading={generating} onClick={onGenerate} disabled={!canGenerateTests} fullWidth
            label={hasTests?"Régénérer les tests":"Générer les tests"}
            icon={hasTests?<ArrowPathIcon className="w-3.5 h-3.5"/>:<SparklesIcon className="w-3.5 h-3.5"/>}
          />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

const TestAccordion: React.FC<{
  test: Test;
  isExpanded: boolean;
  onToggle: () => void;
  canRegenerateTests: boolean;
  generating: boolean;
  onRegenerate: () => void;
  refreshTests: () => void;
  addToast: (type: ToastItem["type"], message: string) => void;
}> = ({ test, isExpanded, onToggle, canRegenerateTests, generating, onRegenerate, refreshTests, addToast }) => {
  const method = test.endpointPath.split(" ")[0];
  const methodColor = METHOD_COLORS[method] ?? "bg-surface-container-high text-on-surface-variant";
  const [editMode, setEditMode] = useState(false);
  const [rawTestData, setRawTestData] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  const testDataParsed: Record<string,any> = {};
  TEST_SECTIONS.forEach(({key}) => {
    try { const v=(test as any)[key]; if(v) testDataParsed[key]=typeof v==="string"?JSON.parse(v):v; } catch {}
  });

  const handleSave = async () => {
    const parsedData: Record<string,any> = {};
    for (const key in rawTestData) {
      try { parsedData[key] = JSON.parse(rawTestData[key]); }
      catch { addToast("error",`JSON invalide dans "${TEST_SECTIONS.find(s=>s.key===key)?.label??key}"`); return; }
    }
    try {
      setSaving(true);
      await testService.update({ ...test, ...parsedData } as Test);
      await refreshTests();
      setRawTestData({}); setEditMode(false);
      addToast("success","Tests mis à jour avec succès.");
    } catch { addToast("error","Erreur lors de la sauvegarde."); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container-low transition-colors group">
        <div className="flex items-center gap-4 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center ${methodColor}`}>{method}</span>
          <p className="font-mono text-sm text-on-surface">{test.endpointPath}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-1">
            {TEST_SECTIONS.filter(({key})=>testDataParsed[key]).map(({key,label})=>(
              <span key={key} className="px-1.5 py-0.5 rounded bg-surface-container text-[9px] font-bold text-on-surface-variant">
                {label.split(" ").slice(1).join(" ") || label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
            <span className="text-xs text-on-surface-variant">Active</span>
          </div>
          <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">
            {isExpanded?"unfold_less":"unfold_more"}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 py-6 border-t border-outline-variant/10 space-y-5">
          {TEST_SECTIONS.map(({key,label}) => testDataParsed[key] ? (
            <div key={key}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <CodeBracketIcon className="w-4 h-4"/> {label}
              </h4>
              {editMode ? (
                <textarea
                  value={rawTestData[key]!==undefined ? rawTestData[key] : JSON.stringify(testDataParsed[key],null,2)}
                  rows={13}
                  onChange={e=>setRawTestData(prev=>({...prev,[key]:e.target.value}))}
                  className="w-full p-4 bg-inverse-surface text-on-primary-container font-mono text-xs rounded-xl border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              ) : (
                <pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-96 whitespace-pre-wrap break-words">
                  {JSON.stringify(testDataParsed[key],null,2)}
                </pre>
              )}
            </div>
          ) : null)}

          <div className="grid grid-cols-2 gap-3 pt-2">
            {editMode ? (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-60">
                {saving ? <><ArrowPathIcon className="w-3.5 h-3.5 animate-spin"/>Sauvegarde…</> : "Enregistrer"}
              </button>
            ) : (
              <button onClick={() => setEditMode(true)}
                className="py-2 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                Modifier le test
              </button>
            )}
            <GenerateButton loading={generating} onClick={onRegenerate} disabled={!canRegenerateTests} label="Regénérer" size="xs"/>
          </div>

          {editMode && (
            <button onClick={() => { setEditMode(false); setRawTestData({}); }}
              className="w-full py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors">
              Annuler les modifications
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceDetailsPage;