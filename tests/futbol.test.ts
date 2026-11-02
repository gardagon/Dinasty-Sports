import { describe, expect, it } from 'vitest';
import { SERVICES, validarDatosDeDeporte, type ClubDirectory, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, HABILIDADES_DE_FUTBOL, futbol } from '@ds/mod-futbol';
import * as contracts from '@ds/contracts';
import * as kit from '@ds/kit-deporte';
import { cargarModulo, generarClaves } from '@ds/paquetes';
import { empaquetarDeporte } from '../tools/empaquetar';
import { edadNpc, sinDeporte, type Npc, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';
import { hacer, posible } from './ayudas';

/** El fútbol (F1) en una partida completa: con su gente, su club, sus lugares y la pestaña. Va junto al atletismo, que no cambia. */

/**
 * Una partida con atletismo y fútbol. El equipo de fútbol de su categoría puede empezar completo (18 interesados) y entonces el personaje solo entra si es
 * mejor que alguno: aquí se deja un hueco para centrarse en lo que prueban estos tests (los equipos completos se prueban en `futbol-plantillas.test.ts`).
 */
const nueva = (seed = 31) => {
  const g = nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const s = g.moduleState<NpcsState>('npcs') as { npcs: Npc[]; poblaciones?: PoblacionGuardada[] };
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const uno = s.npcs.find((n) => n.deporte === 'futbol' && n.genetica && edadNpc(n, 0)! <= 9)!;
  s.npcs = s.npcs.map((n) => (n.id === uno.id ? sinDeporte(n, pob, false) : n));
  return g;
};

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

describe('ejercicios de la sesión del club', () => {
  it('el entrenador elige dos ejercicios: la sesión los cuenta antes y después, y sube solo lo que entrenan', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    const hoy = /Hoy: (.+)\.$/.exec(g.preview('futbol.club_sesion')!.description ?? '')?.[1];
    expect(hoy).toBeTruthy();
    const antes = Object.fromEntries(HABILIDADES_DE_FUTBOL.map((id) => [id, g.stat(id)]));
    expect(hacer(g, 'futbol.club_sesion').ok).toBe(true);
    const subidas = HABILIDADES_DE_FUTBOL.filter((id) => g.stat(id) > antes[id]);
    // Dos ejercicios de unas 3-4 habilidades cada uno (con el juego colectivo repetido a veces): no las 29 de golpe.
    expect(subidas.length).toBeGreaterThanOrEqual(4);
    expect(subidas.length).toBeLessThanOrEqual(9);
    expect(g.log.some((l) => l.text === `Hoy toca: ${hoy}.`)).toBe(true);
  });
});

describe('sobrecarga entre deportes', () => {
  it('las sesiones de entrenamiento de todos los deportes cuentan juntas: la tercera del día sufre sobrecarga sea del deporte que sea', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 2, 5, 8); // sábado por la mañana, los campos abiertos
    const sobrecarga = (id: string) => g.preview(id)!.modifiers.some((m) => m.id.endsWith('.sobrecarga'));
    expect(sobrecarga('atletismo.tecnica')).toBe(false);
    expect(hacer(g, 'atletismo.tecnica').ok).toBe(true);
    expect(sobrecarga('futbol.balon')).toBe(false);
    expect(hacer(g, 'futbol.balon').ok).toBe(true);
    // Dos sesiones (una de cada deporte): la siguiente, de cualquiera de los dos, ya sufre sobrecarga.
    expect(sobrecarga('futbol.tiro')).toBe(true);
    expect(sobrecarga('atletismo.series')).toBe(true);
  });

  it('con un solo deporte no cambia: cada deporte cuenta como siempre', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo'] });
    advanceToWeek(g, 'gen.descansar', 2, 5, 8);
    hacer(g, 'atletismo.tecnica');
    expect(g.preview('atletismo.tecnica')!.modifiers.some((m) => m.id === 'atletismo.sobrecarga')).toBe(false);
    hacer(g, 'atletismo.tecnica');
    expect(g.preview('atletismo.tecnica')!.modifiers.some((m) => m.id === 'atletismo.sobrecarga')).toBe(true);
  });

  it('el gimnasio (que también lleva la etiqueta entrenamiento) no cuenta: solo los deportes', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 2, 5, 10);
    for (let i = 0; i < 3; i++) expect(hacer(g, 'gen.gimnasio').ok).toBe(true);
    expect(g.moduleState<{ sesionesHoy: { n: number } }>('futbol').sesionesHoy.n).toBe(0);
    expect(g.preview('futbol.balon')!.modifiers.some((m) => m.id === 'futbol.sobrecarga')).toBe(false);
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

