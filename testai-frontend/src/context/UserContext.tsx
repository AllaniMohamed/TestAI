// contexts/UserContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { userService } from "../services/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  company: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
}

interface UserContextType {
  user: UserProfile | null;
  avatarBlobUrl: string | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);

  const fetchAvatar = async (avatarUrl: string) => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(avatarUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load avatar");
      const blob = await res.blob();
      setAvatarBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Avatar fetch error", err);
      setAvatarBlobUrl(null);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const userStr = sessionStorage.getItem("user");
      if (!userStr) return;
      const parsed = JSON.parse(userStr);
      const response = await userService.getUserById(parsed.id);
      setUser(response.data);
      if (response.data.avatar) {
        await fetchAvatar(response.data.avatar);
      } else {
        setAvatarBlobUrl(null);
      }
    } catch (error) {
      console.error("Refresh user failed", error);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, avatarBlobUrl, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};