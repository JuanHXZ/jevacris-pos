# Estructura de BD (resumen) — JEVACRIS Sistema POS e Inventario

> **Fuentes de verdad y sincronización de esquemas:**
> 1. **Backend / Cloud (Nube):** [schema.sql](file:///c:/repo/antigravity-starter-kit/docs/context/schema.sql) define el esquema relacional en **Supabase (PostgreSQL)**.
> 2. **Cliente / Local (PWA Offline):** El almacenamiento local en el navegador se gestiona mediante **Dexie.js (IndexedDB)** en código TypeScript (`src/db/index.ts` usando la sintaxis `.stores()`).
>
> ⚠️ **Regla de sincronización:** Dexie.js no interpreta sentencias SQL directamente. Toda adición, renombre o eliminación de tablas, columnas o índices en `schema.sql` debe replicarse manualmente en las definiciones de Dexie para mantener alineadas ambas capas.

---

## Entidades Principales (MVP)

- **`categories` (Categorías de productos y servicios)**
  - `id` (TEXT, PK): Identificador único (UUID).
  - `name` (TEXT, NOT NULL, UNIQUE): Nombre descriptivo (ej. "Jabones y Detergentes", "Suavizantes", "Recargas y Servicios", "Aseo Hogar").
  - `icon` (TEXT, Opcional): Icono representativo para el POS.
  - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

- **`products` (Catálogo de productos físicos y servicios)**
  - `id` (TEXT, PK): Identificador único (UUID).
  - `name` (TEXT, NOT NULL): Nombre del producto (ej. "Jabón Rey 300g", "Suavizante 1L", "Recarga Claro").
  - `category_id` (TEXT, FK): Referencia a `categories(id)`.
  - `cash_register_id` (TEXT, FK Opcional): Referencia a `cash_registers(id)` (Fase 2).
  - `type` (TEXT, NOT NULL): `'physical'` (descuenta inventario) o `'service'` (no descuenta inventario).
  - `unit` (TEXT, NOT NULL): Unidad de venta (ej. "unidad", "litro", "barra", "bolsa", "recarga").
  - `cost_price` (REAL, DEFAULT 0): Costo de adquisición unitario.
  - `margin_percentage` (REAL, DEFAULT 0): % de ganancia deseado (ej. 30 para 30%).
  - `sale_price` (REAL, DEFAULT 0): Precio de venta final al público (calculado con margen o fijado manualmente).
  - `current_stock` (REAL, DEFAULT 0): Existencias disponibles en tienda.
  - `min_stock_alert` (REAL, DEFAULT 0): Umbral mínimo para detonar alerta de bajo inventario.
  - `image_url` (TEXT, Opcional): URL HTTPS de la foto alojada en Cloudinary (Fase 2 / ADR-010).
  - `is_active` (INTEGER, DEFAULT 1): Borrado lógico para mantener integridad histórica de ventas.
  - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

- **`sales` (Transacciones de venta / Cierre POS)**
  - `id` (TEXT, PK): Identificador único de la transacción (UUID).
  - `sale_date` (TIMESTAMP WITH TIME ZONE, NOT NULL): Fecha y hora exacta registrada automáticamente.
  - `total_amount` (REAL, NOT NULL): Monto total cobrado al cliente.
  - `payment_method` (TEXT, NOT NULL): `'cash'` (Efectivo) o `'transfer'` (Transferencia Nequi / Bancolombia).
  - `amount_received` (REAL, DEFAULT 0): Dinero entregado por el cliente (para cálculo de cambio en efectivo).
  - `change_given` (REAL, DEFAULT 0): Vueltas/cambio devuelto al cliente.
  - `notes` (TEXT, Opcional).
  - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

- **`sale_items` (Detalle de productos por venta)**
  - `id` (TEXT, PK): Identificador único (UUID).
  - `sale_id` (TEXT, FK): Referencia a `sales(id)`.
  - `product_id` (TEXT, FK): Referencia a `products(id)`.
  - `product_name` (TEXT): Snapshot del nombre al momento de la venta.
  - `product_type` (TEXT, NOT NULL): `'physical'` o `'service'`.
  - `quantity` (REAL, DEFAULT 1): Cantidad vendida.
  - `unit_price` (REAL): Snapshot del precio de venta unitario.
  - `unit_cost` (REAL): Snapshot del costo unitario al momento de la venta (para servicios se registra en 0).
  - `subtotal` (REAL): `quantity * unit_price`.
  - `profit` (REAL): **Cálculo estricto de ganancia:**
    - Para `physical`: `quantity * (unit_price - unit_cost)`.
    - Para `service`: **Siempre se almacena en 0** (las ganancias de servicios se liquidan externamente y se registran en `external_earnings`).
  - `created_at` (TIMESTAMP WITH TIME ZONE).

- **`stock_entries` (Entradas de mercancía / Compras a proveedores)**
  - `id` (TEXT, PK): Identificador único (UUID).
  - `product_id` (TEXT, FK): Referencia a `products(id)`.
  - `supplier_id` (TEXT, FK Opcional): Referencia a `suppliers(id)` (Fase 2).
  - `quantity` (REAL, NOT NULL): Cantidad de producto ingresada al inventario.
  - `unit_cost` (REAL, DEFAULT 0): Costo unitario pagado al proveedor en esta compra.
  - `total_cost` (REAL, DEFAULT 0): `quantity * unit_cost`.
  - `entry_date` (TIMESTAMP WITH TIME ZONE): Fecha del reabastecimiento.
  - `notes` (TEXT, Opcional).
  - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

- **`external_earnings` (Ganancias consolidadas de plataformas externas)**
  - `id` (TEXT, PK): Identificador único (UUID).
  - `earning_date` (DATE, NOT NULL): Fecha de la liquidación externa.
  - `platform_name` (TEXT, NOT NULL): Plataforma o servicio (ej. "Recargas Claro/Movistar", "TuLlave", "Corresponsal Bancolombia").
  - `amount` (REAL, NOT NULL): Ganancia neta obtenida y reportada por la plataforma externa.
  - `notes` (TEXT, Opcional).
  - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

---

## Modelo de Entidades Previstas para Fase 2

1. **`cash_registers` (Cajas de Facturación / Fondos de Dinero Independientes — RF27 / ADR-011):**
   - `id` (TEXT, PK): Identificador único.
   - `name` (TEXT, NOT NULL): Nombre de la caja (ej. "Caja Aseo", "Caja Dulces/Mecato", "Caja Servicios").
   - `description` (TEXT).
   - `is_active` (INTEGER DEFAULT 1).
   - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

2. **`distribution_settings` (Configuración de Porcentajes de Distribución — RF28 / ADR-009):**
   - `id` (TEXT, PK): Identificador (o registro único `singleton`).
   - `reinvestment_percentage` (REAL DEFAULT 60): % destinado a recompra de mercancía.
   - `operating_expenses_percentage` (REAL DEFAULT 30): % destinado a arriendo y servicios públicos.
   - `personal_savings_percentage` (REAL DEFAULT 10): % destinado a fondo personal / imprevistos / ahorro.
   - `updated_at` (TIMESTAMP WITH TIME ZONE).

3. **`cash_sessions` (Apertura y Cierre de Caja / Arqueo — RF22):**
   - `id` (TEXT, PK), `cash_register_id` (TEXT, FK), `opened_at`, `closed_at`, `opening_cash`, `closing_cash_calculated`, `closing_cash_counted`, `difference`, `status` ('open', 'closed').

4. **`expenses` (Gastos Operativos del Negocio — RF22):**
   - `id` (TEXT, PK), `cash_session_id` (TEXT, FK), `category` ('rent', 'utilities', 'supplies', 'personal_draw', 'other'), `amount`, `description`, `expense_date`.

5. **`debts`, `debt_items`, `debt_payments` (Módulo de Fiados — RF18):**
   - `debts`: `id`, `debtor_name`, `total_amount`, `paid_amount`, `status` ('pending', 'partial', 'paid'), `created_at`.
   - `debt_items`: `id`, `debt_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `subtotal`.
   - `debt_payments`: `id`, `debt_id`, `amount`, `payment_method`, `created_at`.

6. **`suppliers` (Proveedores — RF25):**
   - `id`, `name`, `contact_phone`, `notes`, `created_at`.

---

## Relaciones Principales

- `categories` 1 --- N `products`
- `sales` 1 --- N `sale_items`
- `products` 1 --- N `sale_items`
- `products` 1 --- N `stock_entries`
- `cash_registers` 1 --- N `products` (Fase 2)
- `cash_registers` 1 --- N `cash_sessions` (Fase 2)

---

## Lógica automática activa (Triggers / Cascada de aplicación)

1. **Al confirmar venta (`sales` + `sale_items`):**
   - Para cada item donde `product_type == 'physical'`, se descuenta inventario:
     `UPDATE products SET current_stock = current_stock - item.quantity, updated_at = CURRENT_TIMESTAMP WHERE id = item.product_id;`
   - Para items donde `product_type == 'service'`, NO se descuenta inventario y `profit` se fija en `0`.
2. **Al registrar entrada de mercancía (`stock_entries`):**
   - Se incrementa el inventario y se actualiza el costo base:
     `UPDATE products SET current_stock = current_stock + entry.quantity, cost_price = CASE WHEN entry.unit_cost > 0 THEN entry.unit_cost ELSE cost_price END, updated_at = CURRENT_TIMESTAMP WHERE id = entry.product_id;`

---

## Queries base para los casos de uso clave

### 1. Resumen diario de ventas y cuadre por medio de pago (o fecha seleccionada — RF26)
```sql
SELECT 
    COUNT(id) AS total_transacciones,
    COALESCE(SUM(total_amount), 0) AS total_ventas,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) AS total_efectivo,
    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) AS total_transferencias
FROM sales
WHERE DATE(sale_date) = :target_date; -- :target_date puede ser CURRENT_DATE o una fecha seleccionada
```

### 2. Detalle completo de transacciones para reporte/exportación (RF26 / RF20)
```sql
SELECT 
    s.id AS venta_id,
    s.sale_date AS fecha_hora,
    s.payment_method AS medio_pago,
    s.total_amount AS total_venta,
    si.product_name AS producto,
    si.product_type AS tipo,
    si.quantity AS cantidad,
    si.unit_price AS precio_unitario,
    si.subtotal AS subtotal_item,
    si.profit AS ganancia_estimada
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
WHERE DATE(s.sale_date) = :target_date
ORDER BY s.sale_date DESC;
```

### 3. Ganancia total consolidada por fecha (Productos físicos + Ganancias de plataformas externas)
```sql
SELECT 
    (
        SELECT COALESCE(SUM(si.profit), 0) 
        FROM sale_items si 
        JOIN sales s ON si.sale_id = s.id 
        WHERE DATE(s.sale_date) = :target_date 
          AND si.product_type = 'physical'
    ) AS ganancia_productos_fisicos,
    
    (
        SELECT COALESCE(SUM(amount), 0) 
        FROM external_earnings 
        WHERE earning_date = :target_date
    ) AS ganancia_plataformas_externas,
    
    (
        (
            SELECT COALESCE(SUM(si.profit), 0) 
            FROM sale_items si 
            JOIN sales s ON si.sale_id = s.id 
            WHERE DATE(s.sale_date) = :target_date 
              AND si.product_type = 'physical'
        ) +
        (
            SELECT COALESCE(SUM(amount), 0) 
            FROM external_earnings 
            WHERE earning_date = :target_date
        )
    ) AS ganancia_total_consolidada;
```

### 4. Cálculo de Distribución de Ventas Configurable (RF28 / ADR-009)
```sql
-- Distribución dinámica usando los porcentajes configurados por el usuario
SELECT 
    COALESCE(SUM(s.total_amount), 0) AS total_ventas_dia,
    COALESCE(SUM(s.total_amount), 0) * (cfg.reinvestment_percentage / 100.0) AS fondo_reinversion_mercancia,
    COALESCE(SUM(s.total_amount), 0) * (cfg.operating_expenses_percentage / 100.0) AS fondo_gastos_operativos,
    COALESCE(SUM(s.total_amount), 0) * (cfg.personal_savings_percentage / 100.0) AS fondo_personal_ahorro
FROM sales s
CROSS JOIN distribution_settings cfg
WHERE DATE(s.sale_date) = :target_date
GROUP BY cfg.reinvestment_percentage, cfg.operating_expenses_percentage, cfg.personal_savings_percentage;
```
