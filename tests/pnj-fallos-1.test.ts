import { describe, expect, it, vi } from 'vitest';
import { SERVICES, type NpcDirectory, type NpcView, type PresenciaService } from '@ds/contracts';
import { advanceToWeek, type Game } from '@ds/core';
import { nuevaPartida } from '@ds/game';
import { sinDeporte, type Npc, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';
import { conocer, llegarA } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/** Fallos que encontró el usuario jugando (17/11): niños del parque sin «charlar». Notas: `docs/relevo/pnj-fallos-1.md`. */
describe('niños que se conocen en el parque', () => {
  const alParque = (g: Game): NpcView[] => {
    advanceToWeek(g, 'gen.descansar', 1, 5, 15); // sábado por la tarde: el parque tiene niños
    llegarA(g, 'parque', 17);
    const yo = 8;
    return g.service<PresenciaService>(SERVICES.presencia)!.en('parque', 400).filter((n) => n.age !== undefined && Math.abs(n.age - yo) <= 1 && n.role !== 'familia');
  };

  it('un niño del parque que se conoce se puede charlar con él', () => {
    const g = nuevaPartida({ seed: 31 });
    const ninos = alParque(g);
    const vecino = ninos.find((n) => n.role === 'vecino');
    expect(vecino, 'hay un niño del barrio en el parque').toBeDefined();
    conocer(g, vecino!.id);
    const charlar = g.preview(`relaciones.charlar.${vecino!.id}`);
    expect(charlar, 'existe «charlar» con él').toBeDefined();
    expect(charlar!.available).toBe(true);
  });

  it('tras jugar con otros niños en el parque, se puede charlar con los que se conocieron', () => {
    const g = nuevaPartida({ seed: 31 });
    alParque(g);
    const antes = new Set(g.service<NpcDirectory>(SERVICES.npcs)!.list({ known: true }).map((n) => n.id));
    expect(g.perform('relaciones.jugar_con_otros').ok).toBe(true);
    const nuevos = g.service<NpcDirectory>(SERVICES.npcs)!.list({ known: true }).filter((n) => !antes.has(n.id));
    expect(nuevos.length).toBeGreaterThan(0);
    for (const n of nuevos) expect(g.preview(`relaciones.charlar.${n.id}`)?.available, `charlar con ${n.id} (${n.role})`).toBe(true);
  });

  it('con un vecino adulto que se conoce también se puede charlar (decidido el 17/11)', () => {
    const g = nuevaPartida({ seed: 31 });
    const adulto = g.service<NpcDirectory>(SERVICES.npcs)!.list({ role: 'vecino' }).find((n) => n.age !== undefined && n.age >= 25)!;
    conocer(g, adulto.id);
    expect(g.preview(`relaciones.charlar.${adulto.id}`)).toBeDefined();
  });
});

describe('quien deja el equipo del colegio ya no es «del equipo»', () => {
  it('sinDeporte quita «Del equipo de … del colegio» de la descripción', () => {
    const g = nuevaPartida({ seed: 31 });
    const s = g.moduleState<NpcsState>('npcs') as { npcs: Npc[]; poblaciones?: PoblacionGuardada[] };
    const pob = s.poblaciones!.find((p) => p.deporte === 'atletismo')!;
    const del = s.npcs.find((n) => n.deporte === 'atletismo' && n.description?.endsWith(pob.descripcionDelEquipo))!;
    expect(del, 'hay alguien del equipo de atletismo del colegio').toBeDefined();
    const libre = sinDeporte(del, pob, false);
    expect(libre.description).not.toContain(pob.descripcionDelEquipo);
    expect(libre.description).toBe(del.description!.slice(0, -pob.descripcionDelEquipo.length).trimEnd());
    expect(libre.description!.length).toBeGreaterThan(0);
  });

  it('en una partida, nadie dice ser de un equipo del colegio de un deporte que no juega', () => {
    const g = nuevaPartida({ seed: 31 });
    const s = g.moduleState<NpcsState>('npcs') as { npcs: Npc[]; poblaciones?: PoblacionGuardada[] };
    for (const n of s.npcs) {
      for (const pob of s.poblaciones!) {
        if (n.description?.includes(pob.descripcionDelEquipo)) expect(n.deporte, `${n.id}: «${n.description}»`).toBe(pob.deporte);
      }
    }
  });
});

describe('la salida del colegio no es instantánea', () => {
  it('a las 14:00 los alumnos se van repartidos en 30 minutos, y quien se va no vuelve', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 1, 1, 13); // martes
    const alumnos = (): Set<string> => { const pres = g.service<PresenciaService>(SERVICES.presencia)!; return new Set(['colegio', 'patio', 'aula'].flatMap((l) => [...pres.en(l, 5000), ...pres.ocupadosEn(l).map((o) => o.persona)]).filter((n) => n.role === 'companero').map((n) => n.id)); };
    const esperarHasta = (hora: number, minuto: number): void => { while (g.time.minuteOfDay < hora * 60 + minuto) expect(g.perform('gen.esperar').ok).toBe(true); };
    esperarHasta(13, 50);
    expect(alumnos().size).toBeLessThan(40); // en clase solo se ve a tu clase; las demás están en sus aulas
    const serie: Set<string>[] = [];
    for (const [hh, mm] of [[14, 2], [14, 12], [14, 22], [14, 31]] as const) { esperarHasta(hh, mm); serie.push(alumnos()); }
    const [a, b, c, d] = serie;
    // Al sonar el timbre salen todos a la entrada y al patio, y de 14:00 a 14:30 se van repartidos hasta que no queda nadie.
    expect(a.size).toBeGreaterThan(300);
    expect(a.size).toBeGreaterThan(b.size);
    expect(b.size).toBeGreaterThan(c.size);
    expect(c.size).toBeGreaterThan(d.size);
    expect(d.size).toBe(0);
    // Monótona: nadie que se ha ido vuelve.
    for (const x of c) expect(b.has(x)).toBe(true);
    for (const x of b) expect(a.has(x)).toBe(true);
  });
});
