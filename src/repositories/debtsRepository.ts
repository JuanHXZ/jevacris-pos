import { db } from '../db';
import { syncEngine } from '../sync/syncEngine';
import type {
  CartItem,
  Debt,
  DebtItem,
  DebtPayment,
  DebtorQuickFilter,
  DebtsKpiSummary,
  DebtStatus,
  DebtWithDetails,
  PaymentMethod,
  Sale,
  SaleItem
} from '../types';
import { PRINCIPAL_CASH_REGISTER_ID } from '../types';
import { cashSessionRepository } from './cashSessionRepository';
import { cashRegisterRepository } from './cashRegisterRepository';
import { NoOpenSessionError } from './salesRepository';
import { createEntityId } from '../utils/ids';
import { ensurePrincipalCashRegister } from '../db/cashBootstrap';
import { getLocalDateString } from '../utils/date';

/**
 * Calcula los días restantes hasta la fecha límite (negativo si ya venció).
 */
export function computeDaysUntilDue(dueDateStr?: string, todayStr = getLocalDateString()): number | null {
  if (!dueDateStr) return null;
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [dy, dm, dd] = dueDateStr.split('-').map(Number);
  const todayDate = new Date(ty, (tm || 1) - 1, td || 1, 12, 0, 0, 0);
  const dueDate = new Date(dy, (dm || 1) - 1, dd || 1, 12, 0, 0, 0);
  if (isNaN(todayDate.getTime()) || isNaN(dueDate.getTime())) return null;
  const diffMs = dueDate.getTime() - todayDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export const debtsRepository = {
  /**
   * Crea un nuevo Ticket de Fiado / Préstamo:
   * - Descuenta inmediatamente del stock los productos físicos.
   * - NO registra venta en `sales` por el saldo fiado (solo se registrará venta cuando el cliente abone/pague).
   * - Si incluye un abono inicial (> 0), procesa ese abono inmediatamente contra la sesión de caja abierta.
   */
  async createDebt(params: {
    cartItems: CartItem[];
    debtorName: string;
    debtorPhone?: string;
    dueDate?: string;
    notes?: string;
    initialPaymentAmount?: number;
    initialPaymentMethod?: PaymentMethod;
  }): Promise<DebtWithDetails> {
    const {
      cartItems,
      debtorName,
      debtorPhone,
      dueDate,
      notes,
      initialPaymentAmount = 0,
      initialPaymentMethod = 'cash'
    } = params;

    const cleanName = debtorName.trim();
    if (!cleanName) {
      throw new Error('Debes ingresar el nombre del cliente o familiar.');
    }
    if (cartItems.length === 0) {
      throw new Error('Debes agregar al menos un producto o servicio al fiado.');
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    if (totalAmount <= 0) {
      throw new Error('El valor total del fiado debe ser mayor a $0.');
    }
    if (initialPaymentAmount < 0 || initialPaymentAmount > totalAmount) {
      throw new Error('El abono inicial no puede superar el valor total del fiado.');
    }

    // Si hay abono inicial, validamos que exista sesión de caja abierta antes de iniciar
    const openSession = await cashSessionRepository.getOpenSession();
    if (initialPaymentAmount > 0 && !openSession) {
      throw new NoOpenSessionError();
    }

    await ensurePrincipalCashRegister({
      cashRegisters: db.cashRegisters,
      cashRegisterDistributionLines: db.cashRegisterDistributionLines,
      products: db.products
    });

    const principal = await cashRegisterRepository.getPrincipal();
    const now = new Date().toISOString();
    const debtId = createEntityId('debt');

    // Generar folio consecutivo legible (#CR-0001)
    const existingCount = await db.debts.count();
    const folioNumber = existingCount + 1;
    const folio = `#CR-${String(folioNumber).padStart(4, '0')}`;

    const debtItems: DebtItem[] = cartItems.map((item) => {
      const isPhysical = item.product.type === 'physical';
      const unitCost = isPhysical ? item.product.costPrice : 0;
      const unitPrice = item.customPrice ?? item.product.salePrice;
      const profit = isPhysical ? Math.round(item.quantity * (unitPrice - unitCost)) : 0;

      return {
        id: createEntityId('ditem'),
        debtId,
        productId: item.product.id,
        productName: item.product.name,
        productType: item.product.type,
        unit: item.product.unit || 'unidad',
        quantity: item.quantity,
        unitPrice,
        unitCost,
        subtotal: item.subtotal,
        profit,
        cashRegisterId: item.product.cashRegisterId || principal.id || PRINCIPAL_CASH_REGISTER_ID,
        createdAt: now
      };
    });

    const totalProfit = debtItems.reduce((sum, item) => sum + item.profit, 0);

    const newDebt: Debt = {
      id: debtId,
      folio,
      debtorName: cleanName,
      debtorPhone: debtorPhone?.trim() || undefined,
      totalAmount,
      totalProfit,
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'pending',
      dueDate: dueDate?.trim() || undefined,
      notes: notes?.trim() || undefined,
      cashSessionId: openSession?.id,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    await db.transaction('rw', [db.debts, db.debtItems, db.products], async () => {
      await db.debts.add(newDebt);
      await db.debtItems.bulkAdd(debtItems);

      // Descontar inmediatamente del inventario los productos físicos
      for (const item of cartItems) {
        if (item.product.type === 'physical') {
          const prod = await db.products.get(item.product.id);
          if (prod) {
            const newStock = Math.max(0, parseFloat((prod.currentStock - item.quantity).toFixed(3)));
            await db.products.update(prod.id, {
              currentStock: newStock,
              updatedAt: now,
              synced: false
            });
          }
        }
      }
    });

    if (initialPaymentAmount > 0) {
      await this.registerPayment({
        debtId,
        amount: initialPaymentAmount,
        paymentMethod: initialPaymentMethod,
        notes: 'Abono inicial al entregar fiado'
      });
    } else {
      syncEngine.sync().catch((err) => console.warn('[DebtsSync] Auto-sync falló:', err));
    }

    const created = await this.getDebtById(debtId);
    if (!created) {
      throw new Error('Error al recuperar el fiado recién creado.');
    }
    return created;
  },

  /**
   * Registra un abono parcial o pago total sobre un fiado:
   * - Exige que exista una sesión de caja abierta (`cash_sessions`).
   * - Crea el registro en `debt_payments` y actualiza el saldo y estado del fiado (`partial` o `paid`).
   * - Genera automáticamente la venta proporcional en `sales` + `sale_items` en la fecha del pago
   *   SIN volver a descontar stock (ya que el stock se descontó el día que se entregó el fiado).
   */
  async registerPayment(params: {
    debtId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): Promise<{ payment: DebtPayment; updatedDebt: DebtWithDetails; generatedSale: Sale }> {
    const { debtId, amount, paymentMethod, notes } = params;

    const openSession = await cashSessionRepository.getOpenSession();
    if (!openSession) {
      throw new NoOpenSessionError();
    }

    const debt = await db.debts.get(debtId);
    if (!debt) {
      throw new Error('No se encontró el registro del fiado.');
    }
    if (debt.status === 'paid' || debt.remainingAmount <= 0) {
      throw new Error('Este fiado ya se encuentra completamente saldado.');
    }

    const cleanAmount = Math.round(amount);
    if (cleanAmount <= 0) {
      throw new Error('El monto del abono debe ser mayor a $0.');
    }
    if (cleanAmount > debt.remainingAmount) {
      throw new Error(`El abono no puede superar el saldo pendiente (${debt.remainingAmount}).`);
    }

    const debtItems = await db.debtItems.where('debtId').equals(debtId).toArray();
    const now = new Date().toISOString();
    const paymentId = createEntityId('dpay');
    const saleId = createEntityId('sale');

    const newPaidAmount = debt.paidAmount + cleanAmount;
    const newRemaining = Math.max(0, debt.totalAmount - newPaidAmount);
    const newStatus: DebtStatus = newRemaining === 0 ? 'paid' : 'partial';

    const ratio = debt.totalAmount > 0 ? cleanAmount / debt.totalAmount : 1;

    // Construir sale_items proporcionales sin descontar stock
    let accumulatedSubtotal = 0;
    const generatedSaleItems: SaleItem[] = debtItems.map((dItem, index) => {
      const isLast = index === debtItems.length - 1;
      const itemSubtotal = isLast
        ? Math.max(0, cleanAmount - accumulatedSubtotal)
        : Math.round(dItem.subtotal * ratio);
      accumulatedSubtotal += itemSubtotal;

      const itemProfit = dItem.productType === 'physical' ? Math.round(dItem.profit * ratio) : 0;
      const proportionalQty = parseFloat(Math.max(0.001, dItem.quantity * ratio).toFixed(3));

      return {
        id: createEntityId('sitem'),
        saleId,
        productId: dItem.productId,
        productName: `${dItem.productName} (${newStatus === 'paid' && debt.paidAmount === 0 ? 'Pago Fiado' : 'Abono Fiado'} ${debt.folio})`,
        productType: dItem.productType,
        quantity: proportionalQty,
        unitPrice: dItem.unitPrice,
        unitCost: dItem.unitCost,
        subtotal: itemSubtotal,
        profit: itemProfit,
        cashRegisterId: dItem.cashRegisterId || PRINCIPAL_CASH_REGISTER_ID,
        createdAt: now
      };
    });

    const paymentTypeLabel = newStatus === 'paid' ? 'Liquidación total' : 'Abono parcial';
    const saleNoteParts = [
      `${paymentTypeLabel} fiado ${debt.folio} — Cliente: ${debt.debtorName}`,
      notes?.trim()
    ].filter(Boolean);

    const generatedSale: Sale = {
      id: saleId,
      saleDate: now,
      totalAmount: cleanAmount,
      paymentMethod,
      amountReceived: cleanAmount,
      changeGiven: 0,
      cashSessionId: openSession.id,
      debtId: debt.id,
      debtPaymentId: paymentId,
      notes: saleNoteParts.join(' | '),
      createdAt: now,
      updatedAt: now,
      synced: false,
      items: generatedSaleItems
    };

    const newPayment: DebtPayment = {
      id: paymentId,
      debtId: debt.id,
      amount: cleanAmount,
      paymentMethod,
      paidAt: now,
      cashSessionId: openSession.id,
      generatedSaleId: saleId,
      notes: notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    await db.transaction('rw', [db.debts, db.debtPayments, db.sales, db.saleItems], async () => {
      await db.sales.add(generatedSale);
      if (generatedSaleItems.length > 0) {
        await db.saleItems.bulkAdd(generatedSaleItems);
      }
      await db.debtPayments.add(newPayment);
      await db.debts.update(debt.id, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining,
        status: newStatus,
        paidAt: newStatus === 'paid' ? now : undefined,
        updatedAt: now,
        synced: false
      });
    });

    syncEngine.sync().catch((err) => console.warn('[DebtsSync] Auto-sync falló:', err));

    const updatedDebt = await this.getDebtById(debt.id);
    if (!updatedDebt) {
      throw new Error('No se pudo cargar el fiado actualizado.');
    }

    return {
      payment: newPayment,
      updatedDebt,
      generatedSale
    };
  },

  async getAllWithDetails(): Promise<DebtWithDetails[]> {
    const [allDebts, allItems, allPayments] = await Promise.all([
      db.debts.toArray(),
      db.debtItems.toArray(),
      db.debtPayments.toArray()
    ]);

    const itemsByDebtId = new Map<string, DebtItem[]>();
    for (const item of allItems) {
      if (!itemsByDebtId.has(item.debtId)) {
        itemsByDebtId.set(item.debtId, []);
      }
      itemsByDebtId.get(item.debtId)!.push(item);
    }

    const paymentsByDebtId = new Map<string, DebtPayment[]>();
    for (const pay of allPayments) {
      if (!paymentsByDebtId.has(pay.debtId)) {
        paymentsByDebtId.set(pay.debtId, []);
      }
      paymentsByDebtId.get(pay.debtId)!.push(pay);
    }

    const todayStr = getLocalDateString();

    return allDebts
      .map((debt) => {
        const items = itemsByDebtId.get(debt.id) || [];
        const payments = (paymentsByDebtId.get(debt.id) || []).sort(
          (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
        );
        const daysUntilDue = debt.status === 'paid' ? null : computeDaysUntilDue(debt.dueDate, todayStr);
        const isOverdue = debt.status !== 'paid' && daysUntilDue !== null && daysUntilDue < 0;

        return {
          ...debt,
          items,
          payments,
          daysUntilDue,
          isOverdue
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getDebtById(debtId: string): Promise<DebtWithDetails | null> {
    const debt = await db.debts.get(debtId);
    if (!debt) return null;

    const [items, payments] = await Promise.all([
      db.debtItems.where('debtId').equals(debtId).toArray(),
      db.debtPayments.where('debtId').equals(debtId).toArray()
    ]);

    payments.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    const todayStr = getLocalDateString();
    const daysUntilDue = debt.status === 'paid' ? null : computeDaysUntilDue(debt.dueDate, todayStr);
    const isOverdue = debt.status !== 'paid' && daysUntilDue !== null && daysUntilDue < 0;

    return {
      ...debt,
      items,
      payments,
      daysUntilDue,
      isOverdue
    };
  },

  async getKpiSummary(): Promise<DebtsKpiSummary> {
    const debts = await this.getAllWithDetails();
    const allPayments = await db.debtPayments.toArray();

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeDebts = debts.filter((d) => d.status !== 'paid');
    const totalReceivable = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const activeCount = activeDebts.length;

    const collectedThisMonth = allPayments
      .filter((p) => {
        const dStr = getLocalDateString(new Date(p.paidAt));
        return dStr.startsWith(currentMonthPrefix);
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const settledThisMonthCount = debts.filter((d) => {
      if (d.status !== 'paid' || !d.paidAt) return false;
      const dStr = getLocalDateString(new Date(d.paidAt));
      return dStr.startsWith(currentMonthPrefix);
    }).length;

    const overdueCount = activeDebts.filter((d) => d.isOverdue).length;
    const upcomingDueCount = activeDebts.filter(
      (d) => !d.isOverdue && d.daysUntilDue !== null && d.daysUntilDue >= 0 && d.daysUntilDue <= 3
    ).length;

    const totalHistoricalLoaned = debts.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalHistoricalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
    const recoveryRate =
      totalHistoricalLoaned > 0
        ? Math.min(100, parseFloat(((totalHistoricalPaid / totalHistoricalLoaned) * 100).toFixed(1)))
        : 100;

    return {
      totalReceivable,
      activeCount,
      collectedThisMonth,
      settledThisMonthCount,
      overdueCount,
      upcomingDueCount,
      recoveryRate
    };
  },

  async getDistinctDebtors(): Promise<DebtorQuickFilter[]> {
    const debts = await db.debts.toArray();
    const map = new Map<string, DebtorQuickFilter>();

    for (const d of debts) {
      const key = d.debtorName.trim().toLowerCase();
      const existing = map.get(key);
      const isActive = d.status !== 'paid' && d.remainingAmount > 0;

      if (!existing) {
        map.set(key, {
          debtorName: d.debtorName.trim(),
          debtorPhone: d.debtorPhone,
          activeTicketsCount: isActive ? 1 : 0,
          totalTicketsCount: 1,
          totalPendingAmount: isActive ? d.remainingAmount : 0
        });
      } else {
        existing.totalTicketsCount += 1;
        if (isActive) {
          existing.activeTicketsCount += 1;
          existing.totalPendingAmount += d.remainingAmount;
        }
        if (!existing.debtorPhone && d.debtorPhone) {
          existing.debtorPhone = d.debtorPhone;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalPendingAmount !== a.totalPendingAmount) {
        return b.totalPendingAmount - a.totalPendingAmount;
      }
      return a.debtorName.localeCompare(b.debtorName);
    });
  }
};
