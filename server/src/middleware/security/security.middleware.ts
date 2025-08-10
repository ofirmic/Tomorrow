import type { RequestHandler } from 'express';

export const securityHeadersMiddleware: RequestHandler = (_req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
};

export const requestSizeMiddleware: RequestHandler = (req, res, next) => {
  // Prevent large payloads (basic DoS protection)
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 1024 * 1024; // 1MB limit
  
  if (contentLength > maxSize) {
    return res.status(413).json({ error: 'Payload too large' });
  }
  next();
};
