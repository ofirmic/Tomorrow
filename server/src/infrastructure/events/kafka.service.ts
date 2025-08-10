import { Kafka, type Producer, type Consumer, type EachMessagePayload } from 'kafkajs';
import { EventEmitter } from 'events';

/**
 * Event types for the weather alert system
 */
export interface WeatherEventData {
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  windSpeedMps: number | null;
  precipitationMmHr: number | null;
  timestamp: string;
  source: 'api' | 'scheduled' | 'manual';
}

export interface AlertEventData {
  alertId: string;
  alertName?: string;
  triggered: boolean;
  previousState?: boolean;
  currentValue: number;
  threshold: number;
  parameter: string;
  location: {
    latitude: number;
    longitude: number;
    cityName?: string;
  };
  timestamp: string;
  evaluationDurationMs: number;
}

export interface NotificationEventData {
  alertId: string;
  alertName?: string;
  type: 'email' | 'sms' | 'push';
  recipient: string;
  message: string;
  timestamp: string;
  deliveryStatus: 'pending' | 'sent' | 'failed';
}

/**
 * Kafka Topics Configuration
 */
export const KAFKA_TOPICS = {
  WEATHER_UPDATES: 'weather-updates',
  ALERT_EVALUATIONS: 'alert-evaluations', 
  NOTIFICATIONS: 'notifications',
  SYSTEM_EVENTS: 'system-events',
} as const;

/**
 * Enterprise Kafka Service for Event-Driven Architecture
 * Handles real-time weather data streaming and alert processing
 */
export class KafkaService extends EventEmitter {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private isConnected = false;

  constructor(
    private readonly brokerUrl: string = 'localhost:9092',
    private readonly clientId: string = 'weather-alerts-service'
  ) {
    super();
    
    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: [this.brokerUrl],
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });
  }

  /**
   * Initialize Kafka connection and create topics
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 Connecting to Kafka...');
      
      // Connect producer
      await this.producer.connect();
      
      // Create topics if they don't exist
      await this.createTopics();
      
      this.isConnected = true;
      console.log('✅ Kafka connected successfully');
      
      this.emit('connected');
    } catch (error) {
      console.error('❌ Failed to connect to Kafka:', error);
      throw error;
    }
  }

  /**
   * Create necessary Kafka topics
   */
  private async createTopics(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();

    const topics = Object.values(KAFKA_TOPICS).map(topic => ({
      topic,
      numPartitions: 3, // For better parallelism
      replicationFactor: 1, // Single broker setup
      configEntries: [
        { name: 'retention.ms', value: '86400000' }, // 24 hours
        { name: 'cleanup.policy', value: 'delete' },
      ],
    }));

    try {
      await admin.createTopics({
        topics,
        waitForLeaders: true,
      });
      console.log('📝 Kafka topics created/verified');
    } catch (error: any) {
      // Topics might already exist, that's ok
      if (!error.message?.includes('already exists')) {
        console.error('Failed to create topics:', error);
      }
    } finally {
      await admin.disconnect();
    }
  }

  /**
   * Publish weather update event
   */
  async publishWeatherUpdate(data: WeatherEventData): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka not connected');
    }

    const message = {
      key: `weather-${data.latitude}-${data.longitude}`,
      value: JSON.stringify(data),
      timestamp: new Date(data.timestamp).getTime().toString(),
      headers: {
        source: data.source,
        eventType: 'weather-update',
      },
    };

    try {
      await this.producer.send({
        topic: KAFKA_TOPICS.WEATHER_UPDATES,
        messages: [message],
      });

      console.log(`📡 Published weather update for ${data.latitude}, ${data.longitude}`);
      this.emit('weatherPublished', data);
    } catch (error) {
      console.error('Failed to publish weather update:', error);
      throw error;
    }
  }

  /**
   * Publish alert evaluation event
   */
  async publishAlertEvaluation(data: AlertEventData): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka not connected');
    }

    const message = {
      key: `alert-${data.alertId}`,
      value: JSON.stringify(data),
      timestamp: new Date(data.timestamp).getTime().toString(),
      headers: {
        alertId: data.alertId,
        triggered: data.triggered.toString(),
        eventType: 'alert-evaluation',
      },
    };

    try {
      await this.producer.send({
        topic: KAFKA_TOPICS.ALERT_EVALUATIONS,
        messages: [message],
      });

      console.log(`🚨 Published alert evaluation: ${data.alertId} (triggered: ${data.triggered})`);
      this.emit('alertPublished', data);
    } catch (error) {
      console.error('Failed to publish alert evaluation:', error);
      throw error;
    }
  }

  /**
   * Publish notification event
   */
  async publishNotification(data: NotificationEventData): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka not connected');
    }

    const message = {
      key: `notification-${data.alertId}-${Date.now()}`,
      value: JSON.stringify(data),
      timestamp: new Date(data.timestamp).getTime().toString(),
      headers: {
        alertId: data.alertId,
        type: data.type,
        eventType: 'notification',
      },
    };

    try {
      await this.producer.send({
        topic: KAFKA_TOPICS.NOTIFICATIONS,
        messages: [message],
      });

      console.log(`📧 Published notification: ${data.type} for alert ${data.alertId}`);
      this.emit('notificationPublished', data);
    } catch (error) {
      console.error('Failed to publish notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe to weather updates
   */
  async subscribeToWeatherUpdates(
    groupId: string,
    handler: (data: WeatherEventData) => Promise<void>
  ): Promise<void> {
    const consumer = this.kafka.consumer({ 
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    await consumer.subscribe({ 
      topic: KAFKA_TOPICS.WEATHER_UPDATES,
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ message, partition, topic }: EachMessagePayload) => {
        try {
          const data = JSON.parse(message.value!.toString()) as WeatherEventData;
          console.log(`🌤️ Received weather update: ${data.latitude}, ${data.longitude}`);
          
          await handler(data);
        } catch (error) {
          console.error('Error processing weather update:', error);
          // In production, you might want to send to a dead letter queue
        }
      },
    });

    this.consumers.set(`weather-${groupId}`, consumer);
  }

  /**
   * Subscribe to alert evaluations
   */
  async subscribeToAlertEvaluations(
    groupId: string,
    handler: (data: AlertEventData) => Promise<void>
  ): Promise<void> {
    const consumer = this.kafka.consumer({ 
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    await consumer.subscribe({ 
      topic: KAFKA_TOPICS.ALERT_EVALUATIONS,
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        try {
          const data = JSON.parse(message.value!.toString()) as AlertEventData;
          console.log(`🚨 Received alert evaluation: ${data.alertId} (triggered: ${data.triggered})`);
          
          await handler(data);
        } catch (error) {
          console.error('Error processing alert evaluation:', error);
        }
      },
    });

    this.consumers.set(`alerts-${groupId}`, consumer);
  }

  /**
   * Subscribe to notifications
   */
  async subscribeToNotifications(
    groupId: string,
    handler: (data: NotificationEventData) => Promise<void>
  ): Promise<void> {
    const consumer = this.kafka.consumer({ 
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    await consumer.subscribe({ 
      topic: KAFKA_TOPICS.NOTIFICATIONS,
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        try {
          const data = JSON.parse(message.value!.toString()) as NotificationEventData;
          console.log(`📧 Received notification event: ${data.type} for ${data.alertId}`);
          
          await handler(data);
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      },
    });

    this.consumers.set(`notifications-${groupId}`, consumer);
  }

  /**
   * Get Kafka health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    topics: string[];
    consumerGroups: string[];
  }> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const metadata = await admin.fetchTopicMetadata({
        topics: Object.values(KAFKA_TOPICS),
      });
      
      const topics = metadata.topics.map(t => t.name);
      
      await admin.disconnect();
      
      return {
        connected: this.isConnected,
        topics,
        consumerGroups: Array.from(this.consumers.keys()),
      };
    } catch (error) {
      return {
        connected: false,
        topics: [],
        consumerGroups: [],
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from Kafka...');
    
    // Disconnect all consumers
    for (const [name, consumer] of this.consumers.entries()) {
      try {
        await consumer.disconnect();
        console.log(`✅ Disconnected consumer: ${name}`);
      } catch (error) {
        console.error(`Failed to disconnect consumer ${name}:`, error);
      }
    }
    
    // Disconnect producer
    try {
      await this.producer.disconnect();
      console.log('✅ Disconnected producer');
    } catch (error) {
      console.error('Failed to disconnect producer:', error);
    }
    
    this.isConnected = false;
    this.consumers.clear();
    this.emit('disconnected');
  }
}
