import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Minus, Trash2, Banknote, CreditCard, CheckCircle2 } from 'lucide-react';
import { db } from '../../db';
import { salesRepository } from '../../repositories/salesRepository';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import type { Product, CartItem, PaymentMethod } from '../../types';

export const PosView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [successToast, setSuccessToast] = useState<{ total: number; change: number } | null>(null);

  // Live queries desde IndexedDB
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const products = useLiveQuery(() => 
    db.products.where('isActive').equals(1).toArray()
  ) || [];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const changeGiven = Math.max(0, amountReceived - cartTotal);

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const current = updated[existingIndex];
        const newQty = current.quantity + 1;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          subtotal: newQty * (current.customPrice ?? current.product.salePrice)
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity: 1,
            subtotal: product.salePrice
          }
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * (item.customPrice ?? item.product.salePrice)
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod('cash');
    setAmountReceived(cartTotal);
    setIsCheckoutOpen(true);
  };

  const handleConfirmSale = async () => {
    if (cart.length === 0) return;

    try {
      await salesRepository.processSale({
        cartItems: cart,
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? amountReceived : cartTotal
      });

      const change = paymentMethod === 'cash' ? Math.max(0, amountReceived - cartTotal) : 0;
      setSuccessToast({ total: cartTotal, change });
      clearCart();
      setIsCheckoutOpen(false);

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (error) {
      console.error('Error al procesar la venta:', error);
      alert('Error al registrar la venta');
    }
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', height: 'calc(100vh - 100px)' }} className="pos-layout">
      {/* Columna Izquierda: Catálogo y Búsqueda */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        {/* Toast de éxito en venta */}
        {successToast && (
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--color-success)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-glow-success)'
            }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={28} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '17px' }}>¡Venta Registrada Exitosamente!</div>
                <div style={{ fontSize: '14px', opacity: 0.95 }}>Total: {formatCOP(successToast.total)}</div>
              </div>
            </div>
            {successToast.change > 0 && (
              <div style={{ textAlign: 'right', backgroundColor: 'rgba(0,0,0,0.2)', padding: '6px 14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>VUELTAS A ENTREGAR</div>
                <div style={{ fontWeight: 800, fontSize: '20px' }}>{formatCOP(successToast.change)}</div>
              </div>
            )}
          </div>
        )}

        {/* Buscador de productos */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar producto o recarga (ej. Jabón Rey, Suavizante)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '48px', height: '52px', fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Filtro de Categorías */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: selectedCategory === 'all' ? 'var(--brand-primary)' : 'var(--bg-surface-raised)',
              color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              whiteSpace: 'nowrap'
            }}
          >
            Todos ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: selectedCategory === cat.id ? 'var(--brand-primary)' : 'var(--bg-surface-raised)',
                color: selectedCategory === cat.id ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
                whiteSpace: 'nowrap'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid de Productos */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
            alignContent: 'start',
            paddingRight: '4px'
          }}
        >
          {filteredProducts.map(product => {
            const isOutOfStock = product.type === 'physical' && product.currentStock <= 0;
            const isLowStock = product.type === 'physical' && product.currentStock <= product.minStockAlert;

            return (
              <div
                key={product.id}
                onClick={() => !isOutOfStock && addToCart(product)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  opacity: isOutOfStock ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      {product.type === 'service' ? 'Servicio / Recarga' : product.unit}
                    </span>
                    {product.type === 'physical' && (
                      <Badge size="sm" variant={isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'default'}>
                        Stock: {product.currentStock}
                      </Badge>
                    )}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.3 }}>
                    {product.name}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                    {formatCOP(product.salePrice)}
                  </div>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--brand-primary-light)',
                      color: 'var(--brand-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columna Derecha: Carrito de Venta Rápida */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {/* Encabezado del Carrito */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Venta Actual</h2>
            <Badge variant="info">{cart.reduce((s, i) => s + i.quantity, 0)} ítems</Badge>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              style={{ color: 'var(--color-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash2 size={15} /> Vaciar
            </button>
          )}
        </div>

        {/* Lista de Items en Carrito */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', gap: '12px', padding: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={28} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: '15px' }}>Toca cualquier producto del catálogo para agregarlo a la cuenta.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cart.map(item => (
                <div
                  key={item.product.id}
                  style={{
                    backgroundColor: 'var(--bg-surface-raised)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', flex: 1 }}>{item.product.name}</div>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ color: 'var(--text-muted)', padding: '2px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-default)'
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center', fontSize: '15px' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-default)'
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                      {formatCOP(item.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con Total y Botón de Cobro */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-raised)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL A COBRAR</span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(cartTotal)}
            </span>
          </div>

          <Button
            variant="success"
            size="lg"
            isFullWidth
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
          >
            COBRAR {cartTotal > 0 ? `(${formatCOP(cartTotal)})` : ''}
          </Button>
        </div>
      </div>

      {/* Modal de Cobro & Calculadora de Vueltas */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Finalizar y Cobrar Venta"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Total Destacado */}
          <div style={{ backgroundColor: 'var(--bg-surface-raised)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total de la Venta</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(cartTotal)}
            </div>
          </div>

          {/* Selector de Medio de Pago */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Medio de Pago
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => setPaymentMethod('cash')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${paymentMethod === 'cash' ? 'var(--color-success)' : 'var(--border-default)'}`,
                  backgroundColor: paymentMethod === 'cash' ? 'var(--color-success-bg)' : 'var(--bg-surface-raised)',
                  color: paymentMethod === 'cash' ? 'var(--color-success)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 700
                }}
              >
                <Banknote size={20} /> Efectivo
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${paymentMethod === 'transfer' ? 'var(--color-nequi)' : 'var(--border-default)'}`,
                  backgroundColor: paymentMethod === 'transfer' ? 'var(--color-nequi-bg)' : 'var(--bg-surface-raised)',
                  color: paymentMethod === 'transfer' ? 'var(--color-nequi)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 700
                }}
              >
                <CreditCard size={20} /> Nequi / Transf.
              </button>
            </div>
          </div>

          {/* Cálculo de Vueltas para Pago en Efectivo */}
          {paymentMethod === 'cash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  ¿Cuánto dinero entrega el cliente?
                </label>
                <input
                  type="number"
                  value={amountReceived || ''}
                  onChange={e => setAmountReceived(Number(e.target.value))}
                  placeholder="0"
                  style={{ width: '100%', height: '56px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'center' }}
                  autoFocus
                />
              </div>

              {/* Botones de denominaciones rápidas de billetes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAmountReceived(cartTotal)}
                  style={{ padding: '10px', backgroundColor: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}
                >
                  Exacto
                </button>
                <button
                  type="button"
                  onClick={() => setAmountReceived(10000)}
                  style={{ padding: '10px', backgroundColor: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}
                >
                  $10.000
                </button>
                <button
                  type="button"
                  onClick={() => setAmountReceived(20000)}
                  style={{ padding: '10px', backgroundColor: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}
                >
                  $20.000
                </button>
                <button
                  type="button"
                  onClick={() => setAmountReceived(50000)}
                  style={{ padding: '10px', backgroundColor: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}
                >
                  $50.000
                </button>
                <button
                  type="button"
                  onClick={() => setAmountReceived(100000)}
                  style={{ padding: '10px', backgroundColor: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}
                >
                  $100.000
                </button>
                <button
                  type="button"
                  onClick={() => setAmountReceived(Math.ceil(cartTotal / 10000) * 10000)}
                  style={{ padding: '10px', backgroundColor: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}
                >
                  Redondo
                </button>
              </div>

              {/* Vueltas Calculadas */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: amountReceived >= cartTotal ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                  border: `1px solid ${amountReceived >= cartTotal ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '15px', color: amountReceived >= cartTotal ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {amountReceived >= cartTotal ? 'VUELTAS / CAMBIO:' : 'DINERO INSUFICIENTE:'}
                </span>
                <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: amountReceived >= cartTotal ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {formatCOP(amountReceived >= cartTotal ? changeGiven : cartTotal - amountReceived)}
                </span>
              </div>
            </div>
          )}

          {/* Botón de Confirmación */}
          <Button
            variant="success"
            size="lg"
            isFullWidth
            disabled={paymentMethod === 'cash' && amountReceived < cartTotal}
            onClick={handleConfirmSale}
          >
            CONFIRMAR Y CERRAR VENTA
          </Button>
        </div>
      </Modal>

      {/* Responsive layout style */}
      <style>{`
        @media (max-width: 900px) {
          .pos-layout {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
};
