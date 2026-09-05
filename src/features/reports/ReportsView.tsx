import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Package,
  Plus
} from 'lucide-react';
import { db } from '../../db';
import { reportsRepository, type WeeklyDayData } from '../../repositories/reportsRepository';
import { Modal } from '../../components/ui/Modal';
import { DayTransactionsModal } from './components/DayTransactionsModal';
import { formatCOP, formatNumberWithDots, parseCOPInput } from '../../utils/currency';
import type { DailySummary } from '../../types';

export const ReportsView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<DailySummary>({
    totalTransactions: 0,
    totalSales: 0,
    cashSales: 0,
    transferSales: 0,
    physicalProfit: 0,
    externalEarnings: 0,
    totalProfit: 0
  });
  const [yesterdaySales, setYesterdaySales] = useState<number>(0);
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([]);
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);

  // Formulario de Ganancia Externa
  const [platformName, setPlatformName] = useState('Recargas Móviles');
  const [earningAmountRaw, setEarningAmountRaw] = useState<string>('');
  const [earningNotes, setEarningNotes] = useState('');

  // Live queries desde IndexedDB
  const salesCount = useLiveQuery(() => db.sales.count());
  const earningsCount = useLiveQuery(() => db.externalEarnings.count());
  const lowStockProducts = useLiveQuery(() =>
    db.products
      .filter((p) => p.isActive !== false && p.type === 'physical' && p.currentStock <= p.minStockAlert)
      .toArray()
  ) || [];

  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  useEffect(() => {
    const loadReportData = async () => {
      const dailyData = await reportsRepository.getDailySummary(selectedDate);
      const prevSales = await reportsRepository.getYesterdaySales(selectedDate);
      const weekTrend = await reportsRepository.getWeeklySalesData(selectedDate);

      setSummary(dailyData);
      setYesterdaySales(prevSales);
      setWeeklyData(weekTrend);
    };

    loadReportData();
  }, [selectedDate, salesCount, earningsCount]);

  // Formato de fecha editorial: "Jueves, 24 de Octubre de 2023"
  const formatEditorialDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const formatted = d.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Cálculo de variación porcentual vs ayer
  const calculatePercentageVsYesterday = () => {
    if (yesterdaySales === 0) {
      return summary.totalSales > 0 ? '+100%' : '0%';
    }
    const diff = ((summary.totalSales - yesterdaySales) / yesterdaySales) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}% vs ayer`;
  };

  const isGrowthPositive = summary.totalSales >= yesterdaySales;

  // Formato compacto para números grandes (ej. $4.2M o $ 420.000)
  const formatCompactCOP = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`;
    }
    return formatCOP(val);
  };

  // Altura máxima del gráfico semanal
  const maxWeeklySale = Math.max(...weeklyData.map((d) => d.totalSales), 1);

  const handleAddExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCOPInput(earningAmountRaw);
    if (!platformName || amount <= 0) return;

    await reportsRepository.addExternalEarning({
      earningDate: selectedDate,
      platformName,
      amount,
      notes: earningNotes.trim() || undefined
    });

    setIsExternalModalOpen(false);
    setEarningAmountRaw('');
    setEarningNotes('');
  };

  const handleExportBackup = async () => {
    const cats = await db.categories.toArray();
    const prods = await db.products.toArray();
    const sales = await db.sales.toArray();
    const saleItems = await db.saleItems.toArray();
    const stockEntries = await db.stockEntries.toArray();
    const externalEarnings = await db.externalEarnings.toArray();

    const backup = {
      version: 1,
      appName: 'JEVACRIS POS & INVENTORY',
      exportedAt: new Date().toISOString(),
      data: { categories: cats, products: prods, sales, saleItems, stockEntries, externalEarnings }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jevacris-reporte-caja-${selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Producto más crítico para la recomendación inteligente
  const mostCriticalProduct = [...lowStockProducts].sort(
    (a, b) => a.currentStock / (a.minStockAlert || 1) - b.currentStock / (b.minStockAlert || 1)
  )[0];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        position: 'relative'
      }}
      className="reports-page-container"
    >
      {/* ========================================================================= */}
      {/* Header: Resumen del Día & Botones de Acción (Figma 1:708)                 */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '48px',
              fontWeight: 700,
              color: '#1d1a22',
              letterSpacing: '-0.96px',
              lineHeight: 1.1,
              fontFamily: 'var(--font-sans)'
            }}
          >
            Resumen del Día
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '18px',
              color: '#4d444e',
              fontFamily: 'var(--font-sans)'
            }}
          >
            {formatEditorialDate(selectedDate)}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Botón Selector de Fecha / Hoy */}
          <button
            onClick={() => setIsDatePickerOpen(true)}
            style={{
              backgroundColor: '#f8f1fd',
              border: 'none',
              borderRadius: '9999px',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#4d444e',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f2ecf7')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8f1fd')}
          >
            <Calendar size={14} color="#7a4c8c" />
            <span>
              {selectedDate === new Date().toISOString().split('T')[0] ? 'HOY' : selectedDate}
            </span>
          </button>

          {/* Botón Ganancia Externa */}
          <button
            onClick={() => setIsExternalModalOpen(true)}
            style={{
              backgroundColor: '#f8f1fd',
              border: '1px solid rgba(207, 195, 207, 0.4)',
              borderRadius: '9999px',
              padding: '12px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#310344',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase'
            }}
          >
            <Plus size={14} />
            <span>GANANCIA EXT.</span>
          </button>

          {/* Botón Exportar */}
          <button
            onClick={handleExportBackup}
            style={{
              backgroundColor: '#fdf7ff',
              border: '1px solid #cfc3cf',
              borderRadius: '9999px',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#1d1a22',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              boxShadow: '0 2px 6px rgba(49, 3, 68, 0.04)'
            }}
          >
            <Download size={14} />
            <span>EXPORTAR</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Bento Grid 60% / 40% (Figma 1:723)                                        */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 1fr)',
          gap: '32px',
          alignItems: 'start'
        }}
        className="reports-bento-grid"
      >
        {/* ======================================================================= */}
        {/* 60% Columna Izquierda: Tarjetas Bento & Gráfico Semanal                 */}
        {/* ======================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Top Bento Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 1fr',
              gap: '24px'
            }}
            className="reports-top-cards"
          >
            {/* Card 1: Ventas Totales (Prominente con Blob Lila) */}
            <div
              style={{
                backgroundColor: '#fdf7ff',
                borderRadius: '32px',
                padding: '32px',
                boxShadow: '24px 0px 48px rgba(49, 3, 68, 0.06)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '220px'
              }}
            >
              {/* Blob Decorativo Difuso */}
              <div
                style={{
                  position: 'absolute',
                  top: '-48px',
                  right: '-48px',
                  width: '192px',
                  height: '192px',
                  borderRadius: '50%',
                  backgroundColor: '#f8d8ff',
                  filter: 'blur(20px)',
                  opacity: 0.3,
                  pointerEvents: 'none'
                }}
              />

              {/* Título de la Métrica */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                <DollarSign size={16} color="#7a4c8c" />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#4d444e',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-sans)'
                  }}
                >
                  VENTAS TOTALES
                </span>
              </div>

              {/* Cifra Gigante */}
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 700,
                  color: '#310344',
                  letterSpacing: '-2.5px',
                  lineHeight: 1.1,
                  fontFamily: 'var(--font-sans)',
                  margin: '12px 0',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                {formatCompactCOP(summary.totalSales)}
              </div>

              {/* Tendencia vs Ayer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                {isGrowthPositive ? (
                  <TrendingUp size={16} color="#388e3c" />
                ) : (
                  <TrendingDown size={16} color="#ba1a1a" />
                )}
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isGrowthPositive ? '#388e3c' : '#ba1a1a',
                    fontFamily: 'var(--font-sans)'
                  }}
                >
                  {calculatePercentageVsYesterday()}
                </span>
              </div>
            </div>

            {/* Columna Derecha de Bento: Ganancia & Transacciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Card 2: Ganancia Estimada */}
              <div
                style={{
                  backgroundColor: '#fdf7ff',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '16px 0px 16px rgba(49, 3, 68, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4d444e',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase'
                  }}
                >
                  GANANCIA ESTIMADA
                </span>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    color: '#1d1a22',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: '-0.8px'
                  }}
                >
                  {formatCompactCOP(summary.totalProfit)}
                </div>
              </div>

              {/* Card 3: Transacciones (Interactivo / Clickeable para abrir modal) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsTransactionsModalOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsTransactionsModalOpen(true);
                  }
                }}
                style={{
                  backgroundColor: '#f8f1fd',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '8px 0px 8px rgba(49, 3, 68, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  border: '1px solid rgba(207, 195, 207, 0.3)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f2e8f8';
                  e.currentTarget.style.borderColor = 'rgba(122, 76, 140, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(49, 3, 68, 0.09)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f1fd';
                  e.currentTarget.style.borderColor = 'rgba(207, 195, 207, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '8px 0px 8px rgba(49, 3, 68, 0.02)';
                }}
                title="Haz clic para ver el detalle de transacciones individuales"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#4d444e',
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase'
                    }}
                  >
                    TRANSACCIONES
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#7a4c8c',
                      backgroundColor: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      border: '1px solid rgba(207, 195, 207, 0.5)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    Ver detalle ↗
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    color: '#1d1a22',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: '-0.8px'
                  }}
                >
                  {summary.totalTransactions}
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Gráfico: Tendencia Semanal (Figma 1:752) */}
          <div
            style={{
              backgroundColor: '#fdf7ff',
              borderRadius: '40px',
              padding: '32px',
              boxShadow: '24px 0px 24px rgba(49, 3, 68, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '32px'
            }}
          >
            {/* Encabezado del Gráfico */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#1d1a22',
                  letterSpacing: '-0.4px',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Tendencia Semanal
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#310344'
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#4d444e',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase'
                  }}
                >
                  INGRESOS
                </span>
              </div>
            </div>

            {/* Contenedor Visual de Barras */}
            <div
              style={{
                height: '240px',
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                paddingBottom: '36px',
                borderBottom: '1px solid #e6e0eb'
              }}
            >
              {/* Líneas Guía Horizontales */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  bottom: '36px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none'
                }}
              >
                <div style={{ width: '100%', height: '1px', backgroundColor: '#f2ecf7' }} />
                <div style={{ width: '100%', height: '1px', backgroundColor: '#f2ecf7' }} />
                <div style={{ width: '100%', height: '1px', backgroundColor: '#f2ecf7' }} />
              </div>

              {/* 7 Barras (LUN, MAR, MIE, JUE, VIE, SAB, DOM) */}
              {weeklyData.map((day) => {
                const heightPercent = Math.max(12, Math.round((day.totalSales / maxWeeklySale) * 100));
                const isSelected = day.isCurrentDay || day.dateStr === selectedDate;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedDate(day.dateStr)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                      zIndex: 2,
                      width: '48px'
                    }}
                    title={`${day.dayName} (${day.dateStr}): ${formatCOP(day.totalSales)}`}
                  >
                    {/* Tooltip con Valor Flotante para el día activo */}
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-32px',
                          backgroundColor: '#310344',
                          color: '#ffffff',
                          borderRadius: '16px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(49, 3, 68, 0.25)'
                        }}
                      >
                        {formatCompactCOP(day.totalSales)}
                      </div>
                    )}

                    {/* Barra */}
                    <div
                      style={{
                        width: '48px',
                        height: `${(heightPercent * 160) / 100}px`,
                        backgroundColor: isSelected ? '#310344' : '#ece6f1',
                        borderTopLeftRadius: '48px',
                        borderTopRightRadius: '48px',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0px 8px 16px rgba(49, 3, 68, 0.2)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#d9bddf';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#ece6f1';
                      }}
                    />

                    {/* Etiqueta del Día */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-28px',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '1.2px',
                        color: isSelected ? '#310344' : '#4d444e',
                        textTransform: 'uppercase'
                      }}
                    >
                      {day.shortDay}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 40% Columna Derecha: Alertas de Stock & Recomendaciones (Figma 1:792)   */}
        {/* ======================================================================= */}
        <div
          style={{
            backgroundColor: '#fdf7ff',
            border: '1px solid #ffffff',
            borderRadius: '32px',
            padding: '32px',
            boxShadow: '32px 0px 32px rgba(49, 3, 68, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px'
          }}
        >
          {/* Encabezado de Alertas */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#f8f1fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ba1a1a'
                }}
              >
                <AlertTriangle size={18} />
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#1d1a22',
                  letterSpacing: '-0.4px',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Alertas de Stock
              </h3>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#010001',
                letterSpacing: '1.2px',
                textTransform: 'uppercase'
              }}
            >
              {lowStockProducts.length} ÍTEMS
            </span>
          </div>

          {/* Lista de Productos con Stock Bajo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '360px',
              overflowY: 'auto'
            }}
          >
            {lowStockProducts.length === 0 ? (
              <div
                style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                  backgroundColor: '#f8f1fd',
                  borderRadius: '24px',
                  color: '#4d444e'
                }}
              >
                <Sparkles size={32} color="#7a4c8c" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 600, fontSize: '15px' }}>¡Inventario en Nivel Óptimo!</div>
                <div style={{ fontSize: '13px', marginTop: '4px', color: '#7e747f' }}>
                  No hay productos con existencias por debajo del umbral de alerta.
                </div>
              </div>
            ) : (
              lowStockProducts.map((prod, idx) => {
                const isCritical = prod.currentStock <= Math.max(1, Math.floor(prod.minStockAlert / 2));
                const catName = prod.categoryId ? categoryMap.get(prod.categoryId) || 'General' : 'General';

                return (
                  <React.Fragment key={prod.id}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '24px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #f2ecf7',
                        gap: '12px'
                      }}
                    >
                      {/* Ícono de Producto y Nombre */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: isCritical ? '#f3d6f9' : '#ece6f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#310344',
                            flexShrink: 0
                          }}
                        >
                          <Package size={18} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '15px',
                              fontWeight: 600,
                              color: '#1d1a22',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {prod.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#7e747f' }}>
                            Cat: {catName} • Mín: {prod.minStockAlert} {prod.unit}s
                          </div>
                        </div>
                      </div>

                      {/* Stock Restante y Badge de Estado */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#1d1a22',
                            fontFamily: 'var(--font-sans)'
                          }}
                        >
                          {prod.currentStock} {prod.unit}s
                        </span>

                        <span
                          style={{
                            backgroundColor: isCritical ? '#d1c0df' : '#ece6f1',
                            color: isCritical ? '#4d444e' : '#6d5773',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '12px'
                          }}
                        >
                          {isCritical ? 'CRÍTICO' : 'BAJO'}
                        </span>
                      </div>
                    </div>

                    {idx < lowStockProducts.length - 1 && (
                      <div style={{ height: '1px', backgroundColor: '#e6e0eb', margin: '0 8px' }} />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Caja de Recomendación Inteligente (Figma 1:854) */}
          <div
            style={{
              backgroundColor: '#f8f1fd',
              borderRadius: '20px',
              padding: '20px 24px',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
              border: '1px solid #ece6f1'
            }}
          >
            <Sparkles size={20} color="#7a4c8c" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13.5px', color: '#4d444e', lineHeight: 1.5 }}>
              {mostCriticalProduct ? (
                <>
                  Se recomienda generar una orden de reposición para{' '}
                  <strong style={{ color: '#310344' }}>{mostCriticalProduct.name}</strong> antes del próximo ciclo de
                  ventas debido a su nivel crítico en inventario.
                </>
              ) : (
                <>
                  El flujo de stock actual cubre la demanda proyectada. Recuerda realizar cuadraturas de caja al cierre de
                  la jornada.
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Modal: Selector de Fecha                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        title="Seleccionar Fecha de Reporte"
        subtitle="Consulta el consolidado de ventas y caja de cualquier día"
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              FECHA DE CONSULTA
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '24px',
                border: '1px solid #cfc3cf',
                padding: '0 16px',
                fontSize: '15px',
                fontWeight: 600,
                color: '#1d1a22',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setIsDatePickerOpen(false);
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '9999px',
                backgroundColor: '#f8f1fd',
                border: 'none',
                color: '#310344',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(false)}
              style={{
                padding: '10px 24px',
                borderRadius: '9999px',
                backgroundColor: '#310344',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* Modal: Registrar Ganancia de Plataforma Externa                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isExternalModalOpen}
        onClose={() => setIsExternalModalOpen(false)}
        title="Registrar Ganancia Externa"
        subtitle="Ingresa comisiones o ingresos por recargas y corresponsal bancario"
        maxWidth="460px"
      >
        <form onSubmit={handleAddExternal} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
              PLATAFORMA O SERVICIO *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Recargas Claro/Movistar, TuLlave, Corresponsal..."
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '24px',
                border: '1px solid #cfc3cf',
                padding: '0 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1d1a22',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#310344',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              COMISIÓN / GANANCIA LIQUIDADA ($) *
            </label>
            <input
              type="text"
              required
              placeholder="0"
              value={earningAmountRaw}
              onChange={(e) => {
                const clean = parseCOPInput(e.target.value);
                setEarningAmountRaw(clean > 0 ? formatNumberWithDots(clean) : '');
              }}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '26px',
                border: '1.5px solid #cfc3cf',
                padding: '0 18px',
                fontSize: '20px',
                fontWeight: 700,
                color: '#310344',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

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
              NOTAS (OPCIONAL)
            </label>
            <input
              type="text"
              placeholder="Ej. Liquidación corte 6:00 PM"
              value={earningNotes}
              onChange={(e) => setEarningNotes(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '22px',
                border: '1px solid #cfc3cf',
                padding: '0 16px',
                fontSize: '13px',
                color: '#1d1a22',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setIsExternalModalOpen(false)}
              style={{
                padding: '12px 20px',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                border: '1px solid #cfc3cf',
                color: '#4d444e',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={parseCOPInput(earningAmountRaw) <= 0}
              style={{
                padding: '12px 28px',
                borderRadius: '9999px',
                backgroundColor: '#310344',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: parseCOPInput(earningAmountRaw) > 0 ? 'pointer' : 'not-allowed',
                boxShadow: '0 6px 16px rgba(49, 3, 68, 0.2)'
              }}
            >
              Sumar a Ganancia
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* Modal: Historial Detallado de Transacciones del Día                       */}
      {/* ========================================================================= */}
      <DayTransactionsModal
        isOpen={isTransactionsModalOpen}
        onClose={() => setIsTransactionsModalOpen(false)}
        selectedDate={selectedDate}
        formattedDate={formatEditorialDate(selectedDate)}
      />

      <style>{`
        @media (max-width: 960px) {
          .reports-bento-grid {
            grid-template-columns: 1fr !important;
          }
          .reports-top-cards {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
