import { db } from '../db';
import type { DailySummary, ExternalEarning } from '../types';

export const reportsRepository = {
  async getDailySummary(dateString?: string): Promise<DailySummary> {
    // Formato YYYY-MM-DD
    const targetDate = dateString || new Date().toISOString().split('T')[0];

    const allSales = await db.sales.toArray();
    const todaySales = allSales.filter(s => s.saleDate.startsWith(targetDate));

    let cashSales = 0;
    let transferSales = 0;
    let totalSales = 0;

    for (const sale of todaySales) {
      totalSales += sale.totalAmount;
      if (sale.paymentMethod === 'cash') {
        cashSales += sale.totalAmount;
      } else {
        transferSales += sale.totalAmount;
      }
    }

    // Calcular ganancia solo de productos físicos
    const todaySaleIds = new Set(todaySales.map(s => s.id));
    const allSaleItems = await db.saleItems.toArray();
    const todayPhysicalItems = allSaleItems.filter(
      item => todaySaleIds.has(item.saleId) && item.productType === 'physical'
    );

    const physicalProfit = todayPhysicalItems.reduce((sum, item) => sum + item.profit, 0);

    // Ganancias de plataformas externas
    const allExternal = await db.externalEarnings.toArray();
    const todayExternal = allExternal.filter(e => e.earningDate === targetDate);
    const externalEarnings = todayExternal.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalTransactions: todaySales.length,
      totalSales,
      cashSales,
      transferSales,
      physicalProfit,
      externalEarnings,
      totalProfit: physicalProfit + externalEarnings
    };
  },

  async addExternalEarning(params: {
    earningDate: string;
    platformName: string;
    amount: number;
    notes?: string;
  }): Promise<ExternalEarning> {
    const now = new Date().toISOString();
    const id = `ext-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const earning: ExternalEarning = {
      id,
      earningDate: params.earningDate,
      platformName: params.platformName,
      amount: params.amount,
      notes: params.notes,
      createdAt: now,
      updatedAt: now,
      synced: false
    };
    await db.externalEarnings.add(earning);
    return earning;
  },

  async getExternalEarningsByDate(dateString?: string): Promise<ExternalEarning[]> {
    const targetDate = dateString || new Date().toISOString().split('T')[0];
    return await db.externalEarnings.where('earningDate').equals(targetDate).toArray();
  }
};
