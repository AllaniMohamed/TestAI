// ExecuteRapideApiPage.tsx
import React, { useState } from "react";
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
} from "@heroicons/react/24/outline";

const ExecuteRapideApiPage: React.FC = () => {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.testai.lab/v1/projects/quantum-core/deploy");
  const [requestBody, setRequestBody] = useState(`{
  "project_id": "quantum-core-882",
  "environment": "production",
  "options": {
    "bypass_cache": true,
    "verbose_logging": false
  }
}`);
  const [response, setResponse] = useState({
    status: 200,
    statusText: "OK",
    time: 142,
    size: "1.2KB",
    body: `{
  "status": "success",
  "deployment_id": "dep_9921_xα",
  "timestamp": "2023-11-24T14:22:01Z",
  "nodes_activated": [
    "us-east-1a",
    "us-west-2c",
    "eu-central-1"
  ],
  "metadata": {
    "api_version": "2.4.0",
    "request_cost": 0.0004
  }
}`,
  });

  const [activeTab, setActiveTab] = useState("body");

  // Liste statique d'historique
  const history = [
    { method: "POST", url: "/v1/projects/quantum-core/deploy", timeAgo: "2 mins ago", status: 200, duration: 142 },
    { method: "GET", url: "/v1/health/check", timeAgo: "15 mins ago", status: 200, duration: 45 },
    { method: "POST", url: "/v1/auth/login", timeAgo: "1 hour ago", status: 401, duration: 12 },
    { method: "PUT", url: "/v1/user/profile/update", timeAgo: "2 hours ago", status: 200, duration: 312 },
  ];

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 flex flex-col min-h-screen">
          {/* Top bar interne (titre + version + icônes) */}
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
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">
                <BellIcon className="w-5 h-5" />
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">
                <CogIcon className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Contenu principal (2 colonnes : éditeur + historique) */}
          <div className="flex flex-1 overflow-hidden">
            {/* Colonne de gauche : Requête et réponse */}
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
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
                <Button
                  className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
                  icon={<BoltIcon className="w-4 h-4" />}
                >
                  Send
                </Button>
              </div>

              {/* Onglets de configuration */}
              <div className="space-y-4">
                <div className="flex border-b border-outline-variant/10 gap-8">
                  {["params", "authorization", "headers", "body", "settings"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === tab
                          ? "border-primary text-primary"
                          : "border-transparent text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {tab === "body" && activeTab === "body" && (
                        <span className="ml-2 w-1.5 h-1.5 bg-primary rounded-full inline-block align-middle"></span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Éditeur JSON (Body) */}
                {activeTab === "body" && (
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm ring-1 ring-outline-variant/15 overflow-hidden">
                    <div className="bg-surface-container-low px-4 py-2 flex justify-between items-center border-b border-outline-variant/10">
                      <span className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
                        JSON Request Payload
                      </span>
                      <div className="flex gap-4">
                        <span className="text-[10px] font-medium text-primary cursor-pointer">Pretty</span>
                        <span className="text-[10px] font-medium text-on-surface-variant/50 cursor-pointer">Raw</span>
                        <span className="text-[10px] font-medium text-on-surface-variant/50 cursor-pointer">Preview</span>
                      </div>
                    </div>
                    <div className="p-6 font-mono text-sm leading-relaxed min-h-[240px] bg-[#0d1117] text-gray-300">
                      <div className="flex gap-4">
                        <div className="text-on-surface-variant/40 text-right select-none w-6">
                          {requestBody.split("\n").map((_, i) => (
                            <div key={i}>{i + 1}</div>
                          ))}
                        </div>
                        <pre className="whitespace-pre-wrap break-words">{requestBody}</pre>
                      </div>
                    </div>
                  </div>
                )}
                {/* Pour les autres onglets (statiques) */}
                {activeTab !== "body" && (
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm ring-1 ring-outline-variant/15 p-8 text-center text-on-surface-variant">
                    Configuration de {activeTab} (à implémenter)
                  </div>
                )}
              </div>

              {/* Section Réponse */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-sm font-bold tracking-tight text-on-surface-variant uppercase">
                    Response
                  </h3>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {response.status} {response.statusText}
                    </div>
                    <div className="text-xs font-medium text-on-surface-variant">
                      Time: <span className="text-on-surface font-bold">{response.time}ms</span>
                    </div>
                    <div className="text-xs font-medium text-on-surface-variant">
                      Size: <span className="text-on-surface font-bold">{response.size}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-surface-container-lowest rounded-xl shadow-sm ring-1 ring-outline-variant/15 overflow-hidden">
                  <div className="p-6 font-mono text-sm leading-relaxed bg-[#f8f9ff] text-on-surface border-l-4 border-emerald-500">
                    <pre className="whitespace-pre-wrap break-words">{response.body}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne de droite : Historique */}
            <aside className="w-80 bg-surface-container-low border-l border-outline-variant/10 p-6 flex flex-col gap-6 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black tracking-widest uppercase text-on-surface">
                  Request History
                </h3>
                <TrashIcon className="w-4 h-4 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
              </div>
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-container-lowest rounded-xl ring-1 ring-outline-variant/5 hover:ring-primary/20 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between mb-2">
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
                      <span className="text-[10px] text-on-surface-variant">{item.timeAgo}</span>
                    </div>
                    <p className="text-xs font-mono truncate text-on-surface mb-2">{item.url}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold ${
                          item.status === 200 ? "text-emerald-600" : "text-error"
                        }`}
                      >
                        {item.status} {item.status === 200 ? "OK" : "Auth"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/50">•</span>
                      <span className="text-[10px] text-on-surface-variant">{item.duration}ms</span>
                    </div>
                  </div>
                ))}
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
    </div>
  );
};

export default ExecuteRapideApiPage;