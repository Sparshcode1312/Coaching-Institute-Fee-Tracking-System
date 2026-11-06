import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../i18n/LanguageContext.js';
import { apiClient } from '../../services/apiClient.js';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher.js';
import { ShieldCheck, ArrowRight, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';

export const ParentLogin: React.FC = () => {
  const { loginWithOtp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('9829010587'); // Pre-fill with Ishita Sharma sample parent for convenience
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleNumbers = [
    { name: 'Ishita Sharma', roll: 'STU-0587', phone: '9829010587', status: '₹15,000 Overdue' },
    { name: 'Aarav Meena', roll: 'STU-0412', phone: '9829010412', status: 'M1 Paid' },
    { name: 'Mohit Gurjar', roll: 'STU-0219', phone: '9829010219', status: 'M1 Due' },
  ];

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient.post('/auth/parent/request-otp', { phone });
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await loginWithOtp(phone, otp);
      navigate('/parent');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px 20px',
        backgroundColor: 'var(--surface-soft)',
        position: 'relative',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'var(--muted)',
            padding: '6px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Main Login Card */}
      <div
        className="card animate-fade-in"
        style={{
          maxWidth: 440,
          width: '100%',
          boxShadow: 'var(--shadow-card)',
          padding: '40px 32px',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 12,
              background: 'var(--text)',
              color: '#ffffff',
              borderRadius: '16px',
              marginBottom: 16,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>
            {t('parentPortal')}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            Instant fee visibility, payment receipts, and academic progress for Company A students.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--accent-crimson-bg)',
              border: '1px solid var(--accent-crimson-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleRequestOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="phone-input">
                Registered Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    fontSize: '0.95rem',
                  }}
                >
                  +91
                </span>
                <input
                  id="phone-input"
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: 52 }}
                  placeholder="9829010587"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Demo Student Picker Chips */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
                Quick Demo Accounts (Jaipur Centres):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sampleNumbers.map((s) => (
                  <button
                    key={s.roll}
                    type="button"
                    onClick={() => setPhone(s.phone)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: phone === s.phone ? 'rgba(0, 0, 0, 0.04)' : 'var(--surface-soft)',
                      border: phone === s.phone ? '1px solid var(--text)' : '1px solid var(--border-soft)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{s.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 6 }}>({s.roll})</span>
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                      {s.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: '0.95rem' }}
              disabled={isLoading || phone.length < 10}
            >
              {isLoading ? 'Sending SMS Code...' : 'Get One-Time Password'}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="animate-fade-in">
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                SMS verification code sent to
              </span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', marginTop: 2 }}>
                +91 {phone}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="otp-input">
                Enter 6-Digit OTP
              </label>
              <input
                id="otp-input"
                type="text"
                className="form-input"
                style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.3rem', fontWeight: 700 }}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
              />
            </div>

            {/* Quick 1-click Demo Fill */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setOtp('123456')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--green)',
                  background: 'var(--accent-green-bg)',
                  border: '1px solid var(--accent-green-border)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={12} />
                <span>Fill Demo Code (123456)</span>
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: '0.95rem' }}
              disabled={isLoading || otp.length < 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Enter Portal'}
              {!isLoading && <CheckCircle size={16} />}
            </button>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStep('PHONE')}
              >
                Change mobile number
              </button>
            </div>
          </form>
        )}

        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid var(--border-soft)',
            textAlign: 'center',
            fontSize: '0.85rem',
          }}
        >
          <span style={{ color: 'var(--muted)' }}>Coaching Institute Staff? </span>
          <Link
            to="/accounts/login"
            style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'underline' }}
          >
            Accounts Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
