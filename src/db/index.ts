import Dexie, { type EntityTable } from 'dexie';
import type { Category, Product, Sale, SaleItem, StockEntry, ExternalEarning } from '../types';

export class JevacrisDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  products!: EntityTable<Product, 'id'>;
  sales!: EntityTable<Sale, 'id'>;
  saleItems!: EntityTable<SaleItem, 'id'>;
  stockEntries!: EntityTable<StockEntry, 'id'>;
  externalEarnings!: EntityTable<ExternalEarning, 'id'>;

  constructor() {
    super('jevacris_pos_db');
    this.version(1).stores({
      categories: 'id, name, createdAt, updatedAt, synced',
      products: 'id, name, categoryId, type, currentStock, minStockAlert, isActive, createdAt, updatedAt, synced',
      sales: 'id, saleDate, paymentMethod, createdAt, updatedAt, synced',
      saleItems: 'id, saleId, productId, productType, createdAt',
      stockEntries: 'id, productId, entryDate, createdAt, updatedAt, synced',
      externalEarnings: 'id, earningDate, platformName, createdAt, updatedAt, synced'
    });
  }
}

export const db = new JevacrisDatabase();

// Semilla inicial de datos para tienda de productos de aseo JEVACRIS
export async function seedInitialDataIfNeeded(): Promise<void> {
  const count = await db.categories.count();
  if (count > 0) return;

  const now = new Date().toISOString();

  // Categorías base
  const catAseoId = 'cat-aseo-hogar';
  const catLavanderiaId = 'cat-lavanderia';
  const catDesinfeccionId = 'cat-desinfeccion';
  const catServiciosId = 'cat-servicios-recargas';

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

  // Productos iniciales de prueba basados en el levantamiento de requisitos
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
      isActive: true,
      createdAt: now,
      updatedAt: now,
      synced: false
    }
  ]);
}
