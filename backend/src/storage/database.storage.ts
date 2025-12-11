import { PrismaClient } from '@prisma/client';
import type {
  IStorage,
  Repository,
  Dependency,
  ScanHistory,
  NotificationConfig,
  NotificationHistory,
  AppSettings,
  RepositoryFilters,
  DependencyFilters,
  PaginationOptions,
  NotificationTrigger,
  NotificationType,
  UpdateType,
  DependencyType,
} from './types.js';

export class DatabaseStorage implements IStorage {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // Repositories
  async getRepositories(
    filters?: RepositoryFilters,
    pagination?: PaginationOptions
  ): Promise<{ data: Repository[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (filters) {
      if (filters.isArchived !== undefined) {
        where.isArchived = filters.isArchived;
      }
      if (filters.renovateAdopted !== undefined) {
        where.renovateAdopted = filters.renovateAdopted;
      }
      if (filters.hasOutdated !== undefined) {
        where.outdatedDependencies = filters.hasOutdated ? { gt: 0 } : { equals: 0 };
      }
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    // Build orderBy clause: use only the requested field if specified
    const orderBy = pagination?.orderBy
      ? { [pagination.orderBy]: pagination.orderDir || 'asc' }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.repository.findMany({
        where,
        skip: pagination?.skip,
        take: pagination?.take,
        orderBy,
      }),
      this.prisma.repository.count({ where }),
    ]);

    return { data: data as Repository[], total };
  }

  async getRepositoryById(id: string): Promise<Repository | null> {
    const repo = await this.prisma.repository.findUnique({
      where: { id },
      include: {
        dependencies: {
          orderBy: [{ isOutdated: 'desc' }, { packageName: 'asc' }],
        },
        scanHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    return repo as Repository | null;
  }

  async getRepositoryByGithubId(githubId: number): Promise<Repository | null> {
    const repo = await this.prisma.repository.findUnique({
      where: { githubId },
    });
    return repo as Repository | null;
  }

  async upsertRepository(data: Partial<Repository> & { githubId: number }): Promise<Repository> {
    const repo = await this.prisma.repository.upsert({
      where: { githubId: data.githubId },
      create: {
        githubId: data.githubId,
        name: data.name || '',
        fullName: data.fullName || '',
        description: data.description,
        defaultBranch: data.defaultBranch || 'main',
        renovateAdopted: data.renovateAdopted || false,
        renovateConfigPath: data.renovateConfigPath,
        renovateConfigValid: data.renovateConfigValid,
        htmlUrl: data.htmlUrl || '',
        isArchived: data.isArchived || false,
        isPrivate: data.isPrivate || false,
      },
      update: {
        name: data.name,
        fullName: data.fullName,
        description: data.description,
        defaultBranch: data.defaultBranch,
        renovateAdopted: data.renovateAdopted,
        renovateConfigPath: data.renovateConfigPath,
        renovateConfigValid: data.renovateConfigValid,
        lastScanAt: data.lastScanAt,
        outdatedDependencies: data.outdatedDependencies,
        totalDependencies: data.totalDependencies,
        openRenovatePRs: data.openRenovatePRs,
        isArchived: data.isArchived,
        isPrivate: data.isPrivate,
      },
    });
    return repo as Repository;
  }

  async updateRepository(id: string, data: Partial<Repository>): Promise<Repository> {
    const repo = await this.prisma.repository.update({
      where: { id },
      data,
    });
    return repo as Repository;
  }

  // Dependencies
  async getDependencies(
    filters?: DependencyFilters,
    pagination?: PaginationOptions
  ): Promise<{ data: (Dependency & { repository?: Repository })[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (filters) {
      if (filters.repositoryId) where.repositoryId = filters.repositoryId;
      if (filters.isOutdated !== undefined) where.isOutdated = filters.isOutdated;
      if (filters.packageManager) where.packageManager = filters.packageManager;
      if (filters.updateType) where.updateType = filters.updateType;
      if (filters.hasOpenPR !== undefined) where.hasOpenPR = filters.hasOpenPR;
      if (filters.search) {
        where.packageName = { contains: filters.search, mode: 'insensitive' };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.dependency.findMany({
        where,
        skip: pagination?.skip,
        take: pagination?.take,
        orderBy: pagination?.orderBy
          ? { [pagination.orderBy]: pagination.orderDir || 'asc' }
          : undefined,
        include: {
          repository: {
            select: { id: true, name: true, fullName: true, htmlUrl: true },
          },
        },
      }),
      this.prisma.dependency.count({ where }),
    ]);

    return { data: data as (Dependency & { repository?: Repository })[], total };
  }

  async getDependencyById(id: string): Promise<Dependency | null> {
    const dep = await this.prisma.dependency.findUnique({ where: { id } });
    return dep as Dependency | null;
  }

  async upsertDependency(
    repositoryId: string,
    packageName: string,
    packageManager: string,
    data: Partial<Dependency>
  ): Promise<Dependency> {
    const dep = await this.prisma.dependency.upsert({
      where: {
        repositoryId_packageName_packageManager: {
          repositoryId,
          packageName,
          packageManager,
        },
      },
      create: {
        repositoryId,
        packageName,
        packageManager,
        currentVersion: data.currentVersion || 'unknown',
        latestVersion: data.latestVersion,
        updateType: data.updateType as UpdateType | undefined,
        isOutdated: data.isOutdated || false,
        hasOpenPR: data.hasOpenPR || false,
        prUrl: data.prUrl,
        prNumber: data.prNumber,
        sourceFile: data.sourceFile,
      },
      update: {
        currentVersion: data.currentVersion,
        latestVersion: data.latestVersion,
        updateType: data.updateType as UpdateType | undefined,
        isOutdated: data.isOutdated,
        hasOpenPR: data.hasOpenPR,
        prUrl: data.prUrl,
        prNumber: data.prNumber,
        lastCheckedAt: new Date(),
      },
    });
    return dep as Dependency;
  }

  async updateDependenciesForRepo(
    repositoryId: string,
    excludePackages: string[],
    updates: Partial<Dependency>
  ): Promise<void> {
    await this.prisma.dependency.updateMany({
      where: {
        repositoryId,
        packageName: { notIn: excludePackages },
      },
      data: {
        ...updates,
        lastCheckedAt: new Date(),
      },
    });
  }

  async getDistinctPackageManagers(): Promise<string[]> {
    const managers = await this.prisma.dependency.findMany({
      distinct: ['packageManager'],
      select: { packageManager: true },
    });
    return managers.map((m: { packageManager: string }) => m.packageManager);
  }

  // Scan History
  async createScanHistory(data: Omit<ScanHistory, 'id' | 'createdAt'>): Promise<ScanHistory> {
    const scan = await this.prisma.scanHistory.create({ data });
    return scan as unknown as ScanHistory;
  }

  async getScanHistory(repositoryId?: string, limit = 10): Promise<ScanHistory[]> {
    const scans = await this.prisma.scanHistory.findMany({
      where: repositoryId ? { repositoryId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        repository: { select: { name: true } },
      },
    });
    return scans as unknown as ScanHistory[];
  }

  // Notification Config
  async getNotificationConfigs(): Promise<NotificationConfig[]> {
    const configs = await this.prisma.notificationConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return configs as unknown as NotificationConfig[];
  }

  async getNotificationConfigById(id: string): Promise<NotificationConfig | null> {
    const config = await this.prisma.notificationConfig.findUnique({ where: { id } });
    return config as unknown as NotificationConfig | null;
  }

  async createNotificationConfig(
    data: Omit<NotificationConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationConfig> {
    const config = await this.prisma.notificationConfig.create({
      data: {
        type: data.type,
        name: data.name,
        enabled: data.enabled,
        config: data.config as any,
        triggers: data.triggers,
      },
    });
    return config as unknown as NotificationConfig;
  }

  async updateNotificationConfig(id: string, data: Partial<NotificationConfig>): Promise<NotificationConfig> {
    const config = await this.prisma.notificationConfig.update({
      where: { id },
      data: {
        type: data.type,
        name: data.name,
        enabled: data.enabled,
        config: data.config as any,
        triggers: data.triggers,
      },
    });
    return config as unknown as NotificationConfig;
  }

  async deleteNotificationConfig(id: string): Promise<void> {
    await this.prisma.notificationConfig.delete({ where: { id } });
  }

  async getNotificationConfigsByTrigger(trigger: NotificationTrigger): Promise<NotificationConfig[]> {
    const configs = await this.prisma.notificationConfig.findMany({
      where: {
        enabled: true,
        triggers: { has: trigger },
      },
    });
    return configs as unknown as NotificationConfig[];
  }

  // Notification History
  async createNotificationHistory(
    data: Omit<NotificationHistory, 'id' | 'sentAt'>
  ): Promise<NotificationHistory> {
    const history = await this.prisma.notificationHistory.create({ data });
    return history as unknown as NotificationHistory;
  }

  async getNotificationHistory(
    pagination?: PaginationOptions,
    type?: NotificationType
  ): Promise<{ data: NotificationHistory[]; total: number }> {
    const where = type ? { type } : {};

    const [data, total] = await Promise.all([
      this.prisma.notificationHistory.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: pagination?.skip,
        take: pagination?.take,
      }),
      this.prisma.notificationHistory.count({ where }),
    ]);

    return { data: data as unknown as NotificationHistory[], total };
  }

  // App Settings
  async getAppSettings(): Promise<AppSettings | null> {
    const settings = await this.prisma.appSettings.findUnique({
      where: { id: 'app-settings' },
    });
    return settings as AppSettings | null;
  }

  async upsertAppSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    const settings = await this.prisma.appSettings.upsert({
      where: { id: 'app-settings' },
      create: {
        id: 'app-settings',
        githubOrg: data.githubOrg || '',
        scanIntervalMinutes: data.scanIntervalMinutes || 60,
        lastFullScanAt: data.lastFullScanAt,
      },
      update: {
        githubOrg: data.githubOrg,
        scanIntervalMinutes: data.scanIntervalMinutes,
        lastFullScanAt: data.lastFullScanAt,
      },
    });
    return settings as AppSettings;
  }

  // Stats
  async getRepositoryStats(): Promise<{
    total: number;
    adopted: number;
    archived: number;
    withOutdated: number;
  }> {
    const [total, adopted, archived, withOutdated] = await Promise.all([
      this.prisma.repository.count({ where: { isArchived: false } }),
      this.prisma.repository.count({ where: { isArchived: false, renovateAdopted: true } }),
      this.prisma.repository.count({ where: { isArchived: true } }),
      this.prisma.repository.count({ where: { isArchived: false, outdatedDependencies: { gt: 0 } } }),
    ]);

    return { total, adopted, archived, withOutdated };
  }

  async getDependencyStats(): Promise<{
    total: number;
    outdated: number;
    withOpenPR: number;
    byUpdateType: { type: string | null; count: number }[];
    byPackageManager: { manager: string; count: number }[];
    byDependencyType: { type: DependencyType; count: number }[];
  }> {
    const [allDependencies, withOpenPR] = await Promise.all([
      this.prisma.dependency.findMany({
        select: {
          packageName: true,
          packageManager: true,
          dependencyType: true,
          isOutdated: true,
          updateType: true,
        },
      }),
      this.prisma.dependency.count({ where: { hasOpenPR: true } }),
    ]);

    // Count UNIQUE dependencies by packageName@packageManager
    const uniquePackages = new Map<string, {
      isOutdated: boolean;
      updateType: string | null;
      packageManager: string;
      dependencyType: string;
    }>();

    for (const dep of allDependencies) {
      const key = `${dep.packageName}@${dep.packageManager}`;
      if (!uniquePackages.has(key)) {
        uniquePackages.set(key, {
          isOutdated: dep.isOutdated,
          updateType: dep.updateType,
          packageManager: dep.packageManager,
          dependencyType: dep.dependencyType,
        });
      } else {
        const existing = uniquePackages.get(key)!;
        existing.isOutdated = existing.isOutdated || dep.isOutdated;
        // Keep the most severe update type if multiple exist
        if (dep.updateType && (!existing.updateType || dep.updateType === 'major')) {
          existing.updateType = dep.updateType;
        }
      }
    }

    // Count stats from unique packages
    const byUpdateType = new Map<string | null, number>();
    const byPackageManager = new Map<string, number>();
    const byDependencyType = new Map<string, number>();

    for (const pkg of uniquePackages.values()) {
      if (pkg.isOutdated) {
        const current = byUpdateType.get(pkg.updateType) || 0;
        byUpdateType.set(pkg.updateType, current + 1);
      }

      const pmCount = byPackageManager.get(pkg.packageManager) || 0;
      byPackageManager.set(pkg.packageManager, pmCount + 1);

      const dtCount = byDependencyType.get(pkg.dependencyType) || 0;
      byDependencyType.set(pkg.dependencyType, dtCount + 1);
    }

    return {
      total: uniquePackages.size,
      outdated: Array.from(uniquePackages.values()).filter(p => p.isOutdated).length,
      withOpenPR, // Total PRs (not deduplicated)
      byUpdateType: Array.from(byUpdateType.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      byPackageManager: Array.from(byPackageManager.entries()).map(([manager, count]) => ({
        manager,
        count,
      })),
      byDependencyType: Array.from(byDependencyType.entries()).map(([type, count]) => ({
        type: type as DependencyType,
        count,
      })),
    };
  }

  // Dashboard specific
  async getDashboardSummary(): Promise<{
    repositories: {
      total: number;
      adopted: number;
      notAdopted: number;
      archived: number;
      adoptionRate: number;
    };
    dependencies: {
      total: number;
      outdated: number;
      openPRs: number;
    };
    recentScans: (ScanHistory & { repository?: { name: string } })[];
    topOutdated: {
      id: string;
      name: string;
      outdatedDependencies: number;
      totalDependencies: number;
      updateTypeSummary: {
        major: number;
        minor: number;
        patch: number;
      };
    }[];
  }> {
    const [
      totalRepos,
      adoptedRepos,
      archivedRepos,
      allDependencies,
      openPRs,
      recentScans,
      topOutdated,
    ] = await Promise.all([
      this.prisma.repository.count({ where: { isArchived: false } }),
      this.prisma.repository.count({ where: { isArchived: false, renovateAdopted: true } }),
      this.prisma.repository.count({ where: { isArchived: true } }),
      // Fetch all dependencies to count unique ones
      this.prisma.dependency.findMany({
        select: {
          packageName: true,
          packageManager: true,
          isOutdated: true,
        },
      }),
      this.prisma.dependency.count({ where: { hasOpenPR: true } }),
      this.prisma.scanHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          repository: {
            select: { name: true },
          },
        },
      }),
      this.prisma.repository.findMany({
        where: { outdatedDependencies: { gt: 0 }, isArchived: false },
        orderBy: { outdatedDependencies: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          outdatedDependencies: true,
          totalDependencies: true,
          dependencies: {
            where: { isOutdated: true },
            select: { updateType: true },
          },
        },
      }),
    ]);

    // Count UNIQUE dependencies by packageName@packageManager
    const uniquePackages = new Map<string, { isOutdated: boolean }>();
    
    for (const dep of allDependencies) {
      const key = `${dep.packageName}@${dep.packageManager}`;
      if (!uniquePackages.has(key)) {
        uniquePackages.set(key, { isOutdated: dep.isOutdated });
      } else {
        const existing = uniquePackages.get(key)!;
        existing.isOutdated = existing.isOutdated || dep.isOutdated;
      }
    }

    const totalDependencies = uniquePackages.size;
    const outdatedDependencies = Array.from(uniquePackages.values()).filter(p => p.isOutdated).length;

    const adoptionRate = totalRepos > 0 ? Math.round((adoptedRepos / totalRepos) * 100) : 0;

    return {
      repositories: {
        total: totalRepos,
        adopted: adoptedRepos,
        notAdopted: totalRepos - adoptedRepos,
        archived: archivedRepos,
        adoptionRate,
      },
      dependencies: {
        total: totalDependencies,
        outdated: outdatedDependencies,
        openPRs,
      },
      recentScans: recentScans as unknown as (ScanHistory & { repository?: { name: string } })[],
      topOutdated: topOutdated.map((repo: { 
        id: string; 
        name: string; 
        outdatedDependencies: number; 
        totalDependencies: number; 
        dependencies: { updateType: string | null }[] 
      }) => {
        const major = repo.dependencies.filter((d: { updateType: string | null }) => d.updateType === 'major').length;
        const minor = repo.dependencies.filter((d: { updateType: string | null }) => d.updateType === 'minor').length;
        const patch = repo.dependencies.filter((d: { updateType: string | null }) => d.updateType === 'patch').length;
        
        return {
          id: repo.id,
          name: repo.name,
          outdatedDependencies: repo.outdatedDependencies,
          totalDependencies: repo.totalDependencies,
          updateTypeSummary: {
            major,
            minor,
            patch,
          },
        };
      }),
    };
  }

  async getDashboardTrends(days: number): Promise<{
    dependencyTrends: {
      date: string;
      timestamp: string;
      totalDependencies: number;
      outdatedDependencies: number;
      newUpdates: number;
      openPRs: number;
      scans: number;
    }[];
    adoptionHistory: {
      currentAdopted: number;
      currentTotal: number;
    };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get scan history: only organization-level scans (scanType: 'full')
    // This ensures ONE data point per organization scan, not per repository
    const scanHistory = await this.prisma.scanHistory.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'completed',
        scanType: 'full',  // ONLY organization-level scans
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        totalDependencies: true,
        outdatedDependencies: true,
        newUpdatesFound: true,
        openPRs: true,
      },
    });

    // Map each organization scan to a data point
    // Each entry represents one complete organization scan
    const dependencyTrends = scanHistory.map((scan: {
      createdAt: Date;
      totalDependencies: number;
      outdatedDependencies: number;
      newUpdatesFound: number;
      openPRs: number;
    }) => ({
      date: scan.createdAt.toISOString().split('T')[0] ?? '',
      timestamp: scan.createdAt.toISOString(),
      totalDependencies: scan.totalDependencies,
      outdatedDependencies: scan.outdatedDependencies,
      newUpdates: scan.newUpdatesFound,
      openPRs: scan.openPRs || 0,
      scans: 1,
    }));

    // Get adoption history
    const adoptionTrend = await this.prisma.repository.findMany({
      where: { isArchived: false },
      select: {
        renovateAdopted: true,
      },
    });

    return {
      dependencyTrends,
      adoptionHistory: {
        currentAdopted: adoptionTrend.filter((r: { renovateAdopted: boolean }) => r.renovateAdopted).length,
        currentTotal: adoptionTrend.length,
      },
    };
  }

  async getDashboardActivity(): Promise<{
    type: 'scan' | 'dependency';
    timestamp: Date;
    repository: string;
    details: Record<string, unknown>;
  }[]> {
    const [recentScans, recentDependencyUpdates] = await Promise.all([
      this.prisma.scanHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          repository: {
            select: { name: true, fullName: true },
          },
        },
      }),
      this.prisma.dependency.findMany({
        where: { hasOpenPR: true },
        orderBy: { lastCheckedAt: 'desc' },
        take: 10,
        include: {
          repository: {
            select: { name: true, fullName: true },
          },
        },
      }),
    ]);

    // Define types for Prisma results
    type ScanWithRepo = typeof recentScans[number];
    type DepWithRepo = typeof recentDependencyUpdates[number];

    // Combine and sort by timestamp
    const activities = [
      ...recentScans.map((scan: ScanWithRepo) => ({
        type: 'scan' as const,
        timestamp: scan.createdAt,
        repository: scan.repository.name,
        details: {
          status: scan.status,
          newUpdates: scan.newUpdatesFound,
          duration: scan.durationMs,
        },
      })),
      ...recentDependencyUpdates.map((dep: DepWithRepo) => ({
        type: 'dependency' as const,
        timestamp: dep.lastCheckedAt,
        repository: dep.repository.name,
        details: {
          package: dep.packageName,
          updateType: dep.updateType,
          prUrl: dep.prUrl,
        },
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);

    return activities;
  }

  async getTopOutdatedDependencies(limit: number): Promise<{
    packageName: string;
    packageManager: string;
    dependencyType: DependencyType;
    currentVersion: string;
    latestVersion: string;
    updateType: UpdateType | null;
    occurrences: number;
    repositories: {
      id: string;
      name: string;
      hasOpenPR: boolean;
      prUrl: string | null;
    }[];
  }[]> {
    // Get all outdated dependencies with repository info
    const outdatedDeps = await this.prisma.dependency.findMany({
      where: { isOutdated: true },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by package name + package manager
    const grouped = new Map<string, {
      packageName: string;
      packageManager: string;
      dependencyType: DependencyType;
      currentVersion: string;
      latestVersion: string;
      updateType: UpdateType | null;
      repositories: Map<string, {
        id: string;
        name: string;
        hasOpenPR: boolean;
        prUrl: string | null;
      }>;
    }>();

    for (const dep of outdatedDeps) {
      const key = `${dep.packageName}@${dep.packageManager}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          packageName: dep.packageName,
          packageManager: dep.packageManager,
          dependencyType: dep.dependencyType as DependencyType,
          currentVersion: dep.currentVersion,
          latestVersion: dep.latestVersion || dep.currentVersion,
          updateType: dep.updateType as UpdateType | null,
          repositories: new Map(),
        });
      }

      const group = grouped.get(key)!;
      
      if (!group.repositories.has(dep.repository.id)) {
        group.repositories.set(dep.repository.id, {
          id: dep.repository.id,
          name: dep.repository.name,
          hasOpenPR: dep.hasOpenPR,
          prUrl: dep.prUrl,
        });
      }
    }

    // Define priority for update types
    const updateTypePriority: Record<string, number> = {
      'major': 3,
      'minor': 2,
      'patch': 1,
      'digest': 0,
      'pin': 0,
      'rollback': 0,
      'bump': 0,
    };

    // Convert to array and sort by occurrence count, then by priority
    const result = Array.from(grouped.values())
      .map(group => ({
        packageName: group.packageName,
        packageManager: group.packageManager,
        dependencyType: group.dependencyType,
        currentVersion: group.currentVersion,
        latestVersion: group.latestVersion,
        updateType: group.updateType,
        occurrences: group.repositories.size,
        repositories: Array.from(group.repositories.values()),
      }))
      .sort((a, b) => {
        // First, sort by occurrence count (descending)
        if (b.occurrences !== a.occurrences) {
          return b.occurrences - a.occurrences;
        }
        // Then, sort by update type priority (descending)
        const priorityA = updateTypePriority[a.updateType || ''] || 0;
        const priorityB = updateTypePriority[b.updateType || ''] || 0;
        return priorityB - priorityA;
      })
      .slice(0, limit);

    return result;
  }

  // Critical updates for scheduler
  async getCriticalUpdates(limit = 20): Promise<{
    repo: string;
    dependency: string;
    updateType: string;
  }[]> {
    const criticalDeps = await this.prisma.dependency.findMany({
      where: {
        isOutdated: true,
        updateType: 'major',
      },
      include: {
        repository: {
          select: { name: true },
        },
      },
      take: limit,
    });

    type CriticalDep = typeof criticalDeps[number];
    return criticalDeps.map((dep: CriticalDep) => ({
      repo: dep.repository.name,
      dependency: dep.packageName,
      updateType: dep.updateType || 'major',
    }));
  }

  // Weekly stats for scheduler
  async getWeeklyStats(): Promise<{
    totalRepos: number;
    adoptedRepos: number;
    outdatedDeps: number;
    newUpdates: number;
  }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalRepos, adoptedRepos, outdatedDeps, newUpdates] = await Promise.all([
      this.prisma.repository.count({ where: { isArchived: false } }),
      this.prisma.repository.count({ where: { isArchived: false, renovateAdopted: true } }),
      this.prisma.dependency.count({ where: { isOutdated: true } }),
      this.prisma.scanHistory.aggregate({
        where: { createdAt: { gte: oneWeekAgo } },
        _sum: { newUpdatesFound: true },
      }),
    ]);

    return {
      totalRepos,
      adoptedRepos,
      outdatedDeps,
      newUpdates: newUpdates._sum.newUpdatesFound || 0,
    };
  }
}
