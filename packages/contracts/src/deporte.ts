import type { LogTable, ReadContext } from './context';
import { SERVICES, type PracticaService } from './services';
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

/** Cuántos deportes puede practicar a la vez el personaje: empezar uno exige dejar el actual. */
export const MAX_DEPORTES_PRACTICADOS = 1;

/**
 * Los deportes que ofrece el juego (provisional: la ficha de cada deporte, con su catálogo, llega con la fase 1 del plan de deportes
 * modulares). Solo cuentan los que están cargados en la partida. El primero es con el que empieza una partida si no se elige.
 */
export const CATALOGO_DE_DEPORTES: readonly { id: string; nombre: string }[] = [{ id: 'atletismo', nombre: 'Atletismo' }];

/** ¿Practica el personaje este deporte? Sin el módulo `deportes` en la partida, todos los cargados se practican (como antes de existir). */
export const sePractica = (ctx: ReadContext, deporte: string): boolean => ctx.service<PracticaService>(SERVICES.practica)?.practica(deporte) ?? true;
