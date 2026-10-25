import type { Rng } from './rng';
import { TAGS } from './tags';

/**
 * Rasgos de una persona: carácter (ejes de personalidad), intereses, apariencia física, origen familiar y gustos.
 *
 * - **Carácter:** ocho ejes de −50 a +50. Nunca se muestran como número al jugador.
 * - **Intereses:** qué le gusta hacer. Los de un NPC son fijos (de 1 a 3 de intensidad); los del personaje se deducen de lo que hace con su tiempo.
 * - **Apariencia:** rasgos físicos con ids estables para poder dibujar al personaje por capas y para encajar gustos.
 * - **Origen familiar:** de dónde viene su gente (uno o dos orígenes). Da profundidad a personajes y NPCs y sesga la apariencia de la generación 0.
 * - **Gustos:** qué rasgos físicos y de carácter le atraen. Se guardan ya; se usarán para la pareja.
 */

// ---------------------------------------------------------------------------------------------------- carácter

export interface EjeDef {
  id: string;
  /** Extremo negativo y positivo, para los textos. */
  negativo: string;
  positivo: string;
  /** Cuánto pesa que se parezcan dos personas en este eje para llevarse bien. */
  peso: number;
}

export const EJES: readonly EjeDef[] = [
  { id: 'disciplina', negativo: 'rebelde', positivo: 'disciplinado', peso: 0.15 },
  { id: 'honestidad', negativo: 'manipulador', positivo: 'honesto', peso: 0.15 },
  { id: 'ambicion', negativo: 'satisfecho', positivo: 'ambicioso', peso: 0.1 },
  { id: 'sacrificio', negativo: 'relajado', positivo: 'sacrificado', peso: 0.05 },
  { id: 'sociabilidad', negativo: 'solitario', positivo: 'sociable', peso: 0.2 },
  { id: 'agresividad', negativo: 'calmado', positivo: 'agresivo', peso: 0.15 },
  { id: 'prudencia', negativo: 'temerario', positivo: 'prudente', peso: 0.05 },
  { id: 'optimismo', negativo: 'pesimista', positivo: 'optimista', peso: 0.15 },
];

export type Caracter = Record<string, number>;

export const EJE_MIN = -50;
export const EJE_MAX = 50;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Carácter al azar (normal de desviación 18: los extremos son raros) con sesgos por papel. */
export function caracterAlAzar(rng: Rng, sesgo: Readonly<Record<string, number>> = {}): Caracter {
  const c: Caracter = {};
  for (const e of EJES) c[e.id] = Math.round(clamp(rng.normal() * 18 + (sesgo[e.id] ?? 0), EJE_MIN, EJE_MAX));
  return c;
}

/** Carácter heredado: lo que un progenitor elegido por eje transmite, atenuado y con variación propia. */
export function caracterHeredado(padre: Caracter, madre: Caracter, rng: Rng): Caracter {
  const c: Caracter = {};
  for (const e of EJES) {
    const de = rng.chance(0.5) ? padre : madre;
    c[e.id] = Math.round(clamp(0.6 * de[e.id] + rng.normal() * 9, EJE_MIN, EJE_MAX));
  }
  return c;
}

/** Descripción breve del carácter (los ejes más marcados), para las pruebas. */
export function describirCaracter(c: Caracter): string {
  const marcados = EJES.filter((e) => Math.abs(c[e.id]) >= 15).sort((a, b) => Math.abs(c[b.id]) - Math.abs(c[a.id]));
  return marcados.length ? marcados.map((e) => (c[e.id] > 0 ? e.positivo : e.negativo)).join(', ') : 'equilibrado';
}

// ---------------------------------------------------------------------------------------------------- intereses

export interface InteresDef {
  id: string;
  nombre: string;
  /** Las acciones con alguna de estas etiquetas lo alimentan en el personaje. */
  tags: readonly string[];
}

export const INTERESES: readonly InteresDef[] = [
  { id: 'deporte', nombre: 'Deporte', tags: [TAGS.entrenamiento, TAGS.competicion] },
  { id: 'atletismo', nombre: 'Atletismo', tags: ['atletismo'] },
  { id: 'futbol', nombre: 'Fútbol', tags: ['futbol'] },
  { id: 'estudio', nombre: 'Estudio y ciencia', tags: [TAGS.estudio] },
  { id: 'lectura', nombre: 'Lectura', tags: [TAGS.mental] },
  { id: 'musica', nombre: 'Música', tags: ['musica'] },
  { id: 'arte', nombre: 'Arte', tags: ['arte'] },
  { id: 'videojuegos', nombre: 'Videojuegos', tags: [TAGS.ocio] },
  { id: 'naturaleza', nombre: 'Naturaleza', tags: ['naturaleza'] },
  { id: 'tecnologia', nombre: 'Tecnología', tags: ['tecnologia'] },
  { id: 'cine', nombre: 'Cine y series', tags: ['cine'] },
  { id: 'cocina', nombre: 'Cocina', tags: ['cocina'] },
];

/** Intereses de un NPC: de 2 a 4, con intensidad de 1 a 3. */
export type InteresesNpc = Record<string, number>;
/** Intereses del personaje: nivel de 0 a 100, que sube con lo que hace. */
export type InteresesJugador = Record<string, number>;

export function interesesAlAzar(rng: Rng, preferidos: readonly string[] = []): InteresesNpc {
  const n = rng.int(2, 4);
  const r: InteresesNpc = {};
  for (const id of preferidos) if (Object.keys(r).length < n && rng.chance(0.7)) r[id] = rng.int(2, 3);
  while (Object.keys(r).length < n) r[rng.pick(INTERESES).id] ??= rng.int(1, 3);
  return r;
}

/** Intereses iniciales del personaje, heredados de sus padres: algunos de los que tienen, a un nivel bajo. */
export function interesesHeredados(padre: InteresesNpc, madre: InteresesNpc, rng: Rng): InteresesJugador {
  const union = new Set([...Object.keys(padre), ...Object.keys(madre)]);
  const r: InteresesJugador = {};
  for (const id of union) {
    const intensidad = Math.max(padre[id] ?? 0, madre[id] ?? 0);
    if (rng.chance(0.5)) r[id] = 20 + intensidad * 8;
  }
  if (!Object.keys(r).length) r[rng.pick(INTERESES).id] = 25;
  return r;
}

/** Cuánto sube un interés del personaje por hora de una acción que lo alimenta (rendimientos decrecientes hacia 100). */
export const SUBIDA_DE_INTERES_POR_HORA = 0.6;

/** Qué intereses alimenta una acción con estas etiquetas. */
export const interesesDe = (tagsAccion: readonly string[]): string[] => INTERESES.filter((i) => i.tags.some((t) => tagsAccion.includes(t))).map((i) => i.id);

// ---------------------------------------------------------------------------------------------------- apariencia

/** Rasgos físicos. Los catálogos van ordenados cuando hay gradación (oscuro a claro) para poder mezclar los de los padres. */
export const PELO_COLOR = ['negro', 'castano_oscuro', 'castano', 'rubio_oscuro', 'rubio', 'pelirrojo'] as const;
export const PELO_TIPO = ['liso', 'ondulado', 'rizado', 'muy_rizado'] as const;
export const OJOS = ['marron_oscuro', 'marron', 'avellana', 'verde', 'gris', 'azul'] as const;
export const PIEL = ['muy_clara', 'clara', 'media', 'oliva', 'morena', 'oscura'] as const;
export const CARA = ['ovalada', 'redonda', 'cuadrada', 'alargada', 'corazon'] as const;
export const DISTINTIVOS = ['pecas', 'hoyuelos', 'lunares'] as const;

export interface Apariencia {
  peloColor: string;
  peloTipo: string;
  ojos: string;
  piel: string;
  cara: string;
  distintivos: string[];
}

/** Nombres para los textos. */
export const NOMBRE_RASGO: Record<string, string> = {
  negro: 'negro', castano_oscuro: 'castaño oscuro', castano: 'castaño', rubio_oscuro: 'rubio oscuro', rubio: 'rubio', pelirrojo: 'pelirrojo',
  liso: 'liso', ondulado: 'ondulado', rizado: 'rizado', muy_rizado: 'muy rizado',
  marron_oscuro: 'marrones oscuros', marron: 'marrones', avellana: 'color avellana', verde: 'verdes', gris: 'grises', azul: 'azules',
  muy_clara: 'muy clara', clara: 'clara', media: 'media', oliva: 'aceitunada', morena: 'morena', oscura: 'oscura',
  ovalada: 'ovalada', redonda: 'redonda', cuadrada: 'cuadrada', alargada: 'alargada', corazon: 'en forma de corazón',
  pecas: 'pecas', hoyuelos: 'hoyuelos', lunares: 'lunares',
};

export const describirApariencia = (a: Apariencia): string =>
  `pelo ${NOMBRE_RASGO[a.peloColor]} ${NOMBRE_RASGO[a.peloTipo]}, ojos ${NOMBRE_RASGO[a.ojos]}, piel ${NOMBRE_RASGO[a.piel]}, cara ${NOMBRE_RASGO[a.cara]}${a.distintivos.length ? `, con ${a.distintivos.map((d) => NOMBRE_RASGO[d]).join(' y ')}` : ''}`;

// ---------------------------------------------------------------------------------------------------- origen

export interface OrigenDef {
  id: string;
  nombre: string;
  /** Peso de cada origen en el mundo del juego (España por defecto). */
  frecuencia: number;
  /** Probabilidades de cada rasgo (alineadas con su catálogo; se normalizan). */
  peloColor: readonly number[];
  peloTipo: readonly number[];
  ojos: readonly number[];
  piel: readonly number[];
}

/** Orígenes familiares como dato (otro país tendría otra tabla). Las distribuciones son aproximadas y solo sesgan a la generación 0. */
export const ORIGENES: readonly OrigenDef[] = [
  { id: 'espana_norte', nombre: 'España (norte)', frecuencia: 0.15, peloColor: [0.12, 0.3, 0.3, 0.14, 0.08, 0.06], peloTipo: [0.4, 0.4, 0.17, 0.03], ojos: [0.15, 0.3, 0.22, 0.13, 0.05, 0.15], piel: [0.08, 0.5, 0.32, 0.1, 0, 0] },
  { id: 'espana_centro', nombre: 'España (centro)', frecuencia: 0.3, peloColor: [0.28, 0.4, 0.22, 0.07, 0.02, 0.01], peloTipo: [0.38, 0.4, 0.19, 0.03], ojos: [0.3, 0.35, 0.2, 0.08, 0.03, 0.04], piel: [0.04, 0.35, 0.4, 0.18, 0.03, 0] },
  { id: 'espana_sur', nombre: 'España (sur)', frecuencia: 0.3, peloColor: [0.4, 0.38, 0.15, 0.05, 0.01, 0.01], peloTipo: [0.3, 0.42, 0.24, 0.04], ojos: [0.4, 0.35, 0.15, 0.05, 0.02, 0.03], piel: [0.02, 0.2, 0.38, 0.28, 0.12, 0] },
  { id: 'latinoamerica', nombre: 'Latinoamérica', frecuencia: 0.08, peloColor: [0.45, 0.35, 0.12, 0.05, 0.02, 0.01], peloTipo: [0.35, 0.35, 0.24, 0.06], ojos: [0.5, 0.3, 0.12, 0.04, 0.02, 0.02], piel: [0.02, 0.12, 0.3, 0.28, 0.24, 0.04] },
  { id: 'magreb', nombre: 'Magreb', frecuencia: 0.05, peloColor: [0.5, 0.35, 0.1, 0.03, 0.01, 0.01], peloTipo: [0.3, 0.4, 0.24, 0.06], ojos: [0.5, 0.3, 0.12, 0.05, 0.02, 0.01], piel: [0.01, 0.1, 0.3, 0.32, 0.22, 0.05] },
  { id: 'africa_subsahariana', nombre: 'África subsahariana', frecuencia: 0.03, peloColor: [0.9, 0.09, 0.01, 0, 0, 0], peloTipo: [0.02, 0.08, 0.3, 0.6], ojos: [0.85, 0.13, 0.02, 0, 0, 0], piel: [0, 0, 0.02, 0.06, 0.32, 0.6] },
  { id: 'europa_este', nombre: 'Europa del este', frecuencia: 0.04, peloColor: [0.15, 0.3, 0.3, 0.15, 0.08, 0.02], peloTipo: [0.45, 0.38, 0.15, 0.02], ojos: [0.1, 0.25, 0.22, 0.12, 0.1, 0.21], piel: [0.1, 0.5, 0.32, 0.08, 0, 0] },
  { id: 'europa_norte', nombre: 'Europa del norte', frecuencia: 0.02, peloColor: [0.05, 0.18, 0.3, 0.22, 0.22, 0.03], peloTipo: [0.5, 0.35, 0.13, 0.02], ojos: [0.04, 0.12, 0.15, 0.12, 0.12, 0.45], piel: [0.15, 0.6, 0.22, 0.03, 0, 0] },
  { id: 'asia_oriental', nombre: 'Asia oriental', frecuencia: 0.03, peloColor: [0.85, 0.12, 0.03, 0, 0, 0], peloTipo: [0.75, 0.2, 0.04, 0.01], ojos: [0.8, 0.18, 0.02, 0, 0, 0], piel: [0.05, 0.3, 0.4, 0.2, 0.05, 0] },
];

export const origen = (id: string): OrigenDef | undefined => ORIGENES.find((o) => o.id === id);

/** De dónde viene la gente de una persona: uno o dos orígenes con su peso (suman 1). */
export type OrigenFamiliar = { id: string; peso: number }[];

export const describirOrigen = (o: OrigenFamiliar): string => o.map((x) => origen(x.id)?.nombre ?? x.id).join(' y ');

function ponderado(pesos: readonly number[], rng: Rng): number {
  const total = pesos.reduce((a, b) => a + b, 0);
  let u = rng.next() * total;
  for (let i = 0; i < pesos.length; i++) {
    u -= pesos[i];
    if (u < 0) return i;
  }
  return pesos.length - 1;
}

/** Origen de un adulto del mundo: casi siempre uno solo y a veces mezcla de dos. */
export function origenAlAzar(rng: Rng): OrigenFamiliar {
  const uno = () => ORIGENES[ponderado(ORIGENES.map((o) => o.frecuencia), rng)].id;
  const a = uno();
  if (!rng.chance(0.1)) return [{ id: a, peso: 1 }];
  const b = uno();
  return a === b ? [{ id: a, peso: 1 }] : [{ id: a, peso: 0.5 }, { id: b, peso: 0.5 }];
}

/** Origen del hijo: la mezcla a partes iguales de los de sus padres. */
export function origenHeredado(padre: OrigenFamiliar, madre: OrigenFamiliar): OrigenFamiliar {
  const m = new Map<string, number>();
  for (const x of padre) m.set(x.id, (m.get(x.id) ?? 0) + x.peso / 2);
  for (const x of madre) m.set(x.id, (m.get(x.id) ?? 0) + x.peso / 2);
  return [...m].map(([id, peso]) => ({ id, peso }));
}

/** Apariencia de un adulto según su origen (si tiene dos, cada rasgo sale de uno de ellos al azar). */
export function aparienciaAlAzar(rng: Rng, o: OrigenFamiliar): Apariencia {
  const de = () => origen(o[ponderado(o.map((x) => x.peso), rng)].id) ?? ORIGENES[1];
  return {
    peloColor: PELO_COLOR[ponderado(de().peloColor, rng)],
    peloTipo: PELO_TIPO[ponderado(de().peloTipo, rng)],
    ojos: OJOS[ponderado(de().ojos, rng)],
    piel: PIEL[ponderado(de().piel, rng)],
    cara: rng.pick(CARA),
    distintivos: DISTINTIVOS.filter(() => rng.chance(0.12)),
  };
}

/** Un rasgo con gradación heredado de uno de los padres; si difieren, a veces sale uno intermedio y rara vez un vecino. */
function heredarGradual(catalogo: readonly string[], a: string, b: string, rng: Rng, mezcla = 0.35): string {
  const ia = catalogo.indexOf(a);
  const ib = catalogo.indexOf(b);
  let i = rng.chance(0.5) ? ia : ib;
  if (ia !== ib && rng.chance(mezcla)) i = Math.round((ia + ib) / 2 + (rng.chance(0.5) ? 0.01 : -0.01));
  if (rng.chance(0.03)) i += rng.chance(0.5) ? 1 : -1;
  return catalogo[clamp(i, 0, catalogo.length - 1)];
}

/** Apariencia del hijo: cada rasgo viene de un padre (con intermedios en lo que tiene gradación). El pelo rojo es recesivo. */
export function aparienciaHeredada(padre: Apariencia, madre: Apariencia, rng: Rng): Apariencia {
  let peloColor: string;
  if (padre.peloColor === 'pelirrojo' || madre.peloColor === 'pelirrojo') {
    const los2 = padre.peloColor === madre.peloColor;
    const otro = padre.peloColor === 'pelirrojo' ? madre.peloColor : padre.peloColor;
    peloColor = los2 || rng.chance(0.2) ? 'pelirrojo' : otro;
  } else {
    // El pelo rojo recesivo puede reaparecer aunque ninguno lo tenga: 1 de cada 60.
    peloColor = rng.chance(1 / 60) ? 'pelirrojo' : heredarGradual(PELO_COLOR.slice(0, 5), padre.peloColor, madre.peloColor, rng);
  }
  const distintivos = DISTINTIVOS.filter((d) => {
    const n = (padre.distintivos.includes(d) ? 1 : 0) + (madre.distintivos.includes(d) ? 1 : 0);
    return rng.chance(n === 2 ? 0.75 : n === 1 ? 0.5 : 0.02);
  });
  return {
    peloColor,
    peloTipo: heredarGradual(PELO_TIPO, padre.peloTipo, madre.peloTipo, rng),
    ojos: heredarGradual(OJOS, padre.ojos, madre.ojos, rng, 0.2),
    piel: heredarGradual(PIEL, padre.piel, madre.piel, rng, 0.6),
    cara: rng.chance(0.5) ? padre.cara : madre.cara,
    distintivos,
  };
}

// ---------------------------------------------------------------------------------------------------- gustos

/** Lo que le atrae a una persona: rasgos físicos preferidos y carácter preferido (valor del eje que le gusta). */
export interface Gustos {
  fisicos: { peloColor: string[]; ojos: string[]; piel: string[]; cara: string[] };
  caracter: Caracter;
}

/** Gustos al azar: cada rasgo prefiere uno o dos valores (a veces el suyo propio) y tiene un par de ejes de carácter preferidos. */
export function gustosAlAzar(rng: Rng, propia: Apariencia): Gustos {
  const prefiere = (catalogo: readonly string[], suyo: string) => {
    const r = new Set<string>();
    r.add(rng.chance(0.4) ? suyo : rng.pick(catalogo));
    if (rng.chance(0.4)) r.add(rng.pick(catalogo));
    return [...r];
  };
  const caracter: Caracter = {};
  for (const e of EJES) if (rng.chance(0.3)) caracter[e.id] = Math.round(clamp(rng.normal() * 20, EJE_MIN, EJE_MAX));
  return {
    fisicos: {
      peloColor: prefiere(PELO_COLOR, propia.peloColor),
      ojos: prefiere(OJOS, propia.ojos),
      piel: prefiere(PIEL, propia.piel),
      cara: prefiere(CARA, propia.cara),
    },
    caracter,
  };
}

/** Atracción de 0 a 1 de quien tiene estos gustos hacia otra persona (se usará para la pareja). */
export function atraccion(g: Gustos, a: Apariencia, c: Caracter): number {
  const fis = ((g.fisicos.peloColor.includes(a.peloColor) ? 1 : 0) + (g.fisicos.ojos.includes(a.ojos) ? 1 : 0) + (g.fisicos.piel.includes(a.piel) ? 1 : 0) + (g.fisicos.cara.includes(a.cara) ? 1 : 0)) / 4;
  const ejes = Object.entries(g.caracter);
  const car = ejes.length ? ejes.reduce((s, [id, v]) => s + (1 - Math.abs((c[id] ?? 0) - v) / 100), 0) / ejes.length : 0.5;
  return 0.5 * fis + 0.5 * car;
}

// ---------------------------------------------------------------------------------------------------- una persona

export interface RasgosDe {
  origen: OrigenFamiliar;
  apariencia: Apariencia;
  caracter: Caracter;
  intereses: InteresesNpc;
  gustos: Gustos;
}

/** Rasgos de una persona del mundo (un NPC o un padre de la generación 0). */
export function rasgosAlAzar(rng: Rng, opciones: { sesgoCaracter?: Readonly<Record<string, number>>; interesesPreferidos?: readonly string[] } = {}): RasgosDe {
  const o = origenAlAzar(rng);
  const apariencia = aparienciaAlAzar(rng, o);
  return {
    origen: o,
    apariencia,
    caracter: caracterAlAzar(rng, opciones.sesgoCaracter),
    intereses: interesesAlAzar(rng, opciones.interesesPreferidos),
    gustos: gustosAlAzar(rng, apariencia),
  };
}

/** Rasgos del personaje: heredados de sus padres (la opción de elegirlos a mano llegará con la creación de personaje). */
export interface PerfilDelPersonaje {
  origen: OrigenFamiliar;
  apariencia: Apariencia;
  caracter: Caracter;
  intereses: InteresesJugador;
  gustos: Gustos;
}

export function perfilHeredado(padre: RasgosDe, madre: RasgosDe, rng: Rng): PerfilDelPersonaje {
  const apariencia = aparienciaHeredada(padre.apariencia, madre.apariencia, rng);
  return {
    origen: origenHeredado(padre.origen, madre.origen),
    apariencia,
    caracter: caracterHeredado(padre.caracter, madre.caracter, rng),
    intereses: interesesHeredados(padre.intereses, madre.intereses, rng),
    gustos: gustosAlAzar(rng, apariencia),
  };
}

// ---------------------------------------------------------------------------------------------------- compatibilidad

/**
 * Compatibilidad de 0 a 1 entre una persona y el personaje: intereses en común (60 %) y parecido de carácter (40 %).
 * Los intereses en común son qué parte de lo que le gusta a la otra persona le interesa al personaje.
 */
export function compatibilidad(npc: { caracter: Caracter; intereses: InteresesNpc }, jugador: { caracter: Caracter; intereses: InteresesJugador }): number {
  const ids = Object.keys(npc.intereses);
  const total = ids.reduce((s, id) => s + npc.intereses[id] / 3, 0);
  const comun = total ? ids.reduce((s, id) => s + (npc.intereses[id] / 3) * Math.min(1, (jugador.intereses[id] ?? 0) / 60), 0) / total : 0;
  const parecido = EJES.reduce((s, e) => s + e.peso * (1 - Math.abs((npc.caracter[e.id] ?? 0) - (jugador.caracter[e.id] ?? 0)) / 100), 0) / EJES.reduce((s, e) => s + e.peso, 0);
  return 0.6 * comun + 0.4 * parecido;
}

/** Multiplicador sobre lo que sube la afinidad: de ×0,7 (nada en común) a ×1,4 (muy compatibles). */
/** Una compatibilidad de 0,25 da ×0,7, 0,5 da ×1,05 y 0,75 o más da ×1,4 (lo típico, ~0,4, queda cerca de ×0,9). */
export const factorDeCompatibilidad = (compat: number): number => 0.7 + 0.7 * clamp((compat - 0.25) / 0.5, 0, 1);

/**
 * Lo que se ve de alguien a quien no conoces (sin nombre): una frase corta con su aspecto, concordada con su género y edad.
 * «Una chica de pelo castaño ondulado, ojos verdes y piel clara.»
 */
export function descripcionDeDesconocido(a: Apariencia, gender: 'f' | 'm', edad?: number): string {
  const persona = edad !== undefined && edad < 12 ? (gender === 'f' ? 'Una niña' : 'Un niño') : gender === 'f' ? 'Una chica' : 'Un chico';
  const rasgos = [`de pelo ${NOMBRE_RASGO[a.peloColor]} ${NOMBRE_RASGO[a.peloTipo]}`, `ojos ${NOMBRE_RASGO[a.ojos]}`, `piel ${NOMBRE_RASGO[a.piel]}`];
  const distintivos = a.distintivos.length ? `, con ${a.distintivos.map((d) => NOMBRE_RASGO[d]).join(' y ')}` : '';
  return `${persona} ${rasgos.slice(0, -1).join(', ')} y ${rasgos[rasgos.length - 1]}${distintivos}`;
}
