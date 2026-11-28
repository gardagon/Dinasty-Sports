/**
 * LA CIUDAD COMO DATOS (plan `docs/CIUDAD_Y_LIGAS.md` §2 y §10, paso 1): cuántos colegios y cuántas clases tiene la zona del personaje y cuánta gente vive en ella. Son datos del
 * paquete de país (`PaisDef.ciudad`) y no números fijos en el código: así otro país o una ciudad distinta trae los suyos, y los tests pueden crear una ciudad **pequeña** que sale
 * mucho más barata que la de verdad. Lo que no traiga un paquete lo pone `CIUDAD_ACTUAL`.
 */
import type { ParejasDef } from './rasgos';

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
  /** Cuántos campos de fútbol tiene el complejo deportivo municipal, donde juegan en casa los clubes pequeños y los colegios (los grandes y medianos juegan en sus instalaciones). Sin él, `CAMPOS_DEL_COMPLEJO`. */
  camposDelComplejo?: number;
  /** Demografía de la ciudad (id de origen → peso) y reparto de parejas: sustituyen a los del país. Sin ellos, los del país (`demografiaDelLugar`, `parejasDelLugar`). */
  demografia?: Readonly<Record<string, number>>;
  parejas?: ParejasDef;
  /** Probabilidad de que un nacido aquí (menos de 25 años) de padres de fuera lleve un nombre de pila del país (0 a 1); sustituye a la del país (`nombreLocalDelLugar`). */
  nombreLocalDeLosNacidosAqui?: number;
  /**
   * **Hogares** (`docs/relevo/hogares.md`): con él (**activado en las tres ciudades desde el 24/11/2026**), los niños del mundo salen de familias (pareja con rasgos, capacidades y perks propios; hijos con la herencia del personaje) y los padres,
   * los hermanos y los hermanos pequeños son personas con su hogar (`Npc.hogar`, `Npc.padres`). Sin él (o en una partida guardada antes, que no lleva `NpcsState.hogares`) el mundo se genera y se renueva como siempre: no se migra nada.
   */
  hogares?: boolean;
  /**
   * **Reparto nuevo de inicio** (`docs/relevo/reparto-nuevo-reglas.md`): con él (solo la ciudad grande, desde el 27/11/2026), al crear la partida los niños del fútbol se reparten en los clubes con las reglas nuevas (primera ronda de 14 por
   * año, subidas por titularidad, C y D de colegio, B mixto, equilibrar, tope de 22, nunca un B sin A; juvenil por año con su cascada) y **nada lo deshace después**; y la partida empieza en equilibrio (cada niño ha pasado ya por los veranos
   * de su edad con las reglas de abandono). Sin él (la ciudad de ahora, la de prueba, o una partida guardada antes) la creación es la de siempre: no se migra nada. Los veranos siguen con sus reglas (el verano nuevo es otra parte).
   */
  repartoNuevo?: boolean;
}

/** La demografía que manda en un lugar: la de su ciudad, si la trae, y si no la del país. */
export const demografiaDelLugar = (p: { demografia: Readonly<Record<string, number>>; ciudad?: Pick<CiudadDef, 'demografia'> }): Readonly<Record<string, number>> => p.ciudad?.demografia ?? p.demografia;
/** El reparto de parejas que manda en un lugar: el de su ciudad, si lo trae, y si no el del país (sin ninguno, los padres se sortean por separado). */
export const parejasDelLugar = (p: { parejas?: ParejasDef; ciudad?: Pick<CiudadDef, 'parejas'> }): ParejasDef | undefined => p.ciudad?.parejas ?? p.parejas;

/** La probabilidad de nombre de pila del país para los jóvenes de origen de fuera que manda en un lugar: la de su ciudad, si la trae, y si no la del país. Sin ninguna, `undefined` (la regla de siempre: ninguno con un solo origen y `PROBABILIDAD_DE_NOMBRE_LOCAL` en las mezclas sin origen local). */
export const nombreLocalDelLugar = (p: { nombreLocalDeLosNacidosAqui?: number; ciudad?: Pick<CiudadDef, 'nombreLocalDeLosNacidosAqui'> }): number | undefined => p.ciudad?.nombreLocalDeLosNacidosAqui ?? p.nombreLocalDeLosNacidosAqui;

/** Campos de fútbol del complejo municipal por defecto (la ciudad de ahora, con pocos equipos). */
export const CAMPOS_DEL_COMPLEJO = 2;

/** Personas por club de la zona, por defecto (`CIUDAD_Y_LIGAS.md` §3): con la ciudad de ahora (unas 1.450 personas), dos clubes; con cinco veces más, diez. */
export const PERSONAS_POR_CLUB = 700;
/** Cuánta gente tiene una ciudad (aproximada: los alumnos de doce cursos más los vecinos). */
export const personasDeLaCiudad = (c: CiudadDef): number => (c.aulasPorCurso * c.alumnosPorAula + c.alumnosPorCursoDeCadaColegio * c.colegiosDeFuera) * 12 + c.vecinos;
/** Cuántos colegios de fuera tienen club de deporte: el dato de la ciudad o, por defecto, la mitad. */
export const colegiosConClubDe = (c: CiudadDef): number => Math.min(c.colegiosDeFuera, c.colegiosConClub ?? Math.floor(c.colegiosDeFuera / 2));
/** Cuántos clubes de la zona tiene la ciudad, en proporción a su población (al menos uno). */
export const clubesDeLaZona = (c: CiudadDef): number => Math.max(1, Math.round(personasDeLaCiudad(c) / (c.personasPorClub ?? PERSONAS_POR_CLUB)));

/** La ciudad de ahora: 4 colegios de fuera, 2 clases de 25 por curso en el del personaje, 17 alumnos por curso en cada colegio de fuera y 80 vecinos (unas 1.100 personas). */
export const CIUDAD_ACTUAL: CiudadDef = { colegiosDeFuera: 4, aulasPorCurso: 2, alumnosPorAula: 25, alumnosPorCursoDeCadaColegio: 17, vecinos: 80, hogares: true };

/**
 * Una ciudad pequeña para los tests que crean muchas partidas: dos colegios de fuera, una sola clase de 12 por curso y 6 alumnos por curso en cada colegio de fuera (unas
 * 220 personas en vez de 1.100). Hace los mismos papeles que la de verdad, solo con menos gente.
 */
export const CIUDAD_DE_PRUEBA: CiudadDef = { colegiosDeFuera: 2, aulasPorCurso: 1, alumnosPorAula: 12, alumnosPorCursoDeCadaColegio: 6, vecinos: 12, hogares: true };

/**
 * La **ciudad grande del diseño** (`CIUDAD_Y_LIGAS.md` §2): el colegio del personaje, igual (2 clases de 25 por curso), y **9 colegios de fuera de 2 clases de 25 por curso** (50 alumnos por curso cada
 * uno: no la ciudad de ahora multiplicada, que deja colegios de fuera de 17 alumnos por curso que nunca llegan a 14), unos 500 niños por año de nacimiento y unas 6.000 personas. Con ella, los clubes
 * salen en proporción (uno cada `PERSONAS_POR_CLUB` personas) y 3 de los colegios de fuera tienen club (4 con el del personaje: decisión del usuario, 17/11/2026).
 */
export const CIUDAD_GRANDE: CiudadDef = {
  colegiosDeFuera: 9, colegiosConClub: 3, aulasPorCurso: 2, alumnosPorAula: 25, alumnosPorCursoDeCadaColegio: 50, vecinos: 80, camposDelComplejo: 10, hogares: true, repartoNuevo: true,
  // Demografía de una ciudad como Madrid: ~19 % de origen extranjero, repartido por continente como la Comunidad de Madrid (más de la mitad, de América: nombres y apellidos hispanos) (`docs/relevo/nombres-nacionales.md` §2),
  // y las parejas por tipo (`ANEXO_NOMBRES.md` §7). Los nacidos aquí de padres de fuera llevan nombre de pila español el 20 % de las veces.
  demografia: { espana_norte: 0.162, espana_centro: 0.324, espana_sur: 0.324, latinoamerica: 0.099, magreb: 0.012, africa_subsahariana: 0.006, europa_este: 0.03, europa_norte: 0.024, asia_oriental: 0.019 },
  parejas: { ambosExtranjeros: 0.13, mixtas: 0.12, mismoOrigen: 0.7 },
  nombreLocalDeLosNacidosAqui: 0.2,
};

/** Los ids de los colegios de fuera de una ciudad: `colegio1`…`colegioN`. */
export const idsDeColegiosDeFuera = (c: CiudadDef): string[] => Array.from({ length: c.colegiosDeFuera }, (_, i) => `colegio${i + 1}`);
