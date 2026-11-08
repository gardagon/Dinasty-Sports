/**
 * Los fichajes de verano, los desplazados y la recolocación de los propios.
 * Lógica de los deportes de equipo del juego base (`PLAN_DEPORTES_MODULARES.md` §7 bis): no sabe de ningún deporte concreto; cada deporte da sus datos.
 */
import { rngEstable, ESTADO_INICIAL, eficienciaDeEstado, type Practica, type RasgosDe, cuposPorGrupo, grupoDePuesto, valorDeLaPrueba, NIVEL_PRACTICA, aptitudDe, parecidoDePuestos } from '@ds/contracts';
import { interesPor, potencialEn } from './deportistas';
import { puestoDondeMasVale, type CondicionesDePrueba } from './puestos';

/**
 * MÓDULO NPCs (id `npcs`).
 *
 * Los NPCs dan profundidad al personaje y son la red que une módulos:
 * - Ayudan según lo que saben hacer (carácter, intereses y nivel), no por una etiqueta fija: ver `aptitudDe`.
 * - `levels`: nivel por disciplina; los rivales progresan solos cada día.
 * - Escuchan `competicion.resultado` (evento compartido) de cualquier deporte.
 * - Publican el servicio `npcs` para que otros módulos los consulten.
 */

import { EquipoGuardado, Npc, PoblacionGuardada, clamp, edadDeJuego, edadNpc } from './index';
import { DIAGNOSTICO, apartarODejar, atractivoDe, conDraft, minimoDe } from './draft';
import { ListaDeTrabajo, MercadoDeFichajes, capacidadDe, categoriasDelEquipo, colegioDeNino, edadesDe, equiposDelClub, plantelDe, reclutarA, sinDeporte } from './plantillas';
import { aceptaElPuesto, favoritoDe, ofertasAlCandidato, piernaDe, puestoDeJugador, reglaDePlaza, valorEn, valorEnSuPuesto, valoresPorPuestoDe } from './plaza';

export type Entrada = { entra: false } | { entra: true; desplazado?: Npc };


/**
 * Un niño sin equipo intenta entrar en un club con **la regla de plaza** (`reglaDePlaza`, la misma que el personaje): con hueco, entra; con el equipo lleno, entra si vale más que
 * el peor, que deja el sitio (queda sin equipo y busca otro). Respeta que los equipos de un colegio solo cogen a sus alumnos y las edades del club.
 */
/** Cómo entra un niño en un equipo: sin prueba (lo llama el club), en un puesto que se le pide, solo por hueco, sin mirar el cupo de su grupo, en un equipo nuevo (todos serían titulares) o como última opción. */
export interface OpcionesDeEntrada {
  sinPrueba?: boolean;
  puestoForzado?: string;
  soloHueco?: boolean;
  relajado?: boolean;
  equipoNuevo?: boolean;
  ultimaOpcion?: boolean;
}


export function intentarEntrar(m: MercadoDeFichajes, n: Npc, e: EquipoGuardado, pob: PoblacionGuardada, o: OpcionesDeEntrada = {}): Entrada {
  const { sinPrueba = false, puestoForzado, soloHueco = false, relajado = false, equipoNuevo = false, ultimaOpcion = false } = o;
  if (!n.genetica || n.nacimiento === undefined) return { entra: false };
  const edad = edadNpc(n, m.dia);
  if (edad === undefined || (e.colegio !== undefined && colegioDeNino(n) !== e.colegio)) return { entra: false };
  const plantel = plantelDe(m.lista, pob, e, edad, m.dia, m.reservas);
  if (!plantel) return { entra: false };
  const potencial = potencialEn(n.id, n.genetica, pob);
  const aspirante = { npc: n, colegio: colegioDeNino(n), interes: interesPor(n.rasgos, pob.deporte), potencial, valor: valorEn(n, pob, m) };
  // Con puestos: el club le ofrece el puesto en que entraría (con hueco en él o valiendo más que el peor de ese puesto) y el niño lo acepta o no según su carácter.
  const valores = valoresPorPuestoDe(n, pob, m.val, m.dia);
  if (pob.puestos && valores) {
    // Un club que no es el del colegio le hace una prueba (la misma que al personaje): lo que vale ese día, por su estado y un poco de azar suyo, es lo que cuenta para la plaza.
    const prueba = e.colegio === undefined && !sinPrueba ? pruebaDeUnNino(n, e, valores, m.dia) : undefined;
    // En el «draft», el club pide primero los grupos más escasos: solo se mide ese puesto (y con hueco entra sin enfrentarse a un suplente: no hay once aún).
    const forzado: CondicionesDePrueba | undefined = relajado ? { puesto: puestoDondeMasVale(valores), yaPasada: true, sinCuposPorGrupo: true } : puestoForzado ? { puesto: puestoForzado, yaPasada: true } : undefined;
    // El entrenador ofrece su puesto y, si no cabe, los parecidos de más a menos (un lateral, de central; un extremo, de delantero); cada oferta la acepta o no según su carácter, y se queda con
    // la primera que acepta. En un equipo nuevo todos serían titulares. Los descartes definitivos solo entran por un hueco: quitarle el sitio a otro solo lo cambia de sitio en la bolsa.
    // **El entrenador ofrece siempre el puesto en que mejor ve al jugador** (donde más vale ese día) y, si no lo acepta, los parecidos de más a menos (decisión del usuario, 08/11/2026).
    const valoresDeLaPrueba = prueba?.valores ?? valores;
    const ofertas = ofertasAlCandidato(plantel.jugadores, plantel.max, pob, valoresDeLaPrueba, puestoDondeMasVale(valoresDeLaPrueba), m.val, m.dia, piernaDe(n, pob), forzado ?? prueba?.condiciones);
    const oferta = ofertas.find((x) => !(soloHueco && x.estado === 'por_merito') && aceptaElPuesto(n, pob, e.club, m.val, m.dia, equipoNuevo ? { ...x, titular: true } : x, ultimaOpcion));
    if (!oferta) return { entra: false };
    const desplazado = oferta.peor ? m.lista.get(oferta.peor.id) : undefined;
    if (desplazado) DIAGNOSTICO.alDesplazar?.({ id: desplazado.id, desde: e.club, motivo: 'merito' });
    m.lista.set(n.id, reclutarA(aspirante, e, pob, edad, m.dia, oferta.puesto));
    if (desplazado) m.lista.set(desplazado.id, sinDeporte(desplazado, pob, false));
    return { entra: true, desplazado };
  }
  const plaza = reglaDePlaza(plantel.jugadores.map((j) => ({ id: j.id, nombre: j.name, valor: valorEn(j, pob, m) })), plantel.max, aspirante.valor);
  if (plaza.estado === 'completo') return { entra: false };
  const desplazado = plaza.estado === 'por_merito' ? m.lista.get(plaza.peor!.id) : undefined;
  m.lista.set(n.id, reclutarA(aspirante, e, pob, edad, m.dia));
  if (desplazado) m.lista.set(desplazado.id, sinDeporte(desplazado, pob, false));
  return { entra: true, desplazado };
}


/** La prueba de acceso de un niño a un club: lo que vale en cada puesto ese día (`valorDeLaPrueba`: su estado y un azar estable suyo) y lo que pide el club. */
export function pruebaDeUnNino(n: Npc, e: EquipoGuardado, valores: Readonly<Record<string, number>>, dia: number): { valores: Record<string, number>; condiciones: CondicionesDePrueba } {
  const z = rngEstable('prueba', n.genetica?.semilla ?? 0, n.id, e.club, dia).normal();
  const eficiencia = eficienciaDeEstado(n.estado ?? ESTADO_INICIAL);
  return { valores: Object.fromEntries(Object.entries(valores).map(([p, v]) => [p, valorDeLaPrueba(v, eficiencia, z)])), condiciones: {} };
}


/** Los clubes de un deporte del más grande al más pequeño: el orden en que un niño busca plaza. */
export const clubesPorTamano = (pob: PoblacionGuardada): EquipoGuardado[] => [...pob.equipos].sort((a, b) => b.calidad - a.calidad || (a.club < b.club ? -1 : 1));


/** Cuántas veces busca club un mismo desplazado en una tanda antes de dejar de buscar en ella. */
export const MAX_BUSQUEDAS = 3;


/** Cuenta una búsqueda de club de un desplazado en esta tanda y dice si ya ha agotado sus `MAX_BUSQUEDAS` intentos (la cuarta vez, sí). */
export function agotaLasBusquedas(busquedas: Map<string, number>, id: string): boolean {
  const veces = (busquedas.get(id) ?? 0) + 1;
  busquedas.set(id, veces);
  return veces > MAX_BUSQUEDAS;
}


/** Quien agota las búsquedas queda apartado en su deporte: **cuenta como un plazo sin equipo** (si en el siguiente tampoco lo quiere ningún club, lo deja para siempre: `apartarODejar`). */
export const apartadoPorBusquedas = (n: Npc, deporte: string): Npc => ({ ...n, apartado: [...new Set([...(n.apartado ?? []), deporte])] });


/**
 * Los niños que se quedan sin equipo (desplazados por otro que vale más) buscan club, **dentro del plazo de fichajes y con la misma regla de plaza**:
 * 1. otro club de su deporte, del más grande al más pequeño, con hueco o desplazando a uno peor (que a su vez busca);
 * 2. si no encuentra, deja ese deporte al menos ese curso (`apartado`: puede volver a intentarlo en el siguiente plazo) y busca club en otro deporte que le interese, con la misma regla;
 * 3. si ningún club de ningún deporte lo quiere, deja los deportes que ha intentado **para siempre** (`dejado`): deja de ser deportista y no vuelve a apuntarse.
 * `origen` es el deporte del que se les ha desplazado.
 */
export function colocarDesplazados(m: MercadoDeFichajes, desplazados: readonly { id: string; origen: string; no?: string }[]): void {
  const cola = [...desplazados];
  // Cuántas veces ha tenido que buscar club cada uno en esta tanda: como un desplazado puede desplazar a otro por un puesto distinto, la cadena podría dar vueltas (40.000 intentos por un solo
  // desplazado). Quien llega a `MAX_BUSQUEDAS` deja de buscar y queda apartado (cuenta como un plazo sin equipo).
  const busquedas = new Map<string, number>();
  for (let vueltas = 0; cola.length && vueltas < 20000; vueltas++) {
    const { id, origen, no } = cola.shift()!;
    let n = m.lista.get(id);
    if (!n || n.deporte !== undefined || id.startsWith('personaje@')) continue;
    // Tres búsquedas sin quedarse: sin equipo en este plazo; cuenta como un plazo más (apartado), y si en el siguiente tampoco, lo deja para siempre.
    if (agotaLasBusquedas(busquedas, id)) {
      m.lista.set(id, apartadoPorBusquedas(n, origen));
      continue;
    }
    const deportes = [origen, ...m.pobs.filter((p) => p.deporte !== origen && interesPor(n!.rasgos, p.deporte) > 0).sort((a, b) => interesPor(n!.rasgos, b.deporte) - interesPor(n!.rasgos, a.deporte)).map((p) => p.deporte)];
    const intentados: string[] = [];
    let colocado = false;
    for (const deporte of deportes) {
      const pob = m.pobs.find((p) => p.deporte === deporte);
      if (!pob || n.dejado?.includes(deporte)) continue;
      // Quien deja un deporte (el de origen) no vuelve a él en este plazo después de intentarlo.
      if (deporte !== origen && n.apartado?.includes(deporte)) continue;
      intentados.push(deporte);
      for (const e of clubesPorTamano(pob)) {
        if (e.club === no && deporte === origen) continue; // el equipo que se ha cerrado no los vuelve a coger
        // En los deportes del «draft» solo se entra en un equipo que ya existe (con sus 14): un desplazado no monta un equipo de tres en un club que acaba de cerrar el suyo.
        if (conDraft(pob, m.val) && e.plantillaPorCategoria) {
          const edadN = edadNpc(n, m.dia);
          const plantel = edadN === undefined ? undefined : plantelDe(m.lista, pob, e, edadN, m.dia, m.reservas);
          if (!plantel || plantel.jugadores.length < minimoDe(e)) continue;
        }
        const res = intentarEntrar(m, n, e, pob, { ultimaOpcion: (busquedas.get(id) ?? 0) >= MAX_BUSQUEDAS });
        if (!res.entra) continue;
        colocado = true;
        if (res.desplazado) cola.push({ id: res.desplazado.id, origen: deporte });
        break;
      }
      if (colocado) break;
      if (deporte === origen) {
        n = { ...n, apartado: [...new Set([...(n.apartado ?? []), origen])] };
        m.lista.set(id, n);
      }
    }
    // Dos plazos antes de dejarlo para siempre: sin equipo en este plazo, queda apartado ese curso y lo vuelve a intentar en el siguiente (`apartarODejar`).
    if (!colocado) m.lista.set(id, { ...n, apartado: [...new Set([...(n.apartado ?? []), ...intentados])] });
  }
}


/** Cuánto ceden los padres y la ambición a un fichaje: de 5 % a 95 %. La ambición (eje del carácter, de −50 a 50) y lo que practicaron los padres (de 0 a 3) la suben; es lo que decide el niño. */
export function probabilidadDeFichar(rasgos: RasgosDe | undefined, padres: { padre: Practica; madre: Practica } | undefined): number {
  const ambicion = (rasgos?.caracter.ambicion ?? 0) / 50;
  const deportivos = padres ? (NIVEL_PRACTICA[padres.padre] + NIVEL_PRACTICA[padres.madre]) / 6 : 0;
  return clamp(0.35 + 0.35 * ambicion + 0.25 * deportivos, 0.05, 0.95);
}


/**
 * De cada equipo, qué parte de los jugadores va a probar a otro club cada verano (decisión del usuario, 08/11/2026: en torno al 5–10 % de cada equipo cambia de club por verano) y, en los equipos de un
 * colegio, menos (pesan los amigos). Es la parte que lo intenta; cambian los que superan la prueba y aceptan el puesto.
 */
export const PRUEBAN_FUERA = { club: 0.15, colegio: 0.06 };


/**
 * **Al empezar el curso, el entrenador recoloca primero a sus propios jugadores** (decisión del usuario, 05/11/2026): al subir de categoría los grupos de puestos quedan descompensados (seis delanteros y
 * un central) y el equipo puede pasarse de su máximo. Los que sobran en un grupo (los que menos valen en él) pasan a los puestos que faltan, por lo que valen en cada uno y **si lo aceptan por su
 * carácter** (`aceptaElPuesto`); el personaje, que decide él, no se mueve. **Lo que siga sobrando** (el equipo por encima de su máximo) sale a buscar club como un desplazado; devuelve esos desplazados.
 */
export function recolocarPropios(m: MercadoDeFichajes): { id: string; origen: string }[] {
  const desplazados: { id: string; origen: string }[] = [];
  for (const pob of m.pobs) {
    if (!pob.puestos) continue;
    const p = pob.puestos;
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const u of categoriasDelEquipo(pob, e)) {
        const max = capacidadDe(e, u.id);
        const cupos = cuposPorGrupo(p, max);
        const miembros = (): Npc[] => [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club && u.edades.includes(edadDeJuego(n, m.dia) ?? -1));
        const grupoDe = (n: Npc): string => grupoDePuesto(p, puestoDeJugador(n, pob, m.val, m.dia) ?? '') ?? '';
        const cuenta = (lista: readonly Npc[]): Record<string, number> => {
          const c: Record<string, number> = Object.fromEntries(p.reparto.map((g) => [g.grupo, 0]));
          for (const n of lista) c[grupoDe(n)] = (c[grupoDe(n)] ?? 0) + 1;
          return c;
        };
        let lista = miembros();
        let c = cuenta(lista);
        if (!p.reparto.some((g) => c[g.grupo] > cupos[g.grupo]) || !p.reparto.some((g) => c[g.grupo] < cupos[g.grupo])) {
          // Nada que recolocar entre grupos; aun así, si se pasa de su máximo, sobra gente.
        } else {
          for (const g of p.reparto) {
            const sobran = c[g.grupo] - cupos[g.grupo];
            if (sobran <= 0) continue;
            const candidatos = lista
              .filter((n) => grupoDe(n) === g.grupo)
              .sort((a, b) => valorEnSuPuesto(a, pob, m.val, m.dia, puestoDeJugador(a, pob, m.val, m.dia)!) - valorEnSuPuesto(b, pob, m.val, m.dia, puestoDeJugador(b, pob, m.val, m.dia)!) || (a.id < b.id ? -1 : 1))
              .slice(0, sobran);
            for (const n of candidatos) {
              const valores = valoresPorPuestoDe(n, pob, m.val, m.dia);
              if (!valores) continue;
              const faltan = p.reparto.filter((x) => c[x.grupo] < cupos[x.grupo]);
              if (!faltan.length) break;
              // Al personaje el entrenador le propone el puesto en que mejor lo ve de los que faltan (y decide él: aquí no se mueve).
              // **El entrenador ofrece el puesto en que mejor ve al jugador entre los que faltan y, si no lo acepta, los parecidos de más a menos** (decisión del usuario, 08/11/2026; antes ofrecía uno solo).
              const mejorVisto = puestoDondeMasVale(valores);
              const ofertas = faltan
                .map((x) => puestoDondeMasVale(valores, x.puestos))
                .filter((x) => !!x)
                .sort((x, y) => parecidoDePuestos(p, mejorVisto, y) - parecidoDePuestos(p, mejorVisto, x) || valores[y] - valores[x] || (x < y ? -1 : 1));
              if (!ofertas.length) continue;
              if (n.id.startsWith('personaje@')) {
                (m.propuestas ??= []).push({ deporte: pob.deporte, puesto: ofertas[0] });
                continue;
              }
              for (const puesto of ofertas) {
                const grupoNuevo = grupoDePuesto(p, puesto);
                if (!grupoNuevo) continue;
                const delNuevo = lista.filter((x) => grupoDe(x) === grupoNuevo).map((x) => valorEnSuPuesto(x, pob, m.val, m.dia, puestoDeJugador(x, pob, m.val, m.dia)!)).sort((a, b) => a - b);
                const titular = !delNuevo.length || valores[puesto] >= delNuevo[Math.floor((delNuevo.length - 1) / 2)];
                if (!aceptaElPuesto(n, pob, e.club, m.val, m.dia, { puesto, estado: 'libre', valor: valores[puesto], titular })) continue;
                m.lista.set(n.id, { ...n, puesto: { ...(n.puesto ?? {}), [pob.deporte]: puesto } });
                c[g.grupo]--;
                c[grupoNuevo]++;
                break;
              }
            }
          }
          lista = miembros();
          c = cuenta(lista);
        }
        // Lo que siga sobrando (por encima del máximo): los que menos valen de los grupos pasados de su cupo salen a buscar club.
        let sobra = lista.length - max;
        if (sobra > 0) {
          const salen = lista
            .filter((n) => !n.id.startsWith('personaje@') && c[grupoDe(n)] > cupos[grupoDe(n)])
            .sort((a, b) => valorEnSuPuesto(a, pob, m.val, m.dia, puestoDeJugador(a, pob, m.val, m.dia)!) - valorEnSuPuesto(b, pob, m.val, m.dia, puestoDeJugador(b, pob, m.val, m.dia)!) || (a.id < b.id ? -1 : 1));
          for (const n of salen) {
            if (sobra <= 0) break;
            const g = grupoDe(n);
            if (c[g] <= cupos[g]) continue;
            c[g]--;
            sobra--;
            m.lista.set(n.id, sinDeporte(n, pob, false));
            desplazados.push({ id: n.id, origen: pob.deporte });
            DIAGNOSTICO.alDesplazar?.({ id: n.id, desde: e.club, motivo: 'sobra' });
          }
        }
      }
    }
  }
  return desplazados;
}


/**
 * Los fichajes de verano (dentro del plazo, `CIUDAD_Y_LIGAS.md` §7): **un porcentaje de cada equipo va a probar a otro club** (`PRUEBAN_FUERA`: menos en los colegios) según su ambición, lo que practicaron sus
 * padres y lo bien que juega en su equipo; el ambicioso mira primero al club más grande. **Probar fuera no hace perder la plaza** (decisión del usuario, 08/11/2026): conserva su sitio hasta que lo aceptan allí
 * (la prueba y la regla de plaza) y acepta él el puesto; si no lo cogen, sigue en su equipo, y solo lo pierde si otro mejor se la quita. Hacia abajo, un suplente de un club grande puede probar en uno menor
 * para ser titular. Los desplazados buscan club (`colocarDesplazados`).
 */
export function fichajesDeVerano(m: MercadoDeFichajes, semilla: number, curso: number): void {
  // Primero, cada entrenador recoloca a sus propios jugadores (los que suben de categoría descompensan los grupos); lo que siga sobrando, a buscar club. Solo después quedan huecos para los de fuera.
  const desplazados: { id: string; origen: string }[] = recolocarPropios(m);
  /** Va a probar al club `destino`: conserva su plaza mientras tanto y la recupera si no lo aceptan. */
  const probar = (viejo: Npc, destino: EquipoGuardado, pob: PoblacionGuardada, sentido: 'sube' | 'baja'): boolean => {
    const libre = sinDeporte(viejo, pob, false);
    m.lista.set(libre.id, libre);
    const res = intentarEntrar(m, libre, destino, pob);
    DIAGNOSTICO.alProbar?.({ id: viejo.id, desde: viejo.equipo!, hacia: destino.club, sentido, entra: res.entra });
    if (!res.entra) m.lista.set(viejo.id, viejo); // sin plaza (o no acepta el puesto): se queda donde estaba
    else if (res.desplazado) desplazados.push({ id: res.desplazado.id, origen: pob.deporte });
    return res.entra;
  };
  for (const pob of m.pobs) {
    for (const origen of clubesPorTamano(pob)) {
      const unidades = origen.plantillaPorCategoria ? categoriasDelEquipo(pob, origen) : [{ id: 'club', edades: edadesDe(pob, origen) }];
      const tasa = origen.colegio !== undefined ? PRUEBAN_FUERA.colegio : PRUEBAN_FUERA.club;
      for (const u of unidades) {
        const delEquipo = (m.lista instanceof ListaDeTrabajo ? m.lista.deEquipo(pob.deporte, origen.club) : [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === origen.club))
          .filter((n) => !!n.genetica && !n.id.startsWith('personaje@') && u.edades.includes(edadDeJuego(n, m.dia) ?? -1))
          .sort((a, b) => valorEn(a, pob, m) - valorEn(b, pob, m) || (a.id < b.id ? -1 : 1));
        if (!delEquipo.length) continue;
        const suplentes = conDraft(pob, m.val) && origen.plantillaPorCategoria && origen.colegio === undefined
          ? new Set(equiposDelClub(m.lista, pob, origen, { id: u.id, edades: u.edades }, m.dia, m.val, [], true).suplentes)
          : new Set<string>();
        for (const [puesto, n0] of delEquipo.entries()) {
          // Cada uno decide por su cuenta (sorteo estable suyo): más fácil el ambicioso, el de padres deportistas y el que mejor juega en su equipo (el último de la lista, el que más vale).
          const actual = m.lista.get(n0.id);
          if (!actual || actual.equipo !== origen.club || actual.deporte !== pob.deporte) continue; // otro mejor le quitó la plaza mientras tanto: ya busca club
          const percentil = delEquipo.length > 1 ? puesto / (delEquipo.length - 1) : 0.5;
          const gana = probabilidadDeFichar(actual.rasgos, actual.genetica?.padres) / 0.35;
          const ambicion = ((actual.rasgos?.caracter.ambicion ?? 0) + 50) / 100;
          const alumnoDe = (x: EquipoGuardado): boolean => x.colegio === undefined || colegioDeNino(actual) === x.colegio;
          const mejores = pob.equipos.filter((x) => x.calidad > origen.calidad && alumnoDe(x)).sort((a, b) => atractivoDe(b) - atractivoDe(a) || b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
          if (mejores.length && rngEstable('ficha', semilla, actual.id, origen.club, curso).chance(Math.min(0.6, tasa * gana * (0.5 + percentil)))) {
            // El ambicioso mira primero al más grande; los demás, a uno cualquiera de los mejores. Hasta dos pruebas.
            const orden = ambicion >= 0.5 ? mejores : [...mejores].sort((a, b) => rngEstable('ficha-destino', semilla, actual.id, a.club, curso).next() - rngEstable('ficha-destino', semilla, actual.id, b.club, curso).next());
            for (const destino of orden.slice(0, 2)) if (probar(actual, destino, pob, 'sube')) break;
            continue;
          }
          // Y hacia abajo: un suplente de un club grande, según su ambición, prueba en un club menor para ser titular (el del grande que prueba en el mediano).
          if (suplentes.has(actual.id) && rngEstable('ficha-baja', semilla, actual.id, origen.club, curso).chance(0.03 + 0.12 * ambicion)) {
            const menores = pob.equipos.filter((x) => x.plantillaPorCategoria && x.calidad < origen.calidad && alumnoDe(x)).sort((a, b) => b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
            for (const destino of menores.slice(0, 2)) if (probar(actual, destino, pob, 'baja')) break;
          }
        }
      }
    }
  }
  colocarDesplazados(m, desplazados);
}

// ---------------------------------------------------------------------------------------------------- equipos A, B, C y D de un club

