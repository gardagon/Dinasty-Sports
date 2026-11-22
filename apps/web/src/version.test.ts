import { describe, expect, it } from 'vitest';
import { SIN_VERSION, esMasNueva, fechaDeCompilacion, leerVersion, textoCorto, textoDeVersion, versionActual, versionPublicada, type Version } from './version';

const v = (id: string, fecha = '2026-11-22T14:05:00.000Z', extra: Partial<Version> = {}): Version => ({ id, commit: id.slice(0, 7), fecha, rama: 'main', pr: '128', ...extra });

describe('versión visible', () => {
  it('sin inyección (tests, vite dev) es «desarrollo»', () => expect(versionActual()).toBe(SIN_VERSION));

  it('se escribe con commit, fecha, rama y PR; sin lo que falta', () => {
    expect(textoDeVersion(v('abcdef1234'))).toBe('abcdef1 · 22 nov 2026, 14:05 UTC · rama main · PR #128');
    expect(textoDeVersion(v('abcdef1234', '', { rama: '', pr: '' }))).toBe('abcdef1');
    expect(textoCorto(v('abcdef1234'))).toBe('versión abcdef1 · 22 nov');
    expect(fechaDeCompilacion('no es fecha')).toBe('');
  });

  it('compara compilaciones: otra y no más antigua es nueva', () => {
    const local = v('aaaaaaa1');
    expect(esMasNueva(v('aaaaaaa1'), local)).toBe(false);
    expect(esMasNueva(v('bbbbbbb2', '2026-11-23T10:00:00.000Z'), local)).toBe(true);
    expect(esMasNueva(v('bbbbbbb2', '2026-11-20T10:00:00.000Z'), local)).toBe(false);
    expect(esMasNueva(v('bbbbbbb2', ''), local)).toBe(true);
    expect(esMasNueva(v(''), local)).toBe(false);
  });

  it('lee un version.json y rechaza lo que no lo es', () => {
    expect(leerVersion({ id: 'abcdef1234', fecha: 'x' })?.commit).toBe('abcdef1');
    expect(leerVersion({})).toBeNull();
    expect(leerVersion('<html>')).toBeNull();
    expect(leerVersion(null)).toBeNull();
  });

  it('pide version.json sin caché y con un parámetro que cambia; los fallos no son errores', async () => {
    const pedidas: string[] = [];
    const ok = await versionPublicada('https://x.test/juego', async (u, o) => (pedidas.push(`${u}|${o.cache}`), { ok: true, json: async () => v('ccccccc3') }), 42);
    expect(ok?.id).toBe('ccccccc3');
    expect(pedidas).toEqual(['https://x.test/juego/version.json?_=42|no-store']);
    expect(await versionPublicada('./', async () => ({ ok: false, json: async () => ({}) }))).toBeNull();
    expect(await versionPublicada('./', async () => { throw new Error('sin red'); })).toBeNull();
    expect(await versionPublicada('./', async () => ({ ok: true, json: async () => { throw new Error('no es JSON'); } }))).toBeNull();
  });
});
