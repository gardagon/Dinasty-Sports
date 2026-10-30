import {
  APORTES,
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  datosDeDeporte,
  defineModule,
  fichasDeDeporte,
  type ClubAbandonoData,
  type ClubDeDeporte,
  type ClubDirectory,
  type ClubJoinData,
  type ClubLeaveData,
  type ClubView,
  type PaisDef,
  type ReadContext,
} from '@ds/contracts';

/**
 * MÓDULO CLUBES (id `clubes`).
 * Clubes en varios deportes: un club puede tener secciones en distintos deportes, y las secciones (sesiones, acceso, sedes) las trae cada deporte en sus
 * datos por país. El personaje empieza sin club; puede apuntarse al del colegio (entrenamientos de menor nivel) y pasar a clubes de fuera, más
 * profesionales y con prueba de acceso.
 *
 * El módulo arma el catálogo con lo que aportan los deportes, guarda las membresías y la calidad de cada club; el contenido de las sesiones y las pruebas de acceso lo
 * ponen los deportes (solo ellos saben qué se entrena y qué nivel tiene el personaje) y piden entrar o salir con
 * los eventos compartidos `club.unirse` y `club.salir`.
 */

export interface ClubesState {
  /** Club de cada deporte al que pertenece el personaje. */
  membresias: Record<string, { clubId: string; desde: number }>;
}

/**
 * El catálogo de clubes de la partida: lo arman las secciones que traen los deportes cargados, con los datos de su país (`DatosDeDeportePais.clubes`).
 * Un club puede tener secciones en varios deportes (el primero que lo define pone su nombre y su calidad). Se arma una vez por país y conjunto de datos.
 */
interface ClubArmado {
  id: string;
  nombre: string;
  esColegio: boolean;
  calidad: 1 | 2 | 3;
  /** Su sección en cada deporte. */
  secciones: Map<string, ClubDeDeporte>;
}
type Catalogo = Map<string, ClubArmado>;

const CATALOGOS = new WeakMap<PaisDef, WeakMap<readonly unknown[], Catalogo>>();

function catalogoDe(ctx: ReadContext): Catalogo {
  const claves = ctx.aportes(APORTES.datosDeDeporte);
  const porClave = CATALOGOS.get(ctx.pais) ?? new WeakMap<readonly unknown[], Catalogo>();
  CATALOGOS.set(ctx.pais, porClave);
  let c = porClave.get(claves);
  if (!c) {
    c = new Map();
    for (const ficha of fichasDeDeporte(ctx)) {
      for (const k of datosDeDeporte(ctx, ficha.id).clubes) {
        const club = c.get(k.id) ?? { id: k.id, nombre: k.nombre, esColegio: !!k.esColegio, calidad: k.calidad, secciones: new Map() };
        club.secciones.set(ficha.id, k);
        c.set(k.id, club);
      }
    }
    porClave.set(claves, c);
  }
  return c;
}

/** El club visto desde un deporte (con las sesiones, el acceso y los sitios de su sección); sin deporte, solo lo del club. */
function vista(club: ClubArmado, deporte: string): ClubView | undefined {
  const sec = club.secciones.get(deporte);
  if (!sec) return undefined;
  const acceso = Object.fromEntries([...club.secciones].filter(([, k]) => k.acceso).map(([d, k]) => [d, k.acceso!]));
  return {
    id: club.id,
    nombre: club.nombre,
    esColegio: club.esColegio,
    calidad: club.calidad,
    deportes: [...club.secciones.keys()],
    sesiones: sec.sesiones,
    ...(Object.keys(acceso).length ? { acceso } : {}),
    sede: sec.sede,
    tramites: sec.tramites,
  };
}

const club = (ctx: ReadContext, id: string): ClubArmado | undefined => catalogoDe(ctx).get(id);

/** Eficiencia de las sesiones de club según su calidad. */
const EFICIENCIA_POR_CALIDAD: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.12, 3: 1.25 };

/** Estrés de cambiarse de club sin haber dejado el anterior (ver `docs/ANEXO_DEPORTE.md`). */
export const ESTRES_POR_PLANTON = 10;

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
          const c = club(ctx, clubId);
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
      const nuevo = club(ctx, clubId);
      if (!nuevo || !nuevo.secciones.has(sport)) return;
      const previo = ctx.state<ClubesState>().membresias[sport];
      ctx.updateState<ClubesState>((s) => ({ membresias: { ...s.membresias, [sport]: { clubId, desde: ctx.time.day } } }));
      if (previo && previo.clubId !== clubId) {
        // Cambiar de club sin haber salido antes del que tenías es dejarlo plantado: estresa y lo notan su entrenador y su equipo.
        ctx.log(`Dejas ${club(ctx, previo.clubId)?.nombre ?? 'tu club'} sin avisar antes. No le ha sentado bien a nadie.`, 'aviso');
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
      ctx.log(`Dejas ${club(ctx, actual.clubId)?.nombre ?? 'tu club'}.`);
    },
  },

  services: {
    [SERVICES.clubes]: (ctx): ClubDirectory => {
      const m = ctx.state<ClubesState>().membresias;
      return {
        list: (sport) => [...catalogoDe(ctx).values()].flatMap((c) => vista(c, sport) ?? []),
        membership: (sport) => {
          const c = m[sport] ? club(ctx, m[sport].clubId) : undefined;
          const v = c && vista(c, sport);
          return v && { ...v, desde: m[sport].desde };
        },
      };
    },
  },
});

export default clubes;
