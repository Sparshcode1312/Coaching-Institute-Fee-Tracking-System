import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext.js';
import { apiClient, formatPaise, formatDate } from '../../services/apiClient.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { Button } from '../../components/common/Button.js';
import { LoadingState, ErrorState } from '../../components/common/States.js';
import { AccountsHeader } from '../../components/accounts/AccountsHeader.js';
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Calendar,
  Send,
  RefreshCw,
} from 'lucide-react';

export const AgeingReportView: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [ageingData, setAgeingData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchAgeingData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ageing, studentList] = await Promise.all([
        apiClient.get<any>('/accounts/dashboard/ageing'),
        apiClient.get<any[]>('/accounts/students'),
      ]);
      setAgeingData(ageing);
      setStudents(studentList || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load fee ageing analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgeingData();
  }, []);

  const handleSendReminder = async (studentId: string, studentName: string) => {
    try {
      await apiClient.post('/accounts/reminders/trigger', {
        studentId,
        channel: 'WHATSAPP',
      });
      setActionMessage(`Notice dispatched to guardian of ${studentName}`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch reminder');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-soft)' }}>
        <AccountsHeader />
        <div style={{ padding: 40 }}>
          <LoadingState message="Calculating overdue ageing buckets across all centres..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-soft)' }}>
        <AccountsHeader />
        <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
          <ErrorState message={error} onRetry={fetchAgeingData} />
        </div>
      </div>
    );
  }

  // Filter students based on bucket
  const filteredStudents = students.filter((s) => {
    if (selectedBucket === 'all') return s.outstandingPaise > 0;
    if (selectedBucket === 'not_due') return s.outstandingPaise > 0 && s.overdueDays === 0;
    if (selectedBucket === '1_15') return s.overdueDays >= 1 && s.overdueDays <= 15;
    if (selectedBucket === '16_30') return s.overdueDays >= 16 && s.overdueDays <= 30;
    if (selectedBucket === '31_60') return s.overdueDays >= 31 && s.overdueDays <= 60;
    if (selectedBucket === 'over_60') return s.overdueDays > 60;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-soft)', display: 'flex', flexDirection: 'column' }}>
      <AccountsHeader />

      <main style={{ maxWidth: 1280, width: '100%', margin: '0 auto', padding: '32px 24px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Dues & Ageing Analysis
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 2 }}>
              Dynamic ageing classification of student balances (Current, 1–15d, 16–30d, 31–60d, &gt;60d).
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={fetchAgeingData} icon={<RefreshCw size={14} />}>
            {t('refresh')}
          </Button>
        </div>

        {actionMessage && (
          <div
            style={{
              marginBottom: 20,
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-green-bg)',
              border: '1px solid var(--accent-green-border)',
              color: 'var(--green)',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Send size={16} />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Ageing Summary Buckets */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', marginBottom: 28 }}>
          <div
            className="card card-hover"
            style={{
              cursor: 'pointer',
              border: selectedBucket === 'not_due' ? '2px solid var(--text)' : '1px solid var(--border-soft)',
              padding: '20px',
            }}
            onClick={() => setSelectedBucket(selectedBucket === 'not_due' ? 'all' : 'not_due')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Current / Not Due</span>
              <Calendar size={18} color="var(--muted)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>
              {formatPaise(ageingData?.currentNotDuePaise || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>Upcoming scheduled milestones</div>
          </div>

          <div
            className="card card-hover"
            style={{
              cursor: 'pointer',
              border: selectedBucket === '1_15' ? '2px solid var(--text)' : '1px solid var(--border-soft)',
              padding: '20px',
            }}
            onClick={() => setSelectedBucket(selectedBucket === '1_15' ? 'all' : '1_15')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase' }}>1–15 Days</span>
              <Clock size={18} color="var(--warning)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)' }}>
              {formatPaise(ageingData?.ageing1To15DaysPaise || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>First reminder escalation</div>
          </div>

          <div
            className="card card-hover"
            style={{
              cursor: 'pointer',
              border: selectedBucket === '16_30' ? '2px solid var(--text)' : '1px solid var(--border-soft)',
              padding: '20px',
            }}
            onClick={() => setSelectedBucket(selectedBucket === '16_30' ? 'all' : '16_30')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase' }}>16–30 Days</span>
              <AlertTriangle size={18} color="var(--danger)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>
              {formatPaise(ageingData?.ageing16To30DaysPaise || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>Requires executive phone follow-up</div>
          </div>

          <div
            className="card card-hover"
            style={{
              cursor: 'pointer',
              border: selectedBucket === '31_60' ? '2px solid var(--text)' : '1px solid var(--border-soft)',
              padding: '20px',
            }}
            onClick={() => setSelectedBucket(selectedBucket === '31_60' ? 'all' : '31_60')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase' }}>31–60 Days</span>
              <TrendingDown size={18} color="var(--danger)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>
              {formatPaise(ageingData?.ageing31To60DaysPaise || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>Critical overdue bracket</div>
          </div>

          <div
            className="card card-hover"
            style={{
              cursor: 'pointer',
              border: selectedBucket === 'over_60' ? '2px solid var(--text)' : '1px solid var(--border-soft)',
              padding: '20px',
            }}
            onClick={() => setSelectedBucket(selectedBucket === 'over_60' ? 'all' : 'over_60')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase' }}>&gt;60 Days</span>
              <AlertTriangle size={18} color="var(--danger)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>
              {formatPaise(ageingData?.ageingOver60DaysPaise || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>Counsellor intervention required</div>
          </div>
        </div>

        {/* Filter Bar & Bucket Indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            padding: '12px 18px',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            Active Bracket:{' '}
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              {selectedBucket.toUpperCase().replace('_', ' ')}
            </span>{' '}
            <span style={{ color: 'var(--muted)' }}>({filteredStudents.length} Students)</span>
          </div>
          {selectedBucket !== 'all' && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedBucket('all')}
            >
              Reset to All Dues
            </button>
          )}
        </div>

        {/* Student Breakdown Table */}
        <div className="table-wrapper card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Centre</th>
                <th>Batch</th>
                <th>Total Fee</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Overdue Age</th>
                <th>Next Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No student records found in this ageing bracket.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {s.rollNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.enrolmentStatus}</div>
                    </td>
                    <td>{s.centreName}</td>
                    <td>{s.batchName}</td>
                    <td className="tabular-nums font-semibold">{formatPaise(s.totalFeePaise)}</td>
                    <td className="tabular-nums" style={{ color: 'var(--green)', fontWeight: 600 }}>
                      {formatPaise(s.totalPaidPaise)}
                    </td>
                    <td
                      className="tabular-nums"
                      style={{ fontWeight: 700, color: s.overdueDays > 0 ? 'var(--danger)' : 'inherit' }}
                    >
                      {formatPaise(s.outstandingPaise)}
                    </td>
                    <td>
                      {s.overdueDays > 0 ? (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--accent-crimson-bg)',
                            color: 'var(--danger)',
                          }}
                        >
                          {s.overdueDays} days
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Current</span>
                      )}
                    </td>
                    <td>{formatDate(s.nextDueDate)}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/accounts/ledger/${s.rollNumber}`)}
                        >
                          <span>Ledger</span>
                          <ChevronRight size={14} />
                        </button>
                        {s.overdueDays > 0 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleSendReminder(s.id, s.fullName)}
                            title="Dispatch WhatsApp Overdue Alert"
                          >
                            <Send size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
