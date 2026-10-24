import { GEN } from '@ds/contracts';

/**
 * Currículo escolar de España como DATO: las asignaturas de cada curso, desde 3.º de primaria (8 años) hasta
 * 2.º de bachillerato. Cada asignatura es una habilidad del personaje; las que no se cursan en el curso actual
 * quedan guardadas (con su valor) y no se entrenan ni puntúan. Al cambiar de etapa unas asignaturas se transforman
 * en otras (ciencias naturales → biología, ciencias sociales → historia) y heredan lo aprendido.
 */

export interface Asignatura {
  key: string;
  name: string;
  /** Horas de clase a la semana: reparten los días en que se da (de lunes a viernes, no todos los días tienen todas). */
  horas: number;
  /** Genéricas que aceleran la asignatura y marcan su dificultad (suman 1): con peores capacidades, se empieza más bajo, se sube más lento y se olvida más rápido. */
  apoyos: { stat: string; weight: number }[];
  /** Genérica extra que entrena estudiar esta asignatura (si la hay). */
  entrena?: { stat: string; amount: number };
  /** Asignatura de la que hereda el nivel cuando empieza a cursarse. */
  hereda?: string;
}

const apoyo = (stat: string, weight: number) => ({ stat, weight });

export const ASIGNATURAS: readonly Asignatura[] = [
  // Troncales de todas las etapas
  { key: 'lengua', horas: 4, name: 'Lengua', apoyos: [apoyo(GEN.inteligencia, 0.3), apoyo(GEN.comunicacion, 0.3), apoyo(GEN.concentracion, 0.25), apoyo(GEN.carisma, 0.15)], entrena: { stat: GEN.comunicacion, amount: 0.3 } },
  { key: 'matematicas', horas: 4, name: 'Matemáticas', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)] },
  { key: 'ingles', horas: 3, name: 'Inglés', apoyos: [apoyo(GEN.inteligencia, 0.3), apoyo(GEN.comunicacion, 0.3), apoyo(GEN.concentracion, 0.25), apoyo(GEN.carisma, 0.15)], entrena: { stat: GEN.comunicacion, amount: 0.2 } },
  { key: 'educacion_fisica', horas: 2, name: 'Educación física', apoyos: [apoyo(GEN.coordinacion, 0.3), apoyo(GEN.agilidad, 0.25), apoyo(GEN.resistencia, 0.25), apoyo(GEN.determinacion, 0.2)] },
  // Primaria
  { key: 'naturales', horas: 2, name: 'Ciencias naturales', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.atencion, 0.3), apoyo(GEN.creatividad, 0.3)], entrena: { stat: GEN.creatividad, amount: 0.3 } },
  { key: 'sociales', horas: 2, name: 'Ciencias sociales', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.atencion, 0.25), apoyo(GEN.empatia, 0.15)] },
  { key: 'artistica', horas: 1, name: 'Educación artística', apoyos: [apoyo(GEN.creatividad, 0.5), apoyo(GEN.coordinacion, 0.25), apoyo(GEN.atencion, 0.25)], entrena: { stat: GEN.creatividad, amount: 0.3 } },
  // ESO
  { key: 'biologia', horas: 3, name: 'Biología y geología', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.atencion, 0.3), apoyo(GEN.creatividad, 0.3)], hereda: 'naturales' },
  { key: 'historia', horas: 3, name: 'Geografía e historia', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.concentracion, 0.25), apoyo(GEN.empatia, 0.15)], hereda: 'sociales' },
  { key: 'tecnologia', horas: 2, name: 'Tecnología', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.creatividad, 0.3), apoyo(GEN.coordinacion, 0.3)] },
  { key: 'musica', horas: 2, name: 'Música', apoyos: [apoyo(GEN.creatividad, 0.4), apoyo(GEN.coordinacion, 0.3), apoyo(GEN.atencion, 0.3)], hereda: 'artistica' },
  { key: 'fisica_quimica', horas: 3, name: 'Física y química', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'naturales' },
  // Bachillerato
  { key: 'filosofia', horas: 2, name: 'Filosofía', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.creatividad, 0.2), apoyo(GEN.empatia, 0.15)] },
  { key: 'historia_espana', horas: 3, name: 'Historia de España', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.concentracion, 0.25), apoyo(GEN.empatia, 0.15)], hereda: 'historia' },
  { key: 'fisica', horas: 3, name: 'Física', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'fisica_quimica' },
  { key: 'quimica', horas: 3, name: 'Química', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'fisica_quimica' },
  { key: 'latin', horas: 3, name: 'Latín', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.concentracion, 0.25), apoyo(GEN.comunicacion, 0.2), apoyo(GEN.determinacion, 0.2)], hereda: 'lengua' },
  { key: 'historia_arte', horas: 3, name: 'Historia del arte', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.creatividad, 0.3), apoyo(GEN.atencion, 0.3)], hereda: 'historia' },
  { key: 'economia', horas: 3, name: 'Economía', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.concentracion, 0.25), apoyo(GEN.comunicacion, 0.15), apoyo(GEN.picardia, 0.2)] },
];

export const asignatura = (key: string): Asignatura => ASIGNATURAS.find((a) => a.key === key)!;

export type Modalidad = 'ciencias' | 'humanidades';
export type Etapa = 'primaria' | 'eso' | 'bachillerato';

export interface CursoDef {
  nombre: string;
  etapa: Etapa;
  /** Asignaturas del curso; en bachillerato, las de la modalidad elegida se añaden a las comunes. */
  asignaturas: readonly string[];
  modalidad?: Readonly<Record<Modalidad, readonly string[]>>;
}

const PRIMARIA = ['lengua', 'matematicas', 'naturales', 'sociales', 'ingles', 'educacion_fisica', 'artistica'];
const ESO_1 = ['lengua', 'matematicas', 'biologia', 'historia', 'ingles', 'educacion_fisica', 'tecnologia', 'musica'];
const ESO_2 = [...ESO_1, 'fisica_quimica'];
const ESO_3_4 = ['lengua', 'matematicas', 'biologia', 'fisica_quimica', 'historia', 'ingles', 'educacion_fisica', 'tecnologia'];
const MODALIDADES = {
  ciencias: ['matematicas', 'fisica', 'quimica'],
  humanidades: ['latin', 'historia_arte', 'economia'],
} as const;

/** Currículo de España. El curso 0 es 3.º de primaria (8 años); se cuenta desde el inicio de la partida. */
export const CURSOS_ESPANA: readonly CursoDef[] = [
  { nombre: '3.º de primaria', etapa: 'primaria', asignaturas: PRIMARIA },
  { nombre: '4.º de primaria', etapa: 'primaria', asignaturas: PRIMARIA },
  { nombre: '5.º de primaria', etapa: 'primaria', asignaturas: PRIMARIA },
  { nombre: '6.º de primaria', etapa: 'primaria', asignaturas: PRIMARIA },
  { nombre: '1.º de ESO', etapa: 'eso', asignaturas: ESO_1 },
  { nombre: '2.º de ESO', etapa: 'eso', asignaturas: ESO_2 },
  { nombre: '3.º de ESO', etapa: 'eso', asignaturas: ESO_3_4 },
  { nombre: '4.º de ESO', etapa: 'eso', asignaturas: ESO_3_4 },
  { nombre: '1.º de bachillerato', etapa: 'bachillerato', asignaturas: ['lengua', 'ingles', 'filosofia', 'educacion_fisica'], modalidad: MODALIDADES },
  { nombre: '2.º de bachillerato', etapa: 'bachillerato', asignaturas: ['lengua', 'ingles', 'historia_espana'], modalidad: MODALIDADES },
];

/** Primer curso en que se elige modalidad (bachillerato). */
export const CURSO_DE_MODALIDAD = 8;

/** El curso se cuenta desde el inicio; pasado el último se repite el último. */
export const cursoDef = (curso: number): CursoDef => CURSOS_ESPANA[Math.min(Math.max(0, curso), CURSOS_ESPANA.length - 1)];

export function asignaturasDelCurso(curso: number, modalidad: Modalidad = 'ciencias'): string[] {
  const c = cursoDef(curso);
  return [...c.asignaturas, ...(c.modalidad?.[modalidad] ?? [])];
}

/** Modalidad que le va mejor según sus notas: ciencias si las asignaturas de ciencias superan a las de letras. */
export function elegirModalidad(nivel: (key: string) => number): Modalidad {
  const ciencias = ['matematicas', 'biologia', 'fisica_quimica'].map(nivel);
  const letras = ['lengua', 'historia', 'ingles'].map(nivel);
  const m = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return m(ciencias) >= m(letras) ? 'ciencias' : 'humanidades';
}


/**
 * Días de la semana (0 = lunes ... 4 = viernes) en que se da cada asignatura del curso. Cada una ocupa tantos días como horas
 * tiene (máx. 5), repartidos con la misma separación y desplazados según su posición para que no coincidan todas.
 */
export function horarioSemanal(asignaturas: readonly string[]): Record<string, number[]> {
  const horario: Record<string, number[]> = {};
  asignaturas.forEach((k, i) => {
    const h = Math.min(5, Math.max(1, asignatura(k).horas));
    const desplazamiento = (i * 2) % 5;
    horario[k] = Array.from({ length: h }, (_, j) => (desplazamiento + Math.floor((j * 5) / h)) % 5).sort((a, b) => a - b);
  });
  return horario;
}

/** Día de la semana (0..4) del examen de una asignatura en la evaluación de un trimestre. Es fijo, y varias pueden coincidir. */
export type TipoDeExamen = 'parcial1' | 'parcial2' | 'global';

export function diaDeExamen(curso: number, trimestre: number, key: string, tipo: TipoDeExamen = 'global'): number {
  let h = curso * 7 + trimestre * 13 + (tipo === 'parcial1' ? 3 : tipo === 'parcial2' ? 5 : 0);
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return h % 5;
}
