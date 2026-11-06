import React, { useState } from 'react';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { Input } from '../common/Input.js';
import { apiClient, formatPaise } from '../../services/apiClient.js';
import { CheckCircle2, AlertTriangle, ArrowRight, Printer } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  instalment: {
    id: string;
    instalmentNumber: number;
    outstandingPaise: number;
    netPayablePaise: number;
  } | null;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  studentId,
  instalment,
  onSuccess,
}) => {
  const [payMode, setPayMode] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmountRupees, setCustomAmountRupees] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD'>('UPI');
  const [step, setStep] = useState<'DETAILS' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('DETAILS');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!instalment) return null;

  const targetAmountPaise =
    payMode === 'FULL'
      ? instalment.outstandingPaise
      : Number(customAmountRupees) * 100 || 0;

  const handleInitiatePayment = async () => {
    if (targetAmountPaise <= 0) {
      setErrorMessage('Please enter an amount greater than zero.');
      return;
    }
    if (targetAmountPaise > instalment.outstandingPaise) {
      setErrorMessage(`Amount cannot exceed outstanding balance of ${formatPaise(instalment.outstandingPaise)}.`);
      return;
    }

    setErrorMessage(null);
    setStep('VERIFYING');

    try {
      // 1. Backend creates authoritative order
      const order = await apiClient.post<any>('/payments/create-order', {
        studentId,
        instalmentId: instalment.id,
        amountPaise: targetAmountPaise,
      });

      // 2. Gateway Handshake Simulation
      const paymentId = `pay_mock_${Date.now()}`;

      // Calculate HMAC signature for deterministic mock provider
      // In production, this signature comes from Razorpay checkout modal
      const secret = 'coaching-institute-mock-secret-jaipur-2026';
      const text = `${order.orderId}|${paymentId}`;
      const signature = await generateClientHmac(secret, text);

      // Brief delay to showcase realistic bank verification state
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 3. Backend verifies signature and settles atomically
      const settlement = await apiClient.post<any>('/payments/verify', {
        orderId: order.orderId,
        gatewayPaymentId: paymentId,
        signature,
      });

      setReceiptData(settlement.receipt);
      setStep('SUCCESS');
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment capture failed.');
      setStep('ERROR');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setStep('DETAILS');
    setReceiptData(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={step === 'SUCCESS' ? 'Payment Receipt' : `Pay Instalment ${instalment.instalmentNumber}`}
    >
      {step === 'DETAILS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Outstanding Due for Milestone</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 4 }}>
              {formatPaise(instalment.outstandingPaise)}
            </div>
          </div>

          <div>
            <label className="form-label">Payment Amount</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
              <button
                type="button"
                className={`btn ${payMode === 'FULL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPayMode('FULL')}
              >
                Full Due ({formatPaise(instalment.outstandingPaise)})
              </button>
              <button
                type="button"
                className={`btn ${payMode === 'CUSTOM' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPayMode('CUSTOM')}
              >
                Custom Partial Amount
              </button>
            </div>
          </div>

          {payMode === 'CUSTOM' && (
            <Input
              label="Enter Custom Amount (₹)"
              type="number"
              placeholder="e.g. 5000"
              value={customAmountRupees}
              onChange={(e) => setCustomAmountRupees(e.target.value)}
              helperText={`Maximum payable: ${formatPaise(instalment.outstandingPaise)}`}
            />
          )}

          <div>
            <label className="form-label">Payment Mode</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px',
                  border: `1px solid ${selectedMethod === 'UPI' ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: selectedMethod === 'UPI' ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="method"
                  checked={selectedMethod === 'UPI'}
                  onChange={() => setSelectedMethod('UPI')}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>UPI (GPay / PhonePe / Paytm / BHIM)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fastest checkout with 0% extra fee</div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px',
                  border: `1px solid ${selectedMethod === 'CARD' ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: selectedMethod === 'CARD' ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="method"
                  checked={selectedMethod === 'CARD'}
                  onChange={() => setSelectedMethod('CARD')}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Debit / Credit Card & NetBanking</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports all major Indian banks</div>
                </div>
              </label>
            </div>
          </div>

          {errorMessage && (
            <div style={{ color: 'var(--accent-crimson)', fontSize: '0.85rem' }}>{errorMessage}</div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleInitiatePayment}
              fullWidth
              size="lg"
              icon={<ArrowRight size={18} />}
            >
              Pay {formatPaise(targetAmountPaise)}
            </Button>
          </div>
        </div>
      )}

      {step === 'VERIFYING' && (
        <div style={{ textAlign: 'center', padding: '36px 16px' }}>
          <div className="loading-spinner" style={{ width: 44, height: 44, margin: '0 auto 20px' }} />
          <h3 style={{ marginBottom: 8 }}>Verifying Payment Authenticity</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Communicating with banking gateway and posting immutable ledger records. Please do not close this window.
          </p>
        </div>
      )}

      {step === 'SUCCESS' && receiptData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <CheckCircle2 size={48} color="var(--accent-green)" style={{ margin: '0 auto 12px' }} />
            <h2>Payment Verified & Settled</h2>
            <p style={{ fontSize: '0.875rem' }}>Official GST-compliant receipt generated.</p>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-secondary)',
              fontSize: '0.875rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Receipt Number:</span>
              <strong className="tabular-nums">{receiptData.receiptNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Student:</span>
              <strong>{receiptData.student?.fullName} ({receiptData.student?.rollNumber})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
              <strong style={{ color: 'var(--accent-green)' }}>
                {formatPaise(receiptData.payment?.totalAmountPaise)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Payment Mode:</span>
              <span>{receiptData.payment?.paymentMode}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Verification Hash:</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {receiptData.verificationHash}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={handlePrint} icon={<Printer size={16} />} fullWidth>
              Print Receipt
            </Button>
            <Button variant="primary" onClick={handleReset} fullWidth>
              Done
            </Button>
          </div>
        </div>
      )}

      {step === 'ERROR' && (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <AlertTriangle size={48} color="var(--accent-crimson)" style={{ margin: '0 auto 12px' }} />
          <h3>Transaction Not Completed</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '8px 0 24px' }}>
            {errorMessage || 'Payment could not be verified by the banking gateway.'}
          </p>
          <Button variant="primary" onClick={() => setStep('DETAILS')} fullWidth>
            Try Again
          </Button>
        </div>
      )}
    </Modal>
  );
};

// Client Web Crypto helper for mock HMAC simulation
async function generateClientHmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const b = new Uint8Array(signature);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}
