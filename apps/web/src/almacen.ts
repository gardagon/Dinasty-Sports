import type { GameState } from '@ds/core';

/**
 * Dónde se guardan las partidas. La interfaz solo habla con `Almacen`; la implementación real es IndexedDB (cientos de MB en vez de los
 * ~5 MB de localStorage y sin convertir la partida a texto), y hay otra en memoria para los tests y para cuando el navegador no deja
 * usar IndexedDB (algunos modos privados). Las copias de seguridad se exportan e importan como JSON (`aJSON`, `deJSON`).
 * Plan y fases: `docs/ALMACENAMIENTO.md`.
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

export interface ResumenDePartida {
  id: string;
  nombre: string;
  guardadoEn: number;
}

export const PARTIDA_ACTUAL = 'actual';

export interface Almacen {
  readonly tipo: 'indexeddb' | 'memoria';
  cargar(id?: string): Promise<SaveFile | null>;
  guardar(data: SaveFile, id?: string): Promise<void>;
  borrar(id?: string): Promise<void>;
  /** Partidas guardadas, la más reciente primero (para tener varias más adelante). */
  listar(): Promise<ResumenDePartida[]>;
}

/** Lo que hay en la base de datos por partida. */
interface Registro {
  id: string;
  nombre: string;
  guardadoEn: number;
  version: number;
  data: SaveFile;
}

export class AlmacenEnMemoria implements Almacen {
  readonly tipo = 'memoria';
  private readonly partidas = new Map<string, Registro>();

  async cargar(id = PARTIDA_ACTUAL): Promise<SaveFile | null> {
    const r = this.partidas.get(id);
    return r ? structuredClone(r.data) : null;
  }

  async guardar(data: SaveFile, id = PARTIDA_ACTUAL): Promise<void> {
    this.partidas.set(id, { id, nombre: data.state.playerName, guardadoEn: Date.now(), version: data.state.version, data: structuredClone(data) });
  }

  async borrar(id = PARTIDA_ACTUAL): Promise<void> {
    this.partidas.delete(id);
  }

  async listar(): Promise<ResumenDePartida[]> {
    return [...this.partidas.values()].map(({ id, nombre, guardadoEn }) => ({ id, nombre, guardadoEn })).sort((a, b) => b.guardadoEn - a.guardadoEn);
  }
}

const TABLA = 'partidas';

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
        // Versión 1 de la base: una tabla de partidas por id, con un índice por fecha para listarlas.
        const tabla = peticion.result.createObjectStore(TABLA, { keyPath: 'id' });
        tabla.createIndex('guardadoEn', 'guardadoEn');
      };
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(peticion.error);
      peticion.onblocked = () => reject(new Error('La base de datos está abierta en otra pestaña con una versión anterior'));
    });
    return this.conexion;
  }

  /** Ejecuta una operación en una transacción y espera a que quede confirmada. */
  private async transaccion<T>(modo: IDBTransactionMode, operacion: (tabla: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.abrir();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(TABLA, modo);
      const peticion = operacion(tx.objectStore(TABLA));
      tx.oncomplete = () => resolve(peticion.result);
      tx.onerror = () => reject(tx.error ?? peticion.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
    });
  }

  async cargar(id = PARTIDA_ACTUAL): Promise<SaveFile | null> {
    const r = await this.transaccion<Registro | undefined>('readonly', (t) => t.get(id));
    return r?.data ?? null;
  }

  async guardar(data: SaveFile, id = PARTIDA_ACTUAL): Promise<void> {
    // IndexedDB guarda el objeto tal cual (clon estructurado): no hay que convertirlo a texto.
    const registro: Registro = { id, nombre: data.state.playerName, guardadoEn: Date.now(), version: data.state.version, data };
    await this.transaccion('readwrite', (t) => t.put(registro));
  }

  async borrar(id = PARTIDA_ACTUAL): Promise<void> {
    await this.transaccion('readwrite', (t) => t.delete(id));
  }

  async listar(): Promise<ResumenDePartida[]> {
    const todos = await this.transaccion<Registro[]>('readonly', (t) => t.getAll());
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

// ------------------------------------------------------------------ copias de seguridad en JSON

const FORMATO = 'dinasty-sports';

export function aJSON(data: SaveFile): string {
  return JSON.stringify({ formato: FORMATO, version: data.state.version, guardadoEn: new Date().toISOString(), state: data.state, agenda: data.agenda });
}

/** Lee una copia de seguridad. Lanza un error con el motivo si no lo es. La versión del juego la valida `Game.load`. */
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
