import crypto from 'crypto';
import { inMemoryFeeStore } from '../fees/fee.repository.js';
import { getTodayKolkata } from '../../utils/date.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { auditService } from '../audit/audit.service.js';
import { RefundCalculator } from './refund.calculator.js';
import {
  RefundCalculationInput,
  RefundCalculationResult,
} from './refund.types.js';

export const inMemoryRefundStore: Map<string, RefundCalculationResult> = new Map();

export class RefundService {
  async calculateRefund(input: RefundCalculationInput): Promise<RefundCalculationResult> {
    const student = inMemoryFeeStore.students.get(input.studentId);
    if (!student) throw new NotFoundError('Student not found for refund calculation.');

    // Authoritative total paid calculation from fee ledger instalments
    const instalments = Array.from(inMemoryFeeStore.instalments.values()).filter(
      (i) => i.studentId === student.id
    );
    const totalPaymentsReceivedPaise = instalments.reduce(
      (sum, i) => sum + i.settledAmountPaise,
      0n
    );

    const assignment = inMemoryFeeStore.assignments.get(student.id);
    const applicableFeeBasePaise = assignment?.netFeePaise || 12000000n;
    const todayKolkataStr = getTodayKolkata();

    const calculation = RefundCalculator.calculate({
      ...input,
      studentRoll: student.rollNumber,
      studentName: student.fullName,
      applicableFeeBasePaise,
      totalPaymentsReceivedPaise,
      todayKolkataStr,
    });

    const id = crypto.randomUUID();
    const requestNumber = `REF-${new Date().getFullYear()}-${student.rollNumber.replace('STU-', '')}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const result: RefundCalculationResult = {
      id,
      requestNumber,
      ...calculation,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryRefundStore.set(id, result);

    auditService.log({
      action: 'REFUND_CALCULATED',
      entityName: 'refund_requests',
      entityId: id,
      newState: {
        requestNumber,
        studentRoll: student.rollNumber,
        netRefundPaise: result.netRefundPaise.toString(),
        deadline: result.statutory10DayDeadline,
      },
    });

    return result;
  }

  async submitRefundRequest(requestId: string, reason?: string): Promise<RefundCalculationResult> {
    const record = inMemoryRefundStore.get(requestId);
    if (!record) throw new NotFoundError('Refund calculation record not found.');

    if (record.status !== 'CALCULATED') {
      throw new BadRequestError(`Cannot submit refund request with status '${record.status}'.`);
    }

    record.status = 'REQUESTED';
    record.updatedAt = new Date().toISOString();

    auditService.log({
      action: 'REFUND_REQUESTED',
      entityName: 'refund_requests',
      entityId: requestId,
      newState: {
        requestNumber: record.requestNumber,
        reason: reason || 'Formal withdrawal request submitted',
      },
    });

    return record;
  }

  async approveRefund(params: {
    requestId: string;
    approvedBy: string;
    approvalNotes?: string;
  }): Promise<RefundCalculationResult> {
    const record = inMemoryRefundStore.get(params.requestId);
    if (!record) throw new NotFoundError('Refund record not found.');

    if (record.status !== 'REQUESTED' && record.status !== 'CALCULATED') {
      throw new BadRequestError(`Cannot approve refund with status '${record.status}'.`);
    }

    const todayStr = getTodayKolkata();
    const isWithinDeadline = todayStr <= record.statutory10DayDeadline;

    record.status = 'APPROVED';
    record.approvedBy = params.approvedBy;
    record.approvalNotes = params.approvalNotes || 'Approved per standard refund policy';
    record.reviewedAt = new Date().toISOString();
    record.isWithin10DayDeadline = isWithinDeadline;
    record.updatedAt = new Date().toISOString();

    auditService.log({
      action: 'REFUND_APPROVED',
      entityName: 'refund_requests',
      entityId: params.requestId,
      newState: {
        requestNumber: record.requestNumber,
        netRefundPaise: record.netRefundPaise.toString(),
        approvedBy: params.approvedBy,
        within10DayDeadline: isWithinDeadline,
      },
    });

    return record;
  }

  async rejectRefund(params: {
    requestId: string;
    rejectedBy: string;
    reason: string;
  }): Promise<RefundCalculationResult> {
    const record = inMemoryRefundStore.get(params.requestId);
    if (!record) throw new NotFoundError('Refund record not found.');

    record.status = 'REJECTED';
    record.approvalNotes = params.reason;
    record.reviewedAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    auditService.log({
      action: 'REFUND_REJECTED',
      entityName: 'refund_requests',
      entityId: params.requestId,
      newState: {
        requestNumber: record.requestNumber,
        rejectedBy: params.rejectedBy,
        reason: params.reason,
      },
    });

    return record;
  }

  async disburseRefund(params: {
    requestId: string;
    disbursedBy: string;
    paymentRef: string;
  }): Promise<RefundCalculationResult> {
    const record = inMemoryRefundStore.get(params.requestId);
    if (!record) throw new NotFoundError('Refund record not found.');

    if (record.status !== 'APPROVED') {
      throw new BadRequestError(`Cannot disburse refund with status '${record.status}'. Must be APPROVED first.`);
    }

    record.status = 'DISBURSED';
    record.disbursedAt = new Date().toISOString();
    record.disbursementPaymentRef = params.paymentRef;
    record.updatedAt = new Date().toISOString();

    auditService.log({
      action: 'REFUND_DISBURSED',
      entityName: 'refund_transactions',
      entityId: params.requestId,
      newState: {
        requestNumber: record.requestNumber,
        disbursedAmountPaise: record.netRefundPaise.toString(),
        paymentRef: params.paymentRef,
        disbursedBy: params.disbursedBy,
      },
    });

    return record;
  }

  getRefundsByStudent(studentId: string): RefundCalculationResult[] {
    return Array.from(inMemoryRefundStore.values()).filter(
      (r) => r.studentId === studentId || r.studentRoll === studentId
    );
  }
}

export const refundService = new RefundService();

