import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isFullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: 'var(--color-success)',
          color: '#ffffff',
          boxShadow: 'var(--shadow-sm)'
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger)',
          color: '#ffffff'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--color-warning)',
          color: '#ffffff'
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--bg-surface-raised)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)'
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)'
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--brand-primary)',
          color: '#ffffff',
          boxShadow: 'var(--shadow-sm)'
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '8px 14px',
          fontSize: '14px',
          minHeight: '38px'
        };
      case 'lg':
        return {
          padding: '16px 24px',
          fontSize: '18px',
          fontWeight: 700,
          minHeight: 'var(--touch-target-lg)',
          borderRadius: 'var(--radius-lg)'
        };
      case 'md':
      default:
        return {
          padding: '12px 18px',
          fontSize: '16px',
          fontWeight: 600,
          minHeight: 'var(--touch-target-min)',
          borderRadius: 'var(--radius-md)'
        };
    }
  };

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: isFullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        ...getSizeStyles(),
        ...getVariantStyles(),
        ...style
      }}
      className={className}
      {...props}
    >
      {leftIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>}
    </button>
  );
};
