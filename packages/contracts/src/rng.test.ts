import { describe, expect, it } from 'vitest';
import { prefijoEstable, prefijoEstableDesde, rngEstable, rngEstableDesde, rngEstableDesde1 } from './rng';

describe('rngEstable con el prefijo ya mezclado', () => {
  it('da exactamente los mismos números que mezclar todas las partes', () => {
    const lista = (r: { next(): number }) => [r.next(), r.next(), r.next()];
    expect(lista(rngEstableDesde(prefijoEstable('asiste', 7), 'nino_3', 'futbol', 12, 1))).toEqual(lista(rngEstable('asiste', 7, 'nino_3', 'futbol', 12, 1)));
    expect(lista(rngEstableDesde1(prefijoEstable('ejercicio', 'futbol', 'club', 4), 'rondos'))).toEqual(lista(rngEstable('ejercicio', 'futbol', 'club', 4, 'rondos')));
    expect(lista(rngEstableDesde1(prefijoEstableDesde(prefijoEstable('a'), 'b', 3), 9))).toEqual(lista(rngEstable('a', 'b', 3, 9)));
    expect(lista(rngEstableDesde(prefijoEstable(), 'x'))).toEqual(lista(rngEstable('x')));
  });
});
