export interface ReportFilterOptions {
  centreId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  dueStatus?: string;
}

export interface ExecutiveMetricsDTO {
  totalBilledPaise: bigint;
  totalCollectedPaise: bigint;
  totalOutstandingPaise: bigint;
  totalOverduePaise: bigint;
  collectionPercentage: number;
  totalRefundAmountsPaise: bigint;
  activeStudentsCount: number;
}

export interface AgeingAnalysisDTO {
  notDuePaise: bigint;
  overdue1To30DaysPaise: bigint;
  overdue31To60DaysPaise: bigint;
  overdueAbove60DaysPaise: bigint;
  totalOverduePaise: bigint;
}

export interface DetailedStudentDuesRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  centreId: string;
  centreName: string;
  batchId: string;
  batchName: string;
  totalFeePaise: bigint;
  totalPaidPaise: bigint;
  outstandingPaise: bigint;
  nextDueDate: string | null;
  overdueDays: number;
  dueStatus: string;
  paymentStatus: string;
}

