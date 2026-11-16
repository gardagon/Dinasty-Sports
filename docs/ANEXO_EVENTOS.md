# Anexo: cómo se escribe un evento

Guía para quien añade eventos al juego. El diseño y las decisiones están en [`PLAN_EVENTOS.md`](PLAN_EVENTOS.md); el dibujo de lo que hay, en [`eventos/MAPA.md`](eventos/MAPA.md) (`npm run eventos:mapa`).

**Nombres.** Lo que ve el jugador es un **evento**. En el código se llama **suceso** (`SucesoDef`, módulo `sucesos`), porque «evento» ya es el aviso entre módulos; a ese aviso aquí se le llama **señal**.

## 1. Las piezas

| Pieza | Dónde | Qué es |
|---|---|---|
| El formato | `packages/contracts/src/sucesos/` | Tipos, textos con género, condiciones, tiradas, validación. Sin partida |
| El director | `modules/sucesos` | Guarda la memoria, decide qué sale y aplica lo que deja. **No trae contenido** |
| Los **eventos base** | `modules/eventos/src/<área>/` | El contenido del juego base, por áreas: `familia`, `perks`, `relaciones`, `cuerpo`… |
| Los **eventos deportivos** | Dentro del módulo de cada deporte | Mismo formato, con `deporte: '<id>'`. Llegan al instalar el deporte y se van al quitarlo |
| La herramienta | `tools/eventos.ts`, `tools/eventos/banco.ts` | Crear, validar, probar y dibujar |

Un solo director decide los dos tipos en los mismos momentos. El azar de cada suceso es suyo (`rngEstable` con la semilla, el suceso y el día): añadir o quitar sucesos, o un deporte entero, no cambia las tiradas de los demás.

## 2. Añadir un evento

```bash
npm run eventos:nuevo -- eventos.familia.cena "Una cena tensa"   # crea modules/eventos/src/familia/cena.ts con la plantilla comentada
npm run eventos:validar                                          # lo comprueba todo (también corre dentro de npm test)
npm run eventos:probar -- eventos.familia.cena                   # lo enseña por todos sus caminos, con sus textos
npm run eventos:mapa                                             # actualiza docs/eventos/MAPA.md
```

No se toca nada más: ni el motor, ni el director, ni otro módulo. Un archivo exporta por defecto un `suceso({...})`, un `hilo({...})` o una lista de ellos. Los archivos que empiezan por `_` son ayudas (no se cargan). Ejemplos completos: `modules/eventos/src/familia/faltas.ts` (un hilo con tirada, castigo y escenarios), `perks/pulmones.ts` (variantes y papel opcional), `perks/revelaciones.ts` (una tabla que genera 17 sucesos), `relaciones/cumple.ts` (un hilo por persona, coste en dinero, plazo con hora), `cuerpo/altura.ts` (detalles ligeros).

## 3. El formato

### Cuándo sale

| `disparo` | |
|---|---|
| `{ al: 'una.señal' }` | Al pasar esa señal (del motor: `accion.realizada`, `dia.inicio`, `semana.fin`; compartidas: `competicion.resultado`, `clase.faltas_excesivas`…; o de un módulo). Si sus textos usan `{señal.x}`, hay que dar un `ejemploDeSeñal` |
| `{ cada: 'dia' \| 'semana', prob }` | Espontáneo: se tira cada día (o semana) y, si sale, compite por el **cupo** |
| `{ umbral: [condiciones] }` | Una vez, cuando las condiciones pasan de no cumplirse a cumplirse (se miran al empezar el día) |
| `{ programado: true }` | Solo si otro suceso de su hilo lo programa |

- `cuando: [...]`: el momento adecuado; todas las condiciones deben cumplirse.
- `aguanta: { dias }`: si salta y no es el momento, cuántos días espera (se vuelve a mirar tras cada acción). Después se pierde; con `siSePierde: '<opción>'` se aplica esa opción.
- `repite`: `'nunca'`, `'una_vez_por_curso'`, `'siempre'` o `{ espera: { dias }, porReparto? }`. Por defecto, un suceso suelto espera un día y los de un hilo no tienen espera.
- `categoria: 'menor'`: un detalle ligero. `peso`: frente a otros que compiten por el cupo.

### Condiciones

Cada una mira un hecho. Los nombres de persona son **papeles** del reparto.

| Condición | Ejemplo |
|---|---|
| Stat | `{ stat: 'gen.salud', max: 15 }` |
| Hecho con nombre | `{ hecho: 'edad', min: 10, max: 16 }`. Comunes: `edad`, `altura_cm`, `altura_para_su_edad` (cm sobre lo típico), `nota_media`, `faltas`, `faltas_del_trimestre`, `trimestre`, `curso`, `dia`. De un módulo: `'<módulo>.<nombre>'` (servicio `hechos.<módulo>`, con `requiere`). También vale el id de una stat |
| Cambio desde un recuerdo | `{ hecho: 'faltas', max: 1, sobreRecuerdo: 'faltas_al_hablar' }` (como mucho una más que entonces) |
| Calendario | `{ periodo: 'verano' }`, `{ diaDeLaSemana: [5, 6] }` (0 = lunes), `{ hora: { desde: 17 * 60, hasta: 20 * 60 } }` |
| Sitio y compañía | `{ lugar: 'casa' }`, `{ presente: 'tutor' }`, `{ papel: 'entrenador' }` (hay alguien en ese papel) |
| Relación y familia | `{ relacion: 'amigo', afinidad: { min: 40 }, estado: ['amigo', 'mejor_amigo'] }`, `{ familia: 'tutor', expectativas: { min: 60 } }` |
| Perks y carácter | `{ perk: 'pulmones_grandes', revelado: false }`, `{ caracter: 'disciplina', min: 15 }` |
| Club | `{ enClub: true }`, `{ enClub: true, deporte: 'futbol' }` |
| Memoria | `{ marca: 'planton', de: 'amigo' }`, `{ contador: 'eventos.cuenta.fondo', min: 20 }`, `{ recuerdo: 'x', min: 3 }` |
| La señal | `{ señal: 'faltas', min: 12 }`, `{ señal: 'tags', incluye: 'cardio' }` |
| Combinar | `{ no: c }`, `{ alguna: [c, c] }`, `{ todas: [c, c] }` |

### Quién participa

```ts
reparto: {
  tutor:      { tipo: 'progenitor', prefiere: 'mas_expectativas' },
  amigo:      { relacion: { afinidad: { min: 20 } }, presente: true },
  entrenador: { rol: 'entrenador', delDeportePrincipal: true, opcional: true },
  cumple:     { relacion: { afinidad: { min: 20 } }, cumpleEn: { dias: 3 }, edad: { max: 18 } },
  rival:      { deLaSeñal: 'participants', donde: { bando: 'rival' } },
}
```

Si un papel no opcional se queda sin nadie, el suceso no sale. En un hilo, el reparto del hilo se elige al abrirse y se guarda. Un papel `opcional` solo se puede nombrar en un texto donde una condición asegure que hay alguien (`{ papel: 'entrenador' }` en la variante).

### Textos

| Se escribe | Sale |
|---|---|
| `{tutor.nombre}` / `{tutor.Nombre}` | «tu madre» / «Tu madre»; el apodo o nombre de pila de los demás |
| `{amigo.nombreCompleto}`, `{amigo.diaDelCumple}` | Nombre y apellidos; «12 de marzo» |
| `{tutor:o\|a}`, `{tutor:él\|ella}` | La forma que toque por su género |
| `{yo:o\|a}`, `{yo.nombre}` | Lo mismo para quien vive el suceso |
| `{señal.faltas}`, `{recuerdo.x}`, `{pais}` | Datos de la señal, de la memoria del hilo y el país |

`variantes: [{ id, si: [...], texto?, opciones?, efectos? }]`: gana la primera cuyas condiciones se cumplen (`si: []` siempre); lo que no redefine lo hereda del suceso.

### Opciones

```ts
{
  id: 'mentir', texto: 'Decir que es un error del colegio',
  requiere: [{ stat: 'gen.picardia', min: 12 }],     // si no se cumple, sale en gris (u oculta: true)
  caracter: { honestidad: -3 },                      // hacia qué ejes tira: mueve los del personaje y es con lo que decide un PNJ o un bot
  minutos: 5,                                        // tiempo de juego que gasta (1 por defecto)
  tirada: { con: 'gen.picardia', dificultad: 45 },   // 50 % con la stat (para su edad) igual a la dificultad; ±15 puntos por cada 10; entre 5 % y 95 %
  exito: { efectos: [...], resultado: '…' },
  fallo: { efectos: [...], resultado: '…' },
}
```

- Un suceso con opciones necesita `plazo: { dias, porDefecto }` (o `{ hasta: { hora }, porDefecto }`): **nunca bloquea** el juego; si vence, se aplica la opción por defecto.
- Un efecto negativo sobre un recurso (dinero, energía) es un coste: si no alcanza, la opción no se puede elegir.
- `urgencia: 'ahora'` (ventana) o `'pendiente'` (a la lista). Sin opciones, `presentacion: 'ventana' | 'linea'`.
- Suertudo repite a veces una tirada fallada (25 %) y Gafe estropea a veces una acertada (15 %): `TIRADA` en `contracts/src/sucesos/condiciones.ts`.

### Efectos

| Efecto | Ejemplo | Quién lo aplica |
|---|---|---|
| Estado de juego | `{ estadoDeJugador: { moral: -6 } }`, `{ estadoDeJugador: { baja: -1 }, de: 'amigo' }` | El personaje (sus stats) o `npcs` (señal `persona.estado`) |
| Estado | `{ estado: 'gen.estres', mas: 8 }`, `{ estado: 'gen.dinero', mas: -10 }` | El director (`addStat`, solo stats de estado) |
| Entrenar | `{ entrena: 'gen.picardia', cantidad: 2 }` | El director (`train`: pasa por la progresión) |
| Relación | `{ relacion: 'tutor', afinidad: -6, confianza: -4 }` | `relaciones` (señal `relacion.cambio`) |
| Familia | `{ familia: 'tutor', apoyo: -3, expectativas: 2 }` | `familia` (señal `familia.cambio`; de 0 a 100) |
| Carácter | `{ caracter: { disciplina: 1 } }` | `gen` (señal `perfil.caracter`; de −50 a 50) |
| Revelar un perk | `{ revelaPerk: 'pulmones_grandes' }` | `gen` (señal `perk.revelado`) |
| Conocer a alguien | `{ presenta: 'amigo' }` | señal `persona.presentarse` |
| Otra señal compartida | `{ emite: 'club.salir', datos: {...} }` | Su dueño |
| Diario | `{ diario: 'Texto', tipo: 'logro' }` | El director |
| Marca | `{ marca: 'planton', de: 'amigo', dura: { dias: 180 } }`, `{ quitaMarca: 'planton', de: 'amigo' }` | Memoria de toda la partida |
| Recuerdo | `{ recuerda: { faltas_al_hablar: 'faltas' } }` | Memoria del hilo (el valor del hecho ahora) |
| Programar | `{ programa: 'eventos.x.y', en: { dias: 21 } }`, `{ dias: [14, 42] }`, `{ proximo: 'verano' }`, `{ elCumpleDe: 'amigo' }` | Solo sucesos del mismo hilo |
| Modificador temporal | `{ modificador: { tags: ['cardio'], eficiencia: 1.15, coste: 1.1, dias: 56, motivo: '…' } }` | El director, por etiquetas |
| Restricción | `{ restriccion: { tags: ['ocio'], dias: 7, motivo: 'Estás castigad{yo:o\|a}' } }` | Bloquea las acciones con esa etiqueta |
| Condicional | `{ si: [...], entonces: [...], sino: [...] }` | |
| Cerrar el hilo | `{ fin: true }` | |

Además, elegir una opción con `caracter` mueve esos ejes (`ConfigDeSucesos.caracterPorDecision` puntos por punto de inclinación).

### Hilos y memoria

Un `hilo({ id, nombre, reparto, sucesos, instancias, escenarios })` es un conjunto de sucesos que comparten reparto y recuerdos. `instancias: 'una'` (por defecto) o `'una_por_reparto'` (uno abierto por persona). Se cierra con `fin` o cuando no le queda nada programado ni pendiente.

Los hilos **no se programan entre sí**: se hablan con **marcas** (de toda la partida, con caducidad opcional y, si se quiere, de una persona) y con el estado del mundo (la relación que bajó, el perk que se reveló). La tabla de marcas de `MAPA.md` enseña quién pone y quién lee cada una.

Los **contadores** se declaran como dato: `contador({ id, cuenta: { accion: { tags: ['cardio'], minutosMin: 30 } } })` o `{ señal: 'competicion.resultado' }`. Los comunes están en `modules/eventos/src/contadores.ts`.

### Sucesos que le pasan a cualquiera (PNJ)

Por defecto un suceso es del personaje. Con `para: 'cualquiera'` y una `clase` puede pasarle también a un PNJ, si esa clase está en `ConfigDeSucesos.pnj.clases` (hoy solo `lesion`).

- **Quién lo vive** es el papel `sujeto`: `{sujeto.nombre}`, `{ marca: 'x', de: 'sujeto' }`. Si lo dispara una señal, `sujeto: { deLaSeñal: 'npcId' }` dice qué dato de la señal trae su id. Los espontáneos (`cada`) se tiran una vez por semana y persona.
- **Solo efectos que valen para todos**: `estadoDeJugador: { moral, forma, fisica, salud, baja }` (para un PNJ lo aplica `npcs`; para el personaje son motivación, forma, energía, salud y baja), marcas (sin `de`, son de quien lo vive), `programa`, `relacion` con alguien del reparto, `si`, `fin`. La validación rechaza `estado`, `entrena`, `caracter`, `revelaPerk`, `modificador`, `restriccion`, `familia` y `presenta`.
- **Las condiciones** leen lo que se sabe de cualquier persona: `edad`, `altura_cm`, `de_baja`, calendario, perks, carácter, club y marcas. Lo demás (stats, sitio, relaciones) no se sabe de un PNJ y hace falsa la condición.
- **Decide él**, en el momento, por su carácter (la inclinación `caracter` de cada opción); nada queda pendiente ni se le enseña al jugador. Con `textoDeCercano` y `pnj.diarioDeCercanos`, el personaje se entera por el diario si tiene relación con esa persona.
- Ejemplo: `modules/eventos/src/salud/lesion.ts`. Lo que cuesta activar más clases: `npm run eventos:rendimiento`.

## 4. Lo que se puede ajustar sin tocar código

`ConfigDeSucesos` (`contracts/src/sucesos/tipos.ts`, valores de partida en `CONFIG_DE_SUCESOS`); se cambia aportando un objeto parcial a `sucesos.config`.

| Dato | De partida | Qué es |
|---|---|---|
| `cupo.base` | 1 al día, 4 a la semana | Eventos base espontáneos importantes |
| `cupo.deporte` | 1 al día, 2 a la semana | Eventos deportivos espontáneos importantes |
| `cupo.menor` | 2 al día, 8 a la semana | Detalles ligeros, sean base o deportivos |
| `presentacion.consecuencias` | `pistas` | Qué se ve antes de elegir: `pistas` (en palabras), `numeros` o `nada` |
| `presentacion.fueraDeCaracter` | `normales` | Las opciones que no van con el carácter: `normales`, `sombreadas` (se ven, no se eligen, se dice por qué) u `ocultas` |
| `presentacion.ejeMarcado`, `inclinacionMinima` | 25, 2 | Una opción no encaja si tira al menos 2 en contra de un eje que el personaje tiene a 25 o más |
| `pnj.clases` | `['lesion']` | Clases de suceso (`clase:`) que viven también los PNJ |
| `pnj.diarioDeCercanos` | `false` | Si lo que le pasa a alguien cercano sale en el diario |
| `caracterPorDecision` | 1 | Puntos de eje por punto de inclinación de la opción elegida |

Los tres cupos no compiten entre sí. Los sucesos que son consecuencia de algo (una señal, uno programado, un umbral) no gastan cupo.

## 5. Probar

**Lo que se comprueba solo** (`npm run eventos:validar` y `tests/eventos.test.ts`), sin escribir ningún test:

- forma, ids con el prefijo de quien aporta, duplicados; base frente a deportivo;
- referencias: stats, perks, ejes, señales, papeles, contadores, sucesos programados, opción por defecto;
- regla 4: `estado` solo sobre stats de estado, `entrena` para las demás; `emite` solo señales compartidas;
- textos: llaves, papeles, papeles opcionales, datos de la señal y recuerdos;
- memoria: marca leída que nadie pone (error) o puesta que nadie lee (aviso);
- hilos: que puedan empezar; sucesos programados que nadie programa;
- **todos los caminos**: cada variante, cada opción y cada rama de cada tirada de cada hilo se ejecutan en una partida de verdad, con las personas en femenino y en masculino, y ningún texto se queda con una llave;
- que el catálogo cargue sin los módulos que algún suceso `requiere`.

**Lo que se escribe como datos**: `pruebas` en un suceso y `escenarios` en un hilo.

```ts
escenarios: [{
  nombre: 'Promete y vuelve a faltar',
  dado: { lugar: 'casa', presente: ['tutor'], hechos: { faltas: 12 } },      // lo que hay, sin jugar hasta llegar ahí
  pasos: [
    { señal: 'clase.faltas_excesivas', datos: { faltas: 12, curso: 0, trimestre: 1 } },
    { sale: 'eventos.familia.faltas.charla', elige: 'prometer' },             // con tirada: tirada: 'exito' | 'fallo'
    { pasan: { dias: 21 }, dado: { hechos: { faltas: 17 } } },
    { sale: 'eventos.familia.faltas.revision', variante: 'no_cumplio' },
    { espero: { hiloCerrado: true, marca: 'rompio_una_promesa_en_casa' } },
  ],
}]
```

`dado` admite `stats`, `hechos`, `lugar`, `presente` (papeles; sin decirlo, están todos), `periodo`, `hora`, `perks`, `caracter`, `relacion`, `marcas`, `contadores` y `sinPapel`. `espero` admite `sale`, `marca`, `sinMarca`, `programado`, `hiloCerrado`, `opcionDisponible` y `opcionNoDisponible`. Un paso `sale` hace salir el suceso si no ha salido ya solo (sus condiciones cuentan).

**A mano**: `npm run eventos:probar -- <hilo o suceso> [--elige opción,opción] [--masculino]` recorre todos los caminos y enseña los textos tal como los vería el jugador, las marcas que quedan y si el hilo se cierra. Se salta las condiciones y los días de espera: enseña todo lo que puede pasar, no cuándo. En una partida, la acción `sucesos.forzar.<id>` hace salir un suceso (la usará la interfaz de pruebas).

## 6. Dónde cambiar cada cosa

| Qué | Dónde |
|---|---|
| Un evento base | `modules/eventos/src/<área>/<archivo>.ts` |
| Cupos, presentación, PNJ | `CONFIG_DE_SUCESOS` (`contracts/src/sucesos/tipos.ts`) o un aporte a `sucesos.config` |
| Fórmula de la tirada, Suertudo y Gafe | `TIRADA`, `probabilidadDeExito` (`contracts/src/sucesos/condiciones.ts`) |
| Un hecho nuevo de un módulo | Ese módulo publica el servicio `hechos.<id>` (`HechosService`) |
| Un efecto nuevo | `Efecto` (`tipos.ts`), su validación (`catalogo.ts`) y `aplicar` (`modules/sucesos/src/index.ts`); si cambia algo de otro módulo, con una señal compartida que recoja su dueño |
