import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Wallet } from 'lucide-react';
import { db } from '../../db';
import { reportsRepository } from '../../repositories/reportsRepository';
import { cashRegisterRepository } from '../../repositories/cashRegisterRepository';
import { formatCOP } from '../../utils/currency';
import { CashRegisterFormModal } from './components/CashRegisterFormModal';
import { CashRegisterDetailModal } from './components/CashRegisterDetailModal';
import type { CashRegister, CashRegisterDistributionLine, CashRegisterSummary } from '../../types';

export const CashView: React.FC = () => {
  const [summaries, setSummaries] = useState<CashRegisterSummary[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailRegister, setDetailRegister] = useState<CashRegister | null>(null);
  const [editing, setEditing] = useState<CashRegister | null>(null);
  const [editingLines, setEditingLines] = useState<CashRegisterDistributionLine[]>([]);
  const dateStr = new Date().toISOString().split('T')[0];

  const sessionTick = useLiveQuery(() => db.saleItems.count());
  const registerTick = useLiveQuery(() => db.cashRegisters.count());
  const distTick = useLiveQuery(() => db.cashRegisterDistributionLines.count());

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    reportsRepository
      .getCashRegisterSummaries(dateStr)
      .then((rows) => {
        setSummaries(rows);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar las cajas');
      });
  }, [dateStr, sessionTick, registerTick, distTick]);

  const openCreate = () => {
    setEditing(null);
    setEditingLines([]);
    setFormOpen(true);
  };

  const openEdit = async (register: CashRegister) => {
    const lines = await cashRegisterRepository.getDistribution(register.id);
    setEditing(register);
    setEditingLines(lines);
    setDetailRegister(null);
    setFormOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 700, letterSpacing: '-0.8px', color: '#010001' }}>Mis cajas</h1>
          <p style={{ margin: '6px 0 0', color: '#4d444e' }}>Fondos por línea de producto. Caja Principal no se elimina.</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#310344',
            color: '#f6d9fb',
            border: 'none',
            borderRadius: '9999px',
            padding: '12px 20px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
          Nueva caja
        </button>
      </div>

      {loadError && (
        <div style={{ padding: '12px 16px', borderRadius: '16px', backgroundColor: '#ffdad6', color: '#93000a' }}>{loadError}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {summaries.map((s) => (
          <button
            key={s.register.id}
            onClick={() => setDetailRegister(s.register)}
            style={{
              textAlign: 'left',
              backgroundColor: '#fdf7ff',
              border: '1px solid rgba(207, 195, 207, 0.5)',
              borderRadius: '28px',
              padding: '22px',
              cursor: 'pointer',
              boxShadow: '0 12px 32px rgba(49, 3, 68, 0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Wallet size={18} color="#7a4c8c" />
              <strong style={{ fontSize: '18px' }}>{s.register.name}</strong>
              {s.register.isPrincipal && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#7a4c8c', backgroundColor: '#f8d8ff', borderRadius: '999px', padding: '2px 8px' }}>
                  PRINCIPAL
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#7e747f' }}>Ventas hoy</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatCOP(s.totalSales)}</div>
            <div style={{ fontSize: '13px', color: '#7e747f', marginTop: '8px' }}>Ganancias {formatCOP(s.totalProfit)}</div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#4d444e' }}>
              {s.distribution.map((d) => `${d.line.percentage}% ${d.line.label}`).join(' · ')}
            </div>
          </button>
        ))}
      </div>

      <CashRegisterFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        existingLines={editingLines}
      />
      <CashRegisterDetailModal
        isOpen={Boolean(detailRegister)}
        onClose={() => setDetailRegister(null)}
        register={detailRegister}
        dateStr={dateStr}
        onEdit={openEdit}
      />
    </div>
  );
};
