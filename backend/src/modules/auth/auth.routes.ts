import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { requestOtpSchema, verifyOtpSchema, staffLoginSchema } from './auth.validator.js';
import { otpRequestLimiter } from '../../middleware/rateLimiter.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Parent Phone OTP Workflow
router.post(
  '/parent/request-otp',
  otpRequestLimiter,
  validateBody(requestOtpSchema),
  authController.requestOtp.bind(authController)
);

router.post(
  '/parent/verify-otp',
  validateBody(verifyOtpSchema),
  authController.verifyOtp.bind(authController)
);

// Accounts Executive & Staff Credentials Login
router.post(
  '/staff/login',
  validateBody(staffLoginSchema),
  authController.staffLogin.bind(authController)
);

// Current User Profile Verification
router.get(
  '/me',
  requireAuth,
  authController.getCurrentUser.bind(authController)
);

export default router;

