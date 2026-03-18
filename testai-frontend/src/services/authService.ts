// src/services/authService.ts

import axios from "axios";

const API_URL =  "http://localhost:8888/user-service/api";

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

export interface VerifyPhoneData {
  email: string;
  code: string;
}

class AuthService {
  /**
   * Inscription
   */
  async register(data: RegisterData) {
    const response = await axios.post(`${API_URL}/auth/register`, {
      name: data.name,
      email: data.email,
      password: data.password,
      phoneNumber: data.phoneNumber,
      company: data.company,
      role: data.role || "MANAGER", // Par défaut MANAGER
    });
    return response.data;
  }

  /**
   * Vérifier l'email avec le token
   */
  async verifyEmail(token: string) {
    const response = await axios.get(`${API_URL}/auth/verify-email`, {
      params: { token },
    });
    return response.data;
  }

  /**
   * Vérifier le code téléphone
   */
  async verifyPhone(data: VerifyPhoneData) {
    const response = await axios.post(`${API_URL}/auth/verify-phone`, data);
    return response.data;
  }

  /**
   * Renvoyer l'email de vérification
   */
  async resendEmailVerification(email: string) {
    const response = await axios.post(
      `${API_URL}/auth/resend-email-verification`,
      {
        email,
      },
    );
    return response.data;
  }

  /**
   * Renvoyer le code SMS
   */
  async resendPhoneVerification(email: string) {
    const response = await axios.post(
      `${API_URL}/auth/resend-phone-verification`,
      {
        email,
      },
    );
    return response.data;
  }

  /**
   * Connexion
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${API_URL}/auth/login`,
      data,
    );

    // Stocker les tokens
    if (response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response.data;
  }

  /**
   * Mot de passe oublié
   */
  async forgotPassword(email: string) {
    const response = await axios.post(`${API_URL}/auth/forgot-password`, {
      email,
    });
    return response.data;
  }

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const response = await axios.post(`${API_URL}/auth/reset-password`, {
      token,
      newPassword,
      confirmPassword,
    });
    return response.data;
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token");

    const response = await axios.post<AuthResponse>(`${API_URL}/auth/refresh`, {
      refreshToken,
    });

    localStorage.setItem("accessToken", response.data.accessToken);
    localStorage.setItem("refreshToken", response.data.refreshToken);

    return response.data;
  }

  /**
   * Déconnexion
   */
  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  /**
   * Récupérer l'utilisateur connecté
   */
  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated() {
    return !!localStorage.getItem("accessToken");
  }

  /**
   * Récupérer le token
   */
  getToken() {
    return localStorage.getItem("accessToken");
  }

  /**
   * Vérifier le statut de vérification (polling)
   */
  async checkVerificationStatus(email: string) {
    const response = await axios.get(
      `${API_URL}/auth/check-verification-status`,
      {
        params: { email },
      },
    );
    return response.data;
  }
}

export default new AuthService();
