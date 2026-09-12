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
  - `cash_register_id` (TEXT, FK, NOT NULL tras RF27): Referencia a `cash_registers(id)`. Por defecto la **Caja Principal**.
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
  - `cash_session_id` (TEXT, FK Opcional): Referencia a `cash_sessions(id)` — **requerida al confirmar venta cuando RF22 esté activo** (sesión abierta). Ventas históricas previas a RF22 pueden quedar en `NULL`.
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
  - `cash_register_id` (TEXT, FK): Snapshot de la caja del producto al confirmar la venta (RF27). El histórico no se mueve si luego se reasigna el producto.
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

## Modelo de Entidades Previstas para Fase 2 (slice cajas: RF22 + RF27 + RF28)

Hay **dos conceptos distintos**:
- **Sesión POS** (`cash_sessions`): jornada / gaveta física. Una abierta a la vez.
- **Fondo / caja de facturación** (`cash_registers`): a qué línea de negocio pertenece cada producto (Principal, Dulces, …).

### RF22 — Sesión de jornada

1. **`cash_sessions` (Apertura y Cierre / Arqueo — RF22 / ADR-012):**
   - `id` (TEXT, PK), `opened_at` (NOT NULL), `closed_at` (NULL si abierta).
   - `opening_cash`, `closing_cash_calculated`, `closing_cash_counted`, `difference`.
   - `status` `'open'` | `'closed'`.
   - `notes`, `created_at`, `updated_at`.
   - **Restricción:** como máximo una fila `status = 'open'`. **No** tiene `cash_register_id` (el arqueo es de la gaveta, no del fondo).

2. **`expenses` (Gastos de la jornada — RF22):**
   - `id`, `cash_session_id` (FK NOT NULL), `category` (`'rent'` | `'utilities'` | `'supplies'` | `'personal_draw'` | `'other'`), `amount`, `description`, `expense_date`, timestamps.

**Fórmula de arqueo (efectivo esperado):**
```text
closing_cash_calculated =
  opening_cash
  + Σ sales.total_amount WHERE payment_method = 'cash' AND cash_session_id = :session
  − Σ expenses.amount WHERE cash_session_id = :session
```

### RF27 / RF28 — Fondos y distribución

3. **`cash_registers` (Cajas de facturación — RF27 / ADR-011):**
   - `id` (TEXT, PK).
   - `name` (TEXT, NOT NULL): ej. «Caja Principal», «Caja Dulces».
   - `description` (TEXT, Opcional).
   - `is_principal` (INTEGER/BOOLEAN, NOT NULL, DEFAULT 0): **exactamente una** fila en `true`. No se elimina.
   - `is_active` (INTEGER DEFAULT 1): las no principales se pueden desactivar si no se usan; no se desactiva la Principal.
   - `created_at`, `updated_at`.
   - **Seed / migración:** crear Caja Principal y `UPDATE products SET cash_register_id = :principal WHERE cash_register_id IS NULL`.

4. **`cash_register_distribution_lines` (Distribución por caja — RF28 / ADR-009):**
   - `id` (TEXT, PK).
   - `cash_register_id` (TEXT, FK NOT NULL).
   - `label` (TEXT, NOT NULL): nombre del rubro (ej. «Inversiones», «Ahorros», «Gastos operativos»).
   - `percentage` (REAL, NOT NULL): 0–100.
   - `sort_order` (INTEGER, DEFAULT 0).
   - `created_at`, `updated_at`.
   - **Invariante:** Σ `percentage` por `cash_register_id` = 100.
   - **Ejemplo Caja Dulces:** Inversiones 60, Ahorros 40.
   - **Default Caja Principal (sugerido, editable):** Reinversión 60, Gastos operativos 30, Ahorro 10.

El singleton global `distribution_settings` **queda descartado** (ya no hay un único 60/30/10 para todo el negocio).

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
- `cash_sessions` 1 --- N `sales` (RF22)
- `cash_sessions` 1 --- N `expenses` (RF22)
- `cash_registers` 1 --- N `products` (RF27)
- `cash_registers` 1 --- N `sale_items` (RF27, snapshot)
- `cash_registers` 1 --- N `cash_register_distribution_lines` (RF28)

---

## Lógica automática activa (Triggers / Cascada de aplicación)

1. **Al confirmar venta (`sales` + `sale_items`):**
   - **Gate RF22:** Debe existir una `cash_session` con `status = 'open'`; la venta se graba con ese `cash_session_id`. Si no hay sesión abierta, se rechaza.
   - **Snapshot RF27:** cada ítem copia `cash_register_id` del producto (o Principal si faltara).
   - Para cada item donde `product_type == 'physical'`, se descuenta inventario.
   - Para `service`, NO se descuenta inventario y `profit` se fija en `0`.
2. **Al registrar entrada de mercancía (`stock_entries`):**
   - Se incrementa el inventario y se actualiza el costo base:
     `UPDATE products SET current_stock = current_stock + entry.quantity, cost_price = CASE WHEN entry.unit_cost > 0 THEN entry.unit_cost ELSE cost_price END, updated_at = CURRENT_TIMESTAMP WHERE id = entry.product_id;`
3. **Al abrir caja (`cash_sessions`):**
   - Solo si no existe otra sesión `open`. Se crea con `opening_cash`, `status = 'open'`, `closed_at = NULL`.
4. **Al cerrar caja (`cash_sessions`):**
   - Se calcula `closing_cash_calculated` (fórmula arriba), se registra `closing_cash_counted`, `difference`, `closed_at` y `status = 'closed'`.
   - A partir de ese momento el POS no acepta ventas hasta una nueva apertura.

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

### 4. Totales y distribución por caja de facturación (RF27 / RF28 / ADR-009)
```sql
-- Total ventas y ganancias por caja en un período
SELECT
    cr.id,
    cr.name,
    cr.is_principal,
    COALESCE(SUM(si.subtotal), 0) AS total_ventas,
    COALESCE(SUM(si.profit), 0) AS total_ganancias
FROM cash_registers cr
LEFT JOIN sale_items si ON si.cash_register_id = cr.id
LEFT JOIN sales s ON s.id = si.sale_id AND DATE(s.sale_date) = :target_date
GROUP BY cr.id, cr.name, cr.is_principal;

-- Distribución sugerida = % × total ventas de esa caja
SELECT
    cr.name AS caja,
    d.label AS rubro,
    d.percentage,
    COALESCE(SUM(si.subtotal), 0) AS total_ventas_caja,
    COALESCE(SUM(si.subtotal), 0) * (d.percentage / 100.0) AS monto_sugerido
FROM cash_registers cr
JOIN cash_register_distribution_lines d ON d.cash_register_id = cr.id
LEFT JOIN sale_items si ON si.cash_register_id = cr.id
LEFT JOIN sales s ON s.id = si.sale_id AND DATE(s.sale_date) = :target_date
WHERE cr.id = :cash_register_id
GROUP BY cr.name, d.label, d.percentage, d.sort_order
ORDER BY d.sort_order;
```

### 5. Arqueo de sesión de caja (RF22 / ADR-012)
```sql
-- Efectivo esperado y diferencia para una sesión
SELECT
    cs.id AS session_id,
    cs.opening_cash,
    COALESCE((
        SELECT SUM(s.total_amount)
        FROM sales s
        WHERE s.cash_session_id = cs.id AND s.payment_method = 'cash'
    ), 0) AS cash_sales_total,
    COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.cash_session_id = cs.id
    ), 0) AS expenses_total,
    cs.opening_cash
      + COALESCE((
            SELECT SUM(s.total_amount)
            FROM sales s
            WHERE s.cash_session_id = cs.id AND s.payment_method = 'cash'
        ), 0)
      - COALESCE((
            SELECT SUM(e.amount)
            FROM expenses e
            WHERE e.cash_session_id = cs.id
        ), 0) AS closing_cash_calculated,
    cs.closing_cash_counted,
    cs.difference,
    cs.status
FROM cash_sessions cs
WHERE cs.id = :session_id;
```
