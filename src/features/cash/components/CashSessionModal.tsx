import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  LockKeyhole,
  CheckCircle2,
  XCircle,
  WalletCards,
  Info
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { cashSessionRepository } from '../../../repositories/cashSessionRepository';
import { db } from '../../../db';
import { formatCOP, formatNumberWithDots, parseCOPInput } from '../../../utils/currency';
import type { ExpenseCategory, Expense } from '../../../types';

const EXPENSE_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'rent', label: 'Arriendo' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'supplies', label: 'Insumos' },
  { value: 'personal_draw', label: 'Retiro personal' },
  { value: 'other', label: 'Otros' }
];

interface CashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'open' | 'operate' | 'close';
  isDismissible?: boolean;
  preserveSidebar?: boolean;
  onNavigateToCashShifts?: () => void;
}

export const CashSessionModal: React.FC<CashSessionModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  isDismissible = true,
  preserveSidebar = true,
  onNavigateToCashShifts
}) => {
  const openSession = useLiveQuery(() => db.cashSessions.filter((s) => s.status === 'open').first(), []) || undefined;
  const expenses =
    useLiveQuery(async () => {
      if (!openSession) return [] as Expense[];
      return db.expenses.where('cashSessionId').equals(openSession.id).toArray();
    }, [openSession?.id]) || [];

  const [mode, setMode] = useState<'open' | 'operate' | 'close'>('open');
  const [countedCashRaw, setCountedCashRaw] = useState('');
  const [expenseAmountRaw, setExpenseAmountRaw] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('other');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<{
    cashSalesTotal: number;
    expensesTotal: number;
    closingCashCalculated: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (openSession) {
      setMode(initialMode === 'close' ? 'close' : 'operate');
    } else {
      setMode('open');
    }
  }, [isOpen, openSession, initialMode]);

  useEffect(() => {
    if (!isOpen || !openSession || mode !== 'close') return;
    cashSessionRepository.getArqueoPreview(openSession.id).then((data) => {
      setPreview({
        cashSalesTotal: data.cashSalesTotal,
        expensesTotal: data.expensesTotal,
        closingCashCalculated: data.closingCashCalculated
      });
    });
  }, [isOpen, openSession, mode, expenses.length]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSubmitting(true);
      await cashSessionRepository.addExpense({
        category: expenseCategory,
        amount: parseCOPInput(expenseAmountRaw),
        description: expenseDescription
      });
      setExpenseAmountRaw('');
      setExpenseDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el gasto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSubmitting(true);
      await cashSessionRepository.close({ countedCash: parseCOPInput(countedCashRaw) });
      setCountedCashRaw('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar caja');
    } finally {
      setIsSubmitting(false);
    }
  };

  const counted = parseCOPInput(countedCashRaw);
  const difference = preview ? counted - preview.closingCashCalculated : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={openSession ? 'Jornada de caja' : 'Apertura de caja requerida'}
      subtitle={
        openSession
          ? `Abierta con base ${formatCOP(openSession.openingCash)}`
          : 'Para facturar y cobrar ventas en el turno es necesario iniciar la jornada de caja'
      }
      maxWidth={openSession ? '560px' : '640px'}
      isDismissible={isDismissible}
      preserveSidebar={preserveSidebar}
    >
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '16px', backgroundColor: '#ffdad6', color: '#93000a', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!openSession && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Banner explicativo con ícono */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '20px',
              backgroundColor: '#fbf9fc',
              border: '1px solid #ede6f2',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px'
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <LockKeyhole size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#310344' }}>
                  Turno de venta no iniciado
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid #fde68a'
                  }}
                >
                  Caja Cerrada
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#4d444e', lineHeight: '1.45' }}>
                Para garantizar el control de inventario y la precisión en el arqueo del dinero físico, la facturación permanece protegida hasta registrar la base inicial.
              </p>
            </div>
          </div>

          {/* Grid comparativo: Qué es posible y qué no es posible */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px'
            }}
          >
            {/* Columna No Posible (Restringido) */}
            <div
              style={{
                padding: '16px',
                borderRadius: '18px',
                backgroundColor: '#fff5f5',
                border: '1px solid #ffe3e3',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
                <XCircle size={16} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  No es posible realizar:
                </span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ fontSize: '12px', color: '#7f1d1d', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800 }}>•</span>
                  <span>Cobrar ni registrar ventas en el Punto de Venta</span>
                </li>
                <li style={{ fontSize: '12px', color: '#7f1d1d', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800 }}>•</span>
                  <span>Recibir pagos en Efectivo, Nequi o Mixtos</span>
                </li>
                <li style={{ fontSize: '12px', color: '#7f1d1d', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800 }}>•</span>
                  <span>Registrar gastos menores o retiros de gaveta</span>
                </li>
                <li style={{ fontSize: '12px', color: '#7f1d1d', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800 }}>•</span>
                  <span>Emitir tickets y comprobantes del turno</span>
                </li>
              </ul>
            </div>

            {/* Columna Sí Posible (Disponible) */}
            <div
              style={{
                padding: '16px',
                borderRadius: '18px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #dcfce7',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d' }}>
                <CheckCircle2 size={16} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sí puedes realizar:
                </span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ fontSize: '12px', color: '#14532d', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800 }}>•</span>
                  <span>Consultar catálogo, productos y precios</span>
                </li>
                <li style={{ fontSize: '12px', color: '#14532d', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800 }}>•</span>
                  <span>Registrar entradas de stock e insumos</span>
                </li>
                <li style={{ fontSize: '12px', color: '#14532d', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800 }}>•</span>
                  <span>Revisar reportes históricos y balances previos</span>
                </li>
                <li style={{ fontSize: '12px', color: '#14532d', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800 }}>•</span>
                  <span>Navegar libremente por el menú lateral</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Botón Principal de Redirección */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToCashShifts) {
                  onNavigateToCashShifts();
                }
                onClose();
              }}
              style={{
                width: '100%',
                backgroundColor: '#310344',
                color: '#f6d9fb',
                fontWeight: 800,
                fontSize: '15px',
                padding: '16px 24px',
                borderRadius: '18px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(49, 3, 68, 0.22)',
                transition: 'transform 0.15s ease, background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#42065c')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#310344')}
            >
              <WalletCards size={18} />
              <span>Ir a Apertura de Caja (Caja y turnos)</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#7a7082', textAlign: 'center' }}>
              <Info size={14} />
              <span>El menú lateral izquierdo permanece activo para que puedas navegar a cualquier sección.</span>
            </div>
          </div>
        </div>
      )}

      {openSession && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant={mode === 'operate' ? 'primary' : 'secondary'} onClick={() => setMode('operate')}>
              Gastos
            </Button>
            <Button size="sm" variant={mode === 'close' ? 'primary' : 'secondary'} onClick={() => setMode('close')}>
              Cerrar / Arqueo
            </Button>
          </div>

          {mode === 'operate' && (
            <>
              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)} style={inputStyle}>
                  {EXPENSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  value={expenseAmountRaw}
                  onChange={(e) =>
                    setExpenseAmountRaw(parseCOPInput(e.target.value) > 0 ? formatNumberWithDots(parseCOPInput(e.target.value)) : '')
                  }
                  placeholder="Monto"
                  style={inputStyle}
                />
                <input
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  style={inputStyle}
                />
                <Button type="submit" disabled={isSubmitting} variant="secondary">
                  Registrar gasto
                </Button>
              </form>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#7e747f', marginBottom: '8px' }}>GASTOS DE LA JORNADA</div>
                {expenses.length === 0 && <div style={{ fontSize: '13px', color: '#7e747f' }}>Sin gastos registrados</div>}
                {expenses.map((exp) => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ece6f1', fontSize: '14px' }}>
                    <span>{EXPENSE_OPTIONS.find((o) => o.value === exp.category)?.label || exp.category}</span>
                    <strong>{formatCOP(exp.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}

          {mode === 'close' && preview && (
            <form onSubmit={handleClose} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Row label="Base inicial" value={formatCOP(openSession.openingCash)} />
              <Row label="Ventas en efectivo" value={formatCOP(preview.cashSalesTotal)} />
              <Row label="Gastos" value={`− ${formatCOP(preview.expensesTotal)}`} />
              <Row label="Efectivo esperado" value={formatCOP(preview.closingCashCalculated)} emphasize />
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4d444e', letterSpacing: '0.08em' }}>
                EFECTIVO CONTADO
                <input
                  value={countedCashRaw}
                  onChange={(e) =>
                    setCountedCashRaw(parseCOPInput(e.target.value) > 0 ? formatNumberWithDots(parseCOPInput(e.target.value)) : '')
                  }
                  placeholder="0"
                  style={inputStyle}
                />
              </label>
              {countedCashRaw && (
                <Row
                  label="Diferencia"
                  value={formatCOP(difference)}
                  emphasize
                  tone={difference === 0 ? 'neutral' : difference > 0 ? 'good' : 'bad'}
                />
              )}
              <Button type="submit" disabled={isSubmitting} isFullWidth>
                Cerrar caja
              </Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '8px',
  padding: '12px 14px',
  borderRadius: '16px',
  border: '1px solid #cfc3cf',
  fontSize: '16px',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box'
};

function Row({
  label,
  value,
  emphasize,
  tone
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const color = tone === 'good' ? '#10b981' : tone === 'bad' ? '#ba1a1a' : '#1d1a22';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: emphasize ? '16px' : '14px', fontWeight: emphasize ? 700 : 500, color }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
