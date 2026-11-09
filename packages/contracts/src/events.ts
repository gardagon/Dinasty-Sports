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
  /** data: PlazaPerdidaData — un jugador del mundo con mejor nivel ha ocupado la plaza del personaje en su equipo: sale del club, como cualquier niño, y decide él qué hace. */
  PLAZA_PERDIDA: 'club.plaza_perdida',
  /** Al empezar el curso, el entrenador le propone al personaje jugar en otro puesto (sobran en el suyo y faltan en otro): decide él. */
  PROPUESTA_DE_PUESTO: 'club.propuesta_de_puesto',
  /** El personaje acepta el cambio de puesto que le propuso su entrenador: el equipo cuenta con él en el nuevo. */
  CAMBIO_DE_PUESTO: 'club.cambio_de_puesto',
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
  /** data: CompeticionDelMundoData — se ha disputado una competición entre PNJ (o con el personaje): cada jugador guarda su historial y su ánimo cambia. */
  COMPETICION_MUNDO: 'competicion.mundo',
  /** data: PartidoDelMundoData — se ha jugado un partido de un deporte de equipo entre PNJ (o con el personaje): el estado de quienes jugaron cambia como tras una carrera. */
  PARTIDO_MUNDO: 'partido.mundo',
} as const;

/** Lo que cada jugador de un partido deja en su estado: cuánto jugó y cómo le fue, de −1 (lo peor) a +1 (lo mejor), con lo que cambian su moral y su forma. */
export interface JugadorDelPartido {
  npcId: string;
  minutos: number;
  /** De −1 a +1: el resultado y su nota. Cambia la moral y la forma como el puesto en una carrera (`trasUnaCompeticion`). */
  valoracion: number;
}

/** Un partido jugado (de la liga de cualquier categoría): los que jugaron, para que su condición, su moral y su forma cambien con las mismas reglas que tras una carrera. */
export interface PartidoDelMundoData {
  deporte: string;
  semana: number;
  curso?: number;
  categoria: string;
  jugadores: JugadorDelPartido[];
}

/** Una prueba disputada entre jugadores de la población (de cualquier categoría, con o sin el personaje): quién corrió y cómo le fue. */
export interface PruebaDelMundo {
  /** `regular`, `semifinal` o `final`. */
  tipo: string;
  categoria: string;
  /** `puesto` y `total` son los de la clasificación general (todas las series juntas por tiempos); `serie` es la suya (de 1). */
  resultados: { npcId: string; puesto: number; total: number; marca: number; serie?: number }[];
}

/** Las pruebas del mundo de una semana: con ellas cada jugador guarda su historial y le cambian la moral, la forma y la condición (mismas reglas para todos). */
export interface CompeticionDelMundoData {
  deporte: string;
  /** Semana absoluta de la partida y curso (para el historial por temporada). */
  semana: number;
  curso?: number;
  pruebas: PruebaDelMundo[];
}

export interface DeporteAnadidoData {
  /** Id del deporte (el de su ficha). */
  deporte: string;
}

export interface PresentacionData {
  npcId: string;
}

export interface PlazaPerdidaData {
  sport: string;
  clubId: string;
}

/** La propuesta de puesto del entrenador al personaje (`PROPUESTA_DE_PUESTO`) o el puesto al que cambia (`CAMBIO_DE_PUESTO`). */
export interface PuestoPropuestoData {
  sport: string;
  puesto: string;
}

export interface ClubJoinData {
  /** Deporte (p. ej. 'atletismo'). */
  sport: string;
  /** Nivel del personaje en el deporte al entrar (0 a 100): si el equipo está completo, entra quitando la plaza de alguien peor. */
  nivel?: number;
  /** En los deportes con puestos, el puesto en que entra (el que le ofrece el club): el equipo mide la plaza y el desplazado en ese puesto. */
  puesto?: string;
  /** Si entra tras una prueba de acceso: lo que valió la prueba en cada puesto. El equipo mide la plaza (y a quién desplaza) con ello, en `puesto`, como en la prueba. */
  valores?: Record<string, number>;
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
