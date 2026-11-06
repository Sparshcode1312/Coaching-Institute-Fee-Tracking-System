import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    const context = {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress,
    };

    if (statusCode >= 500) {
      logger.error(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, context);
    } else if (statusCode >= 400) {
      logger.warn(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, context);
    } else {
      logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, context);
    }
  });

  next();
};

