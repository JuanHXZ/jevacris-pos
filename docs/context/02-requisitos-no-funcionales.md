# Requisitos No Funcionales — JEVACRIS Sistema POS e Inventario

## Rendimiento

| Categoría | Requisito |
|-----------|-----------|
| Tiempo de carga inicial | La aplicación debe cargar en menos de 1.5 segundos en redes móviles estándar y de forma instantánea (< 500 ms) una vez cacheada por el Service Worker (PWA). |
| Latencia en POS | La adición de productos al carrito, el recálculo de subtotales/vueltas y el registro de la venta deben responder en < 100 ms para no generar fricción frente al cliente (operación local inmediata). |
| Búsqueda de catálogo | El filtrado instantáneo por texto en el catálogo debe responder en tiempo real mientras el usuario tipea (debounced a 50 ms). |
| Optimización de imágenes | Las fotos de productos (Fase 2) se entregan vía CDN de Cloudinary con compresión automática y formato adaptativo (WebP/AVIF) para minimizar consumo de datos móviles. |

## Disponibilidad y datos

| Categoría | Requisito |
|-----------|-----------|
| Disponibilidad (Local-First) | 100% de operatividad sin conexión a internet. La PWA almacena la aplicación en caché y todos los datos en IndexedDB local del navegador. |
| Sincronización en la Nube | Sincronización bidireccional automática en segundo plano con Supabase (PostgreSQL) cuando hay conexión a internet. |
| Sincronización Multi-dispositivo | Los registros creados o modificados en el PC de escritorio deben sincronizarse y estar disponibles en el teléfono móvil (y viceversa) a través de la nube. |
| Resiliencia y Recuperación | Si se borra la caché del navegador o se cambia de dispositivo, los datos se restauran automáticamente desde la nube al iniciar sesión. Adicionalmente, se conserva la opción de exportar/importar respaldos en JSON local. |
| Exportabilidad | Capacidad de exportar reportes diarios y consolidados a formatos estándar (Excel / PDF / CSV) de forma inmediata en el cliente. |

## Compatibilidad y plataforma

| Categoría | Requisito |
|-----------|-----------|
| Plataformas soportadas | Navegadores modernos (Google Chrome, Microsoft Edge, Safari) en PC de escritorio / Laptop (Windows/macOS) y dispositivos móviles (Android / iOS). |
| Factor de forma (Responsive) | Diseño adaptable con dos vistas optimizadas: vista escritorio (layout de 2 columnas para POS con teclado numérico/accesos directos) y vista móvil (layout compacto táctil con barra de navegación inferior). |
| Instalabilidad (PWA) | Compatible con el estándar Web App Manifest para permitir "Instalar en pantalla de inicio / escritorio" sin pasar por tiendas de aplicaciones. |

## Seguridad

| Categoría | Requisito |
|-----------|-----------|
| Autenticación / Acceso | **Bloqueo de acceso mediante PIN local (ver ADR-008):** verificado en el dispositivo, funciona 100% sin conexión y sin costos de mensajería externa (SMS/WhatsApp). |
| Políticas de Seguridad (RLS) | Configuración de Row Level Security (RLS) en Supabase para garantizar que solo la dueña de la tienda pueda consultar y modificar sus propios datos en la nube. |

## UX y Usabilidad

| Categoría | Requisito |
|-----------|-----------|
| Ergonomía de mostrador | Tipografía grande y de alto contraste (mínimo 16px para texto base, 20px+ para totales y vueltas), botones con área táctil generosa (mínimo 48x48px). |
| Indicador de Estado de Conexión | Indicador visual sutil en el encabezado que muestra el estado de conexión (*En línea y sincronizado*, *Sin conexión - Guardando localmente*, *Sincronizando cambios*). |
| Prevención de errores | Confirmación clara al finalizar venta con resumen de vuelto a entregar; validación para evitar números negativos o ventas sin ítems. |

---

## Fuera de alcance para este documento

- Soporte para navegadores obsoletos (Internet Explorer / versiones legacy previas a ES6).
- Servidores propios o mantenimiento de infraestructura compleja on-premise.
