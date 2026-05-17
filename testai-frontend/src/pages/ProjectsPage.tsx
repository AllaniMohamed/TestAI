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
import { projectService, sharedAccessService } from "../services/api";
import type { Service } from "../types/types";

interface SharedProject {
  projectId: string;
  projectName: string;
  projectDescription: string;
  projectUrl: string;
  managerEmail: string;
  managerName?: string;
  accessLevel: "READ_ONLY" | "READ_WRITE";
  sharedAt: string;
}

interface ExtendedService extends Service {
  managerEmail?: string;
  managerName?: string;
  accessLevel?: "READ_ONLY" | "READ_WRITE";
  sharedAt?: string;
  isActive?: boolean; // ⭐ NOUVEAU
}

// ⭐ Composant modal pour la configuration Jenkins
const AutomationModal: React.FC<{
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ projectId, projectName, onClose, onSaved }) => {
  const [jenkinsUrl, setJenkinsUrl] = useState("http://localhost:9090/job/TestAI-Auto");
  const [schedule, setSchedule] = useState("H 2 * * *");
  const [threshold, setThreshold] = useState(70);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Appel à l'API pour sauvegarder la configuration
      await projectService.updateAutomationConfig(projectId, {
        enabled: true,
        jenkinsUrl,
        schedule,
        threshold,
      });
      onSaved();
    } catch (error) {
      alert("Error saving Jenkins configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">Configure Jenkins Automation</h2>
        <p className="text-sm text-slate-500 mb-4">Project: {projectName}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Jenkins job URL</label>
            <input
              type="text"
              value={jenkinsUrl}
              onChange={(e) => setJenkinsUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Schedule (cron)</label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Success threshold (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 70)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Enable automation"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectsPage: React.FC = () => {
  const [services, setServices] = useState<ExtendedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || "MANAGER");
        setUserId(user.id || "");
      } catch (e) {
        console.error("Erreur parsing user", e);
      }
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

      let mappedServices: ExtendedService[] = [];

      if (userRole === "MANAGER") {
        const response = await projectService.getAllProjects();
        let allProjects = response.data;
        if (!Array.isArray(allProjects)) {
          console.error("Données invalides depuis getAllProjects :", allProjects);
          allProjects = [];
          setError("Invalid data format. Contact the administrator.");
        }
        const userProjects = allProjects.filter((p) => p.userId === userId);
        mappedServices = userProjects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          url: p.projectUrl,
          status: "active",
          endpointsCount: 0,
          authType: p.authType || "",
          isActive: p.isActive ?? true, // ⭐ NOUVEAU
        }));
      } else if (userRole === "DEVELOPER") {
        const response = await sharedAccessService.getSharedProjects();
        let sharedProjects = response.data;
        if (!Array.isArray(sharedProjects)) {
          console.error("Données invalides depuis getSharedProjects :", sharedProjects);
          sharedProjects = [];
          setError("Invalid data format. Contact the administrator.");
        }
        mappedServices = sharedProjects.map((sp) => ({
          id: sp.projectId,
          name: sp.projectName,
          description: sp.projectDescription,
          url: sp.projectUrl,
          status: "active",
          endpointsCount: 0,
          authType: "",
          managerEmail: sp.managerEmail,
          managerName: sp.managerName,
          accessLevel: sp.accessLevel,
          sharedAt: sp.sharedAt,
          isActive: true, // ⭐ Déjà filtré côté backend
        }));
      }

      setServices(mappedServices);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError("Unable to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ⭐ Fonction pour toggle l'activation
  const handleToggleActivation = async (projectId: string) => {
    try {
      await projectService.toggleProjectActivation(projectId);
      // Recharger les données
      await fetchData();
    } catch (error) {
      console.error("Erreur lors du toggle:", error);
      alert("Unable to change project status");
    }
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // ⭐ Séparer projets actifs et désactivés (MANAGER uniquement)
  const activeProjects = filteredServices.filter((s) => s.isActive !== false);
  const inactiveProjects = filteredServices.filter((s) => s.isActive === false);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 lg:p-12 max-w-7xl mx-auto w-full">
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

          {/* Barre de recherche */}
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

          {/* Contenu */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-error-container/20 p-6 rounded-xl border border-error/10 text-center">
              <p className="text-error font-medium mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="bg-surface-container-low p-12 rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <ServerStackIcon className="w-8 h-8 text-outline" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No projects</h3>
              <p className="text-on-surface-variant max-w-sm">
                {userRole === "DEVELOPER"
                  ? "You have no shared projects yet."
                  : "Start by importing your first API."}
              </p>
              {userRole === "MANAGER" && (
                <Link to="/add-service" className="mt-6">
                  <Button>Create a project</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {/* ⭐ SECTION 1 : PROJETS ACTIFS */}
              {activeProjects.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Active projects
                    <Badge variant="success" className="ml-2">
                      {activeProjects.length}
                    </Badge>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeProjects.map((service) => (
                      <ProjectCard
                        key={service.id}
                        service={service}
                        userRole={userRole}
                        onToggleActivation={handleToggleActivation}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ⭐ SECTION 2 : PROJETS DÉSACTIVÉS (MANAGER uniquement) */}
              {userRole === "MANAGER" && inactiveProjects.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-on-surface-variant mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Disabled projects
                    <Badge variant="default" className="ml-2">
                      {inactiveProjects.length}
                    </Badge>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inactiveProjects.map((service) => (
                      <ProjectCard
                        key={service.id}
                        service={service}
                        userRole={userRole}
                        onToggleActivation={handleToggleActivation}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const ProjectCard: React.FC<{
  service: ExtendedService;
  userRole: string;
  onToggleActivation: (projectId: string) => void;
}> = ({ service, userRole, onToggleActivation }) => {
  const linkState = {
    managerEmail: service.managerEmail,
    managerName: service.managerName,
    accessLevel: service.accessLevel,
    sharedAt: service.sharedAt,
  };

  const isActive = service.isActive !== false;
  
  // ⭐ États pour automation Jenkins
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const fetchedRef = useRef(false); // ⭐ empêche les appels multiples

  // ⭐ Charger la config automation une seule fois
  useEffect(() => {
    if (!fetchedRef.current && userRole === "MANAGER") {
      fetchedRef.current = true;
      projectService.getAutomationConfig(service.id)
        .then(res => setAutomationEnabled(res.data?.enabled ?? false))
        .catch(() => setAutomationEnabled(false)); // ⭐ Pas de crash si 500
    }
  }, [service.id, userRole]);
  
  return (
    <>
      <div
        className={`group relative bg-surface-container-lowest p-1 rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5 ${
          !isActive ? "opacity-60" : ""
        }`}
      >
        <div className="bg-surface p-5 rounded-xl">
          <div className="flex justify-between items-start mb-6">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isActive ? "bg-primary/5" : "bg-slate-200"
              }`}
            >
              <ServerStackIcon
                className={`w-6 h-6 ${isActive ? "text-primary" : "text-slate-500"}`}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* ⭐ Bouton Automation Jenkins */}
              {userRole === "MANAGER" && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAutomationModal(true);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                    automationEnabled
                      ? "bg-orange-50 text-orange-600 border-orange-200"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-orange-50 hover:text-orange-500"
                  }`}
                  title="Configure Jenkins Automation"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                    <rect width="24" height="24" rx="4" fill={automationEnabled ? "#D33833" : "#94a3b8"}/>
                    <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="1.5" fill="white"/>
                  </svg>
                  {automationEnabled ? "Auto ON" : "Auto OFF"}
                </button>
              )}

              {/* ⭐ TOGGLE ACTIVATION (MANAGER uniquement) */}
              {userRole === "MANAGER" && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleActivation(service.id);
                  }}
                  className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{
                    backgroundColor: isActive ? "#10b981" : "#cbd5e1",
                  }}
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

          <h5 className="text-lg font-bold text-on-surface mb-1">{service.name}</h5>
          <p className="text-xs text-on-surface-variant mb-4 line-clamp-1">
            {service.description}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-on-surface-variant">Test coverage</span>
              <span className="font-bold text-primary">88%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full w-[88%] bg-primary rounded-full"></div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="flex gap-2">
              <Badge
                variant={service.authType === "BEARER" ? "warning" : "default"}
              >
                {service.authType === "BEARER"
                  ? "Bearer Auth"
                  : service.authType === "NONE"
                  ? "No Auth"
                  : "Auth"}
              </Badge>
              {!isActive && (
                <Badge variant="default" className="bg-slate-200 text-slate-700">
                  Disabled
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

      {/* ⭐ Modal Automation */}
      {showAutomationModal && (
        <AutomationModal
          projectId={service.id}
          projectName={service.name}
          onClose={() => setShowAutomationModal(false)}
          onSaved={() => {
            setShowAutomationModal(false);
            projectService.getAutomationConfig(service.id)
              .then(res => setAutomationEnabled(res.data.enabled))
              .catch(() => {});
          }}
        />
      )}
    </>
  );
};

export default ProjectsPage;