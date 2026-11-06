import { Request, Response, NextFunction } from 'express';
import { accountsService } from './accounts.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AccountsController {
  async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await accountsService.getDashboardMetrics();
      sendSuccess(res, metrics, 200);
    } catch (error) {
      next(error);
    }
  }

  async getAgeing(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ageing = await accountsService.getAgeingReport();
      sendSuccess(res, ageing, 200);
    } catch (error) {
      next(error);
    }
  }

  async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const centreId = req.query.centreId as string | undefined;
      const batchId = req.query.batchId as string | undefined;
      const status = req.query.status as string | undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const result = await accountsService.getStudents({ search, centreId, batchId, status, page, limit });
      sendSuccess(res, result.items, 200, { total: result.total, page, limit });
    } catch (error) {
      next(error);
    }
  }

  async getUnmatched(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await accountsService.getUnmatchedPayments();
      sendSuccess(res, items, 200);
    } catch (error) {
      next(error);
    }
  }

  async reconcileUnmatched(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await accountsService.reconcileUnmatchedPayment(req.body);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async calculateRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await accountsService.calculateRefund(req.body);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async requestRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await accountsService.requestRefund(req.body.requestId, req.body.reason);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async approveRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const approvedBy = (req as any).user?.id || 'accounts-exec-001';
      const result = await accountsService.approveRefund({
        requestId: req.body.requestId,
        approvedBy,
        approvalNotes: req.body.approvalNotes,
      });
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async rejectRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rejectedBy = (req as any).user?.id || 'accounts-exec-001';
      const result = await accountsService.rejectRefund({
        requestId: req.body.requestId,
        rejectedBy,
        reason: req.body.reason || 'Refund rejected by accounts department',
      });
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async disburseRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const disbursedBy = (req as any).user?.id || 'accounts-exec-001';
      const result = await accountsService.disburseRefund({
        requestId: req.body.requestId,
        disbursedBy,
        paymentRef: req.body.paymentRef || `DISB-${Date.now()}`,
      });
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getRefundHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const history = await accountsService.getRefundHistory(studentId);
      sendSuccess(res, history, 200);
    } catch (error) {
      next(error);
    }
  }

  async getReminderLogs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await accountsService.getReminderLogs();
      sendSuccess(res, logs, 200);
    } catch (error) {
      next(error);
    }
  }

  async triggerReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await accountsService.triggerReminder(
        req.body.studentId,
        req.body.channel || 'WHATSAPP',
        req.body.language
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async processDueReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await accountsService.processDueReminders(req.body.currentDateStr);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async exportTally(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const centreId = req.query.centreId as string | undefined;

      const xml = await accountsService.exportTallyXml({ startDate, endDate, centreId });
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="tally_vouchers_companya.xml"');
      res.status(200).send(xml);
    } catch (error) {
      next(error);
    }
  }

  async exportTallyCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const centreId = req.query.centreId as string | undefined;

      const { csv, reconciliation } = await accountsService.exportTallyCsv({ startDate, endDate, centreId });
      if (req.query.format === 'json') {
        sendSuccess(res, { reconciliation, sampleRowsCount: csv.split('\n').length - 1 }, 200);
        return;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tally_vouchers_companya.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }

  async evaluateAiRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const result = await accountsService.evaluateAiRisk(studentId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async markAiFalsePositive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const counsellorId = (req as any).user?.id || 'counsellor-001';
      const result = await accountsService.markAiFalsePositive({
        assessmentId: req.body.assessmentId,
        counsellorId,
        notes: req.body.notes || 'Counsellor verified false positive after guardian consultation.',
      });
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async reviewAiRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const counsellorId = (req as any).user?.id || 'counsellor-001';
      const result = await accountsService.reviewAiRisk({
        assessmentId: req.body.assessmentId,
        counsellorId,
        notes: req.body.notes,
      });
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getAiAssessments(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await accountsService.getAiAssessments();
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getCounsellorTasks(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await accountsService.getCounsellorTasks();
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = req.query.action as string | undefined;
      const entityName = req.query.entityName as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const logs = await accountsService.getAuditLogs({ action, entityName, limit });
      sendSuccess(res, logs, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const accountsController = new AccountsController();

