// Note: Do not import Prisma types here to keep this port decoupled from the ORM

export type AlertParameter = 'TEMPERATURE' | 'WIND_SPEED' | 'PRECIPITATION';
export type ComparisonOperator = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NE';

export type AlertRecord = {
  id: string;
  name: string | null;
  description: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  parameter: AlertParameter;
  operator: ComparisonOperator;
  threshold: number;
  units: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastValue: number | null;
  lastState: boolean | null;
  lastEvaluatedAt: Date | null;
};

export interface CreateAlertInput {
  name?: string | null;
  description?: string | null;
  cityName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  parameter: AlertParameter;
  operator: ComparisonOperator;
  threshold: number;
  units?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface IAlertRepository {
  createAlert(input: CreateAlertInput): Promise<AlertRecord>;
  listAlerts(): Promise<AlertRecord[]>;
  getAllAlerts(): Promise<AlertRecord[]>;
  listAlertsPaginated(page: number, pageSize: number): Promise<{ items: AlertRecord[]; total: number }>;
  updateAlertAfterEvaluation(
    alertId: string,
    update: { currentValue: number | null; triggered: boolean; createHistory?: boolean }
  ): Promise<void>;
  deleteAlert(id: string): Promise<void>;
  deleteAllAlerts(): Promise<{ count: number }>;
}


