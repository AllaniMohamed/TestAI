import React, { useState, useEffect } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { projectService } from "../services/api";
import AutomationModal from "../components/modals/AutomationModal";
import { BoltIcon, CalendarIcon, PlayIcon } from "@heroicons/react/24/outline";

const JenkinsPage: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [automations, setAutomations] = useState<Record<string, any>>({});
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const userStr = sessionStorage.getItem("user");
    const userId = userStr ? JSON.parse(userStr).id : null;
    try {
      const res = await projectService.getAllProjects();
      const userProjects = (res.data as any[]).filter(p => p.userId === userId);
      setProjects(userProjects);
      
      // Charger la config automation pour chaque projet
      const configs: Record<string, any> = {};
      await Promise.all(
        userProjects.map(async (p) => {
          try {
            const cfg = await projectService.getAutomationConfig(p.id);
            configs[p.id] = cfg.data;
          } catch { configs[p.id] = { enabled: false }; }
        })
      );
      setAutomations(configs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const enabledProjects  = projects.filter(p => automations[p.id]?.enabled);
  const disabledProjects = projects.filter(p => !automations[p.id]?.enabled);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Jenkins CI/CD</h1>
              <p className="text-slate-500 mt-1">Gérez l'exécution automatique de vos projets</p>
            </div>
            <a
              href="http://localhost:9090"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              <BoltIcon className="w-4 h-4" />
              Ouvrir Jenkins
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-slate-200 text-center">
              <p className="text-3xl font-bold text-orange-500">{enabledProjects.length}</p>
              <p className="text-sm text-slate-500 mt-1">Projets automatisés</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 text-center">
              <p className="text-3xl font-bold text-slate-400">{disabledProjects.length}</p>
              <p className="text-sm text-slate-500 mt-1">Sans automation</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-sm font-bold text-green-600">Scheduler actif</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">Vérifie chaque minute</p>
            </div>
          </div>

          {/* Projets automatisés */}
          {enabledProjects.length > 0 && (
            <div className="mb-8">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Automation active ({enabledProjects.length})
              </h2>
              <div className="space-y-3">
                {enabledProjects.map(p => {
                  const cfg = automations[p.id] || {};
                  return (
                    <div key={p.id} className="bg-white border border-orange-100 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                            <rect width="24" height="24" rx="4" fill="#D33833"/>
                            <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="1.5" fill="white"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <CalendarIcon className="w-3 h-3" />
                            {cfg.days === "DAILY" ? "Tous les jours" : cfg.days} à{" "}
                            {String(cfg.hour ?? 2).padStart(2, "0")}:{String(cfg.minute ?? 0).padStart(2, "0")}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedProject(p)}
                        className="px-3 py-1.5 text-xs font-bold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        Modifier
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Projets sans automation */}
          {disabledProjects.length > 0 && (
            <div>
              <h2 className="font-bold text-slate-500 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                Sans automation ({disabledProjects.length})
              </h2>
              <div className="space-y-2">
                {disabledProjects.map(p => (
                  <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between opacity-70 hover:opacity-100 transition-opacity">
                    <p className="font-semibold text-slate-700 text-sm">{p.name}</p>
                    <button
                      onClick={() => setSelectedProject(p)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors flex items-center gap-1"
                    >
                      <PlayIcon className="w-3 h-3" />
                      Activer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedProject && (
        <AutomationModal
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => setSelectedProject(null)}
          onSaved={() => { setSelectedProject(null); loadData(); }}
        />
      )}
    </div>
  );
};

export default JenkinsPage;