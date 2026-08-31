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
| RF22 | **Apertura y cierre de caja (Arqueo)** con registro de gastos operativos varios (arriendo, servicios, imprevistos) | Alta | Fase 2 | Compara el efectivo físico contado al abrir y cerrar contra el cálculo del sistema para detectar faltantes/sobrantes y deducir gastos reales. |
| RF23 | **Bloqueo de acceso por PIN local** | Alta | Fase 2 | Resuelve el acceso seguro sin depender de conexión a internet ni costos de OTP por SMS/WhatsApp (ver ADR-008). |
| RF24 | **Fotos de productos en el catálogo alojadas en Cloudinary** | Media | Fase 2 | Subida y visualización de imágenes de productos al crear o editar desde el modal de catálogo, almacenadas en Cloudinary con URL guardada en la base de datos (ver ADR-010). |
| RF25 | **Gestión de proveedores**: alta/edición de proveedores y vinculación opcional al crear productos o registrar entradas de stock | Media | Fase 2 | Permite trazabilidad de compras por proveedor y comparar costos entre distintos distribuidores. |
| RF26 | **Visualización de detalle completo por día específico y exportación histórica** | Media | Fase 2 | Permite consultar mediante un selector de fecha el reporte exhaustivo de cualquier día pasado (transacciones desglosadas, medios de pago, ganancias, arqueo) y exportarlo a Excel/PDF. |
| RF27 | **Múltiples Cajas de Facturación / Fondos de Dinero Separados por Línea de Producto**: cajas físicas/contables independientes | Media | Fase 2 | Permite asignar categorías de productos a cajas registradoras o fondos específicos (ej. caja de productos de aseo, caja de dulces/mecato, caja de servicios) para cuadrar y rastrear el dinero por separado, permitiendo a la vez consolidar gastos compartidos. |
| RF28 | **Módulo de Distribución de Ingresos y Reinversión Configurable**: porcentajes parametrizables por la dueña | Media | Fase 2 | Calcula la distribución sugerida de ventas diarias en: **Reinversión** (compra de mercancía), **Gastos Operativos** (arriendo/servicios) y **Fondo Personal/Ahorro** (caja chica diaria). Los porcentajes (ej. 60/30/10 por defecto) son 100% configurables por la usuaria en los ajustes. |

### Notas técnicas para la fase de Tech Lead

- **RF24 (fotos con Cloudinary):** Se integrará con el API/SDK de Cloudinary o Widget de subida directa optimizado. Se guarda la URL HTTPS de la imagen en `products.image_url`. No se sobrecarga IndexedDB con archivos binarios pesados y la imagen queda sincronizada automáticamente en todos los dispositivos.
- **RF26 (reporte diario y exportación):** El motor de reportes permitirá consultar por rango de fechas o día puntual con agregaciones completas y generar exportaciones en formato CSV/Excel (utilizando librerías livianas como `xlsx` o `jspdf`).
- **RF27 (cajas de facturación):** Requiere una entidad `cash_registers` o `drawers` (cajas de facturación) asociables a categorías o productos (`cash_register_id`). Las transacciones y los arqueos de caja (`cash_sessions`) se vinculan a su respectiva caja de facturación.
- **RF28 (distribución parametrizable):** Se crea una tabla o configuración local (`app_settings` / `distribution_rules`) donde se almacenan los porcentajes configurados (`reinvestment_pct`, `expenses_pct`, `personal_pct`, cuya suma debe ser 100%).

---

## Fuera de alcance para este documento

- Integración con pasarelas de pago electrónico con datáfono en tiempo real.
- Facturación electrónica DIAN.
- Impresión física térmica de tickets en el MVP.

## Preguntas para el usuario (dueño de producto)

*(Todas las preguntas clave del alcance de producto han sido respondidas y validadas por el usuario).*
