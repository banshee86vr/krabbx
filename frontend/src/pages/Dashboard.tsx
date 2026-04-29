import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  ChevronDown,
  AlertCircle,
  Info,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardApi } from '../services/api';
import { cn, formatRelativeTime, getDependencyTypeLabel } from '../lib/utils';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useScan } from '../context/ScanContext';
import { GamificationSection } from '../components/gamification/GamificationSection';

const chartColors = {
  barFill: '#818cf8',
  lineStroke: '#34d399',
  lineDot: '#10b981',
  gridStroke: '#e2e8f0',
  axisStroke: '#94a3b8',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipText: '#475569',
  pieAdopted: '#6366f1',
  pieNotAdopted: '#e2e8f0',
};

export function Dashboard() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { scan } = useScan();
  const wasScanningRef = useRef(scan.isScanning);

  const { data: summary, isLoading, error: summaryError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const { data: trends } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => dashboardApi.getTrends(30),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const { data: topOutdated } = useQuery({
    queryKey: ['dashboard', 'top-outdated'],
    queryFn: () => dashboardApi.getTopOutdated(10),
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const {
    data: gamification,
    isLoading: gamificationLoading,
    error: gamificationError,
  } = useQuery({
    queryKey: ['dashboard', 'gamification'],
    queryFn: dashboardApi.getGamification,
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (trends?.dependencyTrends && trends.dependencyTrends.length > 0) {
      console.log('Trends data loaded:', {
        count: trends.dependencyTrends.length,
        firstEntry: trends.dependencyTrends[0],
        lastEntry: trends.dependencyTrends[trends.dependencyTrends.length - 1]
      });
    }
  }, [trends?.dependencyTrends]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
        refetchType: 'active',
      });
    };

    const handleScanComplete = () => {
      console.log('Scan completed, refreshing dashboard data');
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
        refetchType: 'active',
      });
    };

    socket.on('repository:updated', handleUpdate);
    socket.on('repo:scanned', handleUpdate);
    socket.on('scan:complete', handleScanComplete);

    return () => {
      socket.off('repository:updated', handleUpdate);
      socket.off('repo:scanned', handleUpdate);
      socket.off('scan:complete', handleScanComplete);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    const wasScanning = wasScanningRef.current;
    wasScanningRef.current = scan.isScanning;

    if (!wasScanning || scan.isScanning) {
      return;
    }

    const refreshTimeout = window.setTimeout(() => {
      void queryClient.refetchQueries({
        queryKey: ['dashboard'],
        type: 'active',
      });
    }, 750);

    return () => {
      window.clearTimeout(refreshTimeout);
    };
  }, [scan.isScanning, queryClient]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (summaryError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-critical-200 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">
            Error loading dashboard
          </h3>
          <p className="text-neutral-500 mb-4">
            {summaryError instanceof Error ? summaryError.message : 'Unable to load dashboard data'}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-warning-200 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">
            No dashboard data available
          </h3>
          <p className="text-neutral-500 mb-4">
            Please run a scan to populate the dashboard
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
            className="btn-primary"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const adoptionData = summary ? [
    { name: 'Adopted', value: summary.repositories.adopted },
    { name: 'Not Adopted', value: summary.repositories.notAdopted },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-700">Dashboard</h1>
        <p className="text-neutral-500 mt-1">Monitor Renovate Bot adoption and outdated dependencies</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Repositories"
          value={summary?.repositories.total || 0}
          icon={GitBranch}
          color="info"
          subtitle={`${summary?.repositories.archived || 0} archived`}
          isScanning={scan.isScanning}
        />
        <StatCard
          title="Renovate Adopted"
          value={summary?.repositories.adopted || 0}
          icon={CheckCircle}
          color="success"
          subtitle={`${summary?.repositories.adoptionRate || 0}% adoption rate`}
          isScanning={scan.isScanning}
        />
        <StatCard
          title="Outdated Dependencies"
          value={summary?.dependencies.outdated || 0}
          icon={AlertTriangle}
          color="warning"
          subtitle={`${summary?.dependencies.openPRs || 0} open PRs`}
          isScanning={scan.isScanning}
        />
      </div>

      <GamificationSection
        summary={gamification}
        isLoading={gamificationLoading}
        error={gamificationError instanceof Error ? gamificationError : null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-neutral-700">Dependency Trends</h2>
            {scan.isScanning && (
              <Loader2 className="w-4 h-4 text-action-300 animate-spin" />
            )}
          </div>
          <div className="h-72 relative">
            {trends?.dependencyTrends && trends.dependencyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trends.dependencyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridStroke} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => {
                      try {
                        if (!value) return '';
                        const date = new Date(value);
                        if (Number.isNaN(date.getTime())) return '';
                        const month = date.toLocaleDateString('en-US', { month: 'short' });
                        const day = date.getDate();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${month} ${day} ${hours}:${minutes}`;
                      } catch {
                        return '';
                      }
                    }}
                    stroke={chartColors.axisStroke}
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis stroke={chartColors.axisStroke} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: '6px',
                      color: chartColors.tooltipText,
                    }}
                    labelFormatter={(value) => {
                      if (!value) return '';
                      const date = new Date(value);
                      if (Number.isNaN(date.getTime())) return '';
                      return date.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '20px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="totalDependencies"
                    name="Total Dependencies"
                    fill={chartColors.barFill}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="openPRs"
                    name="Open PRs"
                    stroke={chartColors.lineStroke}
                    strokeWidth={3}
                    dot={{ fill: chartColors.lineDot, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No scan data available</p>
                  <p className="text-sm text-neutral-400 mt-1">Run a scan to see trends</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-neutral-700">Adoption Rate</h2>
            {scan.isScanning && (
              <Loader2 className="w-4 h-4 text-action-300 animate-spin" />
            )}
          </div>
          <div className="h-48 relative">
            {summary && (summary.repositories.adopted > 0 || summary.repositories.notAdopted > 0) ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={adoptionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill={chartColors.pieAdopted} />
                      <Cell fill={chartColors.pieNotAdopted} />
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: '6px',
                        color: chartColors.tooltipText,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.pieAdopted }} />
                    <span className="text-sm text-neutral-500">Adopted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.pieNotAdopted }} />
                    <span className="text-sm text-neutral-500">Not Adopted</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <GitBranch className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No repositories</p>
                  <p className="text-sm text-neutral-400 mt-1">Scan to view adoption</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="card flex flex-col min-h-0 h-[min(32rem,55vh)] w-full">
          <div className="px-6 py-4 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-700">Top Outdated Repositories</h2>
              {scan.isScanning && (
                <Loader2 className="w-4 h-4 text-action-300 animate-spin" />
              )}
            </div>
          </div>
          <div className="divide-y divide-neutral-100 flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {summary?.topOutdated && summary.topOutdated.length > 0 ? (
              summary.topOutdated.map((repo) => (
                <Link
                  key={repo.id}
                  to={`/repositories/${repo.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-5 h-5 text-neutral-400" />
                    <div>
                      <p className="font-medium text-neutral-700">{repo.name}</p>
                      <p className="text-sm text-neutral-500">
                        {repo.outdatedDependencies} outdated dependencies
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {repo.updateTypeSummary.major > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-critical-50 text-critical-400 border border-critical-100">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{repo.updateTypeSummary.major}</span>
                      </div>
                    )}
                    {repo.updateTypeSummary.minor > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-warning-50 text-warning-400 border border-warning-100">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{repo.updateTypeSummary.minor}</span>
                      </div>
                    )}
                    {repo.updateTypeSummary.patch > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-action-50 text-action-300 border border-action-100">
                        <Info className="w-3.5 h-3.5" />
                        <span>{repo.updateTypeSummary.patch}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No outdated repositories</p>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
            <Link to="/repositories?hasOutdated=true" className="text-sm text-action-300 hover:text-action-400">
              View all repositories
            </Link>
          </div>
        </div>

        <div className="card flex flex-col min-h-0 h-[min(32rem,55vh)] w-full">
          <div className="px-6 py-4 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-700">Top Outdated Dependencies</h2>
              {scan.isScanning && (
                <Loader2 className="w-4 h-4 text-action-300 animate-spin" />
              )}
            </div>
          </div>
          <div className="divide-y divide-neutral-100 flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {topOutdated && topOutdated.length > 0 ? (
              topOutdated.map((dep) => (
                <TopOutdatedDependencyItem key={`${dep.packageName}-${dep.packageManager}`} dependency={dep} />
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No outdated dependencies</p>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
            <Link to="/dependencies?isOutdated=true" className="text-sm text-action-300 hover:text-action-400">
              View all outdated dependencies
            </Link>
          </div>
        </div>

        <div className="card flex flex-col min-h-0 h-[min(32rem,55vh)] w-full">
          <div className="px-6 py-4 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-700">Recent Activity</h2>
              {scan.isScanning && (
                <Loader2 className="w-4 h-4 text-action-300 animate-spin" />
              )}
            </div>
          </div>
          <div className="divide-y divide-neutral-100 flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {summary?.recentScans && summary.recentScans.length > 0 ? (
              summary.recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      scan.status === 'completed' ? 'bg-success-50' : 'bg-neutral-100'
                    )}>
                      {scan.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-success-300" />
                      ) : (
                        <Clock className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-700">{scan.repository?.name}</p>
                      <p className="text-sm text-neutral-500">
                        {scan.newUpdatesFound} new updates found
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-neutral-400">
                    {formatRelativeTime(scan.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No recent activity</p>
                  <p className="text-sm text-neutral-400 mt-1">Start a scan to see activity</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'info';
  subtitle?: string;
  isScanning?: boolean;
}

function TopOutdatedDependencyItem({ dependency }: {
  dependency: {
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
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateTypeClasses: Record<string, string> = {
    major: 'bg-critical-50 text-critical-400 border border-critical-100',
    minor: 'bg-warning-50 text-warning-400 border border-warning-100',
    patch: 'bg-action-50 text-action-300 border border-action-100',
  };

  const badgeClass = dependency.updateType && updateTypeClasses[dependency.updateType]
    ? updateTypeClasses[dependency.updateType]
    : 'bg-neutral-50 text-neutral-500 border border-neutral-200';

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-6 py-4 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Package className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="font-semibold text-base text-neutral-700 truncate">
                {dependency.packageName}
              </h3>
              <div className="text-xs text-neutral-400 font-mono">
                {dependency.currentVersion} → {dependency.latestVersion}
              </div>
              <div className="text-xs text-neutral-500">
                {getDependencyTypeLabel(dependency.dependencyType)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className={cn('inline-flex items-center justify-between px-2.5 py-1 rounded-full font-semibold text-xs uppercase tracking-wide w-28', badgeClass)}
            >
              <span>{dependency.updateType || 'update'}</span>
              <div className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                <span>{dependency.occurrences}</span>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-4 pt-2">
          <div className="pl-8 space-y-2">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              Used in {dependency.occurrences} {dependency.occurrences === 1 ? 'repository' : 'repositories'}
            </p>
            <div className="space-y-2">
              {dependency.repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-hds-sm bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  <Link
                    to={`/repositories/${repo.id}`}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-action-300 transition-colors"
                  >
                    <GitBranch className="w-4 h-4 flex-shrink-0" />
                    <span>{repo.name}</span>
                  </Link>
                  {repo.hasOpenPR && repo.prUrl && (
                    <a
                      href={repo.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-action-300 hover:text-action-400 rounded-full bg-action-50 transition-colors"
                    >
                      <span>View PR</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, subtitle, isScanning }: StatCardProps) {
  const colorConfig = {
    primary: { bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', icon: 'text-action-200', border: '#c7d2fe' },
    success: { bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', icon: 'text-success-200', border: '#a7f3d0' },
    warning: { bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', icon: 'text-warning-200', border: '#fde68a' },
    info: { bg: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', icon: 'text-sky-300', border: '#bae6fd' },
  };
  const cfg = colorConfig[color];

  return (
    <div className="bg-white rounded-hds-xl p-6 transition-all hover:shadow-md" style={{ boxShadow: `0 0 0 1px ${cfg.border}40, 0 1px 3px 0 #64748b0a` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-neutral-500">{title}</p>
            {isScanning && (
              <Loader2 className="w-4 h-4 text-action-200 animate-spin" />
            )}
          </div>
          <p className="text-3xl font-bold text-neutral-700 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-hds-lg', cfg.icon)} style={{ background: cfg.bg }}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-neutral-200 rounded w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={`skeleton-${i}`} className="card p-6 h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card h-96" />
        <div className="card h-96" />
      </div>
    </div>
  );
}
