import { RefundCalculationInput, RefundCalculationResult } from './refund.types.js';

export const POLICY_V1_2026 = 'POLICY-V1-2026';

export const STATUTORY_DEDUCTIONS = {
  NON_REFUNDABLE_REGISTRATION_PAISE: 500000n, // ₹5,000 registration charge
  UNRETURNED_MATERIAL_KIT_PAISE: 300000n, // ₹3,000 study kit
};

function daysBetween(startStr: string, endStr: string): number {
  const parts1 = startStr.split('-').map(Number);
  const parts2 = endStr.split('-').map(Number);
  const date1 = new Date(Date.UTC(parts1[0] || 2026, (parts1[1] || 1) - 1, parts1[2] || 1));
  const date2 = new Date(Date.UTC(parts2[0] || 2026, (parts2[1] || 1) - 1, parts2[2] || 1));
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0] || dateStr;
}

export class RefundCalculator {
  static calculate(
    input: RefundCalculationInput & {
      studentRoll: string;
      studentName: string;
      totalPaymentsReceivedPaise: bigint;
      todayKolkataStr: string;
    }
  ): Omit<RefundCalculationResult, 'id' | 'requestNumber' | 'createdAt' | 'updatedAt'> {
    const policyVersion = input.policyVersion || POLICY_V1_2026;
    const totalCourseDays = Math.max(1, daysBetween(input.courseStartDate, input.courseEndDate));
    const usedCourseDays = Math.max(0, daysBetween(input.courseStartDate, input.withdrawalDate));
    const unusedCourseDays = Math.max(0, totalCourseDays - usedCourseDays);

    const statutoryDeadline = addDays(input.withdrawalDate, 10);
    const isWithinDeadline = input.todayKolkataStr <= statutoryDeadline;

    // 1. Cutoff Tier Evaluation
    let isEligible = true;
    let eligibilityTier = 'TIER_1_WITHIN_15_DAYS';
    let refundableTuitionPercentage = 100n;

    if (usedCourseDays > 60) {
      isEligible = false;
      eligibilityTier = 'TIER_4_EXCEEDED_60_DAYS';
      refundableTuitionPercentage = 0n;
    } else if (usedCourseDays > 30) {
      eligibilityTier = 'TIER_3_DAY_31_TO_60';
      refundableTuitionPercentage = 50n;
    } else if (usedCourseDays > 15) {
      eligibilityTier = 'TIER_2_DAY_16_TO_30';
      refundableTuitionPercentage = 75n;
    } else {
      eligibilityTier = 'TIER_1_WITHIN_15_DAYS';
      refundableTuitionPercentage = 100n;
    }

    // 2. Deductions
    const regDeduction = STATUTORY_DEDUCTIONS.NON_REFUNDABLE_REGISTRATION_PAISE;
    const materialDeduction = input.materialKitReturned
      ? 0n
      : STATUTORY_DEDUCTIONS.UNRETURNED_MATERIAL_KIT_PAISE;

    // Daily prorated tuition deduction: (Net tuition * usedDays) / totalDays
    const netTuitionBase = (input.applicableFeeBasePaise || 12000000n) - regDeduction;
    const proratedTuitionDeduction =
      (netTuitionBase * BigInt(usedCourseDays)) / BigInt(totalCourseDays);

    const approvedDeductions = input.approvedDeductionsPaise || 0n;

    const totalDeductions =
      regDeduction + materialDeduction + proratedTuitionDeduction + approvedDeductions;

    // 3. Gross and Net Calculation
    const totalPaid = input.totalPaymentsReceivedPaise;
    let grossRefund = 0n;
    let netRefund = 0n;

    if (isEligible && totalPaid > 0n) {
      // Apply tier percentage
      const tuitionPaid = totalPaid > regDeduction ? totalPaid - regDeduction : 0n;
      const eligibleTuitionRefund = (tuitionPaid * refundableTuitionPercentage) / 100n;
      const baseRefund = eligibleTuitionRefund - materialDeduction - approvedDeductions;

      grossRefund = baseRefund > 0n ? baseRefund : 0n;
      // Cap refund strictly at total payments received
      netRefund = grossRefund > totalPaid ? totalPaid : grossRefund;
    }

    return {
      studentId: input.studentId,
      studentRoll: input.studentRoll,
      studentName: input.studentName,
      policyVersion,
      withdrawalDate: input.withdrawalDate,
      courseStartDate: input.courseStartDate,
      courseEndDate: input.courseEndDate,
      isEligible,
      eligibilityTier,
      totalCourseDays,
      usedCourseDays,
      unusedCourseDays,
      totalFeePaidPaise: totalPaid,
      deductions: {
        registrationFeePaise: regDeduction,
        materialKitChargePaise: materialDeduction,
        proratedTuitionPaise: proratedTuitionDeduction,
        approvedDeductionsPaise: approvedDeductions,
        totalDeductionsPaise: totalDeductions,
      },
      grossRefundPaise: grossRefund,
      netRefundPaise: netRefund,
      statutory10DayDeadline: statutoryDeadline,
      isWithin10DayDeadline: isWithinDeadline,
      status: 'CALCULATED',
    };
  }
}
