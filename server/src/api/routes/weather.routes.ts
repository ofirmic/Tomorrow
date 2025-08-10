import { Router } from 'express';
import { z } from 'zod';
import type { IWeatherProvider } from '../../business-logic/ports/weather-provider.js';
import { asyncHandler, validateQuery } from '../../middleware/validation/validation.middleware.js';
import { GetWeatherRequestSchema } from '../dto/alert.dto.js';

export function createWeatherRoutes(weather: IWeatherProvider) {
  const router = Router();

  router.get('/realtime', async (req, res) => {
    const { lat, lon, city } = req.query as { lat?: string; lon?: string; city?: string };
    try {
      if (city) return res.status(400).json({ error: 'City geocoding not implemented. Provide lat and lon.' });
      if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
      
      const latitude = Number(lat);
      const longitude = Number(lon);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Invalid latitude or longitude values' });
      }
      
      const data = await weather.getRealtime(latitude, longitude);
      res.json(data);
    } catch (err) {
      console.error('Weather API error:', err);
      
      // Return the actual error message from the weather provider
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather';
      
      // Determine appropriate status code
      const statusCode = errorMessage.includes('rate limit') ? 429 :
                        errorMessage.includes('authentication') ? 401 :
                        errorMessage.includes('API key') ? 401 : 500;
      
      res.status(statusCode).json({ error: errorMessage });
    }
  });

  return router;
}


