import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MockPaymentProvider } from '../src/modules/payments/adapters/mock.provider.js';
import { inMemoryFeeStore, resetInMemoryFeeStore } from '../src/modules/fees/fee.repository.js';
import { inMemoryUnmatchedStore } from '../src/modules/payments/payment.service.js';

describe('Payment Engine: Security, Allocation, Receipts & Webhooks', () => {
  const app = createApp();
  const parentAuthHeader = 'Bearer test-token-parent-9829010587';
  const accountsAuthHeader = 'Bearer test-token-accounts-staff';

  beforeEach(() => {
    resetInMemoryFeeStore();
  });

  // Target Student: Ishita Sharma (STU-0587) has instalment 1 with ₹15,000 remaining outstanding
  const studentId = 's0587000-0000-0000-0000-000000000587';
  const instalmentId = 'i0587000-0000-0000-0000-000000000587';

  describe('Payment Order Creation & Authoritative Amounts', () => {
    it('creates gateway payment order using authoritative outstanding balance', async () => {
      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', parentAuthHeader)
        .send({
          studentId,
          instalmentId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toMatch(/^order_mock_/);
      expect(res.body.data.currency).toBe('INR');
      // Authoritative calculation: ₹15,000 remaining = 1500000 paise
      expect(res.body.data.amountPaise).toBe(1500000);
    });

    it('REJECTS overpayment when requested amount exceeds instalment outstanding', async () => {
      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', parentAuthHeader)
        .send({
          studentId,
          instalmentId,
          amountPaise: 2500000, // ₹25,000 requested, but only ₹15,000 is outstanding!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('exceeds the outstanding balance');
    });

    it('rejects order creation for fully settled instalment', async () => {
      const settledInstalmentId = 'i0412000-0000-0000-0000-000000000412'; // Aarav Meena's fully settled instalment

      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', 'Bearer test-token-parent-9829010412')
        .send({
          studentId: 's0412000-0000-0000-0000-000000000412',
          instalmentId: settledInstalmentId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already been fully settled');
    });
  });

  describe('Cryptographic Signature Verification & Failed Payments', () => {
    it('REJECTS invalid / forged signature and logs payment attempt as FAILED', async () => {
      // 1. Create order for ₹5,000 partial payment
      const orderRes = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', parentAuthHeader)
        .send({
          studentId,
          instalmentId,
          amountPaise: 500000, // ₹5,000
        });

      const orderId = orderRes.body.data.orderId;
      const fakePaymentId = 'pay_mock_fraudulent_123';
      const forgedSignature = 'forged_fake_signature_hash_0000';

      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', parentAuthHeader)
        .send({
          orderId,
          gatewayPaymentId: fakePaymentId,
          signature: forgedSignature,
        });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.success).toBe(false);
      expect(verifyRes.body.error.message).toContain('signature');

      // Verify that instalment balance was NOT deducted
      const inst = inMemoryFeeStore.instalments.get(instalmentId);
      expect(inst?.settledAmountPaise).toBe(1500000n); // Unaltered!
    });
  });

  describe('Partial Payment, Full Settlement & Receipt Generation', () => {
    it('processes partial payment of ₹5,000, updates instalment to PARTIALLY_PAID, and generates receipt', async () => {
      // 1. Create partial payment order for ₹5,000
      const orderRes = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', parentAuthHeader)
        .send({
          studentId,
          instalmentId,
          amountPaise: 500000,
        });

      const orderId = orderRes.body.data.orderId;
      const paymentId = `pay_mock_partial_${Date.now()}`;
      const validSignature = MockPaymentProvider.generateMockSignature(orderId, paymentId);

      // 2. Submit payment result with authentic signature
      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', parentAuthHeader)
        .send({
          orderId,
          gatewayPaymentId: paymentId,
          signature: validSignature,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.status).toBe('SUCCESS');
      expect(verifyRes.body.data.allocatedAmountPaise).toBe(500000);
      expect(verifyRes.body.data.newInstalmentOutstandingPaise).toBe(1000000); // ₹10,000 remains

      // Receipt Verification
      const receipt = verifyRes.body.data.receipt;
      expect(receipt.receiptNumber).toMatch(/^REC-\d{4}-C\d+-\d{6}$/);
      expect(receipt.student.rollNumber).toBe('STU-0587');
      expect(receipt.student.fullName).toBe('Ishita Sharma');
      expect(receipt.payment.totalAmountPaise).toBe(500000);
      expect(receipt.verificationHash).toBeDefined();
      expect(receipt.taxBreakdown).toBeDefined();

      // Verify database state updated atomically
      const inst = inMemoryFeeStore.instalments.get(instalmentId);
      expect(inst?.settledAmountPaise).toBe(2000000n); // 15,000 + 5,000 = 20,000
    });

    it('settles remaining ₹15,000 balance, marking instalment PAID and SETTLED', async () => {
      // 1. Create order for remaining ₹15,000
      const orderRes = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', parentAuthHeader)
        .send({
          studentId,
          instalmentId,
          amountPaise: 1500000,
        });

      const orderId = orderRes.body.data.orderId;
      const paymentId = `pay_mock_full_${Date.now()}`;
      const validSignature = MockPaymentProvider.generateMockSignature(orderId, paymentId);

      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', parentAuthHeader)
        .send({
          orderId,
          gatewayPaymentId: paymentId,
          signature: validSignature,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('SUCCESS');
      expect(verifyRes.body.data.newInstalmentOutstandingPaise).toBe(0);

      // Verify instalment is now fully settled (30,000 settled of 30,000 net payable)
      const inst = inMemoryFeeStore.instalments.get(instalmentId);
      expect(inst?.settledAmountPaise).toBe(3000000n);
    });
  });

  describe('Duplicate Payment Prevention & Idempotency', () => {
    it('returns cached settlement on duplicate payment submission', async () => {
      // 1. Create order
      const targetStudent = 's0219000-0000-0000-0000-000000000219';
      const targetInst = 'i0219000-0000-0000-0000-000000000219';

      const orderRes = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', 'Bearer test-token-parent-9829010219')
        .send({
          studentId: targetStudent,
          instalmentId: targetInst,
          amountPaise: 1000000,
        });

      const orderId = orderRes.body.data.orderId;
      const paymentId = `pay_mock_idem_${Date.now()}`;
      const validSignature = MockPaymentProvider.generateMockSignature(orderId, paymentId);

      // First submission
      const firstRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', 'Bearer test-token-parent-9829010219')
        .send({ orderId, gatewayPaymentId: paymentId, signature: validSignature });

      expect(firstRes.status).toBe(200);

      // Duplicate submission with same orderId
      const secondRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', 'Bearer test-token-parent-9829010219')
        .send({ orderId, gatewayPaymentId: paymentId, signature: validSignature });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.data.status).toBe('SUCCESS');
      expect(secondRes.body.data.receipt.receiptNumber).toBe(firstRes.body.data.receipt.receiptNumber);
    });
  });

  describe('Asynchronous Webhook Processing & Unmatched Queue', () => {
    it('idempotently handles webhook retries without duplicate allocations', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_test_99',
              order_id: 'order_mock_active_123',
            },
          },
        },
      };
      const rawBody = JSON.stringify(payload);
      const secret = process.env.MOCK_PAYMENT_SECRET || 'coaching-institute-mock-secret-jaipur-2026';
      const crypto = await import('node:crypto');
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      // First delivery
      const firstRes = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-mock-signature', signature)
        .send(payload);

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.success).toBe(true);

      // Retry delivery with same event
      const retryRes = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-mock-signature', signature)
        .send(payload);

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.message).toContain('Duplicate webhook event received');
    });

    it('routes unmatched transactions with no internal order to Accounts Review Queue', async () => {
      const unmatchedPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_orphan_gateway_999',
              order_id: 'order_unknown_external_888',
            },
          },
        },
      };
      const rawBody = JSON.stringify(unmatchedPayload);
      const secret = process.env.MOCK_PAYMENT_SECRET || 'coaching-institute-mock-secret-jaipur-2026';
      const crypto = await import('node:crypto');
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-mock-signature', signature)
        .send(unmatchedPayload);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('Routed to Accounts Review Queue');

      // Verify it exists in unmatched queue
      const queuedItems = Array.from(inMemoryUnmatchedStore.values());
      const orphanItem = queuedItems.find((q) => q.gatewayPaymentId === 'pay_orphan_gateway_999');
      expect(orphanItem).toBeDefined();
      expect(orphanItem.status).toBe('UNMATCHED');
    });
  });

  describe('Offline Payment Entry (Cash / Cheque / DD / NEFT)', () => {
    it('allows Accounts Executive to record verified offline payment', async () => {
      const targetStudent = 's0219000-0000-0000-0000-000000000219';
      const targetInst = 'i0219000-0000-0000-0000-000000000219';

      const res = await request(app)
        .post('/api/v1/payments/offline')
        .set('Authorization', accountsAuthHeader)
        .send({
          studentId: targetStudent,
          instalmentId: targetInst,
          amountPaise: 1000000, // ₹10,000 Demand Draft
          paymentMode: 'DEMAND_DRAFT',
          instrumentNumber: 'DD-SBI-987654',
          bankName: 'State Bank of India',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipt.payment.paymentMode).toBe('DEMAND_DRAFT');
      expect(res.body.data.receipt.payment.totalAmountPaise).toBe(1000000);
      expect(res.body.data.receipt.receiptNumber).toMatch(/^REC-\d{4}-C\d+-\d{6}$/);
    });

    it('blocks parents from recording offline payments with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/payments/offline')
        .set('Authorization', parentAuthHeader)
        .send({
          studentId: 's0219000-0000-0000-0000-000000000219',
          instalmentId: 'i0219000-0000-0000-0000-000000000219',
          amountPaise: 1000000,
          paymentMode: 'CASH',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
