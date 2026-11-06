import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient, formatPaise, formatDate } from '../../services/apiClient.js';
import { Button } from '../../components/common/Button.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { Modal } from '../../components/common/Modal.js';
import { Input } from '../../components/common/Input.js';
import { LoadingState, ErrorState } from '../../components/common/States.js';
import { AccountsHeader } from '../../components/accounts/AccountsHeader.js';
import {
  ArrowLeft,
  CreditCard,
  RotateCcw,
  Bell,
  FileText,
  GraduationCap,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export const StudentLedgerView: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [ledger, setLedger] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Offline Payment Modal State
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offlineAmount, setOfflineAmount] = useState('');
  const [offlineMode, setOfflineMode] = useState<'CASH' | 'CHEQUE' | 'DEMAND_DRAFT' | 'NEFT_RTGS'>('CASH');
  const [instrumentNo, setInstrumentNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [selectedInstalmentId, setSelectedInstalmentId] = useState('');
  const [offlineLoading, setOfflineLoading] = useState(false);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundPreview, setRefundPreview] = useState<any>(null);
  const [refundDaysAttended, setRefundDaysAttended] = useState('20');
  const [materialReturned, setMaterialReturned] = useState(false);

  const fetchLedger = async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>(`/fees/ledger/${studentId}`);
      setLedger(data);
      const payableInst = data.instalments.find((i: any) => i.outstandingPaise > 0);
      if (payableInst) {
        setSelectedInstalmentId(payableInst.id);
        setOfflineAmount(String(payableInst.outstandingPaise / 100));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load student ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [studentId]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleRecordOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledger) return;
    setOfflineLoading(true);
    try {
      await apiClient.post('/payments/offline', {
        studentId: ledger.student.id,
        instalmentId: selectedInstalmentId,
        amountPaise: Number(offlineAmount) * 100,
        paymentMode: offlineMode,
        instrumentNumber: instrumentNo || undefined,
        bankName: bankName || undefined,
      });

      setIsOfflineModalOpen(false);
      showNotification('Verified offline payment recorded and credited to student ledger.');
      fetchLedger();
    } catch (err: any) {
      alert(err.message || 'Failed to record offline payment');
    } finally {
      setOfflineLoading(false);
    }
  };

  const handleCalculateRefund = async () => {
    if (!ledger) return;
    try {
      const result = await apiClient.post<any>('/accounts/refunds/calculate', {
        studentId: ledger.student.id,
        daysAttended: Number(refundDaysAttended) || 0,
        materialReturned,
      });
      setRefundPreview(result);
    } catch (err: any) {
      alert(err.message || 'Failed to calculate refund');
    }
  };

  const handleSendReminder = async () => {
    if (!ledger) return;
    try {
      await apiClient.post('/accounts/reminders/trigger', {
        studentId: ledger.student.id,
        channel: 'WHATSAPP',
      });
      showNotification(`Automated reminder dispatched via WhatsApp to guardian of ${ledger.student.fullName}`);
    } catch (err: any) {
      alert(err.message || 'Failed to send reminder');
    }
  };

  if (isLoading) return <LoadingState message="Loading complete student financial ledger..." />;
  if (error || !ledger) return <ErrorState message={error || 'Ledger unavailable'} onRetry={fetchLedger} />;

  const { student, financials, instalments, paymentHistory } = ledger;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: 'var(--text)' }}>
      <AccountsHeader />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Navigation Breadcrumb & Page Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/accounts')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '6px 12px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Accounts Overview</span>
          </button>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendReminder}
              icon={<Bell size={14} />}
            >
              Dispatch Reminder
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                handleCalculateRefund();
                setIsRefundModalOpen(true);
              }}
              icon={<RotateCcw size={14} />}
            >
              Refund Calculator
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsOfflineModalOpen(true)}
              icon={<CreditCard size={14} />}
            >
              Record Offline Payment
            </Button>
          </div>
        </div>

        {notification && (
          <div
            style={{
              marginBottom: 24,
              padding: '14px 18px',
              backgroundColor: 'rgba(23, 201, 100, 0.08)',
              border: '1px solid rgba(23, 201, 100, 0.25)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CheckCircle size={18} color="var(--accent-green)" />
            <span>{notification}</span>
          </div>
        )}

        {/* Section 1: Student Information & Financial Health Header */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            marginBottom: 32,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    margin: 0,
                  }}
                >
                  {student.fullName}
                </h1>
                <span
                  style={{
                    padding: '3px 10px',
                    backgroundColor: 'var(--surface-soft)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-pill)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--muted)',
                  }}
                >
                  {student.rollNumber}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(23, 201, 100, 0.1)',
                    color: '#0e7a3d',
                  }}
                >
                  <ShieldCheck size={12} />
                  {student.enrolmentStatus}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  color: 'var(--muted)',
                  fontSize: '0.88rem',
                  marginTop: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GraduationCap size={15} />
                  {student.batch?.name || 'Classroom Batch'} ({student.batch?.stream || 'Target'})
                </span>
                <span>&bull;</span>
                <span>{student.centre?.name || 'Jaipur Campus'}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Verified Paid
              </div>
              <div
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: 'var(--accent-green)',
                  letterSpacing: '-0.02em',
                  marginTop: 2,
                }}
              >
                {formatPaise(financials.totalAmountPaidPaise)}
              </div>
            </div>
          </div>

          {/* Section 2: Fee Financial Metric Summary Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 16,
              marginTop: 28,
              paddingTop: 24,
              borderTop: '1px solid var(--border-soft)',
            }}
          >
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>Original Annual Fee</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 4 }}>
                {formatPaise(financials.originalFeePaise)}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>Approved Discounts</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 4, color: 'var(--muted)' }}>
                {formatPaise(financials.discountsPaise)}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>Final Net Payable</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 4 }}>
                {formatPaise(financials.finalPayableAmountPaise)}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(23, 201, 100, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(23, 201, 100, 0.2)' }}>
              <div style={{ fontSize: '0.78rem', color: '#0e7a3d', fontWeight: 600 }}>Amount Verified & Settled</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 4, color: 'var(--accent-green)' }}>
                {formatPaise(financials.totalAmountPaidPaise)}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: financials.outstandingBalancePaise > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface-soft)', borderRadius: 'var(--radius-md)', border: financials.outstandingBalancePaise > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : 'none' }}>
              <div style={{ fontSize: '0.78rem', color: financials.outstandingBalancePaise > 0 ? 'var(--danger)' : 'var(--muted)', fontWeight: 600 }}>Outstanding Balance</div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginTop: 4,
                  color: financials.outstandingBalancePaise > 0 ? 'var(--danger)' : 'var(--text)',
                }}
              >
                {formatPaise(financials.outstandingBalancePaise)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Milestone Instalment Schedule Table */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Instalment Milestone Schedule
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 2 }}>
                Sequential payment schedule with exact rupee ledger reconciliation
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-soft)', borderBottom: '1px solid var(--border-soft)' }}>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Instalment</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Base Amount</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Net Payable</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Settled</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Outstanding</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Due Date</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Overdue</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Payment Status</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Due Status</th>
                  </tr>
                </thead>
                <tbody>
                  {instalments.map((inst: any, idx: number) => (
                    <tr
                      key={inst.id}
                      style={{
                        borderBottom: idx === instalments.length - 1 ? 'none' : '1px solid var(--border-soft)',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 600 }}>
                        Instalment {inst.instalmentNumber}
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace' }}>
                        {formatPaise(inst.baseAmountPaise)}
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatPaise(inst.netPayablePaise)}
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--accent-green)', fontWeight: 600 }}>
                        {formatPaise(inst.allocatedAmountPaise)}
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: inst.outstandingPaise > 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {formatPaise(inst.outstandingPaise)}
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text)' }}>
                        {formatDate(inst.dueDate)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {inst.overdueDays > 0 ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                            {inst.overdueDays}d
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <StatusBadge status={inst.paymentStatus} />
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <StatusBadge status={inst.dueStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 4: Verified Transaction & Receipt History */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Verified Transaction & Official Receipt History
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 2 }}>
                Double-entry payment vouchers and verifiable cryptographic SHA-256 receipts
              </div>
            </div>
          </div>

          {paymentHistory.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-lg)',
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '0.9rem',
              }}
            >
              No verified transactions recorded on this student ledger yet.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-soft)', borderBottom: '1px solid var(--border-soft)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Transaction Ref</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Payment Mode</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Gateway / Source</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Amount Paid</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Timestamp</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--muted)' }}>Official Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((p: any, idx: number) => (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: idx === paymentHistory.length - 1 ? 'none' : '1px solid var(--border-soft)',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.transactionRef}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              backgroundColor: 'var(--surface-soft)',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                            }}
                          >
                            {p.paymentMode}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--muted)' }}>{p.gatewayName}</td>
                        <td
                          style={{
                            padding: '14px 18px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'var(--accent-green)',
                          }}
                        >
                          {formatPaise(p.amountPaise)}
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--muted)', fontSize: '0.82rem' }}>
                          {p.capturedAt ? new Date(p.capturedAt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {p.receipt ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                alert(
                                  `Company A Official Receipt\n\nReceipt Number: ${p.receipt.receiptNumber}\nVerification SHA-256: ${p.receipt.verificationHash}\nStudent: ${student.fullName} (${student.rollNumber})\nAmount: ${formatPaise(p.amountPaise)}`
                                )
                              }
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
                            >
                              <FileText size={12} />
                              <span>{p.receipt.receiptNumber}</span>
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Offline Payment Recording Modal */}
      <Modal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        title="Record Verified Offline Payment"
      >
        <form onSubmit={handleRecordOfflinePayment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              Target Milestone Instalment
            </label>
            <select
              className="select-box"
              value={selectedInstalmentId}
              onChange={(e) => setSelectedInstalmentId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-soft)',
                backgroundColor: '#ffffff',
                fontSize: '0.9rem',
              }}
            >
              {instalments.map((i: any) => (
                <option key={i.id} value={i.id}>
                  Instalment {i.instalmentNumber} (Outstanding: {formatPaise(i.outstandingPaise)})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Payment Amount (₹ Rupees)"
            type="number"
            value={offlineAmount}
            onChange={(e) => setOfflineAmount(e.target.value)}
            required
          />

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              Payment Instrument
            </label>
            <select
              className="select-box"
              value={offlineMode}
              onChange={(e: any) => setOfflineMode(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-soft)',
                backgroundColor: '#ffffff',
                fontSize: '0.9rem',
              }}
            >
              <option value="CASH">Cash Voucher (Counter Receipt)</option>
              <option value="CHEQUE">Bank Cheque</option>
              <option value="DEMAND_DRAFT">Demand Draft (DD)</option>
              <option value="NEFT_RTGS">Bank Transfer (NEFT/RTGS UTR)</option>
            </select>
          </div>

          {offlineMode !== 'CASH' && (
            <>
              <Input
                label="Instrument / Cheque / UTR Number"
                value={instrumentNo}
                onChange={(e) => setInstrumentNo(e.target.value)}
                placeholder="e.g. UTR-98290123"
                required
              />
              <Input
                label="Bank & Branch Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India, Tonk Road Jaipur"
              />
            </>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setIsOfflineModalOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={offlineLoading} fullWidth>
              Confirm & Post to Ledger
            </Button>
          </div>
        </form>
      </Modal>

      {/* Refund Calculator Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Student Refund Deduction Calculator"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Elapsed Days Attended Since Batch Commencement"
            type="number"
            value={refundDaysAttended}
            onChange={(e) => setRefundDaysAttended(e.target.value)}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={materialReturned}
              onChange={(e) => setMaterialReturned(e.target.checked)}
            />
            <span>Printed study materials returned in mint condition</span>
          </label>

          <Button variant="secondary" size="sm" onClick={handleCalculateRefund}>
            Recalculate Deductions
          </Button>

          {refundPreview && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-soft)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-soft)',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Total Verified Collected:</span>
                <strong>{formatPaise(refundPreview.totalCollectedPaise)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                <span>Non-Refundable Admission Fee:</span>
                <span>- {formatPaise(refundPreview.deductions.registrationFeePaise)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                <span>Prorated Tuition Charge:</span>
                <span>- {formatPaise(refundPreview.deductions.proratedTuitionPaise)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                <span>Study Material Deduction:</span>
                <span>- {formatPaise(refundPreview.deductions.materialKitChargePaise)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTop: '1px solid var(--border-soft)',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                <span>Net Eligible Refund:</span>
                <span style={{ color: 'var(--accent-green)' }}>
                  {formatPaise(refundPreview.netRefundPaise)}
                </span>
              </div>
            </div>
          )}

          <Button variant="primary" onClick={() => setIsRefundModalOpen(false)} fullWidth>
            Close Calculator
          </Button>
        </div>
      </Modal>
    </div>
  );
};
