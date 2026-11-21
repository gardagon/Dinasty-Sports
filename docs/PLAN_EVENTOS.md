# Plan de eventos y decisiones (E18)

Propuesta de diseño del 16/11/2026. **El usuario respondió a las preguntas de §6 el mismo día** (tabla al principio de §6). **Estado de la construcción: §7 bis.** Quien vaya a escribir eventos, que lea [`ANEXO_EVENTOS.md`](ANEXO_EVENTOS.md): es el formato tal como ha quedado construido (este documento es la propuesta y difiere en detalles).

Requisitos del usuario (16/11/2026, `DECISIONES.md`, «Pendiente e ideas»):

- Añadir un evento tiene que ser **muy fácil**: casi una **herramienta** para definirlos como **datos**, sin tocar el motor ni el código de los módulos.
- Tiene que permitir **hilos**: un evento deja consecuencias (memoria, marcas, cambios en relaciones o stats, eventos pendientes) que disparan otros semanas, meses o años después.
- Las reglas del repositorio no se rompen (`CLAUDE.md`).

**Una palabra antes de empezar.** En el código, «evento» ya significa otra cosa: el aviso que un módulo emite y otros escuchan (`GameEvent`, `SHARED_EVENTS`, `dia.fin`). En este documento:

- **evento** es lo que ve el jugador: algo que pasa, con un texto y, a veces, opciones;
- **señal** es el aviso del motor entre módulos (`clase.faltas_excesivas`, `competicion.resultado`).

Cómo se llaman en el código es la pregunta P12.

---

## 1. Qué espera a los eventos

| Qué | Dónde está apuntado | Qué necesita del sistema |
|---|---|---|
| **Motor de eventos y decisiones** (condiciones, probabilidad, una vez o con espera, programados, por umbral, ligados a PNJ; opciones con requisitos, costes y consecuencias; «puertas») | `BACKLOG_STATS.md` E18.1 y E18.2 | Todo este plan |
| **Las decisiones mueven los ejes de carácter y abren o cierran opciones** | E4.3 (bloquea E4.4 y E4.5) | Efecto «carácter» en las opciones; condiciones sobre los ejes |
| **Revelación de los perks latentes** | E5.3; `DECISIONES.md` 24/10 («Perks») y «Pendiente e ideas»; `ARQUITECTURA.md` («Perks») | Efecto «revelar perk»; condiciones sobre perks y sobre lo que se ha entrenado. Hilo de ejemplo §4.2 |
| **Suertudo y Gafe** (segunda oportunidad, algo sale mal) | E5.6 | Las tiradas de las opciones consultan estos perks (§2.6) |
| **Autoridad y picardía no tienen de dónde subir** | E18.3; `DECISIONES.md` 17/10 («Sin fuente de subida todavía») | Opciones que las entrenan (`ctx.train`) y que las piden como requisito |
| **Aviso de los padres por las faltas** (la señal `clase.faltas_excesivas` ya existe; falta quien la recoja) | `DECISIONES.md` 28/10 y «Pendiente e ideas»; `events.ts` | Disparo por señal; reparto con un progenitor. Hilo de ejemplo §4.1 |
| **Apoyo, expectativas y tiempo en casa de los padres** («no hacen nada aún; los moverán los eventos») | E13.1; `DECISIONES.md` 23/10 («Familia y genética») | Efecto «familia»; condiciones sobre esos valores |
| **Colegio, familia y rivalidades como fuente de eventos**; **la rivalidad nace de eventos** | E18.6; E20 (decisión 3 del diseño de relaciones) | Marcas por persona; efecto «relación» |
| **Pareja, hijos, rupturas, declararse** | E20.6, E20.7; `DECISIONES.md` 23/10 («Nueva épica E20») | Hilos largos ligados a una persona |
| **Efectos de las relaciones: un contacto que abre una puerta**; **consecuencias de discutir** y **recuerdos compartidos** | E20.9; «Pendiente e ideas» (E20) | La memoria de los hilos (§2.7) es la base de los recuerdos |
| **Que los demás reaccionen a tu edad y tu altura** | E18.7; `DECISIONES.md` 28/10 | Condiciones sobre edad y altura relativas; reparto con quien esté presente |
| **Cumpleaños** como acontecimientos (felicitar, regalos) y **regalos con coste** | `DECISIONES.md` 27/10 («Datos de las personas») y 28/10 («Pendientes ya anotados») | Reparto por fecha; coste en dinero. Hilo de ejemplo §4.3 |
| **Hermanos**: se van de casa a los 18, su vida afecta a la del personaje, entrenar juntos | `DECISIONES.md` 28/10 («Herencia de casa…») y «Pendiente e ideas» | Disparo por edad de un PNJ; eventos «de mundo» (P6) |
| **Saludos y llamadas**: que los demás te hablen a ti | `DECISIONES.md` 26/10 («Sin teléfono no hay contacto…») | Eventos ligeros iniciados por un PNJ presente |
| **Encuentros en el camino** | `DECISIONES.md` 25/10 («Lugares y desplazamientos»: «solo movimiento hasta que haya eventos») | Disparo por la señal `lugares.llegada` |
| **Clasificatorias: «si no hay clasificatorio previo, un evento especial»** | E9.11; `DECISIONES.md` 22/10 | Disparo por resultado de competición |
| **Ojeadores, selecciones, becas, la oferta profesional y la decisión de dejar el colegio** | E18.5, E10.2–E10.4, E19.6; `DECISIONES.md` 23/10 («Diseño de E10») y «Beca deportiva» | Hilo largo con plazo («pedir tiempo»), puertas |
| **Avance rápido con interrupciones** | E11.2 | Los eventos pendientes son lo que para el avance |
| **Lesión grave como bifurcación; salud muy baja sin castigo; alimentación como decisión** | E12.4; «Pendiente e ideas» («Consecuencias de la salud muy baja») | Disparo por umbral de una stat; modificadores y restricciones temporales |
| **Lecturas y opciones tácticas en la carrera** | E18.4 | No lo cubre este plan: son decisiones **dentro** de una competición (el deporte las presenta). Se puede reutilizar el formato de opciones; ver P11 |
| **Roles derivados de los ejes de carácter** (F4: eventos) | `DECISIONES.md` 28/10 («Siguientes pasos acordados») | Cada opción declara hacia qué carácter tira (§2.6): sirve al jugador, a los PNJ y a los bots |
| **Más vida para los PNJ** (que sean personajes con historia) | «Pendiente e ideas» | Eventos de mundo (P6) |

Lo que **ya existe** con forma de decisión y **no** se propone migrar: la propuesta de cambio de puesto del entrenador (`club.propuesta_de_puesto`, dos acciones en el kit de deporte), la plaza ofrecida tras una prueba y el aviso de faltas (un texto en el registro). Funcionan y tienen tests. Si el usuario quiere que también pasen por la ventana de eventos, es un paso posterior.

Principio que se respeta (`DECISIONES.md` 22/10, «Visión»): **el juego debe poder jugarse sin eventos**. Sin el módulo de eventos cargado, o con el catálogo vacío, la partida es exactamente la de hoy (misma `npm run huella`).

---

## 2. El modelo

### 2.1 Las piezas y dónde vive cada una

```
packages/contracts/src/eventos.ts   El formato: tipos de EventoDef, HiloDef, Condición, Efecto; la clave de aportes
                                    `eventos.catalogo`; las señales compartidas nuevas; el servicio `eventos`.
                                    Y las funciones puras: validar un catálogo, componer un texto con género.
modules/eventos                     El «director»: guarda la memoria, escucha las señales, decide qué evento sale,
                                    ofrece las opciones como acciones y aplica los efectos. No trae contenido.
modules/<cualquiera>/eventos/*.ts   El contenido: cada módulo aporta sus eventos como datos (aportes), con su prefijo.
                                    Un deporte instalable trae los suyos dentro de su paquete.
packages/core                       Dos ampliaciones genéricas y pequeñas (§2.9). Ningún contenido.
tools/eventos-*.ts                  La herramienta (§3): validar, crear, probar un hilo, dibujar el mapa.
sim/                                Los bots deciden; chequeo de frecuencia de eventos.
apps/web                            La ventana del evento, la lista de pendientes y los recuerdos (§5).
```

Cómo encaja con las reglas:

- **Regla 1 (un módulo solo importa contracts).** El contenido son objetos de datos que nombran cosas por su id (`'gen.estres'`, `'clase.faltas_excesivas'`): no importan nada más que los tipos de contracts. El director tampoco importa a nadie.
- **Regla 2 (cómo se comunican).** El director lee a los demás por **servicios** de contracts y cambia cosas de los demás por **señales compartidas** nuevas (§2.5). El contenido llega por **aportes**, el mismo mecanismo que usan los deportes (`deportes.ficha`, `lugares.mapa`).
- **Regla 3 (ids con prefijo).** Un evento aportado por `familia` se llama `familia.*`. El director lo comprueba al arrancar, como el registro con las acciones.
- **Regla 4 (no tocar habilidades ajenas).** Las habilidades suben con `ctx.train`; solo las stats de estado cambian con `ctx.addStat`. La herramienta rechaza un evento que intente otra cosa.
- **Regla 5 (estado JSON).** La memoria es JSON plano (§2.7). Las definiciones no se guardan: se leen del catálogo.
- **Regla 6 (core sin contenido).** Los eventos son contenido y están en módulos.
- **Regla 8 (español y género).** Los textos concuerdan con el género de cada participante (§2.4).

### 2.2 Un evento como dato

Un evento tiene cinco partes: **cuándo** puede salir, **quién** participa, **qué se lee**, **qué se puede elegir** y **qué deja**.

```ts
evento({
  id: 'familia.faltas.charla',
  // CUÁNDO
  disparo: { al: 'clase.faltas_excesivas' },         // una señal · { cada: 'dia', prob: 0.1 } · { programado: true }
  cuando: [{ lugar: 'casa' }, { presente: 'tutor' }], // el momento adecuado: todas deben cumplirse
  aguanta: { dias: 3 },                               // si aún no es el momento, espera hasta 3 días y luego se pierde
  repite: 'una_vez_por_curso',                        // 'nunca' · 'una_vez_por_curso' · { espera: { dias: 30 } } · 'siempre'
  // QUIÉN
  reparto: { tutor: { tipo: 'progenitor', prefiere: 'mas_expectativas' } },
  // QUÉ SE LEE
  titulo: 'Te han llamado del colegio',
  texto: '{tutor.Nombre} te espera en el salón, muy seri{tutor:o|a}. «Han llamado del colegio: llevas {señal.faltas} faltas este trimestre».',
  // QUÉ SE PUEDE ELEGIR
  urgencia: 'ahora',                                   // 'ahora' (ventana) · 'pendiente' (a la lista, con plazo)
  plazo: { dias: 1, porDefecto: 'callar' },
  opciones: [ /* §2.6 */ ],
})
```

Un evento **sin opciones** es un aviso con efectos (la revelación de un perk, un comentario sobre tu altura).

### 2.3 Cuándo sale: disparos y condiciones

**Disparos** (uno por evento):

| Disparo | Para qué | Ejemplo |
|---|---|---|
| `{ al: '<señal>' }` | Reaccionar a algo que acaba de pasar. Vale cualquier señal: `accion.realizada`, `dia.inicio`, `competicion.resultado`, `lugares.llegada`, `clase.faltas_excesivas`… | Los padres y las faltas |
| `{ cada: 'dia' \| 'semana', prob }` | Cosas que pueden pasar cualquier día con cierta probabilidad mientras se cumplan las condiciones | Un compañero comenta tu altura |
| `{ umbral: [condiciones] }` | Se dispara **una vez** cuando las condiciones pasan de falsas a verdaderas (se miran una vez al día) | La salud cae por debajo de 15 |
| `{ programado: true }` | Solo sale si otro evento lo programó (§2.7) | La revisión a las tres semanas |

**Condiciones** (`cuando`, `umbral`, los requisitos de una opción y las variantes): una lista en la que todas deben cumplirse; `{ alguna: [...] }` y `{ no: ... }` para lo demás. Cada condición mira un **hecho**:

| Hecho | Ejemplo | De dónde sale |
|---|---|---|
| Una stat | `{ stat: 'gen.salud', max: 15 }` | `ctx.stat` |
| Edad, altura, cuerpo | `{ edad: { min: 10, max: 16 } }`, `{ alturaParaSuEdad: { max: -1.5 } }` | servicio `identidad` |
| Calendario | `{ periodo: 'verano' }`, `{ diaDeLaSemana: [5, 6] }`, `{ hora: { desde: 17 } }`, `{ trimestre: 2 }` | `ctx.time` |
| Sitio y compañía | `{ lugar: 'casa' }`, `{ presente: 'tutor' }` | servicios `lugares` y `presencia` |
| Relación con alguien del reparto | `{ relacion: 'amigo', afinidad: { min: 40 } }`, `{ relacion: 'rival', estado: 'enemigo' }` | servicio `relaciones` |
| Estudios | `{ notaMedia: { max: 5 } }`, `{ faltas: { min: 20 } }` | servicio `estudios` |
| Perks | `{ perk: 'pulmones_grandes', revelado: false }` | servicio `perks` (ampliado, §2.5) |
| Carácter | `{ caracter: 'disciplina', min: 15 }` | servicio `perfil` |
| Familia | `{ familia: 'tutor', expectativas: { min: 60 } }` | servicio `familia` |
| Club y deporte | `{ enClub: true }`, `{ deportePrincipal: 'futbol' }` | servicio `clubes` |
| **Memoria** | `{ marca: 'prometio_no_faltar' }`, `{ contador: 'sesiones_de_fondo', min: 20 }`, `{ recuerdo: 'faltas_al_prometer', … }` | el propio director (§2.7) |
| La señal que lo disparó | `{ señal: 'faltas', min: 12 }` | los datos de la señal |
| Un hecho de otro módulo | `{ hecho: 'futbol.goles_de_la_temporada', min: 5 }` | servicio `hechos.<módulo>` (abajo) |

**Hechos de otros módulos, sin tocar el director.** La lista de arriba cubre los servicios que ya están en contracts. Para lo demás, un módulo publica un servicio `hechos.<su id>` con un único método, `valor(nombre)`, y cualquier evento lo consulta con `{ hecho: '<módulo>.<nombre>' }`. Así el fútbol puede ofrecer «goles de la temporada» o «minutos jugados» sin que el director sepa qué es un gol. Si el módulo no está cargado, la condición es falsa (y la herramienta avisa si el evento no declaró `requiere: ['futbol']`).

**El azar es propio de cada evento.** La tirada de `prob` sale de `rngEstable(semilla, 'evento', id, día)`, no del generador de la partida. Dos consecuencias: añadir un evento al catálogo **no cambia las tiradas del resto del juego** (carreras, partidos, lesiones), y un mismo día con la misma semilla da siempre lo mismo.

**Ritmo.** Para que el jugador no reciba diez eventos un lunes, el director reparte: los eventos de `cada` compiten entre sí por peso (`peso`, 1 por defecto) y sale como mucho un número de ellos por día y por semana. Los disparados por una señal y los programados no cuentan en ese cupo (son consecuencia de algo). Las cifras del cupo son la pregunta P5.

### 2.4 Quién participa: el reparto, y los textos con género

Un evento declara **papeles** y el director busca a quién le toca cada uno:

```ts
reparto: {
  tutor:      { tipo: 'progenitor', prefiere: 'mas_expectativas' },
  amigo:      { relacion: { estado: ['amigo', 'mejor_amigo'] }, presente: true },
  entrenador: { rol: 'entrenador', delDeportePrincipal: true, opcional: true },
  cumple:     { relacion: { afinidad: { min: 20 } }, cumpleEn: { dias: 3 } },
  rival:      { deLaSeñal: 'participants', donde: { bando: 'rival' } },
}
```

- Los filtros son los del servicio `npcs` (rol, etiqueta, edad, conocido), más relación, presencia, cumpleaños y «alguien de la señal».
- Si hay varios candidatos, se elige con el azar estable del evento (o con `prefiere`).
- Si un papel **no opcional** se queda sin nadie, el evento no sale.
- En un **hilo**, el reparto se guarda en la memoria del hilo: el evento de tres semanas después habla de la misma persona.

**Textos.** Son plantillas con llaves; no son código:

| Se escribe | Sale |
|---|---|
| `{tutor.nombre}` / `{tutor.Nombre}` | `tu madre` / `Tu madre` para un progenitor; el apodo o nombre de pila para los demás (`nombreCorto`) |
| `{amigo.nombreCompleto}` | Nombre y apellidos |
| `{tutor:o\|a}` | `o` si es él, `a` si es ella: `seri{tutor:o\|a}` → `serio` / `seria` |
| `{tutor:él\|ella}`, `{entrenador:Tu entrenador\|Tu entrenadora}` | La forma que toque |
| `{yo:o\|a}`, `{yo.nombre}` | Lo mismo para el personaje (hoy es chico; cuando haya creación de personaje, concordará solo) |
| `{señal.faltas}`, `{recuerdo.faltas_al_prometer}`, `{pais}` | Datos de la señal, de la memoria del hilo y del país |

La herramienta compone **cada texto en masculino y en femenino** para cada papel y falla si queda una llave sin resolver, si se nombra un papel que el evento no tiene o si un papel `opcional` se usa en un texto sin variante para cuando falta.

**Variantes.** Un evento puede tener `variantes`: una lista de `{ si: [condiciones], titulo?, texto?, opciones? }`; gana la primera que se cumple y lo que no redefine lo hereda. Sirve para «la revisión» (bien si cumpliste, mal si no) sin escribir dos eventos.

### 2.5 Qué deja: los efectos

Cada opción (y cada evento sin opciones) tiene una lista de **efectos**. Se dividen en lo que el director hace **él mismo** y lo que **pide a otro módulo** con una señal compartida.

| Efecto | Ejemplo | Cómo se aplica |
|---|---|---|
| Stat de estado | `{ estado: 'gen.estres', mas: 8 }`, `{ estado: 'gen.dinero', mas: -15 }` | `ctx.addStat` (permitido: son de estado) |
| Entrenar una capacidad o habilidad | `{ entrena: 'gen.picardia', cantidad: 2 }` | `ctx.train` (regla 4) |
| Relación | `{ relacion: 'tutor', afinidad: -6, confianza: -4 }` | señal nueva `relacion.cambio` → la recoge `relaciones` con sus propias reglas (compatibilidad, topes) |
| Familia | `{ familia: 'tutor', apoyo: -3, expectativas: 2 }` | señal nueva `familia.cambio` → `familia` |
| Carácter | `{ caracter: { disciplina: 2 } }` | señal nueva `perfil.caracter` → `gen` (E4.3) |
| Revelar un perk | `{ revelaPerk: 'pulmones_grandes' }` | señal nueva `perk.revelado` → `gen` lo marca; el servicio `perks` dice cuáles están revelados |
| Conocer a alguien | `{ presenta: 'amigo' }` | señal existente `persona.presentarse` |
| Otra señal compartida | `{ emite: 'club.salir', datos: { sport: 'atletismo' } }` | salida de emergencia: solo señales de `SHARED_EVENTS` |
| Diario | `{ diario: 'Tus padres te han castigado una semana.', tipo: 'aviso' }` | `ctx.log` |
| **Marca** | `{ marca: 'mintio_a_sus_padres' }`, `{ marca: 'planton', de: 'amigo', dura: { dias: 60 } }`, `{ quitaMarca: … }` | memoria (§2.7) |
| **Recuerdo** | `{ recuerda: { faltas_al_prometer: { faltas: true } } }` | memoria del hilo: guarda el valor de un hecho ahora |
| **Programar** | `{ programa: 'familia.faltas.revision', en: { dias: 21 } }`, `en: { dias: [14, 28] }`, `en: { proximo: 'verano' }` | memoria: la cola de programados |
| **Modificador temporal** | `{ modificador: { tags: ['estudio'], eficiencia: 1.1, dias: 14, motivo: 'Motivado por la promesa' } }` | el director publica un modificador por etiquetas (hoy ya se puede) |
| **Restricción temporal** | `{ restriccion: { tags: ['ocio'], dias: 7, motivo: 'Estás castigado' } }` | necesita la ampliación del motor de §2.9 |
| Condicional | `{ si: [condiciones], entonces: [...], sino: [...] }` | — |
| Cerrar el hilo | `{ fin: true }` | memoria |

**Puertas (abrir y cerrar acciones, E18.2).** Tres formas, de menos a más acoplada:

1. **Restricciones y modificadores por etiquetas** (arriba): «castigado» bloquea lo que lleve `ocio` sin que el director sepa qué acciones son. Vale para cualquier módulo futuro.
2. **Marcas que otro módulo consulta.** El servicio `eventos` publica `tiene(marca)`. Un módulo que quiera una puerta propia la pone en su `available`: `ctx.service<EventosService>('eventos')?.tiene('beca_concedida')`. Como con cualquier servicio, debe funcionar si no existe.
3. **Una señal compartida** que el módulo dueño entiende (`club.unirse`): para puertas que ya son reglas de un módulo.

Las señales nuevas (`relacion.cambio`, `familia.cambio`, `perfil.caracter`, `perk.revelado`) van a `SHARED_EVENTS`, con su tipo de datos en contracts. Quien las recoge es el módulo dueño, con un manejador de pocas líneas: es el único código que se toca en módulos existentes, una vez, y no por cada evento.

### 2.6 Las opciones

```ts
opciones: [
  {
    id: 'prometer',
    texto: 'Prometer que no volverás a faltar',
    caracter: { disciplina: 2 },                 // hacia dónde tira esta opción (ver abajo)
    minutos: 10,                                 // lo que dura (por defecto, 1)
    efectos: [ ... ],
    resultado: '{tutor.Nombre} suspira. «Está bien. Pero voy a estar pendiente».',
  },
  {
    id: 'mentir',
    texto: 'Decir que ha sido un error del colegio',
    requiere: [{ stat: 'gen.picardia', min: 12 }],   // si no se cumple, sale en gris con el motivo
    tirada: { con: 'gen.picardia', dificultad: 45 },
    exito: { efectos: [ ... ], resultado: '…' },
    fallo: { efectos: [ ... ], resultado: '…' },
  },
]
```

- **Requisitos** (`requiere`): condiciones como las de §2.3. La opción que no los cumple se ve en gris con el motivo (igual que una acción no disponible) o no se ve (`oculta: true`).
- **Costes**: un efecto negativo sobre un recurso (dinero, energía) bloquea la opción si no alcanza, como en las acciones.
- **Tirada**: una prueba contra una stat. La probabilidad de éxito sale de la stat frente a la dificultad con una fórmula única para todo el juego (a fijar en la construcción, con su entrada en `DECISIONES.md`). El azar es estable (`rngEstable` con la semilla, el evento y el día). **Suertudo** repite una tirada fallada de vez en cuando y **Gafe** estropea una acertada (E5.6): se hace una vez, en el director, y vale para todos los eventos.
- **`caracter`**: cada opción puede declarar hacia qué ejes tira (`{ disciplina: 2, honestidad: -1 }`). Ese único dato sirve para tres cosas:
  1. elegirla **mueve los ejes del personaje** (E4.3), si el usuario lo quiere así (P7);
  2. un **PNJ** elige entre las opciones según su carácter, con tirada estable (la idea de los «roles derivados de los ejes» del 28/10);
  3. un **bot** de la simulación decide igual, con el carácter de su estrategia.
- **Elegir es una acción.** Cada opción de un evento pendiente es una acción del módulo `eventos` (`eventos.elegir.<instancia>.<opción>`, resuelta por id con `resolverAccion`: no sale en las listas). Pasa por `Game.perform` como todo: gasta su tiempo, deja su registro, se guarda igual y los tests y los bots la ejecutan con la misma llamada que cualquier acción.
- **Plazo.** Un evento con opciones lleva `plazo`: si pasa sin que el jugador elija, se aplica `porDefecto` (normalmente la opción de «no hacer nada», que también tiene consecuencias). Así ninguna partida se queda atascada y los bots antiguos, que no saben de eventos, siguen funcionando.

### 2.7 Los hilos: memoria y consecuencias a largo plazo

Un **hilo** es un conjunto de eventos que comparten memoria. Se escribe en un solo archivo:

```ts
hilo({
  id: 'familia.faltas',
  nombre: 'Las faltas llegan a casa',
  requiere: ['estudios', 'familia'],
  reparto: { tutor: { tipo: 'progenitor', prefiere: 'mas_expectativas' } },   // común a todos sus eventos
  eventos: [ charla, revision, … ],
  escenarios: [ … ],          // sus pruebas (§3.4)
})
```

Un evento deja consecuencias de cinco maneras, y todas son datos guardados:

| Pieza de memoria | Qué es | Alcance | Ejemplo |
|---|---|---|---|
| **Programados** | «Este evento, tal día (o entre tal y tal día, o el próximo verano)» | Del hilo | La revisión a los 21 días |
| **Recuerdos** | Valores guardados en el momento (un número o un texto corto) | Del hilo | Cuántas faltas llevabas al prometer |
| **Marcas** | Un nombre que queda puesto, con caducidad opcional y, si se quiere, ligado a una persona | **De toda la partida**: cualquier evento de cualquier hilo puede leerlas | `mintio_a_sus_padres`; `planton` de Lucía |
| **Contadores** | Cuentas que el director lleva solo, declaradas como dato: «acciones con la etiqueta `cardio`», «veces que ha pasado esta señal» | De toda la partida | Sesiones de fondo antes de revelar «Pulmones grandes» |
| **Historia** | Qué evento salió, qué día, con quién y qué se eligió | De toda la partida, para siempre | «¿Eligió mentir en la charla de las faltas?» |

Y, fuera del director, lo que el efecto cambió en los demás módulos (la relación, el estrés, un perk revelado) es memoria también: una condición la lee meses después.

**Cómo se encadenan.** Tres mecanismos, del más atado al más suelto:

1. **Programar** un evento concreto: el hilo sigue seguro. Con `en: { dias: [14, 28] }` el día sale del azar estable; con `en: { proximo: 'verano' }` sale del calendario del país. Al llegar el día, si no se cumple su `cuando` (no estás en casa), **aguanta** los días que diga `aguanta` y luego se pierde o aplica su `siSePierde`.
2. **Marcas**: un evento deja una marca y otro, quizá de otro hilo y escrito meses después por otra persona, la pide en su `cuando`. Es lo que permite consecuencias a **años**: `mintio_a_sus_padres` puede hacer que, dos veranos después, el evento de «pedir permiso para el campamento» tenga una variante en la que no se fían.
3. **El estado del mundo**: el evento baja la confianza con tu madre; cualquier evento futuro con `{ relacion: 'tutor', confianza: { max: 30 } }` reacciona, sin saber por qué bajó.

**Un hilo puede abrirse varias veces** (uno por amigo, por ejemplo): cada apertura es una **instancia** con su reparto y sus recuerdos. `instancias: 'una'` (por defecto) o `'una_por_reparto'`.

**Qué se guarda** (estado del módulo `eventos`, JSON):

```ts
interface EventosState {
  marcas:      Record<string, { hasta?: number; valor?: number }>;       // clave: 'marca' o 'marca@persona'
  contadores:  Record<string, number>;
  hilos:       { id: number; def: string; reparto: Record<string, string>; recuerdos: Record<string, number | string>; desde: number }[];
  programados: { dia: number; evento: string; hilo?: number; hasta: number }[];   // ordenados por día
  pendientes:  { id: number; evento: string; hilo?: number; reparto: Record<string, string>; vence: number; señal?: unknown }[];
  temporales:  { tags: string[]; eficiencia?: number; coste?: number; bloquea?: boolean; motivo: string; hasta: number }[];
  ultimaVez:   Record<string, number>;      // día en que salió cada evento con espera
  historia:    [dia: number, evento: number, opcion: number, ...reparto: string[]][];   // compacta, §5.2
  indice:      string[];                    // ids de evento y de opción usados en `historia`
  siguiente:   number;
}
```

No se guarda ningún texto: el diario y los recuerdos se vuelven a componer con el catálogo, el reparto y los recuerdos del hilo.

### 2.8 El personaje y los PNJ

`VISION.md` (principio 2) y `MISMAS_REGLAS.md` piden las mismas reglas para todos «en todo lo que les hace valer algo»; lo distinto es **quién decide**. El formato está pensado para que un evento no dependa de que el protagonista sea el personaje:

- las condiciones hablan de **hechos de una persona** (edad, perks, carácter, estado), y casi todos existen ya para los PNJ (`LectorDePersona`, `NpcView`);
- las opciones llevan `caracter`, así que un PNJ **decide solo** con la misma tabla que leería el jugador;
- los efectos sobre una persona (estado, moral, revelar un perk) tienen equivalente en `npcs`.

Lo que **no** existe hoy para un PNJ: relaciones completas entre PNJ (solo la afinidad con su entrenador, `MISMAS_REGLAS.md` §3), dinero, estrés. Un evento que dependa de eso no puede pasarle a un PNJ todavía.

Cuánto de esto entra en la primera versión es la pregunta P6. Lo que no admite atajo, se decida lo que se decida: **un evento nunca da al personaje algo que un PNJ en su situación no podría tener** (nada de «al personaje lo ve un ojeador porque es el personaje»: lo ve porque cumple las condiciones, y un PNJ que las cumpla recibe la misma oferta cuando haya eventos de mundo).

### 2.9 Lo que hay que añadir al motor (genérico, sin contenido)

| Ampliación | Por qué | Alternativa si no se quiere |
|---|---|---|
| **Escuchar cualquier señal**: `on: { '*': manejador }` en `GameModule` | El director no sabe al compilar qué señales nombra el catálogo (llegan por aportes). Con `'*'` recibe todas y busca en su tabla por tipo (una consulta a un `Map`) | `escuchaSegunAportes`, como `accionesSegunAportes`: el registro calcula la lista de señales al arrancar. Algo más de código, y solo se llama al director cuando hay eventos para esa señal |
| **Un modificador puede bloquear**: `ModifierResult.bloquea?: string` (el motivo) | Para «castigado: nada de ocio» por etiquetas, sin que el director conozca las acciones. Hoy un modificador solo multiplica | Sin ella, los castigos solo pueden encarecer o empeorar (eficiencia ×0,1), no impedir. Pregunta P8 |

Nada más: las opciones son acciones (`resolverAccion` ya existe), el contenido llega por aportes (ya existe), la memoria es estado del módulo, la interfaz lee el servicio `eventos`.

`SAVE_VERSION` sube una vez (estado nuevo de `eventos`, perks revelados en `gen`).

---

## 3. La herramienta para definir eventos

### 3.1 Cómo se escribe un evento

Un evento es **un objeto de datos en un archivo `.ts`** dentro de la carpeta `eventos/` del módulo al que pertenece. No hay funciones dentro: solo textos, números y listas. Se usa TypeScript (y no JSON suelto) por tres razones: el editor **autocompleta y subraya los errores mientras se escribe** (un efecto mal escrito, una opción sin texto), se pueden poner comentarios, y varios eventos parecidos se generan con una función de ayuda (§4.2: una revelación por perk). Lo que sale de esos archivos es JSON puro, y eso es lo que valida y carga el juego; por eso más adelante se puede añadir un editor visual o paquetes de eventos importables sin cambiar nada (P1).

El camino completo para añadir un evento:

```bash
npm run eventos:nuevo -- familia.cena "Una cena tensa"    # crea modules/familia/eventos/cena.ts con una plantilla comentada
# … se escribe el evento …
npm run eventos:validar                                    # lo comprueba todo (§3.3); también corre dentro de npm test
npm run eventos:probar -- familia.cena                     # lo enseña y lo juega en la terminal (§3.5)
```

No se toca nada más: `eventos:nuevo` deja el archivo donde el módulo ya recoge todos los de su carpeta (un `index.ts` generado que los junta en `aportes['eventos.catalogo']`). **Ni el motor, ni el director, ni el código del módulo cambian.**

Para un evento suelto no hace falta un hilo: se escribe `evento({...})` solo. Un hilo es un archivo con varios.

### 3.2 La plantilla

Lo que crea `eventos:nuevo` (todo lo opcional viene comentado, con una línea de explicación):

```ts
import { evento } from '@ds/contracts';

export default evento({
  id: 'familia.cena',
  titulo: 'Una cena tensa',

  disparo: { cada: 'dia', prob: 0.05 },          // { al: 'señal' } · { cada: 'dia'|'semana', prob } · { umbral: [...] } · { programado: true }
  cuando: [{ lugar: 'casa' }, { hora: { desde: 20 * 60 } }],
  repite: { espera: { dias: 30 } },              // 'nunca' · 'una_vez_por_curso' · { espera } · 'siempre'
  // reparto: { quien: { tipo: 'progenitor' } },
  // requiere: ['estudios'],                     // módulos sin los que este evento no existe

  texto: 'Escribe aquí lo que pasa. Usa {quien.nombre} y {quien:o|a} para concordar.',

  opciones: [
    { id: 'a', texto: 'Primera opción', efectos: [{ estado: 'gen.estres', mas: -2 }], resultado: 'Lo que pasa después.' },
    { id: 'b', texto: 'Segunda opción', efectos: [] },
  ],
  plazo: { dias: 1, porDefecto: 'b' },

  // pruebas: [{ nombre: '…', dado: { … }, elige: 'a', espero: { … } }],   // §3.4
});
```

### 3.3 Validación: los tests automáticos de cada evento

`npm run eventos:validar` (y un test dentro de `npm test`, así que también corre en la CI) revisa **todos** los eventos del catálogo sin que quien los escribe tenga que hacer un test. Si algo falla, el mensaje dice el evento, el campo y qué se esperaba.

| Comprobación | Ejemplo de lo que caza |
|---|---|
| **Forma** | Un efecto que no existe, una opción sin `texto`, `prob` fuera de 0–1, un evento con opciones sin `plazo` |
| **Ids** | Prefijo que no es el del módulo que lo aporta; dos eventos o dos opciones con el mismo id |
| **Referencias** | Una stat que no existe; una señal que nadie emite; un perk o un eje de carácter mal escritos; un evento programado que no está en el catálogo; `porDefecto` que no es una opción |
| **Regla 4** | `estado:` sobre una stat que no es de estado (hay que usar `entrena:`); `emite:` con una señal que no es compartida |
| **Módulos** | Se usa un hecho de `estudios` sin `requiere: ['estudios']` |
| **Textos** | Una llave sin cerrar; un papel que no está en el reparto; un papel opcional usado sin variante. Cada texto se compone **con cada papel en masculino y en femenino** y no puede quedar ninguna llave |
| **Memoria** | Una marca, un contador o un recuerdo que se **lee y nadie escribe** (error), o que se escribe y nadie lee (aviso: quizá es para un evento futuro) |
| **Hilos** | Un evento `programado` que nadie programa; un hilo que no puede terminar; un evento inalcanzable desde el primero del hilo |
| **Cada opción funciona** | En una partida mínima (solo `gen` y el director, con los hechos de otros módulos simulados) se fuerza el evento, se elige **cada opción** (y cada rama de cada tirada) y se comprueba que no lanza errores, que ninguna stat se sale de rango y que el estado sigue siendo JSON |
| **Sin el módulo** | El catálogo carga y la partida funciona con cada módulo de `requiere` ausente (el evento simplemente no existe) |
| **Ritmo** (aviso) | Una probabilidad diaria que, con sus condiciones siempre ciertas, daría más de un evento por semana |

Además, la simulación (`npm run sim`) gana un chequeo de **frecuencia**: cuántas veces sale cada evento por año y por estrategia de bot, con aviso si alguno no sale nunca en ninguna semilla o si sale demasiado (`npm run sim:eventos` para verlo solo).

### 3.4 Pruebas escritas por quien diseña: los escenarios

Lo de arriba comprueba que un evento **no está roto**. Para comprobar que **hace lo que se quería**, el propio archivo puede llevar pruebas como datos. No hay que saber programar tests:

```ts
pruebas: [
  {
    nombre: 'Con mucha picardía se puede mentir',
    dado: { stats: { 'gen.picardia': 30 }, lugar: 'casa', presente: ['tutor'] },
    espero: { opcionDisponible: 'mentir' },
  },
  {
    nombre: 'Prometer deja la promesa y programa la revisión',
    dado: { lugar: 'casa', presente: ['tutor'] },
    elige: 'prometer',
    espero: { marca: 'prometio_no_faltar', programado: { evento: 'familia.faltas.revision', en: { dias: 21 } } },
  },
]
```

Y para un **hilo entero**, un escenario es una pequeña historia: lo que hay al principio, lo que se elige y cuánto tiempo pasa entre medias.

```ts
escenarios: [
  {
    nombre: 'Promete y cumple',
    pasos: [
      { señal: 'clase.faltas_excesivas', datos: { faltas: 12, curso: 0, trimestre: 1 }, dado: { lugar: 'casa', presente: ['tutor'], faltas: 12 } },
      { sale: 'familia.faltas.charla', elige: 'prometer' },
      { pasan: { dias: 21 }, dado: { faltas: 12, lugar: 'casa', presente: ['tutor'] } },
      { sale: 'familia.faltas.revision', variante: 'cumplio' },
      { espero: { relacion: { tutor: { confianza: { sube: true } } }, hiloCerrado: true } },
    ],
  },
]
```

Los escenarios corren con `npm test`. `dado` fija los **hechos** (dónde estás, quién hay, cuántas faltas llevas) sin necesidad de jugar una partida hasta llegar ahí: el director lee los hechos a través de una sola pieza, y en las pruebas esa pieza devuelve lo que diga `dado`.

### 3.5 Probar un hilo a mano

```bash
npm run eventos:probar -- familia.faltas                      # modo interactivo en la terminal
npm run eventos:probar -- familia.faltas --elige prometer     # recorre un camino y enseña la línea de tiempo
npm run eventos:probar -- familia.faltas --todos              # todos los caminos posibles, uno por uno
npm run eventos:mapa -- familia.faltas                        # el dibujo del hilo (para docs/eventos/)
```

`eventos:probar` enseña, para cada paso, el texto tal como lo vería el jugador (en masculino y en femenino si el papel puede ser de los dos), las opciones con sus requisitos, y tras elegir: los efectos aplicados, las marcas y recuerdos que quedan, y **qué queda programado y para cuándo**. Luego salta al siguiente evento del hilo sin esperar los días. Con `--todos` saca la tabla de caminos (qué combinación de elecciones lleva a qué final), que es la forma rápida de ver si un hilo tiene una rama muerta o un final al que no se llega.

`eventos:mapa` genera un diagrama (Mermaid, en un `.md`) con los eventos como cajas, las opciones como flechas y las marcas que cada uno deja o pide. Sirve para revisar un hilo largo de un vistazo y para ver qué hilos se tocan entre sí por las marcas.

**En el juego**, la interfaz de pruebas (la que hoy enseña la genética con `MOSTRAR_GENETICA`) tendría una lista «Eventos» para **forzar** cualquiera del catálogo en la partida real y ver la memoria del director (marcas, contadores, programados). Es la manera de probar un evento con una partida de verdad.

---

## 4. Tres hilos de ejemplo

Están escritos en el formato propuesto, completos. Las cifras son de ejemplo: las de verdad se fijan al construir cada hilo, con su entrada en `DECISIONES.md` y, si tocan relaciones, en `ANEXO_RELACIONES.md`.

### 4.1 Las faltas llegan a casa

Recoge la señal `clase.faltas_excesivas` que `estudios` ya emite a las 12 faltas del trimestre. Esa misma tarde, en casa, uno de los padres saca el tema. Tres semanas después, lo comprueba. Y si mentiste, la mentira se queda guardada para otros hilos.

```ts
import { hilo, evento } from '@ds/contracts';

const charla = evento({
  id: 'familia.faltas.charla',
  titulo: 'Han llamado del colegio',
  disparo: { al: 'clase.faltas_excesivas' },
  cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
  aguanta: { dias: 3 },
  repite: 'una_vez_por_curso',
  texto:
    '{tutor.Nombre} te espera en el salón, muy seri{tutor:o|a}. «Han llamado del colegio. ' +
    'Dicen que llevas {señal.faltas} faltas este trimestre. ¿Me lo explicas?»',
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'callar' },
  opciones: [
    {
      id: 'prometer',
      texto: 'Reconocerlo y prometer que no volverás a faltar',
      caracter: { honestidad: 2, disciplina: 1 },
      minutos: 10,
      efectos: [
        { relacion: 'tutor', confianza: 2 },
        { estado: 'gen.estres', mas: 4 },
        { marca: 'prometio_no_faltar', dura: { dias: 30 } },
        { recuerda: { faltas_al_prometer: { faltas: 'total' } } },
        { programa: 'familia.faltas.revision', en: { dias: 21 } },
      ],
      resultado: '{tutor.Nombre} suspira. «Está bien. Pero voy a estar pendiente».',
    },
    {
      id: 'mentir',
      texto: 'Decir que es un error del colegio',
      requiere: [{ stat: 'gen.picardia', min: 12 }],
      caracter: { honestidad: -3 },
      minutos: 5,
      tirada: { con: 'gen.picardia', dificultad: 45 },
      exito: {
        efectos: [
          { entrena: 'gen.picardia', cantidad: 2 },
          { marca: 'mintio_a_sus_padres' },
          { programa: 'familia.faltas.descubierto', en: { dias: [20, 45] } },
        ],
        resultado: '{tutor.Nombre} duda, pero te cree. «Llamaré mañana para aclararlo».',
      },
      fallo: {
        efectos: [
          { entrena: 'gen.picardia', cantidad: 1 },
          { relacion: 'tutor', afinidad: -6, confianza: -10 },
          { familia: 'tutor', apoyo: -3 },
          { estado: 'gen.estres', mas: 10 },
          { restriccion: { tags: ['ocio'], dias: 7, motivo: 'Estás castigad{yo:o|a} sin salir' } },
          { diario: 'Te han pillado mintiendo sobre las faltas: una semana de castigo.', tipo: 'aviso' },
          { fin: true },
        ],
        resultado: '«¿Me tomas por tont{tutor:o|a}? He hablado con tu tutor». Una semana sin salir.',
      },
    },
    {
      id: 'discutir',
      texto: 'Contestar que es tu vida',
      caracter: { disciplina: -2, agresividad: 2 },
      minutos: 10,
      efectos: [
        { relacion: 'tutor', afinidad: -8 },
        { familia: 'tutor', apoyo: -2 },
        { entrena: 'gen.autoridad', cantidad: 1 },
        { estado: 'gen.estres', mas: 8 },
        { restriccion: { tags: ['ocio'], dias: 7, motivo: 'Estás castigad{yo:o|a} sin salir' } },
        { programa: 'familia.faltas.revision', en: { dias: 21 } },
        { recuerda: { faltas_al_prometer: { faltas: 'total' } } },
      ],
      resultado: 'La discusión acaba a gritos. Una semana sin salir.',
    },
    {
      id: 'callar',
      texto: 'Aguantar el chaparrón sin decir nada',
      minutos: 10,
      efectos: [
        { relacion: 'tutor', afinidad: -2 },
        { estado: 'gen.motivacion', mas: -3 },
        { recuerda: { faltas_al_prometer: { faltas: 'total' } } },
        { programa: 'familia.faltas.revision', en: { dias: 21 } },
      ],
      resultado: '{tutor.Nombre} habla un buen rato. Tú miras al suelo.',
    },
  ],
});

const revision = evento({
  id: 'familia.faltas.revision',
  titulo: 'Tres semanas después',
  disparo: { programado: true },
  cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
  aguanta: { dias: 5 },
  variantes: [
    {
      id: 'cumplio',
      si: [{ faltas: 'total', comoMuchoSobreRecuerdo: { faltas_al_prometer: 1 } }],
      texto: '{tutor.Nombre} deja el móvil. «He hablado con tu tutor: no has vuelto a faltar. Así sí».',
      efectos: [
        { relacion: 'tutor', afinidad: 4, confianza: 5 },
        { familia: 'tutor', apoyo: 2 },
        { estado: 'gen.motivacion', mas: 4 },
        { si: [{ marca: 'prometio_no_faltar' }], entonces: [{ caracter: { disciplina: 1 } }] },
        { fin: true },
      ],
    },
    {
      id: 'no_cumplio',
      si: [],
      texto: '«Has vuelto a faltar». {tutor.Nombre} no levanta la voz, y casi es peor.',
      efectos: [
        { relacion: 'tutor', afinidad: -5, confianza: -8 },
        { familia: 'tutor', apoyo: -3, expectativas: -2 },
        { restriccion: { tags: ['ocio'], dias: 14, motivo: 'Estás castigad{yo:o|a} sin salir' } },
        { si: [{ marca: 'prometio_no_faltar' }], entonces: [{ marca: 'rompio_una_promesa_en_casa' }] },
        { fin: true },
      ],
    },
  ],
});

const descubierto = evento({
  id: 'familia.faltas.descubierto',
  titulo: 'La mentira sale a la luz',
  disparo: { programado: true },
  cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
  aguanta: { dias: 10 },
  texto: '{tutor.Nombre} ha estado en la reunión de padres. «No era un error del colegio. Me mentiste a la cara».',
  efectos: [
    { relacion: 'tutor', afinidad: -10, confianza: -20 },
    { familia: 'tutor', apoyo: -5 },
    { restriccion: { tags: ['ocio'], dias: 14, motivo: 'Estás castigad{yo:o|a} sin salir' } },
    { marca: 'lo_pillaron_mintiendo_en_casa' },
    { fin: true },
  ],
});

export default hilo({
  id: 'familia.faltas',
  nombre: 'Las faltas llegan a casa',
  requiere: ['estudios'],
  reparto: { tutor: { tipo: 'progenitor', prefiere: 'mas_expectativas' } },
  eventos: [charla, revision, descubierto],
  escenarios: [ /* el de §3.4 y uno por cada rama */ ],
});
```

**A años vista.** `mintio_a_sus_padres` y `lo_pillaron_mintiendo_en_casa` no caducan. El evento de «pedir permiso para el campamento de verano» (E9.10), escrito en otro archivo, puede llevar una variante `si: [{ marca: 'lo_pillaron_mintiendo_en_casa' }]` en la que cuesta más que digan que sí. Ninguno de los dos archivos conoce al otro: se hablan por la marca, y `eventos:mapa` lo dibuja.

### 4.2 Un perk latente se revela: «Pulmones grandes»

El perk cuenta desde que naces (`perks.ts`); lo que falta es **enterarse**. Su descripción dice «se nota tras semanas de entrenamiento de fondo»: se cuenta el trabajo de fondo y, cuando hay bastante, alguna semana alguien se da cuenta.

```ts
import { hilo, evento, contador } from '@ds/contracts';

export const sesionesDeFondo = contador({
  id: 'gen.sesiones_de_fondo',
  cuenta: { accion: { tags: ['cardio'], minutosMin: 30 } },   // cada acción de 30 min o más con la etiqueta `cardio`
});

const revelacion = evento({
  id: 'gen.pulmones.revelacion',
  titulo: 'No te cansas como los demás',
  disparo: { cada: 'semana', prob: 0.25 },
  cuando: [
    { perk: 'pulmones_grandes', revelado: false },
    { contador: 'gen.sesiones_de_fondo', min: 20 },
  ],
  repite: 'nunca',
  reparto: { entrenador: { rol: 'entrenador', delDeportePrincipal: true, opcional: true } },
  variantes: [
    {
      id: 'con_entrenador',
      si: [{ papel: 'entrenador' }],
      texto:
        'Al acabar la sesión, {entrenador.nombre} te para. «Llevo semanas fijándome: los demás llegan ahogados y tú ' +
        'ni resoplas. Eso no se entrena, eso se trae de casa».',
      efectos: [
        { revelaPerk: 'pulmones_grandes' },
        { relacion: 'entrenador', afinidad: 3 },
        { estado: 'gen.motivacion', mas: 6 },
        { diario: 'Has descubierto algo de ti: Pulmones grandes.', tipo: 'logro' },
        { programa: 'gen.pulmones.propuesta', en: { dias: [14, 42] } },
      ],
    },
    {
      id: 'sin_entrenador',
      si: [],
      texto: 'Hoy te has dado cuenta: cuando los demás ya no pueden, a ti todavía te queda aire. Siempre ha sido así.',
      efectos: [
        { revelaPerk: 'pulmones_grandes' },
        { estado: 'gen.motivacion', mas: 4 },
        { diario: 'Has descubierto algo de ti: Pulmones grandes.', tipo: 'logro' },
        { fin: true },
      ],
    },
  ],
});

const propuesta = evento({
  id: 'gen.pulmones.propuesta',
  titulo: 'Una propuesta de tu entrenador',
  disparo: { programado: true },
  cuando: [{ presente: 'entrenador' }],
  aguanta: { dias: 14 },
  texto: '{entrenador.Nombre} lo ha estado pensando. «Con ese fuelle, quiero que hagas más fondo que el resto. Va a doler».',
  urgencia: 'ahora',
  plazo: { dias: 2, porDefecto: 'pensarlo' },
  opciones: [
    {
      id: 'aceptar',
      texto: 'Aceptar el trabajo extra',
      caracter: { sacrificio: 2, ambicion: 1 },
      efectos: [
        { modificador: { tags: ['cardio'], eficiencia: 1.15, coste: 1.1, dias: 56, motivo: 'Plan de fondo de tu entrenador' } },
        { relacion: 'entrenador', afinidad: 4 },
        { fin: true },
      ],
      resultado: '«Eso quería oír». Las próximas ocho semanas, el fondo te cunde más… y te cansa más.',
    },
    {
      id: 'pensarlo',
      texto: 'Decir que prefieres seguir como hasta ahora',
      caracter: { sacrificio: -1 },
      efectos: [{ relacion: 'entrenador', afinidad: -1 }, { fin: true }],
      resultado: '{entrenador.Nombre} se encoge de hombros. «Tú verás».',
    },
  ],
});

export default hilo({
  id: 'gen.pulmones',
  nombre: 'Pulmones grandes',
  eventos: [revelacion, propuesta],
  contadores: [sesionesDeFondo],
});
```

**Los 18 perks latentes sin escribir 18 hilos a mano.** La mayoría de las revelaciones tienen la misma forma (una condición propia, un texto, `revelaPerk`). Como los archivos son TypeScript, una función de ayuda en contracts genera el evento a partir de una fila:

```ts
export default revelaciones([
  { perk: 'asmatico', disparo: { al: 'accion.realizada' }, cuando: [{ señal: 'tags', incluye: 'entrenamiento' }, { stat: 'gen.energia', max: 25 }],
    texto: 'A mitad del ejercicio te falta el aire de una forma que no es normal. El médico lo confirma: asma.' },
  { perk: 'gigante', disparo: { cada: 'semana', prob: 0.1 }, cuando: [{ edad: { min: 10, max: 16 } }, { alturaParaSuEdad: { min: 1.2 } }],
    texto: 'Otra vez te quedan cortos los pantalones. El pediatra mira la curva: «Vas a ser muy alt{yo:o|a}».' },
  // … una fila por perk
]);
```

Lo que genera es el mismo dato que si se escribiera a mano, y pasa las mismas comprobaciones.

### 4.3 El cumpleaños de un amigo

Tres días antes del cumpleaños de alguien con quien te llevas bien, te invita. Puedes decir que sí y llevar regalo (cuesta dinero), decir que sí sin más, o que no. Si dices que sí y el día de la fiesta no apareces, queda un **plantón con esa persona**, que meses después otros eventos pueden leer. El hilo se abre **una vez por amigo**.

```ts
import { hilo, evento } from '@ds/contracts';

const invitacion = evento({
  id: 'relaciones.cumple.invitacion',
  titulo: 'Una invitación',
  disparo: { cada: 'dia', prob: 1 },
  cuando: [{ presente: 'cumple' }, { no: { marca: 'planton', de: 'cumple' } }],
  repite: { espera: { dias: 300 }, porReparto: true },
  texto: '{cumple.Nombre} se te acerca. «El {cumple.diaDelCumple} es mi cumple. Hago una fiesta en casa por la tarde. ¿Te vienes?»',
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'no_ir' },
  opciones: [
    {
      id: 'ir_con_regalo',
      texto: 'Decir que sí y comprarle algo (10 €)',
      caracter: { sociabilidad: 2 },
      efectos: [
        { estado: 'gen.dinero', mas: -10 },
        { relacion: 'cumple', afinidad: 2 },
        { marca: 'lleva_regalo', de: 'cumple', dura: { dias: 5 } },
        { programa: 'relaciones.cumple.fiesta', en: { elCumpleDe: 'cumple' } },
      ],
      resultado: '«¡Genial!»',
    },
    {
      id: 'ir',
      texto: 'Decir que sí',
      caracter: { sociabilidad: 1 },
      efectos: [{ relacion: 'cumple', afinidad: 1 }, { programa: 'relaciones.cumple.fiesta', en: { elCumpleDe: 'cumple' } }],
      resultado: '«¡Genial!»',
    },
    {
      id: 'no_ir',
      texto: 'Decir que ese día no puedes',
      caracter: { sociabilidad: -1 },
      efectos: [{ relacion: 'cumple', afinidad: -2 }, { fin: true }],
      resultado: '«Ah… vale». Se le nota la decepción.',
    },
  ],
});

const fiesta = evento({
  id: 'relaciones.cumple.fiesta',
  titulo: 'La fiesta de {cumple.nombre}',
  disparo: { programado: true },
  cuando: [{ hora: { desde: 17 * 60, hasta: 20 * 60 } }],
  aguanta: { dias: 0 },                       // es ese día por la tarde o no es
  siSePierde: 'plantar',
  texto: 'Son más de las cinco: la fiesta de {cumple.nombre} ya ha empezado.',
  urgencia: 'pendiente',                      // queda en la lista hasta las 20:00; no interrumpe lo que estés haciendo
  plazo: { hasta: { hora: 20 * 60 }, porDefecto: 'plantar' },
  opciones: [
    {
      id: 'ir',
      texto: 'Ir a la fiesta (2 horas)',
      minutos: 120,
      caracter: { sociabilidad: 1 },
      efectos: [
        { relacion: 'cumple', afinidad: 6, confianza: 3 },
        { si: [{ marca: 'lleva_regalo', de: 'cumple' }], entonces: [{ relacion: 'cumple', afinidad: 4 }] },
        { estado: 'gen.estres', mas: -8 },
        { estado: 'gen.motivacion', mas: 3 },
        { fin: true },
      ],
      resultado: 'Tarta, música y un rato largo de risas. {cumple.Nombre} no para de darte las gracias por venir.',
    },
    {
      id: 'plantar',
      texto: 'No ir',
      caracter: { sociabilidad: -2, honestidad: -1 },
      efectos: [
        { relacion: 'cumple', afinidad: -10, confianza: -8 },
        { marca: 'planton', de: 'cumple', dura: { dias: 180 } },
        { programa: 'relaciones.cumple.reproche', en: { dias: [2, 6] } },
      ],
      resultado: 'No has ido. No has avisado.',
    },
  ],
});

const reproche = evento({
  id: 'relaciones.cumple.reproche',
  titulo: 'Te lo echa en cara',
  disparo: { programado: true },
  cuando: [{ presente: 'cumple' }],
  aguanta: { dias: 14 },
  texto: '{cumple.Nombre} te ve y se le cambia la cara. «Te estuve esperando. Dijiste que venías».',
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'nada' },
  opciones: [
    {
      id: 'disculparse',
      texto: 'Pedirle perdón de verdad',
      caracter: { honestidad: 2 },
      tirada: { con: 'gen.empatia', dificultad: 35 },
      exito: { efectos: [{ relacion: 'cumple', afinidad: 5 }, { quitaMarca: 'planton', de: 'cumple' }, { fin: true }], resultado: 'Tarda, pero acaba sonriendo. «Que no se repita».' },
      fallo: { efectos: [{ relacion: 'cumple', afinidad: 1 }, { fin: true }], resultado: '«Ya». No suena convencid{cumple:o|a}.' },
    },
    {
      id: 'excusa',
      texto: 'Inventarte una excusa',
      requiere: [{ stat: 'gen.picardia', min: 10 }],
      caracter: { honestidad: -2 },
      efectos: [{ entrena: 'gen.picardia', cantidad: 1 }, { relacion: 'cumple', afinidad: 2 }, { fin: true }],
      resultado: 'Te cree a medias.',
    },
    { id: 'nada', texto: 'Encogerte de hombros', efectos: [{ relacion: 'cumple', afinidad: -4 }, { fin: true }], resultado: 'Se da la vuelta y se va.' },
  ],
});

export default hilo({
  id: 'relaciones.cumple',
  nombre: 'El cumpleaños de un amigo',
  instancias: 'una_por_reparto',
  reparto: { cumple: { relacion: { afinidad: { min: 20 } }, cumpleEn: { dias: 3 }, edad: { max: 18 } } },
  eventos: [invitacion, fiesta, reproche],
});
```

El `planton` que queda durante seis meses es lo que hace que ese amigo **no vuelva a invitarte** al año siguiente si no lo arreglaste (la condición `no: { marca: 'planton', de: 'cumple' }` de la invitación), y está disponible para cualquier otro evento: por ejemplo, que no quiera ayudarte a estudiar.

---

## 5. Rendimiento, tamaño del estado e interfaz

### 5.1 Rendimiento

Hoy una acción cuesta en torno a 1 ms en las simulaciones (`DECISIONES.md`, «Medir el rendimiento…»). El director no debe notarse. Cómo:

- **Todo se indexa al arrancar** (como el registro del motor): eventos por señal que los dispara, eventos de `cada: 'dia'` y de `cada: 'semana'` en sus listas, condiciones precompiladas a funciones. En partida no se recorre el catálogo.
- **Una señal sin eventos cuesta una consulta a un `Map`.** La gran mayoría de las señales (`accion.realizada` sobre todo) no disparan nada casi nunca. Los contadores declarados sobre `accion.realizada` se indexan por etiqueta.
- **Las comprobaciones periódicas van una vez al día** (`dia.inicio`) y una vez a la semana (`semana.fin`), no en cada acción: umbrales, eventos de `cada`, programados que vencen (la cola está ordenada: se mira solo el primero) y caducidades de marcas y temporales.
- **Las condiciones baratas van primero**: marcas, contadores, stats y calendario antes que reparto, presencia y relaciones. La herramienta ordena las condiciones de cada evento al compilar; el reparto solo se busca si todo lo demás ya se cumple.
- **Los hechos se leen una vez por pasada**: en la pasada diaria, edad, sitio, nota media o faltas se piden al servicio una sola vez y se reutilizan para todos los eventos.
- **Los modificadores temporales** se publican como un único modificador de `'*'` que mira una lista casi siempre vacía.

**Objetivos, a medir con `npm run rendimiento`** (que ya desglosa ms por acción y peso del estado por módulo) con un catálogo de prueba de 500 eventos:

| Qué | Objetivo |
|---|---|
| Coste añadido por acción (señales sin evento, contadores) | < 0,02 ms (menos del 2 % de una acción) |
| Pasada diaria con 500 eventos en el catálogo | < 1 ms |
| Arranque (validar e indexar 500 eventos) | < 50 ms |
| `npm run sim` completa | No más de un 3 % más lenta con el catálogo real |

Si los eventos de mundo (P6) entran, su coste se mide aparte: una pasada **semanal** sobre las personas que puedan tenerlos, con el mismo criterio que la rutina semanal de los PNJ (`MISMAS_REGLAS.md` §4: calcular por semanas no es recortar).

### 5.2 Tamaño del estado

Lo que crece con los años es la **historia**; lo demás (marcas, contadores, programados, pendientes) son decenas de entradas.

- Una entrada de historia es una lista corta de números y, si hay reparto, ids de persona: `[412, 17, 2, "nino_231"]` son unos 25–30 bytes en JSON. Los ids de evento y de opción se guardan una vez en `indice` y la historia usa su posición.
- Con un ritmo alto, **150 eventos al año**: unos 4,5 KB por año, **45 KB en diez años** y unos 300 KB en una vida de 70. La partida pesa hoy 0,4 MB con ~393 personas y unos 2,4 MB con la ciudad grande (`ALMACENAMIENTO.md`, `MISMAS_REGLAS.md` §8): la historia de diez años es menos del 2 %.
- Las marcas sin caducidad se quedan para siempre (son pocas por diseño: la herramienta avisa si un evento repetible deja una marca permanente distinta cada vez). Las marcas por persona de alguien que sale del mundo se borran con él.
- **Se guarda todo** (`VISION.md`, principio 4): la historia no se recorta. Si algún día pesa, se compacta mejor, como el resto.
- No se guarda ningún texto. Si en una versión futura desaparece un evento del catálogo, sus entradas de historia se enseñan como «un recuerdo de hace tiempo» (en la alfa no hay compatibilidad de guardados, así que hoy no aplica).

### 5.3 Cómo se presentan en la interfaz

La interfaz solo habla con `@ds/game` y lee el servicio `eventos` (`pendientes()`, `recuerdos()`); no conoce ningún evento concreto.

- **La ventana del evento.** Un evento con `urgencia: 'ahora'` sale en una ventana sobre el juego (el «velo» que ya existe para crear la partida y los avisos) **justo después del resultado de la acción** que lo provocó: título, texto, el **retrato de quien participa** (`@ds/retrato` ya dibuja a cualquier persona) y las opciones como botones. Una opción que no cumple sus requisitos sale en gris con el motivo. Al elegir, la ventana enseña el `resultado` y los cambios (como el resultado de cualquier acción) y se cierra.
- **Qué se enseña de las consecuencias antes de elegir** es la pregunta P9. En la alfa, con el interruptor de pruebas, se pueden enseñar las cifras de cada opción, como hoy con la genética.
- **Pendientes.** Los eventos con `urgencia: 'pendiente'` (la fiesta de esta tarde, una oferta con una semana para pensarla) no interrumpen: salen en una lista «Pendiente» con su plazo («hasta las 20:00», «te quedan 5 días»), visible desde la pantalla principal con un contador. Si la ventana de un evento urgente se cierra sin elegir, pasa a esa lista hasta que venza.
- **Eventos sin opciones.** Un aviso con peso (la revelación de un perk) sale en la ventana con un solo botón; uno ligero (un comentario de un compañero) puede salir solo como una línea destacada en el resultado de la acción y en el Diario (`presentacion: 'ventana' | 'linea'`).
- **Diario.** Cada evento resuelto deja su línea (`ctx.log`, tipo `aviso` o `logro`), como ahora.
- **Recuerdos.** Una pantalla nueva (o una sección del Diario) con la historia: por año, qué pasó, con quién y qué elegiste, compuesta desde la memoria. En la ficha de una persona, «lo que habéis vivido» (los eventos en los que salió): es la base de los «recuerdos compartidos» pendientes de E20.
- **Avance rápido** (E11.2, cuando exista): se para cuando aparece un evento con opciones.
- **Móvil.** La ventana ocupa la pantalla y los botones van uno debajo de otro; ningún texto de opción debería pasar de dos líneas (la herramienta avisa si un texto es muy largo).

---

## 6. Preguntas para el usuario

Cada una con opciones y una recomendación. **Respondidas por el usuario el 16/11/2026.** Lo decidido manda sobre el texto de cada pregunta y sobre el resto del documento:

| | Decisión del usuario (16/11/2026) |
|---|---|
| **P1** | TypeScript de datos |
| **P2** | **Un módulo `eventos` propio para los eventos del juego base, subdividido en carpetas por área** (familia, perks, relaciones, cuerpo…): los «eventos base». **Los de cada deporte, dentro de su paquete**, con el mismo formato (`deporte: '<id>'`): los «eventos deportivos», que llegan al instalar el deporte y se van al quitarlo. Las dos clases se distinguen en los datos, en el validador, en el mapa y en la interfaz. **Un solo director** decide las dos en los mismos momentos. **Cupo por categoría**, todos editables: base 1 al día y 4 a la semana, deporte 1 al día y 2 a la semana, detalles ligeros 2 al día y 8 a la semana (valores de partida, a revisar por el usuario; no compiten entre sí) |
| **P3** | Nunca bloquea: plazo y opción por defecto |
| **P4** | Elegir gasta el tiempo que diga cada opción |
| **P5** | El cupo es **un dato editable** (no una constante enterrada), con 1 al día y 4 a la semana de partida. Además, una categoría de **sucesos menores** (detalles ligeros que hacen distinto un día de otro) con **su propio cupo editable**, que no compite con los importantes |
| **P6** | Formato y motor **preparados desde el principio** para los PNJ, pero **solo activos los sucesos de tipo lesión**; el resto, desactivado hasta medir lo que cuesta. Hay que poder **medir el coste** de activar sucesos para PNJ (`npm run rendimiento` o una herramienta propia). Enterarse por el Diario de lo que le pasa a alguien cercano: preparado, sujeto a la misma medición |
| **P7** | Sí: el carácter se mueve poco a poco y abre opciones |
| **P8** | Sí: castigos que bloquean acciones por etiqueta |
| **P9** | **Configurable** para revisarlo jugando: pistas en palabras o números (más adelante podría depender de la inteligencia, E3.4). Además, las **opciones que no encajan con el carácter** del personaje se podrán presentar **sombreadas** (se ven, no se pueden elegir y se dice por qué) u **ocultas**: un modo de presentación configurable, para decidir viéndolo |
| **P10** | Faltas, perks latentes, cumpleaños, y edad y altura |
| **P11** | Fuera del plan, pero el diseño debe permitir añadir decisiones dentro de una competición **sin coste**: el formato de una decisión (opciones, requisitos, tiradas, presentación) es una pieza suelta que un deporte puede usar |
| **P12** | `Suceso`, de momento. En el código: `SucesoDef`, módulo `sucesos`, `npm run sucesos:*`, aportes `sucesos.catalogo`. Este documento sigue diciendo «evento» y sus ejemplos `eventos:*` se leen como `sucesos:*` |
| **P13** | Tirada con azar estable, calibrada con la simulación |

Lo que sigue son las preguntas tal como se plantearon.

### P1. En qué formato se escriben los eventos

| Opción | A favor | En contra |
|---|---|---|
| **A. Archivos TypeScript de datos** (lo descrito en §3) | El editor autocompleta y marca errores al escribir; comentarios; funciones de ayuda para series (una revelación por perk); cero piezas nuevas | Hay que abrir un editor de código; un error de sintaxis rompe la compilación |
| B. Archivos JSON o YAML | Los puede escribir alguien sin tocar código; se pueden importar como los paquetes de país | Sin autocompletado ni comentarios (JSON); los errores salen al validar, no al escribir; las series se copian a mano |
| C. Un editor visual dentro de la web | Lo más parecido a «una herramienta»; se prueba al momento | Es un proyecto en sí (varias semanas) y hay que mantenerlo cada vez que crece el formato |

**Recomendación: A ahora**, con el validador y el probador de §3. Como lo que se carga es JSON puro, B (eventos importables por el jugador) y C se pueden añadir después sin rehacer nada. Si quien va a escribir la mayoría de los eventos es Claude con el usuario revisando, A es además lo más rápido.

### P2. Dónde vive el contenido

- **A. Cada módulo aporta los suyos** (`familia` los de casa, `estudios` los del colegio, `relaciones` los de amigos, cada deporte los suyos dentro de su paquete). Un hilo que cruza dos mundos va en el módulo de quien lo protagoniza, con `requiere`.
- B. Un solo módulo de contenido («historias») con todos, salvo los de los deportes instalables.

**Recomendación: A.** Es como ya funcionan los deportes, un deporte instalado trae sus propios eventos, y quitar un módulo quita sus eventos sin dejar restos. B es más cómodo para buscar, pero eso lo resuelven `eventos:mapa` y un listado.

### P3. ¿Un evento urgente bloquea el juego hasta que se decide?

- **A. No bloquea nunca.** La ventana sale, pero se puede cerrar; el evento queda en «Pendiente» y, si vence el plazo, se aplica la opción por defecto.
- B. Los urgentes bloquean: no se puede hacer nada más hasta elegir.
- C. Se marca por evento (`bloquea: true` en los que lo pidan, p. ej. una conversación cara a cara).

**Recomendación: A para empezar.** Es lo que pide «el juego debe poder jugarse sin eventos», no necesita tocar el motor y los bots siguen funcionando. Si al jugar resulta raro que se pueda dejar a la madre con la palabra en la boca, C se añade sin romper nada (un plazo de «ahora mismo» equivale a bloquear).

### P4. ¿Elegir una opción gasta tiempo de juego?

- **A. Sí: cada opción dura lo que diga** (1 minuto por defecto; una charla, 10; ir a una fiesta, 120).
- B. No: las decisiones son instantáneas y solo los efectos cuentan.

**Recomendación: A.** El tiempo es el recurso del juego («el tiempo que no llega para todo», `VISION.md`), y así una decisión es una acción más del mismo camino.

### P5. Cuántos eventos «espontáneos» como máximo

Los que salen por probabilidad (no los que son consecuencia de algo).

- A. Sin límite: lo que den las probabilidades.
- **B. Un cupo: como mucho 1 al día y 4 a la semana**, a ajustar con la simulación.
- C. Un cupo que el jugador elige en «Opciones» (pocos, normal, muchos).

**Recomendación: B**, y C más adelante si hay quejas en un sentido u otro. Sin cupo, cada evento nuevo que se añade hace el juego más ruidoso y obliga a rebajar las probabilidades de todos.

### P6. ¿Los PNJ también viven eventos?

- A. Solo el personaje. Los PNJ aparecen como participantes.
- **B. El formato lo permite desde el primer día y se construye por fases**: primero el personaje; después, «eventos de mundo» para los PNJ, empezando por los que solo dependen de lo que un PNJ ya tiene (edad, perks, estado, club, carácter), con sus decisiones tomadas por su carácter y calculados una vez por semana.
- C. Todo para todos desde el principio.

**Recomendación: B.** A choca con el principio 2 de `VISION.md` en cuanto un evento dé ventajas de verdad (revelar un perk, una oferta de un club): un PNJ en la misma situación debe poder tenerlo. C no se puede: muchos eventos dependen de relaciones, dinero o estrés que los PNJ no tienen todavía. Con B queda una regla clara para escribir contenido: cada evento declara si es `para: 'personaje'` (depende de lo que solo él tiene) o `para: 'cualquiera'`.

**Sub-pregunta:** cuando un evento de mundo le pasa a alguien cercano (tu hermano descubre un perk, un amigo ficha por otro club), ¿te enteras? Recomendación: sí, como una línea del Diario si tienes relación con esa persona.

### P7. ¿Las decisiones cambian el carácter del personaje?

Hoy los 8 ejes (disciplina, honestidad, ambición, sacrificio, sociabilidad, agresividad, prudencia, optimismo) se heredan y no se mueven (E4.3).

- **A. Sí, poco a poco**: cada opción empuja 1–3 puntos (sobre una escala de −50 a +50) los ejes hacia los que tira.
- B. Sí, y además el carácter **cierra opciones** (alguien muy honesto no tiene la opción de mentir).
- C. No: el carácter es de nacimiento; las decisiones solo dejan marcas.

**Recomendación: A**, y de B solo la mitad amable: el carácter puede **abrir** opciones o hacerlas más fáciles (una tirada con ventaja), pero no quitarle al jugador la posibilidad de elegir en contra de su personaje. Que «ningún extremo sea trampa» (E4.5) se vigila con bots de cada perfil.

### P8. Castigos que impiden hacer cosas

Para «castigado sin salir» hace falta que un módulo pueda **bloquear acciones por etiqueta** (§2.9: un campo nuevo en los modificadores del motor).

- **A. Añadirlo**: un castigo bloquea de verdad las acciones con la etiqueta `ocio` (o la que diga el evento), con el motivo a la vista.
- B. No tocar el motor: los castigos solo hacen que esas acciones rindan muy poco o cuesten más.

**Recomendación: A.** Es genérico (no mete contenido en el motor), pequeño, y también servirá para las lesiones («de baja: no puedes entrenar») y las obligaciones del profesional (E10.4). Detalle a decidir: qué etiquetas existen para castigar; hoy `ocio` no distingue «salir con amigos» de «leer en casa».

### P9. Qué se ve de las consecuencias antes de elegir

- A. Todo, con números («Confianza −10, estrés +8»).
- **B. Pistas en palabras** («Le va a sentar mal», «Arriesgado: depende de tu picardía»), y los números solo con el interruptor de pruebas de la alfa.
- C. Nada: solo el texto de la opción.

**Recomendación: B.** Es el principio 7 de `VISION.md` («el jugador siente los datos, no los gestiona») y lo que hace CK3 a su manera. Las pistas se generan solas a partir de los efectos (no hay que escribirlas), con la posibilidad de poner una a mano.

### P10. Por dónde empezar el contenido

El motor se prueba con contenido de verdad. Candidatos para el primer lote (unos 10–15 eventos):

- **A. Lo que ya está esperando**: los padres y las faltas, la revelación de los 18 perks latentes, los cumpleaños, los comentarios sobre la edad y la altura (E18.7).
- B. La vida social: saludos, encuentros en el camino, rivalidades, discusiones con consecuencias.
- C. Las puertas del deporte: ojeadores, ofertas de clubes, selecciones (E18.5, E10).

**Recomendación: A.** Cierra cuatro pendientes apuntados, usa todas las piezas del sistema (señales, umbrales, contadores, reparto, hilos, marcas) y no depende de nada que no exista. C necesita antes decisiones de E10 (está aparcada a propósito) y B crece mejor cuando haya eventos de mundo.

### P11. Las decisiones dentro de una competición (E18.4)

Las «lecturas tácticas en la carrera» son elecciones **durante** una acción (en mitad de una carrera o un partido), no entre acciones.

- **A. Fuera de este plan**: las diseña cada deporte cuando toque, reutilizando el formato de opciones y tiradas si encaja.
- B. Dentro: el director también presenta decisiones en mitad de una competición.

**Recomendación: A.** B obliga a partir una acción en trozos, que es un cambio del motor de otro tamaño, y el motor de partidos (`MOTOR_PARTIDOS.md`) tiene sus propias reglas.

### P12. Cómo se llaman en el código

«Evento» ya es el aviso entre módulos (`GameEvent`, `SHARED_EVENTS`, `on`).

- **A. En el código, lo nuevo se llama `Suceso`** (`SucesoDef`, `modules/sucesos`, `npm run sucesos:validar`); en la interfaz y al hablar se sigue diciendo «evento».
- B. Lo nuevo se llama `Evento` y lo viejo se renombra a `Señal` (toca muchos archivos).
- C. Lo nuevo se llama `Evento` y se convive con la ambigüedad (`EventoDef` frente a `GameEvent`).

**Recomendación: A.** No toca nada de lo que hay y evita confusiones al leer el código. Este documento ha usado «evento» y los ejemplos `eventos:*`; con A cambiarían a `sucesos:*`.

### P13. La fórmula de las tiradas

Una opción con tirada necesita una regla de «qué probabilidad de éxito da tener 30 de picardía contra dificultad 45». Propuesta inicial: 50 % cuando la stat (medida «para su edad», como ya hace `norm`) iguala la dificultad, entre un 5 % y un 95 %, y cada 10 puntos de diferencia mueven unos 15 puntos de probabilidad. ¿Vale como punto de partida para calibrar con la simulación, o el usuario prefiere otra idea (por ejemplo, que nunca sea azar puro y el resultado dependa solo de umbrales)?

**Recomendación:** tirada con azar estable, calibrada con la simulación; los umbrales fijos ya existen como `requiere`.

---

## 7. Plan de construcción por pasos

Cada paso acaba con `npm run check` en verde, su entrada en `DECISIONES.md` y, si cambia cifras de relaciones, `ANEXO_RELACIONES.md`. Los pasos 1 a 4 no cambian ninguna partida (`npm run huella` igual antes y después): hasta que no hay contenido, el juego es el de hoy.

| Paso | Qué | Cómo se sabe que está |
|---|---|---|
| **0** | Respuestas del usuario a §6. Este documento se corrige con lo decidido | — |
| **1. El formato** | `packages/contracts/src/eventos.ts`: tipos, `evento()`, `hilo()`, `contador()`, validación pura del catálogo y composición de textos con género. Sin motor | Tests de contracts: la validación caza cada error de la tabla de §3.3 que no necesita partida; los textos concuerdan |
| **2. El motor mínimo** | Ampliaciones de §2.9 en `packages/core` (con sus tests). Módulo del director con `npm run nuevo-modulo`: memoria, disparos por señal y programados, condiciones sobre stats, calendario y memoria, opciones como acciones, plazo y opción por defecto, efectos propios (estado, entrena, marca, recuerdo, programa, diario, fin) | Test que carga el director solo con `gen`; un hilo de prueba de tres eventos recorre todas sus ramas; el estado se guarda y se carga a mitad de hilo; `huella` igual |
| **3. Hablar con los demás** | Señales nuevas en `SHARED_EVENTS` y sus manejadores en `relaciones`, `familia` y `gen` (carácter, perk revelado; el servicio `perks` dice cuáles lo están). Hechos de los servicios existentes y servicio `hechos.<módulo>`. Reparto (con `npcs`, `relaciones`, `presencia`). Modificadores y restricciones temporales | `tests/arquitectura.test.ts` en verde; tests de integración: un evento baja una relación, revela un perk, castiga; todo funciona también sin cada módulo opcional |
| **4. La herramienta** | `eventos:nuevo`, `eventos:validar` (también como test), pruebas y escenarios como datos, `eventos:probar`, `eventos:mapa`. Disparos `cada` y `umbral`, contadores, cupo de ritmo, tiradas (con Suertudo y Gafe) | Un evento nuevo se añade creando un solo archivo; un evento roto a propósito de cada tipo falla con un mensaje claro |
| **5. La interfaz** | Ventana del evento con retratos, lista «Pendiente», pistas de las opciones, forzar eventos y ver la memoria en la interfaz de pruebas | `npm run probar-web` ampliado: sale un evento, se elige, queda en el Diario |
| **6. Bots y medidas** | Los bots deciden según el carácter de su estrategia. Chequeo de frecuencia en `sim/src/analysis.ts`, `sim:eventos`. `npm run rendimiento` con un catálogo de 500 eventos de prueba | Objetivos de §5.1 cumplidos y anotados; `npm run sim` antes y después sin chequeos nuevos en ⚠️ o ❌ (o explicados) |
| **7. Primer contenido** | El lote que se decida en P10, cada hilo con sus escenarios. Aquí sí cambia la partida: `npm run sim` antes y después | Los pendientes correspondientes de `BACKLOG_STATS.md` y `DECISIONES.md`, cerrados; `ARQUITECTURA.md`, `BACKLOG_STATS.md` (E18) y `CLAUDE.md` (comandos nuevos) al día; un anexo `ANEXO_EVENTOS.md` con el formato para quien escriba eventos |
| **8. Recuerdos** | Pantalla de recuerdos y «lo que habéis vivido» en la ficha de cada persona | — |
| **9. Eventos de mundo** (si P6 = B) | Pasada semanal para los PNJ con los eventos `para: 'cualquiera'`; test de mismas reglas: un PNJ y el personaje en la misma situación reciben el mismo evento | Medido su coste; `tests/mismas-reglas*.test.ts` ampliado |

Los pasos 1 a 4 son el sistema; 5 y 6 se pueden hacer en paralelo; el 7 es el primero que el usuario nota al jugar. Si hay que parar a mitad, cada paso deja el repositorio funcionando.

---

## 7 bis. Estado de la construcción (16/11/2026)

| Paso | Estado | Dónde |
|---|---|---|
| 1. El formato | ✅ | `packages/contracts/src/sucesos/` (tipos, textos, condiciones, tiradas, carácter, configuración, catálogo y validación) |
| 2. El motor mínimo | ✅ | `packages/core` (escuchar `'*'`, `ModifierResult.bloquea`) y `modules/sucesos` (el director) |
| 3. Hablar con los demás | ✅ | Señales `relacion.cambio`, `familia.cambio`, `perfil.caracter`, `perk.revelado` recogidas por `relaciones`, `familia` y `gen`; servicio `hechos.<módulo>`; reparto; modificadores y restricciones temporales |
| 4. La herramienta | ✅ | `npm run eventos:nuevo`, `eventos:validar` (también `tests/eventos.test.ts`), `eventos:probar`, `eventos:mapa`, `eventos:indice` |
| 5. La interfaz | ✅ | `apps/web/src/main.ts`: ventana del evento (retratos de quien participa, texto, opciones con su pista o el motivo por el que no se pueden elegir, plazo y «Decidir luego»), **ventana de los eventos sin opciones** (los importantes; los detalles ligeros salen como una línea; `presentacion` lo cambia en cada suceso), lista «Pendiente» en la pestaña principal y, en la interfaz de pruebas (pestaña Diario), una lista para **forzar** cualquier evento. Probado a mano en Chromium. Falta: cambiar la presentación desde «Opciones» y añadirlo a `npm run probar-web` |
| 6. Bots y medidas | ✅ en parte | Los bots deciden cada evento como alguien con el carácter de su personaje (`decidirSucesos`, la misma regla que usará un PNJ). Chequeo «Ritmo de los eventos» en `npm run sim` y tabla por evento con `npm run sim:eventos`. **Medido (150 días, 1 semilla por bot): 0,0–0,1 eventos por semana**; salen las faltas (bots vago y aleatorio, con su revisión) y los cumpleaños; los comentarios de altura y las revelaciones no salieron en esas partidas. El primer lote es escaso para «que un día no sea igual que otro»: hace falta más contenido ligero. `npm run sim:rapida` con y sin el lote: mismos chequeos. Medido con 500 sucesos: abajo |
| 7. Primer contenido | ✅ (por calibrar) | `modules/eventos` (38 eventos base): faltas, 18 perks latentes, cumpleaños, altura, lesión, **primer día de Educación física**, **llegar tarde a clase** y **ocho detalles del aula y del patio**. `modules/futbol/src/eventos` (3 eventos deportivos): **primer entrenamiento** (dónde va a jugar; puede pedir otro puesto) y **llegar tarde** al entrenamiento y a la convocatoria. Cifras de partida: tabla abajo |
| 8. Recuerdos | ✅ | Sección «Recuerdos» en la pestaña Diario (por curso: qué pasó, con quién y qué elegiste) y «Lo que habéis vivido» en la ficha de cada persona. Se componen desde la historia guardada (suceso, variante, opción y personas) |
| 9. Sucesos de los PNJ | ✅ solo la clase `lesion` | Un suceso `para: 'cualquiera'` con `clase` puede pasarle a un PNJ: lector de hechos del PNJ, decide él por su carácter, sus marcas son suyas y sus efectos pasan por `estadoDeJugador` (que `npcs` aplica con la señal `persona.estado`). `npcs` avisa de cada lesión nueva (`persona.lesion`) y `eventos.salud.lesion` le da consecuencias (moral, y recuperarse bien o forzar). La pasada semanal de los PNJ para sucesos espontáneos existe y está sin uso (ninguna otra clase activada). Medidas abajo |

### Medidas (`npm run eventos:rendimiento`, 16/11/2026, contenedor de desarrollo)

Las cifras bailan entre pasadas (hasta ±50 % en las más pequeñas): valen como orden de magnitud.

**Catálogo grande: 500 sucesos generados** (30 % diarios, 20 % semanales, 30 % al hacer una acción, 10 % al competir, 10 % por umbral; 10 contadores), frente a los objetivos de §5.1:

| Qué | Medido | Objetivo | |
|---|---|---|---|
| Arranque (compilar e indexar) | 3–45 ms | < 50 ms | ✅ |
| Coste añadido por acción | **0,07–0,12 ms** | < 0,02 ms | ❌ No se cumple: es un 5–8 % de una acción (~1,4 ms). Antes de indexar por el dato de la señal eran 0,84 ms |
| Coste añadido por día de juego (24 acciones y la pasada diaria) | 1,5 ms | pasada diaria < 1 ms | ✅ Casi todo es el coste por acción; la pasada diaria apenas se nota |
| Memoria del director tras 28 días | 0,9 KB | — | |

Lo que cuesta por acción son los sucesos que se disparan «al hacer una acción»: con 150 en el catálogo, en cada acción se miran los ~25 que piden una etiqueta que la acción tiene. Si el contenido real llega a tener muchos de ese tipo, la mejora siguiente es mirar primero sus marcas y contadores sin crear nada (hoy cada intento prepara su contexto).

**Sucesos de los PNJ**: tiempo de la acción que cierra la semana (la rutina semanal de todo el mundo, donde va la pasada de los PNJ), con todo desactivado, con lo decidido y con una clase más de sucesos espontáneos generados (probabilidad semanal del 1 % cada uno, con condiciones de edad y carácter, una decisión y efectos sobre el estado).

| | 1.417 personas (ciudad del juego) | 307 personas (ciudad de prueba con fútbol) |
|---|---|---|
| Todo desactivado | 10,7 ms | 13,6 ms |
| **Solo lesiones (lo decidido)** | 14,1 ms (+3,4) | 13,6 ms (+0,0) |
| Todas las clases, 20 sucesos de vida | 21,2 ms (+10,5) | 16,0 ms (+2,4) |
| Todas las clases, 100 sucesos de vida | 22,9 ms (+12,2) | 20,3 ms (+6,7) |

- **Solo lesiones no cuesta nada medible**: no hay pasada (las lesiones llegan por señal, una o dos por semana) y la diferencia está dentro del ruido.
- **Activar una clase con sucesos espontáneos** añade unos 10–12 ms **por semana de juego** con 1.417 personas y 2–7 ms con 307. Una semana de juego son más de 150 acciones (unos 250 ms), así que es menos de un 5 %. Crece con las personas y con los sucesos que salen (cada uno que sale deja marcas y cambia el estado de alguien), no tanto con cuántos hay en el catálogo.
- Lo que crecería es la **memoria**: con 100 sucesos de vida quedan unas 500 marcas de personas vivas a la vez (unos 20 KB). Sin medir: la ciudad grande de verdad (tarda 40 s en crearse) y el diario de cercanos.
- **Para el usuario:** con estas cifras, activar más clases para los PNJ es barato en tiempo. Lo que falta para activarlas no es rendimiento sino contenido que valga para cualquiera (hoy casi todo depende de relaciones, dinero o estrés, que los PNJ no tienen).

### Cifras provisionales del segundo lote (17/11/2026), para que el usuario las revise

Todas son de partida, propuestas por el desarrollador. «Afinidad» y «confianza» son puntos del vínculo con esa persona (−100 a 100 y 0 a 100).

**Primer día de Educación física** (`eventos.estudios.primer_dia_de_educacion_fisica`). Sale una vez, al ir por primera vez a su clase. El texto es el consejo que ya daba el profesor en la sala de profesores (misma lógica: `consejoDeportivo`).

| Opción | Efecto |
|---|---|
| Decir que te gustaría probar | Afinidad con el profesor +3, motivación +5 |
| Preguntarle en qué se ha fijado (5 min) | Afinidad +4, confianza +2, motivación +3, entrena comunicación (0,5) |
| Encogerte de hombros | Nada |
| Si no le ve claro en nada: decir que seguirás moviéndote | Afinidad +2, motivación +2 |

**Primer entrenamiento de fútbol** (`futbol.primer_entrenamiento`). Sale una vez, tras la primera sesión con el club, si tiene puesto en el equipo. El puesto es el que ya tenía; «donde más vale» lo calcula el fútbol con lo que vale en cada puesto.

| Opción | Efecto |
|---|---|
| Aceptar | Afinidad con el entrenador +3 (+2 y motivación +3 si ya juega donde más vale) |
| Pedir jugar donde más vale (5 min) | Tirada con comunicación, dificultad 55. Si sale: **cambia de puesto** (la señal `club.cambio_de_puesto` de siempre) y motivación +4. Si no: afinidad −2 |
| Preguntar qué tiene que mejorar (5 min) | Afinidad +2 (+3 si ya juega donde más vale), confianza +1, entrena conocimiento de fútbol (1) |

Pendiente de decidir: que la dificultad de pedir el cambio dependa de la relación con el entrenador y de cuánto más vale en el otro puesto (hoy es fija).

**Llegar tarde.** La mecánica de antes no cambia: en clase y en el entrenamiento se aprovecha solo la parte a la que se asiste; en la convocatoria, además, −3 de afinidad y −1 de confianza con el entrenador. Los eventos añaden esto:

| Dónde | Cuándo sale | Disculparse | Excusa (tirada con picardía) | No decir nada | Otra |
|---|---|---|---|---|---|
| Clase (`eventos.estudios.tarde_a_clase`) | 5 minutos tarde o más; como mucho cada 10 días | Afinidad con el profesor −1 | Dificultad 40. Cuela: nada. No cuela: afinidad −3, estrés +3 | Afinidad −2 | Una broma (carisma 15 o más; tirada con carisma, dificultad 45): estrés −2 o afinidad −3 |
| Entrenamiento (`futbol.tarde_al_entrenamiento`) | Más de 10 minutos tarde (señal nueva `club.sesion_tarde`); como mucho cada 6 días | Afinidad con el entrenador −1 | Dificultad 40. Cuela: nada. No cuela: afinidad −3, confianza −1 | Afinidad −2 | |
| Convocatoria (`futbol.tarde_a_la_convocatoria`) | Siempre que ya contaba como impuntual (más de 10 minutos) | Afinidad +1 (recupera parte del −3) | Dificultad 50. Cuela: afinidad +1. No cuela: afinidad −2, confianza −1 más | Nada más | |

El atletismo no tiene todavía su evento de llegar tarde al entrenamiento (la señal sí se emite para cualquier deporte).

**Detalles del aula y del patio** (categoría `menor`: cupo de 2 al día y 8 a la semana). Los del aula se tiran al entrar en cada clase; los del patio, al llegar al patio entre las 10:30 y las 11:15.

| Evento | Probabilidad | No se repite en | Lo que puede dejar |
|---|---|---|---|
| Te preguntan a ti | 6 % por clase | 20 días | Afinidad con el profesor +2 o −1, motivación +3, estrés +1 a +2 |
| Un compañero te pide ayuda | 6 % por clase | 20 días | Afinidad con él +3, +2 o −1; entrena empatía y comunicación |
| Una nota que pasa de mesa en mesa | 6 % por clase | 30 días | Afinidad +1 o −2; estrés −1 o +3; entrena picardía |
| Llueve a mares (una línea) | 2 % por clase | 25 días | Estrés −1 |
| Un balón que viene hacia ti | 12 % al llegar al patio | 15 días | Motivación +3, +1 o −1; entrena coordinación |
| Un juego nuevo | 12 % al llegar al patio | 20 días | Afinidad +3; estrés −3; 15 minutos; entrena cooperación o autoridad |
| Un pique | 12 % al llegar al patio | 25 días | Motivación +4 o −2; energía −3; afinidad +1 o +2 |
| Un rato al sol (una línea) | 4 % al llegar al patio | 20 días | Estrés −2 |

Con cuatro clases al día, tres eventos al 6 % y uno al 2 % dan en torno a uno cada día y medio de clase antes del cupo y de las esperas; con las esperas quedan bastante menos. **Medido con los bots** (`npm run sim:eventos -- 120 1`, 17/11): **entre 1,2 y 2,3 eventos por semana** según la estrategia (antes del segundo lote, 0,0–0,1). Por año: los detalles del aula, de 8 a 14 veces cada uno; los del patio, de 1 a 7 (los bots que no pisan el patio, ninguno); el primer día de Educación física, una vez. Llegar tarde a clase salía 67 veces al año a los bots que llegan tarde casi siempre (con la espera de 4 días), y por eso la espera se ha subido a 10 días.

**Diferencias con la propuesta** (manda `ANEXO_EVENTOS.md`): los sucesos de un hilo van en `sucesos:` (no `eventos:`); los hechos con nombre se leen con `{ hecho: 'faltas' }` y «lo que ha cambiado desde entonces» con `sobreRecuerdo`; un suceso que se dispara con una señal y usa sus datos en un texto lleva `ejemploDeSeñal`; un hilo solo programa sucesos suyos; la historia guarda también la variante; `altura_para_su_edad` va en centímetros sobre lo típico de la edad.

## 7 ter. Notas de relevo (17/11/2026, sesión de arquitectura)

Fable se quedó sin uso antes de escribirlas; las deja la sesión de arquitectura con lo que hay en el código y en este plan. **Lo que queda, en sesiones separadas** (tocan archivos distintos):

1. ~~**Coste por acción del director**~~ **Hecho el 17/11: ~0,009 ms por acción con 500 sucesos** (`docs/relevo/sucesos-rendimiento.md`). Antes: con 500 sucesos daba 0,07–0,12 ms por acción frente al objetivo de 0,02 (§7 bis, Medidas). Ya está indexado por el dato de la señal (bajó de 0,84). Medir siempre con `npm run eventos:rendimiento` antes y después (las cifras bailan: repetir varias pasadas). No tocar el resultado: `npm run huella` sin catálogo debe dar lo mismo, y los tests de eventos y la simulación, iguales.
2. ~~**Presentación desde «Opciones»**~~ **Hecho el 17/11** (`docs/relevo/sucesos-opciones.md`). Antes: hoy el modo de las pistas (palabras o números) y el de las opciones fuera de carácter (`normales`, `sombreadas`, `ocultas`) se cambian por dato (`sucesos.config`). Falta poder elegirlos en la pantalla de Opciones de la web. Los tres modos ya funcionan y tienen tests.
3. **Contenido** (lote 1 hecho el 17/11: atletismo y 15 detalles, `docs/relevo/sucesos-contenido-1.md`; seguir con más lotes): llegar tarde al entrenamiento del **atletismo** (la señal `club.sesion_tarde` ya se emite para cualquier deporte; solo falta el suceso en su paquete) y lotes de **detalles ligeros** (categoría `menor`) con `npm run eventos:nuevo`, siguiendo el estilo de los ocho del aula y del patio. Cada lote: `npm run eventos:validar`, `eventos:mapa` y `sim:eventos` para ver la frecuencia.
4. ~~**Comprobación final**~~ **Hecha el 17/11** (`docs/relevo/comprobacion-final.md`): ningún chequeo cambia; ritmo, 2,0 por semana. Antes: cuando lo anterior esté unido, `npm run sim` completa antes y después (explicar cualquier chequeo que cambie) y añadir los eventos a `npm run probar-web`.
5. **Decidido el 17/11** (ver `DECISIONES.md`): pedir el cambio de puesto en el primer entrenamiento depende también de la relación con el entrenador y de cuánto más se vale en el otro puesto. Nombres legibles en modo números y aviso «no va contigo» en modo normal (desactivable en Opciones), también decididos. Encargados a sesiones de Sonnet.

**Puntos delicados:** el azar es propio de cada suceso (`rngEstable`): no usar el generador de la partida, o cambia el mundo de cada semilla. Las señales nuevas las recoge siempre el módulo dueño (regla 4 del repositorio). Activar más clases de sucesos para los PNJ cuesta +10–12 ms por semana con la ciudad actual: no hacerlo sin decisión del usuario. Las cifras del primer y segundo lote son provisionales (§7 bis).
