/**
 * Currículo escolar como DATO por país: los cursos y las asignaturas de cada uno (las asignaturas son claves del catálogo del módulo de estudios).
 * Un país nuevo (un paquete de país) trae los suyos; hasta entonces, copia de los de España.
 */

import { JORNADA_ESCOLAR } from '../time';

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
export const CURSO_DE_MODALIDAD_ESPANA = 8;

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

// ------------------------------------------------------------------------------------------------------------ horas y horario

/** Horas de clase a la semana de cada asignatura del currículo (reparten los días en que se da: ver `clasesPorSemana`). */
export const HORAS_DE_ASIGNATURA: Readonly<Record<string, number>> = { lengua: 4, matematicas: 4, ingles: 3, educacion_fisica: 2, naturales: 2, sociales: 2, artistica: 1, biologia: 3, historia: 3, tecnologia: 2, musica: 2, fisica_quimica: 3, filosofia: 2, historia_espana: 3, fisica: 3, quimica: 3, latin: 3, historia_arte: 3, economia: 3 };

/** Clases al día y días lectivos a la semana: 20 huecos en los que caben todas las asignaturas del curso. */
export const CLASES_POR_DIA = 4;
export const DIAS_LECTIVOS = 5;
const HUECOS = CLASES_POR_DIA * DIAS_LECTIVOS;

const CLASES = new Map<string, Record<string, number>>();

/**
 * Clases a la semana de cada asignatura ajustadas a los 20 huecos del horario: se reparten en proporción a sus horas (`HORAS_DE_ASIGNATURA`), con al menos una cada una y como mucho
 * una por día (5). Si el currículo pide más horas de las que caben (ESO: 23 a 26), todas se comprimen; si pide menos (primaria: 18), las asignaturas con más horas ganan alguna.
 * Es función pura de las asignaturas (se calcula una vez por combinación); no se debe modificar lo que devuelve.
 */
export function clasesPorSemana(asignaturas: readonly string[]): Record<string, number> {
  const clave = asignaturas.join(',');
  let v = CLASES.get(clave);
  if (!v) CLASES.set(clave, (v = calcularClases(asignaturas)));
  return v;
}

function calcularClases(asignaturas: readonly string[]): Record<string, number> {
  const horas = asignaturas.map((k) => HORAS_DE_ASIGNATURA[k]);
  const total = horas.reduce((a, b) => a + b, 0);
  const exacto = horas.map((h) => (h * HUECOS) / total);
  const clases = exacto.map((x) => Math.min(DIAS_LECTIVOS, Math.max(1, Math.floor(x))));
  // Reparte lo que falta (o quita lo que sobra) por orden de resto, sin salirse de 1..5.
  const resto = (i: number) => exacto[i] - clases[i];
  let suma = clases.reduce((a, b) => a + b, 0);
  const indices = asignaturas.map((_, i) => i);
  while (suma < HUECOS) {
    const i = indices.filter((j) => clases[j] < DIAS_LECTIVOS).sort((x, y) => resto(y) - resto(x))[0];
    clases[i]++;
    suma++;
  }
  while (suma > HUECOS) {
    const i = indices.filter((j) => clases[j] > 1).sort((x, y) => resto(x) - resto(y))[0];
    clases[i]--;
    suma--;
  }
  return Object.fromEntries(asignaturas.map((k, i) => [k, clases[i]]));
}

/**
 * Minutos de clase de Educación física en una semana lectiva entera de un curso del país (0 = el primero, 3.º de primaria): las clases a la semana que le tocan en el horario del curso
 * por lo que dura una clase de la jornada escolar. 0 si el curso no la tiene o no existe. **Una sola fuente**: la usan el servicio de `estudios` y el cuerpo de los PNJ (al crear la
 * partida y cada semana). La parte de la clase que se está en movimiento es `FRACCION_EN_MOVIMIENTO_DE_EDUCACION_FISICA` (en `cuerpo.ts`). La Educación física es común a las dos
 * modalidades de bachillerato.
 */
export function minutosDeEducacionFisica(pais: { cursos: readonly CursoDef[] }, curso: number): number {
  if (curso < 0 || curso >= pais.cursos.length) return 0;
  const c = pais.cursos[curso];
  const asignaturas = [...c.asignaturas, ...(c.modalidad?.ciencias ?? [])];
  if (!asignaturas.includes('educacion_fisica')) return 0;
  const [inicio, fin] = JORNADA_ESCOLAR.clases[0];
  return clasesPorSemana(asignaturas).educacion_fisica * (fin - inicio);
}
