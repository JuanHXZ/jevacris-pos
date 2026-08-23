import React from 'react';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  size = 'md'
}) => {
  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      borderRadius: 'var(--radius-full)',
      fontWeight: 600,
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      fontSize: size === 'sm' ? '12px' : '13px',
      lineHeight: 1.2
    };

    switch (variant) {
      case 'success':
        return {
          ...base,
          backgroundColor: 'var(--color-success-bg)',
          color: 'var(--color-success)',
          border: '1px solid var(--color-success-border)'
        };
      case 'warning':
        return {
          ...base,
          backgroundColor: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          border: '1px solid var(--color-warning-border)'
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          border: '1px solid var(--color-danger-border)'
        };
      case 'info':
        return {
          ...base,
          backgroundColor: 'var(--brand-primary-light)',
          color: 'var(--brand-primary)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        };
      case 'default':
      default:
        return {
          ...base,
          backgroundColor: 'var(--bg-surface-raised)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)'
        };
    }
  };

  return <span style={getStyles()}>{children}</span>;
};
