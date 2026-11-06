import { Response } from 'express';
import { ApiResponse, ApiErrorResponse } from '../types/index.js';

function serializeBigInts(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map(serializeBigInts);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      res[k] = serializeBigInts(v);
    }
    return res;
  }
  return value;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponse<T>['meta']
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    data: serializeBigInts(data) as T,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(payload);
};

export const sendCreated = <T>(res: Response, data: T, meta?: ApiResponse<T>['meta']): Response => {
  return sendSuccess(res, data, 201, meta);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  details?: unknown
): Response => {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return res.status(statusCode).json(payload);
};

