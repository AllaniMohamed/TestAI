// ProjectsPage.tsx
import React, { useState, useEffect } from "react";
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
  accessLevel: 'READ_ONLY' | 'READ_WRITE';
  sharedAt: string;
}

interface ExtendedService extends Service {
  managerEmail?: string;
  managerName?: string;
  accessLevel?: 'READ_ONLY' | 'READ_WRITE';
  sharedAt?: string;
}

const ProjectsPage: React.FC = () => {
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
        setError("Impossible de charger les projets. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole, userId]);

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Avatars factices pour le design (à adapter)
  const teamAvatars = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAaQDOtgoUE5oJjSaUranN-cWiFuD2-YSACNtadzRpyZFbkK7KeYSBRgacIBn5a2ysd8FQekXTi_lgVZkpuxKhB8zEVsmBL_XYHu0wEsojiafw9GSmHKycQ70P7CIwejp34IjdksYXUSmFc9CqERLG3FUoCQLHFxsFELfJ6hsgAjmnk8bux-qifv8l4GdkCDOz9REnEqlMZ_s8tXQKUDth77y4E5YM6Na9fH1_QHMQ9ouajVZqTCotD8yGFPRnteDQyChIAimY9L3c",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC5HWLweeYB434k8YLzlA7O-qtZY8ojeH56a6rUi_Pz7C6vbI7a_CbNncKqBpqmW0VkyZ6Nb63Y_jJH0smInG4p0S4zSmr-ndjA0CoKXy0E0PnQ1E1vaOjURhisZYgW34AX8918cB3HmmhfkSc5-5sPz_zPfhUcXq5I2rNb9SC6iM31t58hkHeO1-de4TsjzY8uy8iyIgdAPk9RBuApOPiCNQGWqiFG0R7XMwKGTib9DKhtNGzGtbRcl2R6jwkgMai_A-ue6rvlx_c",
  ];

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
                {userRole === "DEVELOPER" ? "Projets partagés" : "Mes projets"}
              </h1>
              <p className="text-on-surface-variant mt-1">
                {userRole === "DEVELOPER"
                  ? "Accédez aux API qui vous ont été partagées"
                  : "Gérez l'ensemble de vos API et services"}
              </p>
            </div>
            {userRole === "MANAGER" && (
              <Link to="/add-service">
                <Button icon={<PlusIcon className="w-5 h-5" />}>
                  Nouveau projet
                </Button>
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
              placeholder="Rechercher un projet..."
              className="pl-12 pr-6 py-2.5 w-full border border-outline-variant/30 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grille des projets */}
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
                Réessayer
              </Button>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="bg-surface-container-low p-12 rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <ServerStackIcon className="w-8 h-8 text-outline" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Aucun projet</h3>
              <p className="text-on-surface-variant max-w-sm">
                {userRole === "DEVELOPER"
                  ? "Vous n'avez pas encore de projets partagés avec vous."
                  : "Commencez par importer votre première API."}
              </p>
              {userRole === "MANAGER" && (
                <Link to="/add-service" className="mt-6">
                  <Button>Créer un projet</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <ProjectCard
                  key={service.id}
                  service={service}
                  userRole={userRole}
                  teamAvatars={teamAvatars}
                />
              ))}
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
  teamAvatars: string[];
}> = ({ service, userRole, teamAvatars }) => {
  const linkState = {
    managerEmail: service.managerEmail,
    managerName: service.managerName,
    accessLevel: service.accessLevel,
    sharedAt: service.sharedAt,
  };

  return (
    <div className="group relative bg-surface-container-lowest p-1 rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5">
      <div className="bg-surface p-5 rounded-xl">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center">
            <ServerStackIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex -space-x-2">
            {teamAvatars.slice(0, 3).map((src, idx) => (
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
            <span className="font-medium text-on-surface-variant">Couverture des tests</span>
            <span className="font-bold text-primary">88%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full w-[88%] bg-primary rounded-full"></div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
          <Badge variant={service.authType === "BEARER" ? "warning" : "default"}>
            {service.authType === "BEARER"
              ? "Bearer Auth"
              : service.authType === "NONE"
              ? "No Auth"
              : "Auth"}
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

export default ProjectsPage;