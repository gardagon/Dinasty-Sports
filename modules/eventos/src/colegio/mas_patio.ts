import { suceso } from '@ds/contracts';

/**
 * Más detalles del patio (segundo lote, mismo estilo que `patio.ts`). Son `menor` y espontáneos (al llegar al patio, de 10:30 a 11:15).
 * Cifras de partida, por calibrar.
 */
const AL_PATIO = { al: 'lugares.llegada', prob: 0.04 } as const;
const EJEMPLO = { desde: 'aula', hasta: 'patio', minutos: 2 };
const EN_EL_RECREO = [{ señal: 'hasta', es: 'patio' }, { hora: { desde: 10 * 60 + 30, hasta: 11 * 60 + 15 } }] as const;
const ALGUIEN = { quien: { conocido: true, presente: true, edad: { max: 18 } } } as const;

export default [
  suceso({
    id: 'eventos.colegio.cambio_de_cromos',
    titulo: 'Cambio de cromos',
    categoria: 'menor',
    familia: 'patio',
    requiere: ['lugares', 'relaciones'],
    disparo: AL_PATIO,
    ejemploDeSeñal: EJEMPLO,
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 60 } },
    reparto: ALGUIEN,
    texto: '{quien.Nombre} saca un montón de cromos del bolsillo. «Tengo uno repetido que te falta. ¿Cambiamos?»',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'cambiar' },
    opciones: [
      { id: 'cambiar', texto: 'Hacer el cambio sin más', caracter: { sociabilidad: 1 }, efectos: [{ relacion: 'quien', afinidad: 2 }, { estado: 'gen.motivacion', mas: 1 }], resultado: 'Os dais la mano como dos tratantes. Tu álbum tiene un hueco menos.' },
      {
        id: 'regatear',
        texto: 'Intentar sacarle dos por uno',
        caracter: { honestidad: -1, ambicion: 1 },
        tirada: { con: 'gen.picardia', dificultad: 45 },
        exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.4 }, { estado: 'gen.motivacion', mas: 2 }], resultado: '«Está bien, pero solo por esta vez». Te llevas dos y una sonrisa.' },
        fallo: { efectos: [{ relacion: 'quien', afinidad: -2 }], resultado: '«Mira, olvídalo». Guarda sus cromos y se va con cara de pocos amigos.' },
      },
      { id: 'pasar', texto: 'Decir que ahora no tienes ganas', efectos: [], resultado: '«Tú te lo pierdes». Pero no lo dice enfadad{quien:o|a}.' },
    ],
  }),
  suceso({
    id: 'eventos.colegio.solo_en_el_patio',
    titulo: 'Alguien está solo',
    categoria: 'menor',
    familia: 'patio',
    requiere: ['lugares', 'relaciones'],
    disparo: AL_PATIO,
    ejemploDeSeñal: EJEMPLO,
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 60 } },
    reparto: ALGUIEN,
    texto: '{quien.Nombre} está sentad{quien:o|a} en el escalón del fondo, sin su grupo de siempre y mirando el suelo. Parece que hoy no es su día.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'seguir' },
    opciones: [
      { id: 'sentarte', texto: 'Ir a sentarte a su lado', caracter: { sociabilidad: 1, optimismo: 1 }, minutos: 10, efectos: [{ relacion: 'quien', afinidad: 3, confianza: 2 }, { entrena: 'gen.empatia', cantidad: 0.5 }], resultado: 'No hablas mucho. No hace falta. Cuando suena el timbre, {quien.nombre} te da las gracias con la cabeza.' },
      { id: 'invitar', texto: 'Invitar{quien:lo|la} a vuestro juego', caracter: { sociabilidad: 1 }, minutos: 5, efectos: [{ relacion: 'quien', afinidad: 2 }, { entrena: 'gen.cooperacion', cantidad: 0.3 }], resultado: 'Duda un segundo y se levanta. Al rato ya se ríe con todos.' },
      { id: 'seguir', texto: 'Seguir a lo tuyo', caracter: { sociabilidad: -1 }, efectos: [], resultado: 'Ya se arreglará. Pero te acuerdas de ello al volver a clase.' },
    ],
  }),
  suceso({
    id: 'eventos.colegio.merienda_del_recreo',
    titulo: 'La merienda del recreo',
    categoria: 'menor',
    familia: 'patio',
    requiere: ['lugares', 'relaciones'],
    disparo: AL_PATIO,
    ejemploDeSeñal: EJEMPLO,
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 60 } },
    reparto: ALGUIEN,
    texto: '{quien.Nombre} abre su fiambrera y el olor llega hasta ti: algo casero que te hace rugir el estómago. «¿Quieres un trozo?»',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'aceptar' },
    opciones: [
      { id: 'aceptar', texto: 'Aceptar y darle un bocado de lo tuyo', caracter: { sociabilidad: 1 }, efectos: [{ relacion: 'quien', afinidad: 2 }, { estado: 'gen.energia', mas: 2 }, { estado: 'gen.estres', mas: -1 }], resultado: 'Cambiáis un trozo por otro. El tuyo sabe a poco al lado del suyo.' },
      { id: 'rechazar', texto: 'Decir que no, que ya has comido', caracter: { prudencia: 1 }, efectos: [{ relacion: 'quien', afinidad: -1 }], resultado: '«Tú sabrás». Y se lo come todo con muchas ganas.' },
    ],
  }),
];
