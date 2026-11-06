import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response => {
  // 1. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return sendError(res, 'Request validation failed', 422, 'VALIDATION_ERROR', formattedIssues);
  }

  // 2. Custom Application Operational Errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`Operational Server Error: ${err.message}`, {
        code: err.code,
        path: req.path,
        method: req.method,
      });
    }

    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // 3. Express Body Parser Syntax Errors (e.g. malformed JSON)
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    return sendError(res, 'Malformed JSON payload in request body', 400, 'INVALID_JSON');
  }

  // 4. Uncaught / Unexpected Errors
  logger.error(`Unhandled Exception: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message,
    500,
    'INTERNAL_SERVER_ERROR'
  );
};

