import { db } from '../db';
import { syncEngine } from '../sync/syncEngine';
import type { Sale, SaleItem, CartItem, PaymentMethod } from '../types';
import { NO_OPEN_SESSION_ERROR, PRINCIPAL_CASH_REGISTER_ID } from '../types';
import { cashSessionRepository } from './cashSessionRepository';
import { cashRegisterRepository } from './cashRegisterRepository';
import { createEntityId } from '../utils/ids';
import { ensurePrincipalCashRegister } from '../db/cashBootstrap';

export class NoOpenSessionError extends Error {
  readonly code = NO_OPEN_SESSION_ERROR;
  constructor() {
    super('Debes abrir caja para vender');
    this.name = 'NoOpenSessionError';
  }
}

export const salesRepository = {
  async processSale(params: {
    cartItems: CartItem[];
    paymentMethod: PaymentMethod;
    amountReceived: number;
    notes?: string;
  }): Promise<Sale> {
    const { cartItems, paymentMethod, amountReceived, notes } = params;
    const openSession = await cashSessionRepository.getOpenSession();
    if (!openSession) {
      throw new NoOpenSessionError();
    }

    await ensurePrincipalCashRegister({
      cashRegisters: db.cashRegisters,
      cashRegisterDistributionLines: db.cashRegisterDistributionLines,
      products: db.products
    });

    const principal = await cashRegisterRepository.getPrincipal();
    const now = new Date().toISOString();
    const saleId = createEntityId('sale');

    const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const changeGiven = paymentMethod === 'cash' ? Math.max(0, amountReceived - totalAmount) : 0;

    const saleItems: SaleItem[] = cartItems.map((item) => {
      const isPhysical = item.product.type === 'physical';
      const unitCost = isPhysical ? item.product.costPrice : 0;
      const unitPrice = item.customPrice ?? item.product.salePrice;
      const profit = isPhysical ? item.quantity * (unitPrice - unitCost) : 0;

      return {
        id: createEntityId('sitem'),
        saleId,
        productId: item.product.id,
        productName: item.product.name,
        productType: item.product.type,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        subtotal: item.subtotal,
        profit,
        cashRegisterId: item.product.cashRegisterId || principal.id || PRINCIPAL_CASH_REGISTER_ID,
        createdAt: now
      };
    });

    const newSale: Sale = {
      id: saleId,
      saleDate: now,
      totalAmount,
      paymentMethod,
      amountReceived: paymentMethod === 'cash' ? amountReceived : totalAmount,
      changeGiven,
      cashSessionId: openSession.id,
      notes,
      createdAt: now,
      updatedAt: now,
      synced: false,
      items: saleItems
    };

    await db.transaction('rw', [db.sales, db.saleItems, db.products], async () => {
      await db.sales.add(newSale);
      await db.saleItems.bulkAdd(saleItems);

      for (const item of cartItems) {
        if (item.product.type === 'physical') {
          const prod = await db.products.get(item.product.id);
          if (prod) {
            const newStock = Math.max(0, prod.currentStock - item.quantity);
            await db.products.update(prod.id, {
              currentStock: newStock,
              updatedAt: now,
              synced: false
            });
          }
        }
      }
    });

    syncEngine.sync().catch((err) => console.warn('[SalesSync] Auto-sync falló:', err));

    return newSale;
  },

  async getRecentSales(limit = 20): Promise<Sale[]> {
    const sales = await db.sales.orderBy('saleDate').reverse().limit(limit).toArray();
    return sales;
  },

  async getSaleDetails(saleId: string): Promise<{ sale: Sale; items: SaleItem[] } | null> {
    const sale = await db.sales.get(saleId);
    if (!sale) return null;
    const items = await db.saleItems.where('saleId').equals(saleId).toArray();
    return { sale, items };
  }
};
