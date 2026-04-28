import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { notificationService } from "../services/api"; // ⭐ Import du service

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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.id;
  // ⚠️ Le token est stocké sous "accessToken" dans votre app
  const token = sessionStorage.getItem("accessToken");

  // Chargement initial des notifications via le service
  useEffect(() => {
    if (!userId) return;
    notificationService.getUserNotifications(userId)
      .then(res => setNotifications(res.data))
      .catch(err => console.error("Erreur chargement notifications", err));
  }, [userId]);

  // Connexion WebSocket STOMP
  useEffect(() => {
    if (!userId || !token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8089/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        setConnected(true);
        client.subscribe(
          `/user/${userId}/queue/notifications`,
          (message) => {
            const notification: Notification = JSON.parse(message.body);
            setNotifications(prev => [notification, ...prev]);
          }
        );
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => console.error("STOMP error:", frame),
    });

    client.activate();
    return () => { client.deactivate(); };
  }, [userId, token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error("Erreur marquage lecture", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Erreur marquage tout lu", error);
    }
  }, [userId]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, connected }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);