# Partidas guardadas por la versión publicada (`main`)

`main-prueba-nueva.json.gz` (recién creada) y `main-prueba-semana8.json.gz` (el personaje en el equipo A de benjamín del colegio, ocho semanas, una sesión del club hecha): ciudad de prueba, semilla 41, `SAVE_VERSION` 21,
guardadas **con el código de `origin/main` (3f87f3a, PR 127)** y el mismo texto JSON que escribe la web (`serializarJSON`, formato `dinasty-sports`). Las vigila `tests/partidas-de-main.test.ts`: tienen que cargar y avanzar
con la rama de trabajo. **No se regeneran con el código nuevo**: valen justo porque son del antiguo. Si algún día se sube `SAVE_VERSION`, el test debe fallar y se sustituyen por partidas de la versión que se quiera seguir cargando
(o se borran, explicando por qué). Cómo se hicieron: un worktree de `origin/main` con sus dependencias y `tools/gen-saves2.ts` (en `docs/relevo/compatibilidad-y-cronica.md`).
