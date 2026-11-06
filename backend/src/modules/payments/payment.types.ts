export interface CreatePaymentOrderInput {
  studentId: string;
  instalmentId: string;
  amountPaise?: number; // Optional: If omitted, backend defaults to full instalment outstanding
  idempotencyKey?: string;
}

export interface PaymentOrderDTO {
  orderId: string;
  orderRef: string;
  studentId: string;
  instalmentId: string;
  amountPaise: number;
  currency: 'INR';
  gatewayKeyId: string;
  gatewayName: 'MOCK' | 'RAZORPAY';
  expiresAt: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  gatewayPaymentId: string;
  signature: string;
}

export interface VerificationResult {
  isValid: boolean;
  orderId: string;
  gatewayPaymentId: string;
  amountPaise: bigint;
  status: 'SUCCESS' | 'FAILED';
  paymentMode: string;
  errorReason?: string;
}

export interface WebhookPayloadParams {
  rawBody: string;
  signature: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface WebhookProcessingResult {
  isHandled: boolean;
  eventType: string;
  orderId?: string;
  gatewayPaymentId?: string;
  status?: string;
  message: string;
}

export interface PaymentStatusResult {
  gatewayPaymentId: string;
  orderId: string;
  amountPaise: bigint;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  method: string;
}

export interface TaxConfiguration {
  taxRateBasisPoints: number; // e.g. 1800 for 18% GST, 0 for Exempt
  isTaxInclusive: boolean;
  gstin?: string;
  instituteName: string;
  instituteAddress: string;
}

export interface ReceiptDTO {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  student: {
    id: string;
    rollNumber: string;
    fullName: string;
    centreName: string;
    batchName: string;
  };
  payment: {
    transactionRef: string;
    gatewayPaymentId: string;
    paymentMode: string;
    totalAmountPaise: number;
    capturedAt: string;
  };
  instalmentNumber: number;
  taxBreakdown: {
    isTaxInclusive: boolean;
    taxRatePercent: number;
    baseAmountPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    totalTaxPaise: number;
    netTotalPaise: number;
  };
  verificationHash: string;
}

