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
  │   └── reports/      # Dashboard, cuadre de caja, ganancias externas
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
- **Decisión:** Integrar Supabase (PostgreSQL en la nube) como backend de respaldo y sincronización bidireccional. La aplicación opera con el patrón *Local-First*: todas las operaciones se ejecutan inmediatamente contra IndexedDB local y un *Sync Engine* sincroniza en segundo plano las tablas `categories`, `products`, `sales`, `sale_items`, `stock_entries` y `external_earnings` con Supabase cuando hay conexión.
- **Alternativas consideradas:**
  - *Firebase Firestore:* Buena sincronización pero modelo NoSQL documental que dificulta queries relacionales de reportes y cuadres de caja.
  - *Solo persistencia local IndexedDB con archivo JSON descargable:* Descartada porque no permite sincronización fluida en tiempo real entre el computador y el teléfono móvil, y depende de la disciplina del usuario para generar copias de seguridad.
- **Razón:** Garantiza que tanto la app del PC como la del celular tengan exactamente la misma información actualizada, previene la pérdida de datos ante fallos del navegador o cambio de dispositivo, y mantiene el funcionamiento 100% offline cuando no hay internet.
- **Fuente de la decisión:** Solicitada explícitamente por el usuario para sincronización multi-dispositivo y prevención de pérdidas.

---

## ADR-007: Estrategia de Despliegue y Hosting de la PWA
- **Decisión:** Desplegar la aplicación frontend en plataformas de hosting estático modernas como Vercel o Cloudflare Pages con certificado SSL (HTTPS) obligatorio para el funcionamiento del Service Worker de la PWA.
- **Alternativas consideradas:**
  - *Servidor VPS propio (Ubuntu + Nginx):* Descartado por costos y mantenimiento innecesario para un frontend estático.
- **Razón:** Despliegue continuo gratuito, alta disponibilidad global, HTTPS automático y soporte nativo para actualizaciones de Service Worker.
- **Fuente de la decisión:** Propuesta técnica del Tech Lead.
