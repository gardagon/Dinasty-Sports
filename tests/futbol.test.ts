import { describe, expect, it } from 'vitest';
import { SERVICES, validarDatosDeDeporte, type ClubDirectory, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, EJERCICIOS_DE_FUTBOL, HABILIDADES_DE_FUTBOL, futbol } from '@ds/mod-futbol';
import { elegirEjercicios, semillaDeSesionDeEquipo } from '@ds/kit-deporte';
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
    const suma = () => HABILIDADES_DE_FUTBOL.reduce((t, id) => t + g.stat(id), 0);
    const antes = suma();
    expect(hacer(g, 'futbol.club_sesion').ok).toBe(true);
    // Sube lo que entrenan los ejercicios que ha elegido el entrenador ese día.
    expect(suma()).toBeGreaterThan(antes);
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


describe('los ejercicios son los mismos para todo el equipo', () => {
  const equipo = (g: ReturnType<typeof nueva>) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && n.hab?.futbol && edadNpc(n, 0)! <= 9);

  it('en una semana, las habilidades que suben los jugadores de un equipo son las de los mismos ejercicios (no las de ejercicios distintos para cada uno)', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 2, 0, 8);
    const antes = new Map(equipo(g).map((n) => [n.id, [...n.hab!.futbol.v]]));
    advanceToWeek(g, 'gen.descansar', 3, 0, 8);
    const habilidades = HABILIDADES_DE_FUTBOL;
    const subieron = new Set<string>();
    let con = 0;
    for (const n of equipo(g)) {
      const a = antes.get(n.id);
      if (!a) continue;
      const cambios = n.hab!.futbol.v.map((v, i) => v - a[i]);
      if (cambios.some((c) => c > 1e-6)) con++;
      cambios.forEach((c, i) => c > 1e-6 && subieron.add(habilidades[i] ?? `stat${i}`));
    }
    expect(con).toBeGreaterThan(5);
    // Dos sesiones de dos ejercicios de 3 o 4 habilidades cada uno, más lo que se suma siempre y el juego colectivo: unas 12 a lo sumo. Con ejercicios propios de cada uno saldrían casi todas (29).
    expect(subieron.size).toBeLessThanOrEqual(14);
  });

  it('el personaje entrena lo que entrena su equipo: los ejercicios de su sesión salen de lo que le falta al equipo, con la misma semilla', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 2, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    advanceToWeek(g, 'gen.descansar', 3, 3, 15);
    const niveles = g.service<NpcDirectory>(SERVICES.npcs)!.nivelesDelEquipo!('futbol', 'colegio', 'benjamin')!;
    expect(niveles).toBeDefined();
    const esperados = elegirEjercicios(EJERCICIOS_DE_FUTBOL, { nivel: (stat) => niveles[stat] ?? g.stat(stat), semilla: semillaDeSesionDeEquipo('futbol', 'colegio', 'benjamin', g.time.week, 1), cuantos: 2 }).map((e) => e.nombre);
    const hoy = /Hoy: (.+)\.$/.exec(g.preview('futbol.club_sesion')!.description ?? '')?.[1];
    expect(hoy).toBeTruthy();
    for (const nombre of esperados) expect(hoy).toContain(nombre);
  });
});
