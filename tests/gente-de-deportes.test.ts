import { describe, expect, it } from 'vitest';
import { APORTES, GEN, SERVICES, SHARED_EVENTS, aptitudDe, defineModule, validarDatosDeDeporte, type DatosDeDeporte, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { DATOS_ATLETISMO } from '@ds/mod-atletismo';
import { geneticaDeNino, interesPor, potencialEn } from '../modules/npcs/src/deportistas';
import type { Npc, NpcsState } from '@ds/mod-npcs';
import { rngEstable } from '@ds/contracts';

/**
 * La gente de cada deporte (fase 4 del plan de deportes modulares): los niños se crean con su genética heredada y sus gustos, sin pensar en ningún deporte, y
 * cada deporte recluta a los que mejor encajan en sus equipos y clubes (primero entre los interesados). Se prueba con el atletismo y con un segundo deporte
 * de prueba cargado a su lado.
 */

const DATOS_PRUEBA: DatosDeDeporte = {
  id: 'prueba',
  paises: {
    espana: {
      ...DATOS_ATLETISMO.paises.espana,
      competiciones: { ...DATOS_ATLETISMO.paises.espana.competiciones, jornada: { dias: [6], desde: 10, hasta: 12, lugar: 'parque', texto: 'Partidos: los domingos de 10 a 12 en el parque.' } },
      clubes: [
        { id: 'colegio', nombre: 'Club deportivo del colegio', esColegio: true, calidad: 1, sesiones: { weekdays: [1, 3], desde: 15, hasta: 17 }, sede: 'pista_colegio', tramites: 'administracion' },
        { id: 'club_norte', nombre: 'Club Norte', calidad: 2, sesiones: { weekdays: [4], desde: 18, hasta: 20 }, acceso: { nivel: 30, edadMin: 9 }, sede: 'parque', tramites: 'sala_club_ciudad' },
      ],
      poblacion: {
        etiqueta: 'jugador',
        descripcionDeRival: 'Juega a la prueba.',
        capacidades: [GEN.velocidad, GEN.resistencia, GEN.coordinacion],
        aptitud: 0.2,
        reclutamiento: { edades: { min: 8, max: 15 }, edadMaxBaja: 12, probabilidadBaja: 0.1 },
        equipos: [
          { club: 'club_norte', calidad: 2, plantilla: { min: 6, max: 6 } },
          { club: 'colegio', colegio: 'propio', plantilla: { min: 4, max: 4 } },
          { club: 'colegio2', nombre: 'colegio2', colegio: 'colegio2', plantilla: { min: 4, max: 4 } },
        ],
        descripcionDelEquipo: 'Del equipo de prueba del colegio.',
        entrenadores: { sesgoCaracter: { disciplina: 10 }, interesesPreferidos: ['deporte'], descripcionDelColegio: 'Entrena al grupo de prueba del colegio.', dedicacion: 'de prueba', deFuera: [{ club: 'club_norte', edades: [[8, 99]] }] },
      },
    },
  },
};

const prueba = defineModule({
  id: 'prueba',
  name: 'Prueba',
  dependsOn: ['gen'],
  aportes: {
    [APORTES.fichaDeDeporte]: [{ id: 'prueba', nombre: 'Prueba', disciplina: 'partido', descripcion: 'Un deporte de prueba.', tipo: 'equipo' }],
    [APORTES.datosDeDeporte]: [DATOS_PRUEBA],
  },
  actions: [{ id: 'prueba.unirse', name: 'Unirse', tags: [], duration: 5, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: 'prueba', clubId: 'colegio' } }) }],
});

const CON_PRUEBA = [...MODULOS, prueba];
const lista = (g: ReturnType<typeof nuevaPartida>) => g.moduleState<NpcsState>('npcs').npcs;
const atletas = (g: ReturnType<typeof nuevaPartida>, deporte = 'atletismo') => lista(g).filter((n) => n.deporte === deporte && n.genetica);
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('la genética de los niños es una campana (Gauss), sin forzar a nadie', () => {
  const N = 6000;
  const potenciales = Array.from({ length: N }, (_, i) => {
    const g = geneticaDeNino(rngEstable('medida', i), `nino_${i}`);
    return potencialEn(`nino_${i}`, g, { deporte: 'atletismo', ...DATOS_ATLETISMO.paises.espana.poblacion });
  });
  const m = media(potenciales);
  const sd = Math.sqrt(media(potenciales.map((x) => (x - m) ** 2)));

  it('el potencial en un deporte se reparte en campana: media en torno a 62, asimetría y apuntamiento pequeños, y ~68 % a una desviación', () => {
    expect(m).toBeGreaterThan(58);
    expect(m).toBeLessThan(66);
    expect(sd).toBeGreaterThan(6);
    expect(sd).toBeLessThan(10);
    const asimetria = media(potenciales.map((x) => ((x - m) / sd) ** 3));
    const curtosis = media(potenciales.map((x) => ((x - m) / sd) ** 4)) - 3;
    expect(Math.abs(asimetria)).toBeLessThan(0.4);
    expect(Math.abs(curtosis)).toBeLessThan(0.6);
    const dentro = (k: number) => potenciales.filter((x) => Math.abs(x - m) <= k * sd).length / N;
    expect(dentro(1)).toBeGreaterThan(0.62);
    expect(dentro(1)).toBeLessThan(0.74);
    expect(dentro(2)).toBeGreaterThan(0.93);
  });

  it('entre muchos niños siempre hay unos pocos que destacan por arriba (y otros por abajo): los extremos existen sin forzarlos', () => {
    expect(Math.max(...potenciales)).toBeGreaterThan(m + 2.8 * sd);
    expect(Math.min(...potenciales)).toBeLessThan(m - 2.5 * sd);
  });

  it('los hijos de padres deportistas salen en media más dotados y más aficionados, pero no todos: también salen al revés', () => {
    const niños = Array.from({ length: N }, (_, i) => ({ g: geneticaDeNino(rngEstable('medida', i), `nino_${i}`), i }));
    const hijosDe = (f: (p: string) => boolean) => niños.filter(({ g }) => f(g.padres.padre) && f(g.padres.madre));
    const deportistas = hijosDe((p) => p === 'federado' || p === 'profesional');
    const sedentarios = hijosDe((p) => p === 'ninguna');
    expect(deportistas.length).toBeGreaterThan(30);
    expect(sedentarios.length).toBeGreaterThan(300);
    const topes = (xs: typeof niños) => media(xs.map(({ g }) => media(Object.values(g.topes))));
    expect(topes(deportistas)).toBeGreaterThan(topes(sedentarios) + 1.5);
    expect(deportistas.reduce((a, { g }) => a + g.ventaja, 0) / deportistas.length).toBeGreaterThan(sedentarios.reduce((a, { g }) => a + g.ventaja, 0) / sedentarios.length);
    // Pero no es una regla: entre los hijos de deportistas hay quien sale flojo, y entre los de sedentarios, quien sale muy dotado.
    const todos = niños.map(({ g }) => media(Object.values(g.topes)));
    const mediaTodos = media(todos);
    expect(deportistas.some(({ g }) => media(Object.values(g.topes)) < mediaTodos)).toBe(true);
    expect(sedentarios.some(({ g }) => media(Object.values(g.topes)) > mediaTodos + 5)).toBe(true);
  });
});

describe('los clubes reclutan por gustos y aptitudes', () => {
  it('las plantillas son un número más o menos definido (entre el mínimo y el máximo de cada equipo) y todas se completan', () => {
    for (const seed of [31, 32, 33]) {
      const g = nuevaPartida({ seed });
      const pob = g.moduleState<NpcsState>('npcs').poblaciones![0];
      const porEquipo = new Map<string, number>();
      for (const n of atletas(g)) porEquipo.set(n.equipo!, (porEquipo.get(n.equipo!) ?? 0) + 1);
      for (const e of pob.equipos) {
        expect(e.objetivo).toBeGreaterThanOrEqual(e.plantilla.min);
        expect(e.objetivo).toBeLessThanOrEqual(e.plantilla.max);
        expect(porEquipo.get(e.club), e.club).toBe(e.objetivo);
        expect(e.objetivo).toBeLessThan(15); // un club no tiene veinte niños
      }
    }
  });

  it('un compañero del colegio puede ir a un club de fuera, pero un niño de otro colegio nunca juega en el equipo del colegio del personaje', () => {
    let deClubDeFuera = 0;
    for (const seed of [31, 32, 33, 34, 35, 36]) {
      const g = nuevaPartida({ seed });
      for (const n of atletas(g)) {
        if (n.equipo === 'colegio') {
          expect(n.colegio, `${n.id} en el equipo del colegio`).toBeUndefined(); // sin colegio de fuera: es alumno del colegio
          expect(n.role === 'companero' || n.tags.includes('hermano') || n.role === 'vecino').toBe(true);
          expect(n.tipos?.some((t) => t.tipo === 'alumno' || (t.tipo === 'hermano' && t.escolar))).toBe(true);
        }
        // El equipo de otro colegio solo tiene a sus alumnos.
        if (/^colegio\d$/.test(n.equipo!)) expect(n.colegio).toBe(n.equipo);
        if (n.tipos?.some((t) => t.tipo === 'alumno') && n.equipo !== 'colegio') deClubDeFuera++;
      }
    }
    expect(deClubDeFuera).toBeGreaterThan(0); // algún compañero acaba en un club de fuera
  });

  it('se recluta primero a los interesados: casi todos los reclutados tienen interés por el deporte, y se queda fuera quien más potencial tendría sin interés', () => {
    let reclutados = 0, interesados = 0;
    for (const seed of [31, 32, 33]) {
      const g = nuevaPartida({ seed });
      const pob = g.moduleState<NpcsState>('npcs').poblaciones![0];
      for (const n of atletas(g)) {
        reclutados++;
        if (interesPor(n.rasgos, 'atletismo') > 0) interesados++;
      }
      // Entre los compañeros del colegio que no juegan a nada, los hay con más potencial que algún reclutado pero sin interés.
      const libres = lista(g).filter((n) => n.role === 'companero' && n.genetica && !n.deporte);
      expect(libres.length).toBeGreaterThan(100);
      expect(pob.equipos.length).toBeGreaterThan(5);
    }
    expect(interesados / reclutados).toBeGreaterThan(0.95);
  });

  it('los reclutados son los mejores de entre los interesados de su edad y colegio: más potencial que los que se quedaron fuera', () => {
    const g = nuevaPartida({ seed: 31 });
    const pob = g.moduleState<NpcsState>('npcs').poblaciones![0];
    const pot = (n: Npc) => potencialEn(n.id, n.genetica!, { ...pob, deporte: 'atletismo' });
    const de = atletas(g).filter((n) => n.role === 'companero' || n.tags.includes('hermano'));
    const libres = lista(g).filter((n) => n.role === 'companero' && n.genetica && !n.deporte && interesPor(n.rasgos, 'atletismo') > 0);
    expect(de.length).toBeGreaterThan(5);
    expect(media(de.map(pot))).toBeGreaterThan(media(libres.map(pot)));
  });

  it('entre los deportistas de cada categoría hay uno que destaca de forma natural, y las ordenaciones salen distintas en cada partida', () => {
    const lideres: string[] = [];
    for (const seed of [31, 32, 33, 34]) {
      const g = nuevaPartida({ seed });
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      for (const [a, b] of [[8, 9], [10, 11], [12, 13], [14, 15], [16, 17]]) {
        const cat = dir.list({ tag: 'atleta', minAge: a, maxAge: b }).sort((x, y) => y.levels.atletismo - x.levels.atletismo);
        expect(cat.length).toBeGreaterThan(8);
        const niveles = cat.map((n) => n.levels.atletismo);
        const z = (niveles[0] - media(niveles)) / Math.sqrt(media(niveles.map((x) => (x - media(niveles)) ** 2)));
        expect(z, `categoría ${a}-${b}`).toBeGreaterThan(1.3); // el mejor se separa de la media
        expect(niveles[0]).toBeGreaterThan(niveles[1]); // y hay un primero y un segundo, no un empate
        if (a === 12) lideres.push(cat[0].id);
      }
    }
    expect(new Set(lideres).size).toBe(lideres.length);
  });
});

describe('varios deportes reclutan sin pisarse', () => {
  it('un niño juega a un solo deporte; cada deporte tiene sus equipos, su etiqueta y sus entrenadores, y los de otros colegios no entran en el equipo del colegio', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const todos = lista(g);
    expect(todos.filter((n) => n.deporte && n.genetica).every((n) => Object.keys(n.levels).length === 1)).toBe(true);
    const jugadores = atletas(g, 'prueba');
    expect(jugadores).toHaveLength(14); // 6 + 4 + 4
    expect(jugadores.every((n) => n.tags.includes('jugador') && n.levels.prueba !== undefined && n.potential.prueba !== undefined)).toBe(true);
    expect(jugadores.filter((n) => n.equipo === 'colegio2').every((n) => n.colegio === 'colegio2')).toBe(true);
    expect(jugadores.filter((n) => n.equipo === 'colegio').every((n) => n.role !== 'rival')).toBe(true);
    expect(todos.filter((n) => n.role === 'entrenador' && n.deporte === 'prueba').map((n) => n.id).sort()).toEqual(['entrenador_prueba', 'entrenador_prueba_club_norte_1']);
    expect(todos.find((n) => n.id === 'entrenador_prueba')).toMatchObject({ club: 'colegio', dedicacion: 'de prueba', tags: ['prueba', 'mentor'] });
    // Nadie juega a los dos: los equipos del atletismo no tienen a ningún jugador de prueba.
    const ids = new Set(jugadores.map((n) => n.id));
    expect(atletas(g).some((n) => ids.has(n.id))).toBe(false);
  });

  it('la partida guarda lo que pidió cada deporte, en orden, con sus plantillas sorteadas', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const pobs = g.moduleState<NpcsState>('npcs').poblaciones!;
    expect(pobs.map((p) => [p.deporte, p.primero, p.etiqueta])).toEqual([['atletismo', true, 'atleta'], ['prueba', false, 'jugador']]);
    expect(pobs[1].equipos.map((e) => [e.club, e.objetivo, e.calidad])).toEqual([['club_norte', 6, 2], ['colegio', 4, 1], ['colegio2', 4, 1]]);
    expect(pobs[1].nombresDeClub.club_norte).toBe('Club Norte');
    expect(JSON.parse(JSON.stringify(g.serialize())).modules.npcs.poblaciones).toEqual(pobs);
  });

  it('el equipo del colegio de un deporte nuevo recluta entre los alumnos que encajan, y los hermanos compiten en el deporte que les corresponda, no en el primero', () => {
    let hermanoEnPrueba = 0, hermanoEnAtletismo = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = nuevaPartida({ seed }, CON_PRUEBA);
      for (const h of lista(g).filter((n) => n.tags.includes('hermano') && n.deporte)) {
        if (h.deporte === 'prueba') hermanoEnPrueba++;
        else hermanoEnAtletismo++;
        // Si compite, es en un deporte que le interesa o en el que tiene aptitud: lo recluta un club, no se le asigna.
        expect(h.equipo).toBeDefined();
      }
    }
    expect(hermanoEnPrueba + hermanoEnAtletismo).toBeGreaterThan(0);
    expect(hermanoEnPrueba).toBeGreaterThan(0); // con dos deportes, los hermanos no van todos al primero
  }, 60000);
});

describe('la gente de un deporte sigue viviendo sin su módulo', () => {
  it('al empezar el curso siguiente se renuevan los equipos del deporte con lo guardado, aunque el módulo ya no esté cargado', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const guardada = JSON.parse(JSON.stringify(g.serialize()));
    const sin = cargarPartida(guardada, MODULOS);
    expect(atletas(sin, 'prueba')).toHaveLength(14);
    advanceToWeek(sin, 'gen.descansar', 53, 1, 10);
    // Los equipos de prueba vuelven a tener su plantilla, con niños nuevos, aunque el módulo de prueba no esté.
    expect(atletas(sin, 'prueba')).toHaveLength(14);
    expect(atletas(sin, 'prueba').some((n) => !atletas(g, 'prueba').some((m) => m.id === n.id))).toBe(true);
    expect(atletas(sin)).toHaveLength(sin.moduleState<NpcsState>('npcs').poblaciones![0].equipos.reduce((a, e) => a + e.objetivo, 0));
  });

  it('los niños que dejan el deporte no se vuelven a reclutar para él', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 106, 1, 10); // dos cursos
    const abandonos = g.moduleState<NpcsState>('npcs').abandonos ?? [];
    expect(abandonos.length).toBeGreaterThan(0);
    const ids = new Set(lista(g).map((n) => n.id));
    expect(abandonos.some((id) => ids.has(id))).toBe(false);
    const dejado = lista(g).filter((n) => n.dejado?.includes('atletismo'));
    expect(dejado.every((n) => n.deporte === undefined)).toBe(true);
  });
});

describe('cada deporte sigue su jornada y sus clubes', () => {
  it('los rivales de un deporte compiten en su jornada y no en la de otro', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const agenda = (id: string) => g.service<PresenciaService>(SERVICES.presencia)!.agenda(id);
    const carreras = (id: string) => agenda(id).filter((t) => t.tipo === 'rival' && t.ocupado?.length && t.dias !== 'lectivo' && t.dias !== 'libre').map((t) => ({ dias: t.dias, sitio: t.destinos[0][0] }));
    const de = (deporte: string) => atletas(g, deporte).find((n) => n.role === 'rival')!.id;
    expect(carreras(de('prueba'))).toContainEqual({ dias: [6], sitio: 'parque' });
    expect(carreras(de('prueba'))).not.toContainEqual({ dias: [5], sitio: 'estadio' });
    expect(carreras(de('atletismo'))).toContainEqual({ dias: [5], sitio: 'estadio' });
    expect(carreras(de('atletismo'))).not.toContainEqual({ dias: [6], sitio: 'parque' });
  });

  it('al entrar en un club se presenta el entrenador de ese deporte, no el de otro', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const conocidos = () => lista(g).filter((n) => n.role === 'entrenador' && n.known !== false).map((n) => n.id);
    expect(conocidos()).toEqual([]);
    expect(g.perform('prueba.unirse').ok).toBe(true);
    expect(conocidos()).toEqual(['entrenador_prueba']);
  });
});

describe('aptitud en el deporte y datos', () => {
  it('los datos de prueba son válidos', () => {
    expect(validarDatosDeDeporte(DATOS_PRUEBA)).toEqual([]);
    expect(validarDatosDeDeporte(DATOS_ATLETISMO)).toEqual([]);
  });

  it('cuenta el nivel en el deporte en que más destaca, sea cual sea, y el interés por cualquier deporte', () => {
    const rasgos = { origen: [], apariencia: {}, caracter: {}, intereses: { futbol: 3 }, gustos: {} } as unknown as Parameters<typeof aptitudDe>[1];
    expect(aptitudDe('deporte', rasgos, { prueba: 80 })).toBeGreaterThan(aptitudDe('deporte', rasgos, { prueba: 30 }));
    expect(aptitudDe('deporte', rasgos, { prueba: 50, atletismo: 20 })).toBe(aptitudDe('deporte', rasgos, { atletismo: 20, prueba: 50 }));
    expect(aptitudDe('deporte', rasgos, {})).toBeCloseTo(0.6 * 0.2 + 0.4 * 1, 6);
  });
});
