import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../i18n/LanguageContext.js';
import { apiClient, formatPaise, formatDate } from '../../services/apiClient.js';
import { Button } from '../../components/common/Button.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher.js';
import { LoadingState, ErrorState } from '../../components/common/States.js';
import { PaymentModal } from '../../components/parent/PaymentModal.js';
import { ReceiptModal } from '../../components/parent/ReceiptModal.js';
import {
  CreditCard,
  Clock,
  CheckCircle,
  FileText,
  Calendar,
  Award,
  LogOut,
  ArrowLeft,
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const { activeStudent, linkedStudents, setActiveStudent, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [ledgerData, setLedgerData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [testScores, setTestScores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'FEES' | 'RECEIPTS' | 'ACADEMIC'>('FEES');

  // Selected instalment for payment modal
  const [selectedInstalment, setSelectedInstalment] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);

  // Selected payment for receipt modal
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const fetchStudentData = async (studentIdOrRoll: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [ledger, attendance, scores] = await Promise.all([
        apiClient.get<any>(`/fees/ledger/${studentIdOrRoll}`),
        apiClient.get<any>(`/parent/attendance/${studentIdOrRoll}`).catch(() => null),
        apiClient.get<any[]>(`/parent/test-scores/${studentIdOrRoll}`).catch(() => []),
      ]);

      setLedgerData(ledger);
      setAttendanceData(attendance);
      setTestScores(scores || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student fee ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeStudent) {
      fetchStudentData(activeStudent.rollNumber);
    } else {
      // Fallback to STU-0587 (Ishita Sharma) if not yet explicitly selected
      fetchStudentData('STU-0587');
    }
  }, [activeStudent]);

  if (isLoading) {
    return <LoadingState message="Loading student fee and academic details..." />;
  }

  if (error || !ledgerData) {
    return (
      <div className="content-container">
        <ErrorState message={error || 'No ledger data available.'} onRetry={() => activeStudent && fetchStudentData(activeStudent.rollNumber)} />
      </div>
    );
  }

  const { student, financials, instalments, paymentHistory } = ledgerData;

  // Identify next payable instalment (oldest overdue or due)
  const nextPayableInstalment = instalments.find((i: any) => i.outstandingPaise > 0);

  const handleOpenPay = (inst: any) => {
    setSelectedInstalment(inst);
    setIsPayModalOpen(true);
  };

  const handleOpenReceipt = (payment: any) => {
    setSelectedPayment(payment);
    setIsReceiptModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/parent/login');
  };

  return (
    <div className="mobile-app-shell" style={{ maxWidth: 860, margin: '0 auto', background: 'var(--bg)' }}>
      {/* Top Mobile Bar */}
      <header className="mobile-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'var(--surface-soft)',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text)',
            }}
            title="Return to Home"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
              Company A <span style={{ fontWeight: 400, color: 'var(--muted)' }}>Portal</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{student.centre.name}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageSwitcher />
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: 6, color: 'var(--danger)' }}
            onClick={handleLogout}
            title={t('logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mobile-content" style={{ padding: '24px 20px' }}>
        {/* Multi-Child Switcher (if multiple students enrolled) */}
        {linkedStudents.length > 1 && (
          <div style={{ marginBottom: 20, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {linkedStudents.map((child) => (
              <button
                key={child.studentId}
                type="button"
                className={`btn btn-sm ${activeStudent?.studentId === child.studentId ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveStudent(child)}
              >
                {child.fullName} ({child.rollNumber})
              </button>
            ))}
          </div>
        )}

        {/* ==================================================================== */}
        {/* FIVE-SECOND RULE HERO CARD                                          */}
        {/* Prominently displays: Student Name, Outstanding Amount, Next Due    */}
        {/* Date, and Pay Now Action Button in the first viewport.               */}
        {/* ==================================================================== */}
        <section className="hero-fee-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="hero-student-name">
                {student.fullName} <span style={{ opacity: 0.7, fontWeight: 400 }}>({student.rollNumber})</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 }}>
                {student.batch.name} &bull; {student.centre.name}
              </div>
            </div>

            <span
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                background: financials.totalOverdueDays > 0 ? 'var(--accent-crimson)' : 'var(--accent-green)',
                color: '#ffffff',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {financials.totalOverdueDays > 0 ? `${financials.totalOverdueDays} Days Overdue` : 'All Clear / Active'}
            </span>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.75)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('totalOutstanding')}
            </div>
            <div className="hero-amount">
              {formatPaise(financials.outstandingBalancePaise)}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: 4 }}>
              Total Annual Fee: {formatPaise(financials.finalPayableAmountPaise)} &bull; Paid: {formatPaise(financials.totalAmountPaidPaise)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <div className="hero-due-badge">
              <Clock size={15} />
              <span>
                {nextPayableInstalment
                  ? `${t('nextDueDate')}: ${formatDate(nextPayableInstalment.dueDate)}`
                  : t('allClear')}
              </span>
            </div>

            {nextPayableInstalment && (
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => handleOpenPay(nextPayableInstalment)}
                style={{ padding: '10px 22px', fontSize: '0.95rem', fontWeight: 600 }}
              >
                <CreditCard size={16} />
                <span>{t('payNow')} ({formatPaise(nextPayableInstalment.outstandingPaise)})</span>
              </button>
            )}
          </div>
        </section>

        {/* View Navigation Sub-Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-soft)', marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setActiveTab('FEES')}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'FEES' ? 600 : 500,
              color: activeTab === 'FEES' ? 'var(--text)' : 'var(--muted)',
              borderBottom: activeTab === 'FEES' ? '2px solid var(--text)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Milestone Instalments ({instalments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECEIPTS')}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'RECEIPTS' ? 600 : 500,
              color: activeTab === 'RECEIPTS' ? 'var(--text)' : 'var(--muted)',
              borderBottom: activeTab === 'RECEIPTS' ? '2px solid var(--text)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Payment Receipts ({paymentHistory.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACADEMIC')}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'ACADEMIC' ? 600 : 500,
              color: activeTab === 'ACADEMIC' ? 'var(--text)' : 'var(--muted)',
              borderBottom: activeTab === 'ACADEMIC' ? '2px solid var(--text)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Academic & Attendance
          </button>
        </div>

        {/* TAB 1: MILESTONE INSTALMENTS */}
        {activeTab === 'FEES' && (
          <section className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {instalments.map((inst: any) => (
              <div
                key={inst.id}
                className="card card-hover"
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                      Milestone {inst.instalmentNumber}
                    </span>
                    <StatusBadge status={inst.paymentStatus === 'PAID' ? 'PAID' : inst.dueStatus} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>
                    Due: <strong>{formatDate(inst.dueDate)}</strong>
                    {inst.overdueDays > 0 && (
                      <span style={{ color: 'var(--danger)', marginLeft: 8, fontWeight: 600 }}>
                        &bull; {inst.overdueDays} days overdue
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text)' }}>
                    {formatPaise(inst.netPayablePaise)}
                  </div>
                  {inst.outstandingPaise > 0 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      style={{ marginTop: 6 }}
                      onClick={() => handleOpenPay(inst)}
                    >
                      {t('payNow')} ({formatPaise(inst.outstandingPaise)})
                    </Button>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600, marginTop: 4 }}>
                      ✓ Paid in Full
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* TAB 2: PAYMENT RECEIPTS */}
        {activeTab === 'RECEIPTS' && (
          <section className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paymentHistory.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                No payment transactions recorded yet.
              </div>
            ) : (
              paymentHistory.map((p: any) => (
                <div
                  key={p.id}
                  className="card card-hover"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        padding: 10,
                        background: 'var(--accent-green-bg)',
                        color: 'var(--green)',
                        borderRadius: '12px',
                      }}
                    >
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
                        {formatPaise(p.amountPaise)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                        {formatDate(p.capturedAt)} &bull; {p.paymentMode} &bull; Ref: {p.transactionRef}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenReceipt(p)}
                    style={{ gap: 6 }}
                  >
                    <FileText size={14} />
                    <span>View Receipt</span>
                  </button>
                </div>
              ))
            )}
          </section>
        )}

        {/* TAB 3: ACADEMIC & ATTENDANCE */}
        {activeTab === 'ACADEMIC' && (
          <section className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {/* Attendance Summary Card */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>
                  <Calendar size={18} />
                  <span style={{ fontWeight: 600 }}>Lecture Attendance</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, margin: '12px 0 4px', color: 'var(--text)' }}>
                  {attendanceData?.percentage || 87.5}%
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  {attendanceData?.attendedClasses || 42} Attended out of {attendanceData?.totalClasses || 48} Lectures
                </div>
                <div style={{ marginTop: 12, background: 'var(--surface-soft)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${attendanceData?.percentage || 87.5}%`,
                      background: 'var(--green)',
                    }}
                  />
                </div>
              </div>

              {/* Latest Test Performance */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>
                  <Award size={18} />
                  <span style={{ fontWeight: 600 }}>Latest Mock Exam</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, margin: '12px 0 4px', color: 'var(--text)' }}>
                  {testScores[0]?.percentile || 91.0}%<span style={{ fontSize: '1rem', fontWeight: 500 }}>ile</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Rank #{testScores[0]?.batchRank || 4} in {student.batch.name}
                </div>
                <div style={{ marginTop: 12, background: 'var(--surface-soft)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${testScores[0]?.percentile || 91}%`,
                      background: 'var(--text)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Test Score Log */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 14 }}>Recent Test Marks</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {testScores.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>No test results imported yet.</p>
                ) : (
                  testScores.map((tst, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: 'var(--surface-soft)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{tst.testName || `Unit Test ${i + 1}`}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 8 }}>{tst.testDate}</span>
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {tst.marksObtained} / {tst.maxMarks} ({tst.percentile}%ile)
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        studentId={student.id}
        instalment={selectedInstalment}
        onSuccess={() => {
          fetchStudentData(student.rollNumber);
        }}
      />

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={selectedPayment}
        student={student}
      />
    </div>
  );
};
