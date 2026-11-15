# Cuerpo y apariencia para todos: los datos que necesita el visualizador

Plan del 13/11/2026, **decidido con el usuario**. Es la **fase 1** del visualizador de personas (dibujar a cualquier persona del juego desde los 8 años hasta la vejez, con sus rasgos, su altura y su complexión). Esta fase **no dibuja nada**: deja en el juego todos los datos que el dibujo necesitará, para que la fase 2 (el visualizador) no tenga que inventar ni cambiar reglas del juego.

Reparto del trabajo: el diseño es de la sesión de arquitectura; el desarrollo, de otra sesión. **Si algo no está cubierto aquí o choca con el código, no lo decidas tú: apúntalo en «Preguntas abiertas» al final de este documento y sigue con lo demás.**

---

## 1. Decisiones tomadas (13/11/2026)

| Tema | Decisión |
|---|---|
| Músculo y grasa de los PNJ | **Reales para todos los PNJ**, con las mismas reglas que el personaje («si le damos músculo y grasa reales, que sean a todos, no solo a los que importan»). Cambian poco en la mayoría. |
| Historial | **Para todos**: una foto por año de cada persona. |
| Canas, calvicie y barba | **Datos del juego heredables**, con tendencias por origen. |
| Peinado, barba y bigote (el estilo) | Automáticos; se guardará el estilo elegido para que el jugador pueda cambiarlo más adelante. **El catálogo de estilos es de la fase 2**: aquí no se toca. |
| Vistas | Retrato y cuerpo entero a escala (fase 2). |
| Edad máxima | El dibujo llegará a los 95 años. La muerte es otra función, fuera de este plan. |
| Sexo | Todo debe funcionar para hombres y mujeres (las madres y las PNJ son mujeres aunque el personaje hoy solo sea chico). |

## 2. El principio: una sola regla del cuerpo, en contracts

Hoy las reglas del cuerpo están repartidas y no coinciden:

- `modules/personaje/src/identidad.ts`: su curva de crecimiento (`CRECIMIENTO`, con `madurez`), `IMC_SANO` (hasta los 18), `pesoEn`, `complexion`, `CUERPO` y `actualizarCuerpo`.
- `packages/contracts/src/personas.ts`: `alturaDe` y `fraccionDeAltura` para los PNJ, **sin su `desfase`** (el adelanto o retraso del desarrollo que ya tienen los niños con genética).

**Se crea `packages/contracts/src/cuerpo.ts`** con todas las reglas del cuerpo como funciones puras, y la usan `personaje`, `npcs` y `familia` (el módulo `familia` guarda a los padres). Nada de copiar fórmulas en cada módulo. `personaje` deja de tener reglas propias del cuerpo: solo guarda su estado y llama a contracts.

Contenido mínimo de `cuerpo.ts`:

- **Altura**: `alturaEn(alturaAdulta, edad, madurez)`, una sola curva para todos. Los PNJ pasan su `desfase` (0 si no tienen). Añade la **pérdida en la vejez**: 0 hasta los 50, −0,15 cm por año de 50 a 70, −0,3 cm por año desde los 70 (unos −6 cm a los 90).
- **Peso**: IMC de referencia por edad **también de adulto**: 18 → 21,5; 30 → 23; 50 → 24,5; 70 → 24,5; 90 → 23. Más las desviaciones por músculo y grasa que ya existen (`0,04 × (músculo − 30) + 0,09 × (grasa − 40)`).
- **Objetivo de músculo y grasa** según los hábitos de la semana, la edad y el sexo (§3).
- **Paso semanal** (`pasoDeSemanaDelCuerpo`): acercarse al objetivo con la inercia de hoy (8 %).
- **Complexión** (`complexion`, la de hoy, sin cambios).

## 3. Músculo y grasa con la edad y el sexo

Hoy el objetivo solo depende de los minutos de la semana: un niño de 8 años que va mucho al gimnasio puede acabar «musculado», y en la vejez no se pierde nada. Cambios:

1. **Tope de músculo por desarrollo físico.** El objetivo de músculo no puede pasar de `15 + 75 × fisico/100`, con `fisico` sacado de `vigoresPorEdad(edad, madurez)` (ya está en contracts y es la regla que sigue todo el mundo). Un niño de 8 años no se pone musculado; con la pubertad sí puede.
2. **Sexo.** Mujeres: objetivo de músculo × 0,75 y base de grasa +8. Hombres, como hoy.
3. **Edad adulta.** Desde los 40, el objetivo de músculo baja 0,5 por año (sarcopenia). Desde los 30, la base de grasa sube 0,3 por año hasta un máximo de +12 (metabolismo).
4. **El personaje sigue las mismas reglas.** Cambia su evolución: hay que medirla (§8).

Las cifras son el punto de partida: **calibra con la simulación** frente a los objetivos de §7 y apunta en el anexo las que queden.

## 4. Hábitos de los PNJ

El cálculo es barato. Lo que hay que decidir es **cuántos minutos de fuerza y de actividad** hace cada PNJ a la semana. Regla, por orden:

1. **Juega a un deporte con rutina** (`semanaDeportiva` en `modules/npcs/src/index.ts`): los minutos salen de sus sesiones de la semana (`res.sesiones`), igual que los del personaje salen de sus acciones. Las sesiones con etiqueta de fuerza cuentan como fuerza; el resto, como actividad.
2. **Niño o joven sin deporte**: la actividad básica (los 60 minutos de juego libre del personaje) más un extra estable según su interés `deporte` (de 0 a 120 minutos a la semana).
3. **Adulto**: una **actividad propia estable** (minutos de actividad y de fuerza), sacada de su semilla y de su interés `deporte`, que cambia un poco cada año (un nuevo sorteo pequeño en cada cumpleaños). Así la mayoría cambia poco, pero hay quien empieza a correr a los 40 y quien lo deja.
4. **Quien deja un deporte** pasa a la regla 2 o 3 desde esa semana: el exfutbolista engorda poco a poco.

Todo con azares estables (`rngEstable` / `azarDe`) por persona y semana, como el resto de los PNJ.

**Estado inicial** de un PNJ creado ya adulto (sin pasado): su músculo y su grasa salen del equilibrio de su regla de hábitos a su edad (como si llevara años así), con un pequeño ruido.

## 5. Historial anual

Una foto por persona y año, para dibujar la evolución:

- **Qué se guarda**: el músculo y la grasa en ese momento, **en enteros**. La altura y el peso no se guardan: se recalculan con las reglas de §2 a partir de su genética y de la foto.
- **Cuándo**: en cada cumpleaños de la persona (para el personaje, también en cada cumpleaños).
- **Formato compacto**: una lista de enteros por persona (por ejemplo `hc: [edadDeLaPrimeraFoto, músculo, grasa, músculo, grasa, …]`), sin objetos por año.
- **Antes de la primera foto** (las personas que ya existían al empezar la partida): el dibujo usará la primera foto que haya.
- Peso medido hoy: unos 8 bytes por persona y año → unos 0,5 MB a los 60 años de partida con la población actual. **Mídelo** (§8). Si la población crece mucho con las generaciones, apúntalo en «Preguntas abiertas».

## 6. Apariencia heredable: canas, calvicie y barba

Tres campos nuevos en `Apariencia` (`packages/contracts/src/rasgos.ts`), con valores numéricos (no catálogos), porque son tendencias:

| Campo | Qué es | Al azar (adultos del mundo, `aparienciaAlAzar`) | Herencia (`aparienciaHeredada`) |
|---|---|---|---|
| `canas` | Edad a la que empiezan las canas (años) | Normal de media 34 y desviación 6, entre 20 y 60 | Media de los padres ± 3 |
| `calvicie` | Tendencia a perder pelo, de 0 a 1 | Hombres: media 0,45 (desviación 0,25); mujeres: media 0,1 (máximo 0,4) | 60 % de la madre y 40 % del padre, ± 0,1, con el tope por sexo |
| `barba` | Densidad del vello facial, de 0 a 1 | Media 0,6 (desviación 0,2); en mujeres se guarda igual (se hereda a los hijos), pero no se dibuja | Media de los padres ± 0,1 |

**Tendencias por origen** (se suman a la media al azar, en `ORIGENES`): Asia oriental, canas +4 años y barba −0,3; Europa del norte, canas −2; Magreb y España (sur), barba +0,1; África subsahariana, canas +3. Aproximadas, como el resto de las distribuciones de los orígenes.

**Las tres son de la generación, no de la edad**: el dibujo de la fase 2 decidirá con ellas, la edad y la semilla cuántas canas, cuánta calvicie y qué barba enseña.

Personas que ya tienen apariencia: todas las que se crean con `rasgosAlAzar`, `rasgosHeredadosNpc` y la herencia del personaje. **Comprueba que todas las personas dibujables tienen `rasgos`** (el campo es opcional en `Npc`): si alguna no, apúntalo.

## 7. Objetivos de calibración

Mide con varias semillas y apunta el resultado. Proporción con complexión «con sobrepeso»:

| Grupo | Objetivo aproximado |
|---|---|
| Niños de 8 a 12 | 5–12 % |
| Jóvenes de 13 a 17 | 5–12 % |
| Adultos de 18 a 39 | 10–20 % |
| Adultos de 40 a 64 | 20–30 % |
| Niños y jóvenes que juegan a un deporte con rutina | menos del 3 % |

Y además: ningún niño menor de 12 años «musculado»; entre los adultos que hacen fuerza, «musculado» o «atlético» debe ser lo normal; la complexión de un adulto cambia de tipo **como mucho una vez cada pocos años** de media.

Si los bots de la simulación hacen algo poco razonable con el cuerpo, se arregla el bot (`sim/src/bots.ts`), no el juego.

## 8. Lo que hay que medir antes y después

- `npm run sim` (los chequeos y la tabla final): ninguno debe pasar a ⚠️ o ❌ sin explicación.
- `npm run rendimiento -- 60`: hoy son **2,15 ms por acción y 2,7 MB de estado con 1.418 personas** (13/11, 30 días). Límites: **+5 % de estado al empezar** y **+5 % de ms por acción**. La actualización semanal de todos los cuerpos debe costar menos de 1 ms por semana.
- `npm run sim:vida`: la evolución del cuerpo del bot a lo largo de la vida (añade el músculo, la grasa y la complexión a la tabla por edades si no salen).
- `npm run huella`: **cambiará** (el personaje sigue reglas nuevas): es esperado; dilo en el resumen.
- `SAVE_VERSION` sube (`packages/core/src/state.ts`): cambia la forma del estado.

## 9. Lectura para el visualizador: un servicio

El visualizador (fase 2) necesita leer cualquier persona igual. Se define en `packages/contracts/src/services.ts` un servicio de solo lectura, por ejemplo:

```ts
interface CuerpoDePersona {
  id: string;
  sexo: Gender;
  nacimiento: number;          // día respecto al inicio de la partida
  alturaAdulta: number;        // cm
  madurez: number;             // adelanto o retraso del desarrollo (desfase en los PNJ)
  musculo: number;             // hoy
  grasa: number;               // hoy
  historial: number[];         // §5
  apariencia: Apariencia;      // con canas, calvicie y barba
  semilla: number;             // estable por persona (para lo que el dibujo genere al azar)
}
```

Lo dan los módulos dueños de cada persona: `personaje` (el personaje), `npcs` (los PNJ) y `familia` (padre y madre, que no llevan edad en `npcs`). Cómo se juntan (un servicio por módulo con el mismo contrato, o uno que pregunta a los otros) lo decides tú dentro de las reglas del repositorio (un módulo no importa a otro: solo servicios de contracts).

**Toda persona dibujable necesita fecha de nacimiento.** Comprueba qué personas no tienen `nacimiento` y dásela de forma estable (ya existen `edadAdultaDe` y `nacimientoParaEdad`).

## 10. Fuera de este plan

- El dibujo, el catálogo de peinados y de estilos de barba (fase 2).
- La muerte.
- Gafas y otros rasgos nuevos que no estén en §6.

## 11. Entrega

En pasos pequeños, con commits separados, y **los tests en verde en cada uno**:

1. `cuerpo.ts` en contracts y `personaje` usándolo (con la altura de los PNJ también unificada).
2. Edad y sexo en el objetivo de músculo y grasa (§3).
3. Músculo y grasa en todos los PNJ (§4).
4. Historial anual (§5).
5. Canas, calvicie y barba (§6).
6. El servicio de lectura y las fechas de nacimiento (§9).

Al terminar: **`docs/ANEXO_CUERPO.md`** con todas las cifras (curvas, objetivos, hábitos, herencia), una línea en `CLAUDE.md` que lo cite (como los demás anexos), una entrada en `docs/DECISIONES.md` y las mediciones de §8 (antes y después) en el resumen.

## Preguntas abiertas

_(Las rellena quien desarrolla; las responde la sesión de arquitectura.)_

Anotadas el 13/11/2026 por la sesión de desarrollo. En todas se siguió adelante con la opción que se indica; cambiarla es tocar una constante (todas están en `docs/ANEXO_CUERPO.md`).

1. ✅ **Respondida 14/11: −0,2 cm/año desde los 70 (−7 cm a los 90), hecho.** *(Pregunta original:)* **Pérdida de altura (§2).** −0,15 cm/año de 50 a 70 y −0,3 cm/año desde los 70 suman **−9 cm a los 90**, no los «−6 cm» que dice el mismo párrafo. Se implementaron las cifras por año (`PERDIDA_DE_ALTURA`). Si se quieren −6 cm, bastaría −0,2 desde los 70.
2. ✅ **Respondida 14/11: los 30 min por sesión valen de forma provisional; pendiente anotado en DECISIONES.** *(Original:)* **Sesiones con etiqueta de fuerza (§4.1).** Las sesiones de club de un PNJ no llevan etiquetas: `semanaDeNino` devuelve solo cuántas sesiones hizo (`res.sesiones`, un número) y las listas de ejercicios no distinguen fuerza. Se asumió **90 min de actividad y 30 min de fuerza por sesión** (`MINUTOS_DE_SESION`). Lo correcto sería que cada ejercicio o sesión del deporte declarase sus minutos de fuerza (dato del deporte).
3. ✅ **Respondida 14/11: correcto.** *(Original:)* **Sesiones: se suman a la base, no la sustituyen (§4.1).** Con «los minutos salen de sus sesiones» a secas, un niño con 1 sesión a la semana tendría menos actividad que uno sin deporte (que juega libre) y engordaría. Se suman el juego libre y las sesiones. Quien está de baja o deja el deporte se queda con la base.
4. ⏩ **Sustituida por el bloque A de la segunda ronda (14/11).** *(Original:)* **Hábitos de niños y jóvenes (§4.2).** Con «60 min de actividad básica + 0 a 120 por interés» el 80 % de los niños de 8 a 17 años salía «con sobrepeso» (el objetivo de §7 es 5–12 %), con las cifras de grasa de §3 sin tocar. Se calibró un **juego libre estable por persona** `340 × azar^0,5` (media ≈ 227 min) además de los 40 min por nivel de interés. Resultado: 7–11 %. Alternativa: bajar la base de grasa de los menores de 18 años.
5. ✅ **Respondida 14/11: objetivo «delgado» del 8 al 15 % de los adultos (bloque A.4).** *(Original:)* **Hábitos de adultos (§4.3).** Las distribuciones (actividad `1100 × azar^1,6`, fuerza `560 × azar^3`, cambio anual de 30 min, 5 % de saltos de ±200 min) son una elección para cumplir §7: sobrepeso ≈ 16 % de 18 a 39 y ≈ 28 % de 40 a 64, y «atlético» o «musculado» ≈ 13 % de los adultos de 18 a 39. Consecuencia no pedida: **«delgado» sale en ≈ 28 % de los adultos** (mucha actividad con poco músculo). No hay objetivo para ellos; conviene fijarlo.
6. ✅ *De acuerdo (14/11).* **Mínimo de músculo.** El plan no dice cuál es el suelo del objetivo de músculo con la sarcopenia y el × 0,75 de las mujeres: se usó 5 (antes, 10 con la fórmula de hoy).
7. ✅ *De acuerdo (14/11).* **Calvicie de las mujeres (§6).** El plan da media 0,1 y máximo 0,4 pero no la desviación: se usó 0,1. El «± 3», «± 0,1» de la herencia se tomó como uniforme.
8. ✅ **Respondida 14/11: de acuerdo con la constante; pendiente anotado en DECISIONES.** *(Original:)* **El personaje es chico (§3.2).** No hay sexo en el estado del personaje: `SEXO_DEL_PERSONAJE = 'm'` en `identidad.ts`, que usan el cuerpo, la herencia de la apariencia y el servicio. Cuando haya personaje chica, hay que guardarlo.
9. ✅ *De acuerdo (14/11).* **El padre y la madre ya son PNJ (§9).** Viven en `npcs` (rol `familia`) con fecha de nacimiento, estatura heredada y rasgos (el plan decía que no llevaban edad en `npcs`: ya la llevan). Siguen las mismas reglas que cualquier adulto y los da el servicio de `npcs`; `familia` no da servicio propio para no duplicar datos.
10. ✅ *De acuerdo (14/11).* **Fechas de nacimiento y rasgos (§6, §9).** Comprobado en una partida completa (1.419 personas): todas tienen `nacimiento` y `rasgos`. No hizo falta dárselos. Sí hay que vigilar a quien se cree a partir de ahora.
11. ✅ *De acuerdo (14/11).* **El mundo generado no cambia con la misma semilla.** Los tres campos nuevos de la apariencia (§6) no se sortean con el generador de la partida: salen de un generador estable que se siembra con lo ya sorteado de cada persona (carácter, intereses y gustos). Así no cambia ningún sorteo posterior (nombres, equipos, plantillas) y los tests con semilla fija siguen valiendo. La primera versión sí los sorteaba con el generador de la partida y rompía 13 tests que dependen de la semilla. Consecuencia: dos personas con exactamente los mismos números sorteados tendrían las mismas tendencias (no pasa en la práctica).
12. ✅ *De acuerdo (14/11).* **Peso del historial.** Cada cumpleaños añade 2 enteros por persona (unos 6–7 bytes). Con la población actual son unos 9 KB por año de partida (unos 0,5 MB a los 60 años), pero las personas que nacen o llegan cada curso suman: si la población crece con las generaciones habrá que comprimir (p. ej. un entero por foto) o podar las fotos de los PNJ que ya no se dibujan.
13. ✅ *De acuerdo (14/11).* **Verificación por pasos.** Cada paso se comprobó con typecheck y los tests de lo que toca; la suite entera (≈ 13 minutos) se pasó al acabar el paso 1 y al final del paso 6, no en los intermedios.

### Segunda ronda (14/11/2026): preguntas nuevas

Anotadas por la sesión de desarrollo; se siguió adelante con lo que se indica.

14. **Etiqueta propia en vez de `fisico`.** `fisico` encarece ×1,2 las acciones con la salud baja y es la de los deportes; para el juego y la Educación física se crearon `actividadLigera` y `actividadDeNino` (`TAGS`), que solo cuentan para el cuerpo.
15. **«Quedar con (plan acordado)» también cuenta de niño.** El bloque A.1 nombra `quedar` («Quedar con» y «Pasar la tarde con»); `pasar_rato` («Quedar con X (plan acordado)») es el mismo plan acordado y también lleva `actividadDeNino`. Si no debe, quitar la etiqueta en `modules/relaciones/src/index.ts`.
16. **Educación física sola no basta para el sobrepeso.** Con los minutos reales (150 por semana lectiva) un niño que no juega nunca en el recreo y solo tiene Educación física sale en equilibrio con 57 de grasa (chico, normal) y 65 (chica, límite del sobrepeso); solo sin nada más (ni recreo, ni Educación física, ni juego libre) llega a 72/80. Para que «no juega nunca» tienda al sobrepeso también en chicos habría que subir `grasaBase` de los menores de 18 o contar la clase de Educación física a la mitad.
17. ✅ **Resuelta 15/11 (el usuario no aceptó el valor supuesto):** Educación física tiene una sola fuente, `minutosDeEducacionFisica(pais, curso)` en contracts (con `HORAS_DE_ASIGNATURA` y `clasesPorSemana`, que salieron de `estudios`); la usan el servicio de `estudios` y el cuerpo de los PNJ al crear la partida y cada semana. No queda ninguna cifra supuesta de Educación física en `npcs`; el porcentaje en movimiento (`FRACCION_EN_MOVIMIENTO_DE_EDUCACION_FISICA`) está solo en `cuerpo.ts`. Test: para cada curso del país, el cuerpo, el servicio y el horario de `estudios` dan los mismos minutos (2.º de bachillerato, 0). *(Original: al crear la partida no se podía preguntar a `estudios`; se suponían 150 min por semana lectiva.)*
18. **Cifras recalibradas.** Juego libre de fuera del colegio `150 × azar^0,5` (antes `340 × …`); adultos: actividad `800 × azar^1,3` y fuerza ligada a la actividad (0,7 de mezcla) para dejar «delgado» en ≈ 12 % de los adultos.
19. **Genética del cuerpo con generador propio.** `metabolismo` y `musculatura` se piden con `ctx.herencia` pero se sortean con un generador propio de cada rasgo (`FAMILIAS_ESTABLES` en `herencia.ts`), igual que las tendencias de la apariencia: no mueven ningún sorteo posterior. Los hermanos las heredan como la estatura (0,45 × (padre + madre) + 0,6 × propio) y el resto de PNJ las saca de su id.
20. **Bots.** No se tocaron: solo ganan actividad (Educación física) respecto a antes. Ninguno juega en el recreo (`sim/src/bots.ts`); si se quiere medir ese efecto, hay que enseñarles a jugar.
21. **Diagnóstico del coste de jugar en el recreo (15/11, medido; sin cambiar código del juego).** Herramienta: `npx tsx tools/perfil-recreo.ts [clics] [partidas]` (con `perfil` como tercer argumento, el desglose de CPU por función). Máquina de desarrollo, con `npm run sim` corriendo al lado (las cifras absolutas pueden ser un 20 % altas); medianas de 5 partidas, 6 clics seguidos de 5 minutos, ciudad grande.

    **Lo que cuesta un clic** (preview + perform + volver a listar las acciones, que es lo que hace la interfaz tras cada clic):

    | Acción | Primer clic | Siguientes | De ello, `listActions` |
    |---|---|---|---|
    | Patio, recreo: «Jugar con otros niños» | 15,7 ms | **7,4 ms** | 6,9 ms |
    | Patio, recreo: «Jugar con X» | 3,9 | 3,5 | 3,0 |
    | Patio, recreo: «Charlar un rato con X» | 2,1 | 2,6 | 2,2 |
    | Patio, recreo: esperar 5 min | 7,6 | 2,1 | 2,0 |
    | Parque, tarde: «Jugar con otros niños» | 13,7 | 5,1 | 4,9 |
    | Parque, tarde: «Charlar un rato con X» | 2,8 | 2,4 | 2,2 |
    | Parque, tarde: esperar 5 min | 10,3 | 2,5 | 2,4 |

    (`perform` cuesta 0,2–0,5 ms en todas: el coste no está en la acción, sino en volver a listar las acciones tras ella.)

    1. **«Jugar con otros niños» es de 3 a 4 veces más cara que «Charlar» o «Jugar con X» en el mismo sitio y hora**, y el momento importa poco: el patio en el recreo cuesta 7,4 y el parque por la tarde, 5,1 (≈ 30 % más en el patio, por haber más gente); «Charlar» cuesta lo mismo en el patio (2,6) que en el parque (2,4). El primer clic tras llegar a un sitio es caro en todas (esperar: 7,6–10,3 frente a 2,1–2,5 después): es la presencia en frío.
    2. **Por qué:** cada vez que juega con tres niños que no conoce, **la acción crea de golpe sus vínculos y los da a conocer** (evento de presentación → la lista de personas de `npcs` se sustituye por una nueva). Medido en una partida: la lista de personas es nueva en 3 de 6 clics y la versión de la presencia cambia en 4 de 6 (con «esperar», en 1 de 6). Una lista nueva invalida la presencia por tramo (`indiceDePresencia`, `agendaDePersona`, `limitesDeTramos`) y `cercanosConClave` la recalcula (5,6 ms/clic inclusivo en el perfil); `ninosDeTuEdad` suma 2,7 ms; las acciones dinámicas de `relaciones` pasan de 1,1–2,2 ms a 5,3 ms por clic (se rehacen por cada persona conocida o con vínculo). Además **la lista de acciones crece con cada niño nuevo conocido** (≈ 10 acciones por persona: charlar, jugar, quedar, estudiar…): 175 → 244 acciones tras 4 clics (jugar con X: 169 sin cambios) y, tras 120 días jugando cada recreo, 486 frente a 243 (59 personas conocidas frente a 32), así que `evaluate` de cada acción cuesta el doble en todos los sitios donde estén esas personas.
    3. **Qué se recalcula aunque ya esté guardado**, por clic: se pide el servicio `lugares` unas 230 veces, `presencia` unas 190 y `npcs` unas 70 (son consultas a servicios ya construidos, pero el servicio de presencia se reconstruye cuando cambia la lista de personas); las acciones dinámicas de `relaciones` se calculan 1,2 veces por clic con «jugar con otros» y 4,2 con «charlar» o «jugar con X» (porque `preview` y `perform` vuelven a buscar la acción entre las dinámicas, que se recalculan cada vez); la lista de cercanos se guarda por (versión de presencia, lugar) y se reutiliza si no cambian.
    4. **Para un jugador real** son entre 2 y 8 ms por clic en esta máquina (15 ms el primero tras llegar al patio): no se nota. Lo que sube de verdad es el coste acumulado de las simulaciones de bots: jugar cada recreo añade ≈ 600 acciones al año y un bot pasa de 24,9 s (2,06 ms por acción) a 57,4 s (4,53 ms) por año simulado (medido con otro proceso en marcha), sobre todo por el primer clic en frío de cada día en el patio y por la lista de acciones que se duplica.

    **Qué se podría optimizar** (nada hecho):

    | Causa | Mejora | Ganancia aprox. | Riesgo |
    |---|---|---|---|
    | La presentación de los niños con los que se juega sustituye la lista de personas entera | Marcar `known` en el sitio, o que la presencia no dependa de `known` (clave de caché por versión de presencia y no por identidad de la lista) | 3–5 ms por clic de «Jugar con otros niños» (de 7,4 a ≈ 3,5) y casi todo el primer clic (15 → ≈ 8) | Medio-alto: toca el estado de `npcs` (regla 5) y las cachés de presencia |
    | Acciones dinámicas de `relaciones` recalculadas en `listActions`, `preview` y `perform` | Memoizarlas por (versión de presencia, lugar, vínculos) | 2–4 ms por clic de «Jugar con otros niños»; 1–2 ms con las demás (las llaman 4 veces) | Medio: hay que invalidar bien cuando cambia un vínculo o la presencia |
    | `ninosDeTuEdad` se recalcula en cada clic | Memoizarla con la clave de `cercanosConClave` y la edad | ≈ 1–3 ms por clic | Bajo |
    | Pedir los servicios 200–300 veces por clic | Memoizar `ctx.service` por minuto y módulo dentro de un mismo `readCtx` | ≈ 1–2 ms por clic y algo más en los de varias personas | Bajo-medio |
    | Una acción por persona conocida (≈ 10 cada una) evaluadas en cada listado | No generar las acciones de personas que no están presentes (o evaluarlas perezosamente) | Con 60 niños conocidos, mitad del coste de `evaluate` y de la lista que ve la interfaz | Medio-alto: cambia qué se ve en la interfaz |

    **Corrección (15/11, por la sesión de arquitectura y el usuario): el diagnóstico anterior medía la lista entera de acciones, no lo que pide la interfaz.** La pantalla principal descarta las acciones de cada persona antes de evaluarlas (`apps/web/src/main.ts`: `omitir` de `relaciones.*` salvo `al_azar` y `jugar_con_otros`) y las de una persona solo se evalúan al abrir su ficha (`apps/web/src/gente.ts`); los bots, en cambio, las evaluaban todas (`sim/src/pasos.ts`). Medido de nuevo con `tools/perfil-recreo.ts` reproduciendo la interfaz (preview + perform + lista de la pantalla) y con un personaje que conoce a 7 (como empieza), 32 y 60 personas (medianas de 3 partidas; máquina sin otras cargas; ms por clic, siguientes al primero):

    | Acción | 7–13 conocidos | 32 | 60 |
    |---|---|---|---|
    | Patio, recreo: «Jugar con otros niños» | 3,4 (1.º 14,3) | 2,8 (1.º 8,6) | 1,8 (1.º 10,9) |
    | Patio, recreo: «Jugar con X» | 1,7 | 2,1 | 2,2 |
    | Patio, recreo: «Charlar un rato con X» | 1,6 | 1,8 | 2,2 |
    | Patio, recreo: esperar | 1,3 | 1,0 | 1,1 |
    | Parque, tarde: «Jugar con otros niños» | 2,2 (1.º 12,5) | 2,0 (1.º 7,5) | 2,1 (1.º 6,6) |
    | Parque, tarde: «Jugar con X» / «Charlar» | 1,4 / 1,2 | 1,5 / 1,9 | 1,6 / 1,6 |
    | Parque, tarde: esperar | 1,3 | 1,0 | 1,2 |
    | Abrir la ficha de una persona (lista de `gente.ts`) | 0,3–0,4 | 0,3–0,6 | 0,3–0,5 |
    | *Para comparar: lista entera de acciones (lo que evaluaban los bots)* | 133–224 acciones, 1,6–3,3 | 320–358 acciones, 3,2–8,6 | 459–610 acciones, 5,1–11,3 |

    Con la lista de la pantalla (unas 69 acciones, siempre las mismas) un clic cuesta **entre 1 y 3,5 ms con 7, 32 o 60 conocidos, y no crece con ellos**; el primer clic tras llegar a un sitio (presencia en frío) cuesta de 6 a 14 ms. Abrir una ficha, 0,3–0,6 ms. Lo que crecía con los conocidos y ya no importa para la interfaz es la lista entera (de 133 a 610 acciones; hasta 11 ms): solo la pagaban los bots, y hacía parecer cara una acción que en la interfaz cuesta lo mismo que «Charlar».

    **Arreglo de los bots (sin tocar el juego):** `opcionesDelBot` ofrece lo mismo que la pantalla principal (evaluado) y las acciones de relación con cada persona van aparte, sin evaluar (`RelacionesPerezosas` en `sim/src/pasos.ts`): cada bot elige por su rotación la menos usada que cumple lo que quiere su plan y evalúa por lotes solo las primeras por ese orden hasta encontrar una que se pueda hacer; la elegida se añade a sus opciones para poder viajar al sitio. Es la misma elección que evaluando todas (la menos usada de las que se pueden hacer; a igual uso, la primera del orden del juego), y el bot aleatorio sigue viendo todas (`todasLasAcciones`). **`npm run huella -- 120` sale idéntica antes y después en los 16 bots y semillas.**

    | Medida | Antes del arreglo | Después |
    |---|---|---|
    | `npm run rendimiento -- 60` (bot equilibrado) | 4,3 ms por acción (4,3–5,3 con carga) | 2,0–2,1 ms por acción (antes de los bots del recreo: 2,2–2,6) |
    | `sim/src/sim.test.ts` completo | 324 s (2.º test, 290 s; con más carga se pasaba de su plazo) | 135–139 s (1.º test 19 s, 2.º test 119 s) |
    | `npm run sim`: chequeo de rendimiento | ⚠️ 4,85 ms por acción (límite 1,96), 57,8 s por año simulado | ✅ 1,97 ms por acción (límite 2,12), 23,5 s por año simulado |
    | `npm run sim`: un año del bot equilibrado, semilla 1 (12.711 acciones) | 60,7 s | 21,1 s |
    | `npm run sim`: tabla final y chequeos | — | **idénticos** (misma tabla y mismos niveles; el de rendimiento pasa de ⚠️ a ✅) |
    | Plazos de `sim.test.ts` | 60 s y 600 s (subidos) | **devueltos a los originales: 30 s y 300 s** |

22. **Rasgos de la cara heredables (15/11, ronda del visualizador).** (a) **Guardado empaquetado**: para no pasar del +2 % de estado, el rostro va como un texto de 24 caracteres con 64 niveles por valor (pasos de 1/63), no como 24 números; `rostroDe` y `rostroExpresado` lo leen. Si el dibujo necesitase más resolución, habría que subir a 12 bits por valor (36 caracteres, ≈ +0,7 % más de estado). (b) **Sin mutación**: un hijo solo puede tener valores de sus padres, así que con los siglos los rasgos tienden a perder variedad (los de la primera generación se mezclan, no aparecen nuevos). Una mutación pequeña (± 0,1 con poca probabilidad) lo evitaría; no se ha añadido porque no estaba pedido. **Respondida (usuario, 15/11): se deja sin mutación de momento**; con una variedad de opciones suficientemente amplia, los rasgos no tienen por qué acabar pareciéndose. (c) **Nombres de los rasgos**: `ojosForma`, `ojosTamano`, `narizForma`, `narizTamano`, `bocaGrosor`, `bocaAnchura`, `cejasGrosor`, `cejasForma`, `orejasTamano`, `orejasDespegadas`, `menton`, `pomulos`: lo que significa 0 y 1 en cada uno (p. ej. forma de la nariz de recta a aguileña) lo decide el dibujo.
