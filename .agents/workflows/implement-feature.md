---
name: implement-feature
description: Implementa la lógica de negocio, persistencia de datos, estado
  de aplicación y pruebas de una funcionalidad o pantalla.
---

# Workflow: implement-feature

Uso: `/implement-feature <nombre de la funcionalidad o pantalla>`

1. **Activa el skill `feature-implementer`**.
2. **Identifica el alcance:** revisa los requisitos funcionales, el modelo
   de datos real y las decisiones registradas en `docs/context/`.
3. **Presenta la propuesta técnica** (capa de datos, estado/hooks, puntos
   de conexión en la UI, plan de pruebas) y espera aprobación explícita.
4. **Una vez aprobado, implementa en orden de dependencias:** tipos → capa
   de datos → estado/hooks → integración con UI.
5. **Genera y corre las pruebas unitarias** que sean ejecutables de verdad
   en el entorno del proyecto.
6. **Reporta el resumen de cambios**, archivos modificados y estado de las
   pruebas.

## Precedencia con implement-screen

`/implement-screen` siempre corre primero para una pantalla dada (construye
el esqueleto visual). `/implement-feature` corre después, editando esa
pantalla ya existente para conectarla a la lógica — nunca crea archivos de
pantalla nuevos. Si la pantalla aún no tiene esqueleto visual, corre
`/implement-screen` primero.
