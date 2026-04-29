import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { Award, HelpCircle, LineChart, Sparkles } from 'lucide-react';
import type { RepositoryGamification } from '../../types';
import { cn } from '../../lib/utils';

const RADAR_COLORS = {
  fill: 'rgba(99, 102, 241, 0.45)',
  stroke: '#6366f1',
};

type RepositoryHealthPanelProps = {
  gamification: RepositoryGamification;
  /** When the repo is not in the org ranking (e.g. archived) */
  rankHidden?: boolean;
};

export function RepositoryHealthPanel({ gamification, rankHidden }: RepositoryHealthPanelProps) {
  const g = gamification;
  const ratioPct = (g.formula.outdatedRatio * 100).toFixed(1);

  const radarRows = [
    {
      axis: 'Freshness',
      detail: '100 − ratio×70',
      value: Math.round(g.radar.outdatedRatioTerm),
    },
    {
      axis: 'Major discipline',
      detail: '100 − penalty',
      value: Math.round(g.radar.majorDiscipline),
    },
    {
      axis: 'PR remediation',
      detail: 'bonus / 10 · 100',
      value: Math.round(g.radar.prRemediation),
    },
  ];

  return (
    <div
      id="repo-health"
      className="card relative overflow-hidden scroll-mt-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_0%_0%,rgba(99,102,241,0.08),transparent)]" />
      <div className="relative border-b border-neutral-200 bg-gradient-to-r from-indigo-50/40 via-white to-amber-50/20 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-hds-lg bg-white p-2 shadow-sm ring-1 ring-neutral-100">
              <LineChart className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">Dependency health score</h2>
              <p className="text-sm text-neutral-500">
                Version {g.scoreVersion} — same model as the dashboard leaderboard
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={cn(
                'flex h-16 w-16 flex-col items-center justify-center rounded-2xl text-center shadow-inner ring-2 ring-white',
                g.finalScore >= 80 && 'bg-gradient-to-br from-emerald-100 to-emerald-50',
                g.finalScore >= 50 && g.finalScore < 80 && 'bg-gradient-to-br from-amber-100 to-amber-50',
                g.finalScore < 50 && 'bg-gradient-to-br from-rose-100 to-rose-50',
              )}
            >
              <span className="text-2xl font-bold tabular-nums text-neutral-800">{g.finalScore}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">/ 100</span>
            </div>
            {g.organizationRank != null && g.totalRankedRepos > 0 && !rankHidden && (
              <div className="rounded-hds-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-sm">
                <p className="text-xs font-medium text-indigo-600">Org rank</p>
                <p className="font-bold text-indigo-900">
                  #{g.organizationRank}
                  <span className="text-indigo-400 font-normal"> / {g.totalRankedRepos}</span>
                </p>
              </div>
            )}
            {g.inputs.majorOutdatedCount === 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
                <Award className="h-3.5 w-3.5" />
                Zero major drift
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative grid gap-8 p-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
              Score shape (radar)
            </h3>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            Three axes at 0–100: how each lever contributes to the story (not three additive chunks of
            the final number — see calculation below).
          </p>
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="78%"
                data={radarRows}
              >
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar
                  name="Health"
                  dataKey="value"
                  stroke={RADAR_COLORS.stroke}
                  fill={RADAR_COLORS.fill}
                  fillOpacity={0.55}
                  strokeWidth={2}
                  dot={{ r: 3, fill: RADAR_COLORS.stroke }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs text-neutral-500">
            {radarRows.map((row) => (
              <li key={row.axis}>
                <span className="font-medium text-neutral-600">{row.axis}</span>
                <span className="text-neutral-400"> — {row.detail}</span>
                <span className="tabular-nums text-neutral-700"> → {row.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
              How the score is calculated
            </h3>
          </div>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-neutral-600">
            <li>
              <span className="font-medium text-neutral-700">Outdated ratio</span>
              <span className="text-neutral-500">
                {' '}
                — {g.inputs.outdatedDependencies} outdated / {g.inputs.totalDependencies} tracked deps →
                ratio {ratioPct}%. First term:{' '}
                <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
                  100 − ratio × 70 = {g.formula.baseFromOutdatedRatio.toFixed(1)}
                </code>
              </span>
            </li>
            <li>
              <span className="font-medium text-neutral-700">Major semver drift</span>
              <span className="text-neutral-500">
                {' '}
                — {g.inputs.majorOutdatedCount} major outdated deps. Penalty:{' '}
                <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
                  min(20, majors × 2) = {g.formula.majorPenalty.toFixed(1)}
                </code>
                . After subtraction:{' '}
                <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
                  {g.formula.scoreAfterMajor.toFixed(1)}
                </code>
              </span>
            </li>
            <li>
              <span className="font-medium text-neutral-700">Renovate PR remediation</span>
              <span className="text-neutral-500">
                {' '}
                — {g.inputs.openRenovatePRs} open Renovate PRs. Bonus:{' '}
                <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
                  min(10, PRs × 2) = {g.formula.prRemediationBonus.toFixed(1)}
                </code>
                . Raw sum before clamp:{' '}
                <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
                  {g.formula.rawBeforeClamp.toFixed(1)}
                </code>
              </span>
            </li>
            <li>
              <span className="font-medium text-neutral-700">Final</span>
              <span className="text-neutral-500">
                {' '}
                — clamp to 0–100 and round →{' '}
                <strong className="text-neutral-800">{g.finalScore}</strong>.
              </span>
            </li>
          </ol>
          <p className="mt-4 rounded-hds-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
            Open PRs reward active remediation; they are not a substitute for dependency hygiene. Per-repo
            scan history is not stored in this MVP.
          </p>
        </div>
      </div>
    </div>
  );
}
