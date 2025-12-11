import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Trophy,
} from 'lucide-react';
import type { GamificationBadgeId, GamificationSummary } from '../../types';
import { cn } from '../../lib/utils';

const BADGE_ART: Record<
  GamificationBadgeId,
  { gradient: string; ring: string; icon: typeof Award }
> = {
  debt_crusher_org: {
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    ring: 'ring-emerald-300/50',
    icon: TrendingDown,
  },
  consistent_maintainer_org: {
    gradient: 'from-cyan-500 via-teal-600 to-emerald-700',
    ring: 'ring-cyan-400/35',
    icon: Activity,
  },
  zero_major_drift_repo: {
    gradient: 'from-sky-500 via-cyan-500 to-teal-600',
    ring: 'ring-sky-400/35',
    icon: ShieldCheck,
  },
};

function PodiumRank({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-sm font-bold text-amber-950 shadow-md ring-2 ring-amber-200/80"
        title="1st place"
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 text-sm font-bold text-slate-800 shadow ring-1 ring-slate-300/90"
        title="2nd place"
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-sm font-bold text-amber-100 shadow ring-1 ring-amber-700/50"
        title="3rd place"
      >
        3
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-action-50 text-sm font-bold text-action-300">
      {rank}
    </span>
  );
}

export interface GamificationSectionProps {
  summary: GamificationSummary | undefined;
  isLoading: boolean;
  error?: Error | null;
}

export function GamificationSection({ summary, isLoading, error }: GamificationSectionProps) {
  if (error && !summary && !isLoading) {
    return (
      <div className="card border border-rose-900/40 bg-rose-950/35 p-4 text-sm text-rose-100">
        <p className="font-medium">Could not load achievements</p>
        <p className="mt-1 text-rose-300">{error.message}</p>
      </div>
    );
  }

  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="card relative overflow-hidden p-6"
            aria-hidden
          >
            <div className="krx-gamification-shimmer absolute inset-0 opacity-40" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-neutral-200" />
                <div className="h-5 w-40 rounded bg-neutral-200" />
              </div>
              <div className="h-4 w-full max-w-md rounded bg-neutral-100" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex gap-3 py-2">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 rounded bg-neutral-100" />
                      <div className="h-3 w-1/2 rounded bg-neutral-50/80" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  if (!summary.enabled) {
    return (
      <div className="card relative overflow-hidden border border-dashed border-neutral-200 bg-gradient-to-br from-neutral-50 via-neutral-100 to-action-50/60 p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 left-1/4 h-24 w-24 rounded-full bg-teal-600/10 blur-xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-hds-lg bg-neutral-200 p-2.5 shadow-sm ring-1 ring-neutral-300">
              <Sparkles className="h-6 w-6 text-action-200" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-700">Achievements</h2>
              <p className="mt-1 max-w-xl text-sm text-neutral-500">
                Gamification is turned off on the server. Set{' '}
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">
                  GAMIFICATION_ENABLED=true
                </code>{' '}
                in your backend environment and restart to unlock health scores, badges, and the
                leaderboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const trend = summary.orgTrend14d;
  const trendChip =
    trend?.percentImproved != null && trend.percentImproved > 0 ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-800/60">
        <TrendingDown className="h-3.5 w-3.5" />
        ~{Math.round(trend.percentImproved * 100)}% fewer outdated vs window start
      </span>
    ) : trend?.startOutdated != null && trend?.endOutdated != null ? (
      <span className="text-xs text-neutral-400">
        Org outdated: {trend.startOutdated} → {trend.endOutdated} (14d window)
      </span>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-hds-xl p-[1px] shadow-lg shadow-cyan-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/25 via-cyan-500/35 to-violet-600/30 opacity-95" />
        <div className="relative rounded-hds-xl bg-neutral-100/95 backdrop-blur-sm">
          <div className="border-b border-neutral-200 bg-gradient-to-r from-amber-950/40 via-neutral-100 to-action-50/50 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-5 w-5 text-action-200" aria-hidden />
              <h2 className="text-base font-semibold text-neutral-700">Health & achievements</h2>
              <span className="ml-auto text-xs font-medium text-neutral-400">Score {summary.scoreVersion}</span>
            </div>
            {trendChip && <div className="mt-2">{trendChip}</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leaderboard */}
        <div className="card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.1),transparent)]" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-neutral-700">Health leaderboard</h3>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-neutral-500">{summary.headline}</p>
            {summary.leaderboard.length === 0 ? (
              <p className="text-sm text-neutral-500">Run a scan to populate repository health scores.</p>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {summary.leaderboard.map((row) => (
                  <li key={row.repositoryId}>
                    <Link
                      to={`/repositories/${row.repositoryId}#repo-health`}
                      title="Open repository — health score & formula"
                      className="-mx-2 flex items-center justify-between rounded-hds-md px-2 py-3 transition-colors hover:bg-action-50/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <PodiumRank rank={row.rank} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-700">{row.name}</p>
                          <p className="truncate text-xs text-neutral-500">
                            {row.outdatedDependencies} outdated · {row.majorOutdatedCount} major drift
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'flex-shrink-0 rounded-hds-sm px-2.5 py-1 text-sm font-bold tabular-nums ring-1 ring-inset',
                          row.score >= 80 && 'bg-emerald-950/55 text-emerald-300 ring-emerald-800/60',
                          row.score >= 50 && row.score < 80 && 'bg-amber-950/50 text-amber-200 ring-amber-800/50',
                          row.score < 50 && 'bg-rose-950/50 text-rose-300 ring-rose-900/50',
                        )}
                      >
                        {row.score}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(245,158,11,0.08),transparent)]" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-violet-500" />
              <h3 className="text-lg font-semibold text-neutral-700">Badges</h3>
            </div>
            <p className="mb-4 text-sm text-neutral-500">
              Milestones from your last 14 days of organization scans and current repo health.
            </p>
            {summary.recentBadges.length === 0 ? (
              <div className="rounded-hds-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                  <Award className="h-7 w-7 text-neutral-300" />
                </div>
                <p className="text-sm font-medium text-neutral-600">No badges yet</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Merge Renovate PRs and reduce major drift — your medals will appear here with a
                  shine animation.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {summary.recentBadges.map((badge) => {
                  const art = BADGE_ART[badge.badgeId];
                  const Icon = art.icon;
                  return (
                    <li
                      key={`${badge.badgeId}-${badge.repositoryId ?? 'org'}-${badge.unlockedAt}`}
                      className="group relative overflow-hidden rounded-hds-xl border border-neutral-200 bg-neutral-100 p-4 shadow-sm transition-all hover:border-action-100 hover:shadow-md"
                    >
                      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-action-50 to-neutral-200 opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="relative flex gap-4">
                        <div
                          className={cn(
                            'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-md ring-4',
                            art.gradient,
                            art.ring,
                          )}
                        >
                          <Icon className="h-7 w-7 text-white drop-shadow-md" strokeWidth={2} />
                          <span className="krx-badge-shine pointer-events-none absolute inset-0 rounded-full" />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="font-semibold text-neutral-700">{badge.label}</p>
                          <p className="mt-1 text-sm text-neutral-500">{badge.description}</p>
                          {badge.scope === 'repository' && badge.repositoryName && (
                            <p className="mt-2 text-xs font-medium text-action-200">
                              {badge.repositoryName}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

