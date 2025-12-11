import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  GitBranch,
  ExternalLink,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Zap,
} from 'lucide-react';
import { repositoryApi, type RepositoryFilters } from '../services/api';
import { cn, formatRelativeTime } from '../lib/utils';
import { useScan } from '../context/ScanContext';
import { useSocket } from '../context/SocketContext';
import { AvatarGroup } from '../components/Avatar';
import { Select } from '../components/Select';

export function Repositories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const queryClient = useQueryClient();
  const { scan } = useScan();
  const { socket } = useSocket();

  const filters: RepositoryFilters = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20,
    adopted: (searchParams.get('adopted') as 'true' | 'false' | 'all') || 'all',
    hasOutdated: (searchParams.get('hasOutdated') as 'true' | 'false' | 'all') || 'all',
    search: searchParams.get('search') || undefined,
    sortBy: (searchParams.get('sortBy') as RepositoryFilters['sortBy']) || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['repositories', filters],
    queryFn: () => repositoryApi.list(filters),
  });

  // Listen for real-time WebSocket updates
  useEffect(() => {
    if (!socket) return;

    const handleRepositoryUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    };

    socket.on('repository:updated', handleRepositoryUpdate);
    socket.on('repo:scanned', handleRepositoryUpdate);
    socket.on('scan:complete', handleRepositoryUpdate);

    return () => {
      socket.off('repository:updated', handleRepositoryUpdate);
      socket.off('repo:scanned', handleRepositoryUpdate);
      socket.off('scan:complete', handleRepositoryUpdate);
    };
  }, [socket, queryClient]);

  // Keep the polling during active scan as fallback
  useEffect(() => {
    if (scan.isScanning && socket) {
      // Refetch repositories every 500ms while scanning as fallback
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [scan.isScanning, socket, queryClient]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', search);
  };

  const toggleSort = (field: string) => {
    const newParams = new URLSearchParams(searchParams);

    if (filters.sortBy === field) {
      // If already sorting by this field, toggle order: asc -> desc -> remove sort
      if (filters.sortOrder === 'asc') {
        newParams.set('sortOrder', 'desc');
      } else {
        // Remove sort by deleting the parameters
        newParams.delete('sortBy');
        newParams.delete('sortOrder');
      }
    } else {
      // Change sort field to new one with ascending order
      newParams.set('sortBy', field);
      newParams.set('sortOrder', 'asc');
    }

    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const showEmptyState = !isLoading && data?.pagination.total === 0 && !scan.isScanning && !filters.search && filters.adopted === 'all' && filters.hasOutdated === 'all';

  const handleStartScan = async () => {
    try {
      await repositoryApi.scan();
    } catch (error) {
      console.error('Failed to start scan:', error);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Empty State Overlay - No data in database */}
      {showEmptyState && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-40 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="mb-6">
              <GitBranch className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                No Repositories Yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start by scanning your organization to discover repositories and their Renovate Bot adoption status.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartScan}
              disabled={scan.isScanning}
              className={cn(
                'px-6 py-3 text-lg font-semibold shadow-lg transition-all',
                scan.isScanning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                  : 'btn-primary hover:shadow-xl'
              )}
            >
              <Zap className={cn('w-5 h-5 mr-2 inline', scan.isScanning && 'animate-pulse')} />
              {scan.isScanning ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>
        </div>
      )}

      {/* Overlay when scanning */}
      {scan.isScanning && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" />
      )}

      {/* Live Scan Progress */}
      {scan.isScanning && (
        <div className="relative z-50 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-500/50 rounded-lg p-4 dark:shadow-lg dark:shadow-primary-500/10">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-pulse" />
            <h3 className="font-semibold text-primary-900 dark:text-primary-100">Live Scanning</h3>
            <span className="ml-auto text-sm text-primary-700 dark:text-primary-300">
              {scan.scannedCount} of {scan.totalToScan}
            </span>
          </div>
          <p className="text-sm text-primary-600 dark:text-primary-400 mb-3 animate-dots">
            Retrieve repositories data
          </p>
          <div className="w-full h-2 bg-primary-200 dark:bg-primary-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-500 dark:to-primary-400 transition-all duration-300 ease-out"
              style={{ width: `${scan.progress}%` }}
            />
          </div>
          <p className="text-xs text-primary-700 dark:text-primary-300 mt-2">
            {scan.progress}% complete
            {scan.rateLimited && (
              <span className="ml-2">
                • Limited to {scan.totalToScan} of {scan.totalAvailable} repositories
              </span>
            )}
          </p>
        </div>
      )}

      {/* Page Header */}
      <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', (scan.isScanning || showEmptyState) && 'pointer-events-none opacity-50 blur-sm')}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
          <p className="text-gray-500 mt-1">
            {data?.pagination.total || 0} repositories in your organization
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={cn('card p-4', (scan.isScanning || showEmptyState) && 'pointer-events-none opacity-50 blur-sm')}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
          </form>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-3">
            <Select
              options={[
                { value: 'all', label: 'All adoption status' },
                { value: 'true', label: 'Renovate adopted' },
                { value: 'false', label: 'Not adopted' },
              ]}
              value={filters.adopted || 'all'}
              onChange={(value) => updateFilter('adopted', value)}
              className="w-48"
            />

            <Select
              options={[
                { value: 'all', label: 'All repositories' },
                { value: 'true', label: 'Has outdated' },
                { value: 'false', label: 'No outdated' },
              ]}
              value={filters.hasOutdated || 'all'}
              onChange={(value) => updateFilter('hasOutdated', value)}
              className="w-48"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={cn('card overflow-hidden', (scan.isScanning || showEmptyState) && 'pointer-events-none opacity-50 blur-sm')}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Repository
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => toggleSort('renovateAdopted')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Renovate
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => toggleSort('outdatedDependencies')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Open PRs / Dependencies
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort('lastScanAt')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Last Scan
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th>Contributors</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`loading-${i}`}>
                    <td colSpan={7}>
                      <div className="h-12 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No repositories found
                  </td>
                </tr>
              ) : (
                data?.data.map((repo) => (
                  <tr key={repo.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <GitBranch className="w-5 h-5 text-gray-400" />
                        <div>
                          <Link
                            to={`/repositories/${repo.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {repo.name}
                          </Link>
                          {repo.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {repo.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {repo.renovateAdopted ? (
                        <span className="badge-success flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" />
                          Adopted
                        </span>
                      ) : (
                        <span className="badge-neutral flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" />
                          Not adopted
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-primary-600 dark:text-primary-400">{repo.openRenovatePRs} open PRs</span>
                        <span className="text-sm text-amber-600 dark:text-amber-400">{repo.outdatedDependencies} dependencies</span>
                      </div>
                    </td>
                    <td className="text-gray-500 dark:text-gray-400">
                      {repo.lastScanAt ? formatRelativeTime(repo.lastScanAt) : 'Never'}
                    </td>
                    <td>
                      {repo.contributors && repo.contributors.length > 0 ? (
                        <AvatarGroup contributors={repo.contributors} max={4} size="sm" />
                      ) : (
                        <span className="text-sm text-gray-400">No data</span>
                      )}
                    </td>
                    <td>
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost p-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFilter('page', String(data.pagination.page - 1))}
                disabled={data.pagination.page === 1}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => updateFilter('page', String(data.pagination.page + 1))}
                disabled={data.pagination.page === data.pagination.totalPages}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
