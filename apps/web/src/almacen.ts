import { SAVE_VERSION, type Game, type GameState } from '@ds/core';
import { MINUTES_PER_DAY, fechaDelDia } from '@ds/contracts';

/**
 * Dónde se guardan las partidas. La interfaz solo habla con `Almacen`; la implementación real es IndexedDB y hay otra en memoria para los
 * tests y para cuando el navegador no deja usar IndexedDB (algunos modos privados). Plan y fases: `docs/ALMACENAMIENTO.md`.
 *
 * Lo que se guarda es el TEXTO JSON de la partida (el mismo formato que la copia de seguridad que se exporta): convertir a texto cuesta
 * una quinta parte que copiar el objeto y escribirlo bloquea el navegador unas diez veces menos (medido con 10 000 personas).
 */

export interface AgendaItem {
  start: number;
  duration: number;
  name: string;
  rest: boolean;
}

/** Lo que se guarda de una partida: el estado del juego y lo que enseña la franja del día. */
export interface SaveFile {
  state: GameState;
  agenda: AgendaItem[];
}

/** Una partida ya convertida a texto, con lo que hace falta para listarla sin leerla. */
export interface PartidaEnTexto {
  texto: string;
  nombre: string;
  version: number;
}

export interface ResumenDePartida {
  id: string;
  nombre: string;
  guardadoEn: number;
}

export const PARTIDA_ACTUAL = 'actual';
const FORMATO = 'dinasty-sports';

export interface Almacen {
  readonly tipo: 'indexeddb' | 'memoria';
  /** El texto JSON de la partida, o `null` si no existe. */
  cargar(id?: string): Promise<string | null>;
  guardar(partida: PartidaEnTexto, id?: string): Promise<void>;
  borrar(id?: string): Promise<void>;
  /** Partidas guardadas, la más reciente primero (para tener varias más adelante). No lee los datos. */
  listar(): Promise<ResumenDePartida[]>;
}

/** Convierte la partida a texto en el momento de llamar: lo que pase después no cambia lo que se guarda. */
export function serializarPartida(game: Game, agenda: readonly AgendaItem[]): PartidaEnTexto {
  const version = SAVE_VERSION;
  const texto = game.serializarJSON({ formato: FORMATO, version, nombre: game.playerName, guardadoEn: new Date().toISOString(), agenda });
  return { texto, nombre: game.playerName, version };
}

/** Lee el texto de una partida o de una copia de seguridad. Lanza un error con el motivo si no lo es. La versión del juego la valida `Game.load`. */
export function deJSON(texto: string): SaveFile {
  let o: unknown;
  try {
    o = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es una copia de seguridad (no es JSON).');
  }
  const x = o as { formato?: string; state?: GameState; agenda?: AgendaItem[] };
  if (!x || x.formato !== FORMATO || !x.state || typeof x.state !== 'object') throw new Error('El archivo no es una copia de seguridad de Dinasty Sports.');
  return { state: x.state, agenda: Array.isArray(x.agenda) ? x.agenda : [] };
}

export class AlmacenEnMemoria implements Almacen {
  readonly tipo = 'memoria';
  private readonly partidas = new Map<string, ResumenDePartida & { texto: string }>();

  async cargar(id = PARTIDA_ACTUAL): Promise<string | null> {
    return this.partidas.get(id)?.texto ?? null;
  }

  async guardar(p: PartidaEnTexto, id = PARTIDA_ACTUAL): Promise<void> {
    this.partidas.set(id, { id, nombre: p.nombre, guardadoEn: Date.now(), texto: p.texto });
  }

  async borrar(id = PARTIDA_ACTUAL): Promise<void> {
    this.partidas.delete(id);
  }

  async listar(): Promise<ResumenDePartida[]> {
    return [...this.partidas.values()].map(({ id, nombre, guardadoEn }) => ({ id, nombre, guardadoEn })).sort((a, b) => b.guardadoEn - a.guardadoEn);
  }
}

/** Dos tablas: el resumen de cada partida (pequeño, para listar) y su texto (grande, solo se lee al cargar). */
const RESUMEN = 'resumen';
const DATOS = 'datos';

export class AlmacenIndexedDB implements Almacen {
  readonly tipo = 'indexeddb';
  private conexion: Promise<IDBDatabase> | undefined;

  constructor(
    private readonly nombre = 'dinasty-sports',
    private readonly fabrica: IDBFactory = indexedDB,
  ) {}

  private abrir(): Promise<IDBDatabase> {
    this.conexion ??= new Promise((resolve, reject) => {
      const peticion = this.fabrica.open(this.nombre, 1);
      peticion.onupgradeneeded = () => {
        const bd = peticion.result;
        bd.createObjectStore(RESUMEN, { keyPath: 'id' }).createIndex('guardadoEn', 'guardadoEn');
        bd.createObjectStore(DATOS);
      };
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(peticion.error);
      peticion.onblocked = () => reject(new Error('La base de datos está abierta en otra pestaña con una versión anterior'));
    });
    return this.conexion;
  }

  /** Ejecuta las operaciones en una transacción y espera a que quede confirmada. Devuelve el resultado de la última. */
  private async transaccion<T>(modo: IDBTransactionMode, tablas: string[], operaciones: (t: Record<string, IDBObjectStore>) => IDBRequest<T>): Promise<T> {
    const db = await this.abrir();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(tablas, modo);
      const t = Object.fromEntries(tablas.map((n) => [n, tx.objectStore(n)]));
      const peticion = operaciones(t);
      tx.oncomplete = () => resolve(peticion.result);
      tx.onerror = () => reject(tx.error ?? peticion.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
    });
  }

  async cargar(id = PARTIDA_ACTUAL): Promise<string | null> {
    return (await this.transaccion<string | undefined>('readonly', [DATOS], (t) => t[DATOS].get(id))) ?? null;
  }

  async guardar(p: PartidaEnTexto, id = PARTIDA_ACTUAL): Promise<void> {
    const resumen: ResumenDePartida & { version: number } = { id, nombre: p.nombre, guardadoEn: Date.now(), version: p.version };
    // Las dos tablas en la misma transacción: o se guarda todo o nada.
    await this.transaccion('readwrite', [RESUMEN, DATOS], (t) => {
      t[RESUMEN].put(resumen);
      return t[DATOS].put(p.texto, id);
    });
  }

  async borrar(id = PARTIDA_ACTUAL): Promise<void> {
    await this.transaccion('readwrite', [RESUMEN, DATOS], (t) => {
      t[RESUMEN].delete(id);
      return t[DATOS].delete(id);
    });
  }

  async listar(): Promise<ResumenDePartida[]> {
    const todos = await this.transaccion<ResumenDePartida[]>('readonly', [RESUMEN], (t) => t[RESUMEN].getAll());
    return todos.map(({ id, nombre, guardadoEn }) => ({ id, nombre, guardadoEn })).sort((a, b) => b.guardadoEn - a.guardadoEn);
  }
}

/** IndexedDB si el navegador la tiene y deja abrirla; si no, en memoria (la partida no sobrevive a cerrar la pestaña). */
export async function crearAlmacen(): Promise<Almacen> {
  if (typeof indexedDB === 'undefined') return new AlmacenEnMemoria();
  try {
    const a = new AlmacenIndexedDB();
    await a.listar(); // abre la base: falla aquí (y no al guardar) si el navegador no la permite
    return a;
  } catch {
    return new AlmacenEnMemoria();
  }
}

/** Pide al navegador que no borre los datos del juego cuando falte espacio (no garantiza nada, pero ayuda). */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ guardado manual y automático (docs/ALMACENAMIENTO.md §8)

/** Cada cuánto se guarda sola la partida. No cambia lo guardado: solo cuándo se escribe. */
export type FrecuenciaDeGuardado = 'accion' | 'dia' | 'semana' | 'mes' | 'manual';

export const FRECUENCIAS: readonly { id: FrecuenciaDeGuardado; nombre: string }[] = [
  { id: 'accion', nombre: 'Tras cada acción' },
  { id: 'dia', nombre: 'Cada día de juego' },
  { id: 'semana', nombre: 'Cada semana de juego' },
  { id: 'mes', nombre: 'Cada mes de juego' },
  { id: 'manual', nombre: 'Solo a mano' },
];
export const FRECUENCIA_POR_DEFECTO: FrecuenciaDeGuardado = 'dia';

export const esFrecuencia = (x: unknown): x is FrecuenciaDeGuardado => FRECUENCIAS.some((f) => f.id === x);

/** Número del día, semana (empieza el lunes: el día 0 lo es) o mes del calendario del juego en que cae `dia`. */
function periodoDe(f: 'dia' | 'semana' | 'mes', dia: number): number {
  if (f === 'dia') return dia;
  if (f === 'semana') return Math.floor(dia / 7);
  const fecha = fechaDelDia(dia);
  return fecha.anio * 12 + fecha.mes;
}

/** ¿Toca guardar solo ahora? `ultimoDia` es el día del juego del último guardado (`undefined` si aún no se guardó). */
export function tocaGuardar(frecuencia: FrecuenciaDeGuardado, ultimoDia: number | undefined, dia: number): boolean {
  if (frecuencia === 'accion') return true;
  if (frecuencia === 'manual') return false;
  return ultimoDia === undefined || periodoDe(frecuencia, ultimoDia) !== periodoDe(frecuencia, dia);
}

/** La frecuencia que se recomienda según lo que tarda en guardarse la partida (ms): cuanto más tarda, más espaciado. */
export function recomendarFrecuencia(ms: number): FrecuenciaDeGuardado {
  if (ms < 80) return 'accion';
  if (ms < 250) return 'dia';
  if (ms < 1000) return 'semana';
  return 'mes';
}

export function textoDeRecomendacion(ms: number): string {
  const f = recomendarFrecuencia(ms);
  const tarda = ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s`;
  return `Tu partida tarda ${tarda} en guardarse: te recomendamos «${FRECUENCIAS.find((x) => x.id === f)!.nombre.toLowerCase()}».`;
}

const CLAVE_FRECUENCIA = 'dinasty-sports.guardado.';

/** La frecuencia elegida para una partida (se recuerda en el navegador, fuera de la partida guardada). */
export function leerFrecuencia(id = PARTIDA_ACTUAL, almacenLocal: Pick<Storage, 'getItem'> | undefined = guardadoLocal()): FrecuenciaDeGuardado {
  try {
    const x = almacenLocal?.getItem(CLAVE_FRECUENCIA + id);
    return esFrecuencia(x) ? x : FRECUENCIA_POR_DEFECTO;
  } catch {
    return FRECUENCIA_POR_DEFECTO;
  }
}

export function escribirFrecuencia(f: FrecuenciaDeGuardado, id = PARTIDA_ACTUAL, almacenLocal: Pick<Storage, 'setItem'> | undefined = guardadoLocal()): void {
  try {
    almacenLocal?.setItem(CLAVE_FRECUENCIA + id, f);
  } catch {
    /* sin almacenamiento local: se queda la elegida mientras dure la pestaña */
  }
}

function guardadoLocal(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------ copia de recuperación

/** Copia aparte de la partida con cambios sin guardar: se escribe al ocultarse la pestaña y nunca pisa la partida guardada. */
export const PARTIDA_DE_RECUPERACION = 'recuperacion';

export interface Recuperacion {
  texto: string;
  nombre: string;
  /** Cuándo se escribió la copia (hora real). */
  guardadoEn: number;
  /** Día del juego (para enseñar la fecha) y minuto absoluto (para comparar con la guardada). */
  dia: number;
  minuto: number;
}

const minutoDe = (texto: string): number | null => {
  try {
    const m = deJSON(texto).state.minute;
    return typeof m === 'number' ? m : null;
  } catch {
    return null;
  }
};

export const fechaDeJuego = (dia: number): string => fechaDelDia(dia).conAnio;

export function guardarRecuperacion(almacen: Almacen, partida: PartidaEnTexto): Promise<void> {
  return almacen.guardar(partida, PARTIDA_DE_RECUPERACION);
}

export function borrarRecuperacion(almacen: Almacen): Promise<void> {
  return almacen.borrar(PARTIDA_DE_RECUPERACION);
}

/**
 * La copia de recuperación si es más reciente que la partida guardada (`textoGuardado`, o `null` si no hay ninguna).
 * Una copia que no aporta nada (igual o más antigua) o que no se puede leer se borra y devuelve `null`.
 */
export async function leerRecuperacion(almacen: Almacen, textoGuardado: string | null): Promise<Recuperacion | null> {
  const texto = await almacen.cargar(PARTIDA_DE_RECUPERACION);
  if (texto === null) return null;
  const minuto = minutoDe(texto);
  const guardada = textoGuardado === null ? -1 : (minutoDe(textoGuardado) ?? -1);
  if (minuto === null || minuto <= guardada) {
    await borrarRecuperacion(almacen).catch(() => undefined);
    return null;
  }
  const resumen = (await almacen.listar()).find((r) => r.id === PARTIDA_DE_RECUPERACION);
  return { texto, nombre: deJSON(texto).state.playerName, guardadoEn: resumen?.guardadoEn ?? 0, dia: Math.floor(minuto / MINUTES_PER_DAY), minuto };
}
