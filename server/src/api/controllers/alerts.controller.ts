import { Router } from 'express';
import type { IAlertRepository } from '../../business-logic/ports/alert-repository.js';

export function createAlertsController(repo: IAlertRepository) {
  const router = Router();

  router.post('/', async (req, res, next) => {
    const data = req.body;
    if (!data.cityName && (data.latitude == null || data.longitude == null)) {
      return res.status(400).json({ error: 'Provide either cityName or latitude/longitude' });
    }
    try {
      const created = await repo.createAlert({
        name: data.name ?? null,
        description: data.description ?? null,
        cityName: data.cityName ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        parameter: data.parameter,
        operator: data.operator,
        threshold: data.threshold,
        units: data.units ?? null,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
      });
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  });

  // (Dev-only seed endpoint removed for production cleanliness)

  router.get('/', async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? '1');
      const pageSize = Number(req.query.pageSize ?? '10');
      if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 1 || pageSize < 1 || pageSize > 100) {
        return res.status(400).json({ error: 'Invalid pagination params' });
      }
      const { items, total } = await repo.listAlertsPaginated(page, pageSize);
      res.json({ items, total, page, pageSize });
    } catch (e) {
      next(e);
    }
  });

  router.get('/state', async (_req, res, next) => {
    try {
      const alerts = await repo.listAlerts();
      res.json(
        alerts.map((a) => ({
          id: a.id,
          name: a.name,
          lastState: a.lastState ?? false,
          lastValue: a.lastValue,
          lastEvaluatedAt: a.lastEvaluatedAt,
        }))
      );
    } catch (e) {
      next(e);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      await repo.deleteAlert(id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });

  router.delete('/', async (req, res, next) => {
    try {
      const result = await repo.deleteAllAlerts();
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
}


