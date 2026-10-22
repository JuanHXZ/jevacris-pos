import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  Plus,
  Download,
  Wallet,
  Banknote,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  MessageCircle,
  Eye,
  HandCoins,
  User,
  X
} from 'lucide-react';
import { db } from '../../db';
import { debtsRepository } from '../../repositories/debtsRepository';
import { formatCOP } from '../../utils/currency';
import { formatLocalDateTime } from '../../utils/date';
import { exportDebtsPortfolioToExcel } from '../../utils/reportExporters';
import { RegisterPaymentModal } from './components/RegisterPaymentModal';
import { DebtDetailModal } from './components/DebtDetailModal';
import { NewDebtModal } from './components/NewDebtModal';
import { CashSessionModal } from '../cash/components/CashSessionModal';
import type { DebtWithDetails, DebtsKpiSummary, DebtorQuickFilter } from '../../types';

export type DebtFilterTab = 'all' | 'pending' | 'partial' | 'overdue' | 'paid';
export type DebtSortOption = 'recent' | 'due_soon' | 'highest_balance' | 'alphabetical';

interface DebtsViewProps {
  onGoToCashShifts?: () => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({ onGoToCashShifts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<DebtFilterTab>('all');
  const [selectedDebtorKey, setSelectedDebtorKey] = useState<string>('all');
  const [sortBy, setSortBy] = useState<DebtSortOption>('recent');

  const [debts, setDebts] = useState<DebtWithDetails[]>([]);
  const [kpis, setKpis] = useState<DebtsKpiSummary>({
    totalReceivable: 0,
    activeCount: 0,
    collectedThisMonth: 0,
    settledThisMonthCount: 0,
    overdueCount: 0,
    upcomingDueCount: 0,
    recoveryRate: 100
  });
  const [debtorChips, setDebtorChips] = useState<DebtorQuickFilter[]>([]);

  // Modales
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtWithDetails | null>(null);
  const [selectedDebtForDetail, setSelectedDebtForDetail] = useState<DebtWithDetails | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle: string } | null>(null);

  // Suscripción reactiva a cambios en IndexedDB
  const debtsCount = useLiveQuery(() => db.debts.count());
  const paymentsCount = useLiveQuery(() => db.debtPayments.count());
  const debtItemsCount = useLiveQuery(() => db.debtItems.count());

  const loadDebtsPortfolio = async () => {
    const [allDebts, kpiSummary, distinctDebtors] = await Promise.all([
      debtsRepository.getAllWithDetails(),
      debtsRepository.getKpiSummary(),
      debtsRepository.getDistinctDebtors()
    ]);
    setDebts(allDebts);
    setKpis(kpiSummary);
    setDebtorChips(distinctDebtors);

    // Actualizar modal de detalle si está abierto
    if (selectedDebtForDetail) {
      const updated = allDebts.find((d) => d.id === selectedDebtForDetail.id) || null;
      setSelectedDebtForDetail(updated);
    }
  };

  useEffect(() => {
    loadDebtsPortfolio();
  }, [debtsCount, paymentsCount, debtItemsCount]);

  const showToast = (title: string, subtitle: string) => {
    setToastMessage({ title, subtitle });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Filtrado y ordenamiento de tickets de fiado
  const filteredDebts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = debts.filter((debt) => {
      // Filtro por persona (chip rápido)
      if (selectedDebtorKey !== 'all') {
        const key = debt.debtorName.trim().toLowerCase();
        if (key !== selectedDebtorKey) return false;
      }

      // Filtro por pestaña de estado
      if (activeFilter === 'pending') {
        if (debt.status !== 'pending' || debt.isOverdue) return false;
      } else if (activeFilter === 'partial') {
        if (debt.status !== 'partial') return false;
      } else if (activeFilter === 'overdue') {
        if (!debt.isOverdue || debt.status === 'paid') return false;
      } else if (activeFilter === 'paid') {
        if (debt.status !== 'paid') return false;
      }

      // Filtro de búsqueda por nombre, teléfono, código o productos
      if (q) {
        const matchesName = debt.debtorName.toLowerCase().includes(q);
        const matchesPhone = (debt.debtorPhone || '').toLowerCase().includes(q);
        const matchesCode = debt.folio.toLowerCase().includes(q);
        const matchesProduct = debt.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesCode && !matchesProduct) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'due_soon') {
        if (a.status === 'paid' && b.status !== 'paid') return 1;
        if (a.status !== 'paid' && b.status === 'paid') return -1;
        const dueA = a.dueDate || '9999-12-31';
        const dueB = b.dueDate || '9999-12-31';
        return dueA.localeCompare(dueB);
      }
      if (sortBy === 'highest_balance') {
        return b.remainingAmount - a.remainingAmount;
      }
      if (sortBy === 'alphabetical') {
        return a.debtorName.localeCompare(b.debtorName, 'es-CO');
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [debts, searchTerm, activeFilter, selectedDebtorKey, sortBy]);

  // Contadores para las pestañas y métricas derivadas
  const tabCounts = useMemo(() => {
    return {
      all: debts.length,
      pending: debts.filter((d) => d.status === 'pending' && !d.isOverdue).length,
      partial: debts.filter((d) => d.status === 'partial').length,
      overdue: debts.filter((d) => d.isOverdue && d.status !== 'paid').length,
      paid: debts.filter((d) => d.status === 'paid').length
    };
  }, [debts]);

  const activeDebtorsCount = useMemo(
    () => debtorChips.filter((c) => c.activeTicketsCount > 0).length,
    [debtorChips]
  );

  const overdueOrUpcomingAmount = useMemo(
    () =>
      debts
        .filter(
          (d) =>
            d.status !== 'paid' &&
            (d.isOverdue || (d.daysUntilDue !== null && d.daysUntilDue >= 0 && d.daysUntilDue <= 3))
        )
        .reduce((sum, d) => sum + d.remainingAmount, 0),
    [debts]
  );

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatShortDate = (isoOrDateStr: string) => {
    const d = new Date(isoOrDateStr.includes('T') ? isoOrDateStr : `${isoOrDateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoOrDateStr;
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const buildWhatsAppUrl = (debt: DebtWithDetails) => {
    if (!debt.debtorPhone) return null;
    const cleanDigits = debt.debtorPhone.replace(/\D/g, '');
    if (!cleanDigits) return null;
    const fullPhone = cleanDigits.startsWith('57') ? cleanDigits : `57${cleanDigits}`;
    const itemsSummary = debt.items
      .slice(0, 3)
      .map((i) => `${i.quantity} ${i.productName}`)
      .join(', ');
    const message = `Hola ${debt.debtorName}, te escribimos de *JEVACRIS* para recordarte amablemente tu saldo pendiente de *${formatCOP(
      debt.remainingAmount
    )}* correspondiente al fiado *${debt.folio}* (${itemsSummary}). ¡Muchas gracias!`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        maxWidth: '1540px',
        margin: '0 auto',
        position: 'relative'
      }}
    >
      {/* Toast de Confirmación */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '32px',
            zIndex: 1200,
            padding: '18px 24px',
            backgroundColor: '#010001',
            color: '#ffffff',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0px 16px 32px rgba(49, 3, 68, 0.25)',
            border: '1px solid #310344'
          }}
        >
          <CheckCircle2 size={28} color="#f6d9fb" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#f6d9fb' }}>{toastMessage.title}</div>
            <div style={{ fontSize: '13px', color: '#ded8e3', marginTop: '2px' }}>{toastMessage.subtitle}</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. Header Editorial (Stitch Screen)                                       */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: '#f8d8ff',
                color: '#27142d',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#310344'
                }}
              />
              Cartera & Cuentas por Cobrar
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#4d444e' }}>
              Actualizado hoy • Corte de Caja Activo
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '38px',
              fontWeight: 800,
              color: '#1d1a22',
              letterSpacing: '-1px',
              lineHeight: 1.1,
              fontFamily: 'var(--font-sans)'
            }}
          >
            Préstamos y Fiados
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '14.5px',
              color: '#4d444e',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Control detallado de mercancía entregada a crédito, abonos parciales y fechas de pago.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              exportDebtsPortfolioToExcel(debts, kpis);
              showToast('Cartera Exportada', 'El archivo Excel (.xlsx) de fiados se descargó correctamente.');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '9999px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(207, 195, 207, 0.6)',
              color: '#1d1a22',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(49, 3, 68, 0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={16} color="#310344" />
            <span>Exportar Cartera</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewDebtOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '13px 24px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #310344 0%, #562b68 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(49, 3, 68, 0.22)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Registrar Nuevo Préstamo</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Tarjetas de Resumen KPI (4 Tarjetas de Stitch)                         */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px'
        }}
      >
        {/* KPI 1: Total por Cobrar */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 12px 32px -4px rgba(49, 3, 68, 0.06)',
            border: '1px solid rgba(207, 195, 207, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#4d444e'
              }}
            >
              Total por Cobrar
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '14px',
                backgroundColor: '#f8f1fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#310344'
              }}
            >
              <Wallet size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 800,
              color: '#1d1a22',
              letterSpacing: '-0.8px',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {formatCOP(kpis.totalReceivable)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '8px',
                backgroundColor: '#f8d8ff',
                color: '#310344',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              {kpis.activeCount} préstamos activos
            </span>
            <span style={{ fontSize: '11.5px', color: '#4d444e' }}>
              de {activeDebtorsCount} {activeDebtorsCount === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>
        </div>

        {/* KPI 2: Cobrado este Mes */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 12px 32px -4px rgba(49, 3, 68, 0.06)',
            border: '1px solid rgba(207, 195, 207, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#4d444e'
              }}
            >
              Cobrado este Mes
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '14px',
                backgroundColor: '#eef7ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e7e34'
              }}
            >
              <Banknote size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 800,
              color: '#1d1a22',
              letterSpacing: '-0.8px',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {formatCOP(kpis.collectedThisMonth)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '8px',
                backgroundColor: '#eef7ee',
                color: '#1e7e34',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              {kpis.settledThisMonthCount} saldados
            </span>
            <span style={{ fontSize: '11.5px', color: '#4d444e' }}>ingresados a ventas</span>
          </div>
        </div>

        {/* KPI 3: Vencidos / Próximos */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 12px 32px -4px rgba(49, 3, 68, 0.06)',
            border: '1px solid rgba(207, 195, 207, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#4d444e'
              }}
            >
              Vencidos / Próximos
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '14px',
                backgroundColor: '#ffdad6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ba1a1a'
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 800,
              color: kpis.overdueCount > 0 ? '#ba1a1a' : '#1d1a22',
              letterSpacing: '-0.8px',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {formatCOP(overdueOrUpcomingAmount)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '8px',
                backgroundColor: kpis.overdueCount > 0 ? '#ffdad6' : '#f2ecf7',
                color: kpis.overdueCount > 0 ? '#93000a' : '#4d444e',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              {kpis.overdueCount} {kpis.overdueCount === 1 ? 'vencido' : 'vencidos'}
            </span>
            <span style={{ fontSize: '11.5px', color: '#4d444e' }}>
              • {kpis.upcomingDueCount} por vencer (72h)
            </span>
          </div>
        </div>

        {/* KPI 4: Tasa de Recuperación */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 12px 32px -4px rgba(49, 3, 68, 0.06)',
            border: '1px solid rgba(207, 195, 207, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#4d444e'
              }}
            >
              Tasa de Recuperación
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '14px',
                backgroundColor: '#f6d9fb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#27142d'
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 800,
              color: '#1d1a22',
              letterSpacing: '-0.8px',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {kpis.recoveryRate}%
          </div>
          <div style={{ marginTop: '14px' }}>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#f2ecf7',
                borderRadius: '9999px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, kpis.recoveryRate)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #310344, #6d5773)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Barra de Búsqueda, Pestañas de Estado y Filtro por Persona             */}
      {/* ========================================================================= */}
      <div
        style={{
          backgroundColor: '#f8f1fd',
          borderRadius: '24px',
          padding: '16px 20px',
          border: '1px solid rgba(207, 195, 207, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Buscador */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
            <Search
              size={16}
              color="#7e747f"
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, teléfono o producto fiado..."
              style={{
                width: '100%',
                height: '42px',
                padding: '0 36px 0 42px',
                borderRadius: '9999px',
                border: '1px solid rgba(207, 195, 207, 0.5)',
                backgroundColor: '#ffffff',
                fontSize: '13.5px',
                color: '#1d1a22',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: '#7e747f',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Pestañas de Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all' as DebtFilterTab, label: `Todos (${tabCounts.all})` },
              { id: 'pending' as DebtFilterTab, label: `Pendientes (${tabCounts.pending})` },
              { id: 'partial' as DebtFilterTab, label: `Abonados / Parcial (${tabCounts.partial})` },
              { id: 'overdue' as DebtFilterTab, label: `Vencidos (${tabCounts.overdue})`, isDanger: true },
              { id: 'paid' as DebtFilterTab, label: `Saldados (${tabCounts.paid})` }
            ].map((tab) => {
              const isSelected = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    border: tab.isDanger && !isSelected ? '1px solid rgba(186, 26, 26, 0.25)' : 'none',
                    backgroundColor: isSelected
                      ? '#310344'
                      : tab.isDanger
                      ? 'rgba(255, 218, 214, 0.6)'
                      : '#ffffff',
                    color: isSelected ? '#ffffff' : tab.isDanger ? '#93000a' : '#4d444e',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 10px rgba(49, 3, 68, 0.15)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Ordenar por */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#4d444e',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as DebtSortOption)}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '9999px',
                border: '1px solid rgba(207, 195, 207, 0.5)',
                backgroundColor: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#1d1a22',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="recent">Más recientes</option>
              <option value="due_soon">Próximos a vencer</option>
              <option value="highest_balance">Mayor saldo pendiente</option>
              <option value="alphabetical">Orden alfabético</option>
            </select>
          </div>
        </div>

        {/* Filtro Rápido por Persona Fiada */}
        {debtorChips.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingTop: '10px',
              borderTop: '1px solid rgba(207, 195, 207, 0.35)'
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#310344',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                marginRight: '4px'
              }}
            >
              <User size={13} />
              <span>Persona:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedDebtorKey('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '9999px',
                border: selectedDebtorKey === 'all' ? '1.5px solid #310344' : '1px solid #cfc3cf',
                backgroundColor: selectedDebtorKey === 'all' ? '#f6d9fb' : '#ffffff',
                color: selectedDebtorKey === 'all' ? '#27142d' : '#4d444e',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Todas las personas
            </button>

            {debtorChips.map((chip) => {
              const key = chip.debtorName.trim().toLowerCase();
              const isSelected = selectedDebtorKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDebtorKey(isSelected ? 'all' : key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    border: isSelected ? '1.5px solid #310344' : '1px solid rgba(207, 195, 207, 0.6)',
                    backgroundColor: isSelected ? '#310344' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#1d1a22',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{chip.debtorName}</span>
                  {chip.totalPendingAmount > 0 && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f2ecf7',
                        color: isSelected ? '#f8d8ff' : '#310344',
                        fontSize: '10.5px',
                        fontWeight: 700
                      }}
                    >
                      {formatCOP(chip.totalPendingAmount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. Grilla de Tarjetas de Tickets de Fiado (#CR-XXXX)                      */}
      {/* ========================================================================= */}
      {filteredDebts.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '32px',
            padding: '56px 24px',
            textAlign: 'center',
            border: '1px solid rgba(207, 195, 207, 0.3)',
            boxShadow: '0 12px 32px -4px rgba(49, 3, 68, 0.05)'
          }}
        >
          <HandCoins size={48} color="#7a4c8c" style={{ marginBottom: '12px', opacity: 0.7 }} />
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1d1a22' }}>
            {debts.length === 0
              ? 'Aún no hay préstamos ni fiados registrados'
              : 'No se encontraron fiados con los filtros actuales'}
          </h3>
          <p style={{ margin: '6px auto 20px', fontSize: '14px', color: '#4d444e', maxWidth: '480px' }}>
            {debts.length === 0
              ? 'Cuando fíes productos físicos o recargas desde el Punto de Venta o desde este módulo, aparecerán aquí con su historial detallado.'
              : 'Prueba cambiando la pestaña de estado, limpiando la búsqueda o seleccionando otra persona.'}
          </p>
          {debts.length === 0 ? (
            <button
              type="button"
              onClick={() => setIsNewDebtOpen(true)}
              style={{
                padding: '12px 24px',
                borderRadius: '9999px',
                backgroundColor: '#310344',
                color: '#ffffff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Registrar Primer Fiado
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSelectedDebtorKey('all');
                setSearchTerm('');
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '9999px',
                backgroundColor: '#f2ecf7',
                color: '#310344',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Ver todos los tickets
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '24px'
          }}
        >
          {filteredDebts.map((debt) => {
            const isPaid = debt.status === 'paid';
            const isOverdue = debt.isOverdue && !isPaid;
            const isPartial = debt.status === 'partial';
            const paidPercent =
              debt.totalAmount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100)) : 0;
            const lastPayment = debt.payments.length > 0 ? debt.payments[0] : null;
            const waUrl = buildWhatsAppUrl(debt);

            const badgeConfig = isPaid
              ? { label: 'Saldado', bg: '#eef7ee', color: '#1e7e34', dot: '#28a745' }
              : isOverdue
              ? { label: 'Vencido', bg: '#ffdad6', color: '#93000a', dot: '#ba1a1a' }
              : isPartial
              ? { label: 'Parcial', bg: '#f6d9fb', color: '#27142d', dot: '#6d5773' }
              : { label: 'Pendiente', bg: '#fff4e5', color: '#995c00', dot: '#d97706' };

            return (
              <div
                key={debt.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '28px',
                  padding: '24px',
                  boxShadow: '0 12px 32px -4px rgba(49, 3, 68, 0.06)',
                  border: isOverdue
                    ? '2px solid rgba(186, 26, 26, 0.35)'
                    : '1px solid rgba(207, 195, 207, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isPaid ? 0.9 : 1,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {isOverdue && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '5px',
                      height: '100%',
                      backgroundColor: '#ba1a1a'
                    }}
                  />
                )}

                <div>
                  {/* Cabecera del Cliente y Estado */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '16px',
                          backgroundColor: isPaid ? '#eef7ee' : isOverdue ? '#ffdad6' : '#f8d8ff',
                          color: isPaid ? '#1e7e34' : isOverdue ? '#93000a' : '#310344',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 800,
                          flexShrink: 0
                        }}
                      >
                        {getInitials(debt.debtorName)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <h3
                          onClick={() => setSelectedDebtorKey(debt.debtorName.trim().toLowerCase())}
                          title="Filtrar por esta persona"
                          style={{
                            margin: 0,
                            fontSize: '16.5px',
                            fontWeight: 700,
                            color: '#1d1a22',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {debt.debtorName}
                        </h3>
                        <p
                          style={{
                            margin: '3px 0 0 0',
                            fontSize: '12px',
                            color: '#4d444e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Phone size={12} color="#7a4c8c" />
                          <span>{debt.debtorPhone || 'Sin teléfono'}</span>
                          {debt.notes && (
                            <span
                              style={{
                                maxWidth: '130px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              • {debt.notes}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 11px',
                        borderRadius: '9999px',
                        backgroundColor: badgeConfig.bg,
                        color: badgeConfig.color,
                        fontSize: '10.5px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        flexShrink: 0
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: badgeConfig.dot
                        }}
                      />
                      {badgeConfig.label}
                    </span>
                  </div>

                  {/* Metadatos del Ticket: #CR-XXXX, Fecha Entrega y Fecha Límite */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '16px',
                      backgroundColor: '#f8f1fd',
                      border: '1px solid rgba(207, 195, 207, 0.25)',
                      marginBottom: '14px'
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          color: '#4d444e',
                          textTransform: 'uppercase'
                        }}
                      >
                        Ticket Fiado
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#310344' }}>{debt.folio}</span>
                    </div>

                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          color: '#4d444e',
                          textTransform: 'uppercase'
                        }}
                      >
                        Fecha Entrega
                      </span>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#1d1a22' }}>
                        {formatShortDate(debt.createdAt)}
                      </span>
                    </div>

                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          color: isOverdue ? '#ba1a1a' : '#4d444e',
                          textTransform: 'uppercase'
                        }}
                      >
                        {isPaid ? 'Liquidado' : 'Vencimiento'}
                      </span>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: isPaid ? '#1e7e34' : isOverdue ? '#ba1a1a' : '#1d1a22'
                        }}
                      >
                        {isPaid && debt.paidAt
                          ? formatShortDate(debt.paidAt)
                          : debt.dueDate
                          ? debt.daysUntilDue !== null && debt.daysUntilDue < 0
                            ? `${debt.dueDate} (${Math.abs(debt.daysUntilDue)}d venc.)`
                            : debt.daysUntilDue === 0
                            ? 'Hoy'
                            : debt.dueDate
                          : 'Sin fecha'}
                      </span>
                    </div>
                  </div>

                  {/* Desglose de Productos Fiados */}
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: '#4d444e',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}
                      >
                        Productos Fiados ({debt.items.length})
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: isPaid ? '#1e7e34' : '#6d5773'
                        }}
                      >
                        {isPaid ? '✓ Ingresado a ventas' : 'Stock descontado'}
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#f8f1fd',
                        borderRadius: '16px',
                        padding: '10px 12px',
                        border: '1px solid rgba(207, 195, 207, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        maxHeight: '112px',
                        overflowY: 'auto'
                      }}
                    >
                      {debt.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '6px',
                                backgroundColor: '#ffffff',
                                fontWeight: 700,
                                color: '#310344',
                                fontSize: '11px',
                                border: '1px solid rgba(207, 195, 207, 0.35)',
                                flexShrink: 0
                              }}
                            >
                              {item.quantity} {item.unit}
                            </span>
                            <span
                              style={{
                                color: '#1d1a22',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {item.productName}
                            </span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#1d1a22',
                              fontVariantNumeric: 'tabular-nums',
                              flexShrink: 0
                            }}
                          >
                            {formatCOP(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sección Financiera Inferior y Botones */}
                <div style={{ borderTop: '1px solid rgba(207, 195, 207, 0.3)', paddingTop: '14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#4d444e',
                          textTransform: 'uppercase'
                        }}
                      >
                        Valor Total: {formatCOP(debt.totalAmount)}
                      </span>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: debt.paidAmount > 0 ? '#1e7e34' : '#4d444e'
                        }}
                      >
                        Abonado: {formatCOP(debt.paidAmount)} ({paidPercent}%)
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: isOverdue ? '#ba1a1a' : '#4d444e',
                          textTransform: 'uppercase'
                        }}
                      >
                        Saldo Restante
                      </span>
                      <span
                        style={{
                          fontSize: '21px',
                          fontWeight: 800,
                          color: isPaid ? '#1e7e34' : isOverdue ? '#ba1a1a' : '#310344',
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {formatCOP(debt.remainingAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#f2ecf7',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      marginBottom: '12px'
                    }}
                  >
                    <div
                      style={{
                        width: `${paidPercent}%`,
                        height: '100%',
                        backgroundColor: isPaid ? '#28a745' : isOverdue ? '#ba1a1a' : '#310344',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  {/* Historial de último abono o estado */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#4d444e',
                      marginBottom: '14px'
                    }}
                  >
                    {lastPayment ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} color="#1e7e34" />
                        Último abono: <strong>{formatCOP(lastPayment.amount)}</strong> (
                        {formatLocalDateTime(lastPayment.paidAt)})
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={12} color="#7a4c8c" />
                        Sin abonos registrados aún
                      </span>
                    )}
                  </div>

                  {/* Botones de Acción */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => setSelectedDebtForPayment(debt)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '9999px',
                          border: 'none',
                          backgroundColor: '#310344',
                          color: '#ffffff',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(49, 3, 68, 0.18)'
                        }}
                      >
                        <HandCoins size={15} />
                        <span>Registrar Abono</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedDebtForDetail(debt)}
                      style={{
                        flex: isPaid ? 1 : undefined,
                        padding: '10px 14px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(207, 195, 207, 0.6)',
                        backgroundColor: '#f8f1fd',
                        color: '#1d1a22',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      title="Ver desglose completo e historial de abonos"
                    >
                      <Eye size={14} color="#310344" />
                      <span>{isPaid ? 'Ver Recibo y Abonos' : 'Detalles'}</span>
                    </button>

                    {!isPaid && waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: '#eef7ee',
                          border: '1px solid rgba(30, 126, 52, 0.25)',
                          color: '#1e7e34',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          flexShrink: 0
                        }}
                        title={`Enviar recordatorio por WhatsApp a ${debt.debtorName}`}
                      >
                        <MessageCircle size={16} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modales del Módulo de Préstamos y Fiados                                  */}
      {/* ========================================================================= */}
      <NewDebtModal
        isOpen={isNewDebtOpen}
        onClose={() => setIsNewDebtOpen(false)}
        onRequireOpenSession={() => setSessionModalOpen(true)}
        onSuccess={(createdDebt) => {
          showToast(
            `¡Fiado ${createdDebt.folio} Registrado!`,
            `Cliente: ${createdDebt.debtorName} • Valor: ${formatCOP(createdDebt.totalAmount)} (Stock descontado)`
          );
        }}
      />

      <RegisterPaymentModal
        isOpen={Boolean(selectedDebtForPayment)}
        debt={selectedDebtForPayment}
        onClose={() => setSelectedDebtForPayment(null)}
        onRequireOpenSession={() => setSessionModalOpen(true)}
        onSuccess={({ amount, remaining, debtorName, folio }) => {
          setSelectedDebtForPayment(null);
          showToast(
            remaining === 0 ? `¡Fiado ${folio} Saldado al 100%!` : `¡Abono a ${folio} Registrado!`,
            `Se ingresaron ${formatCOP(amount)} de ${debtorName} a las ventas y caja del día.`
          );
        }}
      />

      <DebtDetailModal
        isOpen={Boolean(selectedDebtForDetail)}
        debt={selectedDebtForDetail}
        onClose={() => setSelectedDebtForDetail(null)}
        onOpenPayment={(debt) => {
          setSelectedDebtForDetail(null);
          setSelectedDebtForPayment(debt);
        }}
      />

      <CashSessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        onNavigateToCashShifts={onGoToCashShifts}
      />
    </div>
  );
};
