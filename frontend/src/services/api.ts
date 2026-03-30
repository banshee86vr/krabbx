import type {
  Repository,
  Dependency,
  DashboardSummary,
  DependencyStats,
  NotificationConfig,
  NotificationHistory,
  AppSettings,
  PaginatedResponse,
} from '../types';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error ${response.status}`);
  }

  return response.json();
}

// Dashboard
export const dashboardApi = {
  getSummary: () => fetchApi<DashboardSummary>('/dashboard/summary'),
  getTrends: (days = 30) => fetchApi<{
    dependencyTrends: Array<{
      date: string;
      timestamp: string;
      totalDependencies: number;
      outdatedDependencies: number;
      newUpdates: number;
      scans: number;
    }>;
    adoptionHistory: {
      currentAdopted: number;
      currentTotal: number;
    };
  }>(`/dashboard/trends?days=${days}`),
  getActivity: () => fetchApi<Array<{
    type: 'scan' | 'dependency';
    timestamp: string;
    repository: string;
    details: Record<string, unknown>;
  }>>('/dashboard/activity'),
  getGitHubStatus: () => fetchApi<{
    rateLimit: { remaining: number; limit: number; reset: Date };
    percentUsed: number;
  }>('/dashboard/github-status'),
  getTopOutdated: (limit = 10) => fetchApi<Array<{
    packageName: string;
    packageManager: string;
    dependencyType: string;
    currentVersion: string;
    latestVersion: string;
    updateType: string | null;
    occurrences: number;
    repositories: Array<{
      id: string;
      name: string;
      hasOpenPR: boolean;
      prUrl: string | null;
    }>;
  }>>(`/dashboard/top-outdated?limit=${limit}`),
};

// Repositories
export interface RepositoryFilters {
  page?: number;
  limit?: number;
  adopted?: 'true' | 'false' | 'all';
  hasOutdated?: 'true' | 'false' | 'all';
  search?: string;
  sortBy?: 'name' | 'renovateAdopted' | 'outdatedDependencies' | 'lastScanAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const repositoryApi = {
  list: (filters: RepositoryFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    return fetchApi<PaginatedResponse<Repository>>(`/repositories?${params}`);
  },
  get: (id: string) => fetchApi<Repository>(`/repositories/${id}`),
  getScanStatus: () => fetchApi<{
    isScanning: boolean;
    scannedCount: number;
    totalToScan: number;
    progress: number;
    rateLimited: boolean;
    totalAvailable: number;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
  }>('/repositories/scan/status'),
  getStats: () => fetchApi<{
    totalRepositories: number;
    adoptedRepositories: number;
    notAdoptedRepositories: number;
    adoptionRate: number;
    repositoriesWithOutdated: number;
  }>('/repositories/stats'),
  scan: () => fetchApi<{ message: string; status: string }>('/repositories/scan', { method: 'POST' }),
  scanOne: (id: string) => fetchApi<{ message: string; result: unknown }>(`/repositories/${id}/scan`, { method: 'POST' }),
};

// Dependencies
export interface DependencyFilters {
  page?: number;
  limit?: number;
  isOutdated?: 'true' | 'false' | 'all';
  packageManager?: string;
  updateType?: 'major' | 'minor' | 'patch' | 'digest' | 'pin' | 'all';
  hasOpenPR?: 'true' | 'false' | 'all';
  search?: string;
  repositoryId?: string;
  sortBy?: 'packageName' | 'updateType' | 'lastCheckedAt';
  sortOrder?: 'asc' | 'desc';
}

export const dependencyApi = {
  list: (filters: DependencyFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    return fetchApi<PaginatedResponse<Dependency>>(`/dependencies?${params}`);
  },
  listOutdated: (filters: DependencyFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    return fetchApi<PaginatedResponse<Dependency>>(`/dependencies/outdated?${params}`);
  },
  getStats: () => fetchApi<DependencyStats>('/dependencies/stats'),
  getPackageManagers: () => fetchApi<string[]>('/dependencies/package-managers'),
};

// Notifications
export const notificationApi = {
  getConfigs: () => fetchApi<NotificationConfig[]>('/notifications/config'),
  createConfig: (data: Omit<NotificationConfig, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetchApi<NotificationConfig>('/notifications/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateConfig: (id: string, data: Partial<NotificationConfig>) =>
    fetchApi<NotificationConfig>(`/notifications/config/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteConfig: (id: string) =>
    fetchApi<void>(`/notifications/config/${id}`, { method: 'DELETE' }),
  test: (type: 'teams' | 'email' | 'inApp') =>
    fetchApi<{ message: string }>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
  getHistory: (page = 1, limit = 20) =>
    fetchApi<PaginatedResponse<NotificationHistory>>(`/notifications/history?page=${page}&limit=${limit}`),
  getTriggers: () => fetchApi<string[]>('/notifications/triggers'),
};

// Settings
export const settingsApi = {
  get: () => fetchApi<AppSettings>('/settings'),
  update: (data: { scanIntervalMinutes?: number; maxScanLimit?: number }) =>
    fetchApi<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
