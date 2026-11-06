import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../i18n/LanguageContext.js';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher.js';
import { Landmark, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

export const AccountsLogin: React.FC = () => {
  const { loginStaff } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('accounts@companya.in');
  const [password, setPassword] = useState('CompanyA@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await loginStaff(email, password);
      navigate('/accounts');
    } catch (err: any) {
      setError(err.message || 'Invalid staff credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDemo = () => {
    setEmail('accounts@companya.in');
    setPassword('CompanyA@2026');
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
            <Landmark size={28} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>
            {t('accountsPortal')}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            Financial Operations, Student Ledgers, Ageing & Tally ERP Reconciliation
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
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-email">
              Staff Email Address
            </label>
            <input
              id="staff-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="accounts@companya.in"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="staff-password">
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          {/* Quick Demo Fill Pill */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button
              type="button"
              onClick={handleUseDemo}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--muted)',
                background: 'var(--surface-soft)',
                border: '1px solid var(--border-soft)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={12} />
              <span>Reset Demo Credentials</span>
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: 48, fontSize: '0.95rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In to Financial Workspace'}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid var(--border-soft)',
            textAlign: 'center',
            fontSize: '0.85rem',
          }}
        >
          <span style={{ color: 'var(--muted)' }}>Looking for student fee payment? </span>
          <Link
            to="/parent/login"
            style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'underline' }}
          >
            Parent Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
