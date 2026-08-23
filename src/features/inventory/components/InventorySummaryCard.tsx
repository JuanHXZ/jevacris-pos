import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { db } from '../../../db';
import { reportsRepository } from '../../../repositories/reportsRepository';
import type { DailySummary } from '../../../types';

export const InventorySummaryCard: React.FC = () => {
  const [summary, setSummary] = useState<DailySummary>({
    totalTransactions: 0,
    totalSales: 0,
    cashSales: 0,
    transferSales: 0,
    physicalProfit: 0,
    externalEarnings: 0,
    totalProfit: 0
  });

  const salesCount = useLiveQuery(() => db.sales.count());
  const lowStockCount = useLiveQuery(() => 
    db.products.filter(p => p.isActive && p.type === 'physical' && p.currentStock <= p.minStockAlert).count()
  ) || 0;

  useEffect(() => {
    const fetchSummary = async () => {
      const data = await reportsRepository.getDailySummary();
      setSummary(data);
    };
    fetchSummary();
  }, [salesCount]);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--surface-container-high)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 className="font-headline-md" style={{ color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <TrendingUp size={20} color="var(--secondary)" />
          <span>Resumen de la Jornada</span>
        </h4>
        <span
          className="font-label-caps"
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--surface-container-high)',
            color: 'var(--on-surface-variant)',
            fontSize: '10px'
          }}
        >
          HOY
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-default)'
          }}
        >
          <p className="font-label-caps" style={{ color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
            VENTAS HOY
          </p>
          <p className="font-tabular-price" style={{ fontSize: '1.5rem', color: 'var(--primary)', margin: 0 }}>
            {formatCOP(summary.totalSales)}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-default)'
          }}
        >
          <p className="font-label-caps" style={{ color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
            TRANSACCIONES
          </p>
          <p className="font-tabular-price" style={{ fontSize: '1.5rem', color: 'var(--primary)', margin: 0 }}>
            {summary.totalTransactions}
          </p>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-default)',
            backgroundColor: 'var(--secondary-fixed)',
            color: 'var(--on-secondary-fixed)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <AlertCircle size={18} />
          <span>{lowStockCount} producto{lowStockCount > 1 ? 's' : ''} requieren compra/reabastecimiento.</span>
        </div>
      )}
    </div>
  );
};
