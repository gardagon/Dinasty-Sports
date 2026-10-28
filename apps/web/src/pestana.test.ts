import { describe, expect, it } from 'vitest';
import { NOMBRE_DEL_BLOQUEO, reclamarPestana, type Bloqueos } from './pestana';

/**
 * Unos bloqueos de mentira con la conducta de `navigator.locks` que nos importa (un solo nombre): exclusivo, con cola y con `ifAvailable`.
 * Quien consigue el bloqueo lo tiene hasta que `soltar()` («se cierra la pestaña»).
 */
function bloqueosFalsos(): { bloqueos: Bloqueos; soltar(): void } {
  let ocupado = false;
  const cola: ((lock: unknown) => Promise<unknown>)[] = [];
  const ejecutar = (cb: (lock: unknown) => Promise<unknown>) => {
    ocupado = true;
    void cb({});
  };
  const bloqueos: Bloqueos = {
    request: ((nombre: string, a: unknown, b?: unknown) => {
      expect(nombre).toBe(NOMBRE_DEL_BLOQUEO);
      const ifAvailable = typeof a !== 'function' && (a as { ifAvailable?: boolean }).ifAvailable === true;
      const cb = (typeof a === 'function' ? a : b) as (lock: unknown) => Promise<unknown>;
      if (!ocupado) ejecutar(cb);
      else if (ifAvailable) void cb(null);
      else cola.push(cb);
      return Promise.resolve();
    }) as Bloqueos['request'],
  };
  return {
    bloqueos,
    soltar: () => {
      ocupado = false;
      const siguiente = cola.shift();
      if (siguiente) ejecutar(siguiente);
    },
  };
}

describe('una sola pestaña guarda', () => {
  it('sin API de bloqueos se guarda como siempre', async () => {
    expect(await reclamarPestana(() => undefined, undefined)).toBe(true);
  });

  it('la primera pestaña guarda; la segunda no, y cuando la primera se cierra la segunda se entera', async () => {
    const { bloqueos, soltar } = bloqueosFalsos();
    let liberada = 0;
    expect(await reclamarPestana(() => undefined, bloqueos)).toBe(true);
    expect(await reclamarPestana(() => liberada++, bloqueos)).toBe(false);
    expect(liberada).toBe(0);
    soltar(); // se cierra la primera pestaña
    await new Promise((r) => setTimeout(r, 0));
    expect(liberada).toBe(1);
  });

  it('si el navegador falla al pedir el bloqueo, no se impide guardar', async () => {
    const roto: Bloqueos = { request: (() => { throw new Error('no'); }) as Bloqueos['request'] };
    expect(await reclamarPestana(() => undefined, roto)).toBe(true);
  });
});
