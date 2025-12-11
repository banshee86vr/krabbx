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

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export class MemoryStorage implements IStorage {
  private repositories: Map<string, Repository> = new Map();
  private dependencies: Map<string, Dependency> = new Map();
  private scanHistory: ScanHistory[] = [];
  private notificationConfigs: Map<string, NotificationConfig> = new Map();
  private notificationHistory: NotificationHistory[] = [];
  private appSettings: AppSettings | null = null;

  // Helper to match filters
  private matchesSearch(text: string | null | undefined, search: string): boolean {
    if (!text) return false;
    return text.toLowerCase().includes(search.toLowerCase());
  }

  // Repositories
  async getRepositories(
    filters?: RepositoryFilters,
    pagination?: PaginationOptions
  ): Promise<{ data: Repository[]; total: number }> {
    let repos = Array.from(this.repositories.values());

    // Apply filters
    if (filters) {
      if (filters.isArchived !== undefined) {
        repos = repos.filter(r => r.isArchived === filters.isArchived);
      }
      if (filters.renovateAdopted !== undefined) {
        repos = repos.filter(r => r.renovateAdopted === filters.renovateAdopted);
      }
      if (filters.hasOutdated !== undefined) {
        repos = repos.filter(r =>
          filters.hasOutdated ? r.outdatedDependencies > 0 : r.outdatedDependencies === 0
        );
      }
      if (filters.search) {
        const search = filters.search;
        repos = repos.filter(r =>
          this.matchesSearch(r.name, search) ||
          this.matchesSearch(r.fullName, search) ||
          this.matchesSearch(r.description, search)
        );
      }
    }

    const total = repos.length;

    // Apply sorting by the requested field only
    if (pagination?.orderBy) {
      const dir = pagination.orderDir === 'desc' ? -1 : 1;
      repos.sort((a, b) => {
        const aVal = a[pagination.orderBy as keyof Repository];
        const bVal = b[pagination.orderBy as keyof Repository];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
      });
    }

    // Apply pagination
    if (pagination?.skip !== undefined || pagination?.take !== undefined) {
      const skip = pagination.skip || 0;
      const take = pagination.take || repos.length;
      repos = repos.slice(skip, skip + take);
    }

    return { data: repos, total };
  }

  async getRepositoryById(id: string): Promise<Repository | null> {
    return this.repositories.get(id) || null;
  }

  async getRepositoryByGithubId(githubId: number): Promise<Repository | null> {
    for (const repo of this.repositories.values()) {
      if (repo.githubId === githubId) return repo;
    }
    return null;
  }

  async upsertRepository(data: Partial<Repository> & { githubId: number }): Promise<Repository> {
    let existing = await this.getRepositoryByGithubId(data.githubId);

    if (existing) {
      const updated: Repository = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      this.repositories.set(existing.id, updated);
      return updated;
    }

    const newRepo: Repository = {
      id: generateId(),
      githubId: data.githubId,
      name: data.name || '',
      fullName: data.fullName || '',
      description: data.description || null,
      defaultBranch: data.defaultBranch || 'main',
      renovateAdopted: data.renovateAdopted || false,
      renovateConfigPath: data.renovateConfigPath || null,
      renovateConfigValid: data.renovateConfigValid ?? null,
      lastScanAt: data.lastScanAt || null,
      outdatedDependencies: data.outdatedDependencies || 0,
      totalDependencies: data.totalDependencies || 0,
      openRenovatePRs: data.openRenovatePRs || 0,
      htmlUrl: data.htmlUrl || '',
      isArchived: data.isArchived || false,
      isPrivate: data.isPrivate || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.repositories.set(newRepo.id, newRepo);
    return newRepo;
  }

  async updateRepository(id: string, data: Partial<Repository>): Promise<Repository> {
    const existing = this.repositories.get(id);
    if (!existing) throw new Error('Repository not found');

    const updated: Repository = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.repositories.set(id, updated);
    return updated;
  }

  // Dependencies
  async getDependencies(
    filters?: DependencyFilters,
    pagination?: PaginationOptions
  ): Promise<{ data: (Dependency & { repository?: Repository })[]; total: number }> {
    let deps = Array.from(this.dependencies.values());

    // Apply filters
    if (filters) {
      if (filters.repositoryId) {
        deps = deps.filter(d => d.repositoryId === filters.repositoryId);
      }
      if (filters.isOutdated !== undefined) {
        deps = deps.filter(d => d.isOutdated === filters.isOutdated);
      }
      if (filters.packageManager) {
        deps = deps.filter(d => d.packageManager === filters.packageManager);
      }
      if (filters.updateType) {
        deps = deps.filter(d => d.updateType === filters.updateType);
      }
      if (filters.hasOpenPR !== undefined) {
        deps = deps.filter(d => d.hasOpenPR === filters.hasOpenPR);
      }
      if (filters.search) {
        const search = filters.search;
        deps = deps.filter(d => this.matchesSearch(d.packageName, search));
      }
    }

    const total = deps.length;

    // Apply sorting
    if (pagination?.orderBy) {
      const dir = pagination.orderDir === 'desc' ? -1 : 1;
      deps.sort((a, b) => {
        const aVal = a[pagination.orderBy as keyof Dependency];
        const bVal = b[pagination.orderBy as keyof Dependency];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
      });
    }

    // Apply pagination
    if (pagination?.skip !== undefined || pagination?.take !== undefined) {
      const skip = pagination.skip || 0;
      const take = pagination.take || deps.length;
      deps = deps.slice(skip, skip + take);
    }

    // Add repository info
    const result = deps.map(d => ({
      ...d,
      repository: this.repositories.get(d.repositoryId),
    }));

    return { data: result, total };
  }

  async getDependencyById(id: string): Promise<Dependency | null> {
    return this.dependencies.get(id) || null;
  }

  async upsertDependency(
    repositoryId: string,
    packageName: string,
    packageManager: string,
    data: Partial<Dependency>
  ): Promise<Dependency> {
    // Find existing by composite key
    let existing: Dependency | undefined;
    for (const dep of this.dependencies.values()) {
      if (dep.repositoryId === repositoryId &&
          dep.packageName === packageName &&
          dep.packageManager === packageManager) {
        existing = dep;
        break;
      }
    }

    if (existing) {
      const updated: Dependency = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      this.dependencies.set(existing.id, updated);
      return updated;
    }

    const newDep: Dependency = {
      id: generateId(),
      repositoryId,
      packageName,
      packageManager,
      dependencyType: data.dependencyType || 'package',
      currentVersion: data.currentVersion || 'unknown',
      latestVersion: data.latestVersion || null,
      updateType: data.updateType || null,
      isOutdated: data.isOutdated || false,
      hasOpenPR: data.hasOpenPR || false,
      prUrl: data.prUrl || null,
      prNumber: data.prNumber || null,
      sourceFile: data.sourceFile || null,
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dependencies.set(newDep.id, newDep);
    return newDep;
  }

  async updateDependenciesForRepo(
    repositoryId: string,
    excludePackages: string[],
    updates: Partial<Dependency>
  ): Promise<void> {
    for (const [id, dep] of this.dependencies.entries()) {
      if (dep.repositoryId === repositoryId && !excludePackages.includes(dep.packageName)) {
        this.dependencies.set(id, {
          ...dep,
          ...updates,
          updatedAt: new Date(),
        });
      }
    }
  }

  async getDistinctPackageManagers(): Promise<string[]> {
    const managers = new Set<string>();
    for (const dep of this.dependencies.values()) {
      managers.add(dep.packageManager);
    }
    return Array.from(managers);
  }

  // Scan History
  async createScanHistory(data: Omit<ScanHistory, 'id' | 'createdAt'>): Promise<ScanHistory> {
    const scan: ScanHistory = {
      id: generateId(),
      ...data,
      createdAt: new Date(),
    };
    this.scanHistory.unshift(scan); // Add to beginning
    // Keep only last 1000 entries
    if (this.scanHistory.length > 1000) {
      this.scanHistory = this.scanHistory.slice(0, 1000);
    }
    return scan;
  }

  async getScanHistory(repositoryId?: string, limit = 10): Promise<ScanHistory[]> {
    let history = this.scanHistory;
    if (repositoryId) {
      history = history.filter(h => h.repositoryId === repositoryId);
    }
    return history.slice(0, limit);
  }

  // Notification Config
  async getNotificationConfigs(): Promise<NotificationConfig[]> {
    return Array.from(this.notificationConfigs.values());
  }

  async getNotificationConfigById(id: string): Promise<NotificationConfig | null> {
    return this.notificationConfigs.get(id) || null;
  }

  async createNotificationConfig(
    data: Omit<NotificationConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationConfig> {
    const config: NotificationConfig = {
      id: generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.notificationConfigs.set(config.id, config);
    return config;
  }

  async updateNotificationConfig(id: string, data: Partial<NotificationConfig>): Promise<NotificationConfig> {
    const existing = this.notificationConfigs.get(id);
    if (!existing) throw new Error('Notification config not found');

    const updated: NotificationConfig = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.notificationConfigs.set(id, updated);
    return updated;
  }

  async deleteNotificationConfig(id: string): Promise<void> {
    this.notificationConfigs.delete(id);
  }

  async getNotificationConfigsByTrigger(trigger: NotificationTrigger): Promise<NotificationConfig[]> {
    return Array.from(this.notificationConfigs.values()).filter(
      c => c.enabled && c.triggers.includes(trigger)
    );
  }

  // Notification History
  async createNotificationHistory(
    data: Omit<NotificationHistory, 'id' | 'sentAt'>
  ): Promise<NotificationHistory> {
    const history: NotificationHistory = {
      id: generateId(),
      ...data,
      sentAt: new Date(),
    };
    this.notificationHistory.unshift(history);
    // Keep only last 500 entries
    if (this.notificationHistory.length > 500) {
      this.notificationHistory = this.notificationHistory.slice(0, 500);
    }
    return history;
  }

  async getNotificationHistory(
    pagination?: PaginationOptions,
    type?: NotificationType
  ): Promise<{ data: NotificationHistory[]; total: number }> {
    let history = this.notificationHistory;
    if (type) {
      history = history.filter(h => h.type === type);
    }
    const total = history.length;

    if (pagination?.skip !== undefined || pagination?.take !== undefined) {
      const skip = pagination.skip || 0;
      const take = pagination.take || history.length;
      history = history.slice(skip, skip + take);
    }

    return { data: history, total };
  }

  // App Settings
  async getAppSettings(): Promise<AppSettings | null> {
    return this.appSettings;
  }

  async upsertAppSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    if (this.appSettings) {
      this.appSettings = {
        ...this.appSettings,
        ...data,
        updatedAt: new Date(),
      };
    } else {
      this.appSettings = {
        id: 'app-settings',
        githubOrg: data.githubOrg || '',
        scanIntervalMinutes: data.scanIntervalMinutes || 60,
        maxScanLimit: data.maxScanLimit ?? 0,
        lastFullScanAt: data.lastFullScanAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return this.appSettings;
  }

  // Stats
  async getRepositoryStats(): Promise<{
    total: number;
    adopted: number;
    archived: number;
    withOutdated: number;
  }> {
    const repos = Array.from(this.repositories.values());
    const nonArchived = repos.filter(r => !r.isArchived);

    return {
      total: nonArchived.length,
      adopted: nonArchived.filter(r => r.renovateAdopted).length,
      archived: repos.filter(r => r.isArchived).length,
      withOutdated: nonArchived.filter(r => r.outdatedDependencies > 0).length,
    };
  }

  async getDependencyStats(): Promise<{
    total: number;
    outdated: number;
    withOpenPR: number;
    byUpdateType: { type: string | null; count: number }[];
    byPackageManager: { manager: string; count: number }[];
    byDependencyType: { type: DependencyType; count: number }[];
  }> {
    const deps = Array.from(this.dependencies.values());

    // Count UNIQUE dependencies by packageName@packageManager
    const uniquePackages = new Map<string, {
      isOutdated: boolean;
      updateType: string | null;
      packageManager: string;
      dependencyType: DependencyType;
    }>();

    for (const dep of deps) {
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
      withOpenPR: deps.filter(d => d.hasOpenPR).length, // Total PRs (not deduplicated)
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
    const repos = Array.from(this.repositories.values());
    const nonArchivedRepos = repos.filter(r => !r.isArchived);
    const deps = Array.from(this.dependencies.values());

    const totalRepos = nonArchivedRepos.length;
    const adoptedRepos = nonArchivedRepos.filter(r => r.renovateAdopted).length;
    const archivedRepos = repos.filter(r => r.isArchived).length;
    
    // Count UNIQUE dependencies by packageName@packageManager
    const uniquePackages = new Map<string, {
      isOutdated: boolean;
      hasOpenPR: boolean;
    }>();

    for (const dep of deps) {
      const key = `${dep.packageName}@${dep.packageManager}`;
      if (!uniquePackages.has(key)) {
        uniquePackages.set(key, {
          isOutdated: dep.isOutdated,
          hasOpenPR: dep.hasOpenPR,
        });
      } else {
        const existing = uniquePackages.get(key)!;
        existing.isOutdated = existing.isOutdated || dep.isOutdated;
        existing.hasOpenPR = existing.hasOpenPR || dep.hasOpenPR;
      }
    }

    const totalDependencies = uniquePackages.size;
    const outdatedDependencies = Array.from(uniquePackages.values()).filter(p => p.isOutdated).length;
    const openPRs = deps.filter(d => d.hasOpenPR).length; // Total PRs (not deduplicated)

    const adoptionRate = totalRepos > 0 ? Math.round((adoptedRepos / totalRepos) * 100) : 0;

    // Get recent scans with repository name
    const recentScans = this.scanHistory.slice(0, 5).map(scan => {
      const repo = this.repositories.get(scan.repositoryId);
      return {
        ...scan,
        repository: repo ? { name: repo.name } : undefined,
      };
    });

    // Get top outdated repositories with update type breakdown
    const topOutdated = nonArchivedRepos
      .filter(r => r.outdatedDependencies > 0)
      .sort((a, b) => b.outdatedDependencies - a.outdatedDependencies)
      .slice(0, 5)
      .map(r => {
        // Count update types for this repository's outdated dependencies
        const repoDeps = deps.filter(d => d.repositoryId === r.id && d.isOutdated);
        const major = repoDeps.filter(d => d.updateType === 'major').length;
        const minor = repoDeps.filter(d => d.updateType === 'minor').length;
        const patch = repoDeps.filter(d => d.updateType === 'patch').length;
        
        return {
          id: r.id,
          name: r.name,
          outdatedDependencies: r.outdatedDependencies,
          totalDependencies: r.totalDependencies || 0,
          updateTypeSummary: {
            major,
            minor,
            patch,
          },
        };
      });

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
      recentScans,
      topOutdated,
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

    // Filter scan history: only organization-level scans (scanType: 'full')
    // This ensures ONE data point per organization scan, not per repository
    const filteredHistory = this.scanHistory
      .filter(scan => 
        scan.createdAt >= startDate && 
        scan.status === 'completed' &&
        scan.scanType === 'full'  // ONLY organization-level scans
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Map each organization scan to a data point
    // Each entry represents one complete organization scan
    const dependencyTrends = filteredHistory.map(scan => ({
      date: scan.createdAt.toISOString().split('T')[0] ?? '',
      timestamp: scan.createdAt.toISOString(),
      totalDependencies: scan.totalDependencies,
      outdatedDependencies: scan.outdatedDependencies,
      newUpdates: scan.newUpdatesFound,
      openPRs: scan.openPRs || 0,
      scans: 1,
    }));

    // Get adoption history
    const nonArchivedRepos = Array.from(this.repositories.values()).filter(r => !r.isArchived);

    return {
      dependencyTrends,
      adoptionHistory: {
        currentAdopted: nonArchivedRepos.filter(r => r.renovateAdopted).length,
        currentTotal: nonArchivedRepos.length,
      },
    };
  }

  async getDashboardActivity(): Promise<{
    type: 'scan' | 'dependency';
    timestamp: Date;
    repository: string;
    details: Record<string, unknown>;
  }[]> {
    const recentScans = this.scanHistory.slice(0, 10);
    const recentDependencyUpdates = Array.from(this.dependencies.values())
      .filter(d => d.hasOpenPR)
      .sort((a, b) => b.lastCheckedAt.getTime() - a.lastCheckedAt.getTime())
      .slice(0, 10);

    const activities = [
      ...recentScans.map(scan => ({
        type: 'scan' as const,
        timestamp: scan.createdAt,
        repository: this.repositories.get(scan.repositoryId)?.name || 'unknown',
        details: {
          status: scan.status,
          newUpdates: scan.newUpdatesFound,
          duration: scan.durationMs,
        },
      })),
      ...recentDependencyUpdates.map(dep => ({
        type: 'dependency' as const,
        timestamp: dep.lastCheckedAt,
        repository: this.repositories.get(dep.repositoryId)?.name || 'unknown',
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
    // Get all outdated dependencies
    const outdatedDeps = Array.from(this.dependencies.values()).filter(d => d.isOutdated);

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
          dependencyType: dep.dependencyType,
          currentVersion: dep.currentVersion,
          latestVersion: dep.latestVersion || dep.currentVersion,
          updateType: dep.updateType,
          repositories: new Map(),
        });
      }

      const group = grouped.get(key)!;
      const repo = this.repositories.get(dep.repositoryId);
      
      if (repo && !group.repositories.has(repo.id)) {
        group.repositories.set(repo.id, {
          id: repo.id,
          name: repo.name,
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
    const criticalDeps = Array.from(this.dependencies.values())
      .filter(d => d.isOutdated && d.updateType === 'major')
      .slice(0, limit);

    return criticalDeps.map(dep => ({
      repo: this.repositories.get(dep.repositoryId)?.name || 'unknown',
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

    const nonArchivedRepos = Array.from(this.repositories.values()).filter(r => !r.isArchived);
    const deps = Array.from(this.dependencies.values());

    const weeklyScans = this.scanHistory.filter(s => s.createdAt >= oneWeekAgo);
    const newUpdates = weeklyScans.reduce((sum, s) => sum + s.newUpdatesFound, 0);

    return {
      totalRepos: nonArchivedRepos.length,
      adoptedRepos: nonArchivedRepos.filter(r => r.renovateAdopted).length,
      outdatedDeps: deps.filter(d => d.isOutdated).length,
      newUpdates,
    };
  }
}
