import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AuthController {
  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestParentOtp(req.body);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyParentOtp(req.body);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async staffLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.staffLogin(req.body);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, req.user, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

