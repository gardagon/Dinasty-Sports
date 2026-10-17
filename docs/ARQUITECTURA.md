# Arquitectura de Dinasty Sports

RPG de decisiones: un personaje en edad escolar que estudia, practica un deporte y se relaciona.
Cada acción cuesta **tiempo de juego** y cambia sus características.

El objetivo de la arquitectura es que el juego pueda crecer a decenas de módulos
(deportes, asignaturas, sistemas de NPCs, eventos...) **sin que se convierta en una bola de dependencias**
y sin perder velocidad.

## Capas

```
apps/web            Interfaz (sustituible). Solo habla con @ds/game.
sim/                Equipo de testeo: bots, chequeos de balance, informes.
packages/game       ENSAMBLADOR: el único sitio que lista los módulos.
modules/*           Contenido. Cada módulo solo importa @ds/contracts.
packages/core       Motor genérico: no sabe nada de deportes ni de estudios.
packages/contracts  La "ley": interfaces y vocabulario común. Sin lógica de juego.
```

**Regla de oro:** un módulo **nunca** importa otro módulo ni el núcleo. Solo `@ds/contracts`.
El test `tests/arquitectura.test.ts` lo comprueba y falla si alguien la rompe.

## Los unificadores

Al dividir tanto, el riesgo es la lentitud y el caos de conexiones. Lo resuelven cuatro piezas:

1. **Registro de módulos** (`packages/core/src/registry.ts`). Al arrancar valida todos los
   módulos (ids, referencias, dependencias) y los compila en tablas indexadas por id, por etiqueta
   y por tipo de evento. En partida nadie recorre módulos: se consulta la tabla directamente.
2. **Pipeline único de acciones** (`Game.perform`). Toda acción pasa por los mismos pasos:
   requisitos → modificadores → coste → entrenamiento → lógica propia → avance del tiempo → eventos.
3. **Modificadores por etiquetas.** Un módulo influye en otro sin conocerlo. Ejemplo: el módulo de
   NPCs dice "si tu afinidad con alguien es ≥ 40, las acciones con las etiquetas que apoya rinden más".
   Funciona con cualquier deporte futuro que use esas etiquetas.
4. **Eventos y servicios.**
   - Eventos propios (`atletismo.*`) y **compartidos** (`competicion.resultado`). Cualquier deporte
     publica sus resultados igual, y los NPCs reaccionan sin saber de qué deporte se trata.
   - Servicios: un módulo publica una interfaz definida en contracts (`npcs`, `estudios`) y otro la
     consulta con `ctx.service()`. Quien consume debe funcionar también si el servicio no existe.

## Resultados con tabla y plantilla de competición

- `ctx.log(texto, tipo, tabla)` admite una **tabla opcional** (`LogTable`, en contracts: cabecera, filas y fila resaltada).
  La web la muestra en el resultado de la acción y, desplegable, en el Diario. Un deporte nuevo publica así su clasificación sin tocar la interfaz.
- Un deporte consulta a los rivales por el servicio `npcs` (etiqueta `atleta` en atletismo). Los rivales son NPC persistentes
  con herencia propia (potencial, nivel inicial y ritmo) que progresan solos. La serie es de 8: los mejores rivales corren siempre
  las primeras semanas y después las plazas rotan (ver `elegirRivales` en `modules/atletismo`).

## Características del personaje

| Categoría | Ejemplos | Cómo cambian |
|---|---|---|
| `generica` | fuerza, velocidad, inteligencia, carisma | Se entrenan (lento). Son el **techo** y la **velocidad** de las habilidades. Hay 19: 6 físicas, 6 mentales y 6 sociales (`cooperacion` es provisional). |
| `habilidad` | matemáticas, técnica de carrera | Se entrenan. Cada módulo define las suyas. |
| `conocimiento` | conocimiento de atletismo | Progresa como una habilidad pero no lo es: actúa como bonus/malus sobre las acciones del deporte (modificador) y se olvida muy despacio. Un deporte nuevo debería definir el suyo. |
| `estado` | energía, salud, estrés, motivación | Cambian directamente. Modulan la eficiencia de todo. |

**Subida** (`packages/core/src/progression.ts`):
`ganancia = cantidad × eficiencia × ritmo × talento × velocidad(genéricas) × (1 − progreso hacia el techo)^curva`

- El **techo** depende de las genéricas: para correr mejor también hace falta coordinación y resistencia.
- El **talento** es un multiplicador oculto por característica, fijado por la semilla de la partida.

**Caída:** tras `graceDays` sin practicar, se pierde `ratePerDay` de la distancia al suelo.
El suelo es el máximo alcanzado × `floorRatio` ("memoria muscular"). Nunca baja del valor inicial.

**Recursos:** las stats marcadas como `resource` (energía) son las únicas cuyo delta negativo es
un coste: bloquea la acción si no alcanza y se escala con los modificadores de coste.

## Tiempo

El tiempo es de juego, en minutos. La partida empieza un lunes a las 7:00. Cada acción declara su
duración, que puede ser una función (dormir dura hasta las 7:00). Al cruzar la medianoche el núcleo
aplica la caída y emite `dia.fin`, `semana.fin` y `dia.inicio`.

## Guardado

El estado es un único objeto JSON (`GameState`). Guardar = `game.serialize()`.
Al cargar, las características y los módulos nuevos se inicializan solos, así que añadir
un módulo **no rompe partidas existentes**. El azar es determinista (semilla guardada en el estado).

## Cómo añadir un módulo

```bash
npm run nuevo-modulo -- natacion "Natación"
npm install
npm test
```

El generador crea el módulo con su test y lo registra en `packages/game/src/modulos.ts`.

Checklist de un módulo nuevo:

- [ ] Ids con prefijo del módulo (`natacion.*`).
- [ ] Etiquetas del vocabulario común (`TAGS` en contracts) para que los modificadores ajenos le afecten.
- [ ] Si es un deporte, emite `competicion.resultado` al competir.
- [ ] Test que lo cargue **solo** con `gen` (demuestra que es independiente).
- [ ] `npm run sim` y revisar el informe de balance.

## Equipo de testeo (sim/)

Hay siete estrategias de bot: equilibrado, empollón, atleta, sobreentrena, vago, abandona el deporte y aleatorio.
Cada una juega N días con varias semillas. Eligen sobre todo por **etiquetas**, así que entrenan
cualquier deporte nuevo sin tocar su código. Después se ejecutan chequeos de sentido del juego:

- Integridad: ninguna stat fuera de rango, ningún bloqueo.
- Rendimiento del motor (ms por año simulado).
- El esfuerzo hace progresar, y especializarse compensa en lo suyo.
- No hacer nada nunca es lo mejor, y sobreentrenar no compensa.
- Nadie llega a 90 antes de la semana 12.
- Dejar un deporte hace caer las habilidades entre un 3 % y un 40 %.
- No hay una estrategia que gane en todo.
- Las carreras son una competición real: el atleta no las gana todas, sube al podio algunas veces y supera al equilibrado.
- Las estrategias razonables mantienen la salud.

Informe: `sim/reports/ultimo/informe.html` (gráficas semana a semana por área y estrategia).
