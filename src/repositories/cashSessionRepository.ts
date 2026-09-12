import { db } from '../db';
import type { CashSession, Expense, ExpenseCategory } from '../types';
import { createEntityId } from '../utils/ids';

export async function calculateExpectedClosingCash(sessionId: string, openingCash: number): Promise<{
  cashSalesTotal: number;
  expensesTotal: number;
  closingCashCalculated: number;
}> {
  const sales = await db.sales.where('cashSessionId').equals(sessionId).toArray();
  const cashSalesTotal = sales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const expenses = await db.expenses.where('cashSessionId').equals(sessionId).toArray();
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  return {
    cashSalesTotal,
    expensesTotal,
    closingCashCalculated: openingCash + cashSalesTotal - expensesTotal
  };
}

export const cashSessionRepository = {
  async getOpenSession(): Promise<CashSession | undefined> {
    return db.cashSessions.filter((s) => s.status === 'open').first();
  },

  async getLatest(): Promise<CashSession | undefined> {
    const all = await db.cashSessions.toArray();
    return all.sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];
  },

  async getExpenses(sessionId: string): Promise<Expense[]> {
    const rows = await db.expenses.where('cashSessionId').equals(sessionId).toArray();
    return rows.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  },

  async getArqueoPreview(sessionId: string): Promise<{
    session: CashSession;
    cashSalesTotal: number;
    expensesTotal: number;
    closingCashCalculated: number;
  }> {
    const session = await db.cashSessions.get(sessionId);
    if (!session) throw new Error('Sesión no encontrada');
    const totals = await calculateExpectedClosingCash(sessionId, session.openingCash);
    return { session, ...totals };
  },

  async open(openingCash: number, notes?: string): Promise<CashSession> {
    if (openingCash < 0) throw new Error('La base de apertura no puede ser negativa');
    const existing = await this.getOpenSession();
    if (existing) throw new Error('Ya hay una sesión de caja abierta');

    const now = new Date().toISOString();
    const session: CashSession = {
      id: createEntityId('csess'),
      openedAt: now,
      openingCash,
      status: 'open',
      notes: notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      synced: false
    };
    await db.cashSessions.add(session);
    return session;
  },

  async addExpense(params: {
    category: ExpenseCategory;
    amount: number;
    description?: string;
  }): Promise<Expense> {
    const session = await this.getOpenSession();
    if (!session) throw new Error('No hay una sesión abierta para registrar gastos');
    if (params.amount <= 0) throw new Error('El gasto debe ser mayor a $0');

    const now = new Date().toISOString();
    const expense: Expense = {
      id: createEntityId('exp'),
      cashSessionId: session.id,
      category: params.category,
      amount: params.amount,
      description: params.description?.trim() || undefined,
      expenseDate: now,
      createdAt: now,
      updatedAt: now,
      synced: false
    };
    await db.expenses.add(expense);
    return expense;
  },

  async close(params: { countedCash: number; notes?: string }): Promise<CashSession> {
    if (params.countedCash < 0) throw new Error('El efectivo contado no puede ser negativo');
    const session = await this.getOpenSession();
    if (!session) throw new Error('No hay una sesión abierta para cerrar');

    const totals = await calculateExpectedClosingCash(session.id, session.openingCash);
    const now = new Date().toISOString();
    const difference = params.countedCash - totals.closingCashCalculated;

    await db.cashSessions.update(session.id, {
      closedAt: now,
      closingCashCalculated: totals.closingCashCalculated,
      closingCashCounted: params.countedCash,
      difference,
      status: 'closed',
      notes: params.notes?.trim() || session.notes,
      updatedAt: now,
      synced: false
    });

    const closed = await db.cashSessions.get(session.id);
    if (!closed) throw new Error('No se pudo cerrar la sesión');
    return closed;
  }
};
