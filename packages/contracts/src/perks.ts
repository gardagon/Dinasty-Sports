import { GEN, TAGS } from './tags';
import type { Rng } from './rng';
import { barajar } from './herencia';

/**
 * Perks: rasgos genéticos especiales (físicos, morfológicos, sensoriales) que dan bonus o malus y se heredan.
 *
 * - Se tienen desde el nacimiento: no se ganan ni se pierden. Unos son **latentes** (no se expresan hasta que un evento los revela;
 *   en la fase de pruebas se enseñan todos, pero su efecto cuenta aunque no se hayan revelado) y otros son visibles desde el principio.
 * - Como mucho 3 activos. Lo normal es tener 0 o 1; que alguien tenga 3 es raro. Lo que no se activa pasa al **pool** del personaje,
 *   que sus hijos pueden heredar aunque él nunca lo expresara (un perk puede saltarse una generación).
 * - La herencia junta los perks de los dos padres (activos y de su pool) en una sola lista, sin importar de cuál vienen, y tira cada
 *   perk por separado con su probabilidad. Todos entran, valgan o no para el deporte favorito.
 * - Un perk y su opuesto no pueden convivir.
 */

export interface EfectoEficiencia {
  /** El efecto se aplica a las acciones que tengan alguna de estas etiquetas. */
  tags: readonly string[];
  /** Multiplicador de la eficiencia. */
  factor: number;
}

export interface PerkDef {
  id: string;
  nombre: string;
  /** Perk opuesto (no pueden convivir). */
  opuesto?: string;
  area: 'morfologico' | 'fisico' | 'sensorial' | 'sensoriomotor' | 'cognitivo' | 'especial';
  descripcion: string;
  /** Multiplica la probabilidad de que aparezca (1 = normal; los excepcionales, menos). */
  rareza: number;
  /** Latente: se tiene pero no se expresa hasta que un evento lo revela. Los demás se ven desde el principio. */
  latente: boolean;
  efectos: {
    /** Puntos que suma o resta al tope genético de una capacidad: `tope = min(100, tope + bonus)`. */
    tope?: Readonly<Record<string, number>>;
    /** Centímetros sobre la altura adulta heredada. */
    alturaCm?: number;
    /** Multiplicadores de eficiencia en acciones con ciertas etiquetas. */
    eficiencia?: readonly EfectoEficiencia[];
  };
}

/** Etiquetas de contexto de perks que ningún deporte tiene todavía: sus efectos esperan a los deportes que las usen. */
export const TAGS_DE_PERKS = { agarre: 'agarre', altaDensidad: 'alta_densidad', recuperacion: 'recuperacion' } as const;

const p = (d: PerkDef): PerkDef => d;

/** Los 28 perks: 13 pares de opuestos, Ambidiestro y Mano de palo (que son opuestos entre sí). */
export const PERKS: readonly PerkDef[] = [
  p({ id: 'zancada_larga', nombre: 'Zancada larga', opuesto: 'paticorto', area: 'morfologico', rareza: 1, latente: false, descripcion: 'Más velocidad en carrera.', efectos: { tope: { [GEN.velocidad]: 8 } } }),
  p({ id: 'paticorto', nombre: 'Paticorto', opuesto: 'zancada_larga', area: 'morfologico', rareza: 1, latente: false, descripcion: 'Menos velocidad en carrera.', efectos: { tope: { [GEN.velocidad]: -8 } } }),
  p({ id: 'manos_grandes', nombre: 'Manos grandes', opuesto: 'manos_pequenas', area: 'morfologico', rareza: 1, latente: false, descripcion: 'Agarre y control fino (porteros).', efectos: { eficiencia: [{ tags: [TAGS_DE_PERKS.agarre], factor: 1.1 }] } }),
  p({ id: 'manos_pequenas', nombre: 'Manos pequeñas', opuesto: 'manos_grandes', area: 'morfologico', rareza: 1, latente: false, descripcion: 'Peor agarre y control fino.', efectos: { eficiencia: [{ tags: [TAGS_DE_PERKS.agarre], factor: 0.9 }] } }),
  p({ id: 'vision_periferica', nombre: 'Visión periférica excepcional', opuesto: 'miope', area: 'sensorial', rareza: 1, latente: true, descripcion: 'Percibe lo que otros no ven cuando hay mucha gente.', efectos: { eficiencia: [{ tags: [TAGS_DE_PERKS.altaDensidad], factor: 1.1 }] } }),
  p({ id: 'miope', nombre: 'Miope', opuesto: 'vision_periferica', area: 'sensorial', rareza: 1, latente: true, descripcion: 'Ve peor cuando hay mucha gente (se compensa en parte con gafas).', efectos: { eficiencia: [{ tags: [TAGS_DE_PERKS.altaDensidad], factor: 0.9 }] } }),
  p({ id: 'constitucion_de_toro', nombre: 'Constitución de toro', opuesto: 'endeble', area: 'morfologico', rareza: 1, latente: false, descripcion: 'Más constitución y resistencia al impacto; algo más lento por el peso.', efectos: { tope: { [GEN.constitucion]: 8, [GEN.velocidad]: -3 } } }),
  p({ id: 'endeble', nombre: 'Endeble', opuesto: 'constitucion_de_toro', area: 'morfologico', rareza: 1, latente: false, descripcion: 'Menos constitución; más predispuesto a lesiones y recuperación más lenta.', efectos: { tope: { [GEN.constitucion]: -8 } } }),
  p({ id: 'fibroso', nombre: 'Fibroso', opuesto: 'flacucho', area: 'fisico', rareza: 1, latente: false, descripcion: 'Velocidad explosiva y agilidad; cae antes en esfuerzos prolongados.', efectos: { tope: { [GEN.velocidad]: 6, [GEN.agilidad]: 6, [GEN.resistencia]: -4 } } }),
  p({ id: 'flacucho', nombre: 'Flacucho', opuesto: 'fibroso', area: 'fisico', rareza: 1, latente: false, descripcion: 'Menos fuerza y capacidad de duelo físico.', efectos: { tope: { [GEN.fuerza]: -8 } } }),
  p({ id: 'pulmones_grandes', nombre: 'Pulmones grandes', opuesto: 'asmatico', area: 'fisico', rareza: 1, latente: true, descripcion: 'Más resistencia; se nota tras semanas de entrenamiento de fondo.', efectos: { tope: { [GEN.resistencia]: 8 } } }),
  p({ id: 'asmatico', nombre: 'Asmático', opuesto: 'pulmones_grandes', area: 'fisico', rareza: 1, latente: true, descripcion: 'Menos resistencia; se descubre en el primer entrenamiento intenso.', efectos: { tope: { [GEN.resistencia]: -8 } } }),
  p({ id: 'recuperacion_rapida', nombre: 'Recuperación rápida', opuesto: 'recuperacion_lenta', area: 'fisico', rareza: 1, latente: true, descripcion: 'Se recupera antes del esfuerzo y de las lesiones menores (cuando haya lesiones).', efectos: { eficiencia: [{ tags: [TAGS_DE_PERKS.recuperacion], factor: 1.15 }] } }),
  p({ id: 'recuperacion_lenta', nombre: 'Recuperación lenta', opuesto: 'recuperacion_rapida', area: 'fisico', rareza: 1, latente: true, descripcion: 'Las lesiones duran más y la fatiga tarda más en irse (cuando haya lesiones).', efectos: { eficiencia: [{ tags: [TAGS_DE_PERKS.recuperacion], factor: 0.85 }] } }),
  p({ id: 'reflejos_felinos', nombre: 'Reflejos felinos', opuesto: 'torpe', area: 'sensoriomotor', rareza: 1, latente: true, descripcion: 'Más coordinación en situaciones reactivas.', efectos: { tope: { [GEN.coordinacion]: 6 } } }),
  p({ id: 'torpe', nombre: 'Torpe', opuesto: 'reflejos_felinos', area: 'sensoriomotor', rareza: 1, latente: true, descripcion: 'Lentitud de reacción ante estímulos inesperados.', efectos: { tope: { [GEN.coordinacion]: -6 } } }),
  p({ id: 'equilibrio_natural', nombre: 'Equilibrio natural', opuesto: 'desequilibrado', area: 'sensoriomotor', rareza: 1, latente: true, descripcion: 'Más agilidad; cae menos y se recoloca antes tras un impacto.', efectos: { tope: { [GEN.agilidad]: 8 } } }),
  p({ id: 'desequilibrado', nombre: 'Desequilibrado', opuesto: 'equilibrio_natural', area: 'sensoriomotor', rareza: 1, latente: true, descripcion: 'Menos agilidad; cae con más facilidad.', efectos: { tope: { [GEN.agilidad]: -8 } } }),
  p({ id: 'memoria_motora_fotografica', nombre: 'Memoria motora fotográfica', opuesto: 'memoria_motora_corta', area: 'cognitivo', rareza: 1, latente: true, descripcion: 'Aprende movimientos complejos tras verlos pocas veces.', efectos: { eficiencia: [{ tags: [TAGS.entrenamiento], factor: 1.1 }] } }),
  p({ id: 'memoria_motora_corta', nombre: 'Memoria corta motora', opuesto: 'memoria_motora_fotografica', area: 'cognitivo', rareza: 1, latente: true, descripcion: 'Aprende más despacio y olvida si no practica.', efectos: { eficiencia: [{ tags: [TAGS.entrenamiento], factor: 0.9 }] } }),
  p({ id: 'sangre_fria', nombre: 'Sangre fría', opuesto: 'nervioso', area: 'cognitivo', rareza: 1, latente: true, descripcion: 'Rinde mejor en los momentos de más tensión (finales, últimos minutos).', efectos: { eficiencia: [{ tags: [TAGS.competicion], factor: 1.08 }] } }),
  p({ id: 'nervioso', nombre: 'Nervioso', opuesto: 'sangre_fria', area: 'cognitivo', rareza: 1, latente: true, descripcion: 'Se bloquea justo en los momentos que más importan.', efectos: { eficiencia: [{ tags: [TAGS.competicion], factor: 0.92 }] } }),
  p({ id: 'suertudo', nombre: 'Suertudo', opuesto: 'gafe', area: 'especial', rareza: 1, latente: true, descripcion: 'A veces una acción fallida tiene una segunda oportunidad (necesita eventos).', efectos: {} }),
  p({ id: 'gafe', nombre: 'Gafe', opuesto: 'suertudo', area: 'especial', rareza: 1, latente: true, descripcion: 'A veces algo sale mal aunque la acción saliera bien (necesita eventos).', efectos: {} }),
  p({ id: 'gigante', nombre: 'Gigante', opuesto: 'enano', area: 'morfologico', rareza: 1, latente: true, descripcion: 'Más altura adulta; se revela entre los 10 y los 16 años.', efectos: { alturaCm: 10 } }),
  p({ id: 'enano', nombre: 'Enano', opuesto: 'gigante', area: 'morfologico', rareza: 1, latente: true, descripcion: 'Menos altura adulta y centro de gravedad bajo; se revela entre los 10 y los 16 años.', efectos: { alturaCm: -10, tope: { [GEN.agilidad]: 4 } } }),
  p({ id: 'ambidiestro', nombre: 'Ambidiestro', opuesto: 'mano_de_palo', area: 'fisico', rareza: 0.3, latente: false, descripcion: 'Usa ambas manos y pies con eficacia similar (útil en deportes de equipo).', efectos: {} }),
  p({ id: 'mano_de_palo', nombre: 'Mano de palo', opuesto: 'ambidiestro', area: 'fisico', rareza: 0.5, latente: false, descripcion: 'Dominancia lateral tan marcada que el lado no dominante es casi inútil (afecta a deportes de equipo).', efectos: {} }),
];

export const perk = (id: string): PerkDef | undefined => PERKS.find((x) => x.id === id);

/** Lo que un personaje tiene: los activos (los que le afectan) y el pool (los que lleva y puede dar a sus hijos). */
export interface PerksDe {
  activos: string[];
  pool: string[];
}

/** Máximo de perks activos. Lo normal es tener 0 o 1: tener tres es excepcional. */
export const MAX_PERKS_ACTIVOS = 3;

/** Probabilidades (se ajustarán con pruebas). */
export const PROB_PERK = {
  /** Un progenitor lo tiene activo. */
  heredaActivo: 0.4,
  /** Un progenitor lo lleva solo en su pool (salto de generación). */
  heredaPool: 0.2,
  /** Aparece sin que ningún padre lo tenga. */
  espontaneoHijo: 0.01,
  /** Lo que lleva cada progenitor del jugador (generación 0): activo y en el pool. */
  espontaneoPadre: 0.02,
  poolPadre: 0.015,
} as const;

/** Quita opuestos (queda el que ya tenía la ventaja: el primero de la lista) y respeta el máximo; lo que sobra va al pool. */
function repartir(candidatos: string[], rng: Rng): PerksDe {
  const activos: string[] = [];
  const pool: string[] = [];
  for (const id of barajar(candidatos, rng)) {
    const op = perk(id)?.opuesto;
    if ((op && activos.includes(op)) || activos.length >= MAX_PERKS_ACTIVOS) pool.push(id);
    else activos.push(id);
  }
  return { activos, pool };
}

/** Perks de un progenitor del jugador (generación 0), sorteados sin ascendencia. */
export function perksDePadre(rng: Rng): PerksDe {
  const salen = PERKS.filter((x) => rng.chance(PROB_PERK.espontaneoPadre * x.rareza)).map((x) => x.id);
  const { activos, pool } = repartir(salen, rng);
  const enPool = PERKS.filter((x) => !activos.includes(x.id) && !pool.includes(x.id) && !activos.includes(x.opuesto ?? '') && rng.chance(PROB_PERK.poolPadre * x.rareza)).map((x) => x.id);
  return { activos, pool: [...pool, ...enPool] };
}

/**
 * Perks del hijo: se juntan los de los dos padres (activos y pool) y cada uno se tira por separado. Lo que los padres tienen y
 * el hijo no activa pasa a su pool, para sus propios hijos.
 */
export function heredarPerks(padre: PerksDe, madre: PerksDe, rng: Rng): PerksDe {
  const enActivo = (id: string) => [padre, madre].filter((x) => x.activos.includes(id)).length;
  const enPool = (id: string) => [padre, madre].filter((x) => !x.activos.includes(id) && x.pool.includes(id)).length;
  const salen: string[] = [];
  for (const x of PERKS) {
    const noLoLlevaNadie = enActivo(x.id) + enPool(x.id) === 0;
    let noSale = 1;
    for (let i = 0; i < enActivo(x.id); i++) noSale *= 1 - PROB_PERK.heredaActivo;
    for (let i = 0; i < enPool(x.id); i++) noSale *= 1 - PROB_PERK.heredaPool;
    if (noLoLlevaNadie) noSale = 1 - PROB_PERK.espontaneoHijo * x.rareza;
    if (rng.chance(1 - noSale)) salen.push(x.id);
  }
  const { activos, pool } = repartir(salen, rng);
  const delPadres = new Set([...padre.activos, ...padre.pool, ...madre.activos, ...madre.pool]);
  const resto = [...delPadres].filter((id) => !activos.includes(id) && !pool.includes(id));
  return { activos, pool: [...pool, ...resto] };
}

/** Suma de los efectos de un conjunto de perks sobre los topes de las capacidades y la altura. */
export function efectosDe(ids: readonly string[]): { tope: Record<string, number>; alturaCm: number } {
  const tope: Record<string, number> = {};
  let alturaCm = 0;
  for (const id of ids) {
    const e = perk(id)?.efectos;
    if (!e) continue;
    for (const [stat, d] of Object.entries(e.tope ?? {})) tope[stat] = (tope[stat] ?? 0) + d;
    alturaCm += e.alturaCm ?? 0;
  }
  return { tope, alturaCm };
}

/** Multiplicador de eficiencia de un conjunto de perks sobre una acción con estas etiquetas. */
export function eficienciaDePerks(ids: readonly string[], tagsAccion: readonly string[]): { factor: number; quienes: string[] } {
  let factor = 1;
  const quienes: string[] = [];
  for (const id of ids) {
    for (const e of perk(id)?.efectos.eficiencia ?? []) {
      if (e.tags.some((t) => tagsAccion.includes(t))) {
        factor *= e.factor;
        quienes.push(perk(id)!.nombre);
      }
    }
  }
  return { factor, quienes };
}
