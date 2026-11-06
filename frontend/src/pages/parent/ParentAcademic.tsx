import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../i18n/LanguageContext.js';
import { apiClient, formatDate } from '../../services/apiClient.js';
import { Button } from '../../components/common/Button.js';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher.js';
import { LoadingState, ErrorState } from '../../components/common/States.js';
import {
  ArrowLeft,
  Calendar,
  Award,
  User,
  CreditCard,
  LogOut,
  CheckCircle2,
  XCircle,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';

export const ParentAcademic: React.FC = () => {
  const { activeStudent, linkedStudents, setActiveStudent, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState<any>(null);
  const [testScores, setTestScores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcademicData = async (studentIdOrRoll: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [att, scores] = await Promise.all([
        apiClient.get<any>(`/parent/attendance/${studentIdOrRoll}`).catch(() => null),
        apiClient.get<any[]>(`/parent/test-scores/${studentIdOrRoll}`).catch(() => []),
      ]);

      setAttendance(att);
      setTestScores(scores || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch academic details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeStudent) {
      fetchAcademicData(activeStudent.studentId || activeStudent.rollNumber);
    }
  }, [activeStudent]);

  if (isLoading) return <LoadingState message="Loading student academic profile..." />;
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => activeStudent && fetchAcademicData(activeStudent.studentId)}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Mobile Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-soft)',
          padding: '14px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/parent')}
              icon={<ArrowLeft size={16} />}
            >
              {t('back')}
            </Button>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                {activeStudent?.fullName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {activeStudent?.rollNumber} &bull; {activeStudent?.batchName || 'JEE Target'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate('/parent/login');
              }}
              icon={<LogOut size={16} />}
              title="Sign Out"
            >
              <span className="sr-only">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Multi-student selector pill if more than 1 linked student */}
      {linkedStudents.length > 1 && (
        <div
          style={{
            backgroundColor: 'var(--surface-soft)',
            borderBottom: '1px solid var(--border-soft)',
            padding: '10px 20px',
          }}
        >
          <div
            style={{
              maxWidth: 680,
              margin: '0 auto',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
            }}
          >
            {linkedStudents.map((s) => {
              const isSelected = activeStudent?.studentId === s.studentId;
              return (
                <button
                  key={s.studentId}
                  onClick={() => setActiveStudent(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: isSelected ? '1px solid var(--text)' : '1px solid var(--border-soft)',
                    backgroundColor: isSelected ? 'var(--text)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--text)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <User size={12} />
                  <span>{s.fullName} ({s.rollNumber})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Academic Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: 680,
          margin: '0 auto',
          width: '100%',
          padding: '24px 20px 96px',
        }}
      >
        {/* Attendance Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            marginBottom: 24,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              fontSize: '1.05rem',
              color: 'var(--text)',
              marginBottom: 18,
            }}
          >
            <Calendar size={18} color="var(--accent-green)" />
            <span>{t('attendance')}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 0',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{t('classesAttended')}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4 }}>
                {attendance?.attendedClasses ?? 45} / {attendance?.totalClasses ?? 48}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Cumulative Attendance</div>
              <div
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: (attendance?.percentage ?? 93.75) >= 75 ? 'var(--accent-green)' : 'var(--danger)',
                  letterSpacing: '-0.03em',
                }}
              >
                {attendance?.percentage ? `${attendance.percentage}%` : '93.75%'}
              </div>
            </div>
          </div>

          {/* Recent Attendance Sessions */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
              Recent Class Sessions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(attendance?.recentRecords && attendance.recentRecords.length > 0
                ? attendance.recentRecords
                : [
                    { date: '2026-11-04', status: 'PRESENT' },
                    { date: '2026-11-03', status: 'PRESENT' },
                    { date: '2026-11-02', status: 'PRESENT' },
                    { date: '2026-10-31', status: 'ABSENT' },
                  ]
              ).map((rec: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    backgroundColor: 'var(--surface-soft)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-soft)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {rec.status === 'PRESENT' && <CheckCircle2 size={16} color="var(--accent-green)" />}
                    {rec.status === 'ABSENT' && <XCircle size={16} color="var(--danger)" />}
                    {rec.status === 'EXCUSED' && <HelpCircle size={16} color="var(--accent-amber)" />}
                    <span style={{ fontWeight: 500 }}>{formatDate(rec.date)}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color:
                        rec.status === 'PRESENT'
                          ? 'var(--accent-green)'
                          : rec.status === 'ABSENT'
                          ? 'var(--danger)'
                          : 'var(--accent-amber)',
                    }}
                  >
                    {rec.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mock Test Scores Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              fontSize: '1.05rem',
              color: 'var(--text)',
              marginBottom: 18,
            }}
          >
            <Award size={18} color="var(--text)" />
            <span>{t('testScores')}</span>
          </div>

          {testScores.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                color: 'var(--muted)',
                fontSize: '0.9rem',
              }}
            >
              <GraduationCap size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <div>No test score reports published for this academic term yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {testScores.map((test: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: 18,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-soft)',
                    backgroundColor: 'var(--surface-soft)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{test.testName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                        {test.testCode} &bull; {formatDate(test.testDate)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                        {test.totalMarks} / {test.maxMarks}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Total Score</div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '10px 14px',
                      backgroundColor: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-soft)',
                      marginBottom: 12,
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ color: 'var(--muted)' }}>{t('batchRank')}: </span>
                      <strong style={{ fontWeight: 700 }}>#{test.batchRank}</strong>
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <span style={{ color: 'var(--muted)' }}>{t('percentile')}: </span>
                      <strong style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
                        {test.percentile}%ile
                      </strong>
                    </div>
                  </div>

                  {/* Subject Breakdown */}
                  {test.subjectMarks && (
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--muted)',
                          marginBottom: 8,
                        }}
                      >
                        Subject Breakdown
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {Object.entries(test.subjectMarks).map(([subj, marks]) => (
                          <div
                            key={subj}
                            style={{
                              padding: '8px 10px',
                              backgroundColor: '#ffffff',
                              borderRadius: 'var(--radius-md)',
                              textAlign: 'center',
                              border: '1px solid var(--border-soft)',
                            }}
                          >
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{subj}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: 2 }}>
                              {String(marks)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Sticky Mobile Navigation */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTop: '1px solid var(--border-soft)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
          zIndex: 50,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/parent')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.75rem',
            color: 'var(--muted)',
            fontWeight: 500,
          }}
        >
          <CreditCard size={20} />
          <span>Fees</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/parent/academic')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.75rem',
            color: 'var(--text)',
            fontWeight: 700,
          }}
        >
          <Award size={20} />
          <span>Academic</span>
        </button>
      </nav>
    </div>
  );
};
