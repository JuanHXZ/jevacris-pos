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

**Incluye:**
- **Catálogo de Productos y Servicios:** Administración de productos (nombre, unidad, categoría, costo de compra, margen % de ganancia, precio de venta automático/fijo, stock actual y umbral de alerta de stock bajo). Soporte para ítems de servicios/recargas (con cobro en venta y sin cálculo de margen unitario automático).
- **Módulo de Venta Rápida (POS):** Carrito rápido para agregar múltiples ítems en pocos toques, cálculo de totales en tiempo real, calculadora de cambio/vueltas integrada al ingresar el efectivo recibido, soporte de medios de pago (Efectivo y Transferencias/Nequi) y estampado automático de fecha/hora.
- **Control de Inventario en Tiempo Real:** Descuento automático de stock tras cada venta registrada para productos físicos.
- **Entradas de Stock (Compras):** Registro rápido de reabastecimiento que incrementa directamente las existencias de productos y permite actualizar costos.
- **Dashboard / Reporte Diario:** Resumen de ventas del día, balance por medio de pago (Efectivo vs. Transferencias), ganancia bruta estimada de productos, registro/ingreso manual de ganancias de plataformas externas (recargas, corresponsal) para consolidación total, y listado de productos con stock crítico/agotándose.
- **Operación Offline / Híbrida (PWA):** Almacenamiento local para garantizar continuidad operativa sin conexión a internet desde PC y móvil.

**No incluye (fase 2+):**
- **Módulo Avanzado de Fiados / Cuentas por Cobrar:** Gestión de cartera detallada pospuesta a Fase 2.
- **Integración API directa con plataformas de Corresponsalía/Recargas:** Las plataformas externas entregan sus totales de forma independiente; en el sistema solo se registran los valores consolidados.
- **Gestión Multiusuario / Roles de Cajero:** El negocio es unipersonal actualmente.
- **Facturación electrónica / Impresión térmica directa de recibos:** Inicialmente no requerida para el flujo de mostrador de la tienda.

## Relación con otros proyectos/sistemas existentes

- **Reemplazo del libro de Excel actual:** Sustituye el archivo Excel creado por terceros que la dueña operaba manualmente al cierre de jornada. No requiere migración automatizada de datos históricos complejos; se cargará el catálogo inicial de productos de aseo y servicios directamente en el nuevo sistema.
