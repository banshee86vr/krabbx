import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';

import { AppError } from '../middleware/errorHandler.js';
import { getOrganizationScanStatus, RenovateService } from '../services/renovate.service.js';
import { githubService } from '../services/github.service.js';
import { getStorage } from '../storage/index.js';
import { config } from '../config/env.js';
import type { HealthScoreBreakdownV1 } from '../lib/gamificationScore.js';
import { logger } from '../lib/logger.js';

const router = Router();

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  adopted: z.enum(['true', 'false', 'all']).default('all'),
  hasOutdated: z.enum(['true', 'false', 'all']).default('all'),
  search: z.string().optional(),
  sortBy: z
    .enum(['name', 'renovateAdopted', 'outdatedDependencies', 'lastScanAt', 'updatedAt', 'healthScore'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// GET /api/repositories - List all repositories
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const storage = getStorage();

    const sortBy =
      query.sortBy === 'healthScore' && !config.gamification.enabled
        ? undefined
        : query.sortBy;

    const filters = {
      isArchived: false,
      renovateAdopted: query.adopted !== 'all' ? query.adopted === 'true' : undefined,
      hasOutdated: query.hasOutdated !== 'all' ? query.hasOutdated === 'true' : undefined,
      search: query.search,
    };

    let gamificationSummary: Awaited<ReturnType<typeof storage.getGamificationSummary>> | null = null;
    const loadGamificationSummary = async () => {
      if (!gamificationSummary) {
        gamificationSummary = await storage.getGamificationSummary();
      }
      return gamificationSummary;
    };

    let repositories: Awaited<ReturnType<typeof storage.getRepositories>>['data'];
    let total: number;

    if (sortBy === 'healthScore' && config.gamification.enabled) {
      const all = await storage.getRepositories(filters, {});
      const summary = await loadGamificationSummary();
      const scoreById = new Map(
        summary.allRepositoryHealth.map((h) => [h.repositoryId, h.score] as const),
      );
      const dir = query.sortOrder === 'asc' ? 1 : -1;
      const ranked = [...all.data].sort((a, b) => {
        const sa = scoreById.get(a.id) ?? 0;
        const sb = scoreById.get(b.id) ?? 0;
        if (sa !== sb) return dir * (sa - sb);
        return a.name.localeCompare(b.name);
      });
      total = all.total;
      repositories = ranked.slice(
        (query.page - 1) * query.limit,
        (query.page - 1) * query.limit + query.limit,
      );
    } else {
      const result = await storage.getRepositories(filters, {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: sortBy,
        orderDir: query.sortOrder,
      });
      repositories = result.data;
      total = result.total;
    }

    let scoreById: Map<string, number> | null = null;
    if (config.gamification.enabled) {
      const summary = await loadGamificationSummary();
      scoreById = new Map(
        summary.allRepositoryHealth.map((h) => [h.repositoryId, h.score] as const),
      );
    }

    // Fetch contributors for each repository (in parallel)
    const repositoriesWithContributors = await Promise.all(
      repositories.map(async (repo) => {
        try {
          const owner = repo.fullName.includes('/') ? repo.fullName.split('/')[0]! : repo.name;
          const contributors = await githubService.getRepositoryContributors(owner, repo.name, 5);
          return {
            ...repo,
            contributors,
            ...(config.gamification.enabled
              ? { healthScore: scoreById?.get(repo.id) ?? 0 }
              : {}),
          };
        } catch (error) {
          logger.error(`Failed to fetch contributors for ${repo.name}`, error);
          return {
            ...repo,
            contributors: [],
            ...(config.gamification.enabled
              ? { healthScore: scoreById?.get(repo.id) ?? 0 }
              : {}),
          };
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

    let gamification: (HealthScoreBreakdownV1 & {
      organizationRank: number | null;
      totalRankedRepos: number;
    }) | null = null;

    if (config.gamification.enabled) {
      const breakdown = await storage.getHealthScoreBreakdownForRepository(id);
      if (breakdown) {
        const summary = await storage.getGamificationSummary();
        const sorted = [...summary.allRepositoryHealth].sort(
          (a, b) => b.score - a.score || a.name.localeCompare(b.name),
        );
        const idx = sorted.findIndex((h) => h.repositoryId === id);
        gamification = {
          ...breakdown,
          organizationRank: idx >= 0 ? idx + 1 : null,
          totalRankedRepos: sorted.length,
        };
      }
    }

    res.json({
      ...repository,
      dependencies,
      scanHistory,
      gamification,
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
        githubOrg: settings?.githubOrg || config.github.targets.join(','),
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
    const owner = repository.fullName.split('/')[0] || config.github.targets[0] || '';
    const result = await renovateService.scanRepository(owner, repository.name);

    res.json({
      message: 'Scan completed',
      result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as repositoryRoutes };
