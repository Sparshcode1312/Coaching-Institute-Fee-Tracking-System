import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';
import { checkSupabaseConnection } from './config/supabase.js';
import authRoutes from './modules/auth/auth.routes.js';
import feeRoutes from './modules/fees/fee.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';
import academicRoutes from './modules/academic/academic.routes.js';
import { NotFoundError } from './utils/errors.js';

export const createApp = (): Express => {
  const app = express();

  // 1. Security & Core Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Razorpay-Signature', 'X-Mock-Signature'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestLogger);

  // 2. Health Check Endpoints
  const healthHandler = async (_req: Request, res: Response) => {
    const dbStatus = await checkSupabaseConnection();

    sendSuccess(res, {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: {
        isConfigured: dbStatus.isConfigured,
        connected: dbStatus.connected,
        message: dbStatus.message,
      },
      version: '1.0.0',
    });
  };

  app.get('/health', healthHandler);
  app.get(`${env.API_PREFIX}/health`, healthHandler);

  // 3. API Routes
  app.use(`${env.API_PREFIX}/auth`, authRoutes);

  // Fee Ledger Routes (Mount under both /api/v1/fees and /api/fees for exact spec compliance)
  app.use(`${env.API_PREFIX}/fees`, feeRoutes);
  app.use('/api/fees', feeRoutes);

  // Payment Processing Routes
  app.use(`${env.API_PREFIX}/payments`, paymentRoutes);
  app.use('/api/payments', paymentRoutes);

  // Accounts Operations & Command Centre Routes
  app.use(`${env.API_PREFIX}/accounts`, accountsRoutes);

  // Academic Modules (Attendance & Mock Test Results)
  app.use(`${env.API_PREFIX}/academic`, academicRoutes);
  app.use(`${env.API_PREFIX}/parent`, academicRoutes);

  // 4. Catch-all for undefined routes
  app.all('*', (req: Request) => {
    throw new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} not found`);
  });

  // 5. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
