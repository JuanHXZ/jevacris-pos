# Mapa de Navegación — JEVACRIS Sistema POS e Inventario

## 1. Tipo de mapa adoptado

Navegación tipo **Barra Principal (Tabs)** — destinos de nivel 0:

`Punto de Venta` · `Inventario` · `Entradas de Stock` · `Caja y Turnos` · `Mis Cajas` · `Préstamos y Fiados` · `Reportes`

- **En móvil:** Barra de navegación inferior fija (*Bottom Navigation Bar*) con acceso directo a las vistas operativas principales (`Venta`, `Inventario`, `Entradas`, `Turno`, `Cajas`, `Fiados`, `Reportes`).
- **En computador/tablet:** Barra lateral fija (*Sidebar* `SideNavBar`) con íconos Material Symbols y etiquetas descriptivas.

## 2. Pantalla de arranque

- **Pantalla inicial:** `POS / Venta Rápida` (`/pos` o ruta raíz `/`).
- **Justificación:** Sin pantallas de splash ni menús intermedios. Cuando la dueña abre la aplicación (o desbloquea el teléfono/PC), el sistema debe estar listo inmediatamente para cobrar y agregar productos, minimizando el tiempo muerto frente al cliente. *(En Fase 2, si está activo el bloqueo de seguridad, se solicita el PIN local antes de acceder)*.

## 3. Pantallas principales (Nivel 0)

| Cód. | Pantalla | Ruta / Tab | Descripción |
|------|----------|------------|-------------|
| SCR-01 | **POS / Venta Rápida** | `pos` | **Pantalla principal de atención.** Buscador/selector rápido de productos agrupados por categorías, panel de carrito en vivo, subtotal, cálculo instantáneo de vueltas, botón de cobro (con modal de confirmación previa) y botón *"Dar Fiado / Crédito"*. **Con RF22:** si no hay sesión de caja abierta, el cobro queda bloqueado y se guía a apertura (MOD-06). |
| SCR-02 | **Inventario & Catálogo** | `inventory` | Listado completo de productos y servicios con stock actual, costo, % margen, precio de venta, estado de alerta (OK / Stock Bajo / Agotado), fotos Cloudinary y buscador. |
| SCR-03 | **Entradas de Mercancía** | `stock` | Historial de compras/reabastecimientos registrados y botón para registrar nueva entrada de stock sumando directo al inventario. |
| SCR-04 | **Reportes** | `reports` | Resumen financiero por rango de fechas, distribución de ganancias por caja, **Control de Fiados y Cartera (RF18)**, registro de ganancias externas, alertas de stock crítico y exportación a PDF/Excel/CSV (MOD-09). |
| SCR-05 | **Préstamos y Fiados** | `debts` | **Módulo de Cuentas por Cobrar (RF18).** KPIs de cartera (Total por Cobrar, Clientes Activos, Vencidos / +30 días, Recuperado este Mes), filtros por estado y por persona fiada, tabla de tickets `#CR-XXXX` y acciones para abonar o ver historial completo. |
| SCR-06 | **Mis Cajas** | `cash` | **Pantalla de primer nivel (RF27 / RF28).** Lista de fondos contables, crear caja, entrar al detalle: total ventas, total ganancias, distribución % (editable, suma 100%) y productos asignados. Caja Principal no se elimina. |
| SCR-07 | **Caja y Turnos** | `session` | **Gestión operativa de gaveta (RF22).** Apertura de turno con base/denominaciones, registro de gastos operativos de gaveta, cierre de caja con arqueo ciego/comparativo e historial de cierres (Arqueo Z). |

## 4. Rutas y Modales de Detalle (Nivel 1+)

| Cód. | Componente / Modal | Disparador | Descripción |
|------|---------------------|------------|-------------|
| MOD-01 | **Modal de Confirmación de Venta** | Botón "Confirmar Venta" en SCR-01 (POS) | Muestra el resumen completo antes de procesar la venta (lista de ítems y cantidades, medio de pago Efectivo/Transferencia, desglose de efectivo recibido y cambio a devolver, y total a cobrar). Incluye protección contra doble envío y **doble confirmación** si el usuario decide cancelar la venta y vaciar el carrito. |
| MOD-02 | **Modal / Drawer Producto** | Botón "+ Nuevo Producto" o click en editar en SCR-02 | Formulario: Nombre, tipo, categoría, **caja de facturación** (obligatoria; una sola; default Principal), unidad, costo, % margen o precio fijo, stock inicial, stock mínimo y foto. |
| MOD-03 | **Modal Registro de Entrada** | Botón "+ Registrar Entrada" en SCR-03 | Selector de producto, cantidad a ingresar, costo de compra (opcionalmente actualizable) y confirmación de suma al stock. |
| MOD-04 | **Modal Ganancia Externa** | Botón "+ Ganancia Externa" en SCR-04 | Registro de utilidades liquidadas en plataformas de recargas o corresponsal bancario (fecha, plataforma/concepto, valor de ganancia neta). |
| MOD-05 | **Modal de Respaldo Local** | Botón "Copia de Seguridad" en SCR-04 | Exportar base de datos a archivo JSON descargable e importar archivo para restaurar información. |
| MOD-06 | **Apertura / Cierre de jornada & Gastos (Arqueo) — RF22** | SCR-07 (`Caja y Turnos`) o Gate en SCR-01 | Una sesión POS: (1) apertura con base; (2) gastos de la jornada; (3) cierre con conteo vs. esperado y bloqueo de ventas. Independiente de los fondos RF27. |
| MOD-07 | **Crear / Editar caja de facturación** | Botón "+ Nueva caja" o editar en SCR-06 | Nombre, rubros de distribución (N líneas, suma 100%). La Principal no se puede borrar. |
| MOD-07b | **Detalle de caja** | Tap/click en una caja de SCR-06 | Totales (ventas, ganancias), desglose de % con montos sugeridos, listado de productos de esa caja. |
| MOD-08a | **Modal Registrar Nuevo Préstamo / Fiado (`NewDebtModal`)** | Botón "Nuevo Préstamo" en SCR-05 o "Dar Fiado / Crédito" en SCR-01 | Datos del cliente (con autocompletado de personas existentes), fecha límite opcional (inicia vacía), buscador de catálogo para agregar productos físicos o servicios/recargas (o pre-carga del carrito del POS) y confirmación que descuenta stock sin registrar venta. |
| MOD-08b | **Modal Registrar Abono / Pago (`RegisterPaymentModal`)** | Botón de abono en SCR-05 o desde el detalle del ticket | Permite elegir **Pago Total** o **Abono Parcial**, medio de pago (Efectivo / Transferencia) y notas. Verifica sesión de caja abierta y genera la venta proporcional correspondiente. |
| MOD-08c | **Modal Detalle de Fiado (`DebtDetailModal`)** | Botón ver detalle en SCR-05 | Muestra el ticket `#CR-XXXX`, estado, barra de progreso de pago, tabla de productos/servicios fiados e historial cronológico de abonos realizados. |
| MOD-09 | **Exportador de Reportes (`ExportReportModal`)** | Botón "Exportar Reporte" en SCR-04 | Generador de reportes consolidados y por rango de fechas descargables en PDF, Excel (`.xlsx`) o CSV, incluyendo métricas de ventas, arqueos y fiados. |

## 5. Extensiones previstas para Fase 2 (Pendientes)

| Cód. | Pantalla / Modal | Descripción |
|------|-------------------|-------------|
| SCR-00 / MOD-PIN | **Pantalla de Bloqueo por PIN** | Solicitud de PIN numérico rápido de 4 a 6 dígitos al abrir la app o tras inactividad. |

## 6. Decisiones de flujo

- **Venta de servicios/recargas:** Se añaden al carrito en SCR-01 como cualquier ítem, pero se solicita el monto o se elige un valor predefinido. No descuentan inventario físico al confirmar la venta ni al fiarse.
- **Cobro exprés con confirmación segura:** En el POS se calcula el cambio en tiempo real al digitar el monto recibido. Al pulsar *"Confirmar Venta"*, se abre el modal de verificación (`MOD-01`) para evitar ventas duplicadas por error; si el cajero elige *"Cancelar Venta"*, se solicita una segunda confirmación antes de limpiar el carrito.
- **Flujo de Préstamos y Fiados (RF18):** Al entregar mercancía fiada (desde POS o desde `SCR-05`), se descuenta el stock físico de inmediato pero no ingresa dinero ni se registra venta. Cuando el cliente realiza un abono o paga el total (`MOD-08b`), se exige una sesión de caja abierta y el sistema registra automáticamente la venta proporcional en el turno actual sin volver a descontar stock.
- **Gate de jornada (RF22 / ADR-012):** Sin sesión `open`, el POS no confirma cobros ni permite registrar abonos de fiados. Una sesión abierta a la vez; puede cruzar medianoche.
- **Fondos (RF27):** Un producto → una caja (default Principal). El cobro no pregunta la caja. Administración y detalle viven en **SCR-06 Mis cajas**.
- **Distribución (RF28):** Por caja, sobre su total de ventas. Se configura en el detalle de SCR-06. Ej. Dulces: 60% inversiones / 40% ahorros.

## 7. Prácticas de navegación aplicadas

| Práctica | Detalle |
|----------|---------|
| Persistencia de Carrito | Si la dueña cambia accidentalmente de pestaña (ej. a Inventario a verificar un precio), el carrito del POS no se pierde. |
| Modales superpuestos sin recarga | Los cobros, préstamos, abonos y registros se manejan como modales/overlays para no perder el contexto de la pantalla base. |
| Teclas rápidas en Desktop | Soporte para Enter (Cobrar/Confirmar) y Escape (Cerrar modal) para uso ágil con teclado en PC. |
