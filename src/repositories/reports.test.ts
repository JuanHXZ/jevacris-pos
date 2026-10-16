import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, seedInitialDataIfNeeded } from '../db';
import { reportsRepository } from './reportsRepository';
import { cashSessionRepository } from './cashSessionRepository';
import { salesRepository } from './salesRepository';
import { toLocalDateString, getLocalDateString } from '../utils/date';

vi.mock('../sync/syncEngine', () => ({
  syncEngine: { sync: vi.fn().mockResolvedValue(undefined) }
}));

async function resetDb() {
  await db.delete();
  await db.open();
  await seedInitialDataIfNeeded();
}

describe('reportes y zona horaria de ventas nocturnas', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('toLocalDateString extrae la fecha del dispositivo local sin desfase UTC', () => {
    const d = new Date(2026, 8, 8, 19, 27, 47); // 8 de Septiembre 2026, 7:27 PM local
    expect(toLocalDateString(d)).toBe('2026-09-08');
    expect(getLocalDateString(d)).toBe('2026-09-08');
  });

  it('incluye una venta de las 7:27 PM en el reporte del mismo día (no del día siguiente)', async () => {
    await cashSessionRepository.open(50000, 'Turno noche');
    const product = (await db.products.toArray())[0];

    // Simular venta a las 7:27 PM hora local (fecha local: 2026-09-08)
    const localEveningDate = new Date(2026, 8, 8, 19, 27, 47);
    const localDateStr = getLocalDateString(localEveningDate); // "2026-09-08"

    const sale = await salesRepository.processSale({
      cartItems: [{ product, quantity: 2, subtotal: product.salePrice * 2 }],
      paymentMethod: 'transfer',
      amountReceived: product.salePrice * 2
    });

    // Actualizar saleDate con el ISO string equivalente a esa hora nocturna
    const isoString = localEveningDate.toISOString();
    await db.sales.update(sale.id, { saleDate: isoString });

    // El reporte del día de la venta debe incluir la transacción
    const sameDaySummary = await reportsRepository.getDailySummary(localDateStr);
    expect(sameDaySummary.totalTransactions).toBe(1);
    expect(sameDaySummary.totalSales).toBe(product.salePrice * 2);

    // El reporte del día siguiente NO debe incluir la transacción
    const nextDay = new Date(localEveningDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = getLocalDateString(nextDay); // "2026-09-09"

    const nextDaySummary = await reportsRepository.getDailySummary(nextDayStr);
    expect(nextDaySummary.totalTransactions).toBe(0);
    expect(nextDaySummary.totalSales).toBe(0);

    // getDayTransactions también debe devolver la venta para el día correcto
    const dayTransactions = await reportsRepository.getDayTransactions(localDateStr);
    expect(dayTransactions.length).toBe(1);
    expect(dayTransactions[0].id).toBe(sale.id);

    const nextDayTransactions = await reportsRepository.getDayTransactions(nextDayStr);
    expect(nextDayTransactions.length).toBe(0);
  });
});

