/**
 * Reglas puras de la temporada de atletismo: puntos por puesto y clasificaciones a partir de las pruebas guardadas. Se prueban y se
 * ajustan sin tocar el módulo. Cifras en `docs/ANEXO_DEPORTE.md`.
 */

export type TipoDePrueba = 'regular' | 'clasificatoria' | 'final';

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
/** La clasificatoria y la final puntúan el doble. */
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
