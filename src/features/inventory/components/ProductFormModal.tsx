import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { productRepository } from '../../../repositories/productRepository';
import type { Product, Category, ProductType } from '../../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  categories: Category[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  categories
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<ProductType>('physical');
  const [unit, setUnit] = useState('unidad');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [marginPercentage, setMarginPercentage] = useState<number>(30);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setCategoryId(editingProduct.categoryId || (categories[0]?.id ?? ''));
      setType(editingProduct.type);
      setUnit(editingProduct.unit);
      setCostPrice(editingProduct.costPrice);
      setMarginPercentage(editingProduct.marginPercentage);
      setSalePrice(editingProduct.salePrice);
      setCurrentStock(editingProduct.currentStock);
      setMinStockAlert(editingProduct.minStockAlert);
    } else {
      setName('');
      setCategoryId(categories[0]?.id ?? '');
      setType('physical');
      setUnit('unidad');
      setCostPrice(0);
      setMarginPercentage(30);
      setSalePrice(0);
      setCurrentStock(0);
      setMinStockAlert(5);
    }
  }, [editingProduct, categories, isOpen]);

  const handleCostChange = (newCost: number) => {
    setCostPrice(newCost);
    if (type === 'physical' && marginPercentage > 0) {
      setSalePrice(Math.round(newCost * (1 + marginPercentage / 100)));
    }
  };

  const handleMarginChange = (newMargin: number) => {
    setMarginPercentage(newMargin);
    if (type === 'physical' && costPrice > 0) {
      setSalePrice(Math.round(costPrice * (1 + newMargin / 100)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      await productRepository.update(editingProduct.id, {
        name: name.trim(),
        categoryId: categoryId || undefined,
        type,
        unit: unit.trim(),
        costPrice: type === 'physical' ? costPrice : 0,
        marginPercentage: type === 'physical' ? marginPercentage : 0,
        salePrice,
        currentStock: type === 'physical' ? currentStock : 0,
        minStockAlert: type === 'physical' ? minStockAlert : 0
      });
    } else {
      await productRepository.create({
        name: name.trim(),
        categoryId: categoryId || undefined,
        type,
        unit: unit.trim(),
        costPrice: type === 'physical' ? costPrice : 0,
        marginPercentage: type === 'physical' ? marginPercentage : 0,
        salePrice,
        currentStock: type === 'physical' ? currentStock : 0,
        minStockAlert: type === 'physical' ? minStockAlert : 0,
        isActive: true
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? 'Editar Ítem del Catálogo' : 'Nuevo Producto / Servicio'}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label className="font-label-caps" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
            Nombre del Producto o Servicio *
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Esencia Floral Lavanda, Jabón Rey 300g..."
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', fontSize: '15px' }}
            autoFocus
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="font-label-caps" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
              Categoría
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              style={{ width: '100%' }}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-label-caps" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
              Tipo de Ítem
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ProductType)}
              style={{ width: '100%' }}
            >
              <option value="physical">Producto Físico (con inventario)</option>
              <option value="service">Servicio / Recarga</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-label-caps" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
            Unidad de Venta
          </label>
          <input
            type="text"
            placeholder="unidad, litro, barra, galón, recarga"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {type === 'physical' && (
          <div
            style={{
              backgroundColor: 'var(--surface-container-low)',
              padding: '20px',
              borderRadius: 'var(--radius-default)',
              border: '1px solid var(--surface-container-high)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--surface-tint)' }}>
              <Sparkles size={18} />
              <span className="font-label-caps" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>
                Fijación de Precios Automática
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="font-label-caps" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
                  Costo de Compra ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={costPrice || ''}
                  onChange={e => handleCostChange(Number(e.target.value))}
                  placeholder="0"
                  style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }}
                />
              </div>

              <div>
                <label className="font-label-caps" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
                  Margen Deseado (%)
                </label>
                <input
                  type="number"
                  min="0"
                  value={marginPercentage || ''}
                  onChange={e => handleMarginChange(Number(e.target.value))}
                  placeholder="30"
                  style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="font-label-caps" style={{ display: 'block', color: 'var(--surface-tint)', marginBottom: '8px' }}>
            Precio de Venta al Público ($) *
          </label>
          <input
            type="number"
            required
            min="0"
            value={salePrice || ''}
            onChange={e => setSalePrice(Number(e.target.value))}
            placeholder="0"
            style={{
              width: '100%',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--primary-container)',
              fontVariantNumeric: 'tabular-nums'
            }}
          />
        </div>

        {type === 'physical' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="font-label-caps" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
                Stock Actual
              </label>
              <input
                type="number"
                min="0"
                value={currentStock || ''}
                onChange={e => setCurrentStock(Number(e.target.value))}
                placeholder="0"
                style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }}
              />
            </div>

            <div>
              <label className="font-label-caps" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
                Alerta Stock Mínimo
              </label>
              <input
                type="number"
                min="0"
                value={minStockAlert || ''}
                onChange={e => setMinStockAlert(Number(e.target.value))}
                placeholder="5"
                style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          style={{
            marginTop: '12px',
            padding: '16px 24px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-container)',
            color: 'var(--on-primary-container)',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer',
            boxShadow: '0 8px 16px rgba(49, 3, 68, 0.15)',
            transition: 'all 0.2s ease'
          }}
        >
          {editingProduct ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
        </button>
      </form>
    </Modal>
  );
};
