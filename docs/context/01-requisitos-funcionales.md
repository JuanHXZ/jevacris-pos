# Requisitos Funcionales — JEVACRIS Sistema POS e Inventario

## 1. Catálogo y Gestión de Productos y Servicios

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF01 | Registro y edición de productos y servicios (nombre, categoría, tipo: producto físico o servicio/recarga, unidad de medida) | Alta | Must-Have MVP | Base obligatoria para almacenar y organizar el inventario y servicios de la tienda. |
| RF02 | Configuración de costo de compra, margen % y cálculo automático de precio de venta (para productos físicos) | Alta | Must-Have MVP | Resuelve el dolor principal de tener que calcular márgenes mentalmente o con calculadora. Para servicios/recargas no aplica margen unitario. |
| RF03 | Definición de stock inicial y umbral de alerta de stock mínimo por producto físico | Alta | Must-Have MVP | Permite controlar existencias físicas y avisar proactivamente antes de que se agoten productos clave (los servicios no descuentan stock). |
| RF04 | Búsqueda y filtrado rápido de productos por nombre o categoría | Alta | Must-Have MVP | Agiliza la localización de ítems en pantallas táctiles o móviles durante la atención. |

## 2. Punto de Venta (POS) y Carrito de Venta Rápida

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF05 | Carrito de venta rápida con adición/eliminación ágil de ítems y selector de cantidades/montos | Alta | Must-Have MVP | Elimina la suma manual con calculadora cuando el cliente compra varios artículos o recargas. |
| RF06 | Cálculo automático del subtotal y total de la venta | Alta | Must-Have MVP | Previene errores humanos y reduce el tiempo de espera del cliente. |
| RF07 | Calculadora de cambio / vueltas integrada (ingreso de monto recibido y cálculo automático) | Alta | Must-Have MVP | Elimina la fricción y riesgo de error al dar cambio con billetes de alta denominación. |
| RF08 | Selección de medio de pago (Efectivo / Transferencia - Nequi) | Alta | Must-Have MVP | Permite clasificar los ingresos del día para cuadre de caja exacto. |
| RF09 | Confirmación de venta con registro automático de fecha y hora | Alta | Must-Have MVP | Elimina la tarea repetitiva de digitar fechas a mano. |
| RF10 | Descuento automático de existencias del inventario al completar la venta (solo productos físicos) | Alta | Must-Have MVP | Mantiene el inventario actualizado en tiempo real sin depender del registro nocturno manual. |

## 3. Entradas de Mercancía (Compras / Reabastecimiento)

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF11 | Registro de entrada de stock por producto (cantidad ingresada y fecha) | Alta | Must-Have MVP | Conecta directamente las compras con el inventario sin doble digitación en hojas separadas. |
| RF12 | Actualización opcional de costo de compra al ingresar mercancía | Alta | Must-Have MVP | Facilita mantener costos y márgenes al día cuando los proveedores cambian precios durante el mismo flujo de entrada de mercancía. |

## 4. Reportes, Cuadre de Caja y Consolidación de Ganancias

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF13 | Resumen diario de ventas totales y desglose por medio de pago (Efectivo vs. Transferencias) | Alta | Must-Have MVP | Facilita el cuadre de caja al cierre del día sin hacer cuentas manuales. |
| RF14 | Registro manual de ganancias externas (ingreso de ganancias de plataformas de recargas/corresponsal) | Alta | Must-Have MVP | Permite consolidar la ganancia neta total diaria/semanal integrando las plataformas externas que ya liquidan su ganancia. |
| RF15 | Indicador de ganancia bruta total del día (Ganancia productos físicos + Ganancias externas registradas) | Alta | Must-Have MVP | Da visibilidad instantánea de la rentabilidad real completa del negocio. Ver regla de negocio en ADR-004 (`05-decisiones.md`): la ganancia de productos excluye explícitamente los ítems de tipo servicio. |
| RF16 | Listado de alertas de productos agotados o por debajo del stock mínimo | Alta | Must-Have MVP | Evita quedarse sin productos de alta rotación (ej. jabón rey, suavizante). |

## 5. Operatividad y Persistencia Offline

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF17 | PWA con almacenamiento local completo de catálogo, ventas y reportes (Offline-First) | Alta | Must-Have MVP | Garantiza continuidad operativa total en PC y móvil ante caídas o ausencia de conexión a internet. |

---

## Fase 2 (fuera del MVP)

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF18 | **Módulo de Fiados / Cuentas por Cobrar** — Registrar persona a quien se le fía, valor total de la deuda, desglose de productos incluidos y fecha del fiado. Registro de abonos y cancelación total o parcial de la deuda. | Media | Fase 2 | Ampliado del alcance original ("cuentas por cobrar a familiares"): trazable a persona + productos + fecha, permitiendo cobrar con contexto exacto y gestionar abonos. |
| RF19 | Integración API o importación directa de reportes desde plataformas de corresponsalía | Media | Fase 2 | Automatización adicional sobre el registro manual de ganancias externas del MVP. |
| RF20 | **Exportación de reportes a Excel / PDF / CSV** y respaldos automáticos en la nube | Media | Fase 2 | Generación de archivos descargables con el detalle de ventas, arqueos y ganancias para contabilidad y archivo histórico. |
| RF21 | Gestión de múltiples usuarios o turnos de caja | Baja | Fase 2 | El negocio es unipersonal actualmente. |
| RF22 | **Apertura y cierre de jornada POS (Arqueo)** con registro de gastos operativos varios. **Una sesión operativa** (gaveta física). **Bloqueo de ventas** si no hay sesión abierta o tras el cierre. Independiente de los fondos contables (RF27). | Alta | Fase 2 — slice cajas | Compara el efectivo físico contado al abrir y cerrar contra el sistema. Decisiones: ADR-012. Los fondos por línea de producto no multiplican la apertura/cierre. |
| RF23 | **Bloqueo de acceso por PIN local** | Alta | Fase 2 | Resuelve el acceso seguro sin depender de conexión a internet ni costos de OTP por SMS/WhatsApp (ver ADR-008). |
| RF24 | **Fotos de productos en el catálogo alojadas en Cloudinary** | Media | Fase 2 | Subida y visualización de imágenes de productos al crear o editar desde el modal de catálogo, almacenadas en Cloudinary con URL guardada en la base de datos (ver ADR-010). |
| RF25 | **Gestión de proveedores**: alta/edición de proveedores y vinculación opcional al crear productos o registrar entradas de stock | Media | Fase 2 | Permite trazabilidad de compras por proveedor y comparar costos entre distintos distribuidores. |
| RF26 | **Visualización de detalle completo por día específico y exportación histórica** | Media | Fase 2 | Permite consultar mediante un selector de fecha el reporte exhaustivo de cualquier día pasado (transacciones desglosadas, medios de pago, ganancias, arqueo) y exportarlo a Excel/PDF. |
| RF27 | **Cajas de facturación (fondos contables):** siempre existe **Caja Principal**; se pueden crear más (ej. Caja Dulces). Cada producto se asigna a **una** caja. Cada caja muestra **total ventas** y **total ganancias**. | Alta | Fase 2 — slice cajas | La Principal se crea automáticamente y se asigna a todos los productos actuales. RF27 ya no queda diferido. Ver RN-C01…RN-C09 y ADR-011. |
| RF28 | **Distribución de ingresos por caja:** cada caja tiene sus propios rubros y porcentajes (suma 100%). Ej. Caja Dulces: 60% inversiones / 40% ahorros. | Alta | Fase 2 — slice cajas | Deja de ser un único 60/30/10 global. La distribución se calcula sobre el **total de ventas de esa caja**. Ver ADR-009. |

### Reglas de negocio RF22 (Apertura / Cierre de jornada POS — validadas)

La **sesión** es la jornada del mostrador (una gaveta física). Los **fondos** (Caja Principal, Caja Dulces, …) son contables y se rigen por RF27/RF28.

| # | Regla | Detalle |
|---|-------|---------|
| RN-01 | **Sesión única abierta** | En todo el sistema solo puede existir **una** `cash_session` con `status = 'open'` a la vez. No se abre/cierra una sesión por cada fondo. |
| RN-02 | **Apertura obligatoria** | Para vender se requiere una sesión abierta. Si no hay ninguna abierta, el POS **bloquea cobros** y exige apertura con monto base (`opening_cash`). |
| RN-03 | **Cierre bloquea ventas** | Tras cerrar (`status = 'closed'`), no hay nuevas ventas hasta una nueva apertura. |
| RN-04 | **Duración de la sesión** | Permanece abierta hasta el cierre explícito, aunque cruce medianoche. |
| RN-05 | **Ventas ligadas a la sesión** | Toda venta confirmada se asocia a `sales.cash_session_id` de la sesión activa. |
| RN-06 | **Gastos en sesión** | Los gastos operativos se registran contra la sesión (efectivo de la gaveta) y se descuentan del arqueo. |
| RN-07 | **Efectivo esperado al cierre** | `closing_cash_calculated = opening_cash + Σ(ventas cash.total_amount) − Σ(gastos de la sesión)`. Las transferencias no suman a la gaveta. |
| RN-08 | **Diferencia de arqueo** | `difference = closing_cash_counted − closing_cash_calculated` (positivo = sobrante, negativo = faltante). |
| RN-09 | **Alcance de este slice** | RF22 + RF27 + RF28 van juntos. Fuera: RF21 (turnos), RF20/RF26 (exportación). |

### Reglas de negocio RF27 / RF28 (Fondos y distribución — validadas)

| # | Regla | Detalle |
|---|-------|---------|
| RN-C01 | **Caja Principal siempre existe** | Al activar la feature se crea (o se garantiza) un registro `cash_registers` con `is_principal = true`. No se puede eliminar ni desactivar. |
| RN-C02 | **Asignación automática del catálogo actual** | Todos los productos existentes sin caja, o con caja nula, quedan en la Caja Principal. |
| RN-C03 | **Cajas adicionales** | La dueña puede crear más fondos (ej. «Caja Dulces»). Cada una tiene nombre, estado activo y su propia distribución. |
| RN-C04 | **Un producto → una caja** | Al crear o editar un producto se elige **una** caja de facturación. Por defecto: Principal. No se reparte un mismo SKU entre varias cajas. |
| RN-C05 | **Snapshot en la venta** | Cada `sale_item` guarda `cash_register_id` al confirmar. Reasignar un producto después **no** mueve el histórico. |
| RN-C06 | **Totales por caja** | Por caja (y por período): **total ventas** = Σ `sale_items.subtotal`; **total ganancias** = Σ `sale_items.profit` (servicios siguen en 0; ganancias externas no entran al fondo del producto). |
| RN-C07 | **Distribución por caja** | Cada caja tiene N rubros con porcentaje. La suma debe ser **exactamente 100%**. Ejemplo Dulces: Inversiones 60% + Ahorros 40%. Principal puede usar otro esquema (ej. 60/30/10). |
| RN-C08 | **Base de la distribución** | Los montos sugeridos = `% × total ventas de esa caja` en el período. No se usa un 60/30/10 global. |
| RN-C09 | **POS unificado** | El cobro no pide «en qué caja»; la atribución sale del producto. El gate de ventas sigue siendo la sesión RF22, no el fondo. |
| RN-C10 | **Navegación: pantalla Mis cajas** | RF27/RF28 se operan en **SCR-06** (`/cajas`): ítem de menú lateral **Mis cajas** y pestaña móvil **Cajas**. SCR-04 Reportes solo muestra tarjetas resumen con enlace a SCR-06. Inventario sigue siendo donde se asigna la caja al producto. |

### Notas técnicas para la fase de Tech Lead

- **RF22 (sesión POS + gate):** `cash_sessions`, `expenses`, `sales.cash_session_id`. Una sola sesión `open`. Ver ADR-012.
- **RF27 (fondos):** `cash_registers` con `is_principal`; `products.cash_register_id` NOT NULL (tras migración); `sale_items.cash_register_id` snapshot. UI: `features/cash` → SCR-06. Ver ADR-011.
- **RF28 (distribución por caja):** `cash_register_distribution_lines` (rubro + porcentaje por `cash_register_id`). Sustituye el singleton global `distribution_settings`. Ver ADR-009.
- **RF24 (fotos con Cloudinary):** URL HTTPS en `products.image_url`.
- **RF26 (reporte diario y exportación):** consultas por fecha y CSV/Excel/PDF; fuera de este slice.

---

## Fuera de alcance para este documento

- Integración con pasarelas de pago electrónico con datáfono en tiempo real.
- Facturación electrónica DIAN.
- Impresión física térmica de tickets en el MVP.

## Preguntas para el usuario (dueño de producto)

*(Todas las preguntas clave del alcance de producto han sido respondidas y validadas por el usuario).*
