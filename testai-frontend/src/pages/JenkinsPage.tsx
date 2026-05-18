import React, { useState, useEffect, useRef } from "react";
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
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadData();
    }
  }, []);

  const loadData = async () => {
    const userStr = sessionStorage.getItem("user");
    const userId = userStr ? JSON.parse(userStr).id : null;
    try {
      const res = await projectService.getAllProjects();
      const userProjects = (res.data as any[]).filter(p => p.userId === userId);
      setProjects(userProjects);

      const configs: Record<string, any> = {};
      await Promise.all(
        userProjects.map(async (p) => {
          try {
            const cfg = await projectService.getAutomationConfig(p.id);
            configs[p.id] = cfg.data;
          } catch {
            configs[p.id] = { enabled: false, hour: 2, minute: 0, days: "DAILY" };
          }
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
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {/* Header – aligné avec le style Dashboard */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                <BoltIcon className="w-4 h-4" />
                <span>Jenkins Integration</span>
              </div>
              <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface">
                CI/CD Automation
              </h1>
              <p className="text-on-surface-variant max-w-xl font-medium">
                Manage the automatic execution of your projects.
              </p>
            </div>
            <a
              href="http://localhost:9090"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm"
            >
              <BoltIcon className="w-4 h-4" />
              Open Jenkins
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 text-center">
              <p className="text-3xl font-bold text-primary">{enabledProjects.length}</p>
              <p className="text-sm font-medium text-on-surface-variant mt-1">Automated Projects</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 text-center">
              <p className="text-3xl font-bold text-on-surface-variant">{disabledProjects.length}</p>
              <p className="text-sm font-medium text-on-surface-variant mt-1">Projects Without Automation</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-sm font-bold text-emerald-600">Scheduler active</p>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">Checks every minute</p>
            </div>
          </div>

          {/* Projets automatisés */}
          {enabledProjects.length > 0 && (
            <div className="mb-8">
              <h2 className="font-headline font-bold text-lg text-on-surface mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Automation active ({enabledProjects.length})
              </h2>
              <div className="space-y-3">
                {enabledProjects.map(p => {
                  const cfg = automations[p.id] || {};
                  return (
                    <div key={p.id} className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4 flex items-center justify-between hover:border-primary/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                            <rect width="24" height="24" rx="4" fill="#D33833"/>
                            <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="1.5" fill="white"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{p.name}</p>
                          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <CalendarIcon className="w-3 h-3" />
                            {cfg.days === "DAILY" ? "Every day" : cfg.days} at{" "}
                            {String(cfg.hour ?? 2).padStart(2, "0")}:{String(cfg.minute ?? 0).padStart(2, "0")}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedProject(p)}
                        className="px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        Edit
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
              <h2 className="font-headline font-bold text-lg text-on-surface-variant mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/30" />
                Without Automation ({disabledProjects.length})
              </h2>
              <div className="space-y-2">
                {disabledProjects.map(p => (
                  <div key={p.id} className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4 flex items-center justify-between opacity-70 hover:opacity-100 transition-opacity">
                    <p className="font-semibold text-on-surface text-sm">{p.name}</p>
                    <button
                      onClick={() => setSelectedProject(p)}
                      className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/30 rounded-lg hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors flex items-center gap-1"
                    >
                      <PlayIcon className="w-3 h-3" />
                      Activate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 text-on-surface-variant">Loading...</div>
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