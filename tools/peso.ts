/**
 * El peso del estado de la partida por módulo y campo, y su comparación con lo anotado la última vez (`tools/peso-base.json`).
 * Lo usa `npm run presupuesto`: si el estado pasa del tope **avisa** (sin fallar) y dice qué módulo y campo ha crecido.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ARCHIVO_BASE = join(dirname(fileURLToPath(import.meta.url)), 'peso-base.json');

/** Peso en KB de cada `módulo.clave` del estado de un módulo y, si esa clave es una lista de objetos (las personas), de cada `módulo.clave.campo`. */
export function pesoPorCampo(modulos: Record<string, unknown>): Record<string, number> {
  const kb = (v: unknown): number => (JSON.stringify(v)?.length ?? 0) / 1024;
  const r: Record<string, number> = {};
  for (const [mod, estado] of Object.entries(modulos)) {
    r[mod] = kb(estado);
    if (typeof estado !== 'object' || estado === null) continue;
    for (const [clave, valor] of Object.entries(estado)) {
      const peso = kb(valor);
      if (peso < 1) continue;
      r[`${mod}.${clave}`] = peso;
      if (Array.isArray(valor) && valor.length > 64 && typeof valor[0] === 'object' && valor[0] !== null) {
        const campos = new Map<string, number>();
        for (const x of valor as Record<string, unknown>[]) for (const [c, v] of Object.entries(x)) campos.set(c, (campos.get(c) ?? 0) + (JSON.stringify(v)?.length ?? 0));
        for (const [c, n] of campos) if (n / 1024 >= 1) r[`${mod}.${clave}.${c}`] = n / 1024;
      }
    }
  }
  return r;
}

export type PesosBase = Record<string, { totalKB: number; campos: Record<string, number> }>;

export function leerBase(): PesosBase {
  return existsSync(ARCHIVO_BASE) ? (JSON.parse(readFileSync(ARCHIVO_BASE, 'utf8')) as PesosBase) : {};
}

export function guardarBase(escenario: string, totalKB: number, campos: Record<string, number>): void {
  const base = leerBase();
  base[escenario] = { totalKB: Math.round(totalKB), campos: Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, Math.round(v)])) };
  writeFileSync(ARCHIVO_BASE, JSON.stringify(base, null, 2) + '\n');
}

/** Lo que más ha crecido frente a lo anotado (de más a menos), solo los campos de más de 20 KB que crecen más de un 3 %; sin anotación, lo más pesado. */
export function crecimientos(actual: Record<string, number>, anterior: Record<string, number> | undefined): string[] {
  if (!anterior) {
    return Object.entries(actual).filter(([k]) => k.split('.').length === 3).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v.toFixed(0)} KB`);
  }
  return Object.entries(actual)
    .map(([k, v]) => ({ k, v, antes: anterior[k] ?? 0 }))
    .filter(({ v, antes }) => v - antes > 20 && v > antes * 1.03)
    .sort((a, b) => b.v - b.antes - (a.v - a.antes))
    .slice(0, 8)
    .map(({ k, v, antes }) => `${k} ${antes.toFixed(0)} → ${v.toFixed(0)} KB (${v - antes >= 0 ? '+' : ''}${(v - antes).toFixed(0)} KB)`);
}
