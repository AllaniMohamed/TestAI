import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { saveAs } from "file-saver";
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
  apiRunnerService,
  type ProjectExecution,
  type TestExecution,
  type ApiResponseDTO,
  type UpdateProjectRequest,
  userService,
} from "../services/api";
import ShareProjectModal from "../components/modals/ShareProjectModal";
import {
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
  ChevronDownIcon,
  ChevronUpIcon,
  RocketLaunchIcon,
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

interface ProjectCredentials {
  basicUsername?: string;
  basicPassword?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  apiKeyLocation?: string;
  bearerToken?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  projectUrl: string;
  docMode: string;
  docUrl?: string;
  authType: string;
  createdAt: string;
  userId: string;
  credentials?: ProjectCredentials;
}

interface LocationState {
  managerEmail?: string;
  accessLevel?: "READ_ONLY" | "READ_WRITE";
  sharedAt?: string;
}

type TabId =
  | "endpoints"
  | "tests"
  | "execution"
  | "history"
  | "reports"
  | "settings";

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

interface ProjectReportStats {
  name: string;
  value: number;
  color: string;
}

// ─── MAGIC EXECUTION TYPES ───────────────────────────────────────────────────

type MagicStep = "idle" | "generating" | "executing" | "done" | "error";

interface MagicStepInfo {
  label: string;
  sublabel: string;
  status: "waiting" | "running" | "done" | "error";
  percent: number;
  detail?: string;
}

interface MagicExecutionState {
  phase: MagicStep;
  minimized: boolean;
  visible: boolean;
  steps: MagicStepInfo[];
  result?: {
    passed: number;
    failed: number;
    errors: number;
    rate: number;
    duration: number;
  };
  error?: string;
  startTime?: number;
  estimatedGenerationMs?: number;
  estimatedExecutionMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

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
  { key: "positive", label: "Positive Test" },
  { key: "validation", label: "Validation Test" },
  { key: "boundary", label: "Boundary Test" },
  { key: "wrongType", label: "Wrong Type Test" },
  { key: "missingFields", label: "Missing Fields Test" },
  { key: "auth", label: "Security Test" },
];

const MAGIC_STYLES = `
  @keyframes magicFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-6px) rotate(-1deg); }
    75% { transform: translateY(-3px) rotate(1deg); }
  }
  @keyframes magicGlow {
    0%, 100% { box-shadow: 0 0 20px 4px rgba(139,92,246,0.4), 0 0 40px 8px rgba(59,130,246,0.2), 0 8px 32px rgba(0,0,0,0.3); }
    50% { box-shadow: 0 0 30px 8px rgba(139,92,246,0.6), 0 0 60px 16px rgba(59,130,246,0.3), 0 8px 32px rgba(0,0,0,0.3); }
  }
  @keyframes magicShimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes orbPulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }
  @keyframes progressSlide {
    0% { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes panelSlideIn {
    from { transform: translateY(24px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes stepDone {
    0% { transform: scale(0.5); opacity: 0; }
    70% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }
  .magic-float { animation: magicFloat 3s ease-in-out infinite; }
  .magic-glow  { animation: magicGlow 2s ease-in-out infinite; }
  .magic-panel { animation: panelSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  .step-done-icon { animation: stepDone 0.4s cubic-bezier(0.34,1.56,0.64,1); }
  .magic-shimmer-text {
    background: linear-gradient(90deg, #c084fc, #818cf8, #38bdf8, #818cf8, #c084fc);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: magicShimmer 2.5s linear infinite;
  }
  .progress-animated {
    background: linear-gradient(90deg, #7c3aed, #6366f1, #3b82f6, #6366f1, #7c3aed);
    background-size: 200% auto;
    animation: progressSlide 1.5s linear infinite;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// MAGIC FLOATING BUTTON
// ─────────────────────────────────────────────────────────────────────────────

const MagicFloatingButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  endpointCount: number;
}> = ({ onClick, disabled, endpointCount }) => (
  <>
    <style>{MAGIC_STYLES}</style>
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
      {/* Tooltip */}
      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-white/10">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {endpointCount} endpoint{endpointCount !== 1 ? "s" : ""} ready
      </div>

      <button
        onClick={onClick}
        disabled={disabled}
        className="magic-float magic-glow relative group flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-bold text-sm select-none transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 40%, #3b82f6 100%)",
        }}
      >
        {/* Orbs */}
        <span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-300"
          style={{ animation: "orbPulse 1.8s ease-in-out infinite" }}
        />
        <span
          className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-pink-400"
          style={{ animation: "orbPulse 2.2s ease-in-out infinite 0.4s" }}
        />
        <span
          className="absolute top-1 left-2 w-1.5 h-1.5 rounded-full bg-cyan-300"
          style={{ animation: "orbPulse 1.6s ease-in-out infinite 0.8s" }}
        />

        {/* Icon */}
        <span className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
          <RocketLaunchIcon className="w-4 h-4" />
        </span>

        {/* Label */}
        <span className="flex flex-col leading-tight">
          <span className="text-white/70 text-[10px] font-normal uppercase tracking-widest">
            One-click
          </span>
          <span className="magic-shimmer-text text-sm font-black tracking-tight">
            Auto Pilot ✦
          </span>
        </span>
      </button>
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAGIC PROGRESS PANEL  (Drive-style fixed panel)
// ─────────────────────────────────────────────────────────────────────────────

const MagicProgressPanel: React.FC<{
  state: MagicExecutionState;
  onMinimize: () => void;
  onClose: () => void;
}> = ({ state, onMinimize, onClose }) => {
  const { phase, minimized, steps, result, error } = state;

  const overallPercent =
    phase === "done"
      ? 100
      : phase === "error"
      ? 100
      : phase === "generating"
      ? Math.round((steps[0]?.percent ?? 0) / 2)
      : phase === "executing"
      ? 50 + Math.round((steps[1]?.percent ?? 0) / 2)
      : 0;

  const panelBorderColor =
    phase === "done"
      ? "border-emerald-500/40"
      : phase === "error"
      ? "border-red-500/40"
      : "border-violet-500/40";

  return (
    <>
      <style>{MAGIC_STYLES}</style>
      <div
        className={`magic-panel fixed bottom-6 right-6 z-[60] w-80 rounded-2xl shadow-2xl border backdrop-blur-xl overflow-hidden ${panelBorderColor}`}
        style={{ background: "rgba(15,15,25,0.95)" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(99,102,241,0.2) 50%, rgba(59,130,246,0.2) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
          onClick={onMinimize}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed, #6366f1)",
              }}
            >
              <RocketLaunchIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold">Auto Pilot</p>
              <p className="text-[10px] text-slate-400">
                {phase === "done"
                  ? "Completed ✓"
                  : phase === "error"
                  ? "Failed"
                  : phase === "generating"
                  ? "Generating tests…"
                  : phase === "executing"
                  ? "Executing tests…"
                  : "Starting…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onMinimize(); }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            >
              {minimized ? (
                <ChevronUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              )}
            </button>
            {(phase === "done" || phase === "error") && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Overall progress bar (always visible) ── */}
        <div className="px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Overall progress
            </span>
            <span className="text-[10px] font-bold text-violet-400">{overallPercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                phase === "done"
                  ? "bg-emerald-500"
                  : phase === "error"
                  ? "bg-red-500"
                  : "progress-animated"
              }`}
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>

        {/* ── Expanded body ── */}
        {!minimized && (
          <div className="px-4 py-4 space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  {/* Step icon */}
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {step.status === "done" ? (
                      <CheckCircleIcon className="step-done-icon w-5 h-5 text-emerald-400" />
                    ) : step.status === "error" ? (
                      <XCircleIcon className="w-5 h-5 text-red-400" />
                    ) : step.status === "running" ? (
                      <ArrowPathIcon className="w-4 h-4 text-violet-400 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          step.status === "done"
                            ? "text-emerald-400"
                            : step.status === "error"
                            ? "text-red-400"
                            : step.status === "running"
                            ? "text-white"
                            : "text-slate-500"
                        }`}
                      >
                        {step.label}
                      </span>
                      {step.status === "running" && (
                        <span className="text-[10px] text-violet-400 font-bold flex-shrink-0 ml-2">
                          {step.percent}%
                        </span>
                      )}
                      {step.status === "done" && (
                        <span className="text-[10px] text-emerald-400 font-bold flex-shrink-0 ml-2">
                          Done
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {step.sublabel}
                    </p>
                  </div>
                </div>

                {/* Step progress bar */}
                {step.status !== "waiting" && (
                  <div className="ml-7 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        step.status === "done"
                          ? "bg-emerald-500"
                          : step.status === "error"
                          ? "bg-red-500"
                          : "progress-animated"
                      }`}
                      style={{
                        width:
                          step.status === "done" || step.status === "error"
                            ? "100%"
                            : `${step.percent}%`,
                      }}
                    />
                  </div>
                )}

                {step.detail && step.status !== "waiting" && (
                  <p className="ml-7 text-[10px] text-slate-500 italic">{step.detail}</p>
                )}
              </div>
            ))}

            {/* ── Result card ── */}
            {phase === "done" && result && (
              <div
                className="mt-2 rounded-xl p-3 space-y-2"
                style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,78,59,0.12))",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 text-xs font-bold">
                    Auto Pilot completed!
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-emerald-500/10 rounded-lg p-1.5">
                    <p className="text-emerald-300 font-bold text-sm">{result.passed}</p>
                    <p className="text-[10px] text-slate-500">Passed</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-1.5">
                    <p className="text-red-300 font-bold text-sm">{result.failed}</p>
                    <p className="text-[10px] text-slate-500">Failed</p>
                  </div>
                  <div className="bg-violet-500/10 rounded-lg p-1.5">
                    <p className="text-violet-300 font-bold text-sm">{result.rate.toFixed(0)}%</p>
                    <p className="text-[10px] text-slate-500">Rate</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 text-center">
                  Total duration: {(result.duration / 1000).toFixed(1)}s
                </p>
              </div>
            )}

            {/* ── Error card ── */}
            {phase === "error" && error && (
              <div
                className="mt-2 rounded-xl p-3"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <div className="flex items-start gap-2">
                  <XCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-[11px]">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MINI JSON VIEWER
// ─────────────────────────────────────────────────────────────────────────────

const MiniJsonViewer: React.FC<{ data: any; maxHeight?: string }> = ({
  data,
  maxHeight = "200px",
}) => {
  const normalize = (input: any): any => {
    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        return typeof parsed === "string" ? normalize(parsed) : parsed;
      } catch {
        return input;
      }
    }
    return input;
  };

  const formatted = (() => {
    try {
      return JSON.stringify(normalize(data), null, 2);
    } catch {
      return String(data);
    }
  })();

  const lines = formatted.split("\n");

  const highlight = (line: string): React.ReactNode => {
    const els: React.ReactNode[] = [];
    let i = 0;
    let k = 0;
    while (i < line.length) {
      if (line[i] === " ") {
        let j = i;
        while (j < line.length && line[j] === " ") j++;
        els.push(<span key={k++}>{line.substring(i, j)}</span>);
        i = j;
        continue;
      }
      if ("{}[],:".includes(line[i])) {
        els.push(<span key={k++} className="text-gray-400">{line[i]}</span>);
        i++;
        continue;
      }
      if (line[i] === '"') {
        let j = i + 1;
        let esc = false;
        while (j < line.length) {
          if (line[j] === "\\" && !esc) esc = true;
          else if (line[j] === '"' && !esc) break;
          else esc = false;
          j++;
        }
        const token = line.substring(i, j + 1);
        let isKey = false;
        let p = j + 1;
        while (p < line.length && line[p] === " ") p++;
        if (p < line.length && line[p] === ":") isKey = true;
        els.push(
          <span key={k++} className={isKey ? "text-purple-400" : "text-green-400"}>
            {token}
          </span>
        );
        i = j + 1;
        continue;
      }
      const numMatch = line.slice(i).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?\b/);
      const boolMatch = line.slice(i).match(/^(true|false|null)\b/);
      if (numMatch) {
        els.push(<span key={k++} className="text-orange-400">{numMatch[0]}</span>);
        i += numMatch[0].length;
        continue;
      }
      if (boolMatch) {
        els.push(<span key={k++} className="text-blue-400">{boolMatch[0]}</span>);
        i += boolMatch[0].length;
        continue;
      }
      els.push(<span key={k++}>{line[i]}</span>);
      i++;
    }
    return <>{els}</>;
  };

  return (
    <div
      className="w-full bg-[#0d1117] rounded-xl border border-slate-700 overflow-auto font-mono text-xs"
      style={{ maxHeight }}
    >
      <div className="flex">
        <div className="py-3 pl-3 pr-2 text-right select-none text-gray-600 border-r border-gray-700 min-w-[2.5rem]">
          {lines.map((_, idx) => (
            <div key={idx + 1} className="leading-5">{idx + 1}</div>
          ))}
        </div>
        <div className="p-3 pl-2 text-gray-300 leading-5">
          {lines.map((line, idx) => (
            <div key={idx} className="whitespace-pre">{highlight(line)}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QUICK EXECUTE MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface QuickExecuteModalProps {
  open: boolean;
  onClose: () => void;
  test: Test;
  sectionKey: string;
  sectionLabel: string;
  sectionData: any;
  project: Project;
  endpoint?: Endpoint;
}

const QuickExecuteModal: React.FC<QuickExecuteModalProps> = ({
  open,
  onClose,
  test,
  sectionKey,
  sectionLabel,
  sectionData,
  project,
  endpoint,
}) => {
  const [response, setResponse] = useState<ApiResponseDTO | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResponse(null);
      setError(null);
      setIsExecuting(false);
    }
  }, [open]);

  if (!open) return null;

  const inner = sectionData?.response ?? sectionData ?? {};
  const method = (() => {
    const parts = test.endpointPath?.split(" ");
    if (parts && parts.length >= 2) return parts[0];
    return endpoint?.method ?? "GET";
  })();
  const rawPath = (() => {
    const parts = test.endpointPath?.split(" ");
    if (parts && parts.length >= 2) return parts[1];
    return endpoint?.path ?? "/";
  })();

  const pathParams: Record<string, string> = inner.pathParams ?? {};
  const queryParams: Record<string, string> = inner.queryParams ?? {};
  const payload = inner.payload ?? inner.body ?? null;
  const testHeaders: Record<string, string> = inner.headers ?? {};
  const expectedStatus: number | undefined = inner.expectedStatus;
  const testName: string = inner.name ?? sectionLabel;

  let resolvedPath = rawPath;
  Object.entries(pathParams).forEach(([key, val]) => {
    resolvedPath = resolvedPath.replace(`{${key}}`, String(val));
    resolvedPath = resolvedPath.replace(`:${key}`, String(val));
  });
  const baseUrl = (project.projectUrl ?? "").replace(/\/$/, "");
  let fullUrl = baseUrl + resolvedPath;
  if (Object.keys(queryParams).length > 0) {
    fullUrl += "?" + new URLSearchParams(queryParams).toString();
  }

  const buildProjectAuthHeaders = (): Record<string, string> => {
    if (sectionKey === "auth") return {};
    const h: Record<string, string> = {};
    const creds = project.credentials;
    if (!creds) return h;
    switch (project.authType) {
      case "BASIC":
        if (creds.basicUsername && creds.basicPassword)
          h["Authorization"] = `Basic ${btoa(`${creds.basicUsername}:${creds.basicPassword}`)}`;
        break;
      case "BEARER":
        if (creds.bearerToken) h["Authorization"] = `Bearer ${creds.bearerToken}`;
        break;
      case "API_KEY":
        if (creds.apiKeyLocation === "HEADER" && creds.apiKeyHeader && creds.apiKey)
          h[creds.apiKeyHeader] = creds.apiKey;
        break;
    }
    return h;
  };

  const allRequestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildProjectAuthHeaders(),
    ...testHeaders,
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResponse(null);
    try {
      const res = await apiRunnerService.executeRequest({
        method,
        url: fullUrl,
        headers: allRequestHeaders,
        queryParams,
        requestBody:
          method !== "GET" && method !== "DELETE" && payload
            ? JSON.stringify(payload)
            : undefined,
        saveAfterExecution: false,
      });
      setResponse(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Execution error");
    } finally {
      setIsExecuting(false);
    }
  };

  const methodColor =
    METHOD_COLORS[method] ?? "bg-surface-container-high text-on-surface-variant";

  const isStatusMatch =
    response !== null && expectedStatus !== undefined
      ? response.status === expectedStatus
      : null;

  const CATEGORY_COLORS: Record<string, string> = {
    positive: "bg-emerald-100 text-emerald-700",
    validation: "bg-yellow-100 text-yellow-700",
    boundary: "bg-blue-100 text-blue-700",
    wrongType: "bg-orange-100 text-orange-700",
    missingFields: "bg-red-100 text-red-700",
    auth: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto z-10 max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shadow-sm">
              <BoltIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">Quick Execute</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    CATEGORY_COLORS[sectionKey] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {sectionLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-sm">{testName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/70 rounded-xl transition-colors flex-shrink-0">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1.5">
            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex-shrink-0 ${methodColor}`}>{method}</span>
            <p className="flex-1 font-mono text-sm text-slate-200 truncate px-1">{fullUrl}</p>
            {expectedStatus && (
              <span className="flex-shrink-0 px-2.5 py-1.5 bg-indigo-900 border border-indigo-700 text-indigo-200 font-mono text-xs font-bold rounded-lg">
                Expected: {expectedStatus}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Request</h4>
              {Object.keys(allRequestHeaders).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Headers</p>
                  <div className="bg-[#0d1117] rounded-xl p-3 font-mono text-xs space-y-1 border border-slate-700 max-h-28 overflow-auto">
                    {Object.entries(allRequestHeaders).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-purple-400">{k}</span>
                        <span className="text-gray-400">: </span>
                        <span className="text-green-400">
                          {k.toLowerCase() === "authorization" ? v.substring(0, 30) + (v.length > 30 ? "…" : "") : v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(pathParams).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Path Parameters</p>
                  <div className="bg-[#0d1117] rounded-xl p-3 font-mono text-xs space-y-1 border border-slate-700">
                    {Object.entries(pathParams).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-purple-400">{k}</span>
                        <span className="text-gray-400">: </span>
                        <span className="text-orange-400">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(queryParams).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Query Parameters</p>
                  <div className="bg-[#0d1117] rounded-xl p-3 font-mono text-xs space-y-1 border border-slate-700">
                    {Object.entries(queryParams).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-purple-400">{k}</span>
                        <span className="text-gray-400">: </span>
                        <span className="text-orange-400">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {payload ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Request Body</p>
                  <MiniJsonViewer data={payload} maxHeight="220px" />
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic px-1">No request body</div>
              )}
              {sectionKey === "auth" && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700">
                  <ShieldCheckIcon className="w-4 h-4 flex-shrink-0" />
                  Auth headers omitted — testing unauthenticated access
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Response</h4>
              {response !== null && expectedStatus !== undefined && (
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${isStatusMatch ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Expected</p>
                    <p className="font-mono font-black text-2xl text-slate-900">{expectedStatus}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isStatusMatch ? "bg-emerald-500" : "bg-red-500"}`}>
                      {isStatusMatch ? <CheckCircleIcon className="w-6 h-6 text-white" /> : <XCircleIcon className="w-6 h-6 text-white" />}
                    </div>
                    <span className={`text-[10px] font-bold ${isStatusMatch ? "text-emerald-600" : "text-red-600"}`}>
                      {isStatusMatch ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Received</p>
                    <p className={`font-mono font-black text-2xl ${isStatusMatch ? "text-emerald-600" : "text-red-600"}`}>
                      {response.status}
                    </p>
                  </div>
                </div>
              )}
              {response !== null && (
                <div className="flex items-center gap-4 text-xs">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold ${response.status >= 200 && response.status < 300 ? "bg-green-100 text-green-800" : response.status >= 400 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                    <span className={`w-2 h-2 rounded-full ${response.status >= 200 && response.status < 300 ? "bg-green-500" : "bg-red-500"}`} />
                    {response.status} {response.statusText}
                  </div>
                  <span className="text-slate-500"><span className="font-bold text-slate-700">{response.responseTimeMs}ms</span> · {response.size}</span>
                </div>
              )}
              {response !== null ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Response Body</p>
                  <MiniJsonViewer data={response.body} maxHeight="260px" />
                </div>
              ) : error ? (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                  <BoltIcon className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Click Execute to run this test</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">Target: <span className="font-mono text-slate-600">{project.projectUrl}</span></p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors">Close</button>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${isExecuting ? "bg-slate-300 text-slate-500 cursor-wait" : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:scale-95 shadow-indigo-200"}`}
            >
              {isExecuting ? (<><ArrowPathIcon className="w-4 h-4 animate-spin" />Executing…</>) : (<><BoltIcon className="w-4 h-4" />Execute</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const ToastContainer: React.FC<{ toasts: ToastItem[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <>
      <style>{`@keyframes toastIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none" style={{ marginRight: "336px" }}>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm bg-white" style={{ animation: "toastIn 0.22s ease-out", borderColor: t.type === "success" ? "#bbf7d0" : t.type === "error" ? "#fecaca" : "#bfdbfe" }}>
            {t.type === "success" && <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
            {t.type === "error" && <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
            {t.type === "info" && <SparklesIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />}
            <p className="text-sm font-medium text-slate-800 flex-1">{t.message}</p>
            <button onClick={() => onRemove(t.id)} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"><XMarkIcon className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMATION MODAL
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

const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, title, message, confirmLabel = "Confirm", variant = "primary", onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 z-10">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${variant === "danger" ? "bg-red-50" : "bg-indigo-50"}`}>
            {variant === "danger" ? <ExclamationTriangleIcon className="w-5 h-5 text-red-500" /> : <SparklesIcon className="w-5 h-5 text-indigo-500" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors ${variant === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE BUTTON
// ─────────────────────────────────────────────────────────────────────────────

const GenerateButton: React.FC<{ loading: boolean; onClick: () => void; disabled?: boolean; label: string; icon?: React.ReactNode; size?: "sm" | "xs"; fullWidth?: boolean }> = ({ loading, onClick, disabled, label, icon, size = "sm", fullWidth }) => (
  <button onClick={onClick} disabled={loading || disabled} className={`flex items-center justify-center gap-2 font-semibold border border-outline-variant/30 rounded-lg transition-all ${fullWidth ? "w-full" : ""} ${size === "sm" ? "px-3 py-2 text-sm" : "px-2.5 py-1.5 text-xs"} ${loading ? "bg-primary/5 text-primary border-primary/20 cursor-wait" : disabled ? "opacity-40 cursor-not-allowed bg-surface-container text-on-surface-variant" : "bg-white text-on-surface hover:bg-surface-container-low cursor-pointer"}`}>
    {loading ? (<><ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" /><span>Generating…</span></>) : (<>{icon ?? <SparklesIcon className="w-3.5 h-3.5 flex-shrink-0" />}<span>{label}</span></>)}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-2xl p-12 flex flex-col items-center text-center">
    <div className="text-outline mb-4 opacity-30">{icon}</div>
    <h3 className="text-lg font-bold text-on-surface mb-2">{title}</h3>
    <p className="text-sm text-on-surface-variant max-w-sm">{description}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TAB ITEM
// ─────────────────────────────────────────────────────────────────────────────

const TabItem: React.FC<{ active: boolean; label: string; onClick: () => void; icon: React.ReactNode; disabled?: boolean }> = ({ active, label, onClick, icon, disabled }) => (
  <button onClick={onClick} disabled={disabled} className={`flex items-center gap-2 pb-4 px-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${active ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
    {icon}
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION TERMINAL
// ─────────────────────────────────────────────────────────────────────────────

const ExecutionTerminal: React.FC<{ logs: ExecutionLog[]; isRunning: boolean; onStop: () => void }> = ({ logs, isRunning, onStop }) => {
  const terminalRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [logs]);
  const getLogIcon = (type: ExecutionLog["type"]) => { switch (type) { case "success": return "✓"; case "error": return "✗"; case "warning": return "⚠"; default: return "→"; } };
  const getLogColor = (type: ExecutionLog["type"]) => { switch (type) { case "success": return "text-green-400"; case "error": return "text-red-400"; case "warning": return "text-yellow-400"; default: return "text-blue-400"; } };
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
      <div className="bg-slate-800 px-5 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm font-semibold text-slate-300 font-mono">Execution Terminal</span>
          {isRunning && (<div className="flex items-center gap-2 ml-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-xs text-green-400 font-semibold">RUNNING</span></div>)}
        </div>
        {isRunning && (<button onClick={onStop} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors"><StopIcon className="w-3.5 h-3.5" />Stop</button>)}
      </div>
      <div ref={terminalRef} className="bg-slate-900 p-4 font-mono text-xs text-slate-300 h-[500px] overflow-y-auto custom-scrollbar" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.02) 19px, rgba(255,255,255,0.02) 20px)` }}>
        {logs.length === 0 ? (<div className="flex items-center justify-center h-full text-slate-500"><p>Click "Execute entire project" to start...</p></div>) : (logs.map((log) => (<div key={log.id} className="mb-1 flex items-start gap-3"><span className="text-slate-500 select-none flex-shrink-0">[{log.timestamp.toLocaleTimeString("en-US")}]</span><span className={`${getLogColor(log.type)} flex-shrink-0 font-bold`}>{getLogIcon(log.type)}</span><span className="flex-1">{log.message}</span></div>)))}
        {isRunning && (<div className="mt-2 flex items-center gap-2 text-slate-500"><div className="w-1 h-3 bg-green-400 animate-pulse" /><span className="animate-pulse">Execution in progress...</span></div>)}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ServiceDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [activeTab, setActiveTab] = useState<TabId>("endpoints");

  // Data
  const [project, setProject] = useState<Project | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointsCount, setEndpointsCount] = useState(0);
  const [testedEndpoints, setTestedEndpoints] = useState<Endpoint[]>([]);

  // Stats
  const [successRate, setSuccessRate] = useState<Record<string, number>>({});
  const [projectStats, setProjectStats] = useState<ProjectReportStats[]>([]);
  const [projectChartData, setProjectChartData] = useState<Record<string, any>[]>([]);

  // UI
  const [rescanning, setRescanning] = useState(false);
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Generation
  const [generatingKeys, setGeneratingKeys] = useState<Set<string>>(new Set());

  // Toast
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; variant?: "danger" | "primary"; confirmLabel?: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  // Auth / role
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<"READ_ONLY" | "READ_WRITE" | null>(null);
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [sharedAt, setSharedAt] = useState<string | null>(null);

  // History
  const [executions, setExecutions] = useState<ProjectExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ProjectExecution | null>(null);
  const [testExecutions, setTestExecutions] = useState<TestExecution[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [executorName, setExecutorName] = useState<string | null>(null);

  // Execution terminal
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentExecutionIdRef = useRef<string | null>(null);

  // Settings form state
  const [editForm, setEditForm] = useState({ name: "", description: "", projectUrl: "", docUrl: "", authType: "NONE", authUsername: "", authPassword: "", apiKey: "", apiKeyHeader: "", apiKeyLocation: "HEADER", bearerToken: "" });
  const [updating, setUpdating] = useState(false);

  // ── MAGIC EXECUTION STATE ───────────────────────────────────────────────
  const magicPollingRef = useRef<NodeJS.Timeout | null>(null);
  const [magicState, setMagicState] = useState<MagicExecutionState>({
    phase: "idle",
    minimized: false,
    visible: false,
    steps: [
      { label: "Generate Tests", sublabel: "Waiting…", status: "waiting", percent: 0 },
      { label: "Execute Tests", sublabel: "Waiting…", status: "waiting", percent: 0 },
    ],
  });

  const userStr = sessionStorage.getItem("user");
  const currentUserObj = userStr ? JSON.parse(userStr) : null;
  const currentUserId = currentUserObj?.id;

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastItem["type"], message: string) => {
    const toastId = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  }, []);

  const removeToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: "danger" | "primary" = "primary", confirmLabel = "Confirm") =>
    setConfirmModal({ open: true, title, message, variant, confirmLabel, onConfirm });

  const closeConfirm = () => setConfirmModal((p) => ({ ...p, open: false }));

  const addLog = useCallback((type: ExecutionLog["type"], message: string) => {
    const logId = Math.random().toString(36).slice(2);
    setExecutionLogs((prev) => [...prev, { id: logId, timestamp: new Date(), type, message }]);
  }, []);

  const clearLogs = useCallback(() => setExecutionLogs([]), []);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
  }, []);

  const stopMagicPolling = useCallback(() => {
    if (magicPollingRef.current) { clearInterval(magicPollingRef.current); magicPollingRef.current = null; }
  }, []);

  const handleStopExecution = () => {
    stopPolling();
    setIsExecuting(false);
    currentExecutionIdRef.current = null;
    addLog("warning", "⚠️  Execution stopped by user (local stop).");
    addToast("info", "Execution stopped.");
  };

  // ── MAGIC EXECUTION HANDLER ────────────────────────────────────────────────
  /**
   * Step 1: generate tests for all endpoints
   * Step 2: execute entire project
   * Non-blocking — progress shown in fixed panel
   */
  const handleMagicExecution = useCallback(async () => {
    if (!id || !project) return;

    const s = sessionStorage.getItem("user");
    const userId = s ? JSON.parse(s).id : null;

    const totalEndpoints = endpoints.length;
    // Rough estimate: 8s per endpoint for generation, 2s per test for execution
    const estGenMs = totalEndpoints * 8000;
    const estExecMs = totalEndpoints * 6 * 2000; // 6 test types × 2s

    // Initialise panel
    setMagicState({
      phase: "generating",
      minimized: false,
      visible: true,
      startTime: Date.now(),
      estimatedGenerationMs: estGenMs,
      estimatedExecutionMs: estExecMs,
      steps: [
        {
          label: "Generate Tests",
          sublabel: `${totalEndpoints} endpoint${totalEndpoints !== 1 ? "s" : ""} · est. ${Math.ceil(estGenMs / 1000)}s`,
          status: "running",
          percent: 0,
        },
        {
          label: "Execute Tests",
          sublabel: "Will start after generation…",
          status: "waiting",
          percent: 0,
        },
      ],
    });

    // ── Animate generation progress bar (time-based estimate) ──
    let genPercent = 0;
    const genStartTime = Date.now();
    const genTicker = setInterval(() => {
      const elapsed = Date.now() - genStartTime;
      // Approaches 95% asymptotically
      genPercent = Math.min(95, Math.round((elapsed / estGenMs) * 100));
      setMagicState((prev) => ({
        ...prev,
        steps: [
          { ...prev.steps[0], percent: genPercent, detail: `~${Math.max(0, Math.ceil((estGenMs - elapsed) / 1000))}s remaining` },
          prev.steps[1],
        ],
      }));
    }, 600);

    try {
      // ── STEP 1: Generate ──
      await testService.generate(endpoints as any);
      clearInterval(genTicker);

      // Refresh tests in background
      testService.getTestsByProjectId(id).then((res) => setTests(res.data as Test[]));

      // Mark step 1 done, start step 2
      setMagicState((prev) => ({
        ...prev,
        phase: "executing",
        steps: [
          { ...prev.steps[0], status: "done", percent: 100, sublabel: "All tests generated ✓", detail: undefined },
          {
            label: "Execute Tests",
            sublabel: `Running ${totalEndpoints * 6} test cases…`,
            status: "running",
            percent: 0,
          },
        ],
      }));

      // ── STEP 2: Execute ──
      const execResponse = await executionService.startExecution({ projectId: id, executedBy: userId, executionContext: "manual" });
      const executionId = execResponse.data.executionId;

      const execStartTime = Date.now();
      let execPercent = 0;

      // Poll execution status
      magicPollingRef.current = setInterval(async () => {
        try {
          const statusRes = await executionService.getExecutionStatus(executionId);
          const status = statusRes.data;

          // Time-based progress animation
          const elapsed = Date.now() - execStartTime;
          execPercent = Math.min(95, Math.round((elapsed / estExecMs) * 100));

          // If backend gives partial info
          if (status.totalTests > 0) {
            const done = (status.testsPassed ?? 0) + (status.testsFailed ?? 0) + (status.testsError ?? 0);
            execPercent = Math.max(execPercent, Math.min(95, Math.round((done / status.totalTests) * 100)));
          }

          setMagicState((prev) => ({
            ...prev,
            steps: [
              prev.steps[0],
              { ...prev.steps[1], percent: execPercent, detail: `~${Math.max(0, Math.ceil((estExecMs - elapsed) / 1000))}s remaining` },
            ],
          }));

          if (status.status === "COMPLETED" || status.status === "FAILED") {
            stopMagicPolling();
            const totalDuration = Date.now() - (magicState.startTime ?? Date.now());

            setMagicState((prev) => ({
              ...prev,
              phase: "done",
              steps: [
                prev.steps[0],
                { ...prev.steps[1], status: "done", percent: 100, sublabel: "All tests executed ✓", detail: undefined },
              ],
              result: {
                passed: status.testsPassed ?? 0,
                failed: status.testsFailed ?? 0,
                errors: status.testsError ?? 0,
                rate: status.successRate ?? 0,
                duration: totalDuration,
              },
            }));

            addToast(
              status.status === "COMPLETED" ? "success" : "error",
              `Auto Pilot done! ${status.successRate?.toFixed(0) ?? 0}% success rate.`,
            );

            // Refresh history in background
            setTimeout(() => loadExecutionHistory(), 1500);
          }
        } catch (pollErr) {
          console.error("Magic polling error:", pollErr);
        }
      }, 2500);
    } catch (err: any) {
      clearInterval(genTicker);
      stopMagicPolling();
      const msg = err.response?.data?.message || err.message || "Unknown error";
      setMagicState((prev) => ({
        ...prev,
        phase: "error",
        steps: prev.steps.map((s) =>
          s.status === "running" ? { ...s, status: "error" } : s
        ),
        error: msg,
      }));
      addToast("error", `Auto Pilot failed: ${msg}`);
    }
  }, [id, project, endpoints, stopMagicPolling, addToast]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = sessionStorage.getItem("user");
    if (s) { try { const u = JSON.parse(s); setUserRole(u.role || "MANAGER"); } catch {} }
  }, []);

  useEffect(() => {
    if (state) { setAccessLevel(state.accessLevel ?? null); setManagerEmail(state.managerEmail ?? null); setSharedAt(state.sharedAt ?? null); }
  }, [state]);

  useEffect(() => { if (id) loadProjectData(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (activeTab === "history" && id) loadExecutionHistory(); }, [activeTab, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedExecution || !selectedExecution.executedBy) { setExecutorName(null); return; }
    const uid = selectedExecution.executedBy;
    if (uid === currentUserId) { setExecutorName(null); return; }
    userService.getUserById(uid).then((res) => { const u = res.data; setExecutorName(u.name || u.email || "Unknown"); }).catch(() => setExecutorName("Unknown"));
  }, [selectedExecution, currentUserId]);

  useEffect(() => { return () => { stopPolling(); stopMagicPolling(); }; }, [stopPolling, stopMagicPolling]);

  useEffect(() => {
    if (project) {
      const creds = (project as any).credentials || {};
      setEditForm({ name: project.name, description: project.description, projectUrl: project.projectUrl, docUrl: project.docUrl || "", authType: project.authType, authUsername: creds.basicUsername || "", authPassword: creds.basicPassword || "", apiKey: creds.apiKey || "", apiKeyHeader: creds.apiKeyHeader || "", apiKeyLocation: creds.apiKeyLocation || "HEADER", bearerToken: creds.bearerToken || "" });
    }
  }, [project]);

  // ── Data loading ───────────────────────────────────────────────────────────
  const refreshTests = async () => {
    if (!id) return;
    const res = await testService.getTestsByProjectId(id);
    setTests(res.data as Test[]);
  };

  const refreshTestedEndpoints = async () => {
    if (!id) return;
    try { const res = await executionService.getTestedEndpoints(id); setTestedEndpoints(res.data as Endpoint[]); } catch { setTestedEndpoints([]); }
  };

  const refreshSuccessRate = async () => {
    if (!id) return;
    try {
      const res = await executionService.getProjectSuccessRate(id);
      setSuccessRate(res.data);
      setProjectStats([
        { name: "Passed", value: Math.round((res.data.SUCCESS / res.data.TOTAL) * 100), color: "#22c55e" },
        { name: "Failed", value: Math.round((res.data.FAILED / res.data.TOTAL) * 100), color: "#ef4444" },
        { name: "Error", value: Math.round((res.data.ERROR / res.data.TOTAL) * 100), color: "#e69138" },
      ]);
    } catch { setSuccessRate({}); }
  };

  const refreshProjectChartData = async () => {
    if (!id) return;
    try {
      const res = await executionService.getProjectSuccessRateHistory(id);
      setProjectChartData(Object.entries(res.data).map(([dateString, v]) => {
        const date = new Date(dateString);
        return { name: `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`, success: Math.round(v as number) };
      }));
    } catch { setProjectChartData([]); }
  };

  const refreshStats = async () => { await refreshTestedEndpoints(); await refreshSuccessRate(); await refreshProjectChartData(); };

  const loadProjectData = async () => {
    try {
      setLoading(true); setError(null);
      const projectRes = await projectService.getProjectById(id!);
      setProject(projectRes.data as unknown as Project);
      const s = sessionStorage.getItem("user");
      const uid = s ? JSON.parse(s).id : null;
      setIsOwner(projectRes.data.userId === uid);
      const endpointsRes = await projectService.getProjectEndpoints(id!);
      setEndpoints(endpointsRes.data as Endpoint[]);
      const countRes = await projectService.countProjectEndpoints(id!);
      setEndpointsCount(countRes.data.count || endpointsRes.data.length);
      await refreshTests();
      await refreshStats();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error loading data");
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
    } catch { console.error("History error"); } finally { setLoadingHistory(false); }
  };

  const loadTestExecutions = async (executionId: string) => {
    try { refreshStats(); const res = await executionService.getTestExecutionsByExecutionId(executionId); setTestExecutions(res.data); } catch { setTestExecutions([]); }
  };

  // ── Reports ────────────────────────────────────────────────────────────────
  const handleDownloadProjectReport = async (reportType: "simple" | "full") => {
    if (!id) return;
    try {
      const res = reportType === "simple" ? await executionService.getSimpleProjectReport(id) : await executionService.getProjectReport(id);
      saveAs(new Blob([res.data], { type: "application/pdf" }), `${project?.name?.replaceAll(" ", "_") || "project"}-${reportType}-report.pdf`);
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error downloading project report."); }
  };

  const handleDownloadEndpointReport = async (reportType: "simple" | "full", endpointId: string) => {
    if (!id) return;
    try {
      const res = reportType === "simple" ? await executionService.getSimpleSingleEndpointReport(id, endpointId) : await executionService.getSingleEndpointReport(id, endpointId);
      const ep = endpoints.find((e) => e.id === endpointId);
      saveAs(new Blob([res.data], { type: "application/pdf" }), `${project?.name?.replaceAll(" ", "_") || "project"}-${ep ? ep.path.replaceAll("/", "_") : "endpoint"}-${reportType}-report.pdf`);
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error downloading endpoint report."); }
  };

  const handleDownloadTagReport = async (reportType: "simple" | "full", tag: string) => {
    if (!id) return;
    try {
      const res = reportType === "simple" ? await executionService.getSimpleTagReport(id, tag) : await executionService.getTagReport(id, tag);
      saveAs(new Blob([res.data], { type: "application/pdf" }), `${project?.name?.replaceAll(" ", "_") || "project"}-${tag}-${reportType}-report.pdf`);
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error downloading tag report."); }
  };

  // ── Rescan ─────────────────────────────────────────────────────────────────
  const handleRescanEndpoints = async () => {
    if (!id) return;
    try { setRescanning(true); await projectService.scanProjectEndpoints(id); await loadProjectData(); addToast("success", "Endpoints rescanned successfully."); } catch (err: any) { addToast("error", err.response?.data?.message || "Error during rescan."); } finally { setRescanning(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteProject = () => {
    openConfirm("Delete Project", `Are you sure you want to delete "${project?.name}"? This action cannot be undone.`, async () => {
      closeConfirm();
      try { await projectService.deleteProject(id!); addToast("success", "Project deleted successfully."); navigate("/projects"); } catch (err: any) { addToast("error", err.response?.data?.message || "Error during deletion."); }
    }, "danger", "Delete Permanently");
  };

  // ── Update project ─────────────────────────────────────────────────────────
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setUpdating(true);
    try {
      const updateData: Partial<UpdateProjectRequest> = { name: editForm.name, description: editForm.description, projectUrl: editForm.projectUrl, docUrl: editForm.docUrl || undefined, authType: editForm.authType };
      if (editForm.authType === "BASIC") { updateData.authUsername = editForm.authUsername || undefined; updateData.authPassword = editForm.authPassword || undefined; }
      else if (editForm.authType === "API_KEY") { updateData.apiKey = editForm.apiKey || undefined; updateData.apiKeyHeader = editForm.apiKeyHeader || undefined; updateData.apiKeyLocation = editForm.apiKeyLocation || undefined; }
      else if (editForm.authType === "BEARER") { updateData.bearerToken = editForm.bearerToken || undefined; }
      await projectService.updateProject(id, updateData);
      const projectRes = await projectService.getProjectById(id);
      setProject(projectRes.data as unknown as Project);
      addToast("success", "Project updated successfully.");
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error updating project."); } finally { setUpdating(false); }
  };

  // ── Generation ─────────────────────────────────────────────────────────────
  const doGenerate = async (endpointsToGenerate: Endpoint[], key: string) => {
    setGeneratingKeys((prev) => new Set(prev).add(key));
    try {
      await testService.generate(endpointsToGenerate);
      const res = await testService.getTestsByProjectId(id!);
      setTests(res.data as Test[]);
      addToast("success", endpointsToGenerate.length === 1 ? `Tests generated for "${endpointsToGenerate[0].path}".` : `Tests generated for ${endpointsToGenerate.length} endpoints.`);
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error during generation."); } finally {
      setGeneratingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleGenerateTests = (endpointsToGenerate: Endpoint[], key: string) => {
    openConfirm("Generate Tests", endpointsToGenerate.length === 1 ? `Generate tests for "${endpointsToGenerate[0].path}"?` : `Generate tests for ${endpointsToGenerate.length} endpoint(s)?`, () => { closeConfirm(); doGenerate(endpointsToGenerate, key); }, "primary", "Generate");
  };

  const handleRegenerateTests = (testIds: string[], key: string) => {
    const testsToRegen = tests.filter((t) => testIds.includes(t.id));
    const epIds = new Set(testsToRegen.map((t) => t.endpointId));
    const endpointsRegen = endpoints.filter((ep) => epIds.has(ep.id));
    openConfirm("Regenerate Tests", `Regenerate ${testIds.length} test(s)? Existing data will be overwritten.`, () => { closeConfirm(); doGenerate(endpointsRegen, key); }, "primary", "Regenerate");
  };

  // ── Execute all project ────────────────────────────────────────────────────
  const handleExecuteAllProject = async () => {
    if (!id || !project) return;
    stopPolling(); clearLogs(); setIsExecuting(true); currentExecutionIdRef.current = null;
    try {
      const s = sessionStorage.getItem("user");
      const userId = s ? JSON.parse(s).id : null;
      addLog("info", `🚀 Starting execution of project "${project.name}"`);
      addLog("info", `📡 Sending request to server...`);
      const response = await executionService.startExecution({ projectId: id, executedBy: userId, executionContext: "manual" });
      const executionId = response.data.executionId;
      currentExecutionIdRef.current = executionId;
      addLog("success", `✓ Execution launched with ID: ${executionId}`);
      addLog("info", "⏳ Waiting for execution to start...");
      pollingIntervalRef.current = setInterval(async () => {
        try {
          if (!currentExecutionIdRef.current) { stopPolling(); return; }
          const statusRes = await executionService.getExecutionStatus(currentExecutionIdRef.current);
          const status = statusRes.data;
          const logsRes = await executionService.getExecutionLogs(currentExecutionIdRef.current);
          const rawLogs = logsRes.data;
          const existingMessages = new Set(executionLogs.map((l) => l.message));
          const newLogs: ExecutionLog[] = [];
          for (const raw of rawLogs) {
            if (!existingMessages.has(raw)) {
              let type: ExecutionLog["type"] = "info";
              if (raw.toLowerCase().includes("error") || raw.includes("✗")) type = "error";
              else if (raw.toLowerCase().includes("success") || raw.includes("✓")) type = "success";
              else if (raw.toLowerCase().includes("warning") || raw.includes("⚠")) type = "warning";
              newLogs.push({ id: Math.random().toString(36).slice(2), timestamp: new Date(), type, message: raw });
            }
          }
          if (newLogs.length > 0) setExecutionLogs((prev) => [...prev, ...newLogs]);
          if (status.status === "COMPLETED" || status.status === "FAILED") {
            stopPolling(); setIsExecuting(false); currentExecutionIdRef.current = null;
            addLog(status.status === "COMPLETED" ? "success" : "error", `🏁 Execution finished with status: ${status.status}`);
            addLog("info", `📊 Success rate: ${status.successRate?.toFixed(1)}%`);
            addLog("info", `✅ Passed: ${status.testsPassed} | ❌ Failed: ${status.testsFailed} | ⚠️ Errors: ${status.testsError}`);
            addToast(status.status === "COMPLETED" ? "success" : "error", `Execution ${status.status === "COMPLETED" ? "successful" : "failed"}! Check history.`);
            setTimeout(() => { if (activeTab === "execution" || activeTab === "history") loadExecutionHistory(); }, 1500);
          }
        } catch (pollErr) { console.error("Polling error:", pollErr); }
      }, 2000);
    } catch (err: any) {
      stopPolling(); setIsExecuting(false); currentExecutionIdRef.current = null;
      addLog("error", `✗ Error launching execution: ${err.response?.data?.message || err.message}`);
      addToast("error", "Execution launch failed.");
    }
  };

  // ── Permissions ────────────────────────────────────────────────────────────
  const canEdit = isOwner;
  const canDelete = isOwner;
  const canShare = isOwner;
  const canRescan = isOwner;
  const canExecuteTests = isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");
  const canGenerateTests = isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");

  // ── Groupings ──────────────────────────────────────────────────────────────
  function tagEndpointsByPath(eps: Endpoint[]): Record<string, Endpoint[]> {
    return eps.reduce((groups, ep) => {
      const tag = ep.path?.split("/")[1]?.trim() || "General";
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(ep);
      return groups;
    }, {} as Record<string, Endpoint[]>);
  }

  const groupedEndpoints = endpoints.reduce((g, ep) => {
    const tag = ep.tags?.split(",")[0]?.trim() || "General";
    if (!g[tag]) g[tag] = [];
    g[tag].push(ep);
    return g;
  }, {} as Record<string, Endpoint[]>);

  const groupedTests = tests.reduce((g, test) => {
    const path = test.endpointPath?.split(" ")[1]?.trim();
    const tag = path?.split("/")[1]?.split("?")[0] || "General";
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
  endpointsWithTests.forEach((ep) => {
    const epTests = testsByEndpoint[ep.id] || [];
    epTests.forEach((test) => { TEST_SECTIONS.forEach(({ key }) => { try { if ((test as any)[key]) totalTestsCount++; } catch {} }); });
  });

  // ── Should show magic button ───────────────────────────────────────────────
  const showMagicButton =
    canGenerateTests &&
    canExecuteTests &&
    endpoints.length > 0 &&
    magicState.phase === "idle";

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex"><Sidebar />
          <main className="flex-1 ml-64 flex items-center justify-center min-h-screen">
            <ArrowPathIcon className="w-10 h-10 text-primary animate-spin" />
          </main>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex"><Sidebar />
          <main className="flex-1 ml-64 p-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600 font-medium mb-4">{error || "Project not found"}</p>
              <Button onClick={() => navigate("/projects")} variant="outline">Back to Projects</Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 md:p-12 max-w-7xl mx-auto w-full">

{/* ════════ HEADER ════════ */}
<div className="flex flex-col gap-6 mb-8">

  {/* Breadcrumb */}
  <nav className="flex items-center gap-1.5 text-sm text-on-surface-variant font-medium">
    <button
      onClick={() => navigate("/projects")}
      className="hover:text-primary transition-colors"
    >
      Projects
    </button>
    <span className="text-on-surface-variant/40">/</span>
    <span className="text-on-surface font-semibold">{project.name}</span>
  </nav>

  {/* Main row: title + actions */}
  <div className="flex items-start justify-between gap-6 flex-wrap">

    {/* Left: title, badges, description, url */}
    <div className="flex flex-col gap-2.5 flex-1 min-w-[280px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-2xl font-bold tracking-tight text-on-surface leading-tight">
          {project.name}
        </h2>
        <Badge variant="info">{project.docMode}</Badge>
        <Badge variant="default">{project.authType}</Badge>
      </div>

      <p className="text-sm text-on-surface-variant leading-relaxed max-w-xl">
        {project.description}
      </p>

      <div className="flex items-center gap-1.5">
        <CodeBracketIcon className="w-3.5 h-3.5 text-on-surface-variant/50 flex-shrink-0" />
        <p className="text-xs font-mono text-on-surface-variant/70 truncate">
          {project.projectUrl}
        </p>
      </div>

      {/* Developer shared-by info */}
      {userRole === "DEVELOPER" && managerEmail && (
        <div className="mt-1 flex flex-wrap gap-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
          <span>
            <span className="font-semibold">Shared by:</span> {managerEmail}
          </span>
          <span>
            <span className="font-semibold">Access:</span>{" "}
            {accessLevel === "READ_WRITE" ? "Read / Write" : "Read only"}
          </span>
          {sharedAt && (
            <span>
              <span className="font-semibold">Since:</span>{" "}
              {new Date(sharedAt).toLocaleDateString("en-US")}
            </span>
          )}
        </div>
      )}
    </div>

    {/* Right: action buttons */}
    {canShare && (
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          icon={<UsersIcon className="w-4 h-4" />}
          onClick={() => navigate(`/service/${id}/shares`)}
        >
          Manage Shares
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<ShareIcon className="w-4 h-4" />}
          onClick={() => setShowShareModal(true)}
        >
          Share
        </Button>
      </div>
    )}
  </div>

  {/* Stats bar */}
  <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-outline-variant/20 text-xs text-on-surface-variant">
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-400" />
      <span>{endpointsCount} endpoint{endpointsCount !== 1 ? "s" : ""}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <BeakerIcon className="w-3.5 h-3.5 opacity-50" />
      <span>{totalTestsCount} tests generated</span>
    </div>
    <div className="flex items-center gap-1.5">
      <ClockIcon className="w-3.5 h-3.5 opacity-50" />
      <span>
        {executions.length > 0
          ? `Last run: ${new Date(executions[0].executedAt).toLocaleString("en-US")}`
          : "No executions yet"}
      </span>
    </div>
    {Object.keys(successRate).length > 0 && successRate.TOTAL > 0 && (
      <div className="flex items-center gap-1.5">
        <CheckCircleIcon className="w-3.5 h-3.5 opacity-50" />
        <span>
          {Math.round((successRate.SUCCESS / successRate.TOTAL) * 100)}% pass rate
        </span>
      </div>
    )}
  </div>

</div>

          {/* ════════ TABS ════════ */}
          <div className="border-b border-outline-variant/30 mb-8">
            <nav className="flex space-x-1 overflow-x-auto">
              <TabItem active={activeTab === "endpoints"} label="Endpoints" icon={<ListBulletIcon className="w-4 h-4" />} onClick={() => setActiveTab("endpoints")} />
              <TabItem active={activeTab === "tests"} label="Tests" icon={<BeakerIcon className="w-4 h-4" />} onClick={() => setActiveTab("tests")} />
              <TabItem active={activeTab === "execution"} label="Execution" icon={<PlayIcon className="w-4 h-4" />} onClick={() => setActiveTab("execution")} disabled={!canExecuteTests} />
              <TabItem active={activeTab === "history"} label="History" icon={<ClockIcon className="w-4 h-4" />} onClick={() => setActiveTab("history")} />
              <TabItem active={activeTab === "reports"} label="Reports" icon={<PresentationChartLineIcon className="w-4 h-4" />} onClick={() => setActiveTab("reports")} />
              <TabItem active={activeTab === "settings"} label="Settings" icon={<CogIcon className="w-4 h-4" />} onClick={() => setActiveTab("settings")} />
            </nav>
          </div>

          {/* ════════════════════════════════════════════════════════════
              ENDPOINTS TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "endpoints" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-9 space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">Detected Endpoints ({endpointsCount})</h3>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      {endpoints.filter((e) => e.discoveryType === "SWAGGER").length} from Swagger · {endpoints.filter((e) => e.discoveryType === "MANUAL").length} manual
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {endpoints.length > 0 && canGenerateTests && (
                      <GenerateButton loading={generatingKeys.has("all")} onClick={() => handleGenerateTests(endpoints, "all")} label="Generate all tests" icon={<ClipboardDocumentCheckIcon className="w-4 h-4" />} />
                    )}
                    {canRescan && (
                      <Button variant="outline" size="sm" loading={rescanning} icon={!rescanning ? <ArrowPathIcon className="w-4 h-4" /> : undefined} onClick={handleRescanEndpoints}>
                        {rescanning ? "Rescanning…" : "Rescan"}
                      </Button>
                    )}
                  </div>
                </div>

                {endpoints.length === 0 ? (
                  <EmptyState icon={<ListBulletIcon className="w-12 h-12" />} title="No endpoints found" description={project.docMode === "SWAGGER" ? "Swagger scan didn't detect any endpoints." : "Add endpoints manually."} />
                ) : (
                  Object.entries(groupedEndpoints).map(([tag, eps]) => (
                    <div key={tag} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <FolderOpenIcon className="w-4 h-4" />
                          <h3 className="font-bold">{tag}</h3>
                          <span className="text-xs font-mono">({eps.length})</span>
                        </div>
                        {canGenerateTests && (
                          <GenerateButton loading={generatingKeys.has(`group-${tag}`)} onClick={() => handleGenerateTests(eps, `group-${tag}`)} label="Generate this group" size="xs" />
                        )}
                      </div>
                      <div className="space-y-2">
                        {eps.map((ep) => (
                          <EndpointAccordion key={ep.id} endpoint={ep} isExpanded={expandedEndpointId === ep.id} onToggle={() => setExpandedEndpointId((p) => (p === ep.id ? null : ep.id))} canGenerateTests={canGenerateTests} generating={generatingKeys.has(ep.id)} onGenerate={() => handleGenerateTests([ep], ep.id)} hasTests={!!testsByEndpoint[ep.id]?.length} testCount={testsByEndpoint[ep.id]?.length ?? 0} />
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
                      <h3 className="font-bold text-sm">Access Level</h3>
                      <ShieldCheckIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-outline-variant/10 mb-3">
                      <p className="text-[10px] uppercase font-bold text-primary mb-1">Developer</p>
                      <p className="text-sm font-semibold">{accessLevel ?? "READ_ONLY"}</p>
                    </div>
                    <ul className="space-y-2 text-xs text-on-surface-variant">
                      <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-500" />View endpoints</li>
                      {accessLevel === "READ_WRITE" && <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-500" />Generate tests</li>}
                      <li className="flex items-center gap-2"><XCircleIcon className="w-4 h-4 text-slate-300" />Modify service</li>
                    </ul>
                  </div>
                )}
                <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
                  <h3 className="font-bold mb-4">Overall Health</h3>
                  <div className="flex items-center justify-center py-4">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="8" className="text-surface-container-high" />
                        <circle cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeDasharray="264" strokeDashoffset="21" strokeWidth="8" className="text-primary" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">92%</span>
                        <span className="text-[10px] uppercase text-on-surface-variant">Passing</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-on-surface-variant">Active Tests</span><span className="font-bold">48 / 52</span></div>
                    <div className="h-1.5 bg-surface-container rounded-full overflow-hidden"><div className="bg-primary h-full w-[92%]" /></div>
                  </div>
                </div>
                <div className="bg-surface-container-highest/40 p-5 rounded-2xl border border-primary/5">
                  <h4 className="font-bold text-sm mb-4">Upcoming Audits</h4>
                  <div className="space-y-3">
                    {[{ icon: <ShieldCheckIcon className="w-5 h-5" />, title: "Security Pass", sub: "In 2 days", cls: "bg-orange-50 text-orange-600" }, { icon: <CalendarIcon className="w-5 h-5" />, title: "Compliance API", sub: "In 5 days", cls: "bg-blue-50 text-blue-600" }].map((a) => (
                      <div key={a.title} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.cls}`}>{a.icon}</div>
                          <div><p className="text-xs font-bold">{a.title}</p><p className="text-[10px] text-on-surface-variant">{a.sub}</p></div>
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TESTS TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "tests" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Generated Tests ({tests.length})</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Click <BoltIcon className="w-3 h-3 inline text-indigo-500" /> Quick Execute to instantly run any individual test case</p>
                </div>
                {endpoints.length > 0 && canGenerateTests && (
                  <GenerateButton loading={generatingKeys.has("all")} onClick={() => handleGenerateTests(endpoints, "all")} label="Regenerate all tests" icon={<ClipboardDocumentCheckIcon className="w-4 h-4" />} />
                )}
              </div>
              {tests.length === 0 ? (
                <EmptyState icon={<BeakerIcon className="w-12 h-12" />} title="No tests available" description="Generate tests from the Endpoints tab." />
              ) : (
                Object.entries(groupedTests).map(([tag, gTests]) => (
                  <div key={tag} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <NewspaperIcon className="w-4 h-4" />
                        <h3 className="font-bold">{tag}</h3>
                        <span className="text-xs font-mono">({gTests.length})</span>
                      </div>
                      {canGenerateTests && (
                        <GenerateButton loading={generatingKeys.has(`test-group-${tag}`)} onClick={() => handleRegenerateTests(gTests.map((t) => t.id), `test-group-${tag}`)} label="Regenerate this group" size="xs" />
                      )}
                    </div>
                    <div className="space-y-2">
                      {gTests.map((test) => (
                        <TestAccordion key={test.id} test={test} isExpanded={expandedTestId === test.id} onToggle={() => setExpandedTestId((p) => (p === test.id ? null : test.id))} canRegenerateTests={canGenerateTests} generating={generatingKeys.has(`test-single-${test.id}`)} onRegenerate={() => handleRegenerateTests([test.id], `test-single-${test.id}`)} refreshTests={refreshTests} addToast={addToast} project={project} endpoint={endpoints.find((ep) => ep.id === test.endpointId)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              EXECUTION TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "execution" && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Execution Console</h3>
                    <p className="text-sm text-slate-600">Run all tests of your project and track progress in real time</p>
                  </div>
                  <BoltIcon className="w-10 h-10 text-indigo-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 border border-indigo-100"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Endpoints with tests</p><p className="text-3xl font-bold text-indigo-600">{endpointsWithTests.length}</p><p className="text-xs text-slate-500 mt-1">out of {endpoints.length} total</p></div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-100"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Available tests</p><p className="text-3xl font-bold text-emerald-600">{totalTestsCount}</p><p className="text-xs text-slate-500 mt-1">ready to be executed</p></div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-100"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</p><div className="flex items-center gap-2 mt-2">{isExecuting ? (<><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span className="text-sm font-semibold text-green-600">Running</span></>) : (<><div className="w-3 h-3 rounded-full bg-slate-300" /><span className="text-sm font-semibold text-slate-600">Ready</span></>)}</div></div>
                </div>
                <div className="mt-6 flex justify-center">
                  <button onClick={handleExecuteAllProject} disabled={isExecuting || endpointsWithTests.length === 0} className={`flex items-center gap-3 px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg ${isExecuting || endpointsWithTests.length === 0 ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:scale-95"}`}>
                    {isExecuting ? (<><ArrowPathIcon className="w-6 h-6 animate-spin" />Executing...</>) : (<><PlayIcon className="w-6 h-6" />Execute entire project ({totalTestsCount} tests)</>)}
                  </button>
                </div>
              </div>
              <ExecutionTerminal logs={executionLogs} isRunning={isExecuting} onStop={handleStopExecution} />
              {endpointsWithTests.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-bold">Endpoints to test</h4>
                  <div className="space-y-2">
                    {endpointsWithTests.map((ep) => {
                      const epTests = testsByEndpoint[ep.id] || [];
                      let testsCount = 0;
                      epTests.forEach((test) => { TEST_SECTIONS.forEach(({ key }) => { try { if ((test as any)[key]) testsCount++; } catch {} }); });
                      const methodColor = METHOD_COLORS[ep.method] ?? "bg-surface-container-high text-on-surface-variant";
                      return (
                        <div key={ep.id} className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center ${methodColor}`}>{ep.method}</span>
                              <div><p className="font-mono text-sm font-semibold">{ep.path}</p><p className="text-xs text-on-surface-variant">{ep.description || "No description"}</p></div>
                            </div>
                            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full">{testsCount} test{testsCount > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {endpointsWithTests.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">No tests to execute</p>
                    <p className="text-sm text-amber-700 mt-1">Generate tests first from the Endpoints or Tests tab.</p>
                    <button onClick={() => setActiveTab("endpoints")} className="mt-3 text-sm font-semibold text-amber-800 underline underline-offset-2">Go to endpoints →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              HISTORY TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Execution History</h3>
              {loadingHistory ? (
                <div className="flex justify-center p-12"><ArrowPathIcon className="w-8 h-8 text-primary animate-spin" /></div>
              ) : executions.length === 0 ? (
                <EmptyState icon={<ClockIcon className="w-12 h-12" />} title="No executions" description="Run your tests to see history here." />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    {executions.map((exec) => {
                      const isYou = exec.executedBy && currentUserId && exec.executedBy === currentUserId;
                      const contextLabel = exec.executionContext === "ci_cd" ? "CI/CD" : exec.executionContext === "scheduled" ? "Jenkins" : "Manual";
                      return (
                        <div key={exec.id} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedExecution?.id === exec.id ? "border-primary bg-primary/5 shadow-sm" : "border-outline-variant/20 hover:bg-surface-container-low"}`} onClick={() => { setSelectedExecution(exec); loadTestExecutions(exec.id); }}>
                          <div className="flex justify-between items-start mb-3">
                            <div><p className="text-sm font-bold">{new Date(exec.executedAt).toLocaleDateString("en-US")}</p><p className="text-xs text-on-surface-variant">{new Date(exec.executedAt).toLocaleTimeString("en-US")}</p></div>
                            <Badge variant={exec.status === "COMPLETED" ? "success" : exec.status === "RUNNING" ? "warning" : "danger"}>{exec.status}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">{isYou ? "👤 You" : "👥 User"}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${exec.executionContext === "ci_cd" ? "bg-orange-100 text-orange-700" : exec.executionContext === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{contextLabel}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div><p className="font-bold text-green-600">{exec.testsPassed}</p><p className="text-on-surface-variant">Passed</p></div>
                            <div><p className="font-bold text-red-600">{exec.testsFailed}</p><p className="text-on-surface-variant">Failed</p></div>
                            <div><p className="font-bold">{exec.successRate?.toFixed(0) ?? 0}%</p><p className="text-on-surface-variant">Rate</p></div>
                          </div>
                          {exec.totalDurationMs && <p className="text-xs text-on-surface-variant mt-2">Duration: {(exec.totalDurationMs / 1000).toFixed(2)}s</p>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="lg:col-span-2 space-y-5">
                    {selectedExecution && (
                      <>
                        <Card>
                          <div className="flex flex-wrap items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-900">Execution Details</h4>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{selectedExecution.executedBy === currentUserId ? "👤 You" : executorName ? `👥 ${executorName}` : "👥 User"}</span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${selectedExecution.executionContext === "ci_cd" ? "bg-orange-100 text-orange-700" : selectedExecution.executionContext === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{selectedExecution.executionContext === "ci_cd" ? "CI/CD" : selectedExecution.executionContext === "scheduled" ? "Jenkins" : "Manual"}</span>
                            </div>
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} data={[{ name: "Passed", value: selectedExecution.testsPassed }, { name: "Failed", value: selectedExecution.testsFailed }, { name: "Errors", value: selectedExecution.testsError }]}>
                                  <Cell fill="#22c55e" /><Cell fill="#ef4444" /><Cell fill="#f59e0b" />
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center gap-6 text-xs mt-2">
                            {[{ label: "Passed", count: selectedExecution.testsPassed, color: "bg-green-500" }, { label: "Failed", count: selectedExecution.testsFailed, color: "bg-red-500" }, { label: "Errors", count: selectedExecution.testsError, color: "bg-amber-500" }].map((d) => (
                              <div key={d.label} className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${d.color}`} /><span>{d.label} ({d.count})</span></div>
                            ))}
                          </div>
                        </Card>
                        <Card title="Test Details">
                          {testExecutions.length === 0 ? (
                            <p className="text-center text-on-surface-variant p-6 text-sm">No tests executed.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-surface-container-high text-xs text-on-surface-variant uppercase">
                                  <tr>{["Endpoint", "Method", "Type", "Status", "Expected", "Received", "Time"].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                  {testExecutions.map((te) => (
                                    <tr key={te.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low">
                                      <td className="px-3 py-2 font-mono text-xs truncate max-w-[140px]">{te.endpointPath}</td>
                                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${METHOD_COLORS[te.httpMethod] ?? ""}`}>{te.httpMethod}</span></td>
                                      <td className="px-3 py-2 text-xs">{te.testType}</td>
                                      <td className="px-3 py-2"><Badge variant={te.status === "SUCCESS" ? "success" : te.status === "FAILED" ? "danger" : "warning"}>{te.status}</Badge></td>
                                      <td className="px-3 py-2 text-center">{te.expectedStatusCode}</td>
                                      <td className="px-3 py-2 text-center font-bold font-mono" style={{ color: te.statusCodeMatch ? "#22c55e" : "#ef4444" }}>{te.responseStatusCode}</td>
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
              REPORTS TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="Results Distribution">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={projectStats as Record<string, any>[]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {projectStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 text-sm mt-2">
                      {projectStats.map((d) => <div key={d.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} /><span>{d.name} ({d.value}%)</span></div>)}
                    </div>
                  </div>
                </Card>
                <Card title="Success History" footer={<div className="flex flex-col sm:flex-row gap-3"><Button variant="outline" className="w-full" icon={<DocumentArrowDownIcon className="w-6 h-6" />} onClick={() => handleDownloadProjectReport("full")}>Full Project Report</Button><Button variant="outline" className="w-full" icon={<DocumentArrowDownIcon className="w-6 h-6" />} onClick={() => handleDownloadProjectReport("simple")}>Simple Project Report</Button></div>}>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projectChartData as []}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
                        <Line type="monotone" dataKey="success" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
              <div className="space-y-3">
                {Object.entries(tagEndpointsByPath(testedEndpoints)).map(([tag, eps]: [string, Endpoint[]]) => (
                  <div key={tag} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-on-surface-variant"><NewspaperIcon className="w-4 h-4" /><h3 className="font-bold">{tag}</h3><span className="text-xs font-mono">({eps.length})</span></div>
                      <div className="flex items-center gap-2">
                        <Button icon={<DocumentArrowDownIcon className="w-4 h-4" />} variant="outline" onClick={() => handleDownloadTagReport("simple", tag)} className="font-normal text-xs">Simple Category Report</Button>
                        <Button variant="outline" icon={<DocumentArrowDownIcon className="w-4 h-4" />} onClick={() => handleDownloadTagReport("full", tag)} className="font-normal text-xs">Full Category Report</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {eps.map((ep: Endpoint) => <TestedEndpointAccordion key={ep.id} endpoint={ep} getReport={handleDownloadEndpointReport} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              SETTINGS TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card title="Project Information">
                <form onSubmit={handleUpdateProject} className="space-y-4">
                  <div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div>
                  <div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Description</label><textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Project URL</label>
                    <input type="text" value={editForm.projectUrl} onChange={(e) => setEditForm({ ...editForm, projectUrl: e.target.value })} className={`w-full px-3 py-2 border rounded-lg text-sm ${!canEdit || endpoints.length > 0 ? "bg-surface-container-low text-on-surface-variant/60 border-outline-variant/20 cursor-not-allowed" : "bg-white border-outline-variant/30"}`} disabled={!canEdit || endpoints.length > 0} />
                    {endpoints.length > 0 && <p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />URL locked – endpoints already exist. Delete endpoints first to modify.</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Documentation URL (Swagger/OpenAPI)</label>
                    <input type="text" value={editForm.docUrl} onChange={(e) => setEditForm({ ...editForm, docUrl: e.target.value })} placeholder="https://api.example.com/swagger.json" className={`w-full px-3 py-2 border rounded-lg text-sm ${!canEdit || endpoints.length > 0 ? "bg-surface-container-low text-on-surface-variant/60 border-outline-variant/20 cursor-not-allowed" : "bg-white border-outline-variant/30"}`} disabled={!canEdit || endpoints.length > 0} />
                    {endpoints.length > 0 && <p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />URL locked – endpoints already exist. Delete endpoints first to modify.</p>}
                  </div>
                  <div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Authentication Type</label><select value={editForm.authType} onChange={(e) => setEditForm({ ...editForm, authType: e.target.value })} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit}><option value="NONE">None</option><option value="BASIC">Basic Auth</option><option value="API_KEY">API Key</option><option value="BEARER">Bearer Token</option></select></div>
                  {editForm.authType === "BASIC" && (<><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Username</label><input type="text" value={editForm.authUsername} onChange={(e) => setEditForm({ ...editForm, authUsername: e.target.value })} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Password</label><input type="password" value={editForm.authPassword} onChange={(e) => setEditForm({ ...editForm, authPassword: e.target.value })} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div></>)}
                  {editForm.authType === "API_KEY" && (<><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">API Key</label><input type="text" value={editForm.apiKey} onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Header Name</label><input type="text" value={editForm.apiKeyHeader} onChange={(e) => setEditForm({ ...editForm, apiKeyHeader: e.target.value })} placeholder="X-API-Key" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Location</label><select value={editForm.apiKeyLocation} onChange={(e) => setEditForm({ ...editForm, apiKeyLocation: e.target.value })} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit}><option value="HEADER">Header</option><option value="QUERY_PARAM">Query Parameter</option></select></div></>)}
                  {editForm.authType === "BEARER" && (<div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Bearer Token</label><input type="text" value={editForm.bearerToken} onChange={(e) => setEditForm({ ...editForm, bearerToken: e.target.value })} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div>)}
                  {canEdit && <div className="pt-2"><Button type="submit" loading={updating} disabled={!canEdit}>{updating ? "Saving..." : "Save Changes"}</Button></div>}
                </form>
              </Card>
              {canDelete && (
                <Card title="Danger Zone">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-800 mb-3">Once you delete a project, there is no going back. Please be certain.</p>
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" icon={<TrashIcon className="w-4 h-4" />} onClick={handleDeleteProject}>Delete Project</Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ════════ MAGIC FLOATING BUTTON ════════ */}
      {showMagicButton && (
        <MagicFloatingButton
          onClick={() => {
            openConfirm(
              "Launch Auto Pilot ✦",
              `Auto Pilot will generate tests for all ${endpoints.length} endpoints, then execute them automatically. This may take a few minutes.`,
              () => { closeConfirm(); handleMagicExecution(); },
              "primary",
              "Launch Auto Pilot",
            );
          }}
          endpointCount={endpoints.length}
        />
      )}

      {/* ════════ MAGIC PROGRESS PANEL ════════ */}
      {magicState.visible && (
        <MagicProgressPanel
          state={magicState}
          onMinimize={() => setMagicState((prev) => ({ ...prev, minimized: !prev.minimized }))}
          onClose={() => setMagicState((prev) => ({ ...prev, visible: false, phase: "idle" }))}
        />
      )}

      {/* ════════ PORTALS ════════ */}
      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} variant={confirmModal.variant} confirmLabel={confirmModal.confirmLabel} onConfirm={confirmModal.onConfirm} onCancel={closeConfirm} />

      {showShareModal && project && (
        <ShareProjectModal projectId={id!} projectName={project.name} onClose={() => setShowShareModal(false)} onSuccess={() => { loadProjectData(); setShowShareModal(false); }} />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

const EndpointAccordion: React.FC<{ endpoint: Endpoint; isExpanded: boolean; onToggle: () => void; canGenerateTests: boolean; generating: boolean; onGenerate: () => void; hasTests: boolean; testCount: number }> = ({ endpoint, isExpanded, onToggle, canGenerateTests, generating, onGenerate, hasTests, testCount }) => {
  const methodColor = METHOD_COLORS[endpoint.method] ?? "bg-surface-container-high text-on-surface-variant";
  let parameters: any[] = [], requestBodyParsed = null, responseBodyParsed = null;
  try { if (endpoint.parameters) parameters = JSON.parse(endpoint.parameters); } catch {}
  try { if (endpoint.requestBody) requestBodyParsed = JSON.parse(endpoint.requestBody); } catch {}
  try { if (endpoint.responseBody) responseBodyParsed = JSON.parse(endpoint.responseBody); } catch {}

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container-low transition-colors group">
        <div className="flex items-center gap-4 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center ${methodColor}`}>{endpoint.method}</span>
          <div className="text-left"><p className="font-mono text-sm text-on-surface">{endpoint.path}</p><p className="text-xs text-on-surface-variant">{endpoint.description || "No description"}</p></div>
        </div>
        <div className="flex items-center gap-3">
          {hasTests && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{testCount} test{testCount > 1 ? "s" : ""}</span>}
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-on-surface-variant">Active</span></div>
          <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">{isExpanded ? "unfold_less" : "unfold_more"}</span>
        </div>
      </button>
      {isExpanded && (
        <div className="px-5 py-6 border-t border-outline-variant/10 space-y-6">
          {parameters.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2"><CodeBracketIcon className="w-4 h-4" /> Parameters</h4>
              <div className="overflow-x-auto border border-outline-variant/20 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-high text-[10px] text-on-surface-variant uppercase"><tr>{["Name", "Location", "Required", "Type", "Description"].map((h) => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-outline-variant/10">{parameters.map((p, i) => (<tr key={i}><td className="px-4 py-2 font-mono">{p.name ?? p.$ref ?? "?"}</td><td className="px-4 py-2">{p.in ?? "-"}</td><td className="px-4 py-2">{p.required ? "Yes" : "No"}</td><td className="px-4 py-2">{p.type ?? p.schema?.type ?? "object"}</td><td className="px-4 py-2 text-on-surface-variant">{p.description ?? "-"}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
          {requestBodyParsed && <div><h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Request Body</h4><pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-64">{JSON.stringify(requestBodyParsed, null, 2)}</pre></div>}
          {responseBodyParsed && <div><h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Response Body</h4><pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-64">{JSON.stringify(responseBodyParsed, null, 2)}</pre></div>}
          <div className="grid grid-cols-2 gap-6">
            <div><h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Status Codes</h4><div className="flex flex-wrap gap-1">{endpoint.statusCodes?.split(",").map((code) => <Badge key={code} variant={code.trim().startsWith("2") ? "success" : code.trim().startsWith("4") ? "warning" : "danger"}>{code.trim()}</Badge>)}</div></div>
            <div><h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Auth Required</h4><Badge variant={endpoint.requiresAuth ? "warning" : "default"}>{endpoint.requiresAuth ? "Yes" : "No"}</Badge></div>
          </div>
          <GenerateButton loading={generating} onClick={onGenerate} disabled={!canGenerateTests} fullWidth label={hasTests ? "Regenerate tests" : "Generate tests"} icon={hasTests ? <ArrowPathIcon className="w-3.5 h-3.5" /> : <SparklesIcon className="w-3.5 h-3.5" />} />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

const TestAccordion: React.FC<{ test: Test; isExpanded: boolean; onToggle: () => void; canRegenerateTests: boolean; generating: boolean; onRegenerate: () => void; refreshTests: () => void; addToast: (type: ToastItem["type"], message: string) => void; project: Project; endpoint?: Endpoint }> = ({ test, isExpanded, onToggle, canRegenerateTests, generating, onRegenerate, refreshTests, addToast, project, endpoint }) => {
  const method = test.endpointPath.split(" ")[0];
  const methodColor = METHOD_COLORS[method] ?? "bg-surface-container-high text-on-surface-variant";
  const [editMode, setEditMode] = useState(false);
  const [rawTestData, setRawTestData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [quickExecute, setQuickExecute] = useState<{ open: boolean; sectionKey: string; sectionLabel: string; sectionData: any } | null>(null);

  const testDataParsed: Record<string, any> = {};
  TEST_SECTIONS.forEach(({ key }) => {
    try { const v = (test as any)[key]; if (v) testDataParsed[key] = typeof v === "string" ? JSON.parse(v) : v; } catch {}
  });

  const handleSave = async () => {
    const parsedData: Record<string, any> = {};
    for (const key in rawTestData) {
      try { parsedData[key] = JSON.parse(rawTestData[key]); } catch { addToast("error", `Invalid JSON in "${TEST_SECTIONS.find((s) => s.key === key)?.label ?? key}"`); return; }
    }
    try {
      setSaving(true);
      await testService.update({ ...test, ...parsedData } as Test);
      await refreshTests();
      setRawTestData({}); setEditMode(false);
      addToast("success", "Tests updated successfully.");
    } catch { addToast("error", "Error while saving."); } finally { setSaving(false); }
  };

  const SECTION_BADGE_COLORS: Record<string, string> = {
    positive: "bg-emerald-100 text-emerald-700 border-emerald-200",
    validation: "bg-yellow-100 text-yellow-700 border-yellow-200",
    boundary: "bg-blue-100 text-blue-700 border-blue-200",
    wrongType: "bg-orange-100 text-orange-700 border-orange-200",
    missingFields: "bg-red-100 text-red-700 border-red-200",
    auth: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <>
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm">
        <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container-low transition-colors group">
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center ${methodColor}`}>{method}</span>
            <p className="font-mono text-sm text-on-surface">{test.endpointPath}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex gap-1">{TEST_SECTIONS.filter(({ key }) => testDataParsed[key]).map(({ key, label }) => (<span key={key} className="px-1.5 py-0.5 rounded bg-surface-container text-[9px] font-bold text-on-surface-variant">{label.split(" ").slice(1).join(" ") || label}</span>))}</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-on-surface-variant">Active</span></div>
            <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">{isExpanded ? "unfold_less" : "unfold_more"}</span>
          </div>
        </button>
        {isExpanded && (
          <div className="px-5 py-6 border-t border-outline-variant/10 space-y-5">
            {TEST_SECTIONS.map(({ key, label }) =>
              testDataParsed[key] ? (
                <div key={key}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2"><CodeBracketIcon className="w-4 h-4" />{label}</h4>
                    <button onClick={() => setQuickExecute({ open: true, sectionKey: key, sectionLabel: label, sectionData: testDataParsed[key] })} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all hover:shadow-sm active:scale-95 ${SECTION_BADGE_COLORS[key] ?? "bg-indigo-50 text-indigo-700 border-indigo-200"}`} title={`Quick Execute: ${label}`}>
                      <BoltIcon className="w-3 h-3" />Quick Execute
                    </button>
                  </div>
                  {editMode ? (
                    <textarea value={rawTestData[key] !== undefined ? rawTestData[key] : JSON.stringify(testDataParsed[key], null, 2)} rows={13} onChange={(e) => setRawTestData((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full p-4 bg-inverse-surface text-on-primary-container font-mono text-xs rounded-xl border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                  ) : (
                    <pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-96 whitespace-pre-wrap break-words">{JSON.stringify(testDataParsed[key], null, 2)}</pre>
                  )}
                </div>
              ) : null
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {editMode ? (
                <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-60">
                  {saving ? <><ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />Saving…</> : "Save"}
                </button>
              ) : (
                <button onClick={() => setEditMode(true)} className="py-2 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">Edit test</button>
              )}
              <GenerateButton loading={generating} onClick={onRegenerate} disabled={!canRegenerateTests} label="Regenerate" size="xs" />
            </div>
            {editMode && <button onClick={() => { setEditMode(false); setRawTestData({}); }} className="w-full py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors">Cancel</button>}
          </div>
        )}
      </div>
      {quickExecute && (
        <QuickExecuteModal open={quickExecute.open} onClose={() => setQuickExecute(null)} test={test} sectionKey={quickExecute.sectionKey} sectionLabel={quickExecute.sectionLabel} sectionData={quickExecute.sectionData} project={project} endpoint={endpoint} />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TESTED ENDPOINT ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

const TestedEndpointAccordion: React.FC<{ endpoint: Endpoint; getReport: (reportType: "simple" | "full", endpointId: string) => void }> = ({ endpoint, getReport }) => {
  const methodColor = METHOD_COLORS[endpoint.method] ?? "bg-surface-container-high text-on-surface-variant";
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm">
      <div className="p-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center flex-shrink-0 ${methodColor}`}>{endpoint.method}</span>
          <div className="text-left flex-1 min-w-0"><p className="font-mono text-sm text-on-surface truncate">{endpoint.path}</p></div>
        </div>
        <Button variant="outline" icon={<DocumentArrowDownIcon className="w-5 h-5" />} onClick={() => getReport("simple", endpoint.id)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-surface-container-high flex-shrink-0"><span className="text-xs text-on-surface-variant font-bold text-black font-medium">Simple Report</span></Button>
        <Button variant="outline" icon={<DocumentArrowDownIcon className="w-5 h-5" />} onClick={() => getReport("full", endpoint.id)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-surface-container-high flex-shrink-0"><span className="text-xs text-on-surface-variant font-bold text-black font-medium">Full Report</span></Button>
      </div>
    </div>
  );
};

export default ServiceDetailsPage;