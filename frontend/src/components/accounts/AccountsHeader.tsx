import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../i18n/LanguageContext.js';
import { LanguageSwitcher } from '../common/LanguageSwitcher.js';
import {
  LayoutDashboard,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  LogOut,
  Building2,
  User,
} from 'lucide-react';

export const AccountsHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/accounts', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { path: '/accounts/ageing', label: 'Dues & Ageing', icon: <Clock size={16} /> },
    { path: '/accounts/unmatched', label: 'Unmatched Queue', icon: <AlertCircle size={16} /> },
    { path: '/accounts/tally', label: 'Tally Export', icon: <FileSpreadsheet size={16} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/accounts/login');
  };

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-soft)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Top Brand & Profile Bar */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                background: 'var(--text)',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              C
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', lineHeight: 1.2 }}>
                Company A <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.85rem' }}>Accounts</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Jaipur Multi-Centre Financial Command</div>
            </div>
          </Link>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              backgroundColor: 'var(--surface-soft)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.75rem',
              color: 'var(--muted)',
              fontWeight: 500,
            }}
          >
            <Building2 size={12} />
            <span>4 Centres &bull; 2,600 Students</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSwitcher />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              backgroundColor: 'var(--surface-soft)',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-soft)',
              fontSize: '0.85rem',
            }}
          >
            <User size={14} color="var(--muted)" />
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
              {user?.fullName || 'Accounts Officer'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--danger)', padding: '6px 12px' }}
            title="Sign out of accounts session"
          >
            <LogOut size={16} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: '0.88rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--text)' : 'var(--muted)',
                borderBottom: isActive ? '2px solid var(--text)' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
