import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { KeyRound, ShieldCheck, ShieldAlert, Timer, Trash2, CheckCircle2 } from 'lucide-react';

interface PinSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPinConfigured: boolean;
  autoLockMinutes: number;
  onSetupPin: (pin: string, autoLockMinutes: number) => Promise<void>;
  onChangePin: (currentPin: string, newPin: string) => Promise<boolean>;
  onDisablePin: (currentPin: string) => Promise<boolean>;
  onUpdateAutoLock: (minutes: number) => void;
}

export const PinSettingsModal: React.FC<PinSettingsModalProps> = ({
  isOpen,
  onClose,
  isPinConfigured,
  autoLockMinutes,
  onSetupPin,
  onChangePin,
  onDisablePin,
  onUpdateAutoLock
}) => {
  const [mode, setMode] = useState<'view' | 'setup' | 'change' | 'disable'>('view');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [selectedAutoLock, setSelectedAutoLock] = useState<number>(autoLockMinutes);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);
    setSuccessMsg(null);
    setMode('view');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateNumericPin = (val: string) => /^[0-9]{4,6}$/.test(val);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateNumericPin(newPin)) {
      setError('El PIN debe contener 4 dígitos numéricos.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Los PIN no coinciden.');
      return;
    }

    setIsProcessing(true);
    try {
      await onSetupPin(newPin, selectedAutoLock);
      setSuccessMsg('¡PIN de seguridad configurado exitosamente!');
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch {
      setError('Ocurrió un error al guardar el PIN.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPin) {
      setError('Ingresa tu PIN actual.');
      return;
    }
    if (!validateNumericPin(newPin)) {
      setError('El nuevo PIN debe contener 4 dígitos numéricos.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('El nuevo PIN y su confirmación no coinciden.');
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await onChangePin(currentPin, newPin);
      if (ok) {
        setSuccessMsg('¡PIN actualizado correctamente!');
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setError('El PIN actual es incorrecto.');
      }
    } catch {
      setError('Error al cambiar el PIN.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPin) {
      setError('Ingresa tu PIN actual para confirmar.');
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await onDisablePin(currentPin);
      if (ok) {
        setSuccessMsg('Protección por PIN desactivada.');
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setError('El PIN ingresado es incorrecto.');
      }
    } catch {
      setError('Error al desactivar el PIN.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoLockChange = (min: number) => {
    setSelectedAutoLock(min);
    onUpdateAutoLock(min);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        !isPinConfigured
          ? 'Configurar PIN de Seguridad'
          : mode === 'change'
          ? 'Cambiar PIN'
          : mode === 'disable'
          ? 'Desactivar PIN'
          : 'Seguridad y Bloqueo por PIN'
      }
      maxWidth="520px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Mensaje de Éxito */}
        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              color: 'var(--accent-success)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            <CheckCircle2 size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--accent-danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            <ShieldAlert size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Vista principal si no hay PIN o modo vista */}
        {!isPinConfigured ? (
          <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Protege el acceso a tu Punto de Venta configurando un PIN numérico de 4 dígitos. Funciona de manera 100% local y offline.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nuevo PIN (4 dígitos)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                style={{
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  fontWeight: 700
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Confirmar PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                style={{
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  fontWeight: 700
                }}
              />
            </div>

            {/* Selector Auto-lock */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Bloqueo automático por inactividad
              </label>
              <select
                value={selectedAutoLock}
                onChange={(e) => setSelectedAutoLock(Number(e.target.value))}
                style={{
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  padding: '0 12px',
                  fontSize: '14px'
                }}
              >
                <option value={0}>Desactivado (solo bloqueo manual)</option>
                <option value={1}>1 minuto</option>
                <option value={5}>5 minutos</option>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isProcessing}>
                Guardar PIN
              </Button>
            </div>
          </form>
        ) : mode === 'view' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-success)'
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                  Protección por PIN Activa
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Tu terminal está protegida contra accesos no autorizados.
                </div>
              </div>
            </div>

            {/* Ajuste de Auto-bloqueo */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px',
                backgroundColor: 'var(--bg-card-secondary)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px' }}>
                <Timer size={18} color="var(--brand-primary)" />
                <span>Bloqueo automático por inactividad</span>
              </div>
              <select
                value={selectedAutoLock}
                onChange={(e) => handleAutoLockChange(Number(e.target.value))}
                style={{
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  padding: '0 10px',
                  fontSize: '14px'
                }}
              >
                <option value={0}>Desactivado (solo bloqueo manual / atajo Alt + L)</option>
                <option value={1}>1 minuto</option>
                <option value={5}>5 minutos</option>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
              </select>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode('change')}
                leftIcon={<KeyRound size={18} />}
                style={{ justifyContent: 'flex-start', height: '48px' }}
              >
                Cambiar PIN actual
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={() => setMode('disable')}
                leftIcon={<Trash2 size={18} />}
                style={{ justifyContent: 'flex-start', height: '48px' }}
              >
                Desactivar PIN de seguridad
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <Button type="button" variant="primary" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : mode === 'change' ? (
          <form onSubmit={handleChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                PIN Actual
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                style={{
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '8px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nuevo PIN (4 dígitos)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                style={{
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '8px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Confirmar Nuevo PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                style={{
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '8px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={() => setMode('view')}>
                Volver
              </Button>
              <Button type="submit" variant="primary" disabled={isProcessing}>
                Actualizar PIN
              </Button>
            </div>
          </form>
        ) : (
          /* Modo Desactivar */
          <form onSubmit={handleDisable} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--accent-danger)', fontSize: '14px', margin: 0, fontWeight: 500 }}>
              ¿Estás seguro de desactivar la protección por PIN? Cualquier persona que acceda a este dispositivo podrá usar la aplicación sin restricciones.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Ingresa tu PIN actual para confirmar
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                style={{
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '8px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={() => setMode('view')}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" disabled={isProcessing}>
                Confirmar Desactivación
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
