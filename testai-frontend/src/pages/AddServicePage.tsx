import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { DocMode, AuthType } from "../types/types";
import { projectService } from "../services/api";
import {
  DocumentIcon,
  LinkIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const AddServicePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DocMode>(DocMode.SWAGGER);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [validServiceUrl, setValidServiceUrl] = useState(true);
  const [validDocUrl, setValidDocUrl] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>(AuthType.NONE);
  const [manualEndpoints, setManualEndpoints] = useState([
    { method: "GET", path: "", description: "" },
  ]);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectUrl: "",
    docUrl: "",
    docFile: null as File | null,
  });

  // Authentication specific fields
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [apiKeyLocation, setApiKeyLocation] = useState<"HEADER" | "QUERY_PARAM">("HEADER");
  const [bearerToken, setBearerToken] = useState("");

  const isValidServiceUrl = (url: string, isDoc: boolean) => {
    const regex = /^(https?:\/\/)(localhost|[\w.-]+)(:\d+)?(\/.*)?$/i;
    let valid = regex.test(url);

    if (isDoc) {
      valid =
        valid &&
        (url.endsWith(".json") ||
          url.endsWith(".yaml") ||
          url.endsWith(".yml"));
      setValidDocUrl(valid);
      return;
    }
    setValidServiceUrl(valid);
  };

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userStr = localStorage.getItem("user");
      let userId: string | null = null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.id;
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
        }
      }
      if (!userId) {
        setError("Utilisateur non connecté. Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }

      const projectData: any = {
        name: formData.name,
        description: formData.description,
        projectUrl: formData.projectUrl,
        docMode: activeTab,
        docSubmitMode: uploadMethod,
        authType: authType,
        userId: userId,
      };

      if (activeTab === DocMode.SWAGGER) {
        if (uploadMethod === "url") {
          projectData.docUrl = formData.docUrl;
        } else {
          projectData.docFile = formData.docFile;
        }
      }

      if (authType !== AuthType.NONE) {
        if (authType === AuthType.BASIC) {
          projectData.authUsername = basicUsername;
          projectData.authPassword = basicPassword;
        } else if (authType === AuthType.APIKEY) {
          projectData.apiKey = apiKey;
          projectData.apiKeyHeader = apiKeyHeader;
          projectData.apiKeyLocation = apiKeyLocation;
        } else if (authType === AuthType.BEARER) {
          projectData.bearerToken = bearerToken;
        }
      }

      const response = await projectService.createProject(projectData);
      navigate(`/service/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la création du projet");
    } finally {
      setLoading(false);
    }
  };

  const addManualEndpoint = () => {
    setManualEndpoints([
      ...manualEndpoints,
      { method: "GET", path: "", description: "" },
    ]);
  };

  const removeManualEndpoint = (index: number) => {
    setManualEndpoints(manualEndpoints.filter((_, i) => i !== index));
  };

  // Auth buttons – style active state
  const authButtons = [
    { label: "Aucune", value: AuthType.NONE },
    { label: "Basic Auth", value: AuthType.BASIC },
    { label: "API Key", value: AuthType.APIKEY },
    { label: "Bearer Token", value: AuthType.BEARER },
  ];

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 lg:p-12 max-w-7xl mx-auto w-full">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
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

            {/* Form Container */}
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
                  <span>SWAGGER / OpenAPI</span>
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
                  <span>Manual Entry</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-10 space-y-10">
                {/* General Info */}
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
                        onChange={(e) =>
                          handleInputChange("projectUrl", e.target.value)
                        }
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
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                {/* Import Method (only for Swagger tab) */}
                {activeTab === DocMode.SWAGGER && (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-sm font-bold text-on-surface">
                        Import Specification
                      </h3>
                      <div className="h-[1px] flex-1 bg-surface-container-high"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`cursor-pointer border-2 p-6 rounded-xl transition-all ${
                          uploadMethod === "url"
                            ? "border-primary bg-surface-container-low"
                            : "border-transparent bg-surface-container-low hover:border-outline-variant"
                        }`}
                        onClick={() => setUploadMethod("url")}
                      >
                        <div className="flex justify-between items-start">
                          <span className="material-symbols-outlined text-3xl text-primary">
                            link
                          </span>
                          {uploadMethod === "url" && (
                            <span className="text-primary">
                              <CheckCircleIcon className="w-6 h-6" />
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm mt-3">Remote URL</p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Fetch from your live endpoint
                        </p>
                      </div>
                      <div
                        className={`cursor-pointer border-2 p-6 rounded-xl transition-all ${
                          uploadMethod === "file"
                            ? "border-primary bg-surface-container-low"
                            : "border-transparent bg-surface-container-low hover:border-outline-variant"
                        }`}
                        onClick={() => {
                          setUploadMethod("file");
                          setValidDocUrl(true);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <span className="material-symbols-outlined text-3xl text-outline">
                            cloud_upload
                          </span>
                          {uploadMethod === "file" && (
                            <span className="text-primary">
                              <CheckCircleIcon className="w-6 h-6" />
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm mt-3">File Upload</p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Upload JSON/YAML spec
                        </p>
                      </div>
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
                          onChange={(e) =>
                            handleInputChange("docUrl", e.target.value)
                          }
                          onBlur={(e) => isValidServiceUrl(e.target.value, true)}
                        />
                        {!validDocUrl && (
                          <p className="text-error text-xs mt-1">
                            URL de documentation invalide (doit se terminer par .json, .yaml, .yml)
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
                          onChange={(e) =>
                            handleInputChange(
                              "docFile",
                              e.target.files?.[0] || null
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Authentication */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="text-sm font-bold text-on-surface">
                      Authentication Type
                    </h3>
                    <div className="h-[1px] flex-1 bg-surface-container-high"></div>
                  </div>
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

                  {/* Auth fields */}
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
                        placeholder="Header name (optional)"
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
                          onChange={(e) =>
                            setApiKeyLocation(
                              e.target.value as "HEADER" | "QUERY_PARAM"
                            )
                          }
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

                {/* Manual Endpoints */}
                {activeTab === DocMode.MANUAL && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-sm font-bold text-on-surface">
                        Endpoints
                      </h3>
                      <div className="h-[1px] flex-1 bg-surface-container-high"></div>
                    </div>
                    {manualEndpoints.map((ep, idx) => (
                      <div
                        key={idx}
                        className="flex gap-4 items-end bg-surface-container-low p-4 rounded-xl"
                      >
                        <div className="w-32">
                          <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                            Method
                          </label>
                          <select
                            className="w-full px-3 py-2 bg-surface-container-lowest border-transparent rounded-lg focus:ring-2 focus:ring-primary/20"
                            value={ep.method}
                            onChange={(e) => {
                              const newEndpoints = [...manualEndpoints];
                              newEndpoints[idx].method = e.target.value;
                              setManualEndpoints(newEndpoints);
                            }}
                          >
                            <option>GET</option>
                            <option>POST</option>
                            <option>PUT</option>
                            <option>DELETE</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                            Path
                          </label>
                          <input
                            type="text"
                            placeholder="/users"
                            className="w-full px-3 py-2 bg-surface-container-lowest border-transparent rounded-lg focus:ring-2 focus:ring-primary/20"
                            value={ep.path}
                            onChange={(e) => {
                              const newEndpoints = [...manualEndpoints];
                              newEndpoints[idx].path = e.target.value;
                              setManualEndpoints(newEndpoints);
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          className="text-error hover:bg-error/10 p-2"
                          onClick={() => removeManualEndpoint(idx)}
                          type="button"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      type="button"
                      onClick={addManualEndpoint}
                      icon={<PlusIcon className="w-4 h-4" />}
                    >
                      Add Endpoint
                    </Button>
                  </div>
                )}

                {/* Form Actions */}
                <div className="pt-6 border-t border-surface-container-low flex items-center justify-between">
                  <div className="flex items-center text-primary space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
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
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Helper / Preview Section */}
            <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">
                  auto_awesome
                </span>
                <h4 className="font-headline font-bold text-lg mb-2">
                  Auto-Discovery
                </h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Our engine automatically parses Swagger 2.0 and OpenAPI 3.0
                  definitions to generate exhaustive test suites.
                </p>
              </div>
              <div className="p-8 bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">
                  shield_lock
                </span>
                <h4 className="font-headline font-bold text-lg mb-2">
                  Secure Auth
                </h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Authentication headers are encrypted at rest and never logged
                  during high-precision test cycles.
                </p>
              </div>
              <div className="p-8 bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">
                  account_tree
                </span>
                <h4 className="font-headline font-bold text-lg mb-2">
                  Dependency Mapping
                </h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Identify how this service interacts with other laboratory
                  assets through our visual mapping tool.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Loading Overlay (optional, matches design) */}
      {loading && (
        <div className="fixed inset-0 bg-surface/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-headline font-bold text-primary tracking-widest uppercase text-xs">
              Architecting precision laboratory...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper icon (if not imported from heroicons)
import { CheckCircleIcon } from "@heroicons/react/24/outline";

export default AddServicePage;