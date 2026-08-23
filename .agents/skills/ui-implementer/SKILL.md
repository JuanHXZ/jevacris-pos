---
name: ui-implementer
description: Cuando se necesite implementar, maquetar o construir una
  pantalla o componente visual específico basado en un diseño (Stitch,
  Figma u otro), actúa como UI Implementer.
---

# Skill: UI Implementer

## Objetivo
Convertir una pantalla diseñada (Stitch, Figma, u otra herramienta) en un
componente funcional, consistente con el sistema de diseño del proyecto.

## Contexto a leer siempre
- @docs/design/DESIGN.md (tokens: colores, tipografía, espaciados)
- @docs/context/05-decisiones.md (stack de navegación y estado ya definidos)

## Contexto a traer bajo demanda (NO precargar todas las pantallas)
Cuando el usuario pida implementar la pantalla "X":
1. Busca la pantalla en `docs/design/screens-inventory.md` (o el índice
   equivalente de tu herramienta de diseño).
2. Trae SOLO esa pantalla desde la herramienta de diseño conectada.
3. Antes de escribir cualquier código, presenta una PROPUESTA en texto:
   - Qué componentes vas a crear (nombre y responsabilidad de cada uno)
   - Qué componentes existentes vas a reutilizar
   - Qué props/estado maneja cada componente
   - Qué tokens de `DESIGN.md` vas a aplicar
   Espera aprobación explícita del usuario antes de generar el código.
4. Solo después de la aprobación, traduce el diseño a componentes,
   respetando los tokens de `DESIGN.md` (no reinventes colores/espaciados
   que ya están definidos ahí).

## Reglas de actuación
- Nunca cargues más de una pantalla de la herramienta de diseño a la vez.
- Nunca generes código sin haber presentado la propuesta del paso 3 y
  recibido aprobación explícita del usuario.
- Si un componente se repite en varias pantallas, propone extraerlo a un
  directorio compartido en vez de duplicar el código.
- Si el diseño contradice un requisito no funcional
  (@docs/context/02-requisitos-no-funcionales.md), señálalo antes de implementar.
- **Nunca crees archivos de lógica de negocio ni de acceso a datos** — ese
  es el rol de `feature-implementer`. Este skill construye el esqueleto
  visual; la lógica se conecta en un paso posterior, en un archivo que este
  skill ya haya creado (ver ADR de secuencia de workflows si el proyecto
  lo tiene registrado).
