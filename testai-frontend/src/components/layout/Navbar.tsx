import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, UserCircleIcon, Bars3Icon } from '@heroicons/react/24/outline';

interface NavbarProps {
  onMenuToggle?: () => void;
  isLoggedIn?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, isLoggedIn = true }) => {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  // Lecture de l'utilisateur dans localStorage au montage et lors des changements (multi-onglets)
  useEffect(() => {
    const updateUserFromStorage = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser({ name: userData.name, role: userData.role });
        } catch (e) {
          console.error('Erreur de parsing user', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    updateUserFromStorage();

    // Écoute les changements dans d'autres onglets/fenêtres
    window.addEventListener('storage', updateUserFromStorage);
    return () => window.removeEventListener('storage', updateUserFromStorage);
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {isLoggedIn && (
              <button 
                onClick={onMenuToggle}
                className="p-2 rounded-md text-gray-500 md:hidden hover:bg-gray-100"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            )}
            <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">TestAI</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
                  <BellIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-gray-50">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-gray-700">
                      {user ? user.name : 'Chargement...'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user ? user.role : ''}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex gap-4">
                <Link to="/login" className="text-gray-600 font-medium hover:text-primary pt-2">Connexion</Link>
                <Link to="/register">
                  <button className="bg-primary text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                    Commencer
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;