// Data Transfer Objects - API contract definitions

import { z } from 'zod';

// Request DTOs
export const CreateAlertRequestSchema = z.object({
  name: z.string().min(1).optional().nullable(),
  description: z.string().optional().nullable(),
  cityName: z.string().min(1).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  parameter: z.enum(['TEMPERATURE', 'WIND_SPEED', 'PRECIPITATION']),
  operator: z.enum(['GT', 'GTE', 'LT', 'LTE', 'EQ', 'NE']).default('GT'),
  threshold: z.number(),
  units: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
});

export const GetAlertsRequestSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
});

export const GetWeatherRequestSchema = z.object({
  lat: z.string().refine((val) => !isNaN(Number(val)), 'Invalid latitude'),
  lon: z.string().refine((val) => !isNaN(Number(val)), 'Invalid longitude'),
  city: z.string().optional(),
});

// Response DTOs
export interface AlertResponseDto {
  id: string;
  name: string | null;
  description: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  parameter: string;
  operator: string;
  threshold: number;
  units: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  lastValue: number | null;
  lastState: string | null;
  lastEvaluatedAt: string | null;
}

export interface WeatherResponseDto {
  temperatureC: number | null;
  windSpeedMps: number | null;
  precipitationMmHr: number | null;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface AlertStateResponseDto {
  id: string;
  name: string | null;
  lastState: boolean;
  lastValue: number | null;
  lastEvaluatedAt: string | null;
}

// Type inference from schemas
export type CreateAlertRequest = z.infer<typeof CreateAlertRequestSchema>;
export type GetAlertsRequest = z.infer<typeof GetAlertsRequestSchema>;
export type GetWeatherRequest = z.infer<typeof GetWeatherRequestSchema>;
