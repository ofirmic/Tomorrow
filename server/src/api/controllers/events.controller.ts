import { Router } from 'express';
import { z } from 'zod';
import { KafkaService } from '../../infrastructure/events/kafka.service.js';
import { EventDrivenAlertEvaluationUseCase } from '../../business-logic/use-cases/event-driven-alert-evaluation.use-case.js';
import { asyncHandler } from '../../middleware/validation/validation.middleware.js';

/**
 * Events Controller - Real-time event streaming endpoints
 * Demonstrates Kafka integration and event-driven architecture
 */
export function createEventsController(
  kafkaService: KafkaService,
  eventDrivenEvaluation: EventDrivenAlertEvaluationUseCase
) {
  const router = Router();

  /**
   * GET /api/events/status
   * Get Kafka and event processing status
   */
  router.get('/status', asyncHandler(async (req, res) => {
    const [kafkaStatus, processingStats] = await Promise.all([
      kafkaService.getHealthStatus(),
      eventDrivenEvaluation.getProcessingStats(),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      kafka: kafkaStatus,
      processing: processingStats,
      eventDriven: true,
    });
  }));

  /**
   * POST /api/events/weather/trigger
   * Manually trigger weather event for testing
   */
  router.post('/weather/trigger', asyncHandler(async (req, res) => {
    const schema = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      source: z.enum(['api', 'scheduled', 'manual']).default('manual'),
    });

    const { latitude, longitude, source } = schema.parse(req.body);

    // This will trigger the event-driven weather provider
    // which will fetch weather data and publish to Kafka
    const weatherData = await kafkaService.publishWeatherUpdate({
      latitude,
      longitude,
      temperatureC: 20 + Math.random() * 15, // Mock data for testing
      windSpeedMps: 1 + Math.random() * 8,
      precipitationMmHr: Math.random() > 0.7 ? Math.random() * 5 : 0,
      timestamp: new Date().toISOString(),
      source,
    });

    res.status(202).json({
      message: 'Weather event triggered and published to Kafka',
      location: { latitude, longitude },
      source,
      timestamp: new Date().toISOString(),
    });
  }));

  /**
   * POST /api/events/alerts/trigger
   * Manually trigger alert evaluation for testing
   */
  router.post('/alerts/trigger', asyncHandler(async (req, res) => {
    const schema = z.object({
      alertId: z.string().min(1),
      triggered: z.boolean(),
      currentValue: z.number(),
      threshold: z.number(),
      parameter: z.enum(['temperature', 'windSpeed', 'precipitation']),
    });

    const { alertId, triggered, currentValue, threshold, parameter } = schema.parse(req.body);

    await kafkaService.publishAlertEvaluation({
      alertId,
      alertName: `Test Alert ${alertId}`,
      triggered,
      previousState: !triggered, // Simulate state change
      currentValue,
      threshold,
      parameter,
      location: {
        latitude: 42.3601,
        longitude: -71.0589,
        cityName: 'Boston, MA',
      },
      timestamp: new Date().toISOString(),
      evaluationDurationMs: Math.floor(Math.random() * 1000) + 100,
    });

    res.status(202).json({
      message: 'Alert evaluation event triggered and published to Kafka',
      alertId,
      triggered,
      currentValue,
      threshold,
      timestamp: new Date().toISOString(),
    });
  }));

  /**
   * POST /api/events/notifications/send
   * Manually trigger notification for testing
   */
  router.post('/notifications/send', asyncHandler(async (req, res) => {
    const schema = z.object({
      alertId: z.string().min(1),
      type: z.enum(['email', 'sms', 'push']),
      recipient: z.string().min(1),
      message: z.string().min(1).max(500),
    });

    const { alertId, type, recipient, message } = schema.parse(req.body);

    await kafkaService.publishNotification({
      alertId,
      alertName: `Test Alert ${alertId}`,
      type,
      recipient,
      message,
      timestamp: new Date().toISOString(),
      deliveryStatus: 'pending',
    });

    res.status(202).json({
      message: 'Notification event triggered and published to Kafka',
      alertId,
      type,
      recipient,
      timestamp: new Date().toISOString(),
    });
  }));

  /**
   * GET /api/events/topics
   * List Kafka topics and their status
   */
  router.get('/topics', asyncHandler(async (req, res) => {
    const kafkaStatus = await kafkaService.getHealthStatus();
    
    res.json({
      topics: kafkaStatus.topics,
      consumerGroups: kafkaStatus.consumerGroups,
      connected: kafkaStatus.connected,
      timestamp: new Date().toISOString(),
    });
  }));

  /**
   * POST /api/events/batch/weather
   * Trigger batch weather events for multiple locations
   */
  router.post('/batch/weather', asyncHandler(async (req, res) => {
    const schema = z.object({
      locations: z.array(z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        name: z.string().optional(),
      })).min(1).max(10), // Limit to 10 locations
      source: z.enum(['api', 'scheduled', 'manual']).default('manual'),
    });

    const { locations, source } = schema.parse(req.body);

    const events = locations.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      temperatureC: 15 + Math.random() * 20, // Mock data
      windSpeedMps: 1 + Math.random() * 10,
      precipitationMmHr: Math.random() > 0.6 ? Math.random() * 8 : 0,
      timestamp: new Date().toISOString(),
      source,
    }));

    // Publish all events
    const publishPromises = events.map(event => 
      kafkaService.publishWeatherUpdate(event)
    );

    await Promise.allSettled(publishPromises);

    res.status(202).json({
      message: `Batch weather events triggered for ${locations.length} locations`,
      locations: locations.length,
      source,
      timestamp: new Date().toISOString(),
    });
  }));

  return router;
}
