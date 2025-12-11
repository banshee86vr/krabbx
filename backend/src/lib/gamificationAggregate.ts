import type {
  GamificationBadgeUnlock,
  GamificationRepositoryHealth,
  GamificationSummary,
  Repository,
} from '../storage/types.js';
import {
  GAMIFICATION_SCORE_VERSION,
  computeHealthScoreV1,
  qualifiesConsistentMaintainerOrg,
  qualifiesDebtCrusherOrg,
  qualifiesZeroMajorDriftRepo,
} from './gamificationScore.js';

function buildHeadline(
  repos: Repository[],
  trend: { startOutdated: number | null; endOutdated: number | null; percentImproved: number | null },
): string {
  const withDeps = repos.filter((r) => r.totalDependencies > 0);
  const avgRatio =
    withDeps.length > 0
      ? withDeps.reduce(
          (sum, r) => sum + r.outdatedDependencies / Math.max(r.totalDependencies, 1),
          0,
        ) / withDeps.length
      : 0;
  const pct = Math.round(avgRatio * 100);
  if (trend.percentImproved != null && trend.percentImproved > 0) {
    return `Org dependency debt is trending down (~${Math.round(trend.percentImproved * 100)}% vs start of window). Average outdated ratio across repos: ${pct}%.`;
  }
  return `Average outdated ratio across repos with lockfiles: ${pct}%. Keep closing Renovate PRs to climb the leaderboard.`;
}

/**
 * Assemble gamification snapshot from repository rows, major-outdated counts, and org-level trend points.
 */
export function buildGamificationSummaryFromRepos(
  repos: Repository[],
  majorOutdatedByRepoId: Map<string, number>,
  orgDependencyTrends: {
    outdatedDependencies: number;
  }[],
): GamificationSummary {
  const nowIso = new Date().toISOString();

  const activeRepos = repos.filter((r) => !r.isArchived);

  const allRepositoryHealth: GamificationRepositoryHealth[] = activeRepos.map((r) => {
    const majorOutdatedCount = majorOutdatedByRepoId.get(r.id) ?? 0;
    const score = computeHealthScoreV1({
      totalDependencies: r.totalDependencies,
      outdatedDependencies: r.outdatedDependencies,
      majorOutdatedCount,
      openRenovatePRs: r.openRenovatePRs,
    });
    return {
      repositoryId: r.id,
      name: r.name,
      fullName: r.fullName,
      score,
      scoreVersion: GAMIFICATION_SCORE_VERSION,
      outdatedDependencies: r.outdatedDependencies,
      totalDependencies: r.totalDependencies,
      majorOutdatedCount,
      openRenovatePRs: r.openRenovatePRs,
    };
  });

  const leaderboard = [...allRepositoryHealth]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((h, i) => ({ ...h, rank: i + 1 }));

  let orgTrend14d: GamificationSummary['orgTrend14d'] = null;
  if (orgDependencyTrends.length >= 2) {
    const startOutdated = orgDependencyTrends[0]!.outdatedDependencies;
    const endOutdated = orgDependencyTrends[orgDependencyTrends.length - 1]!.outdatedDependencies;
    const percentImproved =
      startOutdated > 0 ? (startOutdated - endOutdated) / startOutdated : null;
    orgTrend14d = { startOutdated, endOutdated, percentImproved };
  } else if (orgDependencyTrends.length === 1) {
    const v = orgDependencyTrends[0]!.outdatedDependencies;
    orgTrend14d = { startOutdated: v, endOutdated: v, percentImproved: null };
  }

  const recentBadges: GamificationBadgeUnlock[] = [];

  if (qualifiesDebtCrusherOrg(orgDependencyTrends)) {
    recentBadges.push({
      badgeId: 'debt_crusher_org',
      label: 'Debt Crusher',
      description: 'Organization outdated dependencies dropped by at least 30% in the last 14 days of scans.',
      unlockedAt: nowIso,
      scope: 'organization',
    });
  }

  if (qualifiesConsistentMaintainerOrg(orgDependencyTrends)) {
    recentBadges.push({
      badgeId: 'consistent_maintainer_org',
      label: 'Consistent Maintainer',
      description: 'Last three organization scans each show strictly lower outdated dependency counts.',
      unlockedAt: nowIso,
      scope: 'organization',
    });
  }

  // Repo badges: top 10 only in feed to avoid noise
  for (const row of leaderboard) {
    if (qualifiesZeroMajorDriftRepo(row.majorOutdatedCount)) {
      recentBadges.push({
        badgeId: 'zero_major_drift_repo',
        label: 'Zero Major Drift',
        description: 'No major-version outdated dependencies in this repository.',
        unlockedAt: nowIso,
        scope: 'repository',
        repositoryId: row.repositoryId,
        repositoryName: row.name,
      });
    }
  }

  const headline = buildHeadline(activeRepos, orgTrend14d ?? { startOutdated: null, endOutdated: null, percentImproved: null });

  return {
    enabled: true,
    scoreVersion: GAMIFICATION_SCORE_VERSION,
    headline,
    orgTrend14d,
    leaderboard,
    allRepositoryHealth,
    recentBadges,
  };
}
