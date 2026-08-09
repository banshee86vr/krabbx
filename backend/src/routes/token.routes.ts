import { createHash, randomBytes } from 'node:crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';

import { AppError } from '../middleware/errorHandler.js';
import { getStorage } from '../storage/index.js';

const router = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.enum(['read', 'write'])).optional(),
});

function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

function normalizeScopes(scopes?: Array<'read' | 'write'>): string[] {
  if (!scopes || scopes.length === 0) {
    return ['read', 'write'];
  }
  const set = new Set<string>(scopes);
  set.add('read');
  return Array.from(set);
}

function generatePlaintext(): string {
  return `krabbx_${randomBytes(32).toString('hex')}`;
}

function requireSessionUser(req: Request): {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  accessToken: string;
} {
  if (!req.user) {
    throw new AppError(401, 'Authentication required');
  }
  return req.user;
}

// GET /api/tokens
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireSessionUser(req);
    const storage = getStorage();
    const tokens = await storage.listApiTokens(user.id);
    res.json({ data: tokens });
  } catch (error) {
    next(error);
  }
});

// POST /api/tokens
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireSessionUser(req);
    const body = createSchema.parse(req.body);
    const plaintext = generatePlaintext();
    const scopes = normalizeScopes(body.scopes);
    const storage = getStorage();
    const created = await storage.createApiToken({
      githubUserId: user.id,
      login: user.login,
      name: body.name,
      tokenPrefix: plaintext.slice(0, 12),
      tokenHash: hashToken(plaintext),
      scopes,
    });

    res.status(201).json({
      id: created.id,
      githubUserId: created.githubUserId,
      login: created.login,
      name: created.name,
      tokenPrefix: created.tokenPrefix,
      scopes: created.scopes,
      createdAt: created.createdAt,
      lastUsedAt: created.lastUsedAt,
      revokedAt: created.revokedAt,
      token: plaintext,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tokens/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireSessionUser(req);
    const id = req.params.id as string;
    const storage = getStorage();
    const ok = await storage.revokeApiToken(user.id, id);
    if (!ok) {
      throw new AppError(404, 'Token not found');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as tokenRoutes, hashToken };
