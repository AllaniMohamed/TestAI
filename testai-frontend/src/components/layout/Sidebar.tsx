import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAVIGATION } from '../../constants';

const Sidebar: React.FC = () => {
  // Optional: Determine if user is MANAGER to show the "Invite Member" button
  // You can get role from localStorage if needed
  const userStr = localStorage.getItem('user');
  const userRole = userStr ? JSON.parse(userStr).role : null;
  const isManager = userRole === 'MANAGER';

  return (
    <aside className="hidden md:flex flex-col h-full w-64 bg-slate-50 border-r border-slate-200/50 p-4 space-y-2 fixed left-0 top-0 z-50">
      {/* Logo Area */}
      <div className="mb-8 px-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tighter text-slate-900 leading-none">TestAI</h1>
          <p className="text-[10px] font-medium text-slate-500 tracking-widest uppercase">Precision Lab</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAVIGATION.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
              ${
                isActive
                  ? 'bg-slate-900 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-600 hover:bg-slate-200/50 hover:translate-x-1'
              }
            `}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto pt-4 border-t border-slate-200/50 space-y-1">
        {isManager && (
          <button className="w-full bg-primary-container text-white py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95">
            <span className="material-symbols-outlined text-sm">person_add</span>
            Invite Member
          </button>
        )}
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200/50 rounded-lg text-sm font-medium transition-all"
        >
          <span className="material-symbols-outlined text-xl">menu_book</span>
          <span>Documentation</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;