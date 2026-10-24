import {
  GEN,
  CORE_EVENTS,
  MINUTES_PER_DAY,
  SERVICES,
  anioNatural,
  edadDeCompeticion,
  primerDiaDelAnio,
  madurezPorEdad,
  heredarTope,
  perfilDePadre,
  repartirHerencia,
  practicaSegunTope,
  ventajaDeCrianza,
  type Practica,
  type RasgosDe,
  rasgosAlAzar,
  timeView,
  SHARED_EVENTS,
  TAGS,
  defineModule,
  type CompetitionResultData,
  type Rng,
  type Gender,
  type InitContext,
  type NpcDirectory,
  type NpcRole,
  type NpcView,
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

/** Padre o madre de un rival: de su tope sale el del niño y de lo que practicó, la ventaja con la que arranca. */
export interface PadreRival {
  nombre: string;
  /** Topes de sus capacidades físicas (los mismos ids que las del personaje). */
  topes: Record<string, number>;
  practica: Practica;
}

/** Capacidades físicas de las que hereda un rival: su tope de atletismo es la media de lo que toma de cada padre. */
const FISICAS = [GEN.velocidad, GEN.fuerza, GEN.resistencia, GEN.constitucion, GEN.agilidad, GEN.coordinacion];
const mediaDe = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
/** Aptitud propia para el atletismo (±15 %), igual que la de las habilidades del personaje. */
const APTITUD_ATLETISMO = 0.15;

export interface Npc {
  id: string;
  name: string;
  role: NpcRole;
  gender: Gender;
  tags: string[];
  supports: string[];
  levels: Record<string, number>;
  /** Origen, apariencia, carácter, intereses y gustos. */
  rasgos?: RasgosDe;
  /** Padres de los rivales (su herencia). */
  padres?: { padre: PadreRival; madre: PadreRival };
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
 * alguien que acaba de llegar, pero a ninguna edad igualan su potencial adulto. Los rivales solo juegan hasta los 19 años:
 * cuando haya rivales adultos, usarán la curva física por edad (`CURVAS_POR_EDAD`) como el jugador.
 */
export const desarrolloRival = (edad: number): number => 0.35 + 0.65 * madurezPorEdad(edad);

/**
 * Edad de competición de un NPC con fecha de nacimiento: año del curso menos año de nacimiento. Es la que decide su
 * categoría (no la edad exacta) y no cambia durante el curso. `primerDiaDelCurso` es el día en que empezó el curso.
 */
export const edadNpc = (n: Npc, primerDiaDelCurso: number): number | undefined =>
  n.nacimiento === undefined ? undefined : edadDeCompeticion(n.nacimiento, primerDiaDelCurso);

/**
 * Un rival de una edad dada. "Herencia": unos tienen más potencial y otros salen con ventaja o con otro ritmo de
 * desarrollo, pero a ninguna edad se alcanza el potencial: el techo es potencial × madurez de esa edad.
 */
function nuevoRival(rng: Rng, num: number, edad: number, day: number, usados: Set<string>): Npc {
  const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
  const name = nombreUnico(rng, gender, usados);
  const apellido = name.split(' ').slice(1).join(' ');
  const progenitor = (g: Gender): PadreRival => {
    // Los padres del resto del mundo recorren toda la escala de calidad: unos muy buenos, otros flojos.
    const { topes } = perfilDePadre(FISICAS, rng, rng.next());
    return { nombre: `${rng.pick(NOMBRES[g])} ${apellido}`, topes, practica: practicaSegunTope(mediaDe(Object.values(topes)), rng) };
  };
  const padres = { padre: progenitor('m'), madre: progenitor('f') };
  // Hereda como el personaje: la mitad de las capacidades físicas de cada padre (±20 %); su tope de atletismo es la media
  // más una aptitud propia. Lo que sus padres practicaron le da ventaja de partida.
  const reparto = repartirHerencia(FISICAS, rng);
  const heredadas = FISICAS.map((id) => heredarTope(padres[reparto[id]].topes[id], rng));
  const potencial = clamp(mediaDe(heredadas) * (1 + APTITUD_ATLETISMO * (rng.next() * 2 - 1)), 20, 95);
  const ventaja = ventajaDeCrianza(padres.padre.practica, padres.madre.practica);
  const desfase = clamp(rng.normal() * 0.7, -1.2, 1.2);
  // Nace en un día cualquiera del año que le corresponde a su edad de competición en el curso que empieza en `day`.
  const nacimiento = primerDiaDelAnio(anioNatural(day) - edad) + rng.int(0, 364);
  // Su nivel depende de su edad real (puede ser menor que la de competición si nació tarde dentro de su año).
  const techo = potencial * desarrolloRival((day - nacimiento) / 365 + desfase);
  return {
    id: `rival_${num}`,
    name,
    role: 'rival',
    gender,
    tags: ['atleta'],
    supports: [],
    levels: { atletismo: Math.min(techo, techo * rng.range(0.8, 1) * ventaja) },
    padres,
    rasgos: rasgosAlAzar(rng, { sesgoCaracter: { ambicion: 8, agresividad: 5, sacrificio: 8 }, interesesPreferidos: ['deporte', 'atletismo'] }),
    potential: { atletismo: potencial },
    ritmo: { atletismo: clamp(1 + rng.normal() * 0.22, 0.55, 1.5) },
    nacimiento,
    desfase,
    known: false,
    club: rng.pick(CLUBES_RIVALES),
    description: 'Compite en atletismo.',
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
    levels: {},
    potential: {},
    ...extra(gender),
    };
  };
  const o = (g: Gender, f: string, m: string) => (g === 'f' ? f : m);

  return [
    npc('entrenador', 'entrenador', () => ({
      rasgos: rasgosAlAzar(rng, { sesgoCaracter: { disciplina: 15, ambicion: 10, sacrificio: 8 }, interesesPreferidos: ['deporte', 'atletismo'] }),
      tags: ['atletismo', 'mentor'],
      supports: ['atletismo'],
      description: 'Entrena al grupo de atletismo del colegio.',
    })),
    npc('tutor', 'profesor', (g) => ({
      rasgos: rasgosAlAzar(rng, { sesgoCaracter: { disciplina: 15, honestidad: 10 }, interesesPreferidos: ['estudio', 'lectura'] }),
      tags: ['estudio', 'mentor'],
      supports: [TAGS.estudio],
      description: `${o(g, 'Tu tutora', 'Tu tutor')}. Exigente pero ${o(g, 'justa', 'justo')}.`,
    })),
    npc('companero_estudio', 'companero', (g) => ({
      rasgos: rasgosAlAzar(rng, { sesgoCaracter: { disciplina: 15, sociabilidad: -5 }, interesesPreferidos: ['estudio', 'tecnologia'] }),
      tags: ['estudio'],
      supports: [TAGS.estudio],
      description: `${o(g, 'Compañera de clase aplicada', 'Compañero de clase aplicado')}. Estudiar con ${o(g, 'ella', 'él')} cunde más.`,
    })),
    npc('companero_social', 'companero', () => ({
      rasgos: rasgosAlAzar(rng, { sesgoCaracter: { sociabilidad: 20, optimismo: 8 }, interesesPreferidos: ['videojuegos', 'cine', 'musica'] }),
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
  levels: n.levels,
  age: edadNpc(n, day),
  known: n.known,
  club: n.club,
  rasgos: n.rasgos,
  description: n.description,
});

export const npcs = defineModule<NpcsState>({
  id: 'npcs',
  name: 'Personas',
  description: 'La población: compañeros, tutores, entrenadores y rivales.',
  dependsOn: ['gen'],

  initState: (ctx) => ({ npcs: generarReparto(ctx) }),

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as { day: number };
      ctx.updateState<NpcsState>((s) => ({
        npcs: s.npcs.map((n) => {
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
          return { ...n, levels };
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
        // Competir contra alguien es conocerlo.
        npcs: s.npcs.map((n) => (n.role === 'rival' && r.participants.some((x) => x.npcId === n.id) ? { ...n, known: true } : n)),
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
