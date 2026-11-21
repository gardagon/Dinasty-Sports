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
  /** data: PlazaPerdidaData — el personaje habría perdido su plaza en los fichajes de verano pero sigue en el equipo con una plaza de más (se pasa 1–2 del máximo): el entrenador le avisa de que contará menos con él (suceso `<deporte>.plaza_extra`). Sigue siendo del club; puede ir a probar a otros. */
  PLAZA_EXTRA: 'club.plaza_extra',
  /** data: EquipoSinNinosData — al empezar el curso, el equipo del personaje no existe este año: su club no tiene niños suficientes en su categoría (el equipo se cierra) o no tiene equipo en la categoría a la que sube. Sale del club como cualquier niño y tiene que buscarse equipo (suceso `<deporte>.equipo_sin_ninos`). */
  EQUIPO_SIN_NINOS: 'club.equipo_sin_ninos',
  /** Al empezar el curso, el entrenador le propone al personaje jugar en otro puesto (sobran en el suyo y faltan en otro): decide él. */
  PROPUESTA_DE_PUESTO: 'club.propuesta_de_puesto',
  /** data: PruebaEmpiezaData — el personaje se presenta a la prueba de acceso de un club con puestos: el entrenador se presenta y, si faltan jugadores en varios puestos, le pregunta dónde quiere jugar. */
  PRUEBA_EMPIEZA: 'club.prueba_empieza',
  /** data: PruebaPuestoData — el puesto en que le van a probar (el que eligió entre los huecos o, sin él, el que decida el entrenador): lo apunta el deporte para medir la plaza. */
  PRUEBA_PUESTO: 'club.prueba_puesto',
  /** data: PuestoPropuestoData (solo `sport`) — el personaje le ha pedido a su entrenador jugar en otro puesto por un camino que no es la ficha (p. ej. en el primer entrenamiento): cuenta para el plazo de la ficha (`PEDIR_PUESTO`). */
  PETICION_DE_PUESTO: 'club.peticion_de_puesto',
  /** data: PidePuestoData — el personaje le pide a su entrenador jugar en otro puesto (desde su ficha): un suceso decide con una tirada. */
  PIDE_PUESTO: 'club.pide_puesto',
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
  /** data: IrAData (`lugares.ts`) — un módulo lleva al personaje a un sitio sin viaje (a una zona de `soloPorEvento`, como el vestuario de un campo): lo recoge `lugares`. */
  IR_A: 'lugares.ir_a',
  /** data: ClubImpuntualData — el personaje ha llegado tarde a una convocatoria de su equipo: su entrenador pierde relación con él. */
  CLUB_IMPUNTUAL: 'club.impuntual',
  /** data: PartidoDelMundoData — se ha jugado un partido de un deporte de equipo entre PNJ (o con el personaje): el estado de quienes jugaron cambia como tras una carrera. */
  PARTIDO_MUNDO: 'partido.mundo',
  /** data: CambioDeRelacionData — algo que ha pasado (un suceso) cambia el vínculo del personaje con alguien: lo aplica `relaciones` con sus reglas. */
  CAMBIO_DE_RELACION: 'relacion.cambio',
  /** data: CambioDeFamiliaData — algo que ha pasado cambia el apoyo o las expectativas de un progenitor: lo aplica `familia`. */
  CAMBIO_DE_FAMILIA: 'familia.cambio',
  /** data: CambioDeCaracterData — una decisión mueve los ejes de carácter del personaje: lo aplica quien guarda su perfil. */
  CAMBIO_DE_CARACTER: 'perfil.caracter',
  /** data: PerkReveladoData — el personaje descubre un perk latente que tenía: lo apunta quien guarda sus perks. */
  PERK_REVELADO: 'perk.revelado',
  /** data: ClubImpuntualData — el personaje se ha incorporado tarde a una sesión de entrenamiento de su club (más de `TOLERANCIA_DE_SESION` minutos). No cambia nada por sí sola: quien quiera contarlo lo recoge. */
  SESION_TARDE: 'club.sesion_tarde',
  /** data: LesionDePersonaData — una persona del mundo se ha lesionado esta semana (su baja ya está en su estado): quien quiera contarlo o darle consecuencias lo recoge. */
  LESION_DE_PERSONA: 'persona.lesion',
  /** data: EstadoDePersonaData — algo que ha pasado cambia el estado de juego de una persona del mundo (moral, forma, condición, salud, semanas de baja): lo aplica quien la guarda. */
  ESTADO_DE_PERSONA: 'persona.estado',
} as const;

export interface LesionDePersonaData {
  npcId: string;
  /** Semanas de baja. */
  semanas: number;
  deporte: string;
}

/** Cambios (se suman) en el estado de juego de una persona: los mismos campos que `EstadoDeJugador`. */
export interface CambioDeEstadoDeJugador {
  moral?: number;
  forma?: number;
  fisica?: number;
  salud?: number;
  /** Semanas de baja de más o de menos (nunca deja a un lesionado con menos de una, ni lesiona a quien está sano). */
  baja?: number;
}

export interface EstadoDePersonaData extends CambioDeEstadoDeJugador {
  npcId: string;
}

export interface CambioDeRelacionData {
  npcId: string;
  /** Puntos de afinidad y de confianza que se suman (pueden ser negativos). */
  afinidad?: number;
  confianza?: number;
  /** Qué lo ha causado (el id del suceso), para el registro. */
  motivo?: string;
}

export interface CambioDeFamiliaData {
  /** Id de la persona (el progenitor). */
  npcId: string;
  apoyo?: number;
  expectativas?: number;
}

export interface CambioDeCaracterData {
  /** Puntos que se mueve cada eje (de −50 a 50). */
  ejes: Readonly<Record<string, number>>;
}

export interface PerkReveladoData {
  perk: string;
}

/** Minutos de retraso que no cuentan al incorporarse a una sesión del club. */
export const TOLERANCIA_DE_SESION = 10;

/** El personaje llegó tarde a la convocatoria de un partido (`minutos` después de la hora en que se convoca). */
export interface ClubImpuntualData {
  sport: string;
  minutos: number;
}

/** Lo que cada jugador de un partido deja en su estado: cuánto jugó y cómo le fue, de −1 (lo peor) a +1 (lo mejor), con lo que cambian su moral y su forma. */
export interface JugadorDelPartido {
  npcId: string;
  minutos: number;
  /** De −1 a +1: el resultado y su nota. Cambia la moral y la forma como el puesto en una carrera (`trasUnaCompeticion`). Con 0 minutos (convocado que no jugó) no cambia la forma, pero su moral baja (`trasElBanquillo`). */
  valoracion: number;
  /** Para sus estadísticas y su experiencia (F2.4): de titular o no, el puesto en que acabó, sus goles y asistencias, su nota (1 a 10) y cuánto aprende jugando (`aprendizajeDe`). */
  titular?: boolean;
  puesto?: string;
  goles?: number;
  asistencias?: number;
  nota?: number;
  aprendizaje?: number;
  /** El día de partido (`MOTOR_PARTIDOS.md` §15): cuánto conocimiento del deporte ganó viendo el partido anterior de su campo mientras esperaba, y, solo si fue impuntual (más de 10 minutos tarde), cuántos llegó tarde a la convocatoria: su entrenador pierde relación con él. Las mismas reglas que el personaje. */
  conocimiento?: number;
  tarde?: number;
  /** Estaba convocado y no se presentó (0 minutos): cuenta como una falta (`FALTA_A_PARTIDO`), como para el personaje; su equipo jugó sin él. */
  falta?: boolean;
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

/** Por qué el equipo del personaje no sigue (`EQUIPO_SIN_NINOS`): `pocos` (el club no reúne el mínimo de niños en su categoría: el equipo se cierra) o `sin_categoria` (el club no tiene equipos en la categoría a la que sube). */
export type MotivoDeEquipoSinNinos = 'pocos' | 'sin_categoria';

export interface EquipoSinNinosData {
  sport: string;
  clubId: string;
  motivo: MotivoDeEquipoSinNinos;
  /** Con `pocos`: cuántos niños (con él) quedaban en la categoría y cuántos pide un equipo. */
  jugadores?: number;
  minimo?: number;
}

/** La propuesta de puesto del entrenador al personaje (`PROPUESTA_DE_PUESTO`) o el puesto al que cambia (`CAMBIO_DE_PUESTO`). */
export interface PuestoPropuestoData {
  sport: string;
  puesto: string;
}

/**
 * `PRUEBA_EMPIEZA`: `huecos` son los puestos donde al equipo le faltan jugadores; `participants`, el entrenador que le atiende. `nGrupos` es en cuántos grupos de puestos (porteros, centrales…) falta gente
 * y `necesita`, lo que el entrenador dice que necesita: los dos grupos en que más le faltan («centrales y laterales»), o vacío si faltan en más de dos (dice «varios»).
 */
export interface PruebaEmpiezaData {
  sport: string;
  club: string;
  huecos: string[];
  nHuecos: number;
  nGrupos: number;
  necesita: string;
  participants: { npcId: string }[];
}

/** `PRUEBA_PUESTO`: sin `puesto`, decide el entrenador (el que más vale, prefiriendo un hueco). */
export interface PruebaPuestoData {
  sport: string;
  puesto?: string;
}

/** `PIDE_PUESTO`: `ventaja` es lo que vale más (o menos, si es negativa) en el puesto que pide que en el suyo; `diasDesdeLaUltima`, los días desde que se lo pidió por última vez (o 999). */
export interface PidePuestoData {
  sport: string;
  puesto: string;
  puestoNombre: string;
  ventaja: number;
  diasDesdeLaUltima: number;
  participants: { npcId: string }[];
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
  /** Minutos que llegó tarde (0 si entró a su hora). */
  tarde?: number;
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
