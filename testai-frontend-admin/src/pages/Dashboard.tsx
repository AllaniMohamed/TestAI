// Dashboard.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import {
  SparklesIcon,
  ChevronDoubleRightIcon,
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
                <span>Workspace</span>
              </div>
              <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight">
                Dashboard
              </h1>
              <p className={`text-on-surface-variant ${userRole !== "ADMIN" ? "max-w-xl" : ""} font-medium`}>
                Welcome, {userName}. Overview of your platform's statistics.
              </p>
            </div>
          </div>
          <div className="space-y-4"> {/* Hoverable Lines Container */}
            {/* Line 1: Users */}
            <Link
              to="/users"
              className="block bg-surface-variant rounded-lg p-6 shadow-sm hover:bg-primary/10 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChevronDoubleRightIcon className="w-5 h-5 text-primary group-hover:scale-125 transition-transform" />
                  <h2 className="text-lg font-medium text-on-surface group-hover:text-primary transition-colors">Users</h2>
                </div>
              </div>
            </Link>
            {/* Line 2: Projects */}
            <Link
              to="/projects-stats"
              className="block bg-surface-variant rounded-lg p-6 shadow-sm hover:bg-primary/10 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChevronDoubleRightIcon className="w-5 h-5 text-primary group-hover:scale-125 transition-transform" />
                  <h2 className="text-lg font-medium text-on-surface group-hover:text-primary transition-colors">Projects Statistics</h2>
                </div>
              </div>
            </Link>
            {/* Line 3: Service Health */}
            <Link
              to="/service-health"
              className="block bg-surface-variant rounded-lg p-6 shadow-sm hover:bg-primary/10 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChevronDoubleRightIcon className="w-5 h-5 text-primary group-hover:scale-125 transition-transform" />
                  <h2 className="text-lg font-medium text-on-surface group-hover:text-primary transition-colors">Service Health</h2>
                </div>
              </div>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;