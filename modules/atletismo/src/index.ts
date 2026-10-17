import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  defineModule,
  inHours,
  type ActionDoneData,
  type CompetitionResultData,
  type NpcDirectory,
  type ReadContext,
  type Rng,
  type StatDef,
} from '@ds/contracts';

/**
 * MÓDULO ATLETISMO (id `atletismo`) — el deporte más sencillo de modelar:
 * individual, sin posiciones ni tácticas. Prueba: 400 m lisos.
 *
 * Plantilla para futuros deportes: 3 habilidades propias apoyadas en genéricas,
 * entrenamientos por la tarde, competición semanal y resultado publicado con el
 * evento compartido `competicion.resultado` (los NPCs reaccionan sin conocer este módulo).
 */

export interface AtletismoState {
  mejorMarca: number | null;
  carreras: { week: number; position: number; total: number; mark: number }[];
  ultimaSemanaCarrera: number;
  /** Sesiones de entrenamiento hechas hoy (para la sobrecarga). */
  sesionesHoy: { day: number; n: number };
}

const DISCIPLINA = '400 m';
const SESIONES_SIN_SOBRECARGA = 2;

const habilidad = (
  key: string,
  name: string,
  apoyo: string,
  description: string,
): StatDef => ({
  id: `atletismo.${key}`,
  name,
  description,
  group: 'Atletismo',
  category: 'habilidad',
  initial: { min: 5, max: 15 },
  talentSpread: 0.2,
  growth: {
    rate: 0.5,
    curve: 1.5,
    speedFrom: [
      { stat: apoyo, weight: 0.6 },
      { stat: GEN.disciplina, weight: 0.2 },
    ],
    cap: {
      base: 0.55,
      from: [
        { stat: apoyo, weight: 0.3 },
        { stat: GEN.disciplina, weight: 0.15 },
      ],
    },
  },
  decay: { graceDays: 4, ratePerDay: 0.012, floorRatio: 0.7 },
});

const horarioEntreno = (ctx: ReadContext): true | string => {
  const t = ctx.time;
  if (t.isWeekend) return inHours(t, 8, 20) ? true : 'Las pistas abren de 8 a 20 el fin de semana';
  return inHours(t, 15, 21) ? true : 'Entrenamientos entre semana de 15 a 21';
};

/** Rendimiento 0..100 a partir de las stats (el corazón del deporte; ajustable sin tocar nada más). */
export function rendimiento(ctx: ReadContext): number {
  return (
    0.25 * ctx.stat(GEN.velocidad) +
    0.2 * ctx.stat(GEN.resistencia) +
    0.25 * ctx.stat('atletismo.tecnica') +
    0.15 * ctx.stat('atletismo.ritmo') +
    0.15 * ctx.stat('atletismo.salida')
  );
}

/** Marca de 400 m (segundos) a partir del rendimiento: 30 → ~69 s, 70 → ~57 s. */
export function marca400(perf: number, rng: Rng): number {
  const t = 78 - perf * 0.3 + rng.normal() * 0.9;
  return Math.round(t * 100) / 100;
}

const PARTICIPANTES = 8;

/** Rivales genéricos: rellenan la carrera hasta completar la serie (o todos, si no hay NPCs). */
function rivalesGenericos(n: number, week: number, rng: Rng) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Corredor ${i + 1}`,
    level: Math.min(85, 25 + week * 0.5 + rng.range(0, 20)),
  }));
}

export const atletismo = defineModule<AtletismoState>({
  id: 'atletismo',
  name: 'Atletismo',
  description: '400 metros lisos. Entrena por la tarde y compite los sábados.',
  dependsOn: ['gen'],
  stats: [
    habilidad('tecnica', 'Técnica de carrera', GEN.coordinacion, 'Zancada eficiente y postura.'),
    habilidad('ritmo', 'Gestión del ritmo', GEN.resistencia, 'Repartir el esfuerzo en la vuelta.'),
    habilidad('salida', 'Salida y aceleración', GEN.velocidad, 'Arrancar rápido desde los tacos.'),
  ],

  initState: () => ({
    mejorMarca: null,
    carreras: [],
    ultimaSemanaCarrera: -1,
    sesionesHoy: { day: -1, n: 0 },
  }),

  actions: [
    {
      id: 'atletismo.series',
      name: 'Series de velocidad',
      tags: [TAGS.fisico, TAGS.entrenamiento, 'atletismo'],
      group: 'Entrenar atletismo',
      duration: 90,
      available: horarioEntreno,
      delta: { [GEN.energia]: -25 },
      train: [
        { stat: GEN.velocidad, amount: 1 },
        { stat: 'atletismo.salida', amount: 3 },
        { stat: 'atletismo.tecnica', amount: 1 },
      ],
    },
    {
      id: 'atletismo.rodaje',
      name: 'Rodaje largo',
      tags: [TAGS.fisico, TAGS.entrenamiento, 'atletismo'],
      group: 'Entrenar atletismo',
      duration: 75,
      available: horarioEntreno,
      delta: { [GEN.energia]: -20, [GEN.estres]: -3 },
      train: [
        { stat: GEN.resistencia, amount: 1.2 },
        { stat: 'atletismo.ritmo', amount: 3 },
      ],
    },
    {
      id: 'atletismo.tecnica',
      name: 'Sesión de técnica',
      tags: [TAGS.fisico, TAGS.entrenamiento, 'atletismo'],
      group: 'Entrenar atletismo',
      duration: 60,
      available: horarioEntreno,
      delta: { [GEN.energia]: -12 },
      train: [
        { stat: 'atletismo.tecnica', amount: 3.5 },
        { stat: GEN.coordinacion, amount: 0.6 },
      ],
    },
    {
      id: 'atletismo.carrera',
      name: `Competir: ${DISCIPLINA}`,
      description: 'Carrera semanal, los sábados de 9 a 13.',
      tags: [TAGS.fisico, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => {
        const t = ctx.time;
        if (ctx.state<AtletismoState>().ultimaSemanaCarrera === t.week) return 'Ya has competido esta semana';
        return t.weekday === 5 && inHours(t, 9, 13) ? true : 'Las carreras son los sábados de 9 a 13';
      },
      delta: { [GEN.energia]: -30, [GEN.estres]: 5 },
      // Competir también enseña.
      train: [
        { stat: 'atletismo.ritmo', amount: 1 },
        { stat: 'atletismo.salida', amount: 0.5 },
      ],
      run: (ctx) => {
        const t = ctx.time;
        // El día cuenta: cansancio, salud, motivación... ya vienen en la eficiencia.
        const forma = 0.85 + 0.15 * Math.min(1.2, ctx.efficiency);
        const miMarca = marca400(rendimiento(ctx) * forma, ctx.rng);

        const npcs = ctx.service<NpcDirectory>(SERVICES.npcs);
        const conocidos: { npcId?: string; name: string; level: number }[] = npcs
          ? npcs.list({ tag: 'atleta' }).map((n) => ({ npcId: n.id, name: n.name, level: n.levels.atletismo ?? 30 }))
          : [];
        const rivales: { npcId?: string; name: string; level: number }[] = [
          ...conocidos,
          ...rivalesGenericos(Math.max(0, PARTICIPANTES - 1 - conocidos.length), t.week, ctx.rng),
        ];

        const participants: CompetitionResultData['participants'] = [
          { name: 'Tú', mark: miMarca, isPlayer: true },
          ...rivales.map((r) => ({ npcId: r.npcId, name: r.name, mark: marca400(r.level, ctx.rng) })),
        ].sort((a, b) => a.mark - b.mark);
        const position = participants.findIndex((p) => p.isPlayer) + 1;
        const total = participants.length;

        const s = ctx.state<AtletismoState>();
        const record = s.mejorMarca === null || miMarca < s.mejorMarca;
        ctx.setState<AtletismoState>({
          ...s,
          mejorMarca: record ? miMarca : s.mejorMarca,
          carreras: [...s.carreras, { week: t.week, position, total, mark: miMarca }].slice(-52),
          ultimaSemanaCarrera: t.week,
        });

        ctx.log(`${DISCIPLINA}: ${position}º de ${total} con ${miMarca.toFixed(2)} s${record ? ' (¡mejor marca personal!)' : ''}`, 'resultado');
        if (position === 1) ctx.addStat(GEN.motivacion, 6);
        else if (position <= 3) ctx.addStat(GEN.motivacion, 3);
        else if (position === total) ctx.addStat(GEN.motivacion, -3);
        if (record) ctx.addStat(GEN.motivacion, 2);

        ctx.emit<CompetitionResultData>({
          type: SHARED_EVENTS.COMPETITION_RESULT,
          data: { module: 'atletismo', discipline: DISCIPLINA, position, total, mark: miMarca, unit: 's', participants },
        });
      },
    },
  ],

  modifiers: [
    {
      id: 'atletismo.sobrecarga',
      tags: ['atletismo'],
      apply: (ctx, action) => {
        if (!action.tags.includes(TAGS.entrenamiento)) return null;
        const s = ctx.state<AtletismoState>().sesionesHoy;
        const n = s.day === ctx.time.day ? s.n : 0;
        if (n < SESIONES_SIN_SOBRECARGA) return null;
        return { efficiency: 0.6, cost: 1.3, reason: 'Sobrecarga: demasiadas sesiones hoy' };
      },
    },
  ],

  on: {
    [CORE_EVENTS.ACTION_DONE]: (ctx, ev) => {
      const d = ev.data as ActionDoneData;
      if (d.module !== 'atletismo' || !d.tags.includes(TAGS.entrenamiento)) return;
      // El día se toma del momento en que empezó la sesión (antes de avanzar el reloj).
      const dia = Math.floor((ctx.time.minute - d.duration) / 1440);
      const prev = ctx.state<AtletismoState>().sesionesHoy;
      const n = prev.day === dia ? prev.n + 1 : 1;
      ctx.updateState<AtletismoState>((s) => ({ ...s, sesionesHoy: { day: dia, n } }));
      // Entrenar con sobrecarga castiga el cuerpo y puede lesionar.
      if (n > SESIONES_SIN_SOBRECARGA) {
        ctx.addStat(GEN.salud, -4);
        if (ctx.rng.chance(0.15)) {
          ctx.addStat(GEN.salud, -10);
          ctx.log('Molestias musculares: te has pasado entrenando.', 'aviso');
        }
      }
    },
  },
});

export default atletismo;
