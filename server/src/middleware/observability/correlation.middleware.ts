import type { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Request context for correlation
export interface RequestContext {
  requestId: string;
  userId?: string | undefined;
  sessionId?: string | undefined;
  userAgent?: string | undefined;
  ip?: string | undefined;
  startTime: number;
  path: string;
  method: string;
}

// Global context storage
export const requestContext = new AsyncLocalStorage<RequestContext>();

export const correlationMiddleware: RequestHandler = (req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || 
                   (req.headers['x-correlation-id'] as string) || 
                   uuidv4();

  const context: RequestContext = {
    requestId,
    userId: req.headers['x-user-id'] as string | undefined,
    sessionId: req.headers['x-session-id'] as string | undefined,
    userAgent: req.headers['user-agent'] as string | undefined,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    startTime: Date.now(),
    path: req.path,
    method: req.method,
  };

  // Set response headers
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', requestId);

  // Store context in request object and async local storage
  (req as any).context = context;
  
  requestContext.run(context, () => {
    next();
  });
};

// Helper to get current request context
export const getCurrentContext = (): RequestContext | undefined => {
  return requestContext.getStore();
};

// Enhanced logging with context
export const logWithContext = (level: 'info' | 'warn' | 'error', message: string, meta?: any) => {
  const context = getCurrentContext();
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId,
    userId: context?.userId,
    path: context?.path,
    method: context?.method,
    ...meta,
  };
  
  console.log(JSON.stringify(logEntry));
};

// Response time middleware
export const responseTimeMiddleware: RequestHandler = (req, res, next) => {
  const context = (req as any).context as RequestContext;
  
  res.on('finish', () => {
    const responseTime = Date.now() - context.startTime;
    
    // Only set header if headers haven't been sent yet
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${responseTime}ms`);
    }
    
    logWithContext('info', 'Request completed', {
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.getHeader('content-length'),
    });
  });
  
  next();
};
