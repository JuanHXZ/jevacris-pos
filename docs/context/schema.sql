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
    cash_register_id TEXT,
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
    cash_session_id TEXT,
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
    cash_register_id TEXT,
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

CREATE TABLE IF NOT EXISTS cash_registers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_principal INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_register_distribution_lines (
    id TEXT PRIMARY KEY,
    cash_register_id TEXT NOT NULL,
    label TEXT NOT NULL,
    percentage REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_cash REAL NOT NULL DEFAULT 0,
    closing_cash_calculated REAL,
    closing_cash_counted REAL,
    difference REAL,
    status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    cash_session_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('rent', 'utilities', 'supplies', 'personal_draw', 'other')),
    amount REAL NOT NULL DEFAULT 0,
    description TEXT,
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS cash_register_id TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_session_id TEXT;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cash_register_id TEXT;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_cash_register_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_cash_register_id_fkey
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE SET NULL;

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_cash_session_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_cash_session_id_fkey
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE SET NULL;

ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_cash_register_id_fkey;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_cash_register_id_fkey
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_registers_one_principal
    ON cash_registers ((is_principal)) WHERE is_principal = 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_one_open
    ON cash_sessions ((status)) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_products_cash_register ON products(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_sales_cash_session ON sales(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_cash_register ON sale_items(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_dist_lines_register ON cash_register_distribution_lines(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_expenses_session ON expenses(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);
