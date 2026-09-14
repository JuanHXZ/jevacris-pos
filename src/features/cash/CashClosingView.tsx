import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Timer,
  Printer,
  PiggyBank,
  Banknote,
  QrCode,
  Lock,
  CircleCheck,
  AlertTriangle,
  Receipt,
  ArrowRight,
  Plus,
  Minus,
  ArrowUpRight,
  Scale,
  Sparkles,
  HelpCircle,
  ShoppingBag
} from 'lucide-react';
import { db } from '../../db';
import { cashSessionRepository } from '../../repositories/cashSessionRepository';
import { formatCOP, formatNumberWithDots, parseCOPInput } from '../../utils/currency';
import { CashHistoryModal } from './components/CashHistoryModal';

interface CashClosingViewProps {
  onCloseSuccess?: () => void;
  onGoToSales?: () => void;
}

interface Denomination {
  label: string;
  value: number;
  count: number;
}

const DEFAULT_DENOMINATIONS: Omit<Denomination, 'count'>[] = [
  { label: 'Billetes de $100.000', value: 100000 },
  { label: 'Billetes de $50.000', value: 50000 },
  { label: 'Billetes de $20.000', value: 20000 },
  { label: 'Billetes de $10.000', value: 10000 },
  { label: 'Billetes de $5.000', value: 5000 },
  { label: 'Billetes de $2.000', value: 2000 }
];

export const CashClosingView: React.FC<CashClosingViewProps> = ({
  onCloseSuccess,
  onGoToSales
}) => {
  // 1. Sesión activa
  const openSession = useLiveQuery(
    () => db.cashSessions.filter((s) => s.status === 'open').first(),
    []
  );

  // 2. Ventas y Gastos vinculados a la sesión
  const sales = useLiveQuery(
    () => (openSession ? db.sales.where('cashSessionId').equals(openSession.id).toArray() : []),
    [openSession?.id]
  );

  const expenses = useLiveQuery(
    () => (openSession ? db.expenses.where('cashSessionId').equals(openSession.id).toArray() : []),
    [openSession?.id]
  );

  // Totales calculados de ventas
  const cashSales = useMemo(() => (sales || []).filter((s) => s.paymentMethod === 'cash'), [sales]);
  const transferSales = useMemo(() => (sales || []).filter((s) => s.paymentMethod === 'transfer'), [sales]);

  const cashSalesTotal = useMemo(
    () => cashSales.reduce((sum, s) => sum + s.totalAmount, 0),
    [cashSales]
  );
  const transferSalesTotal = useMemo(
    () => transferSales.reduce((sum, s) => sum + s.totalAmount, 0),
    [transferSales]
  );
  const allSalesTotal = cashSalesTotal + transferSalesTotal;

  // Totales de gastos existentes
  const savedExpensesTotal = useMemo(
    () => (expenses || []).reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  // Estado de desglose de efectivo
  const [denominations, setDenominations] = useState<Denomination[]>(
    DEFAULT_DENOMINATIONS.map((d) => ({ ...d, count: 0 }))
  );
  const [coinsAmountRaw, setCoinsAmountRaw] = useState<string>('0');
  const [countedCashRaw, setCountedCashRaw] = useState<string>('0');

  // Estado de gasto adicional rápido en el cierre
  const [quickExpenseAmountRaw, setQuickExpenseAmountRaw] = useState<string>('');
  const [quickExpenseConcept, setQuickExpenseConcept] = useState<string>('');

  // Observaciones del turno
  const [notes, setNotes] = useState<string>('Turno sin novedades, dinero cuadrado conforme a las ventas del día.');

  // Modales
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gasto adicional pendiente
  const pendingQuickExpense = parseCOPInput(quickExpenseAmountRaw);
  const totalExpenses = savedExpensesTotal + (pendingQuickExpense > 0 ? pendingQuickExpense : 0);

  // Base inicial y esperado
  const openingCash = openSession?.openingCash || 0;
  const closingCashCalculated = Math.max(0, openingCash + cashSalesTotal - totalExpenses);

  // Total físico contado
  const countedCash = parseCOPInput(countedCashRaw);
  const difference = countedCash - closingCashCalculated;

  // Duración y formateo del turno
  const shiftDuration = useMemo(() => {
    if (!openSession?.openedAt) return '';
    const openDate = new Date(openSession.openedAt);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - openDate.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  }, [openSession?.openedAt]);

  const openTimeFormatted = useMemo(() => {
    if (!openSession?.openedAt) return '';
    return new Date(openSession.openedAt).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [openSession?.openedAt]);

  // Actualizar el total contado al cambiar denominaciones
  const updateDenominationCount = (index: number, delta: number) => {
    setDenominations((prev) => {
      const next = [...prev];
      const newCount = Math.max(0, next[index].count + delta);
      next[index] = { ...next[index], count: newCount };

      const billsSum = next.reduce((sum, item) => sum + item.value * item.count, 0);
      const total = billsSum + parseCOPInput(coinsAmountRaw);
      setCountedCashRaw(formatNumberWithDots(total));
      return next;
    });
  };

  const handleCoinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const coinsNum = parseCOPInput(rawVal);
    setCoinsAmountRaw(formatNumberWithDots(coinsNum));
    const billsSum = denominations.reduce((sum, item) => sum + item.value * item.count, 0);
    setCountedCashRaw(formatNumberWithDots(billsSum + coinsNum));
  };

  const handleManualCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const num = parseCOPInput(rawVal);
    setCountedCashRaw(formatNumberWithDots(num));
  };

  const handleExecuteClose = async () => {
    if (!openSession) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Si hay un gasto rápido pendiente, lo persistimos primero
      if (pendingQuickExpense > 0) {
        await cashSessionRepository.addExpense({
          category: 'other',
          amount: pendingQuickExpense,
          description: quickExpenseConcept.trim() || 'Gasto de gaveta registrado en cierre'
        });
      }

      // 2. Ejecutar el cierre de la sesión
      await cashSessionRepository.close({
        countedCash,
        notes
      });

      setShowConfirmModal(false);
      if (onCloseSuccess) {
        onCloseSuccess();
      }
    } catch (err) {
      console.error('Error al cerrar caja:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado al cerrar caja');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header de Página */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
          paddingBottom: '24px',
          borderBottom: '1px solid #ede6f2'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: 800,
                color: '#310344',
                letterSpacing: '-0.8px',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Cierre de Caja & Arqueo
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#065f46',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px #10b981'
                }}
              />
              Turno en Curso (#{openSession?.id?.slice(-4) || 'ACTIVO'})
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#7a7082' }}>
            Concilia las ventas registradas por sistema con el efectivo contado en la gaveta y transferencias.
          </p>
        </div>

        {/* Turno Info y Botón Preliminar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '10px 16px',
              borderRadius: '16px',
              border: '1px solid #ede6f2',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#7a7082'
            }}
          >
            <Timer size={18} color="#310344" />
            <span style={{ fontWeight: 600, color: '#1d1a22' }}>
              Abierto: {openTimeFormatted || '08:00 AM'} ({shiftDuration || 'En curso'})
            </span>
          </div>

          {onGoToSales && (
            <button
              onClick={onGoToSales}
              style={{
                backgroundColor: '#ffffff',
                color: '#310344',
                fontWeight: 700,
                padding: '10px 16px',
                borderRadius: '16px',
                border: '1px solid #ede6f2',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f7f2fa')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <ShoppingBag size={18} />
              <span>Volver a Ventas</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: '#ffffff',
              color: '#310344',
              fontWeight: 700,
              padding: '10px 18px',
              borderRadius: '16px',
              border: '1px solid #ede6f2',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f7f2fa')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <Printer size={18} />
            <span>Imprimir Preliminar</span>
          </button>
        </div>
      </div>

      {/* Resumen de Métricas del Turno (4 Tarjetas) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        {/* Base Inicial */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '20px 24px',
            borderRadius: '24px',
            border: '1px solid #ede6f2',
            boxShadow: '0 4px 16px rgba(49, 3, 68, 0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7a7082' }}>
              Base Inicial
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#f7f2fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PiggyBank size={20} color="#310344" />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#310344', letterSpacing: '-0.5px' }}>
            {formatCOP(openingCash)}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#7a7082' }}>
            Registrado a las {openTimeFormatted || 'apertura'}
          </p>
        </div>

        {/* Ventas Efectivo */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '20px 24px',
            borderRadius: '24px',
            border: '1px solid #ede6f2',
            boxShadow: '0 4px 16px rgba(49, 3, 68, 0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7a7082' }}>
              Ventas Efectivo
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={20} color="#059669" />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#1d1a22', letterSpacing: '-0.5px' }}>
            {formatCOP(cashSalesTotal)}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
            {cashSales.length} transacciones en gaveta
          </p>
        </div>

        {/* Ventas Nequi / QR */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '20px 24px',
            borderRadius: '24px',
            border: '1px solid #ede6f2',
            boxShadow: '0 4px 16px rgba(49, 3, 68, 0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7a7082' }}>
              Ventas Nequi / QR
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'rgba(147, 51, 234, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={20} color="#7e22ce" />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#1d1a22', letterSpacing: '-0.5px' }}>
            {formatCOP(transferSalesTotal)}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#7e22ce', fontWeight: 600 }}>
            {transferSales.length} transacciones verificadas
          </p>
        </div>

        {/* Ventas Totales */}
        <div
          style={{
            backgroundColor: '#310344',
            padding: '20px 24px',
            borderRadius: '24px',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(49, 3, 68, 0.22)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Ventas Totales
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={20} color="#fde68a" />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            {formatCOP(allSalesTotal)}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>
            {(sales || []).length} ventas en total
          </p>
        </div>
      </div>

      {/* Grid Principal (12 Columnas) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '32px',
          alignItems: 'start'
        }}
      >
        {/* Columna Izquierda: Arqueo Dinero Físico (7 cols) */}
        <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '28px',
              border: '1px solid #ede6f2',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#310344' }}>
                  Arqueo de Efectivo en Gaveta
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7a7082' }}>
                  Ingresa el monto físico contado en el cajón
                </p>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#065f46',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}
              >
                Esperado: {formatCOP(closingCashCalculated)}
              </span>
            </div>

            {/* Input Total Contado */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#4d444e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  marginBottom: '8px'
                }}
              >
                Total Efectivo Real Contado ($)
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#1d1a22'
                  }}
                >
                  $
                </span>
                <input
                  type="text"
                  value={countedCashRaw}
                  onChange={handleManualCountChange}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#fbf9fc',
                    border: '2px solid rgba(16, 185, 129, 0.5)',
                    borderRadius: '18px',
                    padding: '16px 20px 16px 52px',
                    fontSize: '30px',
                    fontWeight: 800,
                    color: '#1d1a22',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    letterSpacing: '-0.5px',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#10b981')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)')}
                />

                {/* Badge en vivo de diferencia */}
                <div
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: '12px',
                    backgroundColor:
                      difference === 0
                        ? '#d1fae5'
                        : difference > 0
                        ? '#e0e7ff'
                        : '#fee2e2',
                    color:
                      difference === 0
                        ? '#065f46'
                        : difference > 0
                        ? '#3730a3'
                        : '#991b1b'
                  }}
                >
                  {difference === 0 ? (
                    <>
                      <CircleCheck size={16} />
                      <span>Exacto ($0)</span>
                    </>
                  ) : difference > 0 ? (
                    <>
                      <Sparkles size={16} />
                      <span>Sobrante (+{formatCOP(difference)})</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      <span>Faltante (-{formatCOP(Math.abs(difference))})</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Desglose rápido de billetes y monedas */}
            <div style={{ borderTop: '1px solid #ede6f2', paddingTop: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#4d444e', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Conteo Rápido de Billetes y Monedas
                </span>
                <span style={{ fontSize: '11px', color: '#7a7082' }}>
                  Modifica las unidades para autocalcular
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {denominations.map((denom, index) => {
                  const subtotal = denom.value * denom.count;
                  return (
                    <div
                      key={denom.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        backgroundColor: '#fbf9fc',
                        borderRadius: '16px',
                        border: '1px solid #ede6f2',
                        fontSize: '13px'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#1d1a22' }}>{denom.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => updateDenominationCount(index, -1)}
                            disabled={denom.count <= 0}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '8px',
                              border: '1px solid #ede6f2',
                              backgroundColor: '#ffffff',
                              color: '#310344',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: denom.count <= 0 ? 'not-allowed' : 'pointer',
                              opacity: denom.count <= 0 ? 0.4 : 1
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                            {denom.count}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateDenominationCount(index, 1)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '8px',
                              border: '1px solid #ede6f2',
                              backgroundColor: '#ffffff',
                              color: '#310344',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span style={{ fontWeight: 800, color: '#1d1a22', width: '100px', textAlign: 'right' }}>
                          {formatCOP(subtotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Monedas fraccionales (Total libre) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    backgroundColor: '#fbf9fc',
                    borderRadius: '16px',
                    border: '1px solid #ede6f2',
                    fontSize: '13px'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#1d1a22' }}>Monedas (Total libre)</span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#7a7082' }}>Fracción suelta acumulada</span>
                  </div>
                  <div style={{ position: 'relative', width: '120px' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#7a7082'
                      }}
                    >
                      $
                    </span>
                    <input
                      type="text"
                      value={coinsAmountRaw}
                      onChange={handleCoinsChange}
                      placeholder="0"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff',
                        border: '1px solid #ede6f2',
                        borderRadius: '10px',
                        padding: '6px 10px 6px 22px',
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#1d1a22',
                        textAlign: 'right',
                        outline: 'none',
                        fontFamily: 'var(--font-sans)',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#310344')}
                      onBlur={(e) => (e.target.style.borderColor = '#ede6f2')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Gastos Menores / Salidas de gaveta en el turno */}
            <div style={{ borderTop: '1px solid #ede6f2', paddingTop: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowUpRight size={18} color="#310344" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#4d444e', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Gastos Varios / Retiros Menores (Opcional)
                  </span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#7a7082', backgroundColor: '#f7f2fa', padding: '2px 10px', borderRadius: '9999px' }}>
                  Opcional
                </span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#7a7082' }}>
                Registra compras de emergencia, domicilios o pagos varios en efectivo autorizados durante el turno.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 700, color: '#7a7082' }}>
                    $
                  </span>
                  <input
                    type="text"
                    placeholder="0"
                    value={quickExpenseAmountRaw}
                    onChange={(e) => setQuickExpenseAmountRaw(formatNumberWithDots(parseCOPInput(e.target.value)))}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: '#fbf9fc',
                      border: '1px solid #ede6f2',
                      borderRadius: '14px',
                      padding: '10px 12px 10px 28px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#1d1a22',
                      outline: 'none'
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Concepto o motivo del gasto (ej. Domicilio, insumos menores)"
                  value={quickExpenseConcept}
                  onChange={(e) => setQuickExpenseConcept(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#fbf9fc',
                    border: '1px solid #ede6f2',
                    borderRadius: '14px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    color: '#1d1a22',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Observaciones del Cierre */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#4d444e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  marginBottom: '8px'
                }}
              >
                Comentarios de Cierre de Turno
              </label>
              <input
                type="text"
                placeholder="Turno sin novedades, dinero cuadrado conforme a las ventas."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#fbf9fc',
                  border: '1px solid #ede6f2',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: '#1d1a22',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Conciliación y Liquidación Final (5 cols) */}
        <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tarjeta de Conciliación */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '28px',
              border: '1px solid #ede6f2',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}
          >
            <h3
              style={{
                margin: '0 0 20px',
                fontSize: '16px',
                fontWeight: 800,
                color: '#310344',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Scale size={20} color="#310344" />
              Conciliación de Caja
            </h3>

            {/* Desglose Matemático */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '13px',
                borderBottom: '1px solid #ede6f2',
                paddingBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4d444e' }}>
                <span>Fondo Inicial de Caja</span>
                <span style={{ fontWeight: 700, color: '#1d1a22' }}>{formatCOP(openingCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4d444e' }}>
                <span>(+) Ventas en Efectivo</span>
                <span style={{ fontWeight: 700, color: '#1d1a22' }}>{formatCOP(cashSalesTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#4d444e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>(-) Retiros / Gastos de Caja</span>
                  <HelpCircle size={14} color="#7a7082" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {totalExpenses === 0 && (
                    <span style={{ fontSize: '11px', color: '#7a7082', fontWeight: 500 }}>(Sin salidas)</span>
                  )}
                  <span style={{ fontWeight: 700, color: totalExpenses > 0 ? '#991b1b' : '#1d1a22' }}>
                    {formatCOP(totalExpenses)}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px dashed #ede6f2',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#310344'
                }}
              >
                <span>Total Esperado en Gaveta</span>
                <span>{formatCOP(closingCashCalculated)}</span>
              </div>
            </div>

            {/* Total reportado vs Diferencia */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                fontSize: '13px',
                padding: '20px 0',
                borderBottom: '1px solid #ede6f2'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4d444e' }}>
                <span>Total Físico Reportado</span>
                <span style={{ fontWeight: 800, color: '#1d1a22' }}>{formatCOP(countedCash)}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  fontWeight: 800,
                  backgroundColor:
                    difference === 0
                      ? '#d1fae5'
                      : difference > 0
                      ? '#e0e7ff'
                      : '#fee2e2',
                  color:
                    difference === 0
                      ? '#065f46'
                      : difference > 0
                      ? '#3730a3'
                      : '#991b1b'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CircleCheck size={18} />
                  Diferencia de Arqueo
                </span>
                <span style={{ fontSize: '14px' }}>
                  {difference === 0
                    ? '$ 0 COP (Exacto)'
                    : difference > 0
                    ? `+${formatCOP(difference)} (Sobrante)`
                    : `-${formatCOP(Math.abs(difference))} (Faltante)`}
                </span>
              </div>
            </div>

            {/* Pagos Digitales */}
            <div style={{ padding: '16px 0 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: '#1d1a22' }}>Transferencias Nequi</span>
                <span style={{ fontWeight: 800, color: '#7e22ce' }}>{formatCOP(transferSalesTotal)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#7a7082' }}>
                Comprobantes validados en cuenta institucional JEVACRIS.
              </p>
            </div>

            {/* Mensaje de error si ocurre */}
            {errorMessage && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px'
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Botón CTA: Finalizar y Cerrar Caja */}
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                backgroundColor: '#310344',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '15px',
                padding: '16px 20px',
                borderRadius: '18px',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                boxShadow: '0 8px 24px rgba(49, 3, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'background-color 0.2s, transform 0.1s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#42065c')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#310344')}
            >
              <Lock size={20} />
              <span>Finalizar y Cerrar Caja</span>
            </button>

            <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: '11px', color: '#7a7082' }}>
              Se generará automáticamente el comprobante Z de cierre con auditoría completa.
            </p>
          </div>

          {/* Atajo Rápido: Historial de Cierres */}
          <div
            onClick={() => setIsHistoryModalOpen(true)}
            style={{
              backgroundColor: '#f7f2fa',
              borderRadius: '24px',
              padding: '20px 24px',
              border: '1px solid #ede6f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(49, 3, 68, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  color: '#310344',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
                }}
              >
                <Receipt size={20} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#310344' }}>
                  Historial de Cierres
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#7a7082' }}>
                  Consultar turnos y arqueos Z anteriores
                </p>
              </div>
            </div>
            <ArrowRight size={20} color="#310344" />
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Cierre */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(29, 26, 34, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '32px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '20px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 800, color: '#310344' }}>
              ¿Confirmar Cierre de Caja?
            </h3>

            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#7a7082', lineHeight: '1.5' }}>
              Al finalizar, el turno actual quedará registrado con un efectivo contado de{' '}
              <strong style={{ color: '#1d1a22' }}>{formatCOP(countedCash)}</strong> (Diferencia:{' '}
              <strong style={{ color: difference === 0 ? '#059669' : '#991b1b' }}>
                {difference === 0 ? '$0 Exacto' : formatCOP(difference)}
              </strong>
              ). Nuevas ventas requerirán abrir una nueva sesión.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '16px',
                  border: '1px solid #ede6f2',
                  backgroundColor: '#ffffff',
                  color: '#4d444e',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteClose}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: '#310344',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 6px 18px rgba(49, 3, 68, 0.25)'
                }}
              >
                {isSubmitting ? 'Cerrando...' : 'Sí, Cerrar Caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Cierres */}
      <CashHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
};
