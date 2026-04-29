import { describe, expect, it } from 'vitest';

import {
  computeHealthScoreV1,
  computeHealthScoreBreakdownV1,
  qualifiesConsistentMaintainerOrg,
  qualifiesDebtCrusherOrg,
  qualifiesZeroMajorDriftRepo,
} from '../src/lib/gamificationScore.js';

describe('computeHealthScoreV1', () => {
  it('returns 100 for perfectly clean repo', () => {
    expect(
      computeHealthScoreV1({
        totalDependencies: 20,
        outdatedDependencies: 0,
        majorOutdatedCount: 0,
        openRenovatePRs: 0,
      }),
    ).toBe(100);
  });

  it('never exceeds 100 when PR bonus is large and repo is clean', () => {
    expect(
      computeHealthScoreV1({
        totalDependencies: 50,
        outdatedDependencies: 0,
        majorOutdatedCount: 0,
        openRenovatePRs: 100,
      }),
    ).toBe(100);
  });

  it('hits the v1 score floor when everything is outdated with max major penalty', () => {
    const score = computeHealthScoreV1({
      totalDependencies: 10,
      outdatedDependencies: 10,
      majorOutdatedCount: 100,
      openRenovatePRs: 0,
    });
    // 100 - 70 (full outdated ratio) - 20 (capped major penalty) = 10
    expect(score).toBe(10);
  });

  it('treats no lockfile data as neutral ratio when nothing outdated', () => {
    expect(
      computeHealthScoreV1({
        totalDependencies: 0,
        outdatedDependencies: 0,
        majorOutdatedCount: 0,
        openRenovatePRs: 0,
      }),
    ).toBe(100);
  });

  it('applies PR remediation bonus capped at 10', () => {
    const low = computeHealthScoreV1({
      totalDependencies: 100,
      outdatedDependencies: 30,
      majorOutdatedCount: 0,
      openRenovatePRs: 0,
    });
    const high = computeHealthScoreV1({
      totalDependencies: 100,
      outdatedDependencies: 30,
      majorOutdatedCount: 0,
      openRenovatePRs: 10,
    });
    expect(high - low).toBe(10);
  });
});

describe('computeHealthScoreBreakdownV1', () => {
  it('matches computeHealthScoreV1 final score', () => {
    const input = {
      totalDependencies: 40,
      outdatedDependencies: 10,
      majorOutdatedCount: 2,
      openRenovatePRs: 3,
    };
    const breakdown = computeHealthScoreBreakdownV1(input);
    expect(breakdown.finalScore).toBe(computeHealthScoreV1(input));
    expect(breakdown.formula.prRemediationBonus).toBe(6);
    expect(breakdown.formula.majorPenalty).toBe(4);
  });
});

describe('badge qualification helpers', () => {
  it('qualifiesDebtCrusherOrg when drop is at least 30%', () => {
    expect(
      qualifiesDebtCrusherOrg([
        { outdatedDependencies: 100 },
        { outdatedDependencies: 69 },
      ]),
    ).toBe(true);
    expect(
      qualifiesDebtCrusherOrg([{ outdatedDependencies: 100 }, { outdatedDependencies: 71 }]),
    ).toBe(false);
  });

  it('qualifiesConsistentMaintainerOrg for three strictly decreasing points', () => {
    expect(
      qualifiesConsistentMaintainerOrg([
        { outdatedDependencies: 50 },
        { outdatedDependencies: 40 },
        { outdatedDependencies: 30 },
      ]),
    ).toBe(true);
    expect(
      qualifiesConsistentMaintainerOrg([
        { outdatedDependencies: 50 },
        { outdatedDependencies: 40 },
        { outdatedDependencies: 40 },
      ]),
    ).toBe(false);
  });

  it('qualifiesZeroMajorDriftRepo only when major count is zero', () => {
    expect(qualifiesZeroMajorDriftRepo(0)).toBe(true);
    expect(qualifiesZeroMajorDriftRepo(1)).toBe(false);
  });
});
