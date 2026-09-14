import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  History,
  Download,
  Search,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { db } from '../../../db';
import { formatCOP } from '../../../utils/currency';
import type { CashSession, Sale, Expense } from '../../../types';

interface CashHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EnrichedSession {
  session: CashSession;
  cashSales: number;
  transferSales: number;
  totalSales: number;
  expensesTotal: number;
  difference: number;
  statusType: 'balanced' | 'surplus' | 'shortage';
  shiftName: string;
  formattedDate: string;
}

export const CashHistoryModal: React.FC<CashHistoryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'balanced' | 'difference'>('all');
  const [timeRange, setTimeRange] = useState<'30d' | '7d' | 'all'>('30d');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Sesión seleccionada para inspección del Arqueo Z
  const [selectedZSession, setSelectedZSession] = useState<EnrichedSession | null>(null);

  // Consultar todas las sesiones cerradas desde IndexedDB
  const closedSessions = useLiveQuery(
    async () => {
      const list = await db.cashSessions.filter((s) => s.status === 'closed').toArray();
      return list.sort((a, b) => (b.closedAt || b.openedAt).localeCompare(a.closedAt || a.openedAt));
    },
    []
  ) || [];

  // Enriquecer las sesiones con ventas y gastos
  const [enrichedSessions, setEnrichedSessions] = useState<EnrichedSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || closedSessions.length === 0) {
      setEnrichedSessions([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const enrichedList: EnrichedSession[] = await Promise.all(
          closedSessions.map(async (sess) => {
            const sales: Sale[] = await db.sales.where('cashSessionId').equals(sess.id).toArray();
            const expenses: Expense[] = await db.expenses.where('cashSessionId').equals(sess.id).toArray();

            const cashSales = sales
              .filter((s) => s.paymentMethod === 'cash')
              .reduce((sum, s) => sum + s.totalAmount, 0);

            const transferSales = sales
              .filter((s) => s.paymentMethod === 'transfer')
              .reduce((sum, s) => sum + s.totalAmount, 0);

            const totalSales = cashSales + transferSales;
            const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

            const diff = sess.difference !== undefined
              ? sess.difference
              : (sess.closingCashCounted || 0) - (sess.openingCash + cashSales - expensesTotal);

            let statusType: 'balanced' | 'surplus' | 'shortage' = 'balanced';
            if (diff > 0) statusType = 'surplus';
            else if (diff < 0) statusType = 'shortage';

            const closeDate = new Date(sess.closedAt || sess.openedAt);
            const hour = closeDate.getHours();
            let shiftName = 'Turno Mañana';
            if (hour >= 13 && hour < 19) shiftName = 'Turno Tarde';
            else if (hour >= 19 || hour < 6) shiftName = 'Turno Noche';

            const formattedDate = closeDate.toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return {
              session: sess,
              cashSales,
              transferSales,
              totalSales,
              expensesTotal,
              difference: diff,
              statusType,
              shiftName,
              formattedDate
            };
          })
        );

        if (isMounted) {
          setEnrichedSessions(enrichedList);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error enriqueciendo historial de cajas:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, closedSessions.length]);

  // Filtrado reactivo
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    return enrichedSessions.filter((item) => {
      const sessDate = new Date(item.session.closedAt || item.session.openedAt);

      // Filtro de tiempo
      if (timeRange === '7d' && sessDate < sevenDaysAgo) return false;
      if (timeRange === '30d' && sessDate < thirtyDaysAgo) return false;

      // Filtro de estado
      if (filterTab === 'balanced' && item.statusType !== 'balanced') return false;
      if (filterTab === 'difference' && item.statusType === 'balanced') return false;

      // Filtro de búsqueda
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const folioMatch = item.session.id.toLowerCase().includes(query);
        const shiftMatch = item.shiftName.toLowerCase().includes(query);
        const notesMatch = (item.session.notes || '').toLowerCase().includes(query);
        const dateMatch = item.formattedDate.toLowerCase().includes(query);
        return folioMatch || shiftMatch || notesMatch || dateMatch;
      }

      return true;
    });
  }, [enrichedSessions, timeRange, filterTab, searchTerm]);

  // Contadores para píldoras
  const counts = useMemo(() => {
    const total = enrichedSessions.length;
    const balanced = enrichedSessions.filter((s) => s.statusType === 'balanced').length;
    const difference = total - balanced;
    const rate = total > 0 ? ((balanced / total) * 100).toFixed(1) : '100.0';
    return { total, balanced, difference, rate };
  }, [enrichedSessions]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / itemsPerPage));
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(start, start + itemsPerPage);
  }, [filteredSessions, currentPage]);

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTab, timeRange]);

  // Exportar a CSV
  const handleExportCSV = () => {
    if (enrichedSessions.length === 0) return;

    const headers = [
      'ID Sesion',
      'Turno',
      'Fecha Cierre',
      'Base Inicial',
      'Ventas Efectivo',
      'Ventas Nequi/Transferencia',
      'Ventas Totales',
      'Gastos Registrados',
      'Efectivo Calculado',
      'Efectivo Contado',
      'Diferencia',
      'Estado',
      'Notas'
    ];

    const rows = enrichedSessions.map((s) => [
      `"${s.session.id}"`,
      `"${s.shiftName}"`,
      `"${s.formattedDate}"`,
      s.session.openingCash,
      s.cashSales,
      s.transferSales,
      s.totalSales,
      s.expensesTotal,
      s.session.closingCashCalculated || 0,
      s.session.closingCashCounted || 0,
      s.difference,
      s.statusType === 'balanced' ? 'Cuadrado' : s.statusType === 'surplus' ? 'Sobrante' : 'Faltante',
      `"${(s.session.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Auditoria_Cierres_JEVACRIS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="1020px"
      preserveSidebar={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        {/* Cabecera Especializada de Auditoría */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #ede6f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            background: 'linear-gradient(90deg, rgba(248, 241, 253, 0.7) 0%, #ffffff 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: 'rgba(49, 3, 68, 0.08)',
                color: '#310344',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <History size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#1d1a22',
                    letterSpacing: '-0.5px'
                  }}
                >
                  Historial de Cierres de Caja
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: '#310344',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    letterSpacing: '0.05em'
                  }}
                >
                  Auditoría Z
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7a7082' }}>
                Consulta de turnos cerrados, arqueos físicos y conciliación de diferencias en JEVACRIS
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleExportCSV}
              disabled={enrichedSessions.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: '#ffffff',
                color: '#4d444e',
                border: '1px solid #ede6f2',
                cursor: enrichedSessions.length > 0 ? 'pointer' : 'default',
                boxShadow: '0 2px 6px rgba(49, 3, 68, 0.04)',
                transition: 'all 0.15s ease',
                opacity: enrichedSessions.length > 0 ? 1 : 0.5
              }}
              title="Exportar archivo de auditoría en formato CSV"
            >
              <Download size={15} />
              <span>Exportar Reporte</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros & Búsqueda */}
        <div
          style={{
            padding: '16px 32px',
            backgroundColor: 'rgba(248, 241, 253, 0.4)',
            borderBottom: '1px solid #ede6f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
            {/* Input de Búsqueda */}
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search
                size={16}
                color="#7a7082"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cajero, # folio o fecha..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ede6f2',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: '#1d1a22',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Píldoras de Filtro por Estado */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid #ede6f2',
                boxShadow: '0 1px 4px rgba(49, 3, 68, 0.03)'
              }}
            >
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterTab === 'all' ? '#310344' : 'transparent',
                  color: filterTab === 'all' ? '#ffffff' : '#7a7082',
                  transition: 'all 0.15s ease'
                }}
              >
                Todos ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('balanced')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterTab === 'balanced' ? '#310344' : 'transparent',
                  color: filterTab === 'balanced' ? '#ffffff' : '#7a7082',
                  transition: 'all 0.15s ease'
                }}
              >
                Cuadrados ({counts.balanced})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('difference')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterTab === 'difference' ? '#310344' : 'transparent',
                  color: filterTab === 'difference' ? '#ffffff' : '#b91c1c',
                  transition: 'all 0.15s ease'
                }}
              >
                Con Descuadre ({counts.difference})
              </button>
            </div>
          </div>

          {/* Filtro de Rango Temporal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#7a7082', fontWeight: 600 }}>Filtrar:</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                padding: '6px 12px',
                borderRadius: '12px',
                border: '1px solid #ede6f2',
                fontSize: '12px',
                fontWeight: 700,
                color: '#310344',
                boxShadow: '0 1px 4px rgba(49, 3, 68, 0.03)'
              }}
            >
              <Calendar size={14} color="#310344" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '30d' | '7d' | 'all')}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontWeight: 700,
                  color: '#310344',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="all">Todo el historial</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cuerpo / Lista de Cierres */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px' }}>
          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#7a7082', fontSize: '14px' }}>
              Cargando historial de auditoría...
            </div>
          ) : paginatedSessions.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: '#fbf9fc',
                borderRadius: '20px',
                border: '1px solid #ede6f2',
                margin: '16px 0'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#ede6f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: '#7a7082'
                }}
              >
                <History size={24} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#310344' }}>
                No se encontraron cierres
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#7a7082' }}>
                {searchTerm
                  ? 'No hay registros que coincidan con los términos de búsqueda.'
                  : 'Aún no se han completado cierres de caja en el período seleccionado.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paginatedSessions.map((item) => {
                const folio = item.session.id.slice(-4).toUpperCase();
                const isBalanced = item.statusType === 'balanced';
                const isSurplus = item.statusType === 'surplus';

                return (
                  <div
                    key={item.session.id}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '20px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #ede6f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      boxShadow: '0 2px 8px rgba(49, 3, 68, 0.02)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(248, 241, 253, 0.4)';
                      e.currentTarget.style.borderColor = '#e0d1eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#ede6f2';
                    }}
                  >
                    {/* Información Principal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          backgroundColor: isBalanced
                            ? 'rgba(16, 185, 129, 0.12)'
                            : isSurplus
                            ? 'rgba(245, 158, 11, 0.12)'
                            : 'rgba(239, 68, 68, 0.12)',
                          color: isBalanced ? '#059669' : isSurplus ? '#d97706' : '#dc2626'
                        }}
                      >
                        {isBalanced ? (
                          <CheckCircle2 size={22} />
                        ) : isSurplus ? (
                          <AlertTriangle size={22} />
                        ) : (
                          <XCircle size={22} />
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1d1a22' }}>
                            {item.shiftName} • #{folio}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 10px',
                              borderRadius: '9999px',
                              backgroundColor: isBalanced
                                ? 'rgba(16, 185, 129, 0.1)'
                                : isSurplus
                                ? '#fef3c7'
                                : '#fee2e2',
                              color: isBalanced
                                ? '#065f46'
                                : isSurplus
                                ? '#92400e'
                                : '#991b1b',
                              border: `1px solid ${
                                isBalanced
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : isSurplus
                                  ? '#fde68a'
                                  : '#fecaca'
                              }`
                            }}
                          >
                            {isBalanced
                              ? 'Cuadrado ($0 dif)'
                              : isSurplus
                              ? `Sobrante: +${formatCOP(item.difference)}`
                              : `Faltante: -${formatCOP(Math.abs(item.difference))}`}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '12px',
                            color: '#7a7082',
                            marginTop: '4px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} />
                            {item.formattedDate}
                          </span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={13} />
                            Cajero Principal (Terminal 01)
                          </span>
                          {item.session.notes && (
                            <>
                              <span>•</span>
                              <span style={{ fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                "{item.session.notes}"
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Totales Financieros & Acción */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '28px', textAlign: 'right' }}>
                      <div>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#7a7082',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          Ventas Totales
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#1d1a22' }}>
                          {formatCOP(item.totalSales)}
                        </span>
                      </div>

                      <div>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#7a7082',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          Efectivo en Gaveta
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#310344' }}>
                          {formatCOP(item.session.closingCashCounted || 0)}
                        </span>
                      </div>

                      <div>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#7a7082',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          Nequi / QR
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#4d444e' }}>
                          {formatCOP(item.transferSales)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedZSession(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: '#f8f1fd',
                          color: '#310344',
                          border: '1px solid #ede6f2',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#310344';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f1fd';
                          e.currentTarget.style.color = '#310344';
                        }}
                      >
                        <span>Ver Z</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie de Auditoría con Estadísticas y Paginación */}
        <div
          style={{
            padding: '16px 32px',
            backgroundColor: '#fbf9fc',
            borderTop: '1px solid #ede6f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#7a7082' }}>
            <span>
              Mostrando <strong>{paginatedSessions.length}</strong> de <strong>{filteredSessions.length}</strong> cierres auditados
            </span>
            <span style={{ color: '#cfc3cf' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065f46', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              {counts.rate}% Tasa de cuadre perfecto
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                color: '#4d444e',
                cursor: 'pointer',
                padding: '6px 12px'
              }}
            >
              Cerrar Ventana
            </button>

            {/* Controles de Paginación */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #ede6f2',
                  backgroundColor: '#ffffff',
                  color: '#4d444e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage > 1 ? 'pointer' : 'default',
                  opacity: currentPage > 1 ? 1 : 0.4
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #ede6f2',
                    backgroundColor: pageNum === currentPage ? '#310344' : '#ffffff',
                    color: pageNum === currentPage ? '#ffffff' : '#4d444e',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #ede6f2',
                  backgroundColor: '#ffffff',
                  color: '#4d444e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage < totalPages ? 'pointer' : 'default',
                  opacity: currentPage < totalPages ? 1 : 0.4
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Secundaria: Detalle Completo del Comprobante Z */}
      {selectedZSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            backgroundColor: 'rgba(49, 3, 68, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedZSession(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '32px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(49, 3, 68, 0.3)',
              border: '1px solid #ede6f2'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: '#f8f1fd',
                    color: '#310344',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1d1a22' }}>
                    Comprobante Arqueo Z
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#7a7082' }}>
                    Folio #{selectedZSession.session.id.slice(-4).toUpperCase()} • {selectedZSession.shiftName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedZSession(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7a7082',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2ecf7' }}>
                <span style={{ color: '#7a7082' }}>Fecha de Cierre:</span>
                <span style={{ fontWeight: 700 }}>{selectedZSession.formattedDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2ecf7' }}>
                <span style={{ color: '#7a7082' }}>Base Inicial (Apertura):</span>
                <span style={{ fontWeight: 700 }}>{formatCOP(selectedZSession.session.openingCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2ecf7' }}>
                <span style={{ color: '#7a7082' }}>Ventas en Efectivo:</span>
                <span style={{ fontWeight: 700 }}>{formatCOP(selectedZSession.cashSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2ecf7' }}>
                <span style={{ color: '#7a7082' }}>Ventas Nequi / Transferencia:</span>
                <span style={{ fontWeight: 700 }}>{formatCOP(selectedZSession.transferSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2ecf7' }}>
                <span style={{ color: '#7a7082' }}>Gastos Operativos Deducidos:</span>
                <span style={{ fontWeight: 700, color: selectedZSession.expensesTotal > 0 ? '#b91c1c' : '#1d1a22' }}>
                  {formatCOP(selectedZSession.expensesTotal)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2ecf7' }}>
                <span style={{ color: '#7a7082' }}>Efectivo Calculado Esperado:</span>
                <span style={{ fontWeight: 800, color: '#310344' }}>
                  {formatCOP(selectedZSession.session.closingCashCalculated || 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2ecf7' }}>
                <span style={{ color: '#7a7082' }}>Efectivo Físico Contado:</span>
                <span style={{ fontWeight: 800, color: '#310344' }}>
                  {formatCOP(selectedZSession.session.closingCashCounted || 0)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor:
                    selectedZSession.statusType === 'balanced'
                      ? '#f0fdf4'
                      : selectedZSession.statusType === 'surplus'
                      ? '#fefce8'
                      : '#fef2f2'
                }}
              >
                <span style={{ fontWeight: 800 }}>Diferencia Final:</span>
                <span
                  style={{
                    fontWeight: 800,
                    color:
                      selectedZSession.statusType === 'balanced'
                        ? '#15803d'
                        : selectedZSession.statusType === 'surplus'
                        ? '#854d0e'
                        : '#991b1b'
                  }}
                >
                  {selectedZSession.difference === 0
                    ? '$ 0 COP (Exacto)'
                    : `${selectedZSession.difference > 0 ? '+' : ''}${formatCOP(selectedZSession.difference)} COP`}
                </span>
              </div>
            </div>

            {selectedZSession.session.notes && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '14px',
                  backgroundColor: '#fbf9fc',
                  border: '1px solid #ede6f2',
                  fontSize: '12px',
                  color: '#4d444e',
                  marginBottom: '20px'
                }}
              >
                <strong>Observaciones:</strong> {selectedZSession.session.notes}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedZSession(null)}
              style={{
                width: '100%',
                backgroundColor: '#310344',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                padding: '12px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Cerrar Detalle Z
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
