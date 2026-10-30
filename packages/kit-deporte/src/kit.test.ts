import { describe, expect, it } from 'vitest';
import { APORTES, GEN, TAGS, defineModule, type CategoriaDef, type DatosDeDeporte, type ActionView, type ReadContext } from '@ds/contracts';
import { Game, advanceTo } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import {
  accionesDeClubes,
  categoriaDelJugador,
  conocimientoDelDeporte,
  dejarClub,
  habilidadDeportiva,
  manejadoresDeDeporte,
  modificadorDeCampamento,
  modificadorDeConocimiento,
  modificadorDeSobrecarga,
  modificadorPorTuCuenta,
  recorte,
  sesionDeClub,
  sinEntrenarPorLibreEnSesion,
  textoDeSesiones,
  verEnLaTele,
  type ConfigDeporte,
  type EstadoBaseDeDeporte,
} from './index';

/** Un deporte mínimo hecho solo con el kit: demuestra que las piezas bastan para montar un deporte nuevo. */
const CONFIG: ConfigDeporte = {
  id: 'prueba',
  nombre: 'prueba',
  rendimiento: (ctx: ReadContext) => ctx.stat('prueba.tecnica'),
  entrenosLibres: ['prueba.entreno'],
};

const CATEGORIAS: readonly CategoriaDef[] = [
  { id: 'sub10', nombre: 'Sub-10', edadMin: 0, edadMax: 9 },
  { id: 'sub12', nombre: 'Sub-12', edadMin: 10, edadMax: 11 },
  { id: 'absoluta', nombre: 'Absoluta', edadMin: 12, edadMax: 200 },
];
const DATOS: DatosDeDeporte = {
  id: 'prueba',
  paises: { espana: { categorias: CATEGORIAS, temporada: { semanasDePretemporada: 4, semifinalAntesDelFinal: 3, finalAntesDelFinal: 2 }, competiciones: { federacion: 'Federación de prueba', campeonato: 'campeonato de {pais}', jornada: { dias: [5], desde: 9, hasta: 13, lugar: 'estadio', texto: 'Partidos: los sábados.' } },
      sedes: { colegio: 'pista_colegio', fuera: 'estadio' },
      clubes: [
        { id: 'colegio', nombre: 'Club deportivo del colegio', esColegio: true, calidad: 1, sesiones: { weekdays: [0, 2], desde: 15, hasta: 17 }, sede: 'pista_colegio', tramites: 'administracion' },
        { id: 'club_ciudad', nombre: 'Club Ciudad', calidad: 2, sesiones: { weekdays: [1, 3], desde: 18, hasta: 20 }, acceso: { nivel: 45, edadMin: 10 }, sede: 'estadio', tramites: 'sala_club_ciudad' },
      ] } },
};

const deporteDePrueba = defineModule<EstadoBaseDeDeporte>({
  id: 'prueba',
  name: 'Prueba',
  dependsOn: ['gen'],
  aportes: { [APORTES.datosDeDeporte]: [DATOS] },
  stats: [
    habilidadDeportiva('prueba', 'Prueba', 'tecnica', 'Técnica', [{ stat: GEN.coordinacion, weight: 0.4 }], 'Técnica de prueba.', [{ stat: GEN.coordinacion, weight: 1 }]),
    conocimientoDelDeporte('prueba', 'Conocimiento de prueba', 'Entender el deporte de prueba.'),
  ],
  initState: () => ({ sesionesHoy: { day: -1, n: 0 } }),
  services: { 'prueba.categoria': (ctx) => categoriaDelJugador(ctx, CONFIG).propia.id },
  dynamicActions: accionesDeClubes(CONFIG),
  actions: sinEntrenarPorLibreEnSesion(CONFIG, [
    sesionDeClub(CONFIG, { description: 'Sesión.', tags: [TAGS.entrenamiento, TAGS.club, 'prueba'], delta: { [GEN.energia]: -10 }, train: [{ stat: 'prueba.tecnica', amount: 2 }] }),
    dejarClub(CONFIG),
    { id: 'prueba.entreno', name: 'Entrenar por libre', tags: [TAGS.fisico, TAGS.entrenamiento, 'prueba'], duration: 30, delta: { [GEN.energia]: -5 }, train: [{ stat: 'prueba.tecnica', amount: 2 }] },
    verEnLaTele(CONFIG, 'Partidos de otros.'),
  ]),
  modifiers: [modificadorPorTuCuenta(CONFIG), modificadorDeConocimiento(CONFIG), modificadorDeSobrecarga(CONFIG), modificadorDeCampamento(CONFIG)],
  on: manejadoresDeDeporte(CONFIG),
});

const nueva = () => Game.create([personaje, deporteDePrueba], { seed: 3 });

describe('kit de deporte', () => {
  it('un deporte hecho con el kit carga solo con el módulo base', () => {
    const g = nueva();
    expect(g.stat('prueba.conocimiento')).toBe(0);
    expect(g.stat('prueba.tecnica')).toBeGreaterThan(0);
    // Sin el módulo de clubes no hay acciones de club ni sesión posible.
    expect(g.listActions().some((o) => o.id === 'prueba.apuntarse_colegio')).toBe(false);
    expect(g.preview('prueba.club_sesion')!.reason).toBe('No perteneces a ningún club de prueba');
    expect(g.preview('prueba.dejar_club')!.available).toBe(false);
  });

  it('entrenar por libre rinde menos y la tercera sesión del día sufre sobrecarga', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 10);
    const primera = g.preview('prueba.entreno')!;
    expect(primera.modifiers.some((m) => m.id === 'prueba.por_tu_cuenta')).toBe(true);
    expect(primera.modifiers.some((m) => m.id === 'prueba.sobrecarga')).toBe(false);
    expect(g.perform('prueba.entreno').ok).toBe(true);
    expect(g.perform('prueba.entreno').ok).toBe(true);
    expect(g.preview('prueba.entreno')!.modifiers.some((m) => m.id === 'prueba.sobrecarga')).toBe(true);
  });

  it('verlo en la tele sube el conocimiento una vez al día', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 18);
    expect(g.perform('prueba.ver_tele').ok).toBe(true);
    expect(g.stat('prueba.conocimiento')).toBeGreaterThan(0);
    expect(g.preview('prueba.ver_tele')!.reason).toBe('Ya has visto prueba hoy');
  });

  it('las categorías salen de España si el país no trae las de ese deporte', () => {
    expect(nueva().service<string>('prueba.categoria')).toBe('sub10');
  });

  it('el campamento de un deporte no mejora el campamento de otro', () => {
    const mod = modificadorDeCampamento(CONFIG);
    const ctx = {} as ReadContext;
    const accion = (tags: string[]) => ({ id: 'x', tags }) as unknown as ActionView;
    expect(mod.apply(ctx, accion(['campamento', 'prueba']))?.efficiency).toBe(1.2);
    expect(mod.apply(ctx, accion(['campamento', 'atletismo']))).toBeNull();
  });

  it('textos y clasificaciones comunes', () => {
    expect(textoDeSesiones({ weekdays: [0, 2], desde: 15, hasta: 17 })).toBe('lunes y miércoles de 15 a 17');
    const filas = Array.from({ length: 12 }, (_, i) => ({ yo: i === 11 }));
    const r = recorte(filas, (_f, puesto) => [String(puesto)]);
    expect(r.rows).toHaveLength(11);
    expect(r.rows[10]).toEqual(['12']);
    expect(r.highlight).toBe(10);
  });
});
