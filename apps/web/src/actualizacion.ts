import { esMasNueva, textoCorto, versionActual, versionPublicada, type Version } from './version';

/**
 * Mantener la app al día: comprueba al abrir y cada cierto tiempo si hay una compilación más nueva publicada (`version.json`, pedido sin caché) o un deporte instalado
 * con código nuevo, y avisa. Al pulsar «Actualizar» guarda la partida, baja los deportes nuevos, limpia las copias del service worker y recarga.
 */

/** Cada cuánto se vuelve a mirar con la app abierta (y al volver a ella tras un rato en segundo plano). */
export const CADA_CUANTO_MS = 30 * 60 * 1000;

export interface EstadoDeActualizacion {
  /** Hay algo nuevo que bajar (enseña el aviso «Hay una versión nueva — Actualizar»). */
  hay: boolean;
  /** Qué es lo nuevo, en texto («una versión nueva del juego», «una versión nueva de Fútbol»). */
  queHay: string;
  /** Se está comprobando o actualizando ahora. */
  ocupado: string;
  /** Resultado de la última comprobación pedida a mano («Estás al día…», «No se pudo comprobar…»). */
  mensaje: string;
}

export const estadoDeActualizacion: EstadoDeActualizacion = { hay: false, queHay: '', ocupado: '', mensaje: '' };

/** Lo que la comprobación necesita de fuera (en los tests, falso). */
export interface Dependencias {
  base: string;
  local: Version;
  publicada(base: string): Promise<Version | null>;
  /** Nombres de los deportes instalados que tienen una versión nueva en la web. Puede fallar (sin conexión). */
  deportesNuevos(): Promise<string[]>;
}

export interface Resultado {
  /** ¿Se pudo hablar con la web? Si no, no se sabe si hay algo nuevo. */
  conexion: boolean;
  version: Version | null;
  deportes: string[];
}

/** Mira qué hay publicado y lo compara con lo que corre. Devuelve el estado sin tocar el global (para poder probarlo). */
export async function comprobar(d: Dependencias): Promise<Resultado & { hay: boolean; queHay: string }> {
  const publicada = await d.publicada(d.base);
  const deportes = await d.deportesNuevos().catch(() => [] as string[]);
  const nuevaVersion = !!publicada && esMasNueva(publicada, d.local);
  const partes = [nuevaVersion && 'una versión nueva del juego', ...deportes.map((n) => `una versión nueva de ${n}`)].filter(Boolean) as string[];
  return { conexion: !!publicada, version: publicada, deportes, hay: partes.length > 0, queHay: partes.join(' y ') };
}

/** Lo que se dice tras pedir «Buscar actualización» a mano. */
export function mensajeDeComprobacion(r: Resultado & { hay: boolean }, local: Version): string {
  if (r.hay) return '';
  if (!r.conexion) return 'No se pudo comprobar: no hay conexión con la web del juego (o esta compilación no es la publicada).';
  return `Estás al día (${textoCorto(local)}).`;
}

let temporizador: ReturnType<typeof setInterval> | undefined;

export interface Enganche {
  deps: Dependencias;
  /** Vuelve a pintar la pantalla cuando cambia el estado. */
  pintar(): void;
}

/** Comprueba ahora. `aMano` enseña también «Estás al día» / «No se pudo comprobar». */
export async function buscarActualizacion(e: Enganche, aMano = false): Promise<void> {
  if (estadoDeActualizacion.ocupado) return;
  estadoDeActualizacion.ocupado = 'Buscando actualización…';
  if (aMano) estadoDeActualizacion.mensaje = '';
  e.pintar();
  try {
    const r = await comprobar(e.deps);
    // Un aviso ya puesto no se quita porque una comprobación fallara (sin conexión): solo se quita si la web contesta y ya no hay nada.
    if (r.hay || r.conexion) {
      estadoDeActualizacion.hay = r.hay;
      estadoDeActualizacion.queHay = r.queHay;
    }
    if (aMano) estadoDeActualizacion.mensaje = mensajeDeComprobacion(r, e.deps.local);
  } finally {
    estadoDeActualizacion.ocupado = '';
    e.pintar();
  }
}

/** Mira al abrir, cada `CADA_CUANTO_MS` y al volver a la pestaña. */
export function vigilarActualizaciones(e: Enganche): void {
  void buscarActualizacion(e);
  if (temporizador !== undefined) return;
  temporizador = setInterval(() => void buscarActualizacion(e), CADA_CUANTO_MS);
  let ultima = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - ultima < 5 * 60 * 1000) return;
    ultima = Date.now();
    void buscarActualizacion(e);
  });
}

/** Lo que hace falta para aplicar: guardar la partida (devuelve si se pudo), instalar los deportes nuevos y recargar. */
export interface Aplicacion {
  guardar(): Promise<boolean>;
  instalarDeportes(): Promise<void>;
  recargar(): void;
  pintar(): void;
}

/** Guarda, baja lo nuevo, limpia las copias del navegador y recarga. Si no se puede guardar la partida, no recarga (no se pierde nada). */
export async function aplicarActualizacion(a: Aplicacion): Promise<void> {
  if (estadoDeActualizacion.ocupado) return;
  estadoDeActualizacion.ocupado = 'Actualizando…';
  estadoDeActualizacion.mensaje = '';
  a.pintar();
  try {
    if (!(await a.guardar())) {
      estadoDeActualizacion.mensaje = 'No se pudo guardar la partida, así que no se ha actualizado. Descarga una copia de seguridad desde Opciones y vuelve a probar.';
      return;
    }
    await a.instalarDeportes().catch((err) => console.warn('No se pudieron actualizar los deportes', err));
    await limpiarCopias();
    a.recargar();
  } catch (err) {
    estadoDeActualizacion.mensaje = `No se pudo actualizar: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    if (estadoDeActualizacion.mensaje) {
      estadoDeActualizacion.ocupado = '';
      a.pintar();
    }
  }
}

/** Borra las copias del service worker y le pide que mire si hay un `sw.js` nuevo (la partida y los deportes instalados viven en IndexedDB: no se tocan). */
async function limpiarCopias(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) await (await navigator.serviceWorker.getRegistration())?.update();
  } catch {
    /* sin conexión o sin worker: da igual */
  }
  try {
    if (typeof caches !== 'undefined') await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {
    /* idem */
  }
}

export const dependenciasReales = (deportesNuevos: () => Promise<string[]>): Dependencias => ({
  base: typeof document === 'undefined' ? './' : new URL('./', document.baseURI).href,
  local: versionActual(),
  publicada: (b) => versionPublicada(b),
  deportesNuevos,
});
