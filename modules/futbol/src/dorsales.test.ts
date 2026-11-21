import { describe, expect, it } from 'vitest';
import { asignarDorsales, dorsalDeCampo } from '@ds/contracts';
import { DORSALES_DE_FUTBOL as R, PUESTOS_DE_FUTBOL } from './puestos';

const PUESTOS = PUESTOS_DE_FUTBOL.puestos.map((p) => p.id).filter((p) => p !== 'GK');
/** Una plantilla de 18: 2 porteros y 16 de campo con puestos variados. */
const plantilla = (prefijo: string, n = 18) => Array.from({ length: n }, (_, i) => ({ id: `${prefijo}${String(i).padStart(2, '0')}`, puesto: i < 2 ? 'GK' : PUESTOS[i % PUESTOS.length] }));

describe('los dorsales del fútbol', () => {
  it('son únicos, los de campo van del 2 al 25 y los porteros llevan el 1, el 13 o desde el 16', () => {
    for (let k = 0; k < 40; k++) {
      const j = plantilla(`e${k}_`);
      const d = asignarDorsales(j, R, `club${k}`);
      expect(new Set(d.values()).size).toBe(j.length);
      for (const x of j) {
        const n = d.get(x.id)!;
        if (x.puesto === 'GK') expect(n === 1 || n === 13 || n >= 16).toBe(true);
        else expect(n >= 2 && n <= 25).toBe(true);
      }
    }
  });

  it('los porteros prefieren el 1 y el 13; con los dos cogidos por porteros, el tercero va a partir del 16; si un de campo cogió el 13, el portero baja al 16 o más', () => {
    const tres = [{ id: 'a', puesto: 'GK' }, { id: 'b', puesto: 'GK' }, { id: 'c', puesto: 'GK' }];
    const d = asignarDorsales(tres, R, 'x');
    expect([...d.values()].sort((p, q) => p - q)).toEqual([1, 13, 16]);
    // Un de campo con el 13 ya guardado: el portero escoge después (el 1, y el siguiente portero, el 16).
    const d2 = asignarDorsales([{ id: 'a', puesto: 'GK' }, { id: 'b', puesto: 'GK' }, { id: 'z', puesto: 'CB', dorsal: 13 }], R, 'x');
    expect([d2.get('a'), d2.get('b')].sort((p, q) => p! - q!)).toEqual([1, 16]);
  });

  it('hay costumbre por puesto sin forzarla: la mayoría de los delanteros centro con el 9, pero no todos; los laterales, 2 y 3', () => {
    let nueves = 0;
    let lateralesBien = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      if (dorsalDeCampo(`n${i}`, 'ST', R, 'c', new Set()) === 9) nueves++;
      if ([2, 3].includes(dorsalDeCampo(`l${i}`, i % 2 ? 'LB' : 'RB', R, 'c', new Set()))) lateralesBien++;
    }
    expect(nueves / N).toBeGreaterThan(0.5);
    expect(nueves / N).toBeLessThan(0.75);
    expect(lateralesBien / N).toBeGreaterThan(0.5);
  });

  it('es estable: los que ya llevan número lo conservan aunque se vayan otros o lleguen nuevos', () => {
    const j = plantilla('s');
    const antes = asignarDorsales(j, R, 'club');
    const guardados = j.map((x) => ({ ...x, dorsal: antes.get(x.id) }));
    const sin = guardados.filter((_, i) => i % 3 !== 0);
    const nuevos = [...sin, { id: 'zz1', puesto: 'ST' }, { id: 'zz2', puesto: 'GK' }];
    const despues = asignarDorsales(nuevos, R, 'club');
    for (const x of sin) expect(despues.get(x.id)).toBe(antes.get(x.id));
    expect(new Set(despues.values()).size).toBe(nuevos.length);
    // Sin guardar nada, el mismo equipo da siempre lo mismo (no gasta el azar de la partida).
    expect([...asignarDorsales(j, R, 'club')]).toEqual([...antes]);
  });

  it('con un número repetido en lo guardado, el segundo se reasigna; una plantilla grande no se queda sin números', () => {
    const d = asignarDorsales([{ id: 'a', puesto: 'CB', dorsal: 4 }, { id: 'b', puesto: 'CB', dorsal: 4 }], R, 'x');
    expect(d.get('a')).toBe(4);
    expect(d.get('b')).not.toBe(4);
    const grande = asignarDorsales(plantilla('g', 40), R, 'club');
    expect(new Set(grande.values()).size).toBe(40);
  });
});
