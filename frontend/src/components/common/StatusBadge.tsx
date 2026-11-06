import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext.js';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useLanguage();

  let variantClass = 'badge-neutral';
  let label = status;

  switch (status.toUpperCase()) {
    case 'PAID':
    case 'SETTLED':
    case 'SUCCESS':
    case 'PRESENT':
      variantClass = 'badge-success';
      label = t('paid');
      break;

    case 'PARTIALLY_PAID':
      variantClass = 'badge-warning';
      label = t('partiallyPaid');
      break;

    case 'OVERDUE':
    case 'FAILED':
    case 'ABSENT':
      variantClass = 'badge-danger';
      label = t('overdue');
      break;

    case 'DUE_TODAY':
      variantClass = 'badge-warning';
      label = t('dueToday');
      break;

    case 'UPCOMING':
      variantClass = 'badge-neutral';
      label = t('upcoming');
      break;

    case 'UNPAID':
      variantClass = 'badge-neutral';
      label = t('unpaid');
      break;

    default:
      variantClass = 'badge-neutral';
      label = status;
  }

  return <span className={`badge ${variantClass}`}>{label}</span>;
};

