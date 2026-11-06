import React from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button.js';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading details...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', gap: 12 }}>
    <div className="loading-spinner" style={{ width: 32, height: 32 }} />
    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{message}</span>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ title, description, actionText, onAction }) => (
  <div className="empty-state">
    <Inbox size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
    <h4 style={{ marginBottom: 4 }}>{title}</h4>
    {description && <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>{description}</p>}
    {actionText && onAction && (
      <Button variant="secondary" size="sm" onClick={onAction}>
        {actionText}
      </Button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Failed to load data', message, onRetry }) => (
  <div
    style={{
      padding: '24px',
      backgroundColor: 'var(--accent-crimson-bg)',
      border: '1px solid var(--accent-crimson-border)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      margin: '16px 0',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-crimson)' }}>
      <AlertCircle size={20} />
      <span style={{ fontWeight: 600 }}>{title}</span>
    </div>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{message}</p>
    {onRetry && (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="danger" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    )}
  </div>
);

