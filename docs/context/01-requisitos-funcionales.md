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
| RF12 | Actualización opcional de costo de compra al ingresar mercancía | Alta | Must-Have MVP | Evita la doble tarea de ir al catálogo a cambiar el costo cada vez que un proveedor sube el precio en una factura de compra. |

## 4. Reportes, Cuadre de Caja y Consolidación de Ganancias

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF13 | Resumen diario de ventas totales y desglose por medio de pago (Efectivo vs. Transferencias) | Alta | Must-Have MVP | Facilita el cuadre de caja al cierre del día sin hacer cuentas manuales. |
| RF14 | Registro manual de ganancias externas (ingreso de ganancias de plataformas de recargas/corresponsal) | Alta | Must-Have MVP | Permite consolidar la ganancia neta total diaria/semanal integrando las plataformas externas que ya liquidan su ganancia. |
| RF15 | Indicador de ganancia bruta total del día (Ganancia productos físicos + Ganancias externas registradas) | Alta | Must-Have MVP | Da visibilidad instantánea de la rentabilidad real completa del negocio. |
| RF16 | Listado de alertas de productos agotados o por debajo del stock mínimo | Alta | Must-Have MVP | Evita quedarse sin productos de alta rotación (ej. jabón rey, suavizante). |

## 5. Operatividad y Persistencia Offline

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF17 | PWA con almacenamiento local completo de catálogo, ventas y reportes (Offline-First) | Alta | Must-Have MVP | Garantiza continuidad operativa total en PC y móvil ante caídas o ausencia de conexión a internet. |

## Fase 2 (fuera del MVP)

| ID | Feature | Prioridad | Clasificación | Justificación / Notas |
|----|---------|-----------|---------------|------------------------|
| RF18 | Módulo de fiados / cuentas por cobrar a familiares | Media | Fase 2 | No es crítico para la operativa diaria de venta general; se puede gestionar manualmente en el corto plazo. |
| RF19 | Integración API o importación directa de reportes desde plataformas de corresponsalía | Media | Fase 2 | Automatización adicional sobre el registro manual de ganancias externas del MVP. |
| RF20 | Exportación de reportes a Excel / PDF y respaldos automáticos en la nube | Media | Fase 2 | Valor agregado para contabilidad formal, pero prescindible para el arranque inicial. |
| RF21 | Gestión de múltiples usuarios o turnos de caja | Baja | Fase 2 | El negocio es unipersonal actualmente. |

---

## Fuera de alcance para este documento

- Integración con pasarelas de pago electrónico con datáfono en tiempo real.
- Facturación electrónica DIAN.
- Impresión física térmica de tickets en el MVP.

## Preguntas para el usuario (dueño de producto)

*(Todas las preguntas clave del alcance de producto han sido respondidas y validadas por el usuario).*
