import { inMemoryFeeStore } from '../fees/fee.repository.js';
import { inMemoryRefundStore } from '../refunds/refund.service.js';

export interface TallyExportFilters {
  startDate?: string;
  endDate?: string;
  centreId?: string;
}

export interface TallyLedgerMapping {
  bankLedger: string;
  cashLedger: string;
  incomeLedger: string;
  gstLedger: string;
  discountLedger: string;
  refundLedger: string;
}

export const DEFAULT_TALLY_MAPPING: TallyLedgerMapping = {
  bankLedger: 'Bank Account (HDFC)',
  cashLedger: 'Cash in Hand',
  incomeLedger: 'Coaching Fee Income',
  gstLedger: 'GST Output Liability (Exempt)',
  discountLedger: 'Scholarship & Concession Allowed',
  refundLedger: 'Student Fee Refund A/c',
};

export interface TallyReconciliationSummary {
  totalReceiptsCount: number;
  totalDebitRupees: number;
  totalCreditRupees: number;
  isBalanced: boolean;
  ledgerReconciliationDifference: number;
  appliedFilters: TallyExportFilters;
  disclaimer: string;
}

export class TallyService {
  /**
   * Generates structured CSV with configurable ledger mapping
   */
  generateTallyCsv(
    filters: TallyExportFilters = {},
    mapping: TallyLedgerMapping = DEFAULT_TALLY_MAPPING
  ): { csv: string; reconciliation: TallyReconciliationSummary } {
    const headers = [
      'Voucher Date',
      'Voucher Type',
      'Voucher Number',
      'Roll Number',
      'Student Name',
      'Centre Name',
      'Debit Ledger',
      'Debit Amount',
      'Credit Ledger',
      'Credit Amount',
      'Narration',
    ];

    const rows: string[] = [headers.join(',')];
    let totalDebitRupees = 0;
    let totalCreditRupees = 0;
    let receiptsCount = 0;

    // 1. Process Successful Fee Receipts
    for (const payment of inMemoryFeeStore.payments.values()) {
      if (payment.status !== 'SUCCESS') continue;

      const student = inMemoryFeeStore.students.get(payment.studentId);
      if (!student) continue;

      if (filters.centreId && filters.centreId !== 'ALL' && student.centreId !== filters.centreId) {
        continue;
      }

      const receiptDate = payment.receipt?.receiptDate || payment.capturedAt?.split('T')[0] || '2026-10-10';
      if (filters.startDate && receiptDate < filters.startDate) continue;
      if (filters.endDate && receiptDate > filters.endDate) continue;

      const voucherDate = receiptDate.split('-').reverse().join('/'); // DD/MM/YYYY
      const voucherNo = payment.receipt?.receiptNumber || `VCH-${payment.transactionRef}`;
      const amountRupees = Number(payment.amountPaise) / 100;
      const debitLedger = payment.paymentMode === 'CASH' ? mapping.cashLedger : mapping.bankLedger;

      const narration = `"Fee collection instalment from ${student.fullName} (${student.rollNumber}) via ${payment.paymentMode}"`;

      rows.push(
        [
          voucherDate,
          'Receipt',
          voucherNo,
          student.rollNumber,
          `"${student.fullName}"`,
          `"${student.centreName}"`,
          `"${debitLedger}"`,
          amountRupees.toFixed(2),
          `"${mapping.incomeLedger}"`,
          amountRupees.toFixed(2),
          narration,
        ].join(',')
      );

      totalDebitRupees += amountRupees;
      totalCreditRupees += amountRupees;
      receiptsCount++;
    }

    // 2. Process Disbursed Refunds (as Payment Vouchers)
    for (const refund of inMemoryRefundStore.values()) {
      if (refund.status !== 'DISBURSED') continue;

      const student = inMemoryFeeStore.students.get(refund.studentId);
      if (!student) continue;

      if (filters.centreId && filters.centreId !== 'ALL' && student.centreId !== filters.centreId) {
        continue;
      }

      const refundDate = refund.disbursedAt?.split('T')[0] || refund.withdrawalDate;
      if (filters.startDate && refundDate < filters.startDate) continue;
      if (filters.endDate && refundDate > filters.endDate) continue;

      const voucherDate = refundDate.split('-').reverse().join('/');
      const voucherNo = refund.requestNumber;
      const amountRupees = Number(refund.netRefundPaise) / 100;

      const narration = `"Fee refund disbursement to ${student.fullName} (${student.rollNumber}) ref: ${refund.disbursementPaymentRef || 'NEFT'}"`;

      rows.push(
        [
          voucherDate,
          'Payment',
          voucherNo,
          student.rollNumber,
          `"${student.fullName}"`,
          `"${student.centreName}"`,
          `"${mapping.refundLedger}"`,
          amountRupees.toFixed(2),
          `"${mapping.bankLedger}"`,
          amountRupees.toFixed(2),
          narration,
        ].join(',')
      );

      totalDebitRupees += amountRupees;
      totalCreditRupees += amountRupees;
      receiptsCount++;
    }

    const difference = Math.abs(totalDebitRupees - totalCreditRupees);

    const reconciliation: TallyReconciliationSummary = {
      totalReceiptsCount: receiptsCount,
      totalDebitRupees,
      totalCreditRupees,
      isBalanced: difference < 0.01,
      ledgerReconciliationDifference: difference,
      appliedFilters: filters,
      disclaimer:
        'CSV format exported for manual or scheduled batch import into Tally ERP 9 / TallyPrime. Live direct ODBC/Tally API connection is not enabled.',
    };

    return {
      csv: rows.join('\n'),
      reconciliation,
    };
  }

  /**
   * Generates standard Tally Envelope XML schema
   */
  generateTallyXml(filters: TallyExportFilters = {}): string {
    const vouchersXml: string[] = [];

    for (const payment of inMemoryFeeStore.payments.values()) {
      if (payment.status !== 'SUCCESS') continue;

      const student = inMemoryFeeStore.students.get(payment.studentId);
      if (!student) continue;

      if (filters.centreId && filters.centreId !== 'ALL' && student.centreId !== filters.centreId) {
        continue;
      }

      const receiptDate = payment.receipt?.receiptDate || '2026-10-10';
      const tallyDate = receiptDate.replace(/-/g, ''); // YYYYMMDD
      const voucherNo = payment.receipt?.receiptNumber || `REC-${payment.transactionRef}`;
      const amountRupees = (Number(payment.amountPaise) / 100).toFixed(2);
      const debitLedger = payment.paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account (HDFC)';

      vouchersXml.push(`          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <DATE>${tallyDate}</DATE>
            <NARRATION>Fee Collection - ${student.fullName} (${student.rollNumber})</NARRATION>
            <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${voucherNo}</VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${debitLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amountRupees}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Coaching Fee Income</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amountRupees}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
${vouchersXml.join('\n')}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }
}

export const tallyService = new TallyService();

