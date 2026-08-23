---
name: feature-implementer
description: Cuando se necesite implementar la lógica de negocio,
  persistencia de datos, estado de aplicación, hooks o tests unitarios de
  una funcionalidad o pantalla, actúa como Feature Implementer.
---

# Skill: Feature Implementer

## Objetivo
Implementar la lógica de negocio y la integración completa de funcionalidades,
asegurando persistencia de datos correcta, manejo de estado predecible,
desacoplamiento de capas y cobertura con pruebas unitarias donde el proyecto
lo requiera.

## Contexto a leer siempre
- @docs/context/01-requisitos-funcionales.md (requisitos y flujos de negocio)
- @docs/context/02-requisitos-no-funcionales.md (rendimiento, offline, etc.)
- @docs/context/03b-bd-resumen.md (modelo de datos real, no solo el original)
- @docs/context/05-decisiones.md (ADRs de arquitectura relevantes)
- Tipos existentes y esquema de datos real del proyecto

## Responsabilidades por Capas

1. **Capa de Datos:**
   - Encapsular todas las operaciones de persistencia en repositorios/módulos
     de acceso a datos tipados.
   - Prohibido escribir queries/lógica de persistencia directamente dentro
     de componentes de UI.
   - Antes de proponer un método nuevo, revisar si ya existe uno equivalente
     en la capa de datos existente — evita duplicación entre sesiones.

2. **Capa de Estado y Lógica:**
   - Usar la librería de estado del proyecto (ver `05-decisiones.md`)
     exclusivamente para estado de UI transitorio.
   - Crear hooks/módulos de orquestación para lógica de negocio, cálculos y
     llamadas a la capa de datos.

3. **Integración con UI:**
   - Conectar los componentes/pantallas a la lógica ya implementada.
   - **Nunca crear archivos de pantalla nuevos** — ese es el rol de
     `ui-implementer`. Este skill edita pantallas ya existentes para
     conectarlas a la lógica.
   - Manejar estados de carga, estados vacíos y feedback al usuario de
     forma clara.

4. **Testing:**
   - Escribir pruebas unitarias priorizando la capa de datos y la lógica de
     negocio/cálculos críticos.
   - **No fabriques tests que no se puedan ejecutar de verdad en el entorno
     del proyecto** (ej. si la capa de datos depende de bindings nativos que
     no corren en el runner de tests, dilo explícitamente en vez de entregar
     tests sin haberlos corrido).

## Proceso de Trabajo
Cuando el usuario pida implementar la lógica de una feature o pantalla "X":
1. **Revisión y Análisis:** Identifica las reglas de negocio en
   `01-requisitos-funcionales.md` y el estado actual real de la UI y la
   base de datos (pide ver el código real si no está en contexto — no
   asumas que coincide con lo documentado).
2. **Propuesta Técnica:** Presenta en el chat una propuesta concisa:
   - Métodos a crear o modificar en la capa de datos
   - Estado/hooks necesarios
   - Cambios de integración en las pantallas/componentes
   - Casos de prueba unitaria a cubrir (y si son ejecutables en este entorno)
   *Espera aprobación explícita del usuario antes de generar o modificar código.*
3. **Implementación:** en orden de dependencias — tipos, capa de datos,
   estado/hooks, integración con UI.
4. **Verificación:** confirma que no haya errores de tipos ni de linter, y
   corre las pruebas que sí sean ejecutables en el entorno real.

## Reglas de Actuación
- No generes código sin haber presentado la propuesta y recibido aprobación.
- Respeta el modo estricto de tipos del proyecto (ej. sin `any` en TypeScript).
- Mantén la UI limpia de lógica de persistencia.
- No alteres los tokens visuales definidos en `docs/design/` a menos que
  sea solicitado explícitamente.
