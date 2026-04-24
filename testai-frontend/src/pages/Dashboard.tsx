// Dashboard.tsx
import React, { useState, useEffect } from "react";
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
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  CalendarIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<"MANAGER" | "DEVELOPER" | "ADMIN" | "">("");
  const [servicesCount, setServicesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || "MANAGER");
      } catch (e) {
        console.error("Erreur parsing user", e);
      }
    }
  }, []);

  // Simuler le comptage des projets (on pourrait appeler une API légère)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Tu peux remplacer par un vrai endpoint de comptage si besoin
        // Ici on simule un délai
        setServicesCount(12);
      } finally {
        setLoading(false);
      }
    };
    if (userRole) fetchCount();
  }, [userRole]);

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
                Bienvenue, {userRole === "MANAGER" ? "Manager" : ((userRole == "DEVELOPER") ? "Développeur" : "Administrateur")}.
                {userRole !== "ADMIN" ? " Vue d'ensemble de votre activité API." : " Vue d'ensemble de statistiques de votre plateforme."}
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
              value={loading ? "..." : servicesCount.toString()}
              icon={<ServerStackIcon className="w-6 h-6 text-primary" />}
              trend="+12%"
            />
            <StatCard
              title="Tests Générés"
              value="12 490"
              icon={<CheckBadgeIcon className="w-6 h-6 text-primary" />}
              trend="New"
            />
            <StatCard
              title="Score Moyen"
              value="94.2%"
              icon={<SparklesIcon className="w-6 h-6 text-primary" />}
              trend="Optimal"
            />
            <StatCard
              title="Exécutions aujourd'hui"
              value="24"
              icon={<ClockIcon className="w-6 h-6 text-primary" />}
              trend="Stable"
            />
          </div>

          {/* Right Panel Insights (seul, occupe toute la largeur) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            {/* AI Pulse Check */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/10">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="mb-8">
                  <h4 className="font-headline text-xl font-bold mb-2">AI Pulse Check</h4>
                  <p className="text-slate-400 text-xs">Analyse approfondie de l'écosystème API.</p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">Latence Benchmark</p>
                      <p className="text-[10px] text-slate-400">Moyenne : 42 ms</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 rounded-full bg-primary-fixed-dim"></div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">Anomalies</p>
                      <p className="text-[10px] text-slate-400">Aucune détectée ces dernières 24h.</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 opacity-50">
                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">Re‑entraînement modèle</p>
                      <p className="text-[10px] text-slate-400">Prévu dimanche à 02:00 UTC.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-10 p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-300">STABILITÉ SYSTÈME</span>
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
              <h4 className="font-bold text-on-surface text-sm mb-4">Audits à venir</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                      <ShieldCheckIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Security Pass</p>
                      <p className="text-[10px] text-on-surface-variant">Dans 2 jours</p>
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
                      <p className="text-xs font-bold">Conformité API</p>
                      <p className="text-[10px] text-on-surface-variant">Dans 5 jours</p>
                    </div>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-slate-300" />
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

export default Dashboard;