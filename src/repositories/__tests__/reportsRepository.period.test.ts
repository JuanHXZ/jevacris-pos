import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db';
import { reportsRepository } from '../reportsRepository';
import { buildReportDateRange } from '../../utils/date';
import { PRINCIPAL_CASH_REGISTER_ID } from '../../types';

describe('reportsRepository.getPeriodReportData', () => {
  const fixedNow = new Date(2026, 9, 16, 15, 0, 0, 0); // 2026-10-16 15:00:00

  beforeEach(async () => {
    await db.open();
    await db.sales.clear();
    await db.saleItems.clear();
    await db.externalEarnings.clear();
    await db.cashSessions.clear();
    await db.expenses.clear();
  });

  it('consolida ventas, ganancias físicas (excluyendo servicios), ganancias externas y cajas en un rango', async () => {
    // Venta 1: hace 2 horas (Hoy 2026-10-16 13:00) - Efectivo ($16.000: Físico $6.000 con profit $1.500 + Servicio $10.000 con profit $0)
    const sale1Date = new Date(2026, 9, 16, 13, 0, 0).toISOString();
    await db.sales.add({
      id: 'sale-today-1',
      saleDate: sale1Date,
      totalAmount: 16000,
      paymentMethod: 'cash',
      amountReceived: 20000,
      changeGiven: 4000,
      createdAt: sale1Date,
      updatedAt: sale1Date,
      synced: false
    });

    await db.saleItems.bulkAdd([
      {
        id: 'item-1',
        saleId: 'sale-today-1',
        productId: 'prod-jabon',
        productName: 'Jabón Rey 300g',
        productType: 'physical',
        quantity: 2,
        unitPrice: 3000,
        unitCost: 2250,
        subtotal: 6000,
        profit: 1500,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        createdAt: sale1Date
      },
      {
        id: 'item-2',
        saleId: 'sale-today-1',
        productId: 'serv-recarga',
        productName: 'Recarga Claro',
        productType: 'service',
        quantity: 1,
        unitPrice: 10000,
        unitCost: 0,
        subtotal: 10000,
        profit: 0,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        createdAt: sale1Date
      }
    ]);

    // Venta 2: hace 2 días (2026-10-14 10:00) - Transferencia ($5.000, profit $1.200)
    const sale2Date = new Date(2026, 9, 14, 10, 0, 0).toISOString();
    await db.sales.add({
      id: 'sale-2days-ago',
      saleDate: sale2Date,
      totalAmount: 5000,
      paymentMethod: 'transfer',
      amountReceived: 5000,
      changeGiven: 0,
      createdAt: sale2Date,
      updatedAt: sale2Date,
      synced: false
    });

    await db.saleItems.add({
      id: 'item-3',
      saleId: 'sale-2days-ago',
      productId: 'prod-jabon-liq',
      productName: 'Jabón Líquido 1L',
      productType: 'physical',
      quantity: 1,
      unitPrice: 5000,
      unitCost: 3800,
      subtotal: 5000,
      profit: 1200,
      cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
      createdAt: sale2Date
    });

    // Venta 3: hace 10 días (2026-10-06 11:00) - Efectivo ($12.000, profit $4.000) -> Fuera de 3d y 7d, dentro de 30d
    const sale3Date = new Date(2026, 9, 6, 11, 0, 0).toISOString();
    await db.sales.add({
      id: 'sale-10days-ago',
      saleDate: sale3Date,
      totalAmount: 12000,
      paymentMethod: 'cash',
      amountReceived: 12000,
      changeGiven: 0,
      createdAt: sale3Date,
      updatedAt: sale3Date,
      synced: false
    });

    await db.saleItems.add({
      id: 'item-4',
      saleId: 'sale-10days-ago',
      productId: 'prod-suavizante',
      productName: 'Suavizante 1L',
      productType: 'physical',
      quantity: 2,
      unitPrice: 6000,
      unitCost: 4000,
      subtotal: 12000,
      profit: 4000,
      cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
      createdAt: sale3Date
    });

    // Ganancia externa hoy (2026-10-16): $3.500
    await reportsRepository.addExternalEarning({
      earningDate: '2026-10-16',
      platformName: 'Corresponsal',
      amount: 3500
    });

    // 1) Probar filtro Últimas 24H (solo debe incluir sale-today-1 y la ganancia externa de hoy)
    const range24h = buildReportDateRange('24h', undefined, undefined, fixedNow);
    const data24h = await reportsRepository.getPeriodReportData(range24h);
    expect(data24h.summary.totalTransactions).toBe(1);
    expect(data24h.summary.totalSales).toBe(16000);
    expect(data24h.summary.cashSales).toBe(16000);
    expect(data24h.summary.transferSales).toBe(0);
    expect(data24h.summary.physicalProfit).toBe(1500);
    expect(data24h.summary.externalEarnings).toBe(3500);
    expect(data24h.summary.totalProfit).toBe(5000);

    // 2) Probar filtro Últimos 3 días (incluye sale-today-1 + sale-2days-ago)
    const range3d = buildReportDateRange('3d', undefined, undefined, fixedNow);
    const data3d = await reportsRepository.getPeriodReportData(range3d);
    expect(data3d.summary.totalTransactions).toBe(2);
    expect(data3d.summary.totalSales).toBe(21000);
    expect(data3d.summary.cashSales).toBe(16000);
    expect(data3d.summary.transferSales).toBe(5000);
    expect(data3d.summary.physicalProfit).toBe(2700);
    expect(data3d.summary.totalProfit).toBe(6200);
    expect(data3d.topProducts).toHaveLength(3);

    // 3) Probar filtro Último mes (30d) (incluye las 3 ventas)
    const range30d = buildReportDateRange('30d', undefined, undefined, fixedNow);
    const data30d = await reportsRepository.getPeriodReportData(range30d);
    expect(data30d.summary.totalTransactions).toBe(3);
    expect(data30d.summary.totalSales).toBe(33000);
    expect(data30d.summary.physicalProfit).toBe(6700);
    expect(data30d.summary.totalProfit).toBe(10200);

    // Verificar resumen por Caja Principal (RF27 / RF28)
    const principalSummary = data30d.cashRegisterSummaries.find((s) => s.register.isPrincipal);
    expect(principalSummary).toBeDefined();
    expect(principalSummary?.totalSales).toBe(33000);
    expect(principalSummary?.totalProfit).toBe(6700);
  });
});
