# Notas de la sesión de arquitectura

Para quien coordine el proyecto (persona o IA). Lo lee primero la sesión de arquitectura.

## ⚠️ Recordatorio pendiente (17/11/2026)

**Pasar la coordinación a una sesión nueva de Opus.** La conversación de arquitectura que coordinó el cuerpo, el visualizador y los eventos (13–17/11) ya es muy larga y cada respuesta cuesta mucho. Al cerrar lo de los eventos, la sesión de arquitectura debe **completar este documento** (estado del proyecto, cómo se trabaja y lo pendiente) y **recordárselo al usuario** para seguir desde una sesión nueva que arranque leyendo este archivo. Cuando se haga, borra este aviso.

## Cómo se trabaja (decidido con el usuario)

- **Reparto:** una sesión de arquitectura (Opus) diseña, encarga, revisa y une ramas; las sesiones de desarrollo (Sonnet; Fable para lo de más calado) hacen el trabajo en su propia rama. **Ninguna decisión de diseño sin autorización del usuario**, salvo arreglar un error que obligue a deshacer trabajo.
- **Las dudas** de quien desarrolla van a «Preguntas abiertas» del plan correspondiente; la sesión de arquitectura se las lleva al usuario con su recomendación.
- **Sesiones cortas y enfocadas**, una por bloque de trabajo que comparta código, con un encargo cerrado y notas de relevo: una sesión muy larga se encarece en cada paso (Fable gastó un bloque entero solo en recargar 700.000 tokens de contexto).
- **Fable** solo para lo de más calado, con sesiones nuevas y notas de relevo; dejó de estar incluido en el plan el 16/11.

## Estado (17/11/2026)

- Rama de trabajo: `claude/youthful-clarke-vs0kye`, con el cuerpo y la apariencia (fase 1), el visualizador (fase 2) y los eventos y decisiones (E18) unidos.
- Planes: `docs/PLAN_CUERPO_Y_APARIENCIA.md`, `docs/PLAN_VISUALIZADOR.md`, `docs/PLAN_EVENTOS.md` (§7 ter: lo que queda), `docs/PLAN_PELUQUERIA.md` (pendiente de planificar).
