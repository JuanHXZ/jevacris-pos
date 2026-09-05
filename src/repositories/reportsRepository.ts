import { db } from '../db';
import type { DailySummary, ExternalEarning, Sale, SaleItem } from '../types';

export interface WeeklyDayData {
  dayName: string;
  shortDay: string;
  dateStr: string;
  totalSales: number;
  isCurrentDay: boolean;
}

export const reportsRepository = {
  async getDailySummary(dateString?: string): Promise<DailySummary> {
    // Formato YYYY-MM-DD
    const targetDate = dateString || new Date().toISOString().split('T')[0];

    const allSales = await db.sales.toArray();
    const todaySales = allSales.filter((s) => s.saleDate.startsWith(targetDate));

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
    const todaySaleIds = new Set(todaySales.map((s) => s.id));
    const allSaleItems = await db.saleItems.toArray();
    const todayPhysicalItems = allSaleItems.filter(
      (item) => todaySaleIds.has(item.saleId) && item.productType === 'physical'
    );

    const physicalProfit = todayPhysicalItems.reduce((sum, item) => sum + item.profit, 0);

    // Ganancias de plataformas externas
    const allExternal = await db.externalEarnings.toArray();
    const todayExternal = allExternal.filter((e) => e.earningDate === targetDate);
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

  async getYesterdaySales(targetDateStr?: string): Promise<number> {
    const today = targetDateStr ? new Date(targetDateStr + 'T12:00:00') : new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const allSales = await db.sales.toArray();
    const yesterdaySales = allSales.filter((s) => s.saleDate.startsWith(yesterdayStr));
    return yesterdaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  },

  async getWeeklySalesData(referenceDate?: string): Promise<WeeklyDayData[]> {
    const ref = referenceDate ? new Date(referenceDate + 'T12:00:00') : new Date();
    const currentDayOfWeek = ref.getDay(); // 0 is Sunday, 1 is Monday...
    // Calculate Monday of this week
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + mondayOffset);

    const allSales = await db.sales.toArray();
    const days: WeeklyDayData[] = [];
    const dayNames = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
    const fullDayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const daySales = allSales.filter((s) => s.saleDate.startsWith(dateStr));
      const totalSales = daySales.reduce((sum, s) => sum + s.totalAmount, 0);

      days.push({
        dayName: fullDayNames[i],
        shortDay: dayNames[i],
        dateStr,
        totalSales,
        isCurrentDay: dateStr === todayStr
      });
    }

    return days;
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
  },

  async getDayTransactions(dateString?: string): Promise<Sale[]> {
    const targetDate = dateString || new Date().toISOString().split('T')[0];
    const allSales = await db.sales.toArray();
    const daySales = allSales
      .filter((s) => s.saleDate.startsWith(targetDate))
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

    const daySaleIds = new Set(daySales.map((s) => s.id));
    const allSaleItems = await db.saleItems.toArray();
    const daySaleItems = allSaleItems.filter((item) => daySaleIds.has(item.saleId));

    const itemsBySaleId = new Map<string, SaleItem[]>();
    for (const item of daySaleItems) {
      if (!itemsBySaleId.has(item.saleId)) {
        itemsBySaleId.set(item.saleId, []);
      }
      itemsBySaleId.get(item.saleId)!.push(item);
    }

    return daySales.map((s) => ({
      ...s,
      items: itemsBySaleId.get(s.id) || s.items || []
    }));
  }
};
