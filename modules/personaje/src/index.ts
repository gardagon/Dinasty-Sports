import {
  CORE_EVENTS,
  GEN,
  TAGS,
  defineModule,
  inHours,
  isSchoolHours,
  minutesUntilHour,
  type DecayDef,
  type StatDef,
} from '@ds/contracts';

/**
 * MÓDULO BASE (id `gen`): lo que comparte cualquier personaje.
 * - Genéricas: apoyan a todas las habilidades de los demás módulos (techo y velocidad).
 * - Estado: energía, salud, estrés y motivación. Modulan la eficiencia de todo.
 */

const fisica: DecayDef = { graceDays: 5, ratePerDay: 0.01, floorRatio: 0.85 };
const mental: DecayDef = { graceDays: 10, ratePerDay: 0.005, floorRatio: 0.9 };
const social: DecayDef = { graceDays: 14, ratePerDay: 0.004, floorRatio: 0.9 };

const generica = (id: string, name: string, group: string, decay: DecayDef): StatDef => ({
  id,
  name,
  group,
  category: 'generica',
  initial: { min: 30, max: 50 },
  growth: { rate: 0.3, curve: 2 },
  decay,
});

const WAKE_HOUR = 7;

export const personaje = defineModule({
  id: 'gen',
  name: 'Personaje',
  description: 'Características genéricas y estado del personaje.',
  stats: [
    generica(GEN.fuerza, 'Fuerza', 'Físico', fisica),
    generica(GEN.resistencia, 'Resistencia', 'Físico', fisica),
    generica(GEN.velocidad, 'Velocidad', 'Físico', fisica),
    generica(GEN.coordinacion, 'Coordinación', 'Físico', fisica),
    generica(GEN.concentracion, 'Concentración', 'Mental', mental),
    generica(GEN.memoria, 'Memoria', 'Mental', mental),
    generica(GEN.disciplina, 'Disciplina', 'Mental', mental),
    generica(GEN.carisma, 'Carisma', 'Social', social),
    generica(GEN.trabajoEquipo, 'Trabajo en equipo', 'Social', social),
    { id: GEN.energia, name: 'Energía', group: 'Estado', category: 'estado', initial: 90, resource: true },
    { id: GEN.salud, name: 'Salud', group: 'Estado', category: 'estado', initial: 90 },
    { id: GEN.estres, name: 'Estrés', group: 'Estado', category: 'estado', initial: 20 },
    { id: GEN.motivacion, name: 'Motivación', group: 'Estado', category: 'estado', initial: 60 },
  ],

  actions: [
    {
      id: 'gen.dormir',
      name: 'Dormir',
      description: `Duerme hasta las ${WAKE_HOUR}:00. Cuantas más horas, más energía recuperas.`,
      tags: [TAGS.descanso],
      group: 'Descanso',
      duration: (ctx) => minutesUntilHour(ctx.time.minute, WAKE_HOUR),
      available: (ctx) => (inHours(ctx.time, 21, 6) ? true : 'Solo de 21:00 a 6:00'),
      run: (ctx) => {
        const hours = minutesUntilHour(ctx.time.minute, WAKE_HOUR) / 60;
        ctx.addStat(GEN.energia, Math.min(100, hours * 12.5));
        ctx.addStat(GEN.estres, -hours * 0.8);
        if (hours < 7) {
          ctx.addStat(GEN.motivacion, -2);
          ctx.log(`Solo has dormido ${hours.toFixed(1)} h.`, 'aviso');
        }
      },
    },
    {
      id: 'gen.descansar',
      name: 'Descansar un rato',
      tags: [TAGS.descanso],
      group: 'Descanso',
      duration: 60,
      delta: { [GEN.energia]: 8, [GEN.estres]: -2 },
    },
    {
      id: 'gen.gimnasio',
      name: 'Gimnasio',
      description: 'Fuerza y resistencia generales.',
      tags: [TAGS.fisico, TAGS.entrenamiento],
      group: 'Entrenamiento general',
      duration: 90,
      available: (ctx) => (inHours(ctx.time, 7, 22) && !isSchoolHours(ctx.time) ? true : 'Abierto de 7 a 22 (fuera de clase)'),
      delta: { [GEN.energia]: -20, [GEN.estres]: -3 },
      train: [
        { stat: GEN.fuerza, amount: 2 },
        { stat: GEN.resistencia, amount: 1 },
      ],
    },
    {
      id: 'gen.leer',
      name: 'Leer',
      tags: [TAGS.mental, TAGS.ocio],
      group: 'Tiempo libre',
      duration: 60,
      available: (ctx) => (!isSchoolHours(ctx.time) ? true : 'Estás en horario de clase'),
      delta: { [GEN.energia]: -5, [GEN.estres]: -2 },
      train: [
        { stat: GEN.concentracion, amount: 0.8 },
        { stat: GEN.memoria, amount: 0.6 },
      ],
    },
    {
      id: 'gen.ocio',
      name: 'Videojuegos y series',
      tags: [TAGS.ocio],
      group: 'Tiempo libre',
      duration: 120,
      available: (ctx) => (!isSchoolHours(ctx.time) ? true : 'Estás en horario de clase'),
      delta: { [GEN.energia]: -3, [GEN.estres]: -10, [GEN.motivacion]: 4 },
    },
    {
      id: 'gen.pasear',
      name: 'Dar un paseo',
      tags: [TAGS.ocio, TAGS.social],
      group: 'Tiempo libre',
      duration: 60,
      available: (ctx) => (inHours(ctx.time, 8, 22) && !isSchoolHours(ctx.time) ? true : 'De 8 a 22, fuera de clase'),
      delta: { [GEN.energia]: -4, [GEN.estres]: -5 },
      train: [{ stat: GEN.carisma, amount: 0.5 }],
    },
  ],

  modifiers: [
    {
      id: 'gen.cansancio',
      tags: ['*'],
      apply: (ctx) => {
        const e = ctx.stat(GEN.energia);
        return e < 35 ? { efficiency: 0.5 + (0.5 * e) / 35, reason: 'Cansancio' } : null;
      },
    },
    {
      id: 'gen.estres',
      tags: [TAGS.mental, TAGS.estudio],
      apply: (ctx) => {
        const s = ctx.stat(GEN.estres);
        return s > 50 ? { efficiency: 1 - (s - 50) / 100, reason: 'Estrés' } : null;
      },
    },
    {
      id: 'gen.motivacion',
      tags: [TAGS.entrenamiento, TAGS.estudio],
      apply: (ctx) => {
        const f = 0.85 + 0.3 * ctx.norm(GEN.motivacion);
        if (Math.abs(f - 1) < 0.05) return null;
        return { efficiency: f, reason: f > 1 ? 'Motivación alta' : 'Motivación baja' };
      },
    },
    {
      id: 'gen.salud',
      tags: ['*'],
      apply: (ctx, action) => {
        const h = ctx.stat(GEN.salud);
        if (h >= 60) return null;
        // Con mala salud rinde menos todo; lo físico además cansa más.
        return { efficiency: 0.4 + h / 100, cost: action.tags.includes(TAGS.fisico) ? 1.2 : 1, reason: 'Salud baja' };
      },
    },
    {
      id: 'gen.disciplina',
      tags: [TAGS.entrenamiento, TAGS.estudio],
      apply: (ctx) => {
        const c = 1.1 - 0.2 * ctx.norm(GEN.disciplina);
        if (Math.abs(c - 1) < 0.04) return null;
        return { cost: c, reason: c < 1 ? 'Disciplina: cansa menos' : 'Poca disciplina: cansa más' };
      },
    },
  ],

  on: {
    [CORE_EVENTS.DAY_END]: (ctx) => {
      const energia = ctx.stat(GEN.energia);
      const estres = ctx.stat(GEN.estres);
      if (energia < 15) {
        ctx.addStat(GEN.salud, -3);
        ctx.log('Agotamiento: tu salud se resiente.', 'aviso');
      } else if (estres < 60) {
        ctx.addStat(GEN.salud, 1);
      }
      if (estres > 75) {
        ctx.addStat(GEN.salud, -2);
        ctx.addStat(GEN.motivacion, -3);
        ctx.log('El estrés te está pasando factura.', 'aviso');
      }
      // La motivación tiende a su punto de equilibrio y el estrés baja solo un poco.
      const m = ctx.stat(GEN.motivacion);
      ctx.addStat(GEN.motivacion, (55 - m) * 0.05);
      ctx.addStat(GEN.estres, -1);
    },
  },
});

export default personaje;
