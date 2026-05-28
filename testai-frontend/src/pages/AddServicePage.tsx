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
type ParamLocation = "path" | "query" | "header";
type FieldType = "string" | "integer" | "boolean" | "number" | "array";

interface ParamRow {
  id: string;
  name: string;
  location: ParamLocation;
  type: FieldType;
  required: boolean;
}

interface BodyField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  description: string;
}

interface ManualEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  tags: string;
  statusCodes: string;
  requiresAuth: boolean;
  expanded: boolean;
  params: ParamRow[];
  requestFields: BodyField[];
  responseFields: BodyField[];
}

const newId = () => Math.random().toString(36).slice(2, 8);

const DEFAULT_ENDPOINT: ManualEndpoint = {
  method: "GET",
  path: "",
  description: "",
  tags: "",
  statusCodes: "200",
  requiresAuth: false,
  expanded: true,
  params: [],
  requestFields: [],
  responseFields: [],
};

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    "bg-emerald-100 text-emerald-800 border-emerald-200",
  POST:   "bg-blue-100 text-blue-800 border-blue-200",
  PUT:    "bg-amber-100 text-amber-800 border-amber-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
  PATCH:  "bg-purple-100 text-purple-800 border-purple-200",
};

const FIELD_TYPES: FieldType[] = ["string", "integer", "boolean", "number", "array"];
const PARAM_LOCATIONS: ParamLocation[] = ["path", "query", "header"];

// ─────────────────────────────────────────────────────────────────────────────
// JSON BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildJsonSchema(fields: BodyField[]): string {
  if (!fields.length) return "";
  const properties: Record<string, any> = {};
  const required: string[] = [];
  fields.forEach((f) => {
    properties[f.name] = {
      type: f.type,
      ...(f.description ? { description: f.description } : {}),
    };
    if (f.required) required.push(f.name);
  });
  return JSON.stringify({
    type: "object",
    ...(required.length ? { required } : {}),
    properties,
  });
}

function buildParameters(params: ParamRow[]): string {
  if (!params.length) return "";
  return JSON.stringify(
    params.map((p) => ({
      name: p.name,
      in: p.location,
      required: p.required,
      schema: { type: p.type },
    }))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAM BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const ParamBuilder: React.FC<{
  params: ParamRow[];
  onChange: (params: ParamRow[]) => void;
}> = ({ params, onChange }) => {
  const add = () =>
    onChange([...params, { id: newId(), name: "", location: "query", type: "string", required: false }]);
  const update = (id: string, field: keyof ParamRow, value: any) =>
    onChange(params.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  const remove = (id: string) => onChange(params.filter((p) => p.id !== id));

  return (
    <div className="space-y-2">
      {params.map((p) => (
        <div key={p.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <input
            type="text"
            placeholder="nom du paramètre"
            value={p.name}
            onChange={(e) => update(p.id, "name", e.target.value)}
            className="flex-1 text-sm font-mono bg-transparent outline-none placeholder:text-slate-300 min-w-0"
          />
          <div className="flex gap-1">
            {PARAM_LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => update(p.id, "location", loc)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                  p.location === loc
                    ? loc === "path" ? "bg-violet-100 text-violet-700"
                      : loc === "query" ? "bg-sky-100 text-sky-700"
                      : "bg-orange-100 text-orange-700"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
          <select
            value={p.type}
            onChange={(e) => update(p.id, "type", e.target.value as FieldType)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 outline-none text-slate-600"
          >
            {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => update(p.id, "required", !p.required)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${
              p.required ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
          >
            {p.required ? "requis" : "optionnel"}
          </button>
          <button type="button" onClick={() => remove(p.id)} className="text-slate-300 hover:text-red-400 transition-colors">
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors px-1"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        Ajouter un paramètre
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BODY BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const BodyBuilder: React.FC<{
  fields: BodyField[];
  onChange: (fields: BodyField[]) => void;
  placeholder?: string;
}> = ({ fields, onChange, placeholder }) => {
  const add = () =>
    onChange([...fields, { id: newId(), name: "", type: "string", required: false, description: "" }]);
  const update = (id: string, field: keyof BodyField, value: any) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  const remove = (id: string) => onChange(fields.filter((f) => f.id !== id));

  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-xs text-slate-300 italic px-1">{placeholder}</p>
      )}
      {fields.map((f, i) => (
        <div
          key={f.id}
          className="grid grid-cols-[1fr_minmax(0,140px)_auto_auto_auto] gap-2 items-center bg-white border border-slate-200 rounded-lg px-3 py-2"
        >
          <input
            type="text"
            placeholder={`champ_${i + 1}`}
            value={f.name}
            onChange={(e) => update(f.id, "name", e.target.value)}
            className="text-sm font-mono bg-transparent outline-none placeholder:text-slate-300 min-w-0"
          />
          <input
            type="text"
            placeholder="description (optionnel)"
            value={f.description}
            onChange={(e) => update(f.id, "description", e.target.value)}
            className="text-xs bg-transparent outline-none placeholder:text-slate-300 text-slate-500 min-w-0"
          />
          <select
            value={f.type}
            onChange={(e) => update(f.id, "type", e.target.value as FieldType)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 outline-none text-slate-600"
          >
            {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => update(f.id, "required", !f.required)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${
              f.required ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
          >
            {f.required ? "requis" : "optionnel"}
          </button>
          <button type="button" onClick={() => remove(f.id)} className="text-slate-300 hover:text-red-400 transition-colors">
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors px-1"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        Ajouter un champ
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT CARD
// ─────────────────────────────────────────────────────────────────────────────

const SubSection: React.FC<{ label: string; badge: string; badgeColor: string; hint: string; children: React.ReactNode }> = ({ label, badge, badgeColor, hint, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${badgeColor}`}>
        {badge} {label}
      </span>
      <span className="text-[10px] text-slate-300">{hint}</span>
    </div>
    {children}
  </div>
);

const EndpointCard: React.FC<{
  index: number;
  endpoint: ManualEndpoint;
  onUpdate: <K extends keyof ManualEndpoint>(i: number, f: K, v: ManualEndpoint[K]) => void;
  onRemove: (i: number) => void;
  onToggleExpand: (i: number) => void;
  canRemove: boolean;
}> = ({ index, endpoint, onUpdate, onRemove, onToggleExpand, canRemove }) => {
  const mc = METHOD_COLORS[endpoint.method];
  const needsBody = ["POST", "PUT", "PATCH"].includes(endpoint.method);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <select
          value={endpoint.method}
          onChange={(e) => onUpdate(index, "method", e.target.value as HttpMethod)}
          className={`text-xs font-black px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${mc}`}
        >
          {(["GET","POST","PUT","DELETE","PATCH"] as HttpMethod[]).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="/api/resource/{id}"
          className="flex-1 px-2 py-1.5 bg-transparent font-mono text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none border-b border-transparent focus:border-primary transition-colors"
          value={endpoint.path}
          onChange={(e) => onUpdate(index, "path", e.target.value)}
        />

        <input
          type="text"
          placeholder="description courte…"
          className="w-44 px-2 py-1.5 bg-transparent text-xs text-slate-500 placeholder:text-slate-300 focus:outline-none border-b border-transparent focus:border-slate-300 transition-colors"
          value={endpoint.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
        />

        <button
          type="button"
          onClick={() => onUpdate(index, "requiresAuth", !endpoint.requiresAuth)}
          title="Requires authentication"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors shrink-0 ${
            endpoint.requiresAuth
              ? "bg-amber-100 text-amber-700 border border-amber-200"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
          }`}
        >
          <ShieldCheckIcon className="w-3.5 h-3.5" />
          {endpoint.requiresAuth ? "Auth" : "Public"}
        </button>

        <button
          type="button"
          onClick={() => onToggleExpand(index)}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {endpoint.expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expanded body */}
      {endpoint.expanded && (
        <div className="p-5 space-y-6">

          {/* Tags + Status codes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Tags <span className="normal-case font-normal">(séparés par des virgules)</span>
              </label>
              <input
                type="text"
                placeholder="users, payments, auth"
                value={endpoint.tags}
                onChange={(e) => onUpdate(index, "tags", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Codes retour attendus
              </label>
              <input
                type="text"
                placeholder="200, 201, 400, 404"
                value={endpoint.statusCodes}
                onChange={(e) => onUpdate(index, "statusCodes", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm font-mono text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[10px] text-slate-300">
                200 = succès · 400 = erreur client · 401 = non autorisé · 404 = introuvable
              </p>
            </div>
          </div>

          {/* Parameters */}
          <SubSection
            label="Paramètres URL"
            badge="📌"
            badgeColor="bg-violet-50 text-violet-600"
            hint="paramètres dans l'URL ou en query string"
          >
            <p className="text-[10px] text-slate-400 -mt-1 mb-2">
              Ex : <code className="bg-slate-100 px-1 rounded">/users/<span className="text-violet-600">{"{id}"}</span></code> → paramètre <strong>path</strong> · 
              {" "}<code className="bg-slate-100 px-1 rounded">?page=1</code> → paramètre <strong>query</strong>
            </p>
            <ParamBuilder params={endpoint.params} onChange={(params) => onUpdate(index, "params", params)} />
          </SubSection>

          {/* Request body */}
          {needsBody && (
            <SubSection
              label="Données envoyées (body)"
              badge="📤"
              badgeColor="bg-blue-50 text-blue-600"
              hint="champs JSON de la requête"
            >
              <p className="text-[10px] text-slate-400 -mt-1 mb-2">
                Définissez chaque champ du JSON que votre API reçoit.
              </p>
              <BodyBuilder
                fields={endpoint.requestFields}
                onChange={(fields) => onUpdate(index, "requestFields", fields)}
                placeholder="Aucun champ — cliquez 'Ajouter un champ' pour définir le corps de la requête."
              />
            </SubSection>
          )}

          {/* Response body */}
          <SubSection
            label="Réponse attendue"
            badge="📥"
            badgeColor="bg-emerald-50 text-emerald-600"
            hint="champs JSON retournés par le serveur"
          >
            <p className="text-[10px] text-slate-400 -mt-1 mb-2">
              Optionnel mais recommandé — aide l'IA à générer des tests plus précis.
            </p>
            <BodyBuilder
              fields={endpoint.responseFields}
              onChange={(fields) => onUpdate(index, "responseFields", fields)}
              placeholder="Optionnel — définissez les champs de la réponse JSON."
            />
          </SubSection>

          {/* JSON preview */}
          {(endpoint.params.length > 0 || endpoint.requestFields.length > 0 || endpoint.responseFields.length > 0) && (
            <details className="group">
              <summary className="text-[10px] font-bold uppercase tracking-widest text-slate-300 cursor-pointer hover:text-slate-500 select-none list-none flex items-center gap-1.5">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                Voir le JSON généré automatiquement
              </summary>
              <div className="mt-2 bg-slate-900 rounded-lg p-3 font-mono text-[10px] space-y-2 overflow-x-auto">
                {endpoint.params.length > 0 && (
                  <div>
                    <div className="text-slate-500 mb-0.5">// parameters</div>
                    <pre className="text-slate-300 whitespace-pre-wrap break-all">{buildParameters(endpoint.params)}</pre>
                  </div>
                )}
                {endpoint.requestFields.length > 0 && (
                  <div>
                    <div className="text-slate-500 mb-0.5">// requestBody schema</div>
                    <pre className="text-blue-300 whitespace-pre-wrap break-all">{buildJsonSchema(endpoint.requestFields)}</pre>
                  </div>
                )}
                {endpoint.responseFields.length > 0 && (
                  <div>
                    <div className="text-slate-500 mb-0.5">// responseBody schema</div>
                    <pre className="text-emerald-400 whitespace-pre-wrap break-all">{buildJsonSchema(endpoint.responseFields)}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const AddServicePage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DocMode>(DocMode.SWAGGER);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [validServiceUrl, setValidServiceUrl] = useState(true);
  const [validDocUrl, setValidDocUrl] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>(AuthType.NONE);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectUrl: "",
    docUrl: "",
    docFile: null as File | null,
  });

  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [apiKeyLocation, setApiKeyLocation] = useState<"HEADER" | "QUERY_PARAM">("HEADER");
  const [bearerToken, setBearerToken] = useState("");

  const [manualEndpoints, setManualEndpoints] = useState<ManualEndpoint[]>([
    { ...DEFAULT_ENDPOINT },
  ]);

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

  const addEndpoint = () =>
    setManualEndpoints((prev) => [...prev, { ...DEFAULT_ENDPOINT, expanded: true }]);

  const removeEndpoint = (index: number) =>
    setManualEndpoints((prev) => prev.filter((_, i) => i !== index));

  const updateEndpoint = <K extends keyof ManualEndpoint>(index: number, field: K, value: ManualEndpoint[K]) =>
    setManualEndpoints((prev) => prev.map((ep, i) => (i === index ? { ...ep, [field]: value } : ep)));

  const toggleExpand = (index: number) =>
    setManualEndpoints((prev) => prev.map((ep, i) => i === index ? { ...ep, expanded: !ep.expanded } : ep));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userStr = sessionStorage.getItem("user");
      let userId: string | null = null;
      if (userStr) { try { userId = JSON.parse(userStr).id; } catch {} }
      if (!userId) { setError("User not logged in. Please log in again."); setLoading(false); return; }

      const projectData: any = {
        name:        formData.name,
        description: formData.description,
        projectUrl:  formData.projectUrl,
        docMode:     activeTab,
        authType:    authType,
        userId:      userId,
      };

      if (activeTab === DocMode.SWAGGER) {
        projectData.docSubmitMode = uploadMethod;
        if (uploadMethod === "url") projectData.docUrl = formData.docUrl;
        else projectData.docFile = formData.docFile;
      }

      if (activeTab === DocMode.MANUAL) {
        const validEndpoints = manualEndpoints.filter((ep) => ep.path.trim() !== "");
        if (validEndpoints.length === 0) {
          setError("Ajoutez au moins un endpoint avec un path.");
          setLoading(false);
          return;
        }
        // Serialize: build JSON schemas from visual fields
        const toSend = validEndpoints.map(({ expanded, params, requestFields, responseFields, ...rest }) => ({
          ...rest,
          parameters:   buildParameters(params),
          requestBody:  buildJsonSchema(requestFields),
          responseBody: buildJsonSchema(responseFields),
        }));
        projectData.manualEndpoints = JSON.stringify(toSend);
        projectData.docUrl = "";
        projectData.docSubmitMode = "url";
      }

      if (authType === AuthType.BASIC) { projectData.authUsername = basicUsername; projectData.authPassword = basicPassword; }
      else if (authType === AuthType.APIKEY) { projectData.apiKey = apiKey; projectData.apiKeyHeader = apiKeyHeader; projectData.apiKeyLocation = apiKeyLocation; }
      else if (authType === AuthType.BEARER) { projectData.bearerToken = bearerToken; }

      const response = await projectService.createProject(projectData);
      navigate(`/service/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error occurred while creating the project");
    } finally {
      setLoading(false);
    }
  };

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

            <div className="bg-surface-container-lowest rounded-xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] overflow-hidden">

              {/* Tabs */}
              <div className="flex border-b border-surface-container-low px-8">
                <button type="button"
                  className={`px-6 py-5 text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === DocMode.SWAGGER ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                  onClick={() => setActiveTab(DocMode.SWAGGER)}
                >
                  <DocumentIcon className="w-5 h-5" />
                  SWAGGER / OpenAPI
                </button>
                <button type="button"
                  className={`px-6 py-5 text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === DocMode.MANUAL ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                  onClick={() => setActiveTab(DocMode.MANUAL)}
                >
                  <LinkIcon className="w-5 h-5" />
                  Manual Entry
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-10">

                {/* General info */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Service Name</label>
                    <input type="text" className="w-full px-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest transition-all focus:ring-2 focus:ring-primary/20" placeholder="e.g. Core Payment Gateway" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Base URL</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-mono text-xs">https://</span>
                      <input type="text" className="w-full pl-16 pr-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface font-mono text-sm placeholder:text-outline/50 focus:bg-surface-container-lowest transition-all focus:ring-2 focus:ring-primary/20" placeholder="api.production.internal" value={formData.projectUrl} onChange={(e) => handleInputChange("projectUrl", e.target.value)} onBlur={(e) => isValidServiceUrl(e.target.value, false)} required />
                    </div>
                    {!validServiceUrl && <p className="text-error text-xs mt-1">URL invalide</p>}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Description</label>
                    <textarea rows={2} className="w-full px-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest transition-all resize-none focus:ring-2 focus:ring-primary/20" placeholder="Describe the purpose of this service..." value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} required />
                  </div>
                </div>

                {/* Swagger import */}
                {activeTab === DocMode.SWAGGER && (
                  <div className="space-y-6">
                    <SectionDivider label="Import Specification" />
                    <div className="grid grid-cols-2 gap-4">
                      <ImportCard active={uploadMethod === "url"} icon="link" title="Remote URL" subtitle="Fetch from your live endpoint" onClick={() => setUploadMethod("url")} />
                      <ImportCard active={uploadMethod === "file"} icon="cloud_upload" title="File Upload" subtitle="Upload JSON/YAML spec" onClick={() => { setUploadMethod("file"); setValidDocUrl(true); }} />
                    </div>
                    {uploadMethod === "url" ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-on-surface-variant">Specification Endpoint URL</label>
                        <input type="url" className="w-full px-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface font-mono text-sm focus:bg-surface-container-lowest transition-all focus:ring-2 focus:ring-primary/20" placeholder="https://api.testai.io/swagger.json" value={formData.docUrl} onChange={(e) => handleInputChange("docUrl", e.target.value)} onBlur={(e) => isValidServiceUrl(e.target.value, true)} />
                        {!validDocUrl && <p className="text-error text-xs mt-1">URL invalide (doit se terminer par .json, .yaml, .yml)</p>}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-on-surface-variant">Upload Swagger File</label>
                        <input type="file" accept=".json,.yaml,.yml" className="w-full px-4 py-3 bg-surface-container-low border-transparent rounded-xl text-on-surface file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-container focus:outline-none" onChange={(e) => handleInputChange("docFile", e.target.files?.[0] || null)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Auth */}
                <div className="space-y-6">
                  <SectionDivider label="Authentication Type" />
                  <div className="flex flex-wrap gap-2">
                    {authButtons.map((btn) => (
                      <button key={btn.value} type="button"
                        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${authType === btn.value ? "bg-secondary-container text-on-secondary-fixed-variant" : "bg-surface-container-high text-on-surface-variant hover:bg-secondary-container"}`}
                        onClick={() => setAuthType(btn.value)}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  {authType === AuthType.BASIC && (
                    <div className="space-y-4 p-4 bg-surface-container-low rounded-xl">
                      <input type="text" placeholder="Username" className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20" value={basicUsername} onChange={(e) => setBasicUsername(e.target.value)} />
                      <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20" value={basicPassword} onChange={(e) => setBasicPassword(e.target.value)} />
                    </div>
                  )}
                  {authType === AuthType.APIKEY && (
                    <div className="space-y-4 p-4 bg-surface-container-low rounded-xl">
                      <input type="text" placeholder="API Key" className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
                      <input type="text" placeholder="Header name (e.g. X-API-Key)" className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20" value={apiKeyHeader} onChange={(e) => setApiKeyHeader(e.target.value)} />
                      <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">Location</label>
                        <select className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20" value={apiKeyLocation} onChange={(e) => setApiKeyLocation(e.target.value as "HEADER" | "QUERY_PARAM")}>
                          <option value="HEADER">Header</option>
                          <option value="QUERY_PARAM">Query parameter</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {authType === AuthType.BEARER && (
                    <div className="space-y-4 p-4 bg-surface-container-low rounded-xl">
                      <input type="text" placeholder="Bearer Token" className="w-full px-4 py-3 bg-surface-container-lowest border-transparent rounded-xl focus:ring-2 focus:ring-primary/20" value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} required />
                    </div>
                  )}
                </div>

                {/* Manual endpoints */}
                {activeTab === DocMode.MANUAL && (
                  <div className="space-y-4">
                    <SectionDivider label="Endpoints" />

                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <ShieldCheckIcon className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <div className="text-xs text-blue-700 leading-relaxed space-y-1">
                        <p className="font-semibold">Comment remplir ?</p>
                        <p>1. Choisissez la <strong>méthode</strong> (GET, POST…) et entrez le <strong>path</strong> de l'endpoint.</p>
                        <p>2. Ajoutez les <strong>paramètres URL</strong> si votre endpoint en a (ex: <code className="bg-blue-100 px-1 rounded">{"{id}"}</code> dans le path).</p>
                        <p>3. Pour POST/PUT/PATCH, définissez les <strong>champs du body</strong> envoyés.</p>
                        <p>4. Optionnellement, décrivez la <strong>réponse attendue</strong> pour de meilleurs tests.</p>
                      </div>
                    </div>

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

                    <button
                      type="button"
                      onClick={addEndpoint}
                      className="w-full py-3 border-2 border-dashed border-surface-container-high rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Endpoint
                    </button>

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

                {/* Actions */}
                <div className="pt-6 border-t border-surface-container-low flex items-center justify-between">
                  <div className="flex items-center text-primary space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Awaiting validation...</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button type="button" className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => navigate("/dashboard")}>
                      Discard
                    </button>
                    <button type="submit" disabled={loading} className="relative group overflow-hidden bg-gradient-to-br from-primary to-primary-container px-10 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? (
                        <div className="flex items-center gap-2"><ArrowPathIcon className="w-5 h-5 animate-spin" />Creating...</div>
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

      {loading && (
        <div className="fixed inset-0 bg-surface/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-headline font-bold text-primary tracking-widest uppercase text-xs">Architecting precision laboratory...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS (inchangés)
// ─────────────────────────────────────────────────────────────────────────────

const SectionDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center space-x-4 mb-2">
    <h3 className="text-sm font-bold text-on-surface whitespace-nowrap">{label}</h3>
    <div className="h-[1px] flex-1 bg-surface-container-high" />
  </div>
);

const ImportCard: React.FC<{ active: boolean; icon: string; title: string; subtitle: string; onClick: () => void }> = ({ active, icon, title, subtitle, onClick }) => (
  <div
    className={`cursor-pointer border-2 p-6 rounded-xl transition-all ${active ? "border-primary bg-surface-container-low" : "border-transparent bg-surface-container-low hover:border-outline-variant"}`}
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

export default AddServicePage;