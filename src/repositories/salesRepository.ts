import { db } from '../db';
import type { Sale, SaleItem, CartItem, PaymentMethod } from '../types';

export const salesRepository = {
  async processSale(params: {
    cartItems: CartItem[];
    paymentMethod: PaymentMethod;
    amountReceived: number;
    notes?: string;
  }): Promise<Sale> {
    const { cartItems, paymentMethod, amountReceived, notes } = params;
    const now = new Date().toISOString();
    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const changeGiven = paymentMethod === 'cash' ? Math.max(0, amountReceived - totalAmount) : 0;

    const saleItems: SaleItem[] = cartItems.map(item => {
      const isPhysical = item.product.type === 'physical';
      const unitCost = isPhysical ? item.product.costPrice : 0;
      const unitPrice = item.customPrice ?? item.product.salePrice;
      // Regla estricta: servicios guardan profit = 0
      const profit = isPhysical ? item.quantity * (unitPrice - unitCost) : 0;

      return {
        id: `sitem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        saleId,
        productId: item.product.id,
        productName: item.product.name,
        productType: item.product.type,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        subtotal: item.subtotal,
        profit,
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
      notes,
      createdAt: now,
      updatedAt: now,
      synced: false,
      items: saleItems
    };

    // Transacción ACID local en Dexie
    await db.transaction('rw', [db.sales, db.saleItems, db.products], async () => {
      await db.sales.add(newSale);
      await db.saleItems.bulkAdd(saleItems);

      // Descontar inventario solo para productos físicos
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
