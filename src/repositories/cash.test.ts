import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, seedInitialDataIfNeeded } from '../db';
import { cashRegisterRepository } from '../repositories/cashRegisterRepository';
import { cashSessionRepository } from '../repositories/cashSessionRepository';
import { salesRepository, NoOpenSessionError } from '../repositories/salesRepository';
import { PRINCIPAL_CASH_REGISTER_ID, type Product } from '../types';

vi.mock('../sync/syncEngine', () => ({
  syncEngine: { sync: vi.fn().mockResolvedValue(undefined) }
}));

async function resetDb() {
  await db.delete();
  await db.open();
  await seedInitialDataIfNeeded();
}

describe('caja y sesión POS', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('crea Caja Principal y asigna productos seed', async () => {
    const principal = await cashRegisterRepository.getPrincipal();
    expect(principal.id).toBe(PRINCIPAL_CASH_REGISTER_ID);
    const products = await db.products.toArray();
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => p.cashRegisterId === PRINCIPAL_CASH_REGISTER_ID)).toBe(true);
    const lines = await cashRegisterRepository.getDistribution(principal.id);
    const sum = lines.reduce((acc, l) => acc + l.percentage, 0);
    expect(sum).toBe(100);
  });

  it('rechaza distribución que no suma 100', async () => {
    await expect(
      cashRegisterRepository.create({
        name: 'Caja Dulces',
        lines: [
          { label: 'Inversiones', percentage: 60 },
          { label: 'Ahorros', percentage: 30 }
        ]
      })
    ).rejects.toThrow(/100/);
  });

  it('bloquea ventas sin sesión abierta', async () => {
    const product = (await db.products.toArray())[0];
    await expect(
      salesRepository.processSale({
        cartItems: [{ product, quantity: 1, subtotal: product.salePrice }],
        paymentMethod: 'cash',
        amountReceived: product.salePrice
      })
    ).rejects.toBeInstanceOf(NoOpenSessionError);
  });

  it('guarda snapshot de caja y calcula arqueo', async () => {
    const dulces = await cashRegisterRepository.create({
      name: 'Caja Dulces',
      lines: [
        { label: 'Inversiones', percentage: 60 },
        { label: 'Ahorros', percentage: 40 }
      ]
    });
    const session = await cashSessionRepository.open(10000);
    const product = (await db.products.toArray()).find((p) => p.type === 'physical') as Product;
    await db.products.update(product.id, { cashRegisterId: dulces.id });
    const updated = { ...product, cashRegisterId: dulces.id };

    await salesRepository.processSale({
      cartItems: [{ product: updated, quantity: 1, subtotal: 3000 }],
      paymentMethod: 'cash',
      amountReceived: 3000
    });

    await cashSessionRepository.addExpense({ category: 'other', amount: 1000, description: 'tinto' });

    const items = await db.saleItems.toArray();
    expect(items[0].cashRegisterId).toBe(dulces.id);

    const closed = await cashSessionRepository.close({ countedCash: 12100 });
    expect(closed.status).toBe('closed');
    expect(closed.closingCashCalculated).toBe(10000 + 3000 - 1000);
    expect(closed.difference).toBe(100);
    expect((await db.sales.toArray())[0].cashSessionId).toBe(session.id);
  });

  it('no permite borrar la caja principal', async () => {
    await expect(cashRegisterRepository.delete(PRINCIPAL_CASH_REGISTER_ID)).rejects.toThrow(/Principal/);
  });
});
