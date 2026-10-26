import { describe, expect, it } from 'vitest';
import type { RasgosDe } from '@ds/contracts';
import { DISPOSICION, HABILIDAD, usoDelAspecto, HABILIDADES_DE_ACCION, disposicion, factorDeHabilidad, interesFavorito, mejorInteresEnComun, perdidaPorDiscusion, probabilidadDePaces } from './acciones';

const rasgos = (caracter: Record<string, number> = {}, intereses: Record<string, number> = {}): RasgosDe =>
  ({ origen: {} as RasgosDe['origen'], apariencia: {} as RasgosDe['apariencia'], caracter, intereses, gustos: {} as RasgosDe['gustos'] });

describe('acciones de relación (reglas puras)', () => {
  it('discutir duele más con un carácter agresivo y más con quien manda', () => {
    expect(perdidaPorDiscusion(rasgos({ agresividad: -50 }), 'companero')).toBeCloseTo(6, 6);
    expect(perdidaPorDiscusion(rasgos({ agresividad: 0 }), 'companero')).toBeCloseTo(10, 6);
    expect(perdidaPorDiscusion(rasgos({ agresividad: 50 }), 'companero')).toBeCloseTo(14, 6);
    expect(perdidaPorDiscusion(rasgos({ agresividad: 0 }), 'entrenador')).toBeCloseTo(15, 6);
    expect(perdidaPorDiscusion(undefined, 'amigo')).toBeCloseTo(10, 6);
  });

  it('las paces son más probables con alguien sociable, optimista y honesto, y menos cuanto más enconado esté el vínculo', () => {
    const amable = rasgos({ sociabilidad: 40, optimismo: 40, honestidad: 40 });
    const seco = rasgos({ sociabilidad: -40, optimismo: -40, honestidad: -40 });
    expect(probabilidadDePaces(amable, -1, 0.4)).toBeGreaterThan(probabilidadDePaces(seco, -1, 0.4));
    expect(probabilidadDePaces(amable, -1, 0.4)).toBeGreaterThan(probabilidadDePaces(amable, -2, 0.4));
    expect(probabilidadDePaces(amable, -2, 0.4)).toBeGreaterThan(probabilidadDePaces(amable, -3, 0.4));
    expect(probabilidadDePaces(amable, -1, 0.8)).toBeGreaterThan(probabilidadDePaces(amable, -1, 0.1));
  });

  it('la probabilidad de las paces siempre está entre 0,08 y 0,85', () => {
    for (const n of [-3, -2, -1]) {
      for (const c of [0, 0.5, 1]) {
        const alto = probabilidadDePaces(rasgos({ sociabilidad: 50, optimismo: 50, honestidad: 50 }), n, c);
        const bajo = probabilidadDePaces(rasgos({ sociabilidad: -50, optimismo: -50, honestidad: -50 }), n, c);
        expect(alto).toBeLessThanOrEqual(0.85);
        expect(bajo).toBeGreaterThanOrEqual(0.08);
      }
    }
  });

  it('el interés en común es el que más le gusta a la otra persona entre los que ya tiene el personaje', () => {
    const r = rasgos({}, { deporte: 3, cine: 2, cocina: 1 });
    expect(mejorInteresEnComun(r, {})).toBeUndefined();
    expect(mejorInteresEnComun(r, { cine: 10 })).toBeUndefined(); // por debajo de 15 no cuenta
    expect(mejorInteresEnComun(r, { cine: 40, cocina: 90 })?.id).toBe('cine'); // intensidad 2 × 0,9 frente a 1 × 1,4
    expect(mejorInteresEnComun(r, { cine: 20, deporte: 50 })?.id).toBe('deporte');
  });

  it('el interés favorito es el de mayor intensidad', () => {
    expect(interesFavorito(rasgos({}, { deporte: 1, cine: 3, cocina: 2 }))?.id).toBe('cine');
    expect(interesFavorito(rasgos())).toBeUndefined();
  });

  describe('hablar con la gente: habilidad y disposición', () => {
    it('los pesos de las habilidades de cada acción suman 1', () => {
      for (const [accion, pesos] of Object.entries(HABILIDADES_DE_ACCION)) expect(pesos.reduce((s, h) => s + h.peso, 0), accion).toBeCloseTo(1, 6);
    });

    it('con la habilidad típica de su edad el factor es ×1; más habilidad sube y menos baja, con tope en ×0,8 y ×1,3', () => {
      expect(factorDeHabilidad(HABILIDAD.tipico)).toBeCloseTo(1, 6);
      expect(factorDeHabilidad(0.5)).toBeCloseTo(1.06, 6);
      expect(factorDeHabilidad(0.3)).toBeCloseTo(0.94, 6);
      expect(factorDeHabilidad(1)).toBe(HABILIDAD.max);
      expect(factorDeHabilidad(0)).toBe(HABILIDAD.min);
    });

    it('la habilidad (empatía y comunicación) ayuda a hacer las paces', () => {
      const r = rasgos({ sociabilidad: 0 });
      expect(probabilidadDePaces(r, -1, 0.4, 0.8)).toBeGreaterThan(probabilidadDePaces(r, -1, 0.4, 0.4));
      expect(probabilidadDePaces(r, -1, 0.4, 0.4)).toBeGreaterThan(probabilidadDePaces(r, -1, 0.4, 0.1));
      expect(probabilidadDePaces(r, -1, 0.4)).toBe(probabilidadDePaces(r, -1, 0.4, HABILIDAD.tipico));
    });

    const perfil = { apariencia: { peloColor: 'negro', peloTipo: 'liso', ojos: 'marron', piel: 'clara', cara: 'ovalada', distintivos: [] }, caracter: { sociabilidad: 30, optimismo: 20 } } as never;
    const con = (caracter: Record<string, number>, gustosDeCaracter: Record<string, number> = {}, fisicos: Record<string, string[]> = {}) =>
      ({ ...rasgos(caracter), gustos: { fisicos: { peloColor: [], ojos: [], piel: [], cara: [], ...fisicos }, caracter: gustosDeCaracter } }) as RasgosDe;

    it('una persona normal tiene disposición ×1; los sociables hablan más y los solitarios menos', () => {
      const neutra = disposicion(con({}), perfil);
      expect(neutra.factor).toBeCloseTo(1, 6); // sin preferencias de carácter, la primera impresión no pesa
      const sociable = disposicion(con({ sociabilidad: 50 }), perfil);
      const solitario = disposicion(con({ sociabilidad: -50 }), perfil);
      expect(sociable.factor).toBeGreaterThan(neutra.factor + 0.15);
      expect(solitario.factor).toBeLessThan(neutra.factor - 0.15);
      expect(sociable.motivo).toBe('Le encanta hablar');
      expect(solitario.motivo).toBe('Es de pocas palabras');
    });

    it('la primera impresión depende de los gustos de carácter: le gustan los sociables y optimistas, te recibe mejor', () => {
      const gusta = disposicion(con({}, { sociabilidad: 30, optimismo: 20 }), perfil);
      const noGusta = disposicion(con({}, { sociabilidad: -50, optimismo: -50 }), perfil);
      expect(gusta.factor).toBeGreaterThan(noGusta.factor);
      expect(gusta.motivo).toBe('Congeniáis de primeras');
      expect(noGusta.motivo).toBe('No congeniáis de primeras');
    });

    const coincide = con({}, {}, { peloColor: ['negro'], ojos: ['marron'], piel: ['clara'], cara: ['ovalada'] });
    const noCoincide = con({}, {}, { peloColor: ['rubio'], ojos: ['azul'], piel: ['oscura'], cara: ['redonda'] });

    it('si el aspecto no cuenta (p. ej. con un adulto), los gustos físicos no cambian nada', () => {
      expect(disposicion(coincide, perfil).factor).toBe(disposicion(noCoincide, perfil).factor);
      expect(disposicion(coincide, perfil, { cuenta: false, seAnuncia: false }).factor).toBe(disposicion(noCoincide, perfil, { cuenta: false, seAnuncia: false }).factor);
    });

    it('el aspecto cuenta aunque no se anuncie: cambia el factor pero la frase no lo menciona', () => {
      const uso = { cuenta: true, seAnuncia: false };
      const a = disposicion(coincide, perfil, uso);
      const b = disposicion(noCoincide, perfil, uso);
      expect(a.factor).toBeGreaterThan(b.factor);
      // Antes de los 14 la frase sale solo del carácter: es la misma que sin aspecto.
      expect(a.motivo).toBe(disposicion(coincide, perfil).motivo);
      expect(b.motivo).toBe(disposicion(noCoincide, perfil).motivo);
    });

    it('a partir de los 14 se anuncia: la frase ya refleja la primera impresión completa', () => {
      const uso = { cuenta: true, seAnuncia: true };
      expect(disposicion(coincide, perfil, uso).motivo).toBe('Congeniáis de primeras');
      expect(disposicion(noCoincide, perfil, uso).motivo).toBe('No congeniáis de primeras');
    });

    it('cuándo cuenta y cuándo se anuncia el aspecto: entre iguales cuenta siempre, se anuncia desde los 14, y nunca con un adulto', () => {
      expect(usoDelAspecto(8, 9)).toEqual({ cuenta: true, seAnuncia: false });
      expect(usoDelAspecto(13, 15)).toEqual({ cuenta: true, seAnuncia: false }); // basta que una tenga menos de 14
      expect(usoDelAspecto(14, 14)).toEqual({ cuenta: true, seAnuncia: true });
      expect(usoDelAspecto(16, 19)).toEqual({ cuenta: true, seAnuncia: true });
      expect(usoDelAspecto(10, undefined)).toEqual({ cuenta: false, seAnuncia: false }); // sin edad = adulto (profesorado)
      expect(usoDelAspecto(10, 40)).toEqual({ cuenta: false, seAnuncia: false }); // un adulto con un menor, nunca
      expect(usoDelAspecto(17, 22)).toEqual({ cuenta: false, seAnuncia: false });
    });

    it('la disposición siempre queda entre ×0,75 y ×1,3, y sin rasgos no cambia nada', () => {
      for (const s of [-50, 50]) for (const o of [-50, 50]) {
        const f = disposicion(con({ sociabilidad: s, optimismo: o }, { sociabilidad: 30, optimismo: 20 }, { peloColor: ['negro'], ojos: ['marron'], piel: ['clara'], cara: ['ovalada'] }), perfil, { cuenta: true, seAnuncia: true }).factor;
        expect(f).toBeGreaterThanOrEqual(DISPOSICION.min);
        expect(f).toBeLessThanOrEqual(DISPOSICION.max);
      }
      expect(disposicion(undefined, perfil)).toEqual({ factor: 1 });
    });
  });
});
