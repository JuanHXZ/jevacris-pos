# Levantamiento de Requisitos — Sistema de Ventas e Inventario
**Cliente:** JEVACRIS / negocio de venta de productos de aseo (jabón rey, jabón líquido, suavizante, etc.)
**Fuente:** Documento compartido por el cliente con las especificaciones del requerimiento (21/08/2026)
**Preparado por:** JuanHXZ

---

## 1. Contexto del negocio

- Negocio tipo **tienda/minimercado**, venta al detal de productos de aseo doméstico (jabón en barra, jabón líquido, suavizante, etc.) y otros productos variados.
- El cliente **compra el producto y le aplica un margen (%) de ganancia** para fijar el precio de venta. Actualmente ese cálculo lo hace mentalmente o con calculadora, no hay una herramienta que lo automatice.
- Actualmente usa un **Excel hecho por un tercero (Mariana/María Óscar)**, no una herramienta propia ni un sistema.
- Es un negocio **unipersonal**: la dueña atiende, cobra, calcula y luego digita todo ella misma, sin apoyo.

---

## 2. Proceso actual (as-is)

### 2.1 Venta al cliente
1. El cliente pide uno o varios productos (ej. "un litro de suavizante y una barra de jabón rey").
2. La dueña **suma los valores manualmente con calculadora** cuando son varios productos.
3. Le da el precio total al cliente.
4. El cliente paga (efectivo o Nequi).
5. Si paga en efectivo con billete grande, la dueña **vuelve a usar la calculadora para sacar las vueltas** (ej. total $15.000, paga con $20.000 → vueltas $5.000).
6. Entrega el producto y cierra la venta.

### 2.2 Registro / inventario
7. **Al final del día (en la noche)**, la dueña digita en el Excel lo que vendió:
   - Escribe manualmente el nombre del producto (existe una lista/desplegable parcial).
   - **Digita el precio a mano** (no está guardado ni se busca automáticamente).
   - **Digita la fecha manualmente** cada día.
   - Marca en otra pestaña **el medio de pago** (efectivo / Nequi).
8. Cuando compra mercancía nueva (entradas de stock), **también la digita manualmente** (ej. "compré 20 litros de suavizante").
9. Reconoce que **algunos días se le pasa** registrar lo vendido o lo comprado, por lo que el inventario **no siempre está actualizado ni es confiable**.

---

## 3. Problemas / dolores identificados (pain points)

| # | Problema | Impacto |
|---|----------|---------|
| 1 | No hay cálculo automático de margen/ganancia sobre el costo del producto | Le toca calcular a ojo o con calculadora cada vez que fija un precio |
| 2 | El inventario se actualiza solo en la noche, no en tiempo real | Días en que se le olvida → inventario desactualizado / poco confiable |
| 3 | Suma manual de varios productos en el momento de la venta | Pierde tiempo con el cliente esperando, riesgo de error humano |
| 4 | Cálculo manual de vueltas/cambio | Tiempo perdido, riesgo de dar mal las vueltas, más notorio con billetes grandes |
| 5 | El precio no está guardado en el sistema — lo escribe cada vez | Riesgo de inconsistencia (mismo producto con precios distintos por error de digitación) |
| 6 | La fecha se digita manualmente cada día | Tarea repetitiva innecesaria, riesgo de error |
| 7 | Las entradas de stock (compras) también se digitan 100% a mano, por separado de las ventas | Doble digitación, no hay relación automática entre "compré X" y "me queda X en stock" |
| 8 | El Excel actual no fue diseñado por ella ni lo entiende del todo — solo lo opera | Dependencia de una herramienta que no domina ni puede ajustar |
| 9 | No existe reporte/resumen automático (ventas del día, ganancia, qué se está agotando) | No tiene visibilidad rápida del estado del negocio |

---

## 4. Datos que el sistema debería manejar (identificados en el discurso del cliente)

- **Producto**: nombre, categoría (opcional), unidad de venta (litro, barra, unidad, etc.)
- **Costo de compra** del producto (para poder calcular el margen)
- **Precio de venta** (calculado o fijado con margen sobre el costo)
- **Stock/inventario** por producto
- **Entradas de stock** (compras nuevas, con fecha y cantidad)
- **Ventas** (producto, cantidad, precio, fecha — hoy la fecha se pone a mano)
- **Medio de pago** (efectivo / Nequi, al menos estos dos)
- **Cálculo de vueltas** cuando el pago es en efectivo

---

## 5. Requisitos funcionales sugeridos (a validar con el cliente)

1. **Catálogo de productos** con costo y precio de venta guardados (evita digitar precio en cada venta).
2. **Cálculo automático de margen/precio de venta** a partir de un % configurable sobre el costo.
3. **Módulo de venta rápida (carrito)**: permitir agregar varios productos a una misma venta y que el sistema sume el total automáticamente (elimina el uso de calculadora).
4. **Calculadora de cambio integrada**: el usuario ingresa el valor recibido y el sistema calcula las vueltas automáticamente.
5. **Registro de medio de pago** por venta (efectivo / Nequi, con posibilidad de agregar más adelante).
6. **Fecha automática** en cada transacción (no digitada manualmente).
7. **Descuento automático de inventario** al registrar una venta (para que el stock se actualice solo, sin depender de la digitación nocturna).
8. **Módulo de entradas de stock** (registrar compras) que **sume directamente al inventario** del producto correspondiente, evitando doble trabajo.
9. **Reportes básicos**: ventas del día/semana, ganancia estimada, productos con bajo stock.
10. **Interfaz simple y rápida**, pensada para usarse de pie, atendiendo al cliente (pocos clics, letra grande, poco texto a digitar).

---

## 6. Preguntas abiertas para profundizar con el cliente

- ¿Cuántos productos distintos maneja aproximadamente (para dimensionar el catálogo)?
- R: Mas de 20 productos. esto incluye recargas a operadores móviles. recargas a tarjetas tu llave, corresponsal bancario. productos de aseo variados.
- ¿Cuántas ventas hace en promedio al día?
- R: Sin respuesta clara.
- ¿Necesita usarlo desde celular, tablet o computador? (parece usar computador para el Excel actual)
- R: La Idea es usarlo desde el computador y el telefono.
- ¿Maneja fiado / cuentas pendientes de clientes?
- R: Solo a familiares.
- ¿Solo ella usa el sistema o en algún momento habrá otra persona atendiendo?
- R: Solo ella usa el sistema.
- ¿Necesita funcionar sin internet (modo offline), dado que es una tienda de barrio?
- R: Necesita funcionar sin internet, de manera Hibrida.
- ¿Los otros medios de pago además de efectivo y Nequi (Daviplata, tarjeta, etc.) son relevantes?
- R: Solo efectivo y transferencias.
- ¿Le interesa una alerta cuando un producto esté por agotarse?
- R: Si.

---

## 7. Siguiente paso sugerido

Con este documento como base, se puede pasar a:
1. Priorizar requisitos (must-have vs nice-to-have) con el cliente.
2. Definir historias de usuario / épicas.
3. Bocetar el flujo de "venta rápida" como pantalla principal, dado que es el punto de mayor fricción actual (multiplicación + suma + vueltas, todo bajo presión de tiempo con el cliente esperando).
