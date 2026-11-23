import { beforeAll, describe, expect, it, vi } from 'vitest';
import { EDAD_DE_JUBILACION, EDAD_PARA_IR_SOLO, SERVICES, oficioDeVecino, type PresenciaService } from '@ds/contracts';
import { advanceTo, type Game } from '@ds/core';
import { nuevaPartida } from '@ds/game';
import { ajustarVecinos, edadNpc, type Npc, type NpcsState } from '@ds/mod-npcs';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/** Gente por la calle (23/11, F1 y F2): vecinos con calle, perro, banco y oficio, menores que no van solos y las caras fijas. Notas: `docs/relevo/gente-por-la-calle.md`. */
describe('la gente de las calles', () => {
  let g: Game;
  const npcs = (): Npc[] => (g.moduleState<NpcsState>('npcs') as NpcsState).npcs;
  const presencia = () => g.service<PresenciaService>(SERVICES.presencia)!;
  const adultos = () => npcs().filter((n) => /^vecino_\d+$/.test(n.id) && (edadNpc(n, 0) ?? 0) >= 18);

  beforeAll(() => {
    g = nuevaPartida({ seed: 31 });
  });

  it('hay un portero, un conserje y tres repartidores, desconocidos, con etiqueta, oficio y dónde trabajan', () => {
    for (const id of ['portero_1', 'conserje_1', 'repartidor_1', 'repartidor_2', 'repartidor_3']) {
      const n = npcs().find((x) => x.id === id)!;
      expect(n, id).toBeDefined();
      expect(n.known).toBe(false);
      expect(n.role).toBe('vecino');
      expect(n.tags).toContain(id.replace(/_\d+$/, ''));
      expect(n.nacimiento).toBeDefined();
      expect(n.rasgos).toBeDefined();
    }
    expect(npcs().filter((n) => n.tags.includes('repartidor')).length).toBe(3);
  });

  it('los vecinos adultos llevan sus marcas: en qué calle viven (las tres), el perro, la jubilación y el oficio en un lugar', () => {
    const lista = adultos();
    expect(lista.length).toBeGreaterThan(40);
    const marca = (n: Npc) => n.tipos!.find((t) => t.tipo === 'vecino')!;
    for (const calle of ['calle_casa', 'calle_colegio', 'avenida_parque']) expect(lista.some((n) => marca(n).vive === calle), calle).toBe(true);
    expect(lista.some((n) => !marca(n).vive)).toBe(true);
    const conPerro = lista.filter((n) => marca(n).perro);
    expect(conPerro.length / lista.length).toBeGreaterThan(0.03);
    expect(conPerro.length / lista.length).toBeLessThan(0.3);
    for (const n of conPerro) {
      expect(n.tags).toContain('perro');
      expect(n.description).toMatch(/perro/);
    }
    for (const n of lista.filter((x) => !marca(x).perro)) expect(n.tags).not.toContain('perro');
    for (const n of lista) {
      const edad = edadNpc(n, 0)!;
      expect(!!marca(n).jubilado, `${n.id} (${edad})`).toBe(edad >= EDAD_DE_JUBILACION);
      if (marca(n).jubilado) expect(n.tags).toContain('jubilado');
      if (marca(n).jubilado) expect(n.description).toMatch(/jubilad/);
      // El oficio de un lugar (dependiente, camarero, cocinero, monitor) es el que dice su ficha.
      const trabajo = oficioDeVecino(n.id, n.gender, edad).trabajo;
      const lugar = { Supermercado: 'supermercado', Restaurante: 'restaurante', 'Gimnasio municipal': 'gimnasio' }[trabajo ?? ''];
      expect(marca(n).trabaja, `${n.id} ${trabajo}`).toBe(lugar);
      if (lugar) expect(['manana', 'tarde']).toContain(marca(n).turno);
    }
    expect(lista.some((n) => marca(n).trabaja)).toBe(true);
  });

  it('los menores de 12 años (vecinos y alumnos) llevan la marca de no ir solos, y los demás no', () => {
    const conEdad = npcs().filter((n) => n.nacimiento !== undefined && n.tipos?.some((t) => t.tipo === 'vecino' || t.tipo === 'alumno'));
    expect(conEdad.some((n) => (edadNpc(n, 0) ?? 99) < EDAD_PARA_IR_SOLO)).toBe(true);
    for (const n of conEdad) {
      const t = n.tipos!.find((x) => x.tipo === 'vecino' || x.tipo === 'alumno')!;
      expect(!!t.pequeno, `${n.id} (${edadNpc(n, 0)})`).toBe((edadNpc(n, 0) ?? 99) < EDAD_PARA_IR_SOLO);
    }
  });

  it('ajustarVecinos no cambia la lista si no cambia nada (cambiarla invalida las cachés) y es la misma para la misma semilla', () => {
    const lista = npcs();
    expect(ajustarVecinos(lista, g.moduleState<NpcsState>('npcs')!.semilla ?? 31, 0)).toBe(lista);
    const otra = nuevaPartida({ seed: 31 });
    const a = (otra.moduleState('npcs') as NpcsState).npcs.map((n) => JSON.stringify(n.tipos));
    expect(a).toEqual(lista.map((n) => JSON.stringify(n.tipos)));
  });

  it('un día de clase, por la mañana, hay gente en la calle de tu casa y el portero está allí; nadie pisa una calle de madrugada', () => {
    advanceTo(g, 'gen.descansar', 1, 7); // martes, 7:00
    let vistos = 0;
    let porteros = 0;
    const personasEnCalles = new Set<string>();
    for (let i = 0; i < 18 && g.time.hour < 9; i++) {
      for (const calle of ['calle_casa', 'calle_colegio', 'avenida_parque']) for (const p of presencia().en(calle, 500)) personasEnCalles.add(p.id);
      vistos += presencia().en('calle_casa', 500).length;
      if (presencia().en('calle_casa', 500).some((p) => p.id === 'portero_1')) porteros++;
      expect(g.perform('gen.esperar').ok).toBe(true);
    }
    expect(vistos).toBeGreaterThan(0);
    expect(personasEnCalles.size).toBeGreaterThan(3);
    expect(porteros).toBeGreaterThan(0);
  });
});
