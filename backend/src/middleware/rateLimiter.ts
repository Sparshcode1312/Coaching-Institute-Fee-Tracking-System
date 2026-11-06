import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../utils/errors.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 600000);

export const createRateLimiter = (options?: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
}) => {
  const windowMs = options?.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? env.RATE_LIMIT_MAX_AUTH_ATTEMPTS;
  const keyGen = options?.keyGenerator ?? ((req: Request) => req.ip || req.socket.remoteAddress || 'unknown');

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = keyGen(req);
    const now = Date.now();
    const existing = rateLimitStore.get(key);

    if (!existing || now > existing.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (existing.count >= maxRequests) {
      const waitMinutes = Math.ceil((existing.resetTime - now) / 60000);
      throw new TooManyRequestsError(
        `Too many requests from this IP. Please wait ${waitMinutes} minute(s) before trying again.`
      );
    }

    existing.count += 1;
    next();
  };
};

/**
 * Strict limiter for OTP generation to prevent SMS abuse and brute-force attacks.
 * Max 5 requests per 15 minutes per phone/IP.
 */
export const otpRequestLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_AUTH_ATTEMPTS,
  keyGenerator: (req: Request) => {
    const phone = req.body && typeof req.body.phone === 'string' ? req.body.phone : '';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `otp:${phone}:${ip}`;
  },
});

