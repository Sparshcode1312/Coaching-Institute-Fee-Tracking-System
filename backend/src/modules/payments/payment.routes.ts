import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { validateBody } from '../../middleware/validate.js';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  offlinePaymentSchema,
} from './payment.validator.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';

const router = Router();

// 1. Create Gateway Payment Order (Parent / Authenticated)
router.post(
  '/create-order',
  requireAuth,
  validateBody(createPaymentOrderSchema),
  paymentController.createOrder.bind(paymentController)
);

// 2. Verify Payment Signature & Atomically Settle
router.post(
  '/verify',
  requireAuth,
  validateBody(verifyPaymentSchema),
  paymentController.verifyPayment.bind(paymentController)
);

// 3. Asynchronous Gateway Webhook Ingestion
router.post(
  '/webhook',
  paymentController.handleWebhook.bind(paymentController)
);

// 4. Offline Payment Entry (Accounts Executives & Admins only)
router.post(
  '/offline',
  requireAuth,
  requireRole('accounts_executive', 'super_admin'),
  validateBody(offlinePaymentSchema),
  paymentController.recordOffline.bind(paymentController)
);

export default router;

