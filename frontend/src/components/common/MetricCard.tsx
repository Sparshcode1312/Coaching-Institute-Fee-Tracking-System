import React from 'react';
import { formatPaise } from '../../services/apiClient.js';

interface MetricCardProps {
  label: string;
  amountPaise?: number;
  value?: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'normal' | 'danger' | 'success';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  amountPaise,
  value,
  subtext,
  icon,
  variant = 'normal',
}) => {
  const displayValue = amountPaise !== undefined ? formatPaise(amountPaise) : value;

  return (
    <div className={`stat-card ${variant === 'danger' ? 'stat-card-danger' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-label">{label}</span>
        {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      </div>
      <span className="stat-value" style={variant === 'danger' ? { color: 'var(--accent-crimson)' } : {}}>
        {displayValue}
      </span>
      {subtext && <span className="stat-subtext">{subtext}</span>}
    </div>
  );
};

