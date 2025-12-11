import type {
  Repository,
  Dependency,
  DashboardSummary,
  GamificationSummary,
  DependencyStats,
  AppSettings,
  PaginatedResponse,
  RepositoryDetailPayload,
} from '../types';

const API_BASE = '/api';

let csrfTokenCache: string | null = null;

/** Called when /api/auth/status returns a fresh token */
export function setCsrfToken(token: string | null): void {
  csrfTokenCache = token;
}

export function clearCsrfToken(): void {
  csrfTokenCache = null;
}

export async function refreshCsrfToken(): Promise<string> {
  const r = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  if (!r.ok) {
    throw new Error('Failed to refresh CSRF token');
  }
  const data = (await r.json()) as { csrfToken: string };
  csrfTokenCache = data.csrfToken;
  return csrfTokenCache;
}

async function csrfHeadersFor(method: string): Promise<Record<string, string>> {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') {
    return {};
  }
  if (!csrfTokenCache) {
    await refreshCsrfToken();
  }
  return { 'X-CSRF-Token': csrfTokenCache! };
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase();
  const csrf = await csrfHeadersFor(method);
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrf,
      ...(options?.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    if (response.status === 403 && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      await refreshCsrfToken();
      const retry = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfTokenCache!,
          ...(options?.headers as Record<string, string>),
        },
      });
      if (retry.ok) {
        return retry.json();
      }
    }
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error((error as { message?: string }).message || `HTTP error ${response.status}`);
  }

  return response.json();
}

/** Logout with CSRF header (same-origin /api). */
export async function authApiLogout(): Promise<void> {
  await fetchApi('/auth/logout', { method: 'POST', body: '{}' });
  clearCsrfToken();
}

// Dashboard
export const dashboardApi = {
  getSummary: () => fetchApi<DashboardSummary>('/dashboard/summary'),
  getTrends: (days = 30) =>
    fetchApi<{
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
  getActivity: () =>
    fetchApi<
      Array<{
        type: 'scan' | 'dependency';
        timestamp: string;
        repository: string;
        details: Record<string, unknown>;
      }>
    >('/dashboard/activity'),
  getGitHubStatus: () =>
    fetchApi<{
      rateLimit: { remaining: number; limit: number; reset: Date };
      percentUsed: number;
    }>('/dashboard/github-status'),
  getTopOutdated: (limit = 10) =>
    fetchApi<
      Array<{
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
      }>
    >(`/dashboard/top-outdated?limit=${limit}`),
  getGamification: () => fetchApi<GamificationSummary>('/dashboard/gamification'),
};

// Repositories
export interface RepositoryFilters {
  page?: number;
  limit?: number;
  adopted?: 'true' | 'false' | 'all';
  hasOutdated?: 'true' | 'false' | 'all';
  search?: string;
  sortBy?:
    | 'name'
    | 'renovateAdopted'
    | 'outdatedDependencies'
    | 'lastScanAt'
    | 'updatedAt'
    | 'healthScore';
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
  get: (id: string) => fetchApi<RepositoryDetailPayload>(`/repositories/${id}`),
  getScanStatus: () =>
    fetchApi<{
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
  getStats: () =>
    fetchApi<{
      totalRepositories: number;
      adoptedRepositories: number;
      notAdoptedRepositories: number;
      adoptionRate: number;
      repositoriesWithOutdated: number;
    }>('/repositories/stats'),
  scan: () => fetchApi<{ message: string; status: string }>('/repositories/scan', { method: 'POST' }),
  scanOne: (id: string) =>
    fetchApi<{ message: string; result: unknown }>(`/repositories/${id}/scan`, { method: 'POST' }),
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

// Settings
export const settingsApi = {
  get: () => fetchApi<AppSettings>('/settings'),
  update: (data: { scanIntervalMinutes?: number; maxScanLimit?: number }) =>
    fetchApi<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
