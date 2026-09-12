import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { reportsRepository } from '../../../repositories/reportsRepository';
import { cashRegisterRepository } from '../../../repositories/cashRegisterRepository';
import { formatCOP } from '../../../utils/currency';
import type { CashRegister, CashRegisterSummary, Product } from '../../../types';

interface CashRegisterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: CashRegister | null;
  dateStr: string;
  onEdit: (register: CashRegister) => void;
}

export const CashRegisterDetailModal: React.FC<CashRegisterDetailModalProps> = ({
  isOpen,
  onClose,
  register,
  dateStr,
  onEdit
}) => {
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !register) return;
    reportsRepository.getCashRegisterDetail(register.id, dateStr).then((data) => {
      setSummary(data.summary || null);
      setProducts(data.products);
    });
  }, [isOpen, register, dateStr]);

  if (!register) return null;

  const handleDelete = async () => {
    if (register.isPrincipal) return;
    if (!window.confirm(`¿Eliminar ${register.name}? Los productos pasarán a Caja Principal.`)) return;
    try {
      await cashRegisterRepository.delete(register.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={register.name} subtitle="Totales del día seleccionado" maxWidth="640px">
      {error && <div style={{ color: '#ba1a1a', marginBottom: '12px' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <Stat label="Total ventas" value={formatCOP(summary?.totalSales || 0)} />
        <Stat label="Total ganancias" value={formatCOP(summary?.totalProfit || 0)} />
      </div>
      <h3 style={{ fontSize: '14px', margin: '0 0 10px' }}>Distribución sugerida</h3>
      {(summary?.distribution || []).map((d) => (
        <div key={d.line.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ece6f1' }}>
          <span>
            {d.line.label} ({d.line.percentage}%)
          </span>
          <strong>{formatCOP(d.suggestedAmount)}</strong>
        </div>
      ))}
      <h3 style={{ fontSize: '14px', margin: '20px 0 10px' }}>Productos en esta caja</h3>
      {products.length === 0 && <div style={{ fontSize: '13px', color: '#7e747f' }}>Ningún producto asignado</div>}
      {products.map((p) => (
        <div key={p.id} style={{ padding: '6px 0', fontSize: '14px' }}>
          {p.name}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
        <Button onClick={() => onEdit(register)}>Editar</Button>
        {!register.isPrincipal && (
          <Button variant="danger" onClick={handleDelete}>
            Eliminar
          </Button>
        )}
      </div>
    </Modal>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: '#f8f1fd', borderRadius: '20px', padding: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#7e747f', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>{value}</div>
    </div>
  );
}
