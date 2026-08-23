import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DollarSign, Banknote, CreditCard, TrendingUp, AlertTriangle, Plus, Download, Smartphone } from 'lucide-react';
import { db } from '../../db';
import { reportsRepository } from '../../repositories/reportsRepository';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import type { DailySummary } from '../../types';

export const ReportsView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<DailySummary>({
    totalTransactions: 0,
    totalSales: 0,
    cashSales: 0,
    transferSales: 0,
    physicalProfit: 0,
    externalEarnings: 0,
    totalProfit: 0
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [platformName, setPlatformName] = useState('Recargas Móviles');
  const [earningAmount, setEarningAmount] = useState<number>(0);
  const [earningNotes, setEarningNotes] = useState('');

  // Live queries para actualizar en tiempo real si ocurren ventas
  const salesCount = useLiveQuery(() => db.sales.count());
  const earningsCount = useLiveQuery(() => db.externalEarnings.count());
  const externalEarningsList = useLiveQuery(() => 
    db.externalEarnings.where('earningDate').equals(selectedDate).toArray()
  , [selectedDate]) || [];

  const lowStockProducts = useLiveQuery(() => 
    db.products.filter(p => p.isActive && p.type === 'physical' && p.currentStock <= p.minStockAlert).toArray()
  ) || [];

  useEffect(() => {
    const loadSummary = async () => {
      const data = await reportsRepository.getDailySummary(selectedDate);
      setSummary(data);
    };
    loadSummary();
  }, [selectedDate, salesCount, earningsCount]);

  const handleAddExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName || earningAmount <= 0) return;

    await reportsRepository.addExternalEarning({
      earningDate: selectedDate,
      platformName,
      amount: earningAmount,
      notes: earningNotes.trim() || undefined
    });

    setIsModalOpen(false);
    setEarningAmount(0);
    setEarningNotes('');
  };

  const handleExportBackup = async () => {
    const categories = await db.categories.toArray();
    const products = await db.products.toArray();
    const sales = await db.sales.toArray();
    const saleItems = await db.saleItems.toArray();
    const stockEntries = await db.stockEntries.toArray();
    const externalEarnings = await db.externalEarnings.toArray();

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { categories, products, sales, saleItems, stockEntries, externalEarnings }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jevacris-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado y Selector de Fecha */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Caja, Ganancias & Reportes</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Consolidado diario de ventas, medios de pago y utilidades totales
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ height: '44px', fontWeight: 600 }}
          />
          <Button variant="secondary" size="sm" leftIcon={<Download size={16} />} onClick={handleExportBackup}>
            Copia de Seguridad
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Principales (Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Ventas */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Ventas del Día</span>
            <DollarSign size={20} color="var(--brand-primary)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatCOP(summary.totalSales)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary.totalTransactions} transacciones registradas
          </div>
        </div>

        {/* Efectivo en Caja */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Efectivo (Caja)</span>
            <Banknote size={20} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
            {formatCOP(summary.cashSales)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Dinero físico a cuadrar
          </div>
        </div>

        {/* Transferencias / Nequi */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Transferencias (Nequi)</span>
            <CreditCard size={20} color="var(--color-nequi)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-nequi)', fontFamily: 'var(--font-mono)' }}>
            {formatCOP(summary.transferSales)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Ingresos en cuenta digital
          </div>
        </div>

        {/* Ganancia Total Consolidada */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-glow-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-success)', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>Ganancia Total Neta</span>
            <TrendingUp size={20} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
            {formatCOP(summary.totalProfit)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Productos: {formatCOP(summary.physicalProfit)} | Ext: {formatCOP(summary.externalEarnings)}
          </div>
        </div>
      </div>

      {/* Sección 2 Columnas: Ganancias Externas y Alertas de Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="reports-columns">
        {/* Ganancias de Plataformas Externas */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={20} color="var(--brand-primary)" />
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Ganancias de Plataformas Externas</h3>
            </div>
            <Button size="sm" variant="primary" leftIcon={<Plus size={15} />} onClick={() => setIsModalOpen(true)}>
              REGISTRAR
            </Button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Ingresa las comisiones/utilidades que entregan las plataformas de recargas o corresponsal para sumarlas a la ganancia del día.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {externalEarningsList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No hay ganancias externas registradas para esta fecha.
              </div>
            ) : (
              externalEarningsList.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-surface-raised)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.platformName}</div>
                    {item.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.notes}</div>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                    +{formatCOP(item.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alertas de Stock Bajo / Agotado */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="var(--color-warning)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Productos que Requieren Compra</h3>
            <Badge variant="warning">{lowStockProducts.length}</Badge>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Productos físicos con existencias iguales o inferiores al umbral mínimo de alerta.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            {lowStockProducts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-success)', fontSize: '14px' }}>
                ✓ ¡Todo el inventario tiene existencias suficientes!
              </div>
            ) : (
              lowStockProducts.map(p => (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: 'var(--bg-surface-raised)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mínimo sugerido: {p.minStockAlert} {p.unit}s</div>
                  </div>
                  <Badge variant={p.currentStock <= 0 ? 'danger' : 'warning'}>
                    Quedan: {p.currentStock} {p.unit}s
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal para Registrar Ganancia Externa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Ganancia de Plataforma Externa"
        maxWidth="460px"
      >
        <form onSubmit={handleAddExternal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              Plataforma o Servicio *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Recargas Claro/Movistar, TuLlave, Corresponsal..."
              value={platformName}
              onChange={e => setPlatformName(e.target.value)}
              style={{ width: '100%' }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-success)' }}>
              Ganancia / Comisión Liquidada ($) *
            </label>
            <input
              type="number"
              min="1"
              required
              placeholder="0"
              value={earningAmount || ''}
              onChange={e => setEarningAmount(Number(e.target.value))}
              style={{ width: '100%', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              Notas (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Comisión liquidada corte 6:00 PM"
              value={earningNotes}
              onChange={e => setEarningNotes(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <Button type="submit" variant="success" size="lg" isFullWidth disabled={earningAmount <= 0}>
            SUMAR A GANANCIA DEL DÍA
          </Button>
        </form>
      </Modal>

      <style>{`
        @media (max-width: 800px) {
          .reports-columns {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
