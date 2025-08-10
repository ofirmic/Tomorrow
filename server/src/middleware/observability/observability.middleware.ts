import pinoHttp from 'pino-http';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from 'express';

export const requestIdMiddleware: RequestHandler = (req, _res, next) => {
  (req as any).id = (req.headers['x-request-id'] as string) || uuidv4();
  next();
};

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
export const loggerMiddleware = pinoHttp({
  logger,
  customProps: (req) => ({ requestId: (req as any).id }),
});


