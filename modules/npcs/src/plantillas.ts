/**
 * Las plantillas: quién juega en cada equipo, el reclutamiento y los equipos A a D.
 * Lógica de los deportes de equipo del juego base (`PLAN_DEPORTES_MODULARES.md` §7 bis): no sabe de ningún deporte concreto; cada deporte da sus datos.
 */
import { relacionConElEntrenador, type EquipoDelMundoView, type CategoriaDef, type RutinaDeDeporte, ESTADO_INICIAL, CAPACIDADES_GENETICAS, type JugadorDeEquipoView, parecidoDePuestos, grupoDePuesto, anioNatural, primerDiaDelAnio, rngEstable, cuposPorGrupo, type Pierna, type NpcRole, aptitudDe, type TipoAsignado } from '@ds/contracts';
import { interesPor, nivelEn, plazasPorEdad, potencialEn, ritmoEn } from './deportistas';
import { LETRAS, repartirEnEquipos, suplentesDe, type EquiposDelClub, type MiembroDeClub } from './equipos';
import { ofertaDePuesto, puestoDondeMasVale } from './puestos';
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

import { EDAD_FIN_COLEGIO, EquipoGuardado, Npc, PoblacionGuardada, delColegio, descripcionDeOtroColegio, edadDeJuego, edadNpc, hermanos, npcs, persona } from './index';
import { conDraft, draftDeEquipos } from './draft';
import { idDeEntrenadorDeEquipo } from './draft';
import { huecosQueHace } from './semana';
import { lectorDeUnNpc, Valoracion, aceptaElPuesto, categoriaDe, leGustaElGrupo, ofertaAlCandidato, piernaDe, puestoDeJugador, reglaDePlaza, valorEnSuPuesto, valorRealDe, valoracionDe, valoresPorPuestoDe } from './plaza';

/** Las edades en las que recluta un equipo: las del deporte, acotadas por las suyas (un equipo de colegio solo llega a la edad en que acaba el colegio). */
export const edadesDe = (pob: PoblacionGuardada, e: EquipoGuardado): number[] => {
  const min = Math.max(pob.reclutamiento.edades.min, e.edades?.min ?? 0);
  const max = Math.min(pob.reclutamiento.edades.max, e.edades?.max ?? (e.colegio ? EDAD_FIN_COLEGIO - 1 : Infinity));
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
};


/**
 * La lista de trabajo de los fichajes: un `Map` de personas que además sabe quién juega en cada equipo (`deEquipo`), para no recorrer a todo el mundo cada vez que un club mira su plantilla
 * (con 7.000 personas, el recorrido repetido era lo que más costaba del cambio de curso). Se mantiene sola en `set` y `delete`.
 */
export class ListaDeTrabajo extends Map<string, Npc> {
  private equipos = new Map<string, Set<string>>();
  constructor(entradas?: Iterable<readonly [string, Npc]>) {
    super();
    if (entradas) for (const [id, n] of entradas) this.set(id, n);
  }
  private clave(n: Npc | undefined): string | undefined {
    return n?.deporte !== undefined && n.equipo !== undefined ? `${n.deporte}|${n.equipo}` : undefined;
  }
  override set(id: string, n: Npc): this {
    const antes = this.clave(super.get(id));
    const ahora = this.clave(n);
    if (antes !== ahora) {
      if (antes) this.equipos.get(antes)?.delete(id);
      if (ahora) (this.equipos.get(ahora) ?? this.equipos.set(ahora, new Set()).get(ahora)!).add(id);
    }
    return super.set(id, n);
  }
  override delete(id: string): boolean {
    const antes = this.clave(super.get(id));
    if (antes) this.equipos.get(antes)?.delete(id);
    return super.delete(id);
  }
  /** Los que juegan a un deporte en un equipo (club). */
  deEquipo(deporte: string, club: string): Npc[] {
    return [...(this.equipos.get(`${deporte}|${club}`) ?? [])].flatMap((id) => {
      const n = super.get(id);
      return n ? [n] : [];
    });
  }
}


/** Un niño al que un equipo puede mirar: una persona del mundo con genética que aún no juega a nada (ni lo ha dejado). */
export interface Aspirante {
  npc: Npc;
  /** Su colegio: `propio` (el del personaje), uno de `COLEGIOS_DE_FUERA` o `ninguno` (ya no va al colegio). */
  colegio: string;
  /** Cuánto le interesa el deporte (0 a 3), su potencial en él y **lo que vale de verdad hoy** (su rendimiento con sus capacidades reales): lo que decide a quién recluta un equipo. */
  interes: number;
  potencial: number;
  valor: number;
}


export const colegioDeNino = (n: Npc): string => n.colegio ?? (delColegio(n) ? 'propio' : 'ninguno');

export const colegioDeNinoPublico = colegioDeNino;


/** Los niños de una edad que un deporte puede reclutar: los del colegio del personaje, los de otros colegios, los hermanos y los jóvenes que ya no van al colegio. */
export function aspirantesDeEdad(npcs: readonly Npc[], pob: PoblacionGuardada, edad: number, dia: number, val: Valoracion): Aspirante[] {
  const lista: Aspirante[] = [];
  for (const n of npcs) {
    if (!n.genetica || n.deporte !== undefined || n.dejado?.includes(pob.deporte) || n.apartado?.includes(pob.deporte) || edadNpc(n, dia) !== edad) continue;
    const potencial = potencialEn(n.id, n.genetica, pob);
    lista.push({ npc: n, colegio: colegioDeNino(n), interes: interesPor(n.rasgos, pob.deporte), potencial, valor: valorRealDe(n, pob, val, dia) ?? potencial });
  }
  return lista;
}


/** Un equipo recluta a un niño: pasa a jugar al deporte en ese equipo, con su potencial, su ritmo y su nivel a esa edad, y sigue los tipos de agenda de su club. */
export function reclutarA(a: Aspirante, e: EquipoGuardado, pob: PoblacionGuardada, edad: number, dia: number, puesto?: string): Npc {
  const base = a.npc;
  const g = base.genetica!;
  const enSuColegio = e.colegio === 'propio';
  // Un niño de otro colegio pasa a ser un rival (juega en su club o en el equipo de su colegio); un compañero, un hermano o un niño del barrio sigue siendo quien es y además va a las sesiones de su club.
  const deFuera = base.role === 'vecino';
  const tipos: TipoAsignado[] = deFuera
    ? [{ tipo: 'rival', club: e.nombre, deporte: pob.deporte }]
    : [...(base.tipos ?? []).map((t) => (t.tipo === 'hermano' ? { ...t, deporte: pob.deporte } : t)), { tipo: 'club', club: e.club, deporte: pob.deporte }];
  return {
    ...base,
    ...(deFuera ? { role: 'rival' as NpcRole } : {}),
    deporte: pob.deporte,
    equipo: e.club,
    club: e.nombre,
    tags: [...base.tags, pob.etiqueta, ...(enSuColegio ? ['equipo'] : [])],
    levels: { ...base.levels, [pob.deporte]: nivelEn(base.id, g, a.potencial, (dia - base.nacimiento!) / 365, pob.deporte, dia) },
    potential: { ...base.potential, [pob.deporte]: a.potencial },
    ...(pob.puestos ? { pierna: piernaDe(base, pob) } : {}),
    ...(puesto ? { puesto: { ...base.puesto, [pob.deporte]: puesto } } : {}),
    ritmo: { ...base.ritmo, [pob.deporte]: ritmoEn(base.id, g, pob.deporte) },
    tipos,
    description: deFuera ? pob.descripcionDeRival : enSuColegio ? `${base.description?.replace(/\.$/, '')}. ${pob.descripcionDelEquipo}` : base.description,
  };
}


/**
 * Los equipos y clubes de un deporte completan sus plantillas. Cada equipo tiene un número de niños más o menos definido y reparte sus plazas entre las
 * edades que recluta; en cada edad, los equipos escogen por orden de calidad (los clubes de más nivel, primero) entre los niños que les corresponden: los
 * equipos de un colegio, solo entre sus alumnos; los clubes, entre los de cualquier colegio (puede pasar que un compañero del personaje vaya a un club de
 * fuera, pero nunca que un niño de otro colegio juegue en el equipo del colegio del personaje). Entre ellos se recluta primero a los interesados en el
 * deporte y, de ellos, a los de más potencial: así, entre tantos niños, de forma natural unos destacan sobre otros. Sirve para crear la partida, para
 * rellenar las plazas que quedan libres cada curso y para añadir un deporte a una partida empezada.
 */
export function reclutarDeportistas(npcs: Npc[], pob: PoblacionGuardada, dia: number, soloInteresados = false, reservas: ReadonlyMap<string, number> = new Map(), val: Valoracion = valoracionDe()): Npc[] {
  const equipos = [...pob.equipos].filter((e) => !e.plantillaPorCategoria).sort((a, b) => b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
  const plazas = new Map(equipos.map((e) => [e.club, plazasPorEdad(e.club, e.objetivo, edadesDe(pob, e))]));
  const ocupadas = new Map<string, number>();
  // Cuántos le faltan a cada equipo para completar su plantilla (los niños envejecen y las plazas por edad ya no coinciden con quien hay: lo que cuenta es el total).
  const faltan = new Map(equipos.map((e) => [e.club, e.objetivo]));
  for (const n of npcs) {
    const edad = n.deporte === pob.deporte && n.equipo !== undefined ? edadDeJuego(n, dia) : undefined;
    if (edad === undefined) continue;
    ocupadas.set(`${n.equipo}|${edad}`, (ocupadas.get(`${n.equipo}|${edad}`) ?? 0) + 1);
    faltan.set(n.equipo!, (faltan.get(n.equipo!) ?? 0) - 1);
  }
  const cambios = new Map<string, Npc>();
  const tomados = new Set<string>();
  const orden = (x: Aspirante, y: Aspirante): number => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1);
  for (let edad = pob.reclutamiento.edades.min; edad <= pob.reclutamiento.edades.max; edad++) {
    // En cada edad, un equipo busca cubrir lo que le falta respecto a su reparto ideal por edades, sin pasar de lo que le falta en total.
    const huecos = equipos
      .map((e) => ({ e, falta: Math.min((plazas.get(e.club)?.get(edad) ?? 0) - (ocupadas.get(`${e.club}|${edad}`) ?? 0), faltan.get(e.club) ?? 0) }))
      .filter((h) => h.falta > 0);
    if (!huecos.length) continue;
    const pool = aspirantesDeEdad(npcs, pob, edad, dia, val);
    for (const { e, falta } of huecos) {
      const elegibles = pool.filter((a) => !tomados.has(a.npc.id) && (e.colegio === undefined || a.colegio === e.colegio));
      const elegidos = [...elegibles.filter((a) => a.interes > 0).sort(orden), ...(soloInteresados ? [] : elegibles.filter((a) => a.interes === 0).sort(orden))].slice(0, falta);
      faltan.set(e.club, (faltan.get(e.club) ?? 0) - elegidos.length);
      for (const a of elegidos) {
        tomados.add(a.npc.id);
        cambios.set(a.npc.id, reclutarA(a, e, pob, edad, dia));
      }
    }
  }
  const conLegados = npcs.map((n) => cambios.get(n.id) ?? n);
  // Los equipos por categoría con puestos los forma el «draft» (`draftDeEquipos`), no este reclutamiento por orden de tamaño.
  if (conDraft(pob, val)) return conLegados;
  return reclutarEquiposPorCategoria(conLegados, pob, dia, soloInteresados, reservas, tomados, val);
}


/** Las categorías en que un equipo tiene su propio equipo (las de `categorias`, o todas las que recluta el club) con las edades que recluta en cada una. */
export function categoriasDelEquipo(pob: PoblacionGuardada, e: EquipoGuardado): { id: string; edades: number[] }[] {
  const delClub = new Set(edadesDe(pob, e));
  return (pob.categorias ?? [])
    .filter((c) => !e.categorias || e.categorias.includes(c.id))
    .map((c) => ({ id: c.id, edades: [...delClub].filter((x) => x >= c.edadMin && x <= c.edadMax).sort((a, b) => a - b) }))
    .filter((c) => c.edades.length > 0);
}


/** Cuántos jugadores caben en el club en una categoría: el máximo de un equipo por los equipos que el club tiene abiertos en ella. */
export const capacidadDe = (e: EquipoGuardado, categoria: string): number => (e.plantillaPorCategoria?.max ?? 0) * (e.equiposPorCategoria?.[categoria] ?? 1);


/** Clave de un equipo por categoría (club y categoría) en el mapa de reservas del personaje. */
export const claveDeEquipo = (club: string, categoria: string): string => `${club}|${categoria}`;


/**
 * Los equipos por categoría (`plantillaPorCategoria`): uno por club y categoría. Los clubes escogen por orden de tamaño (los grandes primero) y cada uno recluta a los
 * interesados **por lo que vale cada uno de verdad** (su rendimiento hoy), con **la misma regla de plaza que el personaje** (`reglaDePlaza`): con hueco entra, y con el equipo
 * completo solo entra quien vale más que el peor, que deja el sitio y vuelve a estar disponible para los clubes que escojan después. Se llega como mucho al máximo (menos
 * la plaza que ocupa el personaje, si juega ahí: `reservas`) y, si con los interesados no se llega al mínimo, se completa con niños sin interés hasta el mínimo y no más allá.
 * Con `soloInteresados` solo se hace lo primero.
 */
export function reclutarEquiposPorCategoria(npcs: Npc[], pob: PoblacionGuardada, dia: number, soloInteresados: boolean, reservas: ReadonlyMap<string, number>, tomados: Set<string>, val: Valoracion): Npc[] {
  const equipos = pob.equipos.filter((e) => e.plantillaPorCategoria).sort((a, b) => b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
  if (!equipos.length) return npcs;
  // La lista de trabajo: los niños que van cambiando de equipo mientras los clubes escogen.
  const lista = new Map(npcs.map((n) => [n.id, n]));
  const orden = (x: Aspirante, y: Aspirante): number => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1);
  const valorDe = (n: Npc): number => valorRealDe(n, pob, val, dia) ?? n.levels[pob.deporte] ?? 0;
  for (const e of equipos) {
    const { min } = e.plantillaPorCategoria!;
    for (const cat of categoriasDelEquipo(pob, e)) {
      const max = capacidadDe(e, cat.id);
      const enEquipo = (): Npc[] => [...lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club && cat.edades.includes(edadDeJuego(n, dia) ?? -1));
      const tope = max - (reservas.get(claveDeEquipo(e.club, cat.id)) ?? 0);
      const todos = [...lista.values()];
      const elegibles = cat.edades
        .flatMap((edad) => aspirantesDeEdad(todos, pob, edad, dia, val).map((a) => ({ a, edad })))
        .filter(({ a }) => !tomados.has(a.npc.id) && (e.colegio === undefined || a.colegio === e.colegio));
      const ficha = ({ a, edad }: { a: Aspirante; edad: number }): void => {
        tomados.add(a.npc.id);
        lista.set(a.npc.id, reclutarA(a, e, pob, edad, dia));
      };
      if (pob.puestos && val.rend.get(pob.deporte)?.puestos) {
        // Con puestos: se llena el reparto de la plantilla grupo a grupo (los más escasos primero: porteros, centrales...) con los interesados que más valen en cada grupo y que aceptan el
        // puesto (siempre el favorito; los demás, según su carácter); después, quien vale más que el peor de un grupo lo sustituye, y por último se completa hasta el mínimo con los demás.
        const mercado: MercadoDeFichajes = { lista, pobs: [pob], dia, val, reservas };
        const pasos = (interesados: boolean) => (a: Aspirante) => (interesados ? a.interes > 0 : a.interes === 0) && !tomados.has(a.npc.id);
        const intentar = (c: { a: Aspirante; edad: number }, grupo?: string): boolean => {
          const valores = valoresPorPuestoDe(c.a.npc, pob, val, dia);
          if (!valores) return false;
          const jugadores = enEquipo();
          const cupos = cuposPorGrupo(pob.puestos!, tope);
          const solo = grupo ? { [grupo]: cupos[grupo] } : cupos;
          const oferta = ofertaAlCandidato(jugadores, tope, pob, valores, puestoDondeMasVale(valores), val, dia);
          const ofrecida = grupo ? ofertaDePuesto(jugadores.flatMap((j) => { const pj = puestoDeJugador(j, pob, val, dia); return pj ? [{ id: j.id, nombre: j.name, puesto: pj, valor: valorEnSuPuesto(j, pob, val, dia, pj) }] : []; }), solo as Record<string, number>, pob.puestos!, valores, puestoDondeMasVale(valores)) : oferta;
          if (!ofrecida || (c.a.interes > 0 && !aceptaElPuesto(c.a.npc, pob, e.club, val, dia, ofrecida))) return false;
          if (ofrecida.peor) {
            lista.set(ofrecida.peor.id, sinDeporte(lista.get(ofrecida.peor.id)!, pob, false));
            tomados.delete(ofrecida.peor.id);
          }
          tomados.add(c.a.npc.id);
          lista.set(c.a.npc.id, reclutarA(c.a, e, pob, c.edad, dia, ofrecida.puesto));
          return true;
        };
        void mercado;
        const grupos = [...pob.puestos.reparto].sort((x, y) => x.jugadores - y.jugadores || (x.grupo < y.grupo ? -1 : 1));
        const cupos = cuposPorGrupo(pob.puestos, tope);
        const enGrupo = (g: { puestos: readonly string[] }) => enEquipo().filter((j) => g.puestos.includes(puestoDeJugador(j, pob, val, dia) ?? '')).length;
        for (const g of grupos) {
          const mejoresEnElGrupo = (a: Aspirante) => {
            const vs = valoresPorPuestoDe(a.npc, pob, val, dia);
            return (leGustaElGrupo(a.npc, pob, val, dia, g.puestos) ? 1000 : 0) + (vs ? Math.max(...g.puestos.map((p) => vs[p] ?? 0)) : 0);
          };
          for (const c of elegibles.filter(({ a }) => pasos(true)(a)).sort((x, y) => mejoresEnElGrupo(y.a) - mejoresEnElGrupo(x.a) || (x.a.npc.id < y.a.npc.id ? -1 : 1))) {
            if (enGrupo(g) >= (cupos[g.grupo] ?? 0)) break;
            intentar(c, g.grupo);
          }
        }
        // Los que quedan (interesados), del que más vale al que menos: entran por mérito si valen más que el peor de algún grupo.
        for (const c of elegibles.filter(({ a }) => pasos(true)(a)).sort((x, y) => orden(x.a, y.a))) intentar(c);
        if (!soloInteresados) {
          for (const g of grupos) {
            for (const c of elegibles.filter(({ a }) => pasos(false)(a)).sort((x, y) => orden(x.a, y.a))) {
              if (enEquipo().length >= min || enGrupo(g) >= (cupos[g.grupo] ?? 0)) break;
              intentar(c, g.grupo);
            }
          }
        }
        continue;
      }
      for (const c of elegibles.filter(({ a }) => a.interes > 0).sort((x, y) => orden(x.a, y.a))) {
        const actuales = enEquipo();
        const plaza = reglaDePlaza(actuales.map((n) => ({ id: n.id, nombre: n.name, valor: valorDe(n) })), tope, c.a.valor);
        if (plaza.estado === 'completo') continue;
        if (plaza.estado === 'por_merito') {
          // Entra quien vale más que el peor: el peor deja el sitio (sin quedar vetado: otro club puede escogerlo).
          const sale = lista.get(plaza.peor!.id)!;
          lista.set(sale.id, sinDeporte(sale, pob, false));
          tomados.delete(sale.id);
        }
        ficha(c);
      }
      const total = enEquipo().length;
      if (!soloInteresados && total < min) for (const c of elegibles.filter(({ a }) => a.interes === 0 && !tomados.has(a.npc.id)).sort((x, y) => orden(x.a, y.a)).slice(0, min - total)) ficha(c);
    }
  }
  return npcs.map((n) => lista.get(n.id) ?? n);
}

// ---------------------------------------------------------------------------------------------------- fichajes, desplazados y quien se queda sin equipo


/** Quiénes juegan hoy en el equipo de un club para niños de esta edad y cuántos caben (menos la plaza del personaje, si es de ese equipo); `undefined` si el club no tiene equipo para esa edad. */
export function plantelDe(lista: ReadonlyMap<string, Npc>, pob: PoblacionGuardada, e: EquipoGuardado, edad: number, dia: number, reservas: ReadonlyMap<string, number>): { jugadores: Npc[]; max: number } | undefined {
  if (!edadesDe(pob, e).includes(edad)) return undefined;
  const delClub = lista instanceof ListaDeTrabajo ? lista.deEquipo(pob.deporte, e.club) : [...lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club);
  if (!e.plantillaPorCategoria) return { jugadores: delClub, max: e.objetivo };
  const cat = categoriaDe(pob, edad);
  if (!cat || (e.categorias && !e.categorias.includes(cat.id))) return undefined;
  const jugadores = delClub.filter((n) => (edadDeJuego(n, dia) ?? -1) >= cat.edadMin && (edadDeJuego(n, dia) ?? -1) <= cat.edadMax);
  return { jugadores, max: capacidadDe(e, cat.id) - (reservas.get(claveDeEquipo(e.club, cat.id)) ?? 0) };
}


/** Lo que necesitan los fichajes y la búsqueda de club: la lista de trabajo, el día, cómo se valora a cada niño y las plazas que ocupa el personaje. */
export interface MercadoDeFichajes {
  lista: Map<string, Npc>;
  pobs: readonly PoblacionGuardada[];
  dia: number;
  val: Valoracion;
  reservas: ReadonlyMap<string, number>;
  /** Las propuestas de puesto que el entrenador le hace al personaje al recolocar (decide él). */
  propuestas?: { deporte: string; puesto: string }[];
}


/** El personaje como jugador de un equipo: su deporte, su club, su categoría (id), cuánto vale en el deporte, su edad de competición y su nombre. */
export interface JugadorEnClub {
  deporte: string;
  club: string;
  categoria: string;
  valor: number;
  edad: number;
  /** El puesto en que juega, si el deporte tiene puestos (y `valor` es lo que vale en él), y su pierna buena. */
  puesto?: string;
  pierna?: Pierna;
  /** Lo que vale en cada puesto (con su pierna): con ello el entrenador puede proponerle otro puesto al recolocar. */
  valores?: Record<string, number>;
}

export const idDelPersonaje = (deporte: string): string => `personaje@${deporte}`;

/** El personaje como un jugador más del mundo, solo mientras se hacen los fichajes (para que la regla de plaza lo trate como a los demás). */
export const jugadorComoNpc = (j: JugadorEnClub, dia: number): Npc => ({
  id: idDelPersonaje(j.deporte),
  name: 'Tú',
  role: 'companero',
  gender: 'm',
  tags: [],
  levels: { [j.deporte]: j.valor },
  potential: {},
  deporte: j.deporte,
  equipo: j.club,
  ...(j.puesto ? { puesto: { [j.deporte]: j.puesto } } : {}),
  ...(j.pierna ? { pierna: j.pierna } : {}),
  ...(j.valores ? { vp: { [j.deporte]: { valor: j.valor, puestos: j.valores } } } : {}),
  nacimiento: primerDiaDelAnio(anioNatural(dia) - j.edad),
});


/** Los miembros de un club en una categoría, con el puesto en que juegan, lo que valen en él y su año en la categoría (el primero es el de la edad más baja). */
export function miembrosDelClub(lista: ReadonlyMap<string, Npc>, pob: PoblacionGuardada, e: EquipoGuardado, edades: readonly number[], dia: number, val: Valoracion): { n: Npc; m: MiembroDeClub }[] {
  const primero = Math.min(...edades);
  return (lista instanceof ListaDeTrabajo ? lista.deEquipo(pob.deporte, e.club) : [...lista.values()])
    .filter((n) => n.deporte === pob.deporte && n.equipo === e.club && edades.includes(edadDeJuego(n, dia) ?? -1))
    .flatMap((n) => {
      const puesto = puestoDeJugador(n, pob, val, dia);
      return puesto ? [{ n, m: { id: n.id, puesto, valor: valorEnSuPuesto(n, pob, val, dia, puesto), anio: ((edadDeJuego(n, dia) ?? primero) === primero ? 1 : 2) as 1 | 2 } }] : [];
    });
}


/**
 * Los equipos A, B, C y D de un club en una categoría: los grandes, por año; los demás, por nivel; cada uno con su reparto por puestos (`extra`: miembros de más, como el personaje). Los suplentes de cada
 * equipo son los que no están entre sus titulares (`formacion` del deporte).
 * **Los equipos se fijan para toda la temporada** (decisión del usuario, 08/11/2026): en verano se calculan con lo que vale cada jugador (`fijarEquipos` guarda su `letra`) y durante el curso no cambian, aunque
 * cambie lo que vale cada uno. Por eso, si todos los miembros llevan su letra, se devuelven esas; con `recalcular` (la reorganización de verano, o una medida hipotética con `extra`) se calculan de nuevo.
 */
export function equiposDelClub(lista: ReadonlyMap<string, Npc>, pob: PoblacionGuardada, e: EquipoGuardado, categoria: { id: string; edades: readonly number[] }, dia: number, val: Valoracion, extra: readonly MiembroDeClub[] = [], recalcular = false): { equipos: EquiposDelClub; suplentes: string[]; miembros: { n: Npc; m: MiembroDeClub }[] } {
  // `extra`: miembros de más que no están en la lista de personas (el personaje, o uno hipotético en una medida); entran en el reparto como los demás.
  const miembros = miembrosDelClub(lista, pob, e, categoria.edades, dia, val);
  const todos = [...miembros.map((x) => x.m), ...extra];
  const k = e.equiposPorCategoria?.[categoria.id] ?? 1;
  // Con las letras guardadas, cada uno está en su equipo; quien no la lleva (no cupo en ninguno al repartir en verano) sobra, como entonces.
  const fijos = !recalcular && !extra.length && miembros.some((x) => !!x.n.letra?.[pob.deporte]);
  const equipos: EquiposDelClub = fijos
    ? { A: [], B: [], C: [], D: [], sobran: miembros.filter((x) => !x.n.letra?.[pob.deporte]).map((x) => x.n.id), ...Object.fromEntries(LETRAS.map((l) => [l, miembros.filter((x) => x.n.letra?.[pob.deporte] === l).map((x) => x.n.id)])) }
    : repartirEnEquipos(todos, pob.puestos!, k, e.plantillaPorCategoria!.max, true, pob.puestos!.equipos?.listonDePrimerAno ?? 0, e.plantillaPorCategoria!.min);
  const titulares = pob.puestos!.equipos?.titulares ?? {};
  const suplentes = LETRAS.flatMap((l) => suplentesDe(todos.filter((m) => equipos[l].includes(m.id)), pob.puestos!, titulares));
  return { equipos, suplentes, miembros };
}

/**
 * **Fija los equipos de la temporada** (decisión del usuario, 08/11/2026): al acabar la reorganización de verano, cada jugador guarda la letra de su equipo (A a D) según lo que vale ahora; durante el curso no
 * cambia de equipo (con la liga y las convocatorias de la F2 no podría) salvo por un ascenso decidido (`completarUnaCategoria`) y, en verano, se vuelve a repartir. Quien no cabe en ningún equipo no lleva letra.
 */
export function fijarEquipos(m: MercadoDeFichajes, pob: PoblacionGuardada): void {
  if (!pob.puestos) return;
  for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
    for (const c of categoriasDelEquipo(pob, e)) {
      const { equipos, miembros } = equiposDelClub(m.lista, pob, e, c, m.dia, m.val, [], true);
      for (const { n } of miembros) {
        if (n.id.startsWith('personaje@')) continue;
        const letra = LETRAS.find((l) => equipos[l].includes(n.id));
        if (n.letra?.[pob.deporte] === letra) continue;
        const resto = Object.fromEntries(Object.entries(n.letra ?? {}).filter(([d]) => d !== pob.deporte));
        const nueva = letra ? { ...resto, [pob.deporte]: letra } : resto;
        m.lista.set(n.id, { ...n, letra: Object.keys(nueva).length ? nueva : undefined });
      }
    }
  }
}


/** ¿Se va un suplente a un equipo nuevo? Lo decide según su ambición (de 15 % a 85 %: lo prefiere ser titular en uno nuevo que el 18.º de otro). Un sorteo suyo. */
export const quiereIrseDeSuplente = (n: Npc, club: string, dia: number): boolean =>
  rngEstable('suplente', n.genetica?.semilla ?? 0, n.id, club, dia).chance(Math.min(0.85, Math.max(0.15, 0.15 + 0.7 * (((n.rasgos?.caracter.ambicion ?? 0) + 50) / 100))));

// ---------------------------------------------------------------------------------------------------- equipos según la demanda



/**
 * Los equipos de todos los deportes completan sus plantillas en dos vueltas: primero cada deporte recluta a los interesados en él y, solo después, los
 * que aún faltan se cubren con quien encaje (aunque no le interese). Así un niño al que le gusta un deporte no lo pierde porque otro deporte, que va antes,
 * tuviese plazas por cubrir.
 */
export function reclutarEnTodos(npcs: Npc[], pobs: readonly PoblacionGuardada[], dia: number, reservas: ReadonlyMap<string, number> = new Map(), rend: Rendimientos = new Map()): Npc[] {
  const interesados = pobs.reduce((lista, pob) => reclutarDeportistas(lista, pob, dia, true, reservas, valoracionDe(rend)), npcs);
  return pobs.reduce((lista, pob) => reclutarDeportistas(lista, pob, dia, false, reservas, valoracionDe(rend)), interesados);
}


/** Un niño deja el deporte (o se retira): ya no está en ningún equipo y, si lo dejó, no se le vuelve a reclutar para él. */
export function sinDeporte(n: Npc, pob: PoblacionGuardada, dejado: boolean): Npc {
  const { [pob.deporte]: _n, ...levels } = n.levels;
  const { [pob.deporte]: _p, ...potential } = n.potential;
  const ritmo = n.ritmo ? Object.fromEntries(Object.entries(n.ritmo).filter(([k]) => k !== pob.deporte)) : undefined;
  const puesto = n.puesto ? Object.fromEntries(Object.entries(n.puesto).filter(([k]) => k !== pob.deporte)) : undefined;
  const temporadas = n.temporadas ? Object.fromEntries(Object.entries(n.temporadas).filter(([k]) => k !== pob.deporte)) : undefined;
  const letra = n.letra ? Object.fromEntries(Object.entries(n.letra).filter(([k]) => k !== pob.deporte)) : undefined;
  const adelanto = n.adelanto ? Object.fromEntries(Object.entries(n.adelanto).filter(([k]) => k !== pob.deporte)) : undefined;
  // Lo que valía jugando ya no vale: si vuelve a jugar, se calcula de nuevo (y la semana lo guarda).
  const vp = n.vp ? Object.fromEntries(Object.entries(n.vp).filter(([k]) => k !== pob.deporte)) : undefined;
  return {
    ...n,
    puesto,
    letra: letra && Object.keys(letra).length ? (letra as Record<string, 'A' | 'B' | 'C' | 'D'>) : undefined,
    temporadas: temporadas && Object.keys(temporadas).length ? temporadas : undefined,
    adelanto: adelanto && Object.keys(adelanto).length ? (adelanto as Record<string, 1>) : undefined,
    vp,
    deporte: undefined,
    equipo: undefined,
    club: undefined,
    tags: n.tags.filter((t) => t !== pob.etiqueta && t !== 'equipo'),
    levels,
    potential,
    ritmo,
    // Un niño de otro colegio que deja de jugar vuelve a ser un niño del barrio.
    ...(n.role === 'rival'
      ? { role: 'vecino' as NpcRole, tipos: [{ tipo: 'vecino' as const }], description: descripcionDeOtroColegio(n.gender) }
      : { tipos: n.tipos?.filter((t) => !(t.tipo === 'club' && t.deporte === pob.deporte)).map((t) => (t.tipo === 'hermano' ? { ...t, deporte: undefined } : t)) }),
    ...(dejado ? { dejado: [...(n.dejado ?? []), pob.deporte] } : {}),
  };
}



/**
 * **Un grupo de puestos vacío en un equipo** (por ejemplo, sin portero) **lo cubre el que mejor se adapte de los no titulares**, aunque no le guste (decisión del usuario, 08/11/2026): así no se debilitan dos puestos en
 * vez de uno. Es una última opción para él: casi siempre acepta (`aceptaElPuesto` con `ultimaOpcion`); si no, se prueba con el siguiente. Solo cambia de puesto dentro de su equipo, y de un grupo en que quedan
 * más de uno. Devuelve cuántos cambian de puesto. El personaje no se mueve (se le propone el cambio al recolocar).
 */
export function cubrirGruposVacios(m: MercadoDeFichajes, pob: PoblacionGuardada, catId: string, edades: readonly number[]): number {
  const p = pob.puestos;
  if (!p || !pob.equipos.some((e) => e.plantillaPorCategoria)) return 0;
  let cambios = 0;
  for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria && categoriasDelEquipo(pob, x).some((c) => c.id === catId))) {
    for (let vuelta = 0; vuelta < 4; vuelta++) {
      const { equipos, suplentes, miembros } = equiposDelClub(m.lista, pob, e, { id: catId, edades }, m.dia, m.val, [], true);
      const porId = new Map(miembros.map((x) => [x.n.id, x]));
      const noTitulares = new Set(suplentes);
      let cambio = false;
      for (const letra of ['A', 'B', 'C', 'D'] as const) {
        const ids = equipos[letra];
        if (!ids.length) continue;
        const cupos = cuposPorGrupo(p, ids.length);
        const cuenta: Record<string, number> = {};
        for (const id of ids) {
          const g = grupoDePuesto(p, porId.get(id)!.m.puesto) ?? '?';
          cuenta[g] = (cuenta[g] ?? 0) + 1;
        }
        for (const g of p.reparto.filter((x) => (cupos[x.grupo] ?? 0) > 0 && (cuenta[x.grupo] ?? 0) === 0)) {
          // Los candidatos: no titulares de este equipo, de un grupo con más de uno, por lo que valen en el mejor puesto del grupo vacío (el que mejor se adapte).
          const candidatos = ids
            .filter((id) => noTitulares.has(id) && !id.startsWith('personaje@') && (cuenta[grupoDePuesto(p, porId.get(id)!.m.puesto) ?? '?'] ?? 0) > 1)
            .flatMap((id) => {
              const n = porId.get(id)!.n;
              const valores = valoresPorPuestoDe(n, pob, m.val, m.dia);
              if (!valores) return [];
              const puesto = puestoDondeMasVale(valores, g.puestos);
              return puesto ? [{ n, puesto, valor: valores[puesto] }] : [];
            })
            .sort((a, b) => b.valor - a.valor || (a.n.id < b.n.id ? -1 : 1))
            .slice(0, 3);
          for (const c of candidatos) {
            if (!aceptaElPuesto(c.n, pob, e.club, m.val, m.dia, { puesto: c.puesto, estado: 'libre', valor: c.valor, titular: true }, true)) continue;
            m.lista.set(c.n.id, { ...c.n, puesto: { ...(c.n.puesto ?? {}), [pob.deporte]: c.puesto } });
            cambios++;
            cambio = true;
            break;
          }
          if (cambio) break;
        }
        if (cambio) break;
      }
      if (!cambio) break;
    }
  }
  return cambios;
}


/**
 * **Quien está en un club está en uno de sus equipos** (decisión del usuario, 08/11/2026): tras el reparto de verano no puede quedar nadie en un club sin equipo (por los cupos de puestos, un jugador puede no caber
 * en ninguno de los equipos de su club y categoría). El entrenador le ofrece otro puesto donde quepa (los de los grupos con sitio, de más a menos parecido a su puesto; fuera de lo suyo casi siempre acepta, y
 * más si es su última opción) y, si aun así no cabe en ningún equipo, **deja el club y busca otro como cualquier desplazado** (se devuelve). Con `definitivo` (la última ronda) el que no cabe queda apartado ese
 * curso en vez de buscar. El personaje no se mueve.
 */
export function acomodarSobrantes(m: MercadoDeFichajes, pob: PoblacionGuardada, definitivo: boolean): { id: string; origen: string; no?: string }[] {
  const p = pob.puestos;
  const fuera: { id: string; origen: string; no?: string }[] = [];
  if (!p) return fuera;
  for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
    for (const c of categoriasDelEquipo(pob, e)) {
      const k = e.equiposPorCategoria?.[c.id] ?? 1;
      const cupos = cuposPorGrupo(p, e.plantillaPorCategoria!.max);
      for (let vuelta = 0; vuelta < 6; vuelta++) {
        const r = equiposDelClub(m.lista, pob, e, c, m.dia, m.val, [], true);
        if (!r.equipos.sobran.length) break;
        const cuenta: Record<string, number> = {};
        for (const x of r.miembros) {
          const g = grupoDePuesto(p, x.m.puesto) ?? '?';
          cuenta[g] = (cuenta[g] ?? 0) + 1;
        }
        let cambio = false;
        for (const x of r.miembros.filter((y) => r.equipos.sobran.includes(y.n.id) && !y.n.id.startsWith('personaje@')).sort((a, b) => b.m.valor - a.m.valor || (a.n.id < b.n.id ? -1 : 1))) {
          const valores = valoresPorPuestoDe(x.n, pob, m.val, m.dia);
          if (!valores) continue;
          const ofertas = p.reparto
            .filter((g) => (cuenta[g.grupo] ?? 0) < (cupos[g.grupo] ?? 0) * k)
            .map((g) => puestoDondeMasVale(valores, g.puestos))
            .filter((q) => !!q)
            .sort((a, b) => parecidoDePuestos(p, x.m.puesto, b) - parecidoDePuestos(p, x.m.puesto, a) || valores[b] - valores[a] || (a < b ? -1 : 1));
          for (const puesto of ofertas) {
            if (!aceptaElPuesto(x.n, pob, e.club, m.val, m.dia, { puesto, estado: 'libre', valor: valores[puesto], titular: true }, true)) continue;
            m.lista.set(x.n.id, { ...x.n, puesto: { ...(x.n.puesto ?? {}), [pob.deporte]: puesto } });
            cambio = true;
            break;
          }
          if (cambio) break;
        }
        if (!cambio) break;
      }
      // Los que siguen sin caber en ningún equipo dejan el club.
      for (const id of equiposDelClub(m.lista, pob, e, c, m.dia, m.val, [], true).equipos.sobran) {
        const n = m.lista.get(id);
        if (!n || id.startsWith('personaje@')) continue;
        const libre = sinDeporte(n, pob, false);
        m.lista.set(id, definitivo ? { ...libre, apartado: [...new Set([...(libre.apartado ?? []), pob.deporte])] } : libre);
        if (!definitivo) fuera.push({ id, origen: pob.deporte, no: e.club });
      }
      // Con menos jugadores, el club puede quedarse con equipos de menos del mínimo: se cierran los que no llegan (y, si ni uno llega, el club no tiene equipo en la categoría y sus jugadores buscan otro).
      const quedan = equiposDelClub(m.lista, pob, e, c, m.dia, m.val, [], true).miembros;
      const minimo = e.plantillaPorCategoria!.min;
      if (quedan.length < minimo * k) {
        const montables = Math.floor(quedan.length / minimo);
        e.equiposPorCategoria = { ...e.equiposPorCategoria, [c.id]: Math.max(1, montables) };
        if (montables <= 1) delete e.equiposPorCategoria[c.id];
        if (montables < 1) {
          for (const x of quedan.filter((y) => !y.n.id.startsWith('personaje@'))) {
            const libre = sinDeporte(x.n, pob, false);
            m.lista.set(x.n.id, definitivo ? { ...libre, apartado: [...new Set([...(libre.apartado ?? []), pob.deporte])] } : libre);
            if (!definitivo) fuera.push({ id: x.n.id, origen: pob.deporte, no: e.club });
          }
        } else {
          // Con un equipo menos, lo que no cabe en los que quedan sobra: se repite el reparto en la siguiente ronda de `sinSobrantes`.
          fuera.push(...acomodarSobrantes({ ...m, pobs: [pob] }, pob, definitivo).filter((x) => !fuera.some((y) => y.id === x.id)));
        }
      }
    }
  }
  return fuera;
}


/**
 * Los jugadores de un equipo (club, categoría y letra A a D) para jugar un partido: su puesto, lo que valen en cada uno, su estado de hoy y su lector (`NpcDirectory.plantillaDelEquipo`). Son los mismos datos para todos:
 * el personaje y los PNJ salen de las mismas reglas.
 */
export function plantillaDeUnEquipo(npcs: readonly Npc[], pobs: readonly PoblacionGuardada[], deporte: string, club: string, categoria: string, letra: string, inicioCurso: number, semana = 0): JugadorDeEquipoView[] {
  const pob = pobs.find((p) => p.deporte === deporte);
  const cat = pob?.categorias?.find((c) => c.id === categoria);
  if (!pob || !cat) return [];
  const resiliencia = CAPACIDADES_GENETICAS.indexOf('gen.resiliencia');
  const disciplinaDelEntrenador = disciplinaDelEntrenadorDe(npcs, pob, club, cat, letra);
  const rutina = pob.rutina;
  return npcs
    .filter((n) => n.deporte === deporte && n.equipo === club && n.letra?.[deporte] === letra && (edadDeJuego(n, inicioCurso) ?? -1) >= cat.edadMin && (edadDeJuego(n, inicioCurso) ?? -1) <= cat.edadMax && !!n.puesto?.[deporte])
    .flatMap((n) => {
      const lector = lectorDeUnNpc(n, pob, inicioCurso);
      if (!lector) return [];
      const puesto = n.puesto![deporte];
      return [{
        id: n.id,
        nombre: n.name,
        puesto,
        valores: n.vp?.[deporte]?.puestos ?? {},
        valor: n.vp?.[deporte]?.puestos?.[puesto] ?? n.vp?.[deporte]?.valor ?? n.levels[deporte] ?? 0,
        estado: n.estado ?? ESTADO_INICIAL,
        resiliencia: (n.cap?.[resiliencia] ?? 50) / 100,
        ambicion: ((n.rasgos?.caracter.ambicion ?? 0) + 50) / 100,
        asistencia: rutina ? asistenciaDeLasDosUltimasSemanas(n as Parameters<typeof huecosQueHace>[0], deporte, rutina, semana) : 1,
        disciplinaDelEntrenador,
        lector,
        disciplina: ((n.rasgos?.caracter.disciplina ?? 0) + 50) / 100,
        ...(relacionConElEntrenador(n.afin?.[deporte], semana) !== undefined ? { relacionConElEntrenador: relacionConElEntrenador(n.afin?.[deporte], semana) } : {}),
        ...(n.est?.[deporte] ? { estadisticas: n.est[deporte] } : {}),
        ...(n.exp?.[deporte] ? { experiencia: n.exp[deporte] } : {}),
      }];
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}


/**
 * Qué parte de las sesiones del club hizo un jugador en las dos últimas semanas (la de esta semana, hasta hoy, y la anterior), de 0 a 1: son las sesiones a las que va cada semana (`huecosQueHace`), las mismas con las que entrena,
 * así que la asistencia cuenta igual para el personaje y para cualquier PNJ.
 */
export function asistenciaDeLasDosUltimasSemanas(n: Parameters<typeof huecosQueHace>[0], deporte: string, r: RutinaDeDeporte, semana: number): number {
  const porSemana = (n.equipo !== undefined ? r.sesionesPorSemana[n.equipo] : undefined) ?? r.sesionesPorDefecto;
  if (porSemana <= 0) return 1;
  return (huecosQueHace(n, deporte, r, semana).length + huecosQueHace(n, deporte, r, semana - 1).length) / (2 * porSemana);
}

/** Lo disciplinado que es el entrenador de un equipo (de 0 a 1): el del equipo si tiene uno propio (B, C o D) o el del club que lleva esa categoría (A). Sin entrenador, 0,5. */
function disciplinaDelEntrenadorDe(npcs: readonly Npc[], pob: PoblacionGuardada, club: string, cat: CategoriaDef, letra: string): number {
  const numero = ['A', 'B', 'C', 'D'].indexOf(letra) + 1;
  const propio = numero >= 2 ? npcs.find((n) => n.id === idDeEntrenadorDeEquipo(club, cat.id, numero)) : undefined;
  const delClub = npcs.filter((n) => n.role === 'entrenador' && n.deporte === pob.deporte && n.club !== undefined && n.tipos?.some((t) => t.tipo === 'entrenador' && t.club === club));
  const cubre = delClub.find((n) => n.edades && n.edades[0] <= cat.edadMin && n.edades[1] >= cat.edadMax) ?? delClub.find((n) => n.edades && n.edades[0] <= cat.edadMax && n.edades[1] >= cat.edadMin) ?? delClub[0];
  const entrenador = propio ?? cubre;
  return entrenador?.rasgos ? (entrenador.rasgos.caracter.disciplina + 50) / 100 : 0.5;
}


/** Los equipos que hay en una categoría de un deporte (club y letra, con al menos el mínimo de jugadores) con lo que vale cada uno (`NpcDirectory.equiposDeLaCategoria`). */
export function equiposDeUnaCategoria(npcs: readonly Npc[], pobs: readonly PoblacionGuardada[], deporte: string, categoria: string, inicioCurso: number): EquipoDelMundoView[] {
  const pob = pobs.find((p) => p.deporte === deporte);
  const cat = pob?.categorias?.find((c) => c.id === categoria);
  if (!pob || !cat) return [];
  const porEquipo = new Map<string, Npc[]>();
  for (const n of npcs) {
    const letra = n.letra?.[deporte];
    if (n.deporte !== deporte || !n.equipo || !letra) continue;
    const edad = edadDeJuego(n, inicioCurso) ?? -1;
    if (edad < cat.edadMin || edad > cat.edadMax) continue;
    const clave = `${n.equipo}|${letra}`;
    (porEquipo.get(clave) ?? porEquipo.set(clave, []).get(clave)!).push(n);
  }
  const res: EquipoDelMundoView[] = [];
  for (const [id, miembros] of porEquipo) {
    const [club, letra] = id.split('|');
    const e = pob.equipos.find((x) => x.club === club);
    if (miembros.length < (e?.plantillaPorCategoria?.min ?? 14)) continue;
    const valores = miembros.map((n) => n.vp?.[deporte]?.puestos?.[n.puesto?.[deporte] ?? ''] ?? n.vp?.[deporte]?.valor ?? n.levels[deporte] ?? 0).sort((a, b) => b - a).slice(0, 11);
    res.push({ id, club, letra, nombre: `${pob.nombresDeClub[club] ?? club} ${letra}`, fuerza: valores.reduce((t, v) => t + v, 0) / valores.length, jugadores: miembros.length, campoPropio: !!e && !e.colegio && (e.tamano ?? (e.calidad >= 3 ? 'grande' : e.calidad === 2 ? 'mediano' : 'pequeno')) !== 'pequeno' });
  }
  return res.sort((a, b) => (a.id < b.id ? -1 : 1));
}


/**
 * El equipo (A a D) en que juega el personaje: el reparto de su club en su categoría con él como un miembro más (el mismo que se hace en verano con todos, `repartirEnEquipos`) y la letra que le toca. `undefined` si su club no
 * tiene equipos por categoría o no le cabe ninguno.
 */
export function equipoDelPersonajeEn(npcs: readonly Npc[], pobs: readonly PoblacionGuardada[], deporte: string, club: string, categoria: string, miembro: Omit<MiembroDeClub, 'anio'>, edad: number, dia: number, val: Valoracion): string | undefined {
  const pob = pobs.find((p) => p.deporte === deporte);
  const e = pob?.equipos.find((x) => x.club === club && x.plantillaPorCategoria);
  const cat = pob && e ? categoriasDelEquipo(pob, e).find((c) => c.id === categoria) : undefined;
  if (!pob || !e || !cat || !pob.puestos) return undefined;
  const anio: 1 | 2 = edad === Math.min(...cat.edades) ? 1 : 2;
  const { equipos } = equiposDelClub(new Map(npcs.map((n) => [n.id, n])), pob, e, cat, dia, val, [{ ...miembro, anio }], true);
  return LETRAS.find((l) => equipos[l].includes(miembro.id));
}
