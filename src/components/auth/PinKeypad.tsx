import React from 'react';
import { Delete, RotateCcw } from 'lucide-react';

interface PinKeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onDigit,
  onDelete,
  onClear,
  disabled = false
}) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const buttonStyle: React.CSSProperties = {
    height: '64px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    fontSize: '24px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: 'var(--shadow-sm)',
    userSelect: 'none',
    touchAction: 'manipulation'
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        width: '100%',
        maxWidth: '320px',
        margin: '0 auto'
      }}
    >
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(digit)}
          style={buttonStyle}
          className="pin-keypad-btn"
        >
          {digit}
        </button>
      ))}

      {/* Botón Limpiar */}
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        style={{
          ...buttonStyle,
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          color: 'var(--accent-danger)'
        }}
        title="Borrar todo"
        className="pin-keypad-btn"
      >
        <RotateCcw size={22} />
      </button>

      {/* Dígito 0 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit('0')}
        style={buttonStyle}
        className="pin-keypad-btn"
      >
        0
      </button>

      {/* Botón Retroceso */}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        style={{
          ...buttonStyle,
          backgroundColor: 'var(--bg-card-secondary)',
          color: 'var(--text-secondary)'
        }}
        title="Retroceder"
        className="pin-keypad-btn"
      >
        <Delete size={24} />
      </button>
    </div>
  );
};
