import { CLASES_POR_DIA, CURSOS_ESPANA, DIAS_LECTIVOS, GEN, HORAS_DE_ASIGNATURA, clasesPorSemana, type CursoDef, type Modalidad } from '@ds/contracts';

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
  /** Parte de la nota que depende de las habilidades y no del estudio (0 a 1): Educación física va con el deporte y Artística con lo creativo; estudiar ayuda, pero importan las skills. */
  practica?: number;
  /**
   * Asignatura de capacidades (Educación física, Artística, Música): no se estudia. Su nivel sale **directamente de las capacidades que la
   * apoyan** frente a lo típico de la edad (física: coordinación, agilidad, resistencia...; artística: creatividad), y lo que sube a ir a clase
   * son esas capacidades, no la asignatura. No tiene «Estudiar», ni repaso, ni tutoría, ni olvido: se mejora entrenando (en el deporte, jugando,
   * creando).
   */
  porCapacidades?: boolean;
  /** Lo que entrena una clase de esta asignatura a sus capacidades (suma de lo que sube cada una, repartida por sus pesos). Solo con `porCapacidades`. */
  entrenoDeClase?: number;
  /** Nota mínima que se saca presentándose al examen: en Educación física no se suspende (5). */
  notaMinima?: number;
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
  { key: 'lengua', horas: HORAS_DE_ASIGNATURA.lengua, name: 'Lengua', apoyos: [apoyo(GEN.inteligencia, 0.3), apoyo(GEN.comunicacion, 0.3), apoyo(GEN.concentracion, 0.25), apoyo(GEN.carisma, 0.15)], entrena: { stat: GEN.comunicacion, amount: 0.3 } },
  { key: 'matematicas', horas: HORAS_DE_ASIGNATURA.matematicas, name: 'Matemáticas', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)] },
  { key: 'ingles', horas: HORAS_DE_ASIGNATURA.ingles, name: 'Inglés', apoyos: [apoyo(GEN.inteligencia, 0.3), apoyo(GEN.comunicacion, 0.3), apoyo(GEN.concentracion, 0.25), apoyo(GEN.carisma, 0.15)], entrena: { stat: GEN.comunicacion, amount: 0.2 } },
  { key: 'educacion_fisica', porCapacidades: true, entrenoDeClase: 0.6, notaMinima: 5, horas: HORAS_DE_ASIGNATURA.educacion_fisica, name: 'Educación física', apoyos: [apoyo(GEN.coordinacion, 0.25), apoyo(GEN.agilidad, 0.25), apoyo(GEN.resistencia, 0.25), apoyo(GEN.velocidad, 0.15), apoyo(GEN.fuerza, 0.1)] },
  // Primaria
  { key: 'naturales', horas: HORAS_DE_ASIGNATURA.naturales, name: 'Ciencias naturales', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.atencion, 0.3), apoyo(GEN.creatividad, 0.3)], entrena: { stat: GEN.creatividad, amount: 0.3 } },
  { key: 'sociales', horas: HORAS_DE_ASIGNATURA.sociales, name: 'Ciencias sociales', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.atencion, 0.25), apoyo(GEN.empatia, 0.15)] },
  { key: 'artistica', porCapacidades: true, entrenoDeClase: 0.25, horas: HORAS_DE_ASIGNATURA.artistica, name: 'Educación artística', apoyos: [apoyo(GEN.creatividad, 0.6), apoyo(GEN.coordinacion, 0.2), apoyo(GEN.atencion, 0.2)] },
  // ESO
  { key: 'biologia', horas: HORAS_DE_ASIGNATURA.biologia, name: 'Biología y geología', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.atencion, 0.3), apoyo(GEN.creatividad, 0.3)], hereda: 'naturales' },
  { key: 'historia', horas: HORAS_DE_ASIGNATURA.historia, name: 'Geografía e historia', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.concentracion, 0.25), apoyo(GEN.empatia, 0.15)], hereda: 'sociales' },
  { key: 'tecnologia', practica: 0.3, horas: HORAS_DE_ASIGNATURA.tecnologia, name: 'Tecnología', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.creatividad, 0.3), apoyo(GEN.coordinacion, 0.3)] },
  { key: 'musica', porCapacidades: true, entrenoDeClase: 0.25, horas: HORAS_DE_ASIGNATURA.musica, name: 'Música', apoyos: [apoyo(GEN.creatividad, 0.6), apoyo(GEN.coordinacion, 0.2), apoyo(GEN.atencion, 0.2)] },
  { key: 'fisica_quimica', horas: HORAS_DE_ASIGNATURA.fisica_quimica, name: 'Física y química', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'naturales' },
  // Bachillerato
  { key: 'filosofia', horas: HORAS_DE_ASIGNATURA.filosofia, name: 'Filosofía', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.creatividad, 0.2), apoyo(GEN.empatia, 0.15)] },
  { key: 'historia_espana', horas: HORAS_DE_ASIGNATURA.historia_espana, name: 'Historia de España', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.comunicacion, 0.25), apoyo(GEN.concentracion, 0.25), apoyo(GEN.empatia, 0.15)], hereda: 'historia' },
  { key: 'fisica', horas: HORAS_DE_ASIGNATURA.fisica, name: 'Física', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'fisica_quimica' },
  { key: 'quimica', horas: HORAS_DE_ASIGNATURA.quimica, name: 'Química', apoyos: [apoyo(GEN.inteligencia, 0.45), apoyo(GEN.concentracion, 0.35), apoyo(GEN.determinacion, 0.2)], hereda: 'fisica_quimica' },
  { key: 'latin', horas: HORAS_DE_ASIGNATURA.latin, name: 'Latín', apoyos: [apoyo(GEN.inteligencia, 0.35), apoyo(GEN.concentracion, 0.25), apoyo(GEN.comunicacion, 0.2), apoyo(GEN.determinacion, 0.2)], hereda: 'lengua' },
  { key: 'historia_arte', horas: HORAS_DE_ASIGNATURA.historia_arte, name: 'Historia del arte', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.creatividad, 0.3), apoyo(GEN.atencion, 0.3)], hereda: 'historia' },
  { key: 'economia', horas: HORAS_DE_ASIGNATURA.economia, name: 'Economía', apoyos: [apoyo(GEN.inteligencia, 0.4), apoyo(GEN.concentracion, 0.25), apoyo(GEN.comunicacion, 0.15), apoyo(GEN.picardia, 0.2)] },
];

export const asignatura = (key: string): Asignatura => ASIGNATURAS.find((a) => a.key === key)!;

export type { CursoDef, Etapa, Modalidad } from '@ds/contracts';
export { CURSOS_ESPANA } from '@ds/contracts';

/** El curso se cuenta desde el inicio; pasado el último se repite el último. Los cursos son los del país de la partida (por defecto, España). */
export const cursoDef = (curso: number, cursos: readonly CursoDef[] = CURSOS_ESPANA): CursoDef => cursos[Math.min(Math.max(0, curso), cursos.length - 1)];

/** Las listas no cambian: se calculan una vez por curso y modalidad (se consultan en cada acción). No se deben modificar. */
const POR_CURSO = new WeakMap<readonly CursoDef[], Map<string, string[]>>();

export function asignaturasDelCurso(curso: number, modalidad: Modalidad = 'ciencias', cursos: readonly CursoDef[] = CURSOS_ESPANA): string[] {
  const clave = `${Math.min(Math.max(0, curso), cursos.length - 1)}:${modalidad}`;
  let porClave = POR_CURSO.get(cursos);
  if (!porClave) POR_CURSO.set(cursos, (porClave = new Map()));
  let lista = porClave.get(clave);
  if (!lista) {
    const c = cursoDef(curso, cursos);
    porClave.set(clave, (lista = Object.freeze([...c.asignaturas, ...(c.modalidad?.[modalidad] ?? [])]) as string[]));
  }
  return lista;
}

/** Modalidad que le va mejor según sus notas: ciencias si las asignaturas de ciencias superan a las de letras. */
export function elegirModalidad(nivel: (key: string) => number): Modalidad {
  const ciencias = ['matematicas', 'biologia', 'fisica_quimica'].map(nivel);
  const letras = ['lengua', 'historia', 'ingles'].map(nivel);
  const m = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return m(ciencias) >= m(letras) ? 'ciencias' : 'humanidades';
}


/** Clases al día y días lectivos a la semana, y las clases a la semana de cada asignatura (el cálculo es de contracts, porque lo usa también el cuerpo de los PNJ). */
export { CLASES_POR_DIA, DIAS_LECTIVOS, clasesPorSemana };

/** El horario depende solo de las asignaturas y se consulta muchas veces al día: se calcula una vez por combinación. */
const HORARIOS = new Map<string, string[][]>();
function memo<T>(cache: Map<string, T>, asignaturas: readonly string[], calcular: () => T): T {
  const clave = asignaturas.join(',');
  let v = cache.get(clave);
  if (!v) cache.set(clave, (v = calcular()));
  return v;
}

/**
 * Horario del curso: `horario[día][clase]` = asignatura (día 0 = lunes ... 4 = viernes; clase 0 = primera hora).
 * Ocupa los 20 huecos y una asignatura no se repite el mismo día. Es determinista: depende solo de las asignaturas.
 */
export function horarioDeClases(asignaturas: readonly string[]): readonly (readonly string[])[] {
  return memo(HORARIOS, asignaturas, () => calcularHorario(asignaturas));
}

function calcularHorario(asignaturas: readonly string[]): string[][] {
  const clases = clasesPorSemana(asignaturas);
  const carga = new Array<number>(DIAS_LECTIVOS).fill(0);
  const dias: string[][] = Array.from({ length: DIAS_LECTIVOS }, () => []);
  // Cada asignatura (las de más clases primero) elige los días con menos carga: así todos los días acaban con 4 y ninguna se repite.
  const orden = asignaturas.map((k, i) => ({ k, i })).sort((x, y) => clases[y.k] - clases[x.k] || x.i - y.i);
  for (const { k, i } of orden) {
    const elegidos = [...carga.keys()]
      .sort((x, y) => carga[x] - carga[y] || ((x + i * 2) % DIAS_LECTIVOS) - ((y + i * 2) % DIAS_LECTIVOS))
      .slice(0, clases[k]);
    for (const d of elegidos) {
      dias[d].push(k);
      carga[d]++;
    }
  }
  // Dentro del día el orden varía con el día para que no sea siempre el mismo.
  const n = asignaturas.length;
  return dias.map((dia, d) => dia.sort((x, y) => ((asignaturas.indexOf(x) - d * 3 + n * 10) % n) - ((asignaturas.indexOf(y) - d * 3 + n * 10) % n)));
}

/** Días de la semana (0 = lunes ... 4 = viernes) en que se da cada asignatura del curso. */
export function horarioSemanal(asignaturas: readonly string[]): Record<string, number[]> {
  const horario = horarioDeClases(asignaturas);
  return Object.fromEntries(asignaturas.map((k) => [k, horario.flatMap((dia, d) => (dia.includes(k) ? [d] : []))]));
}

/** Cuánto vale cada clase de una asignatura frente a lo que tenía con sus horas del currículo (si se comprime, cada clase vale más). */
export function pesoDeClase(asignaturas: readonly string[], key: string): number {
  return asignatura(key).horas / clasesPorSemana(asignaturas)[key];
}

/** Día de la semana (0..4) del examen de una asignatura en la evaluación de un trimestre. Es fijo, y varias pueden coincidir. Si se pasan los días en que tiene clase, cae en uno de ellos (así se examina quien va a esa clase). */
export type TipoDeExamen = 'parcial1' | 'parcial2' | 'global';

export function diaDeExamen(curso: number, trimestre: number, key: string, tipo: TipoDeExamen = 'global', dias?: readonly number[]): number {
  let h = curso * 7 + trimestre * 13 + (tipo === 'parcial1' ? 3 : tipo === 'parcial2' ? 5 : 0);
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return dias?.length ? dias[h % dias.length] : h % 5;
}
