import { GEN, TAGS, type QuedadaDeDeporte } from '@ds/contracts';
import { JUEGO_INFORMAL } from './ejercicios';

/**
 * JUGAR AL FÚTBOL CON LOS AMIGOS (decisión del 21/11/2026). «Con amigos» no es un entrenamiento: es **quedar a jugar al fútbol**, todo el año y no solo en verano. Es una actividad más de
 * «Proponer quedar para…» (el módulo de relaciones las lee de los aportes del deporte, sin saber nada de fútbol). **Lo que sube sale de lo que se juegue**: cada forma de jugar es una
 * quedada con lo suyo. Sienta bien y se mejora poco: la compañía y el juego pesan más que el ejercicio (unas 2 habilidades por rato de 2 horas, frente a las ~11 de una hora de entrenamiento).
 *
 * El partidillo sube exactamente lo que el juego informal de siempre (`JUEGO_INFORMAL`: lo que hace todo niño cada semana), así que quedar a jugar y el juego de fondo de los PNJ son lo mismo.
 */

const LUGARES_DE_JUEGO = { parque: 'en el parque', campo_colegio: 'en el campo del colegio', campo_municipal: 'en el campo municipal' } as const;
const LUGARES_CON_PORTERIAS = { campo_colegio: 'en el campo del colegio', campo_municipal: 'en el campo municipal' } as const;
const ETIQUETAS = ['futbol', TAGS.fisico, TAGS.social] as const;
const ENERGIA = { [GEN.energia]: -12, [GEN.estres]: -6 } as const;
const SOCIAL = [
  { stat: GEN.carisma, amount: 0.3 },
  { stat: GEN.cooperacion, amount: 0.3 },
] as const;

export const QUEDADAS_DE_FUTBOL: readonly QuedadaDeDeporte[] = [
  {
    id: 'futbol_partidillo',
    deporte: 'futbol',
    titulo: 'Jugar al fútbol: partidillo',
    nombre: 'jugar un partidillo de fútbol',
    duracion: 120,
    lugares: LUGARES_DE_JUEGO,
    entrena: JUEGO_INFORMAL,
    delta: ENERGIA,
    descripcion: 'Un partidillo con los amigos, sin árbitro ni entrenador: sienta bien, pero no se mejora igual que entrenando.',
    tags: ETIQUETAS,
  },
  {
    id: 'futbol_reducidos',
    deporte: 'futbol',
    titulo: 'Jugar al fútbol: 3 contra 3',
    nombre: 'jugar al fútbol 3 contra 3',
    duracion: 120,
    lugares: LUGARES_DE_JUEGO,
    entrena: [
      { stat: 'futbol.decisiones', amount: 0.5 },
      { stat: 'futbol.vision', amount: 0.3 },
      { stat: 'futbol.juego_colectivo', amount: 0.5 },
      { stat: 'futbol.regate', amount: 0.3 },
      { stat: 'futbol.control', amount: 0.3 },
      ...SOCIAL,
    ],
    delta: ENERGIA,
    descripcion: 'Partidos de tres contra tres en poco espacio: se toca mucho el balón y se decide deprisa.',
    tags: ETIQUETAS,
  },
  {
    id: 'futbol_tiros_y_paradas',
    deporte: 'futbol',
    titulo: 'Jugar al fútbol: tiros y paradas',
    nombre: 'jugar al fútbol a tiros y paradas',
    duracion: 120,
    lugares: LUGARES_CON_PORTERIAS,
    entrena: [
      { stat: 'futbol.definicion', amount: 0.4 },
      { stat: 'futbol.disparo_lejano', amount: 0.3 },
      { stat: 'futbol.reflejos', amount: 0.3 },
      { stat: 'futbol.blocaje', amount: 0.2 },
      { stat: 'futbol.mano_a_mano', amount: 0.2 },
      ...SOCIAL,
    ],
    delta: ENERGIA,
    descripcion: 'Uno tira y otro para, y se turnan: se mejora algo de tiro y algo de portería.',
    tags: ETIQUETAS,
  },
  {
    id: 'futbol_balon_parado',
    deporte: 'futbol',
    titulo: 'Jugar al fútbol: a ver quién la mete',
    nombre: 'jugar a ver quién la mete de balón parado',
    duracion: 120,
    lugares: LUGARES_CON_PORTERIAS,
    entrena: [
      { stat: 'futbol.faltas', amount: 0.4 },
      { stat: 'futbol.penaltis', amount: 0.4 },
      { stat: 'futbol.corners', amount: 0.3 },
      { stat: 'futbol.saque_banda', amount: 0.2 },
      { stat: 'futbol.sangre_fria', amount: 0.2 },
      ...SOCIAL,
    ],
    delta: ENERGIA,
    descripcion: 'Un concurso de faltas, penaltis y córners: a ver quién la mete.',
    tags: ETIQUETAS,
  },
];
