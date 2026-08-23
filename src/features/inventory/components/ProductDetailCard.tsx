import React from 'react';
import { ShoppingBag, Edit3, Sparkles } from 'lucide-react';
import type { Product, Category } from '../../../types';

interface ProductDetailCardProps {
  product: Product | null;
  categories: Category[];
  onEditProduct: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export const ProductDetailCard: React.FC<ProductDetailCardProps> = ({
  product,
  categories,
  onEditProduct,
  onAddToCart
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

  if (!product) {
    return (
      <div
        style={{
          backgroundColor: 'var(--primary-container)',
          color: 'var(--on-primary)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px',
          boxShadow: 'var(--shadow-editorial)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '340px',
          textAlign: 'center',
          gap: '16px'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Sparkles size={32} color="var(--secondary-fixed)" />
        </div>
        <div>
          <h3 className="font-headline-md" style={{ color: '#ffffff', marginBottom: '6px' }}>
            Selección de Producto
          </h3>
          <p className="font-body-sm" style={{ color: 'rgba(255, 255, 255, 0.65)', maxWidth: '240px' }}>
            Haz click en cualquier producto de la tabla para ver sus detalles y ajustes.
          </p>
        </div>
      </div>
    );
  }

  const categoryName = product.categoryId ? categoryMap.get(product.categoryId) || 'General' : 'General';
  const isOutOfStock = product.type === 'physical' && product.currentStock <= 0;

  return (
    <div
      style={{
        backgroundColor: 'var(--primary-container)',
        color: 'var(--on-primary)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px',
        boxShadow: 'var(--shadow-editorial)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative background watermark icon */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          opacity: 0.06,
          pointerEvents: 'none'
        }}
      >
        <Sparkles size={160} color="#ffffff" />
      </div>

      {/* Header Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <span
          className="font-label-caps"
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--on-primary-fixed-variant)',
            color: 'var(--on-primary)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          SELECCIÓN ACTIVA
        </span>

        <button
          onClick={() => onEditProduct(product)}
          style={{
            color: 'rgba(255, 255, 255, 0.7)',
            padding: '4px',
            cursor: 'pointer',
            transition: 'color 0.2s ease'
          }}
          title="Editar información de este producto"
        >
          <Edit3 size={18} />
        </button>
      </div>

      {/* Product Title & Category */}
      <h3
        className="font-display-lg"
        style={{
          color: '#ffffff',
          marginBottom: '6px',
          lineHeight: 1.15,
          fontSize: '2.1rem'
        }}
      >
        {product.name}
      </h3>
      <p className="font-body-lg" style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '32px' }}>
        {categoryName} • {product.type === 'physical' ? `Venta por ${product.unit}` : 'Servicio / Recarga'}
      </p>

      {/* Financial & Stock Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px' }}>
        <div>
          <p className="font-label-caps" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
            PRECIO DE VENTA
          </p>
          <p className="font-tabular-price" style={{ color: 'var(--secondary-fixed)', margin: 0 }}>
            {formatCOP(product.salePrice)}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p className="font-label-caps" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
            STOCK DISPONIBLE
          </p>
          <p className="font-headline-md" style={{ color: '#ffffff', margin: 0 }}>
            {product.type === 'physical' ? (
              <>
                {product.currentStock}{' '}
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255, 255, 255, 0.6)' }}>
                  {product.unit}s
                </span>
              </>
            ) : (
              <span style={{ fontSize: '18px', color: 'var(--secondary-fixed)' }}>Ilimitado</span>
            )}
          </p>
        </div>
      </div>

      {/* Margin / Cost breakdown pill for physical products */}
      {product.type === 'physical' && product.costPrice > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-default)',
            padding: '12px 18px',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.85)'
          }}
        >
          <span>Costo: <strong>{formatCOP(product.costPrice)}</strong></span>
          <span>Margen: <strong style={{ color: 'var(--secondary-fixed)' }}>{product.marginPercentage}%</strong></span>
          <span>Ganancia estimada: <strong>{formatCOP(product.salePrice - product.costPrice)}</strong></span>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <button
          onClick={() => onAddToCart && onAddToCart(product)}
          disabled={isOutOfStock}
          style={{
            flex: 1,
            padding: '16px 24px',
            backgroundColor: 'var(--secondary-fixed)',
            color: 'var(--primary-container)',
            borderRadius: 'var(--radius-full)',
            fontWeight: 700,
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
            opacity: isOutOfStock ? 0.6 : 1,
            transition: 'all 0.2s ease',
            boxShadow: '0 8px 16px rgba(49, 3, 68, 0.15)'
          }}
        >
          <ShoppingBag size={20} />
          <span>{isOutOfStock ? 'Agotado' : 'Agregar a Venta'}</span>
        </button>

        <button
          onClick={() => onEditProduct(product)}
          style={{
            width: '54px',
            height: '54px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backgroundColor: 'transparent',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Editar Producto"
        >
          <Edit3 size={20} />
        </button>
      </div>
    </div>
  );
};
