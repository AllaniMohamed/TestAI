import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { notificationService } from "../services/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  projectId?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  connected: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  connected: false,
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  // ⭐ Réactifs avec useState — lus depuis sessionStorage au montage
  const [userId, setUserId] = useState<string | null>(() => {
    try {
      const userStr = sessionStorage.getItem("user");
      return userStr ? JSON.parse(userStr)?.id : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("accessToken"),
  );

  // ⭐ Écouter les changements auth (login / logout)
  useEffect(() => {
    const handleAuthChanged = () => {
      try {
        const userStr = sessionStorage.getItem("user");
        const newUserId = userStr ? JSON.parse(userStr)?.id : null;
        const newToken = sessionStorage.getItem("accessToken");
        setUserId(newUserId);
        setToken(newToken);

        // Si déconnexion, vider les notifications
        if (!newUserId) {
          setNotifications([]);
          setConnected(false);
        }
      } catch (e) {
        console.error("Erreur parsing user depuis sessionStorage", e);
      }
    };

    // "storage" fonctionne entre onglets, "auth-changed" dans le même onglet
    window.addEventListener("storage", handleAuthChanged);
    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.removeEventListener("storage", handleAuthChanged);
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  // ⭐ Chargement initial des notifications depuis l'API REST
  useEffect(() => {
    if (!userId) return;

    notificationService
      .getUserNotifications(userId)
      .then((res) => setNotifications(res.data))
      .catch((err) => console.error("Erreur chargement notifications:", err));
  }, [userId]);

  // ⭐ Connexion WebSocket STOMP
  useEffect(() => {
    if (!userId || !token) return;

    console.log("🔌 Connexion WebSocket pour userId:", userId);

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8089/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000, // Reconnexion automatique toutes les 5s si coupure
      onConnect: () => {
        setConnected(true);
        console.log("✅ WebSocket connecté");

        client.subscribe(`/topic/notifications/${userId}`, (message) => {
          try {
            const notification: Notification = JSON.parse(message.body);
            console.log("🔔 Nouvelle notification reçue:", notification);
            setNotifications((prev) => [notification, ...prev]);
          } catch (e) {
            console.error("Erreur parsing notification WebSocket:", e);
          }
        });
      },
      onDisconnect: () => {
        setConnected(false);
        console.log("❌ WebSocket déconnecté");
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        setConnected(false);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [userId, token]); // ⭐ Se reconnecte si userId ou token changent

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error("Erreur marquage lecture:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Erreur marquage tout lu:", error);
    }
  }, [userId]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        connected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
