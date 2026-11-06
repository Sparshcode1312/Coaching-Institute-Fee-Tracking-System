import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service.js';
import { sendSuccess } from '../../utils/response.js';

export class PaymentController {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
      const order = await paymentService.createPaymentOrder({
        ...req.body,
        idempotencyKey,
      });
      sendSuccess(res, order, 201);
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settlement = await paymentService.verifyAndSettlePayment(req.body);
      sendSuccess(res, settlement, 200);
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = (req.headers['x-razorpay-signature'] ||
        req.headers['x-mock-signature'] ||
        '') as string;
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      const result = await paymentService.handleWebhook({
        rawBody,
        signature,
        headers: req.headers,
      });

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async recordOffline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.recordOfflinePayment(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();

