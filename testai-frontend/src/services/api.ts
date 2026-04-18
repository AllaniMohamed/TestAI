// ==========================================
// src/services/api.ts
// Configuration Axios avec TypeScript (Import Type)
// ==========================================

import axios from "axios";
import type { AxiosResponse } from "axios";

// URL de base de la gateway
const API_BASE_URL = "http://localhost:8888";

// Instance Axios avec configuration CORS
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ==========================================
// TYPES
// ==========================================

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  company: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
}

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  company: string;
  role: string;
}

// src/services/api.ts

interface ProjectCredentials {
  id: string;
  basicUsername?: string | null;
  basicPassword?: string | null;
  apiKey?: string | null;
  apiKeyHeader?: string | null;
  apiKeyLocation?: string | null;
  bearerToken?: string | null;
  encrypted?: boolean;
}

interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  projectUrl: string;
  docMode: string;
  docUrl?: string;
  authType: string;
  isActive?: boolean;
  activatedAt?: string | null;
  deactivatedAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  credentials?: ProjectCredentials;
}

interface Endpoint {
  id: string;
  projectId: string;
  method: string;
  tags?: string;
  path: string;
  description?: string;
  parameters?: string;
  requestBody?: string;
  responseBody?: string;
  statusCodes?: string;
  requiresAuth: boolean;
  discoveryType: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EndpointDTO {
  id: string;
  projectId: string;
  method: string;
  path: string;
  description?: string;
  parameters?: string;
  requestBody?: string;
  responseBody?: string;
  statusCodes?: string;
  requiresAuth: boolean;
  discoveryType: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ScanSwaggerRequest {
  projectId: string;
  swaggerUrl: string;
}

interface ScanSwaggerResponse {
  success: boolean;
  message: string;
  totalEndpoints: number;
  newEndpoints: number;
  updatedEndpoints: number;
  skippedEndpoints: number;
  endpoints: Endpoint[];
}
interface SharedAccess {
  id: string;
  projectId: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  accessLevel: "READ_ONLY" | "READ_WRITE";
  sharedBy: string;
  sharedByName: string;
  invitedAt: string;
  activatedAt?: string;
  createdAt: string;
}

interface SharedProject {
  projectId: string;
  projectName: string;
  projectDescription: string;
  projectUrl: string;
  managerName: string;
  accessLevel: string;
  sharedAt: string;
}

interface InvitationInfo {
  projectName: string;
  projectDescription: string;
  managerName: string;
  developerEmail: string;
  developerName: string;
  accessLevel: string;
  status: string;
  invitedAt: string;
}

interface Test {
  id: string;
  projectId: string;
  endpointId: string;
  endpointPath: string;
  positive?: Record<string, any>;
  wrongType?: Record<string, any>;
  missingFields?: Record<string, any>;
  boundary?: Record<string, any>;
  validation?: Record<string, any>;
  auth?: Record<string, any>;
}

interface GeneratedTestStatus {
  projectId: string;
  endpointId: string;
  insertedTests: string[];
}

// ==========================================
// INTERCEPTEUR REQUEST (Ajouter JWT Token)
// ==========================================
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ==========================================
// INTERCEPTEUR RESPONSE (Gérer les erreurs)
// ==========================================
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error("Authentification expirée");
          sessionStorage.removeItem("accessToken");
          sessionStorage.removeItem("refreshToken");
          window.location.href = "/login";
          break;

        case 403:
          console.error("Accès refusé");
          break;

        case 404:
          console.error("Ressource non trouvée");
          break;

        case 500:
          console.error("Erreur serveur interne");
          break;

        default:
          console.error("Erreur:", error.response.status);
      }
    } else if (error.request) {
      console.error("Pas de réponse du serveur");
    } else {
      console.error("Erreur:", error.message);
    }

    return Promise.reject(error);
  },
);

// ==========================================
// SERVICES API
// ==========================================

// Auth Service
export const authService = {
  login: (
    email: string,
    password: string,
  ): Promise<AxiosResponse<LoginResponse>> =>
    api.post("/user-service/api/auth/login", { email, password }),

  register: (userData: RegisterRequest): Promise<AxiosResponse<User>> =>
    api.post("/user-service/api/auth/register", userData),

  registerWithInvitation: (data: RegisterWithInvitationRequest) =>
    api.post("/user-service/api/auth/register-invitation", data),

  logout: (): void => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    window.location.href = "/login";
  },

  verifyEmail: (token: string): Promise<AxiosResponse<any>> =>
    api.get(`/user-service/api/auth/verify-email?token=${token}`),

  verifyPhone: (code: string): Promise<AxiosResponse<any>> =>
    api.post("/user-service/api/auth/verify-phone", { code }),
};

// User Service
export const userService = {
  getAllUsers: (): Promise<AxiosResponse<User[]>> =>
    api.get("/user-service/api/users/all"),

  getUserById: (userId: string): Promise<AxiosResponse<User>> =>
    api.get(`/user-service/api/users/${userId}`),

  getCurrentUser: (): Promise<AxiosResponse<User>> =>
    api.get("/user-service/api/users/me"),

  updateProfile: (profileData: Partial<User>): Promise<AxiosResponse<User>> =>
    api.put("/user-service/api/users/me", profileData),

  uploadAvatar: (userId: string, file: File): Promise<AxiosResponse<any>> => {
    const formData = new FormData();
    formData.append("avatar", file);

    return api.post(`/user-service/api/users/${userId}/avatar`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  deleteAvatar: (userId: string): Promise<AxiosResponse<any>> =>
    api.delete(`/user-service/api/users/${userId}/avatar`),

  getAvatarUrl: (fileName: string): string =>
    `${API_BASE_URL}/user-service/api/users/avatars/${fileName}`,
};

// Project Service
export const projectService = {
  getAllProjects: (): Promise<AxiosResponse<Project[]>> =>
    api.get("/project-service/api/projects/all"),

  getProjectById: (projectId: string): Promise<AxiosResponse<Project>> =>
    api.get(`/project-service/api/projects/${projectId}`),

  createProject: (projectData: any): Promise<AxiosResponse<Project>> => {
    const formData = new FormData();
    Object.keys(projectData).forEach((key) => {
      if (projectData[key] !== null && projectData[key] !== undefined) {
        formData.append(key, projectData[key]);
      }
    });
    return api.post("/project-service/api/projects/add", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  updateProject: (
    projectId: string,
    projectData: Partial<UpdateProjectRequest>,
  ): Promise<AxiosResponse<Project>> =>
    api.put(`/project-service/api/projects/${projectId}`, projectData),

  deleteProject: (projectId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/project-service/api/projects/${projectId}`),

  getProjectEndpoints: (
    projectId: string,
  ): Promise<AxiosResponse<Endpoint[]>> =>
    api.get(`/project-service/api/projects/${projectId}/endpoints`),

  scanProjectEndpoints: (
    projectId: string,
  ): Promise<AxiosResponse<ScanSwaggerResponse>> =>
    api.post(`/project-service/api/projects/${projectId}/scan-endpoints`),

  countProjectEndpoints: (
    projectId: string,
  ): Promise<AxiosResponse<{ count: number }>> =>
    api.get(`/project-service/api/projects/${projectId}/endpoints/count`),

  // ⭐ Activer un projet
  activateProject: (projectId: string): Promise<AxiosResponse<Project>> =>
    api.post(`/project-service/api/projects/${projectId}/activate`),

  // ⭐ Désactiver un projet
  deactivateProject: (projectId: string): Promise<AxiosResponse<Project>> =>
    api.post(`/project-service/api/projects/${projectId}/deactivate`),

  // ⭐ Toggle activation (activer/désactiver)
  toggleProjectActivation: (
    projectId: string,
  ): Promise<AxiosResponse<Project>> =>
    api.post(`/project-service/api/projects/${projectId}/toggle-activation`),
};

// Endpoint Service
export const endpointService = {
  getAllEndpoints: (): Promise<AxiosResponse<Endpoint[]>> =>
    api.get("/endpoint-service/api/endpoints"),

  getEndpointById: (endpointId: string): Promise<AxiosResponse<Endpoint>> =>
    api.get(`/endpoint-service/api/endpoints/${endpointId}`),

  getEndpointsByProjectId: (
    projectId: string,
  ): Promise<AxiosResponse<Endpoint[]>> =>
    api.get(`/endpoint-service/api/endpoints/project/${projectId}`),

  createEndpoint: (
    endpointData: Partial<Endpoint>,
  ): Promise<AxiosResponse<Endpoint>> =>
    api.post("/endpoint-service/api/endpoints", endpointData),

  updateEndpoint: (
    endpointId: string,
    endpointData: Partial<Endpoint>,
  ): Promise<AxiosResponse<Endpoint>> =>
    api.put(`/endpoint-service/api/endpoints/${endpointId}`, endpointData),

  deleteEndpoint: (endpointId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/endpoint-service/api/endpoints/${endpointId}`),

  scanSwagger: (
    projectId: string,
    swaggerUrl: string,
  ): Promise<AxiosResponse<ScanSwaggerResponse>> =>
    api.post("/endpoint-service/api/endpoints/scan", { projectId, swaggerUrl }),
};

export const testService = {
  getAllTests: (): Promise<AxiosResponse<Test[]>> =>
    api.get("/test-service/api/tests"),

  getTestsByProjectId: (projectId: string): Promise<AxiosResponse<Test[]>> =>
    api.get(`/test-service/api/tests/${projectId}`),

  getTestsByProjectIdAndEndpointId: (
    projectId: string,
    endpointId: string,
  ): Promise<AxiosResponse<Test[]>> =>
    api.get(`/test-service/api/tests/${projectId}/${endpointId}`),

  generate: (
    endpoints: Partial<Endpoint[]>,
  ): Promise<AxiosResponse<GeneratedTestStatus[]>> =>
    api.post("/test-service/api/tests/generate", endpoints as EndpointDTO[], {
      timeout: 300000,
    }),

  update: (test: Partial<Test>): Promise<AxiosResponse<string>> =>
    api.put(`/test-service/api/tests/update`, test),

  getHeaders: (): Promise<AxiosResponse<Record<string, string>>> =>
    api.get(`/test-service/api/tests/headers`),

  resetHeaders: (): Promise<AxiosResponse<Record<string, string>>> =>
    api.get(`/test-service/api/tests/reset_headers`),

  setHeaders: (
    headers: Record<string, string>,
  ): Promise<AxiosResponse<Record<string, string>>> =>
    api.post(`/test-service/api/tests/headers`, headers),

  deleteTestByProjectIdAndEndpointId: (
    projectId: string,
    endpointId: string,
  ): Promise<AxiosResponse<Record<string, string>>> =>
    api.delete(`/test-service/api/tests/${projectId}/${endpointId}`),

  deleteTestsByProjectId: (
    projectId: string,
  ): Promise<AxiosResponse<Record<string, string>>> =>
    api.delete(`/test-service/api/tests/project/${projectId}`),
};

// ==========================================
// SHARED ACCESS SERVICE ⭐
// ==========================================

export const sharedAccessService = {
  // Partager un projet (MANAGER)
  shareProject: (
    projectId: string,
    data: {
      developerEmail: string;
      accessLevel: string;
    },
  ): Promise<AxiosResponse<SharedAccess>> =>
    api.post(`/project-service/api/projects/${projectId}/share`, data),

  // Lister les partages d'un projet (MANAGER)
  getProjectShares: (
    projectId: string,
  ): Promise<AxiosResponse<SharedAccess[]>> =>
    api.get(`/project-service/api/projects/${projectId}/shares`),

  // Révoquer un partage (MANAGER)
  revokeAccess: (sharedAccessId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/project-service/api/projects/shares/${sharedAccessId}`),

  // Lister les projets partagés avec moi (DEVELOPER)
  getSharedProjects: (): Promise<AxiosResponse<SharedProject[]>> =>
    api.get("/project-service/api/projects/shared-with-me"),

  updateAccessLevel: (
    sharedAccessId: string,
    accessLevel: string,
  ): Promise<AxiosResponse<SharedAccess>> =>
    api.put(
      `/project-service/api/projects/shares/${sharedAccessId}/access-level`,
      { accessLevel },
    ),
  // Récupérer les infos d'une invitation (PUBLIC)
  getInvitationInfo: (token: string): Promise<AxiosResponse<InvitationInfo>> =>
    api.get(`/project-service/api/invitations/${token}`),

  // Activer une invitation (PUBLIC)
  activateInvitation: (token: string): Promise<AxiosResponse<SharedAccess>> =>
    api.post(`/project-service/api/invitations/${token}/activate`),
};

// ==========================================
// EXECUTION SERVICE
// ==========================================

export interface ExecuteProjectRequest {
  projectId: string;
  executedBy: string;
  executionContext?: string; // "manual", "scheduled", "ci_cd"
}

export interface StartExecutionResponse {
  executionId: string;
}

export interface TestTypeStats {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export interface EndpointSummary {
  endpointId: string;
  method: string;
  path: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
}

// ⭐ ProjectExecution entity (ce que le backend renvoie)
export interface ProjectExecution {
  id: string;
  projectId: string;
  projectName: string;
  totalEndpoints: number;
  totalTests: number;
  testsPassed: number;
  testsFailed: number;
  testsError: number;
  successRate: number;
  totalDurationMs: number;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  executedAt: string;
  completedAt?: string;
  executedBy: string;
  executionContext: string;

  // Stats par type de test
  positiveTests?: number;
  positivePassedTests?: number;
  wrongTypeTests?: number;
  wrongTypePassedTests?: number;
  missingFieldsTests?: number;
  missingFieldsPassedTests?: number;
  boundaryTests?: number;
  boundaryPassedTests?: number;
  validationTests?: number;
  validationPassedTests?: number;
  authTests?: number;
  authPassedTests?: number;
}

export interface ProjectExecutionResponse {
  executionId: string;
  projectId: string;
  projectName: string;
  totalEndpoints: number;
  totalTests: number;
  testsPassed: number;
  testsFailed: number;
  testsError: number;
  successRate: number;
  totalDurationMs: number;
  statsByType: Record<string, TestTypeStats>;
  failedEndpoints: EndpointSummary[];
  status: string;
  executedAt: string;
  completedAt: string;
}

export interface TestExecution {
  id: string;
  projectId: string;
  endpointId: string;
  endpointPath: string;
  httpMethod: string;
  testType: TestType;
  requestUrl: string;
  requestHeaders?: Record<string, string>;
  requestBody?: Record<string, any>;
  responseStatusCode: number;
  responseHeaders?: Record<string, string>;
  responseBody?: Record<string, any>;
  responseTimeMs?: number;
  status: TestStatus;
  expectedStatusCode?: number;
  statusCodeMatch?: boolean;
  schemaValidationPassed?: boolean;
  errorMessage?: string;
  validationErrors?: Record<string, any>;
  executedBy: string;
  executedAt: string;
  executionContext?: string;
  executionId: string;
}

export interface ProjectExecutionStats {
  id: string;
  date: string;
  passedTests: string;
  duration: string;
  projectName: string;
}

export type TestType =
  | "POSITIVE"
  | "WRONG_TYPE"
  | "MISSING_FIELDS"
  | "VALIDATION"
  | "BOUNDARY"
  | "AUTH";
export type TestStatus = "SUCCESS" | "FAILED" | "ERROR";

export const executionService = {
  // ==========================================
  // EXÉCUTION
  // ==========================================

  /**
   * Lancer l'exécution de tous les tests d'un projet
   */
  startExecution: (
    request: ExecuteProjectRequest,
  ): Promise<AxiosResponse<StartExecutionResponse>> =>
    api.post("/execution-service/api/executions/execute-project", request),

  // ==========================================
  // RÉCUPÉRATION HISTORIQUE
  // ==========================================

  /**
   * ⭐ Récupérer toutes les ProjectExecution d'un projet
   * Retourne: ProjectExecution[] (ordonné par date décroissante)
   */
  getProjectExecutions: (
    projectId: string,
  ): Promise<AxiosResponse<ProjectExecution[]>> =>
    api.get(`/execution-service/api/executions/project/${projectId}`),

  /**
   * Récupérer UNE ProjectExecution par son ID
   */
  getProjectExecutionById: (
    executionId: string,
  ): Promise<AxiosResponse<ProjectExecution>> =>
    api.get(`/execution-service/api/executions/${executionId}`),

  /**
   * ⭐ Récupérer tous les TestExecution d'une ProjectExecution
   * Retourne: TestExecution[]
   */
  getTestExecutionsByExecutionId: (
    executionId: string,
  ): Promise<AxiosResponse<TestExecution[]>> =>
    api.get(`/execution-service/api/executions/${executionId}/test-executions`),

  /**
   * Récupérer les logs d'une exécution
   */
  getExecutionLogs: (executionId: string): Promise<AxiosResponse<string[]>> =>
    api.get(`/execution-service/api/executions/${executionId}/logs`),

  /**
   * Récupérer le statut d'une exécution
   */
  getExecutionStatus: (
    executionId: string,
  ): Promise<AxiosResponse<ProjectExecutionResponse>> =>
    api.get(`/execution-service/api/executions/${executionId}/status`),

  
  // Report endpoints
  getSingleEndpointReport: (
    projectId: string,
    endpointId: string,
  ): Promise<AxiosResponse<Blob>> =>
    api.get(
      `/execution-service/api/executions/report/${projectId}/${endpointId}`,
      { responseType: "blob" },
    ),

  getSimpleSingleEndpointReport: (
    projectId: string,
    endpointId: string,
  ): Promise<AxiosResponse<Blob>> =>
    api.get(
      `/execution-service/api/executions/report/${projectId}/${endpointId}/simple`,
      { responseType: "blob" },
    ),

  getProjectReport: (projectId: string): Promise<AxiosResponse<Blob>> =>
    api.get(`/execution-service/api/executions/report/${projectId}`, {
      responseType: "blob",
    }),

  getSimpleProjectReport: (projectId: string): Promise<AxiosResponse<Blob>> =>
    api.get(
      `/execution-service/api/executions/report/${projectId}/simple`,
      {
        responseType: "blob",
      },
    ),

  getTagReport: (
    projectId: string,
    tag: string,
  ): Promise<AxiosResponse<Blob>> =>
    api.get(
      `/execution-service/api/executions/report/${projectId}/tag/${tag}`,
      { responseType: "blob" },
    ),

  getSimpleTagReport: (
    projectId: string,
    tag: string,
  ): Promise<AxiosResponse<Blob>> =>
    api.get(
      `/execution-service/api/executions/report/${projectId}/tag/${tag}/simple`,
      { responseType: "blob" },
    ),

  getTestedEndpoints: (
    projectId: string,
  ): Promise<AxiosResponse<Endpoint[]>> =>
    api.get(`/execution-service/api/executions/${projectId}/tested-endpoints`),

  getProjectSuccessRate: (
    projectId: string,
  ): Promise<AxiosResponse<Record<string, number>>> =>
    api.get(`/execution-service/api/stats/${projectId}/success-rate`),

  getProjectSuccessRateHistory: (
    projectId: string,
  ): Promise<AxiosResponse<Record<string, any>>> =>
    api.get(`/execution-service/api/stats/${projectId}/success-rate-history`),

  getUserProjectsGlobalStats: (): Promise<AxiosResponse<Record<string, number>>> =>
    api.get(`/execution-service/api/stats/execution-global-stats`),

  getUserProjectsGlobalTestsRate: (): Promise<AxiosResponse<Record<string, any>>> =>
    api.get(`/execution-service/api/stats/global-tests-rate`),

  getProjectExecutionStats: (): Promise<AxiosResponse<ProjectExecutionStats[]>> =>
    api.get(`/execution-service/api/stats/latest-project-execs`),

};





// ==========================================
// API RUNNER SERVICE ⭐
// ==========================================

export interface ExecuteApiRequestDTO {
  method: string; // GET, POST, PUT, DELETE, PATCH
  url: string; // URL complète
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  pathVariables?: Record<string, string>;
  authType?: string; // NONE, BEARER, BASIC, API_KEY
  authConfig?: Record<string, string>;
  requestBody?: string; // JSON body
  saveAfterExecution?: boolean;
  requestName?: string;
  requestDescription?: string;
}

export interface ApiResponseDTO {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTimeMs: number;
  size: string;
  success: boolean;
  errorMessage?: string;
}

export interface SavedApiRequestDTO {
  id?: string;
  userId?: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  pathVariables?: Record<string, string>;
  authType?: string;
  authConfig?: Record<string, string>;
  requestBody?: string;
  createdAt?: string;
  updatedAt?: string;
  lastExecutedAt?: string;
  executionCount?: number;
}

export const apiRunnerService = {
  // Exécuter une requête HTTP
  executeRequest: (
    request: ExecuteApiRequestDTO,
  ): Promise<AxiosResponse<ApiResponseDTO>> =>
    api.post("/execution-service/api/executions/api-runner/execute", request),

  // Créer une nouvelle requête
  createRequest: (
    request: SavedApiRequestDTO,
  ): Promise<AxiosResponse<SavedApiRequestDTO>> =>
    api.post("/execution-service/api/executions/api-runner/requests", request),

  // Lister mes requêtes
  getUserRequests: (
    orderBy: string = "created",
  ): Promise<AxiosResponse<SavedApiRequestDTO[]>> =>
    api.get(
      `/execution-service/api/executions/api-runner/requests?orderBy=${orderBy}`,
    ),

  // Récupérer une requête par ID
  getRequestById: (
    requestId: string,
  ): Promise<AxiosResponse<SavedApiRequestDTO>> =>
    api.get(
      `/execution-service/api/executions/api-runner/requests/${requestId}`,
    ),

  // Modifier une requête
  updateRequest: (
    requestId: string,
    request: SavedApiRequestDTO,
  ): Promise<AxiosResponse<SavedApiRequestDTO>> =>
    api.put(
      `/execution-service/api/executions/api-runner/requests/${requestId}`,
      request,
    ),

  // Supprimer une requête
  deleteRequest: (
    requestId: string,
  ): Promise<AxiosResponse<Record<string, string>>> =>
    api.delete(
      `/execution-service/api/executions/api-runner/requests/${requestId}`,
    ),

  // Exécuter une requête sauvegardée
  executeSavedRequest: (
    requestId: string,
  ): Promise<AxiosResponse<ApiResponseDTO>> =>
    api.post(
      `/execution-service/api/executions/api-runner/requests/${requestId}/execute`,
    ),

  // Supprimer tout l'historique
  deleteAllRequests: (): Promise<AxiosResponse<Record<string, string>>> =>
    api.delete("/execution-service/api/executions/api-runner/requests"),
};
// INTERCEPTEUR REQUEST (Ajouter JWT Token et X-User-Id)
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ⭐ Ajout du header X-User-Id requis par execution-service
    try {
      const userStr = sessionStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.id) {
          config.headers["X-User-Id"] = user.id;
        }
      }
    } catch (e) {
      console.warn(
        "Impossible de récupérer l'ID utilisateur pour X-User-Id",
        e,
      );
    }

    return config;
  },
  (error) => Promise.reject(error),
);
// ==========================================
// TYPES ⭐
// ==========================================

// Export types
export type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  User,
  Project,
  Endpoint,
  Test,
  GeneratedTestStatus,
  ScanSwaggerRequest,
  ScanSwaggerResponse,
  SharedAccess,
  SharedProject,
  InvitationInfo,
  ProjectCredentials,
};
export interface RegisterWithInvitationRequest {
  email: string;
  name: string;
  password: string;
  phoneNumber?: string;
  invitationToken: string;
}

export interface ActivateInvitationResponse {
  hasAccount: boolean;
  email: string;
  invitationToken: string;
  projectName: string;
}

// types
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  projectUrl?: string;
  docUrl?: string;
  authType?: string;
  authUsername?: string;
  authPassword?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  apiKeyLocation?: string;
  bearerToken?: string;
}
export default api;
