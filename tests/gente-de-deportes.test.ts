import { describe, expect, it } from 'vitest';
import { APORTES, CAPACIDADES_GENETICAS, GEN, GRUPO_DE_CAPACIDAD, SERVICES, SHARED_EVENTS, aptitudDe, defineModule, validarDatosDeDeporte, type DatosDeDeporte, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { DATOS_ATLETISMO } from '@ds/mod-atletismo';
import { geneticaDeNino, interesPor, nivelEn, potencialEn } from '../modules/npcs/src/deportistas';
import { reclutarEnTodos, sinDeporte } from '../modules/npcs/src/index';
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

const FISICAS = CAPACIDADES_GENETICAS.filter((c) => GRUPO_DE_CAPACIDAD[c] === 'fisico');
const topeMedio = (g: { topes: Record<string, number> }, caps: readonly string[] = CAPACIDADES_GENETICAS) => media(caps.map((c) => g.topes[c]));
const desviacion = (xs: number[]) => Math.sqrt(media(xs.map((x) => (x - media(xs)) ** 2)));
const rangosDe = (xs: number[]): number[] => {
  const orden = xs.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const r = new Array<number>(xs.length);
  orden.forEach(([, i], k) => (r[i] = k));
  return r;
};
const spearman = (a: number[], b: number[]): number => {
  const ra = rangosDe(a), rb = rangosDe(b), n = a.length;
  return 1 - (6 * ra.reduce((s, x, i) => s + (x - rb[i]) ** 2, 0)) / (n * (n * n - 1));
};

describe('todos los niños se crean como el personaje: con padres de distinto nivel, sin forzar a nadie', () => {
  const N = 6000;
  const ninos = Array.from({ length: N }, (_, i) => ({ g: geneticaDeNino(rngEstable('medida', i), `nino_${i}`), id: `nino_${i}` }));
  const nivelDe = (c: number) => (c < 0.3 ? 'dificil' : c > 0.7 ? 'facil' : 'normal');

  it('llevan las 18 capacidades (físicas, mentales y sociales) y los padres salen de tres niveles: fácil, normal y difícil', () => {
    expect(Object.keys(ninos[0].g.topes).sort()).toEqual([...CAPACIDADES_GENETICAS].sort());
    const reparto = (nivel: string) => ninos.filter(({ g }) => nivelDe(g.calidad!.padre) === nivel).length / N;
    expect(reparto('dificil')).toBeGreaterThan(0.2);
    expect(reparto('dificil')).toBeLessThan(0.3);
    expect(reparto('normal')).toBeGreaterThan(0.45);
    expect(reparto('normal')).toBeLessThan(0.55);
    expect(reparto('facil')).toBeGreaterThan(0.2);
    expect(reparto('facil')).toBeLessThan(0.3);
  });

  it('los hijos de padres de mejor nivel salen en media con topes más altos, pero en cada nivel hay de todo: muy dotados y muy flojos', () => {
    const de = (nivel: string) => ninos.filter(({ g }) => nivelDe(g.calidad!.padre) === nivel && nivelDe(g.calidad!.madre) === nivel).map(({ g }) => g);
    const [dificil, normal, facil] = [de('dificil'), de('normal'), de('facil')];
    expect(dificil.length).toBeGreaterThan(200);
    expect(facil.length).toBeGreaterThan(200);
    const m = (xs: typeof dificil) => media(xs.map((g) => topeMedio(g)));
    expect(m(normal)).toBeGreaterThan(m(dificil) + 3);
    expect(m(facil)).toBeGreaterThan(m(normal) + 3);
    // Los extremos existen en todos los niveles: nadie está condenado ni asegurado.
    for (const grupo of [dificil, normal, facil]) {
      const fuertes = grupo.map((g) => Math.max(...Object.values(g.topes)));
      expect(Math.max(...fuertes)).toBeGreaterThan(85);
      expect(Math.min(...grupo.map((g) => Math.min(...Object.values(g.topes))))).toBeLessThan(45);
    }
    // Y se cruzan: hay hijos de padres difíciles más dotados que la media de los de padres fáciles, y al revés.
    expect(dificil.some((g) => topeMedio(g) > m(normal))).toBe(true);
    expect(facil.some((g) => topeMedio(g) < m(normal))).toBe(true);
  });

  it('cada capacidad (también las mentales y sociales) se reparte en campana entre todos los niños', () => {
    for (const cap of ['gen.velocidad', 'gen.inteligencia', 'gen.carisma']) {
      const xs = ninos.map(({ g }) => g.topes[cap]);
      const m = media(xs), sd = desviacion(xs);
      expect(m, cap).toBeGreaterThan(55);
      expect(m, cap).toBeLessThan(68);
      expect(sd, cap).toBeGreaterThan(7);
      const asimetria = media(xs.map((x) => ((x - m) / sd) ** 3));
      const curtosis = media(xs.map((x) => ((x - m) / sd) ** 4)) - 3;
      expect(Math.abs(asimetria), cap).toBeLessThan(0.8);
      expect(Math.abs(curtosis), cap).toBeLessThan(1);
      expect(Math.max(...xs), cap).toBeGreaterThan(m + 2.5 * sd);
      expect(Math.min(...xs), cap).toBeLessThan(m - 2 * sd);
    }
  });

  it('los hijos de padres que hicieron deporte (según su perfil físico) salen en media más dotados físicamente y más aficionados, pero no todos', () => {
    const deportistas = ninos.filter(({ g }) => (g.padres.padre === 'federado' || g.padres.padre === 'profesional') && (g.padres.madre === 'federado' || g.padres.madre === 'profesional'));
    const sedentarios = ninos.filter(({ g }) => g.padres.padre === 'ninguna' && g.padres.madre === 'ninguna');
    expect(deportistas.length).toBeGreaterThan(30);
    expect(sedentarios.length).toBeGreaterThan(300);
    const fisico = (xs: typeof ninos) => media(xs.map(({ g }) => topeMedio(g, FISICAS)));
    expect(fisico(deportistas)).toBeGreaterThan(fisico(sedentarios) + 2);
    expect(media(deportistas.map(({ g }) => g.ventaja))).toBeGreaterThan(media(sedentarios.map(({ g }) => g.ventaja)));
    const todos = media(ninos.map(({ g }) => topeMedio(g, FISICAS)));
    expect(deportistas.some(({ g }) => topeMedio(g, FISICAS) < todos)).toBe(true);
    expect(sedentarios.some(({ g }) => topeMedio(g, FISICAS) > todos + 4)).toBe(true);
  });

  it('en una partida, el potencial deportivo de todos sus niños (no solo de los reclutados) sale en campana', () => {
    const potenciales: number[] = [];
    for (const seed of [31, 32, 33, 34, 35, 36]) {
      const g = nuevaPartida({ seed });
      const pob = g.moduleState<NpcsState>('npcs').poblaciones![0];
      for (const n of lista(g)) if (n.genetica) potenciales.push(potencialEn(n.id, n.genetica, { ...pob, deporte: 'atletismo' }));
    }
    expect(potenciales.length).toBeGreaterThan(5000); // todos los niños de la partida: los del colegio, los de otros colegios y los del barrio
    const m = media(potenciales), sd = desviacion(potenciales);
    expect(m).toBeGreaterThan(58);
    expect(m).toBeLessThan(66);
    expect(Math.abs(media(potenciales.map((x) => ((x - m) / sd) ** 3)))).toBeLessThan(0.4);
    expect(Math.abs(media(potenciales.map((x) => ((x - m) / sd) ** 4)) - 3)).toBeLessThan(0.6);
    const dentro = potenciales.filter((x) => Math.abs(x - m) <= sd).length / potenciales.length;
    expect(dentro).toBeGreaterThan(0.62);
    expect(dentro).toBeLessThan(0.74);
  });
});

describe('quien destaca un año no tiene por qué destacar tres años después', () => {
  it('el nivel que rinde cada niño cambia de un curso a otro (constancia y suerte del año), así que el orden entre ellos se mueve sin deshacerse', () => {
    const rhos: number[] = [];
    let cambiosDeLider = 0, cohortes = 0;
    for (const seed of [31, 32, 33, 34, 35, 36]) {
      const g = nuevaPartida({ seed });
      const pob = g.moduleState<NpcsState>('npcs').poblaciones![0];
      const coh = lista(g).filter((n) => n.genetica && n.nacimiento !== undefined && Math.floor(-n.nacimiento / 365) === 10 && n.role !== 'familia');
      expect(coh.length).toBeGreaterThan(40);
      const pot = coh.map((n) => potencialEn(n.id, n.genetica!, { ...pob, deporte: 'atletismo' }));
      const nivel = (edad: number) => coh.map((n, i) => nivelEn(n.id, n.genetica!, pot[i], edad, 'atletismo', (edad - 10) * 365));
      const [a, b] = [nivel(10), nivel(13)];
      rhos.push(spearman(a, b));
      cohortes++;
      if (a.indexOf(Math.max(...a)) !== b.indexOf(Math.max(...b))) cambiosDeLider++;
    }
    expect(media(rhos)).toBeGreaterThan(0.4); // el orden se conserva en parte: el potencial sigue pesando
    expect(media(rhos)).toBeLessThan(0.93); // pero no del todo: la constancia, el desarrollo y la suerte del año lo mueven
    expect(cambiosDeLider).toBeGreaterThan(0); // y en alguna cohorte el que destacaba a los 10 ya no es el primero a los 13
    expect(cambiosDeLider).toBeLessThan(cohortes);
  });

  it('en una partida de dos cursos, el orden de los deportistas de una misma edad se mueve (no es el del primer día)', () => {
    const rhos: number[] = [];
    for (const seed of [31, 32, 33]) {
      const g = nuevaPartida({ seed });
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      const antes = new Map(atletas(g).map((n) => [n.id, { nivel: n.levels.atletismo, edad: dir.get(n.id)!.age! }]));
      advanceToWeek(g, 'gen.descansar', 106, 1, 10);
      // Se compara dentro de cada edad: entre edades distintas el orden lo marca la edad, no el niño.
      for (const edad of [8, 9, 10, 11, 12, 13]) {
        const siguen = atletas(g).filter((n) => antes.get(n.id)?.edad === edad);
        if (siguen.length < 8) continue;
        rhos.push(spearman(siguen.map((n) => antes.get(n.id)!.nivel), siguen.map((n) => n.levels.atletismo)));
      }
    }
    expect(rhos.length).toBeGreaterThan(5);
    expect(media(rhos)).toBeLessThan(0.93);
    expect(media(rhos)).toBeGreaterThan(0.3);
  }, 60000);
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

  it('los hermanos compiten en el deporte que les encaja por gustos y aptitud, no en el primero: a quien le interesa un deporte, lo recluta ese deporte', () => {
    let g: ReturnType<typeof nuevaPartida> | undefined;
    for (let seed = 1; seed <= 40 && !g; seed++) {
      const c = nuevaPartida({ seed }, CON_PRUEBA);
      if (lista(c).some((n) => n.tags.includes('hermano') && n.genetica)) g = c;
    }
    expect(g, 'una partida con hermanos').toBeDefined();
    const estado = g!.moduleState<NpcsState>('npcs');
    const pobs = estado.poblaciones!.map((p) => ({ ...p, equipos: p.equipos.map((e) => (e.club === 'colegio' ? { ...e, objetivo: 16, plantilla: { min: 16, max: 16 } } : e)) }));
    for (const deporte of ['prueba', 'atletismo']) {
      // Todos sin deporte, el hermano muy dotado y con interés solo por ese deporte: lo recluta ese deporte y no el otro.
      const hermano = estado.npcs.find((n) => n.tags.includes('hermano') && n.genetica)!;
      const sin = estado.npcs.map((n) => (n.deporte ? sinDeporte(n, pobs.find((p) => p.deporte === n.deporte)!, false) : n));
      const jovenes = sin.map((n) => (n.id === hermano.id ? { ...n, nacimiento: -10 * 365 - 100, genetica: { ...n.genetica!, topes: Object.fromEntries(CAPACIDADES_GENETICAS.map((c) => [c, 95])) }, rasgos: { ...n.rasgos!, intereses: { [deporte]: 3 } } } : n));
      const despues = reclutarEnTodos(jovenes, pobs, 0).find((n) => n.id === hermano.id)!;
      expect(despues.deporte, deporte).toBe(deporte);
      expect(despues.tipos?.find((t) => t.tipo === 'hermano')?.deporte).toBe(deporte);
    }
  });
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

  it('los niños que dejan el deporte siguen siendo personas del barrio y no se vuelven a reclutar para él', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 106, 1, 10); // dos cursos
    const dejado = lista(g).filter((n) => n.dejado?.includes('atletismo'));
    expect(dejado.length).toBeGreaterThan(0);
    expect(dejado.every((n) => n.deporte === undefined && n.role !== 'rival')).toBe(true);
    expect(dejado.some((n) => n.id.startsWith('nino_'))).toBe(true); // un niño de otro colegio que lo deja sigue en el barrio
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
