import { describe, expect, it } from 'vitest';
import {
  AL_QUEDARSE_CALVO, CALVICIE, CARA, DISTINTIVOS, empaquetarRostro, envejecimientoAlAzar, envejecimientoHeredado, estiloDePersona, peinadoConCalvicie, rngEstable, OJOS, PEINADOS, peinadoPosible, PELO_COLOR, PELO_TIPO, PIEL, RASGOS_DE_ROSTRO, VELLOS, velloPosible,
  type Apariencia, type CuerpoDePersona, type Rostro,
} from '@ds/contracts';
import { medidasDeCara } from './cara';
import { dibujarCuerpo } from './cuerpo';
import { Lienzo } from './lienzo';
import { arrugasA, evolucionDe, etapasVividas, figuraDe, figurasSvg, parametrosDe, retratoDe, retratoSvg } from './index';

const rostro = (v: Partial<Record<(typeof RASGOS_DE_ROSTRO)[number], number>> = {}): string => empaquetarRostro(Object.fromEntries(RASGOS_DE_ROSTRO.map((k) => [k, [v[k] ?? 0.5, 0.5]])) as unknown as Rostro);
const BASE: Apariencia = { peloColor: 'castano', peloTipo: 'ondulado', ojos: 'marron', piel: 'media', cara: 'ovalada', distintivos: [], canas: 34, calvicie: 0.6, barba: 0.8, rostro: rostro(), envejecimiento: 0.5 };
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
  it('crece hasta los 18', () => {
    for (const s of ['f', 'm'] as const) for (let e = 3; e < 18; e++) expect(parametrosDe(persona(s), e + 1).altura).toBeGreaterThan(parametrosDe(persona(s), e).altura);
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
  it('las manos se ven siempre enteras: los brazos cuelgan por fuera del tronco en todas las complexiones, sexos y edades', () => {
    for (const s of ['f', 'm'] as const) for (const [m, g] of [[0, 0], [18, 20], [30, 40], [45, 35], [85, 30], [100, 60], [25, 80], [0, 100], [100, 100]]) for (const e of [3, 5, 8, 12, 15, 18, 30, 50, 70, 95]) for (const h of [145, 170, 205]) {
      const P = parametrosDe(persona(s, {}, { musculo: m, grasa: g, alturaAdulta: h }), e);
      const c = dibujarCuerpo(P, new Lienzo('t').enEscala(P.cabeza / 2), medidasDeCara(P));
      expect(c.holguraDeLasManos, `${s} ${e} años, músculo ${m}, grasa ${g}, ${h} cm`).toBeGreaterThan(0);
      expect(c.medioAncho).toBeGreaterThan(0);
    }
  });
  it('la complexión y la altura cambian la figura', () => {
    distintos([[18, 20], [30, 40], [85, 30], [25, 80]].map(([m, g]) => figuraDe(persona('m', {}, { musculo: m, grasa: g }), 30, 30)));
    distintos([150, 176, 200].map((h) => figuraDe(persona('m', {}, { alturaAdulta: h }), 30, 30)));
  });
});

describe('retrato: niños, grados al cero, entradas, tinte y comparación', () => {
  it('la cabeza de un niño de 3 años ocupa cerca de una cuarta parte de su altura y baja hasta la proporción adulta', () => {
    for (const s of ['f', 'm'] as const) {
      const razon = (e: number) => { const P = parametrosDe(persona(s), e); return P.cabeza / P.altura; };
      expect(razon(3)).toBeGreaterThan(0.225);
      expect(razon(3)).toBeLessThan(0.27);
      expect(razon(30)).toBeLessThan(0.155);
      for (let e = 3; e < 18; e++) expect(razon(e + 1)).toBeLessThanOrEqual(razon(e));
      expect(parametrosDe(persona(s), 3).nino).toBe(1);
      expect(parametrosDe(persona(s), 16).nino).toBe(0);
    }
  });
  it('los tres grados al cero: afeitada sin pelo en ningún sitio, la sombra respeta la calvicie y el rapado tiene contorno', () => {
    const pelo = '#262021';
    const con = (peinado: string, calvicie: number) => retratoSvg(persona('m', { peloColor: 'negro', calvicie, canas: 90, barba: 0 }), 60, { look: { peinado, vello: 'afeitado' } });
    for (const c of [0, 0.5, 1]) expect(con('afeitada', c)).not.toContain(pelo);
    expect(con('al_cero', 0)).toContain(pelo);
    expect(con('al_cero', 0)).not.toBe(con('al_cero', 1));
    expect(new Set([con('afeitada', 0), con('al_cero', 0), con('rapado', 0)]).size).toBe(3);
  });
  it('la calvicie de los hombres empieza por las entradas: con poca tendencia el dibujo cambia pero el peinado se mantiene', () => {
    const c = persona('m', { calvicie: 0.3 });
    const look = { peinado: 'corto', vello: 'afeitado' };
    expect(parametrosDe(c, 80, { look }).peinado.estilo).toBe('corto');
    expect(parametrosDe(c, 80, { look }).peinado.calvicie).toBeLessThanOrEqual(0.3);
    expect(retratoSvg(persona('m', { calvicie: 0.3, canas: 99 }), 80, { look })).not.toBe(retratoSvg(persona('m', { calvicie: 0, canas: 99 }), 80, { look }));
  });
  it('el tinte: el pelo se ve del color teñido, con raíces del natural al crecer, y desaparece cuando ha crecido todo', () => {
    const c = persona('f', { peloColor: 'castano', calvicie: 0, canas: 90 });
    const tinte = '#3b6fb5', natural = '#6f4a31';
    const con = (cm: number) => retratoSvg(c, 30, { look: { peinado: 'melena', tinteDelPelo: tinte, crecidoDesdeElTinte: cm } });
    expect(con(0)).toContain(tinte);
    expect(con(0)).not.toContain(natural);
    expect(con(3)).toContain(tinte);
    expect(con(3)).toContain(`stroke="${natural}"`);
    // El paso es gradual: varias capas, de más tenue a opaca.
    expect([...con(3).matchAll(new RegExp(`stroke="${natural}"`, 'g'))].length).toBeGreaterThanOrEqual(4);
    expect(con(24)).toBe(retratoSvg(c, 30, { look: { peinado: 'melena' } }));
    // Las raíces van junto al cuero cabelludo en todos los peinados y tipos de pelo: la línea desde la que se miden está en lo alto de la cabeza (por encima de los ojos).
    for (const tipo of PELO_TIPO) for (const p of PEINADOS.filter((x) => x.largo > 3)) {
      const svg = retratoSvg(persona('f', { peloColor: 'castano', peloTipo: tipo, calvicie: 0, canas: 90 }), 30, { look: { peinado: p.id, tinteDelPelo: tinte, crecidoDesdeElTinte: 2 } });
      const raices = [...svg.matchAll(new RegExp(`<path d="([^"]+)" fill="none" stroke="${natural}"`, 'g'))];
      expect(raices.length).toBeGreaterThan(0);
      // (Las capas de la raíz son trazados absolutos; los mechones sueltos, relativos.)
      for (const r of raices.filter((x) => !/[a-z]/.test(x[1]))) for (const par of r[1].matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) expect(Number(par[2])).toBeLessThan(-0.3);
    }
    // La barba, por separado.
    const h = persona('m', { peloColor: 'castano', canas: 90, barba: 1 });
    const barba = (mm: number) => parametrosDe(h, 30, { look: { vello: 'barba_corta', tinteDelVello: '#101010', crecidoDelVelloDesdeElTinte: mm } }).vello.color;
    expect(barba(0)).toBe('#101010');
    expect(barba(6)).toBe(parametrosDe(h, 30, { look: { vello: 'barba_corta' } }).vello.color);
    expect(parametrosDe(h, 30, { look: { vello: 'barba_corta', tinteDelVello: '#101010' } }).pelo).toBe(natural);
  });
  it('la comparación: dos figuras a escala; sin cifras no hay centímetros de quien no se deben dar', () => {
    const yo = persona('m', {}, { semilla: 1 }), otra = persona('f', {}, { semilla: 2, alturaAdulta: 171 });
    const svg = figurasSvg([{ cuerpo: yo, edad: 8, rotulo: 'Tú', cifras: true }, { cuerpo: otra, edad: 40, rotulo: 'Ella', cifras: false }], { cifras: false });
    expect(svg).toContain(`${Math.round(parametrosDe(yo, 8).altura)} cm`);
    expect(svg).not.toContain('171 cm');
    expect(svg).not.toContain('>150<');
  });
});

describe('retrato: envejecimiento de la piel y quien se queda calvo', () => {
  it('las arrugas llegan antes y se marcan más cuanto peor envejece la piel; con 0,5, como siempre', () => {
    for (const e of [20, 30, 40, 50, 60, 70, 90]) {
      expect(arrugasA(e, 0.5)).toBeCloseTo(Math.min(1, Math.max(0, (e - 26) / 44)) ** 0.85, 10);
      expect(arrugasA(e, 0)).toBeLessThanOrEqual(arrugasA(e, 0.5));
      expect(arrugasA(e, 1)).toBeGreaterThanOrEqual(arrugasA(e, 0.5));
    }
    for (const v of [0, 0.25, 0.5, 0.75, 1]) for (let e = 3; e < 95; e++) expect(arrugasA(e + 1, v)).toBeGreaterThanOrEqual(arrugasA(e, v));
    expect(arrugasA(30, 0)).toBe(0);
    expect(arrugasA(30, 1)).toBeGreaterThan(0.2);
    expect(arrugasA(95, 0)).toBeLessThanOrEqual(0.7);
    expect(arrugasA(60, 1)).toBe(1);
    // Y se ve en el dibujo.
    const con = (v: number) => retratoSvg(persona('f', { envejecimiento: v }), 50);
    expect(new Set([con(0), con(0.5), con(1)]).size).toBe(3);
    // Las partidas sin el dato se dibujan como 0,5.
    expect(parametrosDe(persona('f', { envejecimiento: undefined as never }), 50).arrugas).toBe(parametrosDe(persona('f'), 50).arrugas);
  });
  it('el envejecimiento se sortea entre 0 y 1 alrededor de 0,5 y los hijos sacan la media de sus padres con un pequeño cambio', () => {
    const rng = rngEstable('test', 'envejecimiento');
    const vs = Array.from({ length: 4000 }, () => envejecimientoAlAzar(rng));
    expect(Math.min(...vs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...vs)).toBeLessThanOrEqual(1);
    expect(vs.reduce((a, b) => a + b, 0) / vs.length).toBeCloseTo(0.5, 1);
    for (let i = 0; i < 500; i++) { const h = envejecimientoHeredado({ envejecimiento: 0.2 }, { envejecimiento: 0.8 }, rng); expect(h).toBeGreaterThanOrEqual(0.4); expect(h).toBeLessThanOrEqual(0.6); }
  });
  it('parte de los hombres se afeita la cabeza o se rapa al cero al pasar de las entradas, y lo mantiene', () => {
    let afeitada = 0, alCero = 0;
    const N = 2000;
    for (let semilla = 1; semilla <= N; semilla++) {
      expect(peinadoConCalvicie(semilla, 'm', 'corto', CALVICIE.entradas)).toBe('corto');
      expect(peinadoConCalvicie(semilla, 'f', 'melena', 0.4)).toBe('melena');
      const a = peinadoConCalvicie(semilla, 'm', 'corto', 0.4), b = peinadoConCalvicie(semilla, 'm', 'corto', 0.9);
      if (a === 'afeitada') afeitada++;
      if (a === 'al_cero') alCero++;
      if (a !== 'corto') expect(b).toBe(a);
    }
    expect(afeitada / N).toBeCloseTo(AL_QUEDARSE_CALVO.afeitada, 1);
    expect(alCero / N).toBeCloseTo(AL_QUEDARSE_CALVO.alCero, 1);
    // En el dibujo: sin look pedido puede cambiar; con look pedido (el personaje), no.
    const calvo = Array.from({ length: 40 }, (_, i) => persona('m', { calvicie: 1 }, { semilla: 900 + i }));
    expect(calvo.some((c) => ['afeitada', 'al_cero'].includes(parametrosDe(c, 60).peinado.estilo))).toBe(true);
    for (const c of calvo) expect(parametrosDe(c, 60, { look: { peinado: 'corto' } }).peinado.estilo).toBe('rapado');
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
    for (const p of PEINADOS) { expect(peinadoPosible(p.id, 0)).toBe(p.id); expect(PEINADOS.find((x) => x.id === peinadoPosible(p.id, 1))!.calvicieMaxima).toBe(1); }
    expect(peinadoPosible('flequillo', 1)).toBe('rapado');
    expect(peinadoPosible('afeitada', 1)).toBe('afeitada');
  });
});
