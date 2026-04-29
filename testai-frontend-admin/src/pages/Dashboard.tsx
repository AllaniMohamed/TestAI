// Dashboard.tsx
import React, { useState, useEffect } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import {
  SparklesIcon,
} from "@heroicons/react/24/outline";

const Dashboard: React.FC = () => {
  const [userRole, setUserRole] = useState<"ADMIN" | "">("");
  const [userName, setUserName] = useState<string>("");

  // Récupération de l'utilisateur depuis sessionStorage
  useEffect(() => {
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || "");
        setUserName(user.name);
      } catch (e) {
        console.error("Erreur parsing user", e);
      }
    }
  }, []);

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
                Bienvenue, {userName}. Vue d'ensemble des statistiques de votre plateforme.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;