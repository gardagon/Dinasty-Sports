import {
  APORTES,
  CIUDAD_INICIAL,
  ensamblarMapa,
  LUGARES_EVENTS,
  SERVICES,
  abiertoEn,
  defineModule,
  timeView,
  tiempoEntre,
  pasosDesde,
  sePuedeIr,
  tipoDeSitio,
  type ActionDef,
  type AporteDeLugares,
  type LlegadaData,
  type LugarDef,
  type LugaresService,
  type MapaCiudad,
  type PaisDef,
  type ReadContext,
} from '@ds/contracts';

/**
 * MÓDULO LUGARES (id `lugares`).
 * Dónde está el personaje y cuánto cuesta moverse. El mapa es un dato (`CIUDAD_INICIAL`, en contracts, más los sitios que aporta cada deporte cargado): lugares y caminos
 * con su duración. Ir a un sitio es una acción más (cuesta tiempo); el viaje rápido es la misma acción: el coste sale
 * de la tabla de tiempos del mapa. Aquí no hay horarios ni encuentros todavía.
 *
 * Los demás módulos no lo importan: ligan una acción a un sitio con `enLugar` (contracts) o consultan el servicio `lugares`.
 */

export interface LugaresState {
  /** Id del lugar donde está el personaje. */
  actual: string;
}

/**
 * La ciudad de la partida: el mapa base más los sitios que ponen los deportes cargados (`AporteDeLugares`), con una acción de ir a cada sitio.
 * Los horarios del país (`PaisDef.horarios`) se aplican aparte, al consultar (el mapa es el mismo en todos los países).
 */
interface Ciudad {
  mapa: MapaCiudad;
  acciones: ActionDef[];
  /** Un lugar del mapa (sin país: para lo que no depende de los horarios). */
  lugar(id: string): LugarDef | undefined;
}
/** La ciudad se arma una vez por conjunto de aportes (se reconoce por los propios aportes, así que dos partidas con los mismos deportes comparten ciudad). */
interface Nodo {
  hijos: WeakMap<object, Nodo>;
  ciudad?: Ciudad;
}
const RAIZ: Nodo = { hijos: new WeakMap() };

function ciudadDe(aportes: readonly unknown[]): Ciudad {
  let n = RAIZ;
  for (const a of aportes) {
    let h = n.hijos.get(a as object);
    if (!h) n.hijos.set(a as object, (h = { hijos: new WeakMap() }));
    n = h;
  }
  if (!n.ciudad) {
    const mapa = ensamblarMapa(CIUDAD_INICIAL, aportes as readonly AporteDeLugares[]);
    const porId = new Map(mapa.lugares.map((l) => [l.id, l]));
    n.ciudad = { mapa, acciones: accionesDeIr(mapa, (id) => porId.get(id)), lugar: (id) => porId.get(id) };
  }
  return n.ciudad;
}

const ciudad = (ctx: ReadContext): Ciudad => ciudadDe(ctx.aportes(APORTES.lugaresDeDeporte));

/**
 * Los lugares con los horarios del país de la partida (`PaisDef.horarios`): el mapa es el mismo en todos los países y solo cambian las horas de apertura.
 * Se calcula una vez por país y mapa; si no cambia ninguno (España), son los del mapa tal cual.
 */
const LUGARES_POR_PAIS = new WeakMap<PaisDef, WeakMap<MapaCiudad, { lista: readonly LugarDef[]; porId: Map<string, LugarDef> }>>();
function lugaresDe(pais: PaisDef, mapa: MapaCiudad): { lista: readonly LugarDef[]; porId: Map<string, LugarDef> } {
  const porMapa = LUGARES_POR_PAIS.get(pais) ?? new WeakMap();
  LUGARES_POR_PAIS.set(pais, porMapa);
  let r = porMapa.get(mapa);
  if (!r) {
    const cambia = mapa.lugares.some((l) => pais.horarios[l.id] !== undefined && pais.horarios[l.id] !== l.horario);
    const lista = cambia ? mapa.lugares.map((l) => (pais.horarios[l.id] !== undefined ? { ...l, horario: pais.horarios[l.id] } : l)) : mapa.lugares;
    porMapa.set(mapa, (r = { lista, porId: new Map(lista.map((l) => [l.id, l])) }));
  }
  return r;
}

const lugarDe = (ctx: ReadContext, id: string): LugarDef | undefined => lugaresDe(ctx.pais, ciudad(ctx).mapa).porId.get(id);

const dondeEsta = (ctx: ReadContext): LugarDef => lugarDe(ctx, ctx.state<LugaresState>().actual) ?? lugarDe(ctx, CIUDAD_INICIAL.inicio)!;

/** Una acción de ir a cada sitio. La acción lee el origen del estado al ejecutarse y el mapa, del contexto. */
function accionesDeIr(MAPA: MapaCiudad, lugar: (id: string) => LugarDef | undefined): ActionDef[] {
  return MAPA.lugares.map((destino) => ({
    id: `lugares.ir_${destino.id}`,
    name: destino.calle ? `Ir a ${destino.name}` : `Ir a ${destino.name.toLowerCase()}`,
    description: destino.descripcion,
    tags: ['desplazamiento'],
    group: destino.grupo,
    duration: (ctx) => {
      return tiempoEntre(MAPA, dondeEsta(ctx).id, destino.id) ?? 1;
    },
    available: (ctx) => {
      const aqui = dondeEsta(ctx);
      if (aqui.id === destino.id) return `Ya estás en ${destino.name.toLowerCase()}`;
      const minutos = tiempoEntre(MAPA, aqui.id, destino.id);
      if (minutos === undefined) return 'No hay camino';
      // Las calles y las zonas se alcanzan paso a paso; solo los lugares, con el viaje rápido.
      if (!sePuedeIr(MAPA, aqui.id, destino.id)) {
        const tipo = tipoDeSitio(destino);
        if (tipo === 'lugar') return `El viaje rápido solo se hace desde la calle: sal primero de ${aqui.name.toLowerCase()}`;
        if (tipo === 'zona') return `Para entrar en ${destino.name.toLowerCase()} hay que estar en ${lugar(destino.dentroDe!)?.name.toLowerCase()}`;
        return `Para llegar a ${destino.name.toLowerCase()} hay que estar en una de sus calles vecinas o en un lugar que dé a ella`;
      }
      // Salir (a la entrada del lugar o a su calle) nunca está cerrado: si se cierra con el personaje dentro, tiene que poder irse.
      if (aqui.dentroDe === destino.id || aqui.enCalle === destino.id) return true;
      // Cerrado a la hora a la que se llegaría: no desaparece, pero no se puede ir (y se dice cuándo abre).
      const llegada = ctx.timeAt(ctx.time.minute + minutos);
      const abre = lugarDe(ctx, destino.id) ?? destino;
      return abiertoEn(abre, llegada) ? true : `${destino.name} estará cerrado cuando llegues (abre ${abre.horario!.texto})`;
    },
    run: (ctx) => {
      const desde = dondeEsta(ctx).id;
      const minutos = tiempoEntre(MAPA, desde, destino.id) ?? 0;
      ctx.setState<LugaresState>({ actual: destino.id });
      ctx.emit<LlegadaData>({ type: LUGARES_EVENTS.LLEGADA, data: { desde, hasta: destino.id, minutos } });
    },
  }));
}

export const lugares = defineModule<LugaresState>({
  id: 'lugares',
  name: 'Lugares',
  description: 'Dónde estás y cuánto cuesta ir de un sitio a otro.',
  dependsOn: ['gen'],
  initState: () => ({ actual: CIUDAD_INICIAL.inicio }),
  // Ir a cada sitio del mapa de la partida (el base y los de los deportes cargados).
  accionesSegunAportes: (aporte) => ciudadDe(aporte(APORTES.lugaresDeDeporte)).acciones,

  services: {
    [SERVICES.lugares]: (ctx): LugaresService => ({
      actual: () => dondeEsta(ctx),
      lugar: (id) => lugarDe(ctx, id),
      lugares: () => lugaresDe(ctx.pais, ciudad(ctx).mapa).lista,
      pasos: () => pasosDesde(ciudad(ctx).mapa, dondeEsta(ctx).id).map((v) => ({ lugar: lugarDe(ctx, v.lugar)!, minutos: v.minutos, tipo: v.tipo })),
      minutosA: (hasta) => tiempoEntre(ciudad(ctx).mapa, dondeEsta(ctx).id, hasta),
      casa: () => lugarDe(ctx, CIUDAD_INICIAL.casa)!,
      mapa: () => ciudad(ctx).mapa,
    }),
  },
});

export default lugares;
