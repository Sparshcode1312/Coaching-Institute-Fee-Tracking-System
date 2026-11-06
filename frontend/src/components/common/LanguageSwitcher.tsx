import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext.js';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--bg-tertiary)',
        padding: '2px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        style={{
          padding: '4px 10px',
          fontSize: '0.8rem',
          fontWeight: 600,
          borderRadius: 'var(--radius-sm)',
          background: language === 'en' ? 'var(--text-primary)' : 'transparent',
          color: language === 'en' ? '#FFFFFF' : 'var(--text-muted)',
          transition: 'all var(--transition-fast)',
        }}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        style={{
          padding: '4px 10px',
          fontSize: '0.8rem',
          fontWeight: 600,
          borderRadius: 'var(--radius-sm)',
          background: language === 'hi' ? 'var(--text-primary)' : 'transparent',
          color: language === 'hi' ? '#FFFFFF' : 'var(--text-muted)',
          transition: 'all var(--transition-fast)',
        }}
      >
        हिन्दी
      </button>
    </div>
  );
};

