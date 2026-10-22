import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Banknote,
  Smartphone,
  Package
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { db } from '../../../db';
import { debtsRepository } from '../../../repositories/debtsRepository';
import { NoOpenSessionError } from '../../../repositories/salesRepository';
import { formatCOP, formatNumberWithDots, parseCOPInput } from '../../../utils/currency';
import type { CartItem, DebtorQuickFilter, DebtWithDetails, PaymentMethod, Product } from '../../../types';

const EMPTY_CART_ITEMS: CartItem[] = [];

interface NewDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCartItems?: CartItem[];
  onSuccess?: (createdDebt: DebtWithDetails) => void;
  onRequireOpenSession?: () => void;
}

export const NewDebtModal: React.FC<NewDebtModalProps> = ({
  isOpen,
  onClose,
  initialCartItems = EMPTY_CART_ITEMS,
  onSuccess,
  onRequireOpenSession
}) => {
  const [debtorName, setDebtorName] = useState('');
  const [debtorPhone, setDebtorPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [initialAbonoRaw, setInitialAbonoRaw] = useState('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod>('cash');
  const [items, setItems] = useState<CartItem[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [knownDebtors, setKnownDebtors] = useState<DebtorQuickFilter[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  const products = useLiveQuery(() => db.products.filter((p) => p.isActive !== false).toArray()) || [];

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setDebtorName('');
      setDebtorPhone('');
      setDueDate('');
      setNotes('');
      setInitialAbonoRaw('');
      setInitialPaymentMethod('cash');
      setItems(initialCartItems.map((it) => ({ ...it })));
      setShowProductPicker(initialCartItems.length === 0);
      setProductSearch('');
      setErrorMsg(null);

      debtsRepository.getDistinctDebtors().then(setKnownDebtors).catch(() => setKnownDebtors([]));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialCartItems]);

  const totalAmount = useMemo(() => items.reduce((sum, it) => sum + it.subtotal, 0), [items]);
  const initialAbono = parseCOPInput(initialAbonoRaw);
  const pendingBalance = Math.max(0, totalAmount - initialAbono);

  const filteredCatalog = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 10);
  }, [products, productSearch]);

  const handleSelectKnownDebtor = (d: DebtorQuickFilter) => {
    setDebtorName(d.debtorName);
    if (d.debtorPhone) {
      setDebtorPhone(d.debtorPhone);
    }
    setErrorMsg(null);
  };

  const handleAddProduct = (prod: Product) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.product.id === prod.id);
      if (idx > -1) {
        const next = [...prev];
        const current = next[idx];
        const newQty = parseFloat((current.quantity + 1).toFixed(3));
        const unitPrice = current.customPrice ?? prod.salePrice;
        next[idx] = {
          ...current,
          quantity: newQty,
          subtotal: Math.round(newQty * unitPrice)
        };
        return next;
      }
      return [
        ...prev,
        {
          product: prod,
          quantity: 1,
          subtotal: prod.salePrice
        }
      ];
    });
    setErrorMsg(null);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.product.id !== productId) return it;
          const newQty = parseFloat((it.quantity + delta).toFixed(3));
          if (newQty <= 0) return null;
          const unitPrice = it.customPrice ?? it.product.salePrice;
          return {
            ...it,
            quantity: newQty,
            subtotal: Math.round(newQty * unitPrice)
          };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleUpdateCustomSubtotal = (productId: string, newSubtotalRaw: string) => {
    const val = parseCOPInput(newSubtotalRaw);
    setItems((prev) =>
      prev.map((it) => {
        if (it.product.id !== productId) return it;
        if (it.product.type === 'service') {
          return {
            ...it,
            customPrice: val,
            subtotal: val
          };
        }
        const computedQty =
          it.product.salePrice > 0 ? parseFloat((val / it.product.salePrice).toFixed(3)) : it.quantity;
        return {
          ...it,
          quantity: computedQty > 0 ? computedQty : it.quantity,
          subtotal: val
        };
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorName.trim()) {
      setErrorMsg('Ingresa el nombre del cliente o familiar.');
      return;
    }
    if (items.length === 0 || totalAmount <= 0) {
      setErrorMsg('Agrega al menos un producto o servicio con valor mayor a $0.');
      return;
    }
    if (initialAbono > totalAmount) {
      setErrorMsg('El abono inicial no puede ser mayor que el total del fiado.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await debtsRepository.createDebt({
        cartItems: items,
        debtorName: debtorName.trim(),
        debtorPhone: debtorPhone.trim() || undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        initialPaymentAmount: initialAbono,
        initialPaymentMethod
      });

      onSuccess?.(created);
      onClose();
    } catch (err) {
      if (err instanceof NoOpenSessionError) {
        onClose();
        onRequireOpenSession?.();
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar el fiado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nuevo Préstamo / Fiado"
      subtitle="Se descontará el stock de productos físicos hoy y se reflejará en ventas cuando el cliente pague"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Cliente Destino + Chips de Clientes Frecuentes */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#310344',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}
          >
            CLIENTE / FAMILIAR DESTINO *
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Ej. Doña Gloria Restrepo, Tía Marta, Vecino Fernando..."
            value={debtorName}
            onChange={(e) => {
              setDebtorName(e.target.value);
              setErrorMsg(null);
            }}
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '16px',
              border: '1.5px solid #cfc3cf',
              backgroundColor: '#f8f1fd',
              padding: '0 16px',
              fontSize: '14.5px',
              fontWeight: 600,
              color: '#1d1a22',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />

          {knownDebtors.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#6d5773', fontWeight: 600 }}>Frecuentes:</span>
              {knownDebtors.slice(0, 5).map((d) => (
                <button
                  key={d.debtorName}
                  type="button"
                  onClick={() => handleSelectKnownDebtor(d)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border:
                      debtorName.toLowerCase() === d.debtorName.toLowerCase()
                        ? '1px solid #310344'
                        : '1px solid #e6e0eb',
                    backgroundColor:
                      debtorName.toLowerCase() === d.debtorName.toLowerCase() ? '#310344' : '#f2ecf7',
                    color: debtorName.toLowerCase() === d.debtorName.toLowerCase() ? '#f6d9fb' : '#4d444e',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserCheck size={12} />
                  <span>{d.debtorName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Teléfono y Fecha Pactada */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px'
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#4d444e',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}
            >
              TELÉFONO / WHATSAPP (OPCIONAL)
            </label>
            <input
              type="tel"
              placeholder="Ej. 312 458 9012"
              value={debtorPhone}
              onChange={(e) => setDebtorPhone(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '16px',
                border: '1px solid #cfc3cf',
                backgroundColor: '#f8f1fd',
                padding: '0 14px',
                fontSize: '13.5px',
                color: '#1d1a22',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#4d444e',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}
            >
              FECHA PACTADA DE PAGO (OPCIONAL)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '16px',
                border: '1px solid #cfc3cf',
                backgroundColor: '#f8f1fd',
                padding: '0 14px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#1d1a22',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Productos y Servicios Salientes del Inventario */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}
          >
            <label
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#310344',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              PRODUCTOS Y SERVICIOS INCLUIDOS ({items.length}) *
            </label>

            <button
              type="button"
              onClick={() => setShowProductPicker((prev) => !prev)}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#f3d6f9',
                color: '#310344',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={13} />
              <span>{showProductPicker ? 'Ocultar Catálogo' : 'Agregar Producto / Recarga'}</span>
            </button>
          </div>

          {/* Buscador rápido del catálogo */}
          {showProductPicker && (
            <div
              style={{
                backgroundColor: '#f8f1fd',
                borderRadius: '18px',
                padding: '12px',
                border: '1px solid #e6e0eb',
                marginBottom: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  color="#6d5773"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Buscar producto físico o recarga/servicio para agregar al fiado..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '12px',
                    border: '1px solid #cfc3cf',
                    backgroundColor: '#ffffff',
                    padding: '0 12px 0 36px',
                    fontSize: '13px',
                    color: '#1d1a22',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                  gap: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}
              >
                {filteredCatalog.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleAddProduct(prod)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '12px',
                      border: '1px solid #e6e0eb',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#1d1a22',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {prod.name}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: '#6d5773'
                      }}
                    >
                      <span>{prod.type === 'service' ? 'Servicio' : `Stock: ${prod.currentStock}`}</span>
                      <strong style={{ color: '#310344' }}>{formatCOP(prod.salePrice)}</strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de ítems del fiado */}
          <div
            style={{
              backgroundColor: '#f8f1fd',
              borderRadius: '18px',
              padding: '12px',
              border: '1px solid rgba(207, 195, 207, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '210px',
              overflowY: 'auto'
            }}
          >
            {items.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#6d5773',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Package size={24} color="#7a4c8c" />
                <span>Selecciona productos o servicios arriba para incluirlos en el fiado.</span>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    backgroundColor: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid #ece6f1'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#f2ecf7',
                        borderRadius: '999px',
                        padding: '2px 6px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, -1)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '22px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, 1)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1d1a22',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.product.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6d5773' }}>
                        {item.product.type === 'service' ? 'Recarga / Servicio' : `${item.product.unit}`} •{' '}
                        {formatCOP(item.customPrice ?? item.product.salePrice)} c/u
                      </div>
                    </div>
                  </div>

                  {/* Subtotal editable (útil para recargas de monto variable o granel) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#310344' }}>$</span>
                    <input
                      type="text"
                      value={formatNumberWithDots(item.subtotal)}
                      onChange={(e) => handleUpdateCustomSubtotal(item.product.id, e.target.value)}
                      title="Puedes ajustar el valor del ítem (ej. monto de recarga)"
                      style={{
                        width: '86px',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: '1px solid #e6e0eb',
                        backgroundColor: '#f8f1fd',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#310344',
                        textAlign: 'right',
                        outline: 'none'
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.product.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ba1a1a',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Quitar ítem"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Total Fiado y Abono Inicial Opcional */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px'
          }}
        >
          <div
            style={{
              backgroundColor: '#f2ecf7',
              borderRadius: '18px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#6d5773',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              Total Fiado (COP)
            </span>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#310344',
                marginTop: '2px',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatCOP(totalAmount)}
            </span>
            {initialAbono > 0 && (
              <span style={{ fontSize: '11.5px', color: '#6d5773', marginTop: '2px' }}>
                Saldo a cobrar: <strong>{formatCOP(pendingBalance)}</strong>
              </span>
            )}
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#4d444e',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}
            >
              ABONO INICIAL HOY (OPCIONAL)
            </label>
            <input
              type="text"
              placeholder="$ 0"
              value={initialAbonoRaw}
              onChange={(e) => {
                const clean = parseCOPInput(e.target.value);
                setInitialAbonoRaw(clean > 0 ? formatNumberWithDots(clean) : '');
              }}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '16px',
                border: '1px solid #cfc3cf',
                backgroundColor: '#f8f1fd',
                padding: '0 14px',
                fontSize: '16px',
                fontWeight: 700,
                color: '#310344',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {initialAbono > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setInitialPaymentMethod('cash')}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: initialPaymentMethod === 'cash' ? '#310344' : '#e6e0eb',
                    color: initialPaymentMethod === 'cash' ? '#ffffff' : '#4d444e',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Banknote size={12} /> Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setInitialPaymentMethod('transfer')}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: initialPaymentMethod === 'transfer' ? '#310344' : '#e6e0eb',
                    color: initialPaymentMethod === 'transfer' ? '#ffffff' : '#4d444e',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Smartphone size={12} /> Nequi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notas / Compromiso */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#4d444e',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}
          >
            NOTAS / COMPROMISO DE PAGO (OPCIONAL)
          </label>
          <textarea
            rows={2}
            placeholder="Ej. Prometió pagar en quincena por Nequi o al pasar por la tienda..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              borderRadius: '16px',
              border: '1px solid #cfc3cf',
              backgroundColor: '#f8f1fd',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#1d1a22',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical'
            }}
          />
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '14px',
              backgroundColor: '#ffdad6',
              color: '#93000a',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #ece6f1'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '13px 16px',
              borderRadius: '18px',
              border: '1px solid #cfc3cf',
              backgroundColor: '#f2ecf7',
              color: '#1d1a22',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting || items.length === 0 || !debtorName.trim()}
            style={{
              flex: 1.5,
              padding: '13px 20px',
              borderRadius: '18px',
              border: 'none',
              backgroundColor: items.length > 0 && debtorName.trim() ? '#310344' : '#e6e0eb',
              color: items.length > 0 && debtorName.trim() ? '#ffffff' : '#7e747f',
              fontSize: '14px',
              fontWeight: 700,
              cursor: items.length > 0 && debtorName.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow:
                items.length > 0 && debtorName.trim() ? '0 8px 20px rgba(49, 3, 68, 0.22)' : 'none'
            }}
          >
            <CheckCircle2 size={18} />
            <span>{isSubmitting ? 'Guardando Fiado...' : 'Guardar y Generar Folio'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
