import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getStorage } from '../storage/index.js';
import { config } from '../config/env.js';
import { githubService } from '../services/github.service.js';

const router = Router();

const updateSettingsSchema = z.object({
  scanIntervalMinutes: z.number().min(15).max(1440).optional(),
});

// GET /api/settings - Get application settings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storage = getStorage();
    let settings = await storage.getAppSettings();

    if (!settings) {
      settings = await storage.upsertAppSettings({
        githubOrg: process.env.GITHUB_ORG || 'unknown',
        scanIntervalMinutes: 60,
      });
    }

    // Get additional info - gracefully handle token errors
    let rateLimit = null;
    try {
      rateLimit = await githubService.getRateLimit();
    } catch {
      // Token might be invalid, continue without rate limit info
    }

    // Check Redis status
    const redisClient = req.app.get('redisClient');
    const redisStatus = {
      enabled: process.env.USE_REDIS === 'true' || config.nodeEnv === 'production',
      connected: redisClient ? redisClient.isReady : false,
      mode: config.nodeEnv === 'production' ? 'required' : 'optional',
    };

    res.json({
      ...settings,
      github: {
        org: settings.githubOrg,
        rateLimit,
      },
      redis: redisStatus,
      storageMode: config.storageMode,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings - Update application settings
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateSettingsSchema.parse(req.body);
    const storage = getStorage();

    const settings = await storage.upsertAppSettings({
      githubOrg: process.env.GITHUB_ORG || 'unknown',
      scanIntervalMinutes: data.scanIntervalMinutes || 60,
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

export { router as settingsRoutes };
