import Queue from 'bull';
import Redis from 'redis';

// Job types for type safety
export interface WeatherJobData {
  latitude: number;
  longitude: number;
  alertId?: string;
  retryCount?: number;
}

export interface AlertBatchJobData {
  alertIds: string[];
  timestamp: number;
}

export interface NotificationJobData {
  alertId: string;
  alertName?: string;
  message: string;
  recipients: string[];
  type: 'email' | 'sms';
}

/**
 * Enterprise-grade job queue service using Redis + Bull
 * Demonstrates async processing patterns for scalable systems
 */
export class JobQueueService {
  private weatherQueue: Queue.Queue<WeatherJobData>;
  private alertBatchQueue: Queue.Queue<AlertBatchJobData>;
  private notificationQueue: Queue.Queue<NotificationJobData>;
  private redisClient: Redis.RedisClientType;

  constructor(redisUrl: string = 'redis://localhost:6379') {
    // Initialize Redis connection
    this.redisClient = Redis.createClient({ url: redisUrl });
    
    // Initialize job queues with different priorities and settings
    this.weatherQueue = new Queue('weather processing', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    });

    this.alertBatchQueue = new Queue('alert batch processing', redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        delay: 1000, // 1 second delay for batching
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    });

    this.notificationQueue = new Queue('notifications', redisUrl, {
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.setupJobProcessors();
    this.setupEventHandlers();
  }

  /**
   * Add weather fetching job to queue (async processing)
   * Use this for batch weather updates or when immediate response isn't needed
   */
  async addWeatherJob(data: WeatherJobData, priority: number = 0): Promise<Queue.Job<WeatherJobData>> {
    return this.weatherQueue.add('fetch-weather', data, {
      priority, // Higher number = higher priority
      delay: data.retryCount ? (data.retryCount * 5000) : 0, // Progressive delay
    });
  }

  /**
   * Add batch alert evaluation job
   * Processes multiple alerts efficiently
   */
  async addAlertBatchJob(data: AlertBatchJobData): Promise<Queue.Job<AlertBatchJobData>> {
    return this.alertBatchQueue.add('evaluate-alerts-batch', data, {
      // Use jobId to prevent duplicate processing
      jobId: `batch-${data.timestamp}`,
    });
  }

  /**
   * Add notification job (email/SMS)
   * Reliable delivery with retries
   */
  async addNotificationJob(data: NotificationJobData): Promise<Queue.Job<NotificationJobData>> {
    return this.notificationQueue.add('send-notification', data, {
      priority: data.type === 'sms' ? 10 : 5, // SMS higher priority
    });
  }

  /**
   * Setup job processors - the actual work functions
   */
  private setupJobProcessors(): void {
    // Weather processing worker
    this.weatherQueue.process('fetch-weather', 5, async (job) => {
      const { latitude, longitude, alertId } = job.data;
      
      console.log(`🌤️ Processing weather job for ${latitude}, ${longitude}`);
      
      // Simulate weather API call with proper error handling
      try {
        // In real implementation, call your weather service here
        await this.simulateWeatherApiCall(latitude, longitude);
        
        // Update job progress
        job.progress(100);
        
        return { 
          status: 'completed', 
          location: { latitude, longitude },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`❌ Weather job failed:`, error);
        throw error; // Bull will handle retries
      }
    });

    // Alert batch processing worker
    this.alertBatchQueue.process('evaluate-alerts-batch', 3, async (job) => {
      const { alertIds, timestamp } = job.data;
      
      console.log(`🚨 Processing alert batch: ${alertIds.length} alerts`);
      
      const results = [];
      for (let i = 0; i < alertIds.length; i++) {
        const alertId = alertIds[i];
        
        // Skip if alertId is invalid
        if (!alertId) {
          console.warn(`Skipping invalid alertId at index ${i}`);
          continue;
        }
        
        // Update progress
        job.progress((i / alertIds.length) * 100);
        
        // Process individual alert
        const result = await this.processAlert(alertId);
        results.push(result);
        
        // If alert is triggered, queue notification
        if (result.triggered) {
          await this.addNotificationJob({
            alertId,
            alertName: `Alert ${alertId}`,
            message: `Alert ${alertId} has been triggered!`,
            recipients: ['user@example.com'],
            type: 'email',
          });
        }
      }
      
      return { 
        processed: alertIds.length, 
        triggered: results.filter(r => r.triggered).length,
        timestamp,
      };
    });

    // Notification processing worker
    this.notificationQueue.process('send-notification', 10, async (job) => {
      const { alertId, message, recipients, type } = job.data;
      
      console.log(`📧 Sending ${type} notification for alert ${alertId}`);
      
      // Simulate notification sending
      await this.simulateNotificationSend(type, message, recipients);
      
      return { 
        status: 'sent', 
        type, 
        recipients: recipients.length,
        alertId,
      };
    });
  }

  /**
   * Setup event handlers for monitoring and observability
   */
  private setupEventHandlers(): void {
    // Weather queue events
    this.weatherQueue.on('completed', (job, result) => {
      console.log(`✅ Weather job ${job.id} completed:`, result);
    });

    this.weatherQueue.on('failed', (job, err) => {
      console.error(`❌ Weather job ${job.id} failed:`, err.message);
    });

    // Alert batch queue events
    this.alertBatchQueue.on('completed', (job, result) => {
      console.log(`✅ Alert batch ${job.id} completed:`, result);
    });

    // Notification queue events
    this.notificationQueue.on('completed', (job, result) => {
      console.log(`✅ Notification ${job.id} sent:`, result);
    });

    this.notificationQueue.on('failed', (job, err) => {
      console.error(`❌ Notification ${job.id} failed:`, err.message);
    });
  }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats() {
    const [weatherStats, alertStats, notificationStats] = await Promise.all([
      this.getQueueInfo(this.weatherQueue),
      this.getQueueInfo(this.alertBatchQueue),
      this.getQueueInfo(this.notificationQueue),
    ]);

    return {
      weather: weatherStats,
      alerts: alertStats,
      notifications: notificationStats,
    };
  }

  private async getQueueInfo(queue: Queue.Queue) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
    ]);

    return {
      name: queue.name,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /**
   * Simulate weather API call (replace with real implementation)
   */
  private async simulateWeatherApiCall(latitude: number, longitude: number): Promise<void> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error('Weather API timeout');
    }
  }

  /**
   * Simulate alert processing (replace with real implementation)
   */
  private async processAlert(alertId: string): Promise<{ alertId: string; triggered: boolean }> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));
    
    // Simulate random alert triggering
    return {
      alertId,
      triggered: Math.random() < 0.3, // 30% chance
    };
  }

  /**
   * Simulate notification sending (replace with real implementation)
   */
  private async simulateNotificationSend(type: string, message: string, recipients: string[]): Promise<void> {
    // Simulate sending latency
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) {
      throw new Error(`${type} service unavailable`);
    }
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    await Promise.all([
      this.weatherQueue.close(),
      this.alertBatchQueue.close(),
      this.notificationQueue.close(),
      this.redisClient.quit(),
    ]);
  }
}
