import { describe, expect, it } from 'vitest';
import { RASGOS_DE_ROSTRO, rostroDe, ID_DEL_PERSONAJE, JORNADA_ESCOLAR, minutosDeEducacionFisica, objetivoDeCuerpo, PAIS_CIUDAD_DE_PRUEBA, SERVICES, alturaEn, complexion, cuerpoDePersona, fotosDelHistorial, registrarPais, type CuerpoService, type EducacionFisicaService, type FamilyService } from '@ds/contracts';
import { Game, advanceToWeek } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { estudios } from '@ds/mod-estudios';
import { asignaturasDelCurso, horarioSemanal } from '../../estudios/src/curriculo';
import { familia } from '@ds/mod-familia';
import { lugares } from '@ds/mod-lugares';
import { atletismo } from '@ds/mod-atletismo';
import { RECREO, geneticaDelCuerpo, actividadDeAdulto, actividadTrasElCumple, conCuerpo, habitosDeNpc, semanaDelCuerpo } from './cuerpo';
import { escolarDelPais, npcs, type Npc, type NpcsState } from './index';

registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/** Al crear: una fracción lectiva y los cursos del colegio (3.º de primaria a 2.º de bachillerato, con 150 min de Educación física por semana lectiva en todos menos el último). */
const LECTIVA = 0.7;
const DEL_COLEGIO = { efPorCurso: [150, 150, 150, 150, 150, 150, 150, 150, 150, 0], edadDeCurso: (n: Npc) => (n.nacimiento === undefined ? undefined : Math.floor(-n.nacimiento / 365)) };

const persona = (id: string, edad: number, extra: Partial<Npc> = {}): Npc =>
  ({ id, name: id, role: 'vecino', gender: 'm', tags: [], levels: {}, potential: {}, nacimiento: -Math.round(edad * 365), ...extra }) as Npc;

describe('cuerpo de los PNJ', () => {
  it('quien tiene fecha de nacimiento recibe su cuerpo (estable, con la misma regla de hábitos) y quien no, no', () => {
    const lista = [persona('a', 10), persona('b', 40), persona('c', 30, { nacimiento: undefined })];
    const con = conCuerpo(lista, 0, 7, LECTIVA, DEL_COLEGIO);
    expect(con[0].cuerpo).toBeDefined();
    expect(con[1].actividad).toBeDefined();
    expect(con[2].cuerpo).toBeUndefined();
    expect(conCuerpo(lista, 0, 7, LECTIVA, DEL_COLEGIO)[0].cuerpo).toEqual(con[0].cuerpo);
    // sin nadie que lo necesite devuelve la misma lista (las cachés dependen de ello)
    expect(conCuerpo(con, 0, 7, LECTIVA, DEL_COLEGIO)).toBe(con);
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
    const lista = conCuerpo([persona('vago', 40, { actividad: [0, 0] }), persona('atleta', 40, { actividad: [900, 500] })], 0, 1, LECTIVA, DEL_COLEGIO);
    lista[0].cuerpo = [20, 50];
    lista[1].cuerpo = [20, 50];
    for (let w = 1; w <= 60; w++) semanaDelCuerpo(lista, w * 7, new Map(), 1);
    expect(complexion(...lista[0].cuerpo!)).toBe('con_sobrepeso');
    expect(['atletico', 'musculado']).toContain(complexion(...lista[1].cuerpo!));
  });

  it('un niño no se pone musculado aunque haga mucho deporte', () => {
    const lista = conCuerpo([persona('nino', 9)], 0, 1, LECTIVA, DEL_COLEGIO);
    for (let w = 1; w <= 80; w++) semanaDelCuerpo(lista, w * 7, new Map([['nino', 12]]), 1);
    expect(complexion(...lista[0].cuerpo!)).not.toBe('musculado');
  });

  it('en cada cumpleaños guarda una foto en enteros, una por año', () => {
    const lista = conCuerpo([persona('a', 10.5)], 0, 1, LECTIVA, DEL_COLEGIO);
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
    const gordo = conCuerpo([{ ...igual, metabolismo: 2.5 }], 0, 1, LECTIVA, DEL_COLEGIO)[0];
    const flaco = conCuerpo([{ ...igual, metabolismo: -2.5 }], 0, 1, LECTIVA, DEL_COLEGIO)[0];
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
        const extra = habitosDeNpc(nino, 8, 7, 0, escolar(5, [150]), semana).activo - base - 75; // la mitad de la clase de Educación física está en movimiento
        expect(extra % RECREO.minutos).toBe(0);
        expect(extra).toBeGreaterThanOrEqual(0);
        expect(extra).toBeLessThanOrEqual(5 * RECREO.minutos);
      }
      // una semana de 4 días lectivos tiene 4/5 de la Educación física
      expect(habitosDeNpc(nino, 8, 7, 0, escolar(4, [150]), 3).activo - base).toBeGreaterThanOrEqual(60);
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

    it('calibración de los arquetipos de niño de 10 años (en equilibrio, de clase o de vacaciones)', () => {
      const q = (sexo: 'f' | 'm', metabolismo = 0) => ({ edad: 10, madurez: 0, sexo, metabolismo });
      const ef = 150 * 0.5; // media clase de Educación física
      const grasa = (activo: number, sexo: 'f' | 'm', z = 0) => objetivoDeCuerpo({ fuerza: 0, activo }, q(sexo, z)).grasa;
      for (const sexo of ['f', 'm'] as const) {
        // recreos (4 de 5) y Educación física: normal, también en vacaciones sin nada más no (eso es la media del año: ver el anexo)
        expect(grasa(4 * RECREO.minutos + ef, sexo)).toBeLessThan(65);
        // solo Educación física, metabolismo medio: sobrepeso en cuanto hay una semana sin clase; con metabolismo alto (z = −1,5), normal en semana de clase
        expect(grasa(0, sexo)).toBeGreaterThan(65);
        expect(grasa(ef, sexo, -1.5)).toBeLessThan(65);
        // sin nada más: sobrepeso
        expect(grasa(0, sexo)).toBeGreaterThan(65);
      }
      // los chicos y las chicas son iguales hasta la pubertad
      expect(grasa(0, 'f')).toBeCloseTo(grasa(0, 'm'), 9);
    });
  });

  it('Educación física tiene una sola fuente: para cada curso del país, el cuerpo al crear, el de cada semana, el servicio de estudios y su horario dan los mismos minutos', () => {
    const g = Game.create([personaje, familia, npcs, lugares, atletismo, estudios], { seed: 9 });
    const pais = g.pais;
    const servicio = g.service<EducacionFisicaService>(SERVICES.educacionFisica)!;
    const delCuerpo = escolarDelPais(pais, 0); // lo que usan la creación y la semana del cuerpo de los PNJ
    const [inicio, fin] = JORNADA_ESCOLAR.clases[0];
    expect(delCuerpo.efPorCurso).toHaveLength(pais.cursos.length);
    pais.cursos.forEach((_, c) => {
      const minutos = minutosDeEducacionFisica(pais, c);
      expect(servicio.minutosPorSemana(c), `curso ${c}: servicio`).toBe(minutos);
      expect(delCuerpo.efPorCurso[c], `curso ${c}: cuerpo`).toBe(minutos);
      // y es lo que dice el horario real de estudios (los días de la semana con clase de Educación física × lo que dura una clase)
      const dias = horarioSemanal(asignaturasDelCurso(c, 'ciencias', pais.cursos)).educacion_fisica ?? [];
      expect(dias.length * (fin - inicio), `curso ${c}: horario`).toBe(minutos);
    });
    // el último curso (2.º de bachillerato) no tiene Educación física; el primero sí; fuera de los cursos, nada
    expect(delCuerpo.efPorCurso.at(-1)).toBe(0);
    expect(delCuerpo.efPorCurso[0]).toBeGreaterThan(0);
    expect(servicio.minutosPorSemana(-1)).toBe(0);
    expect(servicio.minutosPorSemana(pais.cursos.length)).toBe(0);
    // el cuerpo al crear usa esos minutos: con Educación física un niño de 3.º de primaria sale con menos grasa que sin ella
    const nino = persona('n_ef', 8, { rasgos: { intereses: {}, caracter: {} } as never });
    const con = conCuerpo([nino], 0, 7, LECTIVA, { efPorCurso: delCuerpo.efPorCurso, edadDeCurso: () => 8 })[0].cuerpo![1];
    const sin = conCuerpo([nino], 0, 7, LECTIVA, { efPorCurso: delCuerpo.efPorCurso.map(() => 0), edadDeCurso: () => 8 })[0].cuerpo![1];
    expect(con).toBeLessThan(sin);
  });

  it('los rasgos de la cara se heredan: los hermanos y el personaje llevan en cada rasgo un valor de cada padre', () => {
    for (const seed of [9, 10, 11]) {
      const g = Game.create([personaje, familia, npcs, lugares, atletismo], { seed });
      const lista = g.moduleState<NpcsState>('npcs').npcs;
      const padre = lista.find((n) => n.id === 'padre')!.rasgos!.apariencia;
      const madre = lista.find((n) => n.id === 'madre')!.rasgos!.apariencia;
      expect(padre.rostro).toHaveLength(2 * RASGOS_DE_ROSTRO.length);
      const deLosPadres = (a: { rostro: string }) => {
        for (const k of RASGOS_DE_ROSTRO) {
          const [e, l] = rostroDe(a)[k];
          const p = rostroDe(padre)[k];
          const m = rostroDe(madre)[k];
          expect((p.includes(e) && m.includes(l)) || (m.includes(e) && p.includes(l)), `${k}`).toBe(true);
        }
      };
      const hermanos = lista.filter((n) => n.tags.includes('hermano'));
      for (const h of hermanos) deLosPadres(h.rasgos!.apariencia);
      // el personaje, igual
      deLosPadres((g.moduleState<{ perfil: { apariencia: { rostro: string } } }>('gen') as { perfil: { apariencia: { rostro: string } } }).perfil.apariencia);
      // y todo el mundo lleva su rostro
      expect(lista.every((n) => !n.rasgos || n.rasgos.apariencia.rostro.length === 2 * RASGOS_DE_ROSTRO.length)).toBe(true);
    }
  });
});
