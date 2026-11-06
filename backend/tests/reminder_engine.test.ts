import { describe, it, expect, beforeEach } from 'vitest';
import {
  reminderService,
  inMemoryReminderJobs,
  inMemoryReminderLogs,
} from '../src/modules/reminders/reminder.service.js';
import { renderReminderMessage } from '../src/modules/reminders/reminder.templates.js';
import { resetInMemoryFeeStore, inMemoryFeeStore } from '../src/modules/fees/fee.repository.js';

describe('Automatic Reminder Engine & Cancellation Architecture', () => {
  beforeEach(() => {
    resetInMemoryFeeStore();
    inMemoryReminderJobs.clear();
    inMemoryReminderLogs.length = 0;
  });

  describe('Reminder Scheduling (T-7, T-3, T-0, T+3, T+7)', () => {
    it('generates standard 5-stage reminder schedule around due date', () => {
      const instalmentId = 'i0587000-0000-0000-0000-000000000001';
      const studentId = 's0587000-0000-0000-0000-000000000587';
      const dueDate = '2026-10-10';
      const amountPaise = 3000000n;

      const jobs = reminderService.generateSchedulesForInstalment({
        instalmentId,
        studentId,
        dueDate,
        amountPaise,
        channel: 'WHATSAPP',
        language: 'en',
      });

      expect(jobs).toHaveLength(5);

      const stages = jobs.map((j) => j.stage);
      expect(stages).toEqual(['T_MINUS_7', 'T_MINUS_3', 'T_ZERO', 'T_PLUS_3', 'T_PLUS_7']);

      const dateMap = Object.fromEntries(jobs.map((j) => [j.stage, j.scheduledFor]));
      expect(dateMap['T_MINUS_7']).toBe('2026-10-03');
      expect(dateMap['T_MINUS_3']).toBe('2026-10-07');
      expect(dateMap['T_ZERO']).toBe('2026-10-10');
      expect(dateMap['T_PLUS_3']).toBe('2026-10-13');
      expect(dateMap['T_PLUS_7']).toBe('2026-10-17');
    });

    it('prevents duplicate reminder job creation (deduplication idempotency)', () => {
      const instalmentId = 'i0587000-0000-0000-0000-000000000001';
      const studentId = 's0587000-0000-0000-0000-000000000587';
      const dueDate = '2026-10-10';

      const firstBatch = reminderService.generateSchedulesForInstalment({
        instalmentId,
        studentId,
        dueDate,
        amountPaise: 3000000n,
      });
      expect(firstBatch).toHaveLength(5);

      // Calling again must not duplicate existing pending jobs
      const secondBatch = reminderService.generateSchedulesForInstalment({
        instalmentId,
        studentId,
        dueDate,
        amountPaise: 3000000n,
      });
      expect(secondBatch).toHaveLength(0);
      expect(inMemoryReminderJobs.size).toBe(5);
    });
  });

  describe('Localized Message Templates (Hindi & English)', () => {
    it('renders accurate English reminder template with parameters', () => {
      const message = renderReminderMessage({
        studentName: 'Aarav Meena',
        studentRoll: 'STU-0412',
        instalmentNumber: 1,
        dueDate: '2026-10-10',
        outstandingAmountPaise: 3000000n,
        paymentLink: 'https://portal.companya.in/parent?student=STU-0412',
        stage: 'T_MINUS_7',
        language: 'en',
      });

      expect(message).toContain('Dear Parent');
      expect(message).toContain('Aarav Meena');
      expect(message).toContain('STU-0412');
      expect(message).toContain('₹30,000');
      expect(message).toContain('approaching its due date');
      expect(message).toContain('https://portal.companya.in/parent?student=STU-0412');
    });

    it('renders accurate Hindi reminder template with parameters', () => {
      const message = renderReminderMessage({
        studentName: 'इशिता शर्मा',
        studentRoll: 'STU-0587',
        instalmentNumber: 1,
        dueDate: '2026-10-10',
        outstandingAmountPaise: 1500000n,
        paymentLink: 'https://portal.companya.in/parent?student=STU-0587',
        stage: 'T_MINUS_3',
        language: 'hi',
      });

      expect(message).toContain('नमस्ते! आपके बच्चे');
      expect(message).toContain('इशिता शर्मा');
      expect(message).toContain('₹15,000');
      expect(message).toContain('भुगतान तिथि (2026-10-10) नजदीक है। कृपया समय पर भुगतान करें।');
      expect(message).toContain('भुगतान लिंक:');
    });
  });

  describe('Pre-flight Settlement Check & Automatic Cancellation', () => {
    it('cancels pending reminder jobs when full payment is verified', async () => {
      const instalmentId = 'i0412000-0000-0000-0000-000000000413'; // Aarav Meena Instalment 2
      const studentId = 's0412000-0000-0000-0000-000000000412';
      const dueDate = '2026-12-10';

      reminderService.generateSchedulesForInstalment({
        instalmentId,
        studentId,
        dueDate,
        amountPaise: 3000000n,
      });

      // Settle instalment fully
      const inst = inMemoryFeeStore.instalments.get(instalmentId)!;
      inst.settledAmountPaise = inst.netPayablePaise; // 30,000 settled

      const result = await reminderService.handlePaymentVerified({
        instalmentId,
        allocatedAmountPaise: 3000000n,
      });

      expect(result.cancelledJobsCount).toBe(5);

      const remainingPending = Array.from(inMemoryReminderJobs.values()).filter(
        (j) => j.instalmentId === instalmentId && j.status === 'PENDING'
      );
      expect(remainingPending).toHaveLength(0);
    });

    it('pre-flight check suppresses reminder if instalment became settled before cron trigger', async () => {
      const instalmentId = 'i0412000-0000-0000-0000-000000000413';
      const studentId = 's0412000-0000-0000-0000-000000000412';
      const dueDate = '2026-10-10';

      reminderService.generateSchedulesForInstalment({
        instalmentId,
        studentId,
        dueDate,
        amountPaise: 3000000n,
      });

      // Settle the instalment
      const inst = inMemoryFeeStore.instalments.get(instalmentId)!;
      inst.settledAmountPaise = inst.netPayablePaise;

      // Execute processor for due reminders
      const processResult = await reminderService.processDueReminders('2026-10-10');

      expect(processResult.dispatchedCount).toBe(0);
      expect(processResult.cancelledCount).toBeGreaterThan(0);
      expect(inMemoryReminderLogs).toHaveLength(0); // Zero messages dispatched
    });

    it('recalculates outstanding amount on future reminders when partial payment is verified', async () => {
      const instalmentId = 'i0587000-0000-0000-0000-000000000587'; // Ishita Sharma (₹30,000 base)
      const studentId = 's0587000-0000-0000-0000-000000000587';
      const dueDate = '2026-10-10';

      reminderService.generateSchedulesForInstalment({
        instalmentId,
        studentId,
        dueDate,
        amountPaise: 3000000n,
      });

      // Partial settlement: pay ₹15,000 (remaining ₹15,000)
      const inst = inMemoryFeeStore.instalments.get(instalmentId)!;
      inst.settledAmountPaise = 1500000n;

      const result = await reminderService.handlePaymentVerified({
        instalmentId,
        allocatedAmountPaise: 1500000n,
      });

      expect(result.recalculatedJobsCount).toBe(5);

      const jobs = Array.from(inMemoryReminderJobs.values()).filter(
        (j) => j.instalmentId === instalmentId
      );
      for (const job of jobs) {
        expect(job.amountPaise).toBe(1500000n); // Updated to 15,000
      }
    });
  });

  describe('Mock Message Provider Transparency', () => {
    it('dispatches mock reminder with explicit mock provider branding', async () => {
      const student = Array.from(inMemoryFeeStore.students.values())[1]; // Ishita Sharma
      const log = await reminderService.triggerManualReminder({
        studentId: student.id,
        channel: 'WHATSAPP',
        language: 'en',
      });

      expect(log.provider).toBe('MOCK_WHATSAPP_SMS');
      expect(log.status).toBe('DELIVERED_MOCK');
      expect(log.studentRoll).toBe(student.rollNumber);
      expect(log.messageBody).toContain('Ishita Sharma');
    });
  });
});
