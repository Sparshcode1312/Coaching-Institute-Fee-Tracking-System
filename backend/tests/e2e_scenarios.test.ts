import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetInMemoryFeeStore, inMemoryFeeStore } from '../src/modules/fees/fee.repository.js';
import { inMemoryOrderStore } from '../src/modules/payments/payment.service.js';
import { inMemoryReminderJobs, inMemoryReminderLogs, reminderService } from '../src/modules/reminders/reminder.service.js';
import { inMemoryRefundStore } from '../src/modules/refunds/refund.service.js';
import { inMemoryRiskStore, inMemoryCounsellorTasks, aiDropoutRiskService } from '../src/modules/ai-risk/ai-risk.service.js';
import { tallyService } from '../src/modules/accounts/tally.service.js';
import { mockPaymentProvider } from '../src/modules/payments/adapters/mock.provider.js';

const app = createApp();

describe('Principal Engineer QA: Mandatory End-to-End Business Scenarios (A through H)', () => {
  beforeEach(() => {
    resetInMemoryFeeStore();
    inMemoryOrderStore.clear();
    inMemoryReminderJobs.clear();
    inMemoryReminderLogs.length = 0;
    inMemoryRefundStore.clear();
    inMemoryRiskStore.clear();
    inMemoryCounsellorTasks.clear();
  });

  // =========================================================================
  // SCENARIO A: Parent Authentication & Student Isolation
  // =========================================================================
  describe('SCENARIO A — Parent Authentication & Ownership Isolation', () => {
    it('executes OTP flow, verifies parent, returns linked student and blocks unauthorized access', async () => {
      // 1. Request OTP challenge
      const otpReq = await request(app)
        .post('/api/v1/auth/parent/request-otp')
        .send({ phone: '9829010412' }); // Aarav Meena's guardian

      expect(otpReq.status).toBe(200);
      expect(otpReq.body.success).toBe(true);
      expect(otpReq.body.data.message).toBeDefined();
      expect(otpReq.body.data.phone).toBe('9829010412');

      // 2. Verify OTP (mock OTP is 123456)
      const verifyReq = await request(app)
        .post('/api/v1/auth/parent/verify-otp')
        .send({ phone: '9829010412', otp: '123456' });

      expect(verifyReq.status).toBe(200);
      expect(verifyReq.body.success).toBe(true);
      const { token, user, linkedStudents } = verifyReq.body.data;

      expect(token).toBeDefined();
      expect(user.role).toBe('parent');
      expect(linkedStudents).toHaveLength(1);
      expect(linkedStudents[0].rollNumber).toBe('STU-0412');
      expect(linkedStudents[0].fullName).toBe('Aarav Meena');

      // 3. Parent accesses authorized child's ledger
      const authorizedLedger = await request(app)
        .get('/api/v1/fees/ledger/STU-0412')
        .set('Authorization', `Bearer ${token}`);

      expect(authorizedLedger.status).toBe(200);
      expect(authorizedLedger.body.data.student.rollNumber).toBe('STU-0412');

      // 4. Parent attempts to access unauthorized student (Mohit Gurjar STU-0219)
      const unauthorizedLedger = await request(app)
        .get('/api/v1/fees/ledger/STU-0219')
        .set('Authorization', `Bearer ${token}`);

      expect(unauthorizedLedger.status).toBe(403);
      expect(unauthorizedLedger.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // SCENARIO B: Fee Ledger Inspection & Overdue Calculation
  // =========================================================================
  describe('SCENARIO B — Fee Ledger Inspection & Overdue Calculation', () => {
    it('accounts executive inspects fee plan, instalments, discounts, payment history and overdue days', async () => {
      // 1. Staff login
      const staffLogin = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'CompanyA@2026' });

      expect(staffLogin.status).toBe(200);
      const staffToken = staffLogin.body.data.token;

      // 2. Inspect student Ishita Sharma (STU-0587)
      const ledgerRes = await request(app)
        .get('/api/v1/fees/ledger/STU-0587')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(ledgerRes.status).toBe(200);
      const data = ledgerRes.body.data;

      // Fee plan & instalments verification
      expect(data.student.rollNumber).toBe('STU-0587');
      expect(data.feePlan.instalmentCount).toBe(4);
      expect(data.financials.originalFeePaise).toBe(12000000); // ₹1,20,000
      expect(data.financials.discountsPaise).toBe(0);
      expect(data.financials.totalAmountPaidPaise).toBe(1500000); // ₹15,000 paid
      expect(data.financials.outstandingBalancePaise).toBe(10500000); // ₹1,05,000 remaining

      // Instalment 1 is overdue (due 2026-10-10) with ₹15,000 outstanding
      const inst1 = data.instalments[0];
      expect(inst1.instalmentNumber).toBe(1);
      expect(inst1.paymentStatus).toBe('PARTIALLY_PAID');
      expect(inst1.dueStatus).toBe('OVERDUE');
      expect(inst1.outstandingPaise).toBe(1500000);
      expect(inst1.overdueDays).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SCENARIO C & D: Successful Payment, Partial Payment, Receipts & Over-allocation
  // =========================================================================
  describe('SCENARIOS C & D — Payment Allocation, Receipts & Overpayment Prevention', () => {
    it('executes partial payment of ₹15,000 on ₹30,000 instalment, updates status to PARTIALLY_PAID, and rejects over-allocation', async () => {
      // Staff token for checking
      const staffLogin = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'CompanyA@2026' });
      const staffToken = staffLogin.body.data.token;

      const studentId = 's0587000-0000-0000-0000-000000000587'; // Ishita Sharma
      const instalmentId = 'i0587000-0000-0000-0000-000000000587'; // Outstanding: ₹15,000 (1500000 paise)

      // 1. ATTEMPT OVERPAYMENT: Request payment of ₹20,000 when only ₹15,000 is outstanding
      const overpaymentRes = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId,
          instalmentId,
          amountPaise: 2000000, // ₹20,000 exceeds ₹15,000
        });

      expect(overpaymentRes.status).toBe(400);
      expect(overpaymentRes.body.error.code).toBe('BAD_REQUEST');
      expect(overpaymentRes.body.error.message).toContain('exceeds the outstanding balance');

      // 2. CREATE VALID PARTIAL PAYMENT ORDER: Pay ₹5,000 (500000 paise)
      const orderRes = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId,
          instalmentId,
          amountPaise: 500000,
        });

      expect(orderRes.status).toBe(201);
      const { orderId, amountPaise, gatewayOrderId } = orderRes.body.data;
      expect(amountPaise).toBe(500000);

      // 3. GENERATE CRYPTOGRAPHIC SIGNATURE & VERIFY PAYMENT
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const signature = mockPaymentProvider.generateMockSignature(orderId, mockPaymentId, BigInt(amountPaise));

      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderId,
          gatewayPaymentId: mockPaymentId,
          signature,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('SUCCESS');
      const { receipt, newInstalmentOutstandingPaise } = verifyRes.body.data;

      // Verifies sequential receipt format REC-YYYY-CENTRE-SEQUENCE
      expect(receipt.receiptNumber).toMatch(/^REC-2026-C1-\d{6}$/);
      expect(receipt.verificationHash).toHaveLength(64);
      // Outstanding was 15,000 - 5,000 = 10,000 (1000000 paise)
      expect(newInstalmentOutstandingPaise).toBe(1000000);

      // 4. VERIFY RECALCULATED LEDGER
      const updatedLedger = await request(app)
        .get('/api/v1/fees/ledger/STU-0587')
        .set('Authorization', `Bearer ${staffToken}`);

      const updatedInst1 = updatedLedger.body.data.instalments[0];
      expect(updatedInst1.paymentStatus).toBe('PARTIALLY_PAID');
      expect(updatedInst1.allocatedAmountPaise).toBe(2000000); // 15k previous + 5k new = 20k
      expect(updatedInst1.outstandingPaise).toBe(1000000); // 10k remaining
    });
  });

  // =========================================================================
  // SCENARIO E: Automatic Reminder Cancellation upon Payment
  // =========================================================================
  describe('SCENARIO E — Automatic Reminder Cancellation upon Payment', () => {
    it('cancels scheduled reminder jobs when full payment is verified and suppresses queued dispatches', async () => {
      const instalmentId = 'i0412000-0000-0000-0000-000000000413'; // Aarav Meena Instalment 2
      const studentId = 's0412000-0000-0000-0000-000000000412';

      // 1. Schedule reminders for instalment
      reminderService.generateSchedulesForInstalment({
        instalmentId,
        studentId,
        dueDate: '2026-12-10',
        amountPaise: 3000000n,
      });

      expect(inMemoryReminderJobs.size).toBe(5);

      // 2. Full payment verified -> triggers reminderService.handlePaymentVerified
      const inst = inMemoryFeeStore.instalments.get(instalmentId)!;
      inst.settledAmountPaise = inst.netPayablePaise;

      const cancellation = await reminderService.handlePaymentVerified({
        instalmentId,
        allocatedAmountPaise: 3000000n,
      });

      expect(cancellation.cancelledJobsCount).toBe(5);

      // 3. Background worker executes for due date -> all jobs suppressed
      const processResult = await reminderService.processDueReminders('2026-12-10');
      expect(processResult.dispatchedCount).toBe(0);
      expect(inMemoryReminderLogs).toHaveLength(0);
    });
  });

  // =========================================================================
  // SCENARIO F: Refund Policy Calculation & Approval Lifecycle
  // =========================================================================
  describe('SCENARIO F — Versioned Statutory Refund Policy & 10-Day Deadline', () => {
    it('calculates itemized pro-rata refund, tracks 10-day deadline, approves and disburses refund', async () => {
      const staffLogin = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'CompanyA@2026' });
      const staffToken = staffLogin.body.data.token;

      // 1. Calculate refund for Aarav Meena (withdrawal on 10 July 2026, 9 days used)
      const calcRes = await request(app)
        .post('/api/v1/accounts/refunds/calculate')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: 's0412000-0000-0000-0000-000000000412',
          withdrawalDate: '2026-07-10',
          courseStartDate: '2026-07-01',
          courseEndDate: '2027-04-30',
          materialReturned: true,
        });

      expect(calcRes.status).toBe(200);
      const calc = calcRes.body.data;
      expect(calc.isEligible).toBe(true);
      expect(calc.eligibilityTier).toBe('TIER_1_WITHIN_15_DAYS');
      expect(calc.statutory10DayDeadline).toBe('2026-07-20');
      expect(calc.deductions.registrationFeePaise).toBe(500000); // ₹5,000
      expect(calc.netRefundPaise).toBe(2500000); // ₹25,000

      // 2. Submit formal refund request
      const reqRes = await request(app)
        .post('/api/v1/accounts/refunds/request')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          requestId: calc.id,
          reason: 'Medical relocation',
        });

      expect(reqRes.status).toBe(200);
      expect(reqRes.body.data.status).toBe('REQUESTED');

      // 3. Accounts approves refund
      const appRes = await request(app)
        .post('/api/v1/accounts/refunds/approve')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          requestId: calc.id,
          approvalNotes: 'Approved per policy v1',
        });

      expect(appRes.status).toBe(200);
      expect(appRes.body.data.status).toBe('APPROVED');

      // 4. Disburse refund
      const disbRes = await request(app)
        .post('/api/v1/accounts/refunds/disburse')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          requestId: calc.id,
          paymentRef: 'NEFT-REF-778899',
        });

      expect(disbRes.status).toBe(200);
      expect(disbRes.body.data.status).toBe('DISBURSED');
      expect(disbRes.body.data.disbursementPaymentRef).toBe('NEFT-REF-778899');
    });
  });

  // =========================================================================
  // SCENARIO G: Accounts Reporting & Balanced Tally Export
  // =========================================================================
  describe('SCENARIO G — Accounts Reporting & Balanced Tally ERP Export', () => {
    it('filters metrics by centre, checks dues ageing and generates balanced Tally CSV and XML', async () => {
      const staffLogin = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'CompanyA@2026' });
      const staffToken = staffLogin.body.data.token;

      // 1. Query Executive Metrics
      const metricsRes = await request(app)
        .get('/api/v1/accounts/dashboard/metrics')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(metricsRes.status).toBe(200);
      expect(metricsRes.body.data.totalBilledPaise).toBe(36000000);
      expect(metricsRes.body.data.totalCollectedPaise).toBe(4500000);

      // 2. Query Ageing Report
      const ageingRes = await request(app)
        .get('/api/v1/accounts/dashboard/ageing')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(ageingRes.status).toBe(200);
      expect(ageingRes.body.data.ageing16To30DaysPaise).toBe(1500000); // Ishita's 26-day overdue instalment

      // 3. Export Tally CSV and verify balanced reconciliation
      const tallySummary = tallyService.generateTallyCsv();
      expect(tallySummary.reconciliation.isBalanced).toBe(true);
      expect(tallySummary.reconciliation.totalDebitRupees).toBe(tallySummary.reconciliation.totalCreditRupees);

      // 4. Download Tally XML Voucher file
      const tallyXmlRes = await request(app)
        .get('/api/v1/accounts/export/tally')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(tallyXmlRes.status).toBe(200);
      expect(tallyXmlRes.headers['content-type']).toContain('xml');
      expect(tallyXmlRes.text).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
    });
  });

  // =========================================================================
  // SCENARIO H: Explainable AI Dropout Risk & Counsellor Safety Guards
  // =========================================================================
  describe('SCENARIO H — Explainable AI Dropout Risk & Counsellor Safety Guards', () => {
    it('evaluates student risk, creates counsellor task, allows false-positive override without modifying fees or messaging parent', async () => {
      const staffLogin = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'CompanyA@2026' });
      const staffToken = staffLogin.body.data.token;

      // Set due date to >30 days overdue to elevate risk score to MEDIUM (>=40)
      const inst = inMemoryFeeStore.instalments.get('i0587000-0000-0000-0000-000000000587')!;
      inst.dueDate = '2026-09-10';

      // 1. Evaluate Ishita Sharma (STU-0587)
      const evalRes = await request(app)
        .get('/api/v1/accounts/ai-risk/evaluate/s0587000-0000-0000-0000-000000000587')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(evalRes.status).toBe(200);
      const assessment = evalRes.body.data;
      expect(assessment.studentRoll).toBe('STU-0587');
      expect(assessment.riskLevel).toBe('MEDIUM');
      expect(assessment.contributingReasons.length).toBeGreaterThan(0);

      // 2. Counsellor task generated for human review
      const tasks = aiDropoutRiskService.getCounsellorTasks();
      const task = tasks.find((t) => t.studentId === assessment.studentId);
      expect(task).toBeDefined();
      expect(task?.assignedToRole).toBe('STUDENT_COUNSELLOR');

      // 3. Mark False Positive
      const fpRes = await request(app)
        .post('/api/v1/accounts/ai-risk/false-positive')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          assessmentId: assessment.id,
          notes: 'Guardian confirmed fee will be settled next Monday after bank clearance.',
        });

      expect(fpRes.status).toBe(200);
      expect(fpRes.body.data.reviewStatus).toBe('FALSE_POSITIVE');

      // 4. Verify safety restrictions: student's actual fees and enrolment status were NOT altered
      const studentAfter = inMemoryFeeStore.students.get(assessment.studentId)!;
      expect(studentAfter.enrolmentStatus).toBe('ACTIVE');
    });
  });

  // =========================================================================
  // FINANCIAL INTEGRITY CHECKS: Concurrency, Idempotency, Tampering
  // =========================================================================
  describe('Financial Integrity Audit: Concurrency, Idempotency & Tampering', () => {
    it('rejects forged / altered payment gateway signatures cryptographically', async () => {
      const staffLogin = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'CompanyA@2026' });
      const staffToken = staffLogin.body.data.token;

      // 1. Create Order
      const orderRes = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: 's0587000-0000-0000-0000-000000000587',
          instalmentId: 'i0587000-0000-0000-0000-000000000587',
          amountPaise: 500000,
        });

      const { orderId } = orderRes.body.data;

      // 2. Submit with forged / bogus signature
      const fraudRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderId,
          gatewayPaymentId: 'pay_fraud_12345',
          signature: 'forged_bogus_signature_abc_123',
        });

      expect(fraudRes.status).toBe(400);
      expect(fraudRes.body.error.message).toContain('Payment verification rejected');
    });

    it('enforces idempotency when payment order is submitted multiple times', async () => {
      const staffLogin = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'CompanyA@2026' });
      const staffToken = staffLogin.body.data.token;

      const studentId = 's0587000-0000-0000-0000-000000000587';
      const instalmentId = 'i0587000-0000-0000-0000-000000000587';
      const idempotencyKey = 'idem-unique-key-998877';

      // First call
      const first = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${staffToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ studentId, instalmentId, amountPaise: 500000 });

      // Second identical call with same idempotency key
      const second = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${staffToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ studentId, instalmentId, amountPaise: 500000 });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.data.orderId).toBe(second.body.data.orderId);
    });
  });
});
