import { useState, useId, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  GitBranch,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Database,
  Server,
} from 'lucide-react';
import { settingsApi, dashboardApi } from '../services/api';
import { cn, formatDateTime } from '../lib/utils';
import { useScan } from '../context/ScanContext';
import { useSocket } from '../context/SocketContext';
import { useOrganizationScan } from '../hooks/useOrganizationScan';

export function Settings() {
  const queryClient = useQueryClient();
  const maxScanLimitId = useId();
  const { scan } = useScan();
  const { socket } = useSocket();
  const scanMutation = useOrganizationScan();

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

  const githubTargetsDisplay =
    settings?.github?.targets?.length
      ? settings.github.targets.join(', ')
      : settings?.githubOrg || 'Not configured';

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-700">Settings</h1>
        <p className="text-neutral-500 mt-1">Configure dashboard behavior and integrations</p>
      </div>

      {/* GitHub Integration */}
      <div className="card">
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <GitBranch className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-700">GitHub Integration</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                GitHub targets
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-neutral-700 bg-neutral-100 px-3 py-2 rounded-hds-sm break-all">
                  {githubTargetsDisplay}
                </span>
                <CheckCircle className="w-5 h-5 text-success-200 shrink-0" />
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                Set via{' '}
                <code className="text-neutral-600">GITHUB_TARGETS</code> (comma-separated) or{' '}
                <code className="text-neutral-600">GITHUB_ORG</code> for a single owner
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                API Rate Limit
              </label>
              {githubStatus ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          githubStatus.percentUsed > 80 ? 'bg-critical-200' :
                          githubStatus.percentUsed > 50 ? 'bg-warning-200' : 'bg-success-200'
                        )}
                        style={{ width: `${githubStatus.percentUsed}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-neutral-600">
                      {githubStatus.rateLimit.remaining} / {githubStatus.rateLimit.limit}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">
                    Resets at {new Date(githubStatus.rateLimit.reset).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <p className="text-neutral-500">Loading...</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200">
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Last Full Scan
            </label>
            <div className="flex items-center justify-between">
              <span className="text-neutral-700">
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
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed px-4 py-2 rounded-hds-lg font-medium'
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
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-700">System Information</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Storage Mode */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                Storage Mode
              </label>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-neutral-500" />
                <span className="font-mono text-sm text-neutral-700 bg-neutral-100 px-3 py-1.5 rounded-hds-sm">
                  {settings?.storageMode || 'memory'}
                </span>
                {settings?.storageMode === 'database' ? (
                  <CheckCircle className="w-4 h-4 text-success-200" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning-200" />
                )}
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                {settings?.storageMode === 'database' 
                  ? 'Using PostgreSQL for persistent storage'
                  : 'Using in-memory storage (data lost on restart)'}
              </p>
            </div>

            {/* Redis Status */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                Redis (Session Storage)
              </label>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-neutral-500" />
                <span className={cn(
                  'font-mono text-sm px-3 py-1.5 rounded-hds-sm',
                  settings?.redis?.connected
                    ? 'bg-success-50 text-success-300'
                    : 'bg-neutral-100 text-neutral-600'
                )}>
                  {settings?.redis?.connected ? 'Connected' : 'Disabled'}
                </span>
                {settings?.redis?.connected ? (
                  <CheckCircle className="w-4 h-4 text-success-200" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-neutral-400" />
                )}
              </div>
              <p className="text-sm text-neutral-500 mt-1">
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
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-700">Scheduler</h2>
          </div>
        </div>
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
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
            <p className="text-sm text-neutral-500 mt-2">
              How often the dashboard automatically scans for dependency updates
            </p>
          </div>

          <div className="pt-6 border-t border-neutral-200">
            <label htmlFor={maxScanLimitId} className="block text-sm font-medium text-neutral-600 mb-1">
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
            <p className="text-sm text-neutral-500 mt-2">
              Limit the number of repositories scanned per full scan to avoid exceeding GitHub API rate limits
            </p>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="card">
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-700">Environment</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="rounded-hds-xl p-4 flex items-start gap-3 bg-warning-50 border border-warning-100">
            <AlertCircle className="w-5 h-5 text-warning-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning-500">
                Configuration via Environment Variables
              </p>
              <p className="text-sm text-warning-400 mt-1">
                Some settings like GitHub token and scan targets are configured via environment
                variables for security. See the .env.example file for available options.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-hds-lg">
              <p className="text-sm font-medium text-neutral-500">GITHUB_TOKEN</p>
              <p className="text-sm text-neutral-700 mt-1">
                {settings?.github?.rateLimit ? '••••••••••••••••' : 'Not configured'}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-hds-lg">
              <p className="text-sm font-medium text-neutral-500">GITHUB_TARGETS / GITHUB_ORG</p>
              <p className="text-sm text-neutral-700 mt-1 break-all">
                {settings?.github?.targets?.join(', ') || settings?.githubOrg || 'Not configured'}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-hds-lg">
              <p className="text-sm font-medium text-neutral-500">AUTH_ENABLED</p>
              <p className="text-sm text-neutral-700 mt-1">
                {settings?.auth?.enabled ?? true
                  ? 'true (OAuth required for API access)'
                  : 'false (anonymous / local mode)'}
              </p>
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
      <div className="h-8 bg-neutral-200 rounded w-48" />
      <div className="card h-64" />
      <div className="card h-48" />
      <div className="card h-48" />
    </div>
  );
}
