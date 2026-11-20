import { SERVICES, faltaViajar, rutaA, tiempoEntre, type LugaresService, type SucesosService } from '@ds/contracts';
import type { ActionResult, Game } from '@ds/core';
import { cargarPartida } from '@ds/game';
import { edadNpc, sinDeporte, type NpcsState } from '@ds/mod-npcs';
import type { GameModule } from '@ds/contracts';

/** Va a un sitio por el camino que permite el mapa (una zona, desde la entrada de su lugar). */
export function viajarA(game: Game, lugar: string): void {
  const lugares = game.service<LugaresService>(SERVICES.lugares)!;
  for (const parada of rutaA(lugares.mapa(), lugares.actual().id, lugar)) game.perform(`lugares.ir_${parada}`);
}

/** Hace una acción viajando antes al sitio si solo faltaba estar allí (los tests no piensan en el mapa). */
export function hacer(game: Game, id: string): ActionResult {
  const o = game.preview(id);
  if (o && faltaViajar(o)) viajarA(game, o.lugar![0]);
  return game.perform(id);
}

/** ¿Está disponible esta acción o solo falta ir al sitio? */
export function posible(game: Game, id: string): boolean {
  const o = game.preview(id);
  return !!o && (o.available || faltaViajar(o));
}

const DEL_REPARTO = ['entrenador', 'tutor', 'companero_estudio', 'companero_social'];

/** Da por conocidas a estas personas (por defecto, las cuatro del reparto inicial): los tests no siempre empiezan preguntando nombres. */
export function conocer(game: Game, ...ids: string[]): Game {
  const s = game.moduleState<{ npcs: { id: string; known?: boolean }[] }>('npcs') as { npcs: { id: string; known?: boolean }[] };
  const quienes = ids.length ? ids : DEL_REPARTO;
  s.npcs = s.npcs.map((n) => (quienes.includes(n.id) ? { ...n, known: true } : n));
  return game;
}

/**
 * Espera (de 5 en 5 minutos) en el sitio donde se está y viaja de modo que se llegue a `lugar` a la hora indicada (o en cuanto se pueda, si ya
 * es tarde). Los tests de horarios de colegio necesitan caer en una ventana de minutos concreta (7:50, el recreo...).
 */
export function llegarA(game: Game, lugar: string, hora: number, minuto = 0): void {
  const lugares = game.service<LugaresService>(SERVICES.lugares)!;
  const mapa = lugares.mapa();
  let previo = lugares.actual().id;
  let viaje = 0;
  for (const parada of rutaA(mapa, previo, lugar)) {
    viaje += tiempoEntre(mapa, previo, parada) ?? 0;
    previo = parada;
  }
  while (game.time.minuteOfDay + viaje < hora * 60 + minuto && game.perform('gen.esperar').ok) {
    /* esperar */
  }
  viajarA(game, lugar);
}

/**
 * La prueba de acceso de un club con puestos, de principio a fin: pedirla, unirse al entrenamiento, decidir lo que pregunte el entrenador (con `elige`: la opción; si no, la primera que se pueda) y entrenar a prueba.
 * Devuelve el resultado de la última acción hecha (la de entrenar, o la que falló).
 */
export function hacerPruebaDeAcceso(game: Game, club: string, elige?: string): ActionResult {
  const pendientes = () => game.service<SucesosService>(SERVICES.sucesos)!.pendientes().filter((p) => p.suceso.endsWith('.prueba_de_acceso'));
  for (const paso of [`futbol.pedir_prueba.${club}`, `futbol.prueba.${club}`]) {
    const r = hacer(game, paso);
    if (!r.ok) return r;
  }
  for (const p of pendientes()) {
    const o = (elige ? p.opciones.find((x) => x.id === elige) : undefined) ?? p.opciones.find((x) => x.elegible);
    if (o) game.perform(o.accion);
  }
  return hacer(game, `futbol.prueba_entrenar.${club}`);
}


/**
 * La misma partida con el personaje fuerte en el fútbol (velocidad, resistencia y todas las habilidades de fútbol al `nivel`): con los equipos de los colegios llenos (el reparto de 17/11/2026) un
 * personaje del montón puede quedarse fuera de las convocatorias, y los tests que necesitan que juegue (convocatoria, día de partido) no deben depender de ese azar.
 */
export function conFutbolFuerte(game: Game, modulos: readonly GameModule<any>[], nivel = 75): Game {
  const guardado = JSON.parse(JSON.stringify(game.serialize()));
  for (const id of Object.keys(guardado.stats)) {
    if (/^(gen\.(velocidad|resistencia)|futbol\.)/.test(id)) {
      guardado.stats[id] = nivel;
      guardado.peaks[id] = nivel;
    }
  }
  return cargarPartida(guardado, modulos);
}


/**
 * El colegio con **un solo equipo de benjamín** (como antes del reparto de 17/11/2026, en que los alumnos de un colegio con club se quedan en él y el colegio saca varios equipos): los demás jugadores
 * de benjamín del colegio dejan el equipo. Para los tests que llenan «el equipo del colegio» a mano hasta su máximo de 18.
 */
export function colegioConUnEquipoDeBenjamin(game: Game): void {
  const s = game.moduleState<NpcsState>('npcs') as { -readonly [K in keyof NpcsState]: NpcsState[K] };
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const colegio = pob.equipos.find((e) => e.club === 'colegio')!;
  if (colegio.equiposPorCategoria) colegio.equiposPorCategoria = Object.fromEntries(Object.entries(colegio.equiposPorCategoria).filter(([c]) => c !== 'benjamin'));
  s.npcs = s.npcs.map((n) => (n.deporte === 'futbol' && n.equipo === 'colegio' && edadNpc(n, 0)! <= 9 ? sinDeporte(n, pob, false) : n));
}
