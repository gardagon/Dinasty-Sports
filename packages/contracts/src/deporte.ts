import type { LogTable } from './context';
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
