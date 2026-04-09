// ExecuteRapideApiPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import {
  BoltIcon,
  ChevronDownIcon,
  TrashIcon,
  SparklesIcon,
  BellIcon,
  CogIcon,
  PlusIcon,
  FolderOpenIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  KeyIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import {
  apiRunnerService,
  type ExecuteApiRequestDTO,
  type ApiResponseDTO,
  type SavedApiRequestDTO,
} from "../services/api";

// Types locaux
interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

type AuthType = "NONE" | "BEARER" | "BASIC" | "API_KEY";

const ExecuteRapideApiPage: React.FC = () => {
  // État de la requête
  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState<string>("");
  const [requestBody, setRequestBody] = useState<string>("{}");
  const [contentType, setContentType] = useState<string>("application/json");

  // Onglets
  const [activeTab, setActiveTab] = useState<"params" | "authorization" | "headers" | "body" | "settings">("body");

  // Headers et Query Params (tableaux éditables)
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { id: "1", key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>([]);

  // Authentification
  const [authType, setAuthType] = useState<AuthType>("NONE");
  const [bearerToken, setBearerToken] = useState<string>("");
  const [basicUsername, setBasicUsername] = useState<string>("");
  const [basicPassword, setBasicPassword] = useState<string>("");
  const [apiKeyName, setApiKeyName] = useState<string>("");
  const [apiKeyValue, setApiKeyValue] = useState<string>("");
  const [apiKeyIn, setApiKeyIn] = useState<"header" | "query">("header");

  // Réponse et état d'exécution
  const [response, setResponse] = useState<ApiResponseDTO | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Historique
  const [history, setHistory] = useState<SavedApiRequestDTO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // UI
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>("");
  const [saveDescription, setSaveDescription] = useState<string>("");

  // ──────────────────────────────────────────────────────────────────────────
  // Charger l'historique au montage
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiRunnerService.getUserRequests("created");
      setHistory(res.data);
    } catch (err) {
      console.error("Erreur chargement historique", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Construire l'objet ExecuteApiRequestDTO à partir de l'état
  // ──────────────────────────────────────────────────────────────────────────
  const buildRequest = (): ExecuteApiRequestDTO => {
    // Headers actifs
    const activeHeaders: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
      activeHeaders[h.key] = h.value;
    });

    // Query params actifs
    const activeParams: Record<string, string> = {};
    queryParams.filter(p => p.enabled && p.key.trim()).forEach(p => {
      activeParams[p.key] = p.value;
    });

    // Auth config
    let authConfig: Record<string, string> = {};
    if (authType === "BEARER") {
      authConfig = { token: bearerToken };
    } else if (authType === "BASIC") {
      authConfig = { username: basicUsername, password: basicPassword };
    } else if (authType === "API_KEY") {
      authConfig = { key: apiKeyName, value: apiKeyValue, in: apiKeyIn };
    }

    // Construire l'URL avec query params (si présents)
    let finalUrl = url;
    if (Object.keys(activeParams).length > 0) {
      const urlObj = new URL(url);
      Object.entries(activeParams).forEach(([k, v]) => urlObj.searchParams.append(k, v));
      finalUrl = urlObj.toString();
    }

    return {
      method,
      url: finalUrl,
      headers: activeHeaders,
      queryParams: activeParams,
      authType,
      authConfig,
      requestBody: method !== "GET" && method !== "DELETE" ? requestBody : undefined,
      saveAfterExecution: false,
    };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Exécuter la requête
  // ──────────────────────────────────────────────────────────────────────────
  const handleExecute = async (savedRequestId?: string) => {
    setIsExecuting(true);
    setError(null);
    setResponse(null);
    try {
      let res;
      if (savedRequestId) {
        res = await apiRunnerService.executeSavedRequest(savedRequestId);
      } else {
        const req = buildRequest();
        res = await apiRunnerService.executeRequest(req);
      }
      setResponse(res.data);
      // Recharger l'historique après exécution
      await loadHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Erreur d'exécution");
    } finally {
      setIsExecuting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Sauvegarder la requête courante
  // ──────────────────────────────────────────────────────────────────────────
  const handleSaveRequest = async () => {
    if (!saveName.trim()) {
      alert("Veuillez donner un nom à la requête");
      return;
    }

    const activeHeaders: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key.trim()).forEach(h => { activeHeaders[h.key] = h.value; });

    const activeParams: Record<string, string> = {};
    queryParams.filter(p => p.enabled && p.key.trim()).forEach(p => { activeParams[p.key] = p.value; });

    let authConfig: Record<string, string> = {};
    if (authType === "BEARER") authConfig = { token: bearerToken };
    else if (authType === "BASIC") authConfig = { username: basicUsername, password: basicPassword };
    else if (authType === "API_KEY") authConfig = { key: apiKeyName, value: apiKeyValue, in: apiKeyIn };

    const savedRequest: SavedApiRequestDTO = {
      name: saveName,
      description: saveDescription,
      method,
      url,
      headers: activeHeaders,
      queryParams: activeParams,
      authType,
      authConfig,
      requestBody: method !== "GET" && method !== "DELETE" ? requestBody : undefined,
    };

    try {
      const res = await apiRunnerService.createRequest(savedRequest);
      setShowSaveModal(false);
      setSaveName("");
      setSaveDescription("");
      await loadHistory();
      // Optionnel : sélectionner la requête sauvegardée
      setSelectedRequestId(res.data.id || null);
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + (err.response?.data?.message || err.message));
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Charger une requête depuis l'historique
  // ──────────────────────────────────────────────────────────────────────────
  const loadRequestFromHistory = (req: SavedApiRequestDTO) => {
    setMethod(req.method);
    setUrl(req.url);
    setRequestBody(req.requestBody || "{}");
    setAuthType((req.authType as AuthType) || "NONE");

    // Headers
    const headerItems: KeyValuePair[] = Object.entries(req.headers || {}).map(([k, v], i) => ({
      id: `h-${i}-${Date.now()}`,
      key: k,
      value: v,
      enabled: true,
    }));
    // Assurer qu'il y a toujours Content-Type
    if (!headerItems.some(h => h.key.toLowerCase() === "content-type")) {
      headerItems.push({ id: `ct-${Date.now()}`, key: "Content-Type", value: "application/json", enabled: true });
    }
    setHeaders(headerItems);

    // Query Params
    const paramItems: KeyValuePair[] = Object.entries(req.queryParams || {}).map(([k, v], i) => ({
      id: `p-${i}-${Date.now()}`,
      key: k,
      value: v,
      enabled: true,
    }));
    setQueryParams(paramItems);

    // Auth config
    if (req.authType === "BEARER" && req.authConfig?.token) {
      setBearerToken(req.authConfig.token);
    } else if (req.authType === "BASIC") {
      setBasicUsername(req.authConfig?.username || "");
      setBasicPassword(req.authConfig?.password || "");
    } else if (req.authType === "API_KEY") {
      setApiKeyName(req.authConfig?.key || "");
      setApiKeyValue(req.authConfig?.value || "");
      setApiKeyIn((req.authConfig?.in as "header" | "query") || "header");
    }

    setSelectedRequestId(req.id || null);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Supprimer une requête de l'historique
  // ──────────────────────────────────────────────────────────────────────────
  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Supprimer cette requête de l'historique ?")) return;
    try {
      await apiRunnerService.deleteRequest(requestId);
      await loadHistory();
      if (selectedRequestId === requestId) setSelectedRequestId(null);
    } catch (err: any) {
      alert("Erreur suppression : " + (err.response?.data?.message || err.message));
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers pour les tableaux (headers/params)
  // ──────────────────────────────────────────────────────────────────────────
  const addHeader = () => setHeaders([...headers, { id: `h-${Date.now()}`, key: "", value: "", enabled: true }]);
  const updateHeader = (id: string, field: keyof KeyValuePair, value: any) => {
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: value } : h));
  };
  const removeHeader = (id: string) => setHeaders(headers.filter(h => h.id !== id));

  const addQueryParam = () => setQueryParams([...queryParams, { id: `p-${Date.now()}`, key: "", value: "", enabled: true }]);
  const updateQueryParam = (id: string, field: keyof KeyValuePair, value: any) => {
    setQueryParams(queryParams.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const removeQueryParam = (id: string) => setQueryParams(queryParams.filter(p => p.id !== id));

  // ──────────────────────────────────────────────────────────────────────────
  // Rendu
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="flex justify-between items-center px-8 w-full h-16 border-b border-primary/10 bg-surface">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-headline font-bold tracking-tight text-on-surface">
                API Runner
              </h2>
              <Badge variant="info" className="text-[10px] font-bold tracking-wider">
                v2.4.0-STABLE
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaveModal(true)}
                className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-1"
                title="Sauvegarder cette requête"
              >
                <FolderOpenIcon className="w-5 h-5" />
                <span className="text-xs font-medium">Save</span>
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">
                <BellIcon className="w-5 h-5" />
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">
                <CogIcon className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Contenu principal */}
          <div className="flex flex-1 overflow-hidden">
            {/* Colonne gauche : Requête / Réponse */}
            <div className="flex-1 p-8 overflow-y-auto space-y-8">
              {/* Barre de requête */}
              <div className="bg-surface-container-lowest p-1 rounded-xl shadow-sm ring-1 ring-outline-variant/15 flex items-center gap-2">
                <div className="relative">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="appearance-none bg-secondary-container text-on-secondary-container font-bold text-sm px-4 py-2.5 pr-8 rounded-xl border-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                    <option>PATCH</option>
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-2.5 w-4 h-4 text-on-secondary-container/50 pointer-events-none" />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/endpoint"
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
                <Button
                  onClick={() => handleExecute()}
                  loading={isExecuting}
                  disabled={!url.trim()}
                  className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
                  icon={!isExecuting ? <BoltIcon className="w-4 h-4" /> : undefined}
                >
                  {isExecuting ? "Sending..." : "Send"}
                </Button>
              </div>

              {/* Onglets */}
              <div className="space-y-4">
                <div className="flex border-b border-outline-variant/10 gap-8">
                  {["params", "authorization", "headers", "body", "settings"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === tab
                          ? "border-primary text-primary"
                          : "border-transparent text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Onglet Params */}
                {activeTab === "params" && (
                  <KeyValueEditor
                    title="Query Parameters"
                    pairs={queryParams}
                    onAdd={addQueryParam}
                    onUpdate={updateQueryParam}
                    onRemove={removeQueryParam}
                  />
                )}

                {/* Onglet Authorization */}
                {activeTab === "authorization" && (
                  <div className="bg-surface-container-lowest rounded-xl p-6 ring-1 ring-outline-variant/15 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Type</label>
                      <select
                        value={authType}
                        onChange={(e) => setAuthType(e.target.value as AuthType)}
                        className="w-full md:w-64 px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                      >
                        <option value="NONE">No Auth</option>
                        <option value="BEARER">Bearer Token</option>
                        <option value="BASIC">Basic Auth</option>
                        <option value="API_KEY">API Key</option>
                      </select>
                    </div>

                    {authType === "BEARER" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Token</label>
                        <input
                          type="text"
                          value={bearerToken}
                          onChange={(e) => setBearerToken(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg text-sm font-mono"
                        />
                      </div>
                    )}

                    {authType === "BASIC" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Username</label>
                          <input
                            type="text"
                            value={basicUsername}
                            onChange={(e) => setBasicUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Password</label>
                          <input
                            type="password"
                            value={basicPassword}
                            onChange={(e) => setBasicPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {authType === "API_KEY" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Key</label>
                            <input
                              type="text"
                              value={apiKeyName}
                              onChange={(e) => setApiKeyName(e.target.value)}
                              placeholder="X-API-Key"
                              className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Value</label>
                            <input
                              type="text"
                              value={apiKeyValue}
                              onChange={(e) => setApiKeyValue(e.target.value)}
                              className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Add to</label>
                          <select
                            value={apiKeyIn}
                            onChange={(e) => setApiKeyIn(e.target.value as "header" | "query")}
                            className="w-full md:w-48 px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                          >
                            <option value="header">Header</option>
                            <option value="query">Query Parameter</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Onglet Headers */}
                {activeTab === "headers" && (
                  <KeyValueEditor
                    title="Request Headers"
                    pairs={headers}
                    onAdd={addHeader}
                    onUpdate={updateHeader}
                    onRemove={removeHeader}
                  />
                )}

                {/* Onglet Body */}
                {activeTab === "body" && (
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm ring-1 ring-outline-variant/15 overflow-hidden">
                    <div className="bg-surface-container-low px-4 py-2 flex justify-between items-center border-b border-outline-variant/10">
                      <span className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
                        {method === "GET" || method === "DELETE" ? "Body (non applicable)" : "Request Body"}
                      </span>
                      <select
                        value={contentType}
                        onChange={(e) => {
                          setContentType(e.target.value);
                          const existing = headers.find(h => h.key.toLowerCase() === "content-type");
                          if (existing) {
                            updateHeader(existing.id, "value", e.target.value);
                          } else {
                            addHeader();
                            const newId = headers.length > 0 ? headers[headers.length-1].id : "new";
                            setTimeout(() => updateHeader(newId, "key", "Content-Type"), 0);
                            setTimeout(() => updateHeader(newId, "value", e.target.value), 0);
                          }
                        }}
                        className="text-xs border border-outline-variant/30 rounded px-2 py-1"
                      >
                        <option>application/json</option>
                        <option>application/xml</option>
                        <option>text/plain</option>
                        <option>application/x-www-form-urlencoded</option>
                      </select>
                    </div>
                    <div className="p-6 font-mono text-sm leading-relaxed min-h-[240px] bg-[#0d1117] text-gray-300">
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        disabled={method === "GET" || method === "DELETE"}
                        className="w-full h-64 bg-transparent border-none outline-none resize-none font-mono text-sm"
                        placeholder="{\n  \'key\': \'value\'\n}"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}

                {/* Onglet Settings */}
                {activeTab === "settings" && (
                  <div className="bg-surface-container-lowest rounded-xl p-6 ring-1 ring-outline-variant/15">
                    <p className="text-sm text-on-surface-variant">Paramètres supplémentaires (timeout, follow redirects, etc.) - à venir</p>
                  </div>
                )}
              </div>

              {/* Section Réponse */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-sm font-bold tracking-tight text-on-surface-variant uppercase">
                    Response
                  </h3>
                  {response && (
                    <div className="flex gap-4 items-center">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        response.status >= 200 && response.status < 300
                          ? "bg-green-100 text-green-800"
                          : response.status >= 400
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          response.status >= 200 && response.status < 300 ? "bg-green-500" : "bg-red-500"
                        }`}></span>
                        {response.status} {response.statusText}
                      </div>
                      <div className="text-xs font-medium text-on-surface-variant">
                        Time: <span className="text-on-surface font-bold">{response.responseTimeMs}ms</span>
                      </div>
                      <div className="text-xs font-medium text-on-surface-variant">
                        Size: <span className="text-on-surface font-bold">{response.size}</span>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="text-red-500 text-sm flex items-center gap-1">
                      <XCircleIcon className="w-4 h-4" /> {error}
                    </div>
                  )}
                </div>
                {response ? (
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm ring-1 ring-outline-variant/15 overflow-hidden">
                    <div className="p-6 font-mono text-sm leading-relaxed bg-[#f8f9ff] text-on-surface border-l-4 border-emerald-500 max-h-96 overflow-auto">
                      <pre className="whitespace-pre-wrap break-words">{response.body}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant text-sm ring-1 ring-outline-variant/15">
                    Cliquez sur "Send" pour exécuter la requête
                  </div>
                )}
              </div>
            </div>

            {/* Colonne droite : Historique */}
            <aside className="w-80 bg-surface-container-low border-l border-outline-variant/10 p-6 flex flex-col gap-6 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black tracking-widest uppercase text-on-surface">
                  Request History
                </h3>
                <button
                  onClick={loadHistory}
                  className="p-1 hover:bg-surface-container-high rounded"
                  title="Rafraîchir"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="text-center py-8 text-on-surface-variant">Chargement...</div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant text-sm">
                    Aucune requête sauvegardée
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 bg-surface-container-lowest rounded-xl ring-1 ring-outline-variant/5 hover:ring-primary/20 transition-all cursor-pointer group ${
                        selectedRequestId === item.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => loadRequestFromHistory(item)}
                    >
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase ${
                              item.method === "GET"
                                ? "text-secondary"
                                : item.method === "POST"
                                ? "text-primary"
                                : "text-amber-600"
                            }`}
                          >
                            {item.method}
                          </span>
                          <span className="text-[10px] font-medium text-on-surface truncate max-w-[120px]">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.id) handleExecute(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 rounded"
                            title="Exécuter"
                          >
                            <PlayIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.id) handleDeleteRequest(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500"
                            title="Supprimer"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-mono truncate text-on-surface mb-2">{item.url}</p>
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                        <ClockIcon className="w-3 h-3" />
                        {item.lastExecutedAt
                          ? new Date(item.lastExecutedAt).toLocaleString()
                          : "Jamais exécutée"}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Carte AI */}
              <div className="mt-auto p-4 bg-gradient-to-br from-inverse-surface to-[#131b2e] rounded-xl text-white">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-5 h-5 text-primary-fixed" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Lab AI</span>
                </div>
                <p className="text-xs text-indigo-100/70 mb-3 leading-relaxed">
                  Laissez l’IA écrire vos scripts de test à partir du schéma de cette requête.
                </p>
                <button className="w-full py-2 bg-primary-container text-white rounded-lg text-[10px] font-bold uppercase tracking-tighter hover:bg-primary transition-all">
                  Générer des assertions
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Modal de sauvegarde */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Sauvegarder la requête</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="ex: Get user profile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveRequest}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant réutilisable pour les éditeurs clé-valeur (headers/params)
const KeyValueEditor: React.FC<{
  title: string;
  pairs: { id: string; key: string; value: string; enabled: boolean }[];
  onAdd: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
}> = ({ title, pairs, onAdd, onUpdate, onRemove }) => (
  <div className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline-variant/15 space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{title}</span>
      <button onClick={onAdd} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
        <PlusIcon className="w-3 h-3" /> Ajouter
      </button>
    </div>
    <div className="space-y-2">
      {pairs.map((pair) => (
        <div key={pair.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => onUpdate(pair.id, "enabled", e.target.checked)}
            className="rounded"
          />
          <input
            type="text"
            placeholder="Key"
            value={pair.key}
            onChange={(e) => onUpdate(pair.id, "key", e.target.value)}
            className="flex-1 px-3 py-1.5 border border-outline-variant/30 rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Value"
            value={pair.value}
            onChange={(e) => onUpdate(pair.id, "value", e.target.value)}
            className="flex-1 px-3 py-1.5 border border-outline-variant/30 rounded-lg text-sm"
          />
          <button onClick={() => onRemove(pair.id)} className="text-on-surface-variant hover:text-red-500">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// Icône Play manquante (on peut utiliser BoltIcon ou en créer une)
const PlayIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />
  </svg>
);

export default ExecuteRapideApiPage;