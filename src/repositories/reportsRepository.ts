import { db } from '../db';
import type {
  CashRegisterSummary,
  DailyBreakdownRow,
  DailySummary,
  DebtItem,
  DebtPayment,
  DebtWithDetails,
  EnrichedPeriodSale,
  ExternalEarning,
  PeriodReportData,
  ReportDateRange,
  Sale,
  SaleItem,
  TopProductRow
} from '../types';
import { PRINCIPAL_CASH_REGISTER_ID } from '../types';
import { cashRegisterRepository } from './cashRegisterRepository';
import { cashSessionRepository } from './cashSessionRepository';
import { computeDaysUntilDue } from './debtsRepository';
import { ensurePrincipalCashRegister } from '../db/cashBootstrap';
import {
  enumerateDateStringsBetween,
  getLocalDateString,
  isDateStrWithinRange,
  isIsoWithinRange,
  toLocalDateString
} from '../utils/date';

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
    const targetDate = dateString || getLocalDateString();

    const [allSales, allSaleItems, allExternal, allDebts, allDebtPayments] = await Promise.all([
      db.sales.toArray(),
      db.saleItems.toArray(),
      db.externalEarnings.toArray(),
      db.debts.toArray(),
      db.debtPayments.toArray()
    ]);

    const todaySales = allSales.filter((s) => toLocalDateString(s.saleDate) === targetDate);

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
    const todayPhysicalItems = allSaleItems.filter(
      (item) => todaySaleIds.has(item.saleId) && item.productType === 'physical'
    );

    const physicalProfit = todayPhysicalItems.reduce((sum, item) => sum + item.profit, 0);

    // Ganancias de plataformas externas
    const todayExternal = allExternal.filter((e) => e.earningDate === targetDate);
    const externalEarnings = todayExternal.reduce((sum, e) => sum + e.amount, 0);

    // Control de Fiados entregados en el día vs. Abonos recaudados en el día
    const todayDebts = allDebts.filter((d) => toLocalDateString(d.createdAt) === targetDate);
    const debtsGivenAmount = todayDebts.reduce((sum, d) => sum + d.totalAmount, 0);
    const debtsGivenCount = todayDebts.length;
    const debtsPendingFromDay = todayDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

    const todayDebtPayments = allDebtPayments.filter((p) => toLocalDateString(p.paidAt) === targetDate);
    const debtPaymentsCollected = todayDebtPayments.reduce((sum, p) => sum + p.amount, 0);

    const totalActiveReceivables = allDebts
      .filter((d) => d.status !== 'paid')
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    return {
      totalTransactions: todaySales.length,
      totalSales,
      cashSales,
      transferSales,
      physicalProfit,
      externalEarnings,
      totalProfit: physicalProfit + externalEarnings,
      debtsGivenAmount,
      debtsGivenCount,
      debtsPendingFromDay,
      debtPaymentsCollected,
      totalActiveReceivables
    };
  },

  async getYesterdaySales(targetDateStr?: string): Promise<number> {
    const today = targetDateStr ? new Date(targetDateStr + 'T12:00:00') : new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const allSales = await db.sales.toArray();
    const yesterdaySales = allSales.filter((s) => toLocalDateString(s.saleDate) === yesterdayStr);
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

    const todayStr = getLocalDateString();

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(d);

      const daySales = allSales.filter((s) => toLocalDateString(s.saleDate) === dateStr);
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
    const targetDate = dateString || getLocalDateString();
    return await db.externalEarnings.where('earningDate').equals(targetDate).toArray();
  },

  async getDayTransactions(dateString?: string): Promise<Sale[]> {
    const targetDate = dateString || getLocalDateString();
    const allSales = await db.sales.toArray();
    const daySales = allSales
      .filter((s) => toLocalDateString(s.saleDate) === targetDate)
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
  },

  async getCashRegisterSummaries(dateString?: string): Promise<CashRegisterSummary[]> {
    await ensurePrincipalCashRegister({
      cashRegisters: db.cashRegisters,
      cashRegisterDistributionLines: db.cashRegisterDistributionLines,
      products: db.products
    });
    const targetDate = dateString || getLocalDateString();
    const registers = await cashRegisterRepository.getAll(true);
    const allSales = await db.sales.toArray();
    const daySaleIds = new Set(allSales.filter((s) => toLocalDateString(s.saleDate) === targetDate).map((s) => s.id));
    const items = (await db.saleItems.toArray()).filter((item) => daySaleIds.has(item.saleId));

    const summaries: CashRegisterSummary[] = [];
    for (const register of registers.filter((r) => r.isActive !== false || r.isPrincipal)) {
      const registerItems = items.filter((item) => item.cashRegisterId === register.id);
      const totalSales = registerItems.reduce((sum, item) => sum + item.subtotal, 0);
      const totalProfit = registerItems.reduce((sum, item) => sum + item.profit, 0);
      const lines = await cashRegisterRepository.getDistribution(register.id);
      summaries.push({
        register,
        totalSales,
        totalProfit,
        distribution: lines.map((line) => ({
          line,
          suggestedAmount: totalSales * (line.percentage / 100)
        }))
      });
    }
    return summaries;
  },

  async getCashRegisterDetail(registerId: string, dateString?: string) {
    const summaries = await this.getCashRegisterSummaries(dateString);
    const summary = summaries.find((s) => s.register.id === registerId);
    const products = await db.products
      .filter((p) => p.isActive !== false && p.cashRegisterId === registerId)
      .toArray();
    return { summary, products };
  },

  async getOpenSession() {
    return cashSessionRepository.getOpenSession();
  },

  async getPeriodReportData(range: ReportDateRange): Promise<PeriodReportData> {
    await ensurePrincipalCashRegister({
      cashRegisters: db.cashRegisters,
      cashRegisterDistributionLines: db.cashRegisterDistributionLines,
      products: db.products
    });

    const [
      allSales,
      allSaleItems,
      allExternal,
      allSessions,
      allExpenses,
      registers,
      allDebts,
      allDebtItems,
      allDebtPayments
    ] = await Promise.all([
      db.sales.toArray(),
      db.saleItems.toArray(),
      db.externalEarnings.toArray(),
      db.cashSessions.toArray(),
      db.expenses.toArray(),
      cashRegisterRepository.getAll(true),
      db.debts.toArray(),
      db.debtItems.toArray(),
      db.debtPayments.toArray()
    ]);

    const registerNamesById: Record<string, string> = {};
    for (const r of registers) {
      registerNamesById[r.id] = r.name;
    }

    // 1. Filtrar ventas en el rango ISO
    const periodSales = allSales
      .filter((s) => isIsoWithinRange(s.saleDate, range.startIso, range.endIso))
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

    const periodSaleIds = new Set(periodSales.map((s) => s.id));
    const periodItems = allSaleItems.filter((item) => periodSaleIds.has(item.saleId));

    const itemsBySaleId = new Map<string, SaleItem[]>();
    for (const item of periodItems) {
      if (!itemsBySaleId.has(item.saleId)) {
        itemsBySaleId.set(item.saleId, []);
      }
      itemsBySaleId.get(item.saleId)!.push(item);
    }

    const salesWithItems: EnrichedPeriodSale[] = periodSales.map((sale) => ({
      ...sale,
      items: itemsBySaleId.get(sale.id) || sale.items || [],
      registerNamesById
    }));

    // 2. Filtrar ganancias externas en el rango de fechas (YYYY-MM-DD)
    const externalEarningsList = allExternal
      .filter((e) => isDateStrWithinRange(e.earningDate, range.startDateStr, range.endDateStr))
      .sort((a, b) => b.earningDate.localeCompare(a.earningDate));

    // 3. Filtrar sesiones de caja y gastos en el rango ISO
    const cashSessions = allSessions
      .filter((cs) => {
        const refIso = cs.closedAt || cs.openedAt;
        return isIsoWithinRange(refIso, range.startIso, range.endIso);
      })
      .sort((a, b) => new Date(b.closedAt || b.openedAt).getTime() - new Date(a.closedAt || a.openedAt).getTime());

    const expenses = allExpenses
      .filter((ex) => isIsoWithinRange(ex.expenseDate, range.startIso, range.endIso))
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

    // 3b. Filtrar fiados entregados y abonos en el período
    const debtItemsByDebtId = new Map<string, DebtItem[]>();
    for (const ditem of allDebtItems) {
      if (!debtItemsByDebtId.has(ditem.debtId)) {
        debtItemsByDebtId.set(ditem.debtId, []);
      }
      debtItemsByDebtId.get(ditem.debtId)!.push(ditem);
    }

    const debtPaymentsByDebtId = new Map<string, DebtPayment[]>();
    for (const dpay of allDebtPayments) {
      if (!debtPaymentsByDebtId.has(dpay.debtId)) {
        debtPaymentsByDebtId.set(dpay.debtId, []);
      }
      debtPaymentsByDebtId.get(dpay.debtId)!.push(dpay);
    }

    const todayStr = getLocalDateString();
    const enrichedAllDebts: DebtWithDetails[] = allDebts.map((debt) => {
      const daysUntilDue = debt.status === 'paid' ? null : computeDaysUntilDue(debt.dueDate, todayStr);
      const isOverdue = debt.status !== 'paid' && daysUntilDue !== null && daysUntilDue < 0;
      return {
        ...debt,
        items: debtItemsByDebtId.get(debt.id) || [],
        payments: debtPaymentsByDebtId.get(debt.id) || [],
        daysUntilDue,
        isOverdue
      };
    });

    const debtsInPeriod = enrichedAllDebts
      .filter((d) => isIsoWithinRange(d.createdAt, range.startIso, range.endIso))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const activeDebts = enrichedAllDebts
      .filter((d) => d.status !== 'paid')
      .sort((a, b) => b.remainingAmount - a.remainingAmount);

    const debtByIdMap = new Map(allDebts.map((d) => [d.id, d]));
    const debtPaymentsInPeriod = allDebtPayments
      .filter((p) => isIsoWithinRange(p.paidAt, range.startIso, range.endIso))
      .map((p) => {
        const parentDebt = debtByIdMap.get(p.debtId);
        return {
          ...p,
          debtorName: parentDebt?.debtorName || 'Cliente',
          folio: parentDebt?.folio || '#CR'
        };
      })
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    const debtsGivenAmount = debtsInPeriod.reduce((sum, d) => sum + d.totalAmount, 0);
    const debtsGivenCount = debtsInPeriod.length;
    const debtsPendingFromPeriod = debtsInPeriod.reduce((sum, d) => sum + d.remainingAmount, 0);
    const debtPaymentsCollected = debtPaymentsInPeriod.reduce((sum, p) => sum + p.amount, 0);
    const totalActiveReceivables = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

    // 4. Calcular métricas acumuladas (Summary)
    let cashSales = 0;
    let transferSales = 0;
    let totalSales = 0;

    for (const sale of periodSales) {
      totalSales += sale.totalAmount;
      if (sale.paymentMethod === 'cash') {
        cashSales += sale.totalAmount;
      } else {
        transferSales += sale.totalAmount;
      }
    }

    // Regla ADR-004: solo productos físicos generan profit directo en sale_items
    const physicalProfit = periodItems
      .filter((item) => item.productType === 'physical')
      .reduce((sum, item) => sum + item.profit, 0);

    const externalEarningsTotal = externalEarningsList.reduce((sum, e) => sum + e.amount, 0);
    const totalProfit = physicalProfit + externalEarningsTotal;
    const expensesTotal = expenses.reduce((sum, ex) => sum + ex.amount, 0);
    const netBalance = totalSales - expensesTotal;

    // 5. Construir desglose diario (dailyBreakdown)
    const allDatesInSpan = enumerateDateStringsBetween(range.startDateStr, range.endDateStr);
    const salesByDate = new Map<string, Sale[]>();
    for (const sale of periodSales) {
      const dStr = toLocalDateString(sale.saleDate);
      if (!salesByDate.has(dStr)) salesByDate.set(dStr, []);
      salesByDate.get(dStr)!.push(sale);
    }

    const externalByDate = new Map<string, number>();
    for (const ext of externalEarningsList) {
      externalByDate.set(ext.earningDate, (externalByDate.get(ext.earningDate) || 0) + ext.amount);
    }

    const debtsGivenByDate = new Map<string, number>();
    for (const debt of debtsInPeriod) {
      const dStr = toLocalDateString(debt.createdAt);
      debtsGivenByDate.set(dStr, (debtsGivenByDate.get(dStr) || 0) + debt.totalAmount);
    }

    const debtPaymentsByDate = new Map<string, number>();
    for (const pay of debtPaymentsInPeriod) {
      const dStr = toLocalDateString(pay.paidAt);
      debtPaymentsByDate.set(dStr, (debtPaymentsByDate.get(dStr) || 0) + pay.amount);
    }

    const dailyBreakdown: DailyBreakdownRow[] = allDatesInSpan
      .map((dateStr) => {
        const dSales = salesByDate.get(dateStr) || [];
        let dCash = 0;
        let dTransfer = 0;
        let dTotal = 0;
        let dPhysProfit = 0;

        for (const s of dSales) {
          dTotal += s.totalAmount;
          if (s.paymentMethod === 'cash') dCash += s.totalAmount;
          else dTransfer += s.totalAmount;

          const sItems = itemsBySaleId.get(s.id) || s.items || [];
          for (const it of sItems) {
            if (it.productType === 'physical') {
              dPhysProfit += it.profit;
            }
          }
        }

        const dExt = externalByDate.get(dateStr) || 0;
        const dDebtsGiven = debtsGivenByDate.get(dateStr) || 0;
        const dDebtPayments = debtPaymentsByDate.get(dateStr) || 0;

        return {
          dateStr,
          totalTransactions: dSales.length,
          cashSales: dCash,
          transferSales: dTransfer,
          totalSales: dTotal,
          physicalProfit: dPhysProfit,
          externalEarnings: dExt,
          totalProfit: dPhysProfit + dExt,
          debtsGivenAmount: dDebtsGiven,
          debtPaymentsCollected: dDebtPayments
        };
      })
      .filter(
        (row) =>
          allDatesInSpan.length <= 7 ||
          row.totalTransactions > 0 ||
          row.externalEarnings > 0 ||
          (row.debtsGivenAmount ?? 0) > 0
      );

    // 6. Construir ranking de productos vendidos (topProducts)
    const productStatsMap = new Map<string, TopProductRow>();
    for (const item of periodItems) {
      const regId = item.cashRegisterId || PRINCIPAL_CASH_REGISTER_ID;
      const regName = registerNamesById[regId] || 'Caja Principal';
      const existing = productStatsMap.get(item.productId);
      const itemProfit = item.productType === 'physical' ? item.profit : 0;

      if (!existing) {
        productStatsMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          productType: item.productType,
          cashRegisterName: regName,
          quantitySold: item.quantity,
          totalSales: item.subtotal,
          totalProfit: itemProfit
        });
      } else {
        existing.quantitySold += item.quantity;
        existing.totalSales += item.subtotal;
        existing.totalProfit += itemProfit;
      }
    }

    const topProducts = Array.from(productStatsMap.values()).sort((a, b) => b.totalSales - a.totalSales);

    // 7. Construir resumen y distribución por caja de facturación en el período (RF27 / RF28)
    const cashRegisterSummaries: CashRegisterSummary[] = [];
    for (const register of registers.filter((r) => r.isActive !== false || r.isPrincipal)) {
      const regItems = periodItems.filter(
        (item) => (item.cashRegisterId || PRINCIPAL_CASH_REGISTER_ID) === register.id
      );
      const regSales = regItems.reduce((sum, item) => sum + item.subtotal, 0);
      const regProfit = regItems
        .filter((item) => item.productType === 'physical')
        .reduce((sum, item) => sum + item.profit, 0);
      const lines = await cashRegisterRepository.getDistribution(register.id);

      cashRegisterSummaries.push({
        register,
        totalSales: regSales,
        totalProfit: regProfit,
        distribution: lines.map((line) => ({
          line,
          suggestedAmount: regSales * (line.percentage / 100)
        }))
      });
    }

    return {
      range,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTransactions: periodSales.length,
        totalSales,
        cashSales,
        transferSales,
        physicalProfit,
        externalEarnings: externalEarningsTotal,
        totalProfit,
        expensesTotal,
        netBalance,
        debtsGivenAmount,
        debtsGivenCount,
        debtsPendingFromDay: debtsPendingFromPeriod,
        debtsPendingFromPeriod,
        debtPaymentsCollected,
        totalActiveReceivables
      },
      dailyBreakdown,
      salesWithItems,
      topProducts,
      externalEarningsList,
      cashSessions,
      expenses,
      cashRegisterSummaries,
      debtsInPeriod,
      activeDebts,
      debtPaymentsInPeriod
    };
  },

  async getFullDatabaseBackup() {
    const [
      categories,
      products,
      sales,
      saleItems,
      stockEntries,
      externalEarnings,
      cashRegisters,
      cashRegisterDistributionLines,
      cashSessions,
      expenses,
      debts,
      debtItems,
      debtPayments
    ] = await Promise.all([
      db.categories.toArray(),
      db.products.toArray(),
      db.sales.toArray(),
      db.saleItems.toArray(),
      db.stockEntries.toArray(),
      db.externalEarnings.toArray(),
      db.cashRegisters.toArray(),
      db.cashRegisterDistributionLines.toArray(),
      db.cashSessions.toArray(),
      db.expenses.toArray(),
      db.debts.toArray(),
      db.debtItems.toArray(),
      db.debtPayments.toArray()
    ]);

    return {
      version: 3,
      appName: 'JEVACRIS POS & INVENTORY',
      exportedAt: new Date().toISOString(),
      data: {
        categories,
        products,
        sales,
        saleItems,
        stockEntries,
        externalEarnings,
        cashRegisters,
        cashRegisterDistributionLines,
        cashSessions,
        expenses,
        debts,
        debtItems,
        debtPayments
      }
    };
  }
};
