import { describe, expect, it } from 'vitest';
import { APORTES, GEN, SERVICES, SHARED_EVENTS, aptitudDe, defineModule, validarDatosDeDeporte, type DatosDeDeporte, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { DATOS_ATLETISMO } from '@ds/mod-atletismo';
import type { NpcsState } from '@ds/mod-npcs';

/**
 * La gente de cada deporte (fase 4 del plan de deportes modulares): cada deporte pide su gente como dato, `npcs` la crea y la renueva, y guarda lo que
 * pidió para que siga viviendo sin el módulo. Se prueba con un segundo deporte (solo de prueba) cargado junto al atletismo.
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
        deportistas: { sesgoCaracter: { sociabilidad: 8 }, interesesPreferidos: ['deporte'] },
        rivales: { edades: { min: 8, max: 15 }, porEdad: 3, edadMaxBaja: 12, probabilidadBaja: 0.1, clubes: ['Club Norte', 'colegioX', 'clubY'] },
        entrenadores: { sesgoCaracter: { disciplina: 10 }, interesesPreferidos: ['deporte'], descripcionDelColegio: 'Entrena al grupo de prueba del colegio.', dedicacion: 'de prueba', deFuera: [{ club: 'club_norte', edades: [[8, 99]] }] },
        equipoDelColegio: { tamano: 6, descripcion: 'Del equipo de prueba del colegio.' },
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

describe('la gente de un deporte es un dato', () => {
  it('los datos de prueba son válidos', () => {
    expect(validarDatosDeDeporte(DATOS_PRUEBA)).toEqual([]);
    expect(validarDatosDeDeporte(DATOS_ATLETISMO)).toEqual([]);
  });

  it('un segundo deporte pone sus rivales, sus entrenadores y su equipo del colegio sin cambiar la gente del primero', () => {
    const solo = lista(nuevaPartida({ seed: 31 }));
    const dos = lista(nuevaPartida({ seed: 31 }, CON_PRUEBA));
    const ids = new Set(solo.map((n) => n.id));
    // La gente del atletismo es exactamente la misma (los demás deportes se generan detrás de todo).
    expect(dos.filter((n) => ids.has(n.id)).map((n) => ({ ...n, tipos: undefined, tags: n.tags.filter((t) => t !== 'equipo'), description: undefined }))).toEqual(
      solo.map((n) => ({ ...n, tipos: undefined, tags: n.tags.filter((t) => t !== 'equipo'), description: undefined })),
    );
    const nuevos = dos.filter((n) => !ids.has(n.id));
    const rivales = nuevos.filter((n) => n.role === 'rival');
    expect(rivales).toHaveLength(8 * 3); // de 8 a 15 años, 3 por edad
    expect(rivales.every((n) => n.id.startsWith('rival_prueba_') && n.tags.includes('jugador') && n.deporte === 'prueba' && n.levels.prueba !== undefined && n.potential.prueba !== undefined && n.levels.atletismo === undefined)).toBe(true);
    expect(rivales.every((n) => n.tipos?.[0].tipo === 'rival' && n.tipos[0].deporte === 'prueba')).toBe(true);
    expect(nuevos.filter((n) => n.role === 'entrenador').map((n) => n.id).sort()).toEqual(['entrenador_prueba', 'entrenador_prueba_club_norte_1']);
    const colegio = nuevos.find((n) => n.id === 'entrenador_prueba')!;
    expect(colegio).toMatchObject({ club: 'colegio', deporte: 'prueba', dedicacion: 'de prueba', tags: ['prueba', 'mentor'], description: 'Entrena al grupo de prueba del colegio.' });
  });

  it('el equipo del colegio de un deporte nuevo se recluta entre los alumnos que mejor encajan, sin pisar al de otro deporte', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const equipo = lista(g).filter((n) => n.tipos?.some((t) => t.tipo === 'club' && t.deporte === 'prueba'));
    expect(equipo).toHaveLength(6);
    expect(equipo.every((n) => n.role === 'companero' && n.description?.endsWith('Del equipo de prueba del colegio.'))).toBe(true);
    // Ninguno está también en el equipo de atletismo.
    expect(equipo.some((n) => n.tipos?.some((t) => t.tipo === 'club' && t.deporte === 'atletismo'))).toBe(false);
    // Son los de más aptitud para el deporte de los alumnos libres.
    const aptitud = (n: (typeof equipo)[number]) => aptitudDe('deporte', n.rasgos, n.levels);
    const libres = lista(g).filter((n) => n.role === 'companero' && !n.tags.includes('equipo') && n.tipos?.some((t) => t.tipo === 'alumno'));
    expect(Math.min(...equipo.map(aptitud))).toBeGreaterThanOrEqual(Math.max(...libres.map(aptitud)) - 1e-9);
  });

  it('la partida guarda lo que pidió cada deporte, en orden', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const pobs = g.moduleState<NpcsState>('npcs').poblaciones!;
    expect(pobs.map((p) => [p.deporte, p.prefijo, p.etiqueta])).toEqual([['atletismo', 'rival_', 'atleta'], ['prueba', 'rival_prueba_', 'jugador']]);
    expect(pobs[1]).toMatchObject({ nombre: 'prueba', aptitud: 0.2, nombresDeClub: { colegio: expect.any(String), club_norte: 'Club Norte' } });
    // Es JSON: sobrevive a guardar y cargar.
    expect(JSON.parse(JSON.stringify(g.serialize())).modules.npcs.poblaciones).toEqual(pobs);
  });

  it('sus buscadores encuentran a los de cada deporte por su etiqueta y su nivel', () => {
    const dir = nuevaPartida({ seed: 31 }, CON_PRUEBA).service<NpcDirectory>(SERVICES.npcs)!;
    expect(dir.list({ tag: 'jugador' }).every((n) => n.levels.prueba !== undefined)).toBe(true);
    expect(dir.list({ tag: 'atleta' }).every((n) => n.levels.atletismo !== undefined)).toBe(true);
    expect(dir.list({ tag: 'jugador' }).length).toBeGreaterThanOrEqual(24);
  });
});

describe('la gente de un deporte sigue viviendo sin su módulo', () => {
  it('al empezar el curso siguiente se renuevan sus rivales con lo guardado, aunque el deporte ya no esté cargado', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const guardada = JSON.parse(JSON.stringify(g.serialize()));
    // Se carga sin el módulo del deporte de prueba: sus rivales siguen ahí.
    const sin = cargarPartida(guardada, MODULOS);
    const rivalesDe = (x: typeof sin) => lista(x).filter((n) => n.id.startsWith('rival_prueba_'));
    expect(rivalesDe(sin)).toHaveLength(24);
    advanceToWeek(sin, 'gen.descansar', 53, 1, 10);
    const despues = rivalesDe(sin);
    // Siguen siendo 3 por edad de 8 a 15: los mayores se fueron y entraron niños nuevos, con sus ids nuevos y su deporte.
    expect(despues).toHaveLength(24);
    expect(despues.some((n) => Number(n.id.slice('rival_prueba_'.length)) > 24)).toBe(true);
    expect(despues.every((n) => n.deporte === 'prueba' && n.tags.includes('jugador'))).toBe(true);
    // Y los de atletismo, también.
    expect(lista(sin).filter((n) => n.role === 'rival' && !n.id.startsWith('rival_prueba_'))).toHaveLength(108);
  });

  it('una partida guardada antes de guardar lo pedido calcula lo guardado con los deportes cargados', () => {
    const g = nuevaPartida({ seed: 31 });
    const guardada = JSON.parse(JSON.stringify(g.serialize()));
    delete guardada.modules.npcs.poblaciones;
    const vieja = cargarPartida(guardada);
    advanceToWeek(vieja, 'gen.descansar', 53, 1, 10);
    expect(vieja.moduleState<NpcsState>('npcs').poblaciones!.map((p) => p.deporte)).toEqual(['atletismo']);
    expect(lista(vieja).filter((n) => n.role === 'rival')).toHaveLength(108);
  });
});

describe('cada deporte sigue su jornada y sus clubes', () => {
  it('los rivales de un deporte compiten en su jornada y no en la de otro', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const agenda = (id: string) => g.service<PresenciaService>(SERVICES.presencia)!.agenda(id);
    const carreras = (id: string) => agenda(id).filter((t) => t.tipo === 'rival' && t.ocupado?.length && t.dias !== 'lectivo' && t.dias !== 'libre').map((t) => ({ dias: t.dias, sitio: t.destinos[0][0] }));
    expect(carreras('rival_prueba_1')).toContainEqual({ dias: [6], sitio: 'parque' });
    expect(carreras('rival_prueba_1')).not.toContainEqual({ dias: [5], sitio: 'estadio' });
    expect(carreras('rival_1')).toContainEqual({ dias: [5], sitio: 'estadio' });
    expect(carreras('rival_1')).not.toContainEqual({ dias: [6], sitio: 'parque' });
  });

  it('al entrar en un club se presenta el entrenador de ese deporte, no el de otro', () => {
    const g = nuevaPartida({ seed: 31 }, CON_PRUEBA);
    const conocidos = () => lista(g).filter((n) => n.role === 'entrenador' && n.known !== false).map((n) => n.id);
    expect(conocidos()).toEqual([]);
    expect(g.perform('prueba.unirse').ok).toBe(true);
    expect(conocidos()).toEqual(['entrenador_prueba']);
  });
});

describe('aptitud en el deporte', () => {
  it('cuenta el nivel en el deporte en que más destaca, sea cual sea, y el interés por cualquier deporte', () => {
    const rasgos = { origen: [], apariencia: {}, caracter: {}, intereses: { futbol: 3 }, gustos: {} } as unknown as Parameters<typeof aptitudDe>[1];
    expect(aptitudDe('deporte', rasgos, { prueba: 80 })).toBeGreaterThan(aptitudDe('deporte', rasgos, { prueba: 30 }));
    expect(aptitudDe('deporte', rasgos, { prueba: 50, atletismo: 20 })).toBe(aptitudDe('deporte', rasgos, { atletismo: 20, prueba: 50 }));
    expect(aptitudDe('deporte', rasgos, {})).toBeCloseTo(0.6 * 0.2 + 0.4 * 1, 6); // sin deporte, 20 de nivel; el fútbol (interés 3) cuenta
  });
});
