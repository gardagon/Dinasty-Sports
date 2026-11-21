import { suceso } from '@ds/contracts';

/**
 * Detalles del camino al colegio: la calle de por la mañana, antes de la primera clase (a las 8:00). Son `menor` y espontáneos (al llegar a la calle
 * del colegio, entre las 7:15 y las 8:10). Cifras de partida, por calibrar.
 */
const EJEMPLO = { desde: 'avenida_parque', hasta: 'calle_colegio', minutos: 4 };
const CAMINO = [{ señal: 'hasta', es: 'calle_colegio' }, { hora: { desde: 7 * 60 + 15, hasta: 8 * 60 + 10 } }, { periodo: 'clase' }] as const;

export default [
  suceso({
    id: 'eventos.camino.companero_de_camino',
    titulo: 'Vais juntos al colegio',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.04 },
    ejemploDeSeñal: EJEMPLO,
    cuando: CAMINO,
    repite: { espera: { dias: 45 } },
    reparto: { quien: { conocido: true, presente: true, edad: { max: 18 } } },
    texto: '{quien.Nombre} te alcanza por la calle, con la mochila a medio cerrar. «¡Ey! ¿Vamos juntos hasta la puerta?»',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'ir_juntos' },
    opciones: [
      { id: 'ir_juntos', texto: 'Ir charlando hasta el colegio', caracter: { sociabilidad: 1 }, minutos: 4, efectos: [{ relacion: 'quien', afinidad: 2 }, { estado: 'gen.estres', mas: -1 }], resultado: 'El camino se pasa sin darte cuenta, entre comentarios de la tele y quejas del examen.' },
      { id: 'carrera', texto: 'Proponer una carrera hasta la puerta', caracter: { ambicion: 1, optimismo: 1 }, tirada: { con: 'gen.velocidad', dificultad: 40 }, exito: { efectos: [{ relacion: 'quien', afinidad: 2 }, { estado: 'gen.motivacion', mas: 3 }, { entrena: 'gen.velocidad', cantidad: 0.2 }], resultado: 'Llegas primero a la puerta, sin aliento y riendo. {quien.Nombre} se tira al suelo como si hubiera corrido una maratón.' }, fallo: { efectos: [{ relacion: 'quien', afinidad: 2 }, { estado: 'gen.energia', mas: -2 }], resultado: 'Llegas segund{yo:o|a}, pero entre risas. Empezáis el día con buen pie.' } },
      { id: 'solo', texto: 'Decirle que prefieres ir a tu aire', caracter: { sociabilidad: -1 }, efectos: [{ relacion: 'quien', afinidad: -1 }, { estado: 'gen.estres', mas: -1 }], resultado: 'Se encoge de hombros. Vas el resto del camino con tus pensamientos.' },
    ],
    pruebas: [
      { nombre: 'Por la mañana, camino del colegio, sale', dado: { hora: 7 * 60 + 40, periodo: 'clase' }, señal: EJEMPLO, espero: { opcionDisponible: 'ir_juntos' } },
      { nombre: 'Por la tarde no sale', dado: { hora: 17 * 60, periodo: 'clase' }, señal: EJEMPLO, espero: { sale: false } },
    ],
  }),
  suceso({
    id: 'eventos.camino.se_hace_tarde',
    titulo: 'Se hace tarde',
    categoria: 'menor',
    requiere: ['lugares'],
    disparo: { al: 'lugares.llegada', prob: 0.03 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [{ señal: 'hasta', es: 'calle_colegio' }, { hora: { desde: 7 * 60 + 45, hasta: 8 * 60 + 5 } }, { periodo: 'clase' }],
    repite: { espera: { dias: 60 } },
    texto: 'Un coche se ha parado y te ha hecho esperar en el paso de peatones. Miras el reloj: queda un minuto para la primera clase y el colegio sigue ahí, al fondo de la calle.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'andar' },
    opciones: [
      {
        id: 'correr',
        texto: 'Echar a correr',
        caracter: { disciplina: 1 },
        tirada: { con: 'gen.velocidad', dificultad: 40 },
        exito: { efectos: [{ estado: 'gen.energia', mas: -2 }, { entrena: 'gen.velocidad', cantidad: 0.3 }, { estado: 'gen.estres', mas: -1 }], resultado: 'Entras con el timbre y la lengua fuera. Has llegado, que no es poco.' },
        fallo: { efectos: [{ estado: 'gen.energia', mas: -3 }, { estado: 'gen.estres', mas: 2 }], resultado: 'Te pilla el semáforo del final y llegas con el aula ya empezada, sin aire y sin excusas.' },
      },
      { id: 'andar', texto: 'Seguir andando como siempre', caracter: { prudencia: 1 }, efectos: [], resultado: 'Entras justo, sin prisas. Con un poco de suerte, nadie se da cuenta.' },
      { id: 'atajo', texto: 'Tirar por el atajo entre los edificios', caracter: { prudencia: -1 }, minutos: 2, efectos: [{ estado: 'gen.estres', mas: 1 }], resultado: 'Te cuelas por un callejón con el corazón en un puño y llegas en el último minuto.' },
    ],
    pruebas: [
      { nombre: 'Con la clase a punto de empezar, sale', dado: { hora: 7 * 60 + 52, periodo: 'clase' }, señal: EJEMPLO, espero: { opcionDisponible: 'correr' } },
      { nombre: 'Con tiempo de sobra no sale', dado: { hora: 7 * 60 + 20, periodo: 'clase' }, señal: EJEMPLO, espero: { sale: false } },
    ],
  }),
];
