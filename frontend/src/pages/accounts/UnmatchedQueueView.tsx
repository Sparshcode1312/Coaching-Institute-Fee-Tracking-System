import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.js';
import { apiClient, formatPaise, formatDate } from '../../services/apiClient.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { Button } from '../../components/common/Button.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingState, ErrorState } from '../../components/common/States.js';
import { AccountsHeader } from '../../components/accounts/AccountsHeader.js';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export const UnmatchedQueueView: React.FC = () => {
  const { t } = useLanguage();

  const [unmatchedList, setUnmatchedList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Reconcile Modal State
  const [selectedUnmatched, setSelectedUnmatched] = useState<any | null>(null);
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [studentLedger, setStudentLedger] = useState<any | null>(null);
  const [targetInstalmentId, setTargetInstalmentId] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [reconcileSuccess, setReconcileSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [queue, studentList] = await Promise.all([
        apiClient.get<any[]>('/accounts/unmatched-payments'),
        apiClient.get<any[]>('/accounts/students'),
      ]);
      setUnmatchedList(queue || []);
      setStudents(studentList || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load unmatched payments queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenReconcile = async (unmatched: any) => {
    setSelectedUnmatched(unmatched);
    setReconcileSuccess(null);
    setTargetStudentId('STU-0587');
    await loadStudentLedger('STU-0587');
  };

  const loadStudentLedger = async (rollNumber: string) => {
    try {
      const ledger = await apiClient.get<any>(`/fees/ledger/${rollNumber}`);
      setStudentLedger(ledger);
      const openInstalment = ledger.instalments.find((i: any) => i.outstandingPaise > 0);
      if (openInstalment) {
        setTargetInstalmentId(openInstalment.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch student instalments.');
    }
  };

  const handleReconcileSubmit = async () => {
    if (!selectedUnmatched || !targetStudentId || !targetInstalmentId) return;
    setIsReconciling(true);
    try {
      const studentObj = students.find((s) => s.rollNumber === targetStudentId);
      await apiClient.post('/accounts/unmatched-payments/reconcile', {
        unmatchedId: selectedUnmatched.id,
        studentId: studentObj?.id || selectedUnmatched.studentId,
        instalmentId: targetInstalmentId,
      });

      setReconcileSuccess(`Payment mapped to ${targetStudentId} successfully.`);
      setTimeout(() => {
        setSelectedUnmatched(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to reconcile payment.');
    } finally {
      setIsReconciling(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-soft)' }}>
        <AccountsHeader />
        <div style={{ padding: 40 }}>
          <LoadingState message="Fetching unmatched bank transactions..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-soft)' }}>
        <AccountsHeader />
        <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-soft)', display: 'flex', flexDirection: 'column' }}>
      <AccountsHeader />

      <main style={{ maxWidth: 1280, width: '100%', margin: '0 auto', padding: '32px 24px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Unmatched Bank Inflows
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 2 }}>
              Reconciliation queue for direct bank credits, NEFT/RTGS, or cash deposits awaiting student attribution.
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={fetchData} icon={<RefreshCw size={14} />}>
            {t('refresh')}
          </Button>
        </div>

        {/* Notice Card */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--accent-amber-bg)',
            border: '1px solid var(--accent-amber-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>
              Direct Bank Deposits Requiring Human Audit
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 2 }}>
              Funds deposited directly into institute bank accounts without an authoritative student roll reference. 
              Accounts executives must verify the transaction UTR reference and allocate the funds to the student milestone.
            </div>
          </div>
        </div>

        {/* Table of Unmatched Payments */}
        <div className="table-wrapper card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Ref ID</th>
                <th>Date & Time</th>
                <th>Source Mode</th>
                <th>Bank / UTR Reference</th>
                <th>Depositor / Remark</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                    <CheckCircle size={32} color="var(--green)" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>Zero Unmatched Inflows</div>
                    <div style={{ fontSize: '0.85rem' }}>All incoming bank payments have been matched to student ledgers.</div>
                  </td>
                </tr>
              ) : (
                unmatchedList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {item.id.slice(0, 8)}
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <span className="badge badge-neutral">{item.paymentMode}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {item.bankReference}
                    </td>
                    <td>{item.depositorRemark || 'Direct Inward Deposit'}</td>
                    <td className="tabular-nums" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--green)' }}>
                      {formatPaise(item.amountPaise)}
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenReconcile(item)}
                      >
                        Reconcile & Match
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Reconcile Modal */}
      {selectedUnmatched && (
        <Modal
          isOpen={Boolean(selectedUnmatched)}
          onClose={() => setSelectedUnmatched(null)}
          title="Reconcile Unmatched Payment"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {reconcileSuccess ? (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  backgroundColor: 'var(--accent-green-bg)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--green)',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={36} style={{ margin: '0 auto 8px' }} />
                <div>{reconcileSuccess}</div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: 16,
                    backgroundColor: 'var(--surface-soft)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Deposit Amount:</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--green)' }}>
                      {formatPaise(selectedUnmatched.amountPaise)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: 4 }}>
                    <span style={{ color: 'var(--muted)' }}>Bank Ref:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedUnmatched.bankReference}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reconcile-student-select">
                    Select Target Student:
                  </label>
                  <select
                    id="reconcile-student-select"
                    className="form-select"
                    value={targetStudentId}
                    onChange={(e) => {
                      setTargetStudentId(e.target.value);
                      loadStudentLedger(e.target.value);
                    }}
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.rollNumber}>
                        {s.rollNumber} — {s.fullName} ({s.centreName})
                      </option>
                    ))}
                  </select>
                </div>

                {studentLedger && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="reconcile-instalment-select">
                      Allocate to Milestone Instalment:
                    </label>
                    <select
                      id="reconcile-instalment-select"
                      className="form-select"
                      value={targetInstalmentId}
                      onChange={(e) => setTargetInstalmentId(e.target.value)}
                    >
                      {studentLedger.instalments.map((inst: any) => (
                        <option key={inst.id} value={inst.id}>
                          Milestone {inst.instalmentNumber} &bull; Outstanding: {formatPaise(inst.outstandingPaise)} &bull; Due: {formatDate(inst.dueDate)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleReconcileSubmit}
                    disabled={isReconciling || !targetInstalmentId}
                  >
                    {isReconciling ? 'Allocating...' : 'Confirm Allocation'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedUnmatched(null)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
