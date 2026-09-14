import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calendar,
  Clock,
  PiggyBank,
  History,
  ShieldCheck,
  LockKeyholeOpen,
  CircleCheck,
  Plus,
  Minus,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { db } from '../../db';
import { cashSessionRepository } from '../../repositories/cashSessionRepository';
import { formatCOP, formatNumberWithDots, parseCOPInput } from '../../utils/currency';
import type { CashSession } from '../../types';
import { CashHistoryModal } from './components/CashHistoryModal';

interface CashOpeningViewProps {
  onOpenSuccess?: () => void;
  onCancel?: () => void;
  onGoToSales?: () => void;
}

interface Denomination {
  label: string;
  value: number;
  type: 'bill' | 'coin';
  count: number;
}

const DEFAULT_DENOMINATIONS: Omit<Denomination, 'count'>[] = [
  { label: 'Billetes de $100.000', value: 100000, type: 'bill' },
  { label: 'Billetes de $50.000', value: 50000, type: 'bill' },
  { label: 'Billetes de $20.000', value: 20000, type: 'bill' },
  { label: 'Billetes de $10.000', value: 10000, type: 'bill' },
  { label: 'Billetes de $5.000', value: 5000, type: 'bill' },
  { label: 'Billetes de $2.000', value: 2000, type: 'bill' }
];

export const CashOpeningView: React.FC<CashOpeningViewProps> = ({
  onOpenSuccess,
  onCancel,
  onGoToSales
}) => {
  // Estado de la sesión actual
  const openSession = useLiveQuery(
    () => db.cashSessions.filter((s) => s.status === 'open').first(),
    []
  );
  const isOpen = Boolean(openSession);

  // Sesión previa cerrada más reciente
  const previousSession = useLiveQuery(
    async () => {
      const closed = await db.cashSessions.filter((s) => s.status === 'closed').toArray();
      return closed.sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''))[0] as CashSession | undefined;
    },
    []
  );

  // Datos de formulario
  const [openingCashRaw, setOpeningCashRaw] = useState<string>('200.000');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Conteo por denominaciones (Billetes) y Monedas libres
  const [denominations, setDenominations] = useState<Denomination[]>(() =>
    DEFAULT_DENOMINATIONS.map((d) => {
      if (d.value === 50000) return { ...d, count: 2 };
      if (d.value === 20000) return { ...d, count: 3 };
      if (d.value === 10000) return { ...d, count: 4 };
      return { ...d, count: 0 };
    })
  );
  const [coinsAmountRaw, setCoinsAmountRaw] = useState<string>('0');

  const [useDenominationsTotal, setUseDenominationsTotal] = useState<boolean>(false);

  const coinsAmount = parseCOPInput(coinsAmountRaw);

  // Total calculado a partir de los billetes + monto libre de monedas
  const denominationsTotal = useMemo(() => {
    const billsSum = denominations.reduce((sum, d) => sum + d.value * d.count, 0);
    return billsSum + coinsAmount;
  }, [denominations, coinsAmount]);

  // Si se modifica el conteo y está activo el desglose, sincronizar con el input principal
  useEffect(() => {
    if (useDenominationsTotal) {
      setOpeningCashRaw(formatNumberWithDots(denominationsTotal));
    }
  }, [denominationsTotal, useDenominationsTotal]);

  const handleDenominationChange = (index: number, delta: number) => {
    setDenominations((prev) => {
      const copy = [...prev];
      const nextCount = Math.max(0, copy[index].count + delta);
      copy[index] = { ...copy[index], count: nextCount };
      return copy;
    });
    setUseDenominationsTotal(true);
  };

  const handleCoinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseCOPInput(raw);
    setCoinsAmountRaw(formatNumberWithDots(num));
    setUseDenominationsTotal(true);
  };

  const handleClearDenominations = () => {
    setDenominations((prev) => prev.map((d) => ({ ...d, count: 0 })));
    setCoinsAmountRaw('0');
    setUseDenominationsTotal(false);
    setOpeningCashRaw('');
  };

  // Manejador de Apertura
  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseCOPInput(openingCashRaw);
    if (amount <= 0) {
      setError('Debes ingresar un valor base mayor a $0 para abrir la caja');
      return;
    }

    try {
      setIsSubmitting(true);
      await cashSessionRepository.open(amount, notes);
      setSuccessMessage('¡Caja abierta exitosamente! El turno ha sido iniciado.');
      if (onOpenSuccess) {
        onOpenSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la caja');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fecha y hora formateadas en tiempo real
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const timeFormatted = useMemo(() => {
    return new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const currentShiftName = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 13) return 'Turno Mañana';
    if (hour < 19) return 'Turno Tarde';
    return 'Turno Noche';
  }, []);

  const totalAmount = parseCOPInput(openingCashRaw);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header de Página */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
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
              Apertura de Caja
            </h1>
            {isOpen ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
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
                    backgroundColor: '#10b981'
                  }}
                />
                Caja Abierta
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b'
                  }}
                />
                Caja Cerrada
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#7a7082' }}>
            Registra la base de efectivo inicial para habilitar la facturación y ventas del turno.
          </p>
        </div>

        {/* Píldoras de Fecha y Turno */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '10px 16px',
              borderRadius: '16px',
              border: '1px solid #ede6f2',
              boxShadow: '0 2px 6px rgba(49, 3, 68, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#4d444e',
              fontWeight: 500,
              textTransform: 'capitalize'
            }}
          >
            <Calendar size={16} color="#310344" />
            <span>Hoy, {todayFormatted}</span>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '10px 16px',
              borderRadius: '16px',
              border: '1px solid #ede6f2',
              boxShadow: '0 2px 6px rgba(49, 3, 68, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#4d444e',
              fontWeight: 500
            }}
          >
            <Clock size={16} color="#310344" />
            <span>
              {timeFormatted} ({currentShiftName})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            style={{
              backgroundColor: '#ffffff',
              padding: '10px 18px',
              borderRadius: '16px',
              border: '1px solid #ede6f2',
              boxShadow: '0 2px 6px rgba(49, 3, 68, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#310344',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f1fd';
              e.currentTarget.style.borderColor = '#310344';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#ede6f2';
            }}
          >
            <History size={16} color="#310344" />
            <span>Historial de Cierres</span>
          </button>
        </div>
      </div>

      {/* Banner de Caja Ya Abierta (si aplica) */}
      {isOpen && openSession && (
        <div
          style={{
            marginBottom: '28px',
            padding: '24px',
            borderRadius: '24px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}
            >
              <CircleCheck size={26} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#065f46' }}>
                Jornada activa en curso
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#4d444e' }}>
                Iniciada el{' '}
                {new Date(openSession.openedAt).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}{' '}
                con una base de <strong>{formatCOP(openSession.openingCash)}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={onGoToSales}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px',
              backgroundColor: '#310344',
              color: '#f6d9fb',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(49, 3, 68, 0.18)'
            }}
          >
            <span>Ir a Punto de Venta</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Alerta de Error o Éxito */}
      {error && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 18px',
            borderRadius: '18px',
            backgroundColor: '#ffdad6',
            color: '#93000a',
            fontSize: '13px',
            fontWeight: 600,
            border: '1px solid #ffb4ab'
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 18px',
            borderRadius: '18px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            color: '#065f46',
            fontSize: '13px',
            fontWeight: 600,
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Grid Principal (8 cols / 4 cols) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '28px',
          alignItems: 'start'
        }}
        className="cash-opening-grid"
      >
        {/* Columna Izquierda (8 columnas) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tarjeta de Apertura y Conteo */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '32px',
              border: '1px solid #ede6f2',
              boxShadow: '0 4px 20px rgba(49, 3, 68, 0.04)'
            }}
          >
            {/* Header Tarjeta */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '16px',
                    backgroundColor: '#f7f2fa',
                    color: '#310344',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PiggyBank size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#310344' }}>
                    Base de Efectivo Inicial
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#7a7082' }}>
                    Indica el monto con el que inicia el cajón monedero
                  </p>
                </div>
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#310344',
                  backgroundColor: '#f7f2fa',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  border: '1px solid #ede6f2'
                }}
              >
                Caja #01 - Principal
              </span>
            </div>

            {/* Formulario */}
            <form onSubmit={handleOpenCash}>
              {/* Input Monto Principal */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#4d444e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '8px'
                  }}
                >
                  MONTO BASE TOTAL ($ COP)
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '30px',
                      fontWeight: 800,
                      color: '#310344',
                      pointerEvents: 'none'
                    }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    disabled={isOpen || isSubmitting}
                    value={openingCashRaw}
                    onChange={(e) => {
                      setUseDenominationsTotal(false);
                      const num = parseCOPInput(e.target.value);
                      setOpeningCashRaw(num > 0 ? formatNumberWithDots(num) : '');
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      backgroundColor: '#fbf9fc',
                      border: '2px solid #ede6f2',
                      borderRadius: '20px',
                      padding: '16px 20px 16px 52px',
                      fontSize: '32px',
                      fontWeight: 800,
                      color: '#310344',
                      letterSpacing: '-0.5px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#310344')}
                    onBlur={(e) => (e.target.style.borderColor = '#ede6f2')}
                  />
                </div>
              </div>

              {/* Conteo por denominaciones (opcional) */}
              <div
                style={{
                  paddingTop: '24px',
                  borderTop: '1px solid #ede6f2',
                  marginBottom: '24px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#4d444e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em'
                    }}
                  >
                    Conteo por Denominaciones (Opcional)
                  </span>
                  <button
                    type="button"
                    disabled={isOpen || isSubmitting}
                    onClick={handleClearDenominations}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#310344',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Limpiar conteo</span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px'
                  }}
                  className="denominations-grid"
                >
                  {denominations.map((denom, idx) => (
                    <div
                      key={denom.label}
                      style={{
                        backgroundColor: '#fbf9fc',
                        padding: '14px',
                        borderRadius: '18px',
                        border: '1px solid #ede6f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#7a7082' }}>
                          {denom.label}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '13px', fontWeight: 800, color: '#1d1a22' }}>
                          {formatCOP(denom.value * denom.count)}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          disabled={isOpen || isSubmitting || denom.count === 0}
                          onClick={() => handleDenominationChange(idx, -1)}
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
                            cursor: denom.count > 0 ? 'pointer' : 'default',
                            opacity: denom.count > 0 ? 1 : 0.4
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <span
                          style={{
                            minWidth: '28px',
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#310344'
                          }}
                        >
                          x{denom.count}
                        </span>
                        <button
                          type="button"
                          disabled={isOpen || isSubmitting}
                          onClick={() => handleDenominationChange(idx, 1)}
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
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Monedas (Total Libre) */}
                  <div
                    style={{
                      backgroundColor: '#fbf9fc',
                      padding: '14px',
                      borderRadius: '18px',
                      border: '1px solid #ede6f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#7a7082' }}>
                        Monedas (Total libre)
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#a39da8' }}>
                        Fracción o suelto
                      </p>
                    </div>

                    <div style={{ position: 'relative', width: '96px' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '11px',
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
                        disabled={isOpen || isSubmitting}
                        placeholder="0"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          backgroundColor: '#ffffff',
                          border: '1px solid #ede6f2',
                          borderRadius: '10px',
                          padding: '6px 8px 6px 18px',
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#1d1a22',
                          textAlign: 'right',
                          outline: 'none',
                          fontFamily: 'var(--font-sans)',
                          cursor: isOpen || isSubmitting ? 'not-allowed' : 'text',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#310344')}
                        onBlur={(e) => (e.target.style.borderColor = '#ede6f2')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Observaciones / Notas */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#4d444e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '8px'
                  }}
                >
                  NOTAS U OBSERVACIONES DEL CAJERO
                </label>
                <textarea
                  rows={2}
                  disabled={isOpen || isSubmitting}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Base asignada por administración para cambio de mañana..."
                  style={{
                    width: '100%',
                    backgroundColor: '#fbf9fc',
                    border: '1px solid #ede6f2',
                    borderRadius: '18px',
                    padding: '14px',
                    fontSize: '13px',
                    color: '#1d1a22',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#310344')}
                  onBlur={(e) => (e.target.style.borderColor = '#ede6f2')}
                />
              </div>
            </form>
          </div>

          {/* Historial o Registro del Turno Anterior */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #ede6f2',
              boxShadow: '0 2px 10px rgba(49, 3, 68, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#4d444e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <History size={16} color="#7a7082" />
                <span>Turno Previo Cerrado</span>
              </h3>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#310344',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Ver todos los cierres →
              </button>
            </div>

            {previousSession ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: '#fbf9fc',
                  borderRadius: '18px',
                  border: '1px solid #ede6f2',
                  fontSize: '13px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1d1a22' }}>
                      Cierre de Turno:{' '}
                      {previousSession.closedAt
                        ? new Date(previousSession.closedAt).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Reciente'}
                    </p>
                    <p style={{ margin: '3px 0 0', color: '#7a7082', fontSize: '12px' }}>
                      Saldo final contado:{' '}
                      <strong>{formatCOP(previousSession.closingCashCounted || 0)}</strong>
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontWeight: 700,
                    color: '#065f46',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontSize: '12px'
                  }}
                >
                  Cierre Registrado
                </span>
              </div>
            ) : (
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#fbf9fc',
                  borderRadius: '18px',
                  border: '1px solid #ede6f2',
                  fontSize: '13px',
                  color: '#7a7082'
                }}
              >
                No hay turnos previos registrados en este dispositivo.
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha (4 columnas) */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tarjeta de Confirmación y Habilitación de Turno */}
          <div
            style={{
              background: 'linear-gradient(135deg, #310344 0%, #4c0a68 100%)',
              borderRadius: '28px',
              padding: '32px',
              color: '#ffffff',
              boxShadow: '0 16px 40px rgba(49, 3, 68, 0.25)'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '18px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}
            >
              <LockKeyholeOpen size={24} color="#ffffff" />
            </div>

            <h2
              style={{
                margin: '0 0 8px',
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: '#ffffff'
              }}
            >
              Habilitar Turno
            </h2>

            <p
              style={{
                margin: '0 0 24px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.5'
              }}
            >
              Al abrir caja se iniciará la jornada del día, permitiendo facturar ventas en Efectivo, Nequi
              y actualizar el inventario de JEVACRIS.
            </p>

            {/* Resumen de Datos */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '18px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '28px',
                fontSize: '13px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Cajero en turno:</span>
                <span style={{ fontWeight: 700 }}>Cajero Principal</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Estación POS:</span>
                <span style={{ fontWeight: 700 }}>Terminal 01 (Boutique)</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Saldo Inicial:</span>
                <span style={{ fontWeight: 800, color: '#fde68a', fontSize: '16px' }}>
                  {formatCOP(totalAmount)} COP
                </span>
              </div>
            </div>

            {/* Botón Principal CTA */}
            <button
              onClick={handleOpenCash}
              disabled={isOpen || isSubmitting || totalAmount <= 0}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                color: '#310344',
                fontWeight: 800,
                fontSize: '15px',
                padding: '16px 20px',
                borderRadius: '18px',
                border: 'none',
                cursor: isOpen || isSubmitting || totalAmount <= 0 ? 'not-allowed' : 'pointer',
                opacity: isOpen || isSubmitting || totalAmount <= 0 ? 0.6 : 1,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'transform 0.15s ease, background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isOpen && !isSubmitting && totalAmount > 0) {
                  e.currentTarget.style.backgroundColor = '#fdf7ff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isOpen && !isSubmitting && totalAmount > 0) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }
              }}
            >
              <CircleCheck size={18} />
              <span>{isSubmitting ? 'Abriendo caja...' : 'Confirmar y Abrir Caja'}</span>
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
              >
                Cancelar y Volver
              </button>
            )}
          </div>

          {/* Indicador de Protocolo de Seguridad */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #ede6f2',
              boxShadow: '0 2px 10px rgba(49, 3, 68, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: '#1d1a22' }}>
                  Protocolo Seguro JEVACRIS
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#7a7082', lineHeight: '1.5' }}>
                  El monto base queda registrado en el historial inmutable. Al momento del cierre se calcularán
                  automáticamente las ventas totales versus el dinero físico.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .cash-opening-grid {
            display: flex !important;
            flex-direction: column !important;
          }
          .cash-opening-grid > div {
            width: 100% !important;
          }
          .denominations-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .denominations-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Modal Historial de Cierres de Caja (Auditoría Z) */}
      <CashHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  );
};
