import React, { useState, useEffect } from 'react';
import { Banknote, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { debtsRepository } from '../../../repositories/debtsRepository';
import { NoOpenSessionError } from '../../../repositories/salesRepository';
import { formatCOP, formatNumberWithDots, parseCOPInput } from '../../../utils/currency';
import type { DebtWithDetails, PaymentMethod } from '../../../types';

interface RegisterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtWithDetails | null;
  onSuccess?: (info: { amount: number; remaining: number; debtorName: string; folio: string }) => void;
  onRequireOpenSession?: () => void;
}

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  onSuccess,
  onRequireOpenSession
}) => {
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && debt) {
      setAmountRaw(formatNumberWithDots(debt.remainingAmount));
      setPaymentMethod('cash');
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, debt?.id]);

  if (!debt) return null;

  const parsedAmount = parseCOPInput(amountRaw);
  const remainingAfterPayment = Math.max(0, debt.remainingAmount - parsedAmount);
  const isFullPayment = parsedAmount === debt.remainingAmount && debt.remainingAmount > 0;

  const handleQuickPercentage = (fraction: number) => {
    const val = Math.round(debt.remainingAmount * fraction);
    setAmountRaw(val > 0 ? formatNumberWithDots(val) : '');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setErrorMsg('Ingresa un monto de abono válido mayor a $0.');
      return;
    }
    if (parsedAmount > debt.remainingAmount) {
      setErrorMsg(`El monto no puede superar el saldo pendiente (${formatCOP(debt.remainingAmount)}).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await debtsRepository.registerPayment({
        debtId: debt.id,
        amount: parsedAmount,
        paymentMethod,
        notes: notes.trim() || undefined
      });

      onSuccess?.({
        amount: parsedAmount,
        remaining: result.updatedDebt.remainingAmount,
        debtorName: debt.debtorName,
        folio: debt.folio
      });
      onClose();
    } catch (err) {
      if (err instanceof NoOpenSessionError) {
        onClose();
        onRequireOpenSession?.();
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar el abono.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Abono a Cuenta"
      subtitle={`${debt.folio} • ${debt.debtorName}`}
      maxWidth="460px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Resumen del Saldo Actual */}
        <div
          style={{
            backgroundColor: '#f8f1fd',
            borderRadius: '20px',
            padding: '16px 18px',
            border: '1px solid rgba(207, 195, 207, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#6d5773',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              Saldo Pendiente Actual
            </span>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#310344',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatCOP(debt.remainingAmount)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#6d5773',
              paddingTop: '6px',
              borderTop: '1px solid #e6e0eb'
            }}
          >
            <span>Deuda total: {formatCOP(debt.totalAmount)}</span>
            <span>Abonado previo: {formatCOP(debt.paidAmount)}</span>
          </div>
        </div>

        {/* Monto a Abonar + Atajos */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}
          >
            <label
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#310344',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              MONTO A ABONAR (COP) *
            </label>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleQuickPercentage(0.5)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: '1px solid #cfc3cf',
                  backgroundColor: '#ffffff',
                  color: '#4d444e',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercentage(1)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: '1px solid #310344',
                  backgroundColor: isFullPayment ? '#310344' : '#ffffff',
                  color: isFullPayment ? '#ffffff' : '#310344',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Liquidar 100%
              </button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '22px',
                fontWeight: 700,
                color: '#6d5773'
              }}
            >
              $
            </span>
            <input
              type="text"
              required
              autoFocus
              placeholder="0"
              value={amountRaw}
              onChange={(e) => {
                const clean = parseCOPInput(e.target.value);
                setAmountRaw(clean > 0 ? formatNumberWithDots(clean) : '');
                setErrorMsg(null);
              }}
              style={{
                width: '100%',
                height: '54px',
                borderRadius: '20px',
                border: '1.5px solid #310344',
                backgroundColor: '#f8f1fd',
                padding: '0 18px 0 38px',
                fontSize: '24px',
                fontWeight: 700,
                color: '#310344',
                outline: 'none',
                boxSizing: 'border-box',
                fontVariantNumeric: 'tabular-nums'
              }}
            />
          </div>

          {parsedAmount > 0 && parsedAmount <= debt.remainingAmount && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '12.5px',
                color: remainingAfterPayment === 0 ? '#1e7e34' : '#6d5773',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span>
                {remainingAfterPayment === 0
                  ? '✓ Este pago saldará la cuenta al 100%'
                  : 'Quedará un saldo pendiente de:'}
              </span>
              {remainingAfterPayment > 0 && <strong>{formatCOP(remainingAfterPayment)}</strong>}
            </div>
          )}
        </div>

        {/* Selector de Método de Pago */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#4d444e',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}
          >
            MÉTODO DE PAGO (ENTRA A CAJA Y VENTAS HOY)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              style={{
                padding: '12px 14px',
                borderRadius: '16px',
                border: paymentMethod === 'cash' ? '1.5px solid #310344' : '1px solid #cfc3cf',
                backgroundColor: paymentMethod === 'cash' ? '#310344' : '#ffffff',
                color: paymentMethod === 'cash' ? '#ffffff' : '#1d1a22',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Banknote size={16} />
              <span>Efectivo</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('transfer')}
              style={{
                padding: '12px 14px',
                borderRadius: '16px',
                border: paymentMethod === 'transfer' ? '1.5px solid #310344' : '1px solid #cfc3cf',
                backgroundColor: paymentMethod === 'transfer' ? '#310344' : '#ffffff',
                color: paymentMethod === 'transfer' ? '#ffffff' : '#1d1a22',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Smartphone size={16} />
              <span>Nequi / Transf.</span>
            </button>
          </div>
        </div>

        {/* Comprobante / Referencia */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#4d444e',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}
          >
            COMPROBANTE / NOTA (OPCIONAL)
          </label>
          <input
            type="text"
            placeholder="Ej. Aprobación Nequi #88921 o abono en mostrador..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '16px',
              border: '1px solid #cfc3cf',
              backgroundColor: '#ffffff',
              padding: '0 14px',
              fontSize: '13px',
              color: '#1d1a22',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '14px',
              backgroundColor: '#ffdad6',
              color: '#93000a',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', paddingTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '13px 16px',
              borderRadius: '18px',
              border: '1px solid #cfc3cf',
              backgroundColor: '#f2ecf7',
              color: '#1d1a22',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || parsedAmount <= 0 || parsedAmount > debt.remainingAmount}
            style={{
              flex: 1.5,
              padding: '13px 20px',
              borderRadius: '18px',
              border: 'none',
              backgroundColor:
                parsedAmount > 0 && parsedAmount <= debt.remainingAmount ? '#310344' : '#e6e0eb',
              color: parsedAmount > 0 && parsedAmount <= debt.remainingAmount ? '#ffffff' : '#7e747f',
              fontSize: '14px',
              fontWeight: 700,
              cursor:
                parsedAmount > 0 && parsedAmount <= debt.remainingAmount && !isSubmitting
                  ? 'pointer'
                  : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow:
                parsedAmount > 0 && parsedAmount <= debt.remainingAmount
                  ? '0 8px 20px rgba(49, 3, 68, 0.22)'
                  : 'none'
            }}
          >
            <CheckCircle2 size={18} />
            <span>
              {isSubmitting
                ? 'Procesando...'
                : isFullPayment
                ? 'Liquidar Cuenta Total'
                : 'Aplicar Abono a Caja'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
