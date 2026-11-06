import crypto from 'crypto';
import { inMemoryFeeStore } from '../fees/fee.repository.js';
import { FeeCalculator } from '../fees/fee.calculator.js';
import { auditService } from '../audit/audit.service.js';
import { mockMessageProvider } from './reminder.provider.js';
import { renderReminderMessage } from './reminder.templates.js';
import {
  ReminderJob,
  ReminderLog,
  ReminderStage,
  ReminderChannel,
} from './reminder.types.js';

// In-Memory job and log stores
export const inMemoryReminderJobs: Map<string, ReminderJob> = new Map();
export const inMemoryReminderLogs: ReminderLog[] = [];

// Helper date calculator
function shiftDateDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0] || dateStr;
}

export class ReminderService {
  /**
   * Generates standard reminder schedule for a fee instalment (T-7, T-3, T-0, T+3, T+7)
   */
  generateSchedulesForInstalment(params: {
    instalmentId: string;
    studentId: string;
    dueDate: string;
    amountPaise: bigint;
    channel?: ReminderChannel;
    language?: 'en' | 'hi';
  }): ReminderJob[] {
    const channel = params.channel || 'WHATSAPP';
    const language = params.language || 'en';

    const stages: { stage: ReminderStage; daysOffset: number }[] = [
      { stage: 'T_MINUS_7', daysOffset: -7 },
      { stage: 'T_MINUS_3', daysOffset: -3 },
      { stage: 'T_ZERO', daysOffset: 0 },
      { stage: 'T_PLUS_3', daysOffset: 3 },
      { stage: 'T_PLUS_7', daysOffset: 7 },
    ];

    const createdJobs: ReminderJob[] = [];

    for (const item of stages) {
      // Deduplication check: prevent duplicate jobs for the same instalment and stage
      const existing = Array.from(inMemoryReminderJobs.values()).find(
        (j) => j.instalmentId === params.instalmentId && j.stage === item.stage && j.status !== 'CANCELLED'
      );
      if (existing) continue;

      const jobId = crypto.randomUUID();
      const scheduledFor = shiftDateDays(params.dueDate, item.daysOffset);

      const job: ReminderJob = {
        id: jobId,
        instalmentId: params.instalmentId,
        studentId: params.studentId,
        scheduledFor,
        stage: item.stage,
        status: 'PENDING',
        channel,
        language,
        amountPaise: params.amountPaise,
        dueDate: params.dueDate,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
      };

      inMemoryReminderJobs.set(jobId, job);
      createdJobs.push(job);

      auditService.log({
        action: 'REMINDER_JOB_CREATED',
        entityName: 'reminder_jobs',
        entityId: jobId,
        newState: {
          instalmentId: params.instalmentId,
          stage: item.stage,
          scheduledFor,
        },
      });
    }

    return createdJobs;
  }

  /**
   * Background processor: executes reminders due on or before currentDateStr
   */
  async processDueReminders(currentDateStr: string): Promise<{
    processedCount: number;
    dispatchedCount: number;
    cancelledCount: number;
    failedCount: number;
  }> {
    let dispatched = 0;
    let cancelled = 0;
    let failed = 0;

    const dueJobs = Array.from(inMemoryReminderJobs.values()).filter(
      (j) => j.scheduledFor <= currentDateStr && (j.status === 'PENDING' || j.status === 'QUEUED')
    );

    for (const job of dueJobs) {
      // 1. PRE-FLIGHT CHECK: Recheck live instalment status immediately before sending
      const instalment = inMemoryFeeStore.instalments.get(job.instalmentId);
      if (!instalment) {
        job.status = 'FAILED';
        job.failureReason = 'Target instalment no longer exists.';
        failed++;
        continue;
      }

      const outstandingPaise = FeeCalculator.calculateInstalmentOutstanding(
        instalment.netPayablePaise,
        instalment.settledAmountPaise
      );

      // If already settled, CANCEL job and do NOT send reminder
      if (outstandingPaise <= 0n) {
        job.status = 'CANCELLED';
        cancelled++;

        auditService.log({
          action: 'REMINDER_CANCELLED',
          entityName: 'reminder_jobs',
          entityId: job.id,
          newState: {
            reason: 'PRE_FLIGHT_CHECK_SETTLED',
            outstandingPaise: '0',
          },
        });
        continue;
      }

      // If partially settled, update job amount to current live outstanding balance
      job.amountPaise = outstandingPaise;

      const student = inMemoryFeeStore.students.get(job.studentId);
      if (!student) {
        job.status = 'FAILED';
        job.failureReason = 'Student profile not found.';
        failed++;
        continue;
      }

      // Render localized message
      const paymentLink = `https://portal.companya.in/parent?student=${student.rollNumber}`;
      const messageBody = renderReminderMessage({
        studentName: student.fullName,
        studentRoll: student.rollNumber,
        instalmentNumber: instalment.instalmentNumber,
        dueDate: instalment.dueDate,
        outstandingAmountPaise: outstandingPaise,
        paymentLink,
        stage: job.stage,
        language: job.language,
      });

      // Dispatch via message provider
      job.status = 'PROCESSING';
      job.lastAttemptAt = new Date().toISOString();
      const parentPhone = student.parentPhone || `982901${student.rollNumber.replace('STU-', '')}`;

      const result = await mockMessageProvider.send({
        recipientPhone: parentPhone,
        channel: job.channel,
        messageBody,
        studentRoll: student.rollNumber,
      });

      if (result.success) {
        job.status = 'COMPLETED';
        dispatched++;

        // Append to immutable reminder logs
        const logId = crypto.randomUUID();
        const logEntry: ReminderLog = {
          id: logId,
          jobId: job.id,
          studentId: student.id,
          studentRoll: student.rollNumber,
          studentName: student.fullName,
          recipientPhone: parentPhone,
          channel: job.channel,
          stage: job.stage,
          language: job.language,
          outstandingAmountPaise: outstandingPaise,
          dueDate: instalment.dueDate,
          paymentLink,
          messageBody,
          status: 'DELIVERED_MOCK',
          provider: result.provider,
          dispatchedAt: result.dispatchedAt,
        };
        inMemoryReminderLogs.push(logEntry);

        auditService.log({
          action: 'REMINDER_DISPATCHED',
          entityName: 'reminder_logs',
          entityId: logId,
          newState: {
            studentRoll: student.rollNumber,
            stage: job.stage,
            channel: job.channel,
            amountPaise: outstandingPaise.toString(),
          },
        });
      } else {
        job.retryCount++;
        job.failureReason = result.errorReason || 'GATEWAY_ERROR';

        if (job.retryCount >= job.maxRetries) {
          job.status = 'FAILED';
          failed++;
        } else {
          job.status = 'PENDING'; // Backoff for subsequent cycle
        }
      }
    }

    return {
      processedCount: dueJobs.length,
      dispatchedCount: dispatched,
      cancelledCount: cancelled,
      failedCount: failed,
    };
  }

  /**
   * CRITICAL WORKFLOW: Called immediately upon payment verification
   * Cancels obsolete jobs if settled; updates remaining balances if partial payment.
   */
  async handlePaymentVerified(params: {
    instalmentId: string;
    allocatedAmountPaise: bigint;
  }): Promise<{
    cancelledJobsCount: number;
    recalculatedJobsCount: number;
  }> {
    const instalment = inMemoryFeeStore.instalments.get(params.instalmentId);
    if (!instalment) return { cancelledJobsCount: 0, recalculatedJobsCount: 0 };

    const remainingOutstanding = FeeCalculator.calculateInstalmentOutstanding(
      instalment.netPayablePaise,
      instalment.settledAmountPaise
    );

    let cancelledJobsCount = 0;
    let recalculatedJobsCount = 0;

    const pendingJobs = Array.from(inMemoryReminderJobs.values()).filter(
      (j) => j.instalmentId === params.instalmentId && (j.status === 'PENDING' || j.status === 'QUEUED')
    );

    for (const job of pendingJobs) {
      if (remainingOutstanding <= 0n) {
        // Full payment: Cancel all upcoming reminders
        job.status = 'CANCELLED';
        cancelledJobsCount++;

        auditService.log({
          action: 'REMINDER_CANCELLED',
          entityName: 'reminder_jobs',
          entityId: job.id,
          newState: {
            reason: 'PAYMENT_VERIFIED_SETTLED',
            allocatedAmountPaise: params.allocatedAmountPaise.toString(),
          },
        });
      } else {
        // Partial payment: Recalculate outstanding amount for future reminders
        job.amountPaise = remainingOutstanding;
        recalculatedJobsCount++;

        auditService.log({
          action: 'REMINDER_RECALCULATED',
          entityName: 'reminder_jobs',
          entityId: job.id,
          newState: {
            reason: 'PARTIAL_PAYMENT_APPLIED',
            newRemainingPaise: remainingOutstanding.toString(),
          },
        });
      }
    }

    return { cancelledJobsCount, recalculatedJobsCount };
  }

  /**
   * Staff manual reminder trigger
   */
  async triggerManualReminder(params: {
    studentId: string;
    instalmentId?: string;
    channel?: ReminderChannel;
    language?: 'en' | 'hi';
  }): Promise<ReminderLog> {
    const student = inMemoryFeeStore.students.get(params.studentId);
    if (!student) throw new Error('Student not found.');

    const instalments = Array.from(inMemoryFeeStore.instalments.values()).filter(
      (i) => i.studentId === student.id && i.settledAmountPaise < i.netPayablePaise
    );

    const targetInstalment = params.instalmentId
      ? inMemoryFeeStore.instalments.get(params.instalmentId)
      : instalments[0];

    if (!targetInstalment) {
      throw new Error('No outstanding instalment found for reminder dispatch.');
    }

    const outstandingAmountPaise = targetInstalment.netPayablePaise - targetInstalment.settledAmountPaise;
    const channel = params.channel || 'WHATSAPP';
    const language = params.language || 'en';
    const paymentLink = `https://portal.companya.in/parent?student=${student.rollNumber}`;
    const parentPhone = student.parentPhone || `982901${student.rollNumber.replace('STU-', '')}`;

    const messageBody = renderReminderMessage({
      studentName: student.fullName,
      studentRoll: student.rollNumber,
      instalmentNumber: targetInstalment.instalmentNumber,
      dueDate: targetInstalment.dueDate,
      outstandingAmountPaise,
      paymentLink,
      stage: 'T_ZERO',
      language,
    });

    const result = await mockMessageProvider.send({
      recipientPhone: parentPhone,
      channel,
      messageBody,
      studentRoll: student.rollNumber,
    });

    const logId = crypto.randomUUID();
    const logEntry: ReminderLog = {
      id: logId,
      jobId: null,
      studentId: student.id,
      studentRoll: student.rollNumber,
      studentName: student.fullName,
      recipientPhone: parentPhone,
      channel,
      stage: 'T_ZERO',
      language,
      outstandingAmountPaise,
      dueDate: targetInstalment.dueDate,
      paymentLink,
      messageBody,
      status: result.success ? 'DELIVERED_MOCK' : 'FAILED',
      provider: result.provider,
      dispatchedAt: result.dispatchedAt,
    };

    inMemoryReminderLogs.push(logEntry);

    auditService.log({
      action: 'REMINDER_DISPATCHED',
      entityName: 'reminder_logs',
      entityId: logId,
      newState: {
        studentRoll: student.rollNumber,
        channel,
        manual: true,
      },
    });

    return logEntry;
  }

  getLogs(): ReminderLog[] {
    return [...inMemoryReminderLogs].reverse();
  }
}

export const reminderService = new ReminderService();
