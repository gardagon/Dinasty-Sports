import { suceso } from '@ds/contracts';

/**
 * Detalles de casa con la familia: cosas pequeñas de una tarde o una noche. Son `menor`. Los de la tarde salen al llegar a casa, a veces; el de
 * la noche, de un día a otro. Cifras de partida, por calibrar.
 */
const EN_CASA = { al: 'lugares.llegada', prob: 0.04 } as const;
const EJEMPLO = { desde: 'calle_casa', hasta: 'casa', minutos: 1 };
const AL_LLEGAR = [{ señal: 'hasta', es: 'casa' }] as const;
const TUTOR = { tutor: { tipo: 'progenitor', presente: true, prefiere: 'mas_apoyo' } } as const;

export default [
  suceso({
    id: 'eventos.casa.ayudar_con_la_cena',
    titulo: 'Hay que poner la mesa',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: EN_CASA,
    ejemploDeSeñal: EJEMPLO,
    cuando: [...AL_LLEGAR, { hora: { desde: 19 * 60, hasta: 21 * 60 } }],
    repite: { espera: { dias: 15 } },
    reparto: TUTOR,
    texto: 'Al entrar huele a cena. {tutor.Nombre} asoma desde la cocina. «Justo a tiempo: ¿me ayudas a poner la mesa?»',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'luego' },
    opciones: [
      { id: 'ayudar', texto: 'Ayudar sin quejarte', caracter: { disciplina: 1, sociabilidad: 1 }, minutos: 10, efectos: [{ relacion: 'tutor', afinidad: 2 }, { estado: 'gen.estres', mas: -1 }, { entrena: 'gen.cooperacion', cantidad: 0.3 }], resultado: 'Entre los dos está lista en un momento. «Gracias, cielo. Qué haría yo sin ti».' },
      { id: 'refunfuñar', texto: 'Ayudar, pero protestando', caracter: { optimismo: -1 }, minutos: 10, efectos: [{ relacion: 'tutor', afinidad: 1 }], resultado: 'Pones los platos con más ruido del necesario. {tutor.Nombre} sonríe y no dice nada.' },
      { id: 'luego', texto: 'Decir que ahora no, que estás cansad{yo:o|a}', caracter: { disciplina: -1 }, efectos: [{ relacion: 'tutor', afinidad: -1 }, { estado: 'gen.energia', mas: 1 }], resultado: '«Vale, vale». La mesa la pone {tutor:él|ella}, con un suspiro.' },
    ],
  }),
  suceso({
    id: 'eventos.casa.cena_favorita',
    titulo: 'Tu plato favorito',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.03 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [...AL_LLEGAR, { hora: { desde: 19 * 60, hasta: 21 * 60 } }],
    repite: { espera: { dias: 30 } },
    reparto: TUTOR,
    presentacion: 'linea',
    texto: 'Hoy hay tu plato favorito para cenar. {tutor.Nombre} se encoge de hombros, como si fuera casualidad, pero sonríe al ver tu cara.',
    efectos: [{ estado: 'gen.estres', mas: -2 }, { relacion: 'tutor', afinidad: 1 }],
  }),
  suceso({
    id: 'eventos.casa.hermano_quiere_jugar',
    titulo: 'Quiere jugar contigo',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.025 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [...AL_LLEGAR, { hora: { desde: 16 * 60, hasta: 20 * 60 } }],
    repite: { espera: { dias: 40 } },
    reparto: { hermano: { tipo: 'hermano', presente: true } },
    texto: 'Apenas dejas la mochila, {hermano.nombre} aparece con un juego de mesa bajo el brazo. «¿Echamos una? Solo una».',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'luego' },
    opciones: [
      { id: 'jugar', texto: 'Sentarte a jugar', caracter: { sociabilidad: 1 }, minutos: 20, efectos: [{ relacion: 'hermano', afinidad: 3 }, { estado: 'gen.estres', mas: -2 }, { estado: 'gen.energia', mas: -1 }], resultado: 'Es «solo una» durante tres partidas. Pierdes la última por poco, y ni te importa.' },
      { id: 'luego', texto: 'Prometerle que luego jugáis', caracter: { disciplina: 1 }, efectos: [{ relacion: 'hermano', afinidad: -1 }], resultado: '«Luego siempre dices lo mismo». Pero lo guarda en el estante, por si acaso.' },
      { id: 'ganar', texto: 'Aceptar, pero a ganar de verdad', caracter: { ambicion: 1, agresividad: 1 }, minutos: 20, tirada: { con: 'gen.inteligencia', dificultad: 40 }, exito: { efectos: [{ relacion: 'hermano', afinidad: 1 }, { estado: 'gen.motivacion', mas: 3 }], resultado: 'Ganas con claridad. {hermano.Nombre} pide la revancha con la cara muy seria.' }, fallo: { efectos: [{ relacion: 'hermano', afinidad: 2 }, { estado: 'gen.motivacion', mas: -1 }], resultado: 'Te gana {hermano:él|ella}, y no deja de recordártelo en toda la tarde.' } },
    ],
  }),
  suceso({
    id: 'eventos.casa.noche_sin_sueno',
    titulo: 'No te duermes',
    categoria: 'menor',
    disparo: { cada: 'dia', prob: 0.04 },
    cuando: [{ lugar: 'casa' }, { hora: { desde: 21 * 60 + 30, hasta: 24 * 60 - 1 } }, { periodo: 'clase' }],
    aguanta: { dias: 1 },
    repite: { espera: { dias: 20 } },
    texto: 'Llevas un buen rato dando vueltas en la cama. Mañana hay clase, y cuanto más lo piensas, menos sueño tienes.',
    urgencia: 'ahora',
    plazo: { hasta: { hora: 24 * 60 - 1 }, porDefecto: 'dar_vueltas' },
    opciones: [
      { id: 'leer', texto: 'Encender la luz y leer un rato', caracter: { disciplina: -1 }, minutos: 20, efectos: [{ estado: 'gen.estres', mas: -2 }, { estado: 'gen.energia', mas: -2 }], resultado: 'A la tercera página, los ojos empiezan a cerrarse. Apagas con el libro en la mano.' },
      { id: 'agua', texto: 'Levantarte a por un vaso de agua', caracter: { prudencia: 1 }, minutos: 5, efectos: [{ estado: 'gen.estres', mas: -1 }], resultado: 'La casa a oscuras te tranquiliza. Vuelves a la cama y te duermes enseguida.' },
      { id: 'dar_vueltas', texto: 'Seguir dando vueltas hasta que llegue', caracter: { disciplina: 1 }, efectos: [{ estado: 'gen.energia', mas: -3 }, { estado: 'gen.estres', mas: 1 }], resultado: 'Cuando por fin te duermes ya es tarde. Mañana lo pagarás.' },
    ],
    pruebas: [{ nombre: 'En la cama, de noche, se puede levantar a por agua', dado: { lugar: 'casa', hora: 23 * 60, periodo: 'clase' }, espero: { opcionDisponible: 'agua' } }],
  }),
];
