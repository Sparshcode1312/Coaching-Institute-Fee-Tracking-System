import { describe, it, expect, beforeEach } from 'vitest';
import { reportsService } from '../src/modules/reports/reports.service.js';
import { tallyService } from '../src/modules/accounts/tally.service.js';
import { resetInMemoryFeeStore, inMemoryFeeStore } from '../src/modules/fees/fee.repository.js';

describe('Reporting Engine, Dues Ageing & Tally Export Reconciliation', () => {
  beforeEach(() => {
    resetInMemoryFeeStore();
  });

  describe('Executive Financial Metrics & Filtering', () => {
    it('aggregates total billed, collected and outstanding without double counting', async () => {
      const metrics = await reportsService.getExecutiveMetrics();

      // In initial seeded state: 3 students @ ₹1,20,000 each = ₹3,60,000 billed (36,000,000 paise)
      expect(metrics.totalBilledPaise).toBe(36000000n);
      // Aarav Meena paid ₹30,000, Ishita Sharma paid ₹15,000 = ₹45,000 collected (4,500,000 paise)
      expect(metrics.totalCollectedPaise).toBe(4500000n);
      // Total Outstanding = 360,000 - 45,000 = ₹3,15,000 (31,500,000 paise)
      expect(metrics.totalOutstandingPaise).toBe(31500000n);
      // Active students
      expect(metrics.activeStudentsCount).toBe(3);
      // Collection percentage = (45,000 / 360,000) * 100 = 12.5%
      expect(metrics.collectionPercentage).toBe(12.5);
    });

    it('filters metrics by specific centre without cross-centre leakage', async () => {
      // Centre 1: Aarav Meena (₹1,20,000) + Ishita Sharma (₹1,20,000) = ₹2,40,000 billed
      const c1Metrics = await reportsService.getExecutiveMetrics({
        centreId: 'c1111111-1111-1111-1111-111111111111',
      });

      expect(c1Metrics.totalBilledPaise).toBe(24000000n);
      expect(c1Metrics.totalCollectedPaise).toBe(4500000n);
      expect(c1Metrics.activeStudentsCount).toBe(2);

      // Centre 2: Mohit Gurjar (₹1,20,000 billed, 0 collected)
      const c2Metrics = await reportsService.getExecutiveMetrics({
        centreId: 'c2222222-2222-2222-2222-222222222222',
      });

      expect(c2Metrics.totalBilledPaise).toBe(12000000n);
      expect(c2Metrics.totalCollectedPaise).toBe(0n);
      expect(c2Metrics.activeStudentsCount).toBe(1);
    });
  });

  describe('Dues Ageing Categories (Actual Outstanding Principle)', () => {
    it('categorizes dues into 4 standard ageing buckets using actual remaining balance', async () => {
      const ageing = await reportsService.getAgeingReport();

      // Ishita Sharma has Instalment 1 (due 2026-10-10): ₹15,000 remaining overdue
      // Mohit Gurjar has Instalment 1 (due 2026-11-15): Upcoming (Not Due)
      expect(ageing.totalOverduePaise).toBeGreaterThan(0n);
      expect(ageing.notDuePaise).toBeGreaterThan(0n);

      // Ensure overdue calculation uses remaining balance (₹15,000), NOT original ₹30,000
      expect(ageing.overdue1To30DaysPaise).toBe(1500000n);
    });
  });

  describe('Tally ERP Export & Balanced Ledger Reconciliation', () => {
    it('generates structured CSV with balanced debit and credit entries', () => {
      // Add a verified payment record to inMemoryFeeStore to verify export
      inMemoryFeeStore.payments.set('pay-001', {
        id: 'pay-001',
        transactionRef: 'TXN-JPR-2026-001',
        studentId: 's0412000-0000-0000-0000-000000000412',
        gatewayName: 'MOCK_GATEWAY',
        paymentMode: 'UPI',
        amountPaise: 3000000n, // ₹30,000
        status: 'SUCCESS',
        capturedAt: '2026-10-08T10:00:00Z',
        receipt: {
          id: 'rec-001',
          receiptNumber: 'REC-2026-C1-000412',
          receiptDate: '2026-10-08',
          verificationHash: 'hash123',
        },
        allocations: [],
      });

      const { csv, reconciliation } = tallyService.generateTallyCsv();

      expect(csv).toContain('Voucher Date,Voucher Type,Voucher Number');
      expect(csv).toContain('REC-2026-C1-000412');
      expect(csv).toContain('Aarav Meena');
      expect(csv).toContain('Bank Account (HDFC)');
      expect(csv).toContain('Coaching Fee Income');
      expect(csv).toContain('30000.00');

      // Reconciliation verification: Debits must balance Credits
      expect(reconciliation.isBalanced).toBe(true);
      expect(reconciliation.totalDebitRupees).toBe(75000);
      expect(reconciliation.totalCreditRupees).toBe(75000);
      expect(reconciliation.ledgerReconciliationDifference).toBe(0);
      expect(reconciliation.disclaimer).toContain('Tally ERP 9 / TallyPrime');
    });

    it('generates valid Tally Envelope XML schema', () => {
      inMemoryFeeStore.payments.set('pay-001', {
        id: 'pay-001',
        transactionRef: 'TXN-JPR-2026-001',
        studentId: 's0412000-0000-0000-0000-000000000412',
        gatewayName: 'MOCK_GATEWAY',
        paymentMode: 'UPI',
        amountPaise: 3000000n,
        status: 'SUCCESS',
        capturedAt: '2026-10-08T10:00:00Z',
        receipt: {
          id: 'rec-001',
          receiptNumber: 'REC-2026-C1-000412',
          receiptDate: '2026-10-08',
          verificationHash: 'hash123',
        },
        allocations: [],
      });

      const xml = tallyService.generateTallyXml();

      expect(xml).toContain('<ENVELOPE>');
      expect(xml).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
      expect(xml).toContain('<VOUCHER VCHTYPE="Receipt" ACTION="Create">');
      expect(xml).toContain('REC-2026-C1-000412');
      expect(xml).toContain('<AMOUNT>-30000.00</AMOUNT>');
      expect(xml).toContain('<AMOUNT>30000.00</AMOUNT>');
      expect(xml).toContain('</ENVELOPE>');
    });
  });
});
