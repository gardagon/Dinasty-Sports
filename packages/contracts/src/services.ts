/**
 * Servicios: la forma de que un módulo CONSULTE a otro sin importarlo.
 * El contrato (interfaz + clave) vive aquí; la implementación, en el módulo que lo publica.
 * Quien lo consume debe funcionar también si el servicio no existe (`ctx.service()` → undefined).
 */
export const SERVICES = {
  npcs: 'npcs',
  estudios: 'estudios',
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
  /** Etiquetas de acción en las que este NPC ayuda al personaje si la relación es buena. */
  supports: readonly string[];
  /** 0..100 */
  affinity: number;
  /** Niveles del NPC por disciplina (p. ej. { atletismo: 42 }). */
  levels: Readonly<Record<string, number>>;
  description?: string;
}

export interface NpcDirectory {
  list(filter?: { role?: NpcRole; tag?: string }): NpcView[];
  get(id: string): NpcView | undefined;
}

// ---------- Estudios ----------

export interface StudiesService {
  /** Media de las últimas notas (0..10), o null si aún no hay exámenes. */
  average(): number | null;
  /** Faltas de asistencia acumuladas. */
  absences(): number;
}
