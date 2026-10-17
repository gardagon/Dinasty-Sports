import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  defineModule,
  inHours,
  isSchoolHours,
  type ActionDef,
  type CompetitionResultData,
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
  description?: string;
  /** Último día de interacción con el personaje. */
  lastDay: number;
}

export interface NpcsState {
  npcs: Npc[];
}

const NOMBRES: Record<Gender, string[]> = {
  f: ['Lucía', 'Martina', 'Sofía', 'Valeria', 'Paula', 'Carla', 'Noa', 'Irene'],
  m: ['Hugo', 'Mateo', 'Leo', 'Daniel', 'Álvaro', 'Pablo', 'Marcos', 'Adrián'],
};
const APELLIDOS = ['García', 'Martín', 'López', 'Sánchez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano'];

const UMBRAL_APOYO = 40;
const DIAS_SIN_CONTACTO = 7;

function generarReparto(ctx: InitContext): Npc[] {
  const { rng } = ctx;
  const usados = new Set<string>();
  const nombre = (g: Gender) => {
    let n = '';
    do n = `${rng.pick(NOMBRES[g])} ${rng.pick(APELLIDOS)}`;
    while (usados.has(n));
    usados.add(n);
    return n;
  };
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
    ...[0, 1, 2].map((i) =>
      npc(`rival_${i + 1}`, 'rival', () => ({
        tags: ['atleta'],
        affinity: rng.int(15, 30),
        levels: { atletismo: rng.range(30, 48) },
        potential: { atletismo: rng.range(72, 92) },
        description: 'Corre en tu categoría.',
      })),
    ),
  ];
}

const vista = (n: Npc): NpcView => ({
  id: n.id,
  name: n.name,
  role: n.role,
  gender: n.gender,
  tags: n.tags,
  supports: n.supports,
  affinity: n.affinity,
  levels: n.levels,
  description: n.description,
});

const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

function interaccion(
  n: Npc,
  cfg: { suffix: string; name: string; duration: number; tags: string[]; ganancia: number; horario: (ctx: ReadContext) => true | string },
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
    train: cfg.tags.includes(TAGS.social)
      ? [
          { stat: GEN.carisma, amount: 0.8 },
          { stat: GEN.cooperacion, amount: 0.3 },
        ]
      : [],
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
            horario: (c) => (c.time.isWeekend ? fueraDeClase(9, 14)(c) : fueraDeClase(15, 21)(c)),
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
            horario: (c) => (!c.time.isWeekend && inHours(c.time, 14, 17) ? true : 'Tutorías de lunes a viernes, 14 a 17'),
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
          for (const [k, v] of Object.entries(levels)) {
            const pot = n.potential[k] ?? 80;
            // Los rivales progresan con rendimientos decrecientes hacia su potencial.
            levels[k] = Math.min(pot, v + ctx.rng.range(0, 0.35) * (1 - v / pot) * 2);
          }
          return { ...n, affinity, levels };
        }),
      }));
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
            return { ...n, affinity: clamp(n.affinity + (p.mark > r.mark ? 1 : -0.5)) };
          }
          return n;
        }),
      }));
    },
  },

  services: {
    [SERVICES.npcs]: (ctx): NpcDirectory => {
      const lista = ctx.state<NpcsState>().npcs;
      return {
        list: (f) => lista.filter((n) => (!f?.role || n.role === f.role) && (!f?.tag || n.tags.includes(f.tag))).map(vista),
        get: (id) => {
          const n = lista.find((x) => x.id === id);
          return n ? vista(n) : undefined;
        },
      };
    },
  },
});

export default npcs;
