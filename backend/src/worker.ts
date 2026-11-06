import { reminderService } from './modules/reminders/reminder.service.js';
import { getTodayKolkata } from './utils/date.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';

logger.info('================================================================');
logger.info(' Coaching Institute Fee Tracking - Standalone Reminder Worker');
logger.info(` Environment: ${env.NODE_ENV} | Timezone: Asia/Kolkata`);
logger.info('================================================================');

let isProcessing = false;

async function runReminderCycle(): Promise<void> {
  if (isProcessing) {
    logger.debug('[WORKER] Previous reminder cycle still in progress. Skipping cycle.');
    return;
  }

  isProcessing = true;
  const todayKolkata = getTodayKolkata();

  try {
    logger.info(`[WORKER] Starting reminder cycle for date: ${todayKolkata}`);
    const summary = await reminderService.processDueReminders(todayKolkata);

    logger.info(`[WORKER] Cycle complete: ${summary.processedCount} evaluated, ${summary.dispatchedCount} dispatched, ${summary.cancelledCount} suppressed/cancelled, ${summary.failedCount} failed.`);
  } catch (error) {
    logger.error('[WORKER] Unexpected error during reminder processing cycle', { error });
  } finally {
    isProcessing = false;
  }
}

// Initial cycle on startup
runReminderCycle();

// Default 1 hour interval (3600000 ms), or 15 seconds in dev/test
const pollIntervalMs = env.NODE_ENV === 'production' ? 3600000 : 15000;
const intervalHandle = setInterval(runReminderCycle, pollIntervalMs);

logger.info(`[WORKER] Reminder worker running on ${pollIntervalMs}ms interval.`);

// Graceful shutdown
const handleShutdown = (signal: string) => {
  logger.info(`[WORKER] Received ${signal}. Shutting down worker gracefully...`);
  clearInterval(intervalHandle);
  process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

