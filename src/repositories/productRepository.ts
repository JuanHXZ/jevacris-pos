import { db } from '../db';
import type { Product, Category } from '../types';

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
      .and(p => p.isActive)
      .toArray();
  },

  async getLowStock(): Promise<Product[]> {
    return await db.products
      .filter(p => p.isActive && p.type === 'physical' && p.currentStock <= p.minStockAlert)
      .toArray();
  },

  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<string> {
    const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
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
    await db.products.update(id, {
      ...updates,
      updatedAt: now,
      synced: false
    });
  },

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    // Borrado lógico
    await db.products.update(id, {
      isActive: false,
      updatedAt: now,
      synced: false
    });
  },

  async getAllCategories(): Promise<Category[]> {
    return await db.categories.toArray();
  }
};
