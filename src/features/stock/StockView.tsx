import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { db } from '../../db';
import { stockRepository } from '../../repositories/stockRepository';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import type { Product } from '../../types';

export const StockView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [updateProductCost, setUpdateProductCost] = useState(true);
  const [notes, setNotes] = useState('');

  const products = useLiveQuery(() => 
    db.products.where('isActive').equals(1).and(p => p.type === 'physical').toArray()
  ) || [];

  const stockEntries = useLiveQuery(() => 
    db.stockEntries.orderBy('entryDate').reverse().limit(50).toArray()
  ) || [];

  const productMap = new Map<string, Product>();
  products.forEach(p => productMap.set(p.id, p));

  const handleOpenModal = () => {
    if (products.length > 0) {
      setProductId(products[0].id);
      setUnitCost(products[0].costPrice);
    }
    setQuantity(0);
    setUpdateProductCost(true);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleProductSelect = (id: string) => {
    setProductId(id);
    const prod = productMap.get(id);
    if (prod) {
      setUnitCost(prod.costPrice);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || quantity <= 0) return;

    await stockRepository.registerEntry({
      productId,
      quantity,
      unitCost,
      updateProductCost,
      notes: notes.trim() || undefined
    });

    setIsModalOpen(false);
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado y Acción */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Entradas de Mercancía</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Registra compras a proveedores para reabastecer inventario y actualizar costos automáticamente
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={18} />} onClick={handleOpenModal}>
          REGISTRAR ENTRADA
        </Button>
      </div>

      {/* Historial de Entradas */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface-raised)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Fecha</th>
                <th style={{ padding: '14px 20px' }}>Producto</th>
                <th style={{ padding: '14px 20px' }}>Cantidad Ingresada</th>
                <th style={{ padding: '14px 20px' }}>Costo Unitario</th>
                <th style={{ padding: '14px 20px' }}>Costo Total Compra</th>
                <th style={{ padding: '14px 20px' }}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {stockEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay registros de entradas de stock todavía.
                  </td>
                </tr>
              ) : (
                stockEntries.map(entry => {
                  const prod = productMap.get(entry.productId);
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {formatDate(entry.entryDate)}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {prod ? prod.name : 'Producto no encontrado'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <Badge variant="success">+{entry.quantity} {prod?.unit || 'uds'}</Badge>
                      </td>
                      <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)' }}>
                        {formatCOP(entry.unitCost)}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {formatCOP(entry.totalCost)}
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro de Entrada */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Entrada de Mercancía"
        maxWidth="500px"
      >
        <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              Seleccionar Producto *
            </label>
            <select
              value={productId}
              onChange={e => handleProductSelect(e.target.value)}
              style={{ width: '100%' }}
              required
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock actual: {p.currentStock} {p.unit}s)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                Cantidad a Ingresar *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity || ''}
                onChange={e => setQuantity(Number(e.target.value))}
                placeholder="Ej. 12"
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                Costo Unitario ($) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={unitCost || ''}
                onChange={e => setUnitCost(Number(e.target.value))}
                placeholder="0"
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {quantity > 0 && unitCost > 0 && (
            <div style={{ backgroundColor: 'var(--bg-surface-raised)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costo Total de la Compra:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                {formatCOP(quantity * unitCost)}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="updateCost"
              checked={updateProductCost}
              onChange={e => setUpdateProductCost(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="updateCost" style={{ fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Actualizar costo base del producto y recalcular precio de venta
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              Notas / Proveedor (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Factura #1234, Distribuidora XYZ"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <Button type="submit" variant="success" size="lg" isFullWidth disabled={quantity <= 0}>
            SUMAR AL INVENTARIO
          </Button>
        </form>
      </Modal>
    </div>
  );
};
