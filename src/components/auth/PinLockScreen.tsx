import React, { useState, useEffect, useCallback } from 'react';
import { Lock, ShieldAlert, Command } from 'lucide-react';
import { PinKeypad } from './PinKeypad';

interface PinLockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < 8 && !isVerifying) {
        setError(null);
        setPin((prev) => prev + digit);
      }
    },
    [pin.length, isVerifying]
  );

  const handleDelete = useCallback(() => {
    if (!isVerifying) {
      setError(null);
      setPin((prev) => prev.slice(0, -1));
    }
  }, [isVerifying]);

  const handleClear = useCallback(() => {
    if (!isVerifying) {
      setError(null);
      setPin('');
    }
  }, [isVerifying]);

  const submitPin = useCallback(
    async (pinToVerify: string) => {
      if (!pinToVerify || isVerifying) return;
      setIsVerifying(true);
      setError(null);

      try {
        const success = await onUnlock(pinToVerify);
        if (!success) {
          setError('PIN incorrecto. Intenta nuevamente.');
          setShake(true);
          setPin('');
          setTimeout(() => setShake(false), 500);
        }
      } catch (err) {
        setError('Error validando PIN.');
        setPin('');
      } finally {
        setIsVerifying(false);
      }
    },
    [onUnlock, isVerifying]
  );

  // Escuchar teclado físico
  useEffect(() => {
    const handlePhysicalKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length >= 4) {
          submitPin(pin);
        }
      }
    };

    window.addEventListener('keydown', handlePhysicalKey);
    return () => {
      window.removeEventListener('keydown', handlePhysicalKey);
    };
  }, [handleDigit, handleDelete, handleClear, submitPin, pin]);

  // Si el PIN alcanza 4 dígitos, intentamos verificarlo automáticamente (o hasta 6)
  useEffect(() => {
    if (pin.length === 4) {
      submitPin(pin);
    }
  }, [pin, submitPin]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(12px)',
        userSelect: 'none'
      }}
    >
      <div
        className={shake ? 'pin-shake-anim' : ''}
        style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          textAlign: 'center'
        }}
      >
        {/* Brand Icon & Lock */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '32px',
              fontWeight: 800,
              boxShadow: 'var(--shadow-glow-brand)'
            }}
          >
            J
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              border: '2px solid var(--bg-app)'
            }}
          >
            <Lock size={14} />
          </div>
        </div>

        {/* Textos */}
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 4px 0'
            }}
          >
            JEVACRIS POS
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: 0
            }}
          >
            Sistema bloqueado — Ingresa tu PIN de seguridad
          </p>
        </div>

        {/* Indicadores de PIN (Dots) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            margin: '8px 0'
          }}
        >
          {[0, 1, 2, 3].map((index) => {
            const filled = pin.length > index;
            return (
              <div
                key={index}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: filled
                    ? 'var(--brand-primary)'
                    : 'var(--bg-card-secondary)',
                  border: `2px solid ${
                    filled ? 'var(--brand-primary)' : 'var(--border-default)'
                  }`,
                  transition: 'all 0.15s ease',
                  transform: filled ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: filled ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                }}
              />
            );
          })}
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent-danger)',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        <PinKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          onClear={handleClear}
          disabled={isVerifying}
        />

        {/* Atajo de teclado Hint */}
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '12px'
          }}
        >
          <Command size={14} />
          <span>
            Atajo de bloqueo rápido: <kbd style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-card-secondary)', border: '1px solid var(--border-default)', fontWeight: 700 }}>Alt + L</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};
