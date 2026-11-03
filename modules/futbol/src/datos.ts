import { EJERCICIOS_DE_FUTBOL, JUEGO_INFORMAL, SIEMPRE } from './ejercicios';
import { CONOCIMIENTO, STATS_DE_FUTBOL } from './habilidades';
import { GEN, type AporteDeLugares, type CategoriaDef, type ClubDeDeporte, type DatosDeDeporte, type FichaDeDeporte, type PoblacionDeDeporte } from '@ds/contracts';

/**
 * Lo que el fútbol trae de cada país (datos puros, ver `DatosDeDeporte`). Hoy solo España; los demás países usan estos datos hasta que el deporte
 * traiga los suyos. **Fútbol 11 en todas las categorías**, también a los 8 años (decisión del 31/10: el fútbol 7 pediría otro motor de partido).
 */

/** Categorías de la federación española de fútbol, por edad de competición. Desde los 19 se compite en categoría sénior. */
export const CATEGORIAS_ESPANA: readonly CategoriaDef[] = [
  { id: 'prebenjamin', nombre: 'Prebenjamín', edadMin: 0, edadMax: 7 },
  { id: 'benjamin', nombre: 'Benjamín', edadMin: 8, edadMax: 9 },
  { id: 'alevin', nombre: 'Alevín', edadMin: 10, edadMax: 11 },
  { id: 'infantil', nombre: 'Infantil', edadMin: 12, edadMax: 13 },
  { id: 'cadete', nombre: 'Cadete', edadMin: 14, edadMax: 15 },
  { id: 'juvenil', nombre: 'Juvenil', edadMin: 16, edadMax: 18 },
  { id: 'senior', nombre: 'Sénior', edadMin: 19, edadMax: 200 },
];

/**
 * Los clubes con sección de fútbol en España. De momento solo el del colegio: los de fuera, con su prueba de acceso (y los de élite), llegan en la F5.
 * Entrena otros días que el de atletismo (martes y jueves, de 15 a 17), para poder hacer los dos.
 */
const CLUBES_ESPANA: readonly ClubDeDeporte[] = [
  {
    id: 'colegio',
    nombre: 'Club deportivo del colegio',
    esColegio: true,
    calidad: 1,
    sesiones: { weekdays: [1, 3], desde: 15, hasta: 17 },
    sede: 'campo_colegio',
    tramites: 'administracion',
  },
];

/**
 * La gente del fútbol, de momento solo la del colegio: la plantilla del equipo del colegio (reclutada entre los alumnos) y su entrenador. Los equipos
 * de la ciudad y las ligas con sus rivales llegan en la F2.
 */
/** Las categorías en que los clubes de la zona tienen equipo (benjamín a juvenil: los de fuera siguen en el sénior, que llega con la liga). */
const CATEGORIAS_DE_LOS_CLUBES = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];

const POBLACION_ESPANA: PoblacionDeDeporte = {
  // Las habilidades de sus jugadores y su rutina: los futbolistas del mundo las llevan como el personaje; el entrenador elige los ejercicios de cada sesión y son los mismos
  // para todo el equipo (`MISMAS_REGLAS.md`).
  rutina: {
    stats: STATS_DE_FUTBOL,
    conocimiento: CONOCIMIENTO,
    ejercicios: EJERCICIOS_DE_FUTBOL,
    siempre: SIEMPRE,
    ejerciciosPorSesion: 2,
    informal: JUEGO_INFORMAL,
    // Cuántas sesiones por semana entrena cada club: el del colegio, 2; los de la zona, más cuanto más grandes (los grandes entrenan cuatro días).
    sesionesPorSemana: { ...Object.fromEntries(CLUBES_ESPANA.map((c) => [c.id, c.sesiones.weekdays.length])), club_grande: 4, club_mediano: 3, club_pequeno: 2 },
    sesionesPorDefecto: 2,
  },
  etiqueta: 'futbolista',
  descripcionDeRival: 'Juega al fútbol.',
  capacidades: [GEN.velocidad, GEN.resistencia, GEN.agilidad, GEN.coordinacion, GEN.fuerza, GEN.inteligencia],
  aptitud: 0.15,
  reclutamiento: { edades: { min: 8, max: 19 }, edadMaxBaja: 13, probabilidadBaja: 0.1 },
  // Los equipos de la zona (`CIUDAD_Y_LIGAS.md` §3): el del colegio es un club pequeño más y escoge a sus alumnos; los de fuera escogen entre todos los colegios por lo que vale cada
  // niño, los grandes primero. Un equipo por categoría (de benjamín a juvenil), de 14 a 18 jugadores (once titulares y suplentes): se recluta primero a los interesados hasta 18 y, si no
  // llegan a 14, se completa con niños sin interés hasta 14 (no se guarda ningún hueco al personaje: entra como cualquier niño, por la regla de plaza). Con la población de ahora (unos 120 niños por edad) salen llenos. Los filiales (el equipo B
  // de los clubes grandes y medianos) llegan con la liga por divisiones (F2).
  equipos: [
    { club: 'club_grande', nombre: 'Real Ciudad C. F.', tamano: 'grande', categorias: CATEGORIAS_DE_LOS_CLUBES, plantillaPorCategoria: { min: 14, max: 18 } },
    { club: 'club_mediano', nombre: 'Unión Deportiva del Barrio', tamano: 'mediano', categorias: CATEGORIAS_DE_LOS_CLUBES, plantillaPorCategoria: { min: 14, max: 18 } },
    { club: 'club_pequeno', nombre: 'Escuela de Fútbol Los Pinos', tamano: 'pequeno', categorias: CATEGORIAS_DE_LOS_CLUBES, plantillaPorCategoria: { min: 14, max: 18 } },
    { club: 'colegio', colegio: 'propio', tamano: 'pequeno', categorias: ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'], plantillaPorCategoria: { min: 14, max: 18 } },
  ],
  descripcionDelEquipo: 'Del equipo de fútbol del colegio.',
  entrenadores: {
    sesgoCaracter: { disciplina: 12, sacrificio: 8 },
    interesesPreferidos: ['deporte', 'futbol'],
    descripcionDelColegio: 'Entrena al equipo de fútbol del colegio.',
    dedicacion: 'de fútbol',
    // Cada club de la zona tiene sus entrenadores, uno por tramo de edades.
    deFuera: [
      { club: 'club_grande', edades: [[8, 11], [12, 15], [16, 19]] },
      { club: 'club_mediano', edades: [[8, 11], [12, 15], [16, 19]] },
      { club: 'club_pequeno', edades: [[8, 13], [14, 19]] },
    ],
  },
};

export const FICHA_FUTBOL: FichaDeDeporte = {
  id: 'futbol',
  nombre: 'Fútbol',
  disciplina: 'Fútbol 11',
  descripcion: 'Fútbol 11: entrenas con tu equipo y juegas la liga los sábados.',
  tipo: 'equipo',
};

export const DATOS_FUTBOL: DatosDeDeporte = {
  id: 'futbol',
  paises: {
    espana: {
      categorias: CATEGORIAS_ESPANA,
      // Con el calendario de España: la liga empieza en la semana 5 del curso (cuatro semanas de pretemporada) y acaba con las clases. Una liga a doble vuelta
      // de 6 o 7 equipos tiene 10 o 14 jornadas. Sin semifinales ni final: una liga se juega a jornadas.
      temporada: { semanasDePretemporada: 4, liga: { vueltas: 2, equiposPorCategoria: { min: 6, max: 7 } } },
      competiciones: {
        federacion: 'Real Federación Española de Fútbol',
        campeonato: 'campeonato de {pais}',
        // Partidos de liga los sábados por la mañana (el día da igual de momento).
        jornada: { dias: [5], desde: 9, hasta: 13, lugar: 'campo_municipal', texto: 'Partidos de liga: los sábados de 9 a 13 en el campo municipal.' },
      },
      sedes: { colegio: 'campo_colegio', fuera: 'campo_municipal' },
      clubes: CLUBES_ESPANA,
      poblacion: POBLACION_ESPANA,
    },
  },
};

/** Lo que el fútbol pone en el mapa de la ciudad: el campo del colegio y el campo municipal. */
export const LUGARES_FUTBOL: AporteDeLugares = {
  lugares: [
    {
      id: 'campo_colegio',
      name: 'Campo de fútbol del colegio',
      descripcion: 'El campo de fútbol del colegio: aquí entrena el equipo del colegio y se puede jugar por tu cuenta. Los miembros del club están 10 minutos antes de cada sesión.',
      grupo: 'Dentro del colegio',
      dentroDe: 'colegio',
      despuesDe: 'administracion',
    },
    {
      id: 'campo_municipal',
      name: 'Campo municipal de fútbol',
      descripcion: 'El campo municipal de césped: aquí se juegan los partidos de liga y se puede entrenar por tu cuenta.',
      grupo: 'Deporte',
      enCalle: 'avenida_parque',
      minutosDeCalle: 4,
      horario: { tramos: [{ dias: 'todos', desde: 8 * 60, hasta: 21 * 60 }], texto: 'todos los días de 8:00 a 21:00' },
      despuesDe: 'gimnasio',
    },
  ],
  entreCalles: [],
};
