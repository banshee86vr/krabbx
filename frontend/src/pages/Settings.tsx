import { useState, useId, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Github,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Database,
  Server,
} from 'lucide-react';
import { settingsApi, repositoryApi, dashboardApi } from '../services/api';
import { cn, formatDateTime } from '../lib/utils';
import { useScan } from '../context/ScanContext';
import { useSocket } from '../context/SocketContext';

export function Settings() {
  const queryClient = useQueryClient();
  const maxScanLimitId = useId();
  const { scan } = useScan();
  const { socket } = useSocket();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const { data: githubStatus } = useQuery({
    queryKey: ['dashboard', 'github-status'],
    queryFn: dashboardApi.getGitHubStatus,
    refetchInterval: 60000,
  });

  const [scanInterval, setScanInterval] = useState<number | null>(null);
  const [maxScanLimit, setMaxScanLimit] = useState<number | null>(null);

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setScanInterval(null);
      setMaxScanLimit(null);
    },
  });

  const scanMutation = useMutation({
    mutationFn: repositoryApi.scan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Listen for scan completion to update settings automatically
  useEffect(() => {
    if (!socket) return;

    const handleScanComplete = () => {
      console.log('[Settings] Scan completed, refreshing settings...');
      // Invalidate settings to refetch and show updated lastFullScanAt
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    };

    socket.on('scan:complete', handleScanComplete);

    return () => {
      socket.off('scan:complete', handleScanComplete);
    };
  }, [socket, queryClient]);

  const currentInterval = scanInterval ?? settings?.scanIntervalMinutes ?? 60;

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure dashboard behavior and integrations</p>
      </div>

      {/* GitHub Integration */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Github className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">GitHub Integration</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
                  {settings?.githubOrg || 'Not configured'}
                </span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Set via GITHUB_ORG environment variable
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Rate Limit
              </label>
              {githubStatus ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          githubStatus.percentUsed > 80 ? 'bg-red-500' :
                          githubStatus.percentUsed > 50 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                        style={{ width: `${githubStatus.percentUsed}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {githubStatus.rateLimit.remaining} / {githubStatus.rateLimit.limit}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Resets at {new Date(githubStatus.rateLimit.reset).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Full Scan
            </label>
            <div className="flex items-center justify-between">
              <span className="text-gray-900 dark:text-gray-100">
                {settings?.lastFullScanAt
                  ? formatDateTime(settings.lastFullScanAt)
                  : 'Never'}
              </span>
              <button
                type="button"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending || scan.isScanning}
                className={cn(
                  'flex items-center gap-2 relative overflow-hidden',
                  scanMutation.isPending || scan.isScanning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 px-4 py-2 rounded-lg font-medium'
                    : 'btn-primary'
                )}
              >
                {(scanMutation.isPending || scan.isScanning) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                )}
                <RefreshCw className={cn('w-4 h-4 relative z-10', (scanMutation.isPending || scan.isScanning) && 'animate-spin')} />
                <span className="relative z-10">{(scanMutation.isPending || scan.isScanning) ? 'Scanning...' : 'Scan Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Information</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Storage Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Storage Mode
              </label>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-md">
                  {settings?.storageMode || 'memory'}
                </span>
                {settings?.storageMode === 'database' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {settings?.storageMode === 'database' 
                  ? 'Using PostgreSQL for persistent storage'
                  : 'Using in-memory storage (data lost on restart)'}
              </p>
            </div>

            {/* Redis Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Redis (Session Storage)
              </label>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className={cn(
                  'font-mono text-sm px-3 py-1.5 rounded-md',
                  settings?.redis?.connected
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}>
                  {settings?.redis?.connected ? 'Connected' : 'Disabled'}
                </span>
                {settings?.redis?.connected ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {settings?.redis?.connected 
                  ? 'Sessions persist across restarts • Horizontal scaling enabled'
                  : settings?.redis?.mode === 'required'
                    ? 'Redis required in production but not connected!'
                    : 'Using memory sessions (optional in development)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduler Settings */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduler</h2>
          </div>
        </div>
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Scan Interval
            </label>
            <div className="flex items-center gap-4">
              <select
                value={currentInterval}
                onChange={(e) => setScanInterval(parseInt(e.target.value))}
                className="input w-auto"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
                <option value={120}>Every 2 hours</option>
                <option value={360}>Every 6 hours</option>
                <option value={720}>Every 12 hours</option>
                <option value={1440}>Every 24 hours</option>
              </select>
              {scanInterval !== null && scanInterval !== settings?.scanIntervalMinutes && (
                <button
                  onClick={() => updateMutation.mutate({ scanIntervalMinutes: scanInterval })}
                  disabled={updateMutation.isPending}
                  className="btn-primary"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              How often the dashboard automatically scans for dependency updates
            </p>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <label htmlFor={maxScanLimitId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rate Limit Protection
            </label>
            <div className="flex items-center gap-4">
              <select
                id={maxScanLimitId}
                value={maxScanLimit ?? settings?.maxScanLimit ?? 0}
                onChange={(e) => setMaxScanLimit(parseInt(e.target.value, 10))}
                className="input w-auto"
              >
                <option value={0}>Unlimited (scan all repos)</option>
                <option value={5}>First 5 repositories</option>
                <option value={10}>First 10 repositories</option>
                <option value={20}>First 20 repositories</option>
                <option value={50}>First 50 repositories</option>
                <option value={100}>First 100 repositories</option>
              </select>
              {maxScanLimit !== null && maxScanLimit !== settings?.maxScanLimit && (
                <button
                  onClick={() => updateMutation.mutate({ maxScanLimit })}
                  disabled={updateMutation.isPending}
                  className="btn-primary"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Limit the number of repositories scanned per full scan to avoid exceeding GitHub API rate limits
            </p>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Environment</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Configuration via Environment Variables
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Some settings like GitHub token and organization are configured via environment
                variables for security. See the .env.example file for available options.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">GITHUB_TOKEN</p>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {settings?.github?.rateLimit ? '••••••••••••••••' : 'Not configured'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">GITHUB_ORG</p>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{settings?.githubOrg || 'Not configured'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      <div className="card h-64" />
      <div className="card h-48" />
      <div className="card h-48" />
    </div>
  );
}
