import Dexie, { type EntityTable } from 'dexie';
import type {
  Category,
  Product,
  Sale,
  SaleItem,
  StockEntry,
  ExternalEarning,
  CashRegister,
  CashRegisterDistributionLine,
  CashSession,
  Expense
} from '../types';
import { PRINCIPAL_CASH_REGISTER_ID } from '../types';
import { ensurePrincipalCashRegister } from './cashBootstrap';

export const isDevMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('jevacris_dev_mode') === 'true';
};

export const setDevMode = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jevacris_dev_mode', enabled ? 'true' : 'false');
    window.location.reload();
  }
};

export class JevacrisDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  products!: EntityTable<Product, 'id'>;
  sales!: EntityTable<Sale, 'id'>;
  saleItems!: EntityTable<SaleItem, 'id'>;
  stockEntries!: EntityTable<StockEntry, 'id'>;
  externalEarnings!: EntityTable<ExternalEarning, 'id'>;
  cashRegisters!: EntityTable<CashRegister, 'id'>;
  cashRegisterDistributionLines!: EntityTable<CashRegisterDistributionLine, 'id'>;
  cashSessions!: EntityTable<CashSession, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;

  constructor(dbName = isDevMode() ? 'jevacris_pos_dev_db' : 'jevacris_pos_db') {
    super(dbName);
    this.version(1).stores({
      categories: 'id, name, createdAt, updatedAt, synced',
      products: 'id, name, categoryId, type, currentStock, minStockAlert, isActive, createdAt, updatedAt, synced',
      sales: 'id, saleDate, paymentMethod, createdAt, updatedAt, synced',
      saleItems: 'id, saleId, productId, productType, createdAt',
      stockEntries: 'id, productId, entryDate, createdAt, updatedAt, synced',
      externalEarnings: 'id, earningDate, platformName, createdAt, updatedAt, synced'
    });

    this.version(21)
      .stores({
        categories: 'id, name, createdAt, updatedAt, synced',
        products: 'id, name, categoryId, type, cashRegisterId, currentStock, minStockAlert, isActive, createdAt, updatedAt, synced',
        sales: 'id, saleDate, paymentMethod, cashSessionId, createdAt, updatedAt, synced',
        saleItems: 'id, saleId, productId, productType, cashRegisterId, createdAt',
        stockEntries: 'id, productId, entryDate, createdAt, updatedAt, synced',
        externalEarnings: 'id, earningDate, platformName, createdAt, updatedAt, synced',
        cashRegisters: 'id, name, isPrincipal, isActive, createdAt, updatedAt, synced',
        cashRegisterDistributionLines: 'id, cashRegisterId, sortOrder, createdAt, updatedAt, synced',
        cashSessions: 'id, status, openedAt, closedAt, createdAt, updatedAt, synced',
        expenses: 'id, cashSessionId, category, expenseDate, createdAt, updatedAt, synced'
      })
      .upgrade(async (trans) => {
        await ensurePrincipalCashRegister({
          cashRegisters: trans.table('cashRegisters'),
          cashRegisterDistributionLines: trans.table('cashRegisterDistributionLines'),
          products: trans.table('products')
        });
      });
  }
}

export const db = new JevacrisDatabase();

export async function resetDevDatabase(): Promise<void> {
  if (!isDevMode()) return;
  await db.delete();
  window.location.reload();
}

export async function seedInitialDataIfNeeded(): Promise<void> {
  await db.open();
  await ensurePrincipalCashRegister({
    cashRegisters: db.cashRegisters,
    cashRegisterDistributionLines: db.cashRegisterDistributionLines,
    products: db.products
  });

  const now = new Date().toISOString();
  const categoriesCount = await db.categories.count();
  const productsCount = await db.products.count();

  const catAseoId = 'cat-aseo-hogar';
  const catLavanderiaId = 'cat-lavanderia';
  const catDesinfeccionId = 'cat-desinfeccion';
  const catServiciosId = 'cat-servicios-recargas';

  if (categoriesCount === 0) {
    await db.categories.bulkAdd([
      {
        id: catAseoId,
        name: 'Aseo Hogar',
        icon: 'sparkles',
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: catLavanderiaId,
        name: 'Lavandería y Ropa',
        icon: 'shirt',
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: catDesinfeccionId,
        name: 'Desinfección y Cloro',
        icon: 'shield-check',
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: catServiciosId,
        name: 'Recargas y Servicios',
        icon: 'smartphone',
        createdAt: now,
        updatedAt: now,
        synced: false
      }
    ]);
  }

  if (productsCount === 0) {
    await db.products.bulkAdd([
      {
        id: 'prod-jabon-rey',
        name: 'Jabón Rey 300g (Barra)',
        categoryId: catLavanderiaId,
        type: 'physical',
        unit: 'barra',
        costPrice: 2200,
        marginPercentage: 35,
        salePrice: 3000,
        currentStock: 24,
        minStockAlert: 5,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: 'prod-suavizante-1l',
        name: 'Suavizante Textil 1 Litro',
        categoryId: catLavanderiaId,
        type: 'physical',
        unit: 'litro',
        costPrice: 4500,
        marginPercentage: 33,
        salePrice: 6000,
        currentStock: 15,
        minStockAlert: 3,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: 'prod-jabon-liquido-1l',
        name: 'Jabón Líquido Multiusos 1L',
        categoryId: catAseoId,
        type: 'physical',
        unit: 'litro',
        costPrice: 3800,
        marginPercentage: 32,
        salePrice: 5000,
        currentStock: 12,
        minStockAlert: 4,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: 'prod-cloro-1l',
        name: 'Cloro Desinfectante 1 Litro',
        categoryId: catDesinfeccionId,
        type: 'physical',
        unit: 'litro',
        costPrice: 2000,
        marginPercentage: 40,
        salePrice: 2800,
        currentStock: 18,
        minStockAlert: 5,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: 'prod-limpido-galon',
        name: 'Límpido Galón 3.8L',
        categoryId: catDesinfeccionId,
        type: 'physical',
        unit: 'galón',
        costPrice: 8500,
        marginPercentage: 35,
        salePrice: 11500,
        currentStock: 6,
        minStockAlert: 2,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: 'serv-recarga-claro',
        name: 'Recarga Móvil Claro',
        categoryId: catServiciosId,
        type: 'service',
        unit: 'recarga',
        costPrice: 0,
        marginPercentage: 0,
        salePrice: 10000,
        currentStock: 0,
        minStockAlert: 0,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: 'serv-recarga-movistar',
        name: 'Recarga Móvil Movistar / Tigo',
        categoryId: catServiciosId,
        type: 'service',
        unit: 'recarga',
        costPrice: 0,
        marginPercentage: 0,
        salePrice: 5000,
        currentStock: 0,
        minStockAlert: 0,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        synced: false
      },
      {
        id: 'serv-recarga-tullave',
        name: 'Recarga Tarjeta TuLlave',
        categoryId: catServiciosId,
        type: 'service',
        unit: 'recarga',
        costPrice: 0,
        marginPercentage: 0,
        salePrice: 10000,
        currentStock: 0,
        minStockAlert: 0,
        cashRegisterId: PRINCIPAL_CASH_REGISTER_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        synced: false
      }
    ]);
  } else {
    await ensurePrincipalCashRegister({
      cashRegisters: db.cashRegisters,
      cashRegisterDistributionLines: db.cashRegisterDistributionLines,
      products: db.products
    });
  }
}
