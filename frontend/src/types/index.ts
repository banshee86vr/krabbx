export interface Contributor {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions?: number;
}

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
  lastScanAt: string | null;
  outdatedDependencies: number;
  openRenovatePRs: number;
  /** Present when backend GAMIFICATION_ENABLED=true */
  healthScore?: number;
  htmlUrl: string;
  isArchived: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  contributors?: Contributor[];
  dependencies?: Dependency[];
  scanHistory?: ScanHistory[];
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
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
  repository?: {
    id: string;
    name: string;
    fullName: string;
    htmlUrl?: string;
  };
}

export interface ScanHistory {
  id: string;
  repositoryId: string;
  scanType: 'full' | 'incremental' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalDependencies: number;
  outdatedDependencies: number;
  newUpdatesFound: number;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  repository?: {
    name: string;
  };
}

export type UpdateType = 'major' | 'minor' | 'patch' | 'digest' | 'pin' | 'rollback' | 'bump';

/**
 * Comprehensive Renovate Bot dependency types
 * Matches backend types - supports 40+ package managers
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
  // Terraform (SEPARATE: provider vs module)
  | 'terraform_provider'
  | 'terraform_module'
  | 'terraform'
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
  // Other managers
  | 'bazel'
  | 'cocoapods'
  | 'swift'
  | 'homebrew'
  | 'asdf'
  // Generic/Fallback
  | 'package'
  | 'provider'
  | 'action'
  | 'workflow';

export interface DashboardSummary {
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
  recentScans: ScanHistory[];
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
}

export type GamificationBadgeId =
  | 'debt_crusher_org'
  | 'consistent_maintainer_org'
  | 'zero_major_drift_repo';

export interface GamificationBadgeUnlock {
  badgeId: GamificationBadgeId;
  label: string;
  description: string;
  unlockedAt: string;
  scope: 'organization' | 'repository';
  repositoryId?: string;
  repositoryName?: string;
}

export interface GamificationRepositoryHealth {
  repositoryId: string;
  name: string;
  fullName: string;
  score: number;
  scoreVersion: 'v1';
  outdatedDependencies: number;
  totalDependencies: number;
  majorOutdatedCount: number;
  openRenovatePRs: number;
}

export interface GamificationSummary {
  enabled: boolean;
  scoreVersion: 'v1';
  headline: string;
  orgTrend14d: {
    startOutdated: number | null;
    endOutdated: number | null;
    percentImproved: number | null;
  } | null;
  leaderboard: (GamificationRepositoryHealth & { rank: number })[];
  allRepositoryHealth: GamificationRepositoryHealth[];
  recentBadges: GamificationBadgeUnlock[];
}

/** Mirrors backend `HealthScoreBreakdownV1` — v1 health score math + radar axes */
export interface HealthScoreBreakdownV1 {
  scoreVersion: 'v1';
  finalScore: number;
  inputs: {
    totalDependencies: number;
    outdatedDependencies: number;
    majorOutdatedCount: number;
    openRenovatePRs: number;
  };
  formula: {
    outdatedRatio: number;
    baseFromOutdatedRatio: number;
    majorPenalty: number;
    scoreAfterMajor: number;
    prRemediationBonus: number;
    rawBeforeClamp: number;
  };
  radar: {
    outdatedRatioTerm: number;
    majorDiscipline: number;
    prRemediation: number;
  };
}

/** GET /api/repositories/:id gamification payload when enabled */
export interface RepositoryGamification extends HealthScoreBreakdownV1 {
  organizationRank: number | null;
  totalRankedRepos: number;
}

/** Single-repo API payload including dependency rows and optional gamification breakdown */
export interface RepositoryDetailPayload extends Repository {
  dependencies: Dependency[];
  scanHistory?: ScanHistory[];
  gamification?: RepositoryGamification | null;
}

export interface DependencyStats {
  total: number;
  outdated: number;
  withOpenPR: number;
  byUpdateType: { type: UpdateType | null; count: number }[];
  byPackageManager: { manager: string; count: number }[];
  byDependencyType: { type: DependencyType; count: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AppSettings {
  id: string;
  githubOrg: string;
  scanIntervalMinutes: number;
  maxScanLimit: number;
  lastFullScanAt: string | null;
  github: {
    /** Active scan targets from server config */
    targets: string[];
    /** Deprecated persisted label — use `targets` */
    org: string;
    rateLimit: {
      remaining: number;
      limit: number;
      reset: Date;
    } | null;
  };
  auth?: {
    enabled: boolean;
  };
  redis?: {
    enabled: boolean;
    connected: boolean;
    mode: 'required' | 'optional';
  };
  storageMode?: 'database' | 'memory';
}
