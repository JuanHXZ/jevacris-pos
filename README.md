# Kit reutilizable de Skills/Workflows para Antigravity

Este kit generaliza el flujo Product Manager → Tech Lead → UI Implementer →
Feature Implementer construido originalmente para MichiMochi y refinado en
Mi Alacena, para que puedas arrancar cualquier proyecto nuevo sin tener que
recrear los skills desde cero.

## Cómo usarlo en un proyecto nuevo

1. Copia las carpetas `.agents/` y `docs/context/_templates/` a la raíz de
   tu nuevo repositorio.
2. Abre el proyecto en Antigravity.
3. Corre `/new-project <descripción de tu idea>`.
   - Ejemplo: `/new-project Una app para llevar registro de plantas de
     interior: cuándo regarlas, cuánta luz necesitan, fotos de su progreso.`
4. El workflow activa `product-manager` primero (visión + requisitos
   funcionales), pausa para tu aprobación, luego activa `tech-lead`
   (requisitos no funcionales, mapa de navegación, modelo de datos, ADRs),
   y pausa de nuevo.
5. Una vez aprobada la arquitectura, pide el scaffolding inicial
   explícitamente si lo quieres — ningún skill lo genera por defecto.

## Qué incluye

```
.agents/
  skills/
    product-manager/SKILL.md      # visión + requisitos funcionales
    tech-lead/SKILL.md            # arquitectura, stack, modelo de datos, ADRs
    ui-implementer/SKILL.md       # traduce diseño (Stitch/Figma) a componentes
    feature-implementer/SKILL.md  # lógica de negocio, persistencia, tests
  workflows/
    new-project.md          # arranca TODO desde una idea en blanco
    build-architecture.md   # PM -> Tech Lead, para proyectos que YA tienen algo de contexto
    implement-screen.md     # UI Implementer, una pantalla a la vez
    implement-feature.md    # Feature Implementer, con precedencia sobre implement-screen

docs/context/_templates/
  00-vision.template.md
  01-requisitos-funcionales.template.md
  02-requisitos-no-funcionales.template.md
  03-mapa-navegacion.template.md
  03b-bd-resumen.template.md
  05-decisiones.template.md
```

## Principios que encapsula este kit

Estos son los patrones que fueron surgiendo (y a veces corrigiéndose) a lo
largo de la construcción de Mi Alacena, ahora ya incorporados en los skills:

- **Nunca generar código sin propuesta + aprobación explícita.** Todos los
  skills pausan antes de escribir código.
- **Las decisiones de arquitectura se documentan como ADRs**, nunca se
  quedan solo en el chat — así una sesión futura de Antigravity (o de vos
  mismo en 3 meses) entiende el porqué, no solo el qué.
- **La documentación es el mapa, el código real es el territorio.** Cuando
  divergen (como pasó con el esquema de Mi Alacena), se reconcilian
  explícitamente — no se ignora la divergencia.
- **Separación de responsabilidades entre skills**: quién crea archivos de
  pantalla (`ui-implementer`) vs quién los conecta a lógica
  (`feature-implementer`) vs quién decide arquitectura (`tech-lead`) vs
  quién decide alcance (`product-manager`). Sin este límite explícito, dos
  workflows terminan pisándose.
- **No fabricar verificación que no ocurrió.** Si algo no se pudo probar de
  verdad (ej. tests que no corren sin un dispositivo/emulador), se dice
  explícitamente en vez de entregar código "verificado" que nunca se ejecutó.

## Qué NO incluye (a propósito)

- **Nombres de stack específicos** (Expo, SQLite, Zustand, etc.) — esos son
  decisiones que toma `tech-lead` en cada proyecto según sus requisitos
  reales, no algo que este kit deba imponer de antemano.
- **`04-web-existente.md`** no tiene plantilla porque es condicional: solo
  aplica si el proyecto nuevo tiene una versión web/anterior de referencia.
