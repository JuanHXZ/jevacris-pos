import React from 'react';
import { Search, List, LayoutGrid, Sparkles } from 'lucide-react';
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
        backgroundColor: 'var(--surface-container-lowest)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-editorial-subtle)',
        border: '1px solid var(--surface-container-high)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Table Header Controls */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--surface-container-high)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'rgba(248, 241, 253, 0.5)',
          backdropFilter: 'blur(8px)'
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--on-surface-variant)'
            }}
          />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '42px',
              paddingRight: '14px',
              paddingTop: '10px',
              paddingBottom: '10px',
              fontSize: '14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-container-highest)',
              borderBottom: '2px solid transparent'
            }}
          />
        </div>

        {/* View Mode & Category Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={e => onCategoryFilterChange(e.target.value)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              color: 'var(--on-surface-variant)'
            }}
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Toggle List / Grid */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-full)',
              padding: '3px',
              border: '1px solid var(--outline-variant)'
            }}
          >
            <button
              onClick={() => onViewModeChange('list')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: viewMode === 'list' ? 'var(--primary-container)' : 'transparent',
                color: viewMode === 'list' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                transition: 'all 0.2s ease'
              }}
              title="Vista de lista"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: viewMode === 'grid' ? 'var(--primary-container)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                transition: 'all 0.2s ease'
              }}
              title="Vista de cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
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
