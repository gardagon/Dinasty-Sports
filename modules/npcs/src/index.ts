import {
  CORE_EVENTS,
  GEN,
  MINUTES_PER_DAY,
  SERVICES,
  madurezPorEdad,
  timeView,
  SHARED_EVENTS,
  TAGS,
  defineModule,
  inHours,
  isSchoolHours,
  type ActionDef,
  type CompetitionResultData,
  type Rng,
  type Gender,
  type InitContext,
  type NpcDirectory,
  type NpcRole,
  type NpcView,
  type ReadContext,
} from '@ds/contracts';

/**
 * MÓDULO NPCs (id `npcs`).
 *
 * Los NPCs dan profundidad al personaje y son la red que une módulos:
 * - `supports`: etiquetas de acción en las que ayudan si la relación es buena
 *   (un entrenador apoya `atletismo`; un compañero aplicado, `estudio`). Funciona
 *   con cualquier módulo futuro que use esas etiquetas, sin tocar este código.
 * - `levels`: nivel por disciplina; los rivales progresan solos cada día.
 * - Escuchan `competicion.resultado` (evento compartido) de cualquier deporte.
 * - Publican el servicio `npcs` para que otros módulos los consulten.
 */

export interface Npc {
  id: string;
  name: string;
  role: NpcRole;
  gender: Gender;
  tags: string[];
  supports: string[];
  affinity: number;
  levels: Record<string, number>;
  /** Nivel máximo al que puede llegar cada disciplina. */
  potential: Record<string, number>;
  /** Ritmo de progreso por disciplina (1 = medio): lo constante y bien entrenado que es. Ausente = 1. */
  ritmo?: Record<string, number>;
  /** Día de nacimiento respecto al inicio de la partida (negativo si nació antes). Solo los que tienen edad. */
  nacimiento?: number;
  /** Años de adelanto (+) o retraso (−) en su desarrollo físico. */
  desfase?: number;
  /** ¿El personaje ya lo conoce? Los rivales se conocen al competir contra ellos. Ausente = sí. */
  known?: boolean;
  /** Club al que pertenece (los rivales). */
  club?: string;
  description?: string;
  /** Último día de interacción con el personaje. */
  lastDay: number;
}

export interface NpcsState {
  npcs: Npc[];
}

const NOMBRES: Record<Gender, string[]> = {
  f: ['Lucía', 'Martina', 'Sofía', 'Valeria', 'Paula', 'Carla', 'Noa', 'Irene', 'Alba', 'Julia', 'Claudia', 'Elena', 'Ana', 'Marta', 'Laura', 'Nuria', 'Candela', 'Aitana', 'Lola', 'Abril'],
  m: ['Hugo', 'Mateo', 'Leo', 'Daniel', 'Álvaro', 'Pablo', 'Marcos', 'Adrián', 'Diego', 'Iván', 'Sergio', 'Carlos', 'Javier', 'Nacho', 'Rubén', 'Bruno', 'Gonzalo', 'Víctor', 'Óscar', 'Enzo'],
};
const APELLIDOS = [
  'García', 'Martín', 'López', 'Sánchez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano',
  'Molina', 'Ortega', 'Delgado', 'Castro', 'Iglesias', 'Medina', 'Cortés', 'Rubio', 'Marín', 'Suárez', 'Peña', 'Herrera',
];

/**
 * Población de rivales de atletismo: 8 por edad entre los 8 y los 19 años (16 por categoría de dos edades),
 * suficientes para clasificatorias, lesiones y rotaciones. Cada curso los mayores se van y entran niños nuevos.
 */
/** Clubes de los rivales (ficticios: los del personaje están en el módulo de clubes). */
const CLUBES_RIVALES = [
  'Atletismo San Isidro', 'Colegio Santa María', 'Club Atletismo Ciudad', 'Club de Alto Rendimiento', 'Atletismo Ribera',
  'Colegio La Salle', 'Atletismo Costa', 'Colegio Nuestra Señora', 'Atletismo Sierra', 'Club Pista Norte',
];
const EDAD_RIVAL_MIN = 8;
const EDAD_RIVAL_MAX = 19;
const RIVALES_POR_EDAD = 8;
/** De esta edad en adelante dejan de aparecer (pasan a categorías que el juego no modela aún). */
const EDAD_RETIRO = EDAD_RIVAL_MAX + 1;
/** Hasta esta edad algún niño puede dejar el deporte cada curso (y entra otro nuevo). */
const EDAD_MAX_BAJA = 13;
const PROBABILIDAD_BAJA = 0.1;
const UMBRAL_APOYO = 40;
const DIAS_SIN_CONTACTO = 7;

const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

function nombreUnico(rng: Rng, g: Gender, usados: Set<string>): string {
  let n = '';
  do n = `${rng.pick(NOMBRES[g])} ${rng.pick(APELLIDOS)}`;
  while (usados.has(n));
  usados.add(n);
  return n;
}

/**
 * Parte de su potencial que un rival ha desarrollado a una edad. Es más plana que el desarrollo físico del
 * jugador (`madurezPorEdad`): los rivales ya llevan años entrenando, así que a los 8 años ya rinden más que
 * alguien que acaba de llegar, pero a ninguna edad igualan su potencial adulto.
 */
const desarrolloRival = (edad: number): number => 0.3 + 0.7 * madurezPorEdad(edad);

/** Edad en años cumplidos de un NPC con fecha de nacimiento. */
export const edadNpc = (n: Npc, day: number): number | undefined =>
  n.nacimiento === undefined ? undefined : Math.floor((day - n.nacimiento) / 365);

/**
 * Un rival de una edad dada. "Herencia": unos tienen más potencial y otros salen con ventaja o con otro ritmo de
 * desarrollo, pero a ninguna edad se alcanza el potencial: el techo es potencial × madurez de esa edad.
 */
function nuevoRival(rng: Rng, num: number, edad: number, day: number, usados: Set<string>): Npc {
  const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
  const potencial = clamp(79 + rng.normal() * 9, 55, 99);
  const desfase = clamp(rng.normal() * 0.7, -1.2, 1.2);
  const techo = potencial * desarrolloRival(edad + desfase);
  return {
    id: `rival_${num}`,
    name: nombreUnico(rng, gender, usados),
    role: 'rival',
    gender,
    tags: ['atleta'],
    supports: [],
    affinity: rng.int(15, 30),
    levels: { atletismo: techo * rng.range(0.8, 1) },
    potential: { atletismo: potencial },
    ritmo: { atletismo: clamp(1 + rng.normal() * 0.22, 0.55, 1.5) },
    nacimiento: Math.round(day - (edad + rng.range(0, 1)) * 365),
    desfase,
    known: false,
    club: rng.pick(CLUBES_RIVALES),
    description: 'Compite en atletismo.',
    lastDay: -1,
  };
}

function rivalesIniciales(rng: Rng, usados: Set<string>): Npc[] {
  const lista: Npc[] = [];
  let num = 1;
  for (let edad = EDAD_RIVAL_MIN; edad <= EDAD_RIVAL_MAX; edad++) {
    for (let i = 0; i < RIVALES_POR_EDAD; i++) lista.push(nuevoRival(rng, num++, edad, 0, usados));
  }
  return lista;
}

/** Nuevo curso: los mayores se van, algún niño deja el deporte y entran niños nuevos hasta completar cada edad. */
function renovarRivales(npcs: Npc[], day: number, rng: Rng): Npc[] {
  const usados = new Set(npcs.map((n) => n.name));
  let num = npcs.reduce((m, n) => Math.max(m, Number(/^rival_(\d+)$/.exec(n.id)?.[1] ?? 0)), 0) + 1;
  const quedan = npcs.filter((n) => {
    if (n.role !== 'rival') return true;
    const edad = edadNpc(n, day) ?? 0;
    if (edad >= EDAD_RETIRO) return false;
    return !(edad <= EDAD_MAX_BAJA && rng.chance(PROBABILIDAD_BAJA));
  });
  const nuevos: Npc[] = [];
  for (let edad = EDAD_RIVAL_MIN; edad <= EDAD_RIVAL_MAX; edad++) {
    const hay = quedan.filter((n) => n.role === 'rival' && edadNpc(n, day) === edad).length;
    for (let i = hay; i < RIVALES_POR_EDAD; i++) nuevos.push(nuevoRival(rng, num++, edad, day, usados));
  }
  return [...quedan, ...nuevos];
}

function generarReparto(ctx: InitContext): Npc[] {
  const { rng } = ctx;
  const usados = new Set<string>();
  const nombre = (g: Gender) => nombreUnico(rng, g, usados);
  /** `extra` puede ser una función del género para concordar la descripción. */
  const npc = (id: string, role: NpcRole, extra: (g: Gender) => Partial<Npc>): Npc => {
    const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
    return {
    id,
    name: nombre(gender),
    role,
    gender,
    tags: [],
    supports: [],
    affinity: rng.int(20, 35),
    levels: {},
    potential: {},
    lastDay: -1,
    ...extra(gender),
    };
  };
  const o = (g: Gender, f: string, m: string) => (g === 'f' ? f : m);

  return [
    npc('entrenador', 'entrenador', () => ({
      tags: ['atletismo', 'mentor'],
      supports: ['atletismo'],
      description: 'Entrena al grupo de atletismo del colegio.',
    })),
    npc('tutor', 'profesor', (g) => ({
      tags: ['estudio', 'mentor'],
      supports: [TAGS.estudio],
      description: `${o(g, 'Tu tutora', 'Tu tutor')}. Exigente pero ${o(g, 'justa', 'justo')}.`,
    })),
    npc('companero_estudio', 'companero', (g) => ({
      tags: ['estudio'],
      supports: [TAGS.estudio],
      description: `${o(g, 'Compañera de clase aplicada', 'Compañero de clase aplicado')}. Estudiar con ${o(g, 'ella', 'él')} cunde más.`,
    })),
    npc('companero_social', 'companero', () => ({
      tags: ['social'],
      supports: [TAGS.social, TAGS.ocio],
      description: 'Conoce a todo el mundo en el colegio.',
    })),
    ...rivalesIniciales(rng, usados),
  ];
}

const vista = (n: Npc, day: number): NpcView => ({
  id: n.id,
  name: n.name,
  role: n.role,
  gender: n.gender,
  tags: n.tags,
  supports: n.supports,
  affinity: n.affinity,
  levels: n.levels,
  age: edadNpc(n, day),
  known: n.known,
  club: n.club,
  description: n.description,
});

function interaccion(
  n: Npc,
  cfg: {
    suffix: string;
    name: string;
    duration: number;
    tags: string[];
    ganancia: number;
    /** Genéricas que entrena la interacción. */
    train: { stat: string; amount: number }[];
    horario: (ctx: ReadContext) => true | string;
  },
): ActionDef {
  return {
    id: `npcs.${cfg.suffix}.${n.id}`,
    name: cfg.name,
    tags: cfg.tags,
    group: 'Relaciones',
    duration: cfg.duration,
    available: (ctx) => {
      const actual = ctx.state<NpcsState>().npcs.find((x) => x.id === n.id);
      if (actual && actual.lastDay === ctx.time.day) return `Ya has estado con ${n.name.split(' ')[0]} hoy`;
      return cfg.horario(ctx);
    },
    delta: cfg.tags.includes(TAGS.ocio) ? { [GEN.energia]: -6, [GEN.estres]: -6 } : { [GEN.energia]: -3 },
    train: cfg.train,
    run: (ctx) => {
      ctx.updateState<NpcsState>((s) => ({
        npcs: s.npcs.map((x) =>
          x.id === n.id ? { ...x, affinity: clamp(x.affinity + cfg.ganancia * ctx.efficiency), lastDay: ctx.time.day } : x,
        ),
      }));
    },
  };
}

const fueraDeClase = (desde: number, hasta: number) => (ctx: ReadContext) =>
  !isSchoolHours(ctx.time) && inHours(ctx.time, desde, hasta) ? true : `Disponible de ${desde} a ${hasta}, fuera de clase`;

export const npcs = defineModule<NpcsState>({
  id: 'npcs',
  name: 'Relaciones',
  description: 'Personas que rodean al personaje.',
  dependsOn: ['gen'],

  initState: (ctx) => ({ npcs: generarReparto(ctx) }),

  dynamicActions: (ctx) => {
    const lista: ActionDef[] = [];
    for (const n of ctx.state<NpcsState>().npcs) {
      const nombre = n.name.split(' ')[0];
      if (n.role === 'companero' || n.role === 'amigo') {
        lista.push(
          interaccion(n, {
            suffix: 'quedar',
            name: `Quedar con ${nombre}`,
            duration: 120,
            tags: [TAGS.social, TAGS.ocio],
            ganancia: 5,
            train: [
              { stat: GEN.carisma, amount: 0.8 },
              { stat: GEN.empatia, amount: 0.4 },
              { stat: GEN.cooperacion, amount: 0.3 },
            ],
            horario: fueraDeClase(10, 22),
          }),
        );
      } else if (n.role === 'entrenador') {
        lista.push(
          interaccion(n, {
            suffix: 'hablar',
            name: `Hablar con ${nombre} (${n.gender === 'f' ? 'entrenadora' : 'entrenador'})`,
            duration: 30,
            tags: [TAGS.social],
            ganancia: 4,
            train: [
              { stat: GEN.comunicacion, amount: 0.6 },
              { stat: GEN.carisma, amount: 0.3 },
            ],
            horario: (c) => (!c.time.isSchoolDay ? fueraDeClase(9, 14)(c) : fueraDeClase(15, 21)(c)),
          }),
        );
      } else if (n.role === 'profesor') {
        lista.push(
          interaccion(n, {
            suffix: 'tutoria',
            name: `Tutoría con ${nombre}`,
            duration: 30,
            tags: [TAGS.social, TAGS.estudio],
            ganancia: 4,
            train: [
              { stat: GEN.comunicacion, amount: 0.6 },
              { stat: GEN.carisma, amount: 0.3 },
            ],
            horario: (c) => (c.time.isSchoolDay && inHours(c.time, 14, 17) ? true : 'Tutorías los días de clase, de 14 a 17'),
          }),
        );
      }
    }
    return lista;
  },

  modifiers: [
    {
      id: 'npcs.apoyo',
      tags: ['*'],
      apply: (ctx, action) => {
        let bonus = 0;
        const quienes: string[] = [];
        for (const n of ctx.state<NpcsState>().npcs) {
          if (n.affinity < UMBRAL_APOYO) continue;
          if (!n.supports.some((t) => action.tags.includes(t))) continue;
          bonus += Math.min(0.15, (n.affinity - UMBRAL_APOYO) / 400);
          quienes.push(n.name.split(' ')[0]);
        }
        if (bonus < 0.01) return null;
        return { efficiency: 1 + Math.min(0.3, bonus), reason: `Apoyo de ${quienes.join(', ')}` };
      },
    },
  ],

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as { day: number };
      ctx.updateState<NpcsState>((s) => ({
        npcs: s.npcs.map((n) => {
          let { affinity } = n;
          if (day - n.lastDay > DIAS_SIN_CONTACTO && affinity > 10) affinity = Math.max(10, affinity - 0.4);
          const levels = { ...n.levels };
          const edad = n.nacimiento === undefined ? undefined : (day - n.nacimiento) / 365;
          for (const [k, v] of Object.entries(levels)) {
            const pot = n.potential[k] ?? 80;
            // El techo de cada edad es el potencial por el desarrollo físico de esa edad: sin edad, el potencial entero.
            const techo = edad === undefined ? pot : pot * desarrolloRival(edad + (n.desfase ?? 0));
            const ritmo = n.ritmo?.[k] ?? 1;
            // Progresan con rendimientos decrecientes hacia el techo de su edad.
            if (v < techo) levels[k] = Math.min(techo, v + ctx.rng.range(0, 0.35) * (1 - v / techo) * 2 * ritmo);
          }
          return { ...n, affinity, levels };
        }),
      }));
    },

    [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
      const { week } = ev.data as { week: number };
      // Si la semana que viene empieza un curso nuevo, se renueva el pelotón de rivales.
      const proximo = timeView((week + 1) * 7 * MINUTES_PER_DAY);
      if (proximo.schoolWeek !== 0) return;
      ctx.updateState<NpcsState>((s) => ({ npcs: renovarRivales(s.npcs, proximo.day, ctx.rng) }));
    },

    [SHARED_EVENTS.COMPETITION_RESULT]: (ctx, ev) => {
      const r = ev.data as CompetitionResultData;
      ctx.updateState<NpcsState>((s) => ({
        npcs: s.npcs.map((n) => {
          // El entrenador de ese deporte valora el esfuerzo y más aún el podio.
          if (n.role === 'entrenador' && n.supports.includes(r.module)) {
            return { ...n, affinity: clamp(n.affinity + (r.position <= 3 ? 3 : 1)) };
          }
          // Los rivales que te ganan se crecen; los que pierden, te respetan un poco más.
          const p = r.participants.find((x) => x.npcId === n.id);
          if (p && n.role === 'rival') {
            // Competir contra alguien es conocerlo.
            return { ...n, known: true, affinity: clamp(n.affinity + (p.mark > r.mark ? 1 : -0.5)) };
          }
          return n;
        }),
      }));
    },
  },

  services: {
    [SERVICES.npcs]: (ctx): NpcDirectory => {
      const lista = ctx.state<NpcsState>().npcs;
      const day = ctx.time.day;
      // Edad de temporada: la de cada rival el primer día del curso, que es la que decide su categoría.
      const inicioCurso = (ctx.time.week - ctx.time.schoolWeek) * 7;
      return {
        list: (f) =>
          lista
            .filter((n) => {
              if (f?.role && n.role !== f.role) return false;
              if (f?.tag && !n.tags.includes(f.tag)) return false;
              if (f?.minAge !== undefined || f?.maxAge !== undefined) {
                const edad = edadNpc(n, inicioCurso);
                if (edad === undefined || edad < (f.minAge ?? 0) || edad > (f.maxAge ?? 200)) return false;
              }
              return true;
            })
            .map((n) => vista(n, inicioCurso)),
        get: (id) => {
          const n = lista.find((x) => x.id === id);
          return n ? vista(n, inicioCurso) : undefined;
        },
      };
    },
  },
});

export default npcs;
