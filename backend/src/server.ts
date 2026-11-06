import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { checkSupabaseConnection } from './config/supabase.js';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  logger.info(`================================================================`);
  logger.info(` Coaching Institute Fee Tracking System & Parent Portal Backend`);
  logger.info(` Target: Company A, Jaipur`);
  logger.info(` Environment: ${env.NODE_ENV} | Port: ${env.PORT}`);
  logger.info(` API Prefix: ${env.API_PREFIX}`);
  logger.info(`================================================================`);

  // Inspect database connectivity
  const dbHealth = await checkSupabaseConnection();
  if (dbHealth.connected) {
    logger.info(`✅ Supabase Database: Connected (${dbHealth.message})`);
  } else {
    logger.warn(`⚠️ Supabase Database: Not Connected (${dbHealth.message})`);
    if (!dbHealth.isConfigured) {
      logger.info(`ℹ️ Please update backend/.env with your real Supabase credentials to enable live database queries.`);
    }
  }
});

// Graceful Shutdown
const handleShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forceful shutdown triggered after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

