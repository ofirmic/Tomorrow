// Domain Models - Pure business entities and value objects

export type AlertParameter = 'TEMPERATURE' | 'WIND_SPEED' | 'PRECIPITATION';
export type ComparisonOperator = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NE';
export type AlertState = 'TRIGGERED' | 'NOT_TRIGGERED';

// Value Objects
export interface WeatherCondition {
  readonly temperatureC: number | null;
  readonly windSpeedMps: number | null;
  readonly precipitationMmHr: number | null;
}

export interface AlertCondition {
  readonly parameter: AlertParameter;
  readonly operator: ComparisonOperator;
  readonly threshold: number;
}

export interface Location {
  readonly latitude: number;
  readonly longitude: number;
}

// Domain Entities
export interface Alert {
  readonly id: string;
  readonly name: string | null;
  readonly description: string | null;
  readonly location: Location;
  readonly condition: AlertCondition;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastEvaluatedAt: Date | null;
  readonly lastState: AlertState | null;
  readonly lastValue: number | null;
}

export interface AlertEvaluation {
  readonly id: string;
  readonly alertId: string;
  readonly triggered: boolean;
  readonly value: number;
  readonly evaluatedAt: Date;
}

// Domain Rules
export class AlertDomainRules {
  static isValidThreshold(parameter: AlertParameter, threshold: number): boolean {
    switch (parameter) {
      case 'TEMPERATURE':
        return threshold >= -100 && threshold <= 100; // Celsius
      case 'WIND_SPEED':
        return threshold >= 0 && threshold <= 200; // m/s
      case 'PRECIPITATION':
        return threshold >= 0 && threshold <= 1000; // mm/hr
      default:
        return false;
    }
  }

  static isValidLocation(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && 
           longitude >= -180 && longitude <= 180;
  }
}
