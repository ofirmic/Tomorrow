// Shared Types - Common interfaces used across layers

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface HealthCheck {
  ok: boolean;
  timestamp: string;
  services?: Record<string, unknown>;
}

// HTTP Response wrappers
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

// Environment configuration types
export interface DatabaseConfig {
  url: string;
}

export interface ApiKeyConfig {
  tomorrowApi: string;
}

export interface ServerConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
}
