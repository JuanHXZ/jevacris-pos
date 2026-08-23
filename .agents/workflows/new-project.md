---
description: Bootstrapea toda la documentación de arquitectura de un proyecto
  nuevo (visión, requisitos, mapa de navegación, modelo de datos, ADRs) a
  partir de una idea o contexto inicial, sin necesitar documentación previa.
---

# Workflow: new-project

Uso: `/new-project <descripción breve de la idea>`

Este workflow asume que `docs/context/` está vacía o no existe todavía. Si
ya hay documentación previa que solo necesita actualizarse, usa
`/build-architecture` en su lugar — este workflow es específicamente para
arrancar de cero.

## 1. Activa el skill `product-manager` en modo "proyecto nuevo"

- No asumas nada que la idea no diga explícitamente. Si faltan datos clave
  para escribir la visión (usuario objetivo, plataforma, problema central),
  haz como máximo 2-3 preguntas de aclaración antes de escribir — no más.
- Redacta `docs/context/00-vision.md` usando la plantilla
  `docs/context/_templates/00-vision.template.md` como esqueleto.
- Redacta `docs/context/01-requisitos-funcionales.md` (features priorizadas
  en tabla: Alta/Media, MVP vs Fase 2, con justificación breve por feature)
  usando `docs/context/_templates/01-requisitos-funcionales.template.md`.
- Pausa y pide aprobación explícita del usuario antes de continuar.

## 2. Activa el skill `tech-lead`

- Pregunta lo que no se pueda inferir razonablemente de la idea o de las
  respuestas ya dadas: ¿offline-first o requiere conexión?, ¿qué plataformas
  (Android/iOS/web)?, ¿uso individual o multiusuario?, ¿importa el testing
  formal para este proyecto?
- Redacta, en orden:
  - `docs/context/02-requisitos-no-funcionales.md`
  - `docs/context/03-mapa-navegacion.md` (o el equivalente de flujo de
    pantallas/páginas si no es una app mobile)
  - `docs/context/03b-bd-resumen.md` + el esquema de base de datos real
    (`schema.sql` u equivalente), si el proyecto lo requiere
  - `docs/context/05-decisiones.md` con los ADRs iniciales de stack,
    persistencia, y cualquier decisión de arquitectura relevante
- **Si el proyecto tiene esquema de base de datos:** antes de darlo por
  bueno, valida que el SQL/esquema sea sintácticamente correcto (ej.
  aplicándolo contra una base de datos de prueba) y que las relaciones
  reflejen los requisitos ya aprobados en `01-requisitos-funcionales.md`.
- Pausa y pide aprobación explícita del usuario antes de continuar.

## 3. Resumen final

- Lista los archivos creados/actualizados en `docs/context/`.
- Pregunta si se procede al scaffolding inicial del proyecto (estructura de
  carpetas, dependencias base) — recuerda que ni `product-manager` ni
  `tech-lead` generan código por sí solos, solo documentación (ver reglas
  de actuación en sus respectivos `SKILL.md`).

## Notas

- Los nombres de archivo y su orden (`00` a `05`) se mantienen fijos entre
  proyectos, sin importar el dominio, para que cualquier skill sepa dónde
  buscar contexto sin tener que redescubrir la convención cada vez.
- `04-web-existente.md` es opcional: solo se crea si el proyecto nuevo tiene
  una versión web/anterior de referencia. Si no aplica, se omite sin dejar
  un archivo vacío.
- Si a mitad de un `/implement-feature` o `/implement-screen` surge una
  decisión de arquitectura nueva, se registra como ADR adicional en
  `05-decisiones.md` — nunca se deja solo en el chat (ver ADR-009 de
  Mi Alacena como precedente de este patrón).
