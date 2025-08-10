import type { IWeatherProvider, RealtimeWeatherData } from '../../business-logic/ports/weather-provider.js';
import { TomorrowWeatherProvider } from './tomorrow-weather.provider.js';
import { KafkaService, type WeatherEventData } from '../events/kafka.service.js';

/**
 * Event-Driven Weather Provider
 * Publishes weather data to Kafka streams for real-time processing
 * Combines the existing weather provider with event streaming capabilities
 */
export class EventDrivenWeatherProvider implements IWeatherProvider {
  private weatherProvider: TomorrowWeatherProvider;
  private kafkaService: KafkaService;

  constructor(
    weatherProviderConfig: { apiKey: string; units?: 'metric' | 'imperial'; cacheTtlMs?: number },
    kafkaService: KafkaService
  ) {
    this.weatherProvider = new TomorrowWeatherProvider(weatherProviderConfig);
    this.kafkaService = kafkaService;
  }

  /**
   * Get real-time weather data and publish to Kafka event stream
   */
  async getRealtime(latitude: number, longitude: number, source: 'api' | 'scheduled' | 'manual' = 'api'): Promise<RealtimeWeatherData> {
    console.log(`🌤️ Fetching weather data (event-driven): ${latitude}, ${longitude}`);
    
    // Get weather data from the existing provider
    const weatherData = await this.weatherProvider.getRealtime(latitude, longitude);
    
    // Create weather event for Kafka
    const weatherEvent: WeatherEventData = {
      latitude,
      longitude,
      temperatureC: weatherData.temperatureC ?? 0,
      windSpeedMps: weatherData.windSpeedMps ?? 0,
      precipitationMmHr: weatherData.precipitationMmHr ?? null,
      timestamp: new Date().toISOString(),
      source,
    };

    // Publish to Kafka stream (non-blocking)
    this.publishWeatherEvent(weatherEvent).catch(error => {
      console.error('Failed to publish weather event to Kafka:', error);
      // Don't fail the weather request if Kafka is down
    });

    return weatherData;
  }

  /**
   * Publish weather event to Kafka (async, non-blocking)
   */
  private async publishWeatherEvent(event: WeatherEventData): Promise<void> {
    try {
      await this.kafkaService.publishWeatherUpdate(event);
      console.log(`📡 Weather event published: ${event.latitude}, ${event.longitude}`);
    } catch (error) {
      console.error('Kafka publish error:', error);
      // In production, you might want to:
      // 1. Retry with exponential backoff
      // 2. Store in dead letter queue
      // 3. Send to monitoring system
    }
  }

  /**
   * Batch weather fetching with event streaming
   * Efficiently processes multiple locations and publishes events
   */
  async getRealtimeBatch(
    locations: Array<{ latitude: number; longitude: number; locationName?: string }>,
    source: 'api' | 'scheduled' | 'manual' = 'scheduled'
  ): Promise<Map<string, RealtimeWeatherData>> {
    console.log(`🔄 Batch fetching weather for ${locations.length} locations`);
    
    const results = new Map<string, RealtimeWeatherData>();
    const weatherEvents: WeatherEventData[] = [];

    // Process locations in parallel (with concurrency limit)
    const concurrencyLimit = 5;
    for (let i = 0; i < locations.length; i += concurrencyLimit) {
      const batch = locations.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (location) => {
        const key = `${location.latitude},${location.longitude}`;
        
        try {
          const weatherData = await this.weatherProvider.getRealtime(
            location.latitude, 
            location.longitude
          );
          
          results.set(key, weatherData);
          
          // Prepare event for batch publishing
          weatherEvents.push({
            latitude: location.latitude,
            longitude: location.longitude,
            temperatureC: weatherData.temperatureC ?? 0,
            windSpeedMps: weatherData.windSpeedMps ?? 0,
            precipitationMmHr: weatherData.precipitationMmHr ?? null,
            timestamp: new Date().toISOString(),
            source,
          });
          
        } catch (error) {
          console.error(`Failed to fetch weather for ${key}:`, error);
          // Continue with other locations
        }
      });

      await Promise.allSettled(batchPromises);
    }

    // Publish all events in batch (more efficient)
    this.publishWeatherEventsBatch(weatherEvents).catch(error => {
      console.error('Failed to publish weather events batch:', error);
    });

    console.log(`✅ Batch weather fetch completed: ${results.size}/${locations.length} successful`);
    return results;
  }

  /**
   * Batch publish weather events to Kafka
   */
  private async publishWeatherEventsBatch(events: WeatherEventData[]): Promise<void> {
    if (events.length === 0) return;

    try {
      // Publish events in parallel for better performance
      const publishPromises = events.map(event => 
        this.kafkaService.publishWeatherUpdate(event)
      );
      
      await Promise.allSettled(publishPromises);
      console.log(`📡 Published ${events.length} weather events to Kafka`);
    } catch (error) {
      console.error('Batch Kafka publish error:', error);
    }
  }

  /**
   * Get API status including Kafka health
   */
  getApiStatus() {
    return this.weatherProvider.getApiStatus();
  }

  /**
   * Reset circuit breaker (delegate to weather provider)
   */
  resetCircuitBreaker() {
    return this.weatherProvider.resetCircuitBreaker();
  }
}
