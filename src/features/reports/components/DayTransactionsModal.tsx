import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Receipt,
  Banknote,
  Smartphone,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { db } from '../../../db';
import { reportsRepository } from '../../../repositories/reportsRepository';
import { formatCOP, formatNumberWithDots } from '../../../utils/currency';
import type { Sale } from '../../../types';

interface DayTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  formattedDate: string;
}

type FilterMethod = 'all' | 'cash' | 'transfer';

export const DayTransactionsModal: React.FC<DayTransactionsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  formattedDate
}) => {
  const [transactions, setTransactions] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMethod, setFilterMethod] = useState<FilterMethod>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(new Set());

  // Reaccionar reactivamente si ocurren nuevas ventas en Dexie
  const salesCount = useLiveQuery(() => db.sales.count());

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadTransactions = async () => {
      setIsLoading(true);
      try {
        const sales = await reportsRepository.getDayTransactions(selectedDate);
        if (isMounted) {
          setTransactions(sales);
          // Por defecto expandir las primeras 3 ventas para facilidad de lectura
          const initialExpanded = new Set(sales.slice(0, 3).map((s) => s.id));
          setExpandedSaleIds(initialExpanded);
        }
      } catch (err) {
        console.error('Error cargando transacciones del día:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDate, salesCount]);

  const toggleExpand = (saleId: string) => {
    setExpandedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSaleIds(new Set(transactions.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedSaleIds(new Set());
  };

  // Métricas rápidas
  const totalAmount = useMemo(
    () => transactions.reduce((acc, s) => acc + s.totalAmount, 0),
    [transactions]
  );
  const cashCount = useMemo(
    () => transactions.filter((s) => s.paymentMethod === 'cash').length,
    [transactions]
  );
  const transferCount = useMemo(
    () => transactions.filter((s) => s.paymentMethod === 'transfer').length,
    [transactions]
  );

  // Filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    return transactions.filter((sale) => {
      if (filterMethod === 'cash' && sale.paymentMethod !== 'cash') return false;
      if (filterMethod === 'transfer' && sale.paymentMethod !== 'transfer') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = sale.id.toLowerCase().includes(query);
        const matchesNotes = sale.notes?.toLowerCase().includes(query);
        const matchesItems = sale.items?.some((item) =>
          item.productName.toLowerCase().includes(query)
        );
        return matchesId || matchesNotes || matchesItems;
      }

      return true;
    });
  }, [transactions, filterMethod, searchQuery]);

  const formatSaleTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de Transacciones"
      subtitle={`${formattedDate} • ${transactions.length} venta${transactions.length === 1 ? '' : 's'}`}
      maxWidth="720px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* ========================================================================= */}
        {/* Resumen Superior & Tarjetas de Métrica                                    */}
        {/* ========================================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}
        >
          <div
            style={{
              backgroundColor: '#f8f1fd',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid rgba(207, 195, 207, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#7e747f',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              Total Recaudado
            </span>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#310344',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '-0.5px'
              }}
            >
              {formatCOP(totalAmount)}
            </span>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #ece6f1',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#7e747f',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              Ticket Promedio
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1d1a22',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '-0.5px'
              }}
            >
              {transactions.length > 0 ? formatCOP(Math.round(totalAmount / transactions.length)) : '$ 0'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Filtros por Método de Pago y Búsqueda                                     */}
        {/* ========================================================================= */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Pestañas de Filtro */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f2ecf7',
              borderRadius: '9999px',
              padding: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => setFilterMethod('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: filterMethod === 'all' ? '#310344' : 'transparent',
                color: filterMethod === 'all' ? '#ffffff' : '#4d444e',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Todas ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMethod('cash')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: filterMethod === 'cash' ? '#310344' : 'transparent',
                color: filterMethod === 'cash' ? '#ffffff' : '#4d444e',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Banknote size={13} />
              <span>Efectivo ({cashCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMethod('transfer')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: filterMethod === 'transfer' ? '#310344' : 'transparent',
                color: filterMethod === 'transfer' ? '#ffffff' : '#4d444e',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Smartphone size={13} />
              <span>Transf. ({transferCount})</span>
            </button>
          </div>

          {/* Acciones de expandir/contraer */}
          {transactions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={expandAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7a4c8c',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Expandir todo
              </button>
              <span style={{ color: '#cfc3cf' }}>•</span>
              <button
                type="button"
                onClick={collapseAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7a4c8c',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Contraer todo
              </button>
            </div>
          )}
        </div>

        {/* Buscador de tickets o productos */}
        {transactions.length > 3 && (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search
              size={16}
              color="#7e747f"
              style={{ position: 'absolute', left: '16px', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Buscar por producto, ticket # o nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '21px',
                border: '1px solid #e6e0eb',
                padding: '0 16px 0 42px',
                fontSize: '13px',
                color: '#1d1a22',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* Listado de Transacciones                                                 */}
        {/* ========================================================================= */}
        <div
          style={{
            maxHeight: '480px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '6px',
            paddingBottom: '8px'
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#7e747f' }}>
              Cargando historial de transacciones...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                backgroundColor: '#f8f1fd',
                borderRadius: '24px',
                color: '#4d444e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Receipt size={40} color="#7a4c8c" style={{ opacity: 0.6, marginBottom: '4px' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1d1a22' }}>
                No hay transacciones registradas
              </div>
              <div style={{ fontSize: '13px', color: '#7e747f', maxWidth: '340px' }}>
                {searchQuery
                  ? 'No se encontraron ventas que coincidan con la búsqueda.'
                  : 'No se realizaron ventas para la fecha y filtro seleccionados.'}
              </div>
            </div>
          ) : (
            filteredTransactions.map((sale) => {
              const isExpanded = expandedSaleIds.has(sale.id);
              const isCash = sale.paymentMethod === 'cash';
              const itemsCount = sale.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
              const shortId = sale.id.startsWith('sale-') ? sale.id.slice(5, 13) : sale.id.slice(-6);

              return (
                <div
                  key={sale.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #ece6f1',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: '0 2px 6px rgba(49, 3, 68, 0.03)',
                    flexShrink: 0
                  }}
                >
                  {/* Encabezado del Ticket / Clickeable para desplegar */}
                  <div
                    onClick={() => toggleExpand(sale.id)}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      gap: '12px',
                      backgroundColor: isExpanded ? '#faf7fc' : '#ffffff'
                    }}
                  >
                    {/* Izquierda: Hora, Ticket # y Badge de Pago */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#4d444e',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                      >
                        <Clock size={15} color="#7a4c8c" />
                        <span>{formatSaleTime(sale.saleDate)}</span>
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#7e747f',
                          backgroundColor: '#f2ecf7',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontFamily: 'monospace'
                        }}
                      >
                        #{shortId}
                      </span>

                      {/* Badge Método de Pago */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          backgroundColor: isCash ? '#eef7ee' : '#f0ebff',
                          color: isCash ? '#1e7e34' : '#5b21b6'
                        }}
                      >
                        {isCash ? <Banknote size={12} /> : <Smartphone size={12} />}
                        <span>{isCash ? 'Efectivo' : 'Transferencia'}</span>
                      </span>
                    </div>

                    {/* Derecha: Monto Total y Botón Acordeón */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '17px',
                            fontWeight: 700,
                            color: '#1d1a22',
                            fontFamily: 'var(--font-sans)'
                          }}
                        >
                          {formatCOP(sale.totalAmount)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7e747f' }}>
                          {itemsCount} ítem{itemsCount === 1 ? '' : 's'}
                        </div>
                      </div>

                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#f2ecf7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#310344'
                        }}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Detalle Desplegable: Productos y Datos Financieros */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '16px 20px 24px 20px',
                        borderTop: '1px solid #f2ecf7',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}
                    >
                      {/* Lista de Productos del Ticket */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          fontSize: '13px'
                        }}
                      >
                        {sale.items && sale.items.length > 0 ? (
                          sale.items.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                backgroundColor: '#fcfbfe',
                                border: '1px solid #f2ecf7'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <span
                                  style={{
                                    backgroundColor: '#f2ecf7',
                                    color: '#310344',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    padding: '2px 7px',
                                    borderRadius: '6px'
                                  }}
                                >
                                  {item.quantity}x
                                </span>
                                <span
                                  style={{
                                    color: '#1d1a22',
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {item.productName}
                                </span>
                                <span style={{ color: '#7e747f', fontSize: '11.5px' }}>
                                  (${formatNumberWithDots(item.unitPrice)})
                                </span>
                              </div>

                              <span
                                style={{
                                  fontWeight: 600,
                                  color: '#1d1a22',
                                  fontFamily: 'var(--font-sans)'
                                }}
                              >
                                {formatCOP(item.subtotal)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: '#7e747f', fontSize: '12px', fontStyle: 'italic' }}>
                            Sin detalle desglosado de ítems.
                          </div>
                        )}
                      </div>

                      {/* Desglose de Caja: Efectivo Recibido y Cambio */}
                      {isCash && sale.amountReceived > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            borderTop: '1px dashed #e6e0eb',
                            fontSize: '12px',
                            color: '#4d444e'
                          }}
                        >
                          <div>
                            <span>Recibido: </span>
                            <strong style={{ color: '#1d1a22' }}>{formatCOP(sale.amountReceived)}</strong>
                          </div>
                          {sale.changeGiven > 0 && (
                            <div>
                              <span>Cambio devuelto: </span>
                              <strong style={{ color: '#1e7e34' }}>{formatCOP(sale.changeGiven)}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notas de la Venta */}
                      {sale.notes && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#6d5773',
                            backgroundColor: '#f8f1fd',
                            padding: '8px 12px',
                            borderRadius: '10px'
                          }}
                        >
                          <FileText size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>Nota: {sale.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer con botón cerrar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '9999px',
              backgroundColor: '#310344',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(49, 3, 68, 0.2)'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
