import { describe, expect, it } from 'vitest';
import { bancoDeNotas, cumple } from './notas';

describe('banco de notas', () => {
  it('cada tipo de alumno saca la nota que le corresponde a su aptitud y su esfuerzo', () => {
    const fuera = bancoDeNotas({ semillas: [1, 2], dias: 365 })
      .map((r) => ({ ...r, ...cumple(r) }))
      .filter((r) => !r.ok)
      .map((r) => `${r.perfil} / ${r.rutina}: ${r.media.toFixed(2)} (objetivo ${r.objetivo!.join('–')})`);
    expect(fuera).toEqual([]);
  }, 120_000);
});
