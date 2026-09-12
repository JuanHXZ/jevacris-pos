import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
}

export const CashSessionModal: React.FC<CashSessionModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  isDismissible = true
}) => {
  const openSession = useLiveQuery(() => db.cashSessions.filter((s) => s.status === 'open').first(), []) || undefined;
  const expenses =
    useLiveQuery(async () => {
      if (!openSession) return [] as Expense[];
      return db.expenses.where('cashSessionId').equals(openSession.id).toArray();
    }, [openSession?.id]) || [];

  const [mode, setMode] = useState<'open' | 'operate' | 'close'>('open');
  const [openingCashRaw, setOpeningCashRaw] = useState('');
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

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSubmitting(true);
      await cashSessionRepository.open(parseCOPInput(openingCashRaw));
      setOpeningCashRaw('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir caja');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      title={openSession ? 'Jornada de caja' : 'Apertura de caja'}
      subtitle={
        openSession
          ? `Abierta con base ${formatCOP(openSession.openingCash)}`
          : 'Registra el efectivo físico para empezar a vender'
      }
      maxWidth="560px"
      isDismissible={isDismissible}
    >
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '16px', backgroundColor: '#ffdad6', color: '#93000a', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!openSession && (
        <form onSubmit={handleOpen} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#4d444e', letterSpacing: '0.08em' }}>
            BASE INICIAL (EFECTIVO)
            <input
              value={openingCashRaw}
              onChange={(e) => setOpeningCashRaw(parseCOPInput(e.target.value) > 0 ? formatNumberWithDots(parseCOPInput(e.target.value)) : '')}
              placeholder="0"
              style={inputStyle}
            />
          </label>
          <Button type="submit" disabled={isSubmitting} isFullWidth>
            Abrir caja
          </Button>
        </form>
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
