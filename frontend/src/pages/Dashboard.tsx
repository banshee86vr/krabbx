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
import { useTheme } from '../context/ThemeContext';

export function Dashboard() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { scan } = useScan();
  const { isDark } = useTheme();
  const wasScanningRef = useRef(scan.isScanning);

  // Theme-aware chart colors using project's primary/secondary palette
  const chartColors = {
    // Bar chart (Total Dependencies) - Secondary Cyan/Blue
    barFill: isDark ? '#06b6d4' : '#0891b2',  // secondary-500 (dark) / secondary-600 (light)
    
    // Line chart (Open PRs) - Primary Green
    lineStroke: isDark ? '#10b981' : '#059669',  // primary-500 (dark) / primary-600 (light)
    lineDot: isDark ? '#10b981' : '#059669',
    
    // Grid and axes
    gridStroke: isDark ? '#374151' : '#d1d5db',  // gray-700 (dark) / gray-300 (light)
    axisStroke: isDark ? '#6b7280' : '#9ca3af',  // gray-500 (dark) / gray-400 (light)
    
    // Tooltip
    tooltipBg: isDark ? '#1f2937' : '#ffffff',  // gray-800 (dark) / white (light)
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',  // gray-700 (dark) / gray-200 (light)
    tooltipText: isDark ? '#f3f4f6' : '#111827',  // gray-100 (dark) / gray-900 (light)
    
    // Pie chart - Primary Green
    pieAdopted: isDark ? '#10b981' : '#059669',  // primary-500 (dark) / primary-600 (light)
    pieNotAdopted: isDark ? '#4b5563' : '#e5e7eb',  // gray-600 (dark) / gray-200 (light)
  };

  const { data: summary, isLoading, error: summaryError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    retry: 2, // Retry failed requests twice
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
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Debug: Log trends data (only on mount and when trends actually changes)
  useEffect(() => {
    if (trends?.dependencyTrends && trends.dependencyTrends.length > 0) {
      console.log('Trends data loaded:', {
        count: trends.dependencyTrends.length,
        firstEntry: trends.dependencyTrends[0],
        lastEntry: trends.dependencyTrends[trends.dependencyTrends.length - 1]
      });
    }
  }, [trends?.dependencyTrends]); // Only log when trends change

  // Listen for real-time WebSocket updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      // Refetch queries in the background without showing loading state
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
        refetchType: 'active', // Only refetch active queries
      });
    };

    const handleScanComplete = () => {
      console.log('Scan completed, refreshing dashboard data');
      // Refetch all dashboard queries when scan completes
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

    // Give the backend a brief moment to persist final scan results
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

  // Show skeleton only on initial load, not on refetch
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // If there's an error, show error message
  if (summaryError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Error loading dashboard
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
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

  // If data is missing after initial load, show error message
  if (!summary && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No dashboard data available
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitor Renovate Bot adoption and outdated dependencies</p>
      </div>

      {/* Stats Grid */}
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dependency Trends Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dependency Trends</h2>
            {scan.isScanning && (
              <Loader2 className="w-4 h-4 text-primary-500 dark:text-primary-400 animate-spin" />
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
                        if (!value) {
                          console.warn('XAxis: Empty value received');
                          return '';
                        }
                        const date = new Date(value);
                        if (Number.isNaN(date.getTime())) {
                          console.warn('XAxis: Invalid date:', value);
                          return '';
                        }

                        // Format as "Nov 20 14:30"
                        const month = date.toLocaleDateString('en-US', { month: 'short' });
                        const day = date.getDate();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${month} ${day} ${hours}:${minutes}`;
                      } catch (error) {
                        console.error('XAxis formatter error:', error, 'value:', value);
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
                      borderRadius: '8px',
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
                  <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No scan data available</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Run a scan to see trends</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Adoption Pie Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Adoption Rate</h2>
            {scan.isScanning && (
              <Loader2 className="w-4 h-4 text-primary-500 dark:text-primary-400 animate-spin" />
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
                        borderRadius: '8px',
                        color: chartColors.tooltipText,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: chartColors.pieAdopted }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Adopted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: chartColors.pieNotAdopted }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Not Adopted</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <GitBranch className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No repositories</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Scan to view adoption</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid - Three Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Outdated Repositories */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Outdated Repositories</h2>
              {scan.isScanning && (
                <Loader2 className="w-4 h-4 text-primary-500 dark:text-primary-400 animate-spin" />
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 min-h-[200px] flex flex-col">
            {summary?.topOutdated && summary.topOutdated.length > 0 ? (
              summary.topOutdated.map((repo) => (
                <Link
                  key={repo.id}
                  to={`/repositories/${repo.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{repo.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {repo.outdatedDependencies} outdated dependencies
                      </p>
                    </div>
                  </div>
                  
                  {/* Update type summary badges */}
                  <div className="flex items-center gap-2">
                    {repo.updateTypeSummary.major > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{repo.updateTypeSummary.major}</span>
                      </div>
                    )}
                    {repo.updateTypeSummary.minor > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{repo.updateTypeSummary.minor}</span>
                      </div>
                    )}
                    {repo.updateTypeSummary.patch > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
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
                  <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No outdated repositories</p>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Link to="/repositories?hasOutdated=true" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              View all repositories
            </Link>
          </div>
        </div>

        {/* Top Outdated Dependencies */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Outdated Dependencies</h2>
              {scan.isScanning && (
                <Loader2 className="w-4 h-4 text-primary-500 dark:text-primary-400 animate-spin" />
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 min-h-[200px] flex flex-col">
            {topOutdated && topOutdated.length > 0 ? (
              topOutdated.map((dep) => (
                <TopOutdatedDependencyItem key={`${dep.packageName}-${dep.packageManager}`} dependency={dep} />
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No outdated dependencies</p>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Link to="/dependencies?isOutdated=true" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              View all outdated dependencies
            </Link>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
              {scan.isScanning && (
                <Loader2 className="w-4 h-4 text-primary-500 dark:text-primary-400 animate-spin" />
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 min-h-[200px] flex flex-col">
            {summary?.recentScans && summary.recentScans.length > 0 ? (
              summary.recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      scan.status === 'completed' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'
                    )}>
                      {scan.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{scan.repository?.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {scan.newUpdatesFound} new updates found
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    {formatRelativeTime(scan.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start a scan to see activity</p>
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

  const updateTypeColors = {
    major: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30',
    minor: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30',
    patch: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30',
  };

  const updateTypeColor = dependency.updateType
    ? updateTypeColors[dependency.updateType as keyof typeof updateTypeColors] || 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800/30'
    : 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800/30';

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Package className="w-5 h-5 text-gray-400 dark:text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Package name */}
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
                {dependency.packageName}
              </h3>

              {/* Version info - small, low brightness, neutral */}
              <div className="text-xs text-gray-400 dark:text-gray-600 font-mono">
                {dependency.currentVersion} → {dependency.latestVersion}
              </div>

              {/* Dependency type label */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {getDependencyTypeLabel(dependency.dependencyType)}
              </div>
            </div>
          </div>

          {/* Update type with repository count - colored badge on the right */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={cn(
              'inline-flex items-center justify-between px-2.5 py-1 rounded-md font-semibold text-xs uppercase tracking-wide w-28',
              updateTypeColor
            )}>
              <span>{dependency.updateType || 'update'}</span>
              <div className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                <span>{dependency.occurrences}</span>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-600" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded repository list */}
      {isExpanded && (
        <div className="px-6 pb-4 pt-2">
          <div className="pl-8 space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Used in {dependency.occurrences} {dependency.occurrences === 1 ? 'repository' : 'repositories'}
            </p>
            <div className="space-y-2">
              {dependency.repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Link
                    to={`/repositories/${repo.id}`}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <GitBranch className="w-4 h-4 flex-shrink-0" />
                    <span>{repo.name}</span>
                  </Link>
                  {repo.hasOpenPR && repo.prUrl && (
                    <a
                      href={repo.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 rounded hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
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
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-200',
    success: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-200',
    info: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200',
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            {isScanning && (
              <Loader2 className="w-4 h-4 text-primary-500 dark:text-primary-400 animate-spin" />
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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
