// ExecuteRapideApiPage.tsx
import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import {
  BoltIcon,
  ChevronDownIcon,
  TrashIcon,
  PlusIcon,
  FolderOpenIcon,
  ArrowPathIcon,
  XCircleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import {
  apiRunnerService,
  type ExecuteApiRequestDTO,
  type ApiResponseDTO,
  type SavedApiRequestDTO,
} from "../services/api";

// Types locaux (inchangés)
interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

type AuthType = "NONE" | "BEARER" | "BASIC" | "API_KEY";

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants (CodeEditor, JsonViewer, KeyValueEditor, PlayIcon)
// (inchangés – inclus pour l'intégrité du fichier)
// ─────────────────────────────────────────────────────────────────────────────

const CodeEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}> = ({ value, onChange, disabled, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lineCount = value.split("\n").length;

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="relative flex font-mono text-sm bg-[#0d1117] rounded-xl overflow-hidden border border-outline-variant/20">
      <div
        ref={lineNumbersRef}
        className="py-4 pl-4 pr-2 text-right select-none bg-[#0d1117] text-gray-500 border-r border-gray-700 overflow-hidden"
        style={{ minWidth: "3.5rem" }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full p-4 pl-3 bg-transparent text-gray-300 outline-none resize-none overflow-auto leading-6 font-mono text-sm"
        style={{ minHeight: "240px", maxHeight: "500px", whiteSpace: "pre" }}
        spellCheck={false}
      />
    </div>
  );
};

const JsonViewer: React.FC<{ data: any }> = ({ data }) => {
  const normalizeData = (input: any): any => {
    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        return typeof parsed === "string" ? normalizeData(parsed) : parsed;
      } catch {
        return input;
      }
    }
    return input;
  };

  const normalized = normalizeData(data);

  const formatJson = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const jsonString = formatJson(normalized);
  const lines = jsonString.split("\n");

  const highlightLine = (line: string): React.ReactNode => {
    const elements: React.ReactNode[] = [];
    let i = 0;
    const length = line.length;
    let key = 0;

    while (i < length) {
      if (line[i] === " ") {
        let j = i;
        while (j < length && line[j] === " ") j++;
        elements.push(<span key={key++}>{line.substring(i, j)}</span>);
        i = j;
        continue;
      }

      if ("{}[],:".includes(line[i])) {
        elements.push(
          <span key={key++} className="text-gray-400">
            {line[i]}
          </span>
        );
        i++;
        continue;
      }

      if (line[i] === '"') {
        let j = i + 1;
        let escaped = false;
        while (j < length) {
          if (line[j] === "\\") {
            escaped = !escaped;
          } else if (line[j] === '"' && !escaped) {
            break;
          } else {
            escaped = false;
          }
          j++;
        }
        const token = line.substring(i, j + 1);

        let isKey = false;
        let k = j + 1;
        while (k < length && line[k] === " ") k++;
        if (k < length && line[k] === ":") {
          isKey = true;
        }

        elements.push(
          <span
            key={key++}
            className={isKey ? "text-purple-400" : "text-green-400"}
          >
            {token}
          </span>
        );
        i = j + 1;
        continue;
      }

      const numberRegex = /^-?\d+(\.\d+)?([eE][+-]?\d+)?\b/;
      const booleanNullRegex = /^(true|false|null)\b/;

      if (numberRegex.test(line.slice(i))) {
        const match = line.slice(i).match(numberRegex);
        if (match) {
          elements.push(
            <span key={key++} className="text-orange-400">
              {match[0]}
            </span>
          );
          i += match[0].length;
          continue;
        }
      } else if (booleanNullRegex.test(line.slice(i))) {
        const match = line.slice(i).match(booleanNullRegex);
        if (match) {
          elements.push(
            <span key={key++} className="text-blue-400">
              {match[0]}
            </span>
          );
          i += match[0].length;
          continue;
        }
      }

      elements.push(<span key={key++}>{line[i]}</span>);
      i++;
    }

    return <>{elements}</>;
  };

  return (
    <div className="w-full h-96 bg-[#0d1117] rounded-xl border border-outline-variant/20 overflow-auto font-mono text-sm">
      <div className="flex">
        <div className="py-4 pl-4 pr-2 text-right select-none bg-[#0d1117] text-gray-500 border-r border-gray-700">
          {lines.map((_, i) => (
            <div key={i + 1} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>
        <div className="p-4 pl-3 text-gray-300 leading-6">
          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre">
              {highlightLine(line)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const KeyValueEditor: React.FC<{
  title: string;
  pairs: { id: string; key: string; value: string; enabled: boolean }[];
  onAdd: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
}> = ({ title, pairs, onAdd, onUpdate, onRemove }) => (
  <div className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline-variant/15 space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {title}
      </span>
      <button
        onClick={onAdd}
        className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
      >
        <PlusIcon className="w-3 h-3" /> Add
      </button>
    </div>
    <div className="space-y-2">
      {pairs.map((pair) => (
        <div key={pair.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
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
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Value"
              value={pair.value}
              onChange={(e) => onUpdate(pair.id, "value", e.target.value)}
              className="flex-1 px-3 py-1.5 border border-outline-variant/30 rounded-lg text-sm"
            />
            <button
              onClick={() => onRemove(pair.id)}
              className="text-on-surface-variant hover:text-red-500"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z"
    />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

const ExecuteRapideApiPage: React.FC = () => {
  // ⭐ État pour la sidebar mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState<string>("");
  const [requestBody, setRequestBody] = useState<string>("{}");
  const [contentType, setContentType] = useState<string>("application/json");

  const [activeTab, setActiveTab] = useState<
    "params" | "authorization" | "headers" | "body" | "settings"
  >("body");

  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { id: "1", key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>([]);

  const [authType, setAuthType] = useState<AuthType>("NONE");
  const [bearerToken, setBearerToken] = useState<string>("");
  const [basicUsername, setBasicUsername] = useState<string>("");
  const [basicPassword, setBasicPassword] = useState<string>("");
  const [apiKeyName, setApiKeyName] = useState<string>("");
  const [apiKeyValue, setApiKeyValue] = useState<string>("");
  const [apiKeyIn, setApiKeyIn] = useState<"header" | "query">("header");

  const [response, setResponse] = useState<ApiResponseDTO | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<SavedApiRequestDTO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>("");
  const [saveDescription, setSaveDescription] = useState<string>("");

  const [bodyCopied, setBodyCopied] = useState<boolean>(false);
  const [fullCopied, setFullCopied] = useState<boolean>(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiRunnerService.getUserRequests("created");
      setHistory(res.data);
    } catch (err) {
      console.error("Error loading history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const buildRequest = (): ExecuteApiRequestDTO => {
    const activeHeaders: Record<string, string> = {};
    headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        activeHeaders[h.key] = h.value;
      });

    const activeParams: Record<string, string> = {};
    queryParams
      .filter((p) => p.enabled && p.key.trim())
      .forEach((p) => {
        activeParams[p.key] = p.value;
      });

    let authConfig: Record<string, string> = {};
    if (authType === "BEARER") {
      authConfig = { token: bearerToken };
    } else if (authType === "BASIC") {
      authConfig = { username: basicUsername, password: basicPassword };
    } else if (authType === "API_KEY") {
      authConfig = { key: apiKeyName, value: apiKeyValue, in: apiKeyIn };
    }

    let finalUrl = url;
    if (Object.keys(activeParams).length > 0) {
      try {
        const urlObj = new URL(url);
        Object.entries(activeParams).forEach(([k, v]) =>
          urlObj.searchParams.append(k, v),
        );
        finalUrl = urlObj.toString();
      } catch {}
    }

    return {
      method,
      url: finalUrl,
      headers: activeHeaders,
      queryParams: activeParams,
      authType,
      authConfig,
      requestBody:
        method !== "GET" && method !== "DELETE" ? requestBody : undefined,
      saveAfterExecution: false,
    };
  };

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
      await loadHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Execution error");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveRequest = async () => {
    if (!saveName.trim()) {
      alert("Please enter a request name");
      return;
    }

    const activeHeaders: Record<string, string> = {};
    headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        activeHeaders[h.key] = h.value;
      });

    const activeParams: Record<string, string> = {};
    queryParams
      .filter((p) => p.enabled && p.key.trim())
      .forEach((p) => {
        activeParams[p.key] = p.value;
      });

    let authConfig: Record<string, string> = {};
    if (authType === "BEARER") authConfig = { token: bearerToken };
    else if (authType === "BASIC")
      authConfig = { username: basicUsername, password: basicPassword };
    else if (authType === "API_KEY")
      authConfig = { key: apiKeyName, value: apiKeyValue, in: apiKeyIn };

    const savedRequest: SavedApiRequestDTO = {
      name: saveName,
      description: saveDescription,
      method,
      url,
      headers: activeHeaders,
      queryParams: activeParams,
      authType,
      authConfig,
      requestBody:
        method !== "GET" && method !== "DELETE" ? requestBody : undefined,
    };

    try {
      const res = await apiRunnerService.createRequest(savedRequest);
      setShowSaveModal(false);
      setSaveName("");
      setSaveDescription("");
      await loadHistory();
      setSelectedRequestId(res.data.id || null);
    } catch (err: any) {
      alert("Save error: " + (err.response?.data?.message || err.message));
    }
  };

  const loadRequestFromHistory = (req: SavedApiRequestDTO) => {
    setMethod(req.method);
    setUrl(req.url);
    setRequestBody(req.requestBody || "{}");
    setAuthType((req.authType as AuthType) || "NONE");

    const headerItems: KeyValuePair[] = Object.entries(req.headers || {}).map(
      ([k, v], i) => ({
        id: `h-${i}-${Date.now()}`,
        key: k,
        value: v,
        enabled: true,
      }),
    );
    if (!headerItems.some((h) => h.key.toLowerCase() === "content-type")) {
      headerItems.push({
        id: `ct-${Date.now()}`,
        key: "Content-Type",
        value: "application/json",
        enabled: true,
      });
    }
    setHeaders(headerItems);

    const paramItems: KeyValuePair[] = Object.entries(
      req.queryParams || {},
    ).map(([k, v], i) => ({
      id: `p-${i}-${Date.now()}`,
      key: k,
      value: v,
      enabled: true,
    }));
    setQueryParams(paramItems);

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

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Delete this request from history?")) return;
    try {
      await apiRunnerService.deleteRequest(requestId);
      await loadHistory();
      if (selectedRequestId === requestId) setSelectedRequestId(null);
    } catch (err: any) {
      alert("Delete error: " + (err.response?.data?.message || err.message));
    }
  };

  const addHeader = () =>
    setHeaders([
      ...headers,
      { id: `h-${Date.now()}`, key: "", value: "", enabled: true },
    ]);
  const updateHeader = (id: string, field: keyof KeyValuePair, value: any) => {
    setHeaders(
      headers.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
    );
  };
  const removeHeader = (id: string) =>
    setHeaders(headers.filter((h) => h.id !== id));

  const addQueryParam = () =>
    setQueryParams([
      ...queryParams,
      { id: `p-${Date.now()}`, key: "", value: "", enabled: true },
    ]);
  const updateQueryParam = (
    id: string,
    field: keyof KeyValuePair,
    value: any,
  ) => {
    setQueryParams(
      queryParams.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };
  const removeQueryParam = (id: string) =>
    setQueryParams(queryParams.filter((p) => p.id !== id));

  const copyResponseBody = () => {
    if (!response) return;
    let textToCopy: string;
    try {
      const parsed = JSON.parse(response.body);
      textToCopy = JSON.stringify(parsed, null, 2);
    } catch {
      textToCopy = response.body;
    }
    navigator.clipboard.writeText(textToCopy);
    setBodyCopied(true);
    setTimeout(() => setBodyCopied(false), 2000);
  };

  const copyFullResponse = () => {
    if (!response) return;
    const full = `Status: ${response.status} ${response.statusText}
Time: ${response.responseTimeMs} ms
Size: ${response.size}
Headers: ${JSON.stringify(response.headers, null, 2)}

Body:
${
  (() => {
    try {
      const parsed = JSON.parse(response.body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return response.body;
    }
  })()
}`;
    navigator.clipboard.writeText(full);
    setFullCopied(true);
    setTimeout(() => setFullCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex pt-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Main content */}
        <main className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen overflow-x-hidden">
          {/* HEADER */}
          <header className="px-4 md:px-8 pt-6 md:pt-8 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl md:text-4xl font-headline font-bold tracking-tight text-on-surface">
                  API Runner
                </h1>
              </div>
              <button
                onClick={() => setShowSaveModal(true)}
                className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-1"
                title="Save this request"
              >
                <FolderOpenIcon className="w-5 h-5" />
                <span className="text-xs font-medium">Save</span>
              </button>
            </div>
          </header>

          {/* Content area (flex row on large screens, column on mobile) */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Left panel: request + response */}
            <div className="flex-1 p-4 md:p-8 pt-0 overflow-y-auto space-y-8">
              {/* ⚠️ CORRECTION : wrapper avec flex-1 pour que l'input reprenne toute la largeur disponible */}
              <div className="bg-surface-container-lowest p-1 rounded-xl shadow-sm ring-1 ring-outline-variant/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
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
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://api.example.com/v1/endpoint"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => handleExecute()}
                  loading={isExecuting}
                  disabled={!url.trim()}
                  className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20 sm:w-auto w-full justify-center"
                  icon={
                    !isExecuting ? <BoltIcon className="w-4 h-4" /> : undefined
                  }
                >
                  {isExecuting ? "Sending..." : "Send"}
                </Button>
              </div>

              {/* Tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-outline-variant/10 gap-4 md:gap-8 overflow-x-auto">
                  {["params", "authorization", "headers", "body"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab
                          ? "border-primary text-primary"
                          : "border-transparent text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {activeTab === "params" && (
                  <KeyValueEditor
                    title="Query Parameters"
                    pairs={queryParams}
                    onAdd={addQueryParam}
                    onUpdate={updateQueryParam}
                    onRemove={removeQueryParam}
                  />
                )}

                {activeTab === "authorization" && (
                  <div className="bg-surface-container-lowest rounded-xl p-6 ring-1 ring-outline-variant/15 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Type
                      </label>
                      <select
                        value={authType}
                        onChange={(e) =>
                          setAuthType(e.target.value as AuthType)
                        }
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
                        <label className="block text-sm font-medium mb-1">
                          Token
                        </label>
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
                          <label className="block text-sm font-medium mb-1">
                            Username
                          </label>
                          <input
                            type="text"
                            value={basicUsername}
                            onChange={(e) => setBasicUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Password
                          </label>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Key
                            </label>
                            <input
                              type="text"
                              value={apiKeyName}
                              onChange={(e) => setApiKeyName(e.target.value)}
                              placeholder="X-API-Key"
                              className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Value
                            </label>
                            <input
                              type="text"
                              value={apiKeyValue}
                              onChange={(e) => setApiKeyValue(e.target.value)}
                              className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Add to
                          </label>
                          <select
                            value={apiKeyIn}
                            onChange={(e) =>
                              setApiKeyIn(e.target.value as "header" | "query")
                            }
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

                {activeTab === "headers" && (
                  <KeyValueEditor
                    title="Request Headers"
                    pairs={headers}
                    onAdd={addHeader}
                    onUpdate={updateHeader}
                    onRemove={removeHeader}
                  />
                )}

                {activeTab === "body" && (
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm ring-1 ring-outline-variant/15 overflow-hidden">
                    <div className="bg-surface-container-low px-4 py-2 flex justify-between items-center border-b border-outline-variant/10">
                      <span className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
                        {method === "GET" || method === "DELETE"
                          ? "Body (not applicable)"
                          : "Request Body"}
                      </span>
                      <select
                        value={contentType}
                        onChange={(e) => {
                          setContentType(e.target.value);
                          const existing = headers.find(
                            (h) => h.key.toLowerCase() === "content-type",
                          );
                          if (existing) {
                            updateHeader(existing.id, "value", e.target.value);
                          } else {
                            addHeader();
                            const newId =
                              headers.length > 0
                                ? headers[headers.length - 1].id
                                : "new";
                            setTimeout(
                              () => updateHeader(newId, "key", "Content-Type"),
                              0,
                            );
                            setTimeout(
                              () =>
                                updateHeader(newId, "value", e.target.value),
                              0,
                            );
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
                    <CodeEditor
                      value={requestBody}
                      onChange={setRequestBody}
                      disabled={method === "GET" || method === "DELETE"}
                      placeholder="{\n  'key': 'value'\n}"
                    />
                  </div>
                )}
              </div>

              {/* Response */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-on-surface-variant uppercase">
                    Response
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {response && (
                      <>
                        <button
                          onClick={copyResponseBody}
                          className="px-2 py-1 text-xs font-medium rounded-md border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low transition-colors flex items-center gap-1"
                        >
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          {bodyCopied ? "Copied!" : "Copy Body"}
                        </button>
                        <button
                          onClick={copyFullResponse}
                          className="px-2 py-1 text-xs font-medium rounded-md border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low transition-colors flex items-center gap-1"
                        >
                          <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                          {fullCopied ? "Copied!" : "Copy Full"}
                        </button>
                      </>
                    )}
                    {response && (
                      <>
                        <div className="h-4 w-px bg-outline-variant/30 mx-1" />
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            response.status >= 200 && response.status < 300
                              ? "bg-green-100 text-green-800"
                              : response.status >= 400
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              response.status >= 200 && response.status < 300
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          ></span>
                          {response.status} {response.statusText}
                        </div>
                        <div className="text-xs font-medium text-on-surface-variant">
                          Time:{" "}
                          <span className="text-on-surface font-bold">
                            {response.responseTimeMs}ms
                          </span>
                        </div>
                        <div className="text-xs font-medium text-on-surface-variant">
                          Size:{" "}
                          <span className="text-on-surface font-bold">
                            {response.size}
                          </span>
                        </div>
                      </>
                    )}
                    {error && (
                      <div className="text-red-500 text-sm flex items-center gap-1">
                        <XCircleIcon className="w-4 h-4" /> {error}
                      </div>
                    )}
                  </div>
                </div>
                {response ? (
                  <JsonViewer data={response.body} />
                ) : (
                  <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant text-sm ring-1 ring-outline-variant/15">
                    Click "Send" to execute the request
                  </div>
                )}
              </div>
            </div>

            {/* History sidebar – full width on mobile, fixed width on desktop */}
            <aside className="w-full lg:w-80 bg-surface-container-low border-t lg:border-l lg:border-t-0 border-outline-variant/10 p-4 md:p-6 flex flex-col gap-6 overflow-y-auto max-h-64 lg:max-h-none">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black tracking-widest uppercase text-on-surface">
                  Request History
                </h3>
                <button
                  onClick={loadHistory}
                  className="p-1 hover:bg-surface-container-high rounded"
                  title="Refresh"
                >
                  <ArrowPathIcon
                    className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="text-center py-8 text-on-surface-variant">
                    Loading...
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant text-sm">
                    No saved requests
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 bg-surface-container-lowest rounded-xl ring-1 ring-outline-variant/5 hover:ring-primary/20 transition-all cursor-pointer group ${
                        selectedRequestId === item.id
                          ? "ring-2 ring-primary"
                          : ""
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
                            title="Execute"
                          >
                            <PlayIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.id) handleDeleteRequest(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500"
                            title="Delete"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-mono truncate text-on-surface mb-2">
                        {item.url}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                        <ClockIcon className="w-3 h-3" />
                        {item.lastExecutedAt
                          ? new Date(item.lastExecutedAt).toLocaleString()
                          : "Never executed"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Mobile overlay for navigation sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Save Modal (inchangée) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Save Request</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Get user profile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description (optional)
                </label>
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
                Cancel
              </button>
              <button
                onClick={handleSaveRequest}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecuteRapideApiPage;