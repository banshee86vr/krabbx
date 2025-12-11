import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';

import { getStorage, type UpdateType } from '../storage/index.js';

const router = Router();

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  isOutdated: z.enum(['true', 'false', 'all']).default('all'),
  packageManager: z.string().optional(),
  updateType: z.enum(['major', 'minor', 'patch', 'digest', 'pin', 'all']).default('all'),
  hasOpenPR: z.enum(['true', 'false', 'all']).default('all'),
  search: z.string().optional(),
  repositoryId: z.string().optional(),
  sortBy: z.enum(['packageName', 'updateType', 'lastCheckedAt']).default('packageName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// GET /api/dependencies - List all dependencies
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const storage = getStorage();

    const { data: dependencies, total } = await storage.getDependencies(
      {
        isOutdated: query.isOutdated !== 'all' ? query.isOutdated === 'true' : undefined,
        packageManager: query.packageManager,
        updateType: query.updateType !== 'all' ? query.updateType as UpdateType : undefined,
        hasOpenPR: query.hasOpenPR !== 'all' ? query.hasOpenPR === 'true' : undefined,
        repositoryId: query.repositoryId,
        search: query.search,
      },
      {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.sortBy,
        orderDir: query.sortOrder,
      }
    );

    res.json({
      data: dependencies,
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

// GET /api/dependencies/outdated - List only outdated dependencies
router.get('/outdated', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const storage = getStorage();

    const { data: dependencies, total } = await storage.getDependencies(
      {
        isOutdated: true,
        packageManager: query.packageManager,
        updateType: query.updateType !== 'all' ? query.updateType as UpdateType : undefined,
        search: query.search,
      },
      {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: 'updateType',
        orderDir: 'asc',
      }
    );

    res.json({
      data: dependencies,
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

// GET /api/dependencies/stats - Get dependency statistics
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const storage = getStorage();
    const stats = await storage.getDependencyStats();

    res.json({
      total: stats.total,
      outdated: stats.outdated,
      withOpenPR: stats.withOpenPR,
      byUpdateType: stats.byUpdateType,
      byPackageManager: stats.byPackageManager,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dependencies/package-managers - Get list of package managers
router.get('/package-managers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const storage = getStorage();
    const managers = await storage.getDistinctPackageManagers();
    res.json(managers);
  } catch (error) {
    next(error);
  }
});

// GET /api/dependencies/prs/:repositoryId - Get all open PRs for a repository (not deduplicated)
router.get('/prs/:repositoryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repositoryId } = req.params as { repositoryId: string };
    const { githubService } = await import('../services/github.service.js');
    const storage = getStorage();

    // Get repository to get its name
    const repository = await storage.getRepositoryById(repositoryId);
    if (!repository) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    // Fetch all open PRs from GitHub
    const allPRs = await githubService.getRenovatePRs(repository.name);

    // Get dependencies for comparison (to map PR to dependency)
    const { data: dependencies } = await storage.getDependencies(
      { repositoryId },
      { orderBy: 'packageName', orderDir: 'asc' }
    );

    // Map PRs to enriched data
    const enrichedPRs = allPRs.map(pr => {
      // Find matching dependency
      const dep = dependencies.find(d => d.prNumber === pr.number);

      // If dependency exists in DB, use it
      if (dep) {
        return {
          number: pr.number,
          title: pr.title,
          body: pr.body,
          html_url: pr.html_url,
          state: pr.state,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          labels: pr.labels,
          packageName: dep.packageName,
          packageManager: dep.packageManager,
          dependencyType: dep.dependencyType,
          currentVersion: dep.currentVersion,
          latestVersion: dep.latestVersion,
          updateType: dep.updateType,
        };
      }

      // Otherwise, try to parse PR title and body to extract dependency info
      const parsedDep = githubService.parseDependencyFromPRTitle(pr);

      return {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        html_url: pr.html_url,
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        labels: pr.labels,
        packageName: parsedDep?.packageName || null,
        packageManager: parsedDep?.packageManager || null,
        dependencyType: parsedDep?.dependencyType || null,
        currentVersion: parsedDep?.currentVersion || null,
        latestVersion: parsedDep?.newVersion || null,
        updateType: parsedDep?.updateType || null,
      };
    });

    // Sort by update type priority (primary), then by dependency type (secondary)
    // Update type: major > minor > patch > digest > pin > rollback > bump > null
    const updateTypePriority: Record<string, number> = {
      'major': 1,
      'minor': 2,
      'patch': 3,
      'digest': 4,
      'pin': 5,
      'rollback': 6,
      'bump': 7,
    };

    const sortedPRs = enrichedPRs.sort((a, b) => {
      // Primary sort: Update type
      const priorityA = a.updateType ? (updateTypePriority[a.updateType] || 999) : 999;
      const priorityB = b.updateType ? (updateTypePriority[b.updateType] || 999) : 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Secondary sort: Dependency type (alphabetical)
      const typeA = a.dependencyType || '';
      const typeB = b.dependencyType || '';
      
      if (typeA !== typeB) {
        return typeA.localeCompare(typeB);
      }
      
      // Tertiary sort: Package name (alphabetical)
      const packageA = a.packageName || '';
      const packageB = b.packageName || '';
      return packageA.localeCompare(packageB);
    });

    res.json({
      data: sortedPRs,
      total: sortedPRs.length,
      pagination: {
        page: 1,
        limit: sortedPRs.length,
        total: sortedPRs.length,
        totalPages: 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as dependencyRoutes };
