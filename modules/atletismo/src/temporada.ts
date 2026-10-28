/**
 * Reglas puras de la temporada de atletismo: puntos por puesto y clasificaciones a partir de las pruebas guardadas. Se prueban y se
 * ajustan sin tocar el módulo. Cifras en `docs/ANEXO_DEPORTE.md`.
 */

/** `clasificatoria` es el nombre antiguo de las semifinales (partidas ya guardadas). */
export type TipoDePrueba = 'regular' | 'clasificatoria' | 'semifinal' | 'final';

/** Un corredor de una prueba guardada. `yo` es el personaje; `npcId` los rivales de la población (los genéricos solo tienen nombre). */
export interface FilaGuardada {
  nombre: string;
  club: string;
  marca: number;
  npcId?: string;
  yo?: boolean;
}

/** Una prueba disputada por el personaje. Las filas (la clasificación completa) solo se guardan el curso en curso y el anterior. */
export interface PruebaGuardada {
  curso: number;
  semana: number;
  tipo: TipoDePrueba;
  categoria: string;
  superior: boolean;
  posicion: number;
  total: number;
  marca: number;
  record: boolean;
  filas?: FilaGuardada[];
}

/** Puntos de la clasificación de la temporada por puesto (del 1.º al 8.º; el resto, 0). */
export const PUNTOS_POR_PUESTO: readonly number[] = [10, 8, 6, 5, 4, 3, 2, 1];
/** Las semifinales y la final puntúan el doble. */
export const FACTOR_DE_CAMPEONATO = 2;
/** Cursos (el actual y el anterior) de los que se guarda la clasificación completa de cada prueba. */
export const CURSOS_CON_CLASIFICACION = 2;

export const puntosDe = (puesto: number, tipo: TipoDePrueba): number => (PUNTOS_POR_PUESTO[puesto - 1] ?? 0) * (tipo === 'regular' ? 1 : FACTOR_DE_CAMPEONATO);

export interface FilaDeClasificacion {
  clave: string;
  nombre: string;
  club: string;
  puntos: number;
  pruebas: number;
  mejorMarca: number;
  yo: boolean;
}

/** Clasificación por puntos de las pruebas dadas (de una temporada y una categoría): más puntos primero y, a igualdad, mejor marca. */
export function clasificacionPorPuntos(pruebas: readonly PruebaGuardada[]): FilaDeClasificacion[] {
  const por = new Map<string, FilaDeClasificacion>();
  for (const p of pruebas) {
    // Los puestos se reparten por marca (menor tiempo, mejor puesto): se ordenan las filas guardadas.
    const filas = [...(p.filas ?? [])].sort((a, b) => a.marca - b.marca);
    filas.forEach((f, i) => {
      const clave = f.yo ? 'yo' : (f.npcId ?? f.nombre);
      const e = por.get(clave) ?? { clave, nombre: f.nombre, club: f.club, puntos: 0, pruebas: 0, mejorMarca: Infinity, yo: !!f.yo };
      e.puntos += puntosDe(i + 1, p.tipo);
      e.pruebas++;
      e.mejorMarca = Math.min(e.mejorMarca, f.marca);
      if (f.club) e.club = f.club;
      por.set(clave, e);
    });
  }
  return [...por.values()].sort((a, b) => b.puntos - a.puntos || a.mejorMarca - b.mejorMarca || a.nombre.localeCompare(b.nombre));
}

/** Mejores marcas de las pruebas dadas: la mejor de cada corredor, de menor a mayor tiempo. */
export function mejoresMarcas(pruebas: readonly PruebaGuardada[]): FilaDeClasificacion[] {
  return clasificacionPorPuntos(pruebas).sort((a, b) => a.mejorMarca - b.mejorMarca || a.nombre.localeCompare(b.nombre));
}

/** Quita la clasificación completa de las pruebas de cursos viejos (se queda el resumen) para que la partida no crezca sin límite. */
export function recortarPruebas(pruebas: readonly PruebaGuardada[], cursoActual: number, maximo = 200): PruebaGuardada[] {
  return pruebas
    .map((p) => (p.curso <= cursoActual - CURSOS_CON_CLASIFICACION && p.filas ? { ...p, filas: undefined } : p))
    .slice(-maximo);
}

// ---------------------------------------------------------------------------------------------------- quién corre y cómo se clasifican

/** Corredores de una carrera (el jugador y 17 rivales como mucho) y reparto del campeonato: dos series de 8 (16 corredores: los otros 2 de los 18 rotan), pasan 4 de cada una (8 finalistas). */
export const CORREDORES_POR_CARRERA = 18;
export const SERIES_DE_SEMIFINAL = 2;
export const CORREDORES_POR_SERIE = 8;
export const CORREDORES_DE_SEMIFINAL = SERIES_DE_SEMIFINAL * CORREDORES_POR_SERIE;
export const CLASIFICADOS_POR_SERIE = 4;
export const FINALISTAS = SERIES_DE_SEMIFINAL * CLASIFICADOS_POR_SERIE;
/** Los reservas de la final por serie: si un clasificado no se presenta, entra el siguiente de su serie. */
export const RESERVAS_POR_SERIE = 2;
/** Como poco corren estos rivales: si casi nadie se presenta, se completa con los mejores que faltaban. */
export const MINIMO_DE_RIVALES = 3;

/** Cómo quedó un corredor la última vez que corrió: de ahí depende que se presente la próxima. */
export interface UltimoPuesto {
  posicion: number;
  total: number;
}

/**
 * Probabilidad de que un rival se presente a una carrera. **Los mejores casi nunca faltan** (el primero de su categoría, 98 %) **y los peores
 * faltan más** (el último, 60 %): `percentil` va de 0 (el mejor) a 1 (el peor). **Quien quedó último la vez anterior falla aún más** (hasta −15
 * puntos, creciendo con lo atrás que quedó). Las carreras importantes (`bono`) las prepara más gente. Siempre entre 50 % y 99 %.
 */
export function probabilidadDeAcudir(percentil: number, ultimo?: UltimoPuesto, bono = 0): number {
  const base = 0.6 + 0.38 * (1 - Math.min(1, Math.max(0, percentil)));
  const castigo = ultimo && ultimo.total > 1 ? 0.15 * ((ultimo.posicion - 1) / (ultimo.total - 1)) ** 2 : 0;
  return Math.min(0.99, Math.max(0.5, base - castigo + bono));
}

/**
 * Reparte a los corredores en series por cabezas de serie («serpiente»: el mejor a la serie A, los dos siguientes a la B, los dos siguientes a
 * la A...), para que las series sean parejas. Devuelve las series con sus corredores del mejor al peor.
 */
export function repartirEnSeries<T extends { nivel: number }>(corredores: readonly T[], series = SERIES_DE_SEMIFINAL): T[][] {
  const orden = [...corredores].sort((a, b) => b.nivel - a.nivel);
  const out: T[][] = Array.from({ length: series }, () => []);
  orden.forEach((c, i) => {
    const vuelta = Math.floor(i / series);
    const j = i % series;
    out[vuelta % 2 === 0 ? j : series - 1 - j].push(c);
  });
  return out;
}
