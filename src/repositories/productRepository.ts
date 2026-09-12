import { db } from '../db';
import type { Product, Category } from '../types';
import { PRINCIPAL_CASH_REGISTER_ID } from '../types';

export const productRepository = {
  async getAll(): Promise<Product[]> {
    return await db.products.filter(p => p.isActive !== false).toArray();
  },

  async getById(id: string): Promise<Product | undefined> {
    return await db.products.get(id);
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    return await db.products
      .where('categoryId')
      .equals(categoryId)
      .and(p => p.isActive !== false)
      .toArray();
  },

  async getLowStock(): Promise<Product[]> {
    return await db.products
      .filter(p => p.isActive !== false && p.type === 'physical' && p.currentStock <= p.minStockAlert)
      .toArray();
  },

  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<string> {
    const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const isPhysical = product.type === 'physical';

    const newProduct: Product = {
      ...product,
      name: product.name.trim(),
      unit: product.unit ? product.unit.trim() : (isPhysical ? 'unidad' : 'servicio'),
      costPrice: isPhysical ? Math.max(0, product.costPrice || 0) : 0,
      marginPercentage: isPhysical ? Math.max(0, product.marginPercentage || 0) : 0,
      salePrice: Math.max(0, product.salePrice || 0),
      currentStock: isPhysical ? Math.max(0, product.currentStock || 0) : 0,
      minStockAlert: isPhysical ? Math.max(0, product.minStockAlert || 0) : 0,
      cashRegisterId: product.cashRegisterId || PRINCIPAL_CASH_REGISTER_ID,
      isActive: true,
      id,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    await db.products.add(newProduct);
    return id;
  },

  async update(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void> {
    const now = new Date().toISOString();

    const sanitizedUpdates: Partial<Product> = {
      ...updates,
      updatedAt: now,
      synced: false
    };

    if (updates.name !== undefined) sanitizedUpdates.name = updates.name.trim();
    if (updates.unit !== undefined) sanitizedUpdates.unit = updates.unit.trim();
    if (updates.type === 'service') {
      sanitizedUpdates.costPrice = 0;
      sanitizedUpdates.marginPercentage = 0;
      sanitizedUpdates.currentStock = 0;
      sanitizedUpdates.minStockAlert = 0;
    }
    if (updates.cashRegisterId !== undefined && !updates.cashRegisterId) {
      sanitizedUpdates.cashRegisterId = PRINCIPAL_CASH_REGISTER_ID;
    }

    await db.products.update(id, sanitizedUpdates);
  },

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    // Borrado lógico para preservar histórico de ventas pasadas
    await db.products.update(id, {
      isActive: false,
      updatedAt: now,
      synced: false
    });
  },

  async getAllCategories(): Promise<Category[]> {
    return await db.categories.toArray();
  },

  async createCategory(name: string, icon: string = 'Package'): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('El nombre de categoría no puede estar vacío');

    // Verificar si ya existe
    const existing = await db.categories.where('name').equalsIgnoreCase(trimmed).first();
    if (existing) return existing.id;

    const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const newCategory: Category = {
      id,
      name: trimmed,
      icon,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    await db.categories.add(newCategory);
    return id;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const totalCategories = await db.categories.count();
    if (totalCategories <= 1) {
      throw new Error('Debe existir al menos una categoría en el sistema');
    }

    // Reasignar productos huérfanos a la primera categoría disponible
    const firstOther = await db.categories.filter(c => c.id !== id).first();
    if (firstOther) {
      await db.products.where('categoryId').equals(id).modify({
        categoryId: firstOther.id,
        updatedAt: new Date().toISOString(),
        synced: false
      });
    }

    await db.categories.delete(id);
    return true;
  }
};
