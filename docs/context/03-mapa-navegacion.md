# Mapa de Navegación — JEVACRIS Sistema POS e Inventario

## 1. Tipo de mapa adoptado

Navegación tipo **Barra Principal (Tabs)** — cinco destinos de nivel 0:

`Venta Rápida` · `Inventario` · `Entradas` · `Mis cajas` · `Reportes`

- **En móvil:** Barra de navegación inferior fija (*Bottom Navigation Bar*). Etiqueta corta **«Cajas»** para SCR-06.
- **En computador/tablet:** Barra lateral fija (*Sidebar*) con etiqueta **«Mis cajas»**.

## 2. Pantalla de arranque

- **Pantalla inicial:** `POS / Venta Rápida` (`/pos` o ruta raíz `/`).
- **Justificación:** Sin pantallas de splash ni menús intermedios. Cuando la dueña abre la aplicación (o desbloquea el teléfono/PC), el sistema debe estar listo inmediatamente para cobrar y agregar productos, minimizando el tiempo muerto frente al cliente. *(En Fase 2, si está activo el bloqueo de seguridad, se solicita el PIN local antes de acceder)*.

## 3. Pantallas principales (Nivel 0)

| Cód. | Pantalla | Ruta | Descripción |
|------|----------|------|-------------|
| SCR-01 | **POS / Venta Rápida** | `/` o `/pos` | **Pantalla principal de atención.** Buscador/selector rápido de productos agrupados por categorías, panel de carrito en vivo, subtotal, cálculo instantáneo y botón de cobro. **Con RF22:** si no hay sesión de caja abierta, el cobro queda bloqueado y se guía a apertura (MOD-06). |
| SCR-02 | **Inventario & Catálogo** | `/inventario` | Listado completo de productos y servicios con stock actual, costo, % margen, precio de venta, estado de alerta (OK / Stock Bajo / Agotado), fotos Cloudinary y buscador. |
| SCR-03 | **Entradas de Mercancía** | `/entradas` | Historial de compras/reabastecimientos registrados y botón para registrar nueva entrada de stock sumando directo al inventario. |
| SCR-04 | **Caja y Reportes** | `/reportes` | Cuadre del día/semana, estado de **sesión POS** (abierta/cerrada), arqueo (MOD-06), ganancias externas y productos críticos. **Atajo RF27:** tarjetas resumen (Principal / Dulces: ventas) que navegan a SCR-06. No se crea ni edita fondos aquí. |
| SCR-06 | **Mis cajas** | `/cajas` | **Pantalla de primer nivel (RF27 / RF28).** Lista de fondos, crear caja, entrar al detalle: total ventas, total ganancias, distribución % (editable, suma 100%) y productos asignados. Caja Principal no se elimina. |

## 4. Rutas y Modales de Detalle (Nivel 1+)

| Cód. | Componente / Modal | Disparador | Descripción |
|------|---------------------|------------|-------------|
| MOD-01 | **Modal de Cobro & Vueltas** | Botón "Cobrar" en SCR-01 (POS) | Muestra el total a pagar, botones rápidos de denominación de billetes colombianos ($10k, $20k, $50k, $100k, Exacto) o campo numérico, cálculo automático de vueltas y selector de medio de pago (Efectivo / Transferencia Nequi). Botón de "Confirmar Venta". |
| MOD-02 | **Modal / Drawer Producto** | Botón "+ Nuevo Producto" o click en editar en SCR-02 | Formulario: Nombre, tipo, categoría, **caja de facturación** (obligatoria; una sola; default Principal), unidad, costo, % margen o precio fijo, stock inicial, stock mínimo y foto Cloudinary (Fase 2). |
| MOD-07 | **Crear / Editar caja de facturación** | Botón "+ Nueva caja" o editar en SCR-06 | Nombre, rubros de distribución (N líneas, suma 100%). La Principal no se puede borrar. |
| MOD-07b | **Detalle de caja** | Tap/click en una caja de SCR-06 | Totales (ventas, ganancias), desglose de % con montos sugeridos, listado de productos de esa caja. |
| MOD-03 | **Modal Registro de Entrada** | Botón "+ Registrar Entrada" en SCR-03 | Selector de producto, cantidad a ingresar, costo de compra (opcionalmente actualizable) y confirmación de suma al stock. |
| MOD-04 | **Modal Ganancia Externa** | Botón "+ Ganancia Externa" en SCR-04 | Registro de utilidades liquidadas en plataformas de recargas o corresponsal bancario (fecha, plataforma/concepto, valor de ganancia neta). |
| MOD-05 | **Modal de Respaldo Local** | Botón "Copia de Seguridad" en SCR-04 | Exportar base de datos a archivo JSON descargable e importar archivo para restaurar información. |

## 5. Extensiones previstas para Fase 2

| Cód. | Pantalla / Modal | Descripción |
|------|-------------------|-------------|
| SCR-00 / MOD-PIN | **Pantalla de Bloqueo por PIN** | Solicitud de PIN numérico rápido de 4 a 6 dígitos al abrir la app o tras inactividad. |
| SCR-05 | **Módulo de Fiados / Cuentas por Cobrar** | Directorio de clientes con deuda, lista de productos fiados, historial de abonos y saldo pendiente. |
| MOD-06 | **Apertura / Cierre de jornada & Gastos (Arqueo) — RF22** | Una sesión POS: (1) apertura con base; (2) gastos de la jornada; (3) cierre con conteo vs. esperado y bloqueo de ventas. Independiente de los fondos RF27. Vive en SCR-04, no en Mis cajas. |
| MOD-09 | **Exportador de Reportes** | Generador de reportes consolidados y diarios descargables en Excel, PDF o CSV. |

## 6. Decisiones de flujo

- **Venta de servicios/recargas:** Se añaden al carrito en SCR-01 como cualquier ítem, pero se solicita el monto o se elige un valor predefinido. No descuentan inventario físico al confirmar la venta.
- **Cobro exprés:** Al presionar "Cobrar" en POS, el foco va de inmediato al monto recibido para que el cálculo de vueltas aparezca en tiempo real con cada tecla pulsada.
- **Confirmación de venta:** Al pulsar "Confirmar Venta", se limpia el carrito inmediatamente, se descuenta el stock en segundo plano y se muestra un banner/toast verde no bloqueante con el monto de las vueltas para que la dueña pueda leerlo con calma mientras entrega el cambio.
- **Gate de jornada (RF22 / ADR-012):** Sin sesión `open`, el POS no confirma cobros. Una sesión abierta a la vez; puede cruzar medianoche.
- **Fondos (RF27):** Un producto → una caja (default Principal). El cobro no pregunta la caja. Administración y detalle viven en **SCR-06 Mis cajas**; Reportes solo muestra un resumen con enlace.
- **Distribución (RF28):** Por caja, sobre su total de ventas. Se configura en el detalle de SCR-06. Ej. Dulces: 60% inversiones / 40% ahorros.
- **Flujo de jornada típico:** Abrir sesión → vender (ítems a su fondo) / gastos de gaveta → cerrar arqueo → ventas bloqueadas hasta nueva apertura.
## 7. Prácticas de navegación aplicadas

| Práctica | Detalle |
|----------|---------|
| Persistencia de Carrito | Si la dueña cambia accidentalmente de pestaña (ej. a Inventario a verificar un precio), el carrito del POS no se pierde. |
| Modales superpuestos sin recarga | Los cobros y registros se manejan como modales/overlays para no perder el contexto de la pantalla base. |
| Teclas rápidas en Desktop | Soporte para Enter (Cobrar/Confirmar) y Escape (Cerrar modal) para uso ágil con teclado en PC. |
