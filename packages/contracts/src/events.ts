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
  /** data: DatoPersonalData — el personaje le ha preguntado a alguien su edad, su colegio, su clase, su profesión, su trabajo o sus gustos y ya lo sabe. */
  DATO_PERSONAL: 'persona.dato',
  /** data: PresentacionData — el personaje pregunta el nombre a alguien y se presentan: pasa de desconocido a conocido. */
  PRESENTACION: 'persona.presentarse',
} as const;

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

export interface CompetitionResultData {
  /** Módulo que la organiza (p. ej. 'atletismo'). */
  module: string;
  /** Nombre visible de la prueba (p. ej. '400 m'). */
  discipline: string;
  /** 1 = primero. */
  position: number;
  total: number;
  /** Marca del personaje, en la unidad de la prueba. */
  mark: number;
  unit: string;
  participants: { npcId?: string; name: string; mark: number; isPlayer?: boolean }[];
}

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
