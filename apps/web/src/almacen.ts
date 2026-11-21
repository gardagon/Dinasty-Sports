import { SAVE_VERSION, type Game, type GameState } from '@ds/core';
import { MINUTES_PER_DAY, fechaDelDia } from '@ds/contracts';
import { serializarPorTrozos } from './serializar';

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

/** Lo mismo, pero como `Blob` (lo que sale de guardar por trozos): IndexedDB lo guarda sin bloquear la página. `bytes` es lo que pesa. */
export interface PartidaEnBlob {
  blob: Blob;
  nombre: string;
  version: number;
  bytes: number;
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
  guardar(partida: PartidaEnTexto | PartidaEnBlob, id?: string): Promise<void>;
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

/**
 * Lo mismo que `serializarPartida`, pero **sin congelar la página**: el texto se hace por trozos con pausas y se vuelca a un `Blob` (`serializar.ts`). El texto es
 * el mismo, byte a byte. Quien cambie la partida mientras se hace tiene que llamar antes a `alCambiarElEstado()`; si se descarta por eso, devuelve `null` y hay que repetirlo. `msDeTrabajo` es lo que cuesta de
 * verdad (sin las pausas) y `msMaximoSeguido` lo más que se bloqueó la página de una vez.
 */
export async function serializarPartidaPorTrozos(
  game: Game,
  agenda: readonly AgendaItem[],
): Promise<(PartidaEnBlob & { msDeTrabajo: number; msMaximoSeguido: number }) | null> {
  const version = SAVE_VERSION;
  const extras = { formato: FORMATO, version, nombre: game.playerName, guardadoEn: new Date().toISOString(), agenda: [...agenda] };
  // El estado vivo (`Game` no lo enseña: solo da texto o una copia, que cuesta tanto como el texto). Si algún día cambia, se cae al texto de golpe.
  const vivo = (game as unknown as { s?: unknown }).s;
  if (vivo === undefined || typeof Blob === 'undefined') {
    const p = serializarPartida(game, agenda);
    return { blob: new Blob([p.texto]), nombre: p.nombre, version, bytes: p.texto.length, msDeTrabajo: 0, msMaximoSeguido: 0 };
  }
  const hecho = await serializarPorTrozos({ ...extras, state: vivo }, { comoBlob: true });
  if (hecho === null) return null;
  const { datos, msDeTrabajo, msMaximoSeguido } = hecho;
  const blob = datos as Blob;
  return { blob, nombre: game.playerName, version, bytes: blob.size, msDeTrabajo, msMaximoSeguido };
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

  async guardar(p: PartidaEnTexto | PartidaEnBlob, id = PARTIDA_ACTUAL): Promise<void> {
    this.partidas.set(id, { id, nombre: p.nombre, guardadoEn: Date.now(), texto: 'blob' in p ? await p.blob.text() : p.texto });
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
    // Lo guardado es texto (partidas antiguas) o un `Blob` (guardado por trozos): el `Blob` se lee fuera del hilo de la página.
    const dato = await this.transaccion<string | Blob | undefined>('readonly', [DATOS], (t) => t[DATOS].get(id));
    if (dato === undefined) return null;
    return typeof dato === 'string' ? dato : dato.text();
  }

  async guardar(p: PartidaEnTexto | PartidaEnBlob, id = PARTIDA_ACTUAL): Promise<void> {
    const resumen: ResumenDePartida & { version: number } = { id, nombre: p.nombre, guardadoEn: Date.now(), version: p.version };
    // Las dos tablas en la misma transacción: o se guarda todo o nada.
    const escribir = (dato: string | Blob): Promise<void> =>
      this.transaccion('readwrite', [RESUMEN, DATOS], (t) => {
        t[RESUMEN].put(resumen);
        return t[DATOS].put(dato, id);
      }).then(() => undefined);
    if (!('blob' in p)) return escribir(p.texto);
    try {
      await escribir(p.blob);
    } catch (e) {
      // Algún navegador no deja guardar `Blob`s en IndexedDB (p. ej. en modos privados): se guarda el texto, que siempre se puede.
      console.warn('IndexedDB no guarda el Blob: se guarda como texto', e);
      await escribir(await p.blob.text());
    }
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

/**
 * La frecuencia que se recomienda según lo que cuesta guardar la partida (ms de trabajo del navegador, sin contar las pausas): cuanto más cuesta, más espaciado.
 * Desde que se guarda por trozos sin congelar la página (`serializar.ts`) ya no hay tirones, así que los límites son más holgados que antes (80 / 250 / 1000 ms):
 * lo que queda es el gasto de batería y de CPU de guardar 16 MB tras cada acción, que sigue sin compensar en la ciudad grande.
 */
export function recomendarFrecuencia(ms: number): FrecuenciaDeGuardado {
  if (ms < 150) return 'accion';
  if (ms < 600) return 'dia';
  if (ms < 2500) return 'semana';
  return 'mes';
}

export function textoDeRecomendacion(ms: number): string {
  const f = recomendarFrecuencia(ms);
  const tarda = ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s`;
  return `Guardar tu partida cuesta ${tarda} de trabajo (sin congelar la pantalla): te recomendamos «${FRECUENCIAS.find((x) => x.id === f)!.nombre.toLowerCase()}».`;
}

/** Lo que pesa la partida guardada y lo más que se bloqueó la pantalla al guardarla, para enseñarlo en Opciones. */
export function textoDePeso(caracteres: number | undefined, bloqueoMs: number | undefined): string {
  if (caracteres === undefined) return '';
  const mb = caracteres / 1024 / 1024;
  const peso = mb >= 1 ? `${mb.toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(caracteres / 1024))} KB`;
  const bloqueo = bloqueoMs === undefined ? '' : ` La pantalla no se detiene más de ${Math.max(1, Math.round(bloqueoMs))} ms de una vez.`;
  return `La partida guardada pesa ${peso}.${bloqueo}`;
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
