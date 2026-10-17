import { describe, expect, it } from 'vitest';
import { GEN, SERVICES, type NpcDirectory } from '@ds/contracts';
import { advanceTo, checkInvariants, seededRng } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import type { NpcsState } from '@ds/mod-npcs';

/** Pruebas de los NEXOS: módulos que colaboran sin conocerse. */

describe('integración de módulos', () => {
  it('todos los módulos se registran juntos sin conflictos', () => {
    const g = nuevaPartida({ seed: 11 });
    expect(g.registry.moduleIds.size).toBe(MODULOS.length);
    expect(checkInvariants(g)).toEqual([]);
  });

  it('el entrenador (NPCs) potencia el atletismo vía etiquetas', () => {
    const g = nuevaPartida({ seed: 11 });
    advanceTo(g, 'gen.descansar', 0, 16);
    const sin = g.preview('atletismo.tecnica')!.efficiency;
    // Forzamos una buena relación a través de un guardado (como haría una partida avanzada).
    const s = g.serialize();
    const ns = s.modules.npcs as NpcsState;
    ns.npcs = ns.npcs.map((n) => (n.id === 'entrenador' ? { ...n, affinity: 90 } : n));
    const g2 = cargarPartida(s);
    const con = g2.preview('atletismo.tecnica')!;
    expect(con.efficiency).toBeGreaterThan(sin);
    expect(con.modifiers.some((m) => m.id === 'npcs.apoyo')).toBe(true);
  });

  it('las carreras usan a los rivales NPC y el entrenador reacciona', () => {
    const g = nuevaPartida({ seed: 11 });
    advanceTo(g, 'gen.descansar', 5, 10);
    const antes = g.service<NpcDirectory>(SERVICES.npcs)!.get('entrenador')!.affinity;
    const r = g.perform('atletismo.carrera');
    expect(r.ok).toBe(true);
    const entrada = r.log.find((l) => /de 8/.test(l.text)); // tú + 7 rivales de los 16 NPC
    expect(entrada).toBeDefined();
    // La carrera deja una clasificación con nombres, posiciones y tiempos.
    expect(entrada!.table?.rows).toHaveLength(8);
    expect(entrada!.table?.header).toEqual(['Pos.', 'Corredor', 'Tiempo', 'Dif.']);
    const mia = entrada!.table!.rows[entrada!.table!.highlight!];
    expect(mia[1]).toBe('Tú');
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.get('entrenador')!.affinity).toBeGreaterThan(antes);
  });

  it('una semana jugando al azar no rompe ninguna invariante', () => {
    const g = nuevaPartida({ seed: 2 });
    const rng = seededRng(2);
    while (g.time.day < 14) {
      const opts = g.availableActions();
      g.perform(rng.pick(opts).id);
      expect(checkInvariants(g)).toEqual([]);
    }
    expect(g.stat(GEN.energia)).toBeGreaterThanOrEqual(0);
  });

  it('las series son de 8: los mejores rivales corren al principio y luego la serie rota', () => {
    const g = nuevaPartida({ seed: 4 });
    // El servicio es una foto del momento: se pide de nuevo cada vez.
    const mejores = () =>
      g
        .service<NpcDirectory>(SERVICES.npcs)!
        .list({ tag: 'atleta' })
        .sort((a, b) => (b.levels.atletismo ?? 0) - (a.levels.atletismo ?? 0))
        .slice(0, 3)
        .map((n) => n.name);
    const vistos = new Set<string>();
    let seriesIguales = 0;
    let anterior = '';
    for (let semana = 0; semana < 30; semana++) {
      advanceTo(g, 'gen.descansar', 5, 10);
      const top = mejores();
      const r = g.perform('atletismo.carrera');
      expect(r.ok).toBe(true);
      const nombres = r.log.find((l) => l.table)!.table!.rows.map((f) => f[1]);
      expect(nombres).toHaveLength(8);
      if (semana < 8) for (const m of top) expect(nombres).toContain(m);
      const rivales = nombres.filter((n) => n !== 'Tú').sort();
      for (const n of rivales) vistos.add(n);
      if (rivales.join() === anterior) seriesIguales++;
      anterior = rivales.join();
    }
    expect(vistos.size).toBeGreaterThan(12); // la rotación recorre casi todo el pelotón
    expect(seriesIguales).toBeLessThan(3);
  });
});
