import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

// In-Memory store for academic records
const attendanceData: Record<string, { totalClasses: number; attendedClasses: number; percentage: number; recentRecords: any[] }> = {
  's0412000-0000-0000-0000-000000000412': {
    totalClasses: 48,
    attendedClasses: 45,
    percentage: 93.75,
    recentRecords: [
      { date: '2026-11-04', status: 'PRESENT' },
      { date: '2026-11-03', status: 'PRESENT' },
      { date: '2026-11-02', status: 'PRESENT' },
      { date: '2026-10-31', status: 'ABSENT' },
    ],
  },
  's0587000-0000-0000-0000-000000000587': {
    totalClasses: 48,
    attendedClasses: 42,
    percentage: 87.5,
    recentRecords: [
      { date: '2026-11-04', status: 'PRESENT' },
      { date: '2026-11-03', status: 'EXCUSED' },
      { date: '2026-11-02', status: 'PRESENT' },
    ],
  },
  's0219000-0000-0000-0000-000000000219': {
    totalClasses: 48,
    attendedClasses: 44,
    percentage: 91.66,
    recentRecords: [
      { date: '2026-11-04', status: 'PRESENT' },
      { date: '2026-11-03', status: 'PRESENT' },
    ],
  },
};

const testScoresData: Record<string, any[]> = {
  's0412000-0000-0000-0000-000000000412': [
    {
      testCode: 'JEE-MOCK-03',
      testName: 'JEE Advanced Part Syllabus Test 3',
      testDate: '2026-10-25',
      subjectMarks: { Physics: 76, Chemistry: 82, Mathematics: 88 },
      totalMarks: 246,
      maxMarks: 300,
      batchRank: 4,
      percentile: 97.2,
    },
    {
      testCode: 'JEE-MOCK-02',
      testName: 'JEE Mains Monthly Review 2',
      testDate: '2026-09-28',
      subjectMarks: { Physics: 72, Chemistry: 78, Mathematics: 80 },
      totalMarks: 230,
      maxMarks: 300,
      batchRank: 7,
      percentile: 94.5,
    },
  ],
  's0587000-0000-0000-0000-000000000587': [
    {
      testCode: 'JEE-MOCK-03',
      testName: 'JEE Advanced Part Syllabus Test 3',
      testDate: '2026-10-25',
      subjectMarks: { Physics: 68, Chemistry: 74, Mathematics: 75 },
      totalMarks: 217,
      maxMarks: 300,
      batchRank: 12,
      percentile: 91.0,
    },
  ],
  's0219000-0000-0000-0000-000000000219': [
    {
      testCode: 'NEET-MOCK-03',
      testName: 'NEET Botany & Zoology Unit Test',
      testDate: '2026-10-28',
      subjectMarks: { Physics: 145, Chemistry: 155, Biology: 330 },
      totalMarks: 630,
      maxMarks: 720,
      batchRank: 6,
      percentile: 96.8,
    },
  ],
};

router.use(requireAuth);

router.get('/attendance/:studentId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId as string;
    const data = attendanceData[studentId] || {
      totalClasses: 30,
      attendedClasses: 27,
      percentage: 90.0,
      recentRecords: [],
    };
    sendSuccess(res, data, 200);
  } catch (error) {
    next(error);
  }
});

router.get('/test-scores/:studentId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId as string;
    const data = testScoresData[studentId] || [];
    sendSuccess(res, data, 200);
  } catch (error) {
    next(error);
  }
});

import { academicService } from './academic.service.js';

router.post('/attendance/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const centreId = req.body.centreId || 'ALL';
    const batchId = req.body.batchId || 'ALL';
    const csvContent = req.body.csvContent || '';
    const commit = req.body.commit === true || req.body.commit === 'true';
    const actorId = (req as any).user?.id || 'staff-001';

    const result = await academicService.processAttendanceCsv({
      centreId,
      batchId,
      csvContent,
      commit,
      actorId,
    });

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
});

router.post('/test-scores/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const centreId = req.body.centreId || 'ALL';
    const batchId = req.body.batchId || 'ALL';
    const csvContent = req.body.csvContent || '';
    const commit = req.body.commit === true || req.body.commit === 'true';
    const actorId = (req as any).user?.id || 'staff-001';

    const result = await academicService.processTestScoresCsv({
      centreId,
      batchId,
      csvContent,
      commit,
      actorId,
    });

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
});

export default router;
