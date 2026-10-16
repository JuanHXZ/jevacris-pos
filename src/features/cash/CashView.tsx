import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Wallet, Sparkles } from 'lucide-react';
import { db } from '../../db';
import { reportsRepository } from '../../repositories/reportsRepository';
import { cashRegisterRepository } from '../../repositories/cashRegisterRepository';
import { formatCOP } from '../../utils/currency';
import { getLocalDateString } from '../../utils/date';
import { Modal } from '../../components/ui/Modal';
import { CashRegisterFormModal } from './components/CashRegisterFormModal';
import { CashRegisterDetailModal } from './components/CashRegisterDetailModal';
import type { CashRegister, CashRegisterDistributionLine, CashRegisterSummary } from '../../types';

export const CashView: React.FC = () => {
  const [summaries, setSummaries] = useState<CashRegisterSummary[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailRegister, setDetailRegister] = useState<CashRegister | null>(null);
  const [editing, setEditing] = useState<CashRegister | null>(null);
  const [editingLines, setEditingLines] = useState<CashRegisterDistributionLine[]>([]);
  const dateStr = getLocalDateString();

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

      {/* Modal no cerrable: Muy pronto disponible (preserva SideNavBar interactivo) */}
      <Modal
        isOpen={true}
        onClose={() => undefined}
        title="Muy pronto disponible"
        subtitle="Módulo de Cajas y Fondos de Facturación"
        maxWidth="500px"
        isDismissible={false}
        preserveSidebar={true}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 4px 4px' }}>
          {/* Ícono destacado */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '22px',
              backgroundColor: 'rgba(49, 3, 68, 0.08)',
              border: '1px solid rgba(49, 3, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              color: '#310344'
            }}
          >
            <Sparkles size={32} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '19px',
                fontWeight: 800,
                color: '#1d1a22',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '-0.4px'
              }}
            >
              Estamos preparando esta funcionalidad
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: '#7e747f',
                lineHeight: '1.5',
                fontFamily: 'var(--font-sans)'
              }}
            >
              La creación de fondos contables independientes (como Caja Dulces o Fondos de Ahorro) y la configuración de porcentajes de distribución estará disponible en una próxima versión.
            </p>
          </div>

          {/* Tarjeta Informativa */}
          <div
            style={{
              backgroundColor: '#f8f1fd',
              borderRadius: '20px',
              padding: '16px 18px',
              border: '1px solid rgba(49, 3, 68, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#310344',
                  boxShadow: '0 2px 6px rgba(49, 3, 68, 0.08)'
                }}
              >
                <Wallet size={15} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#310344' }}>
                Tu operación continúa con normalidad
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#4d444e', lineHeight: '1.5' }}>
              Todas tus ventas se registran de forma segura en la <strong>Caja Principal</strong>. Para gestionar la apertura, ventas del turno y arqueo de caja, puedes dirigirte a <strong>Caja y turnos</strong> desde el menú lateral.
            </p>
          </div>

          {/* Guía visual */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              paddingTop: '6px',
              fontSize: '12px',
              color: '#7e747f',
              textAlign: 'center'
            }}
          >
            <span>👉</span>
            <span>Usa el menú lateral para navegar a cualquier otra sección del sistema.</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
