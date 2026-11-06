export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ReviewStatus = 'PENDING_REVIEW' | 'REVIEWED' | 'FALSE_POSITIVE';

export interface DropoutRiskAssessment {
  id: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  centreId: string;
  centreName: string;
  batchId: string;
  batchName: string;
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  contributingReasons: string[];
  metricsBreakdown: {
    financialRiskPoints: number; // Max 40
    attendanceRiskPoints: number; // Max 35
    academicRiskPoints: number; // Max 25
    overdueDays: number;
    attendancePercentage: number;
    recentPercentile: number;
  };
  lastEvaluatedDate: string;
  reviewStatus: ReviewStatus;
  reviewedBy?: string | null;
  counsellorNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface CounsellorTaskDTO {
  id: string;
  assessmentId: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  priority: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedToRole: 'STUDENT_COUNSELLOR';
  actionSummary: string;
  createdAt: string;
}

