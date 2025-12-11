import { Request, Response, NextFunction } from 'express';

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

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }
  next();
}

// Middleware to optionally check auth (doesn't block, just adds user to request)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // User info is already in session if authenticated
  next();
}

// Type augmentation for Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        login: string;
        name: string;
        email: string;
        avatar_url: string;
        accessToken: string;
      };
    }
  }
}

// Middleware to add user from session to request
export function addUserToRequest(req: Request, res: Response, next: NextFunction) {
  if (req.session.user) {
    req.user = req.session.user;
  }
  next();
}

