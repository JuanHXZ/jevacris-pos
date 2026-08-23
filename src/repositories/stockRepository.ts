import { db } from '../db';
import type { StockEntry } from '../types';

export const stockRepository = {
  async registerEntry(params: {
    productId: string;
    quantity: number;
    unitCost: number;
    updateProductCost?: boolean;
    notes?: string;
  }): Promise<StockEntry> {
    const { productId, quantity, unitCost, updateProductCost = true, notes } = params;
    const now = new Date().toISOString();
    const entryId = `stk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const entry: StockEntry = {
      id: entryId,
      productId,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      entryDate: now,
      notes,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    // Transacción local
    await db.transaction('rw', [db.stockEntries, db.products], async () => {
      await db.stockEntries.add(entry);

      const product = await db.products.get(productId);
      if (product) {
        const newStock = product.currentStock + quantity;
        const newCost = (updateProductCost && unitCost > 0) ? unitCost : product.costPrice;
        
        // Recalcular precio de venta si tiene margen % configurado y se actualizó el costo
        let newSalePrice = product.salePrice;
        if (updateProductCost && unitCost > 0 && product.marginPercentage > 0) {
          newSalePrice = Math.round(unitCost * (1 + product.marginPercentage / 100));
        }

        await db.products.update(productId, {
          currentStock: newStock,
          costPrice: newCost,
          salePrice: newSalePrice,
          updatedAt: now,
          synced: false
        });
      }
    });

    return entry;
  },

  async getRecentEntries(limit = 30): Promise<StockEntry[]> {
    return await db.stockEntries.orderBy('entryDate').reverse().limit(limit).toArray();
  }
};
