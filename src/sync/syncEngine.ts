import { db, isDevMode } from '../db';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Sale, SaleItem } from '../types';
import { PRINCIPAL_CASH_REGISTER_ID } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'dev_mode' | 'unconfigured';

type SyncListener = (status: SyncStatus, lastSyncedAt?: Date) => void;

class SyncEngine {
  private status: SyncStatus = isDevMode() ? 'dev_mode' : (!isSupabaseConfigured ? 'unconfigured' : 'idle');
  private lastSyncedAt: Date | null = null;
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: number | null = null;
  private isSyncRunning = false;

  constructor() {
    // Escuchar cambios de conectividad
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!isDevMode()) this.sync();
      });
      window.addEventListener('offline', () => {
        if (!isDevMode()) this.setStatus('offline');
      });
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.lastSyncedAt || undefined);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach(fn => fn(status, this.lastSyncedAt || undefined));
  }

  public startPeriodicSync(intervalMs = 30000) {
    if (isDevMode()) {
      this.setStatus('dev_mode');
      return;
    }
    if (!isSupabaseConfigured) {
      this.setStatus('unconfigured');
      return;
    }
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.sync(); // Sincronización inicial
    this.syncInterval = window.setInterval(() => {
      this.sync();
    }, intervalMs);
  }

  public stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public async sync(): Promise<void> {
    if (isDevMode()) {
      console.info('[Modo Desarrollador] Sincronización con Supabase bloqueada para proteger la data de producción.');
      this.setStatus('dev_mode');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      this.setStatus('unconfigured');
      return;
    }

    if (!navigator.onLine || this.isSyncRunning) {
      if (!navigator.onLine) this.setStatus('offline');
      return;
    }

    this.isSyncRunning = true;
    this.setStatus('syncing');

    try {
      await this.syncCashRegisters();
      await this.syncDistributionLines();
      await this.syncCashSessions();
      await this.syncExpenses();
      await this.syncCategories();
      await this.syncProducts();
      await this.syncSales();
      await this.syncStockEntries();
      await this.syncExternalEarnings();

      this.lastSyncedAt = new Date();
      this.setStatus('synced');
    } catch (err) {
      console.error('Error durante la sincronización con Supabase:', err);
      this.setStatus('error');
    } finally {
      this.isSyncRunning = false;
    }
  }

  // --- Sub-métodos de sincronización por entidad ---

  private async syncCategories() {
    if (!supabase) return;

    // Subir pendientes locales
    const unsynced = await db.categories.filter(c => !c.synced).toArray();
    if (unsynced.length > 0) {
      const payload = unsynced.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        created_at: c.createdAt,
        updated_at: c.updatedAt
      }));
      const { error } = await supabase.from('categories').upsert(payload);
      if (!error) {
        for (const item of unsynced) {
          await db.categories.update(item.id, { synced: true });
        }
      }
    }

    // Descargar novedades de la nube
    const { data: cloudData, error } = await supabase.from('categories').select('*');
    if (!error && cloudData) {
      for (const row of cloudData) {
        const local = await db.categories.get(row.id);
        if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
          await db.categories.put({
            id: row.id,
            name: row.name,
            icon: row.icon,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          });
        }
      }
    }
  }

  private async syncProducts() {
    if (!supabase) return;

    // Subir pendientes locales
    const unsynced = await db.products.filter(p => !p.synced).toArray();
    if (unsynced.length > 0) {
      const payload = unsynced.map(p => ({
        id: p.id,
        name: p.name,
        category_id: p.categoryId || null,
        type: p.type,
        unit: p.unit,
        cost_price: p.costPrice,
        margin_percentage: p.marginPercentage,
        sale_price: p.salePrice,
        current_stock: p.currentStock,
        min_stock_alert: p.minStockAlert,
        is_active: p.isActive ? 1 : 0,
        cash_register_id: p.cashRegisterId || null,
        created_at: p.createdAt,
        updated_at: p.updatedAt
      }));
      const { error } = await supabase.from('products').upsert(payload);
      if (!error) {
        for (const item of unsynced) {
          await db.products.update(item.id, { synced: true });
        }
      }
    }

    // Descargar novedades de la nube
    const { data: cloudData, error } = await supabase.from('products').select('*');
    if (!error && cloudData) {
      for (const row of cloudData) {
        const local = await db.products.get(row.id);
        if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
          await db.products.put({
            id: row.id,
            name: row.name,
            categoryId: row.category_id,
            type: row.type,
            unit: row.unit,
            costPrice: row.cost_price,
            marginPercentage: row.margin_percentage,
            salePrice: row.sale_price,
            currentStock: row.current_stock,
            minStockAlert: row.min_stock_alert,
            cashRegisterId: row.cash_register_id || PRINCIPAL_CASH_REGISTER_ID,
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          });
        }
      }
    }
  }

  private async syncSales() {
    if (!supabase) return;

    // Subir ventas no sincronizadas
    const unsyncedSales = await db.sales.filter(s => !s.synced).toArray();
    if (unsyncedSales.length > 0) {
      for (const sale of unsyncedSales) {
        const items = await db.saleItems.where('saleId').equals(sale.id).toArray();

        const { error: saleError } = await supabase.from('sales').upsert({
          id: sale.id,
          sale_date: sale.saleDate,
          total_amount: sale.totalAmount,
          payment_method: sale.paymentMethod,
          amount_received: sale.amountReceived,
          change_given: sale.changeGiven,
          cash_session_id: sale.cashSessionId || null,
          notes: sale.notes || null,
          created_at: sale.createdAt,
          updated_at: sale.updatedAt
        });

        if (!saleError && items.length > 0) {
          const itemsPayload = items.map(item => ({
            id: item.id,
            sale_id: item.saleId,
            product_id: item.productId,
            product_name: item.productName,
            product_type: item.productType,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            unit_cost: item.unitCost,
            subtotal: item.subtotal,
            profit: item.profit,
            cash_register_id: item.cashRegisterId || null,
            created_at: item.createdAt
          }));
          await supabase.from('sale_items').upsert(itemsPayload);
        }

        if (!saleError) {
          await db.sales.update(sale.id, { synced: true });
        }
      }
    }

    // Descargar ventas desde la nube
    const { data: cloudSales, error } = await supabase.from('sales').select('*, sale_items(*)');
    if (!error && cloudSales) {
      for (const row of cloudSales) {
        const local = await db.sales.get(row.id);
        if (!local) {
          const sale: Sale = {
            id: row.id,
            saleDate: row.sale_date,
            totalAmount: row.total_amount,
            paymentMethod: row.payment_method,
            amountReceived: row.amount_received,
            changeGiven: row.change_given,
            cashSessionId: row.cash_session_id || undefined,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          };
          await db.sales.put(sale);

          if (row.sale_items && Array.isArray(row.sale_items)) {
            for (const itemRow of row.sale_items) {
              const item: SaleItem = {
                id: itemRow.id,
                saleId: itemRow.sale_id,
                productId: itemRow.product_id,
                productName: itemRow.product_name,
                productType: itemRow.product_type,
                quantity: itemRow.quantity,
                unitPrice: itemRow.unit_price,
                unitCost: itemRow.unit_cost,
                subtotal: itemRow.subtotal,
                profit: itemRow.profit,
                cashRegisterId: itemRow.cash_register_id || PRINCIPAL_CASH_REGISTER_ID,
                createdAt: itemRow.created_at
              };
              await db.saleItems.put(item);
            }
          }
        }
      }
    }
  }

  private async syncStockEntries() {
    if (!supabase) return;

    const unsynced = await db.stockEntries.filter(e => !e.synced).toArray();
    if (unsynced.length > 0) {
      const payload = unsynced.map(e => ({
        id: e.id,
        product_id: e.productId,
        quantity: e.quantity,
        unit_cost: e.unitCost,
        total_cost: e.totalCost,
        entry_date: e.entryDate,
        notes: e.notes || null,
        created_at: e.createdAt,
        updated_at: e.updatedAt
      }));
      const { error } = await supabase.from('stock_entries').upsert(payload);
      if (!error) {
        for (const item of unsynced) {
          await db.stockEntries.update(item.id, { synced: true });
        }
      }
    }

    const { data: cloudData, error } = await supabase.from('stock_entries').select('*');
    if (!error && cloudData) {
      for (const row of cloudData) {
        const local = await db.stockEntries.get(row.id);
        if (!local) {
          await db.stockEntries.put({
            id: row.id,
            productId: row.product_id,
            quantity: row.quantity,
            unitCost: row.unit_cost,
            totalCost: row.total_cost,
            entryDate: row.entry_date,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          });
        }
      }
    }
  }

  private async syncExternalEarnings() {
    if (!supabase) return;

    const unsynced = await db.externalEarnings.filter(e => !e.synced).toArray();
    if (unsynced.length > 0) {
      const payload = unsynced.map(e => ({
        id: e.id,
        earning_date: e.earningDate,
        platform_name: e.platformName,
        amount: e.amount,
        notes: e.notes || null,
        created_at: e.createdAt,
        updated_at: e.updatedAt
      }));
      const { error } = await supabase.from('external_earnings').upsert(payload);
      if (!error) {
        for (const item of unsynced) {
          await db.externalEarnings.update(item.id, { synced: true });
        }
      }
    }

    const { data: cloudData, error } = await supabase.from('external_earnings').select('*');
    if (!error && cloudData) {
      for (const row of cloudData) {
        const local = await db.externalEarnings.get(row.id);
        if (!local) {
          await db.externalEarnings.put({
            id: row.id,
            earningDate: row.earning_date,
            platformName: row.platform_name,
            amount: row.amount,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          });
        }
      }
    }
  }

  private async syncCashRegisters() {
    if (!supabase) return;
    const unsynced = await db.cashRegisters.filter((c) => !c.synced).toArray();
    if (unsynced.length > 0) {
      const payload = unsynced.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || null,
        is_principal: c.isPrincipal ? 1 : 0,
        is_active: c.isActive ? 1 : 0,
        created_at: c.createdAt,
        updated_at: c.updatedAt
      }));
      const { error } = await supabase.from('cash_registers').upsert(payload);
      if (!error) {
        for (const item of unsynced) {
          await db.cashRegisters.update(item.id, { synced: true });
        }
      }
    }

    const { data: cloudData, error } = await supabase.from('cash_registers').select('*');
    if (!error && cloudData) {
      for (const row of cloudData) {
        const local = await db.cashRegisters.get(row.id);
        if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
          await db.cashRegisters.put({
            id: row.id,
            name: row.name,
            description: row.description,
            isPrincipal: Boolean(row.is_principal),
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          });
        }
      }
    }
  }

  private async syncDistributionLines() {
    if (!supabase) return;
    const unsynced = await db.cashRegisterDistributionLines.filter((c) => !c.synced).toArray();
    if (unsynced.length > 0) {
      const payload = unsynced.map((c) => ({
        id: c.id,
        cash_register_id: c.cashRegisterId,
        label: c.label,
        percentage: c.percentage,
        sort_order: c.sortOrder,
        created_at: c.createdAt,
        updated_at: c.updatedAt
      }));
      const { error } = await supabase.from('cash_register_distribution_lines').upsert(payload);
      if (!error) {
        for (const item of unsynced) {
          await db.cashRegisterDistributionLines.update(item.id, { synced: true });
        }
      }
    }

    const { data: cloudData, error } = await supabase.from('cash_register_distribution_lines').select('*');
    if (!error && cloudData) {
      for (const row of cloudData) {
        const local = await db.cashRegisterDistributionLines.get(row.id);
        if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
          await db.cashRegisterDistributionLines.put({
            id: row.id,
            cashRegisterId: row.cash_register_id,
            label: row.label,
            percentage: row.percentage,
            sortOrder: row.sort_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          });
        }
      }
    }
  }

  private async syncCashSessions() {
    if (!supabase) return;
    const unsynced = await db.cashSessions.filter((c) => !c.synced).toArray();
    if (unsynced.length > 0) {
      const payload = unsynced.map((c) => ({
        id: c.id,
        opened_at: c.openedAt,
        closed_at: c.closedAt || null,
        opening_cash: c.openingCash,
        closing_cash_calculated: c.closingCashCalculated ?? null,
        closing_cash_counted: c.closingCashCounted ?? null,
        difference: c.difference ?? null,
        status: c.status,
        notes: c.notes || null,
        created_at: c.createdAt,
        updated_at: c.updatedAt
      }));
      const { error } = await supabase.from('cash_sessions').upsert(payload);
      if (!error) {
        for (const item of unsynced) {
          await db.cashSessions.update(item.id, { synced: true });
        }
      }
    }

    const { data: cloudData, error } = await supabase.from('cash_sessions').select('*');
    if (!error && cloudData) {
      for (const row of cloudData) {
        const local = await db.cashSessions.get(row.id);
        if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
          await db.cashSessions.put({
            id: row.id,
            openedAt: row.opened_at,
            closedAt: row.closed_at || undefined,
            openingCash: row.opening_cash,
            closingCashCalculated: row.closing_cash_calculated ?? undefined,
            closingCashCounted: row.closing_cash_counted ?? undefined,
            difference: row.difference ?? undefined,
            status: row.status,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          });
        }
      }
    }
  }

  private async syncExpenses() {
    if (!supabase) return;
    const unsynced = await db.expenses.filter((c) => !c.synced).toArray();
    if (unsynced.length > 0) {
      const payload = unsynced.map((c) => ({
        id: c.id,
        cash_session_id: c.cashSessionId,
        category: c.category,
        amount: c.amount,
        description: c.description || null,
        expense_date: c.expenseDate,
        created_at: c.createdAt,
        updated_at: c.updatedAt
      }));
      const { error } = await supabase.from('expenses').upsert(payload);
      if (!error) {
        for (const item of unsynced) {
          await db.expenses.update(item.id, { synced: true });
        }
      }
    }

    const { data: cloudData, error } = await supabase.from('expenses').select('*');
    if (!error && cloudData) {
      for (const row of cloudData) {
        const local = await db.expenses.get(row.id);
        if (!local) {
          await db.expenses.put({
            id: row.id,
            cashSessionId: row.cash_session_id,
            category: row.category,
            amount: row.amount,
            description: row.description,
            expenseDate: row.expense_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            synced: true
          });
        }
      }
    }
  }
}

export const syncEngine = new SyncEngine();
