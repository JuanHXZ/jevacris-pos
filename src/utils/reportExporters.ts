import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DebtsKpiSummary, DebtWithDetails, ExpenseCategory, PeriodReportData } from '../types';
import { PRINCIPAL_CASH_REGISTER_ID } from '../types';
import { formatCOP } from './currency';
import { formatLocalDateTime, getLocalDateString, toLocalDateString } from './date';

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Arriendo',
  utilities: 'Servicios Públicos',
  supplies: 'Insumos / Aseo',
  personal_draw: 'Retiro Personal',
  other: 'Otros Gastos'
};

function buildBaseFilename(data: PeriodReportData): string {
  const { startDateStr, endDateStr, preset } = data.range;
  const suffix = startDateStr === endDateStr ? startDateStr : `${startDateStr}_a_${endDateStr}`;
  return `JEVACRIS_Reporte_${preset.toUpperCase()}_${suffix}`;
}

/**
 * Genera y descarga un libro de Excel (.xlsx) con hojas contables, operativas y control de fiados.
 */
export function exportReportToExcel(data: PeriodReportData): void {
  const wb = XLSX.utils.book_new();

  // =========================================================================
  // Hoja 1: Resumen Ejecutivo, Control de Fiados y Distribución por Cajas
  // =========================================================================
  const summaryRows: Array<Array<string | number>> = [
    ['JEVACRIS POS & INVENTARIO — REPORTE CONSOLIDADO DE OPERACIÓN'],
    ['Período consultado:', data.range.label],
    ['Desde:', formatLocalDateTime(data.range.startIso)],
    ['Hasta:', formatLocalDateTime(data.range.endIso)],
    ['Fecha de generación:', formatLocalDateTime(data.generatedAt)],
    [],
    ['INDICADORES GENERALES DEL PERÍODO', 'VALOR (COP / CANT.)'],
    ['Total Transacciones Registradas', data.summary.totalTransactions],
    ['Ventas en Efectivo', data.summary.cashSales],
    ['Ventas por Transferencia / Nequi', data.summary.transferSales],
    ['VENTAS BRUTAS TOTALES (Recaudo Real)', data.summary.totalSales],
    ['Gastos Operativos de Gaveta', data.summary.expensesTotal],
    ['BALANCE NETO DE CAJA (Ventas - Gastos)', data.summary.netBalance],
    [],
    ['CONTROL DE FIADOS Y SALIDA DE MERCANCÍA A CRÉDITO (RF18)', 'VALOR (COP / CANT.)'],
    ['Tickets de Fiado Entregados en el Período', data.summary.debtsGivenCount ?? 0],
    ['Mercancía Entregada en Fiado (Salida de Stock en el Período)', data.summary.debtsGivenAmount ?? 0],
    ['Saldo Aún Pendiente de los Fiados del Período (Gasto/Crédito por Cobrar)', data.summary.debtsPendingFromPeriod ?? 0],
    ['Abonos y Pagos de Fiados Recaudados en el Período (Incluidos en Ventas)', data.summary.debtPaymentsCollected ?? 0],
    ['Cartera Total Pendiente Acumulada del Negocio', data.summary.totalActiveReceivables ?? 0],
    [],
    ['CONSOLIDACIÓN DE GANANCIAS (ADR-004)', 'VALOR (COP)'],
    ['Ganancia Estimada Productos Físicos (sobre ventas recaudadas)', data.summary.physicalProfit],
    ['Ganancias Plataformas Externas (Recargas/Corresponsal)', data.summary.externalEarnings],
    ['GANANCIA TOTAL CONSOLIDADA', data.summary.totalProfit],
    [],
    ['RESUMEN Y DISTRIBUCIÓN POR CAJA DE FACTURACIÓN (RF27 / RF28)'],
    ['Caja / Fondo', 'Ventas del Período', 'Ganancia Productos', 'Rubro de Distribución', '% Asignado', 'Monto Sugerido']
  ];

  for (const regSummary of data.cashRegisterSummaries) {
    if (regSummary.distribution.length === 0) {
      summaryRows.push([
        regSummary.register.name,
        regSummary.totalSales,
        regSummary.totalProfit,
        'Sin distribución configurada',
        0,
        0
      ]);
    } else {
      regSummary.distribution.forEach((dist, idx) => {
        summaryRows.push([
          idx === 0 ? regSummary.register.name : '',
          idx === 0 ? regSummary.totalSales : '',
          idx === 0 ? regSummary.totalProfit : '',
          dist.line.label,
          dist.line.percentage,
          Math.round(dist.suggestedAmount)
        ]);
      });
    }
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 56 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // =========================================================================
  // Hoja 2: Ventas Detalladas (Desglose por Ítem)
  // =========================================================================
  const detailHeaders = [
    'Fecha',
    'Hora / Timestamp',
    'ID Venta',
    'Medio de Pago',
    'Producto / Servicio',
    'Tipo',
    'Caja de Facturación',
    'Cantidad',
    'Precio Unitario',
    'Costo Unitario',
    'Subtotal Ítem',
    'Ganancia Estimada',
    'Total Ticket',
    'Notas'
  ];

  const detailRows: Array<Array<string | number>> = [detailHeaders];

  for (const sale of data.salesWithItems) {
    const paymentLabel = sale.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia / Nequi';
    const dateOnly = toLocalDateString(sale.saleDate);
    const dateTimeStr = formatLocalDateTime(sale.saleDate);

    if (!sale.items || sale.items.length === 0) {
      detailRows.push([
        dateOnly,
        dateTimeStr,
        sale.id,
        paymentLabel,
        'Venta general (sin desglose)',
        'Físico',
        'Caja Principal',
        1,
        sale.totalAmount,
        0,
        sale.totalAmount,
        0,
        sale.totalAmount,
        sale.notes || ''
      ]);
    } else {
      for (const item of sale.items) {
        const regId = item.cashRegisterId || PRINCIPAL_CASH_REGISTER_ID;
        const regName = sale.registerNamesById[regId] || 'Caja Principal';
        const typeLabel = item.productType === 'physical' ? 'Producto Físico' : 'Servicio / Recarga';
        const itemProfit = item.productType === 'physical' ? item.profit : 0;

        detailRows.push([
          dateOnly,
          dateTimeStr,
          sale.id,
          paymentLabel,
          item.productName,
          typeLabel,
          regName,
          item.quantity,
          item.unitPrice,
          item.unitCost,
          item.subtotal,
          itemProfit,
          sale.totalAmount,
          sale.notes || ''
        ]);
      }
    }
  }

  const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetails['!cols'] = [
    { wch: 13 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 34 },
    { wch: 18 },
    { wch: 20 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 32 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Ventas Detalladas');

  // =========================================================================
  // Hoja 3: Consolidado Diario
  // =========================================================================
  const dailyHeaders = [
    'Fecha (YYYY-MM-DD)',
    'Transacciones',
    'Ventas Efectivo',
    'Ventas Transferencia',
    'Total Ventas Día',
    'Mercancía Fiada (Salida)',
    'Abonos Fiados Recaudados',
    'Ganancia Productos Físicos',
    'Ganancia Externa',
    'Ganancia Total Día'
  ];

  const dailyRows: Array<Array<string | number>> = [
    dailyHeaders,
    ...data.dailyBreakdown.map((d) => [
      d.dateStr,
      d.totalTransactions,
      d.cashSales,
      d.transferSales,
      d.totalSales,
      d.debtsGivenAmount ?? 0,
      d.debtPaymentsCollected ?? 0,
      d.physicalProfit,
      d.externalEarnings,
      d.totalProfit
    ])
  ];

  const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
  wsDaily['!cols'] = [
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Consolidado Diario');

  // =========================================================================
  // Hoja 4: Productos Vendidos (Ranking)
  // =========================================================================
  const productHeaders = [
    'Producto / Servicio',
    'Tipo',
    'Caja Asignada',
    'Unidades Vendidas',
    'Total Ingresos (COP)',
    'Ganancia Generada (COP)'
  ];

  const productRows: Array<Array<string | number>> = [
    productHeaders,
    ...data.topProducts.map((p) => [
      p.productName,
      p.productType === 'physical' ? 'Producto Físico' : 'Servicio / Recarga',
      p.cashRegisterName,
      p.quantitySold,
      p.totalSales,
      p.totalProfit
    ])
  ];

  const wsProducts = XLSX.utils.aoa_to_sheet(productRows);
  wsProducts['!cols'] = [{ wch: 34 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Productos Vendidos');

  // =========================================================================
  // Hoja 5: Arqueos, Gastos y Ganancias Externas
  // =========================================================================
  const extraRows: Array<Array<string | number>> = [
    ['GANANCIAS DE PLATAFORMAS EXTERNAS REGISTRADAS'],
    ['Fecha', 'Plataforma / Servicio', 'Monto Ganancia (COP)', 'Notas'],
    ...data.externalEarningsList.map((ext) => [
      ext.earningDate,
      ext.platformName,
      ext.amount,
      ext.notes || ''
    ]),
    [],
    ['SESIONES DE CAJA Y ARQUEOS EN EL PERÍODO (RF22)'],
    [
      'ID Sesión',
      'Apertura',
      'Cierre',
      'Estado',
      'Base Inicial',
      'Efectivo Esperado',
      'Efectivo Contado',
      'Diferencia',
      'Notas'
    ],
    ...data.cashSessions.map((cs) => [
      cs.id,
      formatLocalDateTime(cs.openedAt),
      cs.closedAt ? formatLocalDateTime(cs.closedAt) : 'En curso',
      cs.status === 'open' ? 'Abierta' : 'Cerrada',
      cs.openingCash,
      cs.closingCashCalculated ?? 0,
      cs.closingCashCounted ?? 0,
      cs.difference ?? 0,
      cs.notes || ''
    ]),
    [],
    ['GASTOS OPERATIVOS DE GAVETA EN EL PERÍODO'],
    ['Fecha / Hora', 'Categoría', 'Descripción', 'Monto (COP)', 'ID Sesión'],
    ...data.expenses.map((ex) => [
      formatLocalDateTime(ex.expenseDate),
      EXPENSE_CATEGORY_LABELS[ex.category] || ex.category,
      ex.description || '',
      ex.amount,
      ex.cashSessionId
    ])
  ];

  const wsExtra = XLSX.utils.aoa_to_sheet(extraRows);
  wsExtra['!cols'] = [
    { wch: 24 },
    { wch: 26 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsExtra, 'Arqueos y Externos');

  // =========================================================================
  // Hoja 6: Control de Fiados y Cartera (RF18)
  // =========================================================================
  const statusLabel = (s: string) =>
    s === 'paid' ? 'Saldado' : s === 'partial' ? 'Abonado Parcial' : 'Pendiente';

  const debtsSheetRows: Array<Array<string | number>> = [
    ['FIADOS ENTREGADOS EN EL PERÍODO (CONTROL DE SALIDA DE STOCK)'],
    [
      'Folio',
      'Fecha Entrega',
      'Cliente / Familiar',
      'Teléfono',
      'Productos Entregados',
      'Valor Total Fiado',
      'Monto Abonado',
      'Saldo Pendiente',
      'Estado',
      'Fecha Límite',
      'Notas'
    ],
    ...(data.debtsInPeriod || []).map((d) => [
      d.folio,
      formatLocalDateTime(d.createdAt),
      d.debtorName,
      d.debtorPhone || '',
      d.items.map((it) => `${it.quantity}x ${it.productName} ($${it.subtotal})`).join(', '),
      d.totalAmount,
      d.paidAmount,
      d.remainingAmount,
      statusLabel(d.status),
      d.dueDate || 'Sin fecha',
      d.notes || ''
    ]),
    [],
    ['ABONOS Y LIQUIDACIONES RECAUDADOS EN EL PERÍODO'],
    ['Fecha / Hora Pago', 'Folio Fiado', 'Cliente', 'Medio de Pago', 'Monto Abonado (COP)', 'ID Venta Generada', 'Notas'],
    ...(data.debtPaymentsInPeriod || []).map((p) => [
      formatLocalDateTime(p.paidAt),
      p.folio,
      p.debtorName,
      p.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia / Nequi',
      p.amount,
      p.generatedSaleId || '',
      p.notes || ''
    ]),
    [],
    ['CARTERA ACTIVA TOTAL PENDIENTE POR COBRAR'],
    ['Folio', 'Fecha Entrega', 'Cliente / Familiar', 'Teléfono', 'Deuda Inicial', 'Abonado', 'Saldo Pendiente', 'Estado'],
    ...(data.activeDebts || []).map((d) => [
      d.folio,
      formatLocalDateTime(d.createdAt),
      d.debtorName,
      d.debtorPhone || '',
      d.totalAmount,
      d.paidAmount,
      d.remainingAmount,
      statusLabel(d.status)
    ])
  ];

  const wsDebts = XLSX.utils.aoa_to_sheet(debtsSheetRows);
  wsDebts['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 42 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDebts, 'Fiados y Cartera');

  XLSX.writeFile(wb, `${buildBaseFilename(data)}.xlsx`);
}

/**
 * Exporta directamente la Cartera de Préstamos y Fiados desde el módulo de Fiados.
 */
export function exportDebtsPortfolioToExcel(debts: DebtWithDetails[], kpis: DebtsKpiSummary): void {
  const wb = XLSX.utils.book_new();
  const todayStr = getLocalDateString();

  const statusLabel = (s: string, isOverdue: boolean) => {
    if (s === 'paid') return 'Saldado';
    if (isOverdue) return 'Vencido';
    return s === 'partial' ? 'Abonado Parcial' : 'Pendiente';
  };

  // Hoja 1: Tickets de Fiado
  const ticketsRows: Array<Array<string | number>> = [
    ['JEVACRIS POS — CARTERA DE PRÉSTAMOS Y CUENTAS POR COBRAR'],
    ['Fecha de corte:', formatLocalDateTime(new Date().toISOString())],
    ['Total Cartera por Cobrar (COP):', kpis.totalReceivable],
    ['Préstamos Activos:', kpis.activeCount],
    ['Recaudado este Mes (COP):', kpis.collectedThisMonth],
    ['Tasa de Recuperación (%):', `${kpis.recoveryRate}%`],
    [],
    [
      'Folio',
      'Fecha Fiado',
      'Cliente / Familiar',
      'Teléfono',
      'Estado',
      'Deuda Total (COP)',
      'Total Abonado (COP)',
      'Saldo Pendiente (COP)',
      'Fecha Límite',
      'Productos Entregados',
      'Notas'
    ],
    ...debts.map((d) => [
      d.folio,
      formatLocalDateTime(d.createdAt),
      d.debtorName,
      d.debtorPhone || '',
      statusLabel(d.status, d.isOverdue),
      d.totalAmount,
      d.paidAmount,
      d.remainingAmount,
      d.dueDate || 'Sin fecha pactada',
      d.items.map((it) => `${it.quantity} ${it.unit} ${it.productName} (${formatCOP(it.subtotal)})`).join(' | '),
      d.notes || ''
    ])
  ];

  const wsTickets = XLSX.utils.aoa_to_sheet(ticketsRows);
  wsTickets['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 48 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTickets, 'Tickets de Fiado');

  // Hoja 2: Desglose de Productos Fiados
  const itemRows: Array<Array<string | number>> = [
    ['Folio', 'Fecha Fiado', 'Cliente / Familiar', 'Estado Ticket', 'Producto / Servicio', 'Tipo', 'Cantidad', 'Unidad', 'Precio Unitario', 'Subtotal'],
    ...debts.flatMap((d) =>
      d.items.map((it) => [
        d.folio,
        toLocalDateString(d.createdAt),
        d.debtorName,
        statusLabel(d.status, d.isOverdue),
        it.productName,
        it.productType === 'physical' ? 'Físico' : 'Servicio / Recarga',
        it.quantity,
        it.unit,
        it.unitPrice,
        it.subtotal
      ])
    )
  ];
  const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
  wsItems['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 26 },
    { wch: 18 },
    { wch: 32 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsItems, 'Productos Fiados');

  // Hoja 3: Historial de Abonos
  const paymentRows: Array<Array<string | number>> = [
    ['Fecha / Hora Abono', 'Folio Fiado', 'Cliente / Familiar', 'Medio de Pago', 'Monto Abonado (COP)', 'Notas / Comprobante'],
    ...debts.flatMap((d) =>
      d.payments.map((p) => [
        formatLocalDateTime(p.paidAt),
        d.folio,
        d.debtorName,
        p.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia / Nequi',
        p.amount,
        p.notes || ''
      ])
    )
  ];
  const wsPayments = XLSX.utils.aoa_to_sheet(paymentRows);
  wsPayments['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 28 },
    { wch: 22 },
    { wch: 20 },
    { wch: 32 }
  ];
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Historial Abonos');

  XLSX.writeFile(wb, `JEVACRIS_Cartera_Fiados_${todayStr}.xlsx`);
}

/**
 * Genera y descarga un reporte ejecutivo y detallado en formato PDF (.pdf).
 */
export function exportReportToPDF(data: PeriodReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Colores corporativos JEVACRIS (Midnight Orchid #310344 / Dusky Lilac #6d5773)
  const primaryColor: [number, number, number] = [49, 3, 68];
  const secondaryColor: [number, number, number] = [109, 87, 115];
  const lightSurface: [number, number, number] = [248, 241, 253];

  // =========================================================================
  // Cabecera Editorial
  // =========================================================================
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('JEVACRIS POS & INVENTARIO', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Reporte Financiero y Operativo — ${data.range.label}`, 14, 23);

  doc.setFontSize(8.5);
  doc.setTextColor(246, 217, 251);
  doc.text(
    `Rango: ${formatLocalDateTime(data.range.startIso)} a ${formatLocalDateTime(data.range.endIso)}`,
    14,
    30
  );
  doc.text(`Generado: ${formatLocalDateTime(data.generatedAt)}`, 14, 35);

  // =========================================================================
  // Resumen Ejecutivo (Tabla de KPIs)
  // =========================================================================
  doc.setTextColor(29, 26, 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Resumen Ejecutivo y Control de Fiados', 14, 47);

  autoTable(doc, {
    startY: 50,
    head: [['Métrica Financiera', 'Valor', 'Rentabilidad, Caja y Fiados', 'Valor']],
    body: [
      [
        'Ventas Brutas Totales (Recaudo)',
        formatCOP(data.summary.totalSales),
        'Ganancia Productos Físicos',
        formatCOP(data.summary.physicalProfit)
      ],
      [
        'Recaudo en Efectivo',
        formatCOP(data.summary.cashSales),
        'Ganancias Plataformas Externas',
        formatCOP(data.summary.externalEarnings)
      ],
      [
        'Recaudo Transferencias / Nequi',
        formatCOP(data.summary.transferSales),
        'GANANCIA TOTAL CONSOLIDADA',
        formatCOP(data.summary.totalProfit)
      ],
      [
        'Total Transacciones',
        String(data.summary.totalTransactions),
        'Gastos Operativos de Gaveta',
        formatCOP(data.summary.expensesTotal)
      ],
      [
        'Mercancía Fiada (Salida Período)',
        formatCOP(data.summary.debtsGivenAmount ?? 0),
        'Abonos de Fiados Recaudados',
        formatCOP(data.summary.debtPaymentsCollected ?? 0)
      ],
      [
        'Fiados del Período Aún por Cobrar',
        formatCOP(data.summary.debtsPendingFromPeriod ?? 0),
        'Cartera Total Pendiente Activa',
        formatCOP(data.summary.totalActiveReceivables ?? 0)
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [29, 26, 34]
    },
    alternateRowStyles: {
      fillColor: lightSurface
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 52 },
      1: { halign: 'right', cellWidth: 38 },
      2: { fontStyle: 'bold', cellWidth: 54 },
      3: { halign: 'right', cellWidth: 38 }
    }
  });

  // Obtener posición Y después de la primera tabla
  const getLastY = (): number => {
    const docWithTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
    return docWithTable.lastAutoTable?.finalY ?? 90;
  };

  // =========================================================================
  // 2. Fondos por Caja y Distribución Sugerida (RF27 / RF28)
  // =========================================================================
  let currentY = getLastY() + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Fondos Contables y Distribución por Caja', 14, currentY);

  const registerRows: Array<Array<string>> = [];
  for (const reg of data.cashRegisterSummaries) {
    const distText =
      reg.distribution.length > 0
        ? reg.distribution
            .map((d) => `${d.line.label} (${d.line.percentage}%): ${formatCOP(Math.round(d.suggestedAmount))}`)
            .join(' | ')
        : 'Sin distribución';

    registerRows.push([
      reg.register.name,
      formatCOP(reg.totalSales),
      formatCOP(reg.totalProfit),
      distText
    ]);
  }

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Caja de Facturación', 'Total Ventas', 'Ganancia Físicos', 'Distribución Sugerida']],
    body: registerRows,
    theme: 'striped',
    headStyles: {
      fillColor: secondaryColor,
      textColor: [255, 255, 255],
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 36 },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 30 },
      3: { cellWidth: 86 }
    }
  });

  // =========================================================================
  // 3. Consolidado Diario
  // =========================================================================
  currentY = getLastY() + 9;
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Consolidado Diario', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [
      [
        'Fecha',
        'Ventas',
        'Efectivo',
        'Transf.',
        'Total Ventas',
        'Salida Fiados',
        'Abonos Fiados',
        'Ganancia Total'
      ]
    ],
    body:
      data.dailyBreakdown.length > 0
        ? data.dailyBreakdown.map((d) => [
            d.dateStr,
            String(d.totalTransactions),
            formatCOP(d.cashSales),
            formatCOP(d.transferSales),
            formatCOP(d.totalSales),
            formatCOP(d.debtsGivenAmount ?? 0),
            formatCOP(d.debtPaymentsCollected ?? 0),
            formatCOP(d.totalProfit)
          ])
        : [['Sin registros en el período seleccionado', '0', '$ 0', '$ 0', '$ 0', '$ 0', '$ 0', '$ 0']],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 7.5
    },
    bodyStyles: {
      fontSize: 7.5
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // =========================================================================
  // 4. Detalle de Fiados Entregados en el Período (RF18)
  // =========================================================================
  if (data.debtsInPeriod && data.debtsInPeriod.length > 0) {
    currentY = getLastY() + 9;
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('4. Fiados Entregados en el Período (Salida de Stock)', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Folio / Fecha', 'Cliente', 'Productos Entregados', 'Total Fiado', 'Abonado', 'Pendiente']],
      body: data.debtsInPeriod.map((d) => [
        `${d.folio} (${toLocalDateString(d.createdAt)})`,
        d.debtorName,
        d.items.map((it) => `${it.quantity}x ${it.productName}`).join(', '),
        formatCOP(d.totalAmount),
        formatCOP(d.paidAmount),
        formatCOP(d.remainingAmount)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: secondaryColor,
        textColor: [255, 255, 255],
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 7.5
      },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' }
      }
    });
  }

  // =========================================================================
  // 5. Productos y Servicios Vendidos
  // =========================================================================
  if (data.topProducts.length > 0) {
    currentY = getLastY() + 9;
    if (currentY > 245) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('5. Productos y Servicios Vendidos en el Período', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Producto / Servicio', 'Tipo', 'Caja', 'Cant.', 'Total Ventas', 'Ganancia']],
      body: data.topProducts.map((p) => [
        p.productName,
        p.productType === 'physical' ? 'Físico' : 'Servicio',
        p.cashRegisterName,
        String(p.quantitySold),
        formatCOP(p.totalSales),
        formatCOP(p.totalProfit)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: secondaryColor,
        textColor: [255, 255, 255],
        fontSize: 8.5
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });
  }

  // =========================================================================
  // 6. Detalle de Transacciones del Período
  // =========================================================================
  if (data.salesWithItems.length > 0) {
    currentY = getLastY() + 9;
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('6. Detalle de Transacciones', 14, currentY);

    const txRows: Array<Array<string>> = [];
    for (const sale of data.salesWithItems) {
      const shortId = sale.id.startsWith('sale-') ? sale.id.slice(5, 13) : sale.id.slice(-6);
      const paymentLabel = sale.paymentMethod === 'cash' ? 'Efectivo' : 'Transf.';
      const itemsSummary =
        sale.items && sale.items.length > 0
          ? sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')
          : 'Sin detalle de ítems';
      const saleProfit =
        sale.items?.reduce((acc, i) => acc + (i.productType === 'physical' ? i.profit : 0), 0) ?? 0;

      txRows.push([
        formatLocalDateTime(sale.saleDate),
        `#${shortId}`,
        paymentLabel,
        itemsSummary,
        formatCOP(sale.totalAmount),
        formatCOP(saleProfit)
      ]);
    }

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha / Hora', 'Ticket', 'Pago', 'Productos Incluidos', 'Total Venta', 'Ganancia']],
      body: txRows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 7.5
      },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 66 },
        4: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
        5: { halign: 'right', cellWidth: 24 }
      }
    });
  }

  doc.save(`${buildBaseFilename(data)}.pdf`);
}
