import { GEN, type AporteDeLugares, type CategoriaDef, type ClubDeDeporte, type DatosDeDeporte, type FichaDeDeporte, type PoblacionDeDeporte } from '@ds/contracts';

/**
 * Lo que el atletismo trae de cada país (datos puros, ver `DatosDeDeporte`): sus categorías, su temporada y sus competiciones. Hoy solo España;
 * los demás países usan estos mismos datos (con su nombre donde pone `{pais}`) hasta que el deporte traiga los suyos.
 */

/** Categorías de la federación española de atletismo (por edad). Los de 23 años o más compiten en absoluta. */
export const CATEGORIAS_ESPANA: readonly CategoriaDef[] = [
  { id: 'sub10', nombre: 'Sub-10', edadMin: 0, edadMax: 9 },
  { id: 'sub12', nombre: 'Sub-12', edadMin: 10, edadMax: 11 },
  { id: 'sub14', nombre: 'Sub-14', edadMin: 12, edadMax: 13 },
  { id: 'sub16', nombre: 'Sub-16', edadMin: 14, edadMax: 15 },
  { id: 'sub18', nombre: 'Sub-18', edadMin: 16, edadMax: 17 },
  { id: 'sub20', nombre: 'Sub-20', edadMin: 18, edadMax: 19 },
  { id: 'sub23', nombre: 'Sub-23', edadMin: 20, edadMax: 22 },
  { id: 'absoluta', nombre: 'Absoluta', edadMin: 23, edadMax: 200 },
];

/** Los clubes con sección de atletismo en España. Otro país tendría los suyos. */
const CLUBES_ESPANA: readonly ClubDeDeporte[] = [
  {
    id: 'colegio',
    nombre: 'Club deportivo del colegio',
    esColegio: true,
    calidad: 1,
    sesiones: { weekdays: [0, 2], desde: 15, hasta: 17 },
    sede: 'pista_colegio',
    tramites: 'administracion',
  },
  {
    id: 'club_ciudad',
    nombre: 'Club Atletismo Ciudad',
    calidad: 2,
    sesiones: { weekdays: [1, 3], desde: 18, hasta: 20 },
    acceso: { nivel: 45, edadMin: 10 },
    sede: 'estadio',
    tramites: 'sala_club_ciudad',
  },
  {
    id: 'club_alto_rendimiento',
    nombre: 'Club de Alto Rendimiento',
    calidad: 3,
    sesiones: { weekdays: [0, 1, 3], desde: 17, hasta: 20 },
    acceso: { nivel: 65, edadMin: 14 },
    sede: 'estadio',
    tramites: 'sala_club_alto_rendimiento',
  },
];

/**
 * La gente del atletismo: 9 rivales por edad de los 8 a los 19 años (18 por categoría de dos edades: los 18 corredores de una carrera con semifinales y
 * final; los ausentes y las lesiones se cubren con reservas), el entrenador del colegio y los de los clubes de fuera, y el equipo del club del colegio.
 */
const POBLACION_ESPANA: PoblacionDeDeporte = {
  etiqueta: 'atleta',
  descripcionDeRival: 'Compite en atletismo.',
  capacidades: [GEN.velocidad, GEN.fuerza, GEN.resistencia, GEN.constitucion, GEN.agilidad, GEN.coordinacion],
  aptitud: 0.15,
  deportistas: { sesgoCaracter: { ambicion: 8, agresividad: 5, sacrificio: 8 }, interesesPreferidos: ['deporte', 'atletismo'] },
  rivales: {
    edades: { min: 8, max: 19 },
    porEdad: 9,
    edadMaxBaja: 13,
    probabilidadBaja: 0.1,
    // 12 clubes y colegios de unos 8 rivales cada uno: los dos del catálogo del personaje y otros con nombres provisionales.
    clubes: ['Club Atletismo Ciudad', 'Club de Alto Rendimiento', 'colegio1', 'colegio2', 'colegio3', 'colegio4', 'club1', 'club2', 'club3', 'club4', 'club5', 'club6'],
  },
  entrenadores: {
    sesgoCaracter: { disciplina: 15, ambicion: 10, sacrificio: 8 },
    interesesPreferidos: ['deporte', 'atletismo'],
    descripcionDelColegio: 'Entrena al grupo de atletismo del colegio.',
    dedicacion: 'de atletismo',
    // Cada club de fuera tiene varios entrenadores, cada uno con las categorías de unas edades (alguno lleva varias).
    deFuera: [
      { club: 'club_ciudad', edades: [[10, 13], [14, 17], [18, 99]] },
      { club: 'club_alto_rendimiento', edades: [[14, 17], [18, 99]] },
    ],
  },
  // Alumnos de las distintas clases que van a las sesiones del club: 4 de tu clase + 4 de la otra + 8 de otros cursos.
  equipoDelColegio: {
    tamano: 16,
    posiciones: { tuClase: [2, 7, 12, 18], otraClase: [1, 8, 15, 22], otrosCursos: [3, 22, 41, 60, 79, 98, 117, 136] },
    descripcion: 'Del equipo de atletismo del colegio.',
  },
};

export const FICHA_ATLETISMO: FichaDeDeporte = {
  id: 'atletismo',
  nombre: 'Atletismo',
  disciplina: '400 m',
  descripcion: '400 metros lisos: entrenas por la tarde y compites los sábados.',
  tipo: 'individual',
};

export const DATOS_ATLETISMO: DatosDeDeporte = {
  id: 'atletismo',
  paises: {
    espana: {
      categorias: CATEGORIAS_ESPANA,
      // Con el calendario de España: la primera carrera en la semana 5 del curso y las semifinales y la final en las semanas 38 y 39 (las clases acaban en la 41).
      temporada: { semanasDePretemporada: 4, semifinalAntesDelFinal: 3, finalAntesDelFinal: 2 },
      competiciones: {
        federacion: 'Real Federación Española de Atletismo',
        campeonato: 'campeonato de {pais}',
        // Las carreras de cada semana: los sábados de 9 a 13 en el estadio.
        jornada: { dias: [5], desde: 9, hasta: 13, lugar: 'estadio', texto: 'Carreras: los sábados de 9 a 13 en el estadio.' },
      },
      // El club del colegio entrena en la pista del colegio; los de fuera, en el estadio.
      sedes: { colegio: 'pista_colegio', fuera: 'estadio' },
      clubes: CLUBES_ESPANA,
      poblacion: POBLACION_ESPANA,
    },
  },
};

/** Horario de las salas de los clubes del estadio. */
const HORARIO_DE_SALA_DE_CLUB = {
  tramos: [
    { dias: [0, 1, 2, 3, 4], desde: 16 * 60, hasta: 21 * 60 },
    { dias: [5], desde: 9 * 60, hasta: 14 * 60 },
  ],
  texto: 'de lunes a viernes de 16:00 a 21:00 y los sábados de 9:00 a 14:00',
};

/** Lo que el atletismo pone en el mapa de la ciudad: la avenida y el estadio con las salas de sus clubes, y la pista del colegio. Cada sitio sale detrás del que dice `despuesDe`. */
export const LUGARES_ATLETISMO: AporteDeLugares = {
  lugares: [
    { id: 'avenida_estadio', name: 'Avenida del Estadio', descripcion: 'La avenida del estadio de atletismo. Desde aquí se va a otras calles.', grupo: 'Calles', calle: true, despuesDe: 'avenida_parque' },
    {
      id: 'estadio',
      name: 'Estadio',
      descripcion: 'El estadio de atletismo: pista, graderías y vestuarios. Aquí compiten los clubes y se celebran las carreras.',
      grupo: 'Deporte',
      enCalle: 'avenida_estadio',
      minutosDeCalle: 3,
      horario: { tramos: [{ dias: 'todos', desde: 8 * 60, hasta: 21 * 60 }], texto: 'todos los días de 8:00 a 21:00' },
      despuesDe: 'gimnasio',
    },
    {
      id: 'pista_colegio',
      name: 'Pista de atletismo del colegio',
      descripcion: 'La pista de atletismo del colegio: aquí entrena el club del colegio y se puede correr por tu cuenta. Los miembros del club están 10 minutos antes de cada sesión.',
      grupo: 'Dentro del colegio',
      dentroDe: 'colegio',
      despuesDe: 'administracion',
    },
    {
      id: 'sala_club_ciudad',
      name: 'Sala del Club Atletismo Ciudad',
      descripcion: 'La sala del Club Atletismo Ciudad, en el estadio: aquí pides la prueba de acceso y la inscripción de atletismo.',
      grupo: 'Dentro del estadio',
      dentroDe: 'estadio',
      horario: HORARIO_DE_SALA_DE_CLUB,
      despuesDe: 'pista_colegio',
    },
    {
      id: 'sala_club_alto_rendimiento',
      name: 'Sala del Club de Alto Rendimiento',
      descripcion: 'La sala del Club de Alto Rendimiento, en el estadio: aquí pides la prueba de acceso y la inscripción de atletismo.',
      grupo: 'Dentro del estadio',
      dentroDe: 'estadio',
      horario: HORARIO_DE_SALA_DE_CLUB,
      despuesDe: 'sala_club_ciudad',
    },
  ],
  entreCalles: [
    ['calle_colegio', 'avenida_estadio', 6],
    ['avenida_parque', 'avenida_estadio', 6],
  ],
};
