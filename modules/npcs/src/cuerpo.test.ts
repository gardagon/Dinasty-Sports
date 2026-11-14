import { describe, expect, it } from 'vitest';
import { ID_DEL_PERSONAJE, objetivoDeCuerpo, PAIS_CIUDAD_DE_PRUEBA, SERVICES, alturaEn, complexion, cuerpoDePersona, fotosDelHistorial, registrarPais, type CuerpoService, type FamilyService } from '@ds/contracts';
import { Game, advanceToWeek } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { familia } from '@ds/mod-familia';
import { lugares } from '@ds/mod-lugares';
import { atletismo } from '@ds/mod-atletismo';
import { RECREO, geneticaDelCuerpo, actividadDeAdulto, actividadTrasElCumple, conCuerpo, habitosDeNpc, semanaDelCuerpo } from './cuerpo';
import { npcs, type Npc, type NpcsState } from './index';

registrarPais(PAIS_CIUDAD_DE_PRUEBA);

const persona = (id: string, edad: number, extra: Partial<Npc> = {}): Npc =>
  ({ id, name: id, role: 'vecino', gender: 'm', tags: [], levels: {}, potential: {}, nacimiento: -Math.round(edad * 365), ...extra }) as Npc;

describe('cuerpo de los PNJ', () => {
  it('quien tiene fecha de nacimiento recibe su cuerpo (estable, con la misma regla de hábitos) y quien no, no', () => {
    const lista = [persona('a', 10), persona('b', 40), persona('c', 30, { nacimiento: undefined })];
    const con = conCuerpo(lista, 0, 7);
    expect(con[0].cuerpo).toBeDefined();
    expect(con[1].actividad).toBeDefined();
    expect(con[2].cuerpo).toBeUndefined();
    expect(conCuerpo(lista, 0, 7)[0].cuerpo).toEqual(con[0].cuerpo);
    // sin nadie que lo necesite devuelve la misma lista (las cachés dependen de ello)
    expect(conCuerpo(con, 0, 7)).toBe(con);
  });

  it('los hábitos: base por edad más las sesiones del club, que también son fuerza', () => {
    const nino = persona('n', 10);
    const sin = habitosDeNpc(nino, 10, 7);
    const con = habitosDeNpc(nino, 10, 7, 2);
    expect(con.activo - sin.activo).toBe(180);
    expect(con.fuerza - sin.fuerza).toBe(60);
    const adulto = persona('x', 35, { actividad: [300, 100] });
    expect(habitosDeNpc(adulto, 35, 7)).toEqual({ activo: 300, fuerza: 100 });
  });

  it('la actividad de un adulto sale de su semilla y cambia poco en cada cumpleaños', () => {
    const p = persona('adulto', 35);
    expect(actividadDeAdulto(p, 3)).toEqual(actividadDeAdulto(p, 3));
    let a = actividadDeAdulto(p, 3);
    let salto = 0;
    for (let edad = 36; edad < 76; edad++) {
      const b = actividadTrasElCumple(a, p, 3, edad);
      expect(b[0]).toBeGreaterThanOrEqual(0);
      expect(b[1]).toBeLessThanOrEqual(b[0]);
      if (Math.abs(b[0] - a[0]) > 120) salto++;
      a = b;
    }
    expect(salto).toBeLessThan(8);
  });

  it('el cuerpo avanza cada semana hacia su objetivo, con los hábitos de cada uno', () => {
    const lista = conCuerpo([persona('vago', 40, { actividad: [0, 0] }), persona('atleta', 40, { actividad: [900, 500] })], 0, 1);
    lista[0].cuerpo = [20, 50];
    lista[1].cuerpo = [20, 50];
    for (let w = 1; w <= 60; w++) semanaDelCuerpo(lista, w * 7, new Map(), 1);
    expect(complexion(...lista[0].cuerpo!)).toBe('con_sobrepeso');
    expect(['atletico', 'musculado']).toContain(complexion(...lista[1].cuerpo!));
  });

  it('un niño no se pone musculado aunque haga mucho deporte', () => {
    const lista = conCuerpo([persona('nino', 9)], 0, 1);
    for (let w = 1; w <= 80; w++) semanaDelCuerpo(lista, w * 7, new Map([['nino', 12]]), 1);
    expect(complexion(...lista[0].cuerpo!)).not.toBe('musculado');
  });

  it('en cada cumpleaños guarda una foto en enteros, una por año', () => {
    const lista = conCuerpo([persona('a', 10.5)], 0, 1);
    for (let w = 1; w <= 52 * 3; w++) semanaDelCuerpo(lista, w * 7, new Map(), 1);
    const hc = lista[0].hc!;
    expect(hc[0]).toBe(11);
    expect(fotosDelHistorial(hc)).toBe(3);
    expect(hc.every(Number.isInteger)).toBe(true);
  });

  it('en una partida, todos los que tienen fecha de nacimiento tienen cuerpo y se mueve con las semanas', () => {
    const g = Game.create([personaje, npcs, lugares, atletismo], { seed: 9 });
    const lista = () => g.moduleState<NpcsState>('npcs').npcs;
    expect(lista().filter((n) => n.nacimiento !== undefined && !n.cuerpo)).toHaveLength(0);
    const antes = new Map(lista().map((n) => [n.id, n.cuerpo!.join()]));
    advanceToWeek(g, 'gen.descansar', 8, 0, 12);
    const despues = lista();
    expect(despues.filter((n) => n.nacimiento !== undefined && !n.cuerpo)).toHaveLength(0);
    expect(despues.filter((n) => n.cuerpo && antes.get(n.id) !== n.cuerpo.join()).length).toBeGreaterThan(despues.length / 2);
  });

  it('el servicio de lectura da el cuerpo de cualquier persona igual: el personaje, el padre y la madre y los PNJ', () => {
    const g = Game.create([personaje, familia, npcs, lugares, atletismo], { seed: 9 });
    const ctx = { service: <T>(id: string) => g.service<T>(id) };
    const yo = cuerpoDePersona(ctx, ID_DEL_PERSONAJE)!;
    expect(yo.sexo).toBe('m');
    expect(yo.nacimiento).toBeLessThan(0);
    expect(typeof yo.apariencia.canas).toBe('number');
    const padres = g.service<FamilyService>(SERVICES.familia)!.parents();
    for (const p of padres) {
      const c = cuerpoDePersona(ctx, p.id)!;
      expect(c.sexo).toBe(p.gender);
      expect(c.alturaAdulta).toBeCloseTo(p.alturaCm, 0);
      expect(c.nacimiento).toBeLessThan(-35 * 365);
      expect(c.musculo).toBeGreaterThan(0);
      expect(Number.isFinite(c.metabolismo) && Number.isFinite(c.musculatura)).toBe(true);
      expect(alturaEn(c.alturaAdulta, p.edad, c.madurez)).toBeCloseTo(p.alturaCm, -1);
    }
    // todos los PNJ tienen todo lo que hace falta para dibujarlos y su semilla es estable
    const dir = g.service<CuerpoService>(SERVICES.cuerpoNpcs)!;
    const lista = g.moduleState<NpcsState>('npcs').npcs;
    expect(dir.ids()).toHaveLength(lista.length);
    for (const n of lista.slice(0, 200)) {
      const c = dir.de(n.id)!;
      expect(c.sexo).toBe(n.gender);
      expect([c.apariencia.canas, c.apariencia.calvicie, c.apariencia.barba].every(Number.isFinite)).toBe(true);
      expect(c.semilla).toBe(dir.de(n.id)!.semilla);
    }
    expect(new Set(lista.map((n) => dir.de(n.id)!.semilla)).size).toBeGreaterThan(lista.length * 0.99);
    expect(cuerpoDePersona(ctx, 'nadie')).toBeUndefined();
  });

  it('la genética del cuerpo: heredada en los padres y hermanos, estable por id en el resto, y mueve el cuerpo', () => {
    const g = Game.create([personaje, familia, npcs, lugares, atletismo], { seed: 9 });
    const lista = g.moduleState<NpcsState>('npcs').npcs;
    expect(lista.filter((n) => n.tags.includes('progenitor') || n.tags.includes('hermano')).every((n) => n.metabolismo !== undefined && n.musculatura !== undefined)).toBe(true);
    const otro = lista.find((n) => n.metabolismo === undefined)!;
    expect(geneticaDelCuerpo(otro)).toEqual(geneticaDelCuerpo({ ...otro }));
    const igual = persona('x', 30, { actividad: [200, 0] });
    const gordo = conCuerpo([{ ...igual, metabolismo: 2.5 }], 0, 1)[0];
    const flaco = conCuerpo([{ ...igual, metabolismo: -2.5 }], 0, 1)[0];
    for (let w = 1; w <= 120; w++) { semanaDelCuerpo([gordo], w * 7, new Map(), 1); semanaDelCuerpo([flaco], w * 7, new Map(), 1); }
    expect(gordo.cuerpo![1]).toBeGreaterThan(flaco.cuerpo![1] + 10);
  });

  describe('el colegio: recreo y Educación física', () => {
    const escolar = (diasDeClase: number, efPorCurso = [150, 150, 150]) => ({ diasDeClase, efPorCurso, edadDeCurso: (n: Npc) => Math.floor(-n.nacimiento! / 365) });
    const nino = persona('n1', 8);

    it('sin clase (vacaciones) o sin colegio no hay recreo ni Educación física', () => {
      const base = habitosDeNpc(nino, 8, 7);
      expect(habitosDeNpc(nino, 8, 7, 0, escolar(0), 5)).toEqual(base);
      expect(habitosDeNpc(nino, 8, 7, 0, undefined, 5)).toEqual(base);
      // un adulto no tiene recreo ni Educación física
      const adulto = persona('a1', 40, { actividad: [200, 50] });
      expect(habitosDeNpc(adulto, 40, 7, 0, escolar(5), 5)).toEqual({ activo: 200, fuerza: 50 });
    });

    it('en una semana de clase suma la Educación física de su curso y los recreos que juega (30 min cada uno, como mucho uno al día)', () => {
      const base = habitosDeNpc(nino, 8, 7).activo;
      for (let semana = 0; semana < 30; semana++) {
        const extra = habitosDeNpc(nino, 8, 7, 0, escolar(5, [150]), semana).activo - base - 150;
        expect(extra % RECREO.minutos).toBe(0);
        expect(extra).toBeGreaterThanOrEqual(0);
        expect(extra).toBeLessThanOrEqual(5 * RECREO.minutos);
      }
      // una semana de 4 días lectivos tiene 4/5 de la Educación física
      expect(habitosDeNpc(nino, 8, 7, 0, escolar(4, [150]), 3).activo - base).toBeGreaterThanOrEqual(120);
      // un curso que no la tiene (0 minutos o fuera de la tabla) no suma
      expect(habitosDeNpc(nino, 8, 7, 0, escolar(5, [0]), 3).activo - base).toBeLessThanOrEqual(5 * RECREO.minutos);
    });

    it('juega en el recreo con una probabilidad estable de 40 a 90 %, más alta con más interés en el deporte', () => {
      const frac = (n: Npc) => {
        let jugados = 0;
        const total = 400;
        const base = habitosDeNpc(n, 8, 7).activo;
        for (let semana = 0; semana < total; semana++) jugados += (habitosDeNpc(n, 8, 7, 0, escolar(5, [0]), semana).activo - base) / RECREO.minutos;
        return jugados / (total * 5);
      };
      const sin = persona('s', 8, { rasgos: { intereses: {}, caracter: { sociabilidad: -50 } } as never });
      const con = persona('c', 8, { rasgos: { intereses: { deporte: 3 }, caracter: { sociabilidad: 50 } } as never });
      expect(frac(sin)).toBeGreaterThan(0.33);
      expect(frac(sin)).toBeLessThan(0.47);
      expect(frac(con)).toBeGreaterThan(0.83);
      expect(frac(con)).toBeLessThan(0.97);
      expect(habitosDeNpc(sin, 8, 7, 0, escolar(5, [0]), 11)).toEqual(habitosDeNpc(sin, 8, 7, 0, escolar(5, [0]), 11));
    });

    it('calibración: con recreos y Educación física un niño sale normal; sin nada más (ni recreo ni Educación física) tiende al sobrepeso', () => {
      const q = (sexo: 'f' | 'm') => ({ edad: 10, madurez: 0, sexo });
      const juega = { fuerza: 0, activo: 4 * RECREO.minutos + 150 };
      for (const sexo of ['f', 'm'] as const) expect(objetivoDeCuerpo(juega, q(sexo)).grasa).toBeLessThan(65);
      const nada = { fuerza: 0, activo: 0 };
      expect(objetivoDeCuerpo(nada, q('m')).grasa).toBeGreaterThan(65);
    });
  });
});
