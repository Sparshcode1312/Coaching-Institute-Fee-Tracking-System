import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required'),
  instalmentId: z.string().trim().min(1, 'Instalment ID is required'),
  amountPaise: z.number().int().positive('Payment amount must be a positive integer in paise').optional(),
  idempotencyKey: z.string().trim().optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().trim().min(1, 'Order ID is required'),
  gatewayPaymentId: z.string().trim().min(1, 'Gateway payment ID is required'),
  signature: z.string().trim().min(1, 'Cryptographic signature is required'),
});

export const offlinePaymentSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required'),
  instalmentId: z.string().trim().min(1, 'Instalment ID is required'),
  amountPaise: z.number().int().positive('Amount must be positive in paise'),
  paymentMode: z.enum(['CASH', 'CHEQUE', 'DEMAND_DRAFT', 'NEFT_RTGS']),
  instrumentNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
});

