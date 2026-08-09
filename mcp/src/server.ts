import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { KrabbxApiClient } from './client.js';

function textResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  };
}

export function createKrabbxMcpServer(client: KrabbxApiClient): McpServer {
  const server = new McpServer({
    name: 'krabbx',
    version: '1.0.0',
  });

  server.tool('health', 'Check Krabbx backend health and storage mode.', {}, async () => {
    try {
      return textResult(await client.request('GET', '/health'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool(
    'get_settings',
    'Get dashboard settings (targets, scan interval). Secrets are never returned.',
    {},
    async () => {
      try {
        return textResult(await client.request('GET', '/api/settings'));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool('dashboard_summary', 'Org Renovate adoption and dependency debt snapshot.', {}, async () => {
    try {
      return textResult(await client.request('GET', '/api/dashboard/summary'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool(
    'dashboard_trends',
    'Historical dependency and scan trends.',
    { days: z.number().int().min(1).max(365).optional() },
    async ({ days }) => {
      try {
        return textResult(await client.request('GET', '/api/dashboard/trends', { query: { days: days ?? 30 } }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool('dashboard_activity', 'Recent scan/dependency activity feed.', {}, async () => {
    try {
      return textResult(await client.request('GET', '/api/dashboard/activity'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool('top_outdated', 'Most common outdated dependencies across repos.', {
    limit: z.number().int().min(1).max(50).optional(),
  }, async ({ limit }) => {
    try {
      return textResult(await client.request('GET', '/api/dashboard/top-outdated', { query: { limit: limit ?? 10 } }));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool('gamification_summary', 'Dependency health leaderboard (when enabled).', {}, async () => {
    try {
      return textResult(await client.request('GET', '/api/dashboard/gamification'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool('github_rate_limit', 'GitHub API rate limit status for the scanner token.', {}, async () => {
    try {
      return textResult(await client.request('GET', '/api/dashboard/github-status'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool(
    'list_repositories',
    'List repositories with Renovate adoption / outdated filters.',
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      adopted: z.enum(['true', 'false', 'all']).optional(),
      hasOutdated: z.enum(['true', 'false', 'all']).optional(),
      search: z.string().optional(),
      sortBy: z
        .enum(['name', 'renovateAdopted', 'outdatedDependencies', 'lastScanAt', 'updatedAt', 'healthScore'])
        .optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    },
    async (args) => {
      try {
        return textResult(await client.request('GET', '/api/repositories', { query: args }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_repository',
    'Get repository detail including dependencies and scan history.',
    { id: z.string() },
    async ({ id }) => {
      try {
        return textResult(await client.request('GET', `/api/repositories/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool('repository_stats', 'Aggregate repository adoption stats.', {}, async () => {
    try {
      return textResult(await client.request('GET', '/api/repositories/stats'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool('scan_status', 'Current organization scan status / progress.', {}, async () => {
    try {
      return textResult(await client.request('GET', '/api/repositories/scan/status'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool(
    'list_dependencies',
    'List dependencies across repositories.',
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      isOutdated: z.enum(['true', 'false', 'all']).optional(),
      packageManager: z.string().optional(),
      updateType: z.enum(['major', 'minor', 'patch', 'digest', 'pin', 'all']).optional(),
      hasOpenPR: z.enum(['true', 'false', 'all']).optional(),
      search: z.string().optional(),
      repositoryId: z.string().optional(),
    },
    async (args) => {
      try {
        return textResult(await client.request('GET', '/api/dependencies', { query: args }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'list_outdated',
    'List only outdated dependencies.',
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      packageManager: z.string().optional(),
      updateType: z.enum(['major', 'minor', 'patch', 'digest', 'pin', 'all']).optional(),
      search: z.string().optional(),
    },
    async (args) => {
      try {
        return textResult(await client.request('GET', '/api/dependencies/outdated', { query: args }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool('dependency_stats', 'Aggregate dependency statistics.', {}, async () => {
    try {
      return textResult(await client.request('GET', '/api/dependencies/stats'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool('list_package_managers', 'Distinct package managers seen in the fleet.', {}, async () => {
    try {
      return textResult(await client.request('GET', '/api/dependencies/package-managers'));
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool(
    'list_renovate_prs',
    'List open Renovate PRs for a repository.',
    { repositoryId: z.string() },
    async ({ repositoryId }) => {
      try {
        return textResult(await client.request('GET', `/api/dependencies/prs/${repositoryId}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'trigger_org_scan',
    'CONFIRM WITH THE USER before calling. Trigger a full organization/user scan (GitHub rate-limit heavy).',
    {},
    async () => {
      try {
        return textResult(await client.request('POST', '/api/repositories/scan'));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'trigger_repo_scan',
    'CONFIRM WITH THE USER before calling. Trigger a scan for one repository.',
    { id: z.string() },
    async ({ id }) => {
      try {
        return textResult(await client.request('POST', `/api/repositories/${id}/scan`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'update_settings',
    'CONFIRM WITH THE USER before calling. Update scanIntervalMinutes and/or maxScanLimit only.',
    {
      scanIntervalMinutes: z.number().int().min(15).max(1440).optional(),
      maxScanLimit: z.number().int().min(0).max(1000).optional(),
    },
    async (args) => {
      try {
        return textResult(await client.request('PUT', '/api/settings', { body: args }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  return server;
}
