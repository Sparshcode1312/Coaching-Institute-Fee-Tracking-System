import { Request, Response, NextFunction } from 'express';
import { feeService } from './fee.service.js';
import { feeRepository } from './fee.repository.js';
import { sendSuccess } from '../../utils/response.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';

export class FeeController {
  async getStudentLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const user = req.user;

      // Enforce parent-student isolation: parents may only access their verified linked children
      if (user && user.role === 'parent') {
        const student = await feeRepository.getStudentByIdOrRoll(studentId);
        if (!student) {
          throw new NotFoundError(`Student record not found for identifier '${studentId}'`);
        }
        if (student.parentPhone && user.phone && student.parentPhone !== user.phone) {
          throw new ForbiddenError('Access denied: You are not authorized to view fee records for this student.');
        }
      }

      const ledger = await feeService.getStudentFeeLedger(studentId);
      sendSuccess(res, ledger, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const feeController = new FeeController();

