import type { DatoPersonal } from './personas';
import type { LugarId } from './lugares';
import type { Practica } from './herencia';
import { descripcionDeDesconocido, nombreSegunEdad, type PerfilDelPersonaje, type RasgosDe } from './rasgos';
import type { EstadoDeJugador } from './estado-de-jugador';
import type { EstadisticasDeTemporada } from './estadisticas';
import type { LectorDePersona } from './lector';
import type { PistasDePuestos } from './deporte-datos';
/**
 * Servicios: la forma de que un módulo CONSULTE a otro sin importarlo.
 * El contrato (interfaz + clave) vive aquí; la implementación, en el módulo que lo publica.
 * Quien lo consume debe funcionar también si el servicio no existe (`ctx.service()` → undefined).
 */
export const SERVICES = {
  npcs: 'npcs',
  estudios: 'estudios',
  identidad: 'identidad',
  clubes: 'clubes',
  familia: 'familia',
  relaciones: 'relaciones',
  perks: 'perks',
  perfil: 'perfil',
  lugares: 'lugares',
  presencia: 'presencia',
  partidos: 'partidos',
  /** Lectura del cuerpo de las personas para el visualizador (`CuerpoService`, ver `cuerpo.ts`): cada módulo dueño de personas da el suyo con el mismo contrato. */
  /** Minutos reales de Educación física a la semana de un curso (`EducacionFisicaService`): los PNJ en edad escolar los suman a su actividad. */
  educacionFisica: 'estudios.educacion_fisica',
  cuerpoPersonaje: 'cuerpo.personaje',
  cuerpoNpcs: 'cuerpo.npcs',
  /** Sucesos pendientes de decidir, marcas y recuerdos (`SucesosService`, ver `sucesos/servicio.ts`). */
  sucesos: 'sucesos',
} as const;

// ---------- NPCs ----------

export type NpcRole = 'amigo' | 'companero' | 'rival' | 'entrenador' | 'profesor' | 'familia' | 'vecino';

export type Gender = 'f' | 'm';

export interface NpcView {
  id: string;
  /** Nombre completo (nombre de pila, compuesto o no, y apellidos). */
  name: string;
  /** Solo el nombre de pila («José Manuel»). Si falta (partidas guardadas), es la primera palabra del nombre. */
  nombrePila?: string;
  /** Apodo: puede salir al azar (José Manuel → Chema) o ponerlo el jugador. */
  apodo?: string;
  /** Cómo se le llama en los textos: el apodo si lo tiene y, si no, el nombre de pila entero. */
  nombreCorto: string;
  role: NpcRole;
  /** Para concordar los textos (entrenador/entrenadora, con él/con ella). */
  gender: Gender;
  /** Etiquetas libres: 'atleta', 'estudio', 'mentor'... */
  tags: readonly string[];
  /** Origen, apariencia, carácter, intereses y gustos (los rivales y el reparto los tienen; no se enseñan al jugador). */
  rasgos?: RasgosDe;
  /** Niveles del NPC por disciplina (p. ej. { atletismo: 42 }). */
  levels: Readonly<Record<string, number>>;
  /** Cómo está para jugar hoy (los que juegan a un deporte): cuánto rinde por su estado (1 = normal) y si está de baja por una lesión. */
  estadoDeJuego?: { eficiencia: number; baja: boolean };
  /** Edad de competición (año del curso menos año de nacimiento), si el NPC la tiene (los rivales sí). Define su categoría. */
  age?: number;
  /** Club al que pertenece, si tiene. */
  club?: string;
  /** Día de nacimiento (relativo al inicio de la partida) y años cumplidos hoy. Todas las personas lo tienen; la interfaz solo lo enseña si el personaje lo sabe (`sabe`). */
  nacimiento?: number;
  edadExacta?: number;
  /** Cumpleaños en formato corto («26/04»). */
  cumple?: string;
  /** Altura hoy (cm): a simple vista se ve respecto a la tuya; la cifra exacta solo la sabe la familia. */
  alturaCm?: number;
  /** Colegio al que va y clase (esta, solo si es del mismo colegio), si aplica. Vale lo que el personaje sepa (`sabe`). */
  colegio?: string;
  clase?: string;
  /** Profesión y lugar de trabajo de los adultos (los niños tienen colegio y clase). `profesionBasica` es lo que se ve sin preguntar (p. ej. «Profesor»). Valen lo que el personaje sepa (`sabe`). */
  profesion?: string;
  profesionBasica?: string;
  trabajo?: string;
  /** Qué le gusta (nombres de sus intereses, de más a menos). Solo viene si el personaje se lo ha preguntado (`sabe` incluye `gustos`). */
  gustos?: readonly string[];
  /** Perks (rasgos genéticos especiales) de rivales y hermanos, asignados al crearlos. La interfaz no los enseña: verlos es cosa de los eventos o de un personaje muy perspicaz (E3.4/E5.3). */
  perks?: { activos: string[]; pool: string[] };
  /** Profesorado: ids de las asignaturas (las stats, p. ej. `estudios.lengua`) que da; con ellas se pide tutoría. Vacío en el tutor y en quien no da asignaturas. */
  asignaturas?: readonly string[];
  /** Entrenadores: edades de los deportistas a los que entrenan (ambas incluidas). */
  edades?: readonly [number, number];
  /** Lo que el personaje sabe de esta persona (por defecto o porque se lo ha preguntado). */
  sabe?: readonly DatoPersonal[];
  /** ¿El personaje ya lo conoce? Los rivales se conocen al competir contra ellos. Ausente = sí. */
  known?: boolean;
  description?: string;
}

/**
 * Si el personaje puede entrar en el equipo de su categoría de un deporte (`NpcDirectory.plaza`). `libre`: hay sitio (o el equipo no tiene tope por categoría);
 * `por_merito`: está completo pero el personaje es mejor que alguien (saldría `peor`); `completo`: está completo y es peor que todos (no entra; `peor` es el peor de ellos).
 * En una prueba de acceso, `no_llega`: aunque haya hueco, la prueba no alcanza el mínimo del club en ese puesto (`peor` es el peor de ese puesto).
 */
export interface PlazaEnEquipo {
  estado: 'libre' | 'por_merito' | 'completo' | 'no_llega';
  peor?: { id: string; nombre: string; nivel: number };
  /** En los deportes con puestos, el puesto que el club ofrece al candidato: aquel en que entraría (con hueco en él o valiendo más que el peor de ese puesto). */
  puesto?: string;
  /** `completo` sin que nadie sea peor que él: hay hueco en el club, pero **no cabe en ningún equipo por el cupo de su puesto**, ni con las plazas de más que se pueden abrir. */
  sinCupo?: boolean;
  /** Con `libre`: cuántas plazas de más hay que abrirle al equipo (1–2) para que quepa en él al entrar. */
  plazasDeMas?: number;
}

/** Una prueba de acceso a un club (`plaza` con `prueba`): `nivel` y `puestos` son lo que valió la prueba y `puesto`, donde pide jugar (la plaza se mide en ese puesto; sin él, en el que más vale). */
export interface PruebaEnClub {
  puesto?: string;
  /** La prueba ya se pasó (el personaje entra ahora): solo se mide el puesto, sin pedir otra vez el mínimo del club. */
  yaPasada?: boolean;
}

/** Los jugadores que le faltan a un equipo en un grupo de puestos (`NpcDirectory.huecosPorGrupo`). */
export interface HuecoDeGrupo {
  grupo: string;
  /** «centrales», «porteros»… */
  nombre: string;
  puestos: readonly string[];
  /** Cuántos jugadores le faltan (cupo del grupo menos los que hay). */
  huecos: number;
  cupo: number;
}

/** El consejo del profesor de Educación Física: un deporte y, si tiene puestos, varios en los que podría funcionar. */
export interface ConsejoDeDeporte {
  deporte: string;
  nombre: string;
  /** Los puestos **sin lado** (`FamiliaDePuestos`): «lateral», no «lateral izquierdo» y «lateral derecho». `id` es el de la familia. */
  puestos: { id: string; nombre: string }[];
  /** El porqué, en cualidades ya escritas (`CualidadDePuesto.tiene`): lo que más te sube en esos puestos frente a los niños de tu edad. Vacío si no destacas en nada concreto. Sin cifras. */
  tiene?: string[];
  /** Los textos del deporte (`PuestosDeDeporte.pistas`) para componer el porqué. */
  pistas?: PistasDePuestos;
}

/** Cómo va el personaje para un puesto (sin lado): lo que te dice el profesor o el entrenador si le preguntas por él (`NpcDirectory.lecturaDePuesto`). Sin cifras. */
export interface LecturaDePuesto {
  deporte: string;
  familia: { id: string; nombre: string };
  /** `ya`: vales ya para ese puesto; `cerca`; `lejos`; `sinDatos`: nadie de tu edad con quien compararte. */
  nivel: 'ya' | 'cerca' | 'lejos' | 'sinDatos';
  /** Lo que ya tienes para él (cualidades escritas, de la que más suma a la que menos). */
  tiene: string[];
  /** Lo que te falta para él (cualidades escritas, lo que más te frena primero). */
  falta: string[];
  /** Las stats que más te frenan (ids, las que más pesan en el puesto y más lejos están de los de tu edad): con ellas el entrenador elige entrenamientos. */
  frenan: string[];
  pistas?: PistasDePuestos;
}

/** Quién vive con quién (hogares): los progenitores, los hijos y los hermanos de una persona, y el motivo de que falte uno de los dos progenitores. Solo con la ciudad con `hogares`. */
export interface FamiliaView {
  hogar: string;
  progenitores: readonly string[];
  hijos: readonly string[];
  hermanos: readonly string[];
  /** El progenitor que no vive en el hogar (familias monoparentales): quién era y por qué no está. */
  ausente?: { lado: 'padre' | 'madre'; motivo: 'separado' | 'fallecido' | 'desconocido'; nombre?: string };
  /** La calle del mapa en que vive el hogar (el resto, en otro barrio) y su portal. */
  calle?: string;
  portal?: number;
}

export interface NpcDirectory {
  /** La familia de una persona del mundo con hogares (progenitores, hijos, hermanos, el progenitor que falta), por sus ids; `undefined` si no tiene hogar. */
  familiaDe?(id: string): FamiliaView | undefined;
  /** `known`: solo las que el personaje conoce (true) o solo las que no (false). `tagORole`: las que llevan esa etiqueta o tienen ese rol (lo que pide un papel de un suceso con `tipo`). */
  list(filter?: { role?: NpcRole; tag?: string; tagORole?: string; minAge?: number; maxAge?: number; known?: boolean }): NpcView[];
  get(id: string): NpcView | undefined;
  /**
   * ¿Entra el personaje, con este nivel en el deporte, en el equipo de su categoría de un club? Solo los deportes con equipos por categoría tienen tope
   * (`EquipoDeDeporte.plantillaPorCategoria`); en el resto siempre hay sitio. En los deportes con puestos, `puestos` es lo que vale el candidato en cada uno y la plaza se mide por puesto.
   */
  plaza(deporte: string, club: string, nivel: number, puestos?: Readonly<Record<string, number>>, prueba?: PruebaEnClub): PlazaEnEquipo;
  /**
   * Dónde le faltan jugadores al equipo de la categoría del personaje en un club con puestos: un elemento por grupo de puestos (portero, centrales, laterales…) con menos jugadores que su cupo, con cuántos le faltan
   * (`huecos` = cupo − jugadores del grupo). Es la medida de «lo que más necesita» el entrenador. Vacío si el equipo no tiene huecos, está completo o el deporte no tiene puestos.
   */
  huecosPorGrupo?(deporte: string, club: string): HuecoDeGrupo[];
  /**
   * Lo que un profesor de Educación Física ve en el personaje: los deportes que le irían bien y, en los que tienen puestos, **varios puestos** donde podría funcionar (lo que percibe, sin cifras:
   * `VISION.md`, principio 7). Vacío si no ve nada claro.
   */
  consejoDeportivo?(): ConsejoDeDeporte[];
  /** Los puestos sin lado de cada deporte con puestos (para elegir por cuál preguntar). */
  familiasDePuestos?(): { deporte: string; nombre: string; familias: { id: string; nombre: string }[] }[];
  /** Cómo va el personaje para un puesto sin lado de un deporte (`familia` es el id de la familia o el de un puesto, que se lleva a su familia) (`LecturaDePuesto`), comparado con los de su edad y consigo mismo. `undefined` si el deporte no tiene puestos o no se puede medir. */
  lecturaDePuesto?(deporte: string, familia: string): LecturaDePuesto | undefined;
  /**
   * Lo que vale el equipo de un club en una categoría en cada habilidad del deporte (la media de sus jugadores, con valores reales): con ello el entrenador elige los ejercicios
   * de la sesión, **los mismos para todos los que entrenan juntos**, personaje incluido. `undefined` si el deporte no tiene jugadores con habilidades en ese equipo.
   */
  nivelesDelEquipo?(deporte: string, club: string, categoria: string): Readonly<Record<string, number>> | undefined;
  /**
   * Los jugadores de un equipo (club, categoría y letra A a D) para jugar un partido: cada uno con su puesto, lo que vale en cada puesto, su estado de hoy (condición física, forma, moral y salud) y su lector de
   * habilidades y capacidades. Con ellos el entrenador convoca y alinea, y el motor de partido los juega. Lo mismo para todos (`VISION.md`).
   */
  plantillaDelEquipo?(deporte: string, club: string, categoria: string, letra: string): JugadorDeEquipoView[];
  /** ¿Rota el entrenador a la plantilla de este equipo para que todos jueguen? Lo dicen los datos del deporte: el tipo de club (colegio o de fuera) y la categoría (`CategoriaDef.rotacionEn`). */
  rotaElEquipo?(deporte: string, club: string, categoria: string): boolean;
  /**
   * Los equipos que hay hoy en una categoría de un deporte de equipo (cada club con cada letra A a D que llega al mínimo de jugadores), con lo que vale cada uno y su nombre: con ellos se arma la liga. Vacío si el deporte no
   * tiene equipos por categoría.
   */
  equiposDeLaCategoria?(deporte: string, categoria: string): EquipoDelMundoView[];
  /** Los equipos femeninos de una categoría (los de las partidas con chicos y chicas, desde la edad en que se separan por sexo): no juegan la liga ni salen en `equiposDeLaCategoria`; sus jugadoras simulan que juegan partidos, sin resultados ni clasificación. */
  equiposFemeninosDeLaCategoria?(deporte: string, categoria: string): EquipoDelMundoView[];
  /**
   * El equipo (letra A a D) en el que juega el personaje en su club y categoría: el que le toca por lo que vale en su puesto, con las mismas reglas que a cualquier jugador (reparte a todos los miembros, él incluido). `undefined` si
   * no es de un club con equipos por categoría o su club no tiene equipos en esa categoría. Quien llama lo guarda al empezar la temporada: los equipos no cambian durante el curso.
   */
  equipoDelPersonaje?(deporte: string): { club: string; categoria: string; letra: string } | undefined;
  /**
   * Cómo queda el club del personaje en su categoría al acabar la temporada, con datos que un niño vería (quiénes son del club y en qué año de nacimiento, sin lo que valen): cuántos son ahora, quién cambia de categoría,
   * cuántos siguen y cuántos llegan de la categoría de abajo del club, frente al mínimo de niños que pide un equipo. No cuenta a los que se apuntarán o se irán en verano (no se saben). `undefined` si no es de un club
   * con equipos por categoría.
   */
  previsionDelClub?(deporte: string): PrevisionDelClubView | undefined;
}

/** Cómo queda el club del personaje en su categoría el curso que viene (`NpcDirectory.previsionDelClub`). */
export interface PrevisionDelClubView {
  /** Su categoría ahora y la del curso que viene (la misma si no sube). */
  categoria: { id: string; nombre: string };
  siguiente: { id: string; nombre: string };
  /** Si su club tendrá equipos en la categoría del curso que viene (los clubes de colegio acaban en cadete o juvenil). */
  hayEquipo: boolean;
  /** Niños de su club en su categoría ahora, él incluido. */
  ahora: number;
  /** Los que hacen falta para que exista un equipo. */
  minimo: number;
  /** Los equipos que tiene su club en la categoría del curso que viene (cada uno necesita el mínimo). */
  equipos: number;
  /** Los de su categoría que al acabar la temporada pasan a otra, con el nombre de la categoría (`a` falta si ya no tienen categoría a la que subir), por orden alfabético. */
  suben: { id: string; nombre: string; a?: string }[];
  /** Los que siguen en su categoría el curso que viene. */
  siguen: number;
  /** Los del club que hoy no están en la categoría del curso que viene y pasan a ella (de la categoría de abajo si él se queda; los compañeros que suben con él si sube). */
  llegan: number;
  /** Los que habrá el curso que viene en la categoría del curso que viene, contando solo a quienes ya son del club (él incluido). */
  quedan: number;
}

/** Un equipo de la liga tal como lo ve quien la organiza. */
export interface EquipoDelMundoView {
  /** Id único del equipo: `club|letra` (la plaza en la liga es del equipo del club, no de los niños). */
  id: string;
  club: string;
  letra: string;
  /** «Real Ciudad C. F. B». */
  nombre: string;
  /** Lo que vale (la media de sus once mejores en su puesto): con ello se reparten las divisiones al crear la partida. */
  fuerza: number;
  jugadores: number;
  /** ¿Juega en casa en las instalaciones de su club? (Los clubes grandes y medianos, sí; los pequeños y los colegios juegan en casa en el complejo municipal.) */
  campoPropio?: boolean;
}

/** Un jugador de un equipo, tal como lo ve quien organiza un partido. */
export interface JugadorDeEquipoView {
  id: string;
  nombre: string;
  /** El puesto en que juega en su equipo. */
  puesto: string;
  /** Lo que vale en cada puesto (0 a 100); vacío si el deporte no tiene puestos. */
  valores: Readonly<Record<string, number>>;
  /** Lo que vale en su puesto. */
  valor: number;
  estado: EstadoDeJugador;
  /** Su carácter, de 0 a 1: resiliencia (cuánto le afectan los resultados) y ambición. */
  resiliencia: number;
  ambicion: number;
  /** Qué parte de las sesiones del club hizo en las dos últimas semanas (de 0 a 1): la misma para el personaje y los PNJ. */
  asistencia: number;
  /** Lo disciplinado que es su entrenador (de 0 a 1): con uno disciplinado, faltar cuesta más el puesto. */
  disciplinaDelEntrenador: number;
  lector: LectorDePersona;
  /** El número de su camiseta en su equipo (`asignarDorsales`); sin él, el deporte no tiene dorsales. */
  dorsal?: number;
  /** Lo disciplinado que es, de 0 a 1 (cuánto llega a tiempo a las convocatorias). */
  disciplina?: number;
  /** Su relación con el entrenador, de 0 a 100 (50: neutra): baja si llega tarde a las convocatorias; solo la tiene guardada quien ha llegado tarde alguna vez. */
  relacionConElEntrenador?: number;
  /** Sus estadísticas de la temporada (partidos, titularidades, minutos, goles, asistencias y nota). */
  estadisticas?: EstadisticasDeTemporada;
  /** Su experiencia en cada puesto en que ha jugado (de 0 a 100). */
  experiencia?: Readonly<Record<string, number>>;
  /** Partidos de sanción que le quedan (una roja o la acumulación de amarillas): con ellos, el entrenador no lo convoca. */
  sancion?: number;
}

// ---------- Estudios ----------

/** Cómo pasa el verano el personaje según sus notas: academia obligatoria, campamento deportivo o tiempo con amigos. */
export type SummerPath = 'academia' | 'campamento' | 'amigos';

/** Un examen próximo o ya fijado en el calendario. */
export interface ExamInfo {
  /** Id de la habilidad de la asignatura. */
  subject: string;
  name: string;
  /** Primer o segundo parcial, o el global de la evaluación. */
  tipo: 'parcial1' | 'parcial2' | 'global';
  /** Día absoluto del examen. */
  day: number;
  /** Días que faltan (0 = hoy). */
  inDays: number;
}

/** Nivel con el que se ve una preparación (0..100 = nota esperada × 10): Mal, Regular, Bien, Muy bien o Excelente. */
export type NivelDeAsignatura = 'Mal' | 'Regular' | 'Bien' | 'Muy bien' | 'Excelente';

/** Educación física según el currículo y los horarios del país. */
export interface EducacionFisicaService {
  /** Minutos de clase de Educación física en una semana lectiva entera del curso (0 = el primero, 3.º de primaria; 0 si ese curso no la tiene o no existe). */
  minutosPorSemana(curso: number): number;
}

export interface StudiesService {
  /** Nivel de una asignatura con texto (Mal < 4, Regular 4–5,9, Bien 6–7,4, Muy bien 7,5–9,2, Excelente 9,3–10), o null si no existe. */
  levelText(subject: string): NivelDeAsignatura | null;
  /** Exámenes que caen en los próximos `days` días (incluido hoy), por orden. Se conocen una semana antes. */
  upcomingExams(days: number): ExamInfo[];
  /** Asignaturas (ids) que se dan en un día de la semana (0 = lunes ... 4 = viernes) del curso actual. */
  timetable(weekday: number): string[];
  /** Media de las últimas notas (0..10), o null si aún no hay exámenes. */
  average(): number | null;
  /** Faltas de asistencia acumuladas. */
  absences(): number;
  /** Faltas de clase de este trimestre (una por clase; se pone a cero al empezar cada trimestre). */
  absencesThisTerm(): number;
  /** Ids de las habilidades de las asignaturas que se cursan este curso (el resto no se entrena ni puntúa). */
  activeSubjects(): string[];
  /** Nombre del curso actual (p. ej. "1.º de ESO"). */
  courseName(): string;
  /** Últimas notas de exámenes de una asignatura (la más reciente al final). */
  grades(subject: string): number[];
  /** Notas medias de cada evaluación de trimestre, por orden. */
  reports(): { curso: number; trimestre: number; media: number }[];
  /** Cómo le toca pasar el verano según las notas del curso, o null si todavía no se sabe (o no es verano). */
  summerPath(): SummerPath | null;
}

// ---------- Identidad ----------

export type BodyType = 'delgado' | 'normal' | 'atletico' | 'musculado' | 'con_sobrepeso';

/** Lo que el personaje "es" por fuera: siempre visible, sin filtro de inteligencia. */
export interface IdentityView {
  /** Años cumplidos. */
  age: number;
  /** Edad de competición: año del curso menos año de nacimiento (no la fecha exacta). Define la categoría deportiva durante todo el curso. */
  seasonAge: number;
  heightCm: number;
  weightKg: number;
  leftHanded: boolean;
  bodyType: BodyType;
}

export interface IdentityService {
  view(): IdentityView;
}

/** Un perk tal como lo ve la interfaz. */
export interface PerkView {
  id: string;
  nombre: string;
  descripcion: string;
  /** Se expresa solo cuando un evento lo revela (en la fase de pruebas se enseñan todos). */
  latente: boolean;
  /** Un perk latente que el personaje ya ha descubierto (`perk.revelado`). */
  revelado?: boolean;
}

/** Origen, apariencia, carácter, intereses y gustos del personaje (hoy solo para pruebas y para la compatibilidad con los demás). */
export interface ProfileService {
  view(): PerfilDelPersonaje;
}

export interface PerksService {
  /** Perks que le afectan (como mucho 3) y los que lleva en su pool para sus hijos. */
  view(): { activos: PerkView[]; pool: PerkView[] };
}

// ---------- Familia ----------

export interface ParentView {
  id: 'padre' | 'madre';
  nombre: string;
  gender: Gender;
  /** Edad en años enteros hoy. */
  edad: number;
  alturaCm: number;
  /** Deporte al que se dedicó, si hizo alguno. */
  deporte?: string;
  practica: Practica;
  /** 0..100. Cuánto respalda al personaje en lo que hace. */
  /** Origen, apariencia, carácter, intereses y gustos. */
  rasgos: RasgosDe;
  /** Perks de este progenitor (activos y los que lleva en su pool). */
  perks: { activos: string[]; pool: string[] };
  apoyo: number;
  /** 0..100. Cuánto espera de él (en el deporte y en los estudios). */
  expectativas: number;
  /** 0..100. Tiempo que pasa en casa con él. */
  tiempoEnCasa: number;
}

export interface FamilyService {
  /** Apellidos de la familia. */
  apellidos: string;
  /** Padre y madre (la genética oculta no se expone). */
  parents(): ParentView[];
  /** Hermanos del personaje (0 a 3): personas con su propia vida, que viven en el directorio de personas con el rol `familia`. */
  siblings(): NpcView[];
}

// ---------- Clubes ----------

export interface ClubView {
  id: string;
  nombre: string;
  /** El club del colegio: entrenamientos de menor nivel que un club de fuera. */
  esColegio: boolean;
  /** 1 = colegio, 2 = club de la ciudad, 3 = alto rendimiento. Mejora la eficiencia de sus sesiones. */
  calidad: 1 | 2 | 3;
  deportes: readonly string[];
  /** Sesiones del club: días de la semana (0 = lunes) y franja horaria. */
  sesiones: { weekdays: readonly number[]; desde: number; hasta: number };
  /** Acceso por deporte: nivel mínimo (en la escala del deporte) y edad mínima. Sin entrada = abierto. */
  acceso?: Readonly<Record<string, { nivel: number; edadMin: number }>>;
  /** Día de la partida en que el personaje entró, solo en el club que devuelve `membership`. */
  desde?: number;
  /** Dónde entrena la sección de este deporte y dónde se hacen sus trámites (apuntarse, pruebas de acceso). */
  sede: string;
  tramites: string;
}

export interface ClubDirectory {
  /** Clubes que ofrecen un deporte. */
  list(sport: string): ClubView[];
  /** Club al que pertenece el personaje en ese deporte, si pertenece a alguno. */
  membership(sport: string): ClubView | undefined;
}

/** Cómo se describe a una persona por su aspecto, sin su nombre («un niño alto, de pelo corto…»): lo que se ve de quien aún no se conoce. */
export function aspectoDe(n: Pick<NpcView, 'age' | 'role' | 'tags' | 'rasgos' | 'gender'>): string {
  return n.rasgos ? descripcionDeDesconocido(n.rasgos.apariencia, n.gender, edadAparente(n)) : nombreSegunEdad(n.gender, edadAparente(n));
}

/**
 * La edad con la que se ve a una persona aunque no se sepa su fecha de nacimiento (el reparto inicial no la tiene): el profesorado y los
 * entrenadores, adultos; los compañeros de clase, niños de la edad del curso.
 */
export function edadAparente(n: Pick<NpcView, 'age' | 'role' | 'tags'>): number | undefined {
  if (n.age !== undefined) return n.age;
  if (n.role === 'profesor' || n.role === 'entrenador') return 40;
  if (n.tags.includes('progenitor')) return 42;
  if (n.role === 'companero' || n.role === 'amigo') return 8;
  return undefined;
}


/**
 * **Lo que hace un jugador del mundo el día de su partido** (`MOTOR_PARTIDOS.md` §15), con las mismas reglas que el personaje: el entrenador lo convoca una hora antes; llega (puntual o tarde, según su carácter); espera con los
 * compañeros en el campo (y ve el partido anterior de ese campo, que le da conocimiento); pasa al vestuario media hora antes; juega; y vuelve al vestuario. Lo da el deporte (el fútbol) y lo usa `npcs` para ponerlo en el mapa.
 * Todos los tiempos son minutos absolutos de la partida.
 */
export interface PartidoDeJugador {
  /** Día de la semana del partido (0 = lunes). */
  dia: number;
  /** Hora del partido. */
  saque: number;
  /** Cuándo llega al campo (la hora de la convocatoria más lo que se retrasa). */
  llegada: number;
  /** Minutos que llega tarde a la convocatoria. */
  tarde: number;
  /** Conocimiento del deporte que gana viendo el partido anterior de su campo mientras espera. */
  conocimiento: number;
  /** Dónde espera, juega y se cambia (lugares del mapa). */
  campo: LugarId;
  vestuario: LugarId;
}

export interface PartidosService {
  /** Cambia cuando cambia el calendario de partidos (cada semana): quien guarda algo calculado con él sabe cuándo recalcularlo. */
  readonly version: string;
  /** El partido de esta semana de un jugador del mundo, si está convocado y se presenta; `undefined` si no. */
  deJugador(npcId: string): PartidoDeJugador | undefined;
  /** El partido de esta semana de un equipo (de su club, categoría y letra) para quien lo lleva —su entrenador—: está en el campo desde la convocatoria, a la hora (sin retraso). */
  deEquipo(club: string, categoria: string, letra: string): PartidoDeJugador | undefined;
  /** Los partidos de esta semana (de todas las categorías), con su hora, para quien quiera verlos: `saque` en minutos absolutos de la partida. */
  deLaSemana(): { id: string; categoria: string; local: string; visitante: string; saque: number; campo: string; lugar: LugarId }[];
}
