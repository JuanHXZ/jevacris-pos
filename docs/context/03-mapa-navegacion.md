# Mapa de Navegación — JEVACRIS Sistema POS e Inventario

## 1. Tipo de mapa adoptado

Navegación tipo **Barra Principal (Tabs)**:
- **En móvil:** Barra de navegación inferior fija (*Bottom Navigation Bar*) con iconos grandes y etiquetas claras para alternar con una sola mano.
- **En computador/tablet:** Barra lateral fija (*Sidebar*) que mantiene visible el acceso a todos los módulos y maximiza el espacio horizontal para el carrito de venta rápida y el catálogo.

## 2. Pantalla de arranque

- **Pantalla inicial:** `POS / Venta Rápida` (`/pos` o ruta raíz `/`).
- **Justificación:** Sin pantallas de splash ni menús intermedios. Cuando la dueña abre la aplicación (o desbloquea el teléfono/PC), el sistema debe estar listo inmediatamente para cobrar y agregar productos, minimizando el tiempo muerto frente al cliente. *(En Fase 2, si está activo el bloqueo de seguridad, se solicita el PIN local antes de acceder)*.

## 3. Pantallas principales (Nivel 0)

| Cód. | Pantalla | Ruta | Descripción |
|------|----------|------|-------------|
| SCR-01 | **POS / Venta Rápida** | `/` o `/pos` | **Pantalla principal de atención.** Buscador/selector rápido de productos agrupados por categorías, panel de carrito en vivo, subtotal, cálculo instantáneo y botón de cobro. |
| SCR-02 | **Inventario & Catálogo** | `/inventario` | Listado completo de productos y servicios con stock actual, costo, % margen, precio de venta, estado de alerta (OK / Stock Bajo / Agotado), fotos Cloudinary y buscador. |
| SCR-03 | **Entradas de Mercancía** | `/entradas` | Historial de compras/reabastecimientos registrados y botón para registrar nueva entrada de stock sumando directo al inventario. |
| SCR-04 | **Caja y Reportes** | `/reportes` | Cuadre del día/semana, selector de fecha histórica para detalle diario exhaustivo, botón de exportar (Excel/PDF), registro de ganancias externas, ganancia total consolidada, productos críticos y calculadora de distribución configurable. |

## 4. Rutas y Modales de Detalle (Nivel 1+)

| Cód. | Componente / Modal | Disparador | Descripción |
|------|---------------------|------------|-------------|
| MOD-01 | **Modal de Cobro & Vueltas** | Botón "Cobrar" en SCR-01 (POS) | Muestra el total a pagar, botones rápidos de denominación de billetes colombianos ($10k, $20k, $50k, $100k, Exacto) o campo numérico, cálculo automático de vueltas y selector de medio de pago (Efectivo / Transferencia Nequi). Botón de "Confirmar Venta". |
| MOD-02 | **Modal / Drawer Producto** | Botón "+ Nuevo Producto" o click en editar en SCR-02 | Formulario para crear/editar producto: Nombre, tipo (físico/servicio), categoría, caja de facturación asignada (Fase 2), unidad, costo de compra, % margen o precio fijo, stock inicial, stock mínimo y subida de foto vía Cloudinary (Fase 2). |
| MOD-03 | **Modal Registro de Entrada** | Botón "+ Registrar Entrada" en SCR-03 | Selector de producto, cantidad a ingresar, costo de compra (opcionalmente actualizable) y confirmación de suma al stock. |
| MOD-04 | **Modal Ganancia Externa** | Botón "+ Ganancia Externa" en SCR-04 | Registro de utilidades liquidadas en plataformas de recargas o corresponsal bancario (fecha, plataforma/concepto, valor de ganancia neta). |
| MOD-05 | **Modal de Respaldo Local** | Botón "Copia de Seguridad" en SCR-04 | Exportar base de datos a archivo JSON descargable e importar archivo para restaurar información. |

## 5. Extensiones previstas para Fase 2

| Cód. | Pantalla / Modal | Descripción |
|------|-------------------|-------------|
| SCR-00 / MOD-PIN | **Pantalla de Bloqueo por PIN** | Solicitud de PIN numérico rápido de 4 a 6 dígitos al abrir la app o tras inactividad. |
| SCR-05 | **Módulo de Fiados / Cuentas por Cobrar** | Directorio de clientes con deuda, lista de productos fiados, historial de abonos y saldo pendiente. |
| MOD-06 | **Apertura / Cierre de Caja & Gastos (Arqueo)** | Conteo de base inicial, registro de gastos varios del día (arriendo, servicios) y arqueo de caja con cálculo de diferencias. |
| MOD-07 | **Gestor de Cajas de Facturación** | Administración de múltiples cajas o fondos de dinero por línea de negocio (Aseo, Dulces, Servicios) y asignación a productos. |
| MOD-08 | **Configurador de Metas de Distribución** | Ajuste de los porcentajes configurables de reinversión (ej. 60%), gastos operativos (ej. 30%) y fondo personal/ahorro (ej. 10%). |
| MOD-09 | **Exportador de Reportes** | Generador de reportes consolidados y diarios descargables en Excel, PDF o CSV. |

## 6. Decisiones de flujo

- **Venta de servicios/recargas:** Se añaden al carrito en SCR-01 como cualquier ítem, pero se solicita el monto o se elige un valor predefinido. No descuentan inventario físico al confirmar la venta.
- **Cobro exprés:** Al presionar "Cobrar" en POS, el foco va de inmediato al monto recibido para que el cálculo de vueltas aparezca en tiempo real con cada tecla pulsada.
- **Confirmación de venta:** Al pulsar "Confirmar Venta", se limpia el carrito inmediatamente, se descuenta el stock en segundo plano y se muestra un banner/toast verde no bloqueante con el monto de las vueltas para que la dueña pueda leerlo con calma mientras entrega el cambio.

## 7. Prácticas de navegación aplicadas

| Práctica | Detalle |
|----------|---------|
| Persistencia de Carrito | Si la dueña cambia accidentalmente de pestaña (ej. a Inventario a verificar un precio), el carrito del POS no se pierde. |
| Modales superpuestos sin recarga | Los cobros y registros se manejan como modales/overlays para no perder el contexto de la pantalla base. |
| Teclas rápidas en Desktop | Soporte para Enter (Cobrar/Confirmar) y Escape (Cerrar modal) para uso ágil con teclado en PC. |
