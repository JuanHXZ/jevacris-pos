import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, seedInitialDataIfNeeded } from '../../db';
import { debtsRepository } from '../debtsRepository';
import { reportsRepository } from '../reportsRepository';
import { cashSessionRepository } from '../cashSessionRepository';
import { NoOpenSessionError } from '../salesRepository';
import { getLocalDateString } from '../../utils/date';
import { PRINCIPAL_CASH_REGISTER_ID, type Product } from '../../types';

vi.mock('../../sync/syncEngine', () => ({
  syncEngine: { sync: vi.fn().mockResolvedValue(undefined) }
}));

describe('debtsRepository & reportsRepository (RF18 - Préstamos y Fiados)', () => {
  const nowIso = new Date().toISOString();

  const physicalProduct: Product = {
    id: 'prod-physical-test-1',
    name: 'Detergente Líquido 1L',
    categoryId: 'cat-aseo-hogar',
    type: 'physical',
    unit: 'litro',
    costPrice: 6000,
    marginPercentage: 40,
    salePrice: 10000,
    currentStock: 10,
    minStockAlert: 2,
    cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const serviceProduct: Product = {
    id: 'prod-service-test-1',
    name: 'Recarga Móvil Claro',
    categoryId: 'cat-servicios-recargas',
    type: 'service',
    unit: 'recarga',
    costPrice: 4800,
    marginPercentage: 0,
    salePrice: 5000,
    currentStock: 0,
    minStockAlert: 0,
    cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedInitialDataIfNeeded();
    await db.products.bulkPut([physicalProduct, serviceProduct]);
  });

  it('1. El día del fiado descuenta stock físico, soporta servicios y NO registra venta cuando no hay abono inicial', async () => {
    const createdDebt = await debtsRepository.createDebt({
      debtorName: 'María Fernanda Gómez',
      debtorPhone: '3124589012',
      dueDate: '2026-12-31',
      notes: 'Vecina apto 302',
      cartItems: [
        {
          product: physicalProduct,
          quantity: 2,
          subtotal: 20000 // 2 * 10000
        },
        {
          product: serviceProduct,
          quantity: 1,
          subtotal: 5000 // Recarga de 5000
        }
      ]
    });

    expect(createdDebt.debtorName).toBe('María Fernanda Gómez');
    expect(createdDebt.totalAmount).toBe(25000);
    expect(createdDebt.paidAmount).toBe(0);
    expect(createdDebt.remainingAmount).toBe(25000);
    expect(createdDebt.status).toBe('pending');
    expect(createdDebt.items).toHaveLength(2);

    // Verificar que el stock del producto físico bajó de 10 a 8
    const updatedPhys = await db.products.get(physicalProduct.id);
    expect(updatedPhys?.currentStock).toBe(8);

    // Verificar que el producto servicio sigue en 0 sin error
    const updatedSrv = await db.products.get(serviceProduct.id);
    expect(updatedSrv?.currentStock).toBe(0);

    // Verificar que NO se creó ninguna venta el día del fiado
    const allSales = await db.sales.toArray();
    expect(allSales).toHaveLength(0);

    // Verificar el resumen diario de reportes
    const todaySummary = await reportsRepository.getDailySummary(getLocalDateString());
    expect(todaySummary.totalSales).toBe(0);
    expect(todaySummary.debtsGivenAmount).toBe(25000);
    expect(todaySummary.debtsGivenCount).toBe(1);
    expect(todaySummary.debtsPendingFromDay).toBe(25000);
    expect(todaySummary.totalActiveReceivables).toBe(25000);
  });

  it('2. Exige sesión de caja abierta al registrar un abono y con sesión abierta registra abono parcial + venta proporcional sin volver a descontar stock', async () => {
    const debt = await debtsRepository.createDebt({
      debtorName: 'Carlos Andrés Ruiz',
      cartItems: [
        {
          product: physicalProduct,
          quantity: 2,
          subtotal: 20000 // Costo total: 12000, Ganancia total: 8000
        }
      ]
    });

    // Sin sesión de caja abierta debe lanzar NoOpenSessionError
    await expect(
      debtsRepository.registerPayment({
        debtId: debt.id,
        amount: 10000,
        paymentMethod: 'cash'
      })
    ).rejects.toThrow(NoOpenSessionError);

    // Abrimos sesión de caja
    await cashSessionRepository.open(50000);

    // Registramos abono parcial del 50% ($10.000 de $20.000)
    const partialResult = await debtsRepository.registerPayment({
      debtId: debt.id,
      amount: 10000,
      paymentMethod: 'cash',
      notes: 'Primer abono mitad'
    });

    expect(partialResult.updatedDebt.status).toBe('partial');
    expect(partialResult.updatedDebt.paidAmount).toBe(10000);
    expect(partialResult.updatedDebt.remainingAmount).toBe(10000);
    expect(partialResult.payment.amount).toBe(10000);
    expect(partialResult.generatedSale.totalAmount).toBe(10000);
    expect(partialResult.generatedSale.debtId).toBe(debt.id);

    // Verificar que el stock NO se volvió a descontar (se mantiene en 8)
    const prodAfterPartial = await db.products.get(physicalProduct.id);
    expect(prodAfterPartial?.currentStock).toBe(8);

    // Verificar que la ganancia de la venta creada es proporcional (50% de 8000 = 4000)
    const saleItems = await db.saleItems.where('saleId').equals(partialResult.generatedSale.id).toArray();
    expect(saleItems).toHaveLength(1);
    expect(saleItems[0].subtotal).toBe(10000);
    expect(saleItems[0].profit).toBe(4000);

    // Ahora liquidamos el 50% restante ($10.000)
    const finalResult = await debtsRepository.registerPayment({
      debtId: debt.id,
      amount: 10000,
      paymentMethod: 'cash',
      notes: 'Pago final'
    });

    expect(finalResult.updatedDebt.status).toBe('paid');
    expect(finalResult.updatedDebt.paidAmount).toBe(20000);
    expect(finalResult.updatedDebt.remainingAmount).toBe(0);
    expect(finalResult.updatedDebt.paidAt).toBeDefined();

    // Verificar reporte del día tras recaudar los $20.000
    const summaryAfterPaid = await reportsRepository.getDailySummary(getLocalDateString());
    expect(summaryAfterPaid.totalSales).toBe(20000);
    expect(summaryAfterPaid.physicalProfit).toBe(8000);
    expect(summaryAfterPaid.debtPaymentsCollected).toBe(20000);
    expect(summaryAfterPaid.totalActiveReceivables).toBe(0);
  });
});
