/**
 * Qué versión del juego es esta y si hay otra más nueva publicada. La compilación inyecta `__DS_VERSION__` (ver `vite.config.ts`) y publica el mismo dato en
 * `version.json` junto a la web; la app lo pide **sin caché** al abrir y cada cierto tiempo, y si es otra compilación avisa («Hay una versión nueva — Actualizar»).
 */

export interface Version {
  id: string;
  commit: string;
  fecha: string;
  rama: string;
  pr: string;
}

export const SIN_VERSION: Version = { id: 'desarrollo', commit: 'desarrollo', fecha: '', rama: '', pr: '' };

/** La compilación en marcha (en `vite dev` y en los tests no hay inyección: «desarrollo»). */
export const versionActual = (): Version => (typeof __DS_VERSION__ === 'undefined' ? SIN_VERSION : __DS_VERSION__);

const f2 = (n: number) => String(n).padStart(2, '0');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «22 nov 2026, 14:05 UTC» (en UTC a propósito: dos personas que comparan la versión leen lo mismo). */
export function fechaDeCompilacion(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${f2(d.getUTCHours())}:${f2(d.getUTCMinutes())} UTC`;
}

/** Lo que se ve en Opciones: «a1b2c3d · 22 nov 2026, 14:05 UTC · rama main · PR #128». */
export function textoDeVersion(v: Version): string {
  return [v.commit, fechaDeCompilacion(v.fecha), v.rama && `rama ${v.rama}`, v.pr && `PR #${v.pr}`].filter(Boolean).join(' · ');
}

/** Lo que se ve en pequeño en el menú, para comparar de un vistazo: «versión a1b2c3d · 22 nov». */
export function textoCorto(v: Version): string {
  const d = new Date(v.fecha);
  const dia = v.fecha && !Number.isNaN(d.getTime()) ? ` · ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}` : '';
  return `versión ${v.commit}${dia}`;
}

/** ¿Es `remota` otra compilación más reciente que `local`? Distinta y no más antigua (si las dos traen fecha); así una publicación vieja no hace ir y venir. */
export function esMasNueva(remota: Version, local: Version): boolean {
  if (!remota.id || remota.id === local.id) return false;
  const r = Date.parse(remota.fecha);
  const l = Date.parse(local.fecha);
  return Number.isNaN(r) || Number.isNaN(l) ? true : r >= l;
}

/** Lee un `version.json` (cualquier cosa que no tenga la forma devuelve `null`). */
export function leerVersion(dato: unknown): Version | null {
  const o = dato as Partial<Record<keyof Version, unknown>> | null;
  if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !o.id) return null;
  const t = (x: unknown) => (typeof x === 'string' ? x : '');
  return { id: o.id, commit: t(o.commit) || o.id.slice(0, 7), fecha: t(o.fecha), rama: t(o.rama), pr: t(o.pr) };
}

export type Pedir = (url: string, opciones: { cache: 'no-store' }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/**
 * Pide `version.json` sin caché (ni la del navegador ni la del service worker, que no lo guarda) y dice qué compilación hay publicada.
 * Sin conexión o sin ese archivo (p. ej. `vite dev`) devuelve `null`: no es un error.
 */
export async function versionPublicada(base: string, pedir: Pedir = (u, o) => fetch(u, o), ahora = Date.now()): Promise<Version | null> {
  try {
    const r = await pedir(`${base.replace(/\/?$/, '/')}version.json?_=${ahora}`, { cache: 'no-store' });
    return r.ok ? leerVersion(await r.json()) : null;
  } catch {
    return null;
  }
}
