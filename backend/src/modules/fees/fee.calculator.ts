import { calculateOverdueDays, evaluateDueStatus, DueStatus } from '../../utils/date.js';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface FeeCalculationParams {
  originalFeePaise: bigint;
  approvedDiscountsPaise: bigint;
}

export interface InstalmentFinancialState {
  instalmentNumber: number;
  baseAmountPaise: bigint;
  discountAmountPaise: bigint;
  netPayablePaise: bigint;
  allocatedAmountPaise: bigint;
  outstandingPaise: bigint;
  dueDate: string;
  overdueDays: number;
  paymentStatus: PaymentStatus;
  dueStatus: DueStatus;
}

export class FeeCalculator {
  /**
   * Net payable fee = Original fee - Approved discounts
   */
  static calculateNetPayableFee(originalFeePaise: bigint, approvedDiscountsPaise: bigint): bigint {
    if (approvedDiscountsPaise < 0n) {
      throw new Error('Approved discounts cannot be negative');
    }
    if (approvedDiscountsPaise > originalFeePaise) {
      throw new Error('Discounts cannot exceed total original fee');
    }
    return originalFeePaise - approvedDiscountsPaise;
  }

  /**
   * Instalment outstanding = Instalment amount - Total verified allocations + applicable authorized adjustments
   */
  static calculateInstalmentOutstanding(
    netPayablePaise: bigint,
    totalVerifiedAllocationsPaise: bigint,
    authorizedAdjustmentsPaise: bigint = 0n
  ): bigint {
    const rawOutstanding = netPayablePaise - totalVerifiedAllocationsPaise + authorizedAdjustmentsPaise;
    return rawOutstanding > 0n ? rawOutstanding : 0n;
  }

  /**
   * Student balance = Total payable amount - Net allocated payments + applicable authorized adjustments
   */
  static calculateStudentBalance(
    totalPayablePaise: bigint,
    netAllocatedPaymentsPaise: bigint,
    authorizedAdjustmentsPaise: bigint = 0n
  ): bigint {
    const rawBalance = totalPayablePaise - netAllocatedPaymentsPaise + authorizedAdjustmentsPaise;
    return rawBalance > 0n ? rawBalance : 0n;
  }

  /**
   * Evaluates the discrete Payment Status of an instalment.
   * Distinct from Due Status.
   */
  static evaluatePaymentStatus(
    netPayablePaise: bigint,
    totalAllocatedPaise: bigint,
    refundedPaise: bigint = 0n
  ): PaymentStatus {
    if (totalAllocatedPaise === 0n) {
      return 'UNPAID';
    }

    if (refundedPaise > 0n) {
      if (refundedPaise >= totalAllocatedPaise) {
        return 'REFUNDED';
      }
      return 'PARTIALLY_REFUNDED';
    }

    if (totalAllocatedPaise >= netPayablePaise) {
      return 'PAID';
    }

    return 'PARTIALLY_PAID';
  }

  /**
   * Generates a complete financial snapshot of an instalment milestone.
   */
  static evaluateInstalment(params: {
    instalmentNumber: number;
    baseAmountPaise: bigint;
    discountAmountPaise: bigint;
    allocatedAmountPaise: bigint;
    dueDate: string;
    currentDateStr?: string;
    refundedAmountPaise?: bigint;
    authorizedAdjustmentsPaise?: bigint;
  }): InstalmentFinancialState {
    const netPayable = params.baseAmountPaise - params.discountAmountPaise;
    const outstanding = this.calculateInstalmentOutstanding(
      netPayable,
      params.allocatedAmountPaise,
      params.authorizedAdjustmentsPaise || 0n
    );
    const overdueDays = calculateOverdueDays(params.dueDate, outstanding, params.currentDateStr);
    const paymentStatus = this.evaluatePaymentStatus(
      netPayable,
      params.allocatedAmountPaise,
      params.refundedAmountPaise || 0n
    );
    const dueStatus = evaluateDueStatus(params.dueDate, outstanding, params.currentDateStr);

    return {
      instalmentNumber: params.instalmentNumber,
      baseAmountPaise: params.baseAmountPaise,
      discountAmountPaise: params.discountAmountPaise,
      netPayablePaise: netPayable,
      allocatedAmountPaise: params.allocatedAmountPaise,
      outstandingPaise: outstanding,
      dueDate: params.dueDate,
      overdueDays,
      paymentStatus,
      dueStatus,
    };
  }

  /**
   * Validates that total instalments reconcile with the final payable fee.
   */
  static reconcileSchedule(
    instalments: Array<{ netPayablePaise: bigint }>,
    finalPayableFeePaise: bigint
  ): { isReconciled: boolean; totalInstalmentsPaise: bigint; discrepancyPaise: bigint } {
    const totalInstalmentsPaise = instalments.reduce((sum, inst) => sum + inst.netPayablePaise, 0n);
    const discrepancyPaise = totalInstalmentsPaise - finalPayableFeePaise;
    return {
      isReconciled: discrepancyPaise === 0n,
      totalInstalmentsPaise,
      discrepancyPaise,
    };
  }
}

