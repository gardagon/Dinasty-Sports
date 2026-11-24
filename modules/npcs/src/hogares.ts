import {
  CALLES_CON_VECINOS, anioNatural, apodoAlAzar, demografiaDelLugar, estaturaZ, identidadAlAzar, identidadDeHijo, metabolismoZ, musculaturaZ, nombreCompleto, nombrePermitido, origenesDePareja, parejasDelLugar,
  INTERESES, interesesAlAzar, primerDiaDelAnio, rasgosAlAzar, rasgosHeredadosNpc, registrarNombre, rngEstable, type FamiliaView, type Gender, type OrigenFamiliar, type PaisDef, type RasgosDe, type RegistroDeNombres, type Rng,
} from '@ds/contracts';
import { aficionadoPorLosPadres, geneticaDeHijo, geneticaDeNino, herenciaDeProgenitor, type Herencia } from './deportistas';
import type { Npc } from './index';

/**
 * Hogares (`docs/relevo/hogares.md`, addendum A1): las familias se generan **hacia delante**. Una pareja con sus rasgos, capacidades y perks propios; hijos con la herencia del personaje
 * (`rasgosHeredadosNpc`, `geneticaDeHijo`, `identidadDeHijo`) hasta cubrir lo que piden los colegios (cuántos niños de cada edad en cada colegio) y los hermanos menores de 8 años como personas.
 */

/** Un hogar: quién vive en él se saca de `Npc.hogar` (el mismo texto). Se guarda en `NpcsState.hogares`. */
export interface HogarGuardado {
  tipo: 'pareja' | 'monoparental';
  /** Una de las calles del mapa donde viven vecinos (`CALLES_CON_VECINOS`); sin ella, vive en otro barrio (fuera del mapa). */
  calle?: string;
  portal?: number;
  /** En un hogar monoparental, el progenitor que no vive en él (no es una persona del mundo: aporta a la herencia de sus hijos) y por qué no está. */
  ausente?: { lado: 'padre' | 'madre'; motivo: 'separado' | 'fallecido' | 'desconocido'; nombre?: string };
}

/** Cifras de las familias (provisionales, calibradas con `tools/hogares-prototipo.ts`). */
export const FAMILIAS = {
  /** Probabilidad de tener un hermano más pequeño después del 1.º, 2.º, 3.º y 4.º hijo (24/11: `[0,70; 0,40; 0,30; 0,20]`, que da un 51 % de niños de 8 años con un hermano mayor en el mundo, frente al ~49–51 % estimado en la vida real; antes `[0,55; 0,30; 0,20; 0,15]`: 42 %). */
  siguiente: [0.7, 0.4, 0.3, 0.2],
  /** Años de diferencia con el hijo siguiente (peso). */
  separacion: [[1, 0.22], [2, 0.3], [3, 0.22], [4, 0.14], [5, 0.08], [6, 0.04]] as readonly (readonly [number, number])[],
  mellizos: 0.04,
  /** Hogares con un solo progenitor y, de ellos, con la madre. */
  monoparental: 0.2,
  conLaMadre: 0.8,
  /** Motivos de que falte el otro progenitor. */
  motivos: [['separado', 0.7], ['fallecido', 0.2], ['desconocido', 0.1]] as readonly (readonly ['separado' | 'fallecido' | 'desconocido', number])[],
  /** Un hijo va al colegio de su hermano mayor si queda hueco a su edad. */
  mismoColegio: 0.75,
  /** Edad de la madre al nacer su hijo mayor del mundo (media, desviación, mínimo y máximo) y cuánto mayor es el padre. */
  edadMadre: { media: 31, sd: 4.5, min: 19, max: 42 },
  edadPadre: { diferencia: 2.5, sd: 3, mas: -3 },
  /** Dónde viven: este porcentaje de hogares, en las calles del mapa (el resto, en otro barrio); reparto entre `CALLES_CON_VECINOS`. */
  enElMapa: 0.12,
  portales: 40,
  /** Hasta qué edad (menos) recoge un progenitor a su hijo a la salida: con menos de 10, siempre; con 10 y 11, cada vez menos. */
  recogeSiempreHasta: 10,
  recogeHasta: [[10, 0.5], [11, 0.25]] as readonly (readonly [number, number])[],
} as const;

/**
 * Variantes para **medir** (`tools/analisis-profesionales.ts` con `DS_HOGARES_INTERESES` / `DS_HOGARES_GENETICA`; `docs/relevo/hogares.md`, ronda 4): cómo heredan los hijos los intereses de sus padres y de dónde sale su genética. Los valores por defecto
 * son lo que hace el juego; las demás se usan solo en las herramientas.
 * - `intereses`: `maximo` (el de `rasgosHeredadosNpc`: cada interés de los padres pasa con un 60 % con la intensidad más alta de los dos), `media` (la media de los dos, redondeada), `uno` (la de un padre al azar) o
 *   `ninguno` (intereses sorteados sueltos, como los niños de siempre).
 * - `cuerpo`: `heredado` (estatura y cuerpo como los hermanos del personaje) o `hash` (como los niños de siempre: de su id). `caracter`: `heredado` o `azar` (sorteado suelto). `hijos`: `familia` `suelto` (el niño se sortea como siempre, sin heredar nada: solo conserva el hogar y los padres) o `ignorar` (se generan las familias pero los colegios se llenan con niños de siempre: solo para ver si basta con consumir el azar).
 * - `mundo`: `completo` (adultos y hermanos pequeños en la partida), `sin-pequenos` (sin los hermanos de menos de 8 años) o `solo-ninos` (ni adultos ni pequeños: solo los hijos que cubren los colegios).
 * - `renovar`: `familias` (los que entran cada curso salen de familias) o `viejo` (como siempre: niños nuevos sueltos).
 * - `genetica`: `hijo` (de los padres de la familia, la misma para los hermanos) o `nino` (como los niños de siempre: unos padres sorteados y descartados por cada hijo).
 */
export const VARIANTES: { intereses: 'maximo' | 'media' | 'uno' | 'ninguno'; genetica: 'hijo' | 'nino'; cuerpo: 'heredado' | 'hash'; caracter: 'heredado' | 'azar'; hijos: 'familia' | 'suelto' | 'ignorar'; mundo: 'completo' | 'sin-pequenos' | 'solo-ninos'; renovar: 'familias' | 'viejo' } = { intereses: 'maximo', genetica: 'hijo', cuerpo: 'heredado', caracter: 'heredado', hijos: 'familia', mundo: 'completo', renovar: 'familias' };

function interesesDeVariante(padre: Readonly<Record<string, number>>, madre: Readonly<Record<string, number>>, rng: Rng): Record<string, number> {
  if (VARIANTES.intereses === 'ninguno') return interesesAlAzar(rng);
  const r: Record<string, number> = {};
  for (const id of new Set([...Object.keys(padre), ...Object.keys(madre)])) {
    if (!rng.chance(0.6)) continue;
    const p = padre[id] ?? 0, m = madre[id] ?? 0;
    const valor = VARIANTES.intereses === 'media' ? Math.round((p + m) / 2) : (rng.chance(0.5) ? p : m) || Math.max(p, m);
    r[id] = Math.min(3, Math.max(1, valor - (rng.chance(0.3) ? 1 : 0)));
  }
  while (Object.keys(r).length < 2) r[rng.pick(INTERESES).id] ??= rng.int(1, 3);
  return r;
}

export const ETIQUETA_DE_PROGENITOR_DE_HOGAR = 'adulto_de_hogar';
export const EDAD_ALUMNO_MIN_DE_FAMILIAS = 8;

export interface DatosDeFamilias {
  rng: Rng;
  seed: number;
  pais: PaisDef;
  usados: RegistroDeNombres;
  /** Cuántos niños hacen falta en cada colegio y edad (`propio|8`, `colegio3|12`, `ninguno|18`…). Se agota al generar. */
  demanda: Map<string, number>;
  /** Día del mundo al que corresponden las edades (0 al crear la partida). */
  dia: number;
  /** Número de la primera familia nueva y del primer niño pequeño nuevo. */
  desde: number;
  desdePeques: number;
  /** También los hermanos de menos de 8 años, como personas. */
  pequenos: boolean;
}

export interface FamiliasNuevas {
  hogares: Record<string, HogarGuardado>;
  adultos: Npc[];
  /** Los hijos que cubren la demanda, por colegio y edad (`colegio|edad`), con su `colegio` ya puesto. Su id, rol y agenda los da quien los coloca. */
  ninos: Map<string, Npc[]>;
  pequenos: Npc[];
  siguiente: number;
  siguientePeque: number;
}

const DESCRIPCION_ADULTO = (g: Gender): string => (g === 'f' ? 'Vecina del barrio.' : 'Vecino del barrio.');
const DESCRIPCION_PEQUENO = (g: Gender): string => (g === 'f' ? 'Niña del barrio.' : 'Niño del barrio.');

interface Progenitor {
  id: string;
  gender: Gender;
  edad: number;
  rasgos: RasgosDe;
  identidad: ReturnType<typeof identidadAlAzar>;
  nombre: string;
  nacimiento: number;
  herencia: Herencia;
}

export function generarFamilias(d: DatosDeFamilias): FamiliasNuevas {
  const { rng, pais, usados, demanda, dia } = d;
  const demografia = demografiaDelLugar(pais);
  const parejas = parejasDelLugar(pais);
  const restante = new Map(demanda);
  const resultado: FamiliasNuevas = { hogares: {}, adultos: [], ninos: new Map(), pequenos: [], siguiente: d.desde, siguientePeque: d.desdePeques };
  const normal = (): number => rng.normal();
  const pesado = <T>(xs: readonly (readonly [T, number])[]): T => {
    let u = rng.next();
    for (const [v, p] of xs) { if (u < p) return v; u -= p; }
    return xs[0][0];
  };
  const quedaDe = (edad: number): number => { let s = 0; for (const [k, v] of restante) if (v > 0 && k.endsWith(`|${edad}`)) s += v; return s; };
  const elegirColegio = (edad: number, preferido?: string): string | undefined => {
    if (preferido && (restante.get(`${preferido}|${edad}`) ?? 0) > 0 && rng.chance(FAMILIAS.mismoColegio)) return preferido;
    const opciones = [...restante].filter(([k, v]) => v > 0 && k.endsWith(`|${edad}`));
    if (!opciones.length) return undefined;
    let u = rng.next() * opciones.reduce((s, [, v]) => s + v, 0);
    for (const [k, v] of opciones) { if (u < v) return k.slice(0, k.lastIndexOf('|')); u -= v; }
    return opciones[0][0].slice(0, opciones[0][0].lastIndexOf('|'));
  };
  const nacimientoDe = (edad: number): number => primerDiaDelAnio(anioNatural(dia) - edad) + rng.int(0, 364);
  const nombreUnico = (g: Gender, edad: number, nacimiento: number, hacer: () => ReturnType<typeof identidadAlAzar>): { identidad: ReturnType<typeof identidadAlAzar>; completo: string } => {
    let identidad = hacer();
    for (let i = 0; i < 60 && !nombrePermitido(usados, nombreCompleto(identidad, g), nacimiento); i++) identidad = hacer();
    const completo = nombreCompleto(identidad, g);
    registrarNombre(usados, completo, nacimiento);
    return { identidad, completo };
  };
  const progenitor = (id: string, gender: Gender, edad: number, origen?: OrigenFamiliar): Progenitor => {
    const rasgos = rasgosAlAzar(rng, { sexo: gender, demografia, ...(origen ? { origen } : {}) });
    const nacimiento = nacimientoDe(edad);
    const { identidad, completo } = nombreUnico(gender, edad, nacimiento, () => identidadAlAzar(rng, gender, rasgos.origen, { edad, pais }));
    return { id, gender, edad, rasgos, identidad, nombre: completo, nacimiento, herencia: herenciaDeProgenitor(rng) };
  };

  const edades = [...new Set([...demanda.keys()].map((k) => Number(k.slice(k.lastIndexOf('|') + 1))))].sort((a, b) => b - a);
  for (const a of edades) {
    while (quedaDe(a) > 0) {
      const numero = resultado.siguiente++;
      const hogarId = `h${numero}`;
      // La pareja. La madre tiene la edad al nacer el mayor (del mundo) más la de este; el padre, algo más.
      const e = FAMILIAS.edadMadre;
      const edadMadre = Math.round(Math.min(e.max, Math.max(e.min, e.media + normal() * e.sd))) + a;
      const edadPadre = Math.max(edadMadre + FAMILIAS.edadPadre.mas, Math.round(edadMadre + FAMILIAS.edadPadre.diferencia + normal() * FAMILIAS.edadPadre.sd));
      const [oPadre, oMadre] = parejas ? origenesDePareja(rng, demografia, pais.origenesLocales, parejas) : [undefined, undefined];
      const padre = progenitor(`${hogarId}_padre`, 'm', edadPadre, oPadre);
      const madre = progenitor(`${hogarId}_madre`, 'f', edadMadre, oMadre);
      const mono = rng.chance(FAMILIAS.monoparental);
      const lado: 'padre' | 'madre' = mono ? (rng.chance(FAMILIAS.conLaMadre) ? 'madre' : 'padre') : 'madre';
      const residentes = mono ? [lado === 'madre' ? madre : padre] : [padre, madre];
      const ausente = mono ? (lado === 'madre' ? padre : madre) : undefined;
      const hogar: HogarGuardado = { tipo: mono ? 'monoparental' : 'pareja' };
      if (ausente) hogar.ausente = { lado: lado === 'madre' ? 'padre' : 'madre', motivo: pesado(FAMILIAS.motivos), nombre: ausente.nombre };
      if (rng.chance(FAMILIAS.enElMapa)) { hogar.calle = CALLES_CON_VECINOS[rng.int(0, CALLES_CON_VECINOS.length - 1)]; hogar.portal = rng.int(1, FAMILIAS.portales); }
      const calle = hogar.calle;
      for (const p of residentes) {
        const { identidad } = p;
        const apodo = apodoAlAzar(p.nombre, identidad.pila);
        resultado.adultos.push({
          id: p.id, name: p.nombre, nombrePila: identidad.pila, ...(apodo ? { apodo } : {}), role: 'vecino', gender: p.gender, tags: [ETIQUETA_DE_PROGENITOR_DE_HOGAR], levels: {}, potential: {}, rasgos: p.rasgos, nacimiento: p.nacimiento,
          known: false, tipos: [{ tipo: 'vecino', adulto: true, ...(calle ? { vive: calle } : {}) }], hogar: hogarId, herencia: p.herencia, description: DESCRIPCION_ADULTO(p.gender),
        });
      }
      const idsDePadres = residentes.map((p) => p.id);
      resultado.hogares[hogarId] = hogar;
      // Los hijos: el mayor del mundo con la edad `a` y los siguientes con años de diferencia; los de menos de 8 son personas pequeñas.
      let edad = a;
      let colegioDelMayor: string | undefined;
      let k = 0;
      for (let n = 0; ; n++) {
        if (n > 0) {
          if (!rng.chance(FAMILIAS.siguiente[Math.min(n - 1, FAMILIAS.siguiente.length - 1)])) break;
          edad -= rng.chance(FAMILIAS.mellizos) ? 0 : pesado(FAMILIAS.separacion);
          if (edad < 0) break;
        }
        const pequeno = edad < EDAD_ALUMNO_MIN_DE_FAMILIAS;
        let colegio: string | undefined;
        if (!pequeno) {
          colegio = elegirColegio(edad, colegioDelMayor);
          if (!colegio) continue; // esa edad ya está completa: este hijo no cabe en el mundo
          colegioDelMayor ??= colegio;
          restante.set(`${colegio}|${edad}`, restante.get(`${colegio}|${edad}`)! - 1);
        } else if (!d.pequenos) continue;
        const id = pequeno ? `peque_${resultado.siguientePeque++}` : `${hogarId}_hijo${++k}`;
        const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
        const suelto = VARIANTES.hijos === 'suelto';
        const heredado = suelto ? rasgosAlAzar(rng, { sexo: gender, demografia, ...(parejas ? { hijoDePareja: { parejas, locales: pais.origenesLocales } } : {}) }) : rasgosHeredadosNpc(padre.rasgos, madre.rasgos, rng, gender);
        const fresco = !suelto && VARIANTES.caracter === 'azar' ? rasgosAlAzar(rng, { sexo: gender, demografia }).caracter : undefined;
        const base0 = fresco ? { ...heredado, caracter: fresco } : heredado;
        const base = suelto || VARIANTES.intereses === 'maximo' ? base0 : { ...base0, intereses: interesesDeVariante(padre.rasgos.intereses, madre.rasgos.intereses, rng) };
        const nacimiento = nacimientoDe(edad);
        const { identidad, completo } = nombreUnico(gender, edad, nacimiento, () => identidadDeHijo(rng, gender, padre.identidad, madre.identidad, base.origen, { edad, pais }));
        const genetica = !suelto && VARIANTES.genetica === 'hijo' ? geneticaDeHijo(rng, padre.herencia, madre.herencia, rngEstable('perks', d.seed, id)) : geneticaDeNino(rng, id);
        const rasgos = aficionadoPorLosPadres(base, genetica.padres, rng);
        const apodo = apodoAlAzar(completo, identidad.pila);
        // La estatura y el cuerpo se heredan como los de los hermanos del personaje: la media de los padres, algo atenuada, más una variación propia.
        const zp = (f: (id: string) => number): number => 0.45 * (f(padre.id) + f(madre.id)) + 0.6 * f(id);
        const hijo: Npc = {
          id, name: completo, nombrePila: identidad.pila, ...(apodo ? { apodo } : {}), role: 'vecino', gender, tags: [], levels: {}, potential: {}, rasgos, nacimiento, known: false,
          tipos: [{ tipo: 'vecino', ...(pequeno ? { pequeno: true } : {}) }], genetica, perks: genetica.perks, desfase: genetica.desfase, ...(suelto || VARIANTES.cuerpo === 'hash' ? {} : { estatura: zp(estaturaZ), metabolismo: zp(metabolismoZ), musculatura: zp(musculaturaZ) }),
          hogar: hogarId, padres: idsDePadres, description: DESCRIPCION_PEQUENO(gender), ...(colegio ? { colegio } : {}),
        };
        if (pequeno) resultado.pequenos.push(hijo);
        else { const clave = `${colegio}|${edad}`; resultado.ninos.set(clave, [...(resultado.ninos.get(clave) ?? []), hijo]); }
      }
    }
  }
  return resultado;
}

/** Los que sobran de lo generado (hijos que no se han colocado): se cuentan para vigilar que la demanda queda cubierta. */
export const sinColocar = (r: FamiliasNuevas): number => [...r.ninos.values()].reduce((s, v) => s + v.length, 0);

/** Cuenta con `take` los hijos de un colegio y una edad (lo que pide cada hueco de la población). */
export class ReservaDeHijos {
  constructor(private readonly por: Map<string, Npc[]>) {}
  take(colegio: string, edad: number): Npc | undefined {
    return this.por.get(`${colegio}|${edad}`)?.shift();
  }
  get restantes(): number { return [...this.por.values()].reduce((s, v) => s + v.length, 0); }
}

// ---------------------------------------------------------------------------------------------------- quién vive con quién

const MIEMBROS = new WeakMap<readonly Npc[], Map<string, Npc[]>>();
/** Los miembros de cada hogar (con una caché por lista de personas: una lista nueva rehace el índice). */
export function miembrosDeHogares(npcs: readonly Npc[]): Map<string, Npc[]> {
  let m = MIEMBROS.get(npcs);
  if (!m) {
    m = new Map();
    for (const n of npcs) if (n.hogar) { const l = m.get(n.hogar); if (l) l.push(n); else m.set(n.hogar, [n]); }
    MIEMBROS.set(npcs, m);
  }
  return m;
}

export const esProgenitorDeHogar = (n: Npc): boolean => !!n.hogar && n.tags.includes(ETIQUETA_DE_PROGENITOR_DE_HOGAR);

/** La familia de una persona: sus progenitores, sus hijos y sus hermanos (por id) y el progenitor que falta. */
export function familiaDePersona(npcs: readonly Npc[], hogares: Readonly<Record<string, HogarGuardado>> | undefined, id: string): FamiliaView | undefined {
  const n = npcs.find((x) => x.id === id);
  if (!n?.hogar) return undefined;
  const miembros = miembrosDeHogares(npcs).get(n.hogar) ?? [];
  const h = hogares?.[n.hogar];
  const adultos = miembros.filter(esProgenitorDeHogar).map((x) => x.id);
  const hijos = miembros.filter((x) => !esProgenitorDeHogar(x)).map((x) => x.id);
  const esAdulto = esProgenitorDeHogar(n);
  return {
    hogar: n.hogar,
    progenitores: esAdulto ? [] : adultos,
    hijos: esAdulto ? hijos : [],
    hermanos: esAdulto ? [] : hijos.filter((x) => x !== id),
    ...(h?.ausente ? { ausente: h.ausente } : {}),
    ...(h?.calle ? { calle: h.calle, ...(h.portal ? { portal: h.portal } : {}) } : {}),
  };
}

/**
 * Los hogares sin ningún hijo en el mundo (los que tenían han salido a los 20): si el personaje conoce a alguno de ellos se archivan (se quedan guardados, sin agenda: ya no están en el mundo que se juega); si no,
 * se borran (`VISION.md`, principio 4). Devuelve la misma lista si no hay ninguno.
 */
export function limpiarFamilias(npcs: Npc[], hogares: Record<string, HogarGuardado>): { npcs: Npc[]; hogares: Record<string, HogarGuardado>; archivados: number; borrados: number } {
  const porHogar = miembrosDeHogares(npcs);
  const quitar = new Set<string>();
  const archivar = new Set<string>();
  const hogaresQuitados = new Set<string>();
  for (const [id, miembros] of porHogar) {
    if (miembros.some((x) => !esProgenitorDeHogar(x))) continue; // aún tiene hijos
    if (miembros.every((x) => x.tags.includes('archivado'))) continue;
    const conocido = miembros.some((x) => x.known === true);
    if (conocido) for (const x of miembros) archivar.add(x.id);
    else { for (const x of miembros) quitar.add(x.id); hogaresQuitados.add(id); }
  }
  // Los hogares de los que ya no queda nadie (los hijos se van de la lista al salir del mundo) también se quitan de la tabla.
  for (const id of Object.keys(hogares)) if (!porHogar.has(id)) hogaresQuitados.add(id);
  if (!quitar.size && !archivar.size && !hogaresQuitados.size) return { npcs, hogares, archivados: 0, borrados: 0 };
  const nuevos = npcs.filter((n) => !quitar.has(n.id)).map((n) => (archivar.has(n.id) ? { ...n, tags: [...n.tags, 'archivado'], tipos: [] } : n));
  const tabla = Object.fromEntries(Object.entries(hogares).filter(([id]) => !hogaresQuitados.has(id)));
  return { npcs: nuevos, hogares: tabla, archivados: archivar.size, borrados: quitar.size };
}

/**
 * ¿Recoge hoy este progenitor a un hijo a la salida del colegio? Si el hogar tiene a un hijo en el colegio de menos de 10 años, uno de los progenitores (el que sale del sorteo de su hogar y la semilla) recoge;
 * con 10 y 11 años, con una probabilidad que baja. Sin sorteo de la partida: estable por hogar y semilla.
 */
export function recogeAUnHijo(n: Npc, miembros: readonly Npc[], edadDe: (x: Npc) => number, azar: (marca: string, id: string) => number): boolean {
  if (!esProgenitorDeHogar(n) || !n.hogar) return false;
  const hijos = miembros.filter((x) => !esProgenitorDeHogar(x) && !!x.colegio && x.colegio !== 'ninguno');
  const enElColegio = hijos.length ? Math.min(...hijos.map(edadDe)) : 99;
  if (enElColegio >= 18) return false;
  let quiere = enElColegio < FAMILIAS.recogeSiempreHasta;
  if (!quiere) for (const [edad, p] of FAMILIAS.recogeHasta) if (enElColegio === edad) quiere = azar('recoge_menor', n.hogar) < p;
  // En un hogar de dos adultos recoge solo uno.
  const adultos = miembros.filter(esProgenitorDeHogar);
  const quien = adultos.length > 1 ? adultos[Math.floor(azar('recoge_quien', n.hogar) * adultos.length)] : adultos[0];
  return quiere && quien?.id === n.id;
}
