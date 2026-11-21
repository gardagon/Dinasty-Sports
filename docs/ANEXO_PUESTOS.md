# Anexo: qué valora el motor en cada puesto del fútbol

Documento de referencia, para leer sin código. Describe **lo que hay hoy** (no propone cambios: las propuestas están en `docs/relevo/futbol-puestos-entrenos.md`). Fuente: `modules/futbol/src/puestos.ts` (pesos), `modules/futbol/src/index.ts` (`rendimientoPorPuestos`) y `packages/contracts/src/deporte-datos.ts` (`conLaPierna`). Para ver los números de un personaje concreto: `npm run puestos` (cabecera de `tools/puestos.ts`).

## 1. Dos «valores en el puesto» que no hay que confundir

| | Qué es | Para qué se usa |
|---|---|---|
| **Valor en el puesto** (este anexo) | Un número por puesto (16 por persona): la media de sus habilidades, ponderada por lo que pesa cada una en ese puesto | El consejo del profesor de Educación Física, las pruebas de acceso y plazas de los clubes, el reparto de la plantilla y quién es titular de qué, el puesto favorito que se va formando |
| **Valor en el partido** (`MOTOR_PARTIDOS.md`) | Cuatro valores por jugador (portería, defensa, creación, ataque), iguales para cualquier puesto; el puesto solo decide **cuánto aporta a cada zona** | Simular el partido |

El puesto del partido usa los mismos pesos de abajo, pero solo para repartir cuánto aporta cada puesto a cada zona (la parte de sus pesos que cae en las habilidades de la zona).

## 2. La fórmula

Para cada persona y cada uno de los 16 puestos:

**valor en el puesto = suma, sobre las habilidades del puesto, de (peso de la habilidad en el puesto × valor de la habilidad)**

- Los **pesos** de cada puesto se escriben como puntos (por ejemplo, reflejos 3, blocaje 3, mano a mano 2…) y se **normalizan a que sumen 100 %**: por eso el resultado es una media y queda en la misma escala (0–100) que las habilidades.
- El **valor de la habilidad** es lo que tiene entrenado (0–100) multiplicado por el efecto del **conocimiento de fútbol**: de ×0,85 (conocimiento 0) a ×1,15 (conocimiento 100), pero solo en la parte que depende de entender el juego (la «sensibilidad»):

| Tipo de habilidad | Cuánto le afecta el conocimiento |
|---|---|
| Mentales y de equipo (visión, posicionamiento, decisiones, juego colectivo; también anticipación, desmarque y sangre fría) | del todo (1) |
| Pase | la mitad (0,5) |
| Técnicas (control, regate, técnica, definición, marcaje, entrada, cabeza…) y de portería | un 30 % (0,3) |
| Físicas (arrancada, salto) y las capacidades (`gen.velocidad`, `gen.resistencia`, `gen.fuerza`) | nada (0) |

  Ejemplo: con conocimiento 0, una habilidad mental vale ×0,85, el pase ×0,925, una técnica ×0,955 y lo físico ×1. Con conocimiento 100: ×1,15, ×1,075, ×1,045 y ×1.
- **La pierna buena** se suma al final y por igual a todos (personaje y PNJ): en los puestos con lado (L… o R…) vale **+0,25** el del lado de su pierna y **−0,25** el del otro. Los puestos centrales no cambian.
- El resultado es **absoluto**: no se compara con la edad ni con el resto de puestos. Un niño de 8 años con habilidades de 5 a 15 saca valores de 8 a 12 en todos los puestos.

**Ejemplo con cuentas** (un niño de 8 años, semilla 3, extremo derecho): regate 19 % × 14, arrancada 19 % × 14, velocidad 16 % × 9, centros 13 % × 11, control 9 % × 6, definición 9 % × 8, desmarque 9 % × 8, técnica 6 % × 8 → 10,6.

## 3. Los 16 puestos y lo que pesa en cada uno (% del total)

Los pesos salen en orden de mayor a menor. Las habilidades `gen.*` son capacidades del cuerpo (no se entrenan como habilidad del fútbol).

| Puesto (id) | Grupo | Pesos (%) |
|---|---|---|
| **Portero** (GK) | portería | reflejos 19, blocaje 19, mano a mano 13, alcance aéreo 13, dominio del área 13, despeje con pie 9, posicionamiento 6, decisiones 6, salto 3 |
| **Central** (CB) | defensa | marcaje 18, entrada 15, juego de cabeza 15, posicionamiento 15, anticipación 12, fuerza 9, salto 6, pase 6, decisiones 6 |
| **Lateral izq./der.** (LB/RB) | defensa | marcaje 15, entrada 15, arrancada 15, centros 11, resistencia 11, posicionamiento 11, velocidad 11, pase 7, regate 4 |
| **Pivote** (CDM) | medio | entrada 15, posicionamiento 15, marcaje 12, pase 12, anticipación 12, visión 9, resistencia 9, juego colectivo 9, decisiones 9 |
| **Carrilero izq./der.** (LCR/RCR) | medio | resistencia 14, pase 14, juego colectivo 14, entrada 11, arrancada 11, control 11, posicionamiento 11, centros 7, velocidad 7 |
| **Mediocentro** (CM) | medio | pase 19, visión 16, control 13, decisiones 13, juego colectivo 13, resistencia 10, técnica 10, posicionamiento 6 |
| **Interior izq./der.** (LM/RM) | medio | pase 14, control 14, resistencia 14, regate 10, visión 10, arrancada 10, centros 10, juego colectivo 10, desmarque 7 |
| **Mediapunta** (CAM) | ataque | visión 16, pase 16, control 13, técnica 13, regate 11, decisiones 11, disparo lejano 8, desmarque 8, definición 5 |
| **Extremo izq./der.** (LW/RW) | ataque | regate 19, arrancada 19, velocidad 16, centros 13, control 9, definición 9, desmarque 9, técnica 6 |
| **Delantero centro** (ST) | ataque | definición 21, desmarque 15, juego de cabeza 12, sangre fría 12, arrancada 9, control 9, posicionamiento 9, fuerza 6, anticipación 6 |
| **Delantero izq./der.** (LST/RST) | ataque | definición 20, desmarque 13, arrancada 13, regate 10, control 10, sangre fría 10, velocidad 10, técnica 7, disparo lejano 7 |

Los puestos izquierdo y derecho de una pareja tienen **exactamente los mismos pesos**; solo los separa la pierna buena.

La matriz completa (habilidad × puesto, con decimales) sale con `npm run puestos -- tabla`.

### Lo que no pesa en ningún puesto
- Habilidades: **golpeo de falta, saques de esquina, penaltis y saque de banda largo**. Se usan en el partido (balón parado, tanda de penaltis), pero no cuentan para saber en qué puesto vales.
- Capacidades: solo entran velocidad, resistencia y fuerza. Coordinación, agilidad, atención, inteligencia y concentración cuentan solo de forma indirecta (hacen subir las habilidades que las apoyan).
- El portero no mira pase, control, sangre fría ni anticipación.

## 4. Dónde se usa el valor en el puesto

- **Profesor de Educación Física** (`modules/npcs/src/plaza.ts`, `consejoDeUnProfesor`): solo habla de un deporte si rindes al menos el 90 % de la mediana de los niños de tu edad que ya lo juegan. Calcula tus 16 valores (con la pierna), **añade a cada uno un azar estable de ±2 puntos** (el mismo todo el día), ordena y nombra los **tres primeros**. Sin cifras.
- **Clubes**: la plaza se mide por puesto; la plantilla se reparte por grupos (2 porteros, 3 centrales, 3 laterales, 4 medios, 3 de banda o extremo, 3 delanteros); el entrenador alinea con 1-4-3-3 (GK; CB, CB; LB, RB; CDM, CM, CM; LW, RW; ST) y el puesto del personaje es el que más vale para el equipo.
- **Puesto favorito de los niños**: se forma con los años a partir de lo que valen en su puesto (valor de referencia 60).
- **Afinidades** entre puestos (cuánta experiencia pasa de uno a otro) son otra tabla (`AFINIDADES` en `puestos.ts`).

## 5. Comparación con Football Manager (de memoria: contrastar con el juego)

Aviso: en FM los «roles» (líbero, carrilero…) son una segunda capa sobre la posición; aquí aún no hay roles (F3 del motor). Los nombres de FM en español: *portero líbero* = Sweeper Keeper; *carrilero* = Wing-back (en este juego, `LCR/RCR` se llaman «carrilero» pero **no son** el carrilero de FM: ver el informe).

| FM: rol | Atributos clave (aprox.) | Equivalente aquí | Lo que aquí falta |
|---|---|---|---|
| Portero líbero | reflejos, blocaje, alcance aéreo, mando del área, comunicación, 1 contra 1, pase, golpeo, anticipación, concentración, serenidad, decisiones, posicionamiento, agilidad, aceleración | portería (6 habilidades) + posicionamiento y decisiones | pase, control, anticipación, sangre fría, agilidad: **no pesan en el portero** |
| Mediocentro defensivo | entrada, marcaje, posicionamiento, anticipación, trabajo en equipo, desgaste, aguante, pase, decisiones, concentración, fuerza | Pivote (CDM): casi todo coincide | fuerza y concentración |
| Carrilero (Wing-back) | centros, regate, entrada, desgaste, aguante, aceleración, velocidad, desmarque, trabajo en equipo | **Lateral** (LB/RB): centros, arrancada, velocidad, resistencia, marcaje, entrada | desmarque, regate casi sin peso |

## 6. Cómo reproducir un personaje

`npm run puestos -- partida <semilla>` crea un personaje nuevo (ciudad grande, semana 3) y enseña habilidades y valores; `-- guardado <copia.json>` hace lo mismo con la copia de seguridad del botón «Exportar» del juego; `-- ruido <semilla>` cuenta con qué frecuencia sale cada puesto entre los tres del profesor; `--hab futbol.reflejos=16,…` cambia valores a mano; `--zurdo` cuenta la pierna izquierda.
