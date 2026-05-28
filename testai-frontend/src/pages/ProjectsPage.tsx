// ProjectsPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import {
  PlusIcon,
  ServerStackIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { projectService, sharedAccessService, executionService } from "../services/api";
import type { Service } from "../types/types";

interface ExtendedService extends Service {
  managerEmail?: string;
  managerName?: string;
  accessLevel?: "READ_ONLY" | "READ_WRITE";
  sharedAt?: string;
  isActive?: boolean;
}

// ─── Jenkins automation badge (read-only indicator) ───────────────────────────

const JenkinsBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200 select-none">
    <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0" fill="none">
      <rect width="16" height="16" rx="3" fill="#D33833" />
      <circle cx="8" cy="8" r="3" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1" fill="white" />
    </svg>
    Automated
  </span>
);

// ─── ProjectsPage ─────────────────────────────────────────────────────────────

const ProjectsPage: React.FC = () => {
  const [services, setServices] = useState<ExtendedService[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId]     = useState<string>("");

  // ⭐ Gestion responsive de la sidebar mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserRole(u.role || "MANAGER");
        setUserId(u.id || "");
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!userRole || !userId) return;
    fetchData();
  }, [userRole, userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      let mapped: ExtendedService[] = [];

      if (userRole === "MANAGER") {
        const res = await projectService.getAllProjects();
        let all = res.data;
        if (!Array.isArray(all)) { all = []; setError("Invalid data format."); }
        mapped = all
          .filter((p) => p.userId === userId)
          .map((p) => ({
            id: p.id, name: p.name, description: p.description,
            url: p.projectUrl, status: "active", endpointsCount: 0,
            authType: p.authType || "", isActive: p.isActive ?? true,
          }));
      } else if (userRole === "DEVELOPER") {
        const res = await sharedAccessService.getSharedProjects();
        let shared = res.data;
        if (!Array.isArray(shared)) { shared = []; setError("Invalid data format."); }
        mapped = shared.map((sp) => ({
          id: sp.projectId, name: sp.projectName, description: sp.projectDescription,
          url: sp.projectUrl, status: "active", endpointsCount: 0, authType: "",
          managerEmail: sp.managerEmail, managerName: sp.managerName,
          accessLevel: sp.accessLevel as "READ_ONLY" | "READ_WRITE",
          sharedAt: sp.sharedAt, isActive: true,
        }));
      }

      setServices(mapped);
    } catch {
      setError("Unable to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivation = async (projectId: string) => {
    try {
      await projectService.toggleProjectActivation(projectId);
      await fetchData();
    } catch {
      alert("Unable to change project status");
    }
  };

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );
  const active   = filtered.filter((s) => s.isActive !== false);
  const inactive = filtered.filter((s) => s.isActive === false);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex pt-0">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 ml-0 md:ml-64 p-6 lg:p-12 max-w-7xl mx-auto w-full">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-headline font-bold tracking-tight">
                {userRole === "DEVELOPER" ? "Shared Projects" : "My Projects"}
              </h1>
              <p className="text-on-surface-variant mt-1">
                {userRole === "DEVELOPER"
                  ? "Access APIs shared with you"
                  : "Manage all your APIs and services"}
              </p>
            </div>
            {userRole === "MANAGER" && (
              <Link to="/add-service">
                <Button icon={<PlusIcon className="w-5 h-5" />}>New project</Button>
              </Link>
            )}
          </div>

          {/* Search */}
          <div className="relative group mb-8 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-outline group-focus-within:text-primary transition-colors" />
            </span>
            <input
              type="text"
              placeholder="Search a project..."
              className="pl-12 pr-6 py-2.5 w-full border border-outline-variant/30 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-error-container/20 p-6 rounded-xl border border-error/10 text-center">
              <p className="text-error font-medium mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-surface-container-low p-12 rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <ServerStackIcon className="w-8 h-8 text-outline" />
              </div>
              <h3 className="text-xl font-bold mb-2">No projects</h3>
              <p className="text-on-surface-variant max-w-sm">
                {userRole === "DEVELOPER" ? "No shared projects yet." : "Start by importing your first API."}
              </p>
              {userRole === "MANAGER" && (
                <Link to="/add-service" className="mt-6"><Button>Create a project</Button></Link>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {active.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active projects
                    <Badge variant="success" className="ml-2">{active.length}</Badge>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {active.map((s) => (
                      <ProjectCard key={s.id} service={s} userRole={userRole} onToggleActivation={handleToggleActivation} />
                    ))}
                  </div>
                </section>
              )}

              {userRole === "MANAGER" && inactive.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-on-surface-variant mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Disabled projects
                    <Badge variant="default" className="ml-2">{inactive.length}</Badge>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inactive.map((s) => (
                      <ProjectCard key={s.id} service={s} userRole={userRole} onToggleActivation={handleToggleActivation} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ⭐ Overlay mobile pour fermer la sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// ─── ProjectCard (modifiée) ──────────────────────────────────────────────────

const ProjectCard: React.FC<{
  service: ExtendedService;
  userRole: string;
  onToggleActivation: (id: string) => void;
}> = ({ service, userRole, onToggleActivation }) => {

  const isActive = service.isActive !== false;

  // Automation badge
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoRef.current || userRole !== "MANAGER") return;
    autoRef.current = true;
    projectService
      .getAutomationConfig(service.id)
      .then((r) => setAutomationEnabled(r.data?.enabled ?? false))
      .catch(() => setAutomationEnabled(false));
  }, [service.id, userRole]);

  // ── Success Rate: simple average ──
  const [successRate, setSuccessRate] = useState<number | null>(null);
  const rateRef = useRef(false);
  useEffect(() => {
    if (rateRef.current) return;
    rateRef.current = true;

    executionService
      .getProjectExecutions(service.id)
      .then((res) => {
        const executions = res.data;
        if (!Array.isArray(executions) || executions.length === 0) {
          setSuccessRate(null);
          return;
        }
        const completed = executions.filter(
          (e) => e.status === "COMPLETED" && typeof e.successRate === "number"
        );
        if (completed.length === 0) { setSuccessRate(null); return; }

        const avg =
          completed.reduce((sum, e) => sum + (e.successRate ?? 0), 0) /
          completed.length;

        setSuccessRate(Math.round(avg));
      })
      .catch(() => setSuccessRate(null));
  }, [service.id]);

  const hasRate  = successRate !== null;
  const rate     = successRate ?? 0;

  const linkState = {
    managerEmail: service.managerEmail,
    managerName:  service.managerName,
    accessLevel:  service.accessLevel,
    sharedAt:     service.sharedAt,
  };

  return (
    <div
      className={`group relative bg-surface-container-lowest p-1 rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5 ${
        !isActive ? "opacity-60" : ""
      }`}
    >
      <div className="bg-surface p-5 rounded-xl h-full flex flex-col">

        {/* Top row: icon + controls */}
        <div className="flex justify-between items-start mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-primary/5" : "bg-slate-200"}`}>
            <ServerStackIcon className={`w-6 h-6 ${isActive ? "text-primary" : "text-slate-500"}`} />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {userRole === "MANAGER" && automationEnabled && <JenkinsBadge />}

            {userRole === "MANAGER" && (
              <button
                onClick={(e) => { e.preventDefault(); onToggleActivation(service.id); }}
                aria-label={isActive ? "Deactivate project" : "Activate project"}
                className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ backgroundColor: isActive ? "#10b981" : "#cbd5e1" }}
              >
                <span
                  className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full shadow ${
                    isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Name + description */}
        <h5 className="text-lg font-bold text-on-surface mb-1 leading-tight">{service.name}</h5>
        <p className="text-xs text-on-surface-variant mb-4 line-clamp-1">{service.description}</p>

        {/* ── Success Rate progress bar (always blue) ── */}
        <div className="space-y-2 flex-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-on-surface-variant">Success Rate</span>
            {hasRate ? (
              <span className="font-bold text-primary text-xs">{rate}%</span>
            ) : (
              <span className="text-on-surface-variant/60 italic text-[10px]">No executions yet</span>
            )}
          </div>

          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            {hasRate ? (
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse rounded-full" />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-2 flex-wrap">
            <Badge variant={service.authType === "BEARER" ? "warning" : "default"}>
              {service.authType === "BEARER" ? "Bearer Auth" : service.authType === "NONE" ? "No Auth" : "Auth"}
            </Badge>
            {!isActive && <Badge variant="default" className="bg-slate-200 text-slate-700">Disabled</Badge>}
            {userRole === "DEVELOPER" && service.accessLevel && (
              <Badge variant={service.accessLevel === "READ_WRITE" ? "success" : "default"}>
                {service.accessLevel === "READ_WRITE" ? "Read & Write" : "Read Only"}
              </Badge>
            )}
          </div>
          <Link to={`/service/${service.id}`} state={linkState}>
            <button className="text-primary hover:text-primary-container transition-colors">
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ProjectsPage;