import { describe, expect, it } from 'vitest';
import {
  CARA, DISTINTIVOS, empaquetarRostro, estiloDePersona, OJOS, PEINADOS, peinadoPosible, PELO_COLOR, PELO_TIPO, PIEL, RASGOS_DE_ROSTRO, VELLOS, velloPosible,
  type Apariencia, type CuerpoDePersona, type Rostro,
} from '@ds/contracts';
import { evolucionDe, etapasVividas, figuraDe, parametrosDe, retratoDe, retratoSvg } from './index';

const rostro = (v: Partial<Record<(typeof RASGOS_DE_ROSTRO)[number], number>> = {}): string => empaquetarRostro(Object.fromEntries(RASGOS_DE_ROSTRO.map((k) => [k, [v[k] ?? 0.5, 0.5]])) as unknown as Rostro);
const BASE: Apariencia = { peloColor: 'castano', peloTipo: 'ondulado', ojos: 'marron', piel: 'media', cara: 'ovalada', distintivos: [], canas: 34, calvicie: 0.6, barba: 0.8, rostro: rostro() };
const persona = (sexo: 'f' | 'm', a: Partial<Apariencia> = {}, c: Partial<CuerpoDePersona> = {}): CuerpoDePersona => ({
  id: 'p', sexo, nacimiento: 0, alturaAdulta: sexo === 'f' ? 163 : 176, madurez: 0, musculo: 30, grasa: 40, metabolismo: 0, musculatura: 0, historial: [], semilla: 77, ...c, apariencia: { ...BASE, ...a },
});
const EDADES = Array.from({ length: 93 }, (_, i) => i + 3);

describe('retrato: el dibujo es determinista y no se rompe', () => {
  it('la misma persona a la misma edad da el mismo SVG', () => {
    for (const s of ['f', 'm'] as const) for (const e of [3, 8, 15, 30, 70, 95]) expect(retratoSvg(persona(s), e)).toBe(retratoSvg(persona(s), e));
  });
  it('sale un SVG entero y sin números rotos a cualquier edad, también en los extremos', () => {
    const extremos: CuerpoDePersona[] = [
      persona('m', { calvicie: 1, canas: 20, barba: 1, rostro: rostro(Object.fromEntries(RASGOS_DE_ROSTRO.map((k) => [k, 1]))) }, { musculo: 100, grasa: 0, alturaAdulta: 210 }),
      persona('f', { calvicie: 0.4, canas: 60, barba: 0, rostro: rostro(Object.fromEntries(RASGOS_DE_ROSTRO.map((k) => [k, 0]))) }, { musculo: 0, grasa: 100, alturaAdulta: 140, madurez: -2 }),
    ];
    for (const c of extremos) for (const e of [0, 2, 3, 5, 9, 13, 17, 25, 40, 60, 80, 95, 120]) {
      const svg = retratoSvg(c, e) + figuraDe(c, e, 95);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it('por debajo de los 3 años sale la cuna, igual para todos', () => {
    expect(parametrosDe(persona('m'), 2).cuna).toBe(true);
    expect(parametrosDe(persona('m'), 3).cuna).toBe(false);
    expect(retratoSvg(persona('m'), 1)).toBe(retratoSvg(persona('f', { piel: 'oscura', peloColor: 'rubio' }, { semilla: 5 }), 2));
  });
  it('el retrato con memoria da lo mismo que sin ella, con el cuerpo del historial', () => {
    const c = persona('m', {}, { historial: [30, 20, 30, 80, 20] });
    expect(retratoDe(c, 31, 40)).toBe(retratoSvg(c, 31, { musculo: 80, grasa: 20 }));
    expect(retratoDe(c, 31, 40)).toBe(retratoDe(c, 31, 40));
  });
});

describe('retrato: los parámetros siguen a la edad', () => {
  it('crece hasta los 18 y la cabeza con él', () => {
    for (const s of ['f', 'm'] as const) for (let e = 3; e < 18; e++) {
      expect(parametrosDe(persona(s), e + 1).altura).toBeGreaterThan(parametrosDe(persona(s), e).altura);
      expect(parametrosDe(persona(s), e + 1).cabeza).toBeGreaterThanOrEqual(parametrosDe(persona(s), e).cabeza);
    }
  });
  it('las canas, la calvicie y las arrugas no retroceden', () => {
    for (const s of ['f', 'm'] as const) {
      const ps = EDADES.map((e) => parametrosDe(persona(s, { calvicie: s === 'f' ? 0.4 : 0.9 }), e));
      for (let i = 1; i < ps.length; i++) {
        expect(ps[i].peinado.canas).toBeGreaterThanOrEqual(ps[i - 1].peinado.canas);
        expect(ps[i].peinado.calvicie).toBeGreaterThanOrEqual(ps[i - 1].peinado.calvicie);
        expect(ps[i].arrugas).toBeGreaterThanOrEqual(ps[i - 1].arrugas);
      }
      expect(ps[0].peinado.canas).toBe(0);
      expect(ps[ps.length - 1].peinado.canas).toBe(1);
    }
  });
  it('el vello facial solo sale en los hombres y desde la pubertad', () => {
    const look = { vello: 'barba_larga' };
    for (const e of EDADES) expect(parametrosDe(persona('f'), e, { look }).vello.densidad).toBe(0);
    for (let e = 3; e <= 14; e++) { const v = parametrosDe(persona('m'), e, { look }).vello; expect(v.densidad).toBe(0); expect(v.largo).toBe(0); }
    expect(parametrosDe(persona('m'), 30, { look }).vello).toMatchObject({ estilo: 'barba_larga', largo: 30 });
    // Sin vello suficiente no hay barba, se pida lo que se pida.
    expect(parametrosDe(persona('m', { barba: 0.1 }), 30, { look }).vello.estilo).toBe('afeitado');
  });
  it('con la calvicie el peinado se adapta a lo que queda', () => {
    const c = persona('m', { calvicie: 1 });
    expect(parametrosDe(c, 20, { look: { peinado: 'flequillo' } }).peinado.estilo).toBe('flequillo');
    expect(parametrosDe(c, 70, { look: { peinado: 'flequillo' } }).peinado.estilo).toBe('rapado');
  });
  it('la evolución solo enseña las edades ya vividas', () => {
    expect(etapasVividas(7.6)).toEqual([3, 7]);
    expect(etapasVividas(48.2)).toEqual([3, 8, 12, 15, 18, 30, 48]);
    expect(evolucionDe(persona('m'), 7.6)).not.toContain('8 años');
  });
});

describe('retrato: cada dato se ve', () => {
  const distintos = (svgs: string[]) => expect(new Set(svgs).size).toBe(svgs.length);
  it('cada valor de cada catálogo de la apariencia da un dibujo distinto', () => {
    for (const s of ['f', 'm'] as const) {
      distintos(PIEL.map((v) => retratoSvg(persona(s, { piel: v }), 30)));
      distintos(PELO_COLOR.map((v) => retratoSvg(persona(s, { peloColor: v }), 30)));
      distintos(PELO_TIPO.map((v) => retratoSvg(persona(s, { peloTipo: v }), 30)));
      distintos(OJOS.map((v) => retratoSvg(persona(s, { ojos: v }), 30)));
      distintos(CARA.map((v) => retratoSvg(persona(s, { cara: v }), 30)));
      distintos([[], ...DISTINTIVOS.map((v) => [v])].map((v) => retratoSvg(persona(s, { distintivos: v }), 30)));
    }
  });
  it('los extremos de cada rasgo de la cara dan dibujos distintos (y distintos del medio)', () => {
    for (const k of RASGOS_DE_ROSTRO) for (const e of [8, 30, 75]) distintos([0, 0.5, 1].map((v) => retratoSvg(persona('f', { rostro: rostro({ [k]: v }) }), e)));
  });
  it('cada peinado y cada vello facial del catálogo se dibuja distinto, y el largo se nota', () => {
    for (const t of PELO_TIPO) distintos(PEINADOS.map((p) => retratoSvg(persona('f', { peloTipo: t, calvicie: 0 }), 30, { look: { peinado: p.id } })));
    distintos(VELLOS.map((v) => retratoSvg(persona('m', { barba: 1 }), 30, { look: { vello: v.id } })));
    distintos([4, 8, 14, 30, 50].map((l) => retratoSvg(persona('m', { calvicie: 0 }), 30, { look: { peinado: 'corto', largoDelPelo: l } })));
    distintos([0, 1, 4, 12, 40].map((l) => retratoSvg(persona('m', { barba: 1 }), 30, { look: { vello: 'afeitado', largoDelVello: l } })));
  });
  it('la complexión y la altura cambian la figura', () => {
    distintos([[18, 20], [30, 40], [85, 30], [25, 80]].map(([m, g]) => figuraDe(persona('m', {}, { musculo: m, grasa: g }), 30, 30)));
    distintos([150, 176, 200].map((h) => figuraDe(persona('m', {}, { alturaAdulta: h }), 30, 30)));
  });
});

describe('look: el estilo elegido de cada persona (contracts)', () => {
  it('es estable y solo elige lo que su genética permite', () => {
    const cuenta: Record<string, number> = {};
    for (let semilla = 1; semilla <= 600; semilla++) {
      const barba = (semilla % 11) / 10;
      const l = estiloDePersona(semilla, 'm', { peloTipo: 'liso', barba });
      expect(l).toEqual(estiloDePersona(semilla, 'm', { peloTipo: 'liso', barba }));
      expect(velloPosible(l.vello, barba)).toBe(true);
      expect(PEINADOS.some((p) => p.id === l.peinado && p.largo === l.largoDelPelo)).toBe(true);
      cuenta[l.vello] = (cuenta[l.vello] ?? 0) + 1;
      expect(estiloDePersona(semilla, 'f', { peloTipo: 'liso', barba }).vello).toBe('afeitado');
    }
    // La mayoría va afeitada, y hay de todo.
    expect(cuenta.afeitado).toBeGreaterThan(300);
    for (const v of VELLOS) expect(cuenta[v.id] ?? 0).toBeGreaterThan(0);
  });
  it('el peinado posible con calvicie acaba en uno que siempre se puede llevar', () => {
    for (const p of PEINADOS) { expect(peinadoPosible(p.id, 0)).toBe(p.id); expect(peinadoPosible(p.id, 1)).toBe('rapado'); }
  });
});
