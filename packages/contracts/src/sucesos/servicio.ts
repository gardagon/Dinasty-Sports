import type { LectorDeHechos } from './condiciones';
import type { PersonaDeTexto } from './texto';
import type { ConfigDeSucesos, OrigenDeSuceso } from './tipos';

/** Una opción de un suceso pendiente, tal como se le presenta a quien decide. */
export interface OpcionPendiente {
  id: string;
  /** Id de la acción que la elige (pasa por `perform`, como cualquier acción). */
  accion: string;
  texto: string;
  visible: boolean;
  elegible: boolean;
  /** Por qué no se puede elegir, en palabras. */
  motivo?: string;
  /** Con qué eje del carácter choca (su nombre, p. ej. «sociabilidad») aunque se pueda elegir: pasa con `fueraDeCaracter: 'normales'`. La interfaz puede avisarlo. */
  ejeEnContra?: string;
  /** Lo que se ve de las consecuencias antes de elegir, según la configuración (`presentacion.consecuencias`). */
  pista?: string;
  minutos: number;
  /** Probabilidad de éxito de su tirada (solo con `consecuencias: 'numeros'`). */
  probabilidad?: number;
}

/** Un suceso que espera una decisión. */
export interface SucesoPendiente {
  id: number;
  suceso: string;
  titulo: string;
  texto: string;
  urgencia: 'ahora' | 'aplazable' | 'pendiente';
  /** ¿Se puede dejar para luego? Si no, la interfaz no ofrece cerrarlo sin responder. */
  aplazable: boolean;
  categoria: 'importante' | 'menor';
  /** Evento base o deportivo (y de qué deporte), para que la interfaz los distinga. */
  origen: OrigenDeSuceso;
  deporte?: string;
  /** Minuto absoluto en que vence (se aplica la opción por defecto). */
  vence: number;
  /** Papel → id de persona, para dibujar a quien participa. */
  reparto: Readonly<Record<string, string>>;
  opciones: OpcionPendiente[];
}

/** Algo que pasó: para la pantalla de recuerdos y «lo que habéis vivido» con una persona. */
export interface RecuerdoDeSuceso {
  dia: number;
  suceso: string;
  titulo: string;
  /** Variante que salió, si el suceso tiene variantes. */
  variante?: string;
  /** Opción elegida (o `undefined` si el suceso no tenía opciones) y su texto, para enseñarlo. */
  opcion?: string;
  opcionTexto?: string;
  personas: readonly string[];
}

/** Un suceso sin opciones que acaba de pasar y merece una ventana (no solo una línea): se enseña una vez. */
export interface AvisoDeSuceso {
  id: number;
  suceso: string;
  titulo: string;
  texto: string;
  dia: number;
  reparto: Readonly<Record<string, string>>;
}

export interface SucesosService {
  pendientes(): SucesoPendiente[];
  /** Los sucesos sin opciones de hoy y de ayer que se presentan en una ventana, del más antiguo al más reciente. */
  avisos(): AvisoDeSuceso[];
  /** ¿Está puesta esta marca (de una persona, si se dice)? Para las puertas que otro módulo quiera abrir o cerrar. */
  tiene(marca: string, persona?: string): boolean;
  contador(id: string): number;
  /** Lo vivido, del más antiguo al más reciente (con `persona`, solo aquello en lo que salió). */
  recuerdos(persona?: string): RecuerdoDeSuceso[];
  config(): ConfigDeSucesos;
  /** Los sucesos que existen en esta partida (para las herramientas y la interfaz de pruebas). */
  catalogo(): { id: string; titulo: string; origen: OrigenDeSuceso; deporte?: string; hilo?: string }[];
}

/**
 * Servicio opcional con el que un módulo publica hechos para las condiciones (`{ hecho: '<módulo>.<nombre>' }`): la clave es
 * `hechos.<id del módulo>`. Así un deporte ofrece «goles de la temporada» sin que el director sepa qué es un gol.
 */
export interface HechosService {
  valor(nombre: string): number | string | boolean | undefined;
}
export const servicioDeHechos = (modulo: string): string => `hechos.${modulo}`;

/**
 * Solo para pruebas (los escenarios y `sucesos:probar`): si algún módulo publica este servicio, el director lee de él lo que diga antes
 * que de la partida. Así una prueba fija dónde estás, quién hay o cuántas faltas llevas sin jugar hasta llegar ahí.
 */
export interface SucesosDePruebaService {
  hechos?: Partial<LectorDeHechos>;
  /** Quién hace un papel: un id, `null` (nadie) o `undefined` (lo decide la partida). */
  papel?(nombre: string): string | null | undefined;
  persona?(id: string): PersonaDeTexto | undefined;
  /** Datos de la señal con los que sale un suceso forzado (`sucesos.forzar.<id>`). */
  señal?(): Record<string, unknown> | undefined;
  /** Recorrer todos los caminos: los sucesos salen y las opciones se pueden elegir aunque no se cumplan sus condiciones (el reparto sí hace falta). */
  todoVale?: boolean;
  /** Variante forzada de un suceso (solo con `todoVale`). */
  variante?(suceso: string): string | undefined;
  /** Cuál de los `textos` de entrada sale de un suceso o variante (solo con `todoVale`, para recorrer todas las versiones). */
  texto?(suceso: string): number | undefined;
  /** Cuál de los `resultados` de una rama de una opción sale (para recorrer todas las versiones). */
  resultado?(suceso: string, opcion: string): number | undefined;
  /** Resultado forzado de una tirada. */
  tirada?(suceso: string, opcion: string): 'exito' | 'fallo' | undefined;
  /** Azar forzado (0 a 1) de los sucesos de probabilidad: 0 hace que salgan siempre. */
  azar?(suceso: string): number | undefined;
}
export const SUCESOS_DE_PRUEBA = 'sucesos.de_prueba';
