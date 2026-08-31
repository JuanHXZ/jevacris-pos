# Decisiones de Arquitectura (ADRs) — JEVACRIS Sistema POS e Inventario

## ADR-001: Arquitectura de Aplicación Web Progresiva (PWA Offline-First) con React y Vite
- **Decisión:** Desarrollar el sistema como una Single Page Application (SPA) / PWA utilizando React, TypeScript y Vite. La aplicación se ejecutará en el navegador y se instalará localmente tanto en computador como en dispositivos móviles.
- **Alternativas consideradas:**
  - *App nativa móvil (React Native / Flutter):* Descartada por mayor complejidad de despliegue, incompatibilidad directa y rápida con el navegador de PC de escritorio y mayor costo de mantenimiento para un negocio unipersonal.
  - *Aplicación Web tradicional con backend en la nube (Node/Express/Postgres):* Descartada porque requiere conexión permanente a internet en la tienda y costos de hosting/servidor innecesarios para el MVP.
- **Razón:** La dueña necesita usar la herramienta indistintamente en PC y teléfono móvil, con funcionamiento continuo sin internet y velocidad de arranque instantánea. PWA ofrece compatibilidad universal multiplataforma e instalación sin tiendas de apps.
- **Fuente de la decisión:** Confirmada por el usuario en las respuestas de validación técnica.

---

## ADR-002: Motor de Persistencia Local con IndexedDB y Dexie.js
- **Decisión:** Utilizar IndexedDB a través de la librería Dexie.js como la base de datos local embebida en el cliente.
- **Alternativas consideradas:**
  - *LocalStorage:* Descartado por límite de 5MB, operaciones síncronas bloqueantes y falta de soporte para consultas indexadas o transacciones.
  - *SQLite WASM en navegador (wa-sqlite / sql.js):* Evaluado positivamente, pero Dexie.js ofrece integración reactiva nativa con React (`useLiveQuery`), tipado TypeScript robusto y menor sobrecarga de inicialización WASM en dispositivos móviles modestos.
- **Razón:** Dexie.js proporciona soporte transaccional (crucial para descontar stock y crear la venta atómicamente), consultas indexadas ultra-rápidas (< 5ms) y persistencia offline durable en todos los navegadores modernos.
- **Fuente de la decisión:** Propuesta técnica del Tech Lead aprobada por diseño offline-first.
- **Actualización (revisión Tech Lead):** `schema.sql` en `docs/context/` representa **únicamente** el esquema de Supabase/Postgres (ver ADR-006), no el de Dexie. El esquema Dexie es un artefacto de código separado (`src/db/index.ts`, sintaxis `.stores()`) que debe mantenerse equivalente manualmente (ver `03b-bd-resumen.md`).

---

## ADR-003: Sistema de Diseño Ergonómico de Mostrador con CSS Tokens
- **Decisión:** Implementar un sistema de estilos con Vanilla CSS estructurado en variables/tokens de diseño (paleta armónica moderna con alto contraste, tipografía legible estilo Inter/Roboto, botones táctiles mínimos de 48px y soporte responsivo desktop/mobile).
- **Alternativas consideradas:**
  - *Frameworks CSS pesados (Bootstrap, etc.):* Descartados para evitar sobrecarga y estilos genéricos de formulario.
- **Razón:** La dueña atiende de pie y necesita pulsar rápidamente botones de cobro, ver los números de vueltas y totales en tamaño grande y operar sin fatiga visual ni fallos táctiles.
- **Fuente de la decisión:** Directriz de diseño ergonómico de mostrador identificada en el levantamiento de requisitos.

---

## ADR-004: Modelo de Gestión de Servicios y Ganancias de Plataformas Externas
- **Decisión:** Los servicios (recargas, corresponsal) se ingresan como ítems de venta en el POS para cobrar al cliente, pero no calculan ganancia unitaria sobre costo ni descuentan inventario físico. En su lugar, el módulo de reportes incluye una función dedicada para registrar los ingresos/ganancias consolidados reportados por las plataformas externas al final de la jornada.
- **Alternativas consideradas:**
  - *Intentar calcular comisiones porcentuales automáticas por recarga en el POS:* Descartado porque cada operador y banco aplica esquemas variables y liquidaciones globales externas.
  - *Omitir las recargas del POS:* Descartado porque la dueña necesita sumar el cobro total cuando un cliente compra productos físicos y una recarga en la misma transacción.
- **Razón:** Simplifica la venta al mostrador y permite un cuadre consolidado exacto en el reporte diario sin duplicar la lógica de liquidación de las empresas proveedoras.
- **Fuente de la decisión:** Decisión explícita del usuario durante la aclaración de requisitos.
- **Actualización (revisión Tech Lead — corrección de ambigüedad):** `profit` se inserta en `0` para todo `sale_item` donde `product.type == 'service'`. La query de ganancia consolidada además filtra `p.type = 'physical'` como segunda capa de seguridad. Ver `03b-bd-resumen.md` para el detalle completo y la query corregida.

---

## ADR-005: Estructura del Código y Convenciones del Proyecto
- **Decisión:** Organizar el proyecto con una arquitectura limpia por capas y módulos funcionales:
  ```text
  src/
  ├── components/       # Componentes visuales reutilizables (UI: Button, Input, Modal, Badge)
  ├── features/
  │   ├── pos/          # Pantalla POS, Carrito, Modal de Cobro & Vueltas
  │   ├── inventory/    # Catálogo, Formulario de Producto, Cálculo de Margen
  │   ├── stock/        # Entradas de mercancía y compras
  │   └── reports/      # Dashboard, cuadre de caja, ganancias externas, distribución
  ├── db/               # Configuración de Dexie, esquema y migraciones
  ├── repositories/     # Capa de acceso a datos (CRUD y queries especializadas)
  ├── sync/             # Motor de sincronización en segundo plano con Supabase
  ├── hooks/            # Hooks reactivos de estado y consultas
  ├── types/            # Definiciones e interfaces TypeScript
  └── styles/           # Variables, tokens de diseño y temas CSS
  ```
- **Convenciones:**
  - Nombres de archivos y componentes: `PascalCase` para componentes (`ProductCard.tsx`), `camelCase` para utilidades y repositorios (`salesRepository.ts`).
  - Commits convencionales: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- **Razón:** Mantiene el código desacoplado, modular y fácil de mantener y probar.
- **Fuente de la decisión:** Propuesta técnica del Tech Lead.

---

## ADR-006: Sincronización en la Nube con Supabase (PostgreSQL) y Sync Engine Local-First
- **Decisión:** Integrar Supabase (PostgreSQL en la nube) como backend de respaldo y sincronización bidireccional. La aplicación opera con el patrón *Local-First*: todas las operaciones se ejecutan inmediatamente contra IndexedDB local y un *Sync Engine* sincroniza en segundo plano las tablas con Supabase cuando hay conexión.
- **Alternativas consideradas:**
  - *Firebase Firestore:* Buena sincronización pero modelo NoSQL documental que dificulta queries relacionales de reportes y cuadres de caja.
  - *Solo persistencia local IndexedDB con archivo JSON descargable:* Descartada porque no permite sincronización fluida en tiempo real entre el computador y el teléfono móvil, y depende de la disciplina del usuario para generar copias de seguridad.
- **Razón:** Garantiza que tanto la app del PC como la del celular tengan exactamente la misma información actualizada, previene la pérdida de datos ante fallos del navegador o cambio de dispositivo, y mantiene el funcionamiento 100% offline cuando no hay internet.
- **Fuente de la decisión:** Solicitada explícitamente por el usuario para sincronización multi-dispositivo y validada directamente con la clienta.

---

## ADR-007: Estrategia de Despliegue y Hosting de la PWA
- **Decisión:** Desplegar la aplicación frontend en plataformas de hosting estático modernas como Vercel o Cloudflare Pages con certificado SSL (HTTPS) obligatorio para el funcionamiento del Service Worker de la PWA.
- **Alternativas consideradas:**
  - *Servidor VPS propio (Ubuntu + Nginx):* Descartado por costos y mantenimiento innecesario para un frontend estático.
- **Razón:** Despliegue continuo gratuito, alta disponibilidad global, HTTPS automático y soporte nativo para actualizaciones de Service Worker.
- **Fuente de la decisión:** Propuesta técnica del Tech Lead.

---

## ADR-008: Bloqueo de Acceso por PIN Local (no OTP)
- **Decisión:** El acceso a la app se protege con un PIN local simple, verificado en el dispositivo, sin depender de un código enviado por WhatsApp, SMS o email.
- **Alternativas consideradas:**
  - *OTP por WhatsApp Business API:* Descartada — costos por mensaje en Meta Authentication y dependencia de conexión a internet obligatoria, rompiendo el principio offline-first (ADR-001).
  - *OTP por email vía Supabase Auth:* Descartada porque requiere conexión para iniciar sesión, innecesario para un solo usuario con acceso físico a su propio dispositivo.
- **Razón:** El sistema es de un solo usuario (la dueña) en sus propios dispositivos. Un PIN local resuelve la seguridad contra accesos no autorizados en mostrador sin costo recurrente ni dependencia de red.
- **Fuente de la decisión:** Confirmada por el usuario tras evaluar las alternativas de OTP.

---

## ADR-009: Distribución Financiera Configurable de Ingresos y Reinversión (Fase 2)
- **Decisión:** Implementar en el módulo de reportes y arqueo un modelo de distribución de ingresos parametrizable por el usuario:
  - **Reinversión en Mercancía:** Porcentaje configurable (sugerido inicial: 60%) destinado al reabastecimiento de stock.
  - **Gastos Operativos Fijos:** Porcentaje configurable (sugerido inicial: 30%) apartado para cubrir arriendo y servicios públicos del local.
  - **Fondo Personal / Ahorro / Diario:** Porcentaje configurable (sugerido inicial: 10%) para gastos menores del día a día (café, refrigerios, imprevistos) o ahorro.
- **Alternativas consideradas:**
  - *Porcentajes fijos o estáticos en código:* Descartados porque las necesidades de reinversión varían según la temporada o la línea de negocio.
  - *Distribución rígida con bloqueo de fondos:* Descartada por restar agilidad a la operación de mostrador.
- **Razón:** La dueña puede calibrar libremente sus metas porcentuales para saber exactamente cuánto dinero separar para recompras y costos fijos sin descapitalizarse.
- **Fuente de la decisión:** Requisito operacional definido por el usuario.

---

## ADR-010: Almacenamiento de Imágenes de Productos en Cloudinary (Fase 2)
- **Decisión:** Utilizar el servicio en la nube **Cloudinary** para almacenar y optimizar las imágenes de los productos del catálogo. Al crear o editar un producto, la imagen seleccionada se sube a Cloudinary y se persiste la URL pública (`image_url`) en la base de datos (IndexedDB y Supabase).
- **Alternativas consideradas:**
  - *Almacenar imágenes en base64/Blob directamente en IndexedDB:* Descartado porque satura rápidamente la cuota de almacenamiento local del navegador y no se sincroniza con otros dispositivos.
  - *Supabase Storage:* Buena opción, pero Cloudinary ofrece un generoso plan gratuito enfocado en transformación, compresión automática en WebP/AVIF y CDN global optimizada para dispositivos móviles de baja gama.
- **Razón:** Garantiza que las imágenes carguen instantáneamente, pesen pocos kilobytes, no saturen el almacenamiento local y se compartan transparentemente entre PC y teléfono móvil.
- **Fuente de la decisión:** Decisión técnica validada por el usuario.

---

## ADR-011: Gestión de Múltiples Cajas de Facturación / Fondos de Dinero por Línea de Producto (Fase 2)
- **Decisión:** Modelar el concepto de **Cajas de Facturación** (`cash_registers`) como gavetas/fondos de dinero contables o físicos independientes dentro del negocio (ej. Caja de Aseo, Caja de Dulces/Mecato, Caja de Servicios), asociando categorías o productos a cada caja correspondiente.
- **Alternativas consideradas:**
  - *Caja única indivisible:* Dificulta a la dueña saber cuánto efectivo físico pertenece al surtido de aseo frente a otras líneas del negocio.
  - *Tratar "cajas" como combos o kits de productos:* Descartado por ser una interpretación errónea del término usado por la dueña.
- **Razón:** Permite arqueos y cuadres de caja independientes por línea de venta, facilitando que cada fondo aporte proporcionalmente a los gastos fijos compartidos (arriendo/servicios) y mantenga su presupuesto de reinversión autónomo.
- **Fuente de la decisión:** Clarificación del modelo de negocio por parte del usuario.
