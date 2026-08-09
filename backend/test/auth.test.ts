import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  config: {
    auth: { enabled: true },
    storageMode: 'memory',
  },
}));

const getApiTokenByHash = vi.fn();
const touchApiTokenLastUsed = vi.fn();

vi.mock('../src/storage/index.js', () => ({
  getStorage: () => ({
    getApiTokenByHash,
    touchApiTokenLastUsed,
  }),
}));

import {
  addUserToRequest,
  authenticateBearer,
  requireAuth,
  requireWriteScope,
} from '../src/middleware/auth.js';

type SessionUser = NonNullable<Request['user']>;

function createResponseMock() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });

  return {
    response: { status } as unknown as Response,
    status,
    json,
  };
}

function createNextMock() {
  return vi.fn() as unknown as NextFunction;
}

function createRequest(partial: {
  session?: Record<string, unknown>;
  authorization?: string;
  method?: string;
  authMethod?: 'bearer' | 'session';
  apiTokenScopes?: string[];
  user?: SessionUser;
}): Request {
  const headers: Record<string, string | undefined> = {
    authorization: partial.authorization,
  };
  return {
    method: partial.method ?? 'GET',
    session: partial.session ?? {},
    authMethod: partial.authMethod,
    apiTokenScopes: partial.apiTokenScopes,
    user: partial.user,
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

const sessionUser: SessionUser = {
  id: 1,
  login: 'octocat',
  name: 'The Octocat',
  email: 'octocat@example.com',
  avatar_url: 'https://example.com/avatar.png',
  accessToken: 'secret-token',
};

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a 401 response when the session has no user', async () => {
    const req = createRequest({ session: {} });
    const { response, status, json } = createResponseMock();
    const next = createNextMock();

    await requireAuth(req, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when the session has a user', async () => {
    const req = createRequest({ session: { user: sessionUser } });
    const { response, status } = createResponseMock();
    const next = createNextMock();

    await requireAuth(req, response, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual(sessionUser);
    expect(req.authMethod).toBe('session');
  });

  it('accepts a valid Bearer API token', async () => {
    getApiTokenByHash.mockResolvedValue({
      id: 'tok1',
      githubUserId: 42,
      login: 'token-user',
      scopes: ['read', 'write'],
    });
    touchApiTokenLastUsed.mockResolvedValue(undefined);

    const req = createRequest({
      session: {},
      authorization: `Bearer krabbx_${'a'.repeat(64)}`,
    });
    const { response, status } = createResponseMock();
    const next = createNextMock();

    await requireAuth(req, response, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(req.authMethod).toBe('bearer');
    expect(req.user?.login).toBe('token-user');
    expect(touchApiTokenLastUsed).toHaveBeenCalledWith('tok1');
  });

  it('rejects an invalid krabbx_ Bearer token', async () => {
    getApiTokenByHash.mockResolvedValue(null);
    const req = createRequest({
      session: { user: sessionUser },
      authorization: `Bearer krabbx_${'b'.repeat(64)}`,
    });
    const { response, status, json } = createResponseMock();
    const next = createNextMock();

    await requireAuth(req, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Invalid API token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('addUserToRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('copies the session user onto the request without Bearer lookup', () => {
    const req = createRequest({ session: { user: sessionUser } });
    const { response } = createResponseMock();
    const next = createNextMock();

    addUserToRequest(req, response, next);

    expect(req.user).toEqual(sessionUser);
    expect(req.authMethod).toBe('session');
    expect(next).toHaveBeenCalledOnce();
    expect(getApiTokenByHash).not.toHaveBeenCalled();
  });

  it('leaves req.user undefined when no session user exists', () => {
    const req = createRequest({ session: {} });
    const { response } = createResponseMock();
    const next = createNextMock();

    addUserToRequest(req, response, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('authenticateBearer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not touch lastUsed twice when already authenticated', async () => {
    const req = createRequest({
      authMethod: 'bearer',
      user: sessionUser,
      apiTokenScopes: ['read'],
      authorization: `Bearer krabbx_${'c'.repeat(64)}`,
    });

    await expect(authenticateBearer(req)).resolves.toBe(true);
    expect(getApiTokenByHash).not.toHaveBeenCalled();
    expect(touchApiTokenLastUsed).not.toHaveBeenCalled();
  });
});

describe('requireWriteScope', () => {
  it('blocks mutating requests for read-only Bearer tokens', () => {
    const req = createRequest({
      method: 'POST',
      authMethod: 'bearer',
      apiTokenScopes: ['read'],
      authorization: `Bearer krabbx_${'d'.repeat(64)}`,
    });
    const { response, status, json } = createResponseMock();
    const next = createNextMock();

    requireWriteScope(req, response, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'write scope required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows mutating requests for session auth', () => {
    const req = createRequest({
      method: 'POST',
      authMethod: 'session',
      apiTokenScopes: ['read', 'write'],
    });
    const { response, status } = createResponseMock();
    const next = createNextMock();

    requireWriteScope(req, response, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
