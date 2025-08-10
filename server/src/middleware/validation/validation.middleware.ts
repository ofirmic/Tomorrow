import type { RequestHandler } from 'express';
import { z } from 'zod';

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return asyncHandler((req, res, next) => {
    try {
      const parsed = schema.parse(req.query);
      (req as any).query = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        });
      }
      next(error);
    }
  });
};

export const validateBody = (schema: z.ZodSchema) => {
  return asyncHandler((req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        });
      }
      next(error);
    }
  });
};
