import { describe, it, expect } from 'vitest';
import { FeeCalculator } from '../src/modules/fees/fee.calculator.js';
import { calculateOverdueDays, evaluateDueStatus, diffCalendarDays } from '../src/utils/date.js';

describe('Financial Engine: Calculation Rules & Precision', () => {
  describe('Net Payable Fee', () => {
    it('calculates Net Payable Fee = Original Fee - Approved Discounts in integer paise', () => {
      const originalFeePaise = 12000000n; // ₹1,20,000
      const approvedDiscountPaise = 2000000n; // ₹20,000 scholarship

      const netPayable = FeeCalculator.calculateNetPayableFee(originalFeePaise, approvedDiscountPaise);
      expect(netPayable).toBe(10000000n); // ₹1,00,000
    });

    it('rejects negative discounts', () => {
      expect(() => FeeCalculator.calculateNetPayableFee(12000000n, -50000n)).toThrow(
        'Approved discounts cannot be negative'
      );
    });

    it('rejects discounts exceeding original fee', () => {
      expect(() => FeeCalculator.calculateNetPayableFee(12000000n, 15000000n)).toThrow(
        'Discounts cannot exceed total original fee'
      );
    });
  });

  describe('Instalment Outstanding & Overpayment Protection', () => {
    it('calculates Instalment Outstanding = Net Payable - Total Allocations', () => {
      const netPayablePaise = 3000000n; // ₹30,000
      const allocatedPaise = 1500000n; // ₹15,000 paid

      const outstanding = FeeCalculator.calculateInstalmentOutstanding(netPayablePaise, allocatedPaise);
      expect(outstanding).toBe(1500000n);
    });

    it('returns 0 outstanding when fully settled or surplus', () => {
      const outstanding = FeeCalculator.calculateInstalmentOutstanding(3000000n, 3000000n);
      expect(outstanding).toBe(0n);

      const surplusOutstanding = FeeCalculator.calculateInstalmentOutstanding(3000000n, 3500000n);
      expect(surplusOutstanding).toBe(0n);
    });
  });

  describe('Separate Payment Status & Due Status Fields', () => {
    it('evaluates Payment Status independently: UNPAID, PARTIALLY_PAID, PAID, REFUNDED', () => {
      const netPayable = 3000000n;

      expect(FeeCalculator.evaluatePaymentStatus(netPayable, 0n)).toBe('UNPAID');
      expect(FeeCalculator.evaluatePaymentStatus(netPayable, 1000000n)).toBe('PARTIALLY_PAID');
      expect(FeeCalculator.evaluatePaymentStatus(netPayable, 3000000n)).toBe('PAID');
      expect(FeeCalculator.evaluatePaymentStatus(netPayable, 3000000n, 3000000n)).toBe('REFUNDED');
      expect(FeeCalculator.evaluatePaymentStatus(netPayable, 3000000n, 1000000n)).toBe('PARTIALLY_REFUNDED');
    });

    it('CRITICAL: Never marks a partially paid overdue instalment as fully paid', () => {
      const netPayable = 3000000n; // ₹30,000
      const allocated = 1500000n; // ₹15,000 paid
      const pastDueDate = '2026-10-10';
      const testToday = '2026-11-05';

      const evaluated = FeeCalculator.evaluateInstalment({
        instalmentNumber: 1,
        baseAmountPaise: netPayable,
        discountAmountPaise: 0n,
        allocatedAmountPaise: allocated,
        dueDate: pastDueDate,
        currentDateStr: testToday,
      });

      expect(evaluated.paymentStatus).toBe('PARTIALLY_PAID');
      expect(evaluated.dueStatus).toBe('OVERDUE');
      expect(evaluated.outstandingPaise).toBe(1500000n);
      expect(evaluated.overdueDays).toBe(26); // Oct 10 to Nov 05 = 26 days
      expect(evaluated.paymentStatus).not.toBe('PAID');
    });

    it('returns overdue days = 0 when instalment has zero outstanding balance', () => {
      const pastDueDate = '2026-10-10';
      const testToday = '2026-11-05';

      const overdueDays = calculateOverdueDays(pastDueDate, 0n, testToday);
      expect(overdueDays).toBe(0);

      const dueStatus = evaluateDueStatus(pastDueDate, 0n, testToday);
      expect(dueStatus).toBe('SETTLED');
    });

    it('correctly detects DUE_TODAY when current date equals due date', () => {
      const todayStr = '2026-11-05';
      const dueStatus = evaluateDueStatus(todayStr, 3000000n, todayStr);
      expect(dueStatus).toBe('DUE_TODAY');
    });

    it('correctly detects UPCOMING when due date is in the future', () => {
      const futureDueDate = '2027-01-15';
      const testToday = '2026-11-05';

      const dueStatus = evaluateDueStatus(futureDueDate, 3000000n, testToday);
      expect(dueStatus).toBe('UPCOMING');
      expect(calculateOverdueDays(futureDueDate, 3000000n, testToday)).toBe(0);
    });
  });

  describe('Instalment Schedule Reconciliation', () => {
    it('verifies that total instalments reconcile with final payable fee', () => {
      const fourInstalments = [
        { netPayablePaise: 3000000n },
        { netPayablePaise: 3000000n },
        { netPayablePaise: 3000000n },
        { netPayablePaise: 3000000n },
      ];
      const annualFee = 12000000n; // ₹1,20,000

      const result = FeeCalculator.reconcileSchedule(fourInstalments, annualFee);
      expect(result.isReconciled).toBe(true);
      expect(result.discrepancyPaise).toBe(0n);
    });

    it('detects and flags discrepancies in instalment schedules', () => {
      const badSchedule = [
        { netPayablePaise: 3000000n },
        { netPayablePaise: 3000000n },
        { netPayablePaise: 3000000n },
        // Missing 4th instalment!
      ];
      const annualFee = 12000000n;

      const result = FeeCalculator.reconcileSchedule(badSchedule, annualFee);
      expect(result.isReconciled).toBe(false);
      expect(result.discrepancyPaise).toBe(-3000000n);
    });
  });

  describe('Financial Edge Cases & Integer Precision', () => {
    it('handles large 64-bit rupee values without numeric precision loss', () => {
      // Annual revenue of Company A: ₹34 Crore = 3,400,000,000.00 INR = 340,000,000,000 paise
      const thirtyFourCrorePaise = 340000000000n;
      const paymentPaise = 12000000n;

      const balance = FeeCalculator.calculateStudentBalance(thirtyFourCrorePaise, paymentPaise);
      expect(balance).toBe(339988000000n);
    });

    it('calculates exact calendar day differences in Asia/Kolkata', () => {
      expect(diffCalendarDays('2026-10-10', '2026-10-10')).toBe(0);
      expect(diffCalendarDays('2026-10-15', '2026-10-10')).toBe(5);
      expect(diffCalendarDays('2026-11-05', '2026-10-10')).toBe(26);
    });
  });
});

