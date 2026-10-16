-- ============================================================================
-- MIGRACIÓN PRODUCCIÓN: Módulo de Cajas, Turnos y Gastos (Fase 2)
-- Proyecto Supabase Producción: ulahvwmhmhnsdlisueft
-- ============================================================================
-- Instrucciones:
-- 1. Abre https://supabase.com/dashboard/project/ulahvwmhmhnsdlisueft/sql/new
-- 2. Pega todo este bloque y haz clic en "Run".
-- 3. Es 100% idempotente (usa IF NOT EXISTS) y NO altera ni borra datos
--    ni modifica el updated_at de los productos o ventas existentes.
-- ============================================================================

BEGIN;

-- 1. Nuevas tablas del Módulo de Cajas y Turnos
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

-- 2. Nuevas columnas en tablas existentes (sin alterar filas ni updated_at)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cash_register_id TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_session_id TEXT;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cash_register_id TEXT;

-- 3. Llaves foráneas en tablas existentes
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_cash_register_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_cash_register_id_fkey
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE SET NULL;

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_cash_session_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_cash_session_id_fkey
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE SET NULL;

ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_cash_register_id_fkey;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_cash_register_id_fkey
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE SET NULL;

-- 4. Índices de integridad y rendimiento
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

-- 5. Garantizar permisos para la API REST (anon / authenticated) igual que las tablas existentes
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    cash_registers,
    cash_register_distribution_lines,
    cash_sessions,
    expenses
TO anon, authenticated, service_role;

-- 6. Recargar el caché de esquema de PostgREST inmediatamente
NOTIFY pgrst, 'reload schema';

COMMIT;

