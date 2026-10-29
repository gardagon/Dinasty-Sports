import { describe, expect, it } from 'vitest';
import type { FormularioDePlan } from '@ds/contracts';
import { ajustarEleccion, viewFormularioDePlan } from './planes';

const dias = (hoy: number[], manana: number[]) => ({ hoy: { horas: hoy, ...(hoy.length ? {} : { motivo: 'Hoy ya no quedan horas' }) }, manana: { horas: manana } });
const f: FormularioDePlan = {
  actividades: [
    { id: 'estudiar', nombre: 'Estudiar', duracion: 90, lugares: [{ id: 'casa', texto: 'en tu casa', dias: dias([], [600, 1020]) }, { id: 'biblioteca', texto: 'en la biblioteca', dias: dias([1000, 1020], [600, 630]) }] },
    { id: 'pasar_rato', nombre: 'Pasar el rato', duracion: 120, lugares: [{ id: 'parque', texto: 'en el parque', dias: dias([], []) }] },
  ],
};

describe('formulario de proponer un plan', () => {
  it('sin elegir nada, coge la primera actividad, el primer sitio con horas, hoy si hay horas y la hora de las 17:00 si se puede', () => {
    expect(ajustarEleccion(f)).toEqual({ actividad: 'estudiar', lugar: 'casa', cuando: 'manana', minuto: 1020 });
  });
  it('si lo elegido ya no existe o no tiene esa hora, se cambia por lo más parecido', () => {
    expect(ajustarEleccion(f, { actividad: 'estudiar', lugar: 'biblioteca', cuando: 'hoy', minuto: 700 })).toEqual({ actividad: 'estudiar', lugar: 'biblioteca', cuando: 'hoy', minuto: 1020 });
    expect(ajustarEleccion(f, { actividad: 'estudiar', lugar: 'biblioteca', cuando: 'manana', minuto: 600 })).toMatchObject({ minuto: 600 });
    expect(ajustarEleccion(f, { actividad: 'pasar_rato', lugar: 'casa' })).toMatchObject({ actividad: 'pasar_rato', lugar: 'parque' });
    expect(ajustarEleccion({ actividades: [] })).toBeUndefined();
  });
  it('el botón lleva el id de la propuesta y se desactiva sin horas o si no se le puede proponer nada', () => {
    const e = ajustarEleccion(f, { actividad: 'estudiar', lugar: 'biblioteca', cuando: 'hoy' })!;
    const html = viewFormularioDePlan('ana', f, e, 'Ana');
    expect(html).toContain('data-do="relaciones.proponer.ana.estudiar.biblioteca.hoy.1020"');
    expect(html).not.toMatch(/data-do="[^"]*"\s+disabled/);
    const sinHoras = viewFormularioDePlan('ana', f, ajustarEleccion(f, { actividad: 'pasar_rato' })!, 'Ana');
    expect(sinHoras).toMatch(/data-do="[^"]*" disabled/);
    expect(viewFormularioDePlan('ana', { ...f, motivo: 'Ana no está aquí' }, e, 'Ana')).toMatch(/data-do="[^"]*" disabled/);
    expect(viewFormularioDePlan('ana', { ...f, motivo: 'Ana no está aquí' }, e, 'Ana')).toContain('Ana no está aquí');
  });
});
