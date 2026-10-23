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
  /** Genéricas que aceleran la asignatura (suman 1). El techo reparte 0,45 entre las mismas. */
  apoyos: { stat: string; weight: number }[];
  /** Genérica extra que entrena estudiar esta asignatura (si la hay). */
  entrena?: { stat: string; amount: number };
  /** Asignatura de la que hereda el nivel cuando empieza a cursarse. */
  hereda?: string;
}

const apoyo = (stat: string, weight: number) => ({ stat, weight });

export const ASIGNATURAS: readonly Asignatura[] = [
  // Troncales de todas las etapas
  { key: 'lengua', name: 'Lengua', apoyos: [apoyo(GEN.inteligencia, 0.3), apoyo(GEN.comunicacion, 0.3), apoyo(GEN.concentracion, 0.25), apoyo(GEN.carisma, 0.15)], entrena: { stat: GEN.comunicacion, amount: 0.3 } },
  { key: 'matematicas', name: 'Matemáticas', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)] },
  { key: 'ingles', name: 'Inglés', apoyos: [apoyo(GEN.inteligencia, 0.3), apoyo(GEN.comunicacion, 0.3), apoyo(GEN.concentracion, 0.25), apoyo(GEN.carisma, 0.15)], entrena: { stat: GEN.comunicacion, amount: 0.2 } },
  { key: 'educacion_fisica', name: 'Educación física', apoyos: [apoyo(GEN.coordinacion, 0.3), apoyo(GEN.agilidad, 0.25), apoyo(GEN.resistencia, 0.25), apoyo(GEN.determinacion, 0.2)] },
  // Primaria
  { key: 'naturales', name: 'Ciencias naturales', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.atencion, 0.3), apoyo(GEN.creatividad, 0.3)], entrena: { stat: GEN.creatividad, amount: 0.3 } },
  { key: 'sociales', name: 'Ciencias sociales', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.atencion, 0.25), apoyo(GEN.empatia, 0.15)] },
  { key: 'artistica', name: 'Educación artística', apoyos: [apoyo(GEN.creatividad, 0.5), apoyo(GEN.coordinacion, 0.25), apoyo(GEN.atencion, 0.25)], entrena: { stat: GEN.creatividad, amount: 0.3 } },
  // ESO
  { key: 'biologia', name: 'Biología y geología', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.atencion, 0.3), apoyo(GEN.creatividad, 0.3)], hereda: 'naturales' },
  { key: 'historia', name: 'Geografía e historia', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.concentracion, 0.25), apoyo(GEN.empatia, 0.15)], hereda: 'sociales' },
  { key: 'tecnologia', name: 'Tecnología', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.creatividad, 0.3), apoyo(GEN.coordinacion, 0.3)] },
  { key: 'musica', name: 'Música', apoyos: [apoyo(GEN.creatividad, 0.4), apoyo(GEN.coordinacion, 0.3), apoyo(GEN.atencion, 0.3)], hereda: 'artistica' },
  { key: 'fisica_quimica', name: 'Física y química', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'naturales' },
  // Bachillerato
  { key: 'filosofia', name: 'Filosofía', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.creatividad, 0.2), apoyo(GEN.empatia, 0.15)] },
  { key: 'historia_espana', name: 'Historia de España', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.concentracion, 0.25), apoyo(GEN.empatia, 0.15)], hereda: 'historia' },
  { key: 'fisica', name: 'Física', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'fisica_quimica' },
  { key: 'quimica', name: 'Química', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'fisica_quimica' },
  { key: 'latin', name: 'Latín', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.concentracion, 0.25), apoyo(GEN.comunicacion, 0.2), apoyo(GEN.determinacion, 0.2)], hereda: 'lengua' },
  { key: 'historia_arte', name: 'Historia del arte', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.creatividad, 0.3), apoyo(GEN.atencion, 0.3)], hereda: 'historia' },
  { key: 'economia', name: 'Economía', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.concentracion, 0.25), apoyo(GEN.comunicacion, 0.15), apoyo(GEN.picardia, 0.2)] },
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
