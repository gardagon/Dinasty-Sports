import { beforeAll, describe, expect, it } from 'vitest';
import { CALENDARIO_ESPANA, GEN, SERVICES, SHARED_EVENTS, defineModule, plazoDeFichajesAbierto, proximaAperturaDelPlazo, type ClubDirectory } from '@ds/contracts';
import { Game, advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { DATOS_ATLETISMO } from '@ds/mod-atletismo';
import { futbol, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import {
  capacidadDe,
  claveDeEquipo,
  colocarDesplazados,
  edadNpc,
  renovarDeportistas,
  reclutarEnTodos,
  sinDeporte,
  valoracionDe,
  valorRealDe,
  type MercadoDeFichajes,
  type Npc,
  type NpcsState,
  type PoblacionGuardada,
} from '@ds/mod-npcs';
import { rendimiento as rendimientoDeAtletismo } from '@ds/mod-atletismo';
import { hacer, posible } from './ayudas';

/**
 * El plazo de fichajes y quien se queda sin equipo (decisión del usuario, 03/11/2026; `CIUDAD_Y_LIGAS.md` §7). Mismas reglas para el personaje y los niños del mundo.
 */

const TEMPORADA = DATOS_ATLETISMO.paises.espana.temporada;
const REND = new Map([
  ['futbol', rendimientoDeFutbol],
  ['atletismo', rendimientoDeAtletismo],
]);
const nueva = (seed = 31) => nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const estado = (g: ReturnType<typeof nueva>) => g.moduleState<NpcsState>('npcs') as NpcsState;

describe('el plazo de fichajes: del verano a la primera competición', () => {
  it('abierto en la pretemporada (semanas 1 a 4) y en el verano; cerrado de la primera carrera a la última clase', () => {
    for (const w of [0, 1, 2, 3]) expect(plazoDeFichajesAbierto(CALENDARIO_ESPANA, TEMPORADA, w), `semana ${w + 1}`).toBe(true);
    for (const w of [4, 10, 15, 20, 29, 35, 40]) expect(plazoDeFichajesAbierto(CALENDARIO_ESPANA, TEMPORADA, w), `semana ${w + 1}`).toBe(false);
    for (const w of [41, 45, 51]) expect(plazoDeFichajesAbierto(CALENDARIO_ESPANA, TEMPORADA, w), `semana ${w + 1}`).toBe(true);
  });

  it('la próxima apertura es el verano', () => {
    expect(proximaAperturaDelPlazo(CALENDARIO_ESPANA, TEMPORADA, 10)).toBe(41);
    expect(proximaAperturaDelPlazo(CALENDARIO_ESPANA, TEMPORADA, 45)).toBe(45);
    expect(proximaAperturaDelPlazo(CALENDARIO_ESPANA, TEMPORADA, 52 + 10)).toBe(52 + 41);
  });
});

describe('el personaje y el plazo', () => {
  const club = (g: ReturnType<typeof nueva>) => g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol');

  it('fuera de plazo, sin club, entra si hay hueco; el motivo del rechazo se explica', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 10, 2, 15);
    // Sin club y con hueco en su equipo: entra aunque el plazo esté cerrado (sin sacar a nadie).
    const equipo = estado(g).npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && edadNpc(n, 0)! <= 9);
    expect(equipo.length).toBeLessThanOrEqual(18);
    if (equipo.length < 18) {
      expect(posible(g, 'futbol.apuntarse_colegio')).toBe(true);
    } else {
      expect(posible(g, 'futbol.apuntarse_colegio')).toBe(false);
      expect(g.preview('futbol.apuntarse_colegio')!.reason).toMatch(/plazo de fichajes está cerrado hasta el verano/);
    }
  }, 60000);

  it('dentro de plazo, con el equipo lleno y mejor que el peor, entra; fuera de plazo, no', () => {
    const lleno = (g: ReturnType<typeof nueva>) => {
      const s = g.moduleState<NpcsState>('npcs') as { -readonly [K in keyof NpcsState]: NpcsState[K] };
      const base = s.npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && edadNpc(n, 0)! <= 9);
      const libres = s.npcs.filter((n) => n.genetica && n.deporte === undefined && n.colegio === undefined && edadNpc(n, 0)! <= 9 && n.tipos?.some((t) => t.tipo === 'alumno')).slice(0, 18 - base.length);
      s.npcs = s.npcs.map((n) => (libres.some((l) => l.id === n.id) || base.some((b) => b.id === n.id) ? { ...n, deporte: 'futbol', equipo: 'colegio', levels: { ...n.levels, futbol: 1 } } : n));
    };
    const dentro = nueva();
    advanceToWeek(dentro, 'gen.descansar', 1, 2, 15);
    lleno(dentro);
    expect(dentro.service<{ plaza(d: string, c: string, n: number): { estado: string } }>(SERVICES.npcs)!.plaza('futbol', 'colegio', 30).estado).toBe('por_merito');
    expect(posible(dentro, 'futbol.apuntarse_colegio')).toBe(true);
    const fuera = nueva();
    advanceToWeek(fuera, 'gen.descansar', 10, 2, 15);
    lleno(fuera);
    expect(posible(fuera, 'futbol.apuntarse_colegio')).toBe(false);
    expect(fuera.preview('futbol.apuntarse_colegio')!.reason).toMatch(/plazo de fichajes está cerrado hasta el verano.*hueco/);
  }, 90000);

  it('quien deja su club fuera de plazo no entra en otro de ese deporte hasta el siguiente plazo; dentro de plazo, sí', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(club(g)).toBeDefined();
    advanceToWeek(g, 'gen.descansar', 10, 2, 15);
    expect(hacer(g, 'futbol.dejar_club').ok).toBe(true);
    expect(club(g)).toBeUndefined();
    expect(g.log.some((l) => /fuera del plazo de fichajes/.test(l.text))).toBe(true);
    expect(posible(g, 'futbol.apuntarse_colegio')).toBe(false);
    expect(g.preview('futbol.apuntarse_colegio')!.reason).toMatch(/Dejaste tu club fuera de plazo/);
    // En el verano se abre el plazo y vuelve a poder entrar.
    advanceToWeek(g, 'gen.descansar', 42, 2, 15);
    // Ya no lo frena el plazo (si no entra será por la plaza del equipo, no por haber dejado el club).
    expect(g.preview('futbol.apuntarse_colegio')!.reason ?? '').not.toMatch(/fuera de plazo|plazo de fichajes/);
  }, 90000);

  it('dejar el club dentro de plazo no cierra la puerta', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(hacer(g, 'futbol.dejar_club').ok).toBe(true);
    expect(posible(g, 'futbol.apuntarse_colegio')).toBe(true);
  }, 90000);

  it('quien está en un club de atletismo no puede cambiarse a otro fuera de plazo', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    advanceToWeek(g, 'gen.descansar', 10, 1, 18);
    const prueba = g.preview('atletismo.prueba.club_ciudad');
    expect(prueba?.available).toBe(false);
    expect(prueba?.reason).toMatch(/plazo de fichajes está cerrado hasta el verano/);
    void GEN;
  }, 90000);
});

describe('quien se queda sin equipo busca club con la misma regla', () => {
  let base: ReturnType<typeof nueva>;
  beforeAll(() => {
    base = nueva();
  }, 60000);
  const pobDe = (deporte: string): PoblacionGuardada => estado(base).poblaciones!.find((p) => p.deporte === deporte)!;
  const mercadoDe = (npcs: Npc[], pobs: PoblacionGuardada[]): MercadoDeFichajes => ({ lista: new Map(npcs.map((n) => [n.id, n])), pobs, dia: 0, val: valoracionDe(REND), reservas: new Map() });
  const jugadoresDe = (m: MercadoDeFichajes, deporte: string, club: string, cat: [number, number]) =>
    [...m.lista.values()].filter((n) => n.deporte === deporte && n.equipo === club && edadNpc(n, 0)! >= cat[0] && edadNpc(n, 0)! <= cat[1]);
  const infantil: [number, number] = [12, 13];

  it('el desplazado encuentra otro club de su deporte: la cadena acaba en el club con hueco y nadie se queda sin equipo', () => {
    // El club grande tiene 17 plazas en infantil: al irse el desplazado queda completo y no puede volver a entrar (otro que vale más ocupó su sitio).
    const fut0 = pobDe('futbol');
    const fut: PoblacionGuardada = { ...fut0, equipos: fut0.equipos.map((e) => (e.club === 'club_grande' ? { ...e, equiposPorCategoria: undefined, plantillaPorCategoria: { min: 14, max: 17 } } : e)) };
    const m = mercadoDe(estado(base).npcs, [fut]);
    // Se hace un hueco en el club pequeño de infantil (sale uno) y se desplaza al peor del club grande.
    const delPequeno = jugadoresDe(m, 'futbol', 'club_pequeno', infantil);
    const val = valoracionDe(REND);
    const peorPequeno = [...delPequeno].sort((a, b) => valorRealDe(a, fut, val, 0)! - valorRealDe(b, fut, val, 0)!)[0];
    m.lista.set(peorPequeno.id, sinDeporte(peorPequeno, fut, true));
    const delGrande = jugadoresDe(m, 'futbol', 'club_grande', infantil);
    const peorGrande = [...delGrande].sort((a, b) => valorRealDe(a, fut, val, 0)! - valorRealDe(b, fut, val, 0)!)[0];
    const antes = ['club_grande', 'club_mediano', 'club_pequeno', 'colegio'].map((c) => jugadoresDe(m, 'futbol', c, infantil).length);
    m.lista.set(peorGrande.id, sinDeporte(peorGrande, fut, false));
    colocarDesplazados(m, [{ id: peorGrande.id, origen: 'futbol' }]);
    const despues = ['club_grande', 'club_mediano', 'club_pequeno', 'colegio'].map((c) => jugadoresDe(m, 'futbol', c, infantil).length);
    const nuevo = m.lista.get(peorGrande.id)!;
    expect(nuevo.deporte).toBe('futbol'); // sigue jugando: ha encontrado otro club
    expect(nuevo.equipo).not.toBe('club_grande');
    expect(nuevo.dejado).toBeUndefined();
    // El club grande repone su hueco con el siguiente (el que baja del mediano...) o queda con uno menos: ninguno pasa de 18 y en total solo falta el que se fue.
    const clubes = ['club_grande', 'club_mediano', 'club_pequeno', 'colegio'];
    clubes.forEach((c, i) => expect(despues[i], c).toBeLessThanOrEqual(Math.max(antes[i], capacidadDe(fut.equipos.find((e) => e.club === c)!, 'infantil'))));
    expect(despues.reduce((a, b) => a + b, 0)).toBe(antes.reduce((a, b) => a + b, 0)); // el desplazado ocupa el hueco que había: nadie se pierde
  });

  it('el que no encuentra club en su deporte pasa a otro deporte que le interese, con la misma regla; deja el primero ese curso', () => {
    const fut = pobDe('futbol');
    const atl = pobDe('atletismo');
    const base0 = estado(base).npcs;
    const k = base0.find((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && n.tipos?.some((t) => t.tipo === 'alumno') && edadNpc(n, 0)! >= 12 && edadNpc(n, 0)! <= 13)!;
    const enInfantil = base0.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && edadNpc(n, 0)! >= 12 && edadNpc(n, 0)! <= 13).length;
    // El fútbol: solo el equipo del colegio, que con él fuera queda completo (y él es el peor de todos). El atletismo: solo el equipo del colegio, con un hueco.
    const futbolCompleto: PoblacionGuardada = { ...fut, equipos: fut.equipos.filter((e) => e.club === 'colegio').map((e) => ({ ...e, plantillaPorCategoria: { min: 1, max: enInfantil - 1 } })) };
    const atletismoColegio: PoblacionGuardada = { ...atl, equipos: atl.equipos.filter((e) => e.club === 'colegio') };
    const m = mercadoDe(
      base0.map((n) =>
        n.id === k.id ? { ...sinDeporte(n, fut, false), cap: n.cap!.map(() => 1), pico: n.pico!.map(() => 1), rasgos: n.rasgos && { ...n.rasgos, intereses: { futbol: 3, atletismo: 3 } } } : n,
      ),
      [futbolCompleto, atletismoColegio],
    );
    const delAtl = [...m.lista.values()].filter((n) => n.deporte === 'atletismo' && n.equipo === 'colegio');
    m.lista.set(delAtl[0].id, sinDeporte(delAtl[0], atl, true)); // hueco en el atletismo del colegio
    colocarDesplazados(m, [{ id: k.id, origen: 'futbol' }]);
    const despues = m.lista.get(k.id)!;
    expect(despues.deporte).toBe('atletismo');
    expect(despues.equipo).toBe('colegio');
    expect(despues.apartado).toContain('futbol'); // deja el fútbol ese curso (puede volver a intentarlo en el siguiente plazo)
    expect(despues.dejado ?? []).not.toContain('futbol');
  });

  it('si ningún club de ningún deporte lo quiere, deja el deporte para siempre y no vuelve a ser reclutado', () => {
    const fut = pobDe('futbol');
    // Solo el equipo del colegio, completo; el niño (el peor de todos, sin interés por otros deportes) no entra en ningún club.
    const colegio: PoblacionGuardada = { ...fut, equipos: fut.equipos.filter((e) => e.club === 'colegio').map((e) => ({ ...e, plantillaPorCategoria: { min: 1, max: 16 } })) };
    const base0 = estado(base).npcs;
    const k = base0.find((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && n.tipos?.some((t) => t.tipo === 'alumno') && edadNpc(n, 0)! >= 12 && edadNpc(n, 0)! <= 13)!;
    const m = mercadoDe(
      base0.map((n) => (n.id === k.id ? { ...sinDeporte(n, fut, false), cap: n.cap!.map(() => 1), pico: n.pico!.map(() => 1), rasgos: n.rasgos && { ...n.rasgos, intereses: { futbol: 3 } } } : n)),
      [colegio],
    );
    colocarDesplazados(m, [{ id: k.id, origen: 'futbol' }]);
    const despues = m.lista.get(k.id)!;
    expect(despues.deporte).toBeUndefined();
    expect(despues.dejado).toContain('futbol');
    // Ya no vuelve a ser reclutado, aunque haya hueco y le encante el fútbol (pasa también al renovar el curso).
    const hueco: PoblacionGuardada = { ...colegio, equipos: colegio.equipos.map((e) => ({ ...e, plantillaPorCategoria: { min: 18, max: 18 } })) };
    const recluta = reclutarEnTodos([...m.lista.values()], [hueco], 0, new Map(), REND);
    expect(recluta.find((n) => n.id === k.id)!.deporte).toBeUndefined();
    const renovado = renovarDeportistas([...m.lista.values()], [hueco], 365, { next: () => 0.99, int: () => 0, range: () => 0, chance: () => false, pick: (x) => x[0], normal: () => 0 }, new Map(), REND, 31, 1);
    expect(renovado.find((n) => n.id === k.id)!.deporte).toBeUndefined();
  });
});

describe('los fichajes pasan dentro del plazo y fuera de él nadie se cambia', () => {
  it('durante el curso (de la primera competición a la última clase) nadie cambia de equipo ni se saca a nadie', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 5, 2, 15);
    const equipos = (): Map<string, string | undefined> => new Map(estado(g).npcs.filter((n) => n.genetica).map((n) => [n.id, `${n.deporte}|${n.equipo}`]));
    const antes = equipos();
    advanceToWeek(g, 'gen.descansar', 38, 2, 15);
    const despues = equipos();
    const cambios = [...antes].filter(([id, v]) => despues.get(id) !== v);
    expect(cambios).toEqual([]);
  }, 180000);

  it('al empezar el curso (dentro del plazo) sí hay fichajes: algunos jugadores cambian a un club más grande', () => {
    const g = nueva();
    const antes = new Map(estado(g).npcs.filter((n) => n.deporte === 'futbol').map((n) => [n.id, n.equipo]));
    advanceToWeek(g, 'gen.descansar', 52 + 1, 2, 15);
    const despues = estado(g).npcs.filter((n) => n.deporte === 'futbol' && antes.has(n.id));
    const cambian = despues.filter((n) => n.equipo !== antes.get(n.id));
    expect(cambian.length).toBeGreaterThan(0);
    // Y los equipos siguen en regla: ningún club pasa de los equipos que tiene abiertos por el máximo de un equipo en una categoría.
    const pob = estado(g).poblaciones!.find((p) => p.deporte === 'futbol')!;
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const c of pob.categorias!.filter((x) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(x.id))) {
        const jugadores = estado(g).npcs.filter((n) => n.deporte === 'futbol' && n.equipo === e.club && (edadNpc(n, 52 * 7) ?? -1) >= c.edadMin && (edadNpc(n, 52 * 7) ?? -1) <= c.edadMax).length;
        expect(jugadores, `${e.club} ${c.id}`).toBeLessThanOrEqual(capacidadDe(e, c.id) + 4); // + los que cambian de categoría al pasar de curso
      }
    }
  }, 240000);
});

describe('el personaje desplazado sale del club, como cualquier niño, y decide él', () => {
  it('si otro jugador que vale más le ocupa el sitio en los fichajes de verano, el personaje queda fuera de su equipo (lo avisa el evento que sale del club)', () => {
    const g = nueva();
    const fut = estado(g).poblaciones!.find((p) => p.deporte === 'futbol')!;
    const npcs = estado(g).npcs;
    const rng = { next: () => 0.5, int: () => 0, range: () => 0, chance: () => false, pick: <T,>(x: readonly T[]) => x[0], normal: () => 0 };
    // El personaje (que vale casi nada) es del club mediano en infantil. Con la ambición de los demás, en alguna semilla un jugador de un club más pequeño ficha por el mediano.
    let perdio = 0;
    for (let semilla = 1; semilla <= 60 && !perdio; semilla++) {
      const resultado = { sinPlaza: [] as string[] };
      const reservas = new Map([[claveDeEquipo('club_mediano', 'infantil'), 1]]);
      const salida = renovarDeportistas([...npcs], [fut], 0, rng, reservas, REND, semilla, 1, [{ deporte: 'futbol', club: 'club_mediano', categoria: 'infantil', valor: 1, edad: 12 }], resultado);
      if (resultado.sinPlaza.includes('futbol')) {
        perdio = semilla;
        // El hueco lo ocupa un jugador del mundo; el equipo no pasa de su máximo.
        expect(salida.filter((n) => n.deporte === 'futbol' && n.equipo === 'club_mediano' && edadNpc(n, 0)! >= 12 && edadNpc(n, 0)! <= 13).length).toBeLessThanOrEqual(capacidadDe(fut.equipos.find((e) => e.club === 'club_mediano')!, 'infantil'));
      }
    }
    expect(perdio, 'ninguna semilla de fichajes le quitó el sitio al personaje').toBeGreaterThan(0);
  }, 180000);

  it('al perder la plaza sale del club (sin que cuente como dejarlo plantado ni cierre el plazo) y se le explica qué ha pasado y qué puede hacer', () => {
    const avisa = defineModule<Record<string, never>>({
      id: 'avisa',
      name: 'Aviso',
      dependsOn: ['gen'],
      initState: () => ({}),
      actions: [{ id: 'avisa.perdida', name: 'Perder la plaza', tags: [], duration: 1, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.PLAZA_PERDIDA, data: { sport: 'futbol', clubId: 'colegio' } }) }],
    });
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, avisa]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')).toBeDefined();
    const estres = g.stat(GEN.estres);
    expect(g.perform('avisa.perdida').ok).toBe(true);
    // Sale del club como cualquier niño desplazado…
    expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')).toBeUndefined();
    // …se le explica qué ha pasado y qué puede hacer (otro club con la regla de plaza, otro deporte o esperar al siguiente plazo)…
    expect(g.log.some((l) => /Un jugador que vale más ha ocupado tu plaza en el equipo de fútbol y sales del club\. Puedes probar en otro club, en otro deporte o esperar al siguiente plazo de fichajes\./.test(l.text))).toBe(true);
    // …no lo ha dejado él (ni plantón ni plazo cerrado) y decide: puede volver a probar en un club en cuanto haya plaza.
    expect(g.stat(GEN.estres)).toBeLessThanOrEqual(estres + 0.5);
    expect(g.preview('futbol.apuntarse_colegio')!.reason ?? '').not.toMatch(/fuera de plazo|plazo de fichajes está cerrado/);
    expect(g.preview('futbol.dejar_club')!.available).toBe(false); // ya no tiene club que dejar
  }, 120000);
});
