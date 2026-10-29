import {
  CIUDAD_INICIAL,
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
  type LlegadaData,
  type LugarDef,
  type LugaresService,
  type MapaCiudad,
  type PaisDef,
  type ReadContext,
} from '@ds/contracts';

/**
 * MÓDULO LUGARES (id `lugares`).
 * Dónde está el personaje y cuánto cuesta moverse. El mapa es un dato (`CIUDAD_INICIAL`, en contracts): lugares y caminos
 * con su duración. Ir a un sitio es una acción más (cuesta tiempo); el viaje rápido es la misma acción: el coste sale
 * de la tabla de tiempos del mapa. Aquí no hay horarios ni encuentros todavía.
 *
 * Los demás módulos no lo importan: ligan una acción a un sitio con `enLugar` (contracts) o consultan el servicio `lugares`.
 */

export interface LugaresState {
  /** Id del lugar donde está el personaje. */
  actual: string;
}

const MAPA: MapaCiudad = CIUDAD_INICIAL;

/**
 * Los lugares con los horarios del país de la partida (`PaisDef.horarios`): el mapa es el mismo en todos los países y solo cambian las horas de apertura.
 * Se calcula una vez por país; si no cambia ninguno (España), son los del mapa tal cual.
 */
const LUGARES_POR_PAIS = new WeakMap<PaisDef, { lista: readonly LugarDef[]; porId: Map<string, LugarDef> }>();
function lugaresDe(pais: PaisDef): { lista: readonly LugarDef[]; porId: Map<string, LugarDef> } {
  let r = LUGARES_POR_PAIS.get(pais);
  if (!r) {
    const cambia = MAPA.lugares.some((l) => pais.horarios[l.id] !== undefined && pais.horarios[l.id] !== l.horario);
    const lista = cambia ? MAPA.lugares.map((l) => (pais.horarios[l.id] !== undefined ? { ...l, horario: pais.horarios[l.id] } : l)) : MAPA.lugares;
    LUGARES_POR_PAIS.set(pais, (r = { lista, porId: new Map(lista.map((l) => [l.id, l])) }));
  }
  return r;
}

const lugarDe = (ctx: ReadContext, id: string): LugarDef | undefined => lugaresDe(ctx.pais).porId.get(id);
/** Un lugar del mapa (sin país: para lo que no depende de los horarios). */
const lugar = (id: string): LugarDef | undefined => MAPA.lugares.find((l) => l.id === id);

const dondeEsta = (ctx: ReadContext): LugarDef => lugarDe(ctx, ctx.state<LugaresState>().actual) ?? lugarDe(ctx, MAPA.inicio)!;

/** Una acción de ir a cada sitio. Se crean una vez y se reutilizan (la acción lee el origen del estado al ejecutarse). */
const ACCIONES: readonly ActionDef[] = MAPA.lugares.map((destino) => ({
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

export const lugares = defineModule<LugaresState>({
  id: 'lugares',
  name: 'Lugares',
  description: 'Dónde estás y cuánto cuesta ir de un sitio a otro.',
  dependsOn: ['gen'],
  initState: () => ({ actual: MAPA.inicio }),
  actions: [...ACCIONES],

  services: {
    [SERVICES.lugares]: (ctx): LugaresService => ({
      actual: () => dondeEsta(ctx),
      lugar: (id) => lugarDe(ctx, id),
      lugares: () => lugaresDe(ctx.pais).lista,
      pasos: () => pasosDesde(MAPA, dondeEsta(ctx).id).map((v) => ({ lugar: lugarDe(ctx, v.lugar)!, minutos: v.minutos, tipo: v.tipo })),
      minutosA: (hasta) => tiempoEntre(MAPA, dondeEsta(ctx).id, hasta),
      casa: () => lugarDe(ctx, MAPA.casa)!,
    }),
  },
});

export default lugares;
