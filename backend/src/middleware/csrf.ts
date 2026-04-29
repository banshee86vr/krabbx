import type { NextFunction, Request, Response } from 'express';
import CSRF from 'csrf';

import { AppError } from './errorHandler.js';

const tokens = new CSRF();

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function ensureCsrfSecret(req: Request): string {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = tokens.secretSync();
  }
  return req.session.csrfSecret;
}

/**
 * Return a CSRF token for the current session (call from GET /api/auth/csrf).
 */
export function issueCsrfToken(req: Request): string {
  const secret = ensureCsrfSecret(req);
  return tokens.create(secret);
}

/**
 * Verify double-submit token on mutating /api requests.
 * Mounted at `/api` so `req.path` is the suffix (e.g. `/auth/logout`).
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const path = req.path || '';
  if (path === '/auth/callback' || path === '/auth/login') {
    next();
    return;
  }

  const secret = ensureCsrfSecret(req);
  const headerToken = req.get('x-csrf-token') ?? req.get('X-CSRF-Token');
  if (!headerToken || !tokens.verify(secret, headerToken)) {
    next(new AppError(403, 'Invalid or missing CSRF token'));
    return;
  }

  next();
}
