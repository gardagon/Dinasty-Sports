import { describe, expect, it } from 'vitest';
import { APORTES, SERVICES, SHARED_EVENTS, TAGS, defineModule, type ClubDeDeporte, type ClubDirectory, type DatosDeDeporte } from '@ds/contracts';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { clubes } from './index';

/** Los clubes que trae el deporte de prueba (los mismos que el atletismo de España). */
const CLUBES: readonly ClubDeDeporte[] = [
  { id: 'colegio', nombre: 'Club deportivo del colegio', esColegio: true, calidad: 1, sesiones: { weekdays: [0, 2], desde: 15, hasta: 17 }, sede: 'pista_colegio', tramites: 'administracion' },
  { id: 'club_ciudad', nombre: 'Club Atletismo Ciudad', calidad: 2, sesiones: { weekdays: [1, 3], desde: 18, hasta: 20 }, acceso: { nivel: 45, edadMin: 10 }, sede: 'estadio', tramites: 'sala_club_ciudad' },
  { id: 'club_alto_rendimiento', nombre: 'Club de Alto Rendimiento', calidad: 3, sesiones: { weekdays: [0, 1, 3], desde: 17, hasta: 20 }, acceso: { nivel: 65, edadMin: 14 }, sede: 'estadio', tramites: 'sala_club_alto_rendimiento' },
];
const DATOS = (id: string, clubes: readonly ClubDeDeporte[]): DatosDeDeporte => ({
  id,
  paises: {
    espana: {
      categorias: [{ id: 'todas', nombre: 'Todas', edadMin: 0, edadMax: 200 }],
      temporada: { semanasDePretemporada: 4, semifinalAntesDelFinal: 3, finalAntesDelFinal: 2 },
      competiciones: { federacion: 'Federación', campeonato: 'campeonato de {pais}', jornada: { dias: [5], desde: 9, hasta: 13, lugar: 'estadio', texto: 'Partidos.' } },
      sedes: { colegio: 'pista_colegio', fuera: 'estadio' },
      clubes,
    },
  },
});
const ficha = (id: string) => ({ id, nombre: id, disciplina: id, descripcion: id, tipo: 'individual' as const });

/** Un deporte mínimo de prueba: solo pide entrar en un club y tiene una sesión de club. */
const deporteDePrueba = defineModule({
  id: 'prueba',
  name: 'Prueba',
  dependsOn: ['gen'],
  aportes: { [APORTES.fichaDeDeporte]: [ficha('atletismo')], [APORTES.datosDeDeporte]: [DATOS('atletismo', CLUBES)] },
  actions: [
    {
      id: 'prueba.unirse',
      name: 'Unirse',
      tags: [],
      duration: 10,
      run: (ctx) => ctx.emit({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: 'atletismo', clubId: 'club_ciudad' } }),
    },
    {
      id: 'prueba.salir',
      name: 'Salir',
      tags: [],
      duration: 10,
      run: (ctx) => ctx.emit({ type: SHARED_EVENTS.CLUB_LEAVE, data: { sport: 'atletismo' } }),
    },
    { id: 'prueba.sesion', name: 'Sesión', tags: [TAGS.club, 'atletismo'], duration: 60 },
  ],
});

const nueva = () => Game.create([personaje, clubes, deporteDePrueba], { seed: 2 });
const dir = (g: Game) => g.service<ClubDirectory>(SERVICES.clubes)!;

describe('módulo clubes', () => {
  it('funciona solo con el módulo base (sin deportes no hay clubes) y empieza sin club', () => {
    const g = Game.create([personaje, clubes], { seed: 1 });
    expect(dir(g).membership('atletismo')).toBeUndefined();
    expect(dir(g).list('atletismo')).toEqual([]);
  });

  it('el catálogo sale de las secciones que traen los deportes, en el orden en que las definen', () => {
    const g = nueva();
    expect(dir(g).list('atletismo').map((c) => c.id)).toEqual(['colegio', 'club_ciudad', 'club_alto_rendimiento']);
    expect(dir(g).list('futbol')).toHaveLength(0);
    // Cada club visto desde el deporte lleva las sesiones, el acceso y los sitios de su sección.
    expect(dir(g).list('atletismo')[1]).toEqual({
      id: 'club_ciudad',
      nombre: 'Club Atletismo Ciudad',
      esColegio: false,
      calidad: 2,
      deportes: ['atletismo'],
      sesiones: { weekdays: [1, 3], desde: 18, hasta: 20 },
      acceso: { atletismo: { nivel: 45, edadMin: 10 } },
      sede: 'estadio',
      tramites: 'sala_club_ciudad',
    });
  });

  it('un club puede tener secciones en varios deportes, cada una con sus sesiones y su acceso; el primero que lo define pone el nombre', () => {
    const otro = defineModule({
      id: 'otro',
      name: 'Otro',
      dependsOn: ['gen'],
      aportes: {
        [APORTES.fichaDeDeporte]: [ficha('futbol')],
        [APORTES.datosDeDeporte]: [DATOS('futbol', [{ id: 'colegio', nombre: 'Otro nombre', esColegio: true, calidad: 1, sesiones: { weekdays: [4], desde: 16, hasta: 18 }, sede: 'campo_colegio', tramites: 'administracion' }])],
      },
    });
    const g = Game.create([personaje, clubes, deporteDePrueba, otro], { seed: 2 });
    const a = dir(g).list('atletismo')[0];
    const f = dir(g).list('futbol')[0];
    expect([a.nombre, f.nombre]).toEqual(['Club deportivo del colegio', 'Club deportivo del colegio']);
    expect(a.deportes).toEqual(['atletismo', 'futbol']);
    expect(a.sesiones.weekdays).toEqual([0, 2]);
    expect(f.sesiones.weekdays).toEqual([4]);
    expect([a.sede, f.sede]).toEqual(['pista_colegio', 'campo_colegio']);
  });

  it('el club del colegio es el de menor nivel y los de fuera exigen nivel y edad', () => {
    const lista = dir(nueva()).list('atletismo');
    const colegio = lista.find((c) => c.esColegio)!;
    expect(colegio.calidad).toBe(1);
    expect(colegio.acceso).toBeUndefined();
    for (const c of lista.filter((x) => !x.esColegio)) {
      expect(c.calidad).toBeGreaterThan(colegio.calidad);
      expect(c.acceso!.atletismo.nivel).toBeGreaterThan(0);
    }
  });

  it('un deporte puede pedir entrar y salir de un club', () => {
    const g = nueva();
    expect(g.perform('prueba.unirse').ok).toBe(true);
    expect(dir(g).membership('atletismo')?.id).toBe('club_ciudad');
    expect(g.log.some((l) => /Ya eres del Club Atletismo Ciudad/.test(l.text))).toBe(true);
    expect(g.perform('prueba.salir').ok).toBe(true);
    expect(dir(g).membership('atletismo')).toBeUndefined();
  });

  it('las sesiones de un club de fuera rinden más que las del colegio', () => {
    const g = nueva();
    const sin = g.preview('prueba.sesion')!.efficiency;
    g.perform('prueba.unirse');
    const conClub = g.preview('prueba.sesion')!;
    expect(conClub.efficiency).toBeGreaterThan(sin);
    expect(conClub.modifiers.some((m) => m.id === 'clubes.calidad')).toBe(true);
  });
});
