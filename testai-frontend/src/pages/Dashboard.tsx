// Dashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Button from "../components/common/Button";
import {
  PlusIcon,
  ServerStackIcon,
  CheckBadgeIcon,
  SparklesIcon,
  ClockIcon,
  ArrowRightIcon,
  FolderIcon,
  BoltIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  projectService,
  sharedAccessService,
  testService,
  executionService,
  type Project,
} from "../services/api";

// Types pour les statistiques
interface DashboardStats {
  servicesCount: number;
  totalTests: number;
  averageSuccessRate: number;
  todayExecutions: number;
  loading: boolean;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<"MANAGER" | "DEVELOPER" | "ADMIN" | "">("");
  const [userId, setUserId] = useState<string>(""); // ✅ Ajout manquant
  const [stats, setStats] = useState<DashboardStats>({  // ✅ Ajout manquant
    servicesCount: 0,
    totalTests: 0,
    averageSuccessRate: 0,
    todayExecutions: 0,
    loading: true,
  });

  // Récupération de l'utilisateur depuis sessionStorage
  useEffect(() => {
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || "MANAGER");
        setUserId(user.id);
      } catch (e) {
        console.error("Erreur parsing user", e);
      }
    }
  }, []);

  // Chargement des données dynamiques
  const loadDashboardData = useCallback(async () => {
    if (!userId || !userRole) return;

    setStats(prev => ({ ...prev, loading: true }));

    try {
      // 1. Nombre de services (projets accessibles)
      let servicesCount = 0;
      if (userRole === "MANAGER") {
        const res = await projectService.getAllProjects();
        const allProjects = res.data as Project[];
        servicesCount = allProjects.filter(p => p.userId === userId).length;
      } else if (userRole === "DEVELOPER") {
        const res = await sharedAccessService.getSharedProjects();
        servicesCount = (res.data as any[]).length;
      }

      // 2. Nombre total de tests générés (par projet)
      let totalTests = 0;
      if (userRole === "MANAGER") {
        const res = await projectService.getAllProjects();
        const userProjects = (res.data as Project[]).filter(p => p.userId === userId);
        const testPromises = userProjects.map(p => testService.getTestsByProjectId(p.id));
        const testResults = await Promise.all(testPromises);
        totalTests = testResults.reduce((sum, r) => sum + (r.data as any[]).length, 0);
      } else if (userRole === "DEVELOPER") {
        const res = await sharedAccessService.getSharedProjects();
        const shared = res.data as any[];
        const testPromises = shared.map((sp: any) => testService.getTestsByProjectId(sp.projectId));
        const testResults = await Promise.all(testPromises);
        totalTests = testResults.reduce((sum, r) => sum + (r.data as any[]).length, 0);
      }

      // 3. Score moyen (taux de succès global)
      let averageSuccessRate = 0;
      try {
        const rateRes = await executionService.getUserProjectsGlobalTestsRate(userId);
        const rates = rateRes.data as Record<string, number>;
        const projectCount = Object.keys(rates).length;
        if (projectCount > 0) {
          const sum = Object.values(rates).reduce((a, b) => a + b, 0);
          averageSuccessRate = Math.round((sum / projectCount) * 10) / 10;
        }
      } catch { /* laisser à 0 */ }

      // 4. Exécutions d'aujourd'hui
      let todayExecutions = 0;
      try {
        const execsRes = await executionService.getProjectExecutionStats(userId);
        const execs = execsRes.data as any[];
        const todayStr = new Date().toISOString().substring(0, 10);
        todayExecutions = execs.filter((e: any) =>
          e.date?.substring(0, 10) === todayStr
        ).length;
      } catch { /* laisser à 0 */ }

      setStats({
        servicesCount,
        totalTests,
        averageSuccessRate,
        todayExecutions,
        loading: false,
      });
    } catch (error) {
      console.error("Erreur chargement dashboard", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [userId, userRole]);

  useEffect(() => {
    if (userId && userRole) {
      loadDashboardData();
    }
  }, [userId, userRole, loadDashboardData]);

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
                <span>Espace de travail</span>
              </div>
              <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight">
                Tableau de bord
              </h1>
              <p className={`text-on-surface-variant ${userRole !== "ADMIN" ? "max-w-xl" : ""} font-medium`}>
                Bienvenue, {userRole === "MANAGER" ? "Manager" : (userRole === "DEVELOPER" ? "Développeur" : "Administrateur")}.
                {userRole !== "ADMIN" ? " Vue d'ensemble de votre activité API." : " Vue d'ensemble des statistiques de votre plateforme."}
              </p>
            </div>
            {userRole !== "ADMIN" && (
              <div className="flex gap-3 items-center">
                <Link to="/projects">
                  <Button variant="outline" icon={<FolderIcon className="w-5 h-5" />}>
                    Voir tous les projets
                  </Button>
                </Link>
                {userRole === "MANAGER" && (
                  <Link to="/add-service">
                    <Button icon={<PlusIcon className="w-5 h-5" />}>
                      Nouveau service
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard
              title="APIs Connectées"
              value={stats.loading ? "..." : stats.servicesCount.toString()}
              icon={<ServerStackIcon className="w-6 h-6 text-primary" />}
              trend={userRole === "DEVELOPER" ? "Partagées" : undefined}
            />
            <StatCard
              title="Tests Générés"
              value={stats.loading ? "..." : stats.totalTests.toLocaleString()}
              icon={<CheckBadgeIcon className="w-6 h-6 text-primary" />}
            />
            <StatCard
              title="Score Moyen"
              value={stats.loading ? "..." : `${stats.averageSuccessRate}%`}
              icon={<SparklesIcon className="w-6 h-6 text-primary" />}
              trend={stats.averageSuccessRate >= 80 ? "Optimal" : stats.averageSuccessRate > 0 ? "Correct" : undefined}
            />
            <StatCard
              title="Exécutions aujourd'hui"
              value={stats.loading ? "..." : stats.todayExecutions.toString()}
              icon={<ClockIcon className="w-6 h-6 text-primary" />}
            />
          </div>

          {/* Panneaux dynamiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            {/* Santé globale */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/10">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="mb-8">
                  <h4 className="font-headline text-xl font-bold mb-2">Santé de vos APIs</h4>
                  <p className="text-slate-400 text-xs">Indicateurs issus de vos dernières exécutions.</p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">Projets suivis</p>
                      <p className="text-[10px] text-slate-400">{stats.servicesCount} service{stats.servicesCount > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 rounded-full bg-primary-fixed-dim"></div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">Taux de succès</p>
                      <p className="text-[10px] text-slate-400">{stats.averageSuccessRate}% en moyenne</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 opacity-50">
                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">Tests disponibles</p>
                      <p className="text-[10px] text-slate-400">{stats.totalTests} au total</p>
                    </div>
                  </div>
                </div>
                <div className="mt-10 p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-300">SCORE GLOBAL</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {stats.averageSuccessRate >= 80 ? "EXCELLENT" : "EN PROGRÈS"}
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black">{stats.averageSuccessRate}</span>
                    <span className="text-xs text-slate-400 font-medium">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dernières exécutions */}
            <div className="bg-surface-container-highest/40 p-6 rounded-3xl border border-primary/5">
              <h4 className="font-bold text-on-surface text-sm mb-4">Dernières exécutions</h4>
              <RecentExecutionsList userId={userId} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Sous-composants
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

const RecentExecutionsList: React.FC<{ userId: string }> = ({ userId }) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    executionService.getProjectExecutionStats(userId)
      .then(res => setExecutions(res.data as any[]))
      .catch(() => setExecutions([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="text-center text-on-surface-variant py-4">Chargement...</div>;
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-8 text-on-surface-variant">
        <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aucune exécution récente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {executions.slice(0, 5).map((exec: any) => (
        <div key={exec.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BoltIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">{exec.projectName}</p>
              <p className="text-[10px] text-on-surface-variant">
                {new Date(exec.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold">{exec.passedTests} / {exec.totalTests} <span className="text-on-surface-variant">passés</span></p>
            <p className="text-[10px] text-on-surface-variant">{exec.duration}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;