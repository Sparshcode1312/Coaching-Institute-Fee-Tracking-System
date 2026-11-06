import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext.js';
import { apiClient, formatPaise, formatDate } from '../../services/apiClient.js';
import { MetricCard } from '../../components/common/MetricCard.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { Button } from '../../components/common/Button.js';
import { LoadingState, ErrorState } from '../../components/common/States.js';
import { AccountsHeader } from '../../components/accounts/AccountsHeader.js';
import {
  CreditCard,
  AlertTriangle,
  Clock,
  Search,
  ChevronRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

export const AccountsDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCentre, setSelectedCentre] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [m, s] = await Promise.all([
        apiClient.get<any>('/accounts/dashboard/metrics'),
        apiClient.get<any[]>('/accounts/students'),
      ]);

      setMetrics(m);
      setStudents(s || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts command centre data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-soft)' }}>
        <AccountsHeader />
        <div style={{ padding: 40 }}>
          <LoadingState message="Loading accounts dashboard and financial metrics..." />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-soft)' }}>
        <AccountsHeader />
        <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
          <ErrorState message={error || 'Unable to retrieve dashboard.'} onRetry={fetchData} />
        </div>
      </div>
    );
  }

  // Filter student rows locally
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.batchName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCentre = !selectedCentre || s.centreId === selectedCentre;
    const matchesBatch = !selectedBatch || s.batchName.includes(selectedBatch);
    const matchesStatus = !selectedStatus || s.status === selectedStatus;

    return matchesSearch && matchesCentre && matchesBatch && matchesStatus;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-soft)', display: 'flex', flexDirection: 'column' }}>
      {/* Universal Accounts Header */}
      <AccountsHeader />

      <main style={{ maxWidth: 1280, width: '100%', margin: '0 auto', padding: '32px 24px', flex: 1 }}>
        {/* Top Title & Refresh Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Financial Command Centre
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 2 }}>
              Authoritative overview of fee receivables, collections, and ageing across Jaipur centres.
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={fetchData} icon={<RefreshCw size={14} />}>
            {t('refresh')}
          </Button>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <MetricCard
            label={t('totalBilled')}
            amountPaise={metrics.totalBilledPaise}
            subtext="Annual student fee receivables"
            icon={<TrendingUp size={20} />}
          />
          <MetricCard
            label={t('totalCollected')}
            amountPaise={metrics.totalCollectedPaise}
            subtext="Settled through verified receipts"
            icon={<CreditCard size={20} />}
            variant="success"
          />
          <MetricCard
            label={t('totalPending')}
            amountPaise={metrics.totalOutstandingPaise}
            subtext="Active unpaid fee balance"
            icon={<Clock size={20} />}
          />
          <MetricCard
            label={t('criticalOverdue')}
            amountPaise={metrics.criticalOverduePaise}
            subtext="Overdue >30 days (Prioritized)"
            icon={<AlertTriangle size={20} />}
            variant="danger"
          />
        </div>

        {/* Filter Toolbar */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', flex: 1, minWidth: 260, position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by student name, roll number, or batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              className="form-select"
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              style={{ width: 170 }}
            >
              <option value="">{t('allCentres')}</option>
              <option value="c1111111-1111-1111-1111-111111111111">Jaipur Centre 1 (JLN)</option>
              <option value="c2222222-2222-2222-2222-222222222222">Jaipur Centre 2 (Tonk)</option>
              <option value="c3333333-3333-3333-3333-333333333333">Jaipur Centre 3 (Vaishali)</option>
              <option value="c4444444-4444-4444-4444-444444444444">Jaipur Centre 4 (VDN)</option>
            </select>

            <select
              className="form-select"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              style={{ width: 170 }}
            >
              <option value="">{t('allBatches')}</option>
              <option value="JEE 2027 Morning">JEE 2027 Morning</option>
              <option value="JEE 2027 Evening">JEE 2027 Evening</option>
              <option value="NEET 2027 Morning">NEET 2027 Morning</option>
            </select>

            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="">{t('allStatuses')}</option>
              <option value="OVERDUE">{t('overdue')}</option>
              <option value="DUE">{t('dueToday')}</option>
              <option value="SETTLED">{t('settled')}</option>
            </select>
          </div>
        </div>

        {/* Student Fee Directory Table */}
        <div className="table-wrapper card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Batch & Stream</th>
                <th>Total Fee</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Next Due Date</th>
                <th>Overdue Age</th>
                <th>Status</th>
                <th>Ledger</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No student fee records found matching criteria.
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.centreName}</div>
                    </td>
                    <td>{s.batchName}</td>
                    <td className="tabular-nums font-semibold">{formatPaise(s.totalFeePaise)}</td>
                    <td className="tabular-nums" style={{ color: 'var(--green)', fontWeight: 600 }}>
                      {formatPaise(s.totalPaidPaise)}
                    </td>
                    <td className="tabular-nums" style={{ fontWeight: 700 }}>
                      {formatPaise(s.outstandingPaise)}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(s.nextDueDate)}</td>
                    <td>
                      {s.overdueDays > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>
                          {s.overdueDays} days
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/accounts/ledger/${s.rollNumber}`)}
                        style={{ padding: '6px 12px' }}
                      >
                        <span>Ledger</span>
                        <ChevronRight size={14} />
                      </button>
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
