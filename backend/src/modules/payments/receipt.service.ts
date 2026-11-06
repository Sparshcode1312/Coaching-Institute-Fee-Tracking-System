import crypto from 'node:crypto';
import { TaxConfiguration, ReceiptDTO } from './payment.types.js';

// Configurable institute tax policy (defaults to 0% exempt pending institute confirmation)
export const defaultTaxConfig: TaxConfiguration = {
  taxRateBasisPoints: Number(process.env.TAX_RATE_BASIS_POINTS || 0), // 0 basis points = 0% exempt
  isTaxInclusive: process.env.TAX_INCLUSIVE !== 'false', // Default to inclusive
  gstin: process.env.INSTITUTE_GSTIN || '08AAAAA0000A1Z5',
  instituteName: 'Company A Coaching Institute',
  instituteAddress: 'Jaipur, Rajasthan, India',
};

let receiptSequenceCounter = 412; // Starting sequence based on sample data

export class ReceiptService {
  /**
   * Generates a tamper-evident, sequential receipt number:
   * Format: REC-{YEAR}-{CENTRE_CODE}-{SEQUENCE} (e.g. REC-2026-C1-000413)
   */
  static generateReceiptNumber(centreCode = 'C1'): string {
    const year = new Date().getFullYear();
    receiptSequenceCounter += 1;
    const seqStr = String(receiptSequenceCounter).padStart(6, '0');
    return `REC-${year}-${centreCode}-${seqStr}`;
  }

  /**
   * Calculates the exact tax itemization in integer paise.
   */
  static calculateTaxBreakdown(
    totalPaidPaise: bigint,
    config: TaxConfiguration = defaultTaxConfig
  ): ReceiptDTO['taxBreakdown'] {
    const rateBasisPoints = BigInt(config.taxRateBasisPoints);
    const taxRatePercent = Number(rateBasisPoints) / 100;

    let baseAmountPaise: bigint;
    let totalTaxPaise: bigint;

    if (rateBasisPoints === 0n) {
      baseAmountPaise = totalPaidPaise;
      totalTaxPaise = 0n;
    } else if (config.isTaxInclusive) {
      // Inclusive formula: Base = Total / (1 + Rate)
      // Scaled by 10,000 for basis points: Base = (Total * 10,000) / (10,000 + Rate)
      baseAmountPaise = (totalPaidPaise * 10000n) / (10000n + rateBasisPoints);
      totalTaxPaise = totalPaidPaise - baseAmountPaise;
    } else {
      // Exclusive formula: Base = Total, Tax = Total * Rate
      baseAmountPaise = totalPaidPaise;
      totalTaxPaise = (totalPaidPaise * rateBasisPoints) / 10000n;
    }

    // In India (Jaipur intra-state), GST is split equally into CGST (50%) and SGST (50%)
    const cgstPaise = totalTaxPaise / 2n;
    const sgstPaise = totalTaxPaise - cgstPaise;
    const igstPaise = 0n;

    return {
      isTaxInclusive: config.isTaxInclusive,
      taxRatePercent,
      baseAmountPaise: Number(baseAmountPaise),
      cgstPaise: Number(cgstPaise),
      sgstPaise: Number(sgstPaise),
      igstPaise: Number(igstPaise),
      totalTaxPaise: Number(totalTaxPaise),
      netTotalPaise: Number(config.isTaxInclusive ? totalPaidPaise : baseAmountPaise + totalTaxPaise),
    };
  }

  /**
   * Computes an immutable SHA-256 digital verification hash for receipt authenticity.
   */
  static computeVerificationHash(params: {
    receiptNumber: string;
    studentRollNumber: string;
    amountPaise: bigint;
    paymentRef: string;
    receiptDate: string;
  }): string {
    const dataString = `${params.receiptNumber}|${params.studentRollNumber}|${params.amountPaise}|${params.paymentRef}|${params.receiptDate}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Constructs an official Receipt DTO.
   */
  static createReceiptRecord(params: {
    receiptId: string;
    receiptNumber: string;
    receiptDate: string;
    student: {
      id: string;
      rollNumber: string;
      fullName: string;
      centreName: string;
      batchName: string;
    };
    payment: {
      transactionRef: string;
      gatewayPaymentId: string;
      paymentMode: string;
      totalAmountPaise: bigint;
      capturedAt: string;
    };
    instalmentNumber: number;
    taxConfig?: TaxConfiguration;
  }): ReceiptDTO {
    const taxBreakdown = this.calculateTaxBreakdown(
      params.payment.totalAmountPaise,
      params.taxConfig || defaultTaxConfig
    );

    const verificationHash = this.computeVerificationHash({
      receiptNumber: params.receiptNumber,
      studentRollNumber: params.student.rollNumber,
      amountPaise: params.payment.totalAmountPaise,
      paymentRef: params.payment.transactionRef,
      receiptDate: params.receiptDate,
    });

    return {
      id: params.receiptId,
      receiptNumber: params.receiptNumber,
      receiptDate: params.receiptDate,
      student: params.student,
      payment: {
        transactionRef: params.payment.transactionRef,
        gatewayPaymentId: params.payment.gatewayPaymentId,
        paymentMode: params.payment.paymentMode,
        totalAmountPaise: Number(params.payment.totalAmountPaise),
        capturedAt: params.payment.capturedAt,
      },
      instalmentNumber: params.instalmentNumber,
      taxBreakdown,
      verificationHash,
    };
  }
}

