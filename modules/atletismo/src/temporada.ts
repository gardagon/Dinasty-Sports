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
  /** La serie del personaje (de 1) y cuántas series tuvo la prueba. */
  serie?: number;
  series?: number;
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
 * Reparte a los corredores en series de `maxPorSerie` como mucho, **equilibradas en número y en nivel**: `ceil(n / maxPorSerie)` series con el mismo número de corredores en cada
 * una o uno de diferencia (13 → 7 y 6; 17 → 6, 6 y 5), por cabezas de serie en serpentina (el 1.º a la A, el 2.º a la B, el 3.º a la B, el 4.º a la A...). Devuelve las series
 * con sus corredores del mejor al peor. Con menos de 2 corredores no hay prueba (devuelve una serie vacía o de uno).
 */
export function repartirEnSeries<T extends { nivel: number }>(corredores: readonly T[], maxPorSerie: number): T[][] {
  const n = corredores.length;
  const series = Math.max(1, Math.ceil(n / Math.max(1, maxPorSerie)));
  const orden = [...corredores].sort((a, b) => b.nivel - a.nivel);
  const out: T[][] = Array.from({ length: series }, () => []);
  orden.forEach((c, i) => {
    const vuelta = Math.floor(i / series);
    const j = i % series;
    out[vuelta % 2 === 0 ? j : series - 1 - j].push(c);
  });
  return out;
}

/** Un corredor ya clasificado en una prueba: su serie, su puesto en ella y su puesto en la clasificación general (por tiempos, con todas las series juntas). */
export interface PuestoEnPrueba {
  serie: number;
  puestoEnSerie: number;
  puesto: number;
  marca: number;
}

/** Los puestos de una prueba: dentro de cada serie por tiempo y en general por tiempo (todas las series juntas). Conserva el orden de entrada de `series` y de sus corredores. */
export function clasificarPrueba<T extends { mark: number }>(series: readonly (readonly T[])[]): (T & PuestoEnPrueba)[][] {
  const todos = series.flatMap((serie) => serie.map((c) => c.mark)).sort((a, b) => a - b);
  return series.map((serie, i) => {
    const ordenada = [...serie].sort((a, b) => a.mark - b.mark);
    return ordenada.map((c, j) => ({ ...c, serie: i, puestoEnSerie: j + 1, puesto: todos.indexOf(c.mark) + 1, marca: c.mark }));
  });
}

/**
 * Quiénes corren una prueba que tiene límite de plazas (la semifinal): se recorre la clasificación en orden y se llena con los que acuden hasta `plazas`, mirando solo los
 * `plazas + reservas` primeros (los reservas cubren a quien no acude: una baja o una ausencia). Con menos clasificados que plazas corren todos los que acuden.
 */
export function plazasConReservas<T extends { acude: boolean }>(clasificacion: readonly T[], plazas: number, reservas: number): T[] {
  const elegidos: T[] = [];
  for (const c of clasificacion.slice(0, plazas + reservas)) if (c.acude && elegidos.length < plazas) elegidos.push(c);
  return elegidos;
}

/** Cómo quedaron los de una semifinal: cada serie con los ids de sus corredores por su puesto en ella, y todos por tiempo. */
export interface ResultadoDeSemifinal {
  series: string[][];
  general: string[];
}

/**
 * Quiénes corren la final: de cada serie, los `porSerie` primeros que acuden (si uno no acude, entra su reserva: el siguiente de su serie, hasta `reservasPorSerie`). Si aun así
 * no se llega a `plazas`, entran los mejores tiempos de los demás que acuden. Con menos de `plazas` disponibles corren todos. Devuelve los ids.
 */
export function finalistasDe(sf: ResultadoDeSemifinal, acude: (id: string) => boolean, formato: { plazas: number; porSerie: number; reservasPorSerie: number }): string[] {
  const elegidos: string[] = [];
  for (const serie of sf.series) {
    let cogidos = 0;
    for (const id of serie.slice(0, formato.porSerie + formato.reservasPorSerie)) {
      if (cogidos >= formato.porSerie) break;
      if (acude(id)) {
        elegidos.push(id);
        cogidos++;
      }
    }
  }
  for (const id of sf.general) {
    if (elegidos.length >= formato.plazas) break;
    if (!elegidos.includes(id) && acude(id)) elegidos.push(id);
  }
  return elegidos;
}

// ---------------------------------------------------------------------------------------------------- la clasificación de la temporada y del trimestre

/** Lo que lleva acumulado un corredor en una clasificación: puntos, pruebas y mejor marca. Los números van cortos porque se guardan de todos los corredores. */
export interface FilaDeTabla {
  pt: number;
  pr: number;
  mm: number;
}

/** Las filas de una clasificación por corredor (su id, o `yo` el personaje). */
export type TablaDeCategoria = Record<string, FilaDeTabla>;

/** Anota una prueba en una clasificación: a cada corredor, los puntos de su puesto general (×2 en el campeonato), una prueba más y su mejor marca (puro: no cambia la tabla de entrada). */
export function anotarEnTabla(tabla: TablaDeCategoria | undefined, filas: readonly { clave: string; puesto: number; marca: number }[], tipo: TipoDePrueba): TablaDeCategoria {
  const nueva: TablaDeCategoria = { ...tabla };
  for (const f of filas) {
    const antes = nueva[f.clave];
    nueva[f.clave] = { pt: (antes?.pt ?? 0) + puntosDe(f.puesto, tipo), pr: (antes?.pr ?? 0) + 1, mm: Math.min(antes?.mm ?? Infinity, f.marca) };
  }
  return nueva;
}

/** Las claves de una clasificación de más a menos puntos y, a igualdad, mejor marca (después, por clave, para que el orden sea siempre el mismo). */
export const ordenDeTabla = (tabla: TablaDeCategoria | undefined): string[] =>
  Object.entries(tabla ?? {})
    .sort(([ka, a], [kb, b]) => b.pt - a.pt || a.mm - b.mm || (ka < kb ? -1 : ka > kb ? 1 : 0))
    .map(([k]) => k);
