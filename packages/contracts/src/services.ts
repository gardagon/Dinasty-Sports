import type { Practica } from './herencia';
import type { PerfilDelPersonaje, RasgosDe } from './rasgos';
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
} as const;

// ---------- NPCs ----------

export type NpcRole = 'amigo' | 'companero' | 'rival' | 'entrenador' | 'profesor' | 'familia';

export type Gender = 'f' | 'm';

export interface NpcView {
  id: string;
  name: string;
  role: NpcRole;
  /** Para concordar los textos (entrenador/entrenadora, con él/con ella). */
  gender: Gender;
  /** Etiquetas libres: 'atleta', 'estudio', 'mentor'... */
  tags: readonly string[];
  /** Origen, apariencia, carácter, intereses y gustos (los rivales y el reparto los tienen; no se enseñan al jugador). */
  rasgos?: RasgosDe;
  /** Etiquetas de acción en las que este NPC ayuda al personaje si la relación es buena. */
  supports: readonly string[];
  /** Niveles del NPC por disciplina (p. ej. { atletismo: 42 }). */
  levels: Readonly<Record<string, number>>;
  /** Edad de competición (año del curso menos año de nacimiento), si el NPC la tiene (los rivales sí). Define su categoría. */
  age?: number;
  /** Club al que pertenece, si tiene. */
  club?: string;
  /** ¿El personaje ya lo conoce? Los rivales se conocen al competir contra ellos. Ausente = sí. */
  known?: boolean;
  description?: string;
}

export interface NpcDirectory {
  list(filter?: { role?: NpcRole; tag?: string; minAge?: number; maxAge?: number }): NpcView[];
  get(id: string): NpcView | undefined;
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
  /** Ids de las habilidades de las asignaturas que se cursan este curso (el resto no se entrena ni puntúa). */
  activeSubjects(): string[];
  /** Nombre del curso actual (p. ej. "1.º de ESO"). */
  courseName(): string;
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
}

export interface ClubDirectory {
  /** Clubes que ofrecen un deporte. */
  list(sport: string): ClubView[];
  /** Club al que pertenece el personaje en ese deporte, si pertenece a alguno. */
  membership(sport: string): ClubView | undefined;
}
