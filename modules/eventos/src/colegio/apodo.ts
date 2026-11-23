import { hilo } from '@ds/contracts';

/**
 * Un mote (lote 2, tanda 4). Alguien te pone un mote en el patio. Por defecto es de broma, de los que se llevan bien o se cortan; con el contenido duro de «burlas» activado, si quien lo pone no te aprecia (afinidad ≤ 10) es un apodo feo, que duele más,
 * y hay una opción que no existe sin él: devolvérselo con otro peor. Sin lo duro el hilo se cuenta entero (el mote suave). Tres pasos: nace, se extiende y se queda o se olvida. Cifras de partida, por calibrar.
 */
const AL_PATIO = [{ señal: 'hasta', es: 'patio' }, { hora: { desde: 10 * 60 + 30, hasta: 11 * 60 + 15 } }] as const;

export default hilo({
  id: 'eventos.colegio.apodo',
  nombre: 'Un mote',
  requiere: ['lugares', 'relaciones'],
  reparto: { quien: { rol: 'companero', conocido: true, presente: true } },
  sucesos: [
    {
      id: 'eventos.colegio.apodo.nace',
      titulo: 'Un mote',
      disparo: { al: 'lugares.llegada', prob: 0.03 },
      ejemploDeSeñal: { desde: 'aula', hasta: 'patio', minutos: 2 },
      cuando: AL_PATIO,
      repite: { espera: { dias: 120 } },
      variantes: [
        {
          id: 'feo',
          si: [{ relacion: 'quien', afinidad: { max: 10 } }],
          duro: ['burlas'],
          textos: [
            '{quien.Nombre} te grita desde el otro lado del patio un mote que no habías oído nunca, y que alude a algo que te da vergüenza. Dos o tres se ríen.',
            'Al pasar, {quien.nombre} suelta un mote que se ceba en algo tuyo. «Eh, ¡{yo.nombre}, el…!». Se oye alguna risa, y no es la tuya.',
          ],
        },
        {
          id: 'suave',
          si: [],
          textos: [
            'Has corrido la última vuelta tan deprisa que {quien.nombre} grita desde la valla: «¡Eso, Rayo!». Algunos se ríen. No sabes si te gusta.',
            '{quien.Nombre} te llama «Profe» delante de todos, porque acabas de acertar una pregunta difícil. Dos o tres lo repiten, con simpatía.',
          ],
        },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'reirte' },
      opciones: [
        { id: 'reirte', texto: 'Reírte y seguir el juego', caracter: { optimismo: 1, sociabilidad: 1 }, efectos: [{ relacion: 'quien', afinidad: 1 }, { marca: 'acepto_el_mote', dura: { dias: 90 } }, { programa: 'eventos.colegio.apodo.se_extiende', en: { dias: [7, 14] } }], resultado: 'Te ríes con los demás, y cuando se ríen contigo y no de ti, el mote pesa mucho menos.' },
        { id: 'cortar', texto: 'Cortarlo en seco', caracter: { agresividad: 1, ambicion: 1 }, tirada: { con: 'gen.autoridad', dificultad: 45 }, exito: { efectos: [{ relacion: 'quien', afinidad: -1 }, { fin: true }], resultado: '«Eso no tiene gracia, y lo sabes». Se hace un silencio. El mote muere ahí mismo.' }, fallo: { efectos: [{ estado: 'gen.estres', mas: 2 }, { programa: 'eventos.colegio.apodo.se_extiende', en: { dias: [7, 14] } }], resultado: 'Quieres sonar firme y suenas enfadad{yo:o|a}. Cuanto más se nota, más gracia les hace.' } },
        { id: 'responder', texto: 'Responderle con otro mote, pero con gracia', caracter: { ambicion: 1, sociabilidad: 1 }, tirada: { con: 'gen.picardia', dificultad: 45 }, exito: { efectos: [{ relacion: 'quien', afinidad: 2 }, { marca: 'acepto_el_mote', dura: { dias: 90 } }, { programa: 'eventos.colegio.apodo.se_extiende', en: { dias: [7, 14] } }], resultado: 'Tu respuesta provoca un coro de «¡ohhh!». Hasta {quien.nombre} se ríe y levanta las manos.' }, fallo: { efectos: [{ relacion: 'quien', afinidad: -2 }, { programa: 'eventos.colegio.apodo.se_extiende', en: { dias: [7, 14] } }], resultado: 'Se te escapa algo que no tenía gracia. {quien.Nombre} cambia la cara y se va.' } },
        { id: 'devolver_feo', texto: 'Devolvérselo con un mote feo de verdad', duro: ['burlas'], caracter: { agresividad: 2, honestidad: -1 }, efectos: [{ relacion: 'quien', afinidad: -8, confianza: -5 }, { estado: 'gen.estres', mas: 3 }, { caracter: { agresividad: 1 } }, { programa: 'eventos.colegio.apodo.se_extiende', en: { dias: [7, 14] } }], resultado: 'Lo sueltas sin pensar, y los dos os dais cuenta enseguida de que habéis cruzado una línea. Se hace el silencio.' },
      ],
    },
    {
      id: 'eventos.colegio.apodo.se_extiende',
      titulo: 'El mote sigue vivo',
      disparo: { programado: true },
      cuando: [{ alguna: [{ lugar: 'patio' }, { lugar: 'colegio' }] }, { periodo: 'clase' }],
      aguanta: { dias: 6 },
      variantes: [
        { id: 'carino', si: [{ marca: 'acepto_el_mote' }], texto: 'Pasa un grupo por delante y alguien te saluda con el mote. «¡Eh, qué tal!». Es un saludo que no tenías hace unos días, y no te desagrada.' },
        { id: 'molesta', si: [], texto: 'Otros han empezado a usar el mote, y ya no es cosa de {quien.nombre}. Lo oyes dos veces a la hora de salir, y a la segunda te cuesta sonreír.' },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'seguir' },
      opciones: [
        { id: 'unirte', texto: 'Seguir la broma, que no pase de ahí', caracter: { optimismo: 1, sociabilidad: 1 }, efectos: [{ relacion: 'quien', afinidad: 1 }, { estado: 'gen.estres', mas: -1 }, { programa: 'eventos.colegio.apodo.fin', en: { dias: [21, 35] } }], resultado: 'Dices algo que los hace reír a todos, y el mote queda como un chiste más del grupo.' },
        { id: 'pedir', texto: 'Pedirles con calma que lo dejen', caracter: { honestidad: 1, prudencia: 1 }, tirada: { con: 'gen.carisma', dificultad: 45 }, exito: { efectos: [{ relacion: 'quien', afinidad: 1, confianza: 1 }, { programa: 'eventos.colegio.apodo.fin', en: { dias: [21, 35] } }], resultado: '«Vale, perdona. No sabía que te molestaba». Se agradece que alguien lo diga así.' }, fallo: { efectos: [{ estado: 'gen.estres', mas: 2 }, { programa: 'eventos.colegio.apodo.fin', en: { dias: [21, 35] } }], resultado: '«Qué exagerado». Y se ríen más fuerte, como pasa cuando alguien pide que paren.' } },
        { id: 'seguir', texto: 'Aguantar sin decir nada', caracter: { prudencia: 1, sociabilidad: -1 }, efectos: [{ estado: 'gen.estres', mas: 1 }, { programa: 'eventos.colegio.apodo.fin', en: { dias: [21, 35] } }], resultado: 'Haces como si no lo oyeras. A veces funciona.' },
      ],
    },
    {
      id: 'eventos.colegio.apodo.fin',
      titulo: 'Qué fue del mote',
      disparo: { programado: true },
      cuando: [{ periodo: 'clase' }, { alguna: [{ lugar: 'patio' }, { lugar: 'colegio' }, { lugar: 'aula' }] }],
      aguanta: { dias: 10 },
      presentacion: 'linea',
      variantes: [
        { id: 'se_quedo', si: [{ marca: 'acepto_el_mote' }], texto: 'El mote se ha quedado, como esos nombres que nadie recuerda cómo empezaron. Ya casi es parte de ti, y te lo toman con cariño.', efectos: [{ fin: true }] },
        { id: 'se_olvido', si: [], texto: 'El mote se fue apagando poco a poco, como pasa con casi todo lo del patio. Hace días que nadie lo dice.', efectos: [{ fin: true }] },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Mote suave, de alguien con quien te llevas bien: te ríes y se queda',
      dado: { lugar: 'patio', hora: 10 * 60 + 45, relacion: { quien: { afinidad: 30 } } },
      pasos: [
        { sale: 'eventos.colegio.apodo.nace', variante: 'suave', elige: 'reirte' },
        { pasan: { dias: 15 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.colegio.apodo.se_extiende', variante: 'carino', elige: 'unirte' },
        { pasan: { dias: 36 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.colegio.apodo.fin', variante: 'se_quedo' },
        { espero: { hiloCerrado: true } },
      ],
    },
    {
      nombre: 'Mote feo, de alguien que no te aprecia: se lo devuelves (solo con lo duro) y se olvida',
      dado: { lugar: 'patio', hora: 10 * 60 + 45, relacion: { quien: { afinidad: 0 } } },
      pasos: [
        { sale: 'eventos.colegio.apodo.nace', variante: 'feo', elige: 'devolver_feo' },
        { pasan: { dias: 15 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.colegio.apodo.se_extiende', variante: 'molesta', elige: 'pedir', tirada: 'exito' },
        { pasan: { dias: 36 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.colegio.apodo.fin', variante: 'se_olvido' },
        { espero: { hiloCerrado: true } },
      ],
    },
  ],
});
