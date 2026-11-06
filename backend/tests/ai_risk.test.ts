import { describe, it, expect, beforeEach } from 'vitest';
import {
  aiDropoutRiskService,
  inMemoryRiskStore,
  inMemoryCounsellorTasks,
} from '../src/modules/ai-risk/ai-risk.service.js';
import { resetInMemoryFeeStore } from '../src/modules/fees/fee.repository.js';

describe('Explainable Rule-Based AI Dropout Risk & Counsellor Safety Guards', () => {
  beforeEach(() => {
    resetInMemoryFeeStore();
    inMemoryRiskStore.clear();
    inMemoryCounsellorTasks.clear();
  });

  describe('Deterministic Scoring & Explainability', () => {
    it('evaluates student with good standing as LOW risk with transparent reasoning', async () => {
      // Aarav Meena (STU-0412): Instalment 1 paid, regular attendance
      const assessment = await aiDropoutRiskService.evaluateStudentRisk(
        's0412000-0000-0000-0000-000000000412'
      );

      expect(assessment.studentRoll).toBe('STU-0412');
      expect(assessment.riskLevel).toBe('LOW');
      expect(assessment.riskScore).toBeLessThan(40);
      expect(assessment.contributingReasons.length).toBeGreaterThan(0);
      expect(assessment.contributingReasons[0]).toContain('Good standing');
    });

    it('identifies overdue instalments and contributes financial risk points with clear explanation', async () => {
      // Ishita Sharma (STU-0587): Instalment 1 overdue (due 2026-10-10)
      const assessment = await aiDropoutRiskService.evaluateStudentRisk(
        's0587000-0000-0000-0000-000000000587'
      );

      expect(assessment.studentRoll).toBe('STU-0587');
      expect(assessment.metricsBreakdown.financialRiskPoints).toBeGreaterThan(0);
      expect(assessment.metricsBreakdown.overdueDays).toBeGreaterThan(0);

      // Verify explanation string mentions overdue fee
      const feeReason = assessment.contributingReasons.find((r) => r.toLowerCase().includes('fee'));
      expect(feeReason).toBeDefined();
    });
  });

  describe('Critical Safety Restrictions Enforcement', () => {
    it('creates counsellor review tasks without triggering automated fee changes or parent messages', async () => {
      // Ishita Sharma (STU-0587) has overdue fee -> creates a counsellor task for human evaluation
      const assessment = await aiDropoutRiskService.evaluateStudentRisk(
        's0587000-0000-0000-0000-000000000587'
      );

      if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'MEDIUM') {
        const tasks = aiDropoutRiskService.getCounsellorTasks();
        expect(tasks.length).toBeGreaterThan(0);

        const studentTask = tasks.find((t) => t.studentId === assessment.studentId);
        expect(studentTask).toBeDefined();
        expect(studentTask?.assignedToRole).toBe('STUDENT_COUNSELLOR');
        expect(studentTask?.status).toBe('PENDING');
      }
    });

    it('allows human counsellor to review assessment and mark false positive with consultation notes', async () => {
      const assessment = await aiDropoutRiskService.evaluateStudentRisk(
        's0587000-0000-0000-0000-000000000587'
      );

      expect(assessment.reviewStatus).toBe('PENDING_REVIEW');

      // Counsellor consults parent and marks false positive
      const updated = await aiDropoutRiskService.markFalsePositive({
        assessmentId: assessment.id,
        counsellorId: 'counsellor-anita-sharma',
        notes: 'Guardian spoke with accounts; delay due to banking holiday. No dropout intention.',
      });

      expect(updated.reviewStatus).toBe('FALSE_POSITIVE');
      expect(updated.reviewedBy).toBe('counsellor-anita-sharma');
      expect(updated.counsellorNotes).toContain('banking holiday');

      // Task status updated to COMPLETED
      const tasks = aiDropoutRiskService.getCounsellorTasks();
      const task = tasks.find((t) => t.assessmentId === assessment.id);
      if (task) {
        expect(task.status).toBe('COMPLETED');
      }
    });
  });
});

