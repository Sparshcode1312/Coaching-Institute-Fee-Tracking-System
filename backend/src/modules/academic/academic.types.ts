export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';

export interface AttendanceRecordDTO {
  id: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  centreId: string;
  batchId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  remarks?: string;
  importedAt: string;
}

export interface TestScoreRecordDTO {
  id: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  centreId: string;
  batchId: string;
  testCode: string;
  testName: string;
  testDate: string;
  subjectMarks: Record<string, number>;
  totalMarks: number;
  maxMarks: number;
  batchRank?: number;
  percentile?: number;
  importedAt: string;
}

export interface RowValidationError {
  rowNumber: number;
  rawLine: string;
  errorReason: string;
}

export interface ImportSummaryResult<T> {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  skippedDuplicatesCount: number;
  errors: RowValidationError[];
  previewRows: T[];
  isCommitted: boolean;
  message: string;
}

