/**
 * LA CIUDAD COMO DATOS (plan `docs/CIUDAD_Y_LIGAS.md` §2 y §10, paso 1): cuántos colegios y cuántas clases tiene la zona del personaje y cuánta gente vive en ella. Son datos del
 * paquete de país (`PaisDef.ciudad`) y no números fijos en el código: así otro país o una ciudad distinta trae los suyos, y los tests pueden crear una ciudad **pequeña** que sale
 * mucho más barata que la de verdad. Lo que no traiga un paquete lo pone `CIUDAD_ACTUAL`.
 */
export interface CiudadDef {
  /** Cuántos colegios de fuera hay además del del personaje (sus ids son `colegio1`…`colegioN`). */
  colegiosDeFuera: number;
  /** Clases por curso del colegio del personaje (la del personaje es una de ellas) y alumnos por clase. */
  aulasPorCurso: number;
  alumnosPorAula: number;
  /** Alumnos por curso de cada colegio de fuera (y, multiplicados por los colegios de fuera, de jóvenes de cada edad que ya no van al colegio). */
  alumnosPorCursoDeCadaColegio: number;
  /** Vecinos del barrio de todas las edades. */
  vecinos: number;
}

/** La ciudad de ahora: 4 colegios de fuera, 2 clases de 25 por curso en el del personaje, 17 alumnos por curso en cada colegio de fuera y 80 vecinos (unas 1.100 personas). */
export const CIUDAD_ACTUAL: CiudadDef = { colegiosDeFuera: 4, aulasPorCurso: 2, alumnosPorAula: 25, alumnosPorCursoDeCadaColegio: 17, vecinos: 80 };

/**
 * Una ciudad pequeña para los tests que crean muchas partidas: dos colegios de fuera, una sola clase de 12 por curso y 6 alumnos por curso en cada colegio de fuera (unas
 * 220 personas en vez de 1.100). Hace los mismos papeles que la de verdad, solo con menos gente.
 */
export const CIUDAD_DE_PRUEBA: CiudadDef = { colegiosDeFuera: 2, aulasPorCurso: 1, alumnosPorAula: 12, alumnosPorCursoDeCadaColegio: 6, vecinos: 12 };

/** Los ids de los colegios de fuera de una ciudad: `colegio1`…`colegioN`. */
export const idsDeColegiosDeFuera = (c: CiudadDef): string[] => Array.from({ length: c.colegiosDeFuera }, (_, i) => `colegio${i + 1}`);
