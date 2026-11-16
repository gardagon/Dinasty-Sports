import { describe, expect, it, vi } from 'vitest';
import { APORTE_DE_CONFIG_DE_SUCESOS, ESTADO_INICIAL, SERVICES, SHARED_EVENTS, defineModule, type NpcDirectory, type SucesosService } from '@ds/contracts';
import { advanceToWeek, type Game } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import type { NpcsState } from '@ds/mod-npcs';
import type { SucesosState } from '@ds/mod-sucesos';
import { conocer } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Los sucesos de los PNJ (decisión del usuario del 16/11): el formato y el director valen para cualquiera, pero solo la clase `lesion` está
 * activa. Una lesión de un PNJ (que ya sale de su estado de juego cada semana) la cuenta y le da consecuencias el suceso `eventos.salud.lesion`.
 */
const banco = (clases?: string[], diario = false) =>
  defineModule({
    id: 'banco',
    name: 'Banco',
    aportes: { [APORTE_DE_CONFIG_DE_SUCESOS]: [{ pnj: { ...(clases ? { clases } : {}), diarioDeCercanos: diario } }] },
    actions: [{ id: 'banco.lesion', name: 'Lesión', tags: ['prueba'], duration: 1, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.LESION_DE_PERSONA, data: { npcId: ctx.flag<string>('banco.quien'), semanas: 4, deporte: 'atletismo' } }) }],
  });

const estadoDe = (g: Game, id: string) => g.moduleState<NpcsState>('npcs').npcs.find((n) => n.id === id)!.estado ?? ESTADO_INICIAL;
const marcas = (g: Game) => Object.keys(g.moduleState<SucesosState>('sucesos').marcas);

/** Lesiona a un atleta (como lo haría su semana) y lanza el aviso. */
function lesionar(g: Game, id: string): void {
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  s.npcs = s.npcs.map((n) => (n.id === id ? { ...n, estado: { ...(n.estado ?? ESTADO_INICIAL), baja: 4, salud: 44 } } : n));
  (g as unknown as { s: { flags: Record<string, unknown> } }).s.flags['banco.quien'] = id;
  expect(g.perform('banco.lesion').ok).toBe(true);
}

const unAtleta = (g: Game): string => g.moduleState<NpcsState>('npcs').npcs.find((n) => n.deporte && n.hab && !n.estado?.baja && n.rasgos)!.id;

describe('sucesos de los PNJ', () => {
  it('con la clase `lesion` activa (por defecto), la lesión de un PNJ tiene consecuencias en su estado y él decide por su carácter', () => {
    const g = nuevaPartida({ seed: 11 }, [...MODULOS, banco()]);
    const id = unAtleta(g);
    const antes = estadoDe(g, id);
    lesionar(g, id);
    const despues = estadoDe(g, id);
    expect(despues.moral).toBeLessThan(antes.moral);
    // Decide entre recuperarse bien (4 semanas, más salud) o forzar (3 semanas, menos salud): una de las dos, según su carácter.
    expect([[4, 49], [3, 36]]).toContainEqual([despues.baja, despues.salud]);
    expect(marcas(g)).toContain(`lesionado_hace_poco@${id}`);
    // No queda nada pendiente para el jugador ni se le enseña nada: es la vida de otro.
    expect(g.service<SucesosService>(SERVICES.sucesos)!.pendientes()).toEqual([]);
    expect(g.service<SucesosService>(SERVICES.sucesos)!.recuerdos()).toEqual([]);
  });

  it('los prudentes se recuperan bien y los ambiciosos sin prudencia fuerzan más', () => {
    const g = nuevaPartida({ seed: 11 }, [...MODULOS, banco()]);
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const atletas = g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.deporte && n.hab && !n.estado?.baja && n.rasgos).slice(0, 120).map((n) => n.id);
    const fuerza = (id: string): boolean => {
      lesionar(g, id);
      return estadoDe(g, id).baja === 3;
    };
    const tira = (id: string) => (dir.get(id)!.rasgos!.caracter.ambicion ?? 0) - (dir.get(id)!.rasgos!.caracter.prudencia ?? 0);
    const orden = [...atletas].sort((a, b) => tira(a) - tira(b));
    const tercio = Math.floor(orden.length / 3);
    const prudentes = orden.slice(0, tercio).filter(fuerza).length;
    const lanzados = orden.slice(-tercio).filter(fuerza).length;
    expect(lanzados).toBeGreaterThan(prudentes);
  });

  it('con la clase desactivada no pasa nada, y el personaje se entera de lo de alguien cercano solo si está activado', () => {
    const sin = nuevaPartida({ seed: 11 }, [...MODULOS, banco([])]);
    const id = unAtleta(sin);
    const antes = estadoDe(sin, id);
    lesionar(sin, id);
    expect(estadoDe(sin, id)).toEqual({ ...antes, baja: 4, salud: 44 });
    expect(marcas(sin)).toEqual([]);

    for (const diario of [false, true]) {
      const g = conocer(nuevaPartida({ seed: 11 }, [...MODULOS, banco(undefined, diario)]), 'entrenador');
      // Alguien con quien el personaje tiene relación guardada.
      const rel = g.moduleState<{ vinculos: Record<string, unknown> }>('relaciones') as { vinculos: Record<string, unknown> };
      const quien = unAtleta(g);
      rel.vinculos[quien] = { npcId: quien, afinidad: 30, confianza: 20, estado: 'amigo', desde: 0, ultimoContacto: 0, contactos: [0] };
      const s = g.moduleState<NpcsState>('npcs') as NpcsState;
      s.npcs = s.npcs.map((n) => (n.id === quien ? { ...n, known: true } : n));
      lesionar(g, quien);
      expect(g.log.some((l) => / se ha lesionado: estará 4 semanas de baja\./.test(l.text))).toBe(diario);
      expect(g.service<SucesosService>(SERVICES.sucesos)!.recuerdos(quien).length).toBe(diario ? 1 : 0);
    }
  });

  it('las lesiones que salen solas cada semana pasan por el suceso', () => {
    const g = nuevaPartida({ seed: 11 });
    advanceToWeek(g, 'gen.descansar', 30, 2, 15);
    expect(marcas(g).filter((m) => m.startsWith('lesionado_hace_poco@')).length).toBeGreaterThan(0);
    expect(() => JSON.stringify(g.serialize())).not.toThrow();
  });
});
