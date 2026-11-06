import crypto from 'node:crypto';
import {
  PaymentProvider,
  ProviderOrderParams,
  ProviderOrderResult,
  ProviderVerifyParams,
} from '../payment.provider.js';
import {
  VerificationResult,
  WebhookPayloadParams,
  WebhookProcessingResult,
  PaymentStatusResult,
} from '../payment.types.js';

// Dedicated secret used strictly on backend for mock cryptographic signature verification
const MOCK_GATEWAY_SECRET = process.env.MOCK_PAYMENT_SECRET || 'coaching-institute-mock-secret-jaipur-2026';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'MOCK' as const;

  // In-memory registry of created orders for state verification
  private activeOrders = new Map<string, { amountPaise: bigint; status: 'CREATED' | 'PAID' }>();

  async createOrder(params: ProviderOrderParams): Promise<ProviderOrderResult> {
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(4).toString('hex');
    const gatewayOrderId = `order_mock_${timestamp}_${randomHex}`;

    this.activeOrders.set(gatewayOrderId, {
      amountPaise: params.amountPaise,
      status: 'CREATED',
    });

    return {
      gatewayOrderId,
      amountPaise: params.amountPaise,
      currency: 'INR',
      gatewayKeyId: 'mock_key_companya_jaipur',
      providerName: 'MOCK',
    };
  }

  /**
   * Helper utility to generate a valid cryptographic signature for a mock payment.
   * Useful for unit tests, QA, and local checkout simulation.
   */
  static generateMockSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', MOCK_GATEWAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  generateMockSignature(orderId: string, paymentId: string, _amountPaise?: bigint): string {
    return MockPaymentProvider.generateMockSignature(orderId, paymentId);
  }

  async verifyPayment(params: ProviderVerifyParams): Promise<VerificationResult> {
    const expectedSignature = MockPaymentProvider.generateMockSignature(params.orderId, params.paymentId);

    // Cryptographic constant-time comparison to prevent timing attacks
    const isSignatureValid =
      params.signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(params.signature), Buffer.from(expectedSignature));

    if (!isSignatureValid) {
      return {
        isValid: false,
        orderId: params.orderId,
        gatewayPaymentId: params.paymentId,
        amountPaise: 0n,
        status: 'FAILED',
        paymentMode: 'ONLINE',
        errorReason: 'Cryptographic signature mismatch. Payment verification rejected.',
      };
    }

    const orderRecord = this.activeOrders.get(params.orderId);
    const amountPaise = orderRecord ? orderRecord.amountPaise : params.expectedAmountPaise || 0n;

    if (orderRecord) {
      orderRecord.status = 'PAID';
    }

    return {
      isValid: true,
      orderId: params.orderId,
      gatewayPaymentId: params.paymentId,
      amountPaise,
      status: 'SUCCESS',
      paymentMode: 'UPI',
    };
  }

  async processWebhook(params: WebhookPayloadParams): Promise<WebhookProcessingResult> {
    try {
      const payload = JSON.parse(params.rawBody);
      const expectedSignature = crypto
        .createHmac('sha256', MOCK_GATEWAY_SECRET)
        .update(params.rawBody)
        .digest('hex');

      const isAuth =
        params.signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(Buffer.from(params.signature), Buffer.from(expectedSignature));

      if (!isAuth) {
        return {
          isHandled: false,
          eventType: payload.event || 'unknown',
          message: 'Webhook signature verification failed',
        };
      }

      return {
        isHandled: true,
        eventType: payload.event,
        orderId: payload.payload?.payment?.entity?.order_id,
        gatewayPaymentId: payload.payload?.payment?.entity?.id,
        status: payload.event === 'payment.captured' ? 'SUCCESS' : 'FAILED',
        message: 'Mock webhook processed successfully',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isHandled: false,
        eventType: 'parse_error',
        message: `Failed to parse webhook: ${msg}`,
      };
    }
  }

  async getPaymentStatus(gatewayPaymentId: string): Promise<PaymentStatusResult> {
    return {
      gatewayPaymentId,
      orderId: 'mock_order_ref',
      amountPaise: 3000000n,
      status: 'SUCCESS',
      method: 'UPI',
    };
  }
}

export const mockPaymentProvider = new MockPaymentProvider();

