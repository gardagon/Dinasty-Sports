// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

describe('prueba del retrato: solo se abre si se pide', () => {
  it('reconoce ?prueba-retrato (y #prueba-retrato) y nada más', async () => {
    const { pidenPruebaRetrato } = await import('./prueba-retrato');
    const con = (search: string, hash = ''): boolean => { vi.stubGlobal('location', { search, hash }); return pidenPruebaRetrato(); };
    expect(con('?prueba-retrato')).toBe(true);
    expect(con('?x=1&prueba-retrato')).toBe(true);
    expect(con('', '#prueba-retrato')).toBe(true);
    expect(con('')).toBe(false);
    expect(con('?otra-prueba-retrato-x')).toBe(false);
    vi.unstubAllGlobals();
  });
});
