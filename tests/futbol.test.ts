import { describe, expect, it } from 'vitest';
import { SERVICES, validarDatosDeDeporte, type ClubDirectory, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, futbol } from '@ds/mod-futbol';
import * as contracts from '@ds/contracts';
import * as kit from '@ds/kit-deporte';
import { cargarModulo, generarClaves } from '@ds/paquetes';
import { empaquetarDeporte } from '../tools/empaquetar';
import { hacer, posible } from './ayudas';

/** El fútbol (F1) en una partida completa: con su gente, su club, sus lugares y la pestaña. Va junto al atletismo, que no cambia. */

const nueva = (seed = 31) => nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);

describe('fútbol en una partida completa', () => {
  it('aparece en el catálogo de la partida como deporte de equipo', () => {
    const g = nueva();
    expect(g.registry.moduleIds.has('futbol')).toBe(true);
    expect(validarDatosDeDeporte(DATOS_FUTBOL)).toEqual([]);
  });

  it('tiene entrenador y equipo en el colegio, y el personaje puede apuntarse y entrenar con el club', () => {
    const g = nueva();
    const npcs = g.service<NpcDirectory>(SERVICES.npcs)!;
    expect(npcs.list({ tag: 'futbolista' }).length).toBeGreaterThan(5);
    expect(npcs.list({ role: 'entrenador' }).some((n) => n.tags.includes('futbol'))).toBe(true);

    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')?.sede).toBe('campo_colegio');
    const v = g.service<DeporteService>('deporte.futbol')!.view();
    expect(v.inactivo).toBeUndefined();
    expect(v.resumen.find((r) => r.etiqueta === 'Club')!.valor).toContain('colegio');

    // Jueves a las 15: sesión del club (martes y jueves, otros días que atletismo).
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    const antes = g.stat('futbol.juego_colectivo');
    expect(hacer(g, 'futbol.club_sesion').ok).toBe(true);
    expect(g.stat('futbol.juego_colectivo')).toBeGreaterThan(antes);
  });

  it('el entreno por libre está en el campo (y no durante la sesión del club)', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    hacer(g, 'futbol.apuntarse_colegio');
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    expect(g.preview('futbol.balon')!.available).toBe(false);
    advanceToWeek(g, 'gen.descansar', 1, 5, 11);
    expect(posible(g, 'futbol.balon')).toBe(true);
  });

  it('se guarda y se carga sin perder nada', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    hacer(g, 'futbol.apuntarse_colegio');
    const g2 = cargarPartida(JSON.parse(JSON.stringify(g.serialize())), [...MODULOS, futbol]);
    expect(g2.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')?.id).toBe('colegio');
    expect(g2.stat('futbol.pase')).toBe(g.stat('futbol.pase'));
  });
});

describe('fútbol empaquetado', () => {
  it('se compila aparte, sin copia de contracts ni del kit, y el módulo cargado da la misma partida que el integrado', async () => {
    const claves = await generarClaves();
    const paquete = await empaquetarDeporte(new URL('..', import.meta.url).pathname, 'futbol', 'Fútbol', claves.privada);
    const codigo = paquete.archivos['codigo.js'];
    expect(codigo).not.toMatch(/from\s+['"]@ds\//);
    const cargado = cargarModulo(codigo, { '@ds/contracts': contracts, '@ds/kit-deporte': kit }, 'futbol');
    const a = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const b = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, cargado]);
    expect(JSON.stringify(b.serialize())).toBe(JSON.stringify(a.serialize()));
  });
});

