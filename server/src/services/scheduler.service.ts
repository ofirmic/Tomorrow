import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { EvaluateAllAlertsUseCase } from '../business-logic/use-cases/evaluate-all-alerts.use-case.js';
import type { IAlertRepository } from '../business-logic/ports/alert-repository.js';
import type { IWeatherProvider } from '../business-logic/ports/weather-provider.js';
import type { INotificationGateway } from '../business-logic/ports/notification-gateway.js';
import type { AlertRecord } from '../business-logic/ports/alert-repository.js';
import { MockNotificationGateway } from '../infrastructure/notifications/mock-notification.gateway.js';

/**
 * Manages the scheduled evaluation of weather alerts.
 */
export class AlertEvaluationScheduler {
  private job?: ScheduledTask;

  constructor(
    private readonly cronExpression: string,
    private readonly evaluateAllAlertsUseCase: EvaluateAllAlertsUseCase,
    private readonly notificationGateway: INotificationGateway,
    private readonly alertRepository: IAlertRepository
  ) {}

  /**
   * Starts the cron job.
   */
  start() {
    if (this.job) {
      console.warn('Scheduler already running.');
      return;
    }

    this.job = cron.schedule(this.cronExpression, async () => {
      console.log('🗓️  Running scheduled alert evaluation...');
      try {
        const triggeredAlerts = await this.evaluateAllAlertsUseCase.execute();
        
        for (const alert of triggeredAlerts) {
          await this.sendNotification(alert);
        }

        console.log('✅ Scheduled alert evaluation finished.');
      } catch (error) {
        console.error('❌ Error during scheduled alert evaluation:', error);
      }
    });

    console.log(`⏰ Alert evaluation scheduler started with pattern: ${this.cronExpression}`);
  }

  /**
   * Stops the cron job.
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = undefined;
      console.log('🛑 Alert evaluation scheduler stopped.');
    }
  }

  private async sendNotification(alert: AlertRecord) {
    if (!alert.contactEmail && !alert.contactPhone) {
      return;
    }

    const subject = `Weather Alert: ${alert.name || 'Your Alert'} Triggered!`;
    const message = `
      Hello,

      This is a notification that your weather alert "${alert.name}" for location (${alert.latitude}, ${alert.longitude}) has been triggered.
      
      Condition: ${alert.parameter} ${alert.operator} ${alert.threshold}
      Current Value: ${alert.lastValue}

      Thank you,
      The Weather Alert System
    `;

    if (alert.contactEmail) {
      await this.notificationGateway.sendEmail(alert.contactEmail, subject, message);
    }

    if (alert.contactPhone) {
      await this.notificationGateway.sendSms(alert.contactPhone, message);
    }
  }
}

/**
 * Initializes and starts the global alert evaluation scheduler.
 * @param cronExpression - The cron pattern to schedule the job.
 * @param weatherProvider - The weather data provider.
 * @param alertRepository - The alert data repository.
 */
export function startAlertEvaluationScheduler(
  cronExpression: string,
  weatherProvider: IWeatherProvider,
  alertRepository: IAlertRepository
) {
  const useCase = new EvaluateAllAlertsUseCase(alertRepository, weatherProvider);
  const notificationGateway = new MockNotificationGateway(); // Instantiated here
  const scheduler = new AlertEvaluationScheduler(
    cronExpression,
    useCase,
    notificationGateway,
    alertRepository
  );
  scheduler.start();
  return scheduler;
}
