import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const spec = {
  openapi: '3.0.0',
  info: { title: 'Weather Alerts API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:4000' }],
  paths: {
    '/health': {
      get: { summary: 'Health check', responses: { '200': { description: 'OK' } } },
    },
    '/api/weather/realtime': {
      get: {
        summary: 'Realtime weather',
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'lon', in: 'query', required: true, schema: { type: 'number' } },
        ],
        responses: { '200': { description: 'OK' }, '400': { description: 'Bad request' } },
      },
    },
    '/api/alerts': {
      get: {
        summary: 'List alerts (paginated)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: { summary: 'Create alert', responses: { '201': { description: 'Created' }, '400': { description: 'Bad request' } } },
      delete: { summary: 'Delete all alerts', responses: { '200': { description: 'OK' } } },
    },
    '/api/alerts/state': {
      get: { summary: 'Current state of alerts', responses: { '200': { description: 'OK' } } },
    },
    '/api/alerts/{id}': {
      delete: {
        summary: 'Delete alert by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'No Content' } },
      },
    },
  },
} as const;

export function mountDocs(app: Express) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec as any));
}


