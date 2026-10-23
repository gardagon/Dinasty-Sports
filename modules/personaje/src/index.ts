import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  madurezPorEdad,
  TAGS,
  defineModule,
  inHours,
  isSchoolHours,
  minutesUntilHour,
  type ActionDoneData,
  type DayEventData,
  type DecayDef,
  type IdentityService,
  type StatDef,
} from '@ds/contracts';
import {
  NOMBRE_COMPLEXION,
  actualizarCuerpo,
  edadDecimal,
  initIdentidad,
  viewIdentidad,
  type IdentidadState,
} from './identidad';

export type { IdentidadState } from './identidad';

/**
 * MÓDULO BASE (id `gen`): lo que comparte cualquier personaje.
 * - Genéricas: apoyan a todas las habilidades de los demás módulos (techo y velocidad).
 * - Estado: energía, salud, estrés y motivación. Modulan la eficiencia de todo.
 */

const fisica: DecayDef = { graceDays: 5, ratePerDay: 0.01, floorRatio: 0.85 };
const mental: DecayDef = { graceDays: 10, ratePerDay: 0.005, floorRatio: 0.9 };
const social: DecayDef = { graceDays: 14, ratePerDay: 0.004, floorRatio: 0.9 };

/** Techo de lo físico: crece con el desarrollo por la edad (a los 8 años ~57, a los 18 el máximo). */
const techoPorEdad = { base: 0.3, from: [{ stat: GEN.madurez, weight: 0.7 }] };

const generica = (id: string, name: string, group: string, decay: DecayDef, description: string, limitadaPorEdad = false): StatDef => ({
  id,
  name,
  group,
  description,
  category: 'generica',
  initial: { min: 30, max: 50 },
  growth: { rate: 0.3, curve: 2, ...(limitadaPorEdad ? { cap: techoPorEdad } : {}) },
  // Lo físico depende de la genética (y del desarrollo por la edad).
  ...(limitadaPorEdad ? { genetics: { family: 'fisico' } } : {}),
  decay,
});

const WAKE_HOUR = 7;

export const personaje = defineModule<IdentidadState>({
  id: 'gen',
  name: 'Personaje',
  description: 'Características genéricas, estado e identidad del personaje.',
  initState: (ctx) => initIdentidad(ctx.rng, ctx.herencia('estatura').hijo),
  stats: [
    // Físicos
    generica(GEN.velocidad, 'Velocidad', 'Físico', fisica, 'Desplazamiento puro: lo rápido que mueves el cuerpo de un punto a otro.', true),
    generica(GEN.fuerza, 'Fuerza', 'Físico', fisica, 'Potencia muscular: empujar, cargar, resistir un choque.', true),
    generica(GEN.resistencia, 'Resistencia', 'Físico', fisica, 'Cuánto aguanta el cuerpo el esfuerzo antes de ceder.', true),
    generica(GEN.constitucion, 'Constitución', 'Físico', fisica, 'Robustez del cuerpo: lesiones, recuperación y esfuerzo acumulado. Se forja con hábitos sostenidos.', true),
    generica(GEN.agilidad, 'Agilidad', 'Físico', fisica, 'Cambiar de dirección con rapidez y control.', true),
    generica(GEN.coordinacion, 'Coordinación', 'Físico', fisica, 'Precisión del movimiento: que el cuerpo haga lo que el cerebro ordena.', true),
    // Mentales
    generica(GEN.inteligencia, 'Inteligencia', 'Mental', mental, 'Rapidez y calidad del razonamiento; entender y decidir bajo presión.'),
    generica(GEN.concentracion, 'Concentración', 'Mental', mental, 'Mantener el foco durante periodos largos.'),
    generica(GEN.determinacion, 'Determinación', 'Mental', mental, 'Empuje ante el esfuerzo y la dificultad; persistir cuando el progreso es lento.'),
    generica(GEN.resiliencia, 'Resiliencia', 'Mental', mental, 'Recuperarse tras un fracaso, una lesión o una mala racha.'),
    generica(GEN.atencion, 'Atención', 'Mental', mental, 'Captar lo relevante del entorno cuando hay mucho estímulo.'),
    generica(GEN.creatividad, 'Creatividad', 'Mental', mental, 'Encontrar soluciones que nadie espera.'),
    // Sociales
    generica(GEN.carisma, 'Carisma', 'Social', social, 'Magnetismo natural: caer bien sin esforzarse.'),
    generica(GEN.comunicacion, 'Comunicación', 'Social', social, 'Claridad al transmitir ideas, instrucciones y acuerdos.'),
    generica(GEN.autoridad, 'Autoridad', 'Social', social, 'Capacidad de mando: el respeto que infundes al grupo.'),
    generica(GEN.empatia, 'Empatía', 'Social', social, 'Leer lo que sienten los demás.'),
    generica(GEN.picardia, 'Picardía', 'Social', social, 'Astucia para jugar al límite y salirte con la tuya.'),
    generica(GEN.cooperacion, 'Cooperación', 'Social', social, 'Trabajar con otros hacia un objetivo común. (Provisional.)'),
    { id: GEN.madurez, name: 'Madurez física', group: 'Estado', category: 'estado', initial: 41, hidden: true },
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
      tags: [TAGS.fisico, TAGS.fuerza, TAGS.entrenamiento],
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
        { stat: GEN.inteligencia, amount: 0.6 },
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
      id: 'gen.complexion',
      tags: [TAGS.fisico],
      apply: (ctx, action) => {
        const tipo = ctx.state<IdentidadState>().cuerpo;
        const fuerza = action.tags.includes(TAGS.fuerza);
        const cardio = action.tags.includes(TAGS.cardio);
        switch (tipo) {
          case 'musculado':
            // Mucha fuerza, pero más pesado para correr.
            return fuerza
              ? { efficiency: 1.1, reason: 'Complexión musculosa: rindes más en fuerza' }
              : cardio
                ? { efficiency: 0.95, reason: 'Complexión musculosa: pesas más para correr' }
                : null;
          case 'delgado':
            return cardio
              ? { efficiency: 1.05, reason: 'Complexión delgada: ligero para correr' }
              : fuerza
                ? { efficiency: 0.9, reason: 'Complexión delgada: te falta fuerza' }
                : null;
          case 'atletico':
            return { efficiency: 1.03, reason: 'Complexión atlética' };
          case 'con_sobrepeso':
            return { efficiency: 0.9, cost: 1.15, reason: 'Sobrepeso: te cuesta más moverte' };
          default:
            return null;
        }
      },
    },
    {
      id: 'gen.determinacion',
      tags: [TAGS.entrenamiento, TAGS.estudio],
      apply: (ctx) => {
        const c = 1.1 - 0.2 * ctx.norm(GEN.determinacion);
        if (Math.abs(c - 1) < 0.04) return null;
        return { cost: c, reason: c < 1 ? 'Determinación: cansa menos' : 'Poca determinación: cansa más' };
      },
    },
  ],

  on: {
    [CORE_EVENTS.ACTION_DONE]: (ctx, ev) => {
      const d = ev.data as ActionDoneData;
      const fisico = d.tags.includes(TAGS.fisico);
      const fuerza = d.tags.includes(TAGS.fuerza);
      const cardio = d.tags.includes(TAGS.cardio);
      const descanso = d.tags.includes(TAGS.descanso);
      if (!fisico && !fuerza && !cardio && !descanso) return;
      ctx.updateState<IdentidadState>((s) => ({
        ...s,
        semana: {
          fuerza: s.semana.fuerza + (fuerza ? d.duration : 0),
          cardio: s.semana.cardio + (cardio ? d.duration : 0),
          activo: s.semana.activo + (fisico ? d.duration : 0),
          descanso: s.semana.descanso + (descanso ? d.duration : 0),
        },
      }));
    },

    [CORE_EVENTS.WEEK_END]: (ctx) => {
      const antes = ctx.state<IdentidadState>();
      const sana = antes.semana.activo >= 120 && antes.semana.descanso >= 50 * 60 && ctx.stat(GEN.estres) < 60;
      const despues = actualizarCuerpo(antes);
      ctx.setState<IdentidadState>(despues);
      // La constitución se forja con hábitos sostenidos, no entrenándola directamente.
      if (sana && despues.cuerpo !== 'con_sobrepeso') ctx.train(GEN.constitucion, 1);
      if (despues.cuerpo !== antes.cuerpo) {
        ctx.log(`Tu cuerpo ha cambiado: ahora tienes una complexión ${NOMBRE_COMPLEXION[despues.cuerpo]}.`, 'info');
      }
    },

    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as DayEventData;
      const s = ctx.state<IdentidadState>();
      const edad = Math.floor(edadDecimal(s, day + 1));
      if (edad > Math.floor(edadDecimal(s, day))) ctx.log(`¡Cumples ${edad} años!`, 'logro');
      // El desarrollo físico sigue a la edad (con el adelanto o retraso propio): es el techo de lo físico.
      const objetivo = 100 * madurezPorEdad(edadDecimal(s, day + 1) + s.madurez);
      ctx.addStat(GEN.madurez, objetivo - ctx.stat(GEN.madurez));

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

  services: {
    [SERVICES.identidad]: (ctx): IdentityService => {
      const s = ctx.state<IdentidadState>();
      const day = ctx.time.day;
      // Primer día del curso en curso: de ahí sale la edad de temporada (la categoría no cambia a mitad de curso).
      const inicioCurso = (ctx.time.week - ctx.time.schoolWeek) * 7;
      return { view: () => viewIdentidad(s, day, inicioCurso) };
    },
  },
});

export default personaje;
