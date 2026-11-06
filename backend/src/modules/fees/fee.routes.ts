import { Router } from 'express';
import { feeController } from './fee.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// GET /api/fees/ledger/:studentId (Protected by authentication)
router.get(
  '/ledger/:studentId',
  requireAuth,
  feeController.getStudentLedger.bind(feeController)
);

export default router;

