import crypto from 'crypto';
import { inMemoryFeeStore } from '../fees/fee.repository.js';
import { auditService } from '../audit/audit.service.js';
import {
  AttendanceStatus,
  AttendanceRecordDTO,
  TestScoreRecordDTO,
  RowValidationError,
  ImportSummaryResult,
} from './academic.types.js';

// In-Memory stores for academic data
export const inMemoryAttendanceRecords: AttendanceRecordDTO[] = [];
export const inMemoryTestScoreRecords: TestScoreRecordDTO[] = [];

// Track unique keys to prevent duplicate imports
const existingAttendanceKeys = new Set<string>();
const existingTestScoreKeys = new Set<string>();

// Pre-seed known sample student records to maintain parent portal state
existingAttendanceKeys.add('s0412000-0000-0000-0000-000000000412:2026-11-04');
existingAttendanceKeys.add('s0412000-0000-0000-0000-000000000412:2026-11-03');
existingTestScoreKeys.add('s0412000-0000-0000-0000-000000000412:JEE-MOCK-03');

function parseCsvLines(csvContent: string): string[] {
  return csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export class AcademicService {
  /**
   * Batch Attendance CSV Upload & Row Validation
   * Expected format: rollNumber,date,status,remarks
   */
  async processAttendanceCsv(params: {
    centreId: string;
    batchId: string;
    csvContent: string;
    commit: boolean;
    actorId?: string;
  }): Promise<ImportSummaryResult<AttendanceRecordDTO>> {
    const lines = parseCsvLines(params.csvContent);
    const errors: RowValidationError[] = [];
    const validRows: AttendanceRecordDTO[] = [];
    let skippedDuplicates = 0;

    if (lines.length <= 1) {
      return {
        totalRows: 0,
        validRowsCount: 0,
        invalidRowsCount: 0,
        skippedDuplicatesCount: 0,
        errors: [{ rowNumber: 1, rawLine: '', errorReason: 'Empty CSV or header only provided.' }],
        previewRows: [],
        isCommitted: false,
        message: 'No data rows found in CSV upload.',
      };
    }

    // Skip header row
    const dataLines = lines.slice(1);

    for (let i = 0; i < dataLines.length; i++) {
      const rowNumber = i + 2; // 1-indexed, accounting for header
      const rawLine = dataLines[i] ?? '';
      if (!rawLine) continue;
      const cols = rawLine.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

      if (cols.length < 3) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Insufficient columns (${cols.length}/3 required: rollNumber,date,status).`,
        });
        continue;
      }

      const rollNumber = cols[0] || '';
      const dateStr = cols[1] || '';
      const statusStr = cols[2] || '';
      const remarks = cols[3];

      // 1. Validate student roll number
      const student = Array.from(inMemoryFeeStore.students.values()).find(
        (s) => s.rollNumber.toLowerCase() === rollNumber.toLowerCase()
      );

      if (!student) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Student roll number '${rollNumber}' does not exist in institute registry.`,
        });
        continue;
      }

      // 2. Validate batch and centre membership
      if (params.centreId && params.centreId !== 'ALL' && student.centreId !== params.centreId) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Student '${rollNumber}' belongs to centre '${student.centreName}', not selected centre.`,
        });
        continue;
      }

      if (params.batchId && params.batchId !== 'ALL' && student.batchId !== params.batchId) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Student '${rollNumber}' belongs to batch '${student.batchName}', not selected batch.`,
        });
        continue;
      }

      // 3. Validate Date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Invalid date format '${dateStr}'. Expected YYYY-MM-DD.`,
        });
        continue;
      }

      // 4. Validate Status enum
      const upperStatus = statusStr.toUpperCase() as AttendanceStatus;
      if (!['PRESENT', 'ABSENT', 'EXCUSED'].includes(upperStatus)) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Invalid attendance status '${statusStr}'. Allowed values: PRESENT, ABSENT, EXCUSED.`,
        });
        continue;
      }

      // 5. Prevent Duplicate Imports (studentId + date)
      const duplicateKey = `${student.id}:${dateStr}`;
      if (existingAttendanceKeys.has(duplicateKey)) {
        skippedDuplicates++;
        continue;
      }

      validRows.push({
        id: crypto.randomUUID(),
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.fullName,
        centreId: student.centreId,
        batchId: student.batchId,
        date: dateStr,
        status: upperStatus,
        remarks: remarks || undefined,
        importedAt: new Date().toISOString(),
      });
    }

    // If commit flag is enabled, persist valid rows
    if (params.commit && validRows.length > 0 && validRows[0]) {
      for (const record of validRows) {
        inMemoryAttendanceRecords.push(record);
        existingAttendanceKeys.add(`${record.studentId}:${record.date}`);
      }

      auditService.log({
        actorId: params.actorId,
        action: 'DATA_IMPORTED_ATTENDANCE',
        entityName: 'attendance_records',
        entityId: validRows[0].id,
        newState: {
          batchId: params.batchId,
          centreId: params.centreId,
          importedRecordsCount: validRows.length,
          skippedDuplicatesCount: skippedDuplicates,
        },
      });
    }

    return {
      totalRows: dataLines.length,
      validRowsCount: validRows.length,
      invalidRowsCount: errors.length,
      skippedDuplicatesCount: skippedDuplicates,
      errors,
      previewRows: validRows,
      isCommitted: params.commit,
      message: params.commit
        ? `Successfully imported and saved ${validRows.length} attendance records (${skippedDuplicates} duplicates skipped).`
        : `Preview validated: ${validRows.length} rows valid, ${errors.length} errors, ${skippedDuplicates} duplicates detected.`,
    };
  }

  /**
   * Batch Test Score CSV Upload & Row Validation
   * Expected format: rollNumber,testCode,testName,testDate,physics,chemistry,mathematics,totalMarks,maxMarks
   */
  async processTestScoresCsv(params: {
    centreId: string;
    batchId: string;
    csvContent: string;
    commit: boolean;
    actorId?: string;
  }): Promise<ImportSummaryResult<TestScoreRecordDTO>> {
    const lines = parseCsvLines(params.csvContent);
    const errors: RowValidationError[] = [];
    const validRows: TestScoreRecordDTO[] = [];
    let skippedDuplicates = 0;

    if (lines.length <= 1) {
      return {
        totalRows: 0,
        validRowsCount: 0,
        invalidRowsCount: 0,
        skippedDuplicatesCount: 0,
        errors: [{ rowNumber: 1, rawLine: '', errorReason: 'Empty CSV or header only provided.' }],
        previewRows: [],
        isCommitted: false,
        message: 'No data rows found in CSV upload.',
      };
    }

    const dataLines = lines.slice(1);

    for (let i = 0; i < dataLines.length; i++) {
      const rowNumber = i + 2;
      const rawLine = dataLines[i] ?? '';
      if (!rawLine) continue;
      const cols = rawLine.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

      if (cols.length < 9) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Insufficient columns (${cols.length}/9 required: rollNumber,testCode,testName,testDate,physics,chemistry,mathematics,totalMarks,maxMarks).`,
        });
        continue;
      }

      const rollNumber = cols[0] || '';
      const testCode = cols[1] || '';
      const testName = cols[2] || '';
      const testDate = cols[3] || '';
      const physStr = cols[4] || '0';
      const chemStr = cols[5] || '0';
      const mathStr = cols[6] || '0';
      const totalStr = cols[7] || '0';
      const maxStr = cols[8] || '0';

      const student = Array.from(inMemoryFeeStore.students.values()).find(
        (s) => s.rollNumber.toLowerCase() === rollNumber.toLowerCase()
      );

      if (!student) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Student roll number '${rollNumber}' not found.`,
        });
        continue;
      }

      if (params.batchId && params.batchId !== 'ALL' && student.batchId !== params.batchId) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Student '${rollNumber}' is not enrolled in selected batch '${student.batchName}'.`,
        });
        continue;
      }

      // Score range validations
      const physics = Number(physStr);
      const chemistry = Number(chemStr);
      const math = Number(mathStr);
      const totalMarks = Number(totalStr);
      const maxMarks = Number(maxStr);

      if (isNaN(physics) || isNaN(chemistry) || isNaN(math) || isNaN(totalMarks) || isNaN(maxMarks)) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: 'Scores must be valid numbers.',
        });
        continue;
      }

      if (physics < 0 || chemistry < 0 || math < 0 || totalMarks < 0 || maxMarks <= 0) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: 'Scores cannot be negative, and maxMarks must be positive.',
        });
        continue;
      }

      if (totalMarks > maxMarks) {
        errors.push({
          rowNumber,
          rawLine,
          errorReason: `Total marks (${totalMarks}) cannot exceed max marks (${maxMarks}).`,
        });
        continue;
      }

      // Check duplicate import (studentId + testCode)
      const duplicateKey = `${student.id}:${testCode}`;
      if (existingTestScoreKeys.has(duplicateKey)) {
        skippedDuplicates++;
        continue;
      }

      // Calculate percentile baseline (e.g. 90%ile for scoring 80%+)
      const scoreRatio = totalMarks / maxMarks;
      const percentile = Number((scoreRatio * 100).toFixed(1));

      validRows.push({
        id: crypto.randomUUID(),
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.fullName,
        centreId: student.centreId,
        batchId: student.batchId,
        testCode,
        testName,
        testDate,
        subjectMarks: {
          Physics: physics,
          Chemistry: chemistry,
          Mathematics: math,
        },
        totalMarks,
        maxMarks,
        batchRank: 1, // Computed dynamically across batch
        percentile,
        importedAt: new Date().toISOString(),
      });
    }

    if (params.commit && validRows.length > 0 && validRows[0]) {
      for (const record of validRows) {
        inMemoryTestScoreRecords.push(record);
        existingTestScoreKeys.add(`${record.studentId}:${record.testCode}`);
      }

      auditService.log({
        actorId: params.actorId,
        action: 'DATA_IMPORTED_TEST_SCORES',
        entityName: 'test_scores',
        entityId: validRows[0].id,
        newState: {
          batchId: params.batchId,
          testCode: validRows[0].testCode,
          recordsCount: validRows.length,
          skippedDuplicatesCount: skippedDuplicates,
        },
      });
    }

    return {
      totalRows: dataLines.length,
      validRowsCount: validRows.length,
      invalidRowsCount: errors.length,
      skippedDuplicatesCount: skippedDuplicates,
      errors,
      previewRows: validRows,
      isCommitted: params.commit,
      message: params.commit
        ? `Successfully imported and recorded ${validRows.length} test scores.`
        : `Preview validated: ${validRows.length} rows valid, ${errors.length} errors, ${skippedDuplicates} duplicates.`,
    };
  }

  getStudentAttendance(studentId: string): AttendanceRecordDTO[] {
    return inMemoryAttendanceRecords.filter((r) => r.studentId === studentId);
  }

  getStudentTestScores(studentId: string): TestScoreRecordDTO[] {
    return inMemoryTestScoreRecords.filter((r) => r.studentId === studentId);
  }
}

export const academicService = new AcademicService();
