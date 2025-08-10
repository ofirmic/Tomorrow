/**
 * Port for sending notifications (email, SMS, etc.).
 * This interface abstracts the underlying notification provider.
 */
export interface INotificationGateway {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSms(to: string, message: string): Promise<void>;
}
