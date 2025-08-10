import { API_CONFIG, ERROR_MESSAGES } from '../utils/constants';

// Weather API types
export interface WeatherData {
  temperatureC: number | null;
  windSpeedMps: number | null;
  precipitationMmHr: number;
}

export interface Alert {
  id: string;
  name?: string;
  description?: string;
  latitude: number;
  longitude: number;
  parameter: string;
  operator: string;
  threshold: number;
  lastState?: boolean;
  lastValue?: number;
  lastEvaluatedAt?: string;
  createdAt: string;
}

class ApiError extends Error {
  public status: number;
  public response?: any;
  
  constructor(message: string, status: number, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

class ApiService {
  private async fetchWithRetry<T>(
    endpoint: string, 
    options?: RequestInit,
    retries = API_CONFIG.RETRY_ATTEMPTS
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = this.getErrorMessage(response.status, errorData);
          throw new ApiError(message, response.status, errorData);
        }
        
        return response.json();
      } catch (error) {
        if (attempt === retries) {
                  if (error instanceof ApiError) throw error;
        if ((error as Error).name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
          }
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }
        // Adaptive backoff with jitter (esp. for 429)
        const base = 400 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 250);
        await new Promise(resolve => setTimeout(resolve, base + jitter));
      }
    }
    
    throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
  }
  
  private getErrorMessage(status: number, errorData: any): string {
    if (status === 429) return ERROR_MESSAGES.RATE_LIMITED;
    if (status >= 400 && status < 500) return errorData.error || 'Invalid request';
    if (status >= 500) return 'Server error. Please try again later.';
    return errorData.error || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  async getWeather(latitude: number, longitude: number): Promise<WeatherData> {
    return this.fetchWithRetry<WeatherData>(
      `/api/weather/realtime?lat=${latitude}&lon=${longitude}`
    );
  }
  
  async getAlerts(page = 1, pageSize = 10): Promise<{ items: Alert[]; total: number }> {
    return this.fetchWithRetry<{ items: Alert[]; total: number }>(
      `/api/alerts?page=${page}&pageSize=${pageSize}`
    );
  }
  
  async createAlert(alert: Partial<Alert>): Promise<Alert> {
    return this.fetchWithRetry<Alert>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  }
  
  async deleteAlert(id: string): Promise<void> {
    await this.fetchWithRetry(`/api/alerts/${id}`, {
      method: 'DELETE',
    });
  }
  
  async clearAllAlerts(): Promise<{ count: number }> {
    return this.fetchWithRetry<{ count: number }>('/api/alerts', {
      method: 'DELETE',
    });
  }
  
  async getAlertStates(): Promise<Alert[]> {
    return this.fetchWithRetry<Alert[]>('/api/alerts/state');
  }
}

export const api = new ApiService();

// Legacy compatibility
export const apiUrl = (path: string): string => {
  if (!path.startsWith('/')) return `${API_CONFIG.BASE_URL}/${path}`;
  return `${API_CONFIG.BASE_URL}${path}`;
};
