/**
 * El «draft» de los equipos, completar o cerrar equipos y el cambio de curso de los deportistas.
 * Lógica de los deportes de equipo del juego base (`PLAN_DEPORTES_MODULARES.md` §7 bis): no sabe de ningún deporte concreto; cada deporte da sus datos.
 */
import { type CategoriaDef, rngEstable, cuposPorGrupo, ATRACTIVO_DE_TAMANO, type Rng, aptitudDe } from '@ds/contracts';
import { interesPor } from './deportistas';
import { type MiembroDeClub } from './equipos';
import { puestoDondeMasVale } from './puestos';
import { type Rendimientos } from './semana';

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
import { colocarDesplazados, fichajesDeVerano, intentarEntrar } from './fichajes';
import { dejaElDeporte } from './abandono';
import { acomodarSobrantes, cubrirGruposVacios, fijarEquipos, Aspirante, JugadorEnClub, ListaDeTrabajo, MercadoDeFichajes, aspirantesDeEdad, capacidadDe, categoriasDelEquipo, claveDeEquipo, edadesDe, equiposDelClub, idDelPersonaje, jugadorComoNpc, reclutarDeportistas, reclutarEnTodos, sinDeporte } from './plantillas';
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
    for (const [catId, cat] of [...categorias].sort((a, b) => a[1].edadMin - b[1].edadMin)) {
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
  return nuevos;
}

/**
 * Tras el reparto en equipos, nadie queda en un club sin equipo (`acomodarSobrantes`): el entrenador le ofrece otro puesto donde quepa y, si no cabe, deja el club y busca otro como cualquier desplazado (al
 * que cambia de club le pasa lo mismo en el nuevo, y así hasta tres rondas; en la última, el que no cabe queda apartado ese curso). Al acabar se fijan los equipos de la temporada.
 */
export function sinSobrantes(m: MercadoDeFichajes): void {
  for (let ronda = 0; ronda < 3; ronda++) {
    const fuera = m.pobs.flatMap((pob) => acomodarSobrantes(m, pob, ronda === 2));
    if (fuera.length) colocarDesplazados(m, fuera);
    for (const pob of m.pobs) {
      for (const c of (pob.categorias ?? []).filter((x) => pob.equipos.some((e) => e.plantillaPorCategoria && categoriasDelEquipo(pob, e).some((u) => u.id === x.id)))) cubrirGruposVacios(m, pob, c.id, Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => c.edadMin + i));
    }
  }
  for (const pob of m.pobs) fijarEquipos(m, pob);
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


export function draftDeUnaCategoria(m: MercadoDeFichajes, pob: PoblacionGuardada, cat: CategoriaDef, catId: string, rng: Rng, o: { conPrueba: boolean; conAmbicion: boolean }): void {
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
  /** Una ronda de un club: va a probar un grupo de la bolsa, el club coge a los mejores por puesto; si no llega al mínimo de todos sus equipos, no se monta y vuelven a la bolsa. */
  const ronda = (e: EquipoGuardado, k: number, porcentaje: number | null): boolean => {
    const kAntes = kDe(e);
    const antes = new Set(miembros(e).map((n) => n.id));
    ponerK(e, Math.max(k, kAntes));
    const toda = bolsa();
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
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      liberar(equiposDelClub(m.lista, pob, e, cx, m.dia, m.val, [], true).equipos.sobran);
      // Con los que quedan, tantos equipos como lleguen al mínimo (con 14 basta).
      const montables = Math.max(1, Math.floor(miembros(e).length / minimoDe(e)));
      if (montables >= kDe(e)) break;
      ponerK(e, montables);
    }
  };
  const fuera = clubes.filter((e) => e.colegio === undefined).sort((a, b) => atractivoDe(b) - atractivoDe(a) || b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
  const delColegio = clubes.filter((e) => e.colegio !== undefined).sort((a, b) => (a.club < b.club ? -1 : 1));
  // 1. Primera ronda: A y B.
  for (const e of fuera) ronda(e, 2, atractivoDe(e));
  for (const e of delColegio) ronda(e, 2, null);
  // 2. Segunda ronda: C y D. Los equipos que salen con la bolsa (a un mínimo por equipo) se sortean entre clubes y colegios (como mucho dos más cada uno).
  const minimo = Math.min(...clubes.map(minimoDe));
  let equiposQueSalen = Math.min(Math.floor(bolsa().length / minimo), clubes.length * 2);
  const baraja = (xs: readonly EquipoGuardado[]): EquipoGuardado[] => [...xs].sort((a, b) => rngEstable('sorteo', catId, a.club, m.dia).next() - rngEstable('sorteo', catId, b.club, m.dia).next());
  const orden = baraja(clubes);
  const plazas = [...orden.map((e) => ({ e, letra: 'C' })), ...orden.map((e) => ({ e, letra: 'D' }))].slice(0, equiposQueSalen);
  const porClub = new Map<EquipoGuardado, number>();
  for (const p of plazas) porClub.set(p.e, (porClub.get(p.e) ?? 0) + 1);
  let fallidos = 0;
  for (const [e, mas] of porClub) {
    const kObjetivo = Math.min(MAX_EQUIPOS_POR_CATEGORIA, Math.max(2, kDe(e)) + mas);
    if (kDe(e) < 2) { fallidos += mas; continue; }
    if (!ronda(e, kObjetivo, e.colegio === undefined ? atractivoDe(e) : null)) fallidos += mas;
    else if (kDe(e) < kObjetivo) fallidos += kObjetivo - kDe(e);
  }
  // Los equipos que no se montaron pasan por sorteo a otro club que no tenga ni C ni D.
  for (const e of baraja(clubes.filter((x) => kDe(x) === 2))) {
    if (fallidos <= 0) break;
    if (ronda(e, 3, e.colegio === undefined ? atractivoDe(e) : null)) fallidos--;
  }
  // 3. Ajuste: cada club reordena sus equipos por año; quien no cabe en ninguno vuelve a la bolsa de descartes.
  for (const e of clubes) ajustar(e);
  // 4. Descartes definitivos: un equipo en su colegio, si lo tiene, o un club con hueco; el resto, apartado ese curso.
  for (const e of delColegio) {
    const suyos = bolsa().filter((a) => a.colegio === e.colegio);
    if (suyos.length >= minimoDe(e) && kDe(e) < MAX_EQUIPOS_POR_CATEGORIA) ronda(e, kDe(e) + 1, null);
  }
  // Si con los descartes salen equipos de un mínimo, se montan en los clubes con menos equipos (el más pequeño primero).
  for (let vuelta = 0; vuelta < 8 && bolsa().length >= minimo; vuelta++) {
    const e = [...fuera].filter((x) => kDe(x) < MAX_EQUIPOS_POR_CATEGORIA).sort((a, b) => kDe(a) - kDe(b) || atractivoDe(a) - atractivoDe(b) || (a.club < b.club ? -1 : 1))[0];
    if (!e || !ronda(e, kDe(e) + 1, 1)) break;
  }
  for (const e of clubes) ajustar(e);
  // Un club de fuera sin los 14 de un equipo no lo tiene: los pocos que le quedan vuelven a la bolsa.
  // (también el colegio: si no llega a 14 en una categoría, ese curso no saca equipo en ella y sus alumnos van a la bolsa final).
  for (const e of clubes) if (miembros(e).length > 0 && miembros(e).length < minimoDe(e)) liberar(miembros(e).map((n) => n.id));
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
  }
}


/** Para medir (`npm run colegios`): se avisa de cada equipo que se cierra por quedar bajo el mínimo, con cuántos jugadores se quedó. No cambia nada del juego. */
export const DIAGNOSTICO: {
  alCerrar?: (d: { club: string; categoria: string; jugadores: number; equipos: number; montables: number }) => void;
  /** Un niño va a probar a otro club por su cuenta (`sube`: hacia un club mejor; `baja`: un suplente de un grande hacia uno menor) y si lo aceptan allí (si no, sigue en su equipo). */
  alProbar?: (d: { id: string; desde: string; hacia: string; sentido: 'sube' | 'baja'; entra: boolean }) => void;
  /** Un niño se queda sin equipo y tiene que buscar otro: `merito` (otro mejor le quita la plaza), `cierre` (cierra su equipo) o `sobra` (el equipo se pasa de su máximo al recolocar). */
  alDesplazar?: (d: { id: string; desde: string; motivo: 'merito' | 'cierre' | 'sobra' }) => void;
  /** Una oferta de puesto de un club a un niño: si la acepta, si era su última opción (sin equipo) y si el puesto era el suyo (su favorito o su grupo). */
  alOfertar?: (d: { id: string; club: string; aceptada: boolean; ultimaOpcion: boolean; esSuyo: boolean }) => void;
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
    const categorias = new Map<string, CategoriaDef>();
    for (const e of pob.equipos) for (const c of e.plantillaPorCategoria ? categoriasDelEquipo(pob, e) : []) categorias.set(c.id, (pob.categorias ?? []).find((x) => x.id === c.id)!);
    // De la categoría mayor a la menor: así, para salvar un equipo, el club puede subir de la categoría de abajo a quien sería titular arriba (que a su vez se completa después).
    for (const [catId, cat] of [...categorias].sort((a, b) => b[1].edadMin - a[1].edadMin)) {
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
  const elegibles = (e: EquipoGuardado): Aspirante[] => bolsa().filter((a) => e.colegio === undefined || a.colegio === e.colegio);
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
  // 0. La regla general: los que serían titulares arriba suben (como mucho dos por club y verano). Se apuntan por club: si el equipo de arriba acaba cerrándose, vuelven al suyo.
  const subidosDe = new Map<string, Npc[]>();
  const subidos = (e: EquipoGuardado): Npc[] => subidosDe.get(e.club) ?? subidosDe.set(e.club, []).get(e.club)!;
  for (const e of [...fuera, ...delColegio]) {
    if (miembros(e).length === 0) continue;
    for (let i = 0; i < 2 && ascender(e, false, subidos(e)); i++);
  }
  // 1. **Los de primer año, su propio «draft»** (decisión del usuario, 07/11/2026): cada club ya ha subido a sus de primer año al A (con los límites de subir) y mira qué le falta por puestos para su nuevo
  // B; los de primer año de la categoría que están en la bolsa pasan por el mismo «draft» que al crear la partida, solo ellos: cada club, por su atractivo, ve a un porcentaje y coge lo que le falta
  // para su B. (Antes los clubes rellenaban todos sus huecos, A, B, C y D, con los nuevos antes que nadie, y los colegios se quedaban sin equipos.)
  for (const e of fuera) {
    if (miembros(e).length === 0 || kDe(e) < 2) continue;
    const delPrimero = miembros(e).filter((n) => edadDeJuego(n, m.dia) === cat.edadMin).length;
    const falta = Math.min(e.plantillaPorCategoria!.max - delPrimero, capacidadDe(e, catId) - miembros(e).length);
    if (falta <= 0) continue;
    const primeros = bolsa().filter(esPrimero);
    const clave = clavePrueba(e);
    const van = [...primeros].sort((x, y) => clave(y) - clave(x) || (x.npc.id < y.npc.id ? -1 : 1)).slice(0, Math.round(atractivoDe(e) * primeros.length));
    let cogidos = 0;
    for (const a of van.sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (cogidos >= falta) break;
      if (entrar(e, a, o.conPrueba)) cogidos++;
    }
  }
  // 1a. Los colegios reciben a sus alumnos que no han probado fuera o a los que han rechazado (todos los alumnos que quedan en la bolsa, sin porcentaje ni prueba), sin prioridad sobre nadie más.
  for (const e of delColegio) {
    if (miembros(e).length === 0 || miembros(e).length >= capacidadDe(e, catId)) continue;
    for (const a of [...elegibles(e)].sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (miembros(e).length >= capacidadDe(e, catId)) break;
      entrar(e, a, false);
    }
  }
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
  // 4. Lo que queda en la bolsa (los de segundo año y más que no han entrado en ningún sitio) completa los huecos que queden en los clubes, por su atractivo, ya sin quitarle nada a los colegios.
  for (const e of fuera) {
    if (miembros(e).length === 0) continue;
    for (const a of [...bolsa()].sort((x, y) => valorDe(y) - valorDe(x) || (x.npc.id < y.npc.id ? -1 : 1))) {
      if (miembros(e).length >= capacidadDe(e, catId)) break;
      entrar(e, a, o.conPrueba);
    }
  }
  return cerrados;
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
      if (!n.genetica || n.deporte !== undefined || n.dejado?.includes(pob.deporte) || n.apartado?.includes(pob.deporte) || interesPor(n.rasgos, pob.deporte) <= 0) continue;
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
export function renovarDeportistas(npcs: Npc[], pobs: readonly PoblacionGuardada[], dia: number, rng: Rng, reservas: ReadonlyMap<string, number> = new Map(), rend: Rendimientos = new Map(), semilla = 0, curso = 0, personaje: JugadorEnClub[] = [], resultado: { sinPlaza: string[]; dejanSinClub?: number; pobs?: PoblacionGuardada[]; propuestas?: { deporte: string; puesto: string }[] } = { sinPlaza: [] }): Npc[] {
  // Los que echaron del equipo para hacer sitio al personaje vuelven a poder ser reclutados: ya es otro curso.
  // Los apartados del plazo anterior vuelven a la bolsa (su segunda oportunidad): si tampoco ahora los quiere ningún club, lo dejan para siempre.
  const segunda = new Set(npcs.filter((n) => n.apartado?.length).map((n) => n.id));
  let lista = npcs.map((n) => (n.apartado ? { ...n, apartado: undefined } : n));
  const titulares = new Map<string, Set<string>>();
  for (const pob of pobs) {
    const { edades, edadMaxBaja, probabilidadBaja } = pob.reclutamiento;
    if (!titulares.has(pob.deporte)) titulares.set(pob.deporte, titularesDelCurso(lista, pob, dia));
    lista = lista.flatMap((n) => {
      if (n.deporte !== pob.deporte || !n.genetica) return [n];
      const gen = n.genetica;
      const edad = edadNpc(n, dia) ?? 0;
      const retirado = edad > edades.max;
      // Quien juega un año por encima y ya no cabe en la categoría más alta, juega con los de su edad.
      if (!retirado && n.adelanto?.[pob.deporte] && edad + 1 > edades.max) n = { ...n, adelanto: undefined };
      // El abandono por edad: cada verano cada deportista decide si sigue (la probabilidad sube con la edad y pesan el interés, la ambición, los minutos, los estudios y los padres); sin esos datos, lo de siempre.
      const baja = !retirado && (pob.reclutamiento.abandono
        ? dejaElDeporte(pob.reclutamiento.abandono, { edad, rasgos: n.rasgos, titular: titulares.get(pob.deporte)?.has(n.id), padres: gen.padres }, pob.deporte, gen.semilla ?? 0, n.id, curso)
        : edad <= edadMaxBaja && rng.chance(probabilidadBaja));
      if (retirado || baja) return [sinDeporte(n, pob, baja)];
      // Una temporada más en su equipo: con ellas (y lo que vale en su puesto) se va formando su puesto favorito (`preferenciaDe`).
      const inicio = pob.puestos?.favoritos?.formacion.edadDeInicio ?? 8;
      return [{ ...n, temporadas: { ...n.temporadas, [pob.deporte]: (n.temporadas?.[pob.deporte] ?? Math.max(0, edad - inicio)) + temporadaJugada(n, pob, curso - 1) } }];
    });
  }
  // Los fichajes de verano, dentro del plazo (el nuevo curso empieza antes de la primera competición): los clubes grandes miran a los mejores de los pequeños y los desplazados buscan
  // club. El personaje cuenta como un jugador más de su equipo, con lo que vale: si otro que vale más le ocupa el sitio, **sale del club como cualquier niño** (se le avisa con
  // `club.plaza_perdida` y decide él qué hace; lo único distinto es que a él nunca se le retira del deporte para siempre).
  const mercado: MercadoDeFichajes = { lista: new ListaDeTrabajo(lista.map((n) => [n.id, n])), pobs, dia, val: valoracionDe(rend), reservas: new Map() };
  for (const j of personaje) mercado.lista.set(idDelPersonaje(j.deporte), jugadorComoNpc(j, dia));
  fichajesDeVerano(mercado, semilla, curso);
  resultado.propuestas = mercado.propuestas ?? [];
  const reservasQueQuedan = new Map(reservas);
  for (const j of personaje) {
    const dentro = mercado.lista.get(idDelPersonaje(j.deporte))?.deporte !== undefined;
    mercado.lista.delete(idDelPersonaje(j.deporte));
    if (!dentro) {
      resultado.sinPlaza.push(j.deporte);
      reservasQueQuedan.delete(claveDeEquipo(j.club, j.categoria));
    }
  }
  // Los equipos se rellenan con los interesados y, después, la regla de los equipos según la demanda: cierran los que no llegan al mínimo y abren los que hacen falta para que los
  // interesados que se quedan sin equipo (tantos como el mínimo de una plantilla) lo tengan.
  const llenos = reclutarEnTodos([...mercado.lista.values()], mercado.pobs, dia, reservasQueQuedan, rend);
  const final: MercadoDeFichajes = { lista: new ListaDeTrabajo(llenos.map((n) => [n.id, n])), pobs: mercado.pobs, dia, val: valoracionDe(rend), reservas: reservasQueQuedan };
  // No hay «draft» los años siguientes: cada uno sigue en su club; la bolsa (los que empiezan y los que se quedaron sin equipo) completa los equipos con su prueba, los que se quedan con menos de 14 se
  // completan o se cierran, y quien no consigue equipo en dos plazos seguidos lo deja para siempre.
  completarEquipos(final, rng, { conPrueba: true });
  resultado.dejanSinClub = apartarODejar(final, segunda);
  resultado.pobs = [...final.pobs];
  return [...final.lista.values()];
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
