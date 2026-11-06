import { env } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = levels[env.LOG_LEVEL] ?? 1;

const formatLog = (level: LogLevel, message: string, context?: unknown) => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
};

export const logger = {
  debug: (message: string, context?: unknown) => {
    if (currentLevel <= levels.debug) {
      console.debug(formatLog('debug', message, context));
    }
  },
  info: (message: string, context?: unknown) => {
    if (currentLevel <= levels.info) {
      console.info(formatLog('info', message, context));
    }
  },
  warn: (message: string, context?: unknown) => {
    if (currentLevel <= levels.warn) {
      console.warn(formatLog('warn', message, context));
    }
  },
  error: (message: string, context?: unknown) => {
    if (currentLevel <= levels.error) {
      console.error(formatLog('error', message, context));
    }
  },
};

