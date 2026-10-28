import { describe, expect, it } from 'vitest';
import { ordenarAcciones, ordenarPorRelacion } from './gente';

type V = { nivel: number; afinidad: number; confianza: number };
const gente = (...xs: [string, V | undefined][]) => ({
  personas: xs.map(([id]) => ({ id, name: id })),
  vinculo: (id: string) => xs.find(([x]) => x === id)![1],
});

describe('orden de la gente', () => {
  it('de mayor a menor relación, después amistad y después confianza', () => {
    const { personas, vinculo } = gente(
      ['conocida_avanzada', { nivel: 0, afinidad: 60, confianza: 10 }],
      ['amiga_poca', { nivel: 1, afinidad: 20, confianza: 5 }],
      ['mejor_amiga', { nivel: 2, afinidad: 80, confianza: 50 }],
      ['amiga_mas', { nivel: 1, afinidad: 40, confianza: 1 }],
      ['amiga_mas_fiable', { nivel: 1, afinidad: 40, confianza: 30 }],
      ['antipatica', { nivel: -1, afinidad: -20, confianza: 0 }],
    );
    expect(ordenarPorRelacion(personas, vinculo).map((n) => n.id)).toEqual(['mejor_amiga', 'amiga_mas_fiable', 'amiga_mas', 'amiga_poca', 'conocida_avanzada', 'antipatica']);
  });

  it('quien aún no conoces va al final y a igualdad se ordena por nombre', () => {
    const { personas, vinculo } = gente(['Zoe', { nivel: 0, afinidad: 0, confianza: 0 }], ['Ana', { nivel: 0, afinidad: 0, confianza: 0 }], ['???', undefined], ['Pau', { nivel: -3, afinidad: -90, confianza: 0 }]);
    expect(ordenarPorRelacion(personas, vinculo).map((n) => n.id)).toEqual(['Ana', 'Zoe', 'Pau', '???']);
  });

  it('no cambia la lista original', () => {
    const { personas, vinculo } = gente(['b', { nivel: 0, afinidad: 1, confianza: 0 }], ['a', { nivel: 1, afinidad: 0, confianza: 0 }]);
    ordenarPorRelacion(personas, vinculo);
    expect(personas.map((n) => n.id)).toEqual(['b', 'a']);
  });
});

describe('orden de las acciones con una persona', () => {
  const a = (accion: string, duration: number, name = accion) => ({ id: `relaciones.${accion}.ana`, name, duration });
  it('de menos a más tiempo; con el mismo, hablar antes que lo demás', () => {
    const orden = ordenarAcciones([a('quedar', 120), a('detalle', 5), a('ayudar', 60), a('preguntar_edad', 2), a('charlar', 5), a('jugar', 5), a('preguntar_colegio', 2), a('discutir', 5), a('presentarse', 2)]);
    expect(orden.map((x) => x.id.split('.')[1])).toEqual(['preguntar_colegio', 'preguntar_edad', 'presentarse', 'charlar', 'jugar', 'detalle', 'discutir', 'ayudar', 'quedar']);
  });
  it('no cambia la lista original', () => {
    const xs = [a('quedar', 120), a('charlar', 5)];
    ordenarAcciones(xs);
    expect(xs.map((x) => x.duration)).toEqual([120, 5]);
  });
});
