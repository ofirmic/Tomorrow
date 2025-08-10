import type { INotificationGateway } from '../../business-logic/ports/notification-gateway.js';

/**
 * A mock implementation of the notification gateway for development and testing.
 * It simulates sending notifications by logging to the console.
 */
export class MockNotificationGateway implements INotificationGateway {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log('✉️  Mock Email Sent');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log('  Body:');
    console.log(body.trim().replace(/^/gm, '    '));
    await this.simulateDelay();
  }

  async sendSms(to: string, message: string): Promise<void> {
    console.log('📱 Mock SMS Sent');
    console.log(`  To: ${to}`);
    console.log(`  Message: ${message}`);
    await this.simulateDelay();
  }

  private simulateDelay(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
