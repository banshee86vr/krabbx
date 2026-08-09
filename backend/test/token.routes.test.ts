import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type Express } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../src/middleware/errorHandler.js';
import { tokenRoutes } from '../src/routes/token.routes.js';
import { MemoryStorage } from '../src/storage/memory.storage.js';

const storage = new MemoryStorage();

vi.mock('../src/storage/index.js', () => ({
  getStorage: () => storage,
}));

const sessionUser = {
  id: 42,
  login: 'octocat',
  name: 'The Octocat',
  email: 'octocat@example.com',
  avatar_url: 'https://example.com/a.png',
  accessToken: 'session-token',
};

function createApp(withUser = true): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (withUser) {
      req.user = sessionUser;
    }
    next();
  });
  app.use('/api/tokens', tokenRoutes);
  app.use(errorHandler);
  return app;
}

async function withServer(
  app: Express,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('token routes', () => {
  beforeEach(async () => {
    // Fresh memory store between tests
    const tokens = await storage.listApiTokens(sessionUser.id);
    for (const token of tokens) {
      await storage.revokeApiToken(sessionUser.id, token.id);
    }
  });

  it('creates a token and returns plaintext once', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'cursor', scopes: ['read'] }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        id: string;
        name: string;
        scopes: string[];
        token: string;
        tokenPrefix: string;
      };
      expect(body.name).toBe('cursor');
      expect(body.scopes).toEqual(['read']);
      expect(body.token).toMatch(/^krabbx_[a-f0-9]{64}$/);
      expect(body.token.startsWith(body.tokenPrefix)).toBe(true);

      const listed = await storage.listApiTokens(sessionUser.id);
      expect(listed).toHaveLength(1);
      expect(listed[0]).not.toHaveProperty('tokenHash');
      expect((listed[0] as { token?: string }).token).toBeUndefined();
    });
  });

  it('lists tokens for the authenticated user', async () => {
    await storage.createApiToken({
      githubUserId: sessionUser.id,
      login: sessionUser.login,
      name: 'existing',
      tokenPrefix: 'krabbx_exist',
      tokenHash: 'hash-1',
      scopes: ['read', 'write'],
    });
    await storage.createApiToken({
      githubUserId: 999,
      login: 'other',
      name: 'other-user',
      tokenPrefix: 'krabbx_other',
      tokenHash: 'hash-2',
      scopes: ['read'],
    });

    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/tokens`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Array<{ name: string }> };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.name).toBe('existing');
    });
  });

  it('revokes a token owned by the user', async () => {
    const created = await storage.createApiToken({
      githubUserId: sessionUser.id,
      login: sessionUser.login,
      name: 'to-revoke',
      tokenPrefix: 'krabbx_revok',
      tokenHash: 'hash-revoke',
      scopes: ['read', 'write'],
    });

    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/tokens/${created.id}`, { method: 'DELETE' });
      expect(res.status).toBe(204);
      const remaining = await storage.listApiTokens(sessionUser.id);
      expect(remaining).toHaveLength(0);
      expect(await storage.getApiTokenByHash('hash-revoke')).toBeNull();
    });
  });

  it('returns 404 when revoking an unknown token', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/tokens/does-not-exist`, { method: 'DELETE' });
      expect(res.status).toBe(404);
      const body = (await res.json()) as { message: string };
      expect(body.message).toBe('Token not found');
    });
  });

  it('returns 401 when no user is attached', async () => {
    await withServer(createApp(false), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'nope' }),
      });
      expect(res.status).toBe(401);
    });
  });

  it('rejects invalid create payloads', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', scopes: ['admin'] }),
      });
      expect(res.status).toBe(400);
    });
  });
});
