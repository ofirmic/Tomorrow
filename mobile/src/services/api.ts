import { WeatherData, AlertWithState } from '../types';

// Use your local API URL - change this when deploying
const API_BASE_URL = 'http://localhost:4000/api';

class ApiService {
  private async fetchApi<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${errorText || response.statusText}`);
    }
    
    return response.json();
  }

  async getWeather(latitude: number, longitude: number): Promise<WeatherData> {
    return this.fetchApi<WeatherData>(
      `/weather/realtime?latitude=${latitude}&longitude=${longitude}`
    );
  }

  async getAlertStates(): Promise<AlertWithState[]> {
    return this.fetchApi<AlertWithState[]>('/alerts/state');
  }
}

export const api = new ApiService();
