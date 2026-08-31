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
          backgroundColor: '#10b981',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
          border: 'none'
        };
      case 'danger':
        return {
          backgroundColor: '#ba1a1a',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(186, 26, 26, 0.25)',
          border: 'none'
        };
      case 'warning':
        return {
          backgroundColor: '#d97706',
          color: '#ffffff',
          border: 'none'
        };
      case 'secondary':
        return {
          backgroundColor: '#f2ecf7',
          color: '#4d444e',
          border: '1px solid rgba(207, 195, 207, 0.6)'
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: '#4d444e',
          border: 'none'
        };
      case 'primary':
      default:
        return {
          backgroundColor: '#310344',
          color: '#f6d9fb',
          boxShadow: '0 4px 14px rgba(49, 3, 68, 0.22)',
          border: 'none'
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '8px 16px',
          fontSize: '14px',
          minHeight: '38px',
          borderRadius: '9999px'
        };
      case 'lg':
        return {
          padding: '16px 28px',
          fontSize: '18px',
          fontWeight: 700,
          minHeight: '56px',
          borderRadius: '9999px'
        };
      case 'md':
      default:
        return {
          padding: '12px 22px',
          fontSize: '15px',
          fontWeight: 600,
          minHeight: '46px',
          borderRadius: '9999px'
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
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'var(--font-sans)',
        userSelect: 'none',
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
