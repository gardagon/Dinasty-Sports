import {
  CATALOGO_DE_DEPORTES,
  MAX_DEPORTES_PRACTICADOS,
  SERVICES,
  SHARED_EVENTS,
  defineModule,
  type ActionContext,
  type ActionDef,
  type ClubLeaveData,
  type DeporteData,
  type PracticaService,
  type ReadContext,
  type TramoDeDeporte,
} from '@ds/contracts';

/**
 * MÓDULO DEPORTES (id `deportes`): qué deporte practica el personaje.
 *
 * El personaje compite en uno solo (o en ninguno) y puede cambiarlo cuando quiera, sin coste. Este módulo guarda cuál es y su historial,
 * publica el servicio `practica` (que cada deporte consulta para ocultar sus acciones y su pestaña mientras no se practica) y ofrece las
 * acciones «Empezar el X» y «Dejar el X». Los emite como eventos compartidos `deporte.empezar` y `deporte.dejar`. Dejar un deporte
 * también lo saca de su club (`club.salir`); sus habilidades caen con la caída normal y su historial, sus relaciones y sus resultados se conservan.
 * No sabe nada de ningún deporte concreto: la lista sale de `CATALOGO_DE_DEPORTES` (contracts) y de los módulos cargados.
 * Plan: `docs/PLAN_DEPORTES_MODULARES.md` §2 y fase 0.
 */

export interface DeportesState {
  /** Deporte que practica ahora, o `null`. */
  practicado: string | null;
  /** Cada vez que empezó y dejó un deporte (el curso es 0 para el primero). */
  historial: TramoDeDeporte[];
}

const MINUTOS_DE_TRAMITE = 15;

/** Deportes del catálogo que están cargados en la partida. */
const instalados = (ctx: ReadContext) => CATALOGO_DE_DEPORTES.filter((d) => ctx.hasModule(d.id));
const conArticulo = (nombre: string) => `el ${nombre.toLowerCase()}`;

function empezar(deporte: { id: string; nombre: string }, actual: string | null, nombreActual: string | undefined): ActionDef {
  return {
    id: `deportes.empezar.${deporte.id}`,
    name: actual ? `Dejar ${conArticulo(nombreActual ?? actual)} y empezar ${conArticulo(deporte.nombre)}` : `Empezar ${conArticulo(deporte.nombre)}`,
    description: actual
      ? `Solo se practica un deporte a la vez: dejas ${conArticulo(nombreActual ?? actual)} (sales de su club; sus habilidades caen poco a poco y no pierdes tu historial) y empiezas ${conArticulo(deporte.nombre)}, sin club al principio.`
      : `Empiezas a practicar ${conArticulo(deporte.nombre)}: vuelven sus acciones y su pestaña. Si ya lo practicaste, recuperas tu historial.`,
    tags: ['deportes'],
    group: 'Deporte',
    duration: MINUTOS_DE_TRAMITE,
    available: () => true,
    run: (ctx) => {
      const previo = ctx.state<DeportesState>().practicado;
      if (previo) dejar(ctx, previo);
      comenzar(ctx, deporte.id);
    },
  };
}

function dejarAccion(deporte: { id: string; nombre: string }): ActionDef {
  return {
    id: 'deportes.dejar',
    name: `Dejar ${conArticulo(deporte.nombre)}`,
    description: `Dejas de practicar ${conArticulo(deporte.nombre)}: sales de su club, sus acciones y su pestaña desaparecen y sus habilidades caen poco a poco. No pierdes tu historial ni tus relaciones; puedes volver cuando quieras.`,
    tags: ['deportes'],
    group: 'Deporte',
    duration: MINUTOS_DE_TRAMITE,
    available: () => true,
    run: (ctx) => dejar(ctx, deporte.id),
  };
}

function comenzar(ctx: ActionContext, deporte: string): void {
  ctx.updateState<DeportesState>((s) => ({ practicado: deporte, historial: [...s.historial, { deporte, desde: ctx.time.schoolYear }] }));
  ctx.emit<DeporteData>({ type: SHARED_EVENTS.DEPORTE_EMPEZAR, data: { sport: deporte } });
}

function dejar(ctx: ActionContext, deporte: string): void {
  ctx.updateState<DeportesState>((s) => ({
    practicado: null,
    historial: s.historial.map((t) => (t.deporte === deporte && t.hasta === undefined ? { ...t, hasta: ctx.time.schoolYear } : t)),
  }));
  // Sin club: se sale del que tuviera (sin plantón: se deja antes de cambiar).
  ctx.emit<ClubLeaveData>({ type: SHARED_EVENTS.CLUB_LEAVE, data: { sport: deporte } });
  ctx.emit<DeporteData>({ type: SHARED_EVENTS.DEPORTE_DEJAR, data: { sport: deporte } });
}

export const deportes = defineModule<DeportesState>({
  id: 'deportes',
  name: 'Deportes',
  description: 'Qué deporte practicas: empezar, dejar y cambiar.',
  dependsOn: ['gen'],

  // Sin elegir, se empieza con el primero del catálogo (con el atletismo como único deporte, es como antes de existir este módulo).
  initState: (ctx) => {
    const deporte = ctx.deporte === undefined ? (CATALOGO_DE_DEPORTES[0]?.id ?? null) : ctx.deporte;
    return { practicado: deporte, historial: deporte ? [{ deporte, desde: 0 }] : [] };
  },

  dynamicActions: (ctx) => {
    const actual = ctx.state<DeportesState>().practicado;
    const lista = instalados(ctx);
    const nombreActual = lista.find((d) => d.id === actual)?.nombre;
    const otros = lista.filter((d) => d.id !== actual).map((d) => empezar(d, actual, nombreActual));
    // Solo se puede dejar un deporte cargado en la partida.
    return actual && nombreActual && MAX_DEPORTES_PRACTICADOS === 1 ? [dejarAccion({ id: actual, nombre: nombreActual }), ...otros] : otros;
  },

  services: {
    [SERVICES.practica]: (ctx): PracticaService => {
      const s = ctx.state<DeportesState>();
      return { practicado: () => s.practicado, practica: (d) => s.practicado === d, historial: () => s.historial };
    },
  },
});

export default deportes;
