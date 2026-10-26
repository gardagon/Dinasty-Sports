import { GEN, SERVICES, SHARED_EVENTS, TAGS, defineModule, type ClubAbandonoData, type ClubDirectory, type ClubJoinData, type ClubLeaveData, type ClubView } from '@ds/contracts';

/**
 * MÓDULO CLUBES (id `clubes`).
 * Clubes en varios deportes: un club puede tener secciones en distintos deportes. El personaje empieza en el club del
 * colegio (entrenamientos de menor nivel) y puede pasar a clubes de fuera, más profesionales y con prueba de acceso.
 *
 * El módulo guarda las membresías y la calidad de cada club; el contenido de las sesiones y las pruebas de acceso lo
 * ponen los deportes (solo ellos saben qué se entrena y qué nivel tiene el personaje) y piden entrar o salir con
 * los eventos compartidos `club.unirse` y `club.salir`.
 */

export interface ClubesState {
  /** Club de cada deporte al que pertenece el personaje. */
  membresias: Record<string, { clubId: string; desde: number }>;
}

/** Catálogo de España. Es un dato: otro país tendría sus propios clubes. */
export const CLUBES_ESPANA: readonly ClubView[] = [
  {
    id: 'colegio',
    nombre: 'Club deportivo del colegio',
    esColegio: true,
    calidad: 1,
    deportes: ['atletismo'],
    sesiones: { weekdays: [0, 2], desde: 15, hasta: 17 },
  },
  {
    id: 'club_ciudad',
    nombre: 'Club Atletismo Ciudad',
    esColegio: false,
    calidad: 2,
    deportes: ['atletismo'],
    sesiones: { weekdays: [1, 3], desde: 18, hasta: 20 },
    acceso: { atletismo: { nivel: 45, edadMin: 10 } },
  },
  {
    id: 'club_alto_rendimiento',
    nombre: 'Club de Alto Rendimiento',
    esColegio: false,
    calidad: 3,
    deportes: ['atletismo'],
    sesiones: { weekdays: [0, 1, 3], desde: 17, hasta: 20 },
    acceso: { atletismo: { nivel: 65, edadMin: 14 } },
  },
];

/** Eficiencia de las sesiones de club según su calidad. */
const EFICIENCIA_POR_CALIDAD: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.12, 3: 1.25 };

/** Estrés de cambiarse de club sin haber dejado el anterior (ver `docs/ANEXO_DEPORTE.md`). */
export const ESTRES_POR_PLANTON = 10;

const club = (id: string) => CLUBES_ESPANA.find((c) => c.id === id);

export const clubes = defineModule<ClubesState>({
  id: 'clubes',
  name: 'Clubes',
  description: 'Clubes deportivos: el del colegio y los de fuera.',
  dependsOn: ['gen'],
  initState: () => ({ membresias: {} }),

  modifiers: [
    {
      id: 'clubes.calidad',
      tags: [TAGS.club],
      apply: (ctx, action) => {
        const m = ctx.state<ClubesState>().membresias;
        for (const [sport, { clubId }] of Object.entries(m)) {
          if (!action.tags.includes(sport)) continue;
          const c = club(clubId);
          if (!c || c.calidad === 1) return null;
          return { efficiency: EFICIENCIA_POR_CALIDAD[c.calidad], reason: `Entrenas en ${c.nombre}` };
        }
        return null;
      },
    },
  ],

  on: {
    [SHARED_EVENTS.CLUB_JOIN]: (ctx, ev) => {
      const { sport, clubId } = ev.data as ClubJoinData;
      const nuevo = club(clubId);
      if (!nuevo || !nuevo.deportes.includes(sport)) return;
      const previo = ctx.state<ClubesState>().membresias[sport];
      ctx.updateState<ClubesState>((s) => ({ membresias: { ...s.membresias, [sport]: { clubId, desde: ctx.time.day } } }));
      if (previo && previo.clubId !== clubId) {
        // Cambiar de club sin haber salido antes del que tenías es dejarlo plantado: estresa y lo notan su entrenador y su equipo.
        ctx.log(`Dejas ${club(previo.clubId)?.nombre ?? 'tu club'} sin avisar antes. No le ha sentado bien a nadie.`, 'aviso');
        ctx.addStat(GEN.estres, ESTRES_POR_PLANTON);
        ctx.emit<ClubAbandonoData>({ type: SHARED_EVENTS.CLUB_ABANDONO, data: { sport, clubId: previo.clubId } });
      }
      ctx.log(nuevo.esColegio ? `Te apuntas al ${nuevo.nombre.toLowerCase()}.` : `¡Ya eres del ${nuevo.nombre}!`, 'logro');
    },
    [SHARED_EVENTS.CLUB_LEAVE]: (ctx, ev) => {
      const { sport } = ev.data as ClubLeaveData;
      const actual = ctx.state<ClubesState>().membresias[sport];
      if (!actual) return;
      ctx.updateState<ClubesState>((s) => {
        const { [sport]: _fuera, ...resto } = s.membresias;
        return { membresias: resto };
      });
      ctx.log(`Dejas ${club(actual.clubId)?.nombre ?? 'tu club'}.`);
    },
  },

  services: {
    [SERVICES.clubes]: (ctx): ClubDirectory => {
      const m = ctx.state<ClubesState>().membresias;
      return {
        list: (sport) => CLUBES_ESPANA.filter((c) => c.deportes.includes(sport)),
        membership: (sport) => (m[sport] ? club(m[sport].clubId) : undefined),
      };
    },
  },
});

export default clubes;
