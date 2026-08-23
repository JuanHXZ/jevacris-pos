# Estructura de BD (resumen) — [Nombre del proyecto]

<!-- Instrucciones para tech-lead: este documento es un RESUMEN legible del
     esquema real (schema.sql u equivalente), no un sustituto de él. La
     fuente de verdad siempre es el archivo de esquema ejecutable; este
     archivo se sincroniza manualmente cuando el esquema cambia — díselo
     al usuario si detectas que se desactualizó (ver precedente de
     Mi Alacena: el esquema real terminó divirtiendo del original creado
     aquí, y hubo que reconciliar ambos documentos). -->

> **Fuente de verdad:** `schema.sql` (o el archivo real de tu proyecto, ej.
> `data/db.ts` si el esquema vive embebido en código de inicialización).

## Entidades

<!-- Una viñeta por tabla/colección: nombre, campos clave, y cualquier
     columna con comportamiento especial (generada, con trigger, etc.) -->

## Relaciones

<!-- Notación simple: tabla_a 1---N tabla_b -->

## Triggers / lógica automática activa (si aplica)

## Queries base para los casos de uso clave

<!-- La(s) query(s) que sostienen la funcionalidad más importante del
     producto (ver 01-requisitos-funcionales.md) — vale la pena dejarlas
     documentadas aquí para que no se reinventen distinto cada vez. -->

## Convención de la capa de acceso a datos (si ya existe código)

<!-- Nombres de funciones, si usan parámetros posicionales u objetos, dónde
     viven los tipos — esto evita que sesiones futuras de generación de
     código reintroduzcan una convención distinta a la ya usada. -->

## Fuera de alcance para este documento

## Resuelto / Pendiente

<!-- Preguntas abiertas sobre el modelo de datos, y su resolución cuando
     el usuario las responda — no las borres, muévelas de "Pendiente" a
     "Resuelto" para dejar rastro de la decisión. -->
