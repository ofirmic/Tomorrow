import type { IAlertRepository } from '../ports/alert-repository.js';
import type { IWeatherProvider } from '../ports/weather-provider.js';
import { evaluateAlertCondition } from './evaluate-alert.use-case.js';
import type { AlertRecord as Alert } from '../ports/alert-repository.js';

/**
 * Use case for evaluating a single weather alert.
 * This encapsulates the business logic for fetching weather and checking conditions.
 */
export class EvaluateSingleAlertUseCase {
  constructor(
    private readonly alertRepository: IAlertRepository,
    private readonly weatherProvider: IWeatherProvider
  ) {}

  async execute(alertId: string): Promise<{ triggered: boolean; value: number | null }> {
    const alert = (await this.alertRepository.getAllAlerts()).find(a => a.id === alertId) || null;

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.latitude === null || alert.longitude === null) {
      console.warn(`Skipping alert ${alert.id} due to missing coordinates.`);
      return { triggered: false, value: null };
    }

    const weatherData = await this.weatherProvider.getRealtime(
      alert.latitude,
      alert.longitude,
      'scheduled'
    );

    const { triggered, currentValue } = evaluateAlertCondition({
      parameter: alert.parameter,
      operator: alert.operator,
      threshold: alert.threshold,
      values: {
        temperatureC: weatherData.temperatureC ?? null,
        windSpeedMps: weatherData.windSpeedMps ?? null,
        precipitationMmHr: weatherData.precipitationMmHr ?? 0,
      },
    });

    await this.alertRepository.updateAlertAfterEvaluation(alert.id, {
      currentValue,
      triggered,
    });

    console.log(
      `🔔 Evaluated alert "${alert.name || alert.id}": Condition ${
        triggered ? 'MET' : 'NOT MET'
      } (value: ${currentValue})`
    );

    return { triggered, value: currentValue };
  }
}

/**
 * Use case for evaluating all active alerts.
 * This is the primary entry point for the scheduled job.
 */
export class EvaluateAllAlertsUseCase {
  constructor(
    private readonly alertRepository: IAlertRepository,
    private readonly weatherProvider: IWeatherProvider
  ) {}

  async execute(): Promise<Alert[]> {
    const alerts = await this.alertRepository.getAllAlerts();
    const triggeredAlerts: Alert[] = [];

    for (const alert of alerts) {
      if (alert.latitude === null || alert.longitude === null) {
        console.warn(`Skipping alert ${alert.id} due to missing coordinates.`);
        continue;
      }

      const weatherData = await this.weatherProvider.getRealtime(
        alert.latitude,
        alert.longitude,
        'scheduled'
      );

      const { triggered, currentValue } = evaluateAlertCondition({
        parameter: alert.parameter,
        operator: alert.operator,
        threshold: alert.threshold,
        values: {
          temperatureC: weatherData.temperatureC ?? null,
          windSpeedMps: weatherData.windSpeedMps ?? null,
          precipitationMmHr: weatherData.precipitationMmHr ?? 0,
        },
      });

      await this.alertRepository.updateAlertAfterEvaluation(alert.id, {
        currentValue,
        triggered,
      });

      console.log(
        `🔔 Evaluated alert "${alert.name || alert.id}": Condition ${
          triggered ? 'MET' : 'NOT MET'
        } (value: ${currentValue})`
      );

      if (triggered) {
        triggeredAlerts.push({ ...alert, lastValue: currentValue });
      }
    }

    return triggeredAlerts;
  }
}
