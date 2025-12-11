/** Health score formula version label (API contract). */
export const GAMIFICATION_SCORE_VERSION = 'v1' as const;

export type GamificationScoreVersion = typeof GAMIFICATION_SCORE_VERSION;

export interface HealthScoreInputV1 {
  totalDependencies: number;
  outdatedDependencies: number;
  majorOutdatedCount: number;
  openRenovatePRs: number;
}

/**
 * v1 score (0–100): rewards low outdated ratio, penalizes major drift,
 * and rewards active Renovate PR remediation (proxy for PR follow-through — per-repo scan history is not stored in MVP).
 */
export function computeHealthScoreV1(input: HealthScoreInputV1): number {
  const total = input.totalDependencies;
  const outdated = input.outdatedDependencies;
  const outdatedRatio = total > 0 ? outdated / total : outdated > 0 ? 1 : 0;

  let score = 100 - outdatedRatio * 70;
  const majorPenalty = Math.min(20, input.majorOutdatedCount * 2);
  score -= majorPenalty;
  const prRemediationBonus = Math.min(10, input.openRenovatePRs * 2);
  score += prRemediationBonus;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Full v1 score explanation + radar axes (0–100 each) aligned with the three formula levers */
export interface HealthScoreBreakdownV1 {
  scoreVersion: 'v1';
  finalScore: number;
  inputs: HealthScoreInputV1;
  formula: {
    outdatedRatio: number;
    /** Step 1: 100 − outdatedRatio × 70 */
    baseFromOutdatedRatio: number;
    /** Step 2: subtract min(20, majorOutdatedCount × 2) */
    majorPenalty: number;
    scoreAfterMajor: number;
    /** Step 3: add min(10, openRenovatePRs × 2) */
    prRemediationBonus: number;
    /** Before final clamp to 0–100 */
    rawBeforeClamp: number;
  };
  radar: {
    /** Same scale as the first term (100 − ratio×70), clamped */
    outdatedRatioTerm: number;
    /** 100 minus applied major penalty (shows major-drift pressure) */
    majorDiscipline: number;
    /** Normalized PR bonus (actual bonus / 10 × 100) */
    prRemediation: number;
  };
}

export function computeHealthScoreBreakdownV1(
  input: HealthScoreInputV1,
): HealthScoreBreakdownV1 {
  const total = input.totalDependencies;
  const outdated = input.outdatedDependencies;
  const outdatedRatio = total > 0 ? outdated / total : outdated > 0 ? 1 : 0;

  const baseFromOutdatedRatio = 100 - outdatedRatio * 70;
  const majorPenalty = Math.min(20, input.majorOutdatedCount * 2);
  const scoreAfterMajor = baseFromOutdatedRatio - majorPenalty;
  const prRemediationBonus = Math.min(10, input.openRenovatePRs * 2);
  const rawBeforeClamp = scoreAfterMajor + prRemediationBonus;

  const finalScore = computeHealthScoreV1(input);

  const outdatedRatioTerm = Math.max(0, Math.min(100, baseFromOutdatedRatio));
  const majorDiscipline = Math.max(0, Math.min(100, 100 - majorPenalty));
  const prRemediation = (prRemediationBonus / 10) * 100;

  return {
    scoreVersion: 'v1',
    finalScore,
    inputs: { ...input },
    formula: {
      outdatedRatio,
      baseFromOutdatedRatio,
      majorPenalty,
      scoreAfterMajor,
      prRemediationBonus,
      rawBeforeClamp,
    },
    radar: {
      outdatedRatioTerm,
      majorDiscipline,
      prRemediation,
    },
  };
}

export type GamificationBadgeId =
  | 'debt_crusher_org'
  | 'consistent_maintainer_org'
  | 'zero_major_drift_repo';

export interface TrendSnapshotV1 {
  outdatedDependencies: number;
}

/** Org-level: ≥30% drop in org outdated count vs first trend point in window. */
export function qualifiesDebtCrusherOrg(
  trends: TrendSnapshotV1[],
): boolean {
  if (trends.length < 2) return false;
  const first = trends[0]!.outdatedDependencies;
  const last = trends[trends.length - 1]!.outdatedDependencies;
  if (first <= 0) return false;
  const reduction = (first - last) / first;
  return reduction >= 0.3;
}

/** Org-level: last three trend points show strictly decreasing outdated counts. */
export function qualifiesConsistentMaintainerOrg(
  trends: TrendSnapshotV1[],
): boolean {
  if (trends.length < 3) return false;
  const last3 = trends.slice(-3);
  const [a, b, c] = last3;
  return (
    a!.outdatedDependencies > b!.outdatedDependencies &&
    b!.outdatedDependencies > c!.outdatedDependencies
  );
}

/** Repo-level: no major outdated dependencies. */
export function qualifiesZeroMajorDriftRepo(majorOutdatedCount: number): boolean {
  return majorOutdatedCount === 0;
}
