import { suceso } from '@ds/contracts';

/**
 * Detalles del patio: lo que pasa a veces al llegar al recreo. Son `menor` y espontáneos (al llegar al patio, de 10:30 a 11:15). Muestra del estilo
 * para escribir más: algo concreto que se ve en un patio, salidas razonables y consecuencias pequeñas. Cifras de partida, por calibrar.
 */
const AL_PATIO = { al: 'lugares.llegada', prob: 0.12 } as const;
const EJEMPLO = { desde: 'aula', hasta: 'patio', minutos: 2 };
const EN_EL_RECREO = [{ señal: 'hasta', es: 'patio' }, { hora: { desde: 10 * 60 + 30, hasta: 11 * 60 + 15 } }] as const;
const ALGUIEN = { quien: { conocido: true, presente: true, edad: { max: 18 } } } as const;

export default [
  suceso({
    id: 'eventos.colegio.balon_perdido',
    titulo: 'Un balón que viene hacia ti',
    categoria: 'menor',
    requiere: ['lugares'],
    disparo: AL_PATIO,
    ejemploDeSeñal: EJEMPLO,
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 15 } },
    texto: 'Un balón se escapa del partido de los mayores y viene botando hacia ti. «¡Eh! ¡Pásala!»',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'dejarlo' },
    opciones: [
      {
        id: 'devolver',
        texto: 'Devolverlo de un buen golpe',
        caracter: { optimismo: 1 },
        tirada: { con: 'gen.coordinacion', dificultad: 40 },
        exito: { efectos: [{ estado: 'gen.motivacion', mas: 3 }, { entrena: 'gen.coordinacion', cantidad: 0.3 }], resultado: 'Le das de lleno y cae justo donde querías. «¡Buena!», grita alguien.' },
        fallo: { efectos: [{ estado: 'gen.motivacion', mas: -1 }], resultado: 'Le das con la espinilla y sale hacia la fuente. Alguien se ríe. Vas tú a por él.' },
      },
      { id: 'con_la_mano', texto: 'Cogerlo y llevárselo', caracter: { prudencia: 1 }, efectos: [{ estado: 'gen.motivacion', mas: 1 }], resultado: '«Gracias, enan{yo:o|a}». Pero lo dicen sonriendo.' },
      { id: 'dejarlo', texto: 'Dejarlo pasar', caracter: { sociabilidad: -1 }, efectos: [], resultado: 'El balón pasa de largo. Uno de los mayores viene a buscarlo resoplando.' },
    ],
  }),
  suceso({
    id: 'eventos.colegio.juego_nuevo',
    titulo: 'Un juego nuevo en el patio',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: AL_PATIO,
    ejemploDeSeñal: EJEMPLO,
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 20 } },
    reparto: ALGUIEN,
    texto: 'Hay un corro junto a la pared. {quien.Nombre} explica las reglas de un juego que ha traído del verano. «¿Te apuntas? Falta un{yo:o|a}».',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'mirar' },
    opciones: [
      { id: 'jugar', texto: 'Apuntarte', caracter: { sociabilidad: 2 }, minutos: 15, efectos: [{ relacion: 'quien', afinidad: 3 }, { estado: 'gen.estres', mas: -3 }, { estado: 'gen.energia', mas: -2 }, { entrena: 'gen.cooperacion', cantidad: 0.3 }], resultado: 'Tardas dos rondas en enterarte de las reglas y una más en ganar una. El recreo se pasa volando.' },
      { id: 'mirar', texto: 'Quedarte mirando un rato', efectos: [{ estado: 'gen.estres', mas: -1 }], resultado: 'Desde fuera se entiende mejor. A lo mejor mañana.' },
      { id: 'proponer', texto: 'Proponer un cambio en las reglas', requiere: [{ stat: 'gen.carisma', min: 14 }], caracter: { ambicion: 1 }, minutos: 15, tirada: { con: 'gen.carisma', dificultad: 45 }, exito: { efectos: [{ relacion: 'quien', afinidad: 2 }, { entrena: 'gen.autoridad', cantidad: 0.5 }, { estado: 'gen.motivacion', mas: 2 }], resultado: 'Lo prueban y funciona mejor. Para el final del recreo ya es «la regla de {yo.nombre}».' }, fallo: { efectos: [{ relacion: 'quien', afinidad: -1 }], resultado: '«Si acabas de llegar…». Juegas con las reglas de siempre.' } },
    ],
  }),
  suceso({
    id: 'eventos.colegio.pique_en_el_patio',
    titulo: 'Un pique',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: AL_PATIO,
    ejemploDeSeñal: EJEMPLO,
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 25 } },
    reparto: ALGUIEN,
    texto: '{quien.Nombre} te planta la mano en el hombro. «A que no me ganas una carrera hasta la valla». Ya hay tres mirando.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'pasar' },
    opciones: [
      {
        id: 'correr',
        texto: 'Aceptar la carrera',
        caracter: { agresividad: 1, ambicion: 1 },
        tirada: { con: 'gen.velocidad', dificultad: 45 },
        exito: { efectos: [{ estado: 'gen.motivacion', mas: 4 }, { estado: 'gen.energia', mas: -3 }, { relacion: 'quien', afinidad: 1 }], resultado: 'Tocas la valla un paso antes. {quien.Nombre} resopla: «Mañana la revancha».' },
        fallo: { efectos: [{ estado: 'gen.motivacion', mas: -2 }, { estado: 'gen.energia', mas: -3 }, { relacion: 'quien', afinidad: 1 }], resultado: 'Llegas un paso después. «Otro día», te dice, sin recochineo.' },
      },
      { id: 'pasar', texto: 'Decir que hoy no te apetece', caracter: { prudencia: 1 }, efectos: [], resultado: '«Gallina». Pero ya está buscando a otr{quien:o|a} con quien picarse.' },
      { id: 'devolverla', texto: 'Proponer otra cosa: a ver quién aguanta más colgad{yo:o|a} de la barra', requiere: [{ stat: 'gen.fuerza', min: 14 }], caracter: { ambicion: 1 }, tirada: { con: 'gen.fuerza', dificultad: 45 }, exito: { efectos: [{ estado: 'gen.motivacion', mas: 4 }, { relacion: 'quien', afinidad: 2 }], resultado: 'Aguantas hasta que se suelta, con los brazos temblando. Te has ganado un respeto.' }, fallo: { efectos: [{ estado: 'gen.motivacion', mas: -1 }], resultado: 'Te sueltas primero. Al menos elegiste tú el terreno.' } },
    ],
  }),
  suceso({
    id: 'eventos.colegio.sol_en_el_patio',
    titulo: 'Un rato al sol',
    categoria: 'menor',
    requiere: ['lugares'],
    disparo: { al: 'lugares.llegada', prob: 0.04 },
    ejemploDeSeñal: EJEMPLO,
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 20 } },
    presentacion: 'linea',
    texto: 'Hoy da el sol en el banco del fondo y nadie lo ha cogido. Cinco minutos sin hacer nada saben a gloria.',
    efectos: [{ estado: 'gen.estres', mas: -2 }],
  }),
];
