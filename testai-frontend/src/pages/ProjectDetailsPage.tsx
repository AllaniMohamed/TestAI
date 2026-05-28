// ServiceDetailsPage.tsx
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
  endpointService,
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
  PlusIcon,
  TagIcon,
  Bars3Icon,
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
  Label,
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

interface ProjectReportStats {
  name: string;
  value: number;
  color: string;
}

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
  result?: { passed: number; failed: number; errors: number; rate: number; duration: number };
  error?: string;
  startTime?: number;
  estimatedGenerationMs?: number;
  estimatedExecutionMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

const METHOD_COLORS: Record<string, string> = {
  GET:     "bg-secondary-container text-on-secondary-container",
  POST:    "bg-primary-container text-on-primary-container",
  PUT:     "bg-tertiary-container text-on-tertiary-container",
  DELETE:  "bg-error-container text-error",
  PATCH:   "bg-secondary-fixed text-on-secondary-fixed",
  OPTIONS: "bg-surface-container-high text-on-surface-variant",
  HEAD:    "bg-surface-container-high text-on-surface-variant",
};

const TEST_SECTIONS = [
  { key: "positive",      label: "Positive Test",       color: "#10b981" },
  { key: "validation",    label: "Validation Test",      color: "#eab308" },
  { key: "boundary",      label: "Boundary Test",        color: "#3b82f6" },
  { key: "wrongType",     label: "Wrong Type Test",      color: "#f97316" },
  { key: "missingFields", label: "Missing Fields Test",  color: "#ef4444" },
  { key: "auth",          label: "Security Test",        color: "#8b5cf6" },
];

const MAGIC_STYLES = `
  @keyframes magicFloat { 0%,100%{transform:translateY(0) rotate(0)} 25%{transform:translateY(-6px) rotate(-1deg)} 75%{transform:translateY(-3px) rotate(1deg)} }
  @keyframes magicGlow  { 0%,100%{box-shadow:0 0 20px 4px rgba(139,92,246,.4),0 0 40px 8px rgba(59,130,246,.2),0 8px 32px rgba(0,0,0,.3)} 50%{box-shadow:0 0 30px 8px rgba(139,92,246,.6),0 0 60px 16px rgba(59,130,246,.3),0 8px 32px rgba(0,0,0,.3)} }
  @keyframes magicShimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes orbPulse  { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
  @keyframes progressSlide { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes panelSlideIn { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes stepDone  { 0%{transform:scale(.5);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
  .magic-float { animation:magicFloat 3s ease-in-out infinite }
  .magic-glow  { animation:magicGlow 2s ease-in-out infinite }
  .magic-panel { animation:panelSlideIn .3s cubic-bezier(.34,1.56,.64,1) }
  .step-done-icon { animation:stepDone .4s cubic-bezier(.34,1.56,.64,1) }
  .magic-shimmer-text { background:linear-gradient(90deg,#c084fc,#818cf8,#38bdf8,#818cf8,#c084fc);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:magicShimmer 2.5s linear infinite }
  .progress-animated { background:linear-gradient(90deg,#7c3aed,#6366f1,#3b82f6,#6366f1,#7c3aed);background-size:200% auto;animation:progressSlide 1.5s linear infinite }
`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — tag extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the primary tag of an endpoint.
 * Priority: explicit tags field → first path segment after /api/
 */
function getEndpointTag(endpoint: Endpoint): string {
  // 1) Use the explicit tags field if present
  if (endpoint.tags) {
    const first = endpoint.tags.split(",")[0]?.trim();
    if (first) return first;
  }
  // 2) Fall back to the path: strip leading /api/ and take first segment
  const path = endpoint.path ?? "";
  const stripped = path.replace(/^\/api(\/v\d+)?/, ""); // strip /api or /api/v1
  const segment = stripped.split("/").filter(Boolean)[0] ?? "general";
  return segment.replace(/[{}]/g, ""); // remove path param braces
}

/**
 * Groups endpoints by their primary tag.
 */
function groupByTag(endpoints: Endpoint[]): Record<string, Endpoint[]> {
  return endpoints.reduce((g, ep) => {
    const tag = getEndpointTag(ep);
    if (!g[tag]) g[tag] = [];
    g[tag].push(ep);
    return g;
  }, {} as Record<string, Endpoint[]>);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD ENDPOINT MODAL (manual mode)
// ─────────────────────────────────────────────────────────────────────────────

interface AddEndpointModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: ToastItem["type"], message: string) => void;
}

const AddEndpointModal: React.FC<AddEndpointModalProps> = ({
  projectId, onClose, onSuccess, addToast,
}) => {
  const [form, setForm] = useState({
    method: "GET",
    path: "",
    description: "",
    tags: "",
    requiresAuth: false,
    statusCodes: "200,400",
    requestBody: "",
    responseBody: "",
  });
  const [saving, setSaving]   = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.path.trim())          { setFormErr("Path is required."); return; }
    if (!form.path.startsWith("/")) { setFormErr("Path must start with /."); return; }
    setSaving(true);
    setFormErr(null);
    try {
      await endpointService.createEndpoint({
        projectId,
        method:        form.method,
        path:          form.path.trim(),
        description:   form.description,
        tags:          form.tags || undefined,
        requiresAuth:  form.requiresAuth,
        discoveryType: "MANUAL",
        statusCodes:   form.statusCodes || "200",
        requestBody:   form.requestBody || undefined,
        responseBody:  form.responseBody || undefined,
      });
      addToast("success", `Endpoint "${form.method} ${form.path}" added successfully.`);
      onSuccess();
    } catch (err: any) {
      setFormErr(err.response?.data?.message || "Error creating endpoint.");
    } finally {
      setSaving(false);
    }
  };

  const needsBody = ["POST", "PUT", "PATCH"].includes(form.method);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <PlusIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Add Endpoint</h3>
              <p className="text-[11px] text-slate-500">Manual discovery mode</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/70 rounded-xl transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {formErr && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <XCircleIcon className="w-4 h-4 shrink-0" />{formErr}
            </div>
          )}

          {/* Method + Path */}
          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Method</label>
              <select
                value={form.method}
                onChange={(e) => set("method", e.target.value)}
                className="px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {HTTP_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Path <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="/api/resource/{id}"
                value={form.path}
                onChange={(e) => set("path", e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Description</label>
            <input
              type="text"
              placeholder="Brief description of this endpoint"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          {/* Tags + Status codes row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Tags <span className="text-[10px] font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="users, auth"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Status Codes <span className="text-[10px] font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="200,201,400,404"
                value={form.statusCodes}
                onChange={(e) => set("statusCodes", e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          {/* Request Body — only for POST/PUT/PATCH */}
          {needsBody && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Request Body Schema <span className="text-[10px] font-normal">(JSON Schema)</span>
              </label>
              <textarea
                rows={4}
                placeholder={'{\n  "type": "object",\n  "properties": { ... }\n}'}
                value={form.requestBody}
                onChange={(e) => set("requestBody", e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-xs font-mono focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
          )}

          {/* Auth required toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`relative w-10 h-5 rounded-full transition-colors ${form.requiresAuth ? "bg-primary" : "bg-slate-200"}`}
              onClick={() => set("requiresAuth", !form.requiresAuth)}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.requiresAuth ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-primary transition-colors">Requires Authentication</p>
              <p className="text-[10px] text-on-surface-variant">Auth headers will be included when testing</p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
          >
            {saving ? "Adding…" : "Add Endpoint"}
          </button>
        </div>
      </div>
    </div>
  );
};

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
      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-white/10">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {endpointCount} endpoint{endpointCount !== 1 ? "s" : ""} ready
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="magic-float magic-glow relative group flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-bold text-sm select-none transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg,#7c3aed 0%,#6366f1 40%,#3b82f6 100%)" }}
      >
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-300" style={{ animation: "orbPulse 1.8s ease-in-out infinite" }} />
        <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-pink-400" style={{ animation: "orbPulse 2.2s ease-in-out infinite .4s" }} />
        <span className="absolute top-1 left-2 w-1.5 h-1.5 rounded-full bg-cyan-300" style={{ animation: "orbPulse 1.6s ease-in-out infinite .8s" }} />
        <span className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
          <RocketLaunchIcon className="w-4 h-4" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-white/70 text-[10px] font-normal uppercase tracking-widest">One-click</span>
          <span className="magic-shimmer-text text-sm font-black tracking-tight">Auto Pilot ✦</span>
        </span>
      </button>
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAGIC PROGRESS PANEL
// ─────────────────────────────────────────────────────────────────────────────

const MagicProgressPanel: React.FC<{
  state: MagicExecutionState;
  onMinimize: () => void;
  onClose: () => void;
}> = ({ state, onMinimize, onClose }) => {
  const { phase, minimized, steps, result, error } = state;
  const overallPercent = phase === "done" || phase === "error" ? 100 :
    phase === "generating" ? Math.round((steps[0]?.percent ?? 0) / 2) :
    phase === "executing"  ? 50 + Math.round((steps[1]?.percent ?? 0) / 2) : 0;
  const borderColor = phase === "done" ? "border-emerald-500/40" : phase === "error" ? "border-red-500/40" : "border-violet-500/40";

  return (
    <>
      <style>{MAGIC_STYLES}</style>
      <div
        className={`magic-panel fixed bottom-6 right-6 z-[60] w-80 rounded-2xl shadow-2xl border backdrop-blur-xl overflow-hidden ${borderColor}`}
        style={{ background: "rgba(15,15,25,0.95)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          style={{ background: "linear-gradient(135deg,rgba(124,58,237,.3),rgba(99,102,241,.2),rgba(59,130,246,.2))", borderBottom: "1px solid rgba(255,255,255,.07)" }}
          onClick={onMinimize}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)" }}>
              <RocketLaunchIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold">Auto Pilot</p>
              <p className="text-[10px] text-slate-400">
                {phase === "done" ? "Completed ✓" : phase === "error" ? "Failed" : phase === "generating" ? "Generating tests…" : phase === "executing" ? "Executing tests…" : "Starting…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              {minimized ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
            </button>
            {(phase === "done" || phase === "error") && (
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Overall progress</span>
            <span className="text-[10px] font-bold text-violet-400">{overallPercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${phase === "done" ? "bg-emerald-500" : phase === "error" ? "bg-red-500" : "progress-animated"}`}
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>

        {!minimized && (
          <div className="px-4 py-4 space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {step.status === "done"    ? <CheckCircleIcon className="step-done-icon w-5 h-5 text-emerald-400" /> :
                     step.status === "error"   ? <XCircleIcon className="w-5 h-5 text-red-400" /> :
                     step.status === "running" ? <ArrowPathIcon className="w-4 h-4 text-violet-400 animate-spin" /> :
                                                 <div className="w-4 h-4 rounded-full border-2 border-slate-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${step.status === "done" ? "text-emerald-400" : step.status === "error" ? "text-red-400" : step.status === "running" ? "text-white" : "text-slate-500"}`}>{step.label}</span>
                      {step.status === "running" && <span className="text-[10px] text-violet-400 font-bold ml-2">{step.percent}%</span>}
                      {step.status === "done"    && <span className="text-[10px] text-emerald-400 font-bold ml-2">Done</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{step.sublabel}</p>
                  </div>
                </div>
                {step.status !== "waiting" && (
                  <div className="ml-7 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${step.status === "done" ? "bg-emerald-500" : step.status === "error" ? "bg-red-500" : "progress-animated"}`}
                      style={{ width: step.status === "done" || step.status === "error" ? "100%" : `${step.percent}%` }}
                    />
                  </div>
                )}
                {step.detail && step.status !== "waiting" && <p className="ml-7 text-[10px] text-slate-500 italic">{step.detail}</p>}
              </div>
            ))}
            {phase === "done" && result && (
              <div className="mt-2 rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(135deg,rgba(16,185,129,.12),rgba(6,78,59,.12))", border: "1px solid rgba(16,185,129,.25)" }}>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 text-xs font-bold">Auto Pilot completed!</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-emerald-500/10 rounded-lg p-1.5"><p className="text-emerald-300 font-bold text-sm">{result.passed}</p><p className="text-[10px] text-slate-500">Passed</p></div>
                  <div className="bg-red-500/10 rounded-lg p-1.5"><p className="text-red-300 font-bold text-sm">{result.failed}</p><p className="text-[10px] text-slate-500">Failed</p></div>
                  <div className="bg-violet-500/10 rounded-lg p-1.5"><p className="text-violet-300 font-bold text-sm">{result.rate.toFixed(0)}%</p><p className="text-[10px] text-slate-500">Rate</p></div>
                </div>
                <p className="text-[10px] text-slate-500 text-center">Total duration: {(result.duration / 1000).toFixed(1)}s</p>
              </div>
            )}
            {phase === "error" && error && (
              <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)" }}>
                <div className="flex items-start gap-2">
                  <XCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
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

const MiniJsonViewer: React.FC<{ data: any; maxHeight?: string }> = ({ data, maxHeight = "200px" }) => {
  const normalize = (input: any): any => {
    if (typeof input === "string") { try { const p = JSON.parse(input); return typeof p === "string" ? normalize(p) : p; } catch { return input; } }
    return input;
  };
  const formatted = (() => { try { return JSON.stringify(normalize(data), null, 2); } catch { return String(data); } })();
  const lines = formatted.split("\n");
  const highlight = (line: string): React.ReactNode => {
    const els: React.ReactNode[] = []; let i = 0, k = 0;
    while (i < line.length) {
      if (line[i] === " ") { let j = i; while (j < line.length && line[j] === " ") j++; els.push(<span key={k++}>{line.substring(i, j)}</span>); i = j; continue; }
      if ("{}[],:".includes(line[i])) { els.push(<span key={k++} className="text-gray-400">{line[i]}</span>); i++; continue; }
      if (line[i] === '"') {
        let j = i + 1, esc = false;
        while (j < line.length) { if (line[j] === "\\" && !esc) esc = true; else if (line[j] === '"' && !esc) break; else esc = false; j++; }
        const token = line.substring(i, j + 1); let p2 = j + 1; while (p2 < line.length && line[p2] === " ") p2++;
        const isKey = p2 < line.length && line[p2] === ":";
        els.push(<span key={k++} className={isKey ? "text-purple-400" : "text-green-400"}>{token}</span>); i = j + 1; continue;
      }
      const nm = line.slice(i).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?\b/); const bm = line.slice(i).match(/^(true|false|null)\b/);
      if (nm) { els.push(<span key={k++} className="text-orange-400">{nm[0]}</span>); i += nm[0].length; continue; }
      if (bm) { els.push(<span key={k++} className="text-blue-400">{bm[0]}</span>); i += bm[0].length; continue; }
      els.push(<span key={k++}>{line[i]}</span>); i++;
    }
    return <>{els}</>;
  };
  return (
    <div className="w-full bg-[#0d1117] rounded-xl border border-slate-700 overflow-auto font-mono text-xs" style={{ maxHeight }}>
      <div className="flex">
        <div className="py-3 pl-3 pr-2 text-right select-none text-gray-600 border-r border-gray-700 min-w-[2.5rem]">
          {lines.map((_, idx) => <div key={idx + 1} className="leading-5">{idx + 1}</div>)}
        </div>
        <div className="p-3 pl-2 text-gray-300 leading-5">
          {lines.map((line, idx) => <div key={idx} className="whitespace-pre">{highlight(line)}</div>)}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QUICK EXECUTE MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface QuickExecuteModalProps {
  open: boolean; onClose: () => void;
  test: Test; sectionKey: string; sectionLabel: string; sectionData: any;
  project: Project; endpoint?: Endpoint;
}

const QuickExecuteModal: React.FC<QuickExecuteModalProps> = ({ open, onClose, test, sectionKey, sectionLabel, sectionData, project, endpoint }) => {
  const [response, setResponse] = useState<ApiResponseDTO | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setResponse(null); setError(null); setIsExecuting(false); } }, [open]);
  if (!open) return null;

  const inner = sectionData?.response ?? sectionData ?? {};
  const method = (() => { const p = test.endpointPath?.split(" "); return p?.length >= 2 ? p[0] : (endpoint?.method ?? "GET"); })();
  const rawPath = (() => { const p = test.endpointPath?.split(" "); return p?.length >= 2 ? p[1] : (endpoint?.path ?? "/"); })();
  const pathParams: Record<string, string> = inner.pathParams ?? {};
  const queryParams: Record<string, string> = inner.queryParams ?? {};
  const payload = inner.payload ?? inner.body ?? null;
  const testHeaders: Record<string, string> = inner.headers ?? {};
  const expectedStatus: number | undefined = inner.expectedStatus;
  const testName: string = inner.name ?? sectionLabel;

  let resolvedPath = rawPath;
  Object.entries(pathParams).forEach(([key, val]) => {
    resolvedPath = resolvedPath.replace(`{${key}}`, String(val)).replace(`:${key}`, String(val));
  });
  let fullUrl = (project.projectUrl ?? "").replace(/\/$/, "") + resolvedPath;
  if (Object.keys(queryParams).length > 0) fullUrl += "?" + new URLSearchParams(queryParams).toString();

  const buildAuthHeaders = (): Record<string, string> => {
    if (sectionKey === "auth") return {};
    const h: Record<string, string> = {}; const creds = project.credentials;
    if (!creds) return h;
    switch (project.authType) {
      case "BASIC":   if (creds.basicUsername && creds.basicPassword) h["Authorization"] = `Basic ${btoa(`${creds.basicUsername}:${creds.basicPassword}`)}`; break;
      case "BEARER":  if (creds.bearerToken)   h["Authorization"] = `Bearer ${creds.bearerToken}`; break;
      case "API_KEY": if (creds.apiKeyLocation === "HEADER" && creds.apiKeyHeader && creds.apiKey) h[creds.apiKeyHeader] = creds.apiKey; break;
    }
    return h;
  };

  const allHeaders: Record<string, string> = { "Content-Type": "application/json", ...buildAuthHeaders(), ...testHeaders };
  const handleExecute = async () => {
    setIsExecuting(true); setError(null); setResponse(null);
    try {
      const res = await apiRunnerService.executeRequest({ method, url: fullUrl, headers: allHeaders, queryParams, requestBody: method !== "GET" && method !== "DELETE" && payload ? JSON.stringify(payload) : undefined, saveAfterExecution: false });
      setResponse(res.data);
    } catch (err: any) { setError(err.response?.data?.message || err.message || "Execution error"); } finally { setIsExecuting(false); }
  };

  const methodColor = METHOD_COLORS[method] ?? "bg-surface-container-high text-on-surface-variant";
  const isMatch = response !== null && expectedStatus !== undefined ? response.status === expectedStatus : null;
  const CATCOLORS: Record<string, string> = { positive: "bg-emerald-100 text-emerald-700", validation: "bg-yellow-100 text-yellow-700", boundary: "bg-blue-100 text-blue-700", wrongType: "bg-orange-100 text-orange-700", missingFields: "bg-red-100 text-red-700", auth: "bg-purple-100 text-purple-700" };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl z-10 max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shadow-sm"><BoltIcon className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">Quick Execute</h3><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${CATCOLORS[sectionKey] ?? "bg-slate-100 text-slate-600"}`}>{sectionLabel}</span></div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-sm">{testName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/70 rounded-xl transition-colors"><XMarkIcon className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1.5">
            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex-shrink-0 ${methodColor}`}>{method}</span>
            <p className="flex-1 font-mono text-sm text-slate-200 truncate px-1">{fullUrl}</p>
            {expectedStatus && <span className="flex-shrink-0 px-2.5 py-1.5 bg-indigo-900 border border-indigo-700 text-indigo-200 font-mono text-xs font-bold rounded-lg">Expected: {expectedStatus}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Request</h4>
              {Object.keys(allHeaders).length > 0 && <div><p className="text-xs font-semibold text-slate-500 mb-1.5">Headers</p><div className="bg-[#0d1117] rounded-xl p-3 font-mono text-xs space-y-1 border border-slate-700 max-h-28 overflow-auto">{Object.entries(allHeaders).map(([k, v]) => (<div key={k}><span className="text-purple-400">{k}</span><span className="text-gray-400">: </span><span className="text-green-400">{k.toLowerCase() === "authorization" ? v.substring(0, 30) + (v.length > 30 ? "…" : "") : v}</span></div>))}</div></div>}
              {payload ? <div><p className="text-xs font-semibold text-slate-500 mb-1.5">Request Body</p><MiniJsonViewer data={payload} maxHeight="220px" /></div> : <div className="text-xs text-slate-400 italic px-1">No request body</div>}
              {sectionKey === "auth" && <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700"><ShieldCheckIcon className="w-4 h-4 shrink-0" />Auth headers omitted — testing unauthenticated access</div>}
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Response</h4>
              {response !== null && expectedStatus !== undefined && (
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${isMatch ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                  <div className="text-center"><p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Expected</p><p className="font-mono font-black text-2xl text-slate-900">{expectedStatus}</p></div>
                  <div className="flex flex-col items-center gap-1"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMatch ? "bg-emerald-500" : "bg-red-500"}`}>{isMatch ? <CheckCircleIcon className="w-6 h-6 text-white" /> : <XCircleIcon className="w-6 h-6 text-white" />}</div><span className={`text-[10px] font-bold ${isMatch ? "text-emerald-600" : "text-red-600"}`}>{isMatch ? "PASS" : "FAIL"}</span></div>
                  <div className="text-center"><p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Received</p><p className={`font-mono font-black text-2xl ${isMatch ? "text-emerald-600" : "text-red-600"}`}>{response.status}</p></div>
                </div>
              )}
              {response !== null && <div className="flex items-center gap-4 text-xs"><div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold ${response.status >= 200 && response.status < 300 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}><span className={`w-2 h-2 rounded-full ${response.status >= 200 && response.status < 300 ? "bg-green-500" : "bg-red-500"}`} />{response.status} {response.statusText}</div><span className="text-slate-500"><span className="font-bold text-slate-700">{response.responseTimeMs}ms</span> · {response.size}</span></div>}
              {response !== null ? <div><p className="text-xs font-semibold text-slate-500 mb-1.5">Response Body</p><MiniJsonViewer data={response.body} maxHeight="260px" /></div> : error ? <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><XCircleIcon className="w-5 h-5 shrink-0 mt-0.5" /><span>{error}</span></div> : <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center"><BoltIcon className="w-8 h-8 text-slate-300 mb-2" /><p className="text-sm text-slate-400">Click Execute to run this test</p></div>}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">Target: <span className="font-mono text-slate-600">{project.projectUrl}</span></p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors">Close</button>
            <button onClick={handleExecute} disabled={isExecuting} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${isExecuting ? "bg-slate-300 text-slate-500 cursor-wait" : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:scale-95 shadow-indigo-200"}`}>
              {isExecuting ? <><ArrowPathIcon className="w-4 h-4 animate-spin" />Executing…</> : <><BoltIcon className="w-4 h-4" />Execute</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST + CONFIRM + HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const ToastContainer: React.FC<{ toasts: ToastItem[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  if (!toasts.length) return null;
  return (
    <>
      <style>{`@keyframes toastIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none" style={{ marginRight: "336px" }}>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm bg-white" style={{ animation: "toastIn .22s ease-out", borderColor: t.type === "success" ? "#bbf7d0" : t.type === "error" ? "#fecaca" : "#bfdbfe" }}>
            {t.type === "success" && <CheckCircleIcon className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />}
            {t.type === "error"   && <XCircleIcon    className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            {t.type === "info"    && <SparklesIcon   className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
            <p className="text-sm font-medium text-slate-800 flex-1">{t.message}</p>
            <button onClick={() => onRemove(t.id)} className="text-slate-400 hover:text-slate-600"><XMarkIcon className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
};

interface ConfirmModalProps { open: boolean; title: string; message: string; confirmLabel?: string; variant?: "danger" | "primary"; onConfirm: () => void; onCancel: () => void; }
const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, title, message, confirmLabel = "Confirm", variant = "primary", onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 z-10">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${variant === "danger" ? "bg-red-50" : "bg-indigo-50"}`}>
            {variant === "danger" ? <ExclamationTriangleIcon className="w-5 h-5 text-red-500" /> : <SparklesIcon className="w-5 h-5 text-indigo-500" />}
          </div>
          <div><h3 className="font-bold text-slate-900">{title}</h3><p className="text-sm text-slate-500 mt-1">{message}</p></div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-semibold text-white rounded-xl ${variant === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

const GenerateButton: React.FC<{ loading: boolean; onClick: () => void; disabled?: boolean; label: string; icon?: React.ReactNode; size?: "sm" | "xs"; fullWidth?: boolean }> = ({ loading, onClick, disabled, label, icon, size = "sm", fullWidth }) => (
  <button onClick={onClick} disabled={loading || disabled} className={`flex items-center justify-center gap-2 font-semibold border border-outline-variant/30 rounded-lg transition-all ${fullWidth ? "w-full" : ""} ${size === "sm" ? "px-3 py-2 text-sm" : "px-2.5 py-1.5 text-xs"} ${loading ? "bg-primary/5 text-primary border-primary/20 cursor-wait" : disabled ? "opacity-40 cursor-not-allowed bg-surface-container text-on-surface-variant" : "bg-white text-on-surface hover:bg-surface-container-low cursor-pointer"}`}>
    {loading ? <><ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-primary shrink-0" /><span>Generating…</span></> : <>{icon ?? <SparklesIcon className="w-3.5 h-3.5 shrink-0" />}<span>{label}</span></>}
  </button>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-2xl p-12 flex flex-col items-center text-center">
    <div className="text-outline mb-4 opacity-30">{icon}</div>
    <h3 className="text-lg font-bold mb-2">{title}</h3>
    <p className="text-sm text-on-surface-variant max-w-sm">{description}</p>
  </div>
);

const TabItem: React.FC<{ active: boolean; label: string; onClick: () => void; icon: React.ReactNode; disabled?: boolean }> = ({ active, label, onClick, icon, disabled }) => (
  <button onClick={onClick} disabled={disabled} className={`flex items-center gap-2 pb-4 px-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${active ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
    {icon}{label}
  </button>
);

const ExecutionTerminal: React.FC<{ logs: ExecutionLog[]; isRunning: boolean; onStop: () => void }> = ({ logs, isRunning, onStop }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  const icon  = (t: ExecutionLog["type"]) => ({ success: "✓", error: "✗", warning: "⚠", info: "→" }[t]);
  const color = (t: ExecutionLog["type"]) => ({ success: "text-green-400", error: "text-red-400", warning: "text-yellow-400", info: "text-blue-400" }[t]);
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
      <div className="bg-slate-800 px-5 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" /></div>
          <span className="text-sm font-semibold text-slate-300 font-mono">Execution Terminal</span>
          {isRunning && <div className="flex items-center gap-2 ml-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-xs text-green-400 font-semibold">RUNNING</span></div>}
        </div>
        {isRunning && <button onClick={onStop} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20"><StopIcon className="w-3.5 h-3.5" />Stop</button>}
      </div>
      <div ref={ref} className="bg-slate-900 p-4 font-mono text-xs text-slate-300 h-[500px] overflow-y-auto custom-scrollbar" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(255,255,255,.02) 19px,rgba(255,255,255,.02) 20px)" }}>
        {logs.length === 0 ? <div className="flex items-center justify-center h-full text-slate-500"><p>Click "Execute entire project" to start...</p></div> :
          logs.map((log) => (<div key={log.id} className="mb-1 flex items-start gap-3"><span className="text-slate-500 select-none shrink-0">[{log.timestamp.toLocaleTimeString()}]</span><span className={`${color(log.type)} shrink-0 font-bold`}>{icon(log.type)}</span><span className="flex-1">{log.message}</span></div>))}
        {isRunning && <div className="mt-2 flex items-center gap-2 text-slate-500"><div className="w-1 h-3 bg-green-400 animate-pulse" /><span className="animate-pulse">Execution in progress...</span></div>}
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

  // ── Responsive sidebar ─────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data
  const [project, setProject]                 = useState<Project | null>(null);
  const [endpoints, setEndpoints]             = useState<Endpoint[]>([]);
  const [tests, setTests]                     = useState<Test[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [endpointsCount, setEndpointsCount]   = useState(0);
  const [testedEndpoints, setTestedEndpoints] = useState<Endpoint[]>([]);

  // Stats
  const [successRate, setSuccessRate]           = useState<Record<string, number>>({});
  const [projectStats, setProjectStats]         = useState<ProjectReportStats[]>([]);
  const [projectChartData, setProjectChartData] = useState<Record<string, any>[]>([]);

  // UI
  const [rescanning, setRescanning]               = useState(false);
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId]       = useState<string | null>(null);
  const [showShareModal, setShowShareModal]       = useState(false);
  const [showAddEndpointModal, setShowAddEndpointModal] = useState(false);

  // Generation
  const [generatingKeys, setGeneratingKeys] = useState<Set<string>>(new Set());

  // Toast / Confirm
  const [toasts, setToasts]       = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; variant?: "danger" | "primary"; confirmLabel?: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  // Auth / role
  const [isOwner, setIsOwner]         = useState(false);
  const [userRole, setUserRole]       = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<"READ_ONLY" | "READ_WRITE" | null>(null);
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [sharedAt, setSharedAt]       = useState<string | null>(null);

  // History
  const [executions, setExecutions]             = useState<ProjectExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ProjectExecution | null>(null);
  const [testExecutions, setTestExecutions]     = useState<TestExecution[]>([]);
  const [loadingHistory, setLoadingHistory]     = useState(false);
  const [executorName, setExecutorName]         = useState<string | null>(null);

  // Execution terminal
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isExecuting, setIsExecuting]     = useState(false);
  const pollingIntervalRef      = useRef<NodeJS.Timeout | null>(null);
  const currentExecutionIdRef   = useRef<string | null>(null);

  // Settings form
  const [editForm, setEditForm] = useState({ name: "", description: "", projectUrl: "", docUrl: "", authType: "NONE", authUsername: "", authPassword: "", apiKey: "", apiKeyHeader: "", apiKeyLocation: "HEADER", bearerToken: "" });
  const [updating, setUpdating] = useState(false);

  // Magic
  const magicPollingRef = useRef<NodeJS.Timeout | null>(null);
  const [magicState, setMagicState] = useState<MagicExecutionState>({
    phase: "idle", minimized: false, visible: false,
    steps: [
      { label: "Generate Tests", sublabel: "Waiting…", status: "waiting", percent: 0 },
      { label: "Execute Tests",  sublabel: "Waiting…", status: "waiting", percent: 0 },
    ],
  });

  const userStr       = sessionStorage.getItem("user");
  const currentUserObj = userStr ? JSON.parse(userStr) : null;
  const currentUserId  = currentUserObj?.id;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastItem["type"], message: string) => {
    const toastId = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id: toastId, type, message }]);
  }, []);
  const removeToast   = useCallback((id: string) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  const openConfirm   = (title: string, message: string, onConfirm: () => void, variant: "danger" | "primary" = "primary", confirmLabel = "Confirm") =>
    setConfirmModal({ open: true, title, message, variant, confirmLabel, onConfirm });
  const closeConfirm  = () => setConfirmModal((p) => ({ ...p, open: false }));
  const addLog        = useCallback((type: ExecutionLog["type"], message: string) =>
    setExecutionLogs((p) => [...p, { id: Math.random().toString(36).slice(2), timestamp: new Date(), type, message }]), []);
  const clearLogs     = useCallback(() => setExecutionLogs([]), []);
  const stopPolling   = useCallback(() => { if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; } }, []);
  const stopMagic     = useCallback(() => { if (magicPollingRef.current) { clearInterval(magicPollingRef.current); magicPollingRef.current = null; } }, []);

  const handleStopExecution = () => { stopPolling(); setIsExecuting(false); currentExecutionIdRef.current = null; addLog("warning", "⚠️  Execution stopped by user."); addToast("info", "Execution stopped."); };

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
    if (!selectedExecution?.executedBy) { setExecutorName(null); return; }
    const uid = selectedExecution.executedBy;
    if (uid === currentUserId) { setExecutorName(null); return; }
    userService.getUserById(uid).then((r) => setExecutorName(r.data.name || r.data.email || "Unknown")).catch(() => setExecutorName("Unknown"));
  }, [selectedExecution, currentUserId]);

  useEffect(() => { return () => { stopPolling(); stopMagic(); }; }, [stopPolling, stopMagic]);

  useEffect(() => {
    if (project) {
      const c = (project as any).credentials || {};
      setEditForm({ name: project.name, description: project.description, projectUrl: project.projectUrl, docUrl: project.docUrl || "", authType: project.authType, authUsername: c.basicUsername || "", authPassword: c.basicPassword || "", apiKey: c.apiKey || "", apiKeyHeader: c.apiKeyHeader || "", apiKeyLocation: c.apiKeyLocation || "HEADER", bearerToken: c.bearerToken || "" });
    }
  }, [project]);

  // ── Data loading ───────────────────────────────────────────────────────────
  const refreshTests = async () => {
    if (!id) return;
    const r = await testService.getTestsByProjectId(id);
    setTests(r.data as Test[]);
  };

  const refreshTestedEndpoints = async () => {
    if (!id) return;
    try { const r = await executionService.getTestedEndpoints(id); setTestedEndpoints(r.data as Endpoint[]); } catch { setTestedEndpoints([]); }
  };

  const refreshSuccessRate = async () => {
    if (!id) return;
    try {
      const r = await executionService.getProjectSuccessRate(id);
      setSuccessRate(r.data);
      setProjectStats([
        { name: "Passed", value: Math.round((r.data.SUCCESS / r.data.TOTAL) * 100), color: "#22c55e" },
        { name: "Failed", value: Math.round((r.data.FAILED  / r.data.TOTAL) * 100), color: "#ef4444" },
        { name: "Error",  value: Math.round((r.data.ERROR   / r.data.TOTAL) * 100), color: "#e69138" },
      ]);
    } catch { setSuccessRate({}); }
  };

  const refreshProjectChartData = async () => {
    if (!id) return;
    try {
      const r = await executionService.getProjectSuccessRateHistory(id);
      setProjectChartData(Object.entries(r.data).map(([ds, v]) => {
        const d = new Date(ds);
        return { name: `${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`, success: Math.round(v as number) };
      }));
    } catch { setProjectChartData([]); }
  };

  const refreshStats = async () => {
    await refreshTestedEndpoints();
    await refreshSuccessRate();
    await refreshProjectChartData();
  };

  const loadProjectData = async () => {
    try {
      setLoading(true); setError(null);
      const pr = await projectService.getProjectById(id!);
      setProject(pr.data as unknown as Project);
      const s = sessionStorage.getItem("user");
      const uid = s ? JSON.parse(s).id : null;
      setIsOwner(pr.data.userId === uid);
      const er = await projectService.getProjectEndpoints(id!);
      setEndpoints(er.data as Endpoint[]);
      const cr = await projectService.countProjectEndpoints(id!);
      setEndpointsCount(cr.data.count || er.data.length);
      await refreshTests();
      await refreshStats();
      try {
        const execRes = await executionService.getProjectExecutions(id!);
        setExecutions(execRes.data);
      } catch {}
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
      const r = await executionService.getProjectExecutions(id);
      setExecutions(r.data);
      if (r.data.length > 0) { setSelectedExecution(r.data[0]); await loadTestExecutions(r.data[0].id); }
    } catch {} finally { setLoadingHistory(false); }
  };

  const loadTestExecutions = async (executionId: string) => {
    try { refreshStats(); const r = await executionService.getTestExecutionsByExecutionId(executionId); setTestExecutions(r.data); } catch { setTestExecutions([]); }
  };

  // ── Reports ────────────────────────────────────────────────────────────────
  const handleDownloadProjectReport = async (t: "simple" | "full") => {
    if (!id) return;
    try {
      const r = t === "simple" ? await executionService.getSimpleProjectReport(id) : await executionService.getProjectReport(id);
      saveAs(new Blob([r.data], { type: "application/pdf" }), `${project?.name?.replaceAll(" ","_") || "project"}-${t}-report.pdf`);
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error downloading report."); }
  };
  const handleDownloadEndpointReport = async (t: "simple" | "full", endpointId: string) => {
    if (!id) return;
    try {
      const r = t === "simple" ? await executionService.getSimpleSingleEndpointReport(id, endpointId) : await executionService.getSingleEndpointReport(id, endpointId);
      const ep = endpoints.find((e) => e.id === endpointId);
      saveAs(new Blob([r.data], { type: "application/pdf" }), `${project?.name?.replaceAll(" ","_") || "project"}-${ep ? ep.path.replaceAll("/","_") : "endpoint"}-${t}-report.pdf`);
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error downloading endpoint report."); }
  };
  const handleDownloadTagReport = async (t: "simple" | "full", tag: string) => {
    if (!id) return;
    try {
      const r = t === "simple" ? await executionService.getSimpleTagReport(id, tag) : await executionService.getTagReport(id, tag);
      saveAs(new Blob([r.data], { type: "application/pdf" }), `${project?.name?.replaceAll(" ","_") || "project"}-${tag}-${t}-report.pdf`);
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error downloading tag report."); }
  };

  // ── Rescan ─────────────────────────────────────────────────────────────────
  const handleRescanEndpoints = async () => {
    if (!id) return;
    try { setRescanning(true); await projectService.scanProjectEndpoints(id); await loadProjectData(); addToast("success", "Endpoints rescanned successfully."); }
    catch (err: any) { addToast("error", err.response?.data?.message || "Error during rescan."); } finally { setRescanning(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteProject = () =>
    openConfirm("Delete Project", `Delete "${project?.name}"? This cannot be undone.`, async () => {
      closeConfirm();
      try { await projectService.deleteProject(id!); addToast("success", "Project deleted."); navigate("/projects"); }
      catch (err: any) { addToast("error", err.response?.data?.message || "Error during deletion."); }
    }, "danger", "Delete Permanently");

  // ── Update ─────────────────────────────────────────────────────────────────
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault(); if (!id) return;
    setUpdating(true);
    try {
      const data: Partial<UpdateProjectRequest> = { name: editForm.name, description: editForm.description, projectUrl: editForm.projectUrl, docUrl: editForm.docUrl || undefined, authType: editForm.authType };
      if (editForm.authType === "BASIC")    { data.authUsername = editForm.authUsername || undefined; data.authPassword = editForm.authPassword || undefined; }
      if (editForm.authType === "API_KEY")  { data.apiKey = editForm.apiKey || undefined; data.apiKeyHeader = editForm.apiKeyHeader || undefined; data.apiKeyLocation = editForm.apiKeyLocation || undefined; }
      if (editForm.authType === "BEARER")   { data.bearerToken = editForm.bearerToken || undefined; }
      await projectService.updateProject(id, data);
      const pr = await projectService.getProjectById(id);
      setProject(pr.data as unknown as Project);
      addToast("success", "Project updated successfully.");
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error updating project."); } finally { setUpdating(false); }
  };

  // ── Generation ─────────────────────────────────────────────────────────────
  const doGenerate = async (eps: Endpoint[], key: string) => {
    setGeneratingKeys((p) => new Set(p).add(key));
    try {
      await testService.generate(eps);
      const r = await testService.getTestsByProjectId(id!);
      setTests(r.data as Test[]);
      addToast("success", eps.length === 1 ? `Tests generated for "${eps[0].path}".` : `Tests generated for ${eps.length} endpoints.`);
    } catch (err: any) { addToast("error", err.response?.data?.message || "Error during generation."); }
    finally { setGeneratingKeys((p) => { const n = new Set(p); n.delete(key); return n; }); }
  };

  const handleGenerateTests = (eps: Endpoint[], key: string) =>
    openConfirm("Generate Tests", eps.length === 1 ? `Generate tests for "${eps[0].path}"?` : `Generate tests for ${eps.length} endpoint(s)?`, () => { closeConfirm(); doGenerate(eps, key); }, "primary", "Generate");

  const handleRegenerateTests = (testIds: string[], key: string) => {
    const epIds = new Set(tests.filter((t) => testIds.includes(t.id)).map((t) => t.endpointId));
    const eps   = endpoints.filter((ep) => epIds.has(ep.id));
    openConfirm("Regenerate Tests", `Regenerate ${testIds.length} test(s)? Existing data will be overwritten.`, () => { closeConfirm(); doGenerate(eps, key); }, "primary", "Regenerate");
  };

  // ── Execute project ────────────────────────────────────────────────────────
  const handleExecuteAllProject = async () => {
    if (!id || !project) return;
    stopPolling(); clearLogs(); setIsExecuting(true); currentExecutionIdRef.current = null;
    try {
      const uid = currentUserId;
      addLog("info", `🚀 Starting execution of project "${project.name}"`);
      const resp = await executionService.startExecution({ projectId: id, executedBy: uid, executionContext: "manual" });
      const executionId = resp.data.executionId;
      currentExecutionIdRef.current = executionId;
      addLog("success", `✓ Execution launched: ${executionId}`);
      pollingIntervalRef.current = setInterval(async () => {
        try {
          if (!currentExecutionIdRef.current) { stopPolling(); return; }
          const statusRes = await executionService.getExecutionStatus(currentExecutionIdRef.current);
          const status    = statusRes.data;
          const logsRes   = await executionService.getExecutionLogs(currentExecutionIdRef.current);
          const existing  = new Set(executionLogs.map((l) => l.message));
          const newLogs: ExecutionLog[] = logsRes.data
            .filter((raw) => !existing.has(raw))
            .map((raw) => {
              let type: ExecutionLog["type"] = "info";
              if (raw.toLowerCase().includes("error") || raw.includes("✗")) type = "error";
              else if (raw.toLowerCase().includes("success") || raw.includes("✓")) type = "success";
              else if (raw.toLowerCase().includes("warning") || raw.includes("⚠")) type = "warning";
              return { id: Math.random().toString(36).slice(2), timestamp: new Date(), type, message: raw };
            });
          if (newLogs.length) setExecutionLogs((p) => [...p, ...newLogs]);
          if (status.status === "COMPLETED" || status.status === "FAILED") {
            stopPolling(); setIsExecuting(false); currentExecutionIdRef.current = null;
            addLog(status.status === "COMPLETED" ? "success" : "error", `🏁 ${status.status} — ${status.successRate?.toFixed(1)}% pass rate`);
            addToast(status.status === "COMPLETED" ? "success" : "error", `Execution ${status.status === "COMPLETED" ? "completed" : "failed"}!`);
            setTimeout(() => loadExecutionHistory(), 1500);
          }
        } catch {}
      }, 2000);
    } catch (err: any) {
      stopPolling(); setIsExecuting(false); currentExecutionIdRef.current = null;
      addLog("error", `✗ ${err.response?.data?.message || err.message}`);
      addToast("error", "Execution launch failed.");
    }
  };

  // ── Magic ──────────────────────────────────────────────────────────────────
  const handleMagicExecution = useCallback(async () => {
    if (!id || !project) return;
    const estGenMs  = endpoints.length * 8000;
    const estExecMs = endpoints.length * 6 * 2000;
    setMagicState({ phase: "generating", minimized: false, visible: true, startTime: Date.now(), estimatedGenerationMs: estGenMs, estimatedExecutionMs: estExecMs, steps: [
      { label: "Generate Tests", sublabel: `${endpoints.length} endpoint${endpoints.length!==1?"s":""}`, status: "running", percent: 0 },
      { label: "Execute Tests",  sublabel: "Will start after generation…", status: "waiting", percent: 0 },
    ]});
    let gp = 0; const gs = Date.now();
    const gTicker = setInterval(() => {
      const el = Date.now() - gs; gp = Math.min(95, Math.round((el / estGenMs) * 100));
      setMagicState((p) => ({ ...p, steps: [{ ...p.steps[0], percent: gp, detail: `~${Math.max(0, Math.ceil((estGenMs - el)/1000))}s` }, p.steps[1]] }));
    }, 600);
    try {
      await testService.generate(endpoints as any);
      clearInterval(gTicker);
      testService.getTestsByProjectId(id).then((r) => setTests(r.data as Test[]));
      setMagicState((p) => ({ ...p, phase: "executing", steps: [
        { ...p.steps[0], status: "done", percent: 100, sublabel: "All tests generated ✓" },
        { label: "Execute Tests", sublabel: `Running ${endpoints.length * 6} test cases…`, status: "running", percent: 0 },
      ]}));
      const execResp = await executionService.startExecution({ projectId: id, executedBy: currentUserId, executionContext: "manual" });
      const executionId = execResp.data.executionId;
      const es = Date.now(); let ep = 0;
      magicPollingRef.current = setInterval(async () => {
        try {
          const sr = await executionService.getExecutionStatus(executionId);
          const st = sr.data;
          const el = Date.now() - es; ep = Math.min(95, Math.round((el / estExecMs) * 100));
          if (st.totalTests > 0) { const done = (st.testsPassed??0)+(st.testsFailed??0)+(st.testsError??0); ep = Math.max(ep, Math.min(95, Math.round((done/st.totalTests)*100))); }
          setMagicState((p) => ({ ...p, steps: [p.steps[0], { ...p.steps[1], percent: ep, detail: `~${Math.max(0,Math.ceil((estExecMs-el)/1000))}s` }] }));
          if (st.status === "COMPLETED" || st.status === "FAILED") {
            stopMagic();
            setMagicState((p) => ({ ...p, phase: "done", steps: [p.steps[0], { ...p.steps[1], status: "done", percent: 100, sublabel: "All tests executed ✓" }],
              result: { passed: st.testsPassed??0, failed: st.testsFailed??0, errors: st.testsError??0, rate: st.successRate??0, duration: Date.now()-(p.startTime??Date.now()) } }));
            addToast(st.status==="COMPLETED"?"success":"error", `Auto Pilot done! ${st.successRate?.toFixed(0)??0}% success rate.`);
            setTimeout(() => loadExecutionHistory(), 1500);
          }
        } catch {}
      }, 2500);
    } catch (err: any) {
      clearInterval(gTicker); stopMagic();
      const msg = err.response?.data?.message || err.message || "Unknown error";
      setMagicState((p) => ({ ...p, phase: "error", steps: p.steps.map((s) => s.status === "running" ? { ...s, status: "error" } : s), error: msg }));
      addToast("error", `Auto Pilot failed: ${msg}`);
    }
  }, [id, project, endpoints, stopMagic, addToast, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Permissions ────────────────────────────────────────────────────────────
  const canEdit          = isOwner;
  const canDelete        = isOwner;
  const canShare         = isOwner;
  const canRescan        = isOwner;
  const canAddEndpoint   = isOwner && project?.docMode === "MANUAL";
  const canExecuteTests  = isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");
  const canGenerateTests = isOwner || (userRole === "DEVELOPER" && accessLevel === "READ_WRITE");

  // ── Groupings ──────────────────────────────────────────────────────────────
  // FIX 1: group endpoints by their explicit tag (or smart path segment)
  const groupedEndpoints = groupByTag(endpoints);

  // FIX 2: group tests by endpoint tag — resolve tag via the endpoint lookup
  const endpointMap = React.useMemo(
    () => endpoints.reduce((m, ep) => { m[ep.id] = ep; return m; }, {} as Record<string, Endpoint>),
    [endpoints]
  );

  const groupedTests = React.useMemo(() => {
    return tests.reduce((g, t) => {
      const ep  = endpointMap[t.endpointId];
      const tag = ep ? getEndpointTag(ep) : (t.endpointPath?.split(" ")[1]?.split("/").filter(Boolean)[0] ?? "general");
      if (!g[tag]) g[tag] = [];
      g[tag].push(t);
      return g;
    }, {} as Record<string, Test[]>);
  }, [tests, endpointMap]);

  const testsByEndpoint = tests.reduce((m, t) => {
    if (!m[t.endpointId]) m[t.endpointId] = [];
    m[t.endpointId].push(t); return m;
  }, {} as Record<string, Test[]>);

  const endpointsWithTests = endpoints.filter((ep) => (testsByEndpoint[ep.id]?.length ?? 0) > 0);

  let totalTestsCount = 0;
  endpointsWithTests.forEach((ep) => {
    (testsByEndpoint[ep.id] || []).forEach((t) => {
      TEST_SECTIONS.forEach(({ key }) => { try { if ((t as any)[key]) totalTestsCount++; } catch {} });
    });
  });

  // ── Dynamic right-panel stats ──────────────────────────────────────────────
  const coveragePct = endpointsCount > 0 ? Math.round((endpointsWithTests.length / endpointsCount) * 100) : 0;
  const passRatePct = successRate.TOTAL > 0 ? Math.round((successRate.SUCCESS / successRate.TOTAL) * 100) : null;
  const passBarColor = passRatePct === null ? "#e2e8f0" : passRatePct >= 85 ? "#10b981" : passRatePct >= 65 ? "#eab308" : "#ef4444";

  // FIX 3: reports tab — group tested endpoints by their real tag too
  const groupedTestedEndpoints = React.useMemo(() => groupByTag(testedEndpoints), [testedEndpoints]);

  const showMagicButton = canGenerateTests && canExecuteTests && endpoints.length > 0 && magicState.phase === "idle";

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-surface">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center min-h-screen">
          <ArrowPathIcon className="w-10 h-10 text-primary animate-spin" />
        </main>
      </div>
    </div>
  );
  if (error || !project) return (
    <div className="min-h-screen bg-surface">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 ml-0 md:ml-64 p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium mb-4">{error || "Project not found"}</p>
            <Button onClick={() => navigate("/projects")} variant="outline">Back</Button>
          </div>
        </main>
      </div>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      {/* Navbar with hamburger toggle for mobile */}
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex pt-0">
        {/* Sidebar — receives open/close props for mobile */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content: no left margin on mobile, md:ml-64 on desktop */}
        <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-12 max-w-7xl mx-auto w-full">

          {/* ════ HEADER ════ */}
          <div className="flex flex-col gap-6 mb-8">
            <nav className="flex items-center gap-1.5 text-sm text-on-surface-variant font-medium">
              <button onClick={() => navigate("/projects")} className="hover:text-primary transition-colors">Projects</button>
              <span className="text-on-surface-variant/40">/</span>
              <span className="text-on-surface font-semibold truncate max-w-[200px]">{project.name}</span>
            </nav>

            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex flex-col gap-2.5 flex-1 min-w-[280px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight">{project.name}</h2>
                  <Badge variant="info">{project.docMode}</Badge>
                  <Badge variant="default">{project.authType}</Badge>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed max-w-xl">{project.description}</p>
                <div className="flex items-center gap-1.5">
                  <CodeBracketIcon className="w-3.5 h-3.5 text-on-surface-variant/50 shrink-0" />
                  <p className="text-xs font-mono text-on-surface-variant/70 truncate">{project.projectUrl}</p>
                </div>
                {userRole === "DEVELOPER" && managerEmail && (
                  <div className="mt-1 flex flex-wrap gap-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                    <span><span className="font-semibold">Shared by:</span> {managerEmail}</span>
                    <span><span className="font-semibold">Access:</span> {accessLevel === "READ_WRITE" ? "Read / Write" : "Read only"}</span>
                    {sharedAt && <span><span className="font-semibold">Since:</span> {new Date(sharedAt).toLocaleDateString("en-US")}</span>}
                  </div>
                )}
              </div>
              {canShare && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button variant="outline" size="sm" icon={<UsersIcon className="w-4 h-4" />} onClick={() => navigate(`/service/${id}/shares`)}>Manage Shares</Button>
                  <Button variant="outline" size="sm" icon={<ShareIcon className="w-4 h-4" />} onClick={() => setShowShareModal(true)}>Share</Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-4 border-t border-outline-variant/20 text-xs text-on-surface-variant">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span>{endpointsCount} endpoint{endpointsCount!==1?"s":""}</span></div>
              <div className="flex items-center gap-1.5"><BeakerIcon className="w-3.5 h-3.5 opacity-50" /><span>{totalTestsCount} tests generated</span></div>
              <div className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5 opacity-50" /><span>{executions.length > 0 ? `Last run: ${new Date(executions[0].executedAt).toLocaleString("en-US")}` : "No executions yet"}</span></div>
              {passRatePct !== null && <div className="flex items-center gap-1.5"><CheckCircleIcon className="w-3.5 h-3.5 opacity-50" /><span>{passRatePct}% pass rate</span></div>}
            </div>
          </div>

          {/* ════ TABS ════ */}
          <div className="border-b border-outline-variant/30 mb-8 overflow-x-auto">
            <nav className="flex space-x-1 min-w-max">
              <TabItem active={activeTab==="endpoints"} label="Endpoints"  icon={<ListBulletIcon className="w-4 h-4" />}            onClick={() => setActiveTab("endpoints")} />
              <TabItem active={activeTab==="tests"}     label="Tests"      icon={<BeakerIcon className="w-4 h-4" />}                onClick={() => setActiveTab("tests")} />
              <TabItem active={activeTab==="execution"} label="Execution"  icon={<PlayIcon className="w-4 h-4" />}                  onClick={() => setActiveTab("execution")} disabled={!canExecuteTests} />
              <TabItem active={activeTab==="history"}   label="History"    icon={<ClockIcon className="w-4 h-4" />}                 onClick={() => setActiveTab("history")} />
              <TabItem active={activeTab==="reports"}   label="Reports"    icon={<PresentationChartLineIcon className="w-4 h-4" />} onClick={() => setActiveTab("reports")} />
              <TabItem active={activeTab==="settings"}  label="Settings"   icon={<CogIcon className="w-4 h-4" />}                   onClick={() => setActiveTab("settings")} disabled={!canEdit} />
            </nav>
          </div>

          {/* ════ ENDPOINTS TAB ════ */}
          {activeTab === "endpoints" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-9 space-y-8">

                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">Detected Endpoints ({endpointsCount})</h3>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      {endpoints.filter((e) => e.discoveryType === "SWAGGER").length} from Swagger · {endpoints.filter((e) => e.discoveryType === "MANUAL").length} manual
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {canAddEndpoint && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<PlusIcon className="w-4 h-4" />}
                        onClick={() => setShowAddEndpointModal(true)}
                      >
                        Add Endpoint
                      </Button>
                    )}
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

                {/* Endpoint list */}
                {endpoints.length === 0 ? (
                  <EmptyState icon={<ListBulletIcon className="w-12 h-12" />} title="No endpoints found"
                    description={project.docMode === "SWAGGER" ? "Swagger scan didn't detect any endpoints." : "Add your first endpoint with the button above."} />
                ) : (
                  Object.entries(groupedEndpoints).map(([tag, eps]) => (
                    <div key={tag} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <FolderOpenIcon className="w-4 h-4" />
                          <h3 className="font-bold capitalize">{tag}</h3>
                          <span className="text-xs font-mono">({eps.length})</span>
                        </div>
                        {canGenerateTests && (
                          <GenerateButton loading={generatingKeys.has(`group-${tag}`)} onClick={() => handleGenerateTests(eps, `group-${tag}`)} label="Generate this group" size="xs" />
                        )}
                      </div>
                      <div className="space-y-2">
                        {eps.map((ep) => (
                          <EndpointAccordion key={ep.id} endpoint={ep}
                            isExpanded={expandedEndpointId === ep.id}
                            onToggle={() => setExpandedEndpointId((p) => p === ep.id ? null : ep.id)}
                            canGenerateTests={canGenerateTests}
                            generating={generatingKeys.has(ep.id)}
                            onGenerate={() => handleGenerateTests([ep], ep.id)}
                            hasTests={!!testsByEndpoint[ep.id]?.length}
                            testCount={testsByEndpoint[ep.id]?.length ?? 0}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Dynamic right panel ─────────────────────────────────── */}
              <div className="lg:col-span-3 space-y-5">

                {/* Developer access level */}
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
                      {accessLevel === "READ_WRITE" && <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-500" />Generate & execute tests</li>}
                      <li className="flex items-center gap-2"><XCircleIcon className="w-4 h-4 text-slate-300" />Modify project settings</li>
                    </ul>
                  </div>
                )}

                {/* Project stats card */}
                <div className="bg-white rounded-xl p-5 border border-outline-variant/10 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-on-surface">Project Stats</h3>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-on-surface-variant">Endpoint Coverage</span>
                      <span className="font-bold text-primary">{coveragePct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${coveragePct}%` }} />
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      {endpointsWithTests.length}/{endpointsCount} endpoints have tests
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-on-surface-variant">Pass Rate</span>
                      {passRatePct !== null ? (
                        <span className="font-bold" style={{ color: passBarColor }}>{passRatePct}%</span>
                      ) : (
                        <span className="text-on-surface-variant/50 italic text-[10px]">No executions</span>
                      )}
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${passRatePct ?? 0}%`, backgroundColor: passBarColor }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-primary/5 rounded-lg p-2.5 text-center">
                      <p className="font-black text-xl text-primary">{endpointsCount}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Endpoints</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-2.5 text-center">
                      <p className="font-black text-xl text-indigo-600">{totalTestsCount}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Test Cases</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                      <p className="font-black text-xl text-emerald-600">{successRate.SUCCESS ?? 0}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Passed</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2.5 text-center">
                      <p className="font-black text-xl text-red-500">{(successRate.FAILED ?? 0) + (successRate.ERROR ?? 0)}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Failed</p>
                    </div>
                  </div>
                </div>

                {/* Last execution */}
                {executions.length > 0 && (
                  <div className="bg-white rounded-xl p-5 border border-outline-variant/10 shadow-sm space-y-3">
                    <h3 className="font-bold text-sm">Last Execution</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold">{new Date(executions[0].executedAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        <p className="text-[10px] text-on-surface-variant">{new Date(executions[0].executedAt).toLocaleTimeString("en-US")}</p>
                      </div>
                      <Badge variant={executions[0].status === "COMPLETED" ? "success" : "danger"}>{executions[0].status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center text-xs">
                      <div className="bg-emerald-50 rounded-lg p-1.5"><p className="font-bold text-emerald-600">{executions[0].testsPassed}</p><p className="text-on-surface-variant text-[10px]">Passed</p></div>
                      <div className="bg-red-50 rounded-lg p-1.5"><p className="font-bold text-red-500">{executions[0].testsFailed}</p><p className="text-on-surface-variant text-[10px]">Failed</p></div>
                      <div className="bg-indigo-50 rounded-lg p-1.5"><p className="font-bold text-indigo-600">{executions[0].successRate?.toFixed(0) ?? 0}%</p><p className="text-on-surface-variant text-[10px]">Rate</p></div>
                    </div>
                    {executions.length > 1 && (
                      <p className="text-[10px] text-on-surface-variant text-center">+ {executions.length - 1} more execution{executions.length > 2 ? "s" : ""}</p>
                    )}
                  </div>
                )}

                {/* Test type breakdown */}
                {tests.length > 0 && (
                  <div className="bg-white rounded-xl p-5 border border-outline-variant/10 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <TagIcon className="w-4 h-4 text-on-surface-variant" />
                      <h3 className="font-bold text-sm">Test Types</h3>
                    </div>
                    <div className="space-y-2.5">
                      {TEST_SECTIONS.map(({ key, label, color }) => {
                        const count = tests.filter((t) => (t as any)[key]).length;
                        if (!count) return null;
                        const pct = Math.round((count / tests.length) * 100);
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-on-surface-variant">{label}</span>
                              <span className="font-bold text-on-surface">{count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ TESTS TAB ════ */}
          {activeTab === "tests" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Generated Tests ({tests.length})</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Click <BoltIcon className="w-3 h-3 inline text-indigo-500" /> Quick Execute to instantly run any individual test case
                  </p>
                </div>
                {endpoints.length > 0 && canGenerateTests && (
                  <GenerateButton loading={generatingKeys.has("all")} onClick={() => handleGenerateTests(endpoints, "all")} label="Regenerate all tests" icon={<ClipboardDocumentCheckIcon className="w-4 h-4" />} />
                )}
              </div>
              {tests.length === 0 ? (
                <EmptyState icon={<BeakerIcon className="w-12 h-12" />} title="No tests available" description="Generate tests from the Endpoints tab." />
              ) : (
                // FIX 2: use groupedTests (keyed by endpoint tag, not path prefix)
                Object.entries(groupedTests).map(([tag, gTests]) => (
                  <div key={tag} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <NewspaperIcon className="w-4 h-4" />
                        <h3 className="font-bold capitalize">{tag}</h3>
                        <span className="text-xs font-mono">({gTests.length})</span>
                      </div>
                      {canGenerateTests && (
                        <GenerateButton loading={generatingKeys.has(`test-group-${tag}`)} onClick={() => handleRegenerateTests(gTests.map((t) => t.id), `test-group-${tag}`)} label="Regenerate group" size="xs" />
                      )}
                    </div>
                    <div className="space-y-2">
                      {gTests.map((test) => (
                        <TestAccordion key={test.id} test={test}
                          isExpanded={expandedTestId === test.id}
                          onToggle={() => setExpandedTestId((p) => p === test.id ? null : test.id)}
                          canRegenerateTests={canGenerateTests}
                          generating={generatingKeys.has(`test-single-${test.id}`)}
                          onRegenerate={() => handleRegenerateTests([test.id], `test-single-${test.id}`)}
                          refreshTests={refreshTests} addToast={addToast} project={project}
                          endpoint={endpoints.find((ep) => ep.id === test.endpointId)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ════ EXECUTION TAB ════ */}
          {activeTab === "execution" && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Execution Console</h3>
                    <p className="text-sm text-slate-600">Run all tests and track progress in real time</p>
                  </div>
                  <BoltIcon className="w-10 h-10 text-indigo-500 shrink-0" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 border border-indigo-100"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Endpoints with tests</p><p className="text-3xl font-bold text-indigo-600">{endpointsWithTests.length}</p><p className="text-xs text-slate-500 mt-1">out of {endpoints.length} total</p></div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-100"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Available tests</p><p className="text-3xl font-bold text-emerald-600">{totalTestsCount}</p><p className="text-xs text-slate-500 mt-1">ready to execute</p></div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-100"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</p><div className="flex items-center gap-2 mt-2">{isExecuting ? <><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span className="text-sm font-semibold text-green-600">Running</span></> : <><div className="w-3 h-3 rounded-full bg-slate-300" /><span className="text-sm font-semibold text-slate-600">Ready</span></>}</div></div>
                </div>
                <div className="mt-6 flex justify-center">
                  <button onClick={handleExecuteAllProject} disabled={isExecuting || endpointsWithTests.length === 0}
                    className={`flex items-center gap-3 px-6 md:px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg ${isExecuting || endpointsWithTests.length === 0 ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:scale-95"}`}>
                    {isExecuting ? <><ArrowPathIcon className="w-6 h-6 animate-spin" />Executing...</> : <><PlayIcon className="w-6 h-6" />Execute entire project ({totalTestsCount} tests)</>}
                  </button>
                </div>
              </div>
              <ExecutionTerminal logs={executionLogs} isRunning={isExecuting} onStop={handleStopExecution} />
              {endpointsWithTests.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">No tests to execute</p>
                    <p className="text-sm text-amber-700 mt-1">Generate tests first from the Endpoints tab.</p>
                    <button onClick={() => setActiveTab("endpoints")} className="mt-3 text-sm font-semibold text-amber-800 underline underline-offset-2">Go to endpoints →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ HISTORY TAB ════ */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Execution History</h3>
              {loadingHistory ? <div className="flex justify-center p-12"><ArrowPathIcon className="w-8 h-8 text-primary animate-spin" /></div> :
               executions.length === 0 ? <EmptyState icon={<ClockIcon className="w-12 h-12" />} title="No executions" description="Run your tests to see history here." /> : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    {executions.map((exec) => {
                      const isYou = exec.executedBy && currentUserId && exec.executedBy === currentUserId;
                      const ctxLabel = exec.executionContext === "ci_cd" ? "CI/CD" : exec.executionContext === "scheduled" ? "Jenkins" : "Manual";
                      return (
                        <div key={exec.id} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedExecution?.id === exec.id ? "border-primary bg-primary/5 shadow-sm" : "border-outline-variant/20 hover:bg-surface-container-low"}`} onClick={() => { setSelectedExecution(exec); loadTestExecutions(exec.id); }}>
                          <div className="flex justify-between items-start mb-3">
                            <div><p className="text-sm font-bold">{new Date(exec.executedAt).toLocaleDateString("en-US")}</p><p className="text-xs text-on-surface-variant">{new Date(exec.executedAt).toLocaleTimeString("en-US")}</p></div>
                            <Badge variant={exec.status === "COMPLETED" ? "success" : exec.status === "RUNNING" ? "warning" : "danger"}>{exec.status}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">{isYou ? "👤 You" : "👥 User"}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${exec.executionContext === "ci_cd" ? "bg-orange-100 text-orange-700" : exec.executionContext === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{ctxLabel}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div><p className="font-bold text-green-600">{exec.testsPassed}</p><p className="text-on-surface-variant">Passed</p></div>
                            <div><p className="font-bold text-red-600">{exec.testsFailed}</p><p className="text-on-surface-variant">Failed</p></div>
                            <div><p className="font-bold">{exec.successRate?.toFixed(0) ?? 0}%</p><p className="text-on-surface-variant">Rate</p></div>
                          </div>
                          {exec.totalDurationMs && <p className="text-xs text-on-surface-variant mt-2">Duration: {(exec.totalDurationMs/1000).toFixed(2)}s</p>}
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{selectedExecution.executedBy === currentUserId ? "👤 You" : executorName ? `👥 ${executorName}` : "👥 User"}</span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${selectedExecution.executionContext === "ci_cd" ? "bg-orange-100 text-orange-700" : selectedExecution.executionContext === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{selectedExecution.executionContext === "ci_cd" ? "CI/CD" : selectedExecution.executionContext === "scheduled" ? "Jenkins" : "Manual"}</span>
                            </div>
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4}
                                  data={[{name:"Passed",value:selectedExecution.testsPassed},{name:"Failed",value:selectedExecution.testsFailed},{name:"Errors",value:selectedExecution.testsError}]}>
                                  <Cell fill="#22c55e" /><Cell fill="#ef4444" /><Cell fill="#f59e0b" />
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center gap-6 text-xs mt-2 flex-wrap">
                            {[{label:"Passed",count:selectedExecution.testsPassed,color:"bg-green-500"},{label:"Failed",count:selectedExecution.testsFailed,color:"bg-red-500"},{label:"Errors",count:selectedExecution.testsError,color:"bg-amber-500"}].map((d) => (
                              <div key={d.label} className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${d.color}`} /><span>{d.label} ({d.count})</span></div>
                            ))}
                          </div>
                        </Card>
                        <Card title="Test Details">
                          {testExecutions.length === 0 ? <p className="text-center text-on-surface-variant p-6 text-sm">No tests executed.</p> : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-surface-container-high text-xs text-on-surface-variant uppercase">
                                  <tr>{["Endpoint","Method","Type","Status","Expected","Received","Time"].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                  {testExecutions.map((te) => (
                                    <tr key={te.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low">
                                      <td className="px-3 py-2 font-mono text-xs truncate max-w-[140px]">{te.endpointPath}</td>
                                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${METHOD_COLORS[te.httpMethod] ?? ""}`}>{te.httpMethod}</span></td>
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

          {/* ════ REPORTS TAB ════ */}
          {activeTab === "reports" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="Results Distribution">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={projectStats as Record<string,any>[]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {projectStats.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 text-sm mt-2 flex-wrap">
                      {projectStats.map((d) => <div key={d.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:d.color}} /><span>{d.name} ({d.value}%)</span></div>)}
                    </div>
                  </div>
                </Card>
                <Card title="Success History" footer={<div className="flex flex-col sm:flex-row gap-3"><Button variant="outline" className="w-full" icon={<DocumentArrowDownIcon className="w-6 h-6" />} onClick={() => handleDownloadProjectReport("full")}>Full Project Report</Button><Button variant="outline" className="w-full" icon={<DocumentArrowDownIcon className="w-6 h-6" />} onClick={() => handleDownloadProjectReport("simple")}>Simple Project Report</Button></div>}>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projectChartData as []} margin={{top:10,right:10,left:10,bottom:10}}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{fill:"var(--color-on-surface-variant,#464555)",fontSize:12}}><Label value="Latest 7 days" position="insideBottom" fill="var(--color-on-surface-variant,#464555)" /></XAxis>
                        <YAxis><Label value="Success Rate (%)" angle={-90} position="insideLeft" style={{textAnchor:"middle"}} fill="var(--color-on-surface-variant,#464555)" /></YAxis>
                        <Tooltip />
                        <Line type="monotone" dataKey="success" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* FIX 3: group tested endpoints by their real tag */}
              <div className="space-y-3">
                {Object.entries(groupedTestedEndpoints).map(([tag, eps]) => (
                  <div key={tag} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <NewspaperIcon className="w-4 h-4" />
                        <h3 className="font-bold capitalize">{tag}</h3>
                        <span className="text-xs font-mono">({eps.length})</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
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

          {/* ════ SETTINGS TAB ════ */}
          {activeTab === "settings" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card title="Project Information">
                <form onSubmit={handleUpdateProject} className="space-y-4">
                  <div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm,name:e.target.value})} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div>
                  <div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Description</label><textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({...editForm,description:e.target.value})} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Project URL</label>
                    <input type="text" value={editForm.projectUrl} onChange={(e) => setEditForm({...editForm,projectUrl:e.target.value})} className={`w-full px-3 py-2 border rounded-lg text-sm ${!canEdit||endpoints.length>0?"bg-surface-container-low text-on-surface-variant/60 border-outline-variant/20 cursor-not-allowed":"bg-white border-outline-variant/30"}`} disabled={!canEdit||endpoints.length>0} />
                    {endpoints.length > 0 && <p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />URL locked — delete endpoints first to modify.</p>}
                  </div>
                  <div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Auth Type</label><select value={editForm.authType} onChange={(e) => setEditForm({...editForm,authType:e.target.value})} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit}><option value="NONE">None</option><option value="BASIC">Basic Auth</option><option value="API_KEY">API Key</option><option value="BEARER">Bearer Token</option></select></div>
                  {editForm.authType === "BASIC" && (<><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Username</label><input type="text" value={editForm.authUsername} onChange={(e) => setEditForm({...editForm,authUsername:e.target.value})} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Password</label><input type="password" value={editForm.authPassword} onChange={(e) => setEditForm({...editForm,authPassword:e.target.value})} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div></>)}
                  {editForm.authType === "API_KEY" && (<><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">API Key</label><input type="text" value={editForm.apiKey} onChange={(e) => setEditForm({...editForm,apiKey:e.target.value})} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Header Name</label><input type="text" value={editForm.apiKeyHeader} onChange={(e) => setEditForm({...editForm,apiKeyHeader:e.target.value})} placeholder="X-API-Key" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Location</label><select value={editForm.apiKeyLocation} onChange={(e) => setEditForm({...editForm,apiKeyLocation:e.target.value})} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit}><option value="HEADER">Header</option><option value="QUERY_PARAM">Query Parameter</option></select></div></>)}
                  {editForm.authType === "BEARER" && (<div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Bearer Token</label><input type="text" value={editForm.bearerToken} onChange={(e) => setEditForm({...editForm,bearerToken:e.target.value})} className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm bg-white" disabled={!canEdit} /></div>)}
                  {canEdit && <div className="pt-2"><Button type="submit" loading={updating}>{updating ? "Saving..." : "Save Changes"}</Button></div>}
                </form>
              </Card>
              {canDelete && (
                <Card title="Danger Zone">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-800 mb-3">Once you delete a project, there is no going back.</p>
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" icon={<TrashIcon className="w-4 h-4" />} onClick={handleDeleteProject}>Delete Project</Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ════ MAGIC FLOATING BUTTON ════ */}
      {showMagicButton && (
        <MagicFloatingButton onClick={() => openConfirm("Launch Auto Pilot ✦", `Auto Pilot will generate tests for all ${endpoints.length} endpoints, then execute them automatically.`, () => { closeConfirm(); handleMagicExecution(); }, "primary", "Launch Auto Pilot")} endpointCount={endpoints.length} />
      )}

      {/* ════ MAGIC PROGRESS PANEL ════ */}
      {magicState.visible && (
        <MagicProgressPanel state={magicState} onMinimize={() => setMagicState((p) => ({ ...p, minimized: !p.minimized }))} onClose={() => setMagicState((p) => ({ ...p, visible: false, phase: "idle" }))} />
      )}

      {/* ════ PORTALS ════ */}
      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} variant={confirmModal.variant} confirmLabel={confirmModal.confirmLabel} onConfirm={confirmModal.onConfirm} onCancel={closeConfirm} />

      {showShareModal && project && (
        <ShareProjectModal projectId={id!} projectName={project.name} onClose={() => setShowShareModal(false)} onSuccess={() => { loadProjectData(); setShowShareModal(false); }} />
      )}

      {showAddEndpointModal && (
        <AddEndpointModal
          projectId={id!}
          onClose={() => setShowAddEndpointModal(false)}
          onSuccess={() => { setShowAddEndpointModal(false); loadProjectData(); }}
          addToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.25); }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

const EndpointAccordion: React.FC<{ endpoint: Endpoint; isExpanded: boolean; onToggle: () => void; canGenerateTests: boolean; generating: boolean; onGenerate: () => void; hasTests: boolean; testCount: number }> = ({ endpoint, isExpanded, onToggle, canGenerateTests, generating, onGenerate, hasTests, testCount }) => {
  const mc = METHOD_COLORS[endpoint.method] ?? "bg-surface-container-high text-on-surface-variant";
  let parameters: any[] = [], rbp = null, resbp = null;
  try { if (endpoint.parameters) parameters = JSON.parse(endpoint.parameters); } catch {}
  try { if (endpoint.requestBody)  rbp  = JSON.parse(endpoint.requestBody);  } catch {}
  try { if (endpoint.responseBody) resbp = JSON.parse(endpoint.responseBody); } catch {}

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container-low transition-colors group">
        <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center shrink-0 ${mc}`}>{endpoint.method}</span>
          <div className="text-left min-w-0">
            <p className="font-mono text-sm text-on-surface truncate">{endpoint.path}</p>
            <p className="text-xs text-on-surface-variant">{endpoint.description || "No description"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          {hasTests && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full hidden sm:inline">{testCount} test{testCount>1?"s":""}</span>}
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-on-surface-variant hidden sm:inline">Active</span></div>
        </div>
      </button>
      {isExpanded && (
        <div className="px-5 py-6 border-t border-outline-variant/10 space-y-6">
          {parameters.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2"><CodeBracketIcon className="w-4 h-4" />Parameters</h4>
              <div className="overflow-x-auto border border-outline-variant/20 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-high text-[10px] text-on-surface-variant uppercase"><tr>{["Name","Location","Required","Type","Description"].map((h) => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-outline-variant/10">{parameters.map((p, i) => (<tr key={i}><td className="px-4 py-2 font-mono">{p.name??p.$ref??"?"}</td><td className="px-4 py-2">{p.in??"-"}</td><td className="px-4 py-2">{p.required?"Yes":"No"}</td><td className="px-4 py-2">{p.type??p.schema?.type??"object"}</td><td className="px-4 py-2 text-on-surface-variant">{p.description??"-"}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
          {rbp  && <div><h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Request Body</h4><pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-64">{JSON.stringify(rbp,null,2)}</pre></div>}
          {resbp && <div><h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Response Body</h4><pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-64">{JSON.stringify(resbp,null,2)}</pre></div>}
          <div className="grid grid-cols-2 gap-6">
            <div><h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Status Codes</h4><div className="flex flex-wrap gap-1">{endpoint.statusCodes?.split(",").map((c) => <Badge key={c} variant={c.trim().startsWith("2")?"success":c.trim().startsWith("4")?"warning":"danger"}>{c.trim()}</Badge>)}</div></div>
            <div><h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Auth Required</h4><Badge variant={endpoint.requiresAuth?"warning":"default"}>{endpoint.requiresAuth?"Yes":"No"}</Badge></div>
          </div>
          <GenerateButton loading={generating} onClick={onGenerate} disabled={!canGenerateTests} fullWidth label={hasTests?"Regenerate tests":"Generate tests"} icon={hasTests?<ArrowPathIcon className="w-3.5 h-3.5" />:<SparklesIcon className="w-3.5 h-3.5" />} />
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
  const mc = METHOD_COLORS[method] ?? "bg-surface-container-high text-on-surface-variant";
  const [editMode, setEditMode] = useState(false);
  const [rawData, setRawData]   = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [qe, setQe]             = useState<{open:boolean;sectionKey:string;sectionLabel:string;sectionData:any}|null>(null);

  const parsed: Record<string, any> = {};
  TEST_SECTIONS.forEach(({ key }) => { try { const v = (test as any)[key]; if (v) parsed[key] = typeof v === "string" ? JSON.parse(v) : v; } catch {} });

  const handleSave = async () => {
    const out: Record<string, any> = {};
    for (const k in rawData) { try { out[k] = JSON.parse(rawData[k]); } catch { addToast("error", `Invalid JSON in "${TEST_SECTIONS.find((s)=>s.key===k)?.label??k}"`); return; } }
    try { setSaving(true); await testService.update({ ...test, ...out } as Test); await refreshTests(); setRawData({}); setEditMode(false); addToast("success", "Tests updated."); }
    catch { addToast("error", "Error while saving."); } finally { setSaving(false); }
  };

  const SCOLORS: Record<string, string> = { positive:"bg-emerald-100 text-emerald-700 border-emerald-200", validation:"bg-yellow-100 text-yellow-700 border-yellow-200", boundary:"bg-blue-100 text-blue-700 border-blue-200", wrongType:"bg-orange-100 text-orange-700 border-orange-200", missingFields:"bg-red-100 text-red-700 border-red-200", auth:"bg-purple-100 text-purple-700 border-purple-200" };

  return (
    <>
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm">
        <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container-low transition-colors group">
          <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center shrink-0 ${mc}`}>{method}</span>
            <p className="font-mono text-sm truncate">{test.endpointPath}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* FIX: show FULL label, not sliced */}
            <div className="hidden sm:flex gap-1 flex-wrap">
              {TEST_SECTIONS.filter(({key}) => parsed[key]).map(({key, label}) => (
                <span key={key} className="px-1.5 py-0.5 rounded bg-surface-container text-[9px] font-bold text-on-surface-variant whitespace-nowrap">
                  {label}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-on-surface-variant hidden sm:inline">Active</span>
            </div>
          </div>
        </button>
        {isExpanded && (
          <div className="px-5 py-6 border-t border-outline-variant/10 space-y-5">
            {TEST_SECTIONS.map(({ key, label }) =>
              parsed[key] ? (
                <div key={key}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2"><CodeBracketIcon className="w-4 h-4" />{label}</h4>
                    <button onClick={() => setQe({open:true,sectionKey:key,sectionLabel:label,sectionData:parsed[key]})} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all hover:shadow-sm active:scale-95 ${SCOLORS[key]??"bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                      <BoltIcon className="w-3 h-3" />Quick Execute
                    </button>
                  </div>
                  {editMode
                    ? <textarea value={rawData[key]!==undefined?rawData[key]:JSON.stringify(parsed[key],null,2)} rows={13} onChange={(e)=>setRawData((p)=>({...p,[key]:e.target.value}))} className="w-full p-4 bg-inverse-surface text-on-primary-container font-mono text-xs rounded-xl border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    : <pre className="bg-inverse-surface text-on-primary-container text-xs p-4 rounded-xl overflow-x-auto max-h-96 whitespace-pre-wrap break-words">{JSON.stringify(parsed[key],null,2)}</pre>}
                </div>
              ) : null
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {editMode
                ? <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60">
                    {saving?<><ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />Saving…</>:"Save"}
                  </button>
                : <button onClick={()=>setEditMode(true)} className="py-2 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">Edit test</button>}
              <GenerateButton loading={generating} onClick={onRegenerate} disabled={!canRegenerateTests} label="Regenerate" size="xs" />
            </div>
            {editMode && <button onClick={()=>{setEditMode(false);setRawData({});}} className="w-full py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors">Cancel</button>}
          </div>
        )}
      </div>
      {qe && <QuickExecuteModal open={qe.open} onClose={()=>setQe(null)} test={test} sectionKey={qe.sectionKey} sectionLabel={qe.sectionLabel} sectionData={qe.sectionData} project={project} endpoint={endpoint} />}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TESTED ENDPOINT ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

const TestedEndpointAccordion: React.FC<{ endpoint: Endpoint; getReport: (t:"simple"|"full", id:string)=>void }> = ({ endpoint, getReport }) => {
  const mc = METHOD_COLORS[endpoint.method] ?? "bg-surface-container-high text-on-surface-variant";
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm">
      <div className="p-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-14 text-center shrink-0 ${mc}`}>{endpoint.method}</span>
          <p className="font-mono text-sm truncate flex-1">{endpoint.path}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" icon={<DocumentArrowDownIcon className="w-5 h-5" />} onClick={() => getReport("simple", endpoint.id)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-surface-container-high shrink-0"><span className="text-xs font-medium text-black">Simple</span></Button>
          <Button variant="outline" icon={<DocumentArrowDownIcon className="w-5 h-5" />} onClick={() => getReport("full", endpoint.id)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-surface-container-high shrink-0"><span className="text-xs font-medium text-black">Full</span></Button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsPage;