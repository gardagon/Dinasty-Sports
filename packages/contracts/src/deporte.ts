import type { LogTable } from './context';
import type { ClubDirectory } from './services';
import type { StatId } from './stats';

/**
 * La pestaña de un deporte. Cada módulo de deporte publica un servicio `deporte.<id>` (ver `claveDeDeporte`) con una vista de todo lo
 * que hay que enseñar de ese deporte; la interfaz recorre los servicios que empiezan por `deporte.` y no sabe de ningún deporte concreto.
 */

export const claveDeDeporte = (id: string): string => `deporte.${id}`;
export const PREFIJO_DE_DEPORTE = 'deporte.';

export interface DatoDeResumen {
  etiqueta: string;
  valor: string;
}

/** Una prueba disputada en la temporada, con su clasificación completa si se guardó. */
export interface PruebaDeTemporada {
  semana: number;
  titulo: string;
  posicion: number;
  total: number;
  marca: string;
  /** Fue la mejor marca personal hasta entonces. */
  record: boolean;
  tabla?: LogTable;
}

export interface ClasificacionDeTemporada {
  titulo: string;
  tabla: LogTable;
}

export interface TemporadaPasada {
  etiqueta: string;
  pruebas: number;
  mejorPuesto: string;
  mejorMarca: string;
}

export interface DeporteView {
  id: string;
  nombre: string;
  /** La prueba o disciplina (p. ej. «400 m»). */
  disciplina: string;
  /** Si hay texto, la pestaña está desactivada (y es lo que hay que hacer para activarla); sin él, el deporte se practica. */
  inactivo?: string;
  resumen: DatoDeResumen[];
  /** Stats propias del deporte que se enseñan con su barra. Las genéricas (velocidad, resistencia...) se ven en la pestaña del personaje. */
  habilidades: StatId[];
  temporada: {
    etiqueta: string;
    /** Cuándo es la próxima prueba (texto para el jugador). */
    proxima: string;
    pruebas: PruebaDeTemporada[];
  };
  /** Clasificaciones de lo que va de temporada (por puntos, por marcas...). */
  clasificaciones: ClasificacionDeTemporada[];
  temporadasAnteriores: TemporadaPasada[];
}

export interface DeporteService {
  view(): DeporteView;
}

/**
 * El deporte principal del personaje: aquel en cuyo club entró más recientemente (a igualdad, el primero del catálogo), o `null` si no
 * está apuntado a ningún club. Cualquier deporte de la partida se puede hacer por libre; el principal es el que enseña la pestaña «Deporte».
 */
export function deportePrincipal(clubes: ClubDirectory | undefined, deportes: readonly string[]): string | null {
  let mejor: { id: string; desde: number } | null = null;
  for (const id of deportes) {
    const club = clubes?.membership(id);
    if (!club) continue;
    const desde = club.desde ?? 0;
    if (!mejor || desde > mejor.desde) mejor = { id, desde };
  }
  return mejor?.id ?? null;
}

/**
 * Versión de la interfaz pública de los deportes: el vocabulario común (`@ds/contracts`) y el kit de deporte (`@ds/kit-deporte`), que un deporte empaquetado
 * usa sin llevar su copia. Hay que subirla cuando cambie algo de ellos que pueda romper a un deporte ya publicado; el juego rechaza los paquetes hechos
 * para otra (plan de deportes modulares, §3.1).
 */
export const INTERFAZ_DE_DEPORTES = 1;
