# Visión del proyecto — JEVACRIS Sistema POS e Inventario

## Problema que resuelve

El negocio JEVACRIS (tienda/minimercado de productos de aseo y servicios) opera actualmente mediante un archivo de Excel complejo y procesos 100% manuales: la dueña debe calcular mentalmente o con calculadora la suma de productos y el cambio/vueltas frente al cliente, fijar precios sin cálculo automático de margen, y registrar transacciones e inventario al final del día. Esto genera cuellos de botella en la atención, errores humanos en cobros y vueltas, desactualización recurrente del stock y falta de visibilidad sobre las ventas y ganancias reales del día a día.

El sistema resuelve este problema proveyendo una Progressive Web App (PWA) de Punto de Venta (POS) e inventario ágil, ligera e intuitiva, que automatiza el cálculo de precios por margen, la suma de productos en venta, el cálculo de vueltas, el descuento inmediato de stock, el registro automático de entradas de mercancía, medios de pago y consolidación de ganancias de plataformas externas.

## Usuario(s)

- **Dueña / Administradora única del negocio:**
  - Perfil no técnico.
  - Opera el sistema de pie mientras atiende a clientes en el mostrador.
  - Utiliza computador y teléfono móvil de manera indistinta según el momento del día.
  - Requiere interfaces táctiles/rápidas con textos legibles, botones grandes, mínima digitación y operación fluida sin depender permanentemente de conexión a internet (PWA offline-first).

## Alcance del MVP

**Incluye (Must-Have):**
- **Catálogo de Productos y Servicios:** Administración de productos (nombre, unidad, categoría, costo de compra, margen % de ganancia, precio de venta automático/fijo, stock actual y umbral de alerta de stock bajo). Soporte para ítems de servicios/recargas (con cobro en venta y sin cálculo de margen unitario automático).
- **Módulo de Venta Rápida (POS):** Carrito rápido para agregar múltiples ítems en pocos toques, cálculo de totales en tiempo real, calculadora de cambio/vueltas integrada al ingresar el efectivo recibido, soporte de medios de pago (Efectivo y Transferencias/Nequi) y estampado automático de fecha/hora.
- **Control de Inventario en Tiempo Real:** Descuento automático de stock tras cada venta registrada para productos físicos.
- **Entradas de Stock (Compras):** Registro rápido de reabastecimiento que incrementa directamente las existencias de productos y permite actualizar costos.
- **Dashboard / Reporte Diario:** Resumen de ventas del día, balance por medio de pago (Efectivo vs. Transferencias), ganancia bruta estimada de productos físicos, registro/ingreso manual de ganancias de plataformas externas (recargas, corresponsal) para consolidación total, y listado de productos con stock crítico/agotándose.
- **Operación Offline / Híbrida (PWA Local-First con Supabase):** Almacenamiento local para continuidad operativa total sin internet y sincronización en la nube al detectar conexión.

**No incluye (Fase 2+):**
- **Módulo de Fiados / Cuentas por Cobrar:** Registro por cliente, lista de productos adeudados, fecha y control de abonos/pagos parciales (RF18).
- **Múltiples Cajas de Facturación:** Fondos y gavetas de dinero independientes por línea de producto (aseo, mecato/dulces, servicios) con cuadres por separado (RF27).
- **Apertura y Cierre de Caja (Arqueo):** Conteo de efectivo físico contra sistema y deducción de gastos operativos varios (RF22).
- **Reporte Histórico Detallado por Fecha y Exportación (Excel/PDF):** Consulta de días específicos y generación de reportes descargables (RF20 / RF26).
- **Módulo de Distribución y Reinversión Configurable:** Calculadora de metas con porcentajes parametrizables para reinversión, gastos fijos y ahorro personal (RF28).
- **Bloqueo por PIN Local:** Protección de acceso en mostrador sin conexión (RF23).
- **Fotos de productos en catálogo alojadas en Cloudinary** (RF24).
- **Gestión de Proveedores:** Historial de compras y trazabilidad de distribuidores (RF25).
- **Integración API directa con Corresponsalía / Recargas** (RF19).
- **Facturación electrónica DIAN e impresión térmica directa.**

## Relación con otros proyectos/sistemas existentes

- **Reemplazo del libro de Excel actual:** Sustituye el archivo Excel creado por terceros que la dueña operaba manualmente al cierre de jornada. No requiere migración automatizada de datos históricos complejos; se cargará el catálogo inicial de productos de aseo y servicios directamente en el nuevo sistema.
