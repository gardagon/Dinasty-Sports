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
  /** Cuánta gente corresponde a cada club de la zona (los clubes de un deporte, sin contar los de colegio): el número de clubes es la población entre esto (`clubesDeLaZona`). Sin él, `PERSONAS_POR_CLUB`. */
  personasPorClub?: number;
  /** Cuántos de los colegios de fuera tienen club de deporte (con las mismas reglas que el del colegio del personaje: escogen primero entre sus alumnos, que entran con hueco y sin prueba). Sin él, la mitad. */
  colegiosConClub?: number;
}

/** Personas por club de la zona, por defecto (`CIUDAD_Y_LIGAS.md` §3): con la ciudad de ahora (unas 1.450 personas), dos clubes; con cinco veces más, diez. */
export const PERSONAS_POR_CLUB = 700;
/** Cuánta gente tiene una ciudad (aproximada: los alumnos de doce cursos más los vecinos). */
export const personasDeLaCiudad = (c: CiudadDef): number => (c.aulasPorCurso * c.alumnosPorAula + c.alumnosPorCursoDeCadaColegio * c.colegiosDeFuera) * 12 + c.vecinos;
/** Cuántos colegios de fuera tienen club de deporte: el dato de la ciudad o, por defecto, la mitad. */
export const colegiosConClubDe = (c: CiudadDef): number => Math.min(c.colegiosDeFuera, c.colegiosConClub ?? Math.floor(c.colegiosDeFuera / 2));
/** Cuántos clubes de la zona tiene la ciudad, en proporción a su población (al menos uno). */
export const clubesDeLaZona = (c: CiudadDef): number => Math.max(1, Math.round(personasDeLaCiudad(c) / (c.personasPorClub ?? PERSONAS_POR_CLUB)));

/** La ciudad de ahora: 4 colegios de fuera, 2 clases de 25 por curso en el del personaje, 17 alumnos por curso en cada colegio de fuera y 80 vecinos (unas 1.100 personas). */
export const CIUDAD_ACTUAL: CiudadDef = { colegiosDeFuera: 4, aulasPorCurso: 2, alumnosPorAula: 25, alumnosPorCursoDeCadaColegio: 17, vecinos: 80 };

/**
 * Una ciudad pequeña para los tests que crean muchas partidas: dos colegios de fuera, una sola clase de 12 por curso y 6 alumnos por curso en cada colegio de fuera (unas
 * 220 personas en vez de 1.100). Hace los mismos papeles que la de verdad, solo con menos gente.
 */
export const CIUDAD_DE_PRUEBA: CiudadDef = { colegiosDeFuera: 2, aulasPorCurso: 1, alumnosPorAula: 12, alumnosPorCursoDeCadaColegio: 6, vecinos: 12 };

/**
 * La **ciudad grande del diseño** (`CIUDAD_Y_LIGAS.md` §2): el colegio del personaje, igual (2 clases de 25 por curso), y **9 colegios de fuera de 2 clases de 25 por curso** (50 alumnos por curso cada
 * uno: no la ciudad de ahora multiplicada, que deja colegios de fuera de 17 alumnos por curso que nunca llegan a 14), unos 500 niños por año de nacimiento y unas 6.000 personas. Con ella, los clubes
 * salen en proporción (uno cada `PERSONAS_POR_CLUB` personas) y la mitad de los colegios de fuera tiene club.
 */
export const CIUDAD_GRANDE: CiudadDef = { colegiosDeFuera: 9, aulasPorCurso: 2, alumnosPorAula: 25, alumnosPorCursoDeCadaColegio: 50, vecinos: 80 };

/** Los ids de los colegios de fuera de una ciudad: `colegio1`…`colegioN`. */
export const idsDeColegiosDeFuera = (c: CiudadDef): string[] => Array.from({ length: c.colegiosDeFuera }, (_, i) => `colegio${i + 1}`);
