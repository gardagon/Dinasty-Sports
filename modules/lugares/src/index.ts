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

const lugar = (id: string): LugarDef | undefined => MAPA.lugares.find((l) => l.id === id);

const dondeEsta = (ctx: ReadContext): LugarDef => lugar(ctx.state<LugaresState>().actual) ?? lugar(MAPA.inicio)!;

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
    const llegada = timeView(ctx.time.minute + minutos);
    return abiertoEn(destino, llegada) ? true : `${destino.name} estará cerrado cuando llegues (abre ${destino.horario!.texto})`;
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
      lugar,
      lugares: () => MAPA.lugares,
      pasos: () => pasosDesde(MAPA, dondeEsta(ctx).id).map((v) => ({ lugar: lugar(v.lugar)!, minutos: v.minutos, tipo: v.tipo })),
      minutosA: (hasta) => tiempoEntre(MAPA, dondeEsta(ctx).id, hasta),
      casa: () => lugar(MAPA.casa)!,
    }),
  },
});

export default lugares;
