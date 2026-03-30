import { getStorage, type UpdateType } from '../storage/index.js';
import { githubService } from './github.service.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { Server } from 'socket.io';

const log = logger.child('RenovateService');

interface ScanResult {
  repositoryId: string;
  totalDependencies: number;
  outdatedDependencies: number;
  newUpdatesFound: number;
  openPRs: number;
}

export interface OrganizationScanStatus {
  isScanning: boolean;
  scannedCount: number;
  totalToScan: number;
  progress: number;
  rateLimited: boolean;
  totalAvailable: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

const defaultOrganizationScanStatus = (): OrganizationScanStatus => ({
  isScanning: false,
  scannedCount: 0,
  totalToScan: 0,
  progress: 0,
  rateLimited: false,
  totalAvailable: 0,
  startedAt: null,
  completedAt: null,
  error: null,
});

let organizationScanStatus = defaultOrganizationScanStatus();

function updateOrganizationScanStatus(
  updates: Partial<OrganizationScanStatus>
): OrganizationScanStatus {
  organizationScanStatus = {
    ...organizationScanStatus,
    ...updates,
  };

  return organizationScanStatus;
}

export function getOrganizationScanStatus(): OrganizationScanStatus {
  return organizationScanStatus;
}

export class RenovateService {
  constructor(private io?: Server) {}

  async scanOrganization(): Promise<ScanResult[]> {
    const storage = getStorage();
    const scanStartTime = Date.now();
    const results: ScanResult[] = [];
    log.info('Starting organization scan');

    updateOrganizationScanStatus({
      ...defaultOrganizationScanStatus(),
      isScanning: true,
      startedAt: new Date().toISOString(),
    });

    // Emit scan start event
    this.io?.emit('scan:start', {
      ...getOrganizationScanStatus(),
    });

    try {
      const allRepos = await githubService.getOrganizationRepositories();
      log.info('Repositories discovered', { count: allRepos.length });

      let reposToScan = allRepos;

      // Check if specific repositories are configured via SCAN_REPOS env var
      if (config.scan.specificRepos && config.scan.specificRepos.length > 0) {
        const specificRepos = config.scan.specificRepos;
        log.info('Using specific repositories filter', { repositories: specificRepos });
        reposToScan = allRepos.filter(repo =>
          specificRepos.includes(repo.name)
        );
        log.info('Repositories filtered', { 
          filtered: reposToScan.length, 
          total: allRepos.length 
        });

        if (reposToScan.length === 0) {
          log.warn('No matching repositories found for SCAN_REPOS filter', { 
            filter: specificRepos 
          });
        }
      } else {
        // Otherwise use MAX_SCAN_LIMIT (either from env var or database)
        let maxScanLimit = config.rateLimit.maxScanLimit;
        if (maxScanLimit === 0) {
          const settings = await storage.getAppSettings();
          maxScanLimit = settings?.maxScanLimit ?? 0;
        }

        if (maxScanLimit > 0) {
          log.info('Rate limit active', { 
            limit: maxScanLimit, 
            total: allRepos.length 
          });
          reposToScan = allRepos.slice(0, maxScanLimit);
          this.io?.emit('scan:rate-limited', {
            scanned: 0,
            total: reposToScan.length,
            totalAvailable: allRepos.length,
          });
        }
      }

      updateOrganizationScanStatus({
        totalToScan: reposToScan.length,
        totalAvailable: allRepos.length,
        rateLimited: reposToScan.length < allRepos.length,
      });

      let scannedCount = 0;
      for (const repo of reposToScan) {
        if (repo.archived) {
          log.debug('Skipping archived repository', { repository: repo.name });
          continue;
        }

        try {
          log.info('Scanning repository', { repository: repo.name });
          const result = await this.scanRepository(repo.name);
          if (result) {
            results.push(result);
            scannedCount++;

            // Emit progress event for each scanned repo
            const progress = reposToScan.length > 0
              ? Math.round((scannedCount / reposToScan.length) * 100)
              : 100;

            updateOrganizationScanStatus({
              scannedCount,
              totalToScan: reposToScan.length,
              totalAvailable: allRepos.length,
              progress,
            });

            this.io?.emit('repo:scanned', {
              repositoryId: result.repositoryId,
              scannedCount,
              totalToScan: reposToScan.length,
              progress,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          log.error('Repository scan failed', error, { 
            repository: repo.full_name 
          });
        }
      }

      // Create ONE aggregated scan history entry for the entire organization scan
      // This is what will show up as a single bar on the chart
      if (results.length > 0) {
        // Get ALL dependencies across the organization
        const { data: allDependencies } = await storage.getDependencies({});
        
        // Deduplicate dependencies by package name for the BAR (unique packages)
        const uniquePackages = new Map<string, {
          isOutdated: boolean;
        }>();
        
        for (const dep of allDependencies) {
          const key = `${dep.packageName}@${dep.packageManager}`; // Unique by name + manager
          
          if (!uniquePackages.has(key)) {
            uniquePackages.set(key, {
              isOutdated: dep.isOutdated,
            });
          } else {
            // If package exists in multiple repos, update flags (OR logic)
            const existing = uniquePackages.get(key)!;
            existing.isOutdated = existing.isOutdated || dep.isOutdated;
          }
        }
        
        // BAR: Count unique packages (deduplicated)
        const totalUniqueDeps = uniquePackages.size;
        const outdatedUniqueDeps = Array.from(uniquePackages.values()).filter(p => p.isOutdated).length;
        
        // LINE: Count TOTAL PRs (NOT deduplicated - one PR per repo)
        // If 3 repos all have a PR for 'react', that's 3 PRs on the chart
        const totalPRs = allDependencies.filter(dep => dep.hasOpenPR).length;
        
        // Sum of new updates found across all repositories
        const newUpdates = results.reduce((sum, r) => sum + r.newUpdatesFound, 0);

        // Use the first repository as a placeholder (organization scan doesn't belong to one repo)
        // We'll use scanType: 'full' to distinguish org scans from individual repo scans
        await storage.createScanHistory({
          repositoryId: results[0]?.repositoryId || 'unknown', // Use first repo as placeholder
          scanType: 'full', // Mark as organization-level scan
          status: 'completed',
          totalDependencies: totalUniqueDeps,        // UNIQUE packages (deduplicated)
          outdatedDependencies: outdatedUniqueDeps,  // UNIQUE outdated packages
          newUpdatesFound: newUpdates,
          openPRs: totalPRs,                         // TOTAL PRs (NOT deduplicated)
          durationMs: Date.now() - scanStartTime,
          errorMessage: null,
        });

        log.info('Scan history created', { 
          uniqueDependencies: totalUniqueDeps, 
          totalPRs: totalPRs,
          duration: `${Date.now() - scanStartTime}ms`
        });
      }
    } catch (error) {
      log.error('Organization scan failed', error);
      updateOrganizationScanStatus({
        error: error instanceof Error ? error.message : 'Organization scan failed',
      });
    }

    updateOrganizationScanStatus({
      isScanning: false,
      progress: results.length > 0 || organizationScanStatus.totalToScan === 0 ? 100 : organizationScanStatus.progress,
      completedAt: new Date().toISOString(),
    });

    // Emit scan complete event
    this.io?.emit('scan:complete', {
      totalRepos: results.length,
      timestamp: new Date().toISOString(),
    });

    log.info('Organization scan completed', { 
      repositoriesScanned: results.length,
      duration: `${Date.now() - scanStartTime}ms`
    });
    return results;
  }

  async scanRepository(repoName: string): Promise<ScanResult | null> {
    const storage = getStorage();

    // Get repo from GitHub
    const repos = await githubService.getOrganizationRepositories();
    const githubRepo = repos.find(r => r.name === repoName);

    if (!githubRepo) {
      throw new Error(`Repository ${repoName} not found`);
    }

    // Check for Renovate workflow (config is embedded in the reusable workflow)
    const hasRenovateWorkflow = await githubService.checkRenovateWorkflow(repoName);

    // Get or create repository in storage
    const repository = await storage.upsertRepository({
      githubId: githubRepo.id,
      name: githubRepo.name,
      fullName: githubRepo.full_name,
      description: githubRepo.description,
      defaultBranch: githubRepo.default_branch,
      htmlUrl: githubRepo.html_url,
      isArchived: githubRepo.archived,
      isPrivate: githubRepo.private,
      renovateAdopted: hasRenovateWorkflow,
      renovateConfigPath: null,
      renovateConfigValid: null,
      lastScanAt: new Date(),
    });

    // Get dependencies from open PRs
    const dependencies = await githubService.getDependenciesFromPRs(repoName);
    let newUpdatesFound = 0;

    // Update dependencies in storage
    for (const dep of dependencies) {
      const { data: existingDeps } = await storage.getDependencies({
        repositoryId: repository.id,
        search: dep.packageName,
      });

      const existing = existingDeps.find(
        d => d.packageName === dep.packageName && d.packageManager === dep.packageManager
      );

      if (!existing) {
        newUpdatesFound++;
      }

      await storage.upsertDependency(
        repository.id,
        dep.packageName,
        dep.packageManager,
        {
          dependencyType: dep.dependencyType,
          currentVersion: dep.currentVersion,
          latestVersion: dep.newVersion,
          updateType: this.mapUpdateType(dep.updateType),
          isOutdated: true,
          hasOpenPR: true,
          prNumber: dep.prNumber,
          prUrl: dep.prUrl,
        }
      );
    }

    // Mark dependencies as up-to-date if PR was closed/merged
    const currentDepNames = dependencies.map(d => d.packageName);
    await storage.updateDependenciesForRepo(
      repository.id,
      currentDepNames,
      { hasOpenPR: false, isOutdated: false }
    );

    // Calculate repository stats
    const { data: allDeps } = await storage.getDependencies({ repositoryId: repository.id });
    const totalCount = allDeps.length;
    const outdatedCount = allDeps.filter(d => d.isOutdated).length;
    const openPRsCount = allDeps.filter(d => d.hasOpenPR).length;

    await storage.updateRepository(repository.id, {
      outdatedDependencies: outdatedCount,
      totalDependencies: totalCount,
      openRenovatePRs: dependencies.length,
    });

    // Note: Individual repository scan history entries are NOT created
    // to avoid cluttering the trends chart with per-repo data points.
    // Only organization-level scans (scanType: 'full') create history entries
    // for the dashboard trends chart.
    
    // If you want to track individual repo scan history for debugging,
    // uncomment below (but it won't appear on the trends chart):
    /*
    const durationMs = Date.now() - startTime;
    await storage.createScanHistory({
      repositoryId: repository.id,
      scanType: 'incremental',
      status: 'completed',
      totalDependencies: totalCount,
      outdatedDependencies: outdatedCount,
      newUpdatesFound,
      openPRs: openPRsCount,
      durationMs,
      errorMessage: null,
    });
    */

    // Emit real-time update
    this.io?.emit('repository:updated', {
      id: repository.id,
      name: repository.name,
      outdatedDependencies: outdatedCount,
      totalDependencies: totalCount,
    });

    return {
      repositoryId: repository.id,
      totalDependencies: totalCount,
      outdatedDependencies: outdatedCount,
      newUpdatesFound,
      openPRs: openPRsCount,
    };
  }

  private mapUpdateType(type: string): UpdateType {
    const typeMap: Record<string, UpdateType> = {
      major: 'major',
      minor: 'minor',
      patch: 'patch',
      digest: 'digest',
      pin: 'pin',
      rollback: 'rollback',
      bump: 'bump',
    };
    return typeMap[type.toLowerCase()] || 'minor';
  }

  async getAdoptionStats() {
    const storage = getStorage();
    const stats = await storage.getRepositoryStats();

    return {
      totalRepositories: stats.total,
      adoptedRepositories: stats.adopted,
      notAdoptedRepositories: stats.total - stats.adopted,
      adoptionRate: stats.total > 0 ? Math.round((stats.adopted / stats.total) * 100) : 0,
      repositoriesWithOutdated: stats.withOutdated,
    };
  }

  async getDependencyStats() {
    const storage = getStorage();
    const stats = await storage.getDependencyStats();

    return {
      totalDependencies: stats.total,
      byUpdateType: stats.byUpdateType,
      byPackageManager: stats.byPackageManager,
      byDependencyType: stats.byDependencyType,
    };
  }
}
