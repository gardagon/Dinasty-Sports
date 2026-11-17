import { describe, expect, it } from 'vitest';
import { SERVICES, type SucesosService } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PRESENTACION_POR_DEFECTO, escribirPresentacion, leerPresentacion, moduloDePresentacion } from './presentacion';

const memoria = () => {
  const mem = new Map<string, string>();
  return { mem, local: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) } };
};

describe('presentación de los sucesos (Opciones)', () => {
  it('por defecto no cambia nada y lo guardado se lee de vuelta', () => {
    const { local } = memoria();
    expect(leerPresentacion(local)).toEqual(PRESENTACION_POR_DEFECTO);
    escribirPresentacion({ consecuencias: 'numeros', fueraDeCaracter: 'sombreadas' }, local);
    expect(leerPresentacion(local)).toEqual({ consecuencias: 'numeros', fueraDeCaracter: 'sombreadas' });
  });

  it('un valor roto o un almacenamiento bloqueado vuelven al de partida', () => {
    const { mem, local } = memoria();
    mem.set('dinasty-sports.presentacion', '{"consecuencias":"todo","fueraDeCaracter":"ocultas"}');
    expect(leerPresentacion(local)).toEqual({ consecuencias: 'pistas', fueraDeCaracter: 'ocultas' });
    mem.set('dinasty-sports.presentacion', 'no es json');
    expect(leerPresentacion(local)).toEqual(PRESENTACION_POR_DEFECTO);
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(leerPresentacion(roto)).toEqual(PRESENTACION_POR_DEFECTO);
    expect(() => escribirPresentacion(PRESENTACION_POR_DEFECTO, roto)).not.toThrow();
  });

  it('llega al motor como configuración y el estado de la partida es el mismo', () => {
    const base = nuevaPartida({ seed: 7, playerName: 'Alex' }, [...MODULOS, moduloDePresentacion(PRESENTACION_POR_DEFECTO)]);
    expect(base.service<SucesosService>(SERVICES.sucesos)!.config().presentacion).toMatchObject(PRESENTACION_POR_DEFECTO);
    const p = { consecuencias: 'numeros', fueraDeCaracter: 'ocultas' } as const;
    const otra = nuevaPartida({ seed: 7, playerName: 'Alex' }, [...MODULOS, moduloDePresentacion(p)]);
    expect(otra.service<SucesosService>(SERVICES.sucesos)!.config().presentacion).toMatchObject(p);
    expect(otra.serialize().modules).toEqual(base.serialize().modules);
  });
});
