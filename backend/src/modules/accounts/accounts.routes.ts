import { Router } from 'express';
import { accountsController } from './accounts.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';

const router = Router();

// Protect all accounts routes with auth & staff role
router.use(requireAuth);
router.use(requireRole('accounts_executive', 'super_admin'));

router.get('/dashboard/metrics', accountsController.getMetrics.bind(accountsController));
router.get('/dashboard/ageing', accountsController.getAgeing.bind(accountsController));
router.get('/students', accountsController.getStudents.bind(accountsController));
router.get('/unmatched-payments', accountsController.getUnmatched.bind(accountsController));
router.post('/unmatched-payments/reconcile', accountsController.reconcileUnmatched.bind(accountsController));

// Refund Management
router.post('/refunds/calculate', accountsController.calculateRefund.bind(accountsController));
router.post('/refunds/request', accountsController.requestRefund.bind(accountsController));
router.post('/refunds/approve', accountsController.approveRefund.bind(accountsController));
router.post('/refunds/reject', accountsController.rejectRefund.bind(accountsController));
router.post('/refunds/disburse', accountsController.disburseRefund.bind(accountsController));
router.get('/refunds/history/:studentId', accountsController.getRefundHistory.bind(accountsController));

// Reminder Management
router.get('/reminders/logs', accountsController.getReminderLogs.bind(accountsController));
router.post('/reminders/trigger', accountsController.triggerReminder.bind(accountsController));
router.post('/reminders/process-due', accountsController.processDueReminders.bind(accountsController));

// Tally Export
router.get('/export/tally', accountsController.exportTally.bind(accountsController));
router.get('/export/tally/csv', accountsController.exportTallyCsv.bind(accountsController));

// Explainable AI Dropout Risk & Counsellor Review
router.get('/ai-risk/evaluate/:studentId', accountsController.evaluateAiRisk.bind(accountsController));
router.post('/ai-risk/false-positive', accountsController.markAiFalsePositive.bind(accountsController));
router.post('/ai-risk/review', accountsController.reviewAiRisk.bind(accountsController));
router.get('/ai-risk/assessments', accountsController.getAiAssessments.bind(accountsController));
router.get('/ai-risk/counsellor-tasks', accountsController.getCounsellorTasks.bind(accountsController));

// Audit Logs
router.get('/audit/logs', accountsController.getAuditLogs.bind(accountsController));

export default router;

