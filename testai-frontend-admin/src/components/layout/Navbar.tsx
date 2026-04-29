import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  QuestionMarkCircleIcon,
  BoltIcon,
  // icônes pour les types de notification (toutes en outline)
  UserGroupIcon,
  EnvelopeIcon,
  ShieldExclamationIcon,
  BeakerIcon,
  PlayIcon,
  CogIcon,
  PlayCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useNotifications } from "../../context/NotificationContext";

interface NavbarProps {
  onMenuToggle?: () => void;
  isLoggedIn?: boolean;
}

// ⭐ Composant qui associe un type de notification à une icône Heroicons
const NotifIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    INVITATION_ACCEPTED: UserGroupIcon,
    INVITATION_SENT: EnvelopeIcon,
    ACCESS_REVOKED: ShieldExclamationIcon,
    TEST_GENERATED: BeakerIcon,
    TEST_EXECUTED: PlayIcon,
    JENKINS_EXECUTION_DONE: CogIcon,
    MANUAL_EXECUTION_DONE: PlayCircleIcon,
    GENERATION_DONE: SparklesIcon,
  };

  const IconComponent = iconMap[type] || BellIcon; // fallback
  return <IconComponent className="w-5 h-5 text-gray-400 flex-shrink-0" />;
};

const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, isLoggedIn = true }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);

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

  // Avatar (inchangé)
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
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });
        if (!response.ok) throw new Error('Failed to load avatar');
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

  const logoMark = (
    <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
      <BoltIcon className="w-4 h-4 text-white" />
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-xl shadow-sm shadow-indigo-500/5 px-6 py-3 flex justify-between items-center w-full border-b border-gray-200/50">
      {/* Left */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2">
          {logoMark}
          <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:inline">TestAI</span>
        </Link>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <>
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100/50 transition-colors"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showPanel && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[200] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        Aucune notification
                      </div>
                    ) : (
                      notifications.slice(0, 20).map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${
                            !notif.isRead ? "bg-indigo-50/50" : ""
                          }`}
                        >
                          {/* ⭐ Icône remplaçant l'emoji */}
                          <NotifIcon type={notif.type} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold text-slate-800 ${!notif.isRead ? "text-indigo-900" : ""}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(notif.createdAt).toLocaleString("fr-FR")}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
            <Link to="/login" className="text-gray-600 font-medium hover:text-primary pt-2">
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