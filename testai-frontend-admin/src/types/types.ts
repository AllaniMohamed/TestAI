
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Service {
  id: string;
  name: string;
  url: string;
  swaggerUrl?: string;
  status: 'active' | 'inactive';
  endpointsCount: number;
  lastTestDate?: string;
  authType: 'none' | 'apiKey' | 'bearer' | 'basic';
}

export interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  parameters: string[];
  testsGenerated: number;
}

export interface TestResult {
  id: string;
  name: string;
  endpoint: string;
  status: 'passed' | 'failed';
  duration: string;
  date: string;
  details?: string;
}

export interface DashboardStats {
  totalServices: number;
  totalTests: number;
  successRate: number;
  lastExecution: string;
}

export enum DocMode {
  SWAGGER = 'SWAGGER',
  MANUAL = 'MANUAL'
}

export enum AuthType {
  NONE = 'NONE',
  BASIC = 'BASIC',
  APIKEY = 'APIKEY',
  BEARER = 'BEARER'
}