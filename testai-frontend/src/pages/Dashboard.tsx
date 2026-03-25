import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import {
  PlusIcon,
  ServerStackIcon,
  CheckBadgeIcon,
  ClockIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ShareIcon,
  ShieldCheckIcon,
  CalendarIcon,
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
  accessLevel: 'READ_ONLY' | 'READ_WRITE';
  sharedAt: string;
}

interface ExtendedService extends Service {
  managerEmail?: string;
  managerName?: string;
  accessLevel?: 'READ_ONLY' | 'READ_WRITE';
  sharedAt?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ExtendedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
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
            setError("Format de données invalide. Contactez l'administrateur.");
          }
          const userProjects = allProjects.filter(p => p.userId === userId);
          mappedServices = userProjects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            url: p.projectUrl,
            status: "active",
            endpointsCount: 0,
            authType: p.authType || "",
          }));
        } else if (userRole === "DEVELOPER") {
          const response = await sharedAccessService.getSharedProjects();
          let sharedProjects = response.data;
          if (!Array.isArray(sharedProjects)) {
            console.error("Données invalides depuis getSharedProjects :", sharedProjects);
            sharedProjects = [];
            setError("Format de données invalide. Contactez l'administrateur.");
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
          }));
        }

        setServices(mappedServices);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setError("Impossible de charger les services. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole, userId]);

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar />
      <div className="flex pt-0">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                <SparklesIcon className="w-4 h-4" />
                <span>Espace de travail {userRole === "DEVELOPER" ? "Partagé" : "Personnel"}</span>
              </div>
              <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight">
                Precision Lab Dashboard
              </h1>
              <p className="text-on-surface-variant max-w-xl font-medium">
                Welcome back, {userRole === "MANAGER" ? "Manager" : "Developer"}. Your managed projects are operating with 98.4% uptime. API health looks optimal across all regions.
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {/* Search bar */}
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-outline group-focus-within:text-primary transition-colors" />
                </span>
                <input
                  type="text"
                  placeholder="Search projects or services..."
                  className="pl-12 pr-6 py-2.5 w-80 border border-outline-variant/30 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {userRole === "MANAGER" && (
                <Link to="/add-service">
                  <button className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
                    <PlusIcon className="w-5 h-5" />
                    <span>New Service</span>
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard
              title="APIs Connectées"
              value={services.length.toString()}
              icon={<ServerStackIcon className="w-6 h-6 text-primary" />}
              trend="+12%"
            />
            <StatCard
              title="Tests Générés"
              value="12,490"
              icon={<CheckBadgeIcon className="w-6 h-6 text-primary" />}
              trend="New"
            />
            <StatCard
              title="Score Moyen"
              value="94.2%"
              icon={<SparklesIcon className="w-6 h-6 text-primary" />}
              trend="Optimal"
            />
            {userRole === "DEVELOPER" ? (
              <div className="cursor-pointer" onClick={() => navigate("/shared-projects")}>
                <StatCard
                  title="Services Partagés"
                  value={services.length.toString()}
                  icon={<ShareIcon className="w-6 h-6 text-primary" />}
                  trend={`${services.length} Active`}
                />
              </div>
            ) : (
              <StatCard
                title="Exec. Aujourd'hui"
                value="24"
                icon={<ClockIcon className="w-6 h-6 text-primary" />}
                trend="Stable"
              />
            )}
          </div>

          {/* Main Content: Projects + Right Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
            {/* Projects Grid */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h4 className="font-headline text-xl font-bold">
                  {userRole === "DEVELOPER" ? "Shared Projects" : "Managed Projects"}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-on-surface-variant">Last synced: 2m ago</span>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-xl"></div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-error-container/20 p-6 rounded-xl border border-error/10 text-center">
                  <p className="text-error font-medium mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Réessayer
                  </Button>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="bg-surface-container-low p-12 rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                    <PlusIcon className="w-8 h-8 text-outline" />
                  </div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Aucun service</h3>
                  <p className="text-on-surface-variant max-w-sm">
                    {userRole === "DEVELOPER"
                      ? "Vous n'avez pas encore de services partagés avec vous."
                      : "Commencez par importer votre première API."}
                  </p>
                  {userRole === "MANAGER" && (
                    <Link to="/add-service" className="mt-6">
                      <Button>Commencer maintenant</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredServices.map((service) => (
                    <ProjectCard
                      key={service.id}
                      service={service}
                      userRole={userRole}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel Insights */}
            <div className="lg:col-span-4 space-y-6">
              {/* AI Pulse Check */}
              <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/10">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="mb-8">
                    <h4 className="font-headline text-xl font-bold mb-2">AI Pulse Check</h4>
                    <p className="text-slate-400 text-xs">Deep analysis of current API ecosystem.</p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">Latency Benchmark</p>
                        <p className="text-[10px] text-slate-400">Within acceptable range: 42ms avg.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 rounded-full bg-primary-fixed-dim"></div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">New Anomalies</p>
                        <p className="text-[10px] text-slate-400">0 detected in the last 24 hours.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 opacity-50">
                      <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">Model Retraining</p>
                        <p className="text-[10px] text-slate-400">Scheduled for Sunday, 02:00 UTC.</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-slate-300">SYSTEM STABILITY</span>
                      <span className="text-xs font-bold text-emerald-400">PREMIUM</span>
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-black">99.99</span>
                      <span className="text-xs text-slate-400 font-medium">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Audits */}
              <div className="bg-surface-container-highest/40 p-6 rounded-3xl border border-primary/5">
                <h4 className="font-bold text-on-surface text-sm mb-4">Upcoming Audits</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                        <ShieldCheckIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Security Pass</p>
                        <p className="text-[10px] text-on-surface-variant">In 2 days</p>
                      </div>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Compliance API</p>
                        <p className="text-[10px] text-on-surface-variant">In 5 days</p>
                      </div>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
}> = ({ title, value, icon, trend }) => (
  <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-transparent hover:border-primary/10 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-primary/5 text-primary rounded-lg">{icon}</div>
      {trend && (
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <p className="text-sm font-medium text-on-surface-variant mb-1">{title}</p>
    <h3 className="text-3xl font-bold text-on-surface tracking-tight">{value}</h3>
  </div>
);

const ProjectCard: React.FC<{ service: ExtendedService; userRole: string }> = ({
  service,
  userRole,
}) => {
  const linkState = {
    managerEmail: service.managerEmail,
    managerName: service.managerName,
    accessLevel: service.accessLevel,
    sharedAt: service.sharedAt,
  };

  // Placeholder team avatars
  const teamAvatars = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAaQDOtgoUE5oJjSaUranN-cWiFuD2-YSACNtadzRpyZFbkK7KeYSBRgacIBn5a2ysd8FQekXTi_lgVZkpuxKhB8zEVsmBL_XYHu0wEsojiafw9GSmHKycQ70P7CIwejp34IjdksYXUSmFc9CqERLG3FUoCQLHFxsFELfJ6hsgAjmnk8bux-qifv8l4GdkCDOz9REnEqlMZ_s8tXQKUDth77y4E5YM6Na9fH1_QHMQ9ouajVZqTCotD8yGFPRnteDQyChIAimY9L3c",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC5HWLweeYB434k8YLzlA7O-qtZY8ojeH56a6rUi_Pz7C6vbI7a_CbNncKqBpqmW0VkyZ6Nb63Y_jJH0smInG4p0S4zSmr-ndjA0CoKXy0E0PnQ1E1vaOjURhisZYgW34AX8918cB3HmmhfkSc5-5sPz_zPfhUcXq5I2rNb9SC6iM31t58hkHeO1-de4TsjzY8uy8iyIgdAPk9RBuApOPiCNQGWqiFG0R7XMwKGTib9DKhtNGzGtbRcl2R6jwkgMai_A-ue6rvlx_c",
  ];

  return (
    <div className="group relative bg-surface-container-lowest p-1 rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5 cursor-pointer">
      <div className="bg-surface p-5 rounded-xl">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center">
            <ServerStackIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex -space-x-2">
            {teamAvatars.map((src, idx) => (
              <img
                key={idx}
                className="w-8 h-8 rounded-full border-2 border-surface object-cover"
                src={src}
                alt="Team member"
              />
            ))}
            <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
              +4
            </div>
          </div>
        </div>
        <h5 className="text-lg font-bold text-on-surface mb-1">{service.name}</h5>
        <p className="text-xs text-on-surface-variant mb-4 line-clamp-1">{service.description}</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-on-surface-variant">Test Coverage</span>
            <span className="font-bold text-primary">88%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full w-[88%] bg-primary rounded-full"></div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
          <Badge variant={service.authType === "BEARER" ? "warning" : "default"}>
            {service.authType === "BEARER" ? "Bearer Auth" : service.authType === "NONE" ? "No Auth" : "Auth"}
          </Badge>
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

export default Dashboard;