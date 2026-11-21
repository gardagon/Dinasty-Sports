import { suceso } from '@ds/contracts';

/**
 * Llegar tarde con el equipo. La mecánica ya existe y no se toca: quien se incorpora tarde a una sesión entrena solo la parte que queda, y quien llega
 * tarde a la convocatoria pierde relación con su entrenador (`club.impuntual`: −3 de afinidad y −1 de confianza). Estos sucesos cuentan lo que pasa
 * y dejan decir algo: disculparse recupera una parte, una excusa puede colar o empeorarlo. Cifras de partida, por calibrar.
 */
export default [
  suceso({
    id: 'futbol.tarde_al_entrenamiento',
    titulo: 'Llegas tarde al entrenamiento',
    deporte: 'futbol',
    disparo: { al: 'club.sesion_tarde' },
    ejemploDeSeñal: { sport: 'futbol', minutos: 25 },
    cuando: [{ señal: 'sport', es: 'futbol' }],
    repite: { espera: { dias: 6 } },
    reparto: { entrenador: { rol: 'entrenador', delDeportePrincipal: true } },
    texto: 'El grupo ya está calentando cuando apareces, {señal.minutos} minutos tarde. {entrenador.Nombre} mira el reloj y luego a ti.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'nada' },
    opciones: [
      { id: 'disculparse', texto: 'Pedir perdón y ponerte a calentar', caracter: { disciplina: 1, honestidad: 1 }, efectos: [{ relacion: 'entrenador', afinidad: -1 }], resultado: '«Que no se repita». Y a correr.' },
      {
        id: 'excusa',
        texto: 'Decir que te han entretenido en el colegio',
        caracter: { honestidad: -2 },
        tirada: { con: 'gen.picardia', dificultad: 40 },
        exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.5 }], resultado: '{entrenador.Nombre} asiente sin mucho interés. «Venga, al grupo».' },
        fallo: { efectos: [{ relacion: 'entrenador', afinidad: -3, confianza: -1 }], resultado: '«Ya. Dos vueltas más al campo, por la excusa».' },
      },
      { id: 'nada', texto: 'Unirte al grupo sin decir nada', efectos: [{ relacion: 'entrenador', afinidad: -2 }], resultado: 'Nadie dice nada. {entrenador.Nombre} lo apunta en su libreta.' },
    ],
  }),
  suceso({
    id: 'futbol.tarde_a_la_convocatoria',
    titulo: 'Llegas tarde a la convocatoria',
    deporte: 'futbol',
    disparo: { al: 'club.impuntual' },
    ejemploDeSeñal: { sport: 'futbol', minutos: 20 },
    cuando: [{ señal: 'sport', es: 'futbol' }],
    repite: 'siempre',
    reparto: { entrenador: { rol: 'entrenador', delDeportePrincipal: true } },
    texto: 'Tus compañeros ya están cambiándose cuando llegas, {señal.minutos} minutos después de la hora. {entrenador.Nombre} no te saluda.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'nada' },
    opciones: [
      { id: 'disculparse', texto: 'Ir a pedirle perdón antes de cambiarte', caracter: { honestidad: 1, disciplina: 1 }, efectos: [{ relacion: 'entrenador', afinidad: 1 }], resultado: '«Hoy se juega. Ya hablaremos». Pero te ha escuchado.' },
      {
        id: 'excusa',
        texto: 'Echarle la culpa al autobús',
        caracter: { honestidad: -2 },
        tirada: { con: 'gen.picardia', dificultad: 50 },
        exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.5 }, { relacion: 'entrenador', afinidad: 1 }], resultado: '«Pues sal antes de casa». Pero lo deja pasar.' },
        fallo: { efectos: [{ relacion: 'entrenador', afinidad: -2, confianza: -1 }], resultado: '«El autobús lo cogen todos tus compañeros». Peor.' },
      },
      { id: 'nada', texto: 'Cambiarte en silencio', efectos: [], resultado: 'Te cambias deprisa, sin mirar a nadie.' },
    ],
  }),
];
