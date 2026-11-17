import { describe, expect, it } from 'vitest';
import type { ActionOption } from '@ds/core';
import { agruparEnDesplegables, cambioEnDesplegable, clicEnDesplegable, viewDesplegable } from './desplegables';

const d = { id: 'x.entrenar', nombre: 'Entrenar…', etiqueta: 'Entrenamiento', boton: 'Entrenar: {opcion}' };
const op = (id: string, extra: Partial<ActionOption> = {}): ActionOption => ({ id, name: id.toUpperCase(), module: 'x', group: 'G', tags: [], available: true, duration: 60, efficiency: 1, modifiers: [], delta: {}, train: [], ...extra });
const esc = (s: string) => s;

describe('desplegables de acciones', () => {
  it('agrupa las del mismo grupo y desplegable en el sitio de la primera y deja las demás', () => {
    const e = agruparEnDesplegables([op('a'), op('b', { desplegable: d }), op('c'), op('d', { desplegable: d })]);
    expect(e).toHaveLength(3);
    expect('opcion' in e[1]).toBe(false);
    expect((e[1] as { opciones: ActionOption[] }).opciones.map((o) => o.id)).toEqual(['b', 'd']);
  });

  it('cerrado es un botón; abierto, el desplegable con duración y motivo, y lanza la elegida', () => {
    const ops = [op('b', { desplegable: d, available: false, reason: 'Ahora no' }), op('c', { desplegable: d, duration: 90 })];
    const boton = (o: ActionOption, t: string) => `<BOTON ${o.id} ${t}>`;
    const dur = (m: number) => `${m}min`;
    const cerrado = viewDesplegable('G|x.entrenar', ops, esc, boton, dur);
    expect(cerrado).toContain('Entrenar…');
    expect(cerrado).not.toContain('<select');
    clicEnDesplegable({ dataset: { desplegable: 'G|x.entrenar' } } as unknown as HTMLElement);
    const abierto = viewDesplegable('G|x.entrenar', ops, esc, boton, dur);
    expect(abierto).toContain('B · 60min (no disponible)');
    expect(abierto).toContain('C · 90min');
    expect(abierto).toContain('<BOTON c Entrenar: c>'); // por defecto, la primera disponible
    cambioEnDesplegable({ dataset: { desplegableCampo: 'G|x.entrenar' }, value: 'b' } as unknown as HTMLSelectElement);
    expect(viewDesplegable('G|x.entrenar', ops, esc, boton, dur)).toContain('<BOTON b Entrenar: b>');
    clicEnDesplegable({ dataset: { desplegable: 'G|x.entrenar' } } as unknown as HTMLElement);
  });
});
