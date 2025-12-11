import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load .env files - try multiple locations
const envPaths = [
  path.resolve(process.cwd(), '../.env'), // From backend/ to root
  path.resolve(process.cwd(), '.env'),    // From root
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().optional(),
  
  // Logging configuration
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE']).default('INFO'),
  
  // GitHub API access (for reading repositories and data)
  GITHUB_TOKEN: z.string(),
  GITHUB_ORG: z.string(),
  
  // GitHub OAuth App (for user authentication)
  GITHUB_AUTH_CLIENT_ID: z.string(),
  GITHUB_AUTH_CLIENT_SECRET: z.string(),
  
  // Session configuration
  SESSION_SECRET: z.string(),
  
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Storage mode: 'database' or 'memory' (default: memory for easy startup)
  STORAGE_MODE: z.enum(['database', 'memory']).default('memory'),

  // Teams (optional)
  TEAMS_WEBHOOK_URL: z.string().optional(),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  NOTIFICATION_FROM_EMAIL: z.string().optional(),

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

export const env = envSchema.parse(process.env);

// Determine storage mode: use database only if explicitly set AND DATABASE_URL is provided
const effectiveStorageMode = env.STORAGE_MODE === 'database' && env.DATABASE_URL
  ? 'database'
  : 'memory';

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
    org: env.GITHUB_ORG,
  },
  auth: {
    clientId: env.GITHUB_AUTH_CLIENT_ID,
    clientSecret: env.GITHUB_AUTH_CLIENT_SECRET,
    sessionSecret: env.SESSION_SECRET,
  },
  frontendUrl: env.FRONTEND_URL,
  teams: {
    webhookUrl: env.TEAMS_WEBHOOK_URL,
  },
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.NOTIFICATION_FROM_EMAIL,
  },
  scheduler: {
    scanIntervalMinutes: parseInt(env.SCAN_INTERVAL_MINUTES, 10),
  },
  rateLimit: {
    maxScanLimit: parseInt(env.MAX_SCAN_LIMIT, 10),
  },
  scan: {
    specificRepos: env.SCAN_REPOS
      ? env.SCAN_REPOS.split(',').map(r => r.trim()).filter(r => r.length > 0)
      : undefined,
  },
  redis: {
    url: env.REDIS_URL,
  },
};
