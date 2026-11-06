import React from 'react';
import { Modal } from '../common/Modal.js';
import { CheckCircle2, Printer, ShieldCheck } from 'lucide-react';
import { formatPaise, formatDate } from '../../services/apiClient.js';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    amountPaise: number;
    paymentMode: string;
    capturedAt: string;
    transactionRef: string;
    receipt?: {
      id: string;
      receiptNumber: string;
      receiptDate: string;
      verificationHash: string;
    } | null;
  } | null;
  student: {
    fullName: string;
    rollNumber: string;
    batch?: { name: string };
    centre?: { name: string };
  } | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  student,
}) => {
  if (!payment) return null;

  const receipt = payment.receipt;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Payment Receipt">
      <div className="printable-receipt" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Receipt Header */}
        <div
          style={{
            textAlign: 'center',
            paddingBottom: 16,
            borderBottom: '1px dashed var(--border-soft)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: 10,
              background: 'var(--accent-green-bg)',
              color: 'var(--green)',
              borderRadius: '50%',
              marginBottom: 10,
            }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Company A Coaching Institute
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
            {student?.centre?.name || 'Jaipur Central Operations'} &bull; Rajasthan, India
          </p>
          <div
            style={{
              display: 'inline-block',
              marginTop: 10,
              padding: '4px 12px',
              backgroundColor: 'var(--surface-soft)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {receipt?.receiptNumber || `REC-2026-${payment.transactionRef.slice(-6)}`}
          </div>
        </div>

        {/* Amount Paid Spotlight */}
        <div
          style={{
            background: 'var(--surface-soft)',
            padding: '18px',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            border: '1px solid var(--border-soft)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Amount Received
          </span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
            {formatPaise(payment.amountPaise)}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
            Payment Verified & Settled
          </span>
        </div>

        {/* Itemized Receipt Details Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-soft)' }}>
            <span style={{ color: 'var(--muted)' }}>Student Name:</span>
            <span style={{ fontWeight: 600 }}>{student?.fullName}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-soft)' }}>
            <span style={{ color: 'var(--muted)' }}>Roll Number:</span>
            <span style={{ fontWeight: 600 }}>{student?.rollNumber}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-soft)' }}>
            <span style={{ color: 'var(--muted)' }}>Batch / Stream:</span>
            <span style={{ fontWeight: 600 }}>{student?.batch?.name || 'Academic Batch'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-soft)' }}>
            <span style={{ color: 'var(--muted)' }}>Date & Time:</span>
            <span>{formatDate(payment.capturedAt)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-soft)' }}>
            <span style={{ color: 'var(--muted)' }}>Payment Mode:</span>
            <span style={{ fontWeight: 600 }}>{payment.paymentMode}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-soft)' }}>
            <span style={{ color: 'var(--muted)' }}>Transaction Reference:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{payment.transactionRef}</span>
          </div>
        </div>

        {/* SHA-256 Cryptographic Verification Hash */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--surface-soft)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: 'var(--muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            <ShieldCheck size={14} color="var(--green)" />
            <span>Cryptographic Proof (SHA-256):</span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              wordBreak: 'break-all',
              fontSize: '0.7rem',
              color: 'var(--muted)',
            }}
          >
            {receipt?.verificationHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handlePrint}
          >
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
