import { inMemoryFeeStore } from '../fees/fee.repository.js';
import { FeeCalculator } from '../fees/fee.calculator.js';
import { inMemoryRefundStore } from '../refunds/refund.service.js';
import { getTodayKolkata } from '../../utils/date.js';
import {
  ReportFilterOptions,
  ExecutiveMetricsDTO,
  AgeingAnalysisDTO,
  DetailedStudentDuesRow,
} from './reports.types.js';

export class ReportsService {
  /**
   * Generates real database-driven executive financial metrics with filtering
   */
  async getExecutiveMetrics(filters: ReportFilterOptions = {}): Promise<ExecutiveMetricsDTO> {
    const todayStr = getTodayKolkata();
    const students = this.getFilteredStudents(filters);
    const studentIds = new Set(students.map((s) => s.id));

    let totalBilled = 0n;
    let totalCollected = 0n;
    let totalOverdue = 0n;

    // 1. Calculate Total Billed (strictly 1 assignment per student to avoid double counting)
    for (const studentId of studentIds) {
      const assignment = inMemoryFeeStore.assignments.get(studentId);
      if (assignment) {
        totalBilled += assignment.netFeePaise;
      }
    }

    // 2. Calculate Total Collected and Overdue from instalments
    for (const inst of inMemoryFeeStore.instalments.values()) {
      if (!studentIds.has(inst.studentId)) continue;

      // Filter by date range if specified
      if (filters.startDate && inst.dueDate < filters.startDate) continue;
      if (filters.endDate && inst.dueDate > filters.endDate) continue;

      totalCollected += inst.settledAmountPaise;

      const state = FeeCalculator.evaluateInstalment({
        instalmentNumber: inst.instalmentNumber,
        baseAmountPaise: inst.baseAmountPaise,
        discountAmountPaise: inst.discountAmountPaise,
        allocatedAmountPaise: inst.settledAmountPaise,
        dueDate: inst.dueDate,
        currentDateStr: todayStr,
      });

      // Filter by due status if specified
      if (filters.dueStatus && state.dueStatus !== filters.dueStatus) continue;

      // Overdue must use ACTUAL outstanding amount, not original instalment value
      if (state.dueStatus === 'OVERDUE' && state.outstandingPaise > 0n) {
        totalOverdue += state.outstandingPaise;
      }
    }

    // 3. Outstanding = Billed - Collected
    const totalOutstanding = totalBilled > totalCollected ? totalBilled - totalCollected : 0n;

    // 4. Collection Percentage
    const collectionPercentage =
      totalBilled > 0n ? Number((totalCollected * 10000n) / totalBilled) / 100 : 0;

    // 5. Total Disbursed Refunds
    let totalRefunds = 0n;
    for (const r of inMemoryRefundStore.values()) {
      if (r.status === 'DISBURSED' && studentIds.has(r.studentId)) {
        totalRefunds += r.netRefundPaise;
      }
    }

    return {
      totalBilledPaise: totalBilled,
      totalCollectedPaise: totalCollected,
      totalOutstandingPaise: totalOutstanding,
      totalOverduePaise: totalOverdue,
      collectionPercentage,
      totalRefundAmountsPaise: totalRefunds,
      activeStudentsCount: students.length,
    };
  }

  /**
   * Generates Ageing Report using actual outstanding amounts into 4 buckets:
   * - Not Due
   * - 1–30 Days Overdue
   * - 31–60 Days Overdue
   * - Above 60 Days Overdue
   */
  async getAgeingReport(filters: ReportFilterOptions = {}): Promise<AgeingAnalysisDTO> {
    const todayStr = getTodayKolkata();
    const students = this.getFilteredStudents(filters);
    const studentIds = new Set(students.map((s) => s.id));

    let notDue = 0n;
    let overdue1To30 = 0n;
    let overdue31To60 = 0n;
    let overdueAbove60 = 0n;

    for (const inst of inMemoryFeeStore.instalments.values()) {
      if (!studentIds.has(inst.studentId)) continue;

      const state = FeeCalculator.evaluateInstalment({
        instalmentNumber: inst.instalmentNumber,
        baseAmountPaise: inst.baseAmountPaise,
        discountAmountPaise: inst.discountAmountPaise,
        allocatedAmountPaise: inst.settledAmountPaise,
        dueDate: inst.dueDate,
        currentDateStr: todayStr,
      });

      // Skip fully settled instalments
      if (state.outstandingPaise <= 0n) continue;

      if (state.dueStatus === 'UPCOMING' || state.dueStatus === 'DUE_TODAY') {
        notDue += state.outstandingPaise;
      } else if (state.dueStatus === 'OVERDUE') {
        if (state.overdueDays <= 30) {
          overdue1To30 += state.outstandingPaise;
        } else if (state.overdueDays <= 60) {
          overdue31To60 += state.outstandingPaise;
        } else {
          overdueAbove60 += state.outstandingPaise;
        }
      }
    }

    const totalOverdue = overdue1To30 + overdue31To60 + overdueAbove60;

    return {
      notDuePaise: notDue,
      overdue1To30DaysPaise: overdue1To30,
      overdue31To60DaysPaise: overdue31To60,
      overdueAbove60DaysPaise: overdueAbove60,
      totalOverduePaise: totalOverdue,
    };
  }

  /**
   * Generates granular student-level dues report with filters
   */
  async getDetailedStudentDues(filters: ReportFilterOptions = {}): Promise<DetailedStudentDuesRow[]> {
    const todayStr = getTodayKolkata();
    const students = this.getFilteredStudents(filters);

    const rows: DetailedStudentDuesRow[] = [];

    for (const student of students) {
      const assignment = inMemoryFeeStore.assignments.get(student.id);
      const instalments = Array.from(inMemoryFeeStore.instalments.values()).filter(
        (i) => i.studentId === student.id
      );

      const totalPaid = instalments.reduce((sum, i) => sum + i.settledAmountPaise, 0n);
      const totalFee = assignment ? assignment.netFeePaise : 0n;
      const outstanding = totalFee > totalPaid ? totalFee - totalPaid : 0n;

      let nextDueDate: string | null = null;
      let maxOverdueDays = 0;
      let overallDueStatus = 'SETTLED';
      let overallPaymentStatus = 'PAID';

      if (totalPaid === 0n) {
        overallPaymentStatus = 'UNPAID';
      } else if (totalPaid < totalFee) {
        overallPaymentStatus = 'PARTIALLY_PAID';
      }

      for (const inst of instalments) {
        const state = FeeCalculator.evaluateInstalment({
          instalmentNumber: inst.instalmentNumber,
          baseAmountPaise: inst.baseAmountPaise,
          discountAmountPaise: inst.discountAmountPaise,
          allocatedAmountPaise: inst.settledAmountPaise,
          dueDate: inst.dueDate,
          currentDateStr: todayStr,
        });

        if (state.outstandingPaise > 0n) {
          if (!nextDueDate || inst.dueDate < nextDueDate) {
            nextDueDate = inst.dueDate;
          }
          if (state.overdueDays > maxOverdueDays) {
            maxOverdueDays = state.overdueDays;
          }
          if (state.dueStatus === 'OVERDUE') {
            overallDueStatus = 'OVERDUE';
          } else if (overallDueStatus !== 'OVERDUE') {
            overallDueStatus = state.dueStatus;
          }
        }
      }

      // Check payment and due status filters
      if (filters.paymentStatus && overallPaymentStatus !== filters.paymentStatus) continue;
      if (filters.dueStatus && overallDueStatus !== filters.dueStatus) continue;

      rows.push({
        studentId: student.id,
        rollNumber: student.rollNumber,
        fullName: student.fullName,
        centreId: student.centreId,
        centreName: student.centreName,
        batchId: student.batchId,
        batchName: student.batchName,
        totalFeePaise: totalFee,
        totalPaidPaise: totalPaid,
        outstandingPaise: outstanding,
        nextDueDate,
        overdueDays: maxOverdueDays,
        dueStatus: overallDueStatus,
        paymentStatus: overallPaymentStatus,
      });
    }

    return rows;
  }

  private getFilteredStudents(filters: ReportFilterOptions) {
    let list = Array.from(inMemoryFeeStore.students.values());

    if (filters.centreId) {
      list = list.filter((s) => s.centreId === filters.centreId);
    }
    if (filters.batchId) {
      list = list.filter((s) => s.batchId === filters.batchId);
    }

    return list;
  }
}

export const reportsService = new ReportsService();

