import {
  CIUDAD_INICIAL,
  LUGARES_EVENTS,
  SERVICES,
  defineModule,
  rutaMasCorta,
  vecinosDe,
  type ActionDef,
  type LlegadaData,
  type LugarDef,
  type LugaresService,
  type MapaCiudad,
  type Ruta,
  type ReadContext,
} from '@ds/contracts';

/**
 * MÓDULO LUGARES (id `lugares`).
 * Dónde está el personaje y cuánto cuesta moverse. El mapa es un dato (`CIUDAD_INICIAL`, en contracts): lugares y caminos
 * con su duración. Ir a un sitio es una acción más (cuesta tiempo); el viaje rápido es la misma acción con el coste de
 * la ruta más corta. Aquí no hay horarios ni encuentros todavía.
 *
 * Los demás módulos no lo importan: ligan una acción a un sitio con `enLugar` (contracts) o consultan el servicio `lugares`.
 */

export interface LugaresState {
  /** Id del lugar donde está el personaje. */
  actual: string;
}

const MAPA: MapaCiudad = CIUDAD_INICIAL;

/** El mapa no cambia en partida: cada ruta se calcula una vez (las acciones se evalúan muchas veces al día). */
const RUTAS = new Map<string, Ruta | null>();
const ruta = (desde: string, hasta: string): Ruta | null => {
  const clave = `${desde}>${hasta}`;
  if (!RUTAS.has(clave)) RUTAS.set(clave, rutaMasCorta(MAPA, desde, hasta));
  return RUTAS.get(clave)!;
};

const lugar = (id: string): LugarDef | undefined => MAPA.lugares.find((l) => l.id === id);

const dondeEsta = (ctx: ReadContext): LugarDef => lugar(ctx.state<LugaresState>().actual) ?? lugar(MAPA.inicio)!;

/** Una acción de ir a cada sitio. Se crean una vez y se reutilizan (la acción lee el origen del estado al ejecutarse). */
const ACCIONES: readonly ActionDef[] = MAPA.lugares.map((destino) => ({
  id: `lugares.ir_${destino.id}`,
  name: `Ir a ${destino.name.toLowerCase()}`,
  description: destino.descripcion,
  tags: ['desplazamiento'],
  group: destino.grupo,
  duration: (ctx) => {
    return ruta(dondeEsta(ctx).id, destino.id)?.minutos ?? 1;
  },
  available: (ctx) => {
    const aqui = dondeEsta(ctx);
    if (aqui.id === destino.id) return `Ya estás en ${destino.name.toLowerCase()}`;
    return ruta(aqui.id, destino.id) ? true : 'No hay camino';
  },
  run: (ctx) => {
    const desde = dondeEsta(ctx).id;
    const minutos = ruta(desde, destino.id)?.minutos ?? 0;
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
      vecinos: () => vecinosDe(MAPA, dondeEsta(ctx).id).map((v) => ({ lugar: lugar(v.lugar)!, minutos: v.minutos })),
      ruta: (hasta) => ruta(dondeEsta(ctx).id, hasta),
      casa: () => lugar(MAPA.casa)!,
    }),
  },
});

export default lugares;
