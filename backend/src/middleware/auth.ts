import { createHash } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

import { config } from '../config/env.js';
import { getStorage } from '../storage/index.js';

// Custom error class for auth errors
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

type AuthUser = {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  accessToken: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      apiTokenScopes?: string[];
      /** Set only after a personal API token is validated. */
      authMethod?: 'bearer' | 'session';
    }
  }
}

export function hashApiToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

function hasScope(scopes: string[] | undefined, want: string): boolean {
  return (scopes ?? []).includes(want);
}

/** Validate Bearer personal API token and populate req.user. Does not touch session. */
export async function authenticateBearer(req: Request): Promise<boolean> {
  if (req.authMethod === 'bearer' && req.user) {
    return true;
  }

  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return false;
  }
  const plaintext = header.slice('Bearer '.length).trim();
  if (!plaintext.startsWith('krabbx_')) {
    return false;
  }
  try {
    const storage = getStorage();
    const token = await storage.getApiTokenByHash(hashApiToken(plaintext));
    if (!token) {
      return false;
    }
    await storage.touchApiTokenLastUsed(token.id);
    req.user = {
      id: token.githubUserId,
      login: token.login,
      name: token.login,
      email: '',
      avatar_url: '',
      accessToken: '',
    };
    req.apiTokenScopes = token.scopes.length > 0 ? token.scopes : ['read', 'write'];
    req.authMethod = 'bearer';
    return true;
  } catch {
    return false;
  }
}

/** True when a Bearer header looks like a krabbx personal API token. */
export function looksLikeApiToken(req: Request): boolean {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return false;
  }
  const plaintext = header.slice('Bearer '.length).trim();
  return plaintext.startsWith('krabbx_');
}

// Middleware to check if user is authenticated
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (await authenticateBearer(req)) {
      next();
      return;
    }

    if (looksLikeApiToken(req)) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API token',
      });
      return;
    }

    if (!config.auth.enabled) {
      if (!req.user) {
        req.user = {
          id: 0,
          login: 'local',
          name: 'local',
          email: '',
          avatar_url: '',
          accessToken: '',
        };
        req.apiTokenScopes = ['read', 'write'];
        req.authMethod = 'session';
      }
      next();
      return;
    }
    if (!req.session.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }
    req.user = req.session.user;
    req.apiTokenScopes = ['read', 'write'];
    req.authMethod = 'session';
    next();
  } catch (error) {
    next(error);
  }
}

/** Reject mutating requests when Bearer token lacks write scope. */
export function requireWriteScope(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }
  if (req.authMethod !== 'bearer') {
    next();
    return;
  }
  if (!hasScope(req.apiTokenScopes, 'write')) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'write scope required',
    });
    return;
  }
  next();
}

// Middleware to optionally check auth (doesn't block, just adds user to request)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  next();
}

/** Attach session user only. Bearer auth is handled in requireAuth / CSRF. */
export function addUserToRequest(req: Request, res: Response, next: NextFunction): void {
  if (req.session.user && !req.user) {
    req.user = req.session.user;
    req.apiTokenScopes = ['read', 'write'];
    req.authMethod = 'session';
  }
  next();
}
