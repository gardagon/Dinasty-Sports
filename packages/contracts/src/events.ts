/**
 * Eventos que emite el núcleo. Los módulos pueden emitir los suyos con el prefijo de su id
 * (p. ej. `atletismo.carrera`) y escuchar los de cualquiera mediante `on` en su definición.
 */
export const CORE_EVENTS = {
  /** data: { day } — al pasar la medianoche, para el día que termina. */
  DAY_END: 'dia.fin',
  /** data: { day } — para el día que empieza. */
  DAY_START: 'dia.inicio',
  /** data: { week } — al terminar el domingo. */
  WEEK_END: 'semana.fin',
  /** data: ActionDoneData */
  ACTION_DONE: 'accion.realizada',
} as const;

/**
 * Eventos COMPARTIDOS: cualquier módulo puede emitirlos y cualquiera escucharlos.
 * Son el idioma común entre módulos que no se conocen (p. ej. cualquier deporte
 * publica sus resultados igual, y los NPCs reaccionan sin saber qué deporte es).
 */
export const SHARED_EVENTS = {
  /** data: CompetitionResultData */
  COMPETITION_RESULT: 'competicion.resultado',
  /** data: ClubJoinData — un deporte pide que el personaje entre en un club. */
  CLUB_JOIN: 'club.unirse',
  /** data: ClubLeaveData */
  CLUB_LEAVE: 'club.salir',
  /** data: ClubAbandonoData — el personaje se cambia de club sin haber dejado antes el que tenía. */
  CLUB_ABANDONO: 'club.abandono',
  /** data: ClassAttendedData — el personaje ha ido a una clase (el profesor de esa asignatura se presenta si no lo conoce). */
  CLASS_ATTENDED: 'clase.asistida',
  /** data: FaltasExcesivasData — el personaje ha llegado al número de faltas de clase del trimestre que avisa a los padres (el evento de los padres está pendiente). */
  FALTAS_EXCESIVAS: 'clase.faltas_excesivas',
  /** data: DatoPersonalData — el personaje le ha preguntado a alguien su edad, su colegio, su clase, su profesión, su trabajo o sus gustos y ya lo sabe. */
  DATO_PERSONAL: 'persona.dato',
  /** data: PresentacionData — el personaje pregunta el nombre a alguien y se presentan: pasa de desconocido a conocido. */
  PRESENTACION: 'persona.presentarse',
  /** data: DeporteAnadidoData — se ha añadido un deporte a una partida empezada (los que tienen gente, como `npcs`, la preparan). */
  DEPORTE_ANADIDO: 'deporte.anadido',
} as const;

export interface DeporteAnadidoData {
  /** Id del deporte (el de su ficha). */
  deporte: string;
}

export interface PresentacionData {
  npcId: string;
}

export interface ClubJoinData {
  /** Deporte (p. ej. 'atletismo'). */
  sport: string;
  clubId: string;
}

export interface DatoPersonalData {
  npcId: string;
  dato: 'edad' | 'colegio' | 'clase' | 'profesion' | 'trabajo' | 'gustos';
}

export interface FaltasExcesivasData {
  /** Faltas de clase en el trimestre (una por clase). */
  faltas: number;
  /** Curso del juego (0 = el primero) y trimestre (1 a 3) al que se refieren. */
  curso: number;
  trimestre: number;
}

export interface ClassAttendedData {
  /** Id de la asignatura (la stat), p. ej. `estudios.lengua`. */
  asignatura: string;
}

export interface ClubAbandonoData {
  sport: string;
  /** Club que se deja plantado. */
  clubId: string;
}

export interface ClubLeaveData {
  sport: string;
}

/** Quién es alguien que sale en una competición: un rival, un compañero de equipo o (sin `bando`) un participante más de una prueba individual. */
export type BandoEnCompeticion = 'companero' | 'rival';

/** Lo que añade un partido (o cualquier competición por equipos) al resultado: el marcador y quién ganó. */
export interface ResultadoDeEquipo {
  /** Desde el punto de vista del equipo del personaje. */
  resultado: 'victoria' | 'empate' | 'derrota';
  /** Marcador: tantos del equipo del personaje y del rival. */
  propio: number;
  rival: number;
  /** Los nombres de los dos equipos (p. ej. para el registro). */
  equipoPropio: string;
  equipoRival: string;
}

export interface CompetitionResultData {
  /** Módulo que la organiza (p. ej. 'atletismo'). */
  module: string;
  /** Nombre visible de la prueba (p. ej. '400 m') o del partido. */
  discipline: string;
  /** 1 = primero. En un partido, el puesto del equipo en la clasificación de la competición. */
  position: number;
  total: number;
  /** Marca del personaje, en la unidad de la prueba. En un partido, su valoración (la que decida el deporte). */
  mark: number;
  unit: string;
  participants: { npcId?: string; name: string; mark: number; isPlayer?: boolean; bando?: BandoEnCompeticion }[];
  /**
   * Si es mejor la marca mayor (puntos, goles, una nota) y no la menor (tiempos, como en atletismo). Sin él, gana la menor, como hasta ahora.
   * Solo vale para comparar `mark` entre participantes de una prueba individual.
   */
  mayorEsMejor?: boolean;
  /** Presente en las competiciones por equipos: el marcador y quién ganó. Ahí no se comparan marcas: gana el equipo. */
  equipo?: ResultadoDeEquipo;
}

/**
 * ¿Le ha ganado el personaje a este participante? En una prueba individual se comparan las marcas (por defecto gana la menor, como en atletismo; con
 * `mayorEsMejor`, la mayor; un empate cuenta como no ganar). En un partido, solo se le gana al bando rival y solo si el equipo del personaje ha ganado.
 */
export function elPersonajeLeGana(r: Pick<CompetitionResultData, 'mark' | 'mayorEsMejor' | 'equipo'>, p: { mark: number; bando?: BandoEnCompeticion }): boolean {
  if (r.equipo) return p.bando === 'rival' && r.equipo.resultado === 'victoria';
  return r.mayorEsMejor ? r.mark > p.mark : r.mark < p.mark;
}

/** ¿Fue un buen resultado para el personaje? En una prueba, el podio; en un partido, ganar. */
export const fueUnExito = (r: Pick<CompetitionResultData, 'position' | 'equipo'>): boolean => (r.equipo ? r.equipo.resultado === 'victoria' : r.position <= 3);

export interface DayEventData {
  day: number;
}

export interface WeekEventData {
  week: number;
}

export interface ActionDoneData {
  actionId: string;
  module: string;
  tags: readonly string[];
  duration: number;
  efficiency: number;
}
