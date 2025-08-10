// Weather API types
export interface WeatherData {
  temperatureC: number | null;
  windSpeedMps: number | null;
  precipitationMmHr: number;
}

// Alert types
export interface AlertWithState {
  id: string;
  name?: string;
  lastState?: boolean;
  lastValue?: number;
  lastEvaluatedAt?: string;
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
}

// API response types
export interface ApiError {
  message: string;
  details?: any;
}
