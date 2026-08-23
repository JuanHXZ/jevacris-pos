import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Plus, Check } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { productRepository } from '../../../repositories/productRepository';
import { db } from '../../../db';
import { formatNumberWithDots, parseCOPInput } from '../../../utils/currency';
import type { Product, Category, ProductType } from '../../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  categories: Category[];
  initialName?: string;
  onSuccess?: (createdProductId: string) => void;
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

  // Estados para creación rápida de categoría
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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
      setName(initialName || '');
      setCategoryId(categories[0]?.id ?? '');
      setType('physical');
      setUnit('unidad');
      setCostPrice(0);
      setMarginPercentage(30);
      setSalePrice(0);
      setCurrentStock(0);
      setMinStockAlert(5);
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
  }, [editingProduct, categories, isOpen, initialName]);

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
    const now = new Date().toISOString();
    const newCatId = `cat-${Date.now()}`;
    const newCat: Category = {
      id: newCatId,
      name: newCategoryName.trim(),
      icon: 'Package',
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    await db.categories.add(newCat);
    setCategoryId(newCatId);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Fase futura: Eliminación de categoría
  /*
  const handleDeleteCategory = async () => {
    if (!categoryId) return;
    const catToDelete = categories.find((c) => c.id === categoryId);
    if (!catToDelete) return;

    const otherCats = categories.filter((c) => c.id !== categoryId);
    if (otherCats.length === 0) {
      alert('Debe existir al menos una categoría en el sistema.');
      return;
    }

    const count = await db.products.where('categoryId').equals(categoryId).count();
    const msg =
      count > 0
        ? `¿Estás seguro de eliminar la categoría "${catToDelete.name}"? Tiene ${count} productos asociados.`
        : `¿Estás seguro de eliminar la categoría "${catToDelete.name}"?`;

    if (confirm(msg)) {
      await db.categories.delete(categoryId);
      setCategoryId(otherCats[0].id);
    }
  };
  */

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
      if (onSuccess) onSuccess(editingProduct.id);
    } else {
      const newId = await productRepository.create({
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
      if (onSuccess) onSuccess(newId);
    }

    onClose();
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
            {/*
            Fase futura: Botón para eliminar categoría
            <button type="button" onClick={handleDeleteCategory}>...</button>
            */}
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

        {/* Unidad de Medida / Presentación con Chips de sugerencia rápida */}
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

        {/* Botón de Guardado */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '14px 24px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              border: '1px solid #cfc3cf',
              color: '#4d444e',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f2ecf7')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Cancelar
          </button>

          <button
            type="submit"
            style={{
              padding: '14px 32px',
              borderRadius: '9999px',
              backgroundColor: '#310344',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 18px rgba(49, 3, 68, 0.2)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span>{editingProduct ? 'Guardar Cambios' : 'Crear Producto'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
};
