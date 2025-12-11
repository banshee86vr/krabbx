import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Express error handler caught error', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.issues,
    });
  }

  // GitHub API errors
  if (err.message.includes('Bad credentials')) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid GitHub token',
    });
  }

  if (err.message.includes('rate limit')) {
    return res.status(429).json({
      status: 'error',
      message: 'GitHub API rate limit exceeded. Please try again later.',
    });
  }

  // Default error
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};
