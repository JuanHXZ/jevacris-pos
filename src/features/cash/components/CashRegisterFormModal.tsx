import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { cashRegisterRepository } from '../../../repositories/cashRegisterRepository';
import type { CashRegister, CashRegisterDistributionLine } from '../../../types';

interface LineDraft {
  label: string;
  percentage: string;
}

interface CashRegisterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing?: CashRegister | null;
  existingLines?: CashRegisterDistributionLine[];
}

export const CashRegisterFormModal: React.FC<CashRegisterFormModalProps> = ({
  isOpen,
  onClose,
  editing,
  existingLines
}) => {
  const [name, setName] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([
    { label: 'Inversiones', percentage: '60' },
    { label: 'Ahorros', percentage: '40' }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editing && existingLines && existingLines.length > 0) {
      setName(editing.name);
      setLines(existingLines.map((l) => ({ label: l.label, percentage: String(l.percentage) })));
    } else if (!editing) {
      setName('');
      setLines([
        { label: 'Inversiones', percentage: '60' },
        { label: 'Ahorros', percentage: '40' }
      ]);
    }
  }, [isOpen, editing, existingLines]);

  const sum = lines.reduce((acc, l) => acc + (Number(l.percentage) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSubmitting(true);
      const payload = {
        name,
        lines: lines.map((l) => ({ label: l.label, percentage: Number(l.percentage) }))
      };
      if (editing) {
        await cashRegisterRepository.update(editing.id, payload);
      } else {
        await cashRegisterRepository.create(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la caja');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Editar caja' : 'Nueva caja'}
      subtitle="Los porcentajes de cada caja deben sumar 100%"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: '#ffdad6', color: '#93000a', fontSize: '13px' }}>
            {error}
          </div>
        )}
        <label style={{ fontSize: '12px', fontWeight: 700, color: '#4d444e' }}>
          NOMBRE
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Caja Dulces" style={inputStyle} />
        </label>
        {lines.map((line, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 36px', gap: '8px', alignItems: 'center' }}>
            <input
              value={line.label}
              onChange={(e) => {
                const next = [...lines];
                next[index] = { ...next[index], label: e.target.value };
                setLines(next);
              }}
              placeholder="Rubro"
              style={inputStyle}
            />
            <input
              value={line.percentage}
              onChange={(e) => {
                const next = [...lines];
                next[index] = { ...next[index], percentage: e.target.value };
                setLines(next);
              }}
              placeholder="%"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setLines(lines.filter((_, i) => i !== index))}
              disabled={lines.length <= 1}
              style={{ border: 'none', background: 'transparent', color: '#ba1a1a', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setLines([...lines, { label: '', percentage: '0' }])}
        >
          + Rubro
        </Button>
        <div style={{ fontSize: '13px', fontWeight: 600, color: Math.abs(sum - 100) < 0.01 ? '#10b981' : '#ba1a1a' }}>
          Suma: {sum}%
        </div>
        <Button type="submit" disabled={isSubmitting} isFullWidth>
          Guardar
        </Button>
      </form>
    </Modal>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '6px',
  padding: '10px 12px',
  borderRadius: '14px',
  border: '1px solid #cfc3cf',
  fontSize: '15px',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box'
};
