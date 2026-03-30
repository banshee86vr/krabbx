import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';

import { AppError } from '../middleware/errorHandler.js';
import { getOrganizationScanStatus, RenovateService } from '../services/renovate.service.js';
import { githubService } from '../services/github.service.js';
import { getStorage } from '../storage/index.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';

const router = Router();

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  adopted: z.enum(['true', 'false', 'all']).default('all'),
  hasOutdated: z.enum(['true', 'false', 'all']).default('all'),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'renovateAdopted', 'outdatedDependencies', 'lastScanAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// GET /api/repositories - List all repositories
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const storage = getStorage();

    const { data: repositories, total } = await storage.getRepositories(
      {
        isArchived: false,
        renovateAdopted: query.adopted !== 'all' ? query.adopted === 'true' : undefined,
        hasOutdated: query.hasOutdated !== 'all' ? query.hasOutdated === 'true' : undefined,
        search: query.search,
      },
      {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.sortBy,
        orderDir: query.sortOrder,
      }
    );

    // Fetch contributors for each repository (in parallel)
    const repositoriesWithContributors = await Promise.all(
      repositories.map(async (repo) => {
        try {
          const contributors = await githubService.getRepositoryContributors(repo.name, 5);
          return { ...repo, contributors };
        } catch (error) {
          logger.error(`Failed to fetch contributors for ${repo.name}`, error);
          return { ...repo, contributors: [] };
        }
      })
    );

    res.json({
      data: repositoriesWithContributors,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/repositories/stats - Get aggregate statistics
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const renovateService = new RenovateService();
    const stats = await renovateService.getAdoptionStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/repositories/scan/status - Get current organization scan status
router.get('/scan/status', (_req: Request, res: Response) => {
  res.json(getOrganizationScanStatus());
});

// GET /api/repositories/:id - Get repository details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const storage = getStorage();

    const repository = await storage.getRepositoryById(id);

    if (!repository) {
      throw new AppError(404, 'Repository not found');
    }

    // Get dependencies and scan history
    const { data: dependencies } = await storage.getDependencies(
      { repositoryId: id },
      { orderBy: 'packageName', orderDir: 'asc' }
    );
    const scanHistory = await storage.getScanHistory(id, 10);

    res.json({
      ...repository,
      dependencies,
      scanHistory,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/repositories/scan - Trigger organization scan
router.post('/scan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (getOrganizationScanStatus().isScanning) {
      res.status(202).json({
        message: 'Scan already running',
        status: 'running',
      });
      return;
    }

    const io = req.app.get('io');
    const renovateService = new RenovateService(io);

    // Start scan in background
    res.status(202).json({ message: 'Scan started', status: 'running' });

    // Run scan asynchronously
    renovateService.scanOrganization().then(async () => {
      // Update last scan time after successful scan
      const storage = getStorage();
      const settings = await storage.getAppSettings();
      await storage.upsertAppSettings({
        githubOrg: settings?.githubOrg || config.github.org,
        scanIntervalMinutes: settings?.scanIntervalMinutes || 60,
        lastFullScanAt: new Date(),
      });
      logger.info('Last full scan timestamp updated');
    }).catch(error => {
      logger.error('Organization scan failed', error);
    });
    return;
  } catch (error) {
    next(error);
  }
});

// POST /api/repositories/:id/scan - Scan single repository
router.post('/:id/scan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const storage = getStorage();

    const repository = await storage.getRepositoryById(id);

    if (!repository) {
      throw new AppError(404, 'Repository not found');
    }

    const io = req.app.get('io');
    const renovateService = new RenovateService(io);
    const result = await renovateService.scanRepository(repository.name);

    res.json({
      message: 'Scan completed',
      result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as repositoryRoutes };
