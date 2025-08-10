import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { json } from 'express';

// Business Logic
import { loadEnv } from './infrastructure/configuration/env.js';

// Infrastructure
import { TomorrowWeatherProvider } from './infrastructure/external-apis/tomorrow-weather.provider.js';
import { EventDrivenWeatherProvider } from './infrastructure/external-apis/event-driven-weather.provider.js';
import { PrismaAlertRepository } from './infrastructure/persistence/prisma-alert.repository.js';
import { KafkaService } from './infrastructure/events/kafka.service.js';
import { EventDrivenAlertEvaluationUseCase } from './business-logic/use-cases/event-driven-alert-evaluation.use-case.js';
import { WebSocketService } from './infrastructure/websocket/websocket.service.js';
import { MockNotificationGateway } from './infrastructure/notifications/mock-notification.gateway.js';

// API Layer
import { createAlertsController } from './api/controllers/alerts.controller.js';
import { createWeatherRoutes } from './api/routes/weather.routes.js';
import { createEventsController } from './api/controllers/events.controller.js';

// Middleware
import { errorMiddleware, notFoundMiddleware } from './middleware/error-handling/error.middleware.js';
import { loggerMiddleware, requestIdMiddleware } from './middleware/observability/observability.middleware.js';
import { correlationMiddleware, responseTimeMiddleware } from './middleware/observability/correlation.middleware.js';
import { weatherRateLimiter } from './middleware/security/rate-limit.middleware.js';
import { securityHeadersMiddleware, requestSizeMiddleware } from './middleware/security/security.middleware.js';
import { createVersionMiddleware } from './api/versioning/api-version.middleware.js';

// Utilities
import { GracefulShutdown } from './shared/utils/graceful-shutdown.js';

// Load configuration
const config = loadEnv();

// Initialize Kafka service
const kafkaService = new KafkaService();

// Initialize infrastructure
const weatherProvider = new TomorrowWeatherProvider({ 
  apiKey: config.TOMORROW_API_KEY, 
  units: config.UNITS 
});

// Create event-driven weather provider
const eventDrivenWeatherProvider = new EventDrivenWeatherProvider(
  { apiKey: config.TOMORROW_API_KEY, units: config.UNITS },
  kafkaService
);

const alertRepo = new PrismaAlertRepository();
const notificationGateway = new MockNotificationGateway();

// Initialize Express app
const app = express();

// Security middleware (should be first)
app.use(securityHeadersMiddleware);
app.use(requestSizeMiddleware);

// Core middleware
app.use(cors());
app.use(json({ limit: '1mb' })); // Explicit size limit

// Observability middleware
app.use(correlationMiddleware);
app.use(responseTimeMiddleware);
app.use(requestIdMiddleware);
app.use(loggerMiddleware);

// API versioning middleware
app.use(createVersionMiddleware({
  defaultVersion: 'v1',
  supportedVersions: ['v1'],
  deprecatedVersions: []
}));

// Health check endpoint
app.get('/health', (_req, res) => {
  const apiStatus = weatherProvider.getApiStatus?.() || { status: 'unknown' };
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    weather_api: apiStatus
  });
});

// Development endpoint to reset circuit breaker
app.post('/dev/reset-circuit-breaker', (_req, res) => {
  if (typeof weatherProvider.resetCircuitBreaker === 'function') {
    weatherProvider.resetCircuitBreaker();
    res.json({ message: 'Circuit breaker reset successfully' });
  } else {
    res.status(404).json({ error: 'Reset method not available' });
  }
});

// API routes
app.use('/api/alerts', createAlertsController(alertRepo));
app.use('/api/weather', weatherRateLimiter, createWeatherRoutes(eventDrivenWeatherProvider));

// Kafka events routes (will be initialized after Kafka connection)
let eventsController: any = null;

// Error handling (should be last)
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Start server
const port = config.PORT;
const server = app.listen(port, async () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🌐 WebSocket endpoint: ws://localhost:${port}/ws`);
  console.log(`🏗️ Architecture: Hexagonal + Clean + DDD + Event Streaming`);
  console.log(`🛡️ Security: Headers + Rate Limiting + Validation`);
  console.log(`📊 Observability: Logging + Tracing + Circuit Breaker`);
  console.log(`📡 Event Streaming: Kafka + WebSocket`);

  try {
    // Initialize Kafka connection
    await kafkaService.connect();
    
    // Initialize WebSocket service
    const webSocketService = new WebSocketService(server, kafkaService);
    
    // Initialize event-driven alert evaluation
    const eventDrivenAlertEvaluation = new EventDrivenAlertEvaluationUseCase(
      alertRepo,
      kafkaService
    );
    await eventDrivenAlertEvaluation.startEventProcessing();
    
    // Initialize events controller after Kafka is connected
    eventsController = createEventsController(kafkaService, eventDrivenAlertEvaluation);
    app.use('/api/events', eventsController);
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
});

// Setup graceful shutdown with Kafka cleanup
const gracefulShutdown = new GracefulShutdown();
gracefulShutdown.setup(server);