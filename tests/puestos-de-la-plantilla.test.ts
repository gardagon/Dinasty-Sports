import { describe, expect, it, vi } from 'vitest';
import { PROPORCION_DE_ZURDOS, SERVICES, claveDeDeporte, conLaPierna, grupoDePuesto, ladoDePuesto, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PUESTOS_DE_FUTBOL, convocarYAlinear, futbol, paraConvocar, type FutbolState } from '@ds/mod-futbol';
import { categoriasDelEquipo, type NpcsState } from '@ds/mod-npcs';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });

/**
 * ¿Por qué casi todos los puestos de la plantilla son del lado derecho? (21/11/2026) La columna «Puesto en la plantilla» es el puesto que ocupa cada niño en su equipo (el que más vale de los de su grupo, o su favorito), no donde
 * juega cada sábado: el entrenador alinea con la formación (lateral izquierdo y derecho, extremo izquierdo y derecho...) y el once tiene siempre los dos lados. Que la columna sea ~80 % derecha es la pierna buena (decisión del
 * 04/11: en torno al 20 % de zurdos; el lado de la pierna vale ±0,25 y los puestos de los dos lados pesan igual), no un sesgo del reparto: estos tests lo comprueban.
 */
const P = PUESTOS_DE_FUTBOL;

describe('los dos lados valen lo mismo salvo por la pierna buena', () => {
  it('los puestos de la izquierda y de la derecha pesan igual (espejo)', () => {
    for (const [i, d] of [['LB', 'RB'], ['LCR', 'RCR'], ['LM', 'RM'], ['LW', 'RW'], ['LST', 'RST']]) {
      const a = P.puestos.find((p) => p.id === i)!.pesos;
      const b = P.puestos.find((p) => p.id === d)!.pesos;
      expect(a, `${i}/${d}`).toEqual(b);
    }
  });

  it('con las mismas habilidades, un diestro rinde mejor en el lado derecho y un zurdo en el izquierdo, igual de mejor (sin sesgo a ningún lado)', () => {
    const crudos = Object.fromEntries(P.puestos.map((p) => [p.id, 40]));
    const ventaja = P.pierna!.ventajaDelLado;
    const diestro = conLaPierna(crudos, 'derecha', ventaja);
    const zurdo = conLaPierna(crudos, 'izquierda', ventaja);
    for (const [i, d] of [['LB', 'RB'], ['LCR', 'RCR'], ['LM', 'RM'], ['LW', 'RW'], ['LST', 'RST']]) {
      expect(diestro[d] - diestro[i]).toBeCloseTo(2 * ventaja, 10);
      expect(zurdo[i] - zurdo[d]).toBeCloseTo(2 * ventaja, 10);
      expect(diestro[d]).toBeCloseTo(zurdo[i], 10);
      expect(diestro[i]).toBeCloseTo(zurdo[d], 10);
    }
    // Los puestos sin lado no cambian.
    expect(diestro.CB).toBe(40);
    expect(zurdo.GK).toBe(40);
  });
});

describe('las plantillas y los onces de la ciudad', () => {
  const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 1, 0, 9); // los niños se apuntan a su equipo en los primeros días del curso
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const equipos = pob.equipos.flatMap((e) => categoriasDelEquipo(pob, e).flatMap((c) => ['A', 'B', 'C', 'D'].map((l) => dir.plantillaDelEquipo!('futbol', e.club, c.id, l)).filter((p) => p.length >= 14)));

  it('el lado de los puestos de la plantilla sigue a la pierna buena de la población (en torno al 80 % derecha), no a un sesgo del reparto', () => {
    expect(equipos.length).toBeGreaterThan(10);
    const conLado = equipos.flat().filter((j) => ladoDePuesto(j.puesto));
    const izquierda = conLado.filter((j) => ladoDePuesto(j.puesto) === 'izquierda').length / conLado.length;
    expect(izquierda).toBeGreaterThan(PROPORCION_DE_ZURDOS - 0.07);
    expect(izquierda).toBeLessThan(PROPORCION_DE_ZURDOS + 0.07);
  });

  it('el puesto de la plantilla es el que más vale al niño dentro de su grupo (la mayoría) y no hay sesgo en los empates', () => {
    const delGrupo = (j: (typeof equipos)[number][number]) => P.reparto.find((r) => r.puestos.includes(j.puesto))!.puestos;
    const mejorDeSuGrupo = (j: (typeof equipos)[number][number]) => Object.entries(j.valores).filter(([p]) => delGrupo(j).includes(p)).reduce((m, [p, v]) => (v > m[1] || (v === m[1] && p < m[0]) ? [p, v] : m), ['', -Infinity] as [string, number])[0];
    const todos = equipos.flat();
    const son = todos.filter((j) => j.puesto === mejorDeSuGrupo(j)).length / todos.length;
    expect(son).toBeGreaterThan(0.75);
  });

  it('el once siempre tiene su lateral izquierdo y derecho y sus dos extremos, aunque en la plantilla casi todos sean del lado derecho, y casi nadie juega fuera de su grupo', () => {
    let titulares = 0, fuera = 0;
    for (const pl of equipos) {
      const c = convocarYAlinear(pl.map((j) => paraConvocar(j)));
      expect(c.titulares).toHaveLength(11);
      const puestos = c.titulares.map((t) => t.puesto);
      for (const p of ['GK', 'LB', 'RB', 'LW', 'RW', 'ST']) expect(puestos.filter((x) => x === p), p).toHaveLength(1);
      expect(puestos.filter((x) => x === 'CB')).toHaveLength(2);
      const porId = new Map(pl.map((j) => [j.id, j]));
      for (const t of c.titulares) {
        titulares++;
        if (grupoDePuesto(P, t.puesto) !== grupoDePuesto(P, porId.get(t.id)!.puesto)) fuera++;
      }
    }
    // El once «cojo» (alguien fuera de su grupo de puestos) es raro: solo cuando a una plantilla le falta gente de un grupo.
    expect(fuera / titulares).toBeLessThan(0.05);
  });
});

describe('la pestaña del equipo cuenta qué es la columna de puestos', () => {
  it('la tabla de la plantilla se titula «Puesto en la plantilla» y la sección explica que el once juega con la formación', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    advanceToWeek(g, 'gen.descansar', 8, 2, 15);
    const f = g.moduleState<FutbolState>('futbol') as FutbolState;
    expect(f.personaje).toBeDefined();
    const plantilla = g.service<DeporteService>(claveDeDeporte('futbol'))!.view().secciones!.find((x) => x.titulo.startsWith('Plantilla'))!;
    expect(plantilla.tabla!.header[1]).toBe('Puesto en la plantilla');
    expect(plantilla.texto).toMatch(/alinea|formación/i);
  });
});
