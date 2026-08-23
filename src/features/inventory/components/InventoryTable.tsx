import React, { useState } from 'react';
import { Search, List, LayoutGrid, Sparkles, Check } from 'lucide-react';
import type { Product, Category } from '../../../types';

interface InventoryTableProps {
  products: Product[];
  categories: Category[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  categories,
  selectedProduct,
  onSelectProduct,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  viewMode,
  onViewModeChange
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const categoryMap = new Map<string, string>();
  categories.forEach(c => categoryMap.set(c.id, c.name));

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
        backgroundColor: '#ffffff',
        borderRadius: '36px',
        boxShadow: 'var(--shadow-editorial-subtle)',
        border: '1px solid #ece6f1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Table Header Controls (Figma node: 1:22) */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #ece6f1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: '#ffffff',
          position: 'relative'
        }}
      >
        {/* Search Input (Píldora limpia idéntica a la imagen 2) */}
        <div
          style={{
            position: 'relative',
            width: '260px',
            height: '42px',
            backgroundColor: '#f2ecf7',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            transition: 'background-color 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <Search
            size={14}
            strokeWidth={2.2}
            color="#7e747f"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              paddingLeft: '44px',
              paddingRight: '16px',
              fontSize: '13.5px',
              fontWeight: 400,
              color: '#1d1a22',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              boxSizing: 'border-box',
              borderRadius: '9999px'
            }}
            onFocus={(e) => {
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.backgroundColor = '#ece6f1';
                parent.style.boxShadow = '0 0 0 2px rgba(49, 3, 68, 0.1)';
              }
            }}
            onBlur={(e) => {
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.backgroundColor = '#f2ecf7';
                parent.style.boxShadow = 'none';
              }
            }}
          />
        </div>

        {/* Right Controls: View Mode & Filter Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          {/* View Mode Switcher Capsule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8f1fd',
              borderRadius: '9999px',
              padding: '3px',
              border: '1px solid rgba(207, 195, 207, 0.3)',
              gap: '2px'
            }}
          >
            <button
              onClick={() => onViewModeChange('list')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: viewMode === 'list' ? '#310344' : 'transparent',
                color: viewMode === 'list' ? '#ffffff' : '#310344',
                boxShadow: viewMode === 'list' ? '0px 2px 4px rgba(49, 3, 68, 0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Vista de tabla / lista"
            >
              <List size={15} strokeWidth={2.2} />
            </button>

            <button
              onClick={() => onViewModeChange('grid')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: viewMode === 'grid' ? '#310344' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : '#310344',
                boxShadow: viewMode === 'grid' ? '0px 2px 4px rgba(49, 3, 68, 0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Vista de cuadrícula"
            >
              <LayoutGrid size={14} strokeWidth={2.2} />
            </button>
          </div>

          {/* Filter Button (Idéntico a la imagen 2: "Filtrar" con icono de embudo) */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: categoryFilter !== 'all' ? '1px solid #310344' : '1px solid #cfc3cf',
              backgroundColor: categoryFilter !== 'all' ? '#f6d9fb' : '#ffffff',
              color: categoryFilter !== 'all' ? '#27142d' : '#1d1a22',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              height: '38px',
              boxSizing: 'border-box'
            }}
          >
            {/* Icono de embudo de 3 líneas como en la imagen */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: categoryFilter !== 'all' ? '#27142d' : '#4d444e' }}
            >
              <path
                d="M2 3.5H14M4 8H12M6.5 12.5H9.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: categoryFilter !== 'all' ? '#27142d' : '#1d1a22',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {categoryFilter !== 'all' ? (categoryMap.get(categoryFilter) || 'Filtrado') : 'Filtrar'}
            </span>
          </button>

          {/* Floating Category Dropdown Menu */}
          {isFilterOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                zIndex: 100,
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                padding: '12px',
                boxShadow: '0px 12px 32px rgba(49, 3, 68, 0.15)',
                border: '1px solid #e6e0eb',
                minWidth: '220px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#7e747f',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '6px 12px'
                }}
              >
                Filtrar por Categoría
              </div>

              <button
                onClick={() => {
                  onCategoryFilterChange('all');
                  setIsFilterOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: categoryFilter === 'all' ? '#f8f1fd' : 'transparent',
                  color: categoryFilter === 'all' ? '#310344' : '#1d1a22',
                  fontWeight: categoryFilter === 'all' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Todas las categorías</span>
                {categoryFilter === 'all' && <Check size={14} color="#310344" />}
              </button>

              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onCategoryFilterChange(c.id);
                    setIsFilterOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: categoryFilter === c.id ? '#f8f1fd' : 'transparent',
                    color: categoryFilter === c.id ? '#310344' : '#1d1a22',
                    fontWeight: categoryFilter === c.id ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span>{c.name}</span>
                  {categoryFilter === c.id && <Check size={14} color="#310344" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content: List Table or Grid View */}
      {viewMode === 'list' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-container-high)' }}>
                <th className="font-label-caps" style={{ padding: '16px 24px', color: 'var(--on-surface-variant)' }}>
                  Producto
                </th>
                <th className="font-label-caps" style={{ padding: '16px 24px', color: 'var(--on-surface-variant)' }}>
                  Categoría
                </th>
                <th className="font-label-caps" style={{ padding: '16px 24px', color: 'var(--on-surface-variant)', textAlign: 'right' }}>
                  Stock
                </th>
                <th className="font-label-caps" style={{ padding: '16px 24px', color: 'var(--on-surface-variant)', textAlign: 'right' }}>
                  Precio
                </th>
              </tr>
            </thead>
            <tbody className="font-tabular-data">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    No se encontraron productos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  const isSelected = selectedProduct?.id === product.id;
                  const isLowStock = product.type === 'physical' && product.currentStock <= product.minStockAlert;
                  const isOutOfStock = product.type === 'physical' && product.currentStock <= 0;

                  return (
                    <tr
                      key={product.id}
                      onClick={() => onSelectProduct(product)}
                      style={{
                        borderBottom: '1px solid var(--surface-container-high)',
                        backgroundColor: isSelected
                          ? 'var(--surface-container-high)'
                          : 'transparent',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Active Indicator Strip */}
                      {isSelected && (
                        <td
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '4px',
                            backgroundColor: 'var(--surface-tint)',
                            borderTopRightRadius: '4px',
                            borderBottomRightRadius: '4px'
                          }}
                        />
                      )}

                      {/* Product Name & Icon */}
                      <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-default)',
                            backgroundColor: isSelected ? 'var(--secondary-fixed-dim)' : 'var(--surface-container-highest)',
                            color: 'var(--on-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Sparkles size={18} color="var(--secondary)" />
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '15px',
                              color: isSelected ? 'var(--primary-container)' : 'var(--on-surface)'
                            }}
                          >
                            {product.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                            {product.type === 'service' ? 'Servicio / Recarga' : `Unidad: ${product.unit}`}
                          </div>
                        </div>
                      </td>

                      {/* Category Chip */}
                      <td style={{ padding: '16px 24px' }}>
                        <span
                          className="font-label-caps"
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--secondary-fixed)',
                            color: 'var(--on-secondary-fixed)',
                            fontSize: '10px',
                            letterSpacing: '0.05em'
                          }}
                        >
                          {product.categoryId ? categoryMap.get(product.categoryId) || 'General' : 'General'}
                        </span>
                      </td>

                      {/* Stock with Pulsing Indicator */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        {product.type === 'physical' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            {isLowStock && (
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: isOutOfStock ? 'var(--color-error)' : 'var(--secondary-fixed-dim)',
                                  boxShadow: isOutOfStock
                                    ? '0 0 8px rgba(186, 26, 26, 0.6)'
                                    : '0 0 8px rgba(217, 189, 223, 0.9)',
                                  display: 'inline-block'
                                }}
                              />
                            )}
                            <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                              {product.currentStock}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                              {product.unit}s
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--on-surface-variant)', fontSize: '13px' }}>—</span>
                        )}
                      </td>

                      {/* Sale Price */}
                      <td
                        style={{
                          padding: '16px 24px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '16px',
                          color: 'var(--primary)',
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {formatCOP(product.salePrice)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div
          style={{
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px'
          }}
        >
          {products.map(product => {
            const isSelected = selectedProduct?.id === product.id;
            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                style={{
                  backgroundColor: isSelected ? 'var(--surface-container-high)' : 'var(--surface-container-low)',
                  border: `2px solid ${isSelected ? 'var(--surface-tint)' : 'var(--surface-container-high)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-label-caps" style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>
                    {product.type === 'service' ? 'Servicio' : `${product.currentStock} ${product.unit}s`}
                  </span>
                  <Sparkles size={16} color="var(--secondary)" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>
                  {product.name}
                </div>
                <div style={{ marginTop: 'auto', fontWeight: 800, fontSize: '18px', color: 'var(--primary-container)' }}>
                  {formatCOP(product.salePrice)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
