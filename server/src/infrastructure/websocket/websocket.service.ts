import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { KafkaService, type AlertEventData, type WeatherEventData } from '../events/kafka.service.js';

/**
 * WebSocket message types for real-time client communication
 */
export interface WebSocketMessage {
  type: 'weather-update' | 'alert-evaluation' | 'system-status' | 'subscription' | 'error';
  data: any;
  timestamp: string;
}

export interface ClientSubscription {
  weatherLocations: Array<{ latitude: number; longitude: number }>;
  alertIds: string[];
  systemUpdates: boolean;
}

/**
 * Real-time WebSocket Service
 * Streams Kafka events to connected web clients for live updates
 */
export class WebSocketService {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientSubscription>();
  private kafkaService: KafkaService;

  constructor(server: Server, kafkaService: KafkaService) {
    this.kafkaService = kafkaService;
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: true,
    });

    this.setupWebSocketServer();
    this.subscribeToKafkaEvents();
  }

  /**
   * Setup WebSocket server with connection handling
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      console.log(`🔌 WebSocket client connected: ${clientId}`);
      
      // Initialize client subscription
      this.clients.set(ws, {
        weatherLocations: [],
        alertIds: [],
        systemUpdates: false,
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'system-status',
        data: { 
          status: 'connected', 
          clientId,
          availableSubscriptions: ['weather-update', 'alert-evaluation', 'system-status'],
        },
        timestamp: new Date().toISOString(),
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`🔌 WebSocket client disconnected: ${clientId}`);
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    console.log('🌐 WebSocket server started on /ws');
  }

  /**
   * Handle incoming client messages (subscriptions, etc.)
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    try {
      switch (message.type) {
        case 'subscribe-weather':
          this.handleWeatherSubscription(ws, message.data);
          break;
        
        case 'subscribe-alerts':
          this.handleAlertSubscription(ws, message.data);
          break;
        
        case 'subscribe-system':
          this.handleSystemSubscription(ws, message.data);
          break;
        
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.data);
          break;
        
        case 'ping':
          this.sendMessage(ws, {
            type: 'system-status',
            data: { pong: true },
            timestamp: new Date().toISOString(),
          });
          break;
        
        default:
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      this.sendError(ws, 'Error processing message');
    }
  }

  /**
   * Handle weather location subscription
   */
  private handleWeatherSubscription(ws: WebSocket, data: any): void {
    const subscription = this.clients.get(ws);
    if (!subscription) return;

    if (data.locations && Array.isArray(data.locations)) {
      subscription.weatherLocations = data.locations.filter((loc: any) => 
        typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
      );
      
      console.log(`📍 Client subscribed to ${subscription.weatherLocations.length} weather locations`);
      
      this.sendMessage(ws, {
        type: 'subscription',
        data: { 
          weather: subscription.weatherLocations.length,
          message: 'Weather subscription updated',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle alert subscription
   */
  private handleAlertSubscription(ws: WebSocket, data: any): void {
    const subscription = this.clients.get(ws);
    if (!subscription) return;

    if (data.alertIds && Array.isArray(data.alertIds)) {
      subscription.alertIds = data.alertIds.filter((id: any) => typeof id === 'string');
      
      console.log(`🚨 Client subscribed to ${subscription.alertIds.length} alerts`);
      
      this.sendMessage(ws, {
        type: 'subscription',
        data: { 
          alerts: subscription.alertIds.length,
          message: 'Alert subscription updated',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle system updates subscription
   */
  private handleSystemSubscription(ws: WebSocket, data: any): void {
    const subscription = this.clients.get(ws);
    if (!subscription) return;

    subscription.systemUpdates = Boolean(data.enabled);
    
    this.sendMessage(ws, {
      type: 'subscription',
      data: { 
        system: subscription.systemUpdates,
        message: 'System updates subscription updated',
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle unsubscribe requests
   */
  private handleUnsubscribe(ws: WebSocket, data: any): void {
    const subscription = this.clients.get(ws);
    if (!subscription) return;

    if (data.type === 'weather') {
      subscription.weatherLocations = [];
    } else if (data.type === 'alerts') {
      subscription.alertIds = [];
    } else if (data.type === 'system') {
      subscription.systemUpdates = false;
    }

    this.sendMessage(ws, {
      type: 'subscription',
      data: { message: `Unsubscribed from ${data.type}` },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Subscribe to Kafka events and broadcast to WebSocket clients
   */
  private async subscribeToKafkaEvents(): Promise<void> {
    // Subscribe to weather updates
    await this.kafkaService.subscribeToWeatherUpdates(
      'websocket-broadcasters',
      this.broadcastWeatherUpdate.bind(this)
    );

    // Subscribe to alert evaluations
    await this.kafkaService.subscribeToAlertEvaluations(
      'websocket-broadcasters',
      this.broadcastAlertEvaluation.bind(this)
    );

    console.log('📡 WebSocket service subscribed to Kafka events');
  }

  /**
   * Broadcast weather update to subscribed clients
   */
  private async broadcastWeatherUpdate(weatherData: WeatherEventData): Promise<void> {
    const message: WebSocketMessage = {
      type: 'weather-update',
      data: weatherData,
      timestamp: new Date().toISOString(),
    };

    let broadcastCount = 0;

    this.clients.forEach((subscription, ws) => {
      if (this.isClientInterestedInWeather(subscription, weatherData)) {
        this.sendMessage(ws, message);
        broadcastCount++;
      }
    });

    if (broadcastCount > 0) {
      console.log(`📡 Broadcasted weather update to ${broadcastCount} clients`);
    }
  }

  /**
   * Broadcast alert evaluation to subscribed clients
   */
  private async broadcastAlertEvaluation(alertData: AlertEventData): Promise<void> {
    const message: WebSocketMessage = {
      type: 'alert-evaluation',
      data: alertData,
      timestamp: new Date().toISOString(),
    };

    let broadcastCount = 0;

    this.clients.forEach((subscription, ws) => {
      if (this.isClientInterestedInAlert(subscription, alertData)) {
        this.sendMessage(ws, message);
        broadcastCount++;
      }
    });

    if (broadcastCount > 0) {
      console.log(`📡 Broadcasted alert evaluation to ${broadcastCount} clients`);
    }
  }

  /**
   * Check if client is interested in weather update
   */
  private isClientInterestedInWeather(subscription: ClientSubscription, weatherData: WeatherEventData): boolean {
    return subscription.weatherLocations.some(loc => 
      Math.abs(loc.latitude - weatherData.latitude) < 0.01 &&
      Math.abs(loc.longitude - weatherData.longitude) < 0.01
    );
  }

  /**
   * Check if client is interested in alert
   */
  private isClientInterestedInAlert(subscription: ClientSubscription, alertData: AlertEventData): boolean {
    return subscription.alertIds.includes(alertData.alertId) ||
           subscription.systemUpdates; // System subscribers get all alerts
  }

  /**
   * Send message to specific WebSocket client
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: { error },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast system message to all clients
   */
  broadcastSystemMessage(message: string, data?: any): void {
    const wsMessage: WebSocketMessage = {
      type: 'system-status',
      data: { message, ...data },
      timestamp: new Date().toISOString(),
    };

    this.clients.forEach((subscription, ws) => {
      if (subscription.systemUpdates) {
        this.sendMessage(ws, wsMessage);
      }
    });
  }

  /**
   * Get connected clients statistics
   */
  getStats(): {
    connectedClients: number;
    totalSubscriptions: {
      weather: number;
      alerts: number;
      system: number;
    };
  } {
    let weatherSubs = 0;
    let alertSubs = 0;
    let systemSubs = 0;

    this.clients.forEach(subscription => {
      weatherSubs += subscription.weatherLocations.length;
      alertSubs += subscription.alertIds.length;
      if (subscription.systemUpdates) systemSubs++;
    });

    return {
      connectedClients: this.clients.size,
      totalSubscriptions: {
        weather: weatherSubs,
        alerts: alertSubs,
        system: systemSubs,
      },
    };
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    console.log('🔌 Closing WebSocket server...');
    
    // Close all client connections
    this.clients.forEach((_, ws) => {
      ws.close(1000, 'Server shutting down');
    });
    
    // Close WebSocket server
    this.wss.close();
    console.log('✅ WebSocket server closed');
  }
}
