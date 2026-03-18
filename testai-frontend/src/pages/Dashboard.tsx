import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import {
  PlusIcon,
  ServerStackIcon,
  CheckBadgeIcon,
  ClockIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { projectService, sharedAccessService } from "../services/api";
import type { Service } from "../types/types";

// Interface pour les projets partagés (retournés par shared-with-me)
interface SharedProject {
  projectId: string;
  projectName: string;
  projectDescription: string;
  projectUrl: string;
  managerEmail: string;
  accessLevel: 'READ_ONLY' | 'READ_WRITE';
  sharedAt: string;
}

// Interface étendue pour inclure les champs de partage (optionnels)
interface ExtendedService extends Service {
  managerEmail?: string;
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

  // Récupérer les infos utilisateur depuis localStorage
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

  // Charger les données selon le rôle
  useEffect(() => {
    if (!userRole || !userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let mappedServices: ExtendedService[] = [];

        if (userRole === "MANAGER") {
          // Pour un MANAGER : récupérer tous les projets puis filtrer par userId
          const response = await projectService.getAllProjects();
          const allProjects = response.data;
          const userProjects = allProjects.filter(p => p.userId === userId);
          mappedServices = userProjects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            url: p.projectUrl,
            status: "active",
            endpointsCount: 0,
            // On ajoute authType requis par Service (optionnel dans le type)
            authType: p.authType || "",
          }));
        } else if (userRole === "DEVELOPER") {
          // Pour un DEVELOPEUR : charger les projets partagés
          const response = await sharedAccessService.getSharedProjects();
          const sharedProjects: SharedProject[] = response.data;
          mappedServices = sharedProjects.map((sp) => ({
            id: sp.projectId,
            name: sp.projectName,
            description: sp.projectDescription,
            url: sp.projectUrl,
            status: "active",
            endpointsCount: 0,
            authType: "", // non applicable
            managerEmail: sp.managerEmail,
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
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-2">
                <SparklesIcon className="w-4 h-4" />
                <span>
                  Espace de travail {userRole === "DEVELOPER" ? "Partagé" : "Personnel"}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Vue d'ensemble
              </h1>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Filtrer vos APIs..."
                  className="pl-12 pr-6 py-3 w-64 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {userRole === "MANAGER" && (
                <Link to="/add-service">
                  <Button icon={<PlusIcon className="w-5 h-5" />}>
                    Nouveau Service
                  </Button>
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
              trend="+1"
            />
            <StatCard
              title="Tests Générés"
              value="1,248"
              icon={<CheckBadgeIcon className="w-6 h-6 text-success" />}
              trend="+124"
            />
            <StatCard
              title="Score Moyen"
              value="98%"
              icon={<SparklesIcon className="w-6 h-6 text-warning" />}
            />
            {userRole === "DEVELOPER" ? (
              // Carte spéciale pour les développeurs : affiche le nombre de services partagés
              <div
                className="cursor-pointer"
                onClick={() => navigate("/shared-projects")}
              >
                <StatCard
                  title="Services Partagés"
                  value={services.length.toString()}
                  icon={<ShareIcon className="w-6 h-6 text-primary" />}
                />
              </div>
            ) : (
              <StatCard
                title="Exec. Aujourd'hui"
                value="24"
                icon={<ClockIcon className="w-6 h-6 text-info" />}
              />
            )}
          </div>

          {/* Services Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 bg-slate-100 animate-pulse rounded-3xl"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <p className="text-slate-500 mb-4">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                Réessayer
              </Button>
            </div>
          ) : filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  userRole={userRole}
                />
              ))}
            </div>
          ) : (
            <EmptyState userRole={userRole} />
          )}
        </main>
      </div>
    </div>
  );
};

// StatCard (inchangée, mais on retire trend inutile pour la carte spéciale)
const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
}> = ({ title, value, icon, trend }) => (
  <Card className="flex flex-col gap-4 p-8 border border-slate-100 hover:shadow-xl transition-all duration-500">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
      {trend && (
        <span className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-lg">
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-3xl font-black text-slate-900 mb-1">{value}</p>
      <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">
        {title}
      </p>
    </div>
  </Card>
);

// ServiceCard avec affichage des infos de partage pour les développeurs
const ServiceCard: React.FC<{ service: ExtendedService; userRole: string }> = ({
  service,
  userRole,
}) => {
  // Préparer les infos à passer à la page de détail
  const linkState = {
    managerEmail: service.managerEmail,
    accessLevel: service.accessLevel,
    sharedAt: service.sharedAt,
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-2xl transition-all duration-500 group border border-slate-100 p-8 rounded-3xl">
      <div className="flex justify-between items-start mb-8">
        <div className="p-4 bg-primary/10 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          <ServerStackIcon className="w-8 h-8" />
        </div>
        <Badge variant={service.status === "active" ? "success" : "gray"}>
          {service.status === "active" ? "Opérationnel" : "En pause"}
        </Badge>
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-primary transition-colors">
          {service.name}
        </h3>
        <p className="text-sm text-slate-400 font-mono truncate bg-slate-50 p-2 rounded-lg">
          {service.url}
        </p>

        {/* Informations supplémentaires pour les développeurs */}
        {userRole === "DEVELOPER" && service.managerEmail && (
          <div className="mt-4 space-y-2 text-sm border-t pt-4 border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Partagé par :</span>
              <span className="font-medium text-slate-700">{service.managerEmail}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Niveau d'accès :</span>
              <Badge
                variant={service.accessLevel === "READ_WRITE" ? "success" : "gray"}
              >
                {service.accessLevel === "READ_WRITE" ? "Lecture/Écriture" : "Lecture seule"}
              </Badge>
            </div>
            {service.sharedAt && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Partagé le :</span>
                <span className="text-slate-700">
                  {new Date(service.sharedAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Endpoints</p>
          <p className="text-lg font-bold text-slate-900">{service.endpointsCount}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tests IA</p>
          <p className="text-lg font-bold text-slate-900">
            {service.endpointsCount * 12}
          </p>
        </div>
      </div>

      <Link
        to={`/service/${service.id}`}
        state={linkState}
        className="mt-8 block"
      >
        <Button
          variant="ghost"
          className="w-full justify-between px-4 group/btn"
          icon={
            <ArrowRightIcon className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          }
        >
          Gérer l'API
        </Button>
      </Link>
    </Card>
  );
};

// EmptyState adapté au rôle
const EmptyState: React.FC<{ userRole: string }> = ({ userRole }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 px-12">
    <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8">
      <PlusIcon className="w-12 h-12 text-slate-300" />
    </div>
    <h3 className="text-3xl font-black text-slate-900 mb-4">
      {userRole === "DEVELOPER"
        ? "Aucun service partagé"
        : "Prêt à tester ?"}
    </h3>
    <p className="text-slate-500 max-w-sm mb-10 leading-relaxed">
      {userRole === "DEVELOPER"
        ? "Vous n'avez pas encore de services partagés avec vous."
        : "Importez votre documentation d'API et laissez l'intelligence artificielle faire le travail complexe pour vous."}
    </p>
    {userRole === "MANAGER" && (
      <Link to="/add-service">
        <Button size="lg" icon={<PlusIcon className="w-6 h-6" />}>
          Commencer maintenant
        </Button>
      </Link>
    )}
  </div>
);

export default Dashboard;