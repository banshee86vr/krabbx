import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { addUserToRequest, requireAuth } from '../src/middleware/auth.js';

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

const sessionUser: SessionUser = {
  id: 1,
  login: 'octocat',
  name: 'The Octocat',
  email: 'octocat@example.com',
  avatar_url: 'https://example.com/avatar.png',
  accessToken: 'secret-token',
};

describe('requireAuth', () => {
  it('returns a 401 response when the session has no user', () => {
    const req = { session: {} } as unknown as Request;
    const { response, status, json } = createResponseMock();
    const next = createNextMock();

    requireAuth(req, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when the session has a user', () => {
    const req = { session: { user: sessionUser } } as unknown as Request;
    const { response, status } = createResponseMock();
    const next = createNextMock();

    requireAuth(req, response, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('addUserToRequest', () => {
  it('copies the session user onto the request', () => {
    const req = { session: { user: sessionUser } } as unknown as Request;
    const { response } = createResponseMock();
    const next = createNextMock();

    addUserToRequest(req, response, next);

    expect(req.user).toEqual(sessionUser);
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves req.user undefined when no session user exists', () => {
    const req = { session: {} } as unknown as Request;
    const { response } = createResponseMock();
    const next = createNextMock();

    addUserToRequest(req, response, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });
});
