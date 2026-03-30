import type { NextFunction, Request, Response } from 'express';
import { describe, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z, ZodError } from 'zod';

import { logger } from '../src/lib/logger.js';
import { AppError, errorHandler } from '../src/middleware/errorHandler.js';

function createResponseMock() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });

  return {
    response: { status } as unknown as Response,
    status,
    json,
  };
}

function createZodError() {
  try {
    z.object({
      name: z.string(),
    }).parse({});
  } catch (error) {
    return error as ZodError;
  }

  throw new Error('Expected schema parsing to fail');
}

describe('errorHandler', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns the status code and message for AppError instances', () => {
    const { response, status, json } = createResponseMock();

    errorHandler(
      new AppError(404, 'Repository not found'),
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Repository not found',
    });
  });

  it('returns validation details for Zod errors', () => {
    const { response, status, json } = createResponseMock();
    const error = createZodError();

    errorHandler(
      error,
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Validation error',
      errors: error.errors,
    });
  });

  it('maps GitHub bad credential errors to 401', () => {
    const { response, status, json } = createResponseMock();

    errorHandler(
      new Error('Bad credentials'),
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Invalid GitHub token',
    });
  });

  it('maps GitHub rate limit errors to 429', () => {
    const { response, status, json } = createResponseMock();

    errorHandler(
      new Error('GitHub rate limit exceeded'),
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction
    );

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'GitHub API rate limit exceeded. Please try again later.',
    });
  });

  it('hides internal error details in production', () => {
    const { response, status, json } = createResponseMock();
    process.env.NODE_ENV = 'production';

    errorHandler(
      new Error('database exploded'),
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal server error',
    });
  });

  it('returns the original error message outside production', () => {
    const { response, status, json } = createResponseMock();

    errorHandler(
      new Error('database exploded'),
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'database exploded',
    });
  });
});
