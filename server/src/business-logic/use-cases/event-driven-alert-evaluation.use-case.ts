import type { IAlertRepository } from '../ports/alert-repository.js';
import { evaluateAlertCondition } from './evaluate-alert.use-case.js';
import { KafkaService, type AlertEventData, type NotificationEventData, type WeatherEventData } from '../../infrastructure/events/kafka.service.js';

/**
 * Event-Driven Alert Evaluation Use Case
 * Processes weather events from Kafka streams and evaluates alerts in real-time
 */
export class EventDrivenAlertEvaluationUseCase {
  constructor(
    private alertRepository: IAlertRepository,
    private kafkaService: KafkaService
  ) {}

  /**
   * Start event-driven alert processing
   * Subscribes to weather updates and evaluates alerts in real-time
   */
  async startEventProcessing(): Promise<void> {
    console.log('🚀 Starting event-driven alert evaluation...');

    // Subscribe to weather updates
    await this.kafkaService.subscribeToWeatherUpdates(
      'alert-evaluators',
      this.handleWeatherUpdate.bind(this)
    );

    // Subscribe to alert evaluations for notification triggering
    await this.kafkaService.subscribeToAlertEvaluations(
      'notification-triggers',
      this.handleAlertEvaluation.bind(this)
    );

    console.log('✅ Event-driven alert evaluation started');
  }

  /**
   * Handle incoming weather update events
   * Evaluates all alerts for the weather location
   */
  private async handleWeatherUpdate(weatherData: WeatherEventData): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🌤️ Processing weather event: ${weatherData.latitude}, ${weatherData.longitude}`);

      // Find alerts within ~1km radius
      const relevantAlerts = await this.findAlertsForLocation(
        weatherData.latitude,
        weatherData.longitude,
        0.01
      );

      if (relevantAlerts.length === 0) {
        console.log(`ℹ️ No alerts found for location ${weatherData.latitude}, ${weatherData.longitude}`);
        return;
      }

      console.log(`🔍 Found ${relevantAlerts.length} alerts to evaluate for this location`);

      // Evaluate each alert
      const evaluationPromises = relevantAlerts.map(alert => 
        this.evaluateAlertWithEvent(alert, weatherData, startTime)
      );

      const results = await Promise.allSettled(evaluationPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ Alert evaluation completed: ${successful} successful, ${failed} failed`);

    } catch (error) {
      console.error('Error handling weather update:', error);
    }
  }

  /**
   * Evaluate a single alert and publish evaluation event
   */
  private async evaluateAlertWithEvent(
    alert: any, 
    weatherData: WeatherEventData, 
    evaluationStartTime: number
  ): Promise<void> {
    try {
      // Get weather value for the alert parameter
      const currentValue = this.extractWeatherValue(weatherData, alert.parameter);
      if (currentValue === null || currentValue === undefined) {
        console.log(`⚠️ No value for parameter ${alert.parameter} in weather data`);
        return;
      }

      // Get previous state
      const previousState = alert.lastState ?? false;

      // Evaluate the condition
      const evaluation = evaluateAlertCondition({
        parameter: alert.parameter.toUpperCase() as any,
        operator: alert.operator,
        threshold: alert.value,
        values: {
          temperatureC: alert.parameter === 'temperature' ? currentValue : null,
          windSpeedMps: alert.parameter === 'windSpeed' ? currentValue : null,
          precipitationMmHr: alert.parameter === 'precipitation' ? currentValue : null,
        }
      });
      
      const triggered = evaluation.triggered;

      // Update alert in database
      await this.alertRepository.updateAlertAfterEvaluation(alert.id, {
        currentValue,
        triggered
      });

      // Create alert evaluation event
      const alertEvent: AlertEventData = {
        alertId: alert.id,
        alertName: alert.name,
        triggered,
        previousState,
        currentValue,
        threshold: alert.value,
        parameter: alert.parameter,
              location: {
        latitude: alert.latitude || 0,
        longitude: alert.longitude || 0,
        cityName: alert.cityName,
      },
        timestamp: new Date().toISOString(),
        evaluationDurationMs: Date.now() - evaluationStartTime,
      };

      // Publish alert evaluation event
      await this.kafkaService.publishAlertEvaluation(alertEvent);

      console.log(`🚨 Alert ${alert.id} evaluated: ${triggered} (value: ${currentValue}, threshold: ${alert.value})`);

    } catch (error) {
      console.error(`Error evaluating alert ${alert.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle alert evaluation events for notification triggering
   */
  private async handleAlertEvaluation(alertData: AlertEventData): Promise<void> {
    try {
      // Only send notifications for newly triggered alerts
      if (alertData.triggered && !alertData.previousState) {
        console.log(`🔔 Alert newly triggered, sending notification: ${alertData.alertId}`);
        
        const notificationEvent: NotificationEventData = {
          alertId: alertData.alertId,
          alertName: alertData.alertName || `Alert ${alertData.alertId}`,
          type: 'email', // Could be configurable per alert
          recipient: 'user@example.com', // Would be retrieved from alert configuration
          message: this.createNotificationMessage(alertData),
          timestamp: new Date().toISOString(),
          deliveryStatus: 'pending',
        };

        await this.kafkaService.publishNotification(notificationEvent);
      }

      // Log state changes
      if (alertData.triggered !== alertData.previousState) {
        const stateChange = alertData.triggered ? 'triggered' : 'resolved';
        console.log(`📊 Alert state changed: ${alertData.alertId} is now ${stateChange}`);
      }

    } catch (error) {
      console.error('Error handling alert evaluation:', error);
    }
  }

  /**
   * Find alerts for a specific location within a radius
   */
  private async findAlertsForLocation(
    latitude: number, 
    longitude: number, 
    radiusDegrees: number
  ): Promise<any[]> {
    const alerts = await this.alertRepository.listAlerts();
    
    // Filter alerts within the radius
    return alerts.filter(alert => {
      const alertLat = alert.latitude || 0;
      const alertLon = alert.longitude || 0;
      const latDiff = Math.abs(alertLat - latitude);
      const lonDiff = Math.abs(alertLon - longitude);
      return latDiff <= radiusDegrees && lonDiff <= radiusDegrees;
    });
  }

  /**
   * Extract weather value for specific parameter
   */
  private extractWeatherValue(weatherData: WeatherEventData, parameter: string): number | null {
    switch (parameter) {
      case 'temperature':
        return weatherData.temperatureC;
      case 'windSpeed':
        return weatherData.windSpeedMps;
      case 'precipitation':
        return weatherData.precipitationMmHr;
      default:
        console.warn(`Unknown weather parameter: ${parameter}`);
        return null;
    }
  }

  /**
   * Create human-readable notification message
   */
  private createNotificationMessage(alertData: AlertEventData): string {
    const locationStr = alertData.location.cityName || 
      `${alertData.location.latitude.toFixed(2)}, ${alertData.location.longitude.toFixed(2)}`;
    
    const parameterName = {
      temperature: 'Temperature',
      windSpeed: 'Wind Speed',
      precipitation: 'Precipitation',
    }[alertData.parameter] || alertData.parameter;

    const unit = {
      temperature: '°C',
      windSpeed: ' m/s',
      precipitation: ' mm/hr',
    }[alertData.parameter] || '';

    return `🚨 Weather Alert: ${alertData.alertName || 'Alert'} triggered at ${locationStr}. ` +
           `${parameterName} is ${alertData.currentValue}${unit} (threshold: ${alertData.threshold}${unit}).`;
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    kafkaStatus: any;
    alertCounts: {
      total: number;
      active: number;
      triggered: number;
    };
  }> {
    const kafkaStatus = await this.kafkaService.getHealthStatus();
    const alerts = await this.alertRepository.listAlerts();
    
    const alertCounts = {
      total: alerts.length,
      active: alerts.filter(a => a.lastEvaluatedAt).length,
      triggered: alerts.filter(a => a.lastState === true).length,
    };

    return {
      kafkaStatus,
      alertCounts,
    };
  }
}
