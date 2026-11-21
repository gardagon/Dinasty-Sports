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

  it('la etiqueta de cada opción y el botón: `opcion` en el desplegable y `{opcion}` (en minúscula) o `{nombre}` (el nombre de la acción) en el botón', () => {
    const e = { id: 'x.estudiar', nombre: 'Estudiar…', etiqueta: 'Asignatura', boton: '{nombre}' };
    const ops = [op('a', { name: 'Estudiar lengua', desplegable: { ...e, opcion: 'Lengua' } }), op('b', { name: 'Estudiar inglés', desplegable: { ...e, opcion: 'Inglés' } })];
    clicEnDesplegable({ dataset: { desplegable: 'G|x.estudiar' } } as unknown as HTMLElement);
    const abierto = viewDesplegable('G|x.estudiar', ops, esc, (o, t) => `<BOTON ${o.id} ${t}>`, (m) => `${m}min`);
    expect(abierto).toContain('Lengua · 60min');
    expect(abierto).toContain('Inglés · 60min');
    expect(abierto).toContain('<BOTON a Estudiar lengua>');
    const amigos = { id: 'v.amigos', nombre: 'Practicar…', etiqueta: 'Deporte', boton: 'Practicar con los amigos: {opcion}', opcion: 'Fútbol' };
    const cerrado = [op('c', { desplegable: amigos })];
    clicEnDesplegable({ dataset: { desplegable: 'G|v.amigos' } } as unknown as HTMLElement);
    expect(viewDesplegable('G|v.amigos', cerrado, esc, (o, t) => `<BOTON ${o.id} ${t}>`, (m) => `${m}min`)).toContain('<BOTON c Practicar con los amigos: fútbol>');
  });

  it('si de un desplegable solo existe una acción (un deporte instalado), sale como un botón normal; si hay dos aunque una no esté disponible, sigue agrupado', () => {
    const e = { id: 'v.amigos', nombre: 'Practicar…', etiqueta: 'Deporte', boton: '{nombre}' };
    const sola = [op('a', { desplegable: e })];
    expect(agruparEnDesplegables(sola, sola).every((x) => 'opcion' in x)).toBe(true);
    const dos = [op('a', { desplegable: e }), op('b', { desplegable: e, available: false })];
    // La lista visible solo trae la disponible, pero existen las dos: se agrupa.
    expect(agruparEnDesplegables([dos[0]], dos).some((x) => 'clave' in x)).toBe(true);
  });
});
