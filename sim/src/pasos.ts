import { SERVICES, faltaViajar, rutaA, type ActionDef, type LugaresService } from '@ds/contracts';
import type { ActionOption, ActionResult, Game } from '@ds/core';

/**
 * Los bots no piensan en el mapa: eligen entre lo que se podría hacer y, si hace falta, el simulador los lleva antes
 * al sitio (como haría una persona). Se les ofrece lo disponible y lo que solo está bloqueado por el lugar; los
 * desplazamientos no se les ofrecen (los hace el simulador).
 */
/** Las presentaciones que sí se ofrecen: las del reparto inicial (los bots tienen que conocer a su tutor y a sus compañeros). */
const PRESENTACIONES_DEL_REPARTO = /^relaciones\.presentarse\.(entrenador|tutor|companero_estudio|companero_social)$/;

/** Las acciones de relación que se ofrecen siempre, como en la pantalla principal de la interfaz (`apps/web/src/main.ts`): charlar antes de clase y jugar con otros niños; más las presentaciones del reparto. */
const SIEMPRE_OFRECIDAS = /^relaciones\.(al_azar|jugar_con_otros)$/;
const esDeRelacion = (idDeAccion: string) => idDeAccion.startsWith('relaciones.');
const sePuedeHacer = (o: ActionOption) => o.available || faltaViajar(o);

/** Un número de usos por acción (lo que los bots reparten): `mem.total`. */
type Usos = Readonly<Record<string, number>>;

/**
 * Las acciones de relación con cada persona, **sin evaluar**. La interfaz no las evalúa todas: las de una persona solo cuando se abre su ficha. Los bots tampoco: las eligen por su rotación
 * (la menos usada que cumpla lo que quiere el plan) y evalúan solo las primeras por ese orden, por lotes, hasta encontrar una que se pueda hacer. Es la misma elección que si las evaluaran
 * todas (la menos usada de las que se pueden hacer; a igual uso, la primera del orden del juego), a una fracción del coste: cada persona que conocen suma unas diez acciones.
 */
export class RelacionesPerezosas {
  private evaluadas = new Map<string, ActionOption | null>();
  constructor(private game: Game, private defs: readonly ActionDef[]) {}

  /** Lo que se sabe de una acción sin evaluarla: su id, su nombre y sus etiquetas (lo que miran los bots para elegir). */
  private static esbozo(d: ActionDef): ActionOption {
    return { id: d.id, name: d.name, module: 'relaciones', group: d.group ?? '', tags: d.tags, available: true, duration: 0, efficiency: 1, modifiers: [], delta: {}, train: [] } as ActionOption;
  }

  /** La menos usada de las que cumplen `quiere` y se pueden hacer (o solo falta ir al sitio), o `undefined`. A igual uso, la primera del orden del juego. */
  menosUsada(quiere: (o: ActionOption) => boolean, usos: Usos): ActionOption | undefined {
    return this.primeraPor(quiere, (x, y) => (usos[x.d.id] ?? 0) - (usos[y.d.id] ?? 0) || x.i - y.i);
  }

  /** La primera del orden del juego que cumple `quiere` y se puede hacer (o solo falta ir al sitio), o `undefined`. */
  primera(quiere: (o: ActionOption) => boolean): ActionOption | undefined {
    return this.primeraPor(quiere, (x, y) => x.i - y.i);
  }

  /** Evalúa por lotes (de `LOTE` acciones) las candidatas por el orden dado y devuelve la primera que se puede hacer. */
  private primeraPor(quiere: (o: ActionOption) => boolean, orden: (x: { d: ActionDef; i: number }, y: { d: ActionDef; i: number }) => number): ActionOption | undefined {
    const candidatas = this.defs
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => quiere(RelacionesPerezosas.esbozo(d)))
      .sort(orden);
    const LOTE = 40;
    for (let desde = 0; desde < candidatas.length; desde += LOTE) {
      const lote = candidatas.slice(desde, desde + LOTE);
      const faltan = new Set(lote.map(({ d }) => d.id).filter((i) => !this.evaluadas.has(i)));
      if (faltan.size) {
        for (const o of this.game.listActions({ omitir: (d) => !faltan.has(d.id) })) this.evaluadas.set(o.id, sePuedeHacer(o) ? o : null);
        for (const i of faltan) if (!this.evaluadas.has(i)) this.evaluadas.set(i, null);
      }
      for (const { d } of lote) {
        const o = this.evaluadas.get(d.id);
        if (o) return o;
      }
    }
    return undefined;
  }
}

/** Lo que se ofrece a un bot: lo que ofrece la interfaz (evaluado) y, aparte, las acciones de relación con cada persona (sin evaluar, `RelacionesPerezosas`). */
export interface OpcionesDelBot extends Array<ActionOption> {
  relaciones?: RelacionesPerezosas;
}

/**
 * Lo que puede hacer un bot ahora: lo que se puede hacer o solo falta ir al sitio, **evaluado como lo evalúa la pantalla principal de la interfaz**: sin las acciones de cada persona (salvo
 * charlar antes de clase, jugar con otros niños y las presentaciones del reparto), que se piden aparte, solo las que hacen falta (`opciones.relaciones`). Con `completa` se evalúa todo
 * (el bot que elige al azar entre todas las acciones).
 */
export function opcionesDelBot(game: Game, completa = false): OpcionesDelBot {
  // Los desplazamientos y las presentaciones (hasta 40 acciones por lugar) no se les ofrecen: ni siquiera se evalúan.
  const aparte: ActionDef[] = [];
  const omitir = (d: ActionDef) => {
    // Los deberes (30 minutos) son para esperar al entrenamiento: los bots estudian en sesiones largas y no los piden.
    if (!completa && d.id.startsWith('estudios.deberes_')) return true;
    if (d.id.startsWith('lugares.') || (d.id.startsWith('relaciones.presentarse.') && !PRESENTACIONES_DEL_REPARTO.test(d.id))) return true;
    if (completa || !esDeRelacion(d.id) || SIEMPRE_OFRECIDAS.test(d.id) || PRESENTACIONES_DEL_REPARTO.test(d.id)) return false;
    aparte.push(d);
    return true;
  };
  const opciones: OpcionesDelBot = game.listActions({ omitir }).filter(sePuedeHacer);
  if (!completa) opciones.relaciones = new RelacionesPerezosas(game, aparte);
  return opciones;
}

export interface Paso {
  result: ActionResult;
  /** Minutos que se han ido en viajar antes de la acción. */
  viaje: number;
  /** La acción no se pudo hacer tras el viaje (pasó la hora, p. ej.): no es un fallo del bot. */
  traslado: boolean;
}

/** Hace lo elegido, viajando antes si solo faltaba estar en el sitio. */
export function hacer(game: Game, opts: readonly ActionOption[], choice: string): Paso {
  const opt = opts.find((o) => o.id === choice);
  let viaje = 0;
  if (opt && faltaViajar(opt)) {
    // Los destinos que hacen falta (una zona, como el aula, se alcanza desde la entrada de su lugar).
    const lugares = game.service<LugaresService>(SERVICES.lugares)!;
    for (const parada of rutaA(lugares.mapa(), lugares.actual().id, opt.lugar![0])) {
      const v = game.perform(`lugares.ir_${parada}`);
      if (!v.ok) return { result: v, viaje, traslado: false };
      viaje += v.duration;
    }
  }
  const result = game.perform(choice);
  return { result, viaje, traslado: viaje > 0 && !result.ok };
}
