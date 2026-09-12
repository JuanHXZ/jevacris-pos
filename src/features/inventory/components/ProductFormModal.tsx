import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Plus, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { productRepository } from '../../../repositories/productRepository';
import { PRINCIPAL_CASH_REGISTER_ID } from '../../../types';
import { db } from '../../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatNumberWithDots, parseCOPInput } from '../../../utils/currency';
import type { Product, Category, ProductType } from '../../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  categories: Category[];
  initialName?: string;
  onSuccess?: (productId: string, actionType: 'create' | 'update' | 'delete', productName: string) => void;
}

const COMMON_UNITS = ['unidad', 'litro', 'galón', 'barra', 'bolsa', 'ml', 'kg', 'servicio'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  categories,
  initialName,
  onSuccess
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
  const [cashRegisterId, setCashRegisterId] = useState(PRINCIPAL_CASH_REGISTER_ID);
  const cashRegisters = useLiveQuery(() => db.cashRegisters.filter((r) => r.isActive !== false).toArray(), []) || [];
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para creación rápida de categoría
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (editingProduct) {
      setName(editingProduct.name);
      setCategoryId(editingProduct.categoryId || (categories[0]?.id ?? ''));
      setType(editingProduct.type);
      setUnit(editingProduct.unit);
      setCostPrice(editingProduct.costPrice || 0);
      setMarginPercentage(editingProduct.marginPercentage || 0);
      setSalePrice(editingProduct.salePrice || 0);
      setCurrentStock(editingProduct.currentStock || 0);
      setMinStockAlert(editingProduct.minStockAlert || 5);
      setCashRegisterId(editingProduct.cashRegisterId || PRINCIPAL_CASH_REGISTER_ID);
    } else {
      setName(initialName || '');
      setCategoryId(categories[0]?.id ?? '');
      setType('physical');
      setUnit('unidad');
      setCostPrice(0);
      setMarginPercentage(30);
      setSalePrice(0);
      setCurrentStock(0);
      setMinStockAlert(5);
      setCashRegisterId(PRINCIPAL_CASH_REGISTER_ID);
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
    setIsDeleting(false);
    setError(null);
    setIsSubmitting(false);
  }, [editingProduct, isOpen, initialName]); // categories removido intencionalmente para no borrar los datos ingresados al crear categorías

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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCatId = await productRepository.createCategory(newCategoryName);
      setCategoryId(newCatId);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      setError(err.message || 'Error al crear la categoría');
    }
  };

  const handleDeleteProduct = async () => {
    if (!editingProduct) return;
    try {
      setIsSubmitting(true);
      const prodName = editingProduct.name;
      const prodId = editingProduct.id;
      await productRepository.delete(prodId);
      if (onSuccess) onSuccess(prodId, 'delete', prodName);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Error al eliminar el producto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }
    if (salePrice <= 0) {
      setError('El precio de venta debe ser mayor a $0');
      return;
    }

    try {
      setIsSubmitting(true);
      const trimmedName = name.trim();

      if (editingProduct) {
        await productRepository.update(editingProduct.id, {
          name: trimmedName,
          categoryId: categoryId || undefined,
          type,
          unit: unit.trim() || (type === 'physical' ? 'unidad' : 'servicio'),
          costPrice: type === 'physical' ? costPrice : 0,
          marginPercentage: type === 'physical' ? marginPercentage : 0,
          salePrice,
          currentStock: type === 'physical' ? currentStock : 0,
          minStockAlert: type === 'physical' ? minStockAlert : 0,
          cashRegisterId: cashRegisterId || PRINCIPAL_CASH_REGISTER_ID
        });
        if (onSuccess) onSuccess(editingProduct.id, 'update', trimmedName);
        onClose();
      } else {
        const newId = await productRepository.create({
          name: trimmedName,
          categoryId: categoryId || undefined,
          type,
          unit: unit.trim() || (type === 'physical' ? 'unidad' : 'servicio'),
          costPrice: type === 'physical' ? costPrice : 0,
          marginPercentage: type === 'physical' ? marginPercentage : 0,
          salePrice,
          currentStock: type === 'physical' ? currentStock : 0,
          minStockAlert: type === 'physical' ? minStockAlert : 0,
          cashRegisterId: cashRegisterId || PRINCIPAL_CASH_REGISTER_ID,
          isActive: true
        });
        if (onSuccess) onSuccess(newId, 'create', trimmedName);
        onClose();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Error al guardar el producto');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? 'Editar Ítem del Catálogo' : 'Nuevo Producto / Servicio'}
      subtitle="Configura los detalles comerciales, precios y unidades de tu inventario"
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-danger-border)',
              fontSize: '13.5px',
              fontWeight: 600
            }}
          >
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Nombre del Producto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#4d444e',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)'
            }}
          >
            NOMBRE DEL PRODUCTO O SERVICIO *
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Jabón Líquido Floral 1L, Limpiavidrios..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#ffffff',
              border: '1px solid #cfc3cf',
              borderRadius: '24px',
              padding: '0 20px',
              fontSize: '14.5px',
              fontWeight: 500,
              color: '#1d1a22',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'var(--font-sans)',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#310344';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(49, 3, 68, 0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#cfc3cf';
              e.currentTarget.style.boxShadow = 'none';
            }}
            autoFocus
          />
        </div>

        {/* Categoría y Tipo de Ítem */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Categoría con creación rápida */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#4d444e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                CATEGORÍA
              </label>

              {!isAddingCategory && (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#7a4c8c',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <Plus size={13} />
                  <span>Nueva</span>
                </button>
              )}
            </div>

            {isAddingCategory ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#f8f1fd',
                  padding: '4px 6px',
                  borderRadius: '24px',
                  border: '1px solid #cfc3cf'
                }}
              >
                <input
                  type="text"
                  placeholder="Nombre categoría..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  style={{
                    flex: 1,
                    height: '36px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: '0 10px',
                    fontSize: '13px',
                    outline: 'none',
                    color: '#1d1a22'
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  style={{
                    backgroundColor: '#310344',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Guardar Categoría"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  style={{
                    backgroundColor: '#ece6f1',
                    color: '#4d444e',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  height: '48px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cfc3cf',
                  borderRadius: '24px',
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1d1a22',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer'
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo de Ítem */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#4d444e',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)'
              }}
            >
              TIPO DE ÍTEM
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProductType)}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: '#ffffff',
                border: '1px solid #cfc3cf',
                borderRadius: '24px',
                padding: '0 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1d1a22',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer'
              }}
            >
              <option value="physical">Producto Físico (con inventario)</option>
              <option value="service">Servicio / Recarga (sin stock)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#4d444e',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)'
            }}
          >
            CAJA DE FACTURACIÓN
          </label>
          <select
            value={cashRegisterId}
            onChange={(e) => setCashRegisterId(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#ffffff',
              border: '1px solid #cfc3cf',
              borderRadius: '24px',
              padding: '0 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1d1a22',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer'
            }}
          >
            {cashRegisters.map((reg) => (
              <option key={reg.id} value={reg.id}>
                {reg.name}{reg.isPrincipal ? ' (Principal)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Unidad de Medida / Presentación con Chips de sugerencia rápida (Solo para productos físicos) */}
        {type === 'physical' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#4d444e',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)'
              }}
            >
              UNIDAD DE MEDIDA / PRESENTACIÓN
            </label>

            <input
              type="text"
              placeholder="unidad, litro, galón, barra, bolsa..."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: '#ffffff',
                border: '1px solid #cfc3cf',
                borderRadius: '24px',
                padding: '0 20px',
                fontSize: '14.5px',
                color: '#1d1a22',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-sans)'
              }}
            />

            {/* Chips de selección rápida de unidades */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
              {COMMON_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: unit.toLowerCase() === u ? '1px solid #310344' : '1px solid rgba(207, 195, 207, 0.5)',
                    backgroundColor: unit.toLowerCase() === u ? '#f6d9fb' : '#f8f1fd',
                    color: unit.toLowerCase() === u ? '#27142d' : '#4d444e',
                    fontSize: '12px',
                    fontWeight: unit.toLowerCase() === u ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fijación de Precios Automática (Boutique Card) */}
        {type === 'physical' && (
          <div
            style={{
              backgroundColor: '#f8f1fd',
              padding: '20px',
              borderRadius: '28px',
              border: '1px solid #ece6f1',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7a4c8c' }}>
              <Sparkles size={16} />
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Fijación de Precios Inteligente
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4d444e',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-sans)'
                  }}
                >
                  COSTO DE COMPRA ($)
                </label>
                <input
                  type="text"
                  value={costPrice > 0 ? formatNumberWithDots(costPrice) : ''}
                  onChange={(e) => handleCostChange(parseCOPInput(e.target.value))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    height: '44px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cfc3cf',
                    borderRadius: '20px',
                    padding: '0 16px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1d1a22',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4d444e',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-sans)'
                  }}
                >
                  MARGEN DESEADO (%)
                </label>
                <input
                  type="number"
                  min="0"
                  value={marginPercentage || ''}
                  onChange={(e) => handleMarginChange(Number(e.target.value))}
                  placeholder="30"
                  style={{
                    width: '100%',
                    height: '44px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cfc3cf',
                    borderRadius: '20px',
                    padding: '0 16px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1d1a22',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Precio de Venta al Público (Destacado) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#310344',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)'
            }}
          >
            PRECIO DE VENTA AL PÚBLICO ($) *
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: '20px',
                fontSize: '20px',
                fontWeight: 700,
                color: '#7a4c8c'
              }}
            >
              $
            </span>
            <input
              type="text"
              required
              value={salePrice > 0 ? formatNumberWithDots(salePrice) : ''}
              onChange={(e) => setSalePrice(parseCOPInput(e.target.value))}
              placeholder="0"
              style={{
                width: '100%',
                height: '54px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cfc3cf',
                borderRadius: '27px',
                paddingLeft: '38px',
                paddingRight: '20px',
                fontSize: '22px',
                fontWeight: 700,
                color: '#310344',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-sans)',
                fontVariantNumeric: 'tabular-nums'
              }}
            />
          </div>
        </div>

        {/* Stock Actual y Alerta de Stock Mínimo */}
        {type === 'physical' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#4d444e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                STOCK INICIAL
              </label>
              <input
                type="number"
                min="0"
                value={currentStock || ''}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                placeholder="0"
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cfc3cf',
                  borderRadius: '22px',
                  padding: '0 18px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1d1a22',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontVariantNumeric: 'tabular-nums'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#4d444e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                ALERTA STOCK MÍNIMO
              </label>
              <input
                type="number"
                min="0"
                value={minStockAlert || ''}
                onChange={(e) => setMinStockAlert(Number(e.target.value))}
                placeholder="5"
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cfc3cf',
                  borderRadius: '22px',
                  padding: '0 18px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1d1a22',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontVariantNumeric: 'tabular-nums'
                }}
              />
            </div>
          </div>
        )}

        {/* Sección de Confirmación de Borrado si está en modo edición */}
        {editingProduct && isDeleting && (
          <div
            style={{
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', fontWeight: 700, fontSize: '14px' }}>
              <AlertTriangle size={18} />
              <span>¿Desactivar "{editingProduct.name}" del catálogo?</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              El producto se ocultará del POS e inventario activo, pero se mantendrá en el histórico de ventas pasadas.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsDeleting(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleDeleteProduct}>
                Sí, Desactivar
              </Button>
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <div>
            {editingProduct && !isDeleting && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 size={16} color="var(--color-danger)" />}
                onClick={() => setIsDeleting(true)}
                style={{ color: 'var(--color-danger)' }}
              >
                Desactivar Producto
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              rightIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
            >
              {isSubmitting
                ? 'Guardando...'
                : editingProduct
                ? 'Guardar Cambios'
                : 'Crear Producto'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
