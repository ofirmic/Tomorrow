// Application constants - centralized configuration

export const API_CONFIG = {
  BASE_URL: (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
} as const;

export const LOCATION_PRESETS = [
  { name: 'Boston', lat: 42.3601, lon: -71.0589 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'London', lat: 51.5074, lon: 0.1278 },
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917 },
] as const;

export const ALERT_TEMPLATES = [
  { name: 'High Temperature', parameter: 'TEMPERATURE', operator: 'GT', threshold: 30, description: 'Temperature above 30°C' },
  { name: 'Strong Wind', parameter: 'WIND_SPEED', operator: 'GT', threshold: 10, description: 'Wind speed above 10 m/s' },
  { name: 'Heavy Rain', parameter: 'PRECIPITATION', operator: 'GT', threshold: 5, description: 'Precipitation above 5 mm/hr' },
] as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

export const REFRESH_INTERVALS = {
  WEATHER_DATA: 30000, // 30 seconds
  ALERT_STATE: 15000,  // 15 seconds
  HEALTH_CHECK: 60000, // 1 minute
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the service. Please check your connection.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  INVALID_COORDINATES: 'Please provide valid latitude and longitude coordinates.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;
