import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  Smartphone,
  Receipt,
  CheckCircle2,
  Package,
  Sparkles,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { db } from '../../db';
import { salesRepository, NoOpenSessionError } from '../../repositories/salesRepository';
import { Modal } from '../../components/ui/Modal';
import { CashSessionModal } from '../cash/components/CashSessionModal';
import { formatCOP, formatNumberWithDots, parseCOPInput } from '../../utils/currency';
import type { Product, CartItem, PaymentMethod } from '../../types';

// Unidades continuas / líquidas / a granel que admiten venta fraccionada por dinero o volumen
const FRACTIONAL_BULK_UNITS = [
  'litro',
  'litros',
  'l',
  'galón',
  'galon',
  'galones',
  'ml',
  'mililitro',
  'mililitros',
  'cc',
  'kg',
  'kilo',
  'kilos',
  'kilogramo',
  'kilogramos',
  'gramo',
  'gramos',
  'gr',
  'g',
  'libra',
  'libras',
  'lb'
];

export const PosView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceivedRaw, setAmountReceivedRaw] = useState<string>('');
  const [successToast, setSuccessToast] = useState<{ total: number; change: number } | null>(null);

  // Estado para Modal de Venta Fraccionada (Por Dinero vs Por Volumen)
  const [fractionalModalOpen, setFractionalModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedBulkProduct, setSelectedBulkProduct] = useState<Product | null>(null);
  const [fractionalMode, setFractionalMode] = useState<'money' | 'quantity'>('money');
  const [moneyAmountRaw, setMoneyAmountRaw] = useState<string>('2000');
  const [quantityAmountRaw, setQuantityAmountRaw] = useState<string>('1');

  // Live queries desde IndexedDB
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const products = useLiveQuery(() =>
    db.products.filter((p) => p.isActive !== false).toArray()
  ) || [];
  const openSession = useLiveQuery(() => db.cashSessions.filter((s) => s.status === 'open').first());
  const hasOpenSession = Boolean(openSession);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const numReceived = parseCOPInput(amountReceivedRaw);
  const changeGiven = Math.max(0, numReceived - cartTotal);

  const isBulkProduct = (prod: Product) => {
    if (!prod || prod.type === 'service') return false;
    const unitLower = (prod.unit || '').toLowerCase().trim();
    return FRACTIONAL_BULK_UNITS.includes(unitLower);
  };

  const handleProductClick = (product: Product) => {
    if (isBulkProduct(product)) {
      openFractionalModal(product);
    } else {
      addToCartDirect(product, 1);
    }
  };

  const openFractionalModal = (product: Product) => {
    setSelectedBulkProduct(product);
    setFractionalMode('money');
    // Preconfigurar con un valor por defecto redondeado
    setMoneyAmountRaw('2000');
    setQuantityAmountRaw('1');
    setFractionalModalOpen(true);
  };

  const addToCartDirect = (product: Product, qty: number, customSubtotal?: number) => {
    const subtotal = customSubtotal !== undefined ? customSubtotal : Math.round(qty * product.salePrice);
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const current = updated[existingIndex];
        const newQty = parseFloat((current.quantity + qty).toFixed(3));
        const newSubtotal = Math.round(newQty * product.salePrice);
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          subtotal: newSubtotal
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity: parseFloat(qty.toFixed(3)),
            subtotal
          }
        ];
      }
    });
  };

  const handleConfirmFractionalSale = () => {
    if (!selectedBulkProduct) return;

    if (fractionalMode === 'money') {
      const moneyVal = parseCOPInput(moneyAmountRaw);
      if (moneyVal <= 0) {
        alert('Ingresa un valor válido en dinero.');
        return;
      }
      // Cantidad = Dinero / Precio Unitario
      const calculatedQty = selectedBulkProduct.salePrice > 0 ? moneyVal / selectedBulkProduct.salePrice : 0;
      addToCartDirect(selectedBulkProduct, calculatedQty, moneyVal);
    } else {
      const qtyVal = parseFloat(quantityAmountRaw);
      if (isNaN(qtyVal) || qtyVal <= 0) {
        alert('Ingresa una cantidad válida mayor a 0.');
        return;
      }
      const calculatedSubtotal = Math.round(qtyVal * selectedBulkProduct.salePrice);
      addToCartDirect(selectedBulkProduct, qtyVal, calculatedSubtotal);
    }

    setFractionalModalOpen(false);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const step = isBulkProduct(item.product) ? 0.5 : 1;
            const newQty = parseFloat((item.quantity + delta * step).toFixed(3));
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: Math.round(newQty * (item.customPrice ?? item.product.salePrice))
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAmountReceivedRaw('');
  };

  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    if (!hasOpenSession) {
      setSessionModalOpen(true);
      return;
    }

    try {
      const receivedVal = paymentMethod === 'cash' ? (numReceived || cartTotal) : cartTotal;
      await salesRepository.processSale({
        cartItems: cart,
        paymentMethod,
        amountReceived: receivedVal
      });

      const change = paymentMethod === 'cash' ? Math.max(0, receivedVal - cartTotal) : 0;
      setSuccessToast({ total: cartTotal, change });
      clearCart();

      setTimeout(() => {
        setSuccessToast(null);
      }, 4500);
    } catch (error) {
      console.error('Error al procesar la venta:', error);
      if (error instanceof NoOpenSessionError) {
        setSessionModalOpen(true);
        return;
      }
      alert(error instanceof Error ? error.message : 'Error al registrar la venta');
    }
  };

  // Cálculo en vivo para el modal fraccionado
  const computedFractionalQty =
    selectedBulkProduct && selectedBulkProduct.salePrice > 0
      ? (parseCOPInput(moneyAmountRaw) / selectedBulkProduct.salePrice).toFixed(3)
      : '0.000';

  const computedFractionalMoney =
    selectedBulkProduct
      ? Math.round((parseFloat(quantityAmountRaw) || 0) * selectedBulkProduct.salePrice)
      : 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.45fr) minmax(360px, 1fr)',
        gap: '32px',
        minHeight: 'calc(100vh - 100px)',
        alignItems: 'start',
        position: 'relative'
      }}
      className="pos-desktop-layout"
    >
      {/* Toast de éxito */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '32px',
            zIndex: 1000,
            padding: '20px 24px',
            backgroundColor: '#010001',
            color: '#ffffff',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0px 16px 32px rgba(49, 3, 68, 0.25)',
            border: '1px solid #310344'
          }}
          className="animate-fade-in"
        >
          <CheckCircle2 size={32} color="#f6d9fb" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#f6d9fb' }}>
              ¡Venta Registrada Exitosamente!
            </div>
            <div style={{ fontSize: '14px', color: '#ded8e3', marginTop: '4px' }}>
              Total: <strong>{formatCOP(successToast.total)}</strong>
              {successToast.change > 0 && (
                <span>
                  {' '}• Cambio / Vueltas: <strong>{formatCOP(successToast.change)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 60% Left Panel: Catálogo y Productos Destacados                           */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Encabezado y Filtros */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#1d1a22',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Productos Destacados
              </h2>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: '#4d444e',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Selecciona productos para agregarlos por unidad o venderlos por valor ($ COP)
              </p>
            </div>

            {/* Buscador de productos integrado */}
            <div
              style={{
                position: 'relative',
                width: '240px'
              }}
            >
              <Search
                size={16}
                color="#7e747f"
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar producto..."
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 42px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(207, 195, 207, 0.4)',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  color: '#1d1a22',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Chips de Categorías */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px'
            }}
          >
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '10px 18px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: selectedCategory === 'all' ? '#f6d9fb' : '#f2ecf7',
                color: selectedCategory === 'all' ? '#27142d' : '#4d444e',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              Todos
            </button>

            {categories.map((cat) => {
              const isCatActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '9999px',
                    border: 'none',
                    backgroundColor: isCatActive ? '#f6d9fb' : '#f2ecf7',
                    color: isCatActive ? '#27142d' : '#4d444e',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grilla de Tarjetas de Productos Táctiles */}
        {filteredProducts.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '48px',
              color: '#4d444e',
              boxShadow: '24px 0px 48px rgba(49, 3, 68, 0.04)'
            }}
          >
            <Package size={48} color="#7e747f" style={{ marginBottom: '16px', opacity: 0.5 }} />
            <div style={{ fontSize: '18px', fontWeight: 600 }}>No se encontraron productos</div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>Intenta con otro término de búsqueda o categoría.</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '20px'
            }}
          >
            {filteredProducts.map((product) => {
              const isBulk = isBulkProduct(product);
              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '48px',
                    padding: '16px',
                    boxShadow: '24px 0px 48px rgba(49, 3, 68, 0.04)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                    border: '1px solid transparent',
                    position: 'relative',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(49, 3, 68, 0.08)';
                    e.currentTarget.style.borderColor = '#f6d9fb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '24px 0px 48px rgba(49, 3, 68, 0.04)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {/* Preview / Badge de Producto */}
                  <div
                    style={{
                      height: '110px',
                      borderRadius: '32px',
                      backgroundColor: '#f2ecf7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#310344',
                        boxShadow: '0 4px 12px rgba(49, 3, 68, 0.06)'
                      }}
                    >
                      {product.type === 'service' ? (
                        <Smartphone size={22} />
                      ) : (
                        <Sparkles size={22} />
                      )}
                    </div>

                    {isBulk && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: 'rgba(49, 3, 68, 0.9)',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          letterSpacing: '0.04em'
                        }}
                      >
                        A Granel
                      </div>
                    )}
                  </div>

                  {/* Info Producto */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '17px',
                        fontWeight: 600,
                        color: '#1d1a22',
                        lineHeight: 1.25,
                        fontFamily: 'var(--font-sans)',
                        minHeight: '42px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {product.name}
                    </h3>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#7e747f',
                        fontFamily: 'var(--font-sans)'
                      }}
                    >
                      {product.type === 'service' ? 'Servicio / Recarga' : `${product.currentStock} ${product.unit}s`}
                    </div>
                  </div>

                  {/* Precio y Botón Agregar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '19px',
                        fontWeight: 700,
                        color: '#010001',
                        fontFamily: 'var(--font-sans)',
                        letterSpacing: '-0.5px'
                      }}
                    >
                      {formatCOP(product.salePrice)}
                    </div>

                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '9999px',
                        backgroundColor: '#f6d9fb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#310344',
                        boxShadow: '0 2px 6px rgba(49, 3, 68, 0.08)'
                      }}
                      title={isBulk ? 'Venta Fraccionada / por Valor' : 'Agregar 1 unidad'}
                    >
                      {isBulk ? <SlidersHorizontal size={14} /> : <Plus size={16} strokeWidth={2.5} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 40% Right Panel: Carrito / Venta Actual (Aside Panel)                     */}
      {/* ========================================================================= */}
      <aside
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '48px',
          padding: '32px',
          boxShadow: '24px 0px 48px rgba(49, 3, 68, 0.04)',
          position: 'sticky',
          top: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflow: 'hidden'
        }}
      >
        {/* Blob Decorativo de Fondo */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '260px',
            height: '260px',
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
            backgroundColor: '#f8d8ff',
            opacity: 0.35,
            pointerEvents: 'none'
          }}
        />

        {/* Encabezado del Carrito */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                color: '#1d1a22',
                letterSpacing: '-0.3px',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Venta Actual
            </h2>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#7e747f',
                fontFamily: 'var(--font-sans)'
              }}
            >
              ({cart.length} {cart.length === 1 ? 'ítem' : 'ítems'})
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#ba1a1a',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={14} />
              <span>Vaciar</span>
            </button>
          )}
        </div>

        {!hasOpenSession && (
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              backgroundColor: '#fff4e5',
              border: '1px solid #f5c16c',
              borderRadius: '20px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '13px', color: '#7c4a03', fontWeight: 600 }}>
              Abre caja para poder vender
            </span>
            <button
              type="button"
              onClick={() => setSessionModalOpen(true)}
              style={{
                border: 'none',
                backgroundColor: '#310344',
                color: '#fff',
                borderRadius: '999px',
                padding: '8px 12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Abrir caja
            </button>
          </div>
        )}

        {/* Lista de Ítems en el Carrito */}
        <div
          style={{
            minHeight: '140px',
            maxHeight: '260px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            zIndex: 1,
            paddingRight: '4px'
          }}
        >
          {cart.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '140px',
                color: '#7e747f',
                fontSize: '14px',
                textAlign: 'center'
              }}
            >
              <Receipt size={36} color="#cfc3cf" style={{ marginBottom: '8px' }} />
              <div>El carrito está vacío</div>
              <div style={{ fontSize: '12px', marginTop: '2px' }}>Haz clic en un producto para agregarlo</div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #e6e0eb',
                  gap: '12px'
                }}
              >
                {/* Controles de Cantidad */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#f2ecf7',
                    borderRadius: '9999px',
                    padding: '2px 6px'
                  }}
                >
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1d1a22'
                    }}
                  >
                    <Minus size={12} strokeWidth={2.5} />
                  </button>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#1d1a22',
                      minWidth: '22px',
                      textAlign: 'center'
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1d1a22'
                    }}
                  >
                    <Plus size={12} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Nombre y Cantidad Fraccionada */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: '#1d1a22',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7e747f' }}>
                    {item.quantity} {item.product.unit}s • {formatCOP(item.product.salePrice)} c/u
                  </div>
                </div>

                {/* Subtotal */}
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#010001',
                    textAlign: 'right',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formatCOP(item.subtotal)}
                </div>

                {/* Botón Eliminar Rápido */}
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#7e747f',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Eliminar producto"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sección de Totales y Liquidación */}
        <div
          style={{
            borderTop: '1px solid #e6e0eb',
            paddingTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Display Total Grande */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#f8f1fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#310344'
              }}
            >
              <Receipt size={24} />
            </div>

            <div
              style={{
                fontSize: '44px',
                fontWeight: 700,
                color: '#010001',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '-1.5px',
                textAlign: 'right',
                lineHeight: 1
              }}
            >
              {formatCOP(cartTotal)}
            </div>
          </div>

          {/* Tarjeta de Recibido y Vueltas con Formato de Moneda COP */}
          <div
            style={{
              backgroundColor: '#f8f1fd',
              borderRadius: '36px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              border: '1px solid rgba(207, 195, 207, 0.4)'
            }}
          >
            {/* Fila Recibido con separadores de miles */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #e6e0eb'
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#7e747f',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '2px'
                  }}
                >
                  Recibido
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#310344' }}>$</span>
                  <input
                    type="text"
                    value={amountReceivedRaw}
                    onChange={(e) => {
                      const cleanNumber = parseCOPInput(e.target.value);
                      setAmountReceivedRaw(cleanNumber > 0 ? formatNumberWithDots(cleanNumber) : '');
                    }}
                    placeholder={cartTotal > 0 ? formatNumberWithDots(cartTotal) : '0'}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '26px',
                      fontWeight: 700,
                      color: '#310344',
                      outline: 'none',
                      width: '150px',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                </div>
              </div>

              {/* Botón Pago Exacto */}
              {cartTotal > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountReceivedRaw(formatNumberWithDots(cartTotal))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    border: '1px solid #310344',
                    backgroundColor: '#ffffff',
                    color: '#310344',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Exacto
                </button>
              )}
            </div>

            {/* Fila Vueltas */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#7e747f',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}
              >
                Vueltas
              </span>
              <span
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: numReceived >= cartTotal && cartTotal > 0 ? '#10b981' : '#310344',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                {formatCOP(changeGiven)}
              </span>
            </div>
          </div>

          {/* Selector de Método de Pago */}
          <div
            style={{
              display: 'flex',
              gap: '10px'
            }}
          >
            <button
              onClick={() => setPaymentMethod('cash')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '9999px',
                border: paymentMethod === 'cash' ? '1px solid #310344' : '1px solid rgba(207, 195, 207, 0.4)',
                backgroundColor: paymentMethod === 'cash' ? '#310344' : '#ffffff',
                color: paymentMethod === 'cash' ? '#ffffff' : '#4d444e',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Banknote size={16} />
              <span>Efectivo</span>
            </button>

            <button
              onClick={() => setPaymentMethod('transfer')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '9999px',
                border: paymentMethod === 'transfer' ? '1px solid #310344' : '1px solid rgba(207, 195, 207, 0.4)',
                backgroundColor: paymentMethod === 'transfer' ? '#310344' : '#ffffff',
                color: paymentMethod === 'transfer' ? '#ffffff' : '#4d444e',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Smartphone size={16} />
              <span>Nequi / Transf.</span>
            </button>
          </div>

          {/* Botón Principal: Confirmar Venta */}
          <button
            onClick={handleConfirmSale}
            disabled={cart.length === 0 || !hasOpenSession}
            style={{
              backgroundColor: cart.length > 0 && hasOpenSession ? '#010001' : '#e6e0eb',
              color: cart.length > 0 && hasOpenSession ? '#ffffff' : '#7e747f',
              border: 'none',
              borderRadius: '48px',
              padding: '18px 24px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: cart.length > 0 && hasOpenSession ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: cart.length > 0 && hasOpenSession ? '0 12px 32px rgba(49, 3, 68, 0.25)' : 'none',
              transition: 'transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseDown={(e) => {
              if (cart.length > 0 && hasOpenSession) e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              if (cart.length > 0 && hasOpenSession) e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span>{hasOpenSession ? 'Confirmar Venta' : 'Abre caja para vender'}</span>
            <CheckCircle2 size={20} />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* Modal de Venta Fraccionada (Por Dinero vs. Por Volumen)                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={fractionalModalOpen}
        onClose={() => setFractionalModalOpen(false)}
        title={selectedBulkProduct ? `Venta de ${selectedBulkProduct.name}` : 'Venta Fraccionada'}
        subtitle={
          selectedBulkProduct
            ? `Precio base: ${formatCOP(selectedBulkProduct.salePrice)} por ${selectedBulkProduct.unit}`
            : undefined
        }
        maxWidth="520px"
      >
        {selectedBulkProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Selector de Modo: Por Dinero ($ COP) vs Por Cantidad/Volumen */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f8f1fd',
                borderRadius: '9999px',
                padding: '4px',
                border: '1px solid rgba(207, 195, 207, 0.4)'
              }}
            >
              <button
                type="button"
                onClick={() => setFractionalMode('money')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: fractionalMode === 'money' ? '#310344' : 'transparent',
                  color: fractionalMode === 'money' ? '#ffffff' : '#4d444e',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                💵 Vender por Dinero ($ COP)
              </button>

              <button
                type="button"
                onClick={() => setFractionalMode('quantity')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: fractionalMode === 'quantity' ? '#310344' : 'transparent',
                  color: fractionalMode === 'quantity' ? '#ffffff' : '#4d444e',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                🧪 Vender por Volumen ({selectedBulkProduct.unit})
              </button>
            </div>

            {/* Formulario según el modo seleccionado */}
            {fractionalMode === 'money' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#4d444e',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}
                  >
                    ¿CUÁNTO DINERO DESEA LLEVAR EL CLIENTE?
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '20px',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#310344'
                      }}
                    >
                      $
                    </span>
                    <input
                      type="text"
                      value={moneyAmountRaw}
                      onChange={(e) => {
                        const clean = parseCOPInput(e.target.value);
                        setMoneyAmountRaw(clean > 0 ? formatNumberWithDots(clean) : '');
                      }}
                      placeholder="2.000"
                      style={{
                        width: '100%',
                        height: '56px',
                        paddingLeft: '40px',
                        paddingRight: '20px',
                        borderRadius: '28px',
                        border: '1.5px solid #cfc3cf',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#310344',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'var(--font-sans)'
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Chips de Dinero Rápido */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[1000, 2000, 3000, 5000, 10000, 20000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMoneyAmountRaw(formatNumberWithDots(val))}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: parseCOPInput(moneyAmountRaw) === val ? '1px solid #310344' : '1px solid #cfc3cf',
                        backgroundColor: parseCOPInput(moneyAmountRaw) === val ? '#f6d9fb' : '#ffffff',
                        color: parseCOPInput(moneyAmountRaw) === val ? '#27142d' : '#1d1a22',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ${formatNumberWithDots(val)}
                    </button>
                  ))}
                </div>

                {/* Tarjeta Informativa de Equivalencia */}
                <div
                  style={{
                    backgroundColor: '#f8f1fd',
                    padding: '16px 20px',
                    borderRadius: '24px',
                    border: '1px solid #ece6f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7e747f' }}>CANTIDAD A DESPACHAR:</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#310344' }}>
                      {computedFractionalQty} {selectedBulkProduct.unit}s
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7e747f' }}>TOTAL A COBRAR:</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#010001' }}>
                      {formatCOP(parseCOPInput(moneyAmountRaw))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Modo Cantidad / Volumen */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#4d444e',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}
                  >
                    VOLUMEN O CANTIDAD ({selectedBulkProduct.unit.toUpperCase()})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    value={quantityAmountRaw}
                    onChange={(e) => setQuantityAmountRaw(e.target.value)}
                    placeholder="1.0"
                    style={{
                      width: '100%',
                      height: '56px',
                      padding: '0 20px',
                      borderRadius: '28px',
                      border: '1.5px solid #cfc3cf',
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#310344',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-sans)'
                    }}
                    autoFocus
                  />
                </div>

                {/* Chips de Volumen Rápido */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: '0.25 (1/4)', val: '0.25' },
                    { label: '0.5 (1/2)', val: '0.5' },
                    { label: '1.0', val: '1' },
                    { label: '1.5', val: '1.5' },
                    { label: '2.0', val: '2' },
                    { label: '1 Galón (3.785)', val: '3.785' }
                  ].map((chip) => (
                    <button
                      key={chip.val}
                      type="button"
                      onClick={() => setQuantityAmountRaw(chip.val)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: quantityAmountRaw === chip.val ? '1px solid #310344' : '1px solid #cfc3cf',
                        backgroundColor: quantityAmountRaw === chip.val ? '#f6d9fb' : '#ffffff',
                        color: quantityAmountRaw === chip.val ? '#27142d' : '#1d1a22',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Tarjeta Informativa de Total */}
                <div
                  style={{
                    backgroundColor: '#f8f1fd',
                    padding: '16px 20px',
                    borderRadius: '24px',
                    border: '1px solid #ece6f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7e747f' }}>CANTIDAD:</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#310344' }}>
                      {parseFloat(quantityAmountRaw) || 0} {selectedBulkProduct.unit}s
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7e747f' }}>TOTAL A COBRAR:</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#010001' }}>
                      {formatCOP(computedFractionalMoney)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setFractionalModalOpen(false)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '9999px',
                  backgroundColor: 'transparent',
                  border: '1px solid #cfc3cf',
                  color: '#4d444e',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmFractionalSale}
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
                  boxShadow: '0 8px 18px rgba(49, 3, 68, 0.2)'
                }}
              >
                <span>
                  Agregar •{' '}
                  {fractionalMode === 'money'
                    ? formatCOP(parseCOPInput(moneyAmountRaw))
                    : formatCOP(computedFractionalMoney)}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>
      <CashSessionModal isOpen={sessionModalOpen} onClose={() => setSessionModalOpen(false)} />
    </div>
  );
};
