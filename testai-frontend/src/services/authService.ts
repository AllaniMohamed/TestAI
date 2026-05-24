import axios from "axios";
import axiosInstance from "./axiosInstance";

const API_URL = "http://localhost:8888/user-service/api";

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  company?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
}

class AuthService {
  async register(data: RegisterData) {
    const response = await axios.post(`${API_URL}/auth/register`, {
      name: data.name,
      email: data.email,
      password: data.password,
      phoneNumber: data.phoneNumber,
      company: data.company,
      role: data.role || "MANAGER",
    });
    return response.data;
  }

  async verifyEmail(token: string) {
    const response = await axios.get(`${API_URL}/auth/verify-email`, {
      params: { token },
    });
    return response.data;
  }

  async verifyPhone(data: { email: string; code: string }) {
    const response = await axios.post(`${API_URL}/auth/verify-phone`, data);
    return response.data;
  }

  async resendEmailVerification(email: string) {
    const response = await axios.post(`${API_URL}/auth/resend-email-verification`, { email });
    return response.data;
  }

  async resendPhoneVerification(email: string) {
    const response = await axios.post(`${API_URL}/auth/resend-phone-verification`, { email });
    return response.data;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    // Login utilise axios brut (pas d'intercepteur — pas de token à injecter)
    const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, data);

    if (response.data.accessToken) {
      sessionStorage.setItem("accessToken", response.data.accessToken);
      sessionStorage.setItem("refreshToken", response.data.refreshToken);
      sessionStorage.setItem("user", JSON.stringify(response.data.user));
      window.dispatchEvent(new Event("auth-changed"));
    }

    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    const response = await axios.post(`${API_URL}/auth/reset-password`, {
      token,
      newPassword,
      confirmPassword,
    });
    return response.data;
  }

  /**
   * Déconnexion — invalide la session Keycloak puis vide le storage
   */
  async logout(): Promise<void> {
    const refreshToken = sessionStorage.getItem("refreshToken");

    if (refreshToken) {
      try {
        // axiosInstance injecte automatiquement le Bearer token
        await axiosInstance.post("/users/logout", { refreshToken });
      } catch (error) {
        console.warn("Logout serveur échoué, nettoyage local quand même", error);
      }
    }

    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-changed"));
  }

  async checkVerificationStatus(email: string) {
    const response = await axios.get(`${API_URL}/auth/check-verification-status`, {
      params: { email },
    });
    return response.data;
  }

  getCurrentUser() {
    const userStr = sessionStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem("accessToken");
  }

  getToken(): string | null {
    return sessionStorage.getItem("accessToken");
  }
}

export default new AuthService();