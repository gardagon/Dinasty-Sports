import {
  GEN,
  CORE_EVENTS,
  MINUTES_PER_DAY,
  SERVICES,
  anioNatural,
  edadDeCompeticion,
  primerDiaDelAnio,
  factorPorEdad,
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
  type PresentacionData,
  type Rng,
  type Gender,
  type InitContext,
  type NpcDirectory,
  type NpcRole,
  type NpcView,
  type ClubDirectory,
  type DatosDeAgenda,
  type PresenciaService,
  type SesionDeClub,
  type TipoAsignado,
  azarDe,
  construirAgenda,
  ubicacionEn,
  type TramoDeAgenda,
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
  /** Tipos de agenda: de ellos sale dónde está a cada hora (ver `contracts/agendas.ts`). */
  tipos?: TipoAsignado[];
  description?: string;
}

export interface NpcsState {
  npcs: Npc[];
}

const NOMBRES: Record<Gender, string[]> = {
  f: ['Lucía', 'Martina', 'Sofía', 'Valeria', 'Paula', 'Carla', 'Noa', 'Irene', 'Alba', 'Julia', 'Claudia', 'Elena', 'Ana', 'Marta', 'Laura', 'Nuria', 'Candela', 'Aitana', 'Lola', 'Abril', 'Daniela', 'Emma', 'Olivia', 'Vega', 'Marina', 'Inés', 'Leire', 'Rocío', 'Sara', 'Triana', 'Ariadna', 'Blanca', 'Cristina', 'Eva', 'Gala', 'Helena', 'Jimena', 'Lara', 'Mireia', 'Nerea', 'Pilar', 'Rebeca', 'Silvia', 'Yaiza'],
  m: ['Hugo', 'Mateo', 'Leo', 'Daniel', 'Álvaro', 'Pablo', 'Marcos', 'Adrián', 'Diego', 'Iván', 'Sergio', 'Carlos', 'Javier', 'Nacho', 'Rubén', 'Bruno', 'Gonzalo', 'Víctor', 'Óscar', 'Enzo', 'Aitor', 'Biel', 'Cristian', 'Dani', 'Eric', 'Fran', 'Gael', 'Héctor', 'Izan', 'Jorge', 'Luca', 'Manuel', 'Nico', 'Omar', 'Raúl', 'Saúl', 'Telmo', 'Unai', 'Xavi'],
};
const APELLIDOS = [
  'García', 'Martín', 'López', 'Sánchez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano',
  'Molina', 'Ortega', 'Delgado', 'Castro', 'Iglesias', 'Medina', 'Cortés', 'Rubio', 'Marín', 'Suárez', 'Peña', 'Herrera',
  'Aguilar', 'Blanco', 'Campos', 'Crespo', 'Díaz', 'Esteban', 'Fuentes', 'Giménez', 'Hidalgo', 'Ibáñez', 'Jiménez', 'Lozano',
  'Méndez', 'Nieto', 'Ortiz', 'Pascual', 'Quintana', 'Reyes', 'Santos', 'Tapia', 'Vega', 'Zamora',
];

/**
 * Población de rivales de atletismo: 8 por edad entre los 8 y los 19 años (16 por categoría de dos edades),
 * suficientes para clasificatorias, lesiones y rotaciones. Cada curso los mayores se van y entran niños nuevos.
 */
/** Clubes y colegios de los rivales: 12, de unos 8 rivales cada uno. Sedes, de momento, todas en el estadio. */
const CLUBES_RIVALES = [
  'Club Atletismo Ciudad', 'Club de Alto Rendimiento', // los dos del catálogo de clubes del personaje
  'colegio1', 'colegio2', 'colegio3', 'colegio4', 'club1', 'club2', 'club3', 'club4', 'club5', 'club6', // nombres provisionales
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
 * Parte de su potencial que un rival ha desarrollado a una edad: la misma curva física por edad que el jugador
 * (`CURVAS_POR_EDAD`) por 0,75, porque un rival típico no entrena a diario como el mejor jugador posible. Los rivales solo
 * juegan hasta los 19 años.
 */
export const desarrolloRival = (edad: number): number => 0.75 * factorPorEdad('fisico', edad);

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
  const rival: Npc = {
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
  // Vive y estudia fuera del mapa: solo coincide con el personaje en las sesiones de su club y en las carreras.
  rival.tipos = [{ tipo: 'rival', club: rival.club }];
  return rival;
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

/**
 * Población del colegio y del barrio (ver `docs/ANEXO_HORARIOS_PNJ.md`): 24 compañeros de tu clase (con los 2 del reparto),
 * otros 25 de la otra clase de tu curso, ~150 alumnos de los demás cursos, 11 profesores más (con el tutor son 12), un equipo
 * de atletismo del colegio de 16 alumnos y 80 vecinos de todas las edades. Todos son desconocidos hasta que se habla con ellos.
 */
const ALUMNOS_POR_AULA = 25;
const COMPANEROS_DE_CLASE = ALUMNOS_POR_AULA - 1;
const ALUMNOS_POR_CURSO_DE_FUERA = 17;
const EDAD_ALUMNO_MIN = 8;
/** A esta edad (de competición) se termina el colegio: 2.º de bachillerato es a los 17. */
const EDAD_FIN_COLEGIO = 18;
const VECINOS = 80;
const ASIGNATURAS_DE_PROFESORES = ['Lengua', 'Matemáticas', 'Inglés', 'Educación física', 'Ciencias', 'Ciencias sociales', 'Artística y música', 'Tecnología', 'Física y química', 'Filosofía', 'Historia'];
/** Posiciones (dentro de su grupo) de los alumnos que forman el equipo de atletismo del colegio: 4 + 4 + 8 = 16. */
const EQUIPO = { tuClase: [2, 7, 12, 18], otraClase: [1, 8, 15, 22], otrosCursos: [3, 22, 41, 60, 79, 98, 117, 136] };

/** Una persona sin más: desconocida, con edad y aspecto, sin nivel deportivo. */
function persona(rng: Rng, id: string, role: NpcRole, edad: number, dia: number, usados: Set<string>, tipos: TipoAsignado[], descripcion: (g: Gender) => string, tags: string[] = []): Npc {
  const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
  return {
    id,
    name: nombreUnico(rng, gender, usados),
    role,
    gender,
    tags,
    supports: [],
    levels: {},
    potential: {},
    rasgos: rasgosAlAzar(rng),
    nacimiento: primerDiaDelAnio(anioNatural(dia) - edad) + rng.int(0, 364),
    known: false,
    tipos,
    description: descripcion(gender),
  };
}

function poblarElColegio(rng: Rng, usados: Set<string>, existentes: number): Npc[] {
  const o = (g: Gender, f: string, m: string) => (g === 'f' ? f : m);
  const alumno = (id: string, edad: number, desc: (g: Gender) => string): Npc => persona(rng, id, 'companero', edad, 0, usados, [{ tipo: 'alumno' }], desc);
  const tuClase = Array.from({ length: COMPANEROS_DE_CLASE - existentes }, (_, i) => alumno(`clase_${i + 1}`, EDAD_ALUMNO_MIN, (g) => o(g, 'Compañera de tu clase.', 'Compañero de tu clase.')));
  const otraClase = Array.from({ length: ALUMNOS_POR_AULA }, (_, i) => alumno(`curso_${i + 1}`, EDAD_ALUMNO_MIN, (g) => o(g, 'Alumna de la otra clase de tu curso.', 'Alumno de la otra clase de tu curso.')));
  const otrosCursos: Npc[] = [];
  for (let edad = EDAD_ALUMNO_MIN + 1; edad < EDAD_FIN_COLEGIO; edad++) {
    for (let i = 0; i < ALUMNOS_POR_CURSO_DE_FUERA; i++) otrosCursos.push(alumno(`alumno_${otrosCursos.length + 1}`, edad, (g) => o(g, 'Alumna del colegio.', 'Alumno del colegio.')));
  }
  // El equipo de atletismo del colegio: alumnos de las distintas clases que van a las sesiones del club.
  const alEquipo = (grupo: Npc[], posiciones: number[]) => {
    for (const i of posiciones) {
      const n = grupo[i % grupo.length];
      n.tipos = [...(n.tipos ?? []), { tipo: 'club', club: 'colegio' }];
      n.tags = [...n.tags, 'equipo'];
      n.description = `${n.description?.replace(/\.$/, '')}. Del equipo de atletismo del colegio.`;
    }
  };
  alEquipo(tuClase, EQUIPO.tuClase);
  alEquipo(otraClase, EQUIPO.otraClase);
  alEquipo(otrosCursos, EQUIPO.otrosCursos);

  const profesores = ASIGNATURAS_DE_PROFESORES.map((materia, i) =>
    persona(rng, `profesor_${i + 1}`, 'profesor', rng.int(28, 60), 0, usados, [{ tipo: 'profesor' }], (g) => `${o(g, 'Profesora', 'Profesor')} de ${materia.toLowerCase()}.`, ['profesor']),
  );
  const vecinos = Array.from({ length: VECINOS }, (_, i) => {
    const r = rng.next();
    const edad = r < 0.15 ? rng.int(5, 12) : r < 0.25 ? rng.int(13, 17) : rng.int(18, 75);
    return persona(rng, `vecino_${i + 1}`, 'vecino', edad, 0, usados, [{ tipo: 'vecino' }], (g) => o(g, 'Vecina del barrio.', 'Vecino del barrio.'));
  });
  return [...tuClase, ...otraClase, ...otrosCursos, ...profesores, ...vecinos];
}

/** Nuevo curso: quien acaba el colegio se va y entra un niño de 8 años con los mismos tipos (así el equipo del colegio no se vacía). */
function renovarAlumnos(npcs: Npc[], dia: number, rng: Rng): Npc[] {
  const usados = new Set(npcs.map((n) => n.name));
  let num = npcs.reduce((m, n) => Math.max(m, Number(/^alumno_(\d+)$/.exec(n.id)?.[1] ?? 0)), 0) + 1;
  const sale = (n: Npc) => n.role === 'companero' && n.nacimiento !== undefined && (edadNpc(n, dia) ?? 0) >= EDAD_FIN_COLEGIO;
  const nuevos = npcs.filter(sale).map((viejo) =>
    persona(rng, `alumno_${num++}`, 'companero', EDAD_ALUMNO_MIN, dia, usados, viejo.tipos ?? [{ tipo: 'alumno' }], (g) => (g === 'f' ? 'Alumna del colegio.' : 'Alumno del colegio.'), viejo.tags.filter((t) => t === 'equipo')),
  );
  return [...npcs.filter((n) => !sale(n)), ...nuevos];
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
      tipos: [{ tipo: 'entrenador', club: 'colegio' }],
    })),
    npc('tutor', 'profesor', (g) => ({
      rasgos: rasgosAlAzar(rng, { sesgoCaracter: { disciplina: 15, honestidad: 10 }, interesesPreferidos: ['estudio', 'lectura'] }),
      tags: ['estudio', 'mentor'],
      supports: [TAGS.estudio],
      description: `${o(g, 'Tu tutora', 'Tu tutor')}. Exigente pero ${o(g, 'justa', 'justo')}.`,
      tipos: [{ tipo: 'profesor' }],
    })),
    npc('companero_estudio', 'companero', (g) => ({
      rasgos: rasgosAlAzar(rng, { sesgoCaracter: { disciplina: 15, sociabilidad: -5 }, interesesPreferidos: ['estudio', 'tecnologia'] }),
      tags: ['estudio'],
      supports: [TAGS.estudio],
      description: `${o(g, 'Compañera de clase aplicada', 'Compañero de clase aplicado')}. Estudiar con ${o(g, 'ella', 'él')} cunde más.`,
      tipos: [{ tipo: 'alumno' }],
    })),
    npc('companero_social', 'companero', () => ({
      rasgos: rasgosAlAzar(rng, { sesgoCaracter: { sociabilidad: 20, optimismo: 8 }, interesesPreferidos: ['videojuegos', 'cine', 'musica'] }),
      tags: ['social'],
      supports: [TAGS.social, TAGS.ocio],
      description: 'Conoce a todo el mundo en el colegio.',
      tipos: [{ tipo: 'alumno' }],
    })),
    ...rivalesIniciales(rng, usados),
  ];
}

/** El reparto base, los rivales y la población del colegio y del barrio. */
function generarTodos(ctx: InitContext): Npc[] {
  const base = generarReparto(ctx);
  return [...base, ...poblarElColegio(ctx.rng, new Set(base.map((n) => n.name)), base.filter((n) => n.role === 'companero').length)];
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

/** Sesiones de los clubes de fuera: se reparten en cuatro patrones según el nombre del club (todas las sedes, de momento, en el estadio). */
const PATRONES_DE_SESION: readonly Omit<SesionDeClub, 'sede'>[] = [
  { weekdays: [0, 2], desde: 17, hasta: 19 },
  { weekdays: [1, 3], desde: 18, hasta: 20 },
  { weekdays: [0, 1, 3], desde: 17, hasta: 20 },
  { weekdays: [2, 4], desde: 17, hasta: 19 },
];

/** Sesiones de un club: las del catálogo de clubes (por id o por nombre) y, si no está, las de un club de fuera. */
function sesionDeClub(clubes: ClubDirectory | undefined, club: string): SesionDeClub {
  const c = clubes?.list('atletismo').find((x) => x.id === club || x.nombre === club);
  if (c) return { weekdays: c.sesiones.weekdays, desde: c.sesiones.desde, hasta: c.sesiones.hasta, sede: c.esColegio ? 'colegio' : 'estadio' };
  return { ...PATRONES_DE_SESION[Math.floor(azarDe('sesion', club) * PATRONES_DE_SESION.length)], sede: 'estadio' };
}

/** Qué tipo de persona sale antes en una lista de «Gente aquí» a igualdad de nivel. */
const RELEVANCIA: Record<string, number> = { profesor: 6, entrenador: 6, amigo: 5, club: 4, rival: 3, alumno: 2, vecino: 1 };

/** Consultas del servicio `npcs` ya resueltas, por lista de personas (cambia cuando cambia la población) y filtro. */
const CONSULTAS = new WeakMap<Npc[], Map<string, NpcView[]>>();
const POR_ID = new WeakMap<Npc[], Map<string, Npc>>();

/** Una persona por su id sin recorrer la lista (se pregunta por muchas en cada acción). */
function personaPorId(lista: Npc[], id: string): Npc | undefined {
  let porId = POR_ID.get(lista);
  if (!porId) POR_ID.set(lista, (porId = new Map(lista.map((x) => [x.id, x]))));
  return porId.get(id);
}

const SIN_TIPOS: TipoAsignado[] = [];
/** La agenda depende solo de los tipos de la persona: se monta una vez por lista de tipos (los acontecimientos con fecha de fin no se guardan). */
const AGENDAS = new WeakMap<TipoAsignado[], TramoDeAgenda[]>();
/** Las personas con los mismos tipos comparten la misma agenda (el mismo objeto): así lo que se calcula para una vale para todas. */
const AGENDAS_COMPARTIDAS = new Map<string, TramoDeAgenda[]>();

function agendaDePersona(n: Npc, datos: DatosDeAgenda, dia: number): TramoDeAgenda[] {
  const tipos = n.tipos ?? SIN_TIPOS;
  if (tipos.some((x) => x.hasta !== undefined)) return construirAgenda(tipos, datos, dia);
  let a = AGENDAS.get(tipos);
  if (!a) {
    const clave = JSON.stringify(tipos);
    let compartida = AGENDAS_COMPARTIDAS.get(clave);
    if (!compartida) AGENDAS_COMPARTIDAS.set(clave, (compartida = construirAgenda(tipos, datos, dia)));
    AGENDAS.set(tipos, (a = compartida));
  }
  return a;
}

/** Minutos del día en que algún tramo de alguna agenda empieza o acaba (en orden). Cambia solo cuando cambia la lista de personas. */
const LIMITES = new WeakMap<Npc[], number[]>();

function limitesDeTramos(lista: Npc[], agendaDe: (n: Npc) => TramoDeAgenda[]): number[] {
  let l = LIMITES.get(lista);
  if (!l) {
    const set = new Set<number>();
    const vistas = new Set<TramoDeAgenda[]>();
    for (const n of lista) {
      const a = agendaDe(n);
      if (vistas.has(a)) continue;
      vistas.add(a);
      for (const x of a) {
        set.add(x.desde);
        set.add(x.hasta);
      }
    }
    LIMITES.set(lista, (l = [...set].sort((a, b) => a - b)));
  }
  return l;
}

interface EnLugar {
  n: Npc;
  nivel: number;
  tipo: string;
  /** Orden estable al azar dentro de su nivel; se calcula al ordenar el lugar, no para toda la población. */
  azar?: number;
}

/** Número de índices de presencia construidos: `PresenciaService.version`. */
let versionDeIndices = 0;

/**
 * Quién está en cada lugar entre dos cambios de tramo: se calcula una vez para toda la población y se reutiliza mientras no
 * cambie el intervalo ni la lista de personas. Cada lugar guarda sus personas ya ordenadas (a quien conoces primero, después el nivel, lo
 * que son y, por último, un orden estable al azar).
 */
const INDICES = new WeakMap<Npc[], { clave: string; version: number; lugares: Map<string, EnLugar[]>; ordenados: Set<string> }>();

function indiceDePresencia(lista: Npc[], clave: string, ubicar: (n: Npc) => { sitio: string | null; nivel: number; tipo: string }, dia: number) {
  let idx = INDICES.get(lista);
  if (!idx || idx.clave !== clave) {
    const lugares = new Map<string, EnLugar[]>();
    for (const n of lista) {
      const u = ubicar(n);
      if (u.sitio === null) continue;
      let l = lugares.get(u.sitio);
      if (!l) lugares.set(u.sitio, (l = []));
      l.push({ n, nivel: u.nivel, tipo: u.tipo });
    }
    INDICES.set(lista, (idx = { clave, version: ++versionDeIndices, lugares, ordenados: new Set() }));
  }
  const actual = idx;
  return {
    version: actual.version,
    en(lugar: string): EnLugar[] {
      const l = actual.lugares.get(lugar) ?? [];
      if (!actual.ordenados.has(lugar)) {
        actual.ordenados.add(lugar);
        for (const e of l) e.azar = azarDe(e.n.id, dia, 'orden');
        l.sort(
          (a, b) =>
            Number(b.n.known !== false) - Number(a.n.known !== false) || b.nivel - a.nivel || (RELEVANCIA[b.tipo] ?? 0) - (RELEVANCIA[a.tipo] ?? 0) || a.azar! - b.azar!,
        );
      }
      return l;
    },
  };
}

export const npcs = defineModule<NpcsState>({
  id: 'npcs',
  name: 'Personas',
  description: 'La población: compañeros, tutores, entrenadores y rivales.',
  dependsOn: ['gen'],

  initState: (ctx) => ({ npcs: generarTodos(ctx) }),

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
      ctx.updateState<NpcsState>((s) => ({ npcs: renovarAlumnos(renovarRivales(s.npcs, proximo.day, ctx.rng), proximo.day, ctx.rng) }));
    },

    [SHARED_EVENTS.PRESENTACION]: (ctx, ev) => {
      const { npcId } = ev.data as PresentacionData;
      const n = ctx.state<NpcsState>().npcs.find((x) => x.id === npcId);
      if (!n || n.known !== false) return;
      ctx.updateState<NpcsState>((s) => ({ npcs: s.npcs.map((x) => (x.id === npcId ? { ...x, known: true } : x)) }));
      ctx.log(`Se llama ${n.name}. ${n.description ?? ''}`.trim(), 'info');
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
    [SERVICES.presencia]: (ctx): PresenciaService => {
      const lista = ctx.state<NpcsState>().npcs;
      const t = ctx.time;
      const clubes = ctx.service<ClubDirectory>(SERVICES.clubes);
      const datos: DatosDeAgenda = { sesionDeClub: (club) => sesionDeClub(clubes, club) };
      const inicioCurso = (t.week - t.schoolWeek) * 7;
      const agendaDe = (n: Npc): TramoDeAgenda[] => agendaDePersona(n, datos, t.day);
      /**
       * Dónde está cada persona entre dos cambios de tramo de cualquier agenda: mientras no cambie ninguno, la presencia no cambia
       * (nadie aparece ni desaparece), así que se calcula una vez por intervalo (unas 10 veces al día) y no cada pocos minutos.
       */
      const intervalo = limitesDeTramos(lista, agendaDe).filter((m) => m <= t.minuteOfDay).length;
      const indice = indiceDePresencia(lista, `${t.day}:${intervalo}`, (n) => ubicacionEn(agendaDe(n), t, n.id), t.day);
      return {
        version: indice.version,
        en: (lugar, max = Infinity) => indice.en(lugar).slice(0, max).map((e) => vista(e.n, inicioCurso)),
        donde: (id) => {
          const n = personaPorId(lista, id);
          return n ? ubicacionEn(agendaDe(n), t, n.id).sitio : undefined;
        },
        agenda: (id) => {
          const n = personaPorId(lista, id);
          return n ? agendaDe(n) : [];
        },
      };
    },
    [SERVICES.npcs]: (ctx): NpcDirectory => {
      const lista = ctx.state<NpcsState>().npcs;
      // Edad de temporada: la de cada rival el primer día del curso, que es la que decide su categoría.
      const inicioCurso = (ctx.time.week - ctx.time.schoolWeek) * 7;
      return {
        list: (f) => {
          // Las consultas se repiten en cada acción: se resuelven una vez por lista de personas, curso y filtro.
          const clave = `${inicioCurso}|${f?.role ?? ''}|${f?.tag ?? ''}|${f?.minAge ?? ''}|${f?.maxAge ?? ''}|${f?.known ?? ''}`;
          let porFiltro = CONSULTAS.get(lista);
          if (!porFiltro) CONSULTAS.set(lista, (porFiltro = new Map()));
          let vistas = porFiltro.get(clave);
          if (!vistas) {
            vistas = lista
              .filter((n) => {
                if (f?.role && n.role !== f.role) return false;
                if (f?.known !== undefined && (n.known !== false) !== f.known) return false;
                if (f?.tag && !n.tags.includes(f.tag)) return false;
                if (f?.minAge !== undefined || f?.maxAge !== undefined) {
                  const edad = edadNpc(n, inicioCurso);
                  if (edad === undefined || edad < (f.minAge ?? 0) || edad > (f.maxAge ?? 200)) return false;
                }
                return true;
              })
              .map((n) => vista(n, inicioCurso));
            porFiltro.set(clave, vistas);
          }
          // Quien llama puede ordenar o modificar lo que recibe: se le da una copia.
          return [...vistas];
        },
        get: (id) => {
          const n = personaPorId(lista, id);
          return n ? vista(n, inicioCurso) : undefined;
        },
      };
    },
  },
});

export default npcs;
