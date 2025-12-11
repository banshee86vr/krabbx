// Storage types that mirror Prisma models but are storage-agnostic

export interface Repository {
  id: string;
  githubId: number;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  renovateAdopted: boolean;
  renovateConfigPath: string | null;
  renovateConfigValid: boolean | null;
  lastScanAt: Date | null;
  outdatedDependencies: number;
  totalDependencies: number;
  openRenovatePRs: number;
  htmlUrl: string;
  isArchived: boolean;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dependency {
  id: string;
  repositoryId: string;
  packageName: string;
  packageManager: string;
  dependencyType: DependencyType;
  currentVersion: string;
  latestVersion: string | null;
  updateType: UpdateType | null;
  isOutdated: boolean;
  hasOpenPR: boolean;
  prUrl: string | null;
  prNumber: number | null;
  sourceFile: string | null;
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanHistory {
  id: string;
  repositoryId: string;
  scanType: ScanType;
  status: ScanStatus;
  totalDependencies: number;
  outdatedDependencies: number;
  newUpdatesFound: number;
  openPRs: number;  // Number of dependencies with open PRs at scan time
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: Date;
}

export interface NotificationConfig {
  id: string;
  type: NotificationType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  triggers: NotificationTrigger[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationHistory {
  id: string;
  type: NotificationType;
  trigger: NotificationTrigger;
  recipient: string;
  subject: string;
  content: string;
  status: NotificationStatus;
  errorMessage: string | null;
  sentAt: Date;
}

export interface AppSettings {
  id: string;
  githubOrg: string;
  scanIntervalMinutes: number;
  maxScanLimit: number;
  lastFullScanAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateType = 'major' | 'minor' | 'patch' | 'digest' | 'pin' | 'rollback' | 'bump';

/**
 * Comprehensive Renovate Bot dependency types based on official documentation
 * Supports 90+ package managers - this includes the most commonly used ones
 */
export type DependencyType = 
  // JavaScript/TypeScript
  | 'npm'
  | 'yarn'
  | 'pnpm'
  // Python
  | 'pip'
  | 'pip_requirements'
  | 'pipenv'
  | 'poetry'
  // Java
  | 'maven'
  | 'gradle'
  // Go
  | 'gomod'
  // Rust
  | 'cargo'
  // PHP
  | 'composer'
  // Ruby
  | 'bundler'
  // .NET
  | 'nuget'
  // Docker
  | 'docker'
  | 'dockerfile'
  | 'docker_image'
  // Terraform (KEPT SEPARATE as requested)
  | 'terraform_provider'  // Terraform providers (e.g., hashicorp/aws)
  | 'terraform_module'    // Terraform modules (e.g., registry modules)
  | 'terraform'           // General terraform dependencies
  // Kubernetes & Cloud Native
  | 'kubernetes'
  | 'helm'
  | 'kustomize'
  // CI/CD & GitHub
  | 'github_action'
  | 'github_releases'
  | 'github_tags'
  | 'circleci'
  | 'azure_pipelines'
  | 'gitlab_ci'
  // Infrastructure as Code
  | 'ansible'
  | 'argocd'
  | 'flux'
  // Other common managers
  | 'bazel'
  | 'cocoapods'
  | 'swift'
  | 'homebrew'
  | 'asdf'
  // Generic/Fallback types
  | 'package'   // Generic package (fallback)
  | 'provider'  // Generic provider (fallback)
  | 'action'    // Generic action (fallback)
  | 'workflow'; // Generic workflow (fallback)

export type ScanType = 'full' | 'incremental' | 'manual';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type NotificationType = 'teams' | 'email' | 'inApp';
export type NotificationTrigger = 'critical' | 'newAdoption' | 'stalePR' | 'scanComplete';
export type NotificationStatus = 'sent' | 'failed' | 'pending';

// Query types
export interface RepositoryFilters {
  isArchived?: boolean;
  renovateAdopted?: boolean;
  hasOutdated?: boolean;
  search?: string;
}

export interface DependencyFilters {
  repositoryId?: string;
  isOutdated?: boolean;
  packageManager?: string;
  updateType?: UpdateType;
  hasOpenPR?: boolean;
  search?: string;
}

export interface PaginationOptions {
  skip?: number;
  take?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

// Storage interface
export interface IStorage {
  // Repositories
  getRepositories(filters?: RepositoryFilters, pagination?: PaginationOptions): Promise<{ data: Repository[]; total: number }>;
  getRepositoryById(id: string): Promise<Repository | null>;
  getRepositoryByGithubId(githubId: number): Promise<Repository | null>;
  upsertRepository(data: Partial<Repository> & { githubId: number }): Promise<Repository>;
  updateRepository(id: string, data: Partial<Repository>): Promise<Repository>;

  // Dependencies
  getDependencies(filters?: DependencyFilters, pagination?: PaginationOptions): Promise<{ data: (Dependency & { repository?: Repository })[]; total: number }>;
  getDependencyById(id: string): Promise<Dependency | null>;
  upsertDependency(repositoryId: string, packageName: string, packageManager: string, data: Partial<Dependency>): Promise<Dependency>;
  updateDependenciesForRepo(repositoryId: string, excludePackages: string[], updates: Partial<Dependency>): Promise<void>;
  getDistinctPackageManagers(): Promise<string[]>;

  // Scan History
  createScanHistory(data: Omit<ScanHistory, 'id' | 'createdAt'>): Promise<ScanHistory>;
  getScanHistory(repositoryId?: string, limit?: number): Promise<ScanHistory[]>;

  // Notification Config
  getNotificationConfigs(): Promise<NotificationConfig[]>;
  getNotificationConfigById(id: string): Promise<NotificationConfig | null>;
  createNotificationConfig(data: Omit<NotificationConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationConfig>;
  updateNotificationConfig(id: string, data: Partial<NotificationConfig>): Promise<NotificationConfig>;
  deleteNotificationConfig(id: string): Promise<void>;
  getNotificationConfigsByTrigger(trigger: NotificationTrigger): Promise<NotificationConfig[]>;

  // Notification History
  createNotificationHistory(data: Omit<NotificationHistory, 'id' | 'sentAt'>): Promise<NotificationHistory>;
  getNotificationHistory(pagination?: PaginationOptions, type?: NotificationType): Promise<{ data: NotificationHistory[]; total: number }>;

  // App Settings
  getAppSettings(): Promise<AppSettings | null>;
  upsertAppSettings(data: Partial<AppSettings>): Promise<AppSettings>;

  // Stats
  getRepositoryStats(): Promise<{
    total: number;
    adopted: number;
    archived: number;
    withOutdated: number;
  }>;
  getDependencyStats(): Promise<{
    total: number;
    outdated: number;
    withOpenPR: number;
    byUpdateType: { type: string | null; count: number }[];
    byPackageManager: { manager: string; count: number }[];
    byDependencyType: { type: DependencyType; count: number }[];
  }>;

  // Dashboard specific
  getDashboardSummary(): Promise<{
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
  }>;

  getDashboardTrends(days: number): Promise<{
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
  }>;

  getDashboardActivity(): Promise<{
    type: 'scan' | 'dependency';
    timestamp: Date;
    repository: string;
    details: Record<string, unknown>;
  }[]>;

  // Top outdated dependencies across all repositories
  getTopOutdatedDependencies(limit: number): Promise<{
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
  }[]>;

  // Critical updates for scheduler
  getCriticalUpdates(limit?: number): Promise<{
    repo: string;
    dependency: string;
    updateType: string;
  }[]>;

  // Weekly stats for scheduler
  getWeeklyStats(): Promise<{
    totalRepos: number;
    adoptedRepos: number;
    outdatedDeps: number;
    newUpdates: number;
  }>;
}
