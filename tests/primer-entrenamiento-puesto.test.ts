import { describe, expect, it } from 'vitest';
import { componerTexto, fraseDelPuestoInicial, otraFamiliaDeEncaje, MARGEN_DE_OTRO_PUESTO } from '@ds/contracts';
import { PUESTOS_DE_FUTBOL } from '@ds/mod-futbol';
import primerEntrenamiento from '../modules/futbol/src/eventos/primer_entrenamiento';
import { Banco } from '../tools/eventos/banco';

/** Valores de ejemplo por puesto (lo que vale en cada uno): todo a 50 salvo lo que se pida. */
const valores = (extra: Record<string, number>): Record<string, number> => ({ ...Object.fromEntries(PUESTOS_DE_FUTBOL.puestos.map((p) => [p.id, 50])), ...extra });
const concordar = (t: string, gender: 'm' | 'f'): string => componerTexto(t, { yo: { nombre: 'tú', gender }, papeles: {} });

describe('el entrenador dice el puesto en el primer entrenamiento (frase del deporte, sin lado)', () => {
  it('dice el puesto sin lado, con el nombre del juego: «de interior», «de lateral»', () => {
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'LCR', valores({ LCR: 70 }))).toBe('De inicio vas a jugar de interior.');
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'RB', valores({ RB: 70 }))).toBe('De inicio vas a jugar de lateral.');
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'RM', valores({ RM: 70 }))).toBe('De inicio vas a jugar de medio de banda.');
  });

  it('con segundo puesto (otra familia a menos de un margen de la suya): «pero a lo mejor más adelante te pongo de…»', () => {
    // Interior vale 60 (LCR 60, RCR 60) y lateral 58 (LB 58, RB 58): encaja también de lateral.
    const v = valores({ LCR: 60, RCR: 60, LB: 58, RB: 58 });
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'LCR', v)).toBe('De inicio vas a jugar de interior, pero a lo mejor más adelante te pongo de lateral.');
    // Con varias, la que más vale; y el mismo puesto del otro lado no cuenta como otro puesto.
    const w = valores({ LCR: 60, RCR: 60, LB: 58, RB: 58, CM: 59.5 });
    expect(otraFamiliaDeEncaje(PUESTOS_DE_FUTBOL, 'RCR', w)?.id).toBe('mediocentro');
  });

  it('sin segundo puesto si ninguna otra familia está cerca', () => {
    const v = valores({ GK: 80 });
    expect(otraFamiliaDeEncaje(PUESTOS_DE_FUTBOL, 'GK', v)).toBeUndefined();
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'GK', v)).toBe('De inicio vas a jugar de portero.');
    // Justo en el margen entra; un punto más lejos, no.
    expect(otraFamiliaDeEncaje(PUESTOS_DE_FUTBOL, 'GK', valores({ GK: 80, CB: 80 - MARGEN_DE_OTRO_PUESTO }))?.id).toBe('central');
    expect(otraFamiliaDeEncaje(PUESTOS_DE_FUTBOL, 'GK', valores({ GK: 80, CB: 79 - MARGEN_DE_OTRO_PUESTO }))).toBeUndefined();
  });

  it('si el puesto que le da es de otra familia que el que pidió en la prueba, lo dice con naturalidad (concuerda con el género)', () => {
    const v = valores({ LCR: 60, RCR: 60 });
    const t = fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'LCR', v, 'GK')!;
    expect(t).toMatch(/^Me dijiste portero en la prueba, y se te veía convencid\{yo:o\|a\}\. De inicio vas a jugar de interior\.$/);
    expect(concordar(t, 'm')).toContain('convencido');
    expect(concordar(t, 'f')).toContain('convencida');
    expect(concordar(t, 'f')).not.toMatch(/[{}]/);
    // Con segundo puesto a la vez.
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'LCR', valores({ LCR: 60, RCR: 60, LB: 59, RB: 59 }), 'GK')).toMatch(/\. De inicio vas a jugar de interior, pero a lo mejor más adelante te pongo de lateral\.$/);
  });

  it('si pidió el mismo puesto (aunque sea el otro lado), no lo recuerda', () => {
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'LB', valores({ LB: 70 }), 'RB')).toBe('De inicio vas a jugar de lateral.');
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'LB', valores({ LB: 70 }), undefined)).toBe('De inicio vas a jugar de lateral.');
  });

  it('sin texto en el deporte (o con un puesto desconocido) no hay frase', () => {
    expect(fraseDelPuestoInicial({ ...PUESTOS_DE_FUTBOL, pistas: undefined }, 'LB', valores({}))).toBeUndefined();
    expect(fraseDelPuestoInicial(PUESTOS_DE_FUTBOL, 'XX', valores({}))).toBeUndefined();
  });
});

describe('el suceso del primer entrenamiento con la frase del puesto', () => {
  const hechos = (frase: string): Record<string, string | boolean> => ({ 'futbol.puesto': 'interior izquierdo', 'futbol.frase_del_puesto': frase, 'futbol.juega_donde_mas_vale': true, 'futbol.mejor_puesto': 'interior izquierdo', 'futbol.mejor_puesto_id': 'LCR', 'futbol.calendario': 'la liga empieza pronto' });

  it('el texto del suceso lleva la frase (con segundo puesto y con puesto pedido), sin llaves, y conserva la opción de pedir otro puesto', () => {
    const frase = 'Me dijiste portero en la prueba, y se te veía convencida. De inicio vas a jugar de interior, pero a lo mejor más adelante te pongo de lateral.';
    const s = new Banco().sesion({ hechos: { ...hechos(frase), 'futbol.juega_donde_mas_vale': false } });
    expect(s.forzar('futbol.primer_entrenamiento')).toBe(true);
    const p = s.pendiente('futbol.primer_entrenamiento')!;
    expect(p.texto).toContain(frase);
    expect(p.texto).not.toMatch(/[{}]/);
    expect(p.opciones.map((o) => o.id)).toEqual(['aceptar', 'pedir_cambio', 'preguntar']);
  });

  it('con el puesto donde más vale, la frase va sola y se puede aceptar sin más', () => {
    const s = new Banco().sesion({ hechos: hechos('De inicio vas a jugar de interior.') });
    expect(s.forzar('futbol.primer_entrenamiento')).toBe(true);
    expect(s.pendiente('futbol.primer_entrenamiento')!.texto).toMatch(/De inicio vas a jugar de interior\. Es donde mejor te veo\./);
    s.elegir('futbol.primer_entrenamiento', 'aceptar');
  });

  it('el género del personaje se concuerda también dentro de la frase del deporte', () => {
    const frase = 'Me dijiste portero, y se te veía convencid{yo:o|a}. De inicio vas a jugar de interior.';
    const s = new Banco().sesion({ hechos: hechos(frase) });
    expect(s.forzar('futbol.primer_entrenamiento')).toBe(true);
    expect(s.pendiente('futbol.primer_entrenamiento')!.texto).toMatch(/convencid[oa]\./);
    expect(s.pendiente('futbol.primer_entrenamiento')!.texto).not.toMatch(/[{}]/);
  });

  it('el suceso no sale si el deporte no tiene frase (sin puestos que decir)', () => {
    expect((primerEntrenamiento as unknown as { cuando: unknown[] }).cuando).toContainEqual({ hecho: 'futbol.frase_del_puesto' });
  });
});
