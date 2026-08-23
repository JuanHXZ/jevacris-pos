-- Schema SQL para JEVACRIS POS e Inventario — Supabase Cloud (PostgreSQL)
-- NOTA DE ARQUITECTURA: Este archivo es la fuente de verdad del backend en Supabase (PostgreSQL).
-- El almacenamiento local del cliente en la PWA se gestiona en TypeScript/JS mediante Dexie.js (IndexedDB).
-- Cualquier modificación en las tablas o columnas debe replicarse en las definiciones de esquema de Dexie (src/db/index.ts).

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_id TEXT,
    type TEXT NOT NULL DEFAULT 'physical' CHECK(type IN ('physical', 'service')),
    unit TEXT NOT NULL DEFAULT 'unidad',
    cost_price REAL NOT NULL DEFAULT 0,
    margin_percentage REAL NOT NULL DEFAULT 0,
    sale_price REAL NOT NULL DEFAULT 0,
    current_stock REAL NOT NULL DEFAULT 0,
    min_stock_alert REAL NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'transfer')),
    amount_received REAL NOT NULL DEFAULT 0,
    change_given REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'physical' CHECK(product_type IN ('physical', 'service')),
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    profit REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_entries (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS external_earnings (
    id TEXT PRIMARY KEY,
    earning_date DATE NOT NULL,
    platform_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización de consultas en POS, Reportes y Sincronización Delta
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_updated ON products(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_updated ON sales(updated_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_type ON sale_items(product_type);
CREATE INDEX IF NOT EXISTS idx_stock_entries_product ON stock_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_updated ON stock_entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_external_earnings_date ON external_earnings(earning_date);
CREATE INDEX IF NOT EXISTS idx_external_earnings_updated ON external_earnings(updated_at);
