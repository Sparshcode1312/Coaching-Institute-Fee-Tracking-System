import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetInMemoryFeeStore } from '../src/modules/fees/fee.repository.js';

describe('Fee Ledger API (GET /api/fees/ledger/:studentId)', () => {
  const app = createApp();
  const authHeader = 'Bearer test-token-parent-9829010412';
  const staffAuthHeader = 'Bearer test-token-accounts-admin';

  beforeEach(() => {
    resetInMemoryFeeStore();
  });

  it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/fees/ledger/STU-0412');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 NOT_FOUND for non-existent student roll number', async () => {
    const res = await request(app)
      .get('/api/fees/ledger/STU-9999')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  describe('Student 1: STU-0412 (Aarav Meena) Fee Ledger', () => {
    it('returns authoritative fee ledger with ₹30,000 paid and ₹90,000 balance', async () => {
      const res = await request(app)
        .get('/api/fees/ledger/STU-0412')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.student.rollNumber).toBe('STU-0412');
      expect(data.student.fullName).toBe('Aarav Meena');
      expect(data.student.batch.name).toBe('JEE 2027 Morning');
      expect(data.student.centre.name).toBe('Jaipur Centre 1');

      // Financials in integer paise
      expect(data.financials.originalFeePaise).toBe(12000000); // ₹1,20,000
      expect(data.financials.discountsPaise).toBe(0);
      expect(data.financials.finalPayableAmountPaise).toBe(12000000);
      expect(data.financials.totalAmountPaidPaise).toBe(3000000); // ₹30,000
      expect(data.financials.outstandingBalancePaise).toBe(9000000); // ₹90,000

      // Instalments inspection (4 milestones of ₹30,000)
      expect(data.instalments.length).toBe(4);
      const inst1 = data.instalments[0];
      expect(inst1.instalmentNumber).toBe(1);
      expect(inst1.netPayablePaise).toBe(3000000);
      expect(inst1.allocatedAmountPaise).toBe(3000000);
      expect(inst1.outstandingPaise).toBe(0);
      expect(inst1.paymentStatus).toBe('PAID');
      expect(inst1.dueStatus).toBe('SETTLED');

      const inst2 = data.instalments[1];
      expect(inst2.instalmentNumber).toBe(2);
      expect(inst2.outstandingPaise).toBe(3000000);
      expect(inst2.paymentStatus).toBe('UNPAID');
      expect(inst2.dueStatus).toBe('UPCOMING');

      // Payment History & Receipt
      expect(data.paymentHistory.length).toBe(1);
      const payment1 = data.paymentHistory[0];
      expect(payment1.amountPaise).toBe(3000000);
      expect(payment1.status).toBe('SUCCESS');
      expect(payment1.receipt).toBeDefined();
      expect(payment1.receipt.receiptNumber).toBe('REC-2026-C1-000412');
      expect(payment1.receipt.verificationHash).toBeDefined();
    });
  });

  describe('Student 2: STU-0587 (Ishita Sharma) Fee Ledger', () => {
    it('returns authoritative ledger with ₹15,000 paid and ₹15,000 overdue', async () => {
      const res = await request(app)
        .get('/api/fees/ledger/STU-0587')
        .set('Authorization', staffAuthHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.student.rollNumber).toBe('STU-0587');
      expect(data.student.fullName).toBe('Ishita Sharma');
      expect(data.student.batch.name).toBe('JEE 2027 Evening');

      expect(data.financials.totalAmountPaidPaise).toBe(1500000); // ₹15,000
      expect(data.financials.outstandingBalancePaise).toBe(10500000); // ₹1,05,000 total

      const inst1 = data.instalments[0];
      expect(inst1.instalmentNumber).toBe(1);
      expect(inst1.netPayablePaise).toBe(3000000);
      expect(inst1.allocatedAmountPaise).toBe(1500000);
      expect(inst1.outstandingPaise).toBe(1500000);
      expect(inst1.paymentStatus).toBe('PARTIALLY_PAID');
      expect(inst1.dueStatus).toBe('OVERDUE');
      expect(inst1.overdueDays).toBeGreaterThan(0);
    });
  });

  describe('Student 3: STU-0219 (Mohit Gurjar) Fee Ledger', () => {
    it('returns authoritative ledger with ₹0 paid and ₹40,000 due', async () => {
      const res = await request(app)
        .get('/api/fees/ledger/STU-0219')
        .set('Authorization', staffAuthHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.student.rollNumber).toBe('STU-0219');
      expect(data.student.fullName).toBe('Mohit Gurjar');
      expect(data.student.batch.name).toBe('NEET 2027 Morning');

      expect(data.financials.totalAmountPaidPaise).toBe(0);
      expect(data.financials.outstandingBalancePaise).toBe(12000000);

      // 3 instalments of ₹40,000
      expect(data.instalments.length).toBe(3);
      const inst1 = data.instalments[0];
      expect(inst1.instalmentNumber).toBe(1);
      expect(inst1.netPayablePaise).toBe(4000000); // ₹40,000
      expect(inst1.allocatedAmountPaise).toBe(0);
      expect(inst1.outstandingPaise).toBe(4000000);
      expect(inst1.paymentStatus).toBe('UNPAID');
      expect(inst1.dueDate).toBe('2026-11-15');
    });
  });

  it('supports canonical path /api/v1/fees/ledger/:studentId', async () => {
    const res = await request(app)
      .get('/api/v1/fees/ledger/STU-0412')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.student.rollNumber).toBe('STU-0412');
  });
});
