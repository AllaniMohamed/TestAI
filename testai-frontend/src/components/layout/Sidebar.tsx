import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  ServerStackIcon,
  PresentationChartLineIcon,
  ClockIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import authService from "../../services/authService";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: number;
}

const MANAGER_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Projets", href: "/projects", icon: ServerStackIcon },
  { name: "Api Runner  ", href: "/execute-rapide", icon: BoltIcon },
  { name: "Rapports", href: "/reports", icon: PresentationChartLineIcon },
  { name: "Historique", href: "/history", icon: ClockIcon },
  { name: "Paramètres", href: "/profile", icon: Cog6ToothIcon },

];

const DEVELOPER_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Mes Projets", href: "/projects", icon: ServerStackIcon },
  { name: "Api Runner  ", href: "/execute-rapide", icon: BoltIcon },
  { name: "Rapports", href: "/reports", icon: PresentationChartLineIcon },
  { name: "Historique", href: "/history", icon: ClockIcon },
  { name: "Paramètres", href: "/profile", icon: Cog6ToothIcon },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole: string = user?.role ?? "MANAGER";
  const isManager = userRole === "MANAGER";
  const NAV = isManager ? MANAGER_NAV : DEVELOPER_NAV;

  const handleLogout = async () => {
    setLoggingOut(true);
    authService.logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-white border-r border-slate-200/60 fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
          <BoltIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">
            TestAI
          </h1>
          <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
            Precision Lab
          </p>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
          Navigation
        </p>
        {NAV.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative
              ${
                isActive
                  ? "bg-slate-100 text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                    isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {item.badge && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-indigo-100 text-indigo-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Section du bas */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-1">
        {/* Bouton Invite uniquement pour Manager */}
        {isManager && (
          <button
            onClick={() => navigate("/projects")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <UserPlusIcon className="w-[18px] h-[18px]" />
            <span>Inviter un membre</span>
          </button>
        )}

        {/* Documentation */}
        <a
          href="https://docs.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <BookOpenIcon className="w-[18px] h-[18px] text-slate-400" />
          <span>Documentation</span>
        </a>

        {/* Profil utilisateur + déconnexion */}
        <div className="mt-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-600">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user?.name ?? "Utilisateur"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{userRole}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Se déconnecter"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;