import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  PackagePlus,
  Calendar,
  Search,
  CheckCircle2,
  Package,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { db } from '../../db';
import { stockRepository } from '../../repositories/stockRepository';
import { ProductFormModal } from '../inventory/components/ProductFormModal';
import type { Product } from '../../types';

export const StockView: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [updateProductCost, setUpdateProductCost] = useState(true);
  const [notes, setNotes] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [successToast, setSuccessToast] = useState<{ productName: string; qty: number } | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  // Queries desde IndexedDB
  const products = useLiveQuery(() =>
    db.products.filter((p) => p.isActive !== false && p.type === 'physical').toArray()
  ) || [];

  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const stockEntries = useLiveQuery(() =>
    db.stockEntries.orderBy('entryDate').reverse().limit(50).toArray()
  ) || [];

  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  const selectedProduct = productMap.get(selectedProductId) || (products.length > 0 ? products[0] : null);

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setUnitCost(prod.costPrice ? prod.costPrice.toString() : '');
    setIsProductDropdownOpen(false);
  };

  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const prodId = selectedProductId || (selectedProduct ? selectedProduct.id : '');
    const numQty = parseFloat(quantity);
    const numCost = parseFloat(unitCost) || 0;

    if (!prodId || isNaN(numQty) || numQty <= 0) {
      alert('Por favor selecciona un producto e ingresa una cantidad válida mayor a 0.');
      return;
    }

    try {
      await stockRepository.registerEntry({
        productId: prodId,
        quantity: numQty,
        unitCost: numCost,
        updateProductCost,
        notes: notes.trim() || undefined
      });

      const prod = productMap.get(prodId);
      setSuccessToast({
        productName: prod ? prod.name : 'Producto',
        qty: numQty
      });

      setQuantity('');
      setNotes('');

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err) {
      console.error('Error registrando entrada de stock:', err);
      alert('Error al registrar la entrada de stock.');
    }
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const todayFormatted = new Date().toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const filteredProductsDropdown = products.filter((p) =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        position: 'relative',
        maxWidth: '1200px',
        margin: '0 auto',
        paddingBottom: '48px'
      }}
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
            <div style={{ fontWeight: 700, fontSize: '17px', color: '#f6d9fb' }}>
              ¡Entrada de Stock Registrada!
            </div>
            <div style={{ fontSize: '14px', color: '#ded8e3', marginTop: '4px' }}>
              Se agregaron <strong>+{successToast.qty} unidades</strong> a <strong>{successToast.productName}</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Top Header Section (Figma node 1:417) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
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
          Entradas de Stock
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            color: '#4d444e',
            maxWidth: '680px',
            lineHeight: '24px',
            fontFamily: 'var(--font-sans)'
          }}
        >
          Registra nuevas compras de mercancía al inventario para actualizar el stock físico y recalcular costos automáticamente.
        </p>
      </div>

      {/* Form Section: Nueva Entrada (Figma node 1:423) */}
      <div
        style={{
          backgroundColor: 'rgba(253, 247, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(207, 195, 207, 0.4)',
          borderRadius: '48px',
          padding: '32px',
          boxShadow: '0px 2px 12px rgba(49, 3, 68, 0.04)',
          position: 'relative',
          overflow: 'visible',
          zIndex: 10
        }}
      >
        {/* Blob decorativo translúcido */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            backgroundColor: '#f8d8ff',
            opacity: 0.35,
            filter: 'blur(32px)',
            pointerEvents: 'none'
          }}
        />

        {/* Encabezado del Formulario */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#f2ecf7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#310344'
            }}
          >
            <PackagePlus size={20} />
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#1d1a22',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Nueva Entrada
          </h3>
        </div>

        {/* Formulario */}
        <form onSubmit={handleRegisterEntry} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Fila 1: Producto a Ingresar (Buscador/Selector grande) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 50 }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#4d444e',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)'
              }}
            >
              PRODUCTO A INGRESAR
            </label>

            <div
              onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cfc3cf',
                borderRadius: '32px',
                padding: '16px 20px 16px 48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <Search
                size={18}
                color="#7e747f"
                style={{
                  position: 'absolute',
                  left: '18px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
              <div style={{ fontSize: '15px', color: selectedProduct ? '#1d1a22' : '#7e747f', fontWeight: 500 }}>
                {selectedProduct ? `${selectedProduct.name} (Stock actual: ${selectedProduct.currentStock} ${selectedProduct.unit}s)` : 'Seleccionar producto del catálogo...'}
              </div>
            </div>

            {/* Dropdown flotante de productos */}
            {isProductDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  zIndex: 200,
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  padding: '12px',
                  boxShadow: '0px 16px 36px rgba(49, 3, 68, 0.18)',
                  border: '1px solid #e6e0eb',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}
              >
                <input
                  type="text"
                  placeholder="Filtrar por nombre..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '16px',
                    border: '1px solid #cfc3cf',
                    marginBottom: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />

                {filteredProductsDropdown.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#7e747f' }}>
                      No se encontró ningún producto con ese nombre.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewProductName(productSearchTerm);
                        setIsNewProductModalOpen(true);
                        setIsProductDropdownOpen(false);
                      }}
                      style={{
                        backgroundColor: '#310344',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={15} />
                      <span>Crear "{productSearchTerm || 'Nuevo Producto'}"</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {filteredProductsDropdown.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: selectedProduct?.id === p.id ? '#f8f1fd' : 'transparent',
                          color: selectedProduct?.id === p.id ? '#310344' : '#1d1a22',
                          fontWeight: selectedProduct?.id === p.id ? 700 : 500,
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f2ecf7')}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            selectedProduct?.id === p.id ? '#f8f1fd' : 'transparent')
                        }
                      >
                        <span>{p.name}</span>
                        <span style={{ fontSize: '12px', color: '#7e747f' }}>
                          Stock: {p.currentStock} {p.unit}s • Costo: {formatCOP(p.costPrice)}
                        </span>
                      </div>
                    ))}

                    <div
                      style={{
                        borderTop: '1px solid #f2ecf7',
                        marginTop: '8px',
                        paddingTop: '8px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setNewProductName(productSearchTerm);
                          setIsNewProductModalOpen(true);
                          setIsProductDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: 'transparent',
                          color: '#310344',
                          border: '1px dashed rgba(49, 3, 68, 0.3)',
                          borderRadius: '16px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f1fd')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Plus size={15} />
                        <span>+ Registrar nuevo producto en catálogo</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Fila 2: Cantidad, Costo y Fecha */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px'
            }}
          >
            {/* Cantidad Comprada */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#4d444e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                CANTIDAD COMPRADA
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Ej. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cfc3cf',
                  borderRadius: '32px',
                  height: '50px',
                  padding: '0 20px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1d1a22',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            {/* Costo Unitario de Compra */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#4d444e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                COSTO UNITARIO DE COMPRA
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '18px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#4d444e'
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cfc3cf',
                    borderRadius: '32px',
                    height: '50px',
                    paddingLeft: '34px',
                    paddingRight: '20px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1d1a22',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>

            {/* Fecha de Ingreso (Read-only estilizado) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#4d444e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                FECHA DE INGRESO
              </label>
              <div
                style={{
                  backgroundColor: '#ece6f1',
                  border: '1px solid rgba(207, 195, 207, 0.5)',
                  borderRadius: '32px',
                  height: '50px',
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#4d444e',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxSizing: 'border-box'
                }}
              >
                <Calendar size={18} color="#7a4c8c" />
                <span style={{ textTransform: 'capitalize' }}>Hoy, {todayFormatted}</span>
              </div>
            </div>
          </div>

          {/* Fila 3: Botón de Registro */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              paddingTop: '8px'
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#4d444e',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={updateProductCost}
                onChange={(e) => setUpdateProductCost(e.target.checked)}
                style={{ accentColor: '#310344', width: '16px', height: '16px' }}
              />
              <span>Actualizar costo y recalcular precio de venta automáticamente</span>
            </label>

            <button
              type="submit"
              style={{
                backgroundColor: '#310344',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '16px 36px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0px 6px 16px rgba(49, 3, 68, 0.2)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span>Registrar Entrada</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* History Section: Historial Reciente (Figma node 1:478) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: '#1d1a22',
            fontFamily: 'var(--font-sans)'
          }}
        >
          Historial Reciente
        </h3>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '48px',
            border: '1px solid rgba(207, 195, 207, 0.3)',
            boxShadow: '0px 2px 12px rgba(49, 3, 68, 0.04)',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8f1fd',
                    borderBottom: '1px solid rgba(207, 195, 207, 0.3)'
                  }}
                >
                  <th
                    style={{
                      padding: '22px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#4d444e',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}
                  >
                    FECHA
                  </th>
                  <th
                    style={{
                      padding: '22px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#4d444e',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}
                  >
                    PRODUCTO
                  </th>
                  <th
                    style={{
                      padding: '22px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#4d444e',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}
                  >
                    CANTIDAD
                  </th>
                  <th
                    style={{
                      padding: '22px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#4d444e',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}
                  >
                    COSTO UNIT.
                  </th>
                  <th
                    style={{
                      padding: '22px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#4d444e',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textAlign: 'right'
                    }}
                  >
                    STOCK ACTUAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        color: '#7e747f'
                      }}
                    >
                      <Package size={40} color="#cfc3cf" style={{ marginBottom: '8px' }} />
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>No hay entradas de stock registradas aún.</div>
                      <div style={{ fontSize: '13px', marginTop: '4px' }}>Usa el formulario superior para registrar la primera compra.</div>
                    </td>
                  </tr>
                ) : (
                  stockEntries.map((entry) => {
                    const prod = productMap.get(entry.productId);
                    return (
                      <tr
                        key={entry.id}
                        style={{
                          borderBottom: '1px solid rgba(207, 195, 207, 0.2)',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdf7ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Fecha */}
                        <td
                          style={{
                            padding: '20px 24px',
                            fontSize: '14px',
                            color: '#4d444e',
                            fontFamily: 'var(--font-sans)'
                          }}
                        >
                          {formatDate(entry.entryDate)}
                        </td>

                        {/* Producto con Avatar */}
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                backgroundColor: '#f2ecf7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#310344',
                                flexShrink: 0
                              }}
                            >
                              <Sparkles size={18} />
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 600,
                                color: '#1d1a22',
                                fontFamily: 'var(--font-sans)'
                              }}
                            >
                              {prod ? prod.name : 'Producto'}
                            </div>
                          </div>
                        </td>

                        {/* Cantidad con Chip */}
                        <td style={{ padding: '20px 24px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '6px 14px',
                              borderRadius: '9999px',
                              backgroundColor: '#eedcfc',
                              color: '#21172d',
                              fontWeight: 700,
                              fontSize: '14px',
                              fontFamily: 'var(--font-sans)'
                            }}
                          >
                            +{entry.quantity} {prod?.unit || 'uds'}
                          </span>
                        </td>

                        {/* Costo Unitario */}
                        <td
                          style={{
                            padding: '20px 24px',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#1d1a22',
                            fontFamily: 'var(--font-sans)'
                          }}
                        >
                          {formatCOP(entry.unitCost)}
                        </td>

                        {/* Stock Resultante */}
                        <td
                          style={{
                            padding: '20px 24px',
                            textAlign: 'right',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#310344',
                            fontFamily: 'var(--font-sans)'
                          }}
                        >
                          {prod ? `${prod.currentStock} ${prod.unit}s` : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Creación Rápida de Producto */}
      <ProductFormModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        editingProduct={null}
        categories={categories}
        initialName={newProductName}
        onSuccess={(createdId) => {
          setSelectedProductId(createdId);
          setIsNewProductModalOpen(false);
        }}
      />
    </div>
  );
};
