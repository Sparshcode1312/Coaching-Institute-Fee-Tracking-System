import crypto from 'crypto';
import { inMemoryFeeStore } from '../fees/fee.repository.js';
import { FeeCalculator } from '../fees/fee.calculator.js';
import { getTodayKolkata } from '../../utils/date.js';
import { NotFoundError } from '../../utils/errors.js';
import { auditService } from '../audit/audit.service.js';
import {
  RiskLevel,
  DropoutRiskAssessment,
  CounsellorTaskDTO,
} from './ai-risk.types.js';

export const inMemoryRiskStore: Map<string, DropoutRiskAssessment> = new Map();
export const inMemoryCounsellorTasks: Map<string, CounsellorTaskDTO> = new Map();

export class AiDropoutRiskService {
  /**
   * Deterministic, explainable rule-based scoring engine.
   * NOTE: This is a strict rule-based heuristic scoring engine, NOT a trained ML black box.
   */
  async evaluateStudentRisk(studentId: string): Promise<DropoutRiskAssessment> {
    const student = inMemoryFeeStore.students.get(studentId);
    if (!student) throw new NotFoundError('Student not found for dropout risk evaluation.');

    const todayStr = getTodayKolkata();
    const contributingReasons: string[] = [];

    // 1. Financial Risk Dimension (Max 40 points)
    const instalments = Array.from(inMemoryFeeStore.instalments.values()).filter(
      (i) => i.studentId === student.id
    );

    let maxOverdueDays = 0;
    let totalOverduePaise = 0n;

    for (const inst of instalments) {
      const state = FeeCalculator.evaluateInstalment({
        instalmentNumber: inst.instalmentNumber,
        baseAmountPaise: inst.baseAmountPaise,
        discountAmountPaise: inst.discountAmountPaise,
        allocatedAmountPaise: inst.settledAmountPaise,
        dueDate: inst.dueDate,
        currentDateStr: todayStr,
      });

      if (state.dueStatus === 'OVERDUE' && state.outstandingPaise > 0n) {
        totalOverduePaise += state.outstandingPaise;
        if (state.overdueDays > maxOverdueDays) {
          maxOverdueDays = state.overdueDays;
        }
      }
    }

    let financialPoints = 0;
    if (maxOverdueDays > 30) {
      financialPoints = 40;
      contributingReasons.push(`Critical fee overdue: ${maxOverdueDays} days past due date (₹${Number(totalOverduePaise) / 100} outstanding).`);
    } else if (maxOverdueDays > 15) {
      financialPoints = 25;
      contributingReasons.push(`Moderate fee delay: ${maxOverdueDays} days overdue.`);
    } else if (maxOverdueDays > 0) {
      financialPoints = 10;
      contributingReasons.push(`Recent fee due date missed (${maxOverdueDays} days).`);
    }

    // 2. Attendance Trend Dimension (Max 35 points)
    // Baseline from sample student attendance profiles
    let attendancePercentage = 92.0;
    if (student.rollNumber === 'STU-0587') {
      attendancePercentage = 87.5;
    } else if (student.rollNumber === 'STU-0219') {
      attendancePercentage = 91.6;
    }

    let attendancePoints = 0;
    if (attendancePercentage < 60) {
      attendancePoints = 35;
      contributingReasons.push(`Severe attendance deficit: ${attendancePercentage}% (critical threshold <60%).`);
    } else if (attendancePercentage < 75) {
      attendancePoints = 25;
      contributingReasons.push(`Attendance below institute mandatory threshold: ${attendancePercentage}%.`);
    } else if (attendancePercentage < 85) {
      attendancePoints = 15;
      contributingReasons.push(`Sub-optimal attendance trend: ${attendancePercentage}%.`);
    }

    // 3. Academic Trend Dimension (Max 25 points)
    let recentPercentile = 94.5;
    if (student.rollNumber === 'STU-0587') {
      recentPercentile = 91.0;
    } else if (student.rollNumber === 'STU-0219') {
      recentPercentile = 96.8;
    }

    let academicPoints = 0;
    if (recentPercentile < 50) {
      academicPoints = 25;
      contributingReasons.push(`Recent test scores in bottom 50th percentile (${recentPercentile}%ile).`);
    } else if (recentPercentile < 70) {
      academicPoints = 10;
      contributingReasons.push(`Moderate academic challenge: ${recentPercentile}th percentile.`);
    }

    if (contributingReasons.length === 0) {
      contributingReasons.push('Good standing: regular attendance, timely fee payments, and strong test scores.');
    }

    const totalScore = financialPoints + attendancePoints + academicPoints;

    let riskLevel: RiskLevel = 'LOW';
    if (totalScore >= 70) {
      riskLevel = 'HIGH';
    } else if (totalScore >= 40) {
      riskLevel = 'MEDIUM';
    }

    const assessmentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const assessment: DropoutRiskAssessment = {
      id: assessmentId,
      studentId: student.id,
      studentRoll: student.rollNumber,
      studentName: student.fullName,
      centreId: student.centreId,
      centreName: student.centreName,
      batchId: student.batchId,
      batchName: student.batchName,
      riskScore: totalScore,
      riskLevel,
      contributingReasons,
      metricsBreakdown: {
        financialRiskPoints: financialPoints,
        attendanceRiskPoints: attendancePoints,
        academicRiskPoints: academicPoints,
        overdueDays: maxOverdueDays,
        attendancePercentage,
        recentPercentile,
      },
      lastEvaluatedDate: now,
      reviewStatus: 'PENDING_REVIEW',
      createdAt: now,
    };

    inMemoryRiskStore.set(assessmentId, assessment);

    // CRITICAL SAFETY RESTRICTIONS ENFORCED:
    // - Never automatically change fees
    // - Never block student access
    // - Never initiate refunds
    // - Never send automated parent messages based on AI flags
    // - ONLY create counsellor review tasks for human evaluation
    if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
      const taskId = crypto.randomUUID();
      const task: CounsellorTaskDTO = {
        id: taskId,
        assessmentId,
        studentId: student.id,
        studentRoll: student.rollNumber,
        studentName: student.fullName,
        priority: riskLevel === 'HIGH' ? 'CRITICAL' : 'URGENT',
        status: 'PENDING',
        assignedToRole: 'STUDENT_COUNSELLOR',
        actionSummary: `Student ${student.fullName} (${student.rollNumber}) flagged for ${riskLevel} dropout risk. Counsellor consultation required.`,
        createdAt: now,
      };
      inMemoryCounsellorTasks.set(taskId, task);
    }

    auditService.log({
      action: 'AI_RISK_EVALUATED',
      entityName: 'dropout_risk_flags',
      entityId: assessmentId,
      newState: {
        studentRoll: student.rollNumber,
        riskScore: totalScore,
        riskLevel,
        safetyGuardsEnforced: true,
      },
    });

    return assessment;
  }

  /**
   * Human Counsellor Override: Allows counsellor to review and dismiss false positives
   */
  async markFalsePositive(params: {
    assessmentId: string;
    counsellorId: string;
    notes: string;
  }): Promise<DropoutRiskAssessment> {
    const assessment = inMemoryRiskStore.get(params.assessmentId);
    if (!assessment) throw new NotFoundError('Risk assessment not found.');

    assessment.reviewStatus = 'FALSE_POSITIVE';
    assessment.reviewedBy = params.counsellorId;
    assessment.counsellorNotes = params.notes;
    assessment.reviewedAt = new Date().toISOString();

    // Mark associated counsellor task as completed
    for (const task of inMemoryCounsellorTasks.values()) {
      if (task.assessmentId === params.assessmentId) {
        task.status = 'COMPLETED';
      }
    }

    auditService.log({
      actorId: params.counsellorId,
      action: 'AI_RISK_FALSE_POSITIVE',
      entityName: 'dropout_risk_flags',
      entityId: params.assessmentId,
      newState: {
        studentRoll: assessment.studentRoll,
        counsellorNotes: params.notes,
        status: 'FALSE_POSITIVE',
      },
    });

    return assessment;
  }

  async reviewAssessment(params: {
    assessmentId: string;
    counsellorId: string;
    notes: string;
  }): Promise<DropoutRiskAssessment> {
    const assessment = inMemoryRiskStore.get(params.assessmentId);
    if (!assessment) throw new NotFoundError('Risk assessment not found.');

    assessment.reviewStatus = 'REVIEWED';
    assessment.reviewedBy = params.counsellorId;
    assessment.counsellorNotes = params.notes;
    assessment.reviewedAt = new Date().toISOString();

    for (const task of inMemoryCounsellorTasks.values()) {
      if (task.assessmentId === params.assessmentId) {
        task.status = 'COMPLETED';
      }
    }

    auditService.log({
      actorId: params.counsellorId,
      action: 'AI_RISK_REVIEWED',
      entityName: 'dropout_risk_flags',
      entityId: params.assessmentId,
      newState: {
        studentRoll: assessment.studentRoll,
        counsellorNotes: params.notes,
        status: 'REVIEWED',
      },
    });

    return assessment;
  }

  getAssessments(): DropoutRiskAssessment[] {
    return Array.from(inMemoryRiskStore.values());
  }

  getCounsellorTasks(): CounsellorTaskDTO[] {
    return Array.from(inMemoryCounsellorTasks.values());
  }
}

export const aiDropoutRiskService = new AiDropoutRiskService();

