import { describe, expect, it, vi } from 'vitest';
import { SERVICES, SHARED_EVENTS, defineModule, type ClubDirectory, type NpcDirectory, type SucesosService } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, rendimiento as rendimientoDeFutbol, seccionDePrevision } from '@ds/mod-futbol';
import { equipoSinNinos, jugadorComoNpc, ListaDeTrabajo, minimoDe, sinDeporte, valoracionDe, type MercadoDeFichajes, type NpcsState } from '@ds/mod-npcs';
import { hacer } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * El equipo que no sigue (decisión del usuario, 20/11/2026): al empezar el curso el club del personaje no reúne el mínimo de niños en su categoría o no tiene equipos en ella; se le avisa con un suceso y sale del club.
 * Y la previsión del equipo en la pestaña del deporte: cuántos son frente al mínimo, quién sube y cuántos quedarían.
 */
const REND = new Map([['futbol', rendimientoDeFutbol]]);
const nueva = () => nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);

describe('equipoSinNinos', () => {
  const g = nueva();
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const colegio = pob.equipos.find((e) => e.colegio !== undefined && e.plantillaPorCategoria && e.club === 'colegio')!;
  const mercado = (npcs: NpcsState['npcs'], pobs = [pob]): MercadoDeFichajes => ({ lista: new ListaDeTrabajo(npcs.map((n) => [n.id, n])), pobs, dia: 0, val: valoracionDe(REND), reservas: new Map() });
  const yo = { deporte: 'futbol', club: 'colegio', categoria: 'benjamin', valor: 10, edad: 8 };

  it('con el equipo lleno no avisa; con menos niños que el mínimo, avisa («pocos»)', () => {
    const delColegio = s.npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && (n.nacimiento ?? 0) < 0);
    const enBenjamin = (n: (typeof delColegio)[number]) => { const e = Math.floor(-(n.nacimiento ?? 0) / 365); return e >= 7 && e <= 10; };
    const benjamines = delColegio.filter(enBenjamin);
    expect(benjamines.length).toBeGreaterThanOrEqual(minimoDe(colegio));
    expect(equipoSinNinos(mercado(s.npcs), yo)).toBeUndefined();
    // Todos menos 5 se van del equipo: contando al personaje, quedan 6 (menos de 14).
    const sinEllos = new Set(benjamines.slice(5).map((n) => n.id));
    const pocos = s.npcs.map((n) => (sinEllos.has(n.id) ? sinDeporte(n, pob, false) : n));
    const r = equipoSinNinos(mercado(pocos), yo);
    expect(r?.motivo).toBe('pocos');
    expect(r?.minimo).toBe(minimoDe(colegio));
    expect(r!.jugadores!).toBeLessThan(r!.minimo!);
    expect(jugadorComoNpc(yo, 0).deporte).toBe('futbol');
  });

  it('si su club no tiene equipos en la categoría a la que sube, avisa («sin_categoria»)', () => {
    const sinBenjamin: typeof pob = { ...pob, equipos: pob.equipos.map((e) => (e.club === 'colegio' ? { ...e, categorias: ['alevin', 'infantil'] } : e)) };
    expect(equipoSinNinos(mercado(s.npcs, [sinBenjamin]), yo)?.motivo).toBe('sin_categoria');
  });
});

describe('el aviso al personaje', () => {
  const avisa = (data: Record<string, unknown>) =>
    defineModule<Record<string, never>>({
      id: 'avisa',
      name: 'Aviso',
      dependsOn: ['gen'],
      initState: () => ({}),
      actions: [{ id: 'avisa.sin_ninos', name: 'Equipo sin niños', tags: [], duration: 1, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.EQUIPO_SIN_NINOS, data }) }],
    });

  for (const [motivo, texto] of [['pocos', /solo quedan 12 niños contándote a ti, y para formar un equipo hacen falta 14/], ['sin_categoria', /tu club no tiene equipo en la categoría a la que subes/]] as const) {
    it(`con «${motivo}»: sale del club y le llega el suceso, que le dice que tiene que buscarse equipo`, () => {
      const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, avisa({ sport: 'futbol', clubId: 'colegio', motivo, jugadores: 12, minimo: 14 })]);
      advanceToWeek(g, 'gen.descansar', 1, 2, 15);
      expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
      expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')).toBeDefined();
      expect(g.perform('avisa.sin_ninos').ok).toBe(true);
      expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol'), 'sale del club como cualquier niño sin equipo').toBeUndefined();
      const p = g.service<SucesosService>(SERVICES.sucesos)!.pendientes().find((x) => x.suceso === 'futbol.equipo_sin_ninos');
      expect(p, 'le llega el suceso').toBeDefined();
      expect(p!.texto).toMatch(texto);
      expect(p!.texto).toMatch(/buscarte (uno|otro)/);
    });
  }
});

describe('la previsión del equipo (pestaña del deporte)', () => {
  it('cuenta lo que vería un niño y no enseña lo que valen los jugadores', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    const p = g.service<NpcDirectory>(SERVICES.npcs)!.previsionDelClub!('futbol')!;
    expect(p.categoria.id).toBe('benjamin');
    expect(p.minimo).toBe(14);
    expect(p.ahora).toBeGreaterThan(0);
    // Los que quedan el curso que viene son: él, los que siguen y los que llegan a su categoría.
    expect(p.quedan).toBeGreaterThanOrEqual(1);
    expect(p.suben.length + p.siguen + 1).toBe(p.ahora);
    const s = seccionDePrevision(p);
    expect(JSON.stringify(s)).not.toMatch(/valor|nivel|\d+,\d/i);
  });

  it('avisa del peligro cuando no se llega al mínimo, de los equipos que cerrarían y de si el club no tiene equipo en la categoría', () => {
    const base = { categoria: { id: 'benjamin', nombre: 'Benjamín' }, siguiente: { id: 'alevin', nombre: 'Alevín' }, hayEquipo: true, ahora: 18, minimo: 14, equipos: 1, suben: [{ id: 'a', nombre: 'Ana', a: 'Alevín' }], siguen: 8, llegan: 0, quedan: 9 };
    expect(seccionDePrevision(base).texto).toMatch(/corre peligro.*faltarían 5 niños/);
    expect(seccionDePrevision({ ...base, quedan: 15 }).texto).toMatch(/no corre peligro.*aunque por poco/);
    expect(seccionDePrevision({ ...base, quedan: 20 }).texto).not.toMatch(/por poco/);
    expect(seccionDePrevision({ ...base, hayEquipo: false }).texto).toMatch(/no tiene equipo en Alevín/);
    expect(seccionDePrevision({ ...base, quedan: 13 }).texto).toMatch(/faltarían 1 niño /);
    // Con varios equipos, no llegar a lo que piden todos es que alguno cerraría (el suyo podría serlo).
    const tres = { ...base, equipos: 3, quedan: 30 };
    expect(seccionDePrevision(tres).texto).toMatch(/niños para 2 de los 3 equipos.*cerrarían 1/);
    expect(JSON.stringify(seccionDePrevision(tres).tabla!.rows)).toMatch(/para los 3 equipos harían falta 42/);
    expect(seccionDePrevision({ ...tres, quedan: 45 }).texto).toMatch(/no corre peligro/);
  });
});

describe('el personaje en el reparto de verano', () => {
  it('con la edad de su curso nuevo (sin un año de más): tras el verano sigue en su categoría y en el equipo que le toca por su año, o sale del club', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 0, 2, 9);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    // 8 años: primer año, así que no el A (el de segundo año): el B, o el C si hay más equipos de primero y su nivel es de los de abajo (el reparto depende de lo que han entrenado los niños del colegio).
    const primero = g.service<NpcDirectory>(SERVICES.npcs)!.equipoDelPersonaje!('futbol');
    expect(primero).toMatchObject({ club: 'colegio', categoria: 'benjamin' });
    expect(primero?.letra).not.toBe('A');
    advanceToWeek(g, 'gen.descansar', 54, 2, 15);
    const club = g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol');
    const equipo = g.service<NpcDirectory>(SERVICES.npcs)!.equipoDelPersonaje!('futbol');
    // A los 9 años sigue en benjamín (segundo año): si sigue en el club, tiene equipo (el A, el de los de segundo año; con una plaza de más si en él ya no cabe) y nunca se queda en el club sin equipo.
    if (club) expect(equipo, 'si sigue en el club, tiene equipo').toMatchObject({ club: 'colegio', categoria: 'benjamin', letra: 'A' });
    else expect(equipo).toBeUndefined();
  });
});
