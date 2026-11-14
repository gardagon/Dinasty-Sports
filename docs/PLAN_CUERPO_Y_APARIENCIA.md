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
17. **Estado inicial con Educación física supuesta.** Al crear la partida los PNJ aún no pueden preguntar a `estudios` (no hay servicios en la inicialización): se supone 150 min por semana lectiva y la mitad de lo que darían recreo y Educación física en una semana media (`ESCOLAR_AL_EMPEZAR`), porque la partida empieza justo después de las vacaciones. Desde la primera semana se usa el dato real del país. Alternativa: un aporte estático de `estudios` con los minutos por curso.
18. **Cifras recalibradas.** Juego libre de fuera del colegio `150 × azar^0,5` (antes `340 × …`); adultos: actividad `800 × azar^1,3` y fuerza ligada a la actividad (0,7 de mezcla) para dejar «delgado» en ≈ 12 % de los adultos.
19. **Genética del cuerpo con generador propio.** `metabolismo` y `musculatura` se piden con `ctx.herencia` pero se sortean con un generador propio de cada rasgo (`FAMILIAS_ESTABLES` en `herencia.ts`), igual que las tendencias de la apariencia: no mueven ningún sorteo posterior. Los hermanos las heredan como la estatura (0,45 × (padre + madre) + 0,6 × propio) y el resto de PNJ las saca de su id.
20. **Bots.** No se tocaron: solo ganan actividad (Educación física) respecto a antes. Ninguno juega en el recreo (`sim/src/bots.ts`); si se quiere medir ese efecto, hay que enseñarles a jugar.
