export type RealtimeWeatherData = {
  temperatureC: number | null;
  windSpeedMps: number | null;
  precipitationMmHr: number | null;
  raw: unknown;
};

/**
 * This interface abstracts the underlying weather data provider (e.g., Tomorrow.io).
 */
export interface IWeatherProvider {
  getRealtime(
    latitude: number,
    longitude: number,
    source?: 'api' | 'scheduled' | 'manual'
  ): Promise<RealtimeWeatherData>;
  getApiStatus?(): {
    isRateLimited: boolean;
    rateLimitResetTime: Date | null;
    remainingCalls: number;
    cacheSize: number;
  };
}


