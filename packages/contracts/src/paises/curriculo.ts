/**
 * Currículo escolar como DATO por país: los cursos y las asignaturas de cada uno (las asignaturas son claves del catálogo del módulo de estudios).
 * Un país nuevo (un paquete de país) trae los suyos; hasta entonces, copia de los de España.
 */

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
