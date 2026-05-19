import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { DocMode, AuthType } from "../types/types";
import { projectService } from "../services/api";
import {
  DocumentIcon,
  LinkIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ManualEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  tags: string;           // ex: "users,auth"
  parameters: string;     // JSON string
  requestBody: string;    // JSON Schema string
  responseBody: string;   // JSON Schema string
  statusCodes: string;    // ex: "200,201,400"
  requiresAuth: boolean;
  expanded: boolean;      // UI only
}

const DEFAULT_ENDPOINT: ManualEndpoint = {
  method: "GET",
  path: "",
  description: "",
  tags: "",
  parameters: "",
  requestBody: "",
  responseBody: "",
  statusCodes: "200",
  requiresAuth: false,
  expanded: true,
};

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    "bg-emerald-100 text-emerald-800 border-emerald-200",
  POST:   "bg-blue-100 text-blue-800 border-blue-200",
  PUT:    "bg-amber-100 text-amber-800 border-amber-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
  PATCH:  "bg-purple-100 text-purple-800 border-purple-200",
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const AddServicePage: React.FC = () => {
  const navigate = useNavigate();

  // ── Tabs & state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DocMode>(DocMode.SWAGGER);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [validServiceUrl, setValidServiceUrl] = useState(true);
  const [validDocUrl, setValidDocUrl] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>(AuthType.NONE);

  // ── Form base ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectUrl: "",
    docUrl: "",
    docFile: null as File | null,
  });

  // ── Auth fields ──────────────────────────────────────────────────────────
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [apiKeyLocation, setApiKeyLocation] = useState<"HEADER" | "QUERY_PARAM">("HEADER");
  const [bearerToken, setBearerToken] = useState("");

  // ── Manual endpoints ─────────────────────────────────────────────────────
  const [manualEndpoints, setManualEndpoints] = useState<ManualEndpoint[]>([
    { ...DEFAULT_ENDPOINT },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const isValidServiceUrl = (url: string, isDoc: boolean) => {
    const regex = /^(https?:\/\/)(localhost|[\w.-]+)(:\d+)?(\/.*)?$/i;
    let valid = regex.test(url);
    if (isDoc) {
      valid = valid && (url.endsWith(".json") || url.endsWith(".yaml") || url.endsWith(".yml"));
      setValidDocUrl(valid);
    } else {
      setValidServiceUrl(valid);
    }
  };

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── Endpoint list mutations ───────────────────────────────────────────────

  const addEndpoint = () => {
    setManualEndpoints((prev) => [
      ...prev,
      { ...DEFAULT_ENDPOINT, expanded: true },
    ]);
  };

  const removeEndpoint = (index: number) => {
    setManualEndpoints((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEndpoint = <K extends keyof ManualEndpoint>(
    index: number,
    field: K,
    value: ManualEndpoint[K]
  ) => {
    setManualEndpoints((prev) =>
      prev.map((ep, i) => (i === index ? { ...ep, [field]: value } : ep))
    );
  };

  const toggleExpand = (index: number) => {
    setManualEndpoints((prev) =>
      prev.map((ep, i) =>
        i === index ? { ...ep, expanded: !ep.expanded } : ep
      )
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userStr = sessionStorage.getItem("user");
      let userId: string | null = null;
      if (userStr) {
        try {
          userId = JSON.parse(userStr).id;
        } catch {}
      }
      if (!userId) {
        setError("User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const projectData: any = {
        name:          formData.name,
        description:   formData.description,
        projectUrl:    formData.projectUrl,
        docMode:       activeTab,
        authType:      authType,
        userId:        userId,
      };

      // ── SWAGGER ──────────────────────────────────────────────────────────
      if (activeTab === DocMode.SWAGGER) {
        projectData.docSubmitMode = uploadMethod;
        if (uploadMethod === "url") {
          projectData.docUrl = formData.docUrl;
        } else {
          projectData.docFile = formData.docFile;
        }
      }

      // ── MANUAL ───────────────────────────────────────────────────────────
      if (activeTab === DocMode.MANUAL) {
        // Valider qu'il y a au moins un endpoint avec un path
        const validEndpoints = manualEndpoints.filter((ep) => ep.path.trim() !== "");
        if (validEndpoints.length === 0) {
          setError("Veuillez ajouter au moins un endpoint avec un path.");
          setLoading(false);
          return;
        }

        // Sérialiser sans le champ UI `expanded`
        const toSend = validEndpoints.map(({ expanded, ...rest }) => rest);
        projectData.manualEndpoints = JSON.stringify(toSend);
        projectData.docUrl = "";
        projectData.docSubmitMode = "url";
      }

      // ── Auth ─────────────────────────────────────────────────────────────
      if (authType === AuthType.BASIC) {
        projectData.authUsername = basicUsername;
        projectData.authPassword = basicPassword;
      } else if (authType === AuthType.APIKEY) {
        projectData.apiKey        = apiKey;
        projectData.apiKeyHeader  = apiKeyHeader;
        projectData.apiKeyLocation = apiKeyLocation;
      } else if (authType === AuthType.BEARER) {
        projectData.bearerToken = bearerToken;
      }

      const response = await projectService.createProject(projectData);
      navigate(`/service/${response.data.id}`);

    } catch (err: any) {
      setError(err.response?.data?.message || "Error occurred while creating the project");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH BUTTONS CONFIG
  // ─────────────────────────────────────────────────────────────────────────

  const authButtons = [
    { label: "Aucune", value: AuthType.NONE },
    { label: "Basic Auth", value: AuthType.BASIC },
    { label: "API Key", value: AuthType.APIKEY },
    { label: "Bearer Token", value: AuthType.BEARER },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 lg:p-12 max-w-7xl mx-auto w-full">
          <div className="max-w-4xl mx-auto">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="mb-12">
              <h2 className="text-4xl font-headline font-bold text-on-surface tracking-tight mb-4">
                Register New Service
              </h2>
              <p className="text-on-surface-variant text-lg">
                Define your API infrastructure for automated precision testing.
              </p>
            </header>

            {error && (
              <div className="mb-6 p-4 bg-error-container/20 border border-error/10 rounded-xl text-error font-medium">
                {error}
              </div>
            )}

            {/* ── Form Container ─────────────────────────────────────────── */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] overflow-hidden">

              {/* Tab Navigation */}
              <div className="flex border-b border-surface-container-low px-8">
                <button
                  type="button"
                  className={`px-6 py-5 text-sm font-bold flex items-center gap-2 transition-colors ${
                    activeTab === DocMode.SWAGGER
                      ? "text-primary border-b-2 border-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  onClick={() => setActiveTab(DocMode.SWAGGER)}
                >
                  <DocumentIcon className="w-5 h-5" />
                  SWAGGER / OpenAPI
                </button>
                <button
                  type="button"
                  className={`px-6 py-5 text-sm font-bold flex items-center gap-2 transition-colors ${
                    activeTab === DocMode.MANUAL
                      ? "text-primary border-b-2 border-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  onClick={() => setActiveTab(DocMode.MANUAL)}
                >
                  <LinkIcon className="w-5 h-5" />
                  Manual Entry
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-10 space-y-10">

                {/* ── General Info ──────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                      Service Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest transition-all focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. Core Payment Gateway"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                      Base URL
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-mono text-xs">
                        https://
                      </span>
                      <input
                        type="text"
                        className="w-full pl-16 pr-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface font-mono text-sm placeholder:text-outline/50 focus:bg-surface-container-lowest transition-all focus:ring-2 focus:ring-primary/20"
                        placeholder="api.production.internal"
                        value={formData.projectUrl}
                        onChange={(e) => handleInputChange("projectUrl", e.target.value)}
                        onBlur={(e) => isValidServiceUrl(e.target.value, false)}
                        required
                      />
                    </div>
                    {!validServiceUrl && (
                      <p className="text-error text-xs mt-1">URL invalide</p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      className="w-full px-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest transition-all resize-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Describe the purpose of this service..."
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* ── Swagger Import (tab SWAGGER only) ────────────────── */}
                {activeTab === DocMode.SWAGGER && (
                  <div className="space-y-6">
                    <SectionDivider label="Import Specification" />
                    <div className="grid grid-cols-2 gap-4">
                      <ImportCard
                        active={uploadMethod === "url"}
                        icon="link"
                        title="Remote URL"
                        subtitle="Fetch from your live endpoint"
                        onClick={() => setUploadMethod("url")}
                      />
                      <ImportCard
                        active={uploadMethod === "file"}
                        icon="cloud_upload"
                        title="File Upload"
                        subtitle="Upload JSON/YAML spec"
                        onClick={() => { setUploadMethod("file"); setValidDocUrl(true); }}
                      />
                    </div>

                    {uploadMethod === "url" ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-on-surface-variant">
                          Specification Endpoint URL
                        </label>
                        <input
                          type="url"
                          className="w-full px-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface font-mono text-sm focus:bg-surface-container-lowest transition-all focus:ring-2 focus:ring-primary/20"
                          placeholder="https://api.testai.io/swagger.json"
                          value={formData.docUrl}
                          onChange={(e) => handleInputChange("docUrl", e.target.value)}
                          onBlur={(e) => isValidServiceUrl(e.target.value, true)}
                        />
                        {!validDocUrl && (
                          <p className="text-error text-xs mt-1">
                            URL invalide (doit se terminer par .json, .yaml, .yml)
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-on-surface-variant">
                          Upload Swagger File
                        </label>
                        <input
                          type="file"
                          accept=".json,.yaml,.yml"
                          className="w-full px-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-container focus:outline-none"
                          onChange={(e) => handleInputChange("docFile", e.target.files?.[0] || null)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Authentication (project-level) ────────────────────── */}
                <div className="space-y-6">
                  <SectionDivider label="Authentication Type" />
                  <div className="flex flex-wrap gap-2">
                    {authButtons.map((btn) => (
                      <button
                        key={btn.value}
                        type="button"
                        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                          authType === btn.value
                            ? "bg-secondary-container text-on-secondary-fixed-variant"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-secondary-container"
                        }`}
                        onClick={() => setAuthType(btn.value)}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {authType === AuthType.BASIC && (
                    <div className="space-y-4 p-4 bg-surface-container-low rounded-xl">
                      <input
                        type="text"
                        placeholder="Username"
                        className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20"
                        value={basicUsername}
                        onChange={(e) => setBasicUsername(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20"
                        value={basicPassword}
                        onChange={(e) => setBasicPassword(e.target.value)}
                      />
                    </div>
                  )}

                  {authType === AuthType.APIKEY && (
                    <div className="space-y-4 p-4 bg-surface-container-low rounded-xl">
                      <input
                        type="text"
                        placeholder="API Key"
                        className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Header name (e.g. X-API-Key)"
                        className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20"
                        value={apiKeyHeader}
                        onChange={(e) => setApiKeyHeader(e.target.value)}
                      />
                      <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">
                          Location
                        </label>
                        <select
                          className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20"
                          value={apiKeyLocation}
                          onChange={(e) => setApiKeyLocation(e.target.value as "HEADER" | "QUERY_PARAM")}
                        >
                          <option value="HEADER">Header</option>
                          <option value="QUERY_PARAM">Query parameter</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {authType === AuthType.BEARER && (
                    <div className="space-y-4 p-4 bg-surface-container-low rounded-xl">
                      <input
                        type="text"
                        placeholder="Bearer Token"
                        className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20"
                        value={bearerToken}
                        onChange={(e) => setBearerToken(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>

                {/* ── Manual Endpoints (tab MANUAL only) ───────────────── */}
                {activeTab === DocMode.MANUAL && (
                  <div className="space-y-4">
                    <SectionDivider label="Endpoints" />

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                      <ShieldCheckIcon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Chaque endpoint peut avoir son propre niveau d'authentification via le toggle{" "}
                        <span className="font-semibold text-on-surface">Requires Auth</span>.
                        L'auth globale du projet est appliquée automatiquement lors des tests.
                      </p>
                    </div>

                    {/* Endpoint cards */}
                    <div className="space-y-3">
                      {manualEndpoints.map((ep, idx) => (
                        <EndpointCard
                          key={idx}
                          index={idx}
                          endpoint={ep}
                          onUpdate={updateEndpoint}
                          onRemove={removeEndpoint}
                          onToggleExpand={toggleExpand}
                          canRemove={manualEndpoints.length > 1}
                        />
                      ))}
                    </div>

                    {/* Add endpoint button */}
                    <button
                      type="button"
                      onClick={addEndpoint}
                      className="w-full py-3 border-2 border-dashed border-surface-container-high rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Endpoint
                    </button>

                    {/* Summary */}
                    <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-xl text-sm">
                      <span className="text-on-surface-variant">
                        {manualEndpoints.filter(ep => ep.path.trim()).length} endpoint(s) configuré(s)
                      </span>
                      <span className="text-on-surface-variant">
                        {manualEndpoints.filter(ep => ep.requiresAuth).length} nécessitent auth
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Form Actions ──────────────────────────────────────── */}
                <div className="pt-6 border-t border-surface-container-low flex items-center justify-between">
                  <div className="flex items-center text-primary space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Awaiting validation...
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                      onClick={() => navigate("/dashboard")}
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="relative group overflow-hidden bg-gradient-to-br from-primary to-primary-container px-10 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          Creating...
                        </div>
                      ) : (
                        <span className="relative z-10">Create Service</span>
                      )}
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>
                  </div>
                </div>

              </form>
            </div>

          </div>
        </main>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-surface/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-headline font-bold text-primary tracking-widest uppercase text-xs">
              Architecting precision laboratory...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Thin divider with a centered label */
const SectionDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center space-x-4 mb-2">
    <h3 className="text-sm font-bold text-on-surface whitespace-nowrap">{label}</h3>
    <div className="h-[1px] flex-1 bg-surface-container-high" />
  </div>
);

/** Import method card (URL vs File) */
const ImportCard: React.FC<{
  active: boolean;
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ active, icon, title, subtitle, onClick }) => (
  <div
    className={`cursor-pointer border-2 p-6 rounded-xl transition-all ${
      active
        ? "border-primary bg-surface-container-low"
        : "border-transparent bg-surface-container-low hover:border-outline-variant"
    }`}
    onClick={onClick}
  >
    <div className="flex justify-between items-start">
      <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
      {active && <CheckCircleIcon className="w-6 h-6 text-primary" />}
    </div>
    <p className="font-bold text-sm mt-3">{title}</p>
    <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
  </div>
);

/** Rich endpoint card with collapsible advanced fields */
const EndpointCard: React.FC<{
  index: number;
  endpoint: ManualEndpoint;
  onUpdate: <K extends keyof ManualEndpoint>(i: number, f: K, v: ManualEndpoint[K]) => void;
  onRemove: (i: number) => void;
  onToggleExpand: (i: number) => void;
  canRemove: boolean;
}> = ({ index, endpoint, onUpdate, onRemove, onToggleExpand, canRemove }) => {

  const methodColor = METHOD_COLORS[endpoint.method] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="border border-surface-container-high rounded-xl overflow-hidden bg-surface-container-lowest">

      {/* ── Card Header (always visible) ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-low">

        {/* Method selector */}
        <select
          value={endpoint.method}
          onChange={(e) => onUpdate(index, "method", e.target.value as HttpMethod)}
          className={`text-xs font-bold px-2 py-1.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${methodColor}`}
        >
          {(["GET","POST","PUT","DELETE","PATCH"] as HttpMethod[]).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Path input */}
        <input
          type="text"
          placeholder="/api/resource/{id}"
          className="flex-1 px-3 py-1.5 bg-transparent font-mono text-sm text-on-surface placeholder:text-outline/50 focus:outline-none border-b border-transparent focus:border-primary transition-colors"
          value={endpoint.path}
          onChange={(e) => onUpdate(index, "path", e.target.value)}
        />

        {/* Requires Auth badge */}
        <button
          type="button"
          onClick={() => onUpdate(index, "requiresAuth", !endpoint.requiresAuth)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            endpoint.requiresAuth
              ? "bg-amber-100 text-amber-800 border border-amber-200"
              : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
          }`}
          title="Toggle authentication requirement"
        >
          <ShieldCheckIcon className="w-3.5 h-3.5" />
          {endpoint.requiresAuth ? "Auth required" : "No auth"}
        </button>

        {/* Expand / collapse */}
        <button
          type="button"
          onClick={() => onToggleExpand(index)}
          className="p-1.5 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container"
          title={endpoint.expanded ? "Collapse" : "Expand fields"}
        >
          {endpoint.expanded
            ? <ChevronUpIcon className="w-4 h-4" />
            : <ChevronDownIcon className="w-4 h-4" />}
        </button>

        {/* Remove */}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-lg hover:bg-error/10"
            title="Remove endpoint"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Expandable Fields ─────────────────────────────────────────────── */}
      {endpoint.expanded && (
        <div className="p-5 grid grid-cols-2 gap-5 border-t border-surface-container-low">

          {/* Description */}
          <div className="col-span-2 space-y-1.5">
            <FieldLabel>Description</FieldLabel>
            <input
              type="text"
              placeholder="Short description of what this endpoint does"
              className={inputClass}
              value={endpoint.description}
              onChange={(e) => onUpdate(index, "description", e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <FieldLabel hint="séparés par des virgules">Tags</FieldLabel>
            <input
              type="text"
              placeholder="users, auth, payments"
              className={inputClass}
              value={endpoint.tags}
              onChange={(e) => onUpdate(index, "tags", e.target.value)}
            />
          </div>

          {/* Status Codes */}
          <div className="space-y-1.5">
            <FieldLabel hint="séparés par des virgules">Expected Status Codes</FieldLabel>
            <input
              type="text"
              placeholder="200, 201, 400, 401, 404"
              className={inputClass}
              value={endpoint.statusCodes}
              onChange={(e) => onUpdate(index, "statusCodes", e.target.value)}
            />
          </div>

          {/* Parameters */}
          <div className="col-span-2 space-y-1.5">
            <FieldLabel hint="JSON array — query, path ou header params">
              Parameters
            </FieldLabel>
            <JsonTextarea
              value={endpoint.parameters}
              onChange={(v) => onUpdate(index, "parameters", v)}
              placeholder={`[\n  { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }\n]`}
            />
          </div>

          {/* Request Body */}
          <div className="col-span-2 space-y-1.5">
            <FieldLabel hint="JSON Schema du corps de la requête">Request Body Schema</FieldLabel>
            <JsonTextarea
              value={endpoint.requestBody}
              onChange={(v) => onUpdate(index, "requestBody", v)}
              placeholder={`{\n  "type": "object",\n  "required": ["name", "email"],\n  "properties": {\n    "name": { "type": "string" },\n    "email": { "type": "string", "format": "email" }\n  }\n}`}
            />
          </div>

          {/* Response Body */}
          <div className="col-span-2 space-y-1.5">
            <FieldLabel hint="JSON Schema de la réponse attendue">Response Body Schema</FieldLabel>
            <JsonTextarea
              value={endpoint.responseBody}
              onChange={(v) => onUpdate(index, "responseBody", v)}
              placeholder={`{\n  "type": "object",\n  "properties": {\n    "id": { "type": "string" },\n    "createdAt": { "type": "string", "format": "date-time" }\n  }\n}`}
            />
          </div>

        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const inputClass =
  "w-full px-3 py-2.5 bg-surface-container-low border-transparent rounded-lg text-on-surface text-sm placeholder:text-outline/50 focus:bg-surface-container-lowest transition-all focus:ring-2 focus:ring-primary/20";

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({
  children,
  hint,
}) => (
  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
    {children}
    {hint && (
      <span className="normal-case tracking-normal font-normal text-outline">
        — {hint}
      </span>
    )}
  </label>
);

const JsonTextarea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
  <textarea
    rows={5}
    spellCheck={false}
    className="w-full px-3 py-2.5 bg-surface-container-low border-transparent rounded-lg text-on-surface font-mono text-xs placeholder:text-outline/40 focus:bg-surface-container-lowest transition-all focus:ring-2 focus:ring-primary/20 resize-y"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
  />
);

export default AddServicePage;