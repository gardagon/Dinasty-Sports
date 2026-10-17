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
    const entrada = r.log.find((l) => /de 17/.test(l.text)); // tú + 16 rivales NPC
    expect(entrada).toBeDefined();
    // La carrera deja una clasificación con nombres, posiciones y tiempos.
    expect(entrada!.table?.rows).toHaveLength(17);
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
});
