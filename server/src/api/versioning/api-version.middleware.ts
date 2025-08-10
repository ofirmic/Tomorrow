import type { RequestHandler } from 'express';

export interface ApiVersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
}

export const createVersionMiddleware = (config: ApiVersionConfig): RequestHandler => {
  return (req, res, next) => {
    // Extract version from header or URL
    const versionFromHeader = req.headers['api-version'] as string;
    const versionFromUrl = req.path.match(/^\/api\/v(\d+)/)?.[1];
    
    const requestedVersion = versionFromHeader || 
                           (versionFromUrl ? `v${versionFromUrl}` : config.defaultVersion);

    // Validate version
    if (!config.supportedVersions.includes(requestedVersion)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        requestedVersion,
        supportedVersions: config.supportedVersions
      });
    }

    // Add deprecation warning
    if (config.deprecatedVersions.includes(requestedVersion)) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());
    }

    // Store version in request context
    (req as any).apiVersion = requestedVersion;
    res.setHeader('API-Version', requestedVersion);
    
    next();
  };
};

// Version-specific routing
export const versionedRoute = (version: string, handler: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    const requestVersion = (req as any).apiVersion || 'v1';
    if (requestVersion === version) {
      return handler(req, res, next);
    }
    next();
  };
};
