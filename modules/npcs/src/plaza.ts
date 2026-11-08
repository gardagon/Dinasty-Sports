/**
 * La regla de plaza y los valores por puesto.
 * Lógica de los deportes de equipo del juego base (`PLAN_DEPORTES_MODULARES.md` §7 bis): no sabe de ningún deporte concreto; cada deporte da sus datos.
 */
import { categoriaDeEdad, type CategoriaDef, type PlazaEnEquipo, SERVICES, rngEstable, CAPACIDADES_GENETICAS, cuposPorGrupo, PROPORCION_DE_ZURDOS, type PruebaEnClub, type ConsejoDeDeporte, conLaPierna, type Pierna, type NpcDirectory, type IdentityService, aptitudDe, type ReadContext } from '@ds/contracts';
import { potencialEn } from './deportistas';
import { valoresIniciales } from './capacidades';
import { habilidadesIniciales, lectorDe, prepararTrabajo } from './rutina';
import { esDeLoSuyo, ofertaDePuesto, ofertasOrdenadas, probabilidadDeAceptarPuesto, puestoDondeMasVale, type CondicionesDePrueba, type JugadorConPuesto, type OfertaDePuesto } from './puestos';
import { NUNCA, type Rendimientos } from './semana';

/**
 * MÓDULO NPCs (id `npcs`).
 *
 * Los NPCs dan profundidad al personaje y son la red que une módulos:
 * - Ayudan según lo que saben hacer (carácter, intereses y nivel), no por una etiqueta fija: ver `aptitudDe`.
 * - `levels`: nivel por disciplina; los rivales progresan solos cada día.
 * - Escuchan `competicion.resultado` (evento compartido) de cualquier deporte.
 * - Publican el servicio `npcs` para que otros módulos los consulten.
 */

import { Npc, PoblacionGuardada, edadDeJuego, edadNpc, npcs } from './index';
import { DIAGNOSTICO } from './draft';
import { MercadoDeFichajes, capacidadDe } from './plantillas';

/** La categoría del deporte a una edad de competición, o `undefined` si el deporte no guardó sus categorías. */
export const categoriaDe = (pob: PoblacionGuardada, edad: number): CategoriaDef | undefined => (pob.categorias?.length ? categoriaDeEdad(pob.categorias, edad) : undefined);


/** Quiénes juegan hoy en el equipo de un club en una categoría del deporte. */
export const jugadoresDelEquipo = (npcs: readonly Npc[], pob: PoblacionGuardada, club: string, cat: CategoriaDef, dia: number): Npc[] =>
  npcs.filter((n) => n.deporte === pob.deporte && n.equipo === club && (edadDeJuego(n, dia) ?? -1) >= cat.edadMin && (edadDeJuego(n, dia) ?? -1) <= cat.edadMax);


/**
 * ¿Entra el personaje (de esta edad de competición y este nivel en el deporte) en el equipo de su categoría? Si el equipo tiene hueco, sí. Si está completo
 * (en su máximo), solo si es mejor que alguno de los que hay (en global, de momento): saldría el peor. Los deportes sin equipos por categoría no tienen tope.
 */
export function plazaEnElEquipo(npcs: readonly Npc[], pobs: readonly PoblacionGuardada[], deporte: string, club: string, edad: number, nivel: number, dia: number, puestos?: Readonly<Record<string, number>>, rend: Rendimientos = new Map(), pierna?: Pierna, prueba?: PruebaEnClub): PlazaEnEquipo {
  const pob = pobs.find((p) => p.deporte === deporte);
  const equipo = pob?.equipos.find((e) => e.club === club);
  const cat = pob && equipo?.plantillaPorCategoria ? categoriaDe(pob, edad) : undefined;
  if (!pob || !equipo?.plantillaPorCategoria || !cat) return { estado: 'libre' };
  const delEquipo = jugadoresDelEquipo(npcs, pob, club, cat, dia);
  const max = capacidadDe(equipo, cat.id);
  // Con puestos (el fútbol), la plaza se mide por puesto: el club le ofrece el puesto en que entraría (el suyo, si entra; si no, aquel en que más vale).
  if (pob.puestos && puestos) {
    const val = valoracionDe(rend);
    const favorito = prueba?.puesto && puestos[prueba.puesto] !== undefined ? prueba.puesto : puestoDondeMasVale(puestos);
    // Una prueba de acceso (a cualquier club menos el del colegio): lo que vale la prueba es lo que cuenta; con hueco en su puesto se enfrenta al suplente que mejor lo cubriría (`rivalConHueco`).
    const condiciones: CondicionesDePrueba | undefined = prueba && equipo.colegio === undefined ? { ...(prueba.yaPasada ? { yaPasada: true } : {}), ...(prueba.puesto && puestos[prueba.puesto] !== undefined ? { puesto: prueba.puesto } : {}) } : undefined;
    const oferta = ofertaAlCandidato(delEquipo, max, pob, puestos, favorito, val, dia, pierna, condiciones);
    if (oferta) return { estado: oferta.estado, ...(oferta.peor ? { peor: { id: oferta.peor.id, nombre: oferta.peor.nombre, nivel: oferta.peor.valor } } : {}), puesto: oferta.puesto };
    // Completo en todos los puestos: se dice quién es el peor del grupo de su mejor puesto.
    const grupo = pob.puestos.reparto.find((g) => g.puestos.includes(favorito));
    const delGrupo = delEquipo.filter((j) => grupo?.puestos.includes(puestoDeJugador(j, pob, val, dia) ?? ''));
    // Con hueco en su puesto y sin llegar al mínimo del club en la prueba: no llega (no es que esté completo).
    const sinLlegar = !!condiciones && !!grupo && delGrupo.length < (cuposPorGrupo(pob.puestos, max)[grupo.grupo] ?? 0);
    const peor = delGrupo.length ? delGrupo.reduce((m, j) => (valorEnSuPuesto(j, pob, val, dia, puestoDeJugador(j, pob, val, dia)!) < valorEnSuPuesto(m, pob, val, dia, puestoDeJugador(m, pob, val, dia)!) ? j : m)) : undefined;
    return { estado: sinLlegar ? 'no_llega' : 'completo', ...(peor ? { peor: { id: peor.id, nombre: peor.name, nivel: valorEnSuPuesto(peor, pob, val, dia, puestoDeJugador(peor, pob, val, dia)!) } } : {}), puesto: favorito };
  }
  return reglaDePlaza(delEquipo.map((n) => ({ id: n.id, nombre: n.name, valor: n.levels[deporte] ?? 0 })), max, nivel);
}


/**
 * Lo que ve un profesor de Educación Física en el personaje (`NpcDirectory.consejoDeportivo`): los deportes en que rinde al menos como los niños de su edad que ya juegan (o en los que aún
 * no juega nadie) y, en los que tienen puestos, **tres puestos** en los que más vale **según lo que percibe**, no según los números: se desvía hasta ±2 puntos (azar estable de ese día).
 */
export function consejoDeUnProfesor(ctx: ReadContext, lista: readonly Npc[], pobs: readonly PoblacionGuardada[], rend: Rendimientos, dia: number): ConsejoDeDeporte[] {
  const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
  const zurdo = !!ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded;
  const consejos: ConsejoDeDeporte[] = [];
  for (const pob of pobs) {
    const f = rend.get(pob.deporte);
    if (!f) continue;
    const suyos = lista.filter((n) => n.deporte === pob.deporte && edadNpc(n, dia) === edad).map((n) => n.levels[pob.deporte] ?? 0).sort((a, b) => a - b);
    const mediana = suyos.length ? suyos[Math.floor((suyos.length - 1) / 2)] : 0;
    if (f(ctx) < 0.9 * mediana) continue;
    const crudos = f.puestos?.(ctx);
    const puestos = crudos && pob.puestos
      ? Object.entries(conLaPierna(crudos, zurdo ? 'izquierda' : 'derecha', ventajaDelLado(pob)))
          .map(([id, v]) => ({ id, percibido: v + 2 * (2 * rngEstable('consejo', ctx.time.day, pob.deporte, id).next() - 1) }))
          .sort((a, b) => b.percibido - a.percibido || (a.id < b.id ? -1 : 1))
          .slice(0, 3)
          .map((p) => ({ id: p.id, nombre: pob.puestos!.puestos.find((q) => q.id === p.id)?.nombre ?? p.id }))
      : [];
    consejos.push({ deporte: pob.deporte, nombre: pob.nombre, puestos });
  }
  return consejos;
}


/** Un jugador de un equipo, con lo que vale de verdad (su rendimiento en el deporte). */
export interface JugadorDeEquipo {
  id: string;
  nombre: string;
  valor: number;
}


/**
 * LA REGLA DE PLAZA en un equipo, **la misma para el personaje y para cualquier PNJ**: si el equipo tiene hueco, la plaza es libre; si está completo, solo entra quien vale más
 * que el peor de los que hay (en un empate, sale el de id mayor), que sería quien deje el sitio; y si no, el equipo está completo. `valor` es lo que vale de verdad el que
 * quiere entrar (su rendimiento en el deporte). La usan `plazaEnElEquipo` (el personaje) y el reclutamiento de los clubes (los niños del mundo).
 */
export function reglaDePlaza(equipo: readonly JugadorDeEquipo[], max: number, valor: number): PlazaEnEquipo {
  if (equipo.length < max) return { estado: 'libre' };
  const peor = equipo.reduce((m, n) => (n.valor < m.valor || (n.valor === m.valor && n.id > m.id) ? n : m));
  const datos = { id: peor.id, nombre: peor.nombre, nivel: peor.valor };
  return valor > peor.valor ? { estado: 'por_merito', peor: datos } : { estado: 'completo', peor: datos };
}

// ---------------------------------------------------------------------------------------------------- reclutamiento de deportistas


/** Lo que necesita el reclutamiento para valer a cada niño de verdad: el rendimiento de cada deporte (con sus capacidades reales) y una caché del valor de cada uno en este reclutamiento. */
export interface Valoracion {
  rend: Rendimientos;
  valores: Map<string, number>;
  /** Lo que vale cada niño en cada puesto del deporte (si lo tiene), por niño y deporte. */
  puestos: Map<string, Record<string, number>>;
}

export const valoracionDe = (rend: Rendimientos = new Map()): Valoracion => ({ rend, valores: new Map(), puestos: new Map() });


/** Lo que se guarda de lo que vale un niño en un deporte: su valor y lo que vale en cada puesto (con su pierna), a dos decimales. */
export function valoresGuardados(n: Npc, pob: PoblacionGuardada, valor: number, crudos?: Record<string, number>): { valor: number; puestos?: Record<string, number> } {
  const r2 = (x: number): number => Math.round(x * 100) / 100;
  const puestos = crudos && pob.puestos ? conLaPierna(crudos, piernaDe(n, pob), ventajaDelLado(pob)) : undefined;
  return { valor: r2(valor), ...(puestos ? { puestos: Object.fromEntries(Object.entries(puestos).map(([p, x]) => [p, r2(x)])) } : {}) };
}


/**
 * Lo que vale hoy un niño en un deporte: su rendimiento con sus capacidades reales y sus habilidades (las que lleva si ya juega o las de partida si aún no). Sin rendimiento del
 * deporte (los deportes de prueba) o sin capacidades, `undefined`: entonces se usa su potencial.
 */
export function valorRealDe(n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number): number | undefined {
  const f = v.rend.get(pob.deporte);
  if (!f) return undefined;
  const clave = `${n.id}|${pob.deporte}`;
  const guardado = v.valores.get(clave);
  if (guardado !== undefined) return guardado;
  // Quien ya juega lleva calculado lo que vale (al crear la partida y cada semana; el personaje, al hacer los fichajes): se lee, no se recalcula.
  const leido = n.deporte === pob.deporte && (n.genetica || n.id.startsWith('personaje@')) ? n.vp?.[pob.deporte] : undefined;
  const conPuestos = !!pob.puestos && !!f.puestos; // los puestos solo cuentan si quien valora los da
  if (leido && (!conPuestos || leido.puestos)) {
    v.valores.set(clave, leido.valor);
    if (leido.puestos && conPuestos) v.puestos.set(clave, leido.puestos);
    return leido.valor;
  }
  if (!pob.rutina || !n.genetica || !n.cap || !n.pico || n.nacimiento === undefined) return undefined;
  const hab = n.hab?.[pob.deporte] ?? habilidadesIniciales(n.id, n.genetica, pob.deporte, pob.rutina, dia);
  const t = prepararTrabajo({ id: n.id, genetica: n.genetica, nacimiento: n.nacimiento, cap: n.cap, pico: n.pico }, valoresIniciales(n.id, n.genetica), pob.deporte, pob.rutina, hab, n.capUlt ?? CAPACIDADES_GENETICAS.map(() => NUNCA), dia);
  const lector = lectorDe(t);
  const valor = f(lector);
  v.valores.set(clave, valor);
  if (f.puestos && pob.puestos) v.puestos.set(clave, conLaPierna(f.puestos(lector), piernaDe(n, pob), ventajaDelLado(pob)));
  return valor;
}


/** Lo que vale un niño en cada puesto del deporte (`undefined` si el deporte no tiene puestos o no se puede calcular). */
export function valoresPorPuestoDe(n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number): Record<string, number> | undefined {
  if (!pob.puestos || valorRealDe(n, pob, v, dia) === undefined) return undefined;
  return v.puestos.get(`${n.id}|${pob.deporte}`);
}


/** La pierna buena de un niño: la que tiene o, si aún no la ha dado (partidas anteriores), un sorteo estable suyo con la proporción de zurdos (`PROPORCION_DE_ZURDOS`, la misma que usa el personaje). */
export const piernaDe = (n: Pick<Npc, 'id' | 'pierna' | 'genetica'>, pob: PoblacionGuardada): Pierna =>
  n.pierna ?? (rngEstable('pierna', n.genetica?.semilla ?? 0, n.id).next() < PROPORCION_DE_ZURDOS ? 'izquierda' : 'derecha');


/** Lo que vale el personaje en cada puesto con su pierna buena (la misma regla que los PNJ), o `undefined` si el deporte no tiene puestos. */
export const puestosDelPersonaje = (ctx: ReadContext, rend: Rendimientos, pob: PoblacionGuardada): Record<string, number> | undefined => {
  const crudos = rend.get(pob.deporte)?.puestos?.(ctx);
  return crudos ? conLaPierna(crudos, ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded ? 'izquierda' : 'derecha', ventajaDelLado(pob)) : undefined;
};


/** Lo que vale la pierna buena de base en los puestos de su lado (±0,25 por defecto): la misma regla para el personaje y los PNJ (`conLaPierna`). */
export const ventajaDelLado = (pob: PoblacionGuardada): number => pob.puestos?.pierna?.ventajaDelLado ?? 0.25;


/** Entre cuántos de los puestos que mejor encajan con sus habilidades elige un niño su favorito. */
export const PUESTOS_ENTRE_LOS_QUE_ELIGE = 3;


/** El puesto favorito de un niño: el que se le dio o, si aún no lo tiene, uno de los que mejor encajan con sus habilidades (a su suerte, estable). */
export function favoritoDe(n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number): string | undefined {
  const guardado = n.puestoFavorito?.[pob.deporte];
  if (guardado) return guardado;
  const valores = valoresPorPuestoDe(n, pob, v, dia);
  if (!valores) return undefined;
  const mejores = Object.entries(valores).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, PUESTOS_ENTRE_LOS_QUE_ELIGE).map(([p]) => p);
  return mejores[Math.floor(rngEstable('favorito', n.genetica?.semilla ?? 0, n.id, pob.deporte).next() * mejores.length)];
}


/** El grupo favorito de un niño (portería, defensa, medio o ataque) si tiene un grupo en lugar de un puesto concreto (`favoritos` del deporte: una parte tiene puesto concreto y el resto, grupo). */
export function grupoFavoritoDe(n: Npc, pob: PoblacionGuardada, favorito: string | undefined): string | undefined {
  const f = pob.puestos?.favoritos;
  if (!f || !favorito || rngEstable('favorito-grupo', n.genetica?.semilla ?? 0, n.id, pob.deporte).next() < f.proporcionDePuestoConcreto) return undefined;
  return f.grupos.find((g) => g.puestos.includes(favorito))?.id;
}


/** El puesto en que juega un niño de un equipo: el que tiene o, si aún no lo tiene (partidas anteriores), aquel en que más vale. */
export const puestoDeJugador = (n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number): string | undefined => n.puesto?.[pob.deporte] ?? favoritoDe(n, pob, v, dia);


/** Lo que vale un jugador de un equipo en su puesto (el personaje, que no tiene capacidades de niño, lleva su valor en `levels`). */
export const valorEnSuPuesto = (n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number, puesto: string): number => valoresPorPuestoDe(n, pob, v, dia)?.[puesto] ?? n.levels[pob.deporte] ?? 0;


/** Todas las ofertas de puesto de un equipo a un candidato, de la más a la menos adecuada (`ofertasOrdenadas`: su puesto, y los parecidos de más a menos). */
export function ofertasAlCandidato(jugadores: readonly Npc[], max: number, pob: PoblacionGuardada, valores: Readonly<Record<string, number>>, favorito: string | undefined, v: Valoracion, dia: number, piernaDelCandidato?: Pierna, prueba?: CondicionesDePrueba): OfertaDePuesto[] {
  const conPuesto: JugadorConPuesto[] = jugadores.flatMap((j) => {
    const puesto = puestoDeJugador(j, pob, v, dia);
    return puesto ? [{ id: j.id, nombre: j.name, puesto, valor: valorEnSuPuesto(j, pob, v, dia, puesto), pierna: j.pierna ?? (j.genetica ? piernaDe(j, pob) : undefined), valores: valoresPorPuestoDe(j, pob, v, dia) }] : [];
  });
  return ofertasOrdenadas(conPuesto, cuposPorGrupo(pob.puestos!, max), pob.puestos!, valores, favorito, piernaDelCandidato, prueba);
}


/**
 * La oferta de puesto de un equipo (con `jugadores`, que caben `max`) a un candidato que vale `valores` en cada puesto: la regla de plaza por puesto (`ofertaDePuesto`), con el reparto de la
 * plantilla por grupos del deporte. `undefined`: no entra en ningún puesto.
 */
export function ofertaAlCandidato(jugadores: readonly Npc[], max: number, pob: PoblacionGuardada, valores: Readonly<Record<string, number>>, favorito: string | undefined, v: Valoracion, dia: number, piernaDelCandidato?: Pierna, prueba?: CondicionesDePrueba): OfertaDePuesto | undefined {
  const conPuesto: JugadorConPuesto[] = jugadores.flatMap((j) => {
    const puesto = puestoDeJugador(j, pob, v, dia);
    return puesto ? [{ id: j.id, nombre: j.name, puesto, valor: valorEnSuPuesto(j, pob, v, dia, puesto), pierna: j.pierna ?? (j.genetica ? piernaDe(j, pob) : undefined), valores: valoresPorPuestoDe(j, pob, v, dia) }] : [];
  });
  return ofertaDePuesto(conPuesto, cuposPorGrupo(pob.puestos!, max), pob.puestos!, valores, favorito, piernaDelCandidato, prueba);
}


/**
 * ¿Acepta el niño el puesto que le ofrece el club? Siempre lo suyo (su puesto favorito o, si tiene un grupo, cualquier puesto de su grupo); los demás, casi siempre, según su carácter, lo que se parece a su
 * puesto y si sería titular; si es su última opción, aún más (un sorteo suyo y del club). Avisa a la medida (`DIAGNOSTICO.alOfertar`).
 */
export function aceptaElPuesto(n: Npc, pob: PoblacionGuardada, club: string, favorito: string | undefined, oferta: OfertaDePuesto, ultimaOpcion = false): boolean {
  const grupoFavorito = grupoFavoritoDe(n, pob, favorito);
  const p = probabilidadDeAceptarPuesto(pob.puestos!, n.rasgos?.caracter, favorito, oferta.puesto, oferta.titular, { grupoFavorito, ultimaOpcion });
  const acepta = p >= 1 || rngEstable('puesto', n.genetica?.semilla ?? 0, n.id, club, oferta.puesto).chance(p);
  DIAGNOSTICO.alOfertar?.({ id: n.id, club, aceptada: acepta, ultimaOpcion, esSuyo: esDeLoSuyo(pob.puestos!, favorito, grupoFavorito, oferta.puesto) });
  return acepta;
}


/** Cuánto vale un niño en un deporte (su rendimiento hoy; si no se puede calcular, su nivel o su potencial). */
export const valorEn = (n: Npc, pob: PoblacionGuardada, m: MercadoDeFichajes): number => valorRealDe(n, pob, m.val, m.dia) ?? n.levels[pob.deporte] ?? potencialEn(n.id, n.genetica!, pob);

