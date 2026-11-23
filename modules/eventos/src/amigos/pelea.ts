import { hilo } from '@ds/contracts';

/**
 * Dos amigos se pelean (lote 2, tanda 4). Dos amigos tuyos (afinidad ≥ 25 con cada uno; el juego aún no tiene relaciones entre PNJ, así que no cambia lo que sienten entre ellos) se enfadan y te cuentan cada uno su versión.
 * Tres pasos: en medio, se alejan y hacen las paces (o no). Por defecto es una discusión; con el contenido duro de «peleas» activado puede acabar a empujones, con una opción más (separarlos). Sin lo duro el hilo se
 * cuenta entero. Contigo la afinidad sí cambia, según lo que elijas. Cifras de partida, por calibrar.
 */
const AL_PATIO = [{ señal: 'hasta', es: 'patio' }, { hora: { desde: 10 * 60 + 30, hasta: 11 * 60 + 15 } }] as const;
const CERCA = [{ alguna: [{ lugar: 'patio' }, { lugar: 'colegio' }] }, { periodo: 'clase' }] as const;

export default hilo({
  id: 'eventos.amigos.pelea',
  nombre: 'Dos amigos se pelean',
  requiere: ['lugares', 'relaciones'],
  instancias: 'una_por_reparto',
  reparto: { a: { relacion: { afinidad: { min: 25 } }, presente: true }, b: { relacion: { afinidad: { min: 25 } }, presente: true } },
  sucesos: [
    {
      id: 'eventos.amigos.pelea.en_medio',
      titulo: '«¿Tú de qué lado estás?»',
      disparo: { al: 'lugares.llegada', prob: 0.03 },
      ejemploDeSeñal: { desde: 'aula', hasta: 'patio', minutos: 2 },
      cuando: AL_PATIO,
      repite: { espera: { dias: 90 }, porReparto: true },
      variantes: [
        {
          id: 'a_empujones',
          si: [{ relacion: 'a', afinidad: { max: 60 } }],
          duro: ['peleas'],
          texto: 'Se oyen gritos en el fondo del patio. {a.Nombre} y {b.nombre} están frente a frente, empujándose, rodeados de un corro que no ayuda. {a.Nombre} te ve y te grita: «¡Tú dime quién tiene razón!»',
        },
        {
          id: 'discusion',
          si: [],
          textos: [
            '{a.Nombre} te corta el paso en el patio, con los puños cerrados, aunque solo de rabia. «No quiero ni oír hablar de {b.nombre}. ¿Tú de qué lado estás?»',
            '{b.Nombre} se te acerca en el recreo con cara de funeral. «Me he peleado con {a.nombre}. Bueno, nos hemos peleado los dos. Y quiero que sepas lo que ha pasado».',
          ],
        },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'alejarte' },
      opciones: [
        { id: 'con_a', texto: 'Ponerte de parte de {a.nombre}', caracter: { sociabilidad: 1, honestidad: -1 }, minutos: 5, efectos: [{ relacion: 'a', afinidad: 3 }, { relacion: 'b', afinidad: -3 }, { marca: 'tomo_partido', dura: { dias: 60 } }, { programa: 'eventos.amigos.pelea.se_alejan', en: { dias: [7, 10] } }], resultado: '{a.Nombre} asiente, aliviad{a:o|a}. {b.Nombre} te mira como si no te conociera.' },
        { id: 'con_b', texto: 'Ponerte de parte de {b.nombre}', caracter: { sociabilidad: 1, honestidad: -1 }, minutos: 5, efectos: [{ relacion: 'b', afinidad: 3 }, { relacion: 'a', afinidad: -3 }, { marca: 'tomo_partido', dura: { dias: 60 } }, { programa: 'eventos.amigos.pelea.se_alejan', en: { dias: [7, 10] } }], resultado: '{b.Nombre} respira. {a.Nombre} aparta la mirada, dolid{a:o|a}.' },
        { id: 'mediar', texto: 'Decir que los dos tenéis algo de razón y que se calmen', caracter: { prudencia: 1, optimismo: 1 }, minutos: 10, tirada: { con: 'gen.carisma', dificultad: 50 }, exito: { efectos: [{ relacion: 'a', afinidad: 1 }, { relacion: 'b', afinidad: 1 }, { entrena: 'gen.empatia', cantidad: 0.4 }, { marca: 'hizo_de_mediador', dura: { dias: 60 } }, { programa: 'eventos.amigos.pelea.se_alejan', en: { dias: [7, 10] } }], resultado: 'Se quedan un rato en silencio, mirando al suelo. «Vale», dice uno. «Vale», dice el otro. No es la paz, pero se parece.' }, fallo: { efectos: [{ relacion: 'a', afinidad: -1 }, { relacion: 'b', afinidad: -1 }, { marca: 'hizo_de_mediador', dura: { dias: 60 } }, { programa: 'eventos.amigos.pelea.se_alejan', en: { dias: [7, 10] } }], resultado: '«Tú no entiendes nada», te responden los dos a la vez, que es lo único en lo que están de acuerdo.' } },
        { id: 'separar', texto: 'Meterte en medio y separarlos', duro: ['peleas'], caracter: { agresividad: 1, sacrificio: 2 }, requiere: [{ stat: 'gen.autoridad', min: 8 }], tirada: { con: 'gen.autoridad', dificultad: 50 }, exito: { efectos: [{ relacion: 'a', afinidad: 2 }, { relacion: 'b', afinidad: 2 }, { entrena: 'gen.autoridad', cantidad: 0.5 }, { marca: 'hizo_de_mediador', dura: { dias: 60 } }, { programa: 'eventos.amigos.pelea.se_alejan', en: { dias: [7, 10] } }], resultado: 'Te colocas en medio con los brazos abiertos, sin saber muy bien cómo. Funciona: los dos se frenan, con la respiración agitada.' }, fallo: { efectos: [{ estado: 'gen.estres', mas: 5 }, { relacion: 'a', afinidad: -1 }, { relacion: 'b', afinidad: -1 }, { marca: 'hizo_de_mediador', dura: { dias: 60 } }, { programa: 'eventos.amigos.pelea.se_alejan', en: { dias: [7, 10] } }], resultado: 'Te llevas un empujón sin querer, y todo el mundo se queda quieto un segundo. Después, un profesor se acerca corriendo.' } },
        { id: 'alejarte', texto: 'Alejarte sin meterte', caracter: { prudencia: 1, sociabilidad: -1 }, efectos: [{ programa: 'eventos.amigos.pelea.se_alejan', en: { dias: [7, 10] } }], resultado: 'Das media vuelta. Es su pelea, no la tuya. A veces eso es lo más sensato, y a veces no.' },
      ],
    },
    {
      id: 'eventos.amigos.pelea.se_alejan',
      titulo: 'Cada uno por su lado',
      disparo: { programado: true },
      cuando: [...CERCA, { presente: 'a' }],
      aguanta: { dias: 6 },
      variantes: [
        { id: 'tomaste_partido', si: [{ marca: 'tomo_partido' }], texto: 'Llevas días notando que uno de los dos te saluda más frío. Elegir bando tiene eso: todo el mundo se da cuenta de a quién no elegiste.' },
        { id: 'mediaste', si: [{ marca: 'hizo_de_mediador' }], texto: 'Ninguno ha vuelto a mencionar la pelea delante de ti. Aun así, cada uno anda con su grupo y cuesta verlos en la misma mesa.' },
        { id: 'te_alejaste', si: [], texto: 'Con la pelea de por medio, {a.nombre} y {b.nombre} van cada uno por su lado. Tú no sabes bien dónde ponerte, y los dos lo notan.' },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'dejarlo' },
      opciones: [
        { id: 'juntos', texto: 'Proponer algo para los dos, sin hablar de lo que pasó', caracter: { sociabilidad: 1, optimismo: 1 }, minutos: 5, tirada: { con: 'gen.comunicacion', dificultad: 50 }, exito: { efectos: [{ relacion: 'a', afinidad: 1 }, { relacion: 'b', afinidad: 1 }, { marca: 'junto_a_los_dos', dura: { dias: 60 } }, { programa: 'eventos.amigos.pelea.paces', en: { dias: [14, 28] } }], resultado: 'Los dos aceptan, aunque sin mirarse. A los diez minutos de estar juntos se les empieza a notar menos la tensión.' }, fallo: { efectos: [{ programa: 'eventos.amigos.pelea.paces', en: { dias: [14, 28] } }], resultado: '«Yo no voy si va él». «Pues yo no voy si va ella». No hay manera.' } },
        { id: 'separado', texto: 'Hablar con cada uno por separado', caracter: { honestidad: 1, prudencia: 1 }, minutos: 10, efectos: [{ relacion: 'a', confianza: 1 }, { relacion: 'b', confianza: 1 }, { programa: 'eventos.amigos.pelea.paces', en: { dias: [14, 28] } }], resultado: 'Cada uno cuenta lo suyo y tú escuchas. A veces escuchar sin juzgar es lo único que hace falta.' },
        { id: 'dejarlo', texto: 'Dejar que lo arreglen ellos', caracter: { prudencia: 1 }, efectos: [{ programa: 'eventos.amigos.pelea.paces', en: { dias: [14, 28] } }], resultado: 'Piensas que estas cosas solo las arreglan los implicados. Quizá sea verdad.' },
      ],
    },
    {
      id: 'eventos.amigos.pelea.paces',
      titulo: 'Cómo acabó',
      disparo: { programado: true },
      cuando: [...CERCA],
      aguanta: { dias: 10 },
      variantes: [
        { id: 'hacen_las_paces', si: [{ marca: 'junto_a_los_dos' }], texto: '{a.Nombre} y {b.nombre} se han vuelto a hablar. No te cuentan cómo, pero ahora comparten bocadillo, y a ti te toca reírte de lo tonta que fue la pelea.', efectos: [{ relacion: 'a', afinidad: 2 }, { relacion: 'b', afinidad: 2 }, { fin: true }] },
        { id: 'lo_dejaron', si: [{ marca: 'tomo_partido' }], texto: '{a.Nombre} y {b.nombre} no han hecho las paces. Cada uno sigue con su grupo, y tú, con el peso de haber elegido.', efectos: [{ relacion: 'a', afinidad: -1 }, { relacion: 'b', afinidad: -1 }, { fin: true }] },
        { id: 'se_enfriaron', si: [], texto: '{a.Nombre} y {b.nombre} fueron dejando la pelea atrás, sin que nadie dijera nada. Ya no se hablan como antes, pero tampoco se evitan.', efectos: [{ fin: true }] },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Discusión: medias bien y hacen las paces',
      dado: { lugar: 'patio', hora: 10 * 60 + 45, relacion: { a: { afinidad: 70 }, b: { afinidad: 50 } } },
      pasos: [
        { sale: 'eventos.amigos.pelea.en_medio', variante: 'discusion', elige: 'mediar', tirada: 'exito' },
        { espero: { marca: 'hizo_de_mediador' } },
        { pasan: { dias: 11 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.amigos.pelea.se_alejan', variante: 'mediaste', elige: 'juntos', tirada: 'exito' },
        { pasan: { dias: 29 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.amigos.pelea.paces', variante: 'hacen_las_paces' },
        { espero: { hiloCerrado: true } },
      ],
    },
    {
      nombre: 'A empujones (contenido duro): los separas',
      dado: { lugar: 'patio', hora: 10 * 60 + 45, relacion: { a: { afinidad: 40 }, b: { afinidad: 40 } }, stats: { 'gen.autoridad': 20 } },
      pasos: [
        { sale: 'eventos.amigos.pelea.en_medio', variante: 'a_empujones', elige: 'separar', tirada: 'exito' },
        { espero: { marca: 'hizo_de_mediador' } },
      ],
    },
    {
      nombre: 'Tomas partido y no se arregla',
      dado: { lugar: 'patio', hora: 10 * 60 + 45, relacion: { a: { afinidad: 70 }, b: { afinidad: 50 } } },
      pasos: [
        { sale: 'eventos.amigos.pelea.en_medio', variante: 'discusion', elige: 'con_a' },
        { pasan: { dias: 11 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.amigos.pelea.se_alejan', variante: 'tomaste_partido', elige: 'dejarlo' },
        { pasan: { dias: 29 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.amigos.pelea.paces', variante: 'lo_dejaron' },
        { espero: { hiloCerrado: true } },
      ],
    },
  ],
});
