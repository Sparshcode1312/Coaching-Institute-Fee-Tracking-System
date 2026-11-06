export type RefundStatus =
  | 'CALCULATED'
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED';

export interface RefundCalculationInput {
  studentId: string;
  withdrawalDate: string; // YYYY-MM-DD
  courseStartDate: string;
  courseEndDate: string;
  applicableFeeBasePaise?: bigint;
  paymentsReceivedPaise?: bigint;
  materialKitReturned: boolean;
  approvedDeductionsPaise?: bigint;
  policyVersion?: string;
  reason?: string;
}

export interface RefundCalculationResult {
  id: string;
  requestNumber: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  policyVersion: string;
  withdrawalDate: string;
  courseStartDate: string;
  courseEndDate: string;
  isEligible: boolean;
  eligibilityTier: string;
  totalCourseDays: number;
  usedCourseDays: number;
  unusedCourseDays: number;
  totalFeePaidPaise: bigint;
  deductions: {
    registrationFeePaise: bigint; // Fixed ₹5,000 non-refundable
    materialKitChargePaise: bigint; // Fixed ₹3,000 if not returned
    proratedTuitionPaise: bigint;
    approvedDeductionsPaise: bigint;
    totalDeductionsPaise: bigint;
  };
  grossRefundPaise: bigint;
  netRefundPaise: bigint;
  statutory10DayDeadline: string; // YYYY-MM-DD (10-day statutory timeline)
  isWithin10DayDeadline: boolean;
  status: RefundStatus;
  approvedBy?: string | null;
  approvalNotes?: string | null;
  reviewedAt?: string | null;
  disbursedAt?: string | null;
  disbursementPaymentRef?: string | null;
  createdAt: string;
  updatedAt: string;
}

