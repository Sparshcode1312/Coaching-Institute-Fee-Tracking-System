import { feeRepository } from './fee.repository.js';
import { FeeCalculator } from './fee.calculator.js';
import { StudentFeeSummaryDTO } from './fee.types.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { getTodayKolkata } from '../../utils/date.js';

export class FeeService {
  /**
   * Retrieves the authoritative Student Fee Ledger and Summary.
   * Endpoints: GET /api/fees/ledger/:studentId and GET /api/v1/fees/ledger/:studentId
   */
  async getStudentFeeLedger(identifier: string): Promise<StudentFeeSummaryDTO> {
    const student = await feeRepository.getStudentByIdOrRoll(identifier);
    if (!student) {
      throw new NotFoundError(`Student record '${identifier}' not found.`);
    }

    const assignment = await feeRepository.getFeeAssignmentByStudentId(student.id);
    if (!assignment) {
      throw new NotFoundError(`No active fee assignment found for student '${student.rollNumber}'.`);
    }

    const rawInstalments = await feeRepository.getInstalmentsByStudentId(student.id);
    const payments = await feeRepository.getPaymentsByStudentId(student.id);

    const todayStr = getTodayKolkata();

    // Evaluate each instalment with Asia/Kolkata financial engine
    const evaluatedInstalments = rawInstalments.map((inst) => {
      const state = FeeCalculator.evaluateInstalment({
        instalmentNumber: inst.instalmentNumber,
        baseAmountPaise: inst.baseAmountPaise,
        discountAmountPaise: inst.discountAmountPaise,
        allocatedAmountPaise: inst.settledAmountPaise,
        dueDate: inst.dueDate,
        currentDateStr: todayStr,
      });

      return {
        id: inst.id,
        instalmentNumber: inst.instalmentNumber,
        baseAmountPaise: Number(state.baseAmountPaise),
        discountAmountPaise: Number(state.discountAmountPaise),
        netPayablePaise: Number(state.netPayablePaise),
        allocatedAmountPaise: Number(state.allocatedAmountPaise),
        outstandingPaise: Number(state.outstandingPaise),
        dueDate: inst.dueDate,
        graceUntil: inst.graceUntil,
        overdueDays: state.overdueDays,
        paymentStatus: state.paymentStatus,
        dueStatus: state.dueStatus,
      };
    });

    // Reconcile total instalments with net fee
    const reconciliation = FeeCalculator.reconcileSchedule(
      rawInstalments.map((i) => ({ netPayablePaise: i.netPayablePaise })),
      assignment.netFeePaise
    );

    if (!reconciliation.isReconciled) {
      throw new BadRequestError(
        `Financial Reconciliation Error: Sum of instalments (${reconciliation.totalInstalmentsPaise} paise) does not match final payable fee (${assignment.netFeePaise} paise). Discrepancy: ${reconciliation.discrepancyPaise} paise.`
      );
    }

    // Calculate aggregated student financials
    const totalAmountPaidPaise = evaluatedInstalments.reduce(
      (sum, inst) => sum + BigInt(inst.allocatedAmountPaise),
      0n
    );

    const outstandingBalancePaise = FeeCalculator.calculateStudentBalance(
      assignment.netFeePaise,
      totalAmountPaidPaise
    );

    const maxOverdueDays = Math.max(0, ...evaluatedInstalments.map((i) => i.overdueDays));

    return {
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        fullName: student.fullName,
        enrolmentStatus: student.enrolmentStatus,
        centre: {
          id: student.centreId,
          code: student.centreCode,
          name: student.centreName,
        },
        batch: {
          id: student.batchId,
          code: student.batchCode,
          name: student.batchName,
          stream: student.stream,
        },
      },
      feePlan: {
        id: assignment.feePlanId,
        code: assignment.feePlanCode,
        name: assignment.feePlanName,
        instalmentCount: assignment.instalmentCount,
      },
      financials: {
        originalFeePaise: Number(assignment.grossFeePaise),
        discountsPaise: Number(assignment.totalDiscountPaise),
        finalPayableAmountPaise: Number(assignment.netFeePaise),
        totalAmountPaidPaise: Number(totalAmountPaidPaise),
        outstandingBalancePaise: Number(outstandingBalancePaise),
        totalOverdueDays: maxOverdueDays,
      },
      instalments: evaluatedInstalments,
      paymentHistory: payments.map((p) => ({
        id: p.id,
        transactionRef: p.transactionRef,
        paymentMode: p.paymentMode,
        gatewayName: p.gatewayName,
        amountPaise: Number(p.amountPaise),
        status: p.status,
        capturedAt: p.capturedAt,
        receipt: p.receipt || null,
        allocations: p.allocations.map((a) => ({
          instalmentNumber: a.instalmentNumber,
          allocatedAmountPaise: Number(a.allocatedAmountPaise),
        })),
      })),
    };
  }
}

export const feeService = new FeeService();

