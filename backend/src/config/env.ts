import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env files - try multiple locations
const envPaths = [
  path.resolve(process.cwd(), '../.env'), // From backend/ to root
  path.resolve(process.cwd(), '.env'), // From root
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

/** Comma-separated org or user login slugs, or legacy single org via GITHUB_ORG only */
export function parseGithubTargetLoginList(raw: {
  GITHUB_TARGETS?: string;
  GITHUB_ORG?: string;
}): string[] {
  const targets = raw.GITHUB_TARGETS?.trim();
  if (targets) {
    return targets.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
  }
  const legacy = raw.GITHUB_ORG?.trim();
  if (legacy) {
    return [legacy];
  }
  return [];
}

const authEnabledSchema = z.enum(['true', 'false']).default('true');

const envSchemaBase = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().optional(),

  // Logging configuration
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE']).default('INFO'),

  // GitHub API token (scanner / server-to-server operations)
  GITHUB_TOKEN: z.string().min(1),

  /** Comma-separated logins or org names to scan */
  GITHUB_TARGETS: z.string().optional(),
  /** Legacy single org / user slug (fallback if GITHUB_TARGETS unset) */
  GITHUB_ORG: z.string().optional(),

  /** When false, OAuth is not used; API accepts requests without logged-in GitHub identity */
  AUTH_ENABLED: authEnabledSchema,

  GITHUB_AUTH_CLIENT_ID: z.string().optional(),
  GITHUB_AUTH_CLIENT_SECRET: z.string().optional(),
  /** GitHub team slug within each organization target; if unset, OAuth allows any member of the org */
  GITHUB_AUTH_TEAM_SLUG: z.string().optional(),

  SESSION_SECRET: z.string().min(1),

  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Storage mode: 'database' or 'memory' (default: memory for easy startup)
  STORAGE_MODE: z.enum(['database', 'memory']).default('memory'),

  // Scheduler
  SCAN_INTERVAL_MINUTES: z.string().default('60'),

  // Rate limit protection: maximum repos to scan per organization scan (0 = unlimited)
  MAX_SCAN_LIMIT: z.string().default('0'),

  // Specific repositories to scan (comma-separated list, optional, takes precedence over MAX_SCAN_LIMIT)
  SCAN_REPOS: z.string().optional(),

  // Redis (for session storage and Socket.io adapter in production)
  REDIS_URL: z.string().default('redis://localhost:6379'),
  USE_REDIS: z.enum(['true', 'false']).default('false'),
});

const envSchema = envSchemaBase.superRefine((data, ctx) => {
  const targets = parseGithubTargetLoginList(data);
  if (targets.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Set GITHUB_TARGETS (comma-separated) and/or GITHUB_ORG to at least one owner',
      path: ['GITHUB_TARGETS'],
    });
  }

  if (data.AUTH_ENABLED === 'true') {
    if (!data.GITHUB_AUTH_CLIENT_ID?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GITHUB_AUTH_CLIENT_ID is required when AUTH_ENABLED=true',
        path: ['GITHUB_AUTH_CLIENT_ID'],
      });
    }
    if (!data.GITHUB_AUTH_CLIENT_SECRET?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GITHUB_AUTH_CLIENT_SECRET is required when AUTH_ENABLED=true',
        path: ['GITHUB_AUTH_CLIENT_SECRET'],
      });
    }
  }
});

export const env = envSchema.parse(process.env);

// Determine storage mode: use database only if explicitly set AND DATABASE_URL is provided
const effectiveStorageMode =
  env.STORAGE_MODE === 'database' && env.DATABASE_URL ? 'database' : 'memory';

const githubTargets = parseGithubTargetLoginList(env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  databaseUrl: env.DATABASE_URL,
  storageMode: effectiveStorageMode as 'database' | 'memory',
  logging: {
    level: env.LOG_LEVEL,
  },
  github: {
    token: env.GITHUB_TOKEN,
    /** Normalized list of org and/or user slugs to scan */
    targets: githubTargets,
    /** @deprecated first target only — use `targets` */
    org: githubTargets[0] ?? '',
  },
  auth: {
    enabled: env.AUTH_ENABLED === 'true',
    clientId: env.GITHUB_AUTH_CLIENT_ID?.trim() ?? '',
    clientSecret: env.GITHUB_AUTH_CLIENT_SECRET?.trim() ?? '',
    /** Trimmed team slug, or empty string to enforce org membership only */
    teamSlug: env.GITHUB_AUTH_TEAM_SLUG?.trim() ?? '',
    sessionSecret: env.SESSION_SECRET,
  },
  frontendUrl: env.FRONTEND_URL,
  scheduler: {
    scanIntervalMinutes: parseInt(env.SCAN_INTERVAL_MINUTES, 10),
  },
  rateLimit: {
    maxScanLimit: parseInt(env.MAX_SCAN_LIMIT, 10),
  },
  scan: {
    specificRepos: env.SCAN_REPOS
      ? env.SCAN_REPOS.split(',')
          .map((r) => r.trim())
          .filter((r) => r.length > 0)
      : undefined,
  },
  redis: {
    url: env.REDIS_URL,
  },
};
