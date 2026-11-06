import { describe, it, expect, beforeEach } from 'vitest';
import { refundService, inMemoryRefundStore } from '../src/modules/refunds/refund.service.js';
import { RefundCalculator } from '../src/modules/refunds/refund.calculator.js';
import { resetInMemoryFeeStore, inMemoryFeeStore } from '../src/modules/fees/fee.repository.js';

describe('Versioned Refund Policy Engine & Statutory Deadlines', () => {
  beforeEach(() => {
    resetInMemoryFeeStore();
    inMemoryRefundStore.clear();
  });

  describe('Policy Versioning & Cutoff Window Calculations', () => {
    it('calculates 100% tuition refund eligibility within 15 days (Tier 1)', () => {
      const result = RefundCalculator.calculate({
        studentId: 's0412000-0000-0000-0000-000000000412',
        studentRoll: 'STU-0412',
        studentName: 'Aarav Meena',
        courseStartDate: '2026-07-01',
        courseEndDate: '2027-04-30',
        withdrawalDate: '2026-07-10', // 9 days used (< 15 days)
        applicableFeeBasePaise: 12000000n,
        totalPaymentsReceivedPaise: 3000000n, // ₹30,000 paid
        materialKitReturned: true,
        todayKolkataStr: '2026-07-12',
      });

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityTier).toBe('TIER_1_WITHIN_15_DAYS');
      expect(result.deductions.registrationFeePaise).toBe(500000n); // ₹5,000 non-refundable
      expect(result.deductions.materialKitChargePaise).toBe(0n); // Kit returned
      expect(result.netRefundPaise).toBe(2500000n); // ₹30,000 paid - ₹5,000 reg = ₹25,000
    });

    it('enforces unreturned material kit deduction of ₹3,000 when kit is retained', () => {
      const result = RefundCalculator.calculate({
        studentId: 's0412000-0000-0000-0000-000000000412',
        studentRoll: 'STU-0412',
        studentName: 'Aarav Meena',
        courseStartDate: '2026-07-01',
        courseEndDate: '2027-04-30',
        withdrawalDate: '2026-07-10',
        applicableFeeBasePaise: 12000000n,
        totalPaymentsReceivedPaise: 3000000n,
        materialKitReturned: false, // Kit kept by student
        todayKolkataStr: '2026-07-12',
      });

      expect(result.deductions.materialKitChargePaise).toBe(300000n); // ₹3,000 kit deduction
      expect(result.netRefundPaise).toBe(2200000n); // ₹30,000 paid - (5,000 reg + 3,000 kit) = ₹22,000
    });

    it('declares student ineligible for refund if withdrawal exceeds 60 days (Tier 4)', () => {
      const result = RefundCalculator.calculate({
        studentId: 's0412000-0000-0000-0000-000000000412',
        studentRoll: 'STU-0412',
        studentName: 'Aarav Meena',
        courseStartDate: '2026-07-01',
        courseEndDate: '2027-04-30',
        withdrawalDate: '2026-09-15', // 76 days used (> 60 days)
        applicableFeeBasePaise: 12000000n,
        totalPaymentsReceivedPaise: 3000000n,
        materialKitReturned: false,
        todayKolkataStr: '2026-09-16',
      });

      expect(result.isEligible).toBe(false);
      expect(result.eligibilityTier).toBe('TIER_4_EXCEEDED_60_DAYS');
      expect(result.netRefundPaise).toBe(0n);
    });
  });

  describe('Statutory 10-Day Refund Deadline Tracking', () => {
    it('sets deadline exactly 10 days post-withdrawal and tracks compliance', () => {
      const withdrawalDate = '2026-10-15';
      const result = RefundCalculator.calculate({
        studentId: 's0412000-0000-0000-0000-000000000412',
        studentRoll: 'STU-0412',
        studentName: 'Aarav Meena',
        courseStartDate: '2026-10-01',
        courseEndDate: '2027-04-30',
        withdrawalDate,
        totalPaymentsReceivedPaise: 3000000n,
        materialKitReturned: true,
        todayKolkataStr: '2026-10-20',
      });

      expect(result.statutory10DayDeadline).toBe('2026-10-25'); // 15 + 10 days
      expect(result.isWithin10DayDeadline).toBe(true); // 2026-10-20 <= 2026-10-25
    });

    it('flags breached deadline when reviewed after 10-day statutory window', () => {
      const withdrawalDate = '2026-10-01';
      const result = RefundCalculator.calculate({
        studentId: 's0412000-0000-0000-0000-000000000412',
        studentRoll: 'STU-0412',
        studentName: 'Aarav Meena',
        courseStartDate: '2026-10-01',
        courseEndDate: '2027-04-30',
        withdrawalDate,
        totalPaymentsReceivedPaise: 3000000n,
        materialKitReturned: true,
        todayKolkataStr: '2026-10-15', // 14 days later (> 10-day deadline of 2026-10-11)
      });

      expect(result.statutory10DayDeadline).toBe('2026-10-11');
      expect(result.isWithin10DayDeadline).toBe(false);
    });
  });

  describe('Refund Approval & Multi-Stage Lifecycle', () => {
    it('executes full lifecycle: calculate -> request -> approve -> disburse', async () => {
      const student = inMemoryFeeStore.students.get('s0412000-0000-0000-0000-000000000412')!;

      // 1. Calculate
      const calculated = await refundService.calculateRefund({
        studentId: student.id,
        withdrawalDate: '2026-07-10',
        courseStartDate: '2026-07-01',
        courseEndDate: '2027-04-30',
        materialKitReturned: true,
      });

      expect(calculated.status).toBe('CALCULATED');
      expect(calculated.requestNumber).toMatch(/^REF-2026-/);

      // 2. Submit Request
      const requested = await refundService.submitRefundRequest(calculated.id, 'Relocating to another city');
      expect(requested.status).toBe('REQUESTED');

      // 3. Approve
      const approved = await refundService.approveRefund({
        requestId: requested.id,
        approvedBy: 'accounts-director-001',
        approvalNotes: 'Withdrawal approved as per refund policy v1',
      });

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe('accounts-director-001');

      // 4. Disburse
      const disbursed = await refundService.disburseRefund({
        requestId: approved.id,
        disbursedBy: 'chief-accountant-001',
        paymentRef: 'NEFT-REF-892104-HDFC',
      });

      expect(disbursed.status).toBe('DISBURSED');
      expect(disbursed.disbursementPaymentRef).toBe('NEFT-REF-892104-HDFC');
    });

    it('rejects disbursement attempt on unapproved refund request', async () => {
      const student = inMemoryFeeStore.students.get('s0412000-0000-0000-0000-000000000412')!;

      const calculated = await refundService.calculateRefund({
        studentId: student.id,
        withdrawalDate: '2026-07-10',
        courseStartDate: '2026-07-01',
        courseEndDate: '2027-04-30',
        materialKitReturned: true,
      });

      // Attempting to disburse while still CALCULATED (not APPROVED) must throw BadRequestError
      await expect(
        refundService.disburseRefund({
          requestId: calculated.id,
          disbursedBy: 'cashier-01',
          paymentRef: 'REF-CHECK-001',
        })
      ).rejects.toThrow(/Cannot disburse refund with status 'CALCULATED'/);
    });
  });
});

