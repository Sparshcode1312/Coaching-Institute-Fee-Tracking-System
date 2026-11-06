import {
  VerificationResult,
  WebhookPayloadParams,
  WebhookProcessingResult,
  PaymentStatusResult,
} from './payment.types.js';

export interface ProviderOrderParams {
  orderRef: string;
  amountPaise: bigint;
  currency: 'INR';
  receiptNumber: string;
  notes?: Record<string, string>;
}

export interface ProviderOrderResult {
  gatewayOrderId: string;
  amountPaise: bigint;
  currency: 'INR';
  gatewayKeyId: string;
  providerName: 'MOCK' | 'RAZORPAY';
}

export interface ProviderVerifyParams {
  orderId: string;
  paymentId: string;
  signature: string;
  expectedAmountPaise?: bigint;
}

/**
 * Standard Payment Gateway Provider Abstraction.
 * Decouples fee calculation and ledger logic from third-party gateway specifics.
 */
export interface PaymentProvider {
  readonly name: 'MOCK' | 'RAZORPAY';

  /**
   * Generates a cryptographic gateway order.
   */
  createOrder(params: ProviderOrderParams): Promise<ProviderOrderResult>;

  /**
   * Cryptographically verifies payment signature received from client checkout.
   */
  verifyPayment(params: ProviderVerifyParams): Promise<VerificationResult>;

  /**
   * Handles asynchronous webhooks sent from payment gateway.
   */
  processWebhook(params: WebhookPayloadParams): Promise<WebhookProcessingResult>;

  /**
   * Fetches real-time status of a transaction directly from payment gateway.
   */
  getPaymentStatus(gatewayPaymentId: string): Promise<PaymentStatusResult>;
}

