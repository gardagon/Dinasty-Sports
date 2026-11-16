# Plan de eventos y decisiones (E18)

Propuesta de diseño del 16/11/2026, **sin aprobar**. No hay código todavía: lo que sigue es lo que se propone construir y las decisiones que le tocan al usuario (§8). Nada de §8 está decidido.

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
| **Revelación de los perks latentes** | E5.3; `DECISIONES.md` 24/10 («Perks») y «Pendiente e ideas»; `ARQUITECTURA.md` («Perks») | Efecto «revelar perk»; condiciones sobre perks y sobre lo que se ha entrenado. Hilo de ejemplo §5.2 |
| **Suertudo y Gafe** (segunda oportunidad, algo sale mal) | E5.6 | Las tiradas de las opciones consultan estos perks (§2.6) |
| **Autoridad y picardía no tienen de dónde subir** | E18.3; `DECISIONES.md` 17/10 («Sin fuente de subida todavía») | Opciones que las entrenan (`ctx.train`) y que las piden como requisito |
| **Aviso de los padres por las faltas** (la señal `clase.faltas_excesivas` ya existe; falta quien la recoja) | `DECISIONES.md` 28/10 y «Pendiente e ideas»; `events.ts` | Disparo por señal; reparto con un progenitor. Hilo de ejemplo §5.1 |
| **Apoyo, expectativas y tiempo en casa de los padres** («no hacen nada aún; los moverán los eventos») | E13.1; `DECISIONES.md` 23/10 («Familia y genética») | Efecto «familia»; condiciones sobre esos valores |
| **Colegio, familia y rivalidades como fuente de eventos**; **la rivalidad nace de eventos** | E18.6; E20 (decisión 3 del diseño de relaciones) | Marcas por persona; efecto «relación» |
| **Pareja, hijos, rupturas, declararse** | E20.6, E20.7; `DECISIONES.md` 23/10 («Nueva épica E20») | Hilos largos ligados a una persona |
| **Efectos de las relaciones: un contacto que abre una puerta**; **consecuencias de discutir** y **recuerdos compartidos** | E20.9; «Pendiente e ideas» (E20) | La memoria de los hilos (§2.7) es la base de los recuerdos |
| **Que los demás reaccionen a tu edad y tu altura** | E18.7; `DECISIONES.md` 28/10 | Condiciones sobre edad y altura relativas; reparto con quien esté presente |
| **Cumpleaños** como acontecimientos (felicitar, regalos) y **regalos con coste** | `DECISIONES.md` 27/10 («Datos de las personas») y 28/10 («Pendientes ya anotados») | Reparto por fecha; coste en dinero. Hilo de ejemplo §5.3 |
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
apps/web                            La ventana del evento, la lista de pendientes y los recuerdos (§6).
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
- **`caracter`**: cada opción puede declarar hacia qué ejes tira (`{ disciplina: 2, sinceridad: -1 }`). Ese único dato sirve para tres cosas:
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
  historia:    [dia: number, evento: number, opcion: number, ...reparto: string[]][];   // compacta, §6.2
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
