import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface NavbarProps {
  onMenuToggle?: () => void;
  isLoggedIn?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, isLoggedIn = true }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);

  // Récupérer l'utilisateur depuis sessionStorage
  useEffect(() => {
    const updateUserFromStorage = () => {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } catch (e) {
          console.error('Erreur de parsing user', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    updateUserFromStorage();
    window.addEventListener('storage', updateUserFromStorage);
    return () => window.removeEventListener('storage', updateUserFromStorage);
  }, []);

  // Récupérer l'avatar avec le token et créer un blob URL
  useEffect(() => {
    let abortController = new AbortController();

    const fetchAvatar = async () => {
      if (!user?.avatar) {
        if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
        setAvatarBlobUrl(null);
        return;
      }

      try {
        const token = sessionStorage.getItem('accessToken');
        const response = await fetch(user.avatar, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load avatar');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setAvatarBlobUrl(blobUrl);
      } catch (error) {
        console.error('Error fetching avatar:', error);
        setAvatarBlobUrl(null);
      }
    };

    fetchAvatar();

    return () => {
      abortController.abort();
      if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
    };
  }, [user?.avatar]);

  const handleLogout = () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-xl shadow-sm shadow-indigo-500/5 px-6 py-3 flex justify-between items-center w-full border-b border-gray-200/50">
      {/* Left: Logo + Mobile Menu Toggle */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">TestAI</span>
        </Link>
      </div>

      {/* Desktop Logo */}
       <Link
        to={isLoggedIn ? '/dashboard' : '/'}
        className="hidden md:flex items-center gap-2"
      >
        <img 
          src="../../assets/images/logoTestAi.png" 
          alt="TestAI Logo" 
          className="w-8 h-8 object-contain"
        />
        <span className="text-xl font-bold text-gray-900 tracking-tight">TestAI</span>
      </Link>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <>
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100/50 transition-colors relative">
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100/50 transition-colors">
              <QuestionMarkCircleIcon className="h-6 w-6" />
            </button>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-gray-100/50 transition-colors">
                {avatarBlobUrl ? (
                  <img src={avatarBlobUrl} alt={user?.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-gray-700">
                    {user ? user.name : 'Chargement...'}
                  </p>
                  <p className="text-xs text-gray-500">{user ? user.role : ''}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100/50 transition-colors"
                title="Déconnexion"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-4">
            <Link
              to="/login"
              className="text-gray-600 font-medium hover:text-primary pt-2"
            >
              Connexion
            </Link>
            <Link to="/register">
              <button className="bg-primary text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                Commencer
              </button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;