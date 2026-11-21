import { describe, expect, it } from 'vitest';
import { SERVICES, type SucesosService } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PRESENTACION_POR_DEFECTO, PREFERENCIAS_POR_DEFECTO, avisoDeCaracter, escribirPresentacion, leerPresentacion, moduloDePresentacion } from './presentacion';

const memoria = () => {
  const mem = new Map<string, string>();
  return { mem, local: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) } };
};

describe('presentación de los sucesos (Opciones)', () => {
  it('por defecto no cambia nada y lo guardado se lee de vuelta', () => {
    const { local } = memoria();
    expect(leerPresentacion(local)).toEqual(PREFERENCIAS_POR_DEFECTO);
    escribirPresentacion({ consecuencias: 'numeros', fueraDeCaracter: 'sombreadas', avisoFueraDeCaracter: false }, local);
    expect(leerPresentacion(local)).toEqual({ consecuencias: 'numeros', fueraDeCaracter: 'sombreadas', avisoFueraDeCaracter: false });
  });

  it('un valor roto o un almacenamiento bloqueado vuelven al de partida', () => {
    const { mem, local } = memoria();
    mem.set('dinasty-sports.presentacion', '{"consecuencias":"todo","fueraDeCaracter":"ocultas"}');
    expect(leerPresentacion(local)).toEqual({ consecuencias: 'pistas', fueraDeCaracter: 'ocultas', avisoFueraDeCaracter: true });
    mem.set('dinasty-sports.presentacion', 'no es json');
    expect(leerPresentacion(local)).toEqual(PREFERENCIAS_POR_DEFECTO);
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(leerPresentacion(roto)).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(() => escribirPresentacion(PREFERENCIAS_POR_DEFECTO, roto)).not.toThrow();
  });

  it('llega al motor como configuración y el estado de la partida es el mismo', () => {
    const base = nuevaPartida({ seed: 7, playerName: 'Alex' }, [...MODULOS, moduloDePresentacion(PRESENTACION_POR_DEFECTO)]);
    expect(base.service<SucesosService>(SERVICES.sucesos)!.config().presentacion).toMatchObject(PRESENTACION_POR_DEFECTO);
    const p = { consecuencias: 'numeros', fueraDeCaracter: 'ocultas' } as const;
    const otra = nuevaPartida({ seed: 7, playerName: 'Alex' }, [...MODULOS, moduloDePresentacion(p)]);
    expect(otra.service<SucesosService>(SERVICES.sucesos)!.config().presentacion).toMatchObject(p);
    expect(otra.serialize().modules).toEqual(base.serialize().modules);
  });

  it('el aviso «no va contigo»: activado por defecto, solo en modo normales y solo si choca con algo', () => {
    expect(PREFERENCIAS_POR_DEFECTO.avisoFueraDeCaracter).toBe(true);
    expect(avisoDeCaracter(PREFERENCIAS_POR_DEFECTO, 'sociabilidad')).toBe('No va contigo (sociabilidad)');
    expect(avisoDeCaracter(PREFERENCIAS_POR_DEFECTO, undefined)).toBeUndefined();
    expect(avisoDeCaracter({ ...PREFERENCIAS_POR_DEFECTO, avisoFueraDeCaracter: false }, 'sociabilidad')).toBeUndefined();
    expect(avisoDeCaracter({ ...PREFERENCIAS_POR_DEFECTO, fueraDeCaracter: 'sombreadas' }, 'sociabilidad')).toBeUndefined();
    expect(avisoDeCaracter({ ...PREFERENCIAS_POR_DEFECTO, fueraDeCaracter: 'ocultas' }, 'sociabilidad')).toBeUndefined();
  });

  it('el aviso no llega al motor: activarlo o no deja la partida idéntica', () => {
    const sinAviso = { ...PREFERENCIAS_POR_DEFECTO, avisoFueraDeCaracter: false };
    const a = nuevaPartida({ seed: 7, playerName: 'Alex' }, [...MODULOS, moduloDePresentacion(sinAviso)]);
    const b = nuevaPartida({ seed: 7, playerName: 'Alex' }, [...MODULOS, moduloDePresentacion(PREFERENCIAS_POR_DEFECTO)]);
    expect(a.serialize().modules).toEqual(b.serialize().modules);
  });
});
