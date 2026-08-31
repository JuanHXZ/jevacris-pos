import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { db } from '../../db';
import { InventoryTable } from './components/InventoryTable';
import { ProductDetailCard } from './components/ProductDetailCard';
import { InventorySummaryCard } from './components/InventorySummaryCard';
import { ProductFormModal } from './components/ProductFormModal';
import { Toast } from '../../components/ui/Toast';
import type { Product } from '../../types';

export const InventoryView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const products = useLiveQuery(() => db.products.filter(p => p.isActive !== false).toArray()) || [];

  // Auto-seleccionar el primer producto si no hay selección activa
  useEffect(() => {
    if (!selectedProduct && products.length > 0) {
      setSelectedProduct(products[0]);
    } else if (selectedProduct) {
      // Mantener sincronizado el producto seleccionado si cambia en DB
      const current = products.find(p => p.id === selectedProduct.id);
      if (current) setSelectedProduct(current);
    }
  }, [products]);

  const handleOpenNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleProductSuccess = (productId: string, actionType: 'create' | 'update' | 'delete', productName: string) => {
    if (actionType === 'create') {
      setToast({ message: `¡Producto "${productName}" creado exitosamente!`, type: 'success' });
      // Buscar el producto recién creado para seleccionarlo
      const created = products.find(p => p.id === productId);
      if (created) setSelectedProduct(created);
    } else if (actionType === 'update') {
      setToast({ message: `¡Producto "${productName}" actualizado exitosamente!`, type: 'success' });
    } else if (actionType === 'delete') {
      setToast({ message: `Producto "${productName}" desactivado del catálogo`, type: 'info' });
      setSelectedProduct(null);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Toast Notification Flotante */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Abstract Background Blobs (Organic Minimalism from DESIGN.md) */}
      <div className="blob-ambient-1" />
      <div className="blob-ambient-2" />

      {/* Screen Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', zIndex: 1 }}>
        <div>
          <h2 className="font-display-lg" style={{ color: 'var(--primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Resumen de Inventario
          </h2>
          <p className="font-body-lg" style={{ color: 'var(--on-surface-variant)', marginTop: '8px', maxWidth: '640px' }}>
            Gestión y estado actual de los productos boutique. Seleccione un ítem para ver detalles avanzados o realizar ajustes de stock rápidos.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          style={{
            padding: '16px 28px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-container)',
            color: 'var(--on-primary-container)',
            fontWeight: 700,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Plus size={20} />
          <span>NUEVO PRODUCTO</span>
        </button>
      </header>

      {/* 60/40 Asymmetric Layout Grid (DESIGN.md) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 'var(--gutter-asymmetric)',
          alignItems: 'start',
          zIndex: 1
        }}
        className="inventory-asymmetric-grid"
      >
        {/* 60% Left Area: Data Table / Grid */}
        <InventoryTable
          products={filteredProducts}
          categories={categories}
          selectedProduct={selectedProduct}
          onSelectProduct={setSelectedProduct}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* 40% Right Area: Details & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ProductDetailCard
            product={selectedProduct}
            categories={categories}
            onEditProduct={handleOpenEdit}
          />
          <InventorySummaryCard />
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingProduct={editingProduct}
        categories={categories}
        onSuccess={handleProductSuccess}
      />

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1024px) {
          .inventory-asymmetric-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
