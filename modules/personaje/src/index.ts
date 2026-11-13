import {
  CORE_EVENTS,
  conFotoDelCumple,
  GEN,
  SERVICES,
  factorPorEdad,
  statDeCapacidad,
  factorPorCansancio,
  factorPorEstres,
  factorPorMotivacion,
  factorPorSalud,
  eficienciaDeEstado,
  fatigaDeLaSemana,
  formaTrasLaSemana,
  formaTrasUnaCompeticion,
  gravedadDeLesion,
  riesgoDeLesion,
  rngEstable,
  SHARED_EVENTS,
  valoracionDelPuesto,
  type CompetitionResultData,
  vigoresPorEdad,
  TAGS,
  defineModule,
  inHours,
  ligarALugares,
  isSchoolHours,
  minutesUntilHour,
  type ActionDoneData,
  type DayEventData,
  type DecayDef,
  type IdentityService,
  type PerksService,
  type ProfileService,
  SUBIDA_DE_INTERES_POR_HORA,
  interesesDe,
  perfilHeredado,
  type PerkView,
  efectosDe,
  eficienciaDePerks,
  heredarPerks,
  perk,
  type StatDef,
} from '@ds/contracts';
import {
  EDAD_INICIAL,
  NOMBRE_COMPLEXION,
  SEXO_DEL_PERSONAJE,
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

// Las 18 capacidades las define `statDeCapacidad` (contracts): son las mismas reglas para el personaje y para cualquier niño.
const generica = statDeCapacidad;

const WAKE_HOUR = 7;

export const personaje = defineModule<IdentidadState>({
  id: 'gen',
  name: 'Personaje',
  description: 'Características genéricas, estado e identidad del personaje.',
  initState: (ctx) => {
    // Los perks salen de los de los dos padres. Su efecto sobre los topes y la altura es fijo desde el nacimiento,
    // aunque sean latentes y todavía no se hayan revelado.
    const perks = heredarPerks(ctx.perksDePadres.padre, ctx.perksDePadres.madre, ctx.rng);
    const efecto = efectosDe(perks.activos);
    for (const [stat, delta] of Object.entries(efecto.tope)) ctx.bonusDeTope(stat, delta);
    // Origen, apariencia, carácter e intereses salen de los padres (la opción de elegirlos a mano llegará con la creación de personaje).
    const perfil = perfilHeredado(ctx.rasgosDePadres.padre, ctx.rasgosDePadres.madre, ctx.rng, SEXO_DEL_PERSONAJE);
    return { ...initIdentidad(ctx.rng, ctx.herencia('estatura').hijo, perks, perfil, efecto.alturaCm), semilla: ctx.seed };
  },
  stats: [
    // Físicos
    generica(GEN.velocidad, 'Velocidad', 'Desplazamiento puro: lo rápido que mueves el cuerpo de un punto a otro.'),
    generica(GEN.fuerza, 'Fuerza', 'Potencia muscular: empujar, cargar, resistir un choque.'),
    generica(GEN.resistencia, 'Resistencia', 'Cuánto aguanta el cuerpo el esfuerzo antes de ceder.'),
    generica(GEN.constitucion, 'Constitución', 'Robustez del cuerpo: lesiones, recuperación y esfuerzo acumulado. Se forja con hábitos sostenidos.'),
    generica(GEN.agilidad, 'Agilidad', 'Cambiar de dirección con rapidez y control.'),
    generica(GEN.coordinacion, 'Coordinación', 'Precisión del movimiento: que el cuerpo haga lo que el cerebro ordena.'),
    // Mentales
    generica(GEN.inteligencia, 'Inteligencia', 'Rapidez y calidad del razonamiento; entender y decidir bajo presión.'),
    generica(GEN.concentracion, 'Concentración', 'Mantener el foco durante periodos largos.'),
    generica(GEN.determinacion, 'Determinación', 'Empuje ante el esfuerzo y la dificultad; persistir cuando el progreso es lento.'),
    generica(GEN.resiliencia, 'Resiliencia', 'Recuperarse tras un fracaso, una lesión o una mala racha.'),
    generica(GEN.atencion, 'Atención', 'Captar lo relevante del entorno cuando hay mucho estímulo.'),
    generica(GEN.creatividad, 'Creatividad', 'Encontrar soluciones que nadie espera.'),
    // Sociales
    generica(GEN.carisma, 'Carisma', 'Magnetismo natural: caer bien sin esforzarse.'),
    generica(GEN.comunicacion, 'Comunicación', 'Claridad al transmitir ideas, instrucciones y acuerdos.'),
    generica(GEN.autoridad, 'Autoridad', 'Capacidad de mando: el respeto que infundes al grupo.'),
    generica(GEN.empatia, 'Empatía', 'Leer lo que sienten los demás.'),
    generica(GEN.picardia, 'Picardía', 'Astucia para jugar al límite y salirte con la tuya.'),
    generica(GEN.cooperacion, 'Cooperación', 'Trabajar con otros hacia un objetivo común. (Provisional.)'),
    { id: GEN.madurez, name: 'Madurez física', group: 'Estado', category: 'estado', initial: 41, hidden: true },
    // Fracción del tope genético alcanzable por la edad en cada categoría (ver `CURVAS_POR_EDAD`): el techo sube hasta el
    // pico y baja con el envejecimiento. Se actualizan cada día con la edad.
    { id: GEN.vigorFisico, name: 'Vigor físico', group: 'Estado', category: 'estado', initial: 100 * factorPorEdad('fisico', EDAD_INICIAL), hidden: true },
    { id: GEN.vigorTecnico, name: 'Vigor técnico', group: 'Estado', category: 'estado', initial: 100 * factorPorEdad('tecnico', EDAD_INICIAL), hidden: true },
    { id: GEN.vigorMental, name: 'Vigor mental', group: 'Estado', category: 'estado', initial: 100 * factorPorEdad('mental', EDAD_INICIAL), hidden: true },
    { id: GEN.vigorSocial, name: 'Vigor social', group: 'Estado', category: 'estado', initial: 100 * factorPorEdad('social', EDAD_INICIAL), hidden: true },
    { id: GEN.energia, name: 'Energía', group: 'Estado', category: 'estado', initial: 90, resource: true },
    // El personaje parte sin dinero. En euros; sin tope práctico. Gastar es un coste (bloquea la acción si no alcanza).
    { id: GEN.dinero, name: 'Dinero', group: 'Estado', category: 'estado', initial: 0, min: 0, max: 1_000_000, resource: true },
    { id: GEN.salud, name: 'Salud', group: 'Estado', category: 'estado', initial: 90 },
    { id: GEN.estres, name: 'Estrés', group: 'Estado', category: 'estado', initial: 20 },
    { id: GEN.motivacion, name: 'Motivación', group: 'Estado', category: 'estado', initial: 60 },
    // La forma y las lesiones siguen las mismas reglas que las de cualquier jugador (`estado-de-jugador.ts`).
    { id: GEN.forma, name: 'Forma', group: 'Estado', category: 'estado', initial: 60 },
    { id: GEN.baja, name: 'Baja por lesión (semanas)', group: 'Estado', category: 'estado', initial: 0, min: 0, max: 12 },
  ],

  actions: ligarALugares([
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
      name: 'Echarse una siesta',
      description: 'Una hora de siesta en casa para recuperar un poco de energía.',
      tags: [TAGS.descanso],
      group: 'Descanso',
      duration: 60,
      delta: { [GEN.energia]: 8, [GEN.estres]: -2 },
    },
    {
      id: 'gen.esperar',
      name: 'Pasar el rato',
      description: 'Dejar pasar cinco minutos (p. ej. hasta que se pueda entrar a clase).',
      tags: [TAGS.descanso],
      group: 'Descanso',
      duration: 5,
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
      id: 'gen.crear',
      name: 'Dibujar, tocar o inventar algo',
      description: 'Un rato creando por ti mismo: dibujar, tocar un instrumento, hacer manualidades o inventar historias. Sube tu creatividad (de la que depende Educación artística y Música).',
      tags: [TAGS.mental, TAGS.ocio, 'arte'],
      group: 'Tiempo libre',
      duration: 60,
      available: (ctx) => (!isSchoolHours(ctx.time) ? true : 'Estás en horario de clase'),
      delta: { [GEN.energia]: -3, [GEN.estres]: -4 },
      train: [
        { stat: GEN.creatividad, amount: 1 },
        { stat: GEN.coordinacion, amount: 0.2 },
        { stat: GEN.atencion, amount: 0.2 },
      ],
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
  ], {
    // La siesta (`gen.descansar`) es solo en casa; para esperar en cualquier parte está «Pasar el rato».
    'gen.dormir': ['casa'],
    'gen.descansar': ['casa'],
    'gen.gimnasio': ['gimnasio'],
    'gen.leer': ['casa', 'parque'],
    'gen.ocio': ['casa'],
    'gen.crear': ['casa'],
    'gen.pasear': ['parque'],
  }),

  modifiers: [
    {
      id: 'gen.perks',
      tags: ['*'],
      apply: (ctx, action) => {
        const { factor, quienes } = eficienciaDePerks(ctx.state<IdentidadState>().perks.activos, action.tags);
        return factor === 1 ? null : { efficiency: factor, reason: `Perk: ${quienes.join(', ')}` };
      },
    },
    {
      id: 'gen.cansancio',
      tags: ['*'],
      apply: (ctx) => {
        const f = factorPorCansancio(ctx.stat(GEN.energia));
        return f < 1 ? { efficiency: f, reason: 'Cansancio' } : null;
      },
    },
    {
      id: 'gen.estres',
      tags: [TAGS.mental, TAGS.estudio],
      apply: (ctx) => {
        const f = factorPorEstres(ctx.stat(GEN.estres));
        return f < 1 ? { efficiency: f, reason: 'Estrés' } : null;
      },
    },
    {
      id: 'gen.motivacion',
      tags: [TAGS.entrenamiento, TAGS.estudio],
      apply: (ctx) => {
        const f = factorPorMotivacion(ctx.norm(GEN.motivacion));
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
        return { efficiency: factorPorSalud(h), cost: action.tags.includes(TAGS.fisico) ? 1.2 : 1, reason: 'Salud baja' };
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
      // Lo que hace con su tiempo alimenta sus intereses (con rendimientos decrecientes hacia 100).
      const alimentados = interesesDe(d.tags);
      if (alimentados.length) {
        ctx.updateState<IdentidadState>((s) => {
          const intereses = { ...s.perfil.intereses };
          for (const id of alimentados) {
            const v = intereses[id] ?? 0;
            intereses[id] = v + (d.duration / 60) * SUBIDA_DE_INTERES_POR_HORA * (1 - v / 100);
          }
          return { ...s, perfil: { ...s.perfil, intereses } };
        });
      }
      // Sus sesiones de club y competiciones de la semana cuentan como carga para el riesgo de lesión.
      if (d.tags.includes(TAGS.club) || d.tags.includes(TAGS.competicion)) {
        ctx.updateState<IdentidadState>((s) => ({ ...s, semana: { ...s.semana, cargas: (s.semana.cargas ?? 0) + 1 } }));
      }
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

    // Un resultado cambia su forma como la de cualquier jugador.
    [SHARED_EVENTS.COMPETITION_RESULT]: (ctx, ev) => {
      const r = ev.data as CompetitionResultData;
      const f = ctx.stat(GEN.forma);
      ctx.addStat(GEN.forma, formaTrasUnaCompeticion(f, valoracionDelPuesto(r.position, r.total)) - f);
    },

    [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
      const antes = ctx.state<IdentidadState>();
      // Su forma y sus lesiones: las mismas reglas que las de los demás jugadores (la condición es su energía; la carga, sus sesiones y competiciones).
      const week = (ev.data as { week: number }).week;
      const forma = ctx.stat(GEN.forma);
      const eficiencia = eficienciaDeEstado({ fisica: ctx.stat(GEN.energia), moral: ctx.stat(GEN.motivacion), forma, salud: ctx.stat(GEN.salud) });
      ctx.addStat(GEN.forma, formaTrasLaSemana(forma, eficiencia) - forma);
      const baja = ctx.stat(GEN.baja);
      if (baja > 0) {
        ctx.addStat(GEN.baja, -1);
        if (baja <= 1) ctx.log('Ya estás recuperado de la lesión.', 'info');
      } else {
        const fatiga = fatigaDeLaSemana(ctx.stat(GEN.energia), antes.semana.cargas ?? 0);
        if (rngEstable('lesion', antes.semilla ?? 0, 'personaje', week).next() < riesgoDeLesion(fatiga, ctx.stat(GEN.constitucion))) {
          const g = gravedadDeLesion(rngEstable('gravedad', antes.semilla ?? 0, 'personaje', week).next());
          ctx.addStat(GEN.baja, g.baja);
          ctx.addStat(GEN.salud, Math.min(0, g.salud - ctx.stat(GEN.salud)));
          ctx.log(`Te has lesionado: ${g.baja} ${g.baja === 1 ? 'semana' : 'semanas'} de baja (sin entrenar con el club ni competir).`, 'aviso');
        }
      }
      const sana = antes.semana.activo >= 120 && antes.semana.descanso >= 50 * 60 && ctx.stat(GEN.estres) < 60;
      const despues = actualizarCuerpo(antes, ctx.time.day);
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
      if (edad > Math.floor(edadDecimal(s, day))) {
        ctx.log(`¡Cumples ${edad} años!`, 'logro');
        ctx.updateState<IdentidadState>((i) => ({ ...i, hc: conFotoDelCumple(i.hc, edad, i.musculo, i.grasa) }));
      }
      // El desarrollo físico sigue a la edad (con el adelanto o retraso propio): es el techo de lo físico. Lo alcanzable por edad en cada categoría
      // (`vigoresPorEdad`, en contracts) es la misma regla que sigue cualquier PNJ.
      const v = vigoresPorEdad(edadDecimal(s, day + 1), s.madurez);
      ctx.addStat(GEN.madurez, v.madurez - ctx.stat(GEN.madurez));
      const vigor: [string, number][] = [
        [GEN.vigorFisico, v.fisico],
        [GEN.vigorTecnico, v.tecnico],
        [GEN.vigorMental, v.mental],
        [GEN.vigorSocial, v.social],
      ];
      for (const [id, valor] of vigor) ctx.addStat(id, valor - ctx.stat(id));

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
    [SERVICES.perfil]: (ctx): ProfileService => ({ view: () => ctx.state<IdentidadState>().perfil }),
    [SERVICES.perks]: (ctx): PerksService => {
      const { perks } = ctx.state<IdentidadState>();
      const ver = (id: string): PerkView => {
        const d = perk(id)!;
        return { id, nombre: d.nombre, descripcion: d.descripcion, latente: d.latente };
      };
      return { view: () => ({ activos: perks.activos.map(ver), pool: perks.pool.map(ver) }) };
    },
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
