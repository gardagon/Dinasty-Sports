/**
 * El «draft» de los equipos, completar o cerrar equipos y el cambio de curso de los deportistas.
 * Lógica de los deportes de equipo del juego base (`PLAN_DEPORTES_MODULARES.md` §7 bis): no sabe de ningún deporte concreto; cada deporte da sus datos.
 */
import { avisarDelProgreso, type CategoriaDef, rngEstable, cuposPorGrupo, grupoDePuesto, ATRACTIVO_DE_TAMANO, type Rng, aptitudDe, type MotivoDeEquipoSinNinos } from '@ds/contracts';
import { LETRAS_FIJADAS, MEDIDA, REPARTO_DE_INICIO, SESGO_DE_SEXO, interesDe, interesPor } from './deportistas';
import { type MiembroDeClub } from './equipos';
import { puestoDondeMasVale } from './puestos';
import { type Rendimientos } from './semana';
import { losQueSeQuedan } from './probar-fuera';

/**
 * MÓDULO NPCs (id `npcs`).
 *
 * Los NPCs dan profundidad al personaje y son la red que une módulos:
 * - Ayudan según lo que saben hacer (carácter, intereses y nivel), no por una etiqueta fija: ver `aptitudDe`.
 * - `levels`: nivel por disciplina; los rivales progresan solos cada día.
 * - Escuchan `competicion.resultado` (evento compartido) de cualquier deporte.
 * - Publican el servicio `npcs` para que otros módulos los consulten.
 */

import { EquipoGuardado, Npc, PoblacionGuardada, delColegio, edadDeJuego, edadNpc, hermanos, npcs, nuevoEntrenador, registroDe, entrenadoresDeClubes } from './index';
import { PRUEBAN_FUERA, colocarDesplazados, fichajesDeVerano, intentarEntrar, probabilidadDeFichar } from './fichajes';
import { dejaElDeporte } from './abandono';
import { colegioDeNino, acomodarSobrantes, cubrirGruposVacios, equipoDelPersonajeEn, fijarEquipos, Aspirante, JugadorEnClub, ListaDeTrabajo, MercadoDeFichajes, aspirantesDeEdad, capacidadDe, categoriasDelEquipo, claveDeEquipo, edadesDe, equiposDelClub, idDelPersonaje, jugadorComoNpc, reclutarDeportistas, reclutarEnTodos, sinDeporte } from './plantillas';
import { Valoracion, leGustaElGrupo, puestoDeJugador, valorEn, valorEnSuPuesto, valoracionDe, valoresPorPuestoDe } from './plaza';

/** ¿Forma sus equipos el «draft»? Los deportes con equipos por categoría y puestos (el fútbol); el atletismo y los de prueba, no. */
export const conDraft = (pob: PoblacionGuardada, val: Valoracion): boolean => !!pob.puestos && pob.equipos.some((e) => e.plantillaPorCategoria) && !!val.rend.get(pob.deporte)?.puestos;


/** Tope de equipos que un club puede tener en una categoría (para que no se abran equipos sin fin). */
export const MAX_EQUIPOS_POR_CATEGORIA = 4;


/** Un entrenador para un equipo nuevo: lleva las edades de su categoría y lleva el id de su equipo (para cerrarlo con él). */
export const idDeEntrenadorDeEquipo = (club: string, categoria: string, numero: number): string => `entrenador_${club}_${categoria}_${numero}`;

// ---------------------------------------------------------------------------------------------------- el «draft» de los equipos


/** Cuántos jugadores tiene como mínimo un equipo para existir (la plantilla mínima del club). */
export const minimoDe = (e: EquipoGuardado): number => e.plantillaPorCategoria?.min ?? 14;

/** Qué parte de la bolsa va a probar con un club en la primera ronda (su dato o el de su tamaño). */
export const atractivoDe = (e: EquipoGuardado): number => e.atractivo ?? ATRACTIVO_DE_TAMANO[e.tamano ?? (e.calidad >= 3 ? 'grande' : e.calidad === 2 ? 'mediano' : 'pequeno')];


/**
 * **El «draft» por rondas** (decisión del usuario, 05/11/2026; `CIUDAD_Y_LIGAS.md` §5): cada club solo ve a los niños que van a probar con él, no a todos. Por categoría:
 * 1. **Primera ronda (A y B):** los clubes van por orden de atractivo (los colegios con club, los últimos, con todos sus alumnos de la bolsa, sin porcentaje ni prueba). A cada club va a probar su
 *    porcentaje de la bolsa (un sorteo en el que pesan el interés y, si `conAmbicion`, la ambición: el ambicioso va más al grande; al crear la partida el sorteo es simple), de los dos años
 *    mezclados (si faltan niños de un año, se añaden al azar de la bolsa). El club escoge a los mejores por puesto con la regla de plaza (la prueba, en los plazos). Con el mínimo basta; si no llega,
 *    se queda sin equipo y los suyos vuelven a la bolsa, igual que los descartados.
 * 2. **Segunda ronda (C y D):** con lo que queda en la bolsa se cuentan los equipos que salen a un mínimo por equipo; se sortean entre clubes y colegios (como mucho dos más cada uno) y se repite la
 *    primera ronda para ellos. Un equipo que no llega al mínimo se cierra y pasa por sorteo a otro club sin C ni D.
 * 3. **Ajuste:** cada club reordena sus equipos por año; quien no cabe en ninguno vuelve a la bolsa de descartes.
 * 4. **Descartes definitivos:** con ellos se monta un equipo en su colegio, si lo tiene, o entran en un club con hueco. El resto queda apartado ese curso.
 * Devuelve los entrenadores de los equipos nuevos. El personaje no entra en los porcentajes (decide él a qué clubes va a probar): no está en la bolsa.
 */
export function draftDeEquipos(m: MercadoDeFichajes, rng: Rng, o: { conPrueba: boolean; conAmbicion: boolean; reiniciar: boolean }): Npc[] {
  const nuevos: Npc[] = [];
  const pobsNuevas: PoblacionGuardada[] = [];
  for (const pob0 of m.pobs) {
    if (!conDraft(pob0, m.val)) {
      pobsNuevas.push(pob0);
      continue;
    }
    const pob: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.map((e) => ({ ...e, ...(o.reiniciar && e.plantillaPorCategoria ? { equiposPorCategoria: undefined } : {}) })) };
    const categorias = new Map<string, CategoriaDef>();
    for (const e of pob.equipos) for (const c of e.plantillaPorCategoria ? categoriasDelEquipo(pob, e) : []) categorias.set(c.id, (pob.categorias ?? []).find((x) => x.id === c.id)!);
    const ordenadas = [...categorias].sort((a, b) => a[1].edadMin - b[1].edadMin);
    for (const [indice, [catId, cat]] of ordenadas.entries()) {
      avisarDelProgreso(`Repartiendo a los jugadores entre los clubes y sus equipos (${cat.nombre.toLowerCase()})…`, 0.05 + 0.32 * (indice / ordenadas.length));
      draftDeUnaCategoria(m, pob, cat, catId, rng, o);
      cubrirGruposVacios(m, pob, catId, Array.from({ length: cat.edadMax - cat.edadMin + 1 }, (_, i) => cat.edadMin + i));
    }
    pobsNuevas.push(pob);
    m.pobs = [...pobsNuevas, ...m.pobs.slice(pobsNuevas.length)];
    fijarEquipos(m, pob);
    nuevos.push(...entrenadoresDeLosEquipos(m, pob, rng));
  }
  m.pobs = pobsNuevas;
  sinSobrantes(m);
  plazasDeMas(m);
  return nuevos;
}

/**
 * Tras el reparto en equipos, nadie queda en un club sin equipo (`acomodarSobrantes`): el entrenador le ofrece otro puesto donde quepa y, si no cabe, deja el club y busca otro como cualquier desplazado (al
 * que cambia de club le pasa lo mismo en el nuevo, y así hasta tres rondas; en la última, el que no cabe queda apartado ese curso). Al acabar se fijan los equipos de la temporada.
 */
export function sinSobrantes(m: MercadoDeFichajes): void {
  if (DIAGNOSTICO.alAcomodar) m.alAcomodar = DIAGNOSTICO.alAcomodar;
  trazaPorCategorias(m, 'antes de acomodar a los que no caben en ningún equipo (sinSobrantes)');
  for (let ronda = 0; ronda < (MEDIDA.respetarReparto ? 0 : 3); ronda++) {
    const fuera = m.pobs.flatMap((pob) => acomodarSobrantes(m, pob, ronda === 2));
    if (fuera.length) colocarDesplazados(m, fuera);
    for (const pob of m.pobs) {
      for (const c of (pob.categorias ?? []).filter((x) => pob.equipos.some((e) => e.plantillaPorCategoria && categoriasDelEquipo(pob, e).some((u) => u.id === x.id)))) cubrirGruposVacios(m, pob, c.id, Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => c.edadMin + i));
    }
  }
  for (const pob of m.pobs) fijarEquipos(m, pob);
  trazaPorCategorias(m, 'después de acomodar a los que no caben (sinSobrantes) y fijar las letras');
}

/** Para contarlo (`DIAGNOSTICO.traza`): cómo está cada club en cada categoría con equipos, en este momento. No cambia nada. */
function trazaPorCategorias(m: MercadoDeFichajes, fase: string): void {
  if (!DIAGNOSTICO.traza) return;
  for (const pob of m.pobs) {
    for (const c of (pob.categorias ?? []).filter((x) => pob.equipos.some((e) => e.plantillaPorCategoria && categoriasDelEquipo(pob, e).some((u) => u.id === x.id)))) {
      const edades = Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => c.edadMin + i);
      const clubes = pob.equipos.filter((e) => e.plantillaPorCategoria && categoriasDelEquipo(pob, e).some((u) => u.id === c.id));
      const miembros = (e: EquipoGuardado): Npc[] => (m.lista instanceof ListaDeTrabajo ? m.lista.deEquipo(pob.deporte, e.club) : [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club)).filter((n) => edades.includes(edadDeJuego(n, m.dia) ?? -1));
      DIAGNOSTICO.traza({ categoria: c.id, fase, datos: {}, bolsa: () => [], foto: () => clubes.map((e) => { const ms = miembros(e); return { club: e.club, ...(e.colegio !== undefined ? { colegio: e.colegio } : {}), k: e.equiposPorCategoria?.[c.id] ?? 1, max: e.plantillaPorCategoria?.max ?? 0, plazasDeMas: e.plazasDeMas?.[c.id] ?? 0, min: minimoDe(e), total: ms.length, primeros: ms.filter((n) => edadDeJuego(n, m.dia) === c.edadMin).length }; }) });
    }
  }
}


/** Deja los entrenadores de equipos de más (`entrenador_<club>_<categoría>_<n>`) como pide `equiposPorCategoria`: crea los que faltan y quita los que sobran. */
export function entrenadoresDeLosEquipos(m: MercadoDeFichajes, pob: PoblacionGuardada, rng: Rng): Npc[] {
  const nuevos: Npc[] = [];
  const usados = registroDe([...m.lista.values()]);
  for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
    for (const cat of categoriasDelEquipo(pob, e)) {
      const k = e.equiposPorCategoria?.[cat.id] ?? 1;
      for (let numero = 2; numero <= MAX_EQUIPOS_POR_CATEGORIA; numero++) {
        const id = idDeEntrenadorDeEquipo(e.club, cat.id, numero);
        if (numero > k) m.lista.delete(id);
        else if (!m.lista.has(id)) {
          const c = nuevoEntrenador(rng, pob, usados, { id, club: e.club, edades: [cat.edades[0], Math.min(cat.edades[cat.edades.length - 1], 99)], edad: [28, 55] });
          m.lista.set(id, c);
          nuevos.push(c);
        }
      }
    }
  }
  return nuevos;
}


export function draftDeUnaCategoria(m: MercadoDeFichajes, pob: PoblacionGuardada, cat: CategoriaDef, catId: string, rng: Rng, o: { conPrueba: boolean; conAmbicion: boolean }, verano: boolean | 'usuario' = false): void {
  const clubes = pob.equipos.filter((e) => e.plantillaPorCategoria && categoriasDelEquipo(pob, e).some((c) => c.id === catId));
  if (!clubes.length) return;
  const edades = Array.from({ length: cat.edadMax - cat.edadMin + 1 }, (_, i) => cat.edadMin + i);
  const primeroAnio = (n: Npc): boolean => (edadDeJuego(n, m.dia) ?? -1) === cat.edadMin;
  const kDe = (e: EquipoGuardado): number => e.equiposPorCategoria?.[catId] ?? 1;
  const ponerK = (e: EquipoGuardado, k: number): void => {
    e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: k };
    if (k <= 1) delete e.equiposPorCategoria[catId];
  };
  const miembros = (e: EquipoGuardado): Npc[] => (m.lista instanceof ListaDeTrabajo ? m.lista.deEquipo(pob.deporte, e.club) : [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club)).filter((n) => edades.includes(edadDeJuego(n, m.dia) ?? -1));
  /** La bolsa: los interesados sin equipo de la categoría (con el conocimiento de que ya probaron y se quedaron apartados no se les excluye aquí: los plazos los gestionan). */
  const bolsa = (): Aspirante[] => edades.flatMap((edad) => aspirantesDeEdad([...m.lista.values()], pob, edad, m.dia, m.val)).filter((a) => a.interes > 0);
  const liberar = (ids: readonly string[]): void => {
    for (const id of ids) {
      const n = m.lista.get(id);
      if (n && n.deporte === pob.deporte && !id.startsWith('personaje@')) m.lista.set(id, sinDeporte(n, pob, false));
    }
  };
  // **Los que se quedan en el club de su colegio** (decisión del usuario, 17/11/2026): de los alumnos de un colegio con club solo va a probar a los clubes de fuera un porcentaje según la edad; los demás
  // no los ven los clubes de fuera hasta que el colegio ha escogido (después, los que sobran del colegio ya son descartes como los demás). Los que prueban y no entran siguen en la bolsa de su colegio.
  const sinColegios = !!SESGO_DE_SEXO.sinColegios && SESGO_DE_SEXO.desdeEdad !== undefined && cat.edadMin >= SESGO_DE_SEXO.desdeEdad;
  const quedan = losQueSeQuedan(bolsa(), new Set(sinColegios ? [] : clubes.flatMap((e) => (e.colegio === undefined ? [] : [e.colegio]))), cat, m.dia);
  let protegerAlColegio = true;
  const visiblePara = (e: EquipoGuardado, xs: Aspirante[]): Aspirante[] => (e.colegio === undefined && protegerAlColegio ? xs.filter((a) => !quedan.has(a.npc.id)) : xs);
  // Para contarlo (`DIAGNOSTICO.traza`): no cambia nada.
  let etapa = 'inicio';
  const foto = (): FotoDeClub[] => clubes.map((e) => { const ms = miembros(e); return { club: e.club, ...(e.colegio !== undefined ? { colegio: e.colegio } : {}), k: kDe(e), max: e.plantillaPorCategoria?.max ?? 0, plazasDeMas: e.plazasDeMas?.[catId] ?? 0, min: minimoDe(e), total: ms.length, primeros: ms.filter(primeroAnio).length }; });
  const tr = (fase: string, club: string | undefined, datos: Record<string, unknown> = {}): void => {
    if (DIAGNOSTICO.traza) DIAGNOSTICO.traza({ categoria: catId, fase, ...(club ? { club } : {}), datos, foto, bolsa: () => bolsa().map((a) => ({ id: a.npc.id, edad: edadDeJuego(a.npc, m.dia) ?? -1, colegio: a.colegio, interes: a.interes, valor: a.valor })) });
  };
  tr('inicio', undefined, { quedanEnSuColegio: quedan.size, probarFuera: cat.probarFuera ?? null });
  /** Una ronda de un club: va a probar un grupo de la bolsa, el club coge a los mejores por puesto; si no llega al mínimo de todos sus equipos, no se monta y vuelven a la bolsa. */
  const ronda = (e: EquipoGuardado, k: number, porcentaje: number | null): boolean => {
    const kAntes = kDe(e);
    const antes = new Set(miembros(e).map((n) => n.id));
    ponerK(e, Math.max(k, kAntes));
    const toda = visiblePara(e, bolsa());
    const elegibles = toda.filter((a) => e.colegio === undefined || a.colegio === e.colegio);
    let van: Aspirante[];
    if (porcentaje === null) van = elegibles;
    else {
      // Un sorteo en el que pesan el interés y, desde el segundo curso, la ambición (el ambicioso, más al grande).
      const pesa = (a: Aspirante): number => {
        const ambicion = ((a.npc.rasgos?.caracter.ambicion ?? 0) + 50) / 100;
        return o.conAmbicion ? 0.5 + a.interes * 0.5 + ambicion * (e.calidad - 1) : 1;
      };
      const clave = (a: Aspirante): number => Math.pow(rngEstable('probar', a.npc.genetica?.semilla ?? 0, a.npc.id, e.club, catId, m.dia).next() || 1e-9, 1 / pesa(a));
      const quieren = Math.min(elegibles.length, Math.round(porcentaje * toda.length));
      const minimo = minimoDe(e) * Math.max(1, kDe(e) - kAntes + (kAntes <= 1 ? 1 : 0));
      const cuantos = Math.min(elegibles.length, Math.max(quieren, minimo));
      van = [...elegibles].sort((x, y) => clave(y) - clave(x) || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, cuantos);
      // De los dos años mezclados: si faltan niños de un año para el mínimo de sus equipos, se añaden al azar de la bolsa.
      const resto = elegibles.filter((a) => !van.includes(a));
      for (const primero of [true, false]) {
        const faltan = minimoDe(e) - van.filter((a) => primeroAnio(a.npc) === primero).length;
        if (faltan > 0 && kDe(e) >= 2) van = [...van, ...resto.filter((a) => primeroAnio(a.npc) === primero).sort((x, y) => clave(y) - clave(x)).slice(0, faltan)];
      }
    }
    if (DIAGNOSTICO.variantePrimeraRonda && etapa.startsWith('1.')) {
      const n = DIAGNOSTICO.variantePrimeraRonda.porAnio;
      const orden = (xs: Aspirante[]): Aspirante[] => [...xs].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1));
      van = [...orden(van.filter((a) => primeroAnio(a.npc))).slice(0, n), ...orden(van.filter((a) => !primeroAnio(a.npc))).slice(0, n)];
    }
    tr('ronda', e.club, { etapa, kAntes, objetivo: k, porcentaje, enBolsa: toda.length, elegibles: elegibles.length, van: van.length, vanPrimeros: van.filter((a) => primeroAnio(a.npc)).length });
    // El club monta sus equipos de uno en uno (así cada plantilla respeta su reparto por puestos): en cada paso escoge a los mejores por puesto (primero los grupos más escasos, con quien mejor juega en
    // ellos y prefiere ese puesto; después el resto por mérito). Cada equipo necesita sus 14 (con 14 basta, aunque no lleguen a 18, también el del colegio): si un paso no los reúne, se deshace.
    const objetivo = kDe(e);
    for (let t = Math.max(1, kAntes); t <= objetivo; t++) {
      ponerK(e, t);
      const antesDelPaso = new Set(miembros(e).map((n) => n.id));
      const cupos = cuposPorGrupo(pob.puestos!, capacidadDe(e, catId));
      const delGrupo = (g: { puestos: readonly string[] }): number => miembros(e).filter((n) => g.puestos.includes(puestoDeJugador(n, pob, m.val, m.dia) ?? '')).length;
      for (const g of [...pob.puestos!.reparto].sort((x, y) => x.jugadores - y.jugadores || (x.grupo < y.grupo ? -1 : 1))) {
        const puntos = (a: Aspirante): number => {
          const vs = valoresPorPuestoDe(a.npc, pob, m.val, m.dia);
          return (leGustaElGrupo(a.npc, pob, m.val, m.dia, g.puestos) ? 1000 : 0) + (vs ? Math.max(...g.puestos.map((p) => vs[p] ?? 0)) : 0);
        };
        for (const a of [...van].sort((x, y) => puntos(y) - puntos(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
          if (delGrupo(g) >= (cupos[g.grupo] ?? 0)) break;
          const n = m.lista.get(a.npc.id);
          const vs = n && valoresPorPuestoDe(n, pob, m.val, m.dia);
          if (n && n.deporte === undefined && vs) intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, puestoForzado: puestoDondeMasVale(vs, g.puestos) });
        }
      }
      for (const a of [...van].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1))) {
        const n = m.lista.get(a.npc.id);
        if (n && n.deporte === undefined) intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba });
      }
      // Un equipo nuevo de los descartes (todos los que quedan) o de un colegio (todos sus alumnos): si con el reparto por puestos no llega a los 14, los demás entran en su puesto favorito.
      if (miembros(e).length < minimoDe(e) * t && (porcentaje === null || porcentaje >= 1)) {
        for (const a of [...van].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1))) {
          if (miembros(e).length >= capacidadDe(e, catId)) break;
          const n = m.lista.get(a.npc.id);
          if (n && n.deporte === undefined) intentarEntrar(m, n, e, pob, { sinPrueba: true, soloHueco: true, relajado: true });
        }
      }
      tr('paso', e.club, { etapa, equipo: t, miembros: miembros(e).length, nuevosEnElPaso: miembros(e).filter((n) => !antesDelPaso.has(n.id)).length, necesita: minimoDe(e) * t, seMonta: miembros(e).length >= minimoDe(e) * t, capacidad: capacidadDe(e, catId) });
      if (miembros(e).length < minimoDe(e) * t) {
        // No llega a los 14 de este equipo: se deshace este paso (los que entraron vuelven a la bolsa) y el club se queda con los equipos que ya tenía.
        liberar(miembros(e).filter((n) => !antesDelPaso.has(n.id)).map((n) => n.id));
        ponerK(e, t - 1 >= 1 ? t - 1 : kAntes);
        if (t - 1 < Math.max(1, kAntes) || miembros(e).length === 0) liberar(miembros(e).filter((n) => !antes.has(n.id)).map((n) => n.id));
        break;
      }
    }
    if (kDe(e) < kAntes) ponerK(e, kAntes);
    return kDe(e) >= k;
  };
  /** El ajuste de un club: reordena sus equipos por año; quien no cabe en ninguno (por puestos, por año o por el máximo) vuelve a la bolsa de descartes. */
  const ajustar = (e: EquipoGuardado): void => {
    const cx = categoriasDelEquipo(pob, e).find((c) => c.id === catId)!;
    const kAntes = kDe(e), totalAntes = miembros(e).length;
    let sobranEnTotal = 0;
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const sobran = equiposDelClub(m.lista, pob, e, cx, m.dia, m.val, [], true).equipos.sobran;
      sobranEnTotal += sobran.length;
      liberar(sobran);
      // Con los que quedan, tantos equipos como lleguen al mínimo (con 14 basta).
      const montables = Math.max(1, Math.floor(miembros(e).length / minimoDe(e)));
      if (montables >= kDe(e)) break;
      ponerK(e, montables);
    }
    if (totalAntes > 0) tr('ajuste', e.club, { etapa, kAntes, kDespues: kDe(e), totalAntes, totalDespues: miembros(e).length, liberados: sobranEnTotal });
  };
  const fuera = clubes.filter((e) => e.colegio === undefined).sort((a, b) => atractivoDe(b) - atractivoDe(a) || b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
  const delColegio = clubes.filter((e) => e.colegio !== undefined).sort((a, b) => (a.club < b.club ? -1 : 1));
  // Variante de medida (apagada por defecto): juvenil por año, subidas por nivel y búsqueda de equipo.
  if (DIAGNOSTICO.variantJuvenil && catId === 'juvenil' && !verano) {
    const vj = DIAGNOSTICO.variantJuvenil;
    const TOPE = 22;
    const plantillasJ = new Map(clubes.map((e) => [e, e.plantillaPorCategoria] as const));
    for (const e of clubes) { e.plantillaPorCategoria = { ...e.plantillaPorCategoria!, max: 999 }; ponerK(e, 4); }
    const anioDe = (n: Npc): number => (edadDeJuego(n, m.dia) ?? cat.edadMin) - cat.edadMin + 1;
    const lugares = [...delColegio, ...fuera];
    // J1: un solo reparto. Cada niño de la bolsa va a un club: si su colegio tiene club y quiere seguir en él, a ese; si no, a un club externo sorteado con peso su atractivo.
    const pesoTotal = fuera.reduce((t, e) => t + atractivoDe(e), 0);
    const destinoDe = new Map<string, Aspirante[]>(clubes.map((e) => [e.club, []]));
    for (const a of bolsa()) {
      const suyo = delColegio.find((c) => c.colegio === a.colegio);
      let destino: EquipoGuardado | undefined = suyo && quedan.has(a.npc.id) ? suyo : undefined;
      if (!destino) {
        let r = rngEstable('reparto-j1', a.npc.genetica?.semilla ?? 0, a.npc.id, catId, m.dia).next() * pesoTotal;
        for (const e of fuera) { r -= atractivoDe(e); if (r <= 0) { destino = e; break; } }
        destino ??= fuera[fuera.length - 1];
      }
      destinoDe.get(destino.club)!.push(a);
    }
    type Eq = { A: Set<string>; B?: Set<string>; C?: Set<string> };
    const equipos = new Map<string, Eq>();
    const sinEquipo: Aspirante[] = [];
    for (const e of lugares) {
      const lista = destinoDe.get(e.club)!;
      const dentro: Npc[] = [];
      for (const a of lista) {
        const n = m.lista.get(a.npc.id);
        if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true, relajado: true }).entra) dentro.push(m.lista.get(a.npc.id)!);
      }
      const y = (k: number): Npc[] => dentro.filter((n) => anioDe(n) === k);
      const n1 = y(1).length, n2 = y(2).length, n3 = y(3).length;
      let eq: Eq | undefined;
      if (n3 >= 14 && n2 >= 14 && n1 >= 14) eq = { A: new Set(y(3).map((n) => n.id)), B: new Set(y(2).map((n) => n.id)), C: new Set(y(1).map((n) => n.id)) };
      else if (n3 + n2 >= 14 && n1 >= 14) eq = { A: new Set([...y(3), ...y(2)].map((n) => n.id)), B: new Set(y(1).map((n) => n.id)) };
      else if (dentro.length >= 14) eq = { A: new Set(dentro.map((n) => n.id)) };
      tr('J1', e.club, { vienen: lista.length, entran: dentro.length, n1, n2, n3, equipos: eq ? (eq.C ? 3 : eq.B ? 2 : 1) : 0, A: eq?.A.size ?? 0, B: eq?.B?.size ?? 0, C: eq?.C?.size ?? 0 });
      if (eq) equipos.set(e.club, eq); else { liberar(dentro.map((n) => n.id)); for (const a of lista) if (dentro.some((n) => n.id === a.npc.id)) sinEquipo.push(a); }
    }
    const cupos = cuposPorGrupo(pob.puestos!, TOPE);
    const vistaDe = (id: string): { puesto: string; valores: Record<string, number>; valor: number } | undefined => { const n = m.lista.get(id); if (!n) return undefined; const puesto = puestoDeJugador(n, pob, m.val, m.dia); const valores = valoresPorPuestoDe(n, pob, m.val, m.dia); return puesto && valores ? { puesto, valores, valor: valorEnSuPuesto(n, pob, m.val, m.dia, puesto) } : undefined; };
    const valorId = (id: string): number => vistaDe(id)?.valor ?? 0;
    const grupoId = (id: string): string => { const v = vistaDe(id); return (v && grupoDePuesto(pob.puestos!, v.puesto)) || '?'; };
    const titularesDe = (ids: string[]): Set<string> => new Set(vj.titulares(ids.flatMap((id) => { const v = vistaDe(id); return v ? [{ id, puesto: v.puesto, valores: v.valores, valor: v.valor, estado: { baja: false } as never }] : []; })));
    const descartados: { id: string; club: string; de: string }[] = [];
    /** Sube del equipo de abajo al de arriba a los que serían titulares en él (los mejores primero) sin dejar al de abajo por debajo de 14. */
    const subir = (abajo: Set<string>, arriba: Set<string>): number => {
      const xi = titularesDe([...abajo, ...arriba]);
      let sube = 0;
      for (const id of [...abajo].filter((x) => xi.has(x)).sort((x, y) => valorId(y) - valorId(x) || (x < y ? -1 : 1))) { if (abajo.size - 1 < 14) break; abajo.delete(id); arriba.add(id); sube++; }
      return sube;
    };
    /** Por encima de 22 se descartan los peores del grupo de puestos que más se pasa de su cupo. */
    const recortar = (set: Set<string>, club: string, letra: string): number => {
      let quitados = 0;
      while (set.size > TOPE) {
        const porGrupo = new Map<string, string[]>();
        for (const id of set) (porGrupo.get(grupoId(id)) ?? porGrupo.set(grupoId(id), []).get(grupoId(id))!).push(id);
        const [, ids] = [...porGrupo].sort((a, b) => (b[1].length - (cupos[b[0]] ?? 0)) - (a[1].length - (cupos[a[0]] ?? 0)))[0];
        const peor = [...ids].sort((x, y) => valorId(x) - valorId(y) || (x < y ? -1 : 1))[0];
        set.delete(peor); descartados.push({ id: peor, club, de: letra }); quitados++;
      }
      return quitados;
    };
    for (const e of lugares) {
      const eq = equipos.get(e.club);
      if (!eq) continue;
      const antes = { A: eq.A.size, B: eq.B?.size ?? 0, C: eq.C?.size ?? 0 };
      let cb = 0, ba = 0, dC = 0, dB = 0, dA = 0;
      if (eq.C && eq.B) { cb = subir(eq.C, eq.B); dC = recortar(eq.C, e.club, 'C'); }
      if (eq.B) { ba = subir(eq.B, eq.A); dB = recortar(eq.B, e.club, 'B'); }
      dA = recortar(eq.A, e.club, 'A');
      tr('J2', e.club, { antes, cb, ba, dC, dB, dA, despues: { A: eq.A.size, B: eq.B?.size ?? 0, C: eq.C?.size ?? 0 } });
    }
    for (const d of descartados) liberar([d.id]);
    // J3: los descartados (y los clubes sin equipo) buscan equipo en otros clubes, hasta 3 rondas, con cascada cuando el que llega gana el puesto.
    let pendientes: { id: string; club: string }[] = [...descartados.map((d) => ({ id: d.id, club: d.club })), ...sinEquipo.map((a) => ({ id: a.npc.id, club: '' }))];
    const letrasDe = (eq: Eq): ('A' | 'B' | 'C')[] => (eq.C ? ['A', 'B', 'C'] : eq.B ? ['A', 'B'] : ['A']);
    const equipoParaAnio = (eq: Eq, anio: number): 'A' | 'B' | 'C' => (eq.C ? (anio === 3 ? 'A' : anio === 2 ? 'B' : 'C') : eq.B ? (anio === 1 ? 'B' : 'A') : 'A');
    let abandonan = 0;
    for (let ronda3 = 1; ronda3 <= 3; ronda3++) {
      let colocados = 0, cascadas = 0;
      const salenLibres: { id: string; club: string }[] = [];
      const sinSitio: { id: string; club: string }[] = [];
      /** Mete a `id` en el equipo `letra` del club; si está lleno y gana el puesto, desplaza al peor de su puesto, que baja al equipo de abajo (y así en cascada) o sale libre. */
      const anioId = (id: string): number => { const n = m.lista.get(id); return n ? anioDe(n) : 0; };
      const libre = (id: string, club: string): void => { salenLibres.push({ id, club }); liberar([id]); };
      /** El desplazado de un equipo baja al de abajo (regla del usuario): con hueco, entra; si no, desplaza allí a alguien de su puesto de su año o más joven (el más joven, el más flojo), que sigue bajando; si no lo hay, sale libre el reserva de ese puesto. */
      const bajar = (e: EquipoGuardado, letra: 'A' | 'B' | 'C', w: string): void => {
        const eq = equipos.get(e.club)!;
        const letras = letrasDe(eq);
        const sig = letras[letras.indexOf(letra) + 1];
        if (!sig) { libre(w, e.club); return; }
        const set = eq[sig]!;
        if (set.size < TOPE) { set.add(w); return; }
        const g = grupoId(w), yw = anioId(w);
        const delPuesto = [...set].filter((x) => grupoId(x) === g);
        const jovenes = delPuesto.filter((x) => anioId(x) <= yw).sort((x, y) => anioId(x) - anioId(y) || valorId(x) - valorId(y) || (x < y ? -1 : 1));
        const victima = jovenes[0] ?? [...(delPuesto.length ? delPuesto : [...set])].sort((x, y) => valorId(x) - valorId(y) || (x < y ? -1 : 1))[0];
        set.delete(victima); set.add(w); cascadas++;
        if (jovenes.length) bajar(e, sig, victima); else libre(victima, e.club);
      };
      /** Mete a `id` en el equipo `letra` del club; si está lleno y gana el puesto, desplaza al peor de su puesto, que baja (según la regla) o sale libre. */
      const colocar = (e: EquipoGuardado, letra: 'A' | 'B' | 'C', id: string): boolean => {
        const eq = equipos.get(e.club)!;
        const set = eq[letra]!;
        if (set.size < TOPE) { set.add(id); return true; }
        const g = grupoId(id);
        const rivales = [...set].filter((x) => grupoId(x) === g).sort((x, y) => valorId(x) - valorId(y) || (x < y ? -1 : 1));
        const peor = rivales[0];
        if (!peor || valorId(id) <= valorId(peor)) return false;
        set.delete(peor); set.add(id); cascadas++;
        if (vj.cascada === 'usuario') { bajar(e, letra, peor); return true; }
        const letras = letrasDe(eq);
        const siguiente = letras[letras.indexOf(letra) + 1];
        if (!siguiente || !colocar(e, siguiente, peor)) libre(peor, e.club);
        return true;
      };
      for (const p of [...pendientes].sort((x, y) => valorId(y.id) - valorId(x.id) || (x.id < y.id ? -1 : 1))) {
        const n = m.lista.get(p.id);
        if (!n || n.deporte !== undefined) continue;
        const a = bolsa().find((z) => z.npc.id === p.id);
        let ok = false;
        for (const e of lugares) {
          if (e.club === p.club || (e.colegio !== undefined && (!a || a.colegio !== e.colegio))) continue;
          const eq = equipos.get(e.club);
          if (!eq) continue;
          if (!intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true, relajado: true }).entra) continue;
          const letra = equipoParaAnio(eq, anioDe(m.lista.get(p.id)!));
          if (colocar(e, letra, p.id)) { ok = true; colocados++; break; }
          liberar([p.id]);
        }
        if (!ok) sinSitio.push(p);
      }
      pendientes = [...sinSitio, ...salenLibres];
      tr('J3', undefined, { ronda: ronda3, intentan: colocados + sinSitio.length, colocados, cascadas, salenLibres: salenLibres.length, sinSitio: sinSitio.length });
    }
    abandonan = pendientes.length;
    for (const p of pendientes) liberar([p.id]);
    tr('fin J3', undefined, { abandonan, abandonanPorAnio: [1, 2, 3].map((k) => pendientes.filter((p) => { const n = m.lista.get(p.id); return n ? anioDe(n) === k : false; }).length), equipos: lugares.map((e) => { const q = equipos.get(e.club); return { club: e.club, A: q?.A.size ?? 0, B: q?.B?.size ?? 0, C: q?.C?.size ?? 0 }; }) });
    // Los equipos de juvenil quedan como los dejó el reparto y los clubes, con su plantilla de siempre (solo medida).
    for (const e of lugares) { const q = equipos.get(e.club); const ls = q ? ([['A', q.A], ['B', q.B], ['C', q.C]] as const).filter(([, x]) => x && x.size > 0) : []; for (const [l, x] of ls) for (const id of x!) { LETRAS_FIJADAS.set(id, l); REPARTO_DE_INICIO.set(id, `${e.club}|${l}`); } ponerK(e, Math.max(1, ls.length)); }
    for (const [e, pl] of plantillasJ) e.plantillaPorCategoria = pl;
    return;
  }
  // 1. Primera ronda: A y B.
  etapa = '1. primera ronda (A y B)';
  if (!verano) {
    for (const e of fuera) ronda(e, 2, atractivoDe(e));
    for (const e of delColegio) ronda(e, 2, null);
  }
  tr('fin de la primera ronda', undefined, { quedan: [...quedan] });
  // Variante de medida (apagada por defecto): pasos 2 y 3 y se detiene aquí.
  const v23 = DIAGNOSTICO.variantePaso23;
  if (v23 && DIAGNOSTICO.variantePrimeraRonda && v23.maxPorEquipo[catId] !== undefined) {
    const cap = v23.maxPorEquipo[catId];
    const orden = [...fuera, ...delColegio];
    const plantillasOriginales = new Map(clubes.map((e) => [e, e.plantillaPorCategoria] as const));
    for (const e of clubes) { e.plantillaPorCategoria = { ...e.plantillaPorCategoria!, max: cap }; ponerK(e, 2); }
    type Sets = { A: Set<string>; B: Set<string>; C?: Set<string>; D?: Set<string> };
    const equipos = new Map<string, Sets>(orden.map((e) => {
      const ms = miembros(e);
      if (verano === 'usuario') return [e.club, { A: new Set<string>(), B: new Set<string>() }] as [string, Sets];
      if (!verano) return [e.club, { A: new Set(ms.filter((n) => !primeroAnio(n)).map((n) => n.id)), B: new Set(ms.filter(primeroAnio).map((n) => n.id)) }] as [string, Sets];
      // Verano: los que ya están en el club (ya con su año nuevo) se reparten por año: con 28 o más se parten en dos equipos por nivel (A y C los de 2.º año; B y D los de 1.º), con 14 a 22 es uno y lo que pasa de 22 vuelve a la bolsa.
      const nivelDe = (n: Npc): number => valorEn(n, pob, m);
      const partir = (xs: Npc[]): Set<string>[] => {
        const orden2 = [...xs].sort((a, b) => nivelDe(b) - nivelDe(a) || (a.id < b.id ? -1 : 1));
        if (orden2.length >= 28) { const mitad = Math.ceil(orden2.length / 2); return [new Set(orden2.slice(0, Math.min(22, mitad)).map((n) => n.id)), new Set(orden2.slice(mitad).slice(0, 22).map((n) => n.id))]; }
        return [new Set(orden2.slice(0, 22).map((n) => n.id))];
      };
      const dos = partir(ms.filter((n) => !primeroAnio(n))), uno = partir(ms.filter(primeroAnio));
      const dentro = new Set([...dos, ...uno].flatMap((x) => [...x]));
      liberar(ms.filter((n) => !dentro.has(n.id)).map((n) => n.id));
      return [e.club, { A: dos[0] ?? new Set(), B: uno[0] ?? new Set(), ...(dos[1] ? { C: dos[1] } : {}), ...(uno[1] ? { D: uno[1] } : {}) }] as [string, Sets];
    }));
    const subidosIds = new Set<string>();
    /** Último paso (apagado por defecto): equilibrar letras. Con A, B, C y D: A con C y B con D, los mejores arriba (los que subieron del B y ya no son mejores que los del C vuelven al B); con A, B y C: A con los mejores de 2.º año y los titulares de 1.º, B solo de 1.er año, C mixto con lo que sobre; con menos letras, sin cambios. Máximo 22, mínimo 14: si un club no cabe, se queda como estaba. */
    const equilibrar = (): void => {
      if (!v23.equilibrar) return;
      const vista = (id: string) => { const n = m.lista.get(id); if (!n) return undefined; const puesto = puestoDeJugador(n, pob, m.val, m.dia); const valores = valoresPorPuestoDe(n, pob, m.val, m.dia); return puesto && valores ? { puesto, valores, valor: valorEnSuPuesto(n, pob, m.val, m.dia, puesto) } : undefined; };
      const valorId = (id: string): number => vista(id)?.valor ?? 0;
      const grupoId = (id: string): string => { const v = vista(id); return (v && grupoDePuesto(pob.puestos!, v.puesto)) || '?'; };
      const xiDe = (ids: string[]): Set<string> => new Set(v23.titulares(ids.flatMap((id) => { const v = vista(id); return v ? [{ id, puesto: v.puesto, valores: v.valores, valor: v.valor, estado: { baja: false } as never }] : []; })));
      const media = (ids: string[]): number => (ids.length ? ids.reduce((a, id) => a + valorId(id), 0) / ids.length : 0);
      const nivel = (ids: Set<string>): { media: number; once: number } => ({ media: media([...ids]), once: media([...xiDe([...ids])]) });
      const orde = (xs: string[]): string[] => [...xs].sort((x, y) => valorId(y) - valorId(x) || (x < y ? -1 : 1));
      /** Los `n` mejores de la lista: primero los forzados y los de la alineación del juego, y luego por valor sin pasarse del cupo de cada grupo de puestos. */
      const elegir = (pool: string[], n: number, forzados: Set<string> = new Set()): string[] => {
        const cupos = cuposPorGrupo(pob.puestos!, n);
        const xi = xiDe(pool);
        const out: string[] = [];
        const grupos = new Map<string, number>();
        const mete = (id: string): void => { out.push(id); grupos.set(grupoId(id), (grupos.get(grupoId(id)) ?? 0) + 1); };
        for (const id of orde(pool.filter((x) => forzados.has(x)))) if (out.length < n) mete(id);
        for (const id of orde(pool.filter((x) => xi.has(x) && !forzados.has(x)))) if (out.length < n) mete(id);
        for (const id of orde(pool.filter((x) => !out.includes(x)))) if (out.length < n && (grupos.get(grupoId(id)) ?? 0) < (cupos[grupoId(id)] ?? 0)) mete(id);
        for (const id of orde(pool.filter((x) => !out.includes(x)))) if (out.length < n) mete(id);
        return out;
      };
      let cambian = 0, bajan = 0, revertidos = 0;
      const casos = { sinA: 0, sinAUnidos: 0, sinAExceso: 0, desaparecen: 0, cDesbordan: 0, expulsadosC: 0, desaparecidos: 0, colocados: 0, sinSitio: 0 };
      const mejores = { antesCA: 0, antesDB: 0, despuesCA: 0, despuesDB: 0, antesCAonce: 0, antesDBonce: 0, despuesCAonce: 0, despuesDBonce: 0, clubesConC: 0, clubesConD: 0 };
      const unoPrimero = (id: string): boolean => { const n = m.lista.get(id); return !!n && primeroAnio(n); };
      /** Los peores del grupo de puestos que más se pasa de su cupo salen hasta quedar en 22. */
      const recortar = (ids: string[]): { quedan: string[]; salen: string[] } => {
        const quedan = [...ids], salen: string[] = [];
        const cupos = cuposPorGrupo(pob.puestos!, 22);
        while (quedan.length > 22) {
          const porGrupo = new Map<string, string[]>();
          for (const id of quedan) (porGrupo.get(grupoId(id)) ?? porGrupo.set(grupoId(id), []).get(grupoId(id))!).push(id);
          const [, grupo] = [...porGrupo].sort((a, b) => (b[1].length - (cupos[b[0]] ?? 0)) - (a[1].length - (cupos[a[0]] ?? 0)))[0];
          const peor = orde(grupo)[grupo.length - 1];
          quedan.splice(quedan.indexOf(peor), 1); salen.push(peor);
        }
        return { quedan, salen };
      };
      const pendientes: { id: string; club: string; motivo: 'expulsado' | 'desaparecido' }[] = [];
      const sacar = (ids: string[], club: string, motivo: 'expulsado' | 'desaparecido'): void => { liberar(ids); for (const id of ids) pendientes.push({ id, club, motivo }); };
      // 8a. Nunca un B sin A: si un club no puede montar su A (de 14), se juntan A y B en un único A mixto; si no llega a 14, ese equipo desaparece; por encima de 22 salen los peores.
      for (const e of orden) {
        const t = equipos.get(e.club)!;
        // Un B, C o D que no llega a 14 (con el A completo) tampoco existe: desaparece y sus niños buscan sitio.
        if (t.A.size >= 14) {
          const quedan: Set<string>[] = [t.A];
          for (const x of [t.B, t.C, t.D]) {
            if (!x || x.size === 0) continue;
            if (x.size >= 14) { quedan.push(x); continue; }
            casos.desaparecen++; casos.desaparecidos += x.size; sacar([...x], e.club, 'desaparecido');
          }
          if (quedan.length < [t.B, t.C, t.D].filter((x) => x && x.size > 0).length + 1) equipos.set(e.club, { A: quedan[0], B: quedan[1] ?? new Set(), ...(quedan[2] ? { C: quedan[2] } : {}), ...(quedan[3] ? { D: quedan[3] } : {}) });
          continue;
        }
        if (t.A.size + t.B.size + (t.C?.size ?? 0) === 0) continue;
        casos.sinA++;
        let union = [...t.A, ...t.B];
        const resto: Set<string>[] = [t.C, t.D].filter((x): x is Set<string> => !!x && x.size > 0).filter((x) => { if (x.size >= 14) return true; casos.desaparecen++; casos.desaparecidos += x.size; sacar([...x], e.club, 'desaparecido'); return false; });
        if (union.length < 14) { casos.desaparecen++; sacar(union, e.club, 'desaparecido'); casos.desaparecidos += union.length; union = []; }
        else { casos.sinAUnidos++; if (union.length > 22) { const r = recortar(union); casos.sinAExceso++; casos.expulsadosC += r.salen.length; sacar(r.salen, e.club, 'expulsado'); union = r.quedan; } }
        const lista = [...(union.length ? [new Set(union)] : []), ...resto];
        equipos.set(e.club, { A: lista[0] ?? new Set(), B: lista[1] ?? new Set(), ...(lista[2] ? { C: lista[2] } : {}), ...(lista[3] ? { D: lista[3] } : {}) });
        tr('equilibrio sin A', e.club, { unidos: union.length, quedan: lista.map((x) => x.size) });
      }
      // 8b. Equilibrar A con C y B con D (o A, B y C).
      for (const e of orden) {
        const t = equipos.get(e.club)!;
        if (!t.C || t.C.size === 0) continue;
        const letrasAntes = new Map<string, string>();
        for (const l of ['A', 'B', 'C', 'D'] as const) for (const id of t[l] ?? []) letrasAntes.set(id, l);
        const antes = { A: nivel(t.A), B: nivel(t.B), C: nivel(t.C), D: t.D && t.D.size ? nivel(t.D) : undefined };
        let A2: string[], B2: string[], C2: string[], D2: string[] = [];
        let tipo: string;
        let nBajan = 0;
        if (t.D && t.D.size) {
          tipo = 'ABCD';
          const sA = t.A.size, sB = t.B.size;
          A2 = elegir([...t.A, ...t.C], sA);
          const resto = [...t.A, ...t.C].filter((id) => !A2.includes(id));
          const baja = resto.filter((id) => subidosIds.has(id) && t.A.has(id));
          nBajan = baja.length;
          C2 = resto.filter((id) => !baja.includes(id));
          B2 = elegir([...t.B, ...t.D, ...baja], Math.min(22, sB + nBajan));
          D2 = [...t.B, ...t.D, ...baja].filter((id) => !B2.includes(id));
        } else {
          tipo = 'ABC';
          const todos = [...t.A, ...t.B, ...t.C];
          const s1xi = new Set(todos.filter((id) => unoPrimero(id) && xiDe(todos).has(id)));
          let poolB: string[] = [];
          // Si con los titulares de 1.º arriba al B no le quedan 14 de primer año, el más flojo de esos titulares se queda en el B (y el A coge al siguiente de 2.º año).
          for (;;) {
            A2 = elegir(todos.filter((id) => !unoPrimero(id) || s1xi.has(id)), t.A.size, s1xi);
            poolB = todos.filter((id) => unoPrimero(id) && !A2.includes(id));
            const flojo = orde([...s1xi])[s1xi.size - 1];
            if (poolB.length >= 14 || !flojo) break;
            s1xi.delete(flojo);
          }
          B2 = elegir(poolB, Math.min(t.B.size, poolB.length));
          C2 = todos.filter((id) => !A2.includes(id) && !B2.includes(id));
        }
        // Un equipo nunca pasa de 22: si el C (o el D) sale con más, primero se llenan el A y el B hasta 22 con los mejores que les valgan (al B, solo de 1.er año en A, B y C) y los que aún sobran salen.
        let salen: string[] = [];
        let desborda = false;
        if (C2.length > 22) {
          desborda = true;
          for (const id of orde(C2)) { if (A2.length >= 22) break; A2.push(id); C2 = C2.filter((x) => x !== id); }
          if (tipo === 'ABC') for (const id of orde(C2.filter(unoPrimero))) { if (B2.length >= 22) break; B2.push(id); C2 = C2.filter((x) => x !== id); }
          if (C2.length > 22) { const r = recortar(C2); C2 = r.quedan; salen = salen.concat(r.salen); }
        }
        if (D2.length > 22) {
          desborda = true;
          for (const id of orde(D2)) { if (B2.length >= 22) break; B2.push(id); D2 = D2.filter((x) => x !== id); }
          if (D2.length > 22) { const r = recortar(D2); D2 = r.quedan; salen = salen.concat(r.salen); }
        }
        const rango = [A2, B2, C2, ...(D2.length ? [D2] : [])].every((x) => x.length >= 14 && x.length <= 22);
        if (!rango) { revertidos++; tr('equilibrio', e.club, { tipo, revertido: true, tamanos: [A2.length, B2.length, C2.length, D2.length] }); continue; }
        if (desborda) casos.cDesbordan++;
        casos.expulsadosC += salen.length;
        if (salen.length) sacar(salen, e.club, 'expulsado');
        const nuevo: Sets = { A: new Set(A2), B: new Set(B2), C: new Set(C2), ...(D2.length ? { D: new Set(D2) } : {}) };
        const despues = { A: nivel(nuevo.A), B: nivel(nuevo.B), C: nivel(nuevo.C!), D: nuevo.D ? nivel(nuevo.D) : undefined };
        let ca = 0;
        for (const l of ['A', 'B', 'C', 'D'] as const) for (const id of nuevo[l] ?? []) if (letrasAntes.get(id) !== l) ca++;
        cambian += ca; bajan += nBajan;
        mejores.clubesConC++;
        if (antes.C.media > antes.A.media) mejores.antesCA++;
        if (despues.C.media > despues.A.media) mejores.despuesCA++;
        if (antes.C.once > antes.A.once) mejores.antesCAonce++;
        if (despues.C.once > despues.A.once) mejores.despuesCAonce++;
        if (antes.D && despues.D) { mejores.clubesConD++; if (antes.D.media > antes.B.media) mejores.antesDB++; if (despues.D.media > despues.B.media) mejores.despuesDB++; if (antes.D.once > antes.B.once) mejores.antesDBonce++; if (despues.D.once > despues.B.once) mejores.despuesDBonce++; }
        equipos.set(e.club, nuevo);
        tr('equilibrio', e.club, { tipo, cambian: ca, bajan: nBajan, antes, despues });
      }
      // 8c. Los que han salido (expulsados o de equipos desaparecidos) buscan sitio en otro club (colegios, solo sus alumnos), por valor: B si es mixto o son de 1.er año, A, C, D; hasta 22.
      const lugares = [...delColegio, ...fuera];
      for (const p of pendientes.sort((a, b) => valorId(b.id) - valorId(a.id) || (a.id < b.id ? -1 : 1))) {
        const n = m.lista.get(p.id);
        let sitio: string | undefined;
        if (n && n.deporte === undefined) {
          for (const relajado of [false, true]) {
            for (const letra of ['B', 'A', 'C', 'D'] as const) {
              for (const e of lugares) {
                if (sitio || e.club === p.club) continue;
                const t = equipos.get(e.club)!;
                const set = t[letra];
                if (!set || set.size < 14 || set.size >= 22) continue;
                if ((letra === 'B' || letra === 'C' || letra === 'D') && !primeroAnio(n) && ![...set].some((id) => !unoPrimero(id))) continue;
                if (intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true, ...(relajado ? { relajado: true } : {}) }).entra) { set.add(p.id); sitio = `${e.club} ${letra}`; }
              }
            }
            if (sitio) break;
          }
        }
        if (sitio) casos.colocados++; else casos.sinSitio++;
        tr('equilibrio sale', p.club, { id: p.id, motivo: p.motivo, destino: sitio ?? 'fuera' });
      }
      tr('fin equilibrio', undefined, { cambian, bajan, revertidos, ...casos, ...mejores, equipos: orden.map((e) => { const t = equipos.get(e.club)!; return { club: e.club, A: t.A.size, B: t.B.size, C: t.C?.size ?? 0, D: t.D?.size ?? 0 }; }) });
      // Los equipos y sus letras se guardan (solo en la medida): `fijarEquipos` los respeta.
      for (const e of orden) { const t = equipos.get(e.club)!; const ls = (['A', 'B', 'C', 'D'] as const).filter((l) => t[l] && t[l]!.size > 0); for (const l of ls) for (const id of t[l]!) { LETRAS_FIJADAS.set(id, l); REPARTO_DE_INICIO.set(id, `${e.club}|${l}`); } ponerK(e, Math.max(1, ls.length)); }
    };
    if (verano === 'usuario') {
      // El verano del usuario (solo medida): abandonos a una lista, los que buscan fuera a una reserva, los clubes externos de más a menos atractivo reorganizan y reciben a los que buscan y al mercado; luego los
      // colegios (con la lista de abandonos) y, al final, cada club se reorganiza como siempre (A fuerte, B de 1.º, C mixto; 14 a 22).
      const TOPE = 22;
      const edadDe = (n: Npc): number => edadDeJuego(n, m.dia) ?? -1;
      const tipoDe = (e: EquipoGuardado): string => (e.colegio !== undefined ? 'colegio' : (e.tamano ?? (e.calidad >= 3 ? 'grande' : e.calidad === 2 ? 'mediano' : 'pequeno')));
      for (const e of clubes) e.plantillaPorCategoria = { ...e.plantillaPorCategoria!, max: TOPE };
      const externos = [...fuera];
      const st = { abandonos: 0, buscan: 0, buscanSube: 0, buscanBaja: 0, consiguen: 0, vuelven: 0, recuperadosDeLaLista: 0, clubesSinEquipo: 0, equiposDeColegioDeshechos: 0, deColegioAMediaTabla: 0, desplazados: 0, mercadoColocados: 0, mercadoSinSitio: 0, colegiosAntes: 0, colegiosDespues: 0, sobranEnSuClub: 0, sobranEnOtroClub: 0, sobranSinSitio: 0, vueltasDeAcople: 0, mueve: {} as Record<string, number> };
      const mueve = (de: string, a: string): void => { const k = `${de}>${a}`; st.mueve[k] = (st.mueve[k] ?? 0) + 1; };
      type Cand = { id: string; sentido: 'mercado' | 'sube' | 'baja'; origen?: EquipoGuardado; viejo?: Npc; intentos: number; ronda2?: boolean; desplazado?: boolean };
      const candidatos = new Map<string, Cand>();
      const presentes = (e: EquipoGuardado): Npc[] => miembros(e).filter((n) => !n.id.startsWith('personaje@'));
      const nivelDe = (n: Npc): number => valorEn(n, pob, m);
      for (const e of clubes) if (e.colegio !== undefined && presentes(e).length >= 14) st.colegiosAntes += Math.floor(presentes(e).length / 14);
      st.colegiosAntes = Math.max(st.colegiosAntes, 0);
      // 0. La lista de abandonos de la categoría (último recurso de los colegios).
      const lista = [...(DIAGNOSTICO.abandonosDelVerano ?? [])].map((id) => m.lista.get(id)).filter((n): n is Npc => !!n && n.deporte === undefined && !!n.genetica && edades.includes(edadDe(n)));
      st.abandonos = lista.length;
      // 1. Quién busca otras oportunidades (las mismas reglas de hoy: ambición, lo bien que juega, los padres; un suplente de un grande puede bajar a uno menor) y se va a la reserva: no pierde su sitio.
      for (const e of [...externos, ...delColegio]) {
        const ms = presentes(e).sort((a, b) => nivelDe(a) - nivelDe(b) || (a.id < b.id ? -1 : 1));
        if (ms.length < 14) continue;
        const xi = e.colegio === undefined ? new Set(v23.titulares(ms.flatMap((n) => { const puesto = puestoDeJugador(n, pob, m.val, m.dia); const valores = valoresPorPuestoDe(n, pob, m.val, m.dia); return puesto && valores ? [{ id: n.id, puesto, valores, valor: valorEnSuPuesto(n, pob, m.val, m.dia, puesto), estado: { baja: false } as never }] : []; }))) : new Set<string>();
        const tasa = e.colegio !== undefined ? PRUEBAN_FUERA.colegio : PRUEBAN_FUERA.club;
        for (const [i, n] of ms.entries()) {
          const percentil = ms.length > 1 ? i / (ms.length - 1) : 0.5;
          const gana = probabilidadDeFichar(n.rasgos, n.genetica?.padres) / 0.35;
          const ambicion = ((n.rasgos?.caracter.ambicion ?? 0) + 50) / 100;
          if (e.colegio !== undefined && ambicion < 0.5) continue; // en un colegio, quien no tiene ambición no busca fuera (salvo que se quede sin equipo)
          const alumnoDe = (x: EquipoGuardado): boolean => x.colegio === undefined || colegioDeNino(n) === x.colegio;
          const mejores = pob.equipos.filter((x) => x.plantillaPorCategoria && x.colegio === undefined && x.calidad > e.calidad && alumnoDe(x));
          let sentido: 'sube' | 'baja' | undefined;
          if (mejores.length && rngEstable('ficha-usuario', n.genetica?.semilla ?? 0, n.id, e.club, m.dia).chance(Math.min(0.6, tasa * gana * (0.5 + percentil)))) sentido = 'sube';
          else if (e.colegio === undefined && !xi.has(n.id) && xi.size > 0 && rngEstable('ficha-baja-usuario', n.genetica?.semilla ?? 0, n.id, e.club, m.dia).chance(0.03 + 0.12 * ambicion)) sentido = 'baja';
          if (!sentido) continue;
          candidatos.set(n.id, { id: n.id, sentido, origen: e, viejo: n, intentos: 0 });
          liberar([n.id]);
          st.buscan++; if (sentido === 'sube') st.buscanSube++; else st.buscanBaja++;
        }
      }
      // El mercado: los que quieren jugar y no tienen equipo (sin los que se quedan en su colegio, que solo ven los colegios).
      for (const a of bolsa()) if (!quedan.has(a.npc.id) && !candidatos.has(a.npc.id)) candidatos.set(a.npc.id, { id: a.npc.id, sentido: 'mercado', intentos: 0 });
      // 2. Los clubes externos, de más a menos atractivo.
      for (const [indice, e] of externos.entries()) {
        const k = Math.min(4, (DIAGNOSTICO.equiposPrevios?.get(`${e.club}|${catId}`) ?? 0) + 2);
        e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: k };
        if (k <= 1) delete e.equiposPorCategoria[catId];
        const cola = [...candidatos.values()].filter((c) => {
          if (c.sentido === 'mercado') return !c.desplazado || c.intentos < 2;
          if (c.sentido === 'sube') return !!c.origen && e.calidad > c.origen.calidad && c.intentos < 3;
          return !!c.origen && e.calidad < c.origen.calidad && c.intentos < 2 && indice > externos.indexOf(c.origen);
        }).map((c) => ({ c, n: m.lista.get(c.id) })).filter((x): x is { c: Cand; n: Npc } => !!x.n && x.n.deporte === undefined).sort((a, b) => nivelDe(b.n) - nivelDe(a.n) || (a.c.id < b.c.id ? -1 : 1));
        for (const { c, n } of cola) {
          if (!candidatos.has(c.id)) continue;
          const res = intentarEntrar(m, n, e, pob, {});
          if (!res.entra) { c.intentos++; continue; }
          candidatos.delete(c.id);
          if (c.sentido === 'mercado') st.mercadoColocados++; else { st.consiguen++; mueve(tipoDe(c.origen!), tipoDe(e)); }
          if (res.desplazado) { st.desplazados++; candidatos.set(res.desplazado.id, { id: res.desplazado.id, sentido: 'mercado', intentos: 0, desplazado: true }); }
        }
      }
      // 3. Los que buscaban y no encajaron vuelven a su sitio.
      for (const c of [...candidatos.values()].filter((x) => x.sentido !== 'mercado')) { m.lista.set(c.id, c.viejo!); candidatos.delete(c.id); st.vuelven++; }
      // Los colegios: sus alumnos del mercado entran en su colegio; con menos de 14 en un equipo, tiran de la lista de abandonos; si ni así, el equipo se deshace y sus niños buscan en los clubes de media tabla para abajo.
      const mediaTabla = externos.slice(Math.max(0, Math.ceil(externos.length / 2) - 1));
      const sinEquipo: Cand[] = [];
      for (const e of delColegio) {
        for (const a of bolsa().filter((x) => x.colegio === e.colegio && quedan.has(x.npc.id))) {
          const n = m.lista.get(a.npc.id);
          if (n && n.deporte === undefined) { e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: 4 }; if (intentarEntrar(m, n, e, pob, { sinPrueba: true, soloHueco: true, relajado: true }).entra) candidatos.delete(a.npc.id); }
        }
        let n = presentes(e).length;
        if (n > 0 && n < 14) {
          for (const x of lista.filter((y) => colegioDeNino(y) === e.colegio).sort((a, b) => nivelDe(b) - nivelDe(a))) {
            if (n >= 14) break;
            const nuevo: Npc = { ...x, dejado: (x.dejado ?? []).filter((d) => d !== pob.deporte) };
            m.lista.set(x.id, nuevo);
            if (intentarEntrar(m, nuevo, e, pob, { sinPrueba: true, soloHueco: true, relajado: true }).entra) { n++; st.recuperadosDeLaLista++; } else m.lista.set(x.id, x);
          }
        }
        n = presentes(e).length;
        if (n > 0 && n < 14) {
          st.equiposDeColegioDeshechos++;
          for (const x of presentes(e)) { liberar([x.id]); sinEquipo.push({ id: x.id, sentido: 'mercado', intentos: 0, ronda2: true }); DIAGNOSTICO.alDesplazar?.({ id: x.id, desde: e.club, motivo: 'cierre' }); }
        }
        const kk = Math.max(1, Math.floor(presentes(e).length / 14));
        e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: kk };
        if (kk <= 1) delete e.equiposPorCategoria[catId];
      }
      // La ronda de los que se quedaron sin equipo de colegio: de la media tabla para abajo (puede provocar desplazados y que se monte un C o un D).
      let pendientes = sinEquipo;
      for (let vuelta = 0; vuelta < 2 && pendientes.length; vuelta++) {
        const siguientes: Cand[] = [];
        for (const c of pendientes) {
          const n = m.lista.get(c.id);
          if (!n || n.deporte !== undefined) continue;
          let dentro = false;
          for (const e of mediaTabla) {
            e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: 4 };
            const res = intentarEntrar(m, n, e, pob, {});
            if (res.entra) { dentro = true; st.deColegioAMediaTabla++; mueve('colegio', tipoDe(e)); if (res.desplazado) siguientes.push({ id: res.desplazado.id, sentido: 'mercado', intentos: 0 }); break; }
          }
          void dentro;
        }
        pendientes = siguientes;
      }
      // 4. Al final, cada club se reorganiza como siempre.
      // 4. Al final, cada club se reorganiza como siempre; quien no cabe en un equipo de 14 a 22 busca otro (en su club si hay sitio en otra letra; si no, en otros clubes, con el barrido de siempre).
      const reorganizar = (e: EquipoGuardado): { sets: Sets; sobran: Npc[] } => {
        const ms = presentes(e);
        const T = ms.length;
        const porNivel = (xs: Npc[]): Npc[] => [...xs].sort((a, b) => nivelDe(b) - nivelDe(a) || (a.id < b.id ? -1 : 1));
        if (T < 14) return { sets: { A: new Set(), B: new Set() }, sobran: ms };
        if (catId === 'juvenil') {
          // Juvenil, con sus letras (A = 3.º año, B = 2.º, C = 1.º): 3 equipos con 14 o más de cada año; 2 (A de 3.º y 2.º, B de 1.º) con 14 de 3.º y 2.º juntos y 14 de 1.º; si no, uno mixto; hasta 22.
          const anio = (x: Npc): number => (edadDe(x) - cat.edadMin) + 1;
          const y3 = porNivel(ms.filter((x) => anio(x) >= 3)), y2 = porNivel(ms.filter((x) => anio(x) === 2)), y1 = porNivel(ms.filter((x) => anio(x) <= 1));
          const equiposJ: Npc[][] = y3.length >= 14 && y2.length >= 14 && y1.length >= 14 ? [y3, y2, y1] : y3.length + y2.length >= 14 && y1.length >= 14 ? [porNivel([...y3, ...y2]), y1] : [porNivel(ms)];
          const out = equiposJ.map((eq) => eq.slice(0, TOPE));
          const sobranJ = equiposJ.flatMap((eq) => eq.slice(TOPE));
          return { sets: { A: new Set((out[0] ?? []).map((x) => x.id)), B: new Set((out[1] ?? []).map((x) => x.id)), ...(out[2] ? { C: new Set(out[2].map((x) => x.id)) } : {}) }, sobran: sobranJ };
        }
        // A = los de 2.º año más los mejores de 1.º hasta 22 (sin dejar al B por debajo de 14); B = los mejores de 1.º que quedan; lo que pasa de 22 en uno forma un C mixto (y un D); lo que no cabe, busca equipo.
        const dos = porNivel(ms.filter((x) => !primeroAnio(x))), uno = porNivel(ms.filter(primeroAnio));
        let A0: Npc[] = [], B0: Npc[] = [], resto: Npc[] = [];
        if (dos.length >= TOPE) { A0 = dos.slice(0, TOPE); const poolB = porNivel([...dos.slice(TOPE), ...uno]); B0 = poolB.slice(0, TOPE); resto = poolB.slice(TOPE); }
        else {
          A0 = [...dos];
          const primeros = [...uno];
          while (A0.length < TOPE && primeros.length > 14) A0.push(primeros.shift()!);
          while (A0.length < 14 && primeros.length) A0.push(primeros.shift()!);
          if (primeros.length < 14) { while (A0.length < TOPE && primeros.length) A0.push(primeros.shift()!); resto = primeros; }
          else { B0 = primeros.slice(0, TOPE); resto = primeros.slice(TOPE); }
        }
        const sob = porNivel(resto);
        const C0 = sob.length >= 14 ? sob.slice(0, TOPE) : [];
        const D0 = sob.length - C0.length >= 14 ? sob.slice(TOPE, 2 * TOPE) : [];
        return { sets: { A: new Set(A0.map((x) => x.id)), B: new Set(B0.map((x) => x.id)), ...(C0.length ? { C: new Set(C0.map((x) => x.id)) } : {}), ...(D0.length ? { D: new Set(D0.map((x) => x.id)) } : {}) }, sobran: sob.filter((x) => !C0.includes(x) && !D0.includes(x)) };
      };
      for (let vuelta = 0; vuelta < 3; vuelta++) {
        const sobran: { n: Npc; e: EquipoGuardado }[] = [];
        for (const e of orden) { const r = reorganizar(e); equipos.set(e.club, r.sets); for (const n of r.sobran) sobran.push({ n, e }); }
        if (!sobran.length) break;
        st.vueltasDeAcople++;
        // En su club, si hay sitio en otra letra.
        const pendientesDeAcople: Npc[] = [];
        for (const { n, e } of sobran.sort((a, b) => nivelDe(b.n) - nivelDe(a.n) || (a.n.id < b.n.id ? -1 : 1))) {
          const t = equipos.get(e.club)!;
          const letras = (['A', 'B', 'C', 'D'] as const).filter((l) => t[l] && t[l]!.size > 0 && t[l]!.size < TOPE && (l !== 'B' || primeroAnio(n)));
          if (letras.length) { t[letras[0]]!.add(n.id); st.sobranEnSuClub++; } else pendientesDeAcople.push(n);
        }
        if (!pendientesDeAcople.length) break;
        // Si no, a buscar en otros clubes con el barrido de siempre (de más a menos atractivo; dos pruebas por niño).
        const antesDeLiberar = new Map(pendientesDeAcople.map((n) => [n.id, n.equipo]));
        for (const n of pendientesDeAcople) { liberar([n.id]); DIAGNOSTICO.alDesplazar?.({ id: n.id, desde: antesDeLiberar.get(n.id) ?? '', motivo: 'sobra' }); candidatos.set(n.id, { id: n.id, sentido: 'mercado', intentos: 0, desplazado: true }); }
        let colocados = 0;
        for (const e of externos) {
          const k = Math.min(4, (DIAGNOSTICO.equiposPrevios?.get(`${e.club}|${catId}`) ?? 0) + 2);
          e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: k };
          const cola = pendientesDeAcople.map((n) => ({ n: m.lista.get(n.id), id: n.id })).filter((x) => !!x.n && x.n.deporte === undefined && (candidatos.get(x.id)?.intentos ?? 9) < 2);
          for (const { n, id } of cola) {
            if (!n) continue;
            const c = candidatos.get(id);
            if (!c) continue;
            const res = intentarEntrar(m, n, e, pob, {});
            if (!res.entra) { c.intentos++; continue; }
            candidatos.delete(id); colocados++; st.sobranEnOtroClub++;
            if (res.desplazado) { st.desplazados++; candidatos.set(res.desplazado.id, { id: res.desplazado.id, sentido: 'mercado', intentos: 0, desplazado: true }); pendientesDeAcople.push(res.desplazado); }
          }
        }
        if (!colocados) break;
      }
      // Última pasada: con lo que han dejado los barridos, cada club monta sus equipos; quien aún no cabe en ninguno queda sin equipo.
      for (const e of orden) {
        const r = reorganizar(e);
        equipos.set(e.club, r.sets);
        for (const n of r.sobran.sort((a, b) => nivelDe(b) - nivelDe(a) || (a.id < b.id ? -1 : 1))) {
          const t = r.sets;
          const letras = (['A', 'B', 'C', 'D'] as const).filter((l) => t[l] && t[l]!.size > 0 && t[l]!.size < TOPE && (l !== 'B' || primeroAnio(n)));
          if (letras.length) { t[letras[0]]!.add(n.id); st.sobranEnSuClub++; } else { liberar([n.id]); st.sobranSinSitio++; DIAGNOSTICO.alDesplazar?.({ id: n.id, desde: e.club, motivo: 'sobra' }); }
        }
      }
      for (const e of delColegio) { const t = equipos.get(e.club); st.colegiosDespues += t ? [t.A, t.B, t.C, t.D].filter((x) => x && x.size >= 14).length : 0; }
      st.colegiosAntes = Math.max(st.colegiosAntes, 0);
      for (const c of candidatos.values()) if (c.sentido === 'mercado' && m.lista.get(c.id)?.deporte === undefined) st.mercadoSinSitio++;
      tr('verano usuario', undefined, { ...st, mueve: undefined, ...Object.fromEntries(Object.entries(st.mueve).map(([k, v]) => [`mueve_${k}`, v])) });
      if (catId === 'juvenil') {
        for (const e of orden) { const t = equipos.get(e.club)!; const ls = (['A', 'B', 'C'] as const).filter((l) => t[l] && t[l]!.size > 0); for (const l of ls) for (const id of t[l]!) { LETRAS_FIJADAS.set(id, l); REPARTO_DE_INICIO.set(id, `${e.club}|${l}`); } ponerK(e, Math.max(1, ls.length)); }
        tr('fin equilibrio', undefined, { equipos: orden.map((e) => { const t = equipos.get(e.club)!; return { club: e.club, A: t.A.size, B: t.B.size, C: t.C?.size ?? 0, D: 0 }; }) });
      } else equilibrar();
      for (const [e, pl] of plantillasOriginales) e.plantillaPorCategoria = pl;
      return;
    }
    if (v23.subirTitulares[catId]) {
      for (const e of orden) {
        const t = equipos.get(e.club)!;
        const ms = miembros(e);
        const pool = ms.flatMap((n) => { const puesto = puestoDeJugador(n, pob, m.val, m.dia); const valores = valoresPorPuestoDe(n, pob, m.val, m.dia); return puesto && valores ? [{ id: n.id, puesto, valores, valor: valorEnSuPuesto(n, pob, m.val, m.dia, puesto), estado: { baja: false } as never }] : []; });
        const titulares = new Set(v23.titulares(pool));
        const suben = ms.filter((n) => t.B.has(n.id) && titulares.has(n.id));
        for (const n of suben) { t.B.delete(n.id); t.A.add(n.id); subidosIds.add(n.id); }
        tr('paso 2', e.club, { subidos: suben.length, a: t.A.size, b: t.B.size });
      }
    }
    for (const e of orden) {
      const t = equipos.get(e.club)!;
      const porcentaje = e.colegio === undefined ? atractivoDe(e) : null;
      const toda = visiblePara(e, bolsa());
      const elegibles = toda.filter((a) => e.colegio === undefined || a.colegio === e.colegio);
      const necesitaA = Math.max(0, cap - t.A.size), necesitaB = Math.max(0, cap - t.B.size);
      let van = elegibles;
      if (porcentaje !== null) {
        const pesa = (a: Aspirante): number => { const ambicion = ((a.npc.rasgos?.caracter.ambicion ?? 0) + 50) / 100; return o.conAmbicion ? 0.5 + a.interes * 0.5 + ambicion * (e.calidad - 1) : 1; };
        const clave = (a: Aspirante): number => Math.pow(rngEstable('probar', a.npc.genetica?.semilla ?? 0, a.npc.id, e.club, catId, m.dia).next() || 1e-9, 1 / pesa(a));
        const quieren = Math.min(elegibles.length, Math.round(porcentaje * toda.length));
        van = [...elegibles].sort((x, y) => clave(y) - clave(x) || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, Math.max(quieren, necesitaA + necesitaB));
      }
      let cogidosA = 0, cogidosB = 0;
      for (const [letra, primero, need] of [['A', false, necesitaA], ['B', true, necesitaB]] as const) {
        const elegidos = van.filter((a) => primeroAnio(a.npc) === primero).sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, need);
        for (const a of elegidos) {
          const n = m.lista.get(a.npc.id);
          if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true }).entra) { t[letra].add(a.npc.id); if (primero) cogidosB++; else cogidosA++; }
        }
      }
      tr('paso 3', e.club, { real: miembros(e).length, a: t.A.size, b: t.B.size, cogidosA, cogidosB, veA: van.filter((a) => !primeroAnio(a.npc)).length, veB: van.filter((a) => primeroAnio(a.npc)).length });
    }
    tr('fin del paso 3', undefined, { quedan: [...quedan] });
    if (v23.completarBMixto && v23.subirTitulares[catId]) {
      const tope = v23.completarBMixto;
      for (const e of [...delColegio, ...fuera].filter((x) => equipos.get(x.club)!.B.size < 14)) {
        const t = equipos.get(e.club)!;
        const antes = t.B.size;
        const toda = visiblePara(e, bolsa());
        const elegibles = toda.filter((a) => (e.colegio === undefined || a.colegio === e.colegio) && !primeroAnio(a.npc));
        const need = Math.max(0, tope - t.B.size);
        const porcentaje = e.colegio === undefined ? atractivoDe(e) : null;
        let van = elegibles;
        if (porcentaje !== null) {
          const pesa = (a: Aspirante): number => { const ambicion = ((a.npc.rasgos?.caracter.ambicion ?? 0) + 50) / 100; return o.conAmbicion ? 0.5 + a.interes * 0.5 + ambicion * (e.calidad - 1) : 1; };
          const clave = (a: Aspirante): number => Math.pow(rngEstable('probar', a.npc.genetica?.semilla ?? 0, a.npc.id, e.club, catId, m.dia).next() || 1e-9, 1 / pesa(a));
          const quieren = Math.min(elegibles.length, Math.round(porcentaje * toda.length));
          van = [...elegibles].sort((x, y) => clave(y) - clave(x) || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, Math.max(quieren, need));
        }
        let entran = 0;
        for (const a of van.sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, need)) {
          const n = m.lista.get(a.npc.id);
          if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true }).entra) { t.B.add(a.npc.id); entran++; }
        }
        if (t.B.size < 14) for (const a of [...elegibles].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1))) {
          if (t.B.size >= 14) break;
          const n = m.lista.get(a.npc.id);
          if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true, relajado: true }).entra) { t.B.add(a.npc.id); entran++; }
        }
        tr('paso 4', e.club, { real: miembros(e).length, antes, entran, a: t.A.size, b: t.B.size, ve: elegibles.length });
      }
      tr('fin del paso 4', undefined, { quedan: [...quedan], mixtos: [...equipos].filter(([, t]) => [...t.B].some((id) => { const n = m.lista.get(id); return n && !primeroAnio(n); })).map(([club]) => club) });
      if (v23.reagrupar) {
        const nivel = (id: string): number => { const n = m.lista.get(id); return n ? valorEn(n, pob, m) : 0; };
        const porNivel = (x: string, y: string): number => nivel(y) - nivel(x) || (x < y ? -1 : 1);
        // Paso 5: el club con un equipo que sigue bajo 14 junta a todos sus niños de la categoría y los divide en dos equipos por nivel; si no llegan los dos a 14, el B desaparece y sus niños quedan libres.
        for (const e of orden) {
          const t = equipos.get(e.club)!;
          if (t.A.size === 0 && t.B.size === 0) continue;
          if (t.A.size >= 14 && t.B.size >= 14) continue;
          const aAntes = t.A.size, bAntes = t.B.size, total = aAntes + bAntes;
          let resultado: string;
          if (total >= 28) {
            const todos = [...t.A, ...t.B].sort(porNivel);
            const mitad = Math.ceil(total / 2);
            t.A = new Set(todos.slice(0, mitad));
            t.B = new Set(todos.slice(mitad));
            resultado = 'dos equipos por nivel';
          } else {
            liberar([...t.B]);
            t.B = new Set();
            resultado = 'el B desaparece';
          }
          tr('paso 5', e.club, { aAntes, bAntes, total, resultado, a: t.A.size, b: t.B.size });
        }
        // Paso 6a: los colegios forman un C mixto (14 a cap) con sus alumnos de la bolsa que quieren seguir en su colegio.
        for (const e of delColegio) {
          const t = equipos.get(e.club)!;
          const cand = bolsa().filter((a) => a.colegio === e.colegio && quedan.has(a.npc.id));
          if (cand.length >= 14) {
            ponerK(e, 3);
            const c = new Set<string>();
            for (const a of [...cand].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, cap)) {
              const n = m.lista.get(a.npc.id);
              if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true }).entra) c.add(a.npc.id);
            }
            if (c.size < 14) for (const a of [...cand].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1))) {
              if (c.size >= 14) break;
              const n = m.lista.get(a.npc.id);
              if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true, relajado: true }).entra) c.add(a.npc.id);
            }
            if (c.size >= 14) t.C = c; else { liberar([...c]); ponerK(e, 2); }
          }
          tr('paso 6a', e.club, { candidatos: cand.length, c: t.C?.size ?? 0, cPrimeros: t.C ? [...t.C].filter((id) => primeroAnio(m.lista.get(id)!)).length : 0 });
        }
        protegerAlColegio = false;
        // Paso 6b: lo que queda se sortea entre los clubes externos (el mismo sorteo de siempre: por club y categoría): cada uno monta un equipo nuevo (C y después D) de 14 mientras queden 14 en la bolsa; lo que sobra entra en esos equipos hasta el máximo.
        const baraja = [...fuera].sort((a, b) => rngEstable('sorteo', catId, a.club, m.dia).next() - rngEstable('sorteo', catId, b.club, m.dia).next());
        const nuevos: { e: EquipoGuardado; letra: 'C' | 'D'; ids: Set<string> }[] = [];
        for (const letra of ['C', 'D'] as const) {
          for (const e of baraja) {
            if (bolsa().length < 14) break;
            const t = equipos.get(e.club)!;
            if (letra === 'D' && !t.C) continue;
            ponerK(e, letra === 'C' ? 3 : 4);
            const toda = bolsa();
            const porcentaje = atractivoDe(e);
            const pesa = (a: Aspirante): number => { const ambicion = ((a.npc.rasgos?.caracter.ambicion ?? 0) + 50) / 100; return o.conAmbicion ? 0.5 + a.interes * 0.5 + ambicion * (e.calidad - 1) : 1; };
            const clave = (a: Aspirante): number => Math.pow(rngEstable('probar', a.npc.genetica?.semilla ?? 0, a.npc.id, e.club, catId, m.dia).next() || 1e-9, 1 / pesa(a));
            const quieren = Math.min(toda.length, Math.round(porcentaje * toda.length));
            const van = [...toda].sort((x, y) => clave(y) - clave(x) || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, Math.max(quieren, 14));
            const ids = new Set<string>();
            for (const a of van.sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, 14)) {
              const n = m.lista.get(a.npc.id);
              if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true }).entra) ids.add(a.npc.id);
            }
            if (ids.size < 14) for (const a of [...bolsa()].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1))) {
              if (ids.size >= 14) break;
              const n = m.lista.get(a.npc.id);
              if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true, relajado: true }).entra) ids.add(a.npc.id);
            }
            if (ids.size >= 14) { t[letra] = ids; nuevos.push({ e, letra, ids }); tr('paso 6b', e.club, { letra, n: ids.size, ve: toda.length, van: van.length }); } else { liberar([...ids]); ponerK(e, letra === 'C' ? 2 : 3); }
          }
        }
        for (const x of nuevos) {
          const antes = x.ids.size;
          for (const a of [...bolsa()].sort((p, q) => q.valor - p.valor || (p.npc.id < q.npc.id ? -1 : 1))) {
            if (x.ids.size >= cap) break;
            const n = m.lista.get(a.npc.id);
            if (n && n.deporte === undefined && intentarEntrar(m, n, x.e, pob, { sinPrueba: !o.conPrueba, soloHueco: true }).entra) x.ids.add(a.npc.id);
          }
          tr('paso 6b resto', x.e.club, { letra: x.letra, antes, despues: x.ids.size });
        }
        tr('fin del paso 6', undefined, { quedan: [...quedan], equipos: orden.map((e) => { const t = equipos.get(e.club)!; return { club: e.club, colegio: e.colegio !== undefined, A: t.A.size, B: t.B.size, C: t.C?.size ?? 0, D: t.D?.size ?? 0, cPrimeros: t.C ? [...t.C].filter((id) => primeroAnio(m.lista.get(id)!)).length : 0 }; }) });
        if (v23.paso7) {
          for (const e of clubes) e.plantillaPorCategoria = { ...e.plantillaPorCategoria!, max: 22 };
          const lugares = [...delColegio, ...fuera];
          const esMixto = (t: Sets): boolean => [...t.B].some((id) => { const n = m.lista.get(id); return !!n && !primeroAnio(n); });
          const probar = (a: Aspirante, relajado: boolean): string | undefined => {
            const n = m.lista.get(a.npc.id);
            if (!n || n.deporte !== undefined) return undefined;
            for (const letra of ['B', 'A'] as const) {
              for (const e of lugares) {
                if (e.colegio !== undefined && e.colegio !== a.colegio) continue;
                const t = equipos.get(e.club)!;
                if (t[letra]!.size === 0 || t[letra]!.size >= 22 || (letra === 'B' && !esMixto(t))) continue;
                if (intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true, ...(relajado ? { relajado: true } : {}) }).entra) { t[letra]!.add(a.npc.id); return `${e.club} ${letra}${letra === 'B' ? ' (mixto)' : ''}${relajado ? ' (sin mirar el cupo del puesto)' : ''}`; }
              }
            }
            return undefined;
          };
          for (const a of [...bolsa()].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1))) {
            const destino = probar(a, false) ?? probar(a, true);
            tr('paso 7', undefined, { id: a.npc.id, colegio: a.colegio, primero: primeroAnio(a.npc), destino: destino ?? 'fuera' });
          }
          tr('fin del paso 7', undefined, { quedan: [...quedan], equipos: orden.map((e) => { const t = equipos.get(e.club)!; return { club: e.club, A: t.A.size, B: t.B.size, C: t.C?.size ?? 0, D: t.D?.size ?? 0 }; }) });
          equilibrar();
        }
      }
    }
    // Benjamín y alevín tras el paso 3: C y D de colegio y sorteo entre externos.
    if (v23.bolsaBA && !v23.subirTitulares[catId]) {
      for (const e of clubes) e.plantillaPorCategoria = { ...e.plantillaPorCategoria!, max: 22 };
      const porValor = (x: Aspirante, y: Aspirante): number => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1);
      const meter = (e: EquipoGuardado, lista: readonly Aspirante[], hasta: number, ids: Set<string>, minimo: number): void => {
        for (const a of lista) { if (ids.size >= hasta) break; const n = m.lista.get(a.npc.id); if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true }).entra) ids.add(a.npc.id); }
        if (ids.size < minimo) for (const a of lista) { if (ids.size >= minimo) break; const n = m.lista.get(a.npc.id); if (n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !o.conPrueba, soloHueco: true, relajado: true }).entra) ids.add(a.npc.id); }
      };
      const deshacer = (e: EquipoGuardado, ids: Set<string>[], k: number): void => { for (const x of ids) liberar([...x]); ponerK(e, k); };
      for (const e of delColegio) {
        const t = equipos.get(e.club)!;
        const cand = bolsa().filter((a) => a.colegio === e.colegio && quedan.has(a.npc.id));
        const y2 = cand.filter((a) => !primeroAnio(a.npc)).sort(porValor), y1 = cand.filter((a) => primeroAnio(a.npc)).sort(porValor);
        let formado = 'ninguno';
        if (y2.length >= 14 && y1.length >= 14) {
          ponerK(e, 4);
          const c = new Set<string>(), d = new Set<string>();
          meter(e, y2, 22, c, 14); meter(e, y1, 22, d, 14);
          if (c.size >= 14 && d.size >= 14) { t.C = c; t.D = d; formado = 'C de 2.º año + D de 1.º'; } else deshacer(e, [c, d], 2);
        }
        if (formado === 'ninguno' && cand.length >= 14) {
          ponerK(e, 3);
          const c = new Set<string>();
          meter(e, [...cand].sort(porValor), 22, c, 14);
          if (c.size >= 14) { t.C = c; formado = 'C mixto'; } else deshacer(e, [c], 2);
        }
        tr('colegio BA', e.club, { candidatos: cand.length, y2: y2.length, y1: y1.length, formado, c: t.C?.size ?? 0, cPrimeros: t.C ? [...t.C].filter((id) => primeroAnio(m.lista.get(id)!)).length : 0, d: t.D?.size ?? 0 });
      }
      protegerAlColegio = false;
      const baraja = [...fuera].sort((a, b) => rngEstable('sorteo', catId, a.club, m.dia).next() - rngEstable('sorteo', catId, b.club, m.dia).next());
      const ahora = bolsa();
      const r2 = ahora.filter((a) => !primeroAnio(a.npc)).length, p2 = ahora.filter((a) => primeroAnio(a.npc)).length;
      const pares = Math.min(Math.floor(r2 / 14), Math.floor(p2 / 14));
      const mixtos = Math.floor((r2 + p2 - 28 * pares) / 14);
      tr('externos BA', undefined, { r2, p2, e2: Math.floor(r2 / 14), e1: Math.floor(p2 / 14), pares, mixtos, clubes: baraja.length });
      const muestra = (e: EquipoGuardado, necesita: number): Aspirante[] => {
        const toda = bolsa();
        const pesa = (a: Aspirante): number => { const ambicion = ((a.npc.rasgos?.caracter.ambicion ?? 0) + 50) / 100; return o.conAmbicion ? 0.5 + a.interes * 0.5 + ambicion * (e.calidad - 1) : 1; };
        const clave = (a: Aspirante): number => Math.pow(rngEstable('probar', a.npc.genetica?.semilla ?? 0, a.npc.id, e.club, catId, m.dia).next() || 1e-9, 1 / pesa(a));
        const quieren = Math.min(toda.length, Math.round(atractivoDe(e) * toda.length));
        return [...toda].sort((x, y) => clave(y) - clave(x) || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, Math.max(quieren, necesita));
      };
      const nuevos: { e: EquipoGuardado; tipo: 'par' | 'mixto'; c: Set<string>; d: Set<string> }[] = [];
      let i = 0;
      for (let n = 0; n < pares && i < baraja.length; n++, i++) {
        const e = baraja[i], t = equipos.get(e.club)!;
        ponerK(e, 4);
        const van = muestra(e, 28);
        const c = new Set<string>(), d = new Set<string>();
        meter(e, [...van.filter((a) => !primeroAnio(a.npc)), ...bolsa().filter((a) => !primeroAnio(a.npc) && !van.some((v) => v.npc.id === a.npc.id))].sort(porValor).filter((a, j, xs) => xs.findIndex((z) => z.npc.id === a.npc.id) === j), 14, c, 14);
        meter(e, [...van.filter((a) => primeroAnio(a.npc)), ...bolsa().filter((a) => primeroAnio(a.npc) && !van.some((v) => v.npc.id === a.npc.id))].sort(porValor).filter((a, j, xs) => xs.findIndex((z) => z.npc.id === a.npc.id) === j), 14, d, 14);
        if (c.size >= 14 && d.size >= 14) { t.C = c; t.D = d; nuevos.push({ e, tipo: 'par', c, d }); tr('par BA', e.club, { c: c.size, d: d.size }); } else deshacer(e, [c, d], 2);
      }
      for (let n = 0; n < mixtos && i < baraja.length; n++, i++) {
        const e = baraja[i], t = equipos.get(e.club)!;
        ponerK(e, 3);
        const c = new Set<string>();
        meter(e, muestra(e, 14).sort(porValor), 14, c, 14);
        if (c.size >= 14) { t.C = c; nuevos.push({ e, tipo: 'mixto', c, d: new Set() }); tr('mixto BA', e.club, { c: c.size }); } else deshacer(e, [c], 2);
      }
      for (const x of nuevos) {
        if (x.tipo === 'par') {
          meter(x.e, bolsa().filter((a) => !primeroAnio(a.npc)).sort(porValor), 22, x.c, 14);
          meter(x.e, bolsa().filter((a) => primeroAnio(a.npc)).sort(porValor), 22, x.d, 14);
        } else meter(x.e, bolsa().sort(porValor), 22, x.c, 14);
        tr('resto BA', x.e.club, { tipo: x.tipo, c: x.c.size, cPrimeros: [...x.c].filter((id) => primeroAnio(m.lista.get(id)!)).length, d: x.d.size });
      }
      tr('fin BA', undefined, { quedan: [...quedan], equipos: orden.map((e) => { const t = equipos.get(e.club)!; return { club: e.club, A: t.A.size, B: t.B.size, C: t.C?.size ?? 0, D: t.D?.size ?? 0 }; }) });
      equilibrar();
    }
    // Los clubes son los mismos objetos en todas las categorías: se devuelve su plantilla como estaba.
    for (const [e, pl] of plantillasOriginales) e.plantillaPorCategoria = pl;
    return;
  }
  // 2. Segunda ronda: C y D. Los equipos que salen con la bolsa (a un mínimo por equipo) se sortean entre clubes y colegios (como mucho dos más cada uno).
  const minimo = Math.min(...clubes.map(minimoDe));
  let equiposQueSalen = Math.min(Math.floor(bolsa().length / minimo), clubes.length * 2);
  const baraja = (xs: readonly EquipoGuardado[]): EquipoGuardado[] => [...xs].sort((a, b) => rngEstable('sorteo', catId, a.club, m.dia).next() - rngEstable('sorteo', catId, b.club, m.dia).next());
  const orden = baraja(clubes);
  const plazas = [...orden.map((e) => ({ e, letra: 'C' })), ...orden.map((e) => ({ e, letra: 'D' }))].slice(0, equiposQueSalen);
  const porClub = new Map<EquipoGuardado, number>();
  for (const p of plazas) porClub.set(p.e, (porClub.get(p.e) ?? 0) + 1);
  tr('sorteo de C y D', undefined, { enBolsa: bolsa().length, minimo, equiposQueSalen, clubes: clubes.length, reparto: [...porClub].map(([e, n]) => `${e.club}: +${n}`) });
  etapa = '2. segunda ronda (C y D)';
  let fallidos = 0;
  for (const [e, mas] of porClub) {
    const kObjetivo = Math.min(MAX_EQUIPOS_POR_CATEGORIA, Math.max(2, kDe(e)) + mas);
    if (kDe(e) < 2) { fallidos += mas; continue; }
    if (!ronda(e, kObjetivo, e.colegio === undefined ? atractivoDe(e) : null)) fallidos += mas;
    else if (kDe(e) < kObjetivo) fallidos += kObjetivo - kDe(e);
  }
  // Los equipos que no se montaron pasan por sorteo a otro club que no tenga ni C ni D.
  etapa = '2b. equipos que no se montaron pasan a otro club';
  for (const e of baraja(clubes.filter((x) => kDe(x) === 2))) {
    if (fallidos <= 0) break;
    if (ronda(e, 3, e.colegio === undefined ? atractivoDe(e) : null)) fallidos--;
  }
  // 3. Ajuste: cada club reordena sus equipos por año; quien no cabe en ninguno vuelve a la bolsa de descartes.
  etapa = '3. ajuste';
  tr('fin de la segunda ronda', undefined, { fallidos });
  for (const e of clubes) ajustar(e);
  // 4. Descartes definitivos: un equipo en su colegio, si lo tiene, o un club con hueco; el resto, apartado ese curso.
  etapa = '4. descartes en el colegio';
  for (const e of delColegio) {
    const suyos = bolsa().filter((a) => a.colegio === e.colegio);
    if (suyos.length >= minimoDe(e) && kDe(e) < MAX_EQUIPOS_POR_CATEGORIA) ronda(e, kDe(e) + 1, null);
  }
  protegerAlColegio = false;
  // Si con los descartes salen equipos de un mínimo, se montan en los clubes con menos equipos (el más pequeño primero).
  etapa = '4b. descartes en los clubes con menos equipos';
  tr('antes de los descartes en los clubes', undefined);
  for (let vuelta = 0; vuelta < 8 && bolsa().length >= minimo; vuelta++) {
    const e = [...fuera].filter((x) => kDe(x) < MAX_EQUIPOS_POR_CATEGORIA).sort((a, b) => kDe(a) - kDe(b) || atractivoDe(a) - atractivoDe(b) || (a.club < b.club ? -1 : 1))[0];
    if (!e || !ronda(e, kDe(e) + 1, 1)) break;
  }
  etapa = '4c. ajuste final';
  for (const e of clubes) ajustar(e);
  // Un club de fuera sin los 14 de un equipo no lo tiene: los pocos que le quedan vuelven a la bolsa.
  // (también el colegio: si no llega a 14 en una categoría, ese curso no saca equipo en ella y sus alumnos van a la bolsa final).
  for (const e of clubes) if (miembros(e).length > 0 && miembros(e).length < minimoDe(e)) liberar(miembros(e).map((n) => n.id));
  let recogidos = 0, apartados = 0;
  for (const a of [...bolsa()].sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1))) {
    let n = m.lista.get(a.npc.id)!;
    let dentro = false;
    // Un club de fuera solo recoge descartes si ya tiene equipo (con el mínimo): no se monta un equipo de 13.
    // Todos los equipos, también el del colegio, necesitan sus 14: solo se entra en un club que ya tiene equipo.
    for (const e of [...delColegio.filter((x) => x.colegio === a.colegio), ...fuera].filter((x) => miembros(x).length >= minimoDe(x))) {
      if (n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: true, soloHueco: true }).entra) { dentro = true; break; }
      n = m.lista.get(a.npc.id)!;
    }
    if (!dentro) m.lista.set(n.id, { ...n, apartado: [...new Set([...(n.apartado ?? []), pob.deporte])] });
    else recogidos++;
    if (!dentro) apartados++;
  }
  tr('fin del reparto de la categoría', undefined, { recogidosEnClubesConEquipo: recogidos, apartados });
}


/** Para medir (`npm run colegios`): se avisa de cada equipo que se cierra por quedar bajo el mínimo, con cuántos jugadores se quedó. No cambia nada del juego. */
export interface FotoDeClub { club: string; colegio?: string; k: number; max: number; plazasDeMas: number; min: number; total: number; primeros: number }
/** Un paso del reparto de una categoría, para contarlo con palabras (`npm run reparto:paso`). Solo mira: no cambia nada del juego. */
export interface EventoDeTraza {
  categoria: string;
  fase: string;
  club?: string;
  datos: Record<string, unknown>;
  /** Cómo está cada club de la categoría ahora (se calcula al pedirlo). */
  foto: () => FotoDeClub[];
  /** Los interesados de la categoría que aún no tienen equipo (se calcula al pedirlo). */
  bolsa: () => { id: string; edad: number; colegio: string; interes: number; valor: number }[];
}
export const DIAGNOSTICO: {
  /** Solo para medir (`npm run reparto:paso -- … --variante paso1-14x2`), apagado por defecto: en la primera ronda cada club recoge `porAnio` niños de primer año y `porAnio` de los demás años (no mira la edad solo si no hay bastantes: aquí no se completa con el otro año). */
  variantePrimeraRonda?: { porAnio: number };
  /** Solo para medir (`--variante juvenil`), apagado por defecto: juvenil (3 años) por año y sin límites (J1), subidas por nivel de abajo arriba con máximo 22 (J2) y descartados que buscan equipo en otros clubes en hasta 3 rondas (J3). `titulares` es la alineación del juego (la pone la herramienta). */
  variantJuvenil?: { /** `usuario`: el desplazado baja al equipo de abajo y allí desplaza a alguien más joven (o del mismo año) de su puesto, que sigue bajando; si no lo hay, sale libre el reserva de ese puesto. Por defecto, el peor del puesto. */ cascada?: 'simple' | 'usuario'; titulares: (jugadores: { id: string; puesto: string; valores: Record<string, number>; valor: number; estado: never }[]) => string[] };
  /** Solo para medir (`--variante paso2-3`, con la anterior), apagado por defecto: tras la primera ronda, 2) en las categorías con `subirTitulares` los de primer año que serían titulares en el A suben a él (`titulares` es la alineación del juego, que pone la herramienta) y 3) cada equipo (el A con los demás años, el B con los de primer año) se completa desde la bolsa hasta `maxPorEquipo`. Se detiene ahí. */
  variantePaso23?: { maxPorEquipo: Record<string, number>; subirTitulares: Record<string, boolean>; /** Paso 4 (solo donde `subirTitulares`): el B que no llega a 14 se completa con niños de 2.º año de la bolsa hasta este número (primero los colegios con sus alumnos); pasa a ser mixto. */ completarBMixto?: number; /** Pasos 5 y 6 (tras el 4): reagrupar los equipos que siguen bajo 14, C mixto de colegio y sorteo entre clubes externos de lo que queda. */ reagrupar?: boolean; /** Paso 7 (infantil y cadete, tras el 6): los que quedan fuera van a un B mixto de un club al que puedan ir y, si no caben, a un A; máximo 22. */ paso7?: boolean; /** Benjamín y alevín tras el paso 3: C y D de colegio con los que quieren seguir y sorteo entre externos (pares C de 2.º año + D de 1.º, y C mixtos hasta 22). */ bolsaBA?: boolean; /** Último paso (medida; salvo juvenil): equilibrar las letras de cada club con A y C o con A, B y C. */ equilibrar?: boolean; titulares: (jugadores: { id: string; puesto: string; valores: Record<string, number>; valor: number; estado: never }[]) => string[] };
  traza?: (d: EventoDeTraza) => void;
  /** Solo para medir (`tools/verano-volumen.ts`): la lista de personas en cada paso del verano (`inicio`, `tras abandono`, `tras fichajes`, `tras reclutar`, `fin`). No cambia nada. */
  alVerano?: (fase: string, lista: readonly Npc[], dia: number) => void;
  /** Solo para medir: el verano usa el método nuevo (los mismos pasos del reparto de inicio, con los equipos que ya existen) en vez de `completarUnaCategoria`, salvo juvenil. */
  veranoNuevo?: boolean;
  /** Solo para medir: el verano del usuario (lista de abandonos, reserva de los que buscan fuera y clubes externos de más a menos atractivo; `docs/relevo/veranos-metodo.md`). */
  veranoUsuario?: boolean;
  /** Los que abandonan este verano (los llena `renovarDeportistas` con `veranoUsuario`). */
  abandonosDelVerano?: Set<string>;
  /** Los equipos (letras distintas) de cada club y categoría del curso que acaba (`club|categoría`), para que el verano del usuario los mantenga. */
  equiposPrevios?: Map<string, number>;
  /** Lo que pasa con un club y categoría al acomodar a los que no caben en ningún equipo (`acomodarSobrantes`). */
  alAcomodar?: NonNullable<MercadoDeFichajes['alAcomodar']>;
  alCerrar?: (d: { club: string; categoria: string; jugadores: number; equipos: number; montables: number }) => void;
  /** Un niño va a probar a otro club por su cuenta (`sube`: hacia un club mejor; `baja`: un suplente de un grande hacia uno menor) y si lo aceptan allí (si no, sigue en su equipo). */
  alProbar?: (d: { id: string; desde: string; hacia: string; sentido: 'sube' | 'baja'; entra: boolean }) => void;
  /** Un niño se queda sin equipo y tiene que buscar otro: `merito` (otro mejor le quita la plaza), `cierre` (cierra su equipo) o `sobra` (el equipo se pasa de su máximo al recolocar). */
  alDesplazar?: (d: { id: string; desde: string; motivo: 'merito' | 'cierre' | 'sobra' }) => void;
  /** Una oferta de puesto de un club a un niño: si la acepta, si era su última opción (sin equipo) y si el puesto era el suyo (su favorito o su grupo). */
  alOfertar?: (d: { id: string; club: string; aceptada: boolean; ultimaOpcion: boolean; esSuyo: boolean }) => void;
  /** Un niño sin equipo entra en uno pasándose del máximo (plaza de más): su club, la categoría y si es un equipo de colegio. */
  alPlazaDeMas?: (d: { id: string; club: string; categoria: string; delColegio: boolean }) => void;
} = {};


/**
 * **Los años siguientes no hay «draft»** (decisión del usuario, 05/11/2026): cada niño sigue en su club (pasa a la categoría que le toque dentro de él) y solo los que empiezan a jugar o se quedaron
 * sin equipo (la bolsa) pasan por un «draft» solo para ellos: en cada categoría, 1) cada club (los de fuera por atractivo; los colegios, con todos sus alumnos) completa los huecos de sus equipos con
 * un porcentaje de la bolsa (por hueco, sin quitarle el sitio a nadie); 2) **un equipo al que le quedan menos de 14 intenta completarse con la bolsa y, solo si no llega, se cierra y sus jugadores
 * buscan otro equipo** (igual para clubes y colegios, sin prioridad especial); 3) con lo que sobra de la bolsa (14 o más) se abre un equipo en el club con menos equipos. Lo que sobre queda
 * apartado (`apartarOLasDeJar` lo decide con los dos plazos). Devuelve los entrenadores nuevos.
 */
export function completarEquipos(m: MercadoDeFichajes, rng: Rng, o: { conPrueba: boolean }): Npc[] {
  const nuevos: Npc[] = [];
  const pobsNuevas: PoblacionGuardada[] = [];
  const cerrados: { id: string; origen: string; no?: string }[] = [];
  for (const pob0 of m.pobs) {
    if (!conDraft(pob0, m.val)) {
      pobsNuevas.push(pob0);
      continue;
    }
    const pob: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.map((e) => ({ ...e })) };
    ajustarPlazasDeMas(m, pob);
    const categorias = new Map<string, CategoriaDef>();
    for (const e of pob.equipos) for (const c of e.plantillaPorCategoria ? categoriasDelEquipo(pob, e) : []) categorias.set(c.id, (pob.categorias ?? []).find((x) => x.id === c.id)!);
    // De la categoría mayor a la menor: así, para salvar un equipo, el club puede subir de la categoría de abajo a quien sería titular arriba (que a su vez se completa después).
    for (const [catId, cat] of [...categorias].sort((a, b) => b[1].edadMin - a[1].edadMin)) {
      if ((DIAGNOSTICO.veranoNuevo || DIAGNOSTICO.veranoUsuario) && DIAGNOSTICO.variantePaso23?.maxPorEquipo[catId] !== undefined) { draftDeUnaCategoria(m, pob, cat, catId, rng, { conPrueba: o.conPrueba, conAmbicion: true }, DIAGNOSTICO.veranoUsuario ? 'usuario' : true); cubrirGruposVacios(m, pob, catId, Array.from({ length: cat.edadMax - cat.edadMin + 1 }, (_, i) => cat.edadMin + i)); continue; }
      cerrados.push(...completarUnaCategoria(m, pob, cat, catId, o));
      cubrirGruposVacios(m, pob, catId, Array.from({ length: cat.edadMax - cat.edadMin + 1 }, (_, i) => cat.edadMin + i));
    }
    pobsNuevas.push(pob);
    m.pobs = [...pobsNuevas, ...m.pobs.slice(pobsNuevas.length)];
    fijarEquipos(m, pob);
    nuevos.push(...entrenadoresDeLosEquipos(m, pob, rng));
  }
  m.pobs = pobsNuevas;
  // Los jugadores de un equipo que se cierra buscan otro equipo como cualquier desplazado.
  colocarDesplazados(m, cerrados);
  // Los que buscan equipo cambian las plantillas: se vuelve a mirar que ningún equipo se quede con un grupo de puestos vacío.
  for (const pob of m.pobs) {
    for (const c of (pob.categorias ?? []).filter((x) => pob.equipos.some((e) => e.plantillaPorCategoria && categoriasDelEquipo(pob, e).some((u) => u.id === x.id)))) cubrirGruposVacios(m, pob, c.id, Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => c.edadMin + i));
  }
  // Nadie queda en un club sin equipo, y se fijan los equipos de la temporada con lo que queda (los ascensos y los que buscaron equipo ya están hechos).
  sinSobrantes(m);
  // Y, en lo último de todo, las plazas de más para el que con interés se queda sin equipo.
  plazasDeMas(m);
  return nuevos;
}


export function completarUnaCategoria(m: MercadoDeFichajes, pob: PoblacionGuardada, cat: CategoriaDef, catId: string, o: { conPrueba: boolean }): { id: string; origen: string; no?: string }[] {
  const clubes = pob.equipos.filter((e) => e.plantillaPorCategoria && categoriasDelEquipo(pob, e).some((c) => c.id === catId));
  if (!clubes.length) return [];
  const edades = Array.from({ length: cat.edadMax - cat.edadMin + 1 }, (_, i) => cat.edadMin + i);
  const kDe = (e: EquipoGuardado): number => e.equiposPorCategoria?.[catId] ?? 1;
  const ponerK = (e: EquipoGuardado, k: number): void => {
    e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: k };
    if (k <= 1) delete e.equiposPorCategoria[catId];
  };
  const miembros = (e: EquipoGuardado): Npc[] => (m.lista instanceof ListaDeTrabajo ? m.lista.deEquipo(pob.deporte, e.club) : [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club)).filter((n) => edades.includes(edadDeJuego(n, m.dia) ?? -1));
  const bolsa = (): Aspirante[] => edades.flatMap((edad) => aspirantesDeEdad([...m.lista.values()], pob, edad, m.dia, m.val)).filter((a) => a.interes > 0);
  const valorDe = (a: Aspirante): number => a.valor;
  // Para contarlo (`DIAGNOSTICO.traza`): no cambia nada.
  const foto = (): FotoDeClub[] => clubes.map((e) => { const ms = miembros(e); return { club: e.club, ...(e.colegio !== undefined ? { colegio: e.colegio } : {}), k: kDe(e), max: e.plantillaPorCategoria?.max ?? 0, plazasDeMas: e.plazasDeMas?.[catId] ?? 0, min: minimoDe(e), total: ms.length, primeros: ms.filter((n) => edadDeJuego(n, m.dia) === cat.edadMin).length }; });
  const tr = (fase: string, datos: Record<string, unknown> = {}): void => {
    if (DIAGNOSTICO.traza) DIAGNOSTICO.traza({ categoria: catId, fase, datos, foto, bolsa: () => bolsa().map((a) => ({ id: a.npc.id, edad: edadNpc(a.npc, m.dia) ?? -1, colegio: a.colegio, interes: a.interes, valor: a.valor })) });
  };
  // **Cada verano, los de cualquier año de un colegio con club deciden de nuevo si van a probar fuera** (decisión del usuario, 17/11/2026): los que se quedan no los ven los clubes de fuera hasta que
  // el colegio ha recibido a los suyos (los que prueban y no entran vuelven a su bolsa); después son descartes como los demás.
  const quedan = losQueSeQuedan(bolsa(), new Set(clubes.flatMap((x) => (x.colegio === undefined ? [] : [x.colegio]))), cat, m.dia);
  let protegerAlColegio = true;
  const elegibles = (e: EquipoGuardado): Aspirante[] => bolsa().filter((a) => (e.colegio === undefined ? !(protegerAlColegio && quedan.has(a.npc.id)) : a.colegio === e.colegio));
  const entrar = (e: EquipoGuardado, a: Aspirante, conPrueba: boolean, nuevo = false, ultimaOpcion = false): boolean => {
    const n = m.lista.get(a.npc.id);
    return !!n && n.deporte === undefined && intentarEntrar(m, n, e, pob, { sinPrueba: !conPrueba, soloHueco: true, equipoNuevo: nuevo, ultimaOpcion }).entra;
  };
  const esPrimero = (a: Aspirante): boolean => (edadNpc(a.npc, m.dia) ?? -1) === cat.edadMin;
  const clavePrueba = (e: EquipoGuardado) => (a: Aspirante): number => {
    const ambicion = ((a.npc.rasgos?.caracter.ambicion ?? 0) + 50) / 100;
    return Math.pow(rngEstable('probar', a.npc.genetica?.semilla ?? 0, a.npc.id, e.club, catId, m.dia).next() || 1e-9, 1 / (0.5 + a.interes * 0.5 + ambicion * (e.calidad - 1)));
  };
  /** Si con el reparto por puestos no llegan a los 14 de un equipo nuevo, los que quedan entran en su puesto favorito aunque su grupo esté lleno (un equipo de once con tres bandas de más es un equipo; uno que no se monta, no). */
  const completarRelajado = (e: EquipoGuardado, hasta: number): void => {
    for (const a of [...elegibles(e)].sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (miembros(e).length >= hasta) break;
      const n = m.lista.get(a.npc.id);
      if (n && n.deporte === undefined) intentarEntrar(m, n, e, pob, { sinPrueba: true, soloHueco: true, relajado: true });
    }
  };
  const fuera = clubes.filter((e) => e.colegio === undefined).sort((a, b) => atractivoDe(b) - atractivoDe(a) || b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
  const delColegio = clubes.filter((e) => e.colegio !== undefined).sort((a, b) => (a.club < b.club ? -1 : 1));
  // **El ascenso del que sería titular arriba** (decisión del usuario, 08/11/2026): un jugador de segundo año de la categoría de abajo del mismo club que sería titular en el A o el B de esta
  // asciende a ella (juega un año por encima: `adelanto`), con dos límites: no deja su equipo por debajo de 14 ni entra en un equipo completo. Con `reponer`, el equipo de abajo puede quedarse corto si la
  // bolsa lo puede completar después (se rehace a su vez). Es la regla general y también la que salva un equipo antes de cerrarlo: el que menos vale del A o el B baja al C o al D (el reparto en equipos lo
  // hace solo al entrar uno más). `promovidos` recoge a los que suben, por si el equipo no se salva y hay que devolverlos.
  const abajo = (pob.categorias ?? []).find((c) => c.edadMax === cat.edadMin - 1);
  const edadesAbajo = abajo ? Array.from({ length: abajo.edadMax - abajo.edadMin + 1 }, (_, i) => abajo.edadMin + i) : [];
  const delClub = (e: EquipoGuardado): Npc[] => (m.lista instanceof ListaDeTrabajo ? m.lista.deEquipo(pob.deporte, e.club) : [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club));
  const ascender = (e: EquipoGuardado, reponer: boolean, promovidos: Npc[]): boolean => {
    if (!abajo || !categoriasDelEquipo(pob, e).some((c) => c.id === abajo.id) || miembros(e).length >= capacidadDe(e, catId)) return false;
    const deAbajo = delClub(e).filter((n) => edadesAbajo.includes(edadDeJuego(n, m.dia) ?? -1));
    const necesita = minimoDe(e) * (e.equiposPorCategoria?.[abajo.id] ?? 1);
    const quedaria = deAbajo.length - 1;
    if (quedaria < necesita) {
      if (!reponer) return false;
      const bolsaDeAbajo = edadesAbajo.flatMap((edad) => aspirantesDeEdad([...m.lista.values()], pob, edad, m.dia, m.val)).filter((a) => a.interes > 0 && (e.colegio === undefined || a.colegio === e.colegio));
      if (bolsaDeAbajo.length < necesita - quedaria) return false;
    }
    const candidatos = deAbajo
      .filter((n) => edadDeJuego(n, m.dia) === abajo.edadMax && !n.adelanto?.[pob.deporte] && !n.id.startsWith('personaje@'))
      .sort((a, b) => valorEn(b, pob, m) - valorEn(a, pob, m) || (a.id < b.id ? -1 : 1))
      .slice(0, 4);
    for (const n of candidatos) {
      const puesto = puestoDeJugador(n, pob, m.val, m.dia);
      if (!puesto) continue;
      const hipotetico: MiembroDeClub = { id: n.id, puesto, valor: valorEnSuPuesto(n, pob, m.val, m.dia, puesto), anio: 1 };
      const { equipos, suplentes } = equiposDelClub(m.lista, pob, e, { id: catId, edades }, m.dia, m.val, [hipotetico]);
      if (!(equipos.A.includes(n.id) || equipos.B.includes(n.id)) || suplentes.includes(n.id)) continue;
      promovidos.push(n);
      m.lista.set(n.id, { ...n, adelanto: { ...(n.adelanto ?? {}), [pob.deporte]: 1 } });
      return true;
    }
    return false;
  };
  /** Devuelve a su categoría a los que subieron para salvar un equipo que no se salva. */
  const devolver = (promovidos: Npc[]): void => {
    for (const n of promovidos) m.lista.set(n.id, n);
    promovidos.length = 0;
  };
  tr('inicio del verano');
  // 0. La regla general: los que serían titulares arriba suben (como mucho dos por club y verano). Se apuntan por club: si el equipo de arriba acaba cerrándose, vuelven al suyo.
  const subidosDe = new Map<string, Npc[]>();
  const subidos = (e: EquipoGuardado): Npc[] => subidosDe.get(e.club) ?? subidosDe.set(e.club, []).get(e.club)!;
  for (const e of [...fuera, ...delColegio]) {
    if (miembros(e).length === 0) continue;
    for (let i = 0; i < 2 && ascender(e, false, subidos(e)); i++);
  }
  tr('después del paso 0 (ascensos del que sería titular arriba)');
  // 1. **Los de primer año, su propio «draft»** (decisión del usuario, 07/11/2026): cada club ya ha subido a sus de primer año al A (con los límites de subir) y mira qué le falta por puestos para su nuevo
  // B; los de primer año de la categoría que están en la bolsa pasan por el mismo «draft» que al crear la partida, solo ellos: cada club, por su atractivo, ve a un porcentaje y coge lo que le falta
  // para su B. (Antes los clubes rellenaban todos sus huecos, A, B, C y D, con los nuevos antes que nadie, y los colegios se quedaban sin equipos.)
  for (const e of fuera) {
    if (miembros(e).length === 0 || kDe(e) < 2) continue;
    const delPrimero = miembros(e).filter((n) => edadDeJuego(n, m.dia) === cat.edadMin).length;
    const falta = Math.min(e.plantillaPorCategoria!.max - delPrimero, capacidadDe(e, catId) - miembros(e).length);
    if (falta <= 0) continue;
    const primeros = bolsa().filter((a) => esPrimero(a) && !quedan.has(a.npc.id));
    const clave = clavePrueba(e);
    const van = [...primeros].sort((x, y) => clave(y) - clave(x) || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, Math.round(atractivoDe(e) * primeros.length));
    let cogidos = 0;
    for (const a of van.sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (cogidos >= falta) break;
      if (entrar(e, a, o.conPrueba)) cogidos++;
    }
  }
  tr('después del paso 1 (los de primer año van a los clubes de fuera)');
  // 1a. Los colegios reciben a sus alumnos que no han probado fuera o a los que han rechazado (todos los alumnos que quedan en la bolsa, sin porcentaje ni prueba), sin prioridad sobre nadie más.
  for (const e of delColegio) {
    if (miembros(e).length === 0 || miembros(e).length >= capacidadDe(e, catId)) continue;
    for (const a of [...elegibles(e)].sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (miembros(e).length >= capacidadDe(e, catId)) break;
      entrar(e, a, false);
    }
  }
  tr('después del paso 1a (los colegios reciben a sus alumnos)');
  // 1b. Un club (o colegio) sin equipo en la categoría monta uno si en la bolsa hay 14 que puedan jugar en él (los alumnos, en un colegio): así un colegio que se quedó sin equipo vuelve a tenerlo.
  for (const e of [...fuera, ...delColegio]) {
    if (miembros(e).length > 0) continue;
    const pool = elegibles(e).sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1));
    if (pool.length < minimoDe(e)) continue;
    for (const a of pool) {
      if (miembros(e).length >= capacidadDe(e, catId)) break;
      entrar(e, a, false, true, true);
    }
    if (miembros(e).length < minimoDe(e)) completarRelajado(e, capacidadDe(e, catId));
    // Si con la bolsa no llega, se intenta con el ascenso del que sería titular (el A del colegio debería existir siempre, pero el mínimo de 14 manda).
    while (miembros(e).length < minimoDe(e) && ascender(e, true, subidos(e)));
    if (miembros(e).length < minimoDe(e)) {
      devolver(subidos(e));
      for (const x of miembros(e)) m.lista.set(x.id, sinDeporte(x, pob, false));
    }
  }
  tr('después del paso 1b (un club sin equipo monta uno)');
  // 2. Un equipo con menos de 14: se completa con la bolsa (sin prueba: es el club quien los llama) y, solo si no llega, se cierra y sus jugadores buscan otro equipo.
  const cerrados: { id: string; origen: string; no?: string }[] = [];
  for (const e of [...fuera, ...delColegio]) {
    const min = minimoDe(e);
    const k = kDe(e);
    if (miembros(e).length === 0 || miembros(e).length >= min * k) continue;
    // Primero con los descartes de la bolsa que acepten jugar en él (ante quedarse sin equipo aceptan puestos que normalmente rechazarían) y después con el ascenso del que sería titular arriba.
    for (const a of [...elegibles(e)].sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (miembros(e).length >= min * k) break;
      entrar(e, a, false, false, true);
    }
    while (miembros(e).length < min * k && ascender(e, true, subidos(e)));
    if (miembros(e).length < min * k) devolver(subidos(e)); // no se salva: los que subieron (ahora o por la regla general) vuelven a su equipo
    const n = miembros(e).length;
    if (n >= min * k) continue;
    const montables = Math.floor(n / min);
    DIAGNOSTICO.alCerrar?.({ club: e.club, categoria: catId, jugadores: n, equipos: k, montables });
    if (montables >= 1) {
      // Cierra los equipos de más: los que ya no caben (los de menos valor) buscan otro equipo.
      ponerK(e, montables);
      const sobran = n - capacidadDe(e, catId);
      if (sobran > 0) {
        for (const x of [...miembros(e)].filter((x) => !x.id.startsWith('personaje@')).sort((a, b) => valorEn(a, pob, m) - valorEn(b, pob, m) || (a.id < b.id ? -1 : 1)).slice(0, sobran)) {
          m.lista.set(x.id, sinDeporte(x, pob, false));
          cerrados.push({ id: x.id, origen: pob.deporte, no: e.club });
          DIAGNOSTICO.alDesplazar?.({ id: x.id, desde: e.club, motivo: 'cierre' });
        }
      }
    } else {
      for (const x of miembros(e)) {
        if (x.id.startsWith('personaje@')) continue;
        m.lista.set(x.id, sinDeporte(x, pob, false));
        cerrados.push({ id: x.id, origen: pob.deporte, no: e.club });
        DIAGNOSTICO.alDesplazar?.({ id: x.id, desde: e.club, motivo: 'cierre' });
      }
      ponerK(e, 1);
    }
  }
  tr('después del paso 2 (equipos con menos de 14: se completan o se cierran)');
  // 3. **Los C y D de la categoría se vuelven a sortear entre clubes y colegios**: con lo que sobra de la bolsa (14 o más) se abre un equipo en un club o colegio que tenga sitio, sorteado (un colegio, solo
  // con sus alumnos), y se repite mientras haya 14.
  const sorteo = [...clubes].sort((x, y) => rngEstable('sorteo', catId, x.club, m.dia).next() - rngEstable('sorteo', catId, y.club, m.dia).next());
  for (let vuelta = 0; vuelta < 3 * clubes.length; vuelta++) {
    const min = Math.min(...clubes.map(minimoDe));
    if (bolsa().length < min) break;
    const posibles = sorteo.filter((x) => kDe(x) < MAX_EQUIPOS_POR_CATEGORIA && miembros(x).length >= minimoDe(x) * kDe(x) && elegibles(x).length >= minimoDe(x));
    const e = posibles[vuelta % Math.max(1, posibles.length)];
    if (!e) break;
    const antes = new Set(miembros(e).map((n) => n.id));
    ponerK(e, kDe(e) + 1);
    for (const a of [...elegibles(e)].sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (miembros(e).length >= capacidadDe(e, catId)) break;
      entrar(e, a, false, true, true);
    }
    if (miembros(e).length < minimoDe(e) * kDe(e)) completarRelajado(e, capacidadDe(e, catId));
    if (miembros(e).length < minimoDe(e) * kDe(e)) {
      for (const x of miembros(e).filter((x) => !antes.has(x.id))) m.lista.set(x.id, sinDeporte(x, pob, false));
      ponerK(e, kDe(e) - 1);
    }
  }
  tr('después del paso 3 (C y D nuevos con la bolsa)');
  protegerAlColegio = false;
  // 4. Lo que queda en la bolsa (los de segundo año y más que no han entrado en ningún sitio) completa los huecos que queden en los clubes, por su atractivo, ya sin quitarle nada a los colegios.
  for (const e of fuera) {
    if (miembros(e).length === 0) continue;
    for (const a of [...bolsa()].sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (miembros(e).length >= capacidadDe(e, catId)) break;
      entrar(e, a, o.conPrueba);
    }
  }
  tr('final del verano');
  return cerrados;
}


/** Plazas de más que un equipo puede abrir como mucho (por equipo) para no dejar a un niño sin equipo. */
export const PLAZAS_DE_MAS = 2;

/**
 * Cada curso las plazas de más se recalculan: un equipo conserva solo las que necesitan los que ya tiene (y el personaje, que tiene su plaza reservada en `reservas`), hasta `PLAZAS_DE_MAS`; con las demás
 * vuelve a su máximo de siempre, y nadie más entra en ellas salvo por el último paso (`plazasDeMas`).
 */
export function ajustarPlazasDeMas(m: MercadoDeFichajes, pob: PoblacionGuardada): void {
  for (const e of pob.equipos) {
    if (!e.plazasDeMas || !e.plantillaPorCategoria) continue;
    const nuevas: Record<string, number> = {};
    for (const cat of categoriasDelEquipo(pob, e)) {
      const edades = cat.edades;
      const k = e.equiposPorCategoria?.[cat.id] ?? 1;
      const jugadores = (m.lista instanceof ListaDeTrabajo ? m.lista.deEquipo(pob.deporte, e.club) : [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club)).filter((n) => edades.includes(edadDeJuego(n, m.dia) ?? -1)).length + (m.reservas.get(claveDeEquipo(e.club, cat.id)) ?? 0);
      const necesita = Math.min(PLAZAS_DE_MAS, Math.ceil(Math.max(0, jugadores - e.plantillaPorCategoria.max * k) / k));
      if (necesita > 0) nuevas[cat.id] = necesita;
    }
    e.plazasDeMas = Object.keys(nuevas).length ? nuevas : undefined;
  }
}

/**
 * **Plazas de más, en lo último de todo** (decisión del usuario, 17/11/2026): tras el reparto y los descartes definitivos, el niño con interés que se queda sin equipo entra en un equipo de su colegio
 * (si lo tiene) o, si no, en el club con el equipo más cercano a su nivel, aunque se pase del máximo en 1 o 2 plazas por equipo (`plazasDeMas`). Solo para no dejarlo fuera: **no cambia las
 * convocatorias**: si no da el nivel, corre el riesgo de no jugar. Devuelve cuántos entran.
 */
export function plazasDeMas(m: MercadoDeFichajes): number {
  let entran = 0;
  if (MEDIDA.respetarReparto) return 0;
  for (const pob of m.pobs) {
    if (!conDraft(pob, m.val)) continue;
    const sinApartar = (n: Npc): Npc => (n.apartado?.includes(pob.deporte) ? { ...n, apartado: n.apartado.filter((d) => d !== pob.deporte) } : n);
    for (const cat of pob.categorias ?? []) {
      const clubes = pob.equipos.filter((e) => e.plantillaPorCategoria && categoriasDelEquipo(pob, e).some((c) => c.id === cat.id));
      if (!clubes.length) continue;
      const edades = Array.from({ length: cat.edadMax - cat.edadMin + 1 }, (_, i) => cat.edadMin + i);
      const miembros = (e: EquipoGuardado): Npc[] => (m.lista instanceof ListaDeTrabajo ? m.lista.deEquipo(pob.deporte, e.club) : [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club)).filter((n) => edades.includes(edadDeJuego(n, m.dia) ?? -1));
      const sinEquipo = edades.flatMap((edad) => aspirantesDeEdad([...m.lista.values()].map(sinApartar), pob, edad, m.dia, m.val)).filter((a) => a.interes > 0).sort((x, y) => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1));
      if (!sinEquipo.length) continue;
      const nivelDe = new Map(clubes.map((e) => { const ms = miembros(e); return [e.club, ms.length ? ms.reduce((t, n) => t + valorEn(n, pob, m), 0) / ms.length : 0] as const; }));
      for (const a of sinEquipo) {
        const candidatos = [
          ...clubes.filter((e) => e.colegio !== undefined && e.colegio === a.colegio),
          ...clubes.filter((e) => e.colegio === undefined).sort((x, y) => Math.abs((nivelDe.get(x.club) ?? 0) - a.valor) - Math.abs((nivelDe.get(y.club) ?? 0) - a.valor) || (x.club < y.club ? -1 : 1)),
        ];
        for (const e of candidatos) {
          const k = e.equiposPorCategoria?.[cat.id] ?? 1;
          const ya = miembros(e).length;
          // Un equipo que no existe (menos del mínimo) no se abre por esto; y no se pasa de las plazas de más.
          const maxNormal = e.plantillaPorCategoria!.max * k;
          if (ya < minimoDe(e) || Math.max(0, ya - maxNormal) >= PLAZAS_DE_MAS * k) continue;
          const previo = e.plazasDeMas;
          const cxAntes = categoriasDelEquipo(pob, e).find((c) => c.id === cat.id)!;
          const sobranAntes = equiposDelClub(m.lista, pob, e, cxAntes, m.dia, m.val, [], true).equipos.sobran.length;
          e.plazasDeMas = { ...previo, [cat.id]: Math.min(PLAZAS_DE_MAS, Math.ceil((Math.max(0, ya - maxNormal) + 1) / k)) };
          const n = m.lista.get(a.npc.id);
          const antes = n && n.deporte === undefined ? n : undefined;
          // Primero respetando el reparto por puestos (con las plazas de más abiertas) y, solo si así no cabe, en su puesto favorito aunque su grupo esté lleno.
          const entra = !!antes && (intentarEntrar(m, sinApartar(antes), e, pob, { sinPrueba: true, soloHueco: true, ultimaOpcion: true, plazasDeMas: true }).entra || intentarEntrar(m, sinApartar(antes), e, pob, { sinPrueba: true, soloHueco: true, relajado: true, ultimaOpcion: true, plazasDeMas: true }).entra);
          if (antes && entra) {
            const dentro = m.lista.get(a.npc.id)!;
            // Si el reparto en equipos no le encuentra sitio (por puestos), no vale: se deshace.
            const cx = categoriasDelEquipo(pob, e).find((c) => c.id === cat.id)!;
            const sobran = equiposDelClub(m.lista, pob, e, cx, m.dia, m.val, [], true).equipos.sobran;
            if (!sobran.includes(a.npc.id) && sobran.length <= sobranAntes) {
              m.lista.set(a.npc.id, sinApartar(dentro));
              DIAGNOSTICO.alPlazaDeMas?.({ id: a.npc.id, club: e.club, categoria: cat.id, delColegio: e.colegio !== undefined });
              entran++;
              break;
            }
            m.lista.set(a.npc.id, antes);
          }
          e.plazasDeMas = previo;
        }
      }
    }
    fijarEquipos(m, pob);
  }
  return entran;
}


/**
 * **Dos plazos antes de dejarlo para siempre** (decisión del usuario, 05/11/2026): quien no consigue equipo en un plazo se queda apartado ese curso (`apartado`) y lo vuelve a intentar en el siguiente
 * (entra en la bolsa); solo lo deja para siempre (`dejado`) si en dos plazos seguidos ningún club lo ha querido. `segunda` son los que ya estaban apartados. Devuelve cuántos lo dejan.
 */
export function apartarODejar(m: MercadoDeFichajes, segunda: ReadonlySet<string>): number {
  let dejan = 0;
  for (const pob of m.pobs) {
    if (!conDraft(pob, m.val)) continue;
    const edadesDeLasCategorias = new Set((pob.categorias ?? []).flatMap((c) => Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => c.edadMin + i)));
    for (const [id, n] of m.lista) {
      if (!n.genetica || n.deporte !== undefined || n.dejado?.includes(pob.deporte) || n.apartado?.includes(pob.deporte) || interesDe(n, pob.deporte, edadNpc(n, m.dia)) <= 0) continue;
      if (!edadesDeLasCategorias.has(edadNpc(n, m.dia) ?? -1) || !pob.equipos.some((e) => e.plantillaPorCategoria && edadesDe(pob, e).includes(edadNpc(n, m.dia) ?? -1))) continue;
      if (segunda.has(id)) {
        m.lista.set(id, { ...n, dejado: [...new Set([...(n.dejado ?? []), pob.deporte])] });
        dejan++;
      } else m.lista.set(id, { ...n, apartado: [...new Set([...(n.apartado ?? []), pob.deporte])] });
    }
  }
  return dejan;
}


/**
 * Nuevo curso: los que pasan la edad máxima del deporte se retiran, algún niño pequeño lo deja (con la probabilidad que pide el deporte) y los equipos
 * rellenan las plazas libres con otros niños que encajan. Los niños de otros colegios que se van desaparecen (los que lo dejaron no se vuelven a reclutar);
 * los compañeros, los hermanos y los niños del barrio siguen siendo quienes son, solo que sin deporte.
 */
export function renovarDeportistas(npcs: Npc[], pobs: readonly PoblacionGuardada[], dia: number, rng: Rng, reservas: ReadonlyMap<string, number> = new Map(), rend: Rendimientos = new Map(), semilla = 0, curso = 0, personaje: JugadorEnClub[] = [], resultado: { sinPlaza: string[]; plazaExtra?: string[]; sinNinos?: { deporte: string; motivo: MotivoDeEquipoSinNinos; jugadores?: number; minimo?: number }[]; dejanSinClub?: number; pobs?: PoblacionGuardada[]; propuestas?: { deporte: string; puesto: string }[] } = { sinPlaza: [] }): Npc[] {
  // Los que echaron del equipo para hacer sitio al personaje vuelven a poder ser reclutados: ya es otro curso.
  // Los apartados del plazo anterior vuelven a la bolsa (su segunda oportunidad): si tampoco ahora los quiere ningún club, lo dejan para siempre.
  DIAGNOSTICO.alVerano?.('inicio', npcs, dia);
  if (DIAGNOSTICO.veranoUsuario) DIAGNOSTICO.abandonosDelVerano = new Set();
  if (DIAGNOSTICO.veranoUsuario) {
    const prev = new Map<string, number>();
    for (const pob of pobs) {
      const letras = new Map<string, Set<string>>();
      for (const n of npcs) {
        if (n.deporte !== pob.deporte || !n.equipo || !n.letra?.[pob.deporte]) continue;
        const edadPrev = (edadDeJuego(n, dia) ?? 0) - 1;
        const c = (pob.categorias ?? []).find((x) => edadPrev >= x.edadMin && edadPrev <= x.edadMax);
        if (!c) continue;
        const k = `${n.equipo}|${c.id}`;
        (letras.get(k) ?? letras.set(k, new Set()).get(k)!).add(n.letra[pob.deporte]!);
      }
      for (const [k, v] of letras) prev.set(k, v.size);
    }
    DIAGNOSTICO.equiposPrevios = prev;
  }
  const segunda = new Set(npcs.filter((n) => n.apartado?.length).map((n) => n.id));
  let lista = npcs.map((n) => (n.apartado ? { ...n, apartado: undefined } : n));
  const titulares = new Map<string, Set<string>>();
  for (const pob of pobs) {
    const { edades, edadMaxBaja, probabilidadBaja } = pob.reclutamiento;
    if (!titulares.has(pob.deporte)) titulares.set(pob.deporte, titularesDelCurso(lista, pob, dia));
    // Lo bueno que es cada uno frente a los de su edad (solo si el deporte da peso al nivel en el abandono).
    const pares = pob.reclutamiento.abandono?.pesos.nivel ? nivelesPorEdad(lista, pob, dia) : undefined;
    lista = lista.flatMap((n) => {
      if (n.deporte !== pob.deporte || !n.genetica) return [n];
      const gen = n.genetica;
      const edad = edadNpc(n, dia) ?? 0;
      const retirado = edad > edades.max;
      // Quien juega un año por encima y ya no cabe en la categoría más alta, juega con los de su edad.
      if (!retirado && n.adelanto?.[pob.deporte] && edad + 1 > edades.max) n = { ...n, adelanto: undefined };
      // El abandono por edad: cada verano cada deportista decide si sigue (la probabilidad sube con la edad y pesan el interés, la ambición, los minutos, los estudios y los padres); sin esos datos, lo de siempre.
      const baja = !retirado && (pob.reclutamiento.abandono
        ? dejaElDeporte(pob.reclutamiento.abandono, { edad, rasgos: n.rasgos, titular: titulares.get(pob.deporte)?.has(n.id), padres: gen.padres, ...(pares ? { nivel: pares(n) } : {}) }, pob.deporte, gen.semilla ?? 0, n.id, curso)
        : edad <= edadMaxBaja && rng.chance(probabilidadBaja));
      if (baja && DIAGNOSTICO.veranoUsuario) (DIAGNOSTICO.abandonosDelVerano ??= new Set()).add(n.id);
      if (retirado || baja) return [sinDeporte(n, pob, baja)];
      // Quien acaba el colegio ya no puede seguir en el equipo del colegio (los de 18 y 19 años siguen en el mundo, sin colegio): queda libre para que lo fiche un club.
      const suEquipo = n.equipo !== undefined ? pob.equipos.find((e) => e.club === n.equipo) : undefined;
      if (suEquipo?.colegio !== undefined && colegioDeNino(n) !== suEquipo.colegio) return [sinDeporte(n, pob, false)];
      // Solo medida (chicos y chicas por separado desde `desdeEdad`): quien cambia de sexo-sistema sale de este mundo, y las chicas de un colegio no siguen en él (el equipo femenino es de clubes externos).
      if (SESGO_DE_SEXO.deportes?.includes(pob.deporte) && SESGO_DE_SEXO.desdeEdad !== undefined && edad >= SESGO_DE_SEXO.desdeEdad) {
        if (SESGO_DE_SEXO.solo && n.gender !== SESGO_DE_SEXO.solo) return [sinDeporte(n, pob, false)];
        if (SESGO_DE_SEXO.sinColegios && suEquipo?.colegio !== undefined) return [sinDeporte(n, pob, false)];
      }
      // Una temporada más en su equipo: con ellas (y lo que vale en su puesto) se va formando su puesto favorito (`preferenciaDe`).
      const inicio = pob.puestos?.favoritos?.formacion.edadDeInicio ?? 8;
      return [{ ...n, temporadas: { ...n.temporadas, [pob.deporte]: (n.temporadas?.[pob.deporte] ?? Math.max(0, edad - inicio)) + temporadaJugada(n, pob, curso - 1) } }];
    });
  }
  DIAGNOSTICO.alVerano?.('tras abandono', lista, dia);
  // Los fichajes de verano, dentro del plazo (el nuevo curso empieza antes de la primera competición): los clubes grandes miran a los mejores de los pequeños y los desplazados buscan
  // club. El personaje cuenta como un jugador más de su equipo, con lo que vale: si otro que vale más le ocupa el sitio, **sale del club como cualquier niño** (se le avisa con
  // `club.plaza_perdida` y decide él qué hace; lo único distinto es que a él nunca se le retira del deporte para siempre).
  const mercado: MercadoDeFichajes = { lista: new ListaDeTrabajo(lista.map((n) => [n.id, n])), pobs, dia, val: valoracionDe(rend), reservas: new Map() };
  for (const j of personaje) mercado.lista.set(idDelPersonaje(j.deporte), jugadorComoNpc(j, dia));
  if (!DIAGNOSTICO.veranoUsuario) fichajesDeVerano(mercado, semilla, curso);
  DIAGNOSTICO.alVerano?.('tras fichajes', [...mercado.lista.values()], dia);
  resultado.propuestas = mercado.propuestas ?? [];
  const reservasQueQuedan = new Map(reservas);
  for (const j of personaje) {
    const dentro = mercado.lista.get(idDelPersonaje(j.deporte))?.deporte !== undefined;
    mercado.lista.delete(idDelPersonaje(j.deporte));
    if (!dentro) {
      // Plaza de más (decisión del usuario, 18/11/2026): en vez de salir del club, se queda con una plaza de más (1–2 por equipo) y el entrenador le avisa de que contará menos con él; si ya no caben
      // más plazas de más en su equipo, sale como siempre.
      const ampliado = conUnaPlazaDeMas(mercado.pobs, j);
      if (ampliado) {
        mercado.pobs = ampliado;
        (resultado.plazaExtra ??= []).push(j.deporte);
      } else {
        resultado.sinPlaza.push(j.deporte);
        reservasQueQuedan.delete(claveDeEquipo(j.club, j.categoria));
      }
    }
  }
  // Los equipos se rellenan con los interesados y, después, la regla de los equipos según la demanda: cierran los que no llegan al mínimo y abren los que hacen falta para que los
  // interesados que se quedan sin equipo (tantos como el mínimo de una plantilla) lo tengan.
  const llenos = DIAGNOSTICO.veranoNuevo || DIAGNOSTICO.veranoUsuario ? [...mercado.lista.values()] : reclutarEnTodos([...mercado.lista.values()], mercado.pobs, dia, reservasQueQuedan, rend);
  DIAGNOSTICO.alVerano?.('tras reclutar', llenos, dia);
  const final: MercadoDeFichajes = { lista: new ListaDeTrabajo(llenos.map((n) => [n.id, n])), pobs: mercado.pobs, dia, val: valoracionDe(rend), reservas: reservasQueQuedan };
  // No hay «draft» los años siguientes: cada uno sigue en su club; la bolsa (los que empiezan y los que se quedaron sin equipo) completa los equipos con su prueba, los que se quedan con menos de 14 se
  // completan o se cierran, y quien no consigue equipo en dos plazos seguidos lo deja para siempre.
  completarEquipos(final, rng, { conPrueba: true });
  // El personaje cuyo equipo no sigue (su club no reúne el mínimo de niños en su categoría o no tiene equipos en ella) no se queda con una plaza de más ni la pierde por mérito: se le avisa de que tiene que buscarse equipo.
  for (const j of personaje) {
    const falta = equipoSinNinos(final, j);
    if (!falta) continue;
    (resultado.sinNinos ??= []).push({ deporte: j.deporte, ...falta });
    resultado.plazaExtra = resultado.plazaExtra?.filter((d) => d !== j.deporte);
    resultado.sinPlaza = resultado.sinPlaza.filter((d) => d !== j.deporte);
  }
  // **El equipo que le toca por las normas por año** (decisión del usuario, 20/11/2026): el personaje que sigue en su club pero no cabe en ningún equipo (el A es de los de segundo año y se ha llenado con otros que
  // valen más; el B, de los de primer año) se trata como quien pierde su plaza: primero una plaza de más (1–2 por equipo; el entrenador le avisa de que contará menos con él) y, si ni así cabe, sale del club.
  for (const j of personaje) {
    if (!j.puesto || resultado.sinPlaza.includes(j.deporte) || resultado.plazaExtra?.includes(j.deporte) || resultado.sinNinos?.some((x) => x.deporte === j.deporte)) continue;
    const tieneEquipo = (pobs: readonly PoblacionGuardada[]): boolean => !!equipoDelPersonajeEn([...final.lista.values()], pobs, j.deporte, j.club, j.categoria, { id: idDelPersonaje(j.deporte), puesto: j.puesto!, valor: j.valores?.[j.puesto!] ?? j.valor }, j.edad, dia, final.val);
    if (tieneEquipo(final.pobs)) continue;
    let pobs: readonly PoblacionGuardada[] | undefined = final.pobs;
    for (let i = 0; i < PLAZAS_DE_MAS && pobs && !tieneEquipo(pobs); i++) pobs = conUnaPlazaDeMas(pobs, j);
    if (pobs && tieneEquipo(pobs)) {
      final.pobs = pobs;
      (resultado.plazaExtra ??= []).push(j.deporte);
    } else resultado.sinPlaza.push(j.deporte);
  }
  resultado.dejanSinClub = apartarODejar(final, segunda);
  resultado.pobs = [...final.pobs];
  DIAGNOSTICO.alVerano?.('fin', [...final.lista.values()], dia);
  return [...final.lista.values()];
}


/**
 * ¿El equipo del personaje no sigue este curso? `sin_categoria` si su club no tiene equipos en la categoría a la que sube; `pocos` si, contándolo a él, el club no reúne en ella el mínimo de niños de una plantilla (14:
 * el equipo se cierra). Se mira al final de los fichajes y el reparto de verano, cuando ya se han hecho todos los ascensos y los intentos de completar el equipo. `undefined` si su equipo sigue.
 */
export function equipoSinNinos(m: MercadoDeFichajes, j: JugadorEnClub): { motivo: MotivoDeEquipoSinNinos; jugadores?: number; minimo?: number } | undefined {
  const pob = m.pobs.find((p) => p.deporte === j.deporte);
  const e = pob?.equipos.find((x) => x.club === j.club && x.plantillaPorCategoria);
  if (!pob || !e) return undefined;
  const cx = categoriasDelEquipo(pob, e).find((c) => c.id === j.categoria);
  if (!cx) return { motivo: 'sin_categoria' };
  const jugadores = 1 + [...m.lista.values()].filter((n) => n.deporte === j.deporte && n.equipo === e.club && cx.edades.includes(edadDeJuego(n, m.dia) ?? -1)).length;
  const minimo = minimoDe(e);
  return jugadores < minimo ? { motivo: 'pocos', jugadores, minimo } : undefined;
}


/** Las poblaciones con una plaza de más en el equipo del personaje (club y categoría), o `undefined` si ese equipo ya tiene las que puede abrir (`PLAZAS_DE_MAS`) o no tiene equipos por categoría. */
export function conUnaPlazaDeMas(pobs: readonly PoblacionGuardada[], j: Pick<JugadorEnClub, 'deporte' | 'club' | 'categoria'>): PoblacionGuardada[] | undefined {
  const pob = pobs.find((p) => p.deporte === j.deporte);
  const e = pob?.equipos.find((x) => x.club === j.club && x.plantillaPorCategoria);
  if (!pob || !e || (e.plazasDeMas?.[j.categoria] ?? 0) >= PLAZAS_DE_MAS) return undefined;
  return pobs.map((p) => (p === pob ? { ...p, equipos: p.equipos.map((x) => (x === e ? { ...x, plazasDeMas: { ...x.plazasDeMas, [j.categoria]: (x.plazasDeMas?.[j.categoria] ?? 0) + 1 } } : x)) } : p));
}


/**
 * Lo que trae un deporte que se añade a una partida empezada: su entrenador del colegio y los de sus clubes de fuera y el reclutamiento de sus equipos entre
 * los niños que ya hay (y los de otros colegios). La partida, al crearse, recluta en todos los deportes a la vez (`reclutarEnTodos`).
 */
export function añadirDeporte(npcs: Npc[], pob: PoblacionGuardada, dia: number, rng: Rng, rend: Rendimientos = new Map()): Npc[] {
  const reclutados = reclutarDeportistas([...npcs, ...entrenadoresDeUnDeporte(npcs, pob, rng)], pob, dia, false, new Map(), valoracionDe(rend));
  const m: MercadoDeFichajes = { lista: new ListaDeTrabajo(reclutados.map((n) => [n.id, n])), pobs: [pob], dia, val: valoracionDe(rend), reservas: new Map() };
  draftDeEquipos(m, rng, { conPrueba: false, conAmbicion: false, reiniciar: true });
  return [...m.lista.values()];
}


/** Los entrenadores de un deporte: el del colegio (el primer deporte ya trae el suyo) y los de los clubes de fuera. */
export function entrenadoresDeUnDeporte(npcs: readonly Npc[], pob: PoblacionGuardada, rng: Rng): Npc[] {
  const usados = registroDe(npcs);
  return [...(pob.primero ? [] : [nuevoEntrenador(rng, pob, usados, { id: `entrenador_${pob.deporte}`, club: 'colegio', edades: [0, 99], edad: [28, 55], descripcion: pob.entrenadores.descripcionDelColegio })]), ...entrenadoresDeClubes(rng, pob, usados)];
}


/** Los entrenadores de los equipos que un club ya tiene abiertos al empezar (el B de cada club grande): uno por equipo, con las edades de su categoría. */
export function entrenadoresDeEquiposExtra(npcs: readonly Npc[], pob: PoblacionGuardada, rng: Rng): Npc[] {
  const usados = registroDe(npcs);
  const nuevos: Npc[] = [];
  for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
    for (const [catId, k] of Object.entries(e.equiposPorCategoria ?? {})) {
      const cat = (pob.categorias ?? []).find((c) => c.id === catId);
      if (!cat) continue;
      for (let numero = 2; numero <= k; numero++) nuevos.push(nuevoEntrenador(rng, pob, usados, { id: idDeEntrenadorDeEquipo(e.club, catId, numero), club: e.club, edades: [cat.edadMin, Math.min(cat.edadMax, 99)], edad: [28, 55] }));
    }
  }
  return nuevos;
}



/**
 * Lo que suma al puesto favorito la temporada que acaba (decisión del usuario, 11/11: la preferencia se forma con el **tiempo jugado**): con `minutosPorTemporada` en los datos, los minutos que jugó divididos entre los de una temporada completa de
 * titular (hasta 1); quien no tiene estadísticas de esa temporada (un equipo sin liga) o un deporte sin ese dato, 1 como antes.
 */
export function temporadaJugada(n: Npc, pob: PoblacionGuardada, cursoQueAcaba: number): number {
  const minutos = pob.puestos?.favoritos?.formacion.minutosPorTemporada;
  const e = n.est?.[pob.deporte];
  if (!minutos || !e) return 1;
  return e.curso === cursoQueAcaba ? Math.min(1, e.min / minutos) : 0;
}

/** La puntuación típica de cada jugador frente a los de su edad que juegan (lo que vale, media y desviación por edad). */
function nivelesPorEdad(lista: readonly Npc[], pob: PoblacionGuardada, dia: number): (n: Npc) => number | undefined {
  const valor = (n: Npc): number => n.vp?.[pob.deporte]?.valor ?? n.levels[pob.deporte] ?? 0;
  const porEdad = new Map<number, number[]>();
  for (const n of lista) if (n.deporte === pob.deporte) (porEdad.get(edadNpc(n, dia) ?? 0) ?? porEdad.set(edadNpc(n, dia) ?? 0, []).get(edadNpc(n, dia) ?? 0)!).push(valor(n));
  const estadistica = new Map([...porEdad].map(([e, v]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return [e, { m, sd: Math.max(1, Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length)) }] as const; }));
  return (n) => { const s = estadistica.get(edadNpc(n, dia) ?? 0); return s ? (valor(n) - s.m) / s.sd : undefined; };
}

/** Los que fueron titulares el curso pasado (los minutos que tuvieron): en cada equipo (club, categoría del curso pasado y letra), los que más valen hasta los titulares de la formación (11 en el fútbol). */
function titularesDelCurso(lista: readonly Npc[], pob: PoblacionGuardada, dia: number): Set<string> {
  const titulares = Object.values(pob.puestos?.equipos?.titulares ?? {}).reduce((a, b) => a + b, 0) || 11;
  const equipos = new Map<string, { id: string; valor: number }[]>();
  for (const n of lista) {
    if (n.deporte !== pob.deporte || !n.equipo || !n.letra?.[pob.deporte] || !n.genetica) continue;
    const edad = (edadNpc(n, dia) ?? 0) - 1; // el curso pasado
    const categoria = (pob.categorias ?? []).find((c) => edad + (n.adelanto?.[pob.deporte] ? 1 : 0) >= c.edadMin && edad + (n.adelanto?.[pob.deporte] ? 1 : 0) <= c.edadMax)?.id;
    const clave = `${n.equipo}|${categoria}|${n.letra[pob.deporte]}`;
    (equipos.get(clave) ?? equipos.set(clave, []).get(clave)!).push({ id: n.id, valor: n.vp?.[pob.deporte]?.valor ?? n.levels[pob.deporte] ?? 0 });
  }
  const dentro = new Set<string>();
  for (const miembros of equipos.values()) for (const x of miembros.sort((a, b) => b.valor - a.valor || (a.id < b.id ? -1 : 1)).slice(0, titulares)) dentro.add(x.id);
  return dentro;
}
