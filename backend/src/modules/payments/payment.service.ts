import crypto from 'node:crypto';
import { feeRepository, inMemoryFeeStore } from '../fees/fee.repository.js';
import { FeeCalculator } from '../fees/fee.calculator.js';
import { PaymentProvider } from './payment.provider.js';
import { mockPaymentProvider } from './adapters/mock.provider.js';
import { razorpayPaymentProvider } from './adapters/razorpay.provider.js';
import { ReceiptService } from './receipt.service.js';
import { reminderService } from '../reminders/reminder.service.js';
import { auditService } from '../audit/audit.service.js';
import {
  CreatePaymentOrderInput,
  PaymentOrderDTO,
  VerifyPaymentInput,
  ReceiptDTO,
  WebhookPayloadParams,
  WebhookProcessingResult,
} from './payment.types.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { getTodayKolkata } from '../../utils/date.js';

export interface PaymentOrderRecord {
  id: string;
  orderRef: string;
  gatewayOrderId: string;
  studentId: string;
  instalmentId: string;
  amountPaise: bigint;
  currency: 'INR';
  status: 'CREATED' | 'PAID' | 'EXPIRED';
  idempotencyKey?: string;
  expiresAt: string;
  createdAt: string;
}

// In-Memory Order & Unmatched stores for local dev/testing
export const inMemoryOrderStore = new Map<string, PaymentOrderRecord>();
export const inMemoryUnmatchedStore = new Map<string, any>();
export const processedWebhookEvents = new Set<string>();

export class PaymentService {
  private getProvider(name?: string): PaymentProvider {
    if (name === 'RAZORPAY' || process.env.PAYMENT_GATEWAY === 'RAZORPAY') {
      return razorpayPaymentProvider;
    }
    return mockPaymentProvider;
  }

  /**
   * Step 1-4: Parent Requests Payment -> Authoritative Validation -> Gateway Order Generation
   * CRITICAL SECURITY: Never trust frontend amounts. Authoritative calculation occurs strictly on backend.
   */
  async createPaymentOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderDTO> {
    // 1. Validate student exists
    const student = await feeRepository.getStudentByIdOrRoll(input.studentId);
    if (!student) {
      throw new NotFoundError(`Student record '${input.studentId}' not found.`);
    }

    // 2. Validate instalment exists and belongs to student
    const instalment = await feeRepository.getInstalmentById(input.instalmentId);
    if (!instalment) {
      throw new NotFoundError(`Fee instalment '${input.instalmentId}' not found.`);
    }

    if (instalment.studentId !== student.id) {
      throw new BadRequestError('Specified instalment does not belong to the selected student.');
    }

    // 3. Authoritatively calculate outstanding amount on server
    const authoritativeOutstanding = FeeCalculator.calculateInstalmentOutstanding(
      instalment.netPayablePaise,
      instalment.settledAmountPaise
    );

    if (authoritativeOutstanding <= 0n) {
      throw new BadRequestError('This instalment has already been fully settled.');
    }

    // 4. Resolve and validate target payment amount
    let targetAmountPaise: bigint;

    if (input.amountPaise !== undefined) {
      const requested = BigInt(input.amountPaise);
      if (requested <= 0n) {
        throw new BadRequestError('Payment amount must be greater than zero.');
      }
      // Strict overpayment rejection
      if (requested > authoritativeOutstanding) {
        throw new BadRequestError(
          `Payment amount (${requested} paise / ₹${Number(requested) / 100}) exceeds the outstanding balance (${authoritativeOutstanding} paise / ₹${Number(authoritativeOutstanding) / 100}). Overpayment is strictly rejected.`
        );
      }
      targetAmountPaise = requested;
    } else {
      // Default to full remaining outstanding
      targetAmountPaise = authoritativeOutstanding;
    }

    // 5. Idempotency Check
    if (input.idempotencyKey) {
      for (const existing of inMemoryOrderStore.values()) {
        if (existing.idempotencyKey === input.idempotencyKey) {
          if (existing.status === 'CREATED') {
            return {
              orderId: existing.gatewayOrderId,
              orderRef: existing.orderRef,
              studentId: existing.studentId,
              instalmentId: existing.instalmentId,
              amountPaise: Number(existing.amountPaise),
              currency: 'INR',
              gatewayKeyId: 'mock_key_companya_jaipur',
              gatewayName: 'MOCK',
              expiresAt: existing.expiresAt,
            };
          }
        }
      }
    }

    // 6. Invoke Payment Provider to create gateway order
    const provider = this.getProvider();
    const orderRef = `ORD-${Date.now()}-${student.rollNumber.replace('STU-', '')}`;
    const orderResult = await provider.createOrder({
      orderRef,
      amountPaise: targetAmountPaise,
      currency: 'INR',
      receiptNumber: ReceiptService.generateReceiptNumber(student.centreCode.replace('JPR-', '')),
      notes: {
        studentId: student.id,
        rollNumber: student.rollNumber,
        instalmentId: instalment.id,
      },
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins expiry

    const orderRecord: PaymentOrderRecord = {
      id: crypto.randomUUID(),
      orderRef,
      gatewayOrderId: orderResult.gatewayOrderId,
      studentId: student.id,
      instalmentId: instalment.id,
      amountPaise: targetAmountPaise,
      currency: 'INR',
      status: 'CREATED',
      idempotencyKey: input.idempotencyKey,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    inMemoryOrderStore.set(orderResult.gatewayOrderId, orderRecord);

    logger.info('Created authoritative payment order', {
      orderId: orderResult.gatewayOrderId,
      amountPaise: targetAmountPaise.toString(),
      studentId: student.id,
    });

    return {
      orderId: orderResult.gatewayOrderId,
      orderRef,
      studentId: student.id,
      instalmentId: instalment.id,
      amountPaise: Number(targetAmountPaise),
      currency: 'INR',
      gatewayKeyId: orderResult.gatewayKeyId,
      gatewayName: provider.name,
      expiresAt,
    };
  }

  /**
   * Step 5-11: Payment Verification, Atomic Settlement, Receipt Generation
   * CRITICAL SECURITY: Never trust frontend success flags. Gateway cryptographic signatures are verified here.
   */
  async verifyAndSettlePayment(input: VerifyPaymentInput): Promise<{
    status: 'SUCCESS';
    receipt: ReceiptDTO;
    allocatedAmountPaise: number;
    newInstalmentOutstandingPaise: number;
  }> {
    // 1. Locate order in database
    const orderRecord = inMemoryOrderStore.get(input.orderId);
    if (!orderRecord) {
      throw new NotFoundError(`Payment order '${input.orderId}' not found.`);
    }

    // 2. Idempotency Check: if order is already settled, return existing receipt
    if (orderRecord.status === 'PAID') {
      const existingPayment = Array.from(inMemoryFeeStore.payments.values()).find(
        (p) => p.transactionRef === orderRecord.orderRef
      );
      if (existingPayment && existingPayment.receipt) {
        return {
          status: 'SUCCESS',
          receipt: existingPayment.receipt as any,
          allocatedAmountPaise: Number(existingPayment.amountPaise),
          newInstalmentOutstandingPaise: 0,
        };
      }
    }

    // 3. Cryptographically verify gateway signature
    const provider = this.getProvider();
    const verification = await provider.verifyPayment({
      orderId: input.orderId,
      paymentId: input.gatewayPaymentId,
      signature: input.signature,
      expectedAmountPaise: orderRecord.amountPaise,
    });

    if (!verification.isValid) {
      // Record failed payment attempt separately (audit trail)
      const failedPaymentId = crypto.randomUUID();
      inMemoryFeeStore.payments.set(failedPaymentId, {
        id: failedPaymentId,
        transactionRef: `FAIL-${Date.now()}-${orderRecord.orderRef}`,
        studentId: orderRecord.studentId,
        gatewayName: provider.name,
        paymentMode: verification.paymentMode,
        amountPaise: orderRecord.amountPaise,
        status: 'FAILED',
        capturedAt: null,
        allocations: [],
      });

      logger.warn('Payment signature verification rejected', {
        orderId: input.orderId,
        reason: verification.errorReason,
      });

      throw new BadRequestError(
        verification.errorReason || 'Payment verification failed. Invalid cryptographic gateway signature.'
      );
    }

    // 4. Duplicate Payment Check
    for (const payment of inMemoryFeeStore.payments.values()) {
      if (payment.transactionRef === orderRecord.orderRef && payment.status === 'SUCCESS') {
        throw new ConflictError('A payment has already been captured and processed for this transaction reference.');
      }
    }

    // 5. Fetch student and instalment for atomic settlement
    const student = await feeRepository.getStudentByIdOrRoll(orderRecord.studentId);
    if (!student) throw new NotFoundError('Student not found during settlement.');

    const instalment = await feeRepository.getInstalmentById(orderRecord.instalmentId);
    if (!instalment) throw new NotFoundError('Instalment not found during settlement.');

    // 6. Over-allocation check
    const currentOutstanding = FeeCalculator.calculateInstalmentOutstanding(
      instalment.netPayablePaise,
      instalment.settledAmountPaise
    );

    if (orderRecord.amountPaise > currentOutstanding) {
      throw new BadRequestError(
        `Over-allocation prevented: Attempting to allocate ${orderRecord.amountPaise} paise against remaining balance of ${currentOutstanding} paise.`
      );
    }

    // 7. Atomic Settlement: Update instalment settled amount
    const newSettledAmount = instalment.settledAmountPaise + orderRecord.amountPaise;
    await feeRepository.updateInstalmentSettledAmount(instalment.id, newSettledAmount);

    // 8. Generate Official Receipt
    const paymentId = crypto.randomUUID();
    const receiptNumber = ReceiptService.generateReceiptNumber(student.centreCode.replace('JPR-', ''));
    const receiptDate = getTodayKolkata();
    const capturedAt = new Date().toISOString();

    const receiptDTO = ReceiptService.createReceiptRecord({
      receiptId: crypto.randomUUID(),
      receiptNumber,
      receiptDate,
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        fullName: student.fullName,
        centreName: student.centreName,
        batchName: student.batchName,
      },
      payment: {
        transactionRef: orderRecord.orderRef,
        gatewayPaymentId: input.gatewayPaymentId,
        paymentMode: verification.paymentMode,
        totalAmountPaise: orderRecord.amountPaise,
        capturedAt,
      },
      instalmentNumber: instalment.instalmentNumber,
    });

    // 9. Record Immutable Payment Record
    inMemoryFeeStore.payments.set(paymentId, {
      id: paymentId,
      transactionRef: orderRecord.orderRef,
      studentId: student.id,
      gatewayName: provider.name,
      paymentMode: verification.paymentMode,
      amountPaise: orderRecord.amountPaise,
      status: 'SUCCESS',
      capturedAt,
      receipt: {
        id: receiptDTO.id,
        receiptNumber: receiptDTO.receiptNumber,
        receiptDate: receiptDTO.receiptDate,
        verificationHash: receiptDTO.verificationHash,
      },
      allocations: [
        {
          instalmentId: instalment.id,
          instalmentNumber: instalment.instalmentNumber,
          allocatedAmountPaise: orderRecord.amountPaise,
        },
      ],
    });

    // Mark order as PAID
    orderRecord.status = 'PAID';

    // Hook: Cancel obsolete reminder jobs upon payment settlement / recalculate partial
    await reminderService.handlePaymentVerified({
      instalmentId: instalment.id,
      allocatedAmountPaise: orderRecord.amountPaise,
    });

    // Hook: Record verified payment in immutable audit log
    await auditService.log({
      action: 'PAYMENT_VERIFIED',
      entityName: 'payments',
      entityId: paymentId,
      newState: {
        transactionRef: orderRecord.orderRef,
        studentRoll: student.rollNumber,
        allocatedAmountPaise: orderRecord.amountPaise.toString(),
        receiptNumber: receiptDTO.receiptNumber,
      },
    });

    const newInstalmentOutstanding = Number(currentOutstanding - orderRecord.amountPaise);

    logger.info('Payment verified and settled successfully', {
      orderId: input.orderId,
      paymentId: input.gatewayPaymentId,
      receiptNumber,
      allocatedPaise: orderRecord.amountPaise.toString(),
    });

    return {
      status: 'SUCCESS',
      receipt: receiptDTO,
      allocatedAmountPaise: Number(orderRecord.amountPaise),
      newInstalmentOutstandingPaise: newInstalmentOutstanding,
    };
  }

  /**
   * Asynchronous Webhook Processor
   * Handles webhook retries, out-of-order events, and unmatched transactions
   */
  async handleWebhook(params: WebhookPayloadParams): Promise<WebhookProcessingResult> {
    const provider = this.getProvider();
    const result = await provider.processWebhook(params);

    if (!result.isHandled) {
      throw new BadRequestError(`Webhook processing rejected: ${result.message}`);
    }

    // Check webhook idempotency (event replay prevention)
    const eventKey = `${result.eventType}:${result.gatewayPaymentId || result.orderId}`;
    if (processedWebhookEvents.has(eventKey)) {
      return {
        isHandled: true,
        eventType: result.eventType,
        message: 'Duplicate webhook event received. Idempotently acknowledged without re-processing.',
      };
    }
    processedWebhookEvents.add(eventKey);

    // If order ID is not present or not found in our database, route to Unmatched Payments Queue
    if (!result.orderId || !inMemoryOrderStore.has(result.orderId)) {
      const unmatchedId = crypto.randomUUID();
      inMemoryUnmatchedStore.set(unmatchedId, {
        id: unmatchedId,
        gatewayPaymentId: result.gatewayPaymentId,
        orderId: result.orderId,
        eventType: result.eventType,
        receivedAt: new Date().toISOString(),
        status: 'UNMATCHED',
        reason: 'Payment captured on gateway without a corresponding internal order record.',
      });

      logger.warn('Unmatched payment transaction moved to Accounts Review Queue', {
        gatewayPaymentId: result.gatewayPaymentId,
        orderId: result.orderId,
      });

      return {
        isHandled: true,
        eventType: result.eventType,
        message: 'Transaction has no matching internal order. Routed to Accounts Review Queue.',
      };
    }

    return {
      isHandled: true,
      eventType: result.eventType,
      orderId: result.orderId,
      gatewayPaymentId: result.gatewayPaymentId,
      status: result.status,
      message: 'Webhook processed successfully.',
    };
  }

  /**
   * Offline Payment Recording for Accounts Executives (Cash, Cheque, DD, NEFT)
   */
  async recordOfflinePayment(params: {
    studentId: string;
    instalmentId: string;
    amountPaise: number;
    paymentMode: 'CASH' | 'CHEQUE' | 'DEMAND_DRAFT' | 'NEFT_RTGS';
    instrumentNumber?: string;
    bankName?: string;
  }): Promise<{ receipt: ReceiptDTO }> {
    const student = await feeRepository.getStudentByIdOrRoll(params.studentId);
    if (!student) throw new NotFoundError('Student not found.');

    const instalment = await feeRepository.getInstalmentById(params.instalmentId);
    if (!instalment) throw new NotFoundError('Instalment not found.');

    const amountPaise = BigInt(params.amountPaise);
    if (amountPaise <= 0n) {
      throw new BadRequestError('Payment amount must be greater than zero.');
    }

    const currentOutstanding = FeeCalculator.calculateInstalmentOutstanding(
      instalment.netPayablePaise,
      instalment.settledAmountPaise
    );

    if (amountPaise > currentOutstanding) {
      throw new BadRequestError(
        `Overpayment rejected: Requested ${amountPaise} paise exceeds outstanding ${currentOutstanding} paise.`
      );
    }

    // Atomic update
    const newSettledAmount = instalment.settledAmountPaise + amountPaise;
    await feeRepository.updateInstalmentSettledAmount(instalment.id, newSettledAmount);

    const paymentId = crypto.randomUUID();
    const transactionRef = `OFF-${Date.now()}-${student.rollNumber.replace('STU-', '')}`;
    const receiptNumber = ReceiptService.generateReceiptNumber(student.centreCode.replace('JPR-', ''));
    const receiptDate = getTodayKolkata();
    const capturedAt = new Date().toISOString();

    const receiptDTO = ReceiptService.createReceiptRecord({
      receiptId: crypto.randomUUID(),
      receiptNumber,
      receiptDate,
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        fullName: student.fullName,
        centreName: student.centreName,
        batchName: student.batchName,
      },
      payment: {
        transactionRef,
        gatewayPaymentId: params.instrumentNumber || transactionRef,
        paymentMode: params.paymentMode,
        totalAmountPaise: amountPaise,
        capturedAt,
      },
      instalmentNumber: instalment.instalmentNumber,
    });

    inMemoryFeeStore.payments.set(paymentId, {
      id: paymentId,
      transactionRef,
      studentId: student.id,
      gatewayName: `OFFLINE_${params.paymentMode}`,
      paymentMode: params.paymentMode,
      amountPaise,
      status: 'SUCCESS',
      capturedAt,
      receipt: {
        id: receiptDTO.id,
        receiptNumber: receiptDTO.receiptNumber,
        receiptDate: receiptDTO.receiptDate,
        verificationHash: receiptDTO.verificationHash,
      },
      allocations: [
        {
          instalmentId: instalment.id,
          instalmentNumber: instalment.instalmentNumber,
          allocatedAmountPaise: amountPaise,
        },
      ],
    });

    return { receipt: receiptDTO };
  }
}

export const paymentService = new PaymentService();

