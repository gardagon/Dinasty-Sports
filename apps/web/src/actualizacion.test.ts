import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aplicarActualizacion, buscarActualizacion, comprobar, estadoDeActualizacion, mensajeDeComprobacion, type Dependencias } from './actualizacion';
import type { Version } from './version';

const v = (id: string, fecha: string): Version => ({ id, commit: id.slice(0, 7), fecha, rama: 'main', pr: '' });
const LOCAL = v('aaaaaaa1', '2026-11-22T10:00:00.000Z');
const dep = (publicada: Version | null, deportes: string[] = []): Dependencias => ({ base: './', local: LOCAL, publicada: async () => publicada, deportesNuevos: async () => deportes });

beforeEach(() => Object.assign(estadoDeActualizacion, { hay: false, queHay: '', ocupado: '', mensaje: '' }));

describe('aviso de versión nueva', () => {
  it('avisa si hay otra compilación, o un deporte con código nuevo', async () => {
    expect((await comprobar(dep(v('bbbbbbb2', '2026-11-23T10:00:00.000Z')))).queHay).toBe('una versión nueva del juego');
    expect((await comprobar(dep(LOCAL, ['Fútbol']))).queHay).toBe('una versión nueva de Fútbol');
    expect((await comprobar(dep(v('bbbbbbb2', '2026-11-23T10:00:00.000Z'), ['Fútbol']))).queHay).toBe('una versión nueva del juego y una versión nueva de Fútbol');
    expect((await comprobar(dep(LOCAL))).hay).toBe(false);
  });

  it('sin conexión no se sabe: no se quita un aviso ya puesto', async () => {
    const pintar = vi.fn();
    await buscarActualizacion({ deps: dep(v('bbbbbbb2', '2026-11-23T10:00:00.000Z')), pintar });
    expect(estadoDeActualizacion.hay).toBe(true);
    await buscarActualizacion({ deps: dep(null), pintar }, true);
    expect(estadoDeActualizacion.hay).toBe(true);
    await buscarActualizacion({ deps: dep(LOCAL), pintar }, true);
    expect(estadoDeActualizacion.hay).toBe(false);
    expect(estadoDeActualizacion.mensaje).toContain('Estás al día');
    expect(pintar).toHaveBeenCalled();
  });

  it('los mensajes de «Buscar actualización»', async () => {
    expect(mensajeDeComprobacion(await comprobar(dep(null)), LOCAL)).toContain('No se pudo comprobar');
    expect(mensajeDeComprobacion(await comprobar(dep(LOCAL)), LOCAL)).toContain('Estás al día');
    expect(mensajeDeComprobacion(await comprobar(dep(v('bbbbbbb2', '2026-11-23T10:00:00.000Z'))), LOCAL)).toBe('');
  });

  it('actualizar guarda antes de recargar, y si no se puede guardar no recarga', async () => {
    const orden: string[] = [];
    await aplicarActualizacion({ guardar: async () => (orden.push('guardar'), true), instalarDeportes: async () => void orden.push('deportes'), recargar: () => void orden.push('recargar'), pintar: () => undefined });
    expect(orden).toEqual(['guardar', 'deportes', 'recargar']);

    const otro: string[] = [];
    estadoDeActualizacion.ocupado = '';
    await aplicarActualizacion({ guardar: async () => (otro.push('guardar'), false), instalarDeportes: async () => void otro.push('deportes'), recargar: () => void otro.push('recargar'), pintar: () => undefined });
    expect(otro).toEqual(['guardar']);
    expect(estadoDeActualizacion.mensaje).toContain('No se pudo guardar');
    expect(estadoDeActualizacion.ocupado).toBe('');
  });

  it('un fallo al bajar un deporte no impide actualizar la web', async () => {
    estadoDeActualizacion.ocupado = '';
    const recargar = vi.fn();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await aplicarActualizacion({ guardar: async () => true, instalarDeportes: async () => { throw new Error('sin red'); }, recargar, pintar: () => undefined });
    expect(recargar).toHaveBeenCalled();
  });
});
