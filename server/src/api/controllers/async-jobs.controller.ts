import { Router } from 'express';
import { z } from 'zod';
import { JobQueueService } from '../../infrastructure/queues/job-queue.service.js';
import { asyncHandler } from '../../middleware/validation/validation.middleware.js';

/**
 * Async Jobs Controller - Demonstrates enterprise async patterns
 * Shows how to handle long-running operations with job queues
 */
export function createAsyncJobsController(jobQueue: JobQueueService) {
  const router = Router();

  // Schema for batch weather request
  const BatchWeatherSchema = z.object({
    locations: z.array(z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      priority: z.number().min(0).max(10).optional().default(5),
    })).min(1).max(100), // Limit batch size
  });

  // Schema for batch alert evaluation
  const BatchAlertsSchema = z.object({
    alertIds: z.array(z.string()).min(1).max(50),
    forceRefresh: z.boolean().optional().default(false),
  });

  /**
   * POST /api/jobs/weather/batch
   * Submit batch weather fetching job
   * Use this for non-urgent weather updates or when processing many locations
   */
  router.post('/weather/batch', asyncHandler(async (req, res) => {
    const { locations } = BatchWeatherSchema.parse(req.body);
    
    const jobs = [];
    for (const location of locations) {
      const job = await jobQueue.addWeatherJob({
        latitude: location.latitude,
        longitude: location.longitude,
      }, location.priority);
      
      jobs.push({
        id: job.id,
        location,
        status: 'queued',
      });
    }

    res.status(202).json({
      message: `Queued ${jobs.length} weather fetch jobs`,
      jobs: jobs.map(j => ({
        id: j.id,
        location: j.location,
        status: j.status,
      })),
      estimatedCompletion: new Date(Date.now() + (jobs.length * 2000)).toISOString(),
    });
  }));

  /**
   * POST /api/jobs/alerts/batch
   * Submit batch alert evaluation job
   * Efficiently processes multiple alerts in a single job
   */
  router.post('/alerts/batch', asyncHandler(async (req, res) => {
    const { alertIds, forceRefresh } = BatchAlertsSchema.parse(req.body);
    
    const job = await jobQueue.addAlertBatchJob({
      alertIds,
      timestamp: Date.now(),
    });

    res.status(202).json({
      message: `Queued batch alert evaluation for ${alertIds.length} alerts`,
      jobId: job.id,
      alertIds,
      forceRefresh,
      estimatedCompletion: new Date(Date.now() + 10000).toISOString(), // ~10 seconds
    });
  }));

  /**
   * GET /api/jobs/status/:jobId
   * Get status of a specific job
   */
  router.get('/status/:jobId', asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    
    // In a real implementation, you'd query the job from Bull
    // For demo purposes, return a mock response
    const mockStatuses = ['queued', 'active', 'completed', 'failed'];
    const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
    
    const response: any = {
      id: jobId,
      status: randomStatus,
      createdAt: new Date(Date.now() - Math.random() * 60000).toISOString(),
      progress: randomStatus === 'active' ? Math.floor(Math.random() * 100) : 
                randomStatus === 'completed' ? 100 : 0,
    };

    if (randomStatus === 'completed') {
      response.result = {
        processed: Math.floor(Math.random() * 10) + 1,
        duration: Math.floor(Math.random() * 5000) + 1000,
      };
    }

    if (randomStatus === 'failed') {
      response.error = 'External API timeout';
      response.retryCount = Math.floor(Math.random() * 3);
    }

    res.json(response);
  }));

  /**
   * GET /api/jobs/stats
   * Get queue statistics for monitoring
   */
  router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await jobQueue.getQueueStats();
    
    res.json({
      timestamp: new Date().toISOString(),
      queues: stats,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
  }));

  /**
   * POST /api/jobs/notifications/send
   * Send immediate notification (for testing)
   */
  router.post('/notifications/send', asyncHandler(async (req, res) => {
    const schema = z.object({
      message: z.string().min(1).max(500),
      recipients: z.array(z.string().email()).min(1).max(10),
      type: z.enum(['email', 'sms']).default('email'),
      priority: z.number().min(1).max(10).default(5),
    });

    const { message, recipients, type, priority } = schema.parse(req.body);

    const job = await jobQueue.addNotificationJob({
      alertId: `manual-${Date.now()}`,
      message,
      recipients,
      type,
    });

    res.status(202).json({
      message: `Notification queued for ${recipients.length} recipients`,
      jobId: job.id,
      type,
      priority,
      estimatedDelivery: new Date(Date.now() + 5000).toISOString(),
    });
  }));

  return router;
}
