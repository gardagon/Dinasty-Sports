import { INTERFAZ_DE_DEPORTES, type GameModule } from '@ds/contracts';
import { ANFITRION_DE_DEPORTES, CLAVE_PUBLICA_DE_DEPORTES } from '@ds/game';
import { Instalador, almacenEnMemoria, fuenteWeb, type AlmacenDePaquetes, type DeporteInstalado, type EntradaDeCatalogo } from '@ds/paquetes';

/**
 * Los deportes que se instalan en este dispositivo (fase 6 del plan de deportes modulares). Los paquetes se guardan en IndexedDB para jugar sin conexión;
 * si el navegador no la deja usar, en memoria (se pierden al cerrar). La fuente es la carpeta `deportes/` de la propia web del juego (GitHub Pages).
 */

const BASE_DE_DATOS = 'dinasty-sports-deportes';
const TABLA = 'paquetes';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE_DE_DATOS, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(TABLA);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });
}

const peticion = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolver, rechazar) => {
    r.onsuccess = () => resolver(r.result);
    r.onerror = () => rechazar(r.error);
  });

/** Los paquetes en IndexedDB; si no se puede abrir, en memoria. */
export function almacenDePaquetes(): AlmacenDePaquetes {
  const memoria = almacenEnMemoria();
  let base: Promise<IDBDatabase | null> | undefined;
  const db = () => (base ??= typeof indexedDB === 'undefined' ? Promise.resolve(null) : abrir().catch(() => null));
  const tabla = async (modo: IDBTransactionMode) => (await db())?.transaction(TABLA, modo).objectStore(TABLA);
  return {
    async leer(id) {
      const t = await tabla('readonly');
      return t ? ((await peticion(t.get(id))) as string | undefined) ?? null : memoria.leer(id);
    },
    async guardar(id, texto) {
      const t = await tabla('readwrite');
      if (t) await peticion(t.put(texto, id));
      else await memoria.guardar(id, texto);
    },
    async borrar(id) {
      const t = await tabla('readwrite');
      if (t) await peticion(t.delete(id));
      else await memoria.borrar(id);
    },
    async ids() {
      const t = await tabla('readonly');
      return t ? ((await peticion(t.getAllKeys())) as string[]) : memoria.ids();
    },
  };
}

export const instalador = new Instalador(almacenDePaquetes(), { clavePublica: CLAVE_PUBLICA_DE_DEPORTES, interfaz: INTERFAZ_DE_DEPORTES }, ANFITRION_DE_DEPORTES);

/** La carpeta `deportes/` junto a la web del juego (relativa a la página: vale en GitHub Pages, en local y empaquetada). */
export const fuenteDelJuego = () => fuenteWeb(new URL('deportes/', document.baseURI).href, 'Web del juego');

export interface EstadoDeDeportes {
  instalados: DeporteInstalado[];
  catalogo: EntradaDeCatalogo[];
  /** Último fallo al consultar la fuente o instalar (texto para enseñar). */
  error: string;
  /** Qué se está haciendo («Descargando…»), o vacío. */
  ocupado: string;
}

export const estadoDeDeportes: EstadoDeDeportes = { instalados: [], catalogo: [], error: '', ocupado: '' };

const motivo = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Lee lo instalado y devuelve los módulos de esos deportes (los que no se pueden cargar quedan fuera, con su aviso). */
export async function cargarInstalados(): Promise<{ modulos: GameModule<any>[]; avisos: string[] }> {
  estadoDeDeportes.instalados = await instalador.instalados();
  return instalador.modulos();
}

/** Consulta el catálogo de la fuente (necesita conexión; si falla, se queda con el error). */
export async function consultarCatalogo(): Promise<void> {
  estadoDeDeportes.error = '';
  try {
    estadoDeDeportes.catalogo = await fuenteDelJuego().catalogo();
  } catch (e) {
    estadoDeDeportes.catalogo = [];
    estadoDeDeportes.error = motivo(e);
  }
}

/** Instala una entrada del catálogo o un archivo bajado a mano. Devuelve el nombre del deporte, o `undefined` si falló (el motivo queda en `error`). */
export async function instalarDeporte(origen: EntradaDeCatalogo | string): Promise<string | undefined> {
  estadoDeDeportes.error = '';
  try {
    const m = typeof origen === 'string' ? await instalador.instalar(origen) : await instalador.instalarDe(fuenteDelJuego(), origen);
    estadoDeDeportes.instalados = await instalador.instalados();
    return m.nombre;
  } catch (e) {
    estadoDeDeportes.error = motivo(e);
    return undefined;
  }
}

export async function desinstalarDeporte(id: string): Promise<void> {
  await instalador.desinstalar(id);
  estadoDeDeportes.instalados = await instalador.instalados();
}
