import { Router, Request, Response, NextFunction } from 'express';
import { getStorage } from '../storage/index.js';
import { githubService } from '../services/github.service.js';

const router = Router();

// GET /api/dashboard/summary - Get dashboard summary data
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const storage = getStorage();
    const summary = await storage.getDashboardSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/trends - Get historical trend data
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const storage = getStorage();
    const trends = await storage.getDashboardTrends(days);
    res.json(trends);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/activity - Get recent activity feed
router.get('/activity', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const storage = getStorage();
    const activities = await storage.getDashboardActivity();
    res.json(activities);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/github-status - Get GitHub API status
router.get('/github-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rateLimit = await githubService.getRateLimit();
    res.json({
      rateLimit,
      percentUsed: Math.round(((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) * 100),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/top-outdated - Get most common outdated dependencies
router.get('/top-outdated', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const storage = getStorage();
    const topOutdated = await storage.getTopOutdatedDependencies(limit);
    res.json(topOutdated);
  } catch (error) {
    next(error);
  }
});

export { router as dashboardRoutes };
