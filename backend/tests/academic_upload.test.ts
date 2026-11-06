import { describe, it, expect, beforeEach } from 'vitest';
import {
  academicService,
  inMemoryAttendanceRecords,
  inMemoryTestScoreRecords,
} from '../src/modules/academic/academic.service.js';
import { resetInMemoryFeeStore } from '../src/modules/fees/fee.repository.js';

describe('Academic Bulk CSV Upload & Row-Level Validation', () => {
  beforeEach(() => {
    resetInMemoryFeeStore();
    inMemoryAttendanceRecords.length = 0;
    inMemoryTestScoreRecords.length = 0;
  });

  describe('Attendance CSV Upload Workflow', () => {
    it('validates and previews valid attendance rows without saving', async () => {
      const csv = `rollNumber,date,status,remarks
STU-0412,2026-11-01,PRESENT,Regular
STU-0587,2026-11-01,EXCUSED,Medical leave`;

      const result = await academicService.processAttendanceCsv({
        centreId: 'c1111111-1111-1111-1111-111111111111',
        batchId: 'ALL',
        csvContent: csv,
        commit: false, // Preview mode
      });

      expect(result.totalRows).toBe(2);
      expect(result.validRowsCount).toBe(2);
      expect(result.invalidRowsCount).toBe(0);
      expect(result.isCommitted).toBe(false);
      expect(inMemoryAttendanceRecords).toHaveLength(0); // Not saved in preview mode
    });

    it('rejects invalid rows safely with row numbers and exact error reasons', async () => {
      const csv = `rollNumber,date,status,remarks
STU-0412,2026-11-01,PRESENT,Good
STU-9999,2026-11-01,PRESENT,Non-existent
STU-0587,2026-11-01,INVALID_STATUS,Wrong status
STU-0412,invalid-date,PRESENT,Wrong date`;

      const result = await academicService.processAttendanceCsv({
        centreId: 'c1111111-1111-1111-1111-111111111111',
        batchId: 'ALL',
        csvContent: csv,
        commit: false,
      });

      expect(result.validRowsCount).toBe(1);
      expect(result.invalidRowsCount).toBe(3);

      const errorMessages = result.errors.map((e) => e.errorReason);
      expect(errorMessages.some((msg) => msg.includes('does not exist in institute registry'))).toBe(true);
      expect(errorMessages.some((msg) => msg.includes('Allowed values: PRESENT, ABSENT, EXCUSED'))).toBe(true);
      expect(errorMessages.some((msg) => msg.includes('Expected YYYY-MM-DD'))).toBe(true);
    });

    it('commits valid rows to database store and skips duplicate imports', async () => {
      const csv = `rollNumber,date,status,remarks
STU-0412,2026-10-20,PRESENT,First Session`;

      // 1. Initial import with commit: true
      const firstImport = await academicService.processAttendanceCsv({
        centreId: 'ALL',
        batchId: 'ALL',
        csvContent: csv,
        commit: true,
      });

      expect(firstImport.validRowsCount).toBe(1);
      expect(firstImport.isCommitted).toBe(true);
      expect(inMemoryAttendanceRecords).toHaveLength(1);

      // 2. Re-importing same date for same student must be skipped as duplicate
      const duplicateImport = await academicService.processAttendanceCsv({
        centreId: 'ALL',
        batchId: 'ALL',
        csvContent: csv,
        commit: true,
      });

      expect(duplicateImport.skippedDuplicatesCount).toBe(1);
      expect(duplicateImport.validRowsCount).toBe(0);
      expect(inMemoryAttendanceRecords).toHaveLength(1); // No duplicate record added
    });
  });

  describe('Test Scores CSV Upload Workflow', () => {
    it('validates score range and rejects scores exceeding maxMarks or negative marks', async () => {
      const csv = `rollNumber,testCode,testName,testDate,physics,chemistry,mathematics,totalMarks,maxMarks
STU-0412,JEE-MOCK-04,JEE Advance Test 4,2026-11-02,70,80,90,240,300
STU-0587,JEE-MOCK-04,JEE Advance Test 4,2026-11-02,90,95,95,350,300
STU-0219,JEE-MOCK-04,JEE Advance Test 4,2026-11-02,-10,50,50,90,300`;

      const result = await academicService.processTestScoresCsv({
        centreId: 'ALL',
        batchId: 'ALL',
        csvContent: csv,
        commit: false,
      });

      expect(result.validRowsCount).toBe(1); // Only row 1 is valid
      expect(result.invalidRowsCount).toBe(2);

      const err2 = result.errors.find((e) => e.rowNumber === 3);
      expect(err2?.errorReason).toContain('cannot exceed max marks');

      const err3 = result.errors.find((e) => e.rowNumber === 4);
      expect(err3?.errorReason).toContain('cannot be negative');
    });

    it('persists valid test score records and computes percentile on commit', async () => {
      const csv = `rollNumber,testCode,testName,testDate,physics,chemistry,mathematics,totalMarks,maxMarks
STU-0412,JEE-MOCK-05,JEE Advance Test 5,2026-11-04,80,85,95,260,300`;

      const result = await academicService.processTestScoresCsv({
        centreId: 'ALL',
        batchId: 'ALL',
        csvContent: csv,
        commit: true,
      });

      expect(result.validRowsCount).toBe(1);
      expect(result.isCommitted).toBe(true);
      expect(inMemoryTestScoreRecords).toHaveLength(1);

      const saved = inMemoryTestScoreRecords[0];
      expect(saved.totalMarks).toBe(260);
      expect(saved.percentile).toBe(86.7); // (260/300) * 100
    });
  });
});

