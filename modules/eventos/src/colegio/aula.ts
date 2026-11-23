import { suceso } from '@ds/contracts';

/**
 * Detalles del aula: cosas pequeñas que pasan en una clase y hacen distinto un día de otro. Son `menor` (su cupo es aparte) y espontáneos: al entrar
 * en clase, a veces. Sirven de muestra del estilo: una situación concreta, dos o tres salidas razonables y consecuencias pequeñas. Cifras de partida.
 */
const EN_CLASE = { al: 'clase.asistida', prob: 0.08 } as const;
const EJEMPLO = { asignatura: 'estudios.lengua', tarde: 0 };
const PROFESOR = { profesor: { asignaturaDeLaSeñal: 'asignatura' } } as const;
const COMPAÑERO = { quien: { rol: 'companero', conocido: true } } as const;

export default [
  suceso({
    id: 'eventos.colegio.pregunta_del_profesor',
    titulo: 'Te preguntan a ti',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios'],
    disparo: EN_CLASE,
    ejemploDeSeñal: EJEMPLO,
    repite: { espera: { dias: 14 } },
    reparto: PROFESOR,
    texto: '{profesor.Nombre} recorre la clase con la mirada y se para en ti. «A ver, tú. ¿Cómo seguiría esto?»',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'callar' },
    opciones: [
      {
        id: 'responder',
        texto: 'Intentar responder',
        caracter: { optimismo: 1 },
        tirada: { con: 'gen.inteligencia', dificultad: 45 },
        exito: { efectos: [{ relacion: 'profesor', afinidad: 2 }, { estado: 'gen.motivacion', mas: 3 }, { entrena: 'gen.concentracion', cantidad: 0.3 }], resultado: '«Eso es». Sigue con la clase, pero te ha mirado distinto.' },
        fallo: { efectos: [{ estado: 'gen.estres', mas: 2 }], resultado: '«No exactamente. ¿Alguien le ayuda?» Bueno: lo has intentado.' },
      },
      { id: 'reconocer', texto: 'Decir que no lo sabes', caracter: { honestidad: 1 }, efectos: [{ estado: 'gen.estres', mas: 1 }], resultado: '«Pues atiende, que esto cae». Y pasa a otro.' },
      { id: 'callar', texto: 'Mirar al cuaderno y esperar a que pase', caracter: { sociabilidad: -1 }, efectos: [{ relacion: 'profesor', afinidad: -1 }, { estado: 'gen.estres', mas: 2 }], resultado: 'El silencio se alarga hasta que le pregunta a otra persona.' },
    ],
  }),
  suceso({
    id: 'eventos.colegio.companero_pide_ayuda',
    titulo: 'Te piden ayuda',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios', 'relaciones'],
    disparo: EN_CLASE,
    ejemploDeSeñal: EJEMPLO,
    repite: { espera: { dias: 14 } },
    reparto: COMPAÑERO,
    texto: 'En mitad del ejercicio, {quien.nombre} se inclina hacia tu mesa. «Oye, ¿tú has entendido esto? Explícamelo, porfa».',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'luego' },
    opciones: [
      { id: 'ayudar', texto: 'Explicárselo en voz baja', caracter: { sociabilidad: 1 }, efectos: [{ relacion: 'quien', afinidad: 3, confianza: 1 }, { entrena: 'gen.empatia', cantidad: 0.4 }, { entrena: 'gen.comunicacion', cantidad: 0.3 }], resultado: 'Explicándolo te das cuenta de que tú también lo entiendes mejor. «Gracias, de verdad».' },
      { id: 'luego', texto: 'Decirle que luego, que ahora no puedes', caracter: { disciplina: 1 }, efectos: [{ relacion: 'quien', afinidad: -1 }], resultado: '«Vale, vale». Vuelve a su hoja.' },
      { id: 'copiar', texto: 'Pasarle tu hoja para que lo copie', caracter: { honestidad: -1, sociabilidad: 1 }, efectos: [{ relacion: 'quien', afinidad: 2 }, { entrena: 'gen.picardia', cantidad: 0.3 }], resultado: 'Lo copia en medio minuto y te devuelve la hoja por debajo de la mesa.' },
    ],
  }),
  suceso({
    id: 'eventos.colegio.nota_por_la_clase',
    titulo: 'Una nota que pasa de mesa en mesa',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios', 'relaciones'],
    disparo: EN_CLASE,
    ejemploDeSeñal: EJEMPLO,
    repite: { espera: { dias: 20 } },
    reparto: COMPAÑERO,
    texto: 'Te llega un papel doblado desde la mesa de {quien.nombre}. Por fuera pone «pásalo». El profesor está de espaldas.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'pasarla' },
    opciones: [
      { id: 'pasarla', texto: 'Pasarla sin mirar', efectos: [{ relacion: 'quien', afinidad: 1 }], resultado: 'El papel sigue su camino.' },
      {
        id: 'leerla',
        texto: 'Leerla antes de pasarla',
        caracter: { prudencia: -1 },
        tirada: { con: 'gen.picardia', dificultad: 35 },
        exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.3 }, { estado: 'gen.estres', mas: -1 }], resultado: 'Es un dibujo del profesor bastante logrado. Aguantas la risa y lo pasas.' },
        fallo: { efectos: [{ estado: 'gen.estres', mas: 3 }], resultado: 'Justo entonces el profesor se gira. «¿Algo que quieras compartir con todos?» La nota acaba en su mesa.' },
      },
      { id: 'guardarla', texto: 'Guardártela: no quieres líos', caracter: { disciplina: 1, sociabilidad: -1 }, efectos: [{ relacion: 'quien', afinidad: -2 }], resultado: '{quien.Nombre} te mira sin entender. La nota se queda en tu estuche.' },
    ],
  }),
  suceso({
    id: 'eventos.colegio.dia_de_lluvia',
    titulo: 'Llueve a mares',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios'],
    disparo: { al: 'clase.asistida', prob: 0.02 },
    ejemploDeSeñal: EJEMPLO,
    repite: { espera: { dias: 25 } },
    presentacion: 'linea',
    texto: 'Llueve tanto que no se oye al profesor. Media clase mira por la ventana, y tú también.',
    efectos: [{ estado: 'gen.estres', mas: -1 }],
  }),
];
