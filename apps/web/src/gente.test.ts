import { describe, expect, it } from 'vitest';
import { ordenarPorRelacion } from './gente';

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
