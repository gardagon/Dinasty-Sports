import { EJERCICIOS_DE_FUTBOL, JUEGO_INFORMAL, SIEMPRE } from './ejercicios';
import { PUESTOS_DE_FUTBOL } from './puestos';
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
 * Los clubes con sección de fútbol en España: el del colegio y los de la zona (grande, mediano y pequeño). **Cualquier club de la zona admite a quien quiera apuntarse, con la regla de plaza**
 * (hueco, o ser mejor que el peor del equipo de su categoría) y dentro del plazo de fichajes; la prueba de acceso queda para los clubes de élite (F5). Entrenan otros días que el de atletismo,
 * para poder hacer los dos. Los trámites se hacen en la secretaría de los clubes, en el campo municipal.
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
  { id: 'club_grande', nombre: 'Real Ciudad C. F.', calidad: 3, sesiones: { weekdays: [0, 1, 3, 4], desde: 17, hasta: 19 }, sede: 'campo_municipal', tramites: 'secretaria_futbol' },
  { id: 'club_mediano', nombre: 'Unión Deportiva del Barrio', calidad: 2, sesiones: { weekdays: [0, 2, 3], desde: 17, hasta: 19 }, sede: 'campo_municipal', tramites: 'secretaria_futbol' },
  { id: 'club_pequeno', nombre: 'Escuela de Fútbol Los Pinos', calidad: 2, sesiones: { weekdays: [1, 3], desde: 18, hasta: 20 }, sede: 'campo_municipal', tramites: 'secretaria_futbol' },
];

/**
 * La gente del fútbol, de momento solo la del colegio: la plantilla del equipo del colegio (reclutada entre los alumnos) y su entrenador. Los equipos
 * de la ciudad y las ligas con sus rivales llegan en la F2.
 */
/** Las categorías en que los clubes de la zona tienen equipo (benjamín a juvenil: los de fuera siguen en el sénior, que llega con la liga). */
const CATEGORIAS_DE_LOS_CLUBES = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];

const POBLACION_ESPANA: PoblacionDeDeporte = {
  // Los 16 puestos y el reparto de una plantilla de 18 por puestos (adelanto de la F3): los clubes reparten la plantilla y deciden las plazas por puesto.
  puestos: PUESTOS_DE_FUTBOL,
  // Las habilidades de sus jugadores y su rutina: los futbolistas del mundo las llevan como el personaje; el entrenador elige los ejercicios de cada sesión y son los mismos
  // para todo el equipo (`MISMAS_REGLAS.md`).
  rutina: {
    stats: STATS_DE_FUTBOL,
    conocimiento: CONOCIMIENTO,
    ejercicios: EJERCICIOS_DE_FUTBOL,
    siempre: SIEMPRE,
    ejerciciosPorSesion: 2,
    informal: JUEGO_INFORMAL,
    // Cuántas sesiones por semana entrena cada club (sus días de entrenamiento): el del colegio, 2; los de la zona, más cuanto más grandes (el grande entrena cuatro días).
    sesionesPorSemana: Object.fromEntries(CLUBES_ESPANA.map((c) => [c.id, c.sesiones.weekdays.length])),
    sesionesPorDefecto: 2,
  },
  etiqueta: 'futbolista',
  descripcionDeRival: 'Juega al fútbol.',
  capacidades: [GEN.velocidad, GEN.resistencia, GEN.agilidad, GEN.coordinacion, GEN.fuerza, GEN.inteligencia],
  aptitud: 0.15,
  reclutamiento: {
    edades: { min: 8, max: 19 },
    edadMaxBaja: 13,
    probabilidadBaja: 0.1,
    // El abandono por edad (decisión del 07/11; a calibrar con `npm run equipos`): a los 13 o menos, lo de siempre (10 % por verano); desde cadete sube deprisa. Pesan el interés, la ambición, los minutos, los estudios (4.º de la ESO y bachillerato) y los padres.
    abandono: {
      baseDeLaEdad: { 8: 0.1, 13: 0.1, 14: 0.12, 15: 0.18, 16: 0.24, 17: 0.3, 18: 0.36 },
      pesos: { interes: 0.4, ambicion: 0.25, minutos: 0.3, estudios: 0.3, padres: 0.15 },
      estudiosPorEdad: { 15: 0.6, 16: 0.8, 17: 1, 18: 0.8 },
    },
  },
  // Los equipos de la zona (`CIUDAD_Y_LIGAS.md` §3): el del colegio es un club pequeño más y escoge a sus alumnos; los de fuera, por su atractivo. Cada club tiene en cada categoría (de benjamín a juvenil) hasta cuatro
  // equipos (A, B, C y D, por año) de 14 a 18 jugadores (once titulares y suplentes), que salen del «draft» al crear la partida y cada verano (`CIUDAD_Y_LIGAS.md` §5): cada club ve a un porcentaje de los niños (su
  // atractivo), coge a los mejores por puesto y los equipos que faltan se sortean entre clubes y colegios; un equipo con menos de 14 se completa con la bolsa y el ascenso del que sería titular arriba y, si ni así
  // llega, se cierra. Los equipos se fijan para toda la temporada. Todos los clubes de la zona (con sus tamaños y los colegios con club) salen de la ciudad (`personasPorClub`, `colegiosConClub`).
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
      // de 10 equipos tiene 18 jornadas (por divisiones: Primera y Segunda de 10, el resto en la última en grupos de 8 a 12; suben 2 y bajan 2). Sin semifinales ni final: una liga se juega a jornadas.
      temporada: { semanasDePretemporada: 4, liga: { vueltas: 2, equiposPorCategoria: { min: 6, max: 7 }, divisiones: { tamano: 10, fijas: 2, grupo: { min: 8, max: 12 }, suben: 2, bajan: 2 } } },
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
    {
      id: 'secretaria_futbol',
      name: 'Secretaría de los clubes de fútbol',
      descripcion: 'La secretaría de los clubes de fútbol de la zona, en el campo municipal: aquí te apuntas a un club de fútbol (si hay hueco en el equipo de tu categoría o eres mejor que el peor) dentro del plazo de fichajes.',
      grupo: 'Dentro del campo municipal',
      dentroDe: 'campo_municipal',
      horario: {
        tramos: [
          { dias: [0, 1, 2, 3, 4], desde: 16 * 60, hasta: 21 * 60 },
          { dias: [5], desde: 9 * 60, hasta: 14 * 60 },
        ],
        texto: 'de lunes a viernes de 16:00 a 21:00 y los sábados de 9:00 a 14:00',
      },
      despuesDe: 'campo_municipal',
    },
  ],
  entreCalles: [],
};
