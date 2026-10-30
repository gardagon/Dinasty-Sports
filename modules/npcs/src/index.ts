import {
  GEN,
  CORE_EVENTS,
  MINUTES_PER_DAY,
  SERVICES,
  anioNatural,
  edadDeCompeticion,
  primerDiaDelAnio,
  factorPorEdad,
  INTERESES,
  apellidosDePadres,
  COLEGIO_DEL_PERSONAJE,
  EDAD_DE_COLEGIO,
  colegioDeFuera,
  alturaDe,
  estaturaZ,
  edadCumplida,
  LETRA_DE_TU_CLASE,
  letraDeClaseDe,
  nombreDeClase,
  cumpleaños,
  nacimientoDeProgenitor,
  nacimientoParaEdad,
  edadAdultaDe,
  oficioDeVecino,
  oficioDeProgenitor,
  oficioDeProgenitorAlAzar,
  type DatoPersonal,
  type DatoPersonalData,
  nombreCompletoDeProgenitor,
  nombreDeProgenitor,
  padresDeSemilla,
  identidadAlAzar,
  identidadDeHijo,
  apodoAlAzar,
  apodoDeId,
  nombreCompleto,
  nombreCortoDe,
  nombrePermitido,
  registrarNombre,
  origenHeredado,
  type Identidad,
  type OrigenFamiliar,
  paisPorId,
  type PaisDef,
  type RegistroDeNombres,
  diferenciasDeEdad,
  relacionDeHermano,
  numeroDeHermanos,
  rasgosHeredadosNpc,
  heredarTope,
  perfilDePadre,
  repartirHerencia,
  practicaSegunTope,
  ventajaDeCrianza,
  efectosDe,
  heredarPerks,
  perksDePadre,
  rngEstable,
  type PerksDe,
  type FamilyService,
  type Practica,
  type RasgosDe,
  rasgosAlAzar,
  gustosDe,
  timeView,
  SHARED_EVENTS,
  type DeporteAnadidoData,
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
  type ClassAttendedData,
  type ClubJoinData,
  type IdentityService,
  type DatosDeAgenda,
  COLEGIOS_DE_FUERA,
  aptitudDe,
  datosDeDeporte,
  fichasDeDeporte,
  type EquipoDeDeporte,
  type FichaDeDeporte,
  type PoblacionDeDeporte,
  type ReadContext,
  type PresenciaService,
  type SesionDeClub,
  type TipoAsignado,
  azarDe,
  construirAgenda,
  ubicacionEn,
  type TramoDeAgenda,
} from '@ds/contracts';
import {
  aficionadoPorLosPadres,
  desarrolloRival,
  geneticaDeHermano,
  geneticaDeNino,
  interesPor,
  nivelEn,
  plazasPorEdad,
  potencialEn,
  ritmoEn,
  formaEn,
  type Genetica,
} from './deportistas';

/**
 * MÓDULO NPCs (id `npcs`).
 *
 * Los NPCs dan profundidad al personaje y son la red que une módulos:
 * - Ayudan según lo que saben hacer (carácter, intereses y nivel), no por una etiqueta fija: ver `aptitudDe`.
 * - `levels`: nivel por disciplina; los rivales progresan solos cada día.
 * - Escuchan `competicion.resultado` (evento compartido) de cualquier deporte.
 * - Publican el servicio `npcs` para que otros módulos los consulten.
 */

const mediaDe = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
export interface Npc {
  id: string;
  /** Nombre completo. */
  name: string;
  /** Nombre de pila (compuesto o no) y apodo, si tiene (al azar o puesto por el jugador). */
  nombrePila?: string;
  apodo?: string;
  role: NpcRole;
  gender: Gender;
  tags: string[];
  levels: Record<string, number>;
  /** Origen, apariencia, carácter, intereses y gustos. */
  rasgos?: RasgosDe;
  /** Lo que heredó de sus padres (topes, perks, ventaja de crianza y lo que ellos practicaron): lo tienen los niños, y de ahí sale qué deporte les encaja. */
  genetica?: Genetica;
  /** Colegio al que va si no es el del personaje: uno de `COLEGIOS_DE_FUERA` o `ninguno` (ya no va al colegio). Ausente: el del personaje (si es alumno) o el que le da `colegioDeFuera`. */
  colegio?: string;
  /** Equipo o club de su deporte en el que juega (id del club) y deportes que ha dejado (para que no lo vuelvan a reclutar). */
  equipo?: string;
  dejado?: string[];
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
  /** Entrenadores: edades de los deportistas a los que entrenan. */
  edades?: [number, number];
  /** Puntuación típica de estatura (hermanos y padres, que la heredan); el resto la saca de un hash de su id (`estaturaZ`). */
  estatura?: number;
  /** Perks (rasgos genéticos especiales) de rivales y hermanos: se les asignan al crearlos; no se enseñan (revelarlos es cosa de los eventos o de un personaje muy perspicaz). */
  perks?: PerksDe;
  /** Padres: índice de su profesión (`OFICIOS_DE_PADRES`), según la semilla de la partida. */
  oficio?: number;
  /** Lo que el personaje ha averiguado preguntando (se suma a lo que sabe por defecto). */
  aprendido?: DatoPersonal[];
  /** Tipos de agenda: de ellos sale dónde está a cada hora (ver `contracts/agendas.ts`). */
  tipos?: TipoAsignado[];
  /** Deporte que practica (deportistas) o al que se dedica (entrenadores): su id. Ausente = ninguno (los niños que no han sido reclutados). */
  deporte?: string;
  /** Entrenadores: a qué se dedican («de atletismo») y dónde trabajan, guardados con ellos para no depender del módulo del deporte. */
  dedicacion?: string;
  trabajo?: string;
  description?: string;
}

/** Un equipo o club con su plantilla ya sorteada y su nombre y calidad resueltos con los datos del país. */
export interface EquipoGuardado extends EquipoDeDeporte {
  nombre: string;
  calidad: 1 | 2 | 3;
  /** Cuántos niños tiene aproximadamente (sorteado entre su plantilla mínima y máxima al crear la partida). */
  objetivo: number;
}

/**
 * Lo que un deporte pidió de la gente, guardado con la partida: con ello `npcs` sigue reclutando y renovando a los niños de ese deporte cada curso aunque el
 * módulo del deporte ya no esté cargado (plan de deportes §5).
 */
export interface PoblacionGuardada extends Omit<PoblacionDeDeporte, 'equipos'> {
  deporte: string;
  /** Nombre del deporte en minúscula para los textos («atletismo»). */
  nombre: string;
  /** ¿Es el primer deporte de la partida? Sus entrenadores llevan los ids de siempre (`entrenador`, `entrenador_<club>_N`). */
  primero: boolean;
  equipos: EquipoGuardado[];
  /** Cómo se llaman sus clubes (id → nombre del sitio donde trabajan), para decir dónde trabajan los entrenadores. */
  nombresDeClub: Record<string, string>;
}

export interface NpcsState {
  npcs: Npc[];
  /** Lo que ha pedido cada deporte de la partida, en orden. Ausente en partidas anteriores. */
  poblaciones?: PoblacionGuardada[];
  /** Semilla de la partida: de ella salen los niños de otros colegios que los clubes pueden reclutar. */
  semilla?: number;
}

/**
 * La gente de un deporte la pide cada deporte como dato (`PoblacionDeDeporte`, en sus datos por país) y `npcs` la guarda con la partida
 * (`PoblacionGuardada`). Los niños se crean con su genética y sus gustos y los clubes y equipos de cada deporte reclutan a los que mejor encajan (ver
 * `reclutarDeportistas`). Un deportista lleva su deporte (`Npc.deporte`) y el equipo en el que juega (`Npc.equipo`).
 */

/**
 * El país de la partida mientras se genera la gente (sus orígenes siguen la demografía del país y sus nombres, su cultura). Las funciones de
 * generación solo reciben el azar, así que el país se fija en la entrada (`conPais`) y se restablece al salir.
 */
let PAIS_GENERANDO: PaisDef = paisPorId('espana');
function conPais<T>(pais: PaisDef, hacer: () => T): T {
  const antes = PAIS_GENERANDO;
  PAIS_GENERANDO = pais;
  try {
    return hacer();
  } finally {
    PAIS_GENERANDO = antes;
  }
}
const rasgosDeAqui = (rng: Rng, opciones: Parameters<typeof rasgosAlAzar>[1] = {}): RasgosDe => rasgosAlAzar(rng, { ...opciones, demografia: PAIS_GENERANDO.demografia });

const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

/**
 * La identidad de una persona nueva según su origen, sin repetir a nadie del mundo: se permiten dos homónimos como mucho y de «momentos» distintos
 * (15 años o más de diferencia de nacimiento: el hijo se puede llamar como su padre, pero no hay dos «Nicolás Sánchez» en el mismo colegio).
 */
function nombreUnico(rng: Rng, g: Gender, origen: OrigenFamiliar, edad: number, nacimiento: number, usados: RegistroDeNombres): { identidad: Identidad; completo: string; nombrePila: string; apodo?: string } {
  let identidad = identidadAlAzar(rng, g, origen, { edad, pais: PAIS_GENERANDO });
  for (let i = 0; i < 60 && !nombrePermitido(usados, nombreCompleto(identidad, g), nacimiento); i++) identidad = identidadAlAzar(rng, g, origen, { edad, pais: PAIS_GENERANDO });
  const completo = nombreCompleto(identidad, g);
  registrarNombre(usados, completo, nacimiento);
  return { identidad, completo, ...datosDeNombre(identidad, completo) };
}

/** El nombre de pila y el apodo al azar de una identidad (para guardarlos con la persona). */
const datosDeNombre = (identidad: Identidad, completo: string): { nombrePila: string; apodo?: string } => {
  const apodo = apodoAlAzar(completo, identidad.pila);
  return { nombrePila: identidad.pila, ...(apodo ? { apodo } : {}) };
};

/** El registro de nombres de lo que ya hay (para añadir gente nueva sin repetir). */
const registroDe = (npcs: readonly Npc[]): RegistroDeNombres => {
  const r: RegistroDeNombres = new Map();
  for (const n of npcs) registrarNombre(r, n.name, n.nacimiento ?? 0);
  return r;
};

export { desarrolloRival };

/**
 * Edad de competición de un NPC con fecha de nacimiento: año del curso menos año de nacimiento. Es la que decide su
 * categoría (no la edad exacta) y no cambia durante el curso. `primerDiaDelCurso` es el día en que empezó el curso.
 */
export const edadNpc = (n: Npc, primerDiaDelCurso: number): number | undefined =>
  n.nacimiento === undefined ? undefined : edadDeCompeticion(n.nacimiento, primerDiaDelCurso);

/**
 * Población del colegio y del barrio (ver `docs/ANEXO_HORARIOS_PNJ.md`): 24 compañeros de tu clase (con los 2 del reparto),
 * otros 25 de la otra clase de tu curso, ~150 alumnos de los demás cursos, 11 profesores más (con el tutor son 12), un equipo
 * de atletismo del colegio de 16 alumnos y 80 vecinos de todas las edades. Todos son desconocidos hasta que se habla con ellos.
 */
const ALUMNOS_POR_AULA = 25;
const COMPANEROS_DE_CLASE = ALUMNOS_POR_AULA - 1;
const ALUMNOS_POR_CURSO_DE_FUERA = 17;
/** Alumnos por curso de cada colegio de fuera, y de jóvenes de cada edad que ya no van al colegio (18 y 19 años). */
const ALUMNOS_POR_CURSO_DE_CADA_COLEGIO = 17;
const JOVENES_POR_EDAD = ALUMNOS_POR_CURSO_DE_CADA_COLEGIO * COLEGIOS_DE_FUERA.length;
/** A esta edad (de competición) los jóvenes de otros colegios dejan de formar parte del barrio. */
const EDAD_FIN_JOVENES = 20;
const descripcionDeOtroColegio = (g: Gender): string => (g === 'f' ? 'Alumna de otro colegio.' : 'Alumno de otro colegio.');
const EDAD_ALUMNO_MIN = 8;
/** A esta edad (de competición) se termina el colegio: 2.º de bachillerato es a los 17. */
const EDAD_FIN_COLEGIO = 18;
const VECINOS = 80;
/** Qué profesor da cada asignatura (número de `profesor_N`, por orden de `ASIGNATURAS_DE_PROFESORES`): al ir a su clase se presenta. */
const PROFESOR_DE_ASIGNATURA: Readonly<Record<string, number>> = {
  'estudios.lengua': 1, 'estudios.matematicas': 2, 'estudios.ingles': 3, 'estudios.educacion_fisica': 4,
  'estudios.naturales': 5, 'estudios.biologia': 5, 'estudios.sociales': 6, 'estudios.economia': 6,
  'estudios.artistica': 7, 'estudios.musica': 7, 'estudios.tecnologia': 8,
  'estudios.fisica_quimica': 9, 'estudios.fisica': 9, 'estudios.quimica': 9,
  'estudios.filosofia': 10, 'estudios.latin': 10,
  'estudios.historia': 11, 'estudios.historia_espana': 11, 'estudios.historia_arte': 11,
};
/** Las asignaturas (ids de las stats) que da un profesor (`profesor_N`), a partir de `PROFESOR_DE_ASIGNATURA`. */
const asignaturasDe = (id: string): string[] => {
  const numero = Number(/^profesor_(\d+)$/.exec(id)?.[1]);
  return numero ? Object.entries(PROFESOR_DE_ASIGNATURA).filter(([, n]) => n === numero).map(([stat]) => stat) : [];
};
const ASIGNATURAS_DE_PROFESORES = ['Lengua', 'Matemáticas', 'Inglés', 'Educación física', 'Ciencias', 'Ciencias sociales', 'Artística y música', 'Tecnología', 'Física y química', 'Filosofía', 'Historia'];

/**
 * Una persona sin más: desconocida, con edad y aspecto, sin nivel deportivo. Los niños (`conGenetica`) llevan además lo que heredaron de sus padres,
 * y de ello sale, con sus gustos, a qué deporte les encaja ser reclutados.
 */
function persona(rng: Rng, id: string, role: NpcRole, edad: number, dia: number, usados: RegistroDeNombres, tipos: TipoAsignado[], descripcion: (g: Gender) => string, tags: string[] = [], conGenetica = false): Npc {
  const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
  const gustos = rasgosDeAqui(rng);
  const nacimiento = primerDiaDelAnio(anioNatural(dia) - edad) + rng.int(0, 364);
  const nombre = nombreUnico(rng, gender, gustos.origen, edad, nacimiento, usados);
  const genetica = conGenetica ? geneticaDeNino(rng, id) : undefined;
  const rasgos = genetica ? aficionadoPorLosPadres(gustos, genetica.padres, rng) : gustos;
  return {
    id,
    name: nombre.completo,
    nombrePila: nombre.nombrePila,
    ...(nombre.apodo ? { apodo: nombre.apodo } : {}),
    role,
    gender,
    tags,
    levels: {},
    potential: {},
    rasgos,
    nacimiento,
    known: false,
    tipos,
    ...(genetica ? { genetica, perks: genetica.perks, desfase: genetica.desfase } : {}),
    description: descripcion(gender),
  };
}

function poblarElColegio(rng: Rng, usados: RegistroDeNombres, existentes: number): Npc[] {
  const o = (g: Gender, f: string, m: string) => (g === 'f' ? f : m);
  const alumno = (id: string, edad: number, desc: (g: Gender) => string, tuClase = false): Npc => persona(rng, id, 'companero', edad, 0, usados, [{ tipo: 'alumno', ...(tuClase ? { tuClase: true } : {}) }], desc, [], true);
  const tuClase = Array.from({ length: COMPANEROS_DE_CLASE - existentes }, (_, i) => alumno(`clase_${i + 1}`, EDAD_ALUMNO_MIN, (g) => o(g, 'Compañera de tu clase.', 'Compañero de tu clase.'), true));
  const otraClase = Array.from({ length: ALUMNOS_POR_AULA }, (_, i) => alumno(`curso_${i + 1}`, EDAD_ALUMNO_MIN, (g) => o(g, 'Alumna de la otra clase de tu curso.', 'Alumno de la otra clase de tu curso.')));
  const otrosCursos: Npc[] = [];
  for (let edad = EDAD_ALUMNO_MIN + 1; edad < EDAD_FIN_COLEGIO; edad++) {
    for (let i = 0; i < ALUMNOS_POR_CURSO_DE_FUERA; i++) otrosCursos.push(alumno(`alumno_${otrosCursos.length + 1}`, edad, (g) => o(g, 'Alumna del colegio.', 'Alumno del colegio.')));
  }
  const profesores = ASIGNATURAS_DE_PROFESORES.map((materia, i) =>
    persona(rng, `profesor_${i + 1}`, 'profesor', rng.int(28, 60), 0, usados, [{ tipo: 'profesor' }], (g) => `${o(g, 'Profesora', 'Profesor')} de ${materia.toLowerCase()}.`, ['profesor']),
  );
  const vecinos = Array.from({ length: VECINOS }, (_, i) => {
    const r = rng.next();
    const edad = r < 0.15 ? rng.int(5, 12) : r < 0.25 ? rng.int(13, 17) : rng.int(18, 75);
    const id = `vecino_${i + 1}`;
    // Los niños del barrio van a un colegio de fuera: también pueden ser reclutados por un club.
    const nino = edad < EDAD_FIN_COLEGIO;
    const vecino = persona(rng, id, 'vecino', edad, 0, usados, [{ tipo: 'vecino' }], (g) => o(g, 'Vecina del barrio.', 'Vecino del barrio.'), [], nino);
    return nino ? { ...vecino, colegio: colegioDeFuera(id) } : vecino;
  });
  return [...tuClase, ...otraClase, ...otrosCursos, ...profesores, ...vecinos, ...ninosDeOtrosColegios(rng, usados, 0, 1)];
}

/**
 * Los niños de otros colegios, a todos: personas del barrio con su genética (`nino_N`), jueguen o no a algún deporte. Al crear la partida, de 8 años a los
 * que ya terminaron el colegio (18 y 19 años, sin colegio); cada curso, solo los que entran con 8 años. `desde` es el número del primero.
 */
function ninosDeOtrosColegios(rng: Rng, usados: RegistroDeNombres, dia: number, desde: number, soloEntrantes = false): Npc[] {
  const lista: Npc[] = [];
  const nino = (colegio: string, edad: number): void => {
    lista.push({ ...persona(rng, `nino_${desde + lista.length}`, 'vecino', edad, dia, usados, [{ tipo: 'vecino' }], descripcionDeOtroColegio, [], true), colegio });
  };
  for (const colegio of COLEGIOS_DE_FUERA) {
    for (let edad = EDAD_ALUMNO_MIN; edad < (soloEntrantes ? EDAD_ALUMNO_MIN + 1 : EDAD_FIN_COLEGIO); edad++) {
      for (let i = 0; i < ALUMNOS_POR_CURSO_DE_CADA_COLEGIO; i++) nino(colegio, edad);
    }
  }
  if (!soloEntrantes) {
    for (let edad = EDAD_FIN_COLEGIO; edad < EDAD_FIN_JOVENES; edad++) for (let i = 0; i < JOVENES_POR_EDAD; i++) nino('ninguno', edad);
  }
  return lista;
}

/**
 * Nuevo curso: quien acaba el colegio se va y entra un niño de 8 años (con su genética y sin deporte: los equipos reclutan después). Los niños de otros
 * colegios hacen lo mismo: los que acaban el colegio pasan a no tener colegio, los que cumplen 20 años salen del barrio y cada colegio recibe sus nuevos alumnos.
 */
function renovarAlumnos(npcs: Npc[], dia: number, rng: Rng): Npc[] {
  const usados = registroDe(npcs);
  let num = npcs.reduce((m, n) => Math.max(m, Number(/^alumno_(\d+)$/.exec(n.id)?.[1] ?? 0)), 0) + 1;
  const sale = (n: Npc) => n.role === 'companero' && n.nacimiento !== undefined && (edadNpc(n, dia) ?? 0) >= EDAD_FIN_COLEGIO;
  const esDeFuera = (n: Npc) => /^nino_\d+$/.test(n.id);
  const seVa = (n: Npc) => esDeFuera(n) && (edadNpc(n, dia) ?? 0) >= EDAD_FIN_JOVENES;
  const nuevos = npcs.filter(sale).map((viejo) =>
    persona(rng, `alumno_${num++}`, 'companero', EDAD_ALUMNO_MIN, dia, usados, (viejo.tipos ?? [{ tipo: 'alumno' }]).filter((t) => t.tipo === 'alumno'), (g) => (g === 'f' ? 'Alumna del colegio.' : 'Alumno del colegio.'), [], true)
  );
  const desde = npcs.reduce((m, n) => Math.max(m, Number(/^nino_(\d+)$/.exec(n.id)?.[1] ?? 0)), 0) + 1;
  const quedan = npcs.filter((n) => !sale(n) && !seVa(n)).map((n) => (esDeFuera(n) && n.colegio !== 'ninguno' && (edadNpc(n, dia) ?? 0) >= EDAD_FIN_COLEGIO ? { ...n, colegio: 'ninguno' } : n));
  return [...quedan, ...nuevos, ...ninosDeOtrosColegios(rng, usados, dia, desde, true)];
}

/** Edad a la que empieza el personaje y desde la que se compite (el primer curso del juego). */
const EDAD_DE_INICIO = 8;
/**
 * El padre y la madre como personas con las que relacionarse (rol `familia`, etiqueta `progenitor`): el mismo nombre y los mismos rasgos
 * que en el módulo `familia`, que los saca de la semilla. Viven en casa y salen a trabajar. No llevan edad aquí (la ficha está en `familia`).
 */
function progenitores(ctx: InitContext, usados: RegistroDeNombres): Npc[] {
  return (['padre', 'madre'] as const).map((id) => {
    const gender: Gender = id === 'padre' ? 'm' : 'f';
    // Su nombre y apellidos salen de su origen y de la semilla (los hijos llevan el primer apellido de cada uno).
    const name = nombreCompletoDeProgenitor(ctx.seed, id, ctx.pais);
    registrarNombre(usados, name, nacimientoDeProgenitor(ctx.seed, id));
    const nombrePila = nombreDeProgenitor(ctx.seed, id, ctx.pais);
    const apodo = apodoAlAzar(name, nombrePila);
    return {
      id,
      name,
      nombrePila,
      ...(apodo ? { apodo } : {}),
      role: 'familia' as NpcRole,
      gender,
      tags: ['progenitor'],
      levels: {},
      potential: {},
      // Misma fecha de nacimiento y misma estatura que en el módulo `familia` (salen de la semilla y de la herencia).
      nacimiento: nacimientoDeProgenitor(ctx.seed, id),
      estatura: ctx.herencia('estatura')[id],
      rasgos: ctx.rasgosDePadres[id],
      tipos: [{ tipo: 'progenitor' as const }],
      oficio: oficioDeProgenitorAlAzar(ctx.seed, id),
      description: id === 'padre' ? 'Tu padre. Vive en casa.' : 'Tu madre. Vive en casa.',
    };
  });
}

/** Edad de los hermanos a la que empiezan el colegio (a los 18 lo terminan, como el resto del alumnado). */
const EDAD_COLEGIO_HERMANOS = 3;
/** Los tipos de agenda de un hermano: va al colegio si tiene edad y, si practica un deporte, compite en su jornada (y sigue los tipos de su club). */
const tiposDeHermano = (edad: number, deporte: string | undefined, otros: readonly TipoAsignado[] = []): TipoAsignado[] => [
  { tipo: 'hermano', ...(edad < 8 ? { duerme: true } : {}), ...(edad >= EDAD_COLEGIO_HERMANOS && edad < EDAD_FIN_COLEGIO ? { escolar: true } : {}), ...(deporte ? { deporte } : {}) },
  ...otros.filter((t) => t.tipo !== 'hermano'),
];

/** Cada curso, los hermanos que cumplen la edad del colegio entran y los que acaban salen (los tipos de su deporte y su club se conservan). */
function actualizarHermanos(npcs: Npc[], dia: number): Npc[] {
  return npcs.map((n) => {
    if (!n.tags.includes('hermano')) return n;
    const tipos = tiposDeHermano(edadNpc(n, dia) ?? EDAD_DE_INICIO, n.deporte, n.tipos ?? []);
    return JSON.stringify(tipos) === JSON.stringify(n.tipos) ? n : { ...n, tipos };
  });
}

/**
 * Los hermanos del personaje (0 a 3): hijos de los mismos padres, con el mismo proceso de herencia (la mitad de las capacidades físicas de cada padre
 * ±20 %, carácter e intereses heredados). Son niños como los demás del colegio: si les encaja un deporte, un club los recluta (ver `reclutarDeportistas`)
 * y compiten en el que les corresponda; los que aún no tienen 8 años pueden ser reclutados al cumplirlos.
 */
function hermanos(ctx: InitContext, usados: RegistroDeNombres): Npc[] {
  const { rng } = ctx;
  const padres = padresDeSemilla(ctx.seed, ctx.pais);
  const diferencias = diferenciasDeEdad(numeroDeHermanos(rng), rng);
  const rasgosPadre = ctx.rasgosDePadres.padre;
  const rasgosMadre = ctx.rasgosDePadres.madre;
  return diferencias.map((dif, i) => {
    const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
    const id = `hermano_${i + 1}`;
    // Hereda como el personaje: cada capacidad física de UN padre (la mitad de cada uno), con su tope ±20 %; sus perks, de los mismos padres (con un generador propio de cada hermano).
    const genetica = geneticaDeHermano(rng, ctx.topesDePadres, ctx.perksDePadres, rngEstable('perks', ctx.seed, id), ctx.seed, id);
    const edad = EDAD_DE_INICIO + dif;
    const nacimiento = primerDiaDelAnio(anioNatural(0) - edad) + rng.int(0, 364);
    const rasgos = rasgosHeredadosNpc(rasgosPadre, rasgosMadre, rng);
    // Su nombre sale del origen de sus padres y lleva el primer apellido de cada uno; puede llamarse como su padre o su madre (15 años de diferencia), no como otro niño.
    let identidad = identidadDeHijo(rng, gender, padres.padre.identidad, padres.madre.identidad, rasgos.origen, { edad, pais: PAIS_GENERANDO });
    for (let k = 0; k < 60 && !nombrePermitido(usados, nombreCompleto(identidad, gender), nacimiento); k++) identidad = identidadDeHijo(rng, gender, padres.padre.identidad, padres.madre.identidad, rasgos.origen, { edad, pais: PAIS_GENERANDO });
    const nombre = nombreCompleto(identidad, gender);
    registrarNombre(usados, nombre, nacimiento);
    const apodo = apodoAlAzar(nombre, identidad.pila);
    const relacion = relacionDeHermano(gender, dif);
    return {
      id,
      name: nombre,
      nombrePila: identidad.pila,
      ...(apodo ? { apodo } : {}),
      role: 'familia' as NpcRole,
      gender,
      tags: ['hermano'],
      levels: {},
      potential: {},
      perks: genetica.perks,
      genetica,
      nacimiento,
      // Estatura: parecida a la de sus padres (media de los dos, algo atenuada) más una variación propia.
      estatura: (ctx.herencia('estatura').padre + ctx.herencia('estatura').madre) * 0.45 + estaturaZ(id) * 0.6,
      desfase: genetica.desfase,
      rasgos,
      tipos: tiposDeHermano(edad, undefined),
      description: `${relacion}. Vive en casa.`,
    };
  });
}

function generarReparto(ctx: InitContext, pob: PoblacionGuardada | undefined): Npc[] {
  const { rng } = ctx;
  const usados: RegistroDeNombres = new Map();
  /** `extra` puede ser una función del género para concordar la descripción. */
  const npc = (id: string, role: NpcRole, extra: (g: Gender) => Partial<Npc>, edad: number): Npc => {
    const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
    const extras = extra(gender);
    const nacimiento = nacimientoParaEdad(id, edad);
    const nombre = nombreUnico(rng, gender, extras.rasgos?.origen ?? [{ id: 'espana_centro', peso: 1 }], edad, nacimiento, usados);
    return {
    id,
    name: nombre.completo,
    nombrePila: nombre.nombrePila,
    ...(nombre.apodo ? { apodo: nombre.apodo } : {}),
    role,
    gender,
    tags: [],
    levels: {},
    potential: {},
    // Quien te rodea al empezar es desconocido: se conoce hablando con él o con ella (el entrenador, al apuntarte a su club).
    known: false,
    nacimiento,
    ...extras,
    };
  };
  const o = (g: Gender, f: string, m: string) => (g === 'f' ? f : m);

  return [
    ...(pob ? [nuevoEntrenador(rng, pob, usados, { id: 'entrenador', club: 'colegio', edades: [0, 99], edad: [28, 55], descripcion: pob.entrenadores.descripcionDelColegio })] : []),
    npc('tutor', 'profesor', (g) => ({
      rasgos: rasgosDeAqui(rng, { sesgoCaracter: { disciplina: 15, honestidad: 10 }, interesesPreferidos: ['estudio', 'lectura'] }),
      tags: ['estudio', 'mentor'],
      description: `${o(g, 'Tu tutora', 'Tu tutor')}. Exigente pero ${o(g, 'justa', 'justo')}.`,
      tipos: [{ tipo: 'profesor' }],
    }), edadAdultaDe('tutor', 28, 60)),
    npc('companero_estudio', 'companero', (g) => ({
      rasgos: rasgosDeAqui(rng, { sesgoCaracter: { disciplina: 15, sociabilidad: -5 }, interesesPreferidos: ['estudio', 'tecnologia'] }),
      tags: ['estudio'],
      description: `${o(g, 'Compañera de clase aplicada', 'Compañero de clase aplicado')}.`,
      tipos: [{ tipo: 'alumno', tuClase: true }],
    }), EDAD_ALUMNO_MIN),
    npc('companero_social', 'companero', () => ({
      rasgos: rasgosDeAqui(rng, { sesgoCaracter: { sociabilidad: 20, optimismo: 8 }, interesesPreferidos: ['videojuegos', 'cine', 'musica'] }),
      tags: ['social'],
      description: 'Conoce a todo el mundo en el colegio.',
      tipos: [{ tipo: 'alumno', tuClase: true }],
    }), EDAD_ALUMNO_MIN),
    ...progenitores(ctx, usados),
    ...hermanos(ctx, usados),
  ];
}

/**
 * Lo que pide un deporte de la gente, con los datos del país de la partida, para guardarlo: sus equipos con su nombre, su calidad y su plantilla ya sorteada
 * (entre el mínimo y el máximo, con un generador propio del equipo y la partida). `primero` es si es el primer deporte de la partida (sus entrenadores
 * llevan los ids de siempre).
 */
function poblacionDe(ctx: Pick<ReadContext, 'aportes' | 'pais'>, ficha: FichaDeDeporte, primero: boolean, semilla: number): PoblacionGuardada {
  const datos = datosDeDeporte(ctx, ficha.id);
  const nombresDeClub: Record<string, string> = Object.fromEntries(datos.clubes.map((c) => [c.id, c.esColegio ? COLEGIO_DEL_PERSONAJE : c.nombre]));
  const equipos: EquipoGuardado[] = datos.poblacion.equipos.map((e) => {
    const catalogo = datos.clubes.find((c) => c.id === e.club);
    return {
      ...e,
      nombre: e.nombre ?? catalogo?.nombre ?? e.club,
      calidad: e.calidad ?? catalogo?.calidad ?? (e.colegio ? 1 : 2),
      objetivo: rngEstable('plantilla', semilla, ficha.id, e.club).int(e.plantilla.min, e.plantilla.max),
    };
  });
  return JSON.parse(JSON.stringify({ ...datos.poblacion, equipos, deporte: ficha.id, nombre: ficha.nombre.toLowerCase(), primero, nombresDeClub }));
}

/** Lo que han pedido los deportes de la partida (en el orden de sus fichas). */
const poblacionesDe = (ctx: Pick<ReadContext, 'aportes' | 'pais'>, semilla: number): PoblacionGuardada[] => fichasDeDeporte(ctx).map((f, i) => poblacionDe(ctx, f, i === 0, semilla));

// ---------------------------------------------------------------------------------------------------- reclutamiento de deportistas

/** Las edades en las que recluta un equipo: las del deporte, acotadas por las suyas (un equipo de colegio solo llega a la edad en que acaba el colegio). */
const edadesDe = (pob: PoblacionGuardada, e: EquipoGuardado): number[] => {
  const min = Math.max(pob.reclutamiento.edades.min, e.edades?.min ?? 0);
  const max = Math.min(pob.reclutamiento.edades.max, e.edades?.max ?? (e.colegio ? EDAD_FIN_COLEGIO - 1 : Infinity));
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
};

/** Un niño al que un equipo puede mirar: una persona del mundo con genética que aún no juega a nada (ni lo ha dejado). */
interface Aspirante {
  npc: Npc;
  /** Su colegio: `propio` (el del personaje), uno de `COLEGIOS_DE_FUERA` o `ninguno` (ya no va al colegio). */
  colegio: string;
  /** Cuánto le interesa el deporte (0 a 3) y su potencial en él: lo que decide a quién recluta un equipo. */
  interes: number;
  potencial: number;
}

const colegioDeNino = (n: Npc): string => n.colegio ?? (delColegio(n) ? 'propio' : 'ninguno');

/** Los niños de una edad que un deporte puede reclutar: los del colegio del personaje, los de otros colegios, los hermanos y los jóvenes que ya no van al colegio. */
function aspirantesDeEdad(npcs: readonly Npc[], pob: PoblacionGuardada, edad: number, dia: number): Aspirante[] {
  const lista: Aspirante[] = [];
  for (const n of npcs) {
    if (!n.genetica || n.deporte !== undefined || n.dejado?.includes(pob.deporte) || edadNpc(n, dia) !== edad) continue;
    lista.push({ npc: n, colegio: colegioDeNino(n), interes: interesPor(n.rasgos, pob.deporte), potencial: potencialEn(n.id, n.genetica, pob) });
  }
  return lista;
}

/** Un equipo recluta a un niño: pasa a jugar al deporte en ese equipo, con su potencial, su ritmo y su nivel a esa edad, y sigue los tipos de agenda de su club. */
function reclutarA(a: Aspirante, e: EquipoGuardado, pob: PoblacionGuardada, edad: number, dia: number): Npc {
  const base = a.npc;
  const g = base.genetica!;
  const enSuColegio = e.colegio === 'propio';
  // Un niño de otro colegio pasa a ser un rival (juega en su club o en el equipo de su colegio); un compañero, un hermano o un niño del barrio sigue siendo quien es y además va a las sesiones de su club.
  const deFuera = base.role === 'vecino';
  const tipos: TipoAsignado[] = deFuera
    ? [{ tipo: 'rival', club: e.nombre, deporte: pob.deporte }]
    : [...(base.tipos ?? []).map((t) => (t.tipo === 'hermano' ? { ...t, deporte: pob.deporte } : t)), { tipo: 'club', club: e.club, deporte: pob.deporte }];
  return {
    ...base,
    ...(deFuera ? { role: 'rival' as NpcRole } : {}),
    deporte: pob.deporte,
    equipo: e.club,
    club: e.nombre,
    tags: [...base.tags, pob.etiqueta, ...(enSuColegio ? ['equipo'] : [])],
    levels: { ...base.levels, [pob.deporte]: nivelEn(base.id, g, a.potencial, (dia - base.nacimiento!) / 365, pob.deporte, dia) },
    potential: { ...base.potential, [pob.deporte]: a.potencial },
    ritmo: { ...base.ritmo, [pob.deporte]: ritmoEn(base.id, g, pob.deporte) },
    tipos,
    description: deFuera ? pob.descripcionDeRival : enSuColegio ? `${base.description?.replace(/\.$/, '')}. ${pob.descripcionDelEquipo}` : base.description,
  };
}

/**
 * Los equipos y clubes de un deporte completan sus plantillas. Cada equipo tiene un número de niños más o menos definido y reparte sus plazas entre las
 * edades que recluta; en cada edad, los equipos escogen por orden de calidad (los clubes de más nivel, primero) entre los niños que les corresponden: los
 * equipos de un colegio, solo entre sus alumnos; los clubes, entre los de cualquier colegio (puede pasar que un compañero del personaje vaya a un club de
 * fuera, pero nunca que un niño de otro colegio juegue en el equipo del colegio del personaje). Entre ellos se recluta primero a los interesados en el
 * deporte y, de ellos, a los de más potencial: así, entre tantos niños, de forma natural unos destacan sobre otros. Sirve para crear la partida, para
 * rellenar las plazas que quedan libres cada curso y para añadir un deporte a una partida empezada.
 */
export function reclutarDeportistas(npcs: Npc[], pob: PoblacionGuardada, dia: number, soloInteresados = false): Npc[] {
  const equipos = [...pob.equipos].sort((a, b) => b.calidad - a.calidad);
  const plazas = new Map(equipos.map((e) => [e.club, plazasPorEdad(e.club, e.objetivo, edadesDe(pob, e))]));
  const ocupadas = new Map<string, number>();
  // Cuántos le faltan a cada equipo para completar su plantilla (los niños envejecen y las plazas por edad ya no coinciden con quien hay: lo que cuenta es el total).
  const faltan = new Map(equipos.map((e) => [e.club, e.objetivo]));
  for (const n of npcs) {
    const edad = n.deporte === pob.deporte && n.equipo !== undefined ? edadNpc(n, dia) : undefined;
    if (edad === undefined) continue;
    ocupadas.set(`${n.equipo}|${edad}`, (ocupadas.get(`${n.equipo}|${edad}`) ?? 0) + 1);
    faltan.set(n.equipo!, (faltan.get(n.equipo!) ?? 0) - 1);
  }
  const cambios = new Map<string, Npc>();
  const tomados = new Set<string>();
  const orden = (x: Aspirante, y: Aspirante): number => y.potencial - x.potencial || (x.npc.id < y.npc.id ? -1 : 1);
  for (let edad = pob.reclutamiento.edades.min; edad <= pob.reclutamiento.edades.max; edad++) {
    // En cada edad, un equipo busca cubrir lo que le falta respecto a su reparto ideal por edades, sin pasar de lo que le falta en total.
    const huecos = equipos
      .map((e) => ({ e, falta: Math.min((plazas.get(e.club)?.get(edad) ?? 0) - (ocupadas.get(`${e.club}|${edad}`) ?? 0), faltan.get(e.club) ?? 0) }))
      .filter((h) => h.falta > 0);
    if (!huecos.length) continue;
    const pool = aspirantesDeEdad(npcs, pob, edad, dia);
    for (const { e, falta } of huecos) {
      const elegibles = pool.filter((a) => !tomados.has(a.npc.id) && (e.colegio === undefined || a.colegio === e.colegio));
      const elegidos = [...elegibles.filter((a) => a.interes > 0).sort(orden), ...(soloInteresados ? [] : elegibles.filter((a) => a.interes === 0).sort(orden))].slice(0, falta);
      faltan.set(e.club, (faltan.get(e.club) ?? 0) - elegidos.length);
      for (const a of elegidos) {
        tomados.add(a.npc.id);
        cambios.set(a.npc.id, reclutarA(a, e, pob, edad, dia));
      }
    }
  }
  return npcs.map((n) => cambios.get(n.id) ?? n);
}

/**
 * Los equipos de todos los deportes completan sus plantillas en dos vueltas: primero cada deporte recluta a los interesados en él y, solo después, los
 * que aún faltan se cubren con quien encaje (aunque no le interese). Así un niño al que le gusta un deporte no lo pierde porque otro deporte, que va antes,
 * tuviese plazas por cubrir.
 */
export function reclutarEnTodos(npcs: Npc[], pobs: readonly PoblacionGuardada[], dia: number): Npc[] {
  const interesados = pobs.reduce((lista, pob) => reclutarDeportistas(lista, pob, dia, true), npcs);
  return pobs.reduce((lista, pob) => reclutarDeportistas(lista, pob, dia), interesados);
}

/** Un niño deja el deporte (o se retira): ya no está en ningún equipo y, si lo dejó, no se le vuelve a reclutar para él. */
export function sinDeporte(n: Npc, pob: PoblacionGuardada, dejado: boolean): Npc {
  const { [pob.deporte]: _n, ...levels } = n.levels;
  const { [pob.deporte]: _p, ...potential } = n.potential;
  const ritmo = n.ritmo ? Object.fromEntries(Object.entries(n.ritmo).filter(([k]) => k !== pob.deporte)) : undefined;
  return {
    ...n,
    deporte: undefined,
    equipo: undefined,
    club: undefined,
    tags: n.tags.filter((t) => t !== pob.etiqueta && t !== 'equipo'),
    levels,
    potential,
    ritmo,
    // Un niño de otro colegio que deja de jugar vuelve a ser un niño del barrio.
    ...(n.role === 'rival'
      ? { role: 'vecino' as NpcRole, tipos: [{ tipo: 'vecino' as const }], description: descripcionDeOtroColegio(n.gender) }
      : { tipos: n.tipos?.filter((t) => !(t.tipo === 'club' && t.deporte === pob.deporte)).map((t) => (t.tipo === 'hermano' ? { ...t, deporte: undefined } : t)) }),
    ...(dejado ? { dejado: [...(n.dejado ?? []), pob.deporte] } : {}),
  };
}

/**
 * Nuevo curso: los que pasan la edad máxima del deporte se retiran, algún niño pequeño lo deja (con la probabilidad que pide el deporte) y los equipos
 * rellenan las plazas libres con otros niños que encajan. Los niños de otros colegios que se van desaparecen (los que lo dejaron no se vuelven a reclutar);
 * los compañeros, los hermanos y los niños del barrio siguen siendo quienes son, solo que sin deporte.
 */
function renovarDeportistas(npcs: Npc[], pobs: readonly PoblacionGuardada[], dia: number, rng: Rng): Npc[] {
  let lista = npcs;
  for (const pob of pobs) {
    const { edades, edadMaxBaja, probabilidadBaja } = pob.reclutamiento;
    lista = lista.flatMap((n) => {
      if (n.deporte !== pob.deporte || !n.genetica) return [n];
      const edad = edadNpc(n, dia) ?? 0;
      const retirado = edad > edades.max;
      const baja = !retirado && edad <= edadMaxBaja && rng.chance(probabilidadBaja);
      return retirado || baja ? [sinDeporte(n, pob, baja)] : [n];
    });
  }
  return reclutarEnTodos(lista, pobs, dia);
}

/**
 * Lo que trae un deporte que se añade a una partida empezada: su entrenador del colegio y los de sus clubes de fuera y el reclutamiento de sus equipos entre
 * los niños que ya hay (y los de otros colegios). La partida, al crearse, recluta en todos los deportes a la vez (`reclutarEnTodos`).
 */
export function añadirDeporte(npcs: Npc[], pob: PoblacionGuardada, dia: number, rng: Rng): Npc[] {
  return reclutarDeportistas([...npcs, ...entrenadoresDeUnDeporte(npcs, pob, rng)], pob, dia);
}

/** Los entrenadores de un deporte: el del colegio (el primer deporte ya trae el suyo) y los de los clubes de fuera. */
function entrenadoresDeUnDeporte(npcs: readonly Npc[], pob: PoblacionGuardada, rng: Rng): Npc[] {
  const usados = registroDe(npcs);
  return [...(pob.primero ? [] : [nuevoEntrenador(rng, pob, usados, { id: `entrenador_${pob.deporte}`, club: 'colegio', edades: [0, 99], edad: [28, 55], descripcion: pob.entrenadores.descripcionDelColegio })]), ...entrenadoresDeClubes(rng, pob, usados)];
}

/** El reparto base, la población del colegio y del barrio, los entrenadores y, al final, los niños que reclutan los deportes. */
function generarTodos(ctx: InitContext, pobs: readonly PoblacionGuardada[]): Npc[] {
  const base = generarReparto(ctx, pobs[0]);
  const usados = registroDe(base);
  const colegio = poblarElColegio(ctx.rng, usados, base.filter((n) => n.role === 'companero').length);
  const sin = [...base, ...colegio, ...bibliotecarios(ctx.rng, usados)];
  const conEntrenadores = pobs.reduce((lista, pob) => [...lista, ...entrenadoresDeUnDeporte(lista, pob, ctx.rng)], sin);
  return reclutarEnTodos(conEntrenadores, pobs, 0);
}

/** El personal de la biblioteca: uno en el turno de mañana (y los sábados) y otro en el de tarde. Van al final para no cambiar el azar de lo demás. */
function bibliotecarios(rng: Rng, usados: RegistroDeNombres): Npc[] {
  return (['manana', 'tarde'] as const).map((turno, i) =>
    persona(rng, `bibliotecario_${i + 1}`, 'vecino', rng.int(30, 60), 0, usados, [{ tipo: 'bibliotecario', turno }], (g) => `${g === 'f' ? 'Bibliotecaria' : 'Bibliotecario'} de la biblioteca municipal (turno de ${turno === 'manana' ? 'mañana' : 'tarde'}).`, ['bibliotecario']),
  );
}

/**
 * Un entrenador de un deporte (el del club del colegio o uno de los clubes de fuera): su carácter y sus intereses son los que pide el deporte, y lleva
 * guardado a qué se dedica y dónde trabaja (así no depende del módulo del deporte). Más adelante cada entrenador tendrá sus propias habilidades
 * (según su carácter, su conocimiento del deporte y sus capacidades), mejores en los clubes que en el colegio.
 */
function nuevoEntrenador(
  rng: Rng,
  pob: PoblacionGuardada,
  usados: RegistroDeNombres,
  e: { id: string; club: string; edades: readonly [number, number]; edad: readonly [number, number]; descripcion?: string },
): Npc {
  const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
  const rasgos = rasgosDeAqui(rng, { sesgoCaracter: pob.entrenadores.sesgoCaracter, interesesPreferidos: pob.entrenadores.interesesPreferidos });
  const edad = edadAdultaDe(e.id, e.edad[0], e.edad[1]);
  const nacimiento = nacimientoParaEdad(e.id, edad);
  const nombre = nombreUnico(rng, gender, rasgos.origen, edad, nacimiento, usados);
  const [min, max] = e.edades;
  return {
    id: e.id,
    name: nombre.completo,
    nombrePila: nombre.nombrePila,
    ...(nombre.apodo ? { apodo: nombre.apodo } : {}),
    role: 'entrenador',
    gender,
    tags: [pob.deporte, 'mentor'],
    levels: {},
    potential: {},
    rasgos,
    nacimiento,
    known: false,
    club: e.club,
    edades: [min, max],
    deporte: pob.deporte,
    dedicacion: pob.entrenadores.dedicacion,
    trabajo: pob.nombresDeClub[e.club],
    tipos: [{ tipo: 'entrenador', club: e.club, deporte: pob.deporte }],
    description: e.descripcion ?? `Entrena ${max >= 99 ? `a partir de ${min} años` : `de ${min} a ${max} años`} en el ${pob.nombresDeClub[e.club]}.`,
  };
}

/** Los entrenadores de los clubes de fuera del colegio: cada club tiene varios, cada uno con las categorías de unas edades (alguno lleva varias). El del colegio es `entrenador` (de todas las edades). */
const entrenadoresDeClubes = (rng: Rng, pob: PoblacionGuardada, usados: RegistroDeNombres): Npc[] =>
  pob.entrenadores.deFuera.flatMap(({ club, edades }) =>
    edades.map(([min, max], i) => nuevoEntrenador(rng, pob, usados, { id: `entrenador${pob.primero ? '' : `_${pob.deporte}`}_${club}_${i + 1}`, club, edades: [min, max], edad: [30, 55] })),
  );

/** ¿Es alumno del colegio del personaje? Los compañeros y los hermanos en edad escolar (el profesorado trabaja allí, no va). */
const delColegio = (n: Npc): boolean => !!n.tipos?.some((t) => t.tipo === 'alumno' || (t.tipo === 'hermano' && t.escolar));

/** Clubes con entrenadores propios en las partidas anteriores a guardar el lugar de trabajo con cada entrenador: cómo se llaman (para decir dónde trabajan). */
const NOMBRES_DE_CLUB: Readonly<Record<string, string>> = { colegio: COLEGIO_DEL_PERSONAJE, club_ciudad: 'Club Atletismo Ciudad', club_alto_rendimiento: 'Club de Alto Rendimiento' };

/**
 * A qué se dedica y dónde trabaja (los adultos): el profesorado y los entrenadores y los vecinos. `basica` es lo que se ve sin preguntar
 * («Profesor»): la asignatura o el deporte se saben al ir a su clase, al apuntarte a su club o preguntando.
 */
function ocupacionDe(n: Npc, edad: number | undefined): { profesion?: string; basica?: string; trabajo?: string } {
  const f = n.gender === 'f';
  if (n.role === 'profesor') {
    const numero = Number(/^profesor_(\d+)$/.exec(n.id)?.[1]);
    const materia = numero ? ASIGNATURAS_DE_PROFESORES[numero - 1] : undefined;
    return { profesion: materia ? `${f ? 'Profesora' : 'Profesor'} de ${materia.toLowerCase()}` : f ? 'Profesora y tutora' : 'Profesor y tutor', basica: f ? 'Profesora' : 'Profesor', trabajo: COLEGIO_DEL_PERSONAJE };
  }
  if (n.role === 'entrenador') return { profesion: `${f ? 'Entrenadora' : 'Entrenador'} ${n.dedicacion ?? 'de atletismo'}`, basica: f ? 'Entrenadora' : 'Entrenador', trabajo: n.trabajo ?? NOMBRES_DE_CLUB[n.club ?? 'colegio'] };
  if (n.tags.includes('bibliotecario')) return { profesion: f ? 'Bibliotecaria' : 'Bibliotecario', basica: f ? 'Bibliotecaria' : 'Bibliotecario', trabajo: 'Biblioteca municipal' };
  if (n.role === 'vecino' && edad !== undefined && edad >= 18) return oficioDeVecino(n.id, n.gender, edad);
  if (n.oficio !== undefined && n.tags.includes('progenitor')) {
    const o = oficioDeProgenitor(n.oficio, n.gender);
    return { profesion: o.profesion, basica: o.profesion, trabajo: o.trabajo };
  }
  return {};
}

/** A qué colegio va (si va a alguno): el del personaje o, en los rivales y los vecinos en edad escolar, uno de fuera. */
function colegioDe(n: Npc, edad: number | undefined): string | undefined {
  if (delColegio(n)) return COLEGIO_DEL_PERSONAJE;
  // Los niños reclutados de otros colegios y los del barrio llevan el suyo; los jóvenes que ya no van al colegio, ninguno.
  if (n.colegio === 'ninguno') return undefined;
  if (n.colegio) return n.colegio;
  if ((n.role === 'rival' || n.role === 'vecino') && edad !== undefined && edad >= EDAD_DE_COLEGIO.desde && edad <= EDAD_DE_COLEGIO.hasta) return colegioDeFuera(n.id);
  return undefined;
}

/**
 * A qué clase va, con su letra («3.ºA»; solo se enseña a quien es del mismo colegio y es alumno). Cada curso tiene dos clases: tú y tus
 * compañeros estáis en la A, la otra clase de tu curso es la B y los demás cursos se reparten entre A y B.
 */
function claseDe(n: Npc, edad: number | undefined): string | undefined {
  if (!delColegio(n) || edad === undefined) return undefined;
  const tuya = n.tipos?.some((t) => t.tuClase);
  const letra = tuya ? LETRA_DE_TU_CLASE : n.id.startsWith('curso_') ? 'B' : letraDeClaseDe(n.id);
  const nombre = nombreDeClase(edad, letra);
  return nombre && tuya ? `${nombre} (tu clase)` : nombre;
}

/** Lo que se sabe de alguien sin preguntarle: su edad y su colegio y clase si es de la familia; el colegio, si es del tuyo; la clase, si es de la tuya. */
function sabePorDefecto(n: Npc): DatoPersonal[] {
  // Tus padres: sabes cuántos años tienen y a qué se dedican y dónde trabajan.
  if (n.role === 'familia') return n.tags.includes('progenitor') ? ['edad', 'colegio', 'clase', 'profesion', 'trabajo'] : ['edad', 'colegio', 'clase'];
  // El profesorado y los entrenadores: se sabe dónde trabajan (no su asignatura o su deporte).
  if (n.role === 'profesor' || n.role === 'entrenador' || n.tags.includes('bibliotecario')) return ['trabajo'];
  const base: DatoPersonal[] = delColegio(n) ? ['colegio'] : [];
  return n.tipos?.some((t) => t.tuClase) ? [...base, 'clase'] : base;
}

/** Altura de hoy: padres y hermanos, de su herencia; el resto, de un hash de su id. */
function alturaHoy(n: Npc, hoy: number): number | undefined {
  if (n.nacimiento === undefined) return undefined;
  return alturaDe(n.gender, (hoy - n.nacimiento) / 365, n.estatura ?? estaturaZ(n.id));
}

/** La vista de cada persona se recuerda mientras no cambie la persona ni el día: se pide muchas veces (listas, presencia, acciones). */
const VISTAS = new WeakMap<Npc, { clave: string; vista: NpcView }>();
const vista = (n: Npc, day: number, hoy: number = day): NpcView => {
  const clave = `${day}|${hoy}`;
  const guardada = VISTAS.get(n);
  if (guardada?.clave === clave) return guardada.vista;
  const v = construirVista(n, day, hoy);
  VISTAS.set(n, { clave, vista: v });
  return v;
};

/**
 * Lo que se cuenta de una persona. Para un hermano se calcula (no se usa lo guardado): si es mayor o menor sale de los años de nacimiento
 * respecto a los del personaje, que empieza con `EDAD_DE_INICIO`. Así vale también para las partidas guardadas con el texto al revés.
 */
const descripcionDe = (n: Npc): string | undefined =>
  n.tags.includes('hermano') && n.nacimiento !== undefined
    ? `${relacionDeHermano(n.gender, anioNatural(0) - EDAD_DE_INICIO - anioNatural(n.nacimiento))}. Vive en casa.`
    : n.description;

const construirVista = (n: Npc, day: number, hoy: number): NpcView => {
  const age = edadNpc(n, day);
  const sabe = [...new Set([...sabePorDefecto(n), ...(n.aprendido ?? [])])];
  return {
    id: n.id,
    name: n.name,
    nombrePila: n.nombrePila,
    apodo: n.apodo,
    nombreCorto: nombreCortoDe(n),
    role: n.role,
    gender: n.gender,
    tags: n.tags,
    levels: n.levels,
    age,
    known: n.known,
    club: n.club,
    rasgos: n.rasgos,
    description: descripcionDe(n),
    ...(n.nacimiento === undefined ? {} : { nacimiento: n.nacimiento, edadExacta: edadCumplida(n.nacimiento, hoy), cumple: cumpleaños(n.nacimiento).corto, alturaCm: alturaHoy(n, hoy) }),
    colegio: colegioDe(n, age),
    clase: claseDe(n, age),
    ...(n.nacimiento === undefined ? {} : (() => { const o = ocupacionDe(n, edadCumplida(n.nacimiento, hoy)); return { profesion: o.profesion, profesionBasica: o.basica, trabajo: o.trabajo }; })()),
    ...(n.edades ? { edades: n.edades } : {}),
    ...(n.role === 'profesor' ? { asignaturas: asignaturasDe(n.id) } : {}),
    ...(n.perks ? { perks: { activos: [...n.perks.activos], pool: [...n.perks.pool] } } : {}),
    sabe,
    ...(sabe.includes('gustos') && n.rasgos ? { gustos: gustosDe(n.rasgos.intereses) } : {}),
  };
};

/** Sesiones de los clubes de fuera: se reparten en cuatro patrones según el nombre del club (todas las sedes, de momento, en el estadio). */
const PATRONES_DE_SESION: readonly Omit<SesionDeClub, 'sede'>[] = [
  { weekdays: [0, 2], desde: 17, hasta: 19 },
  { weekdays: [1, 3], desde: 18, hasta: 20 },
  { weekdays: [0, 1, 3], desde: 17, hasta: 20 },
  { weekdays: [2, 4], desde: 17, hasta: 19 },
];

/**
 * Sesiones de un club: las del catálogo de clubes (por id o por nombre) y, si no está, las de un club de fuera, que entrena en la sede por defecto de
 * los clubes de fuera de su deporte. Provisional: toda la gente es del primer deporte de la partida (la gente de cada deporte llega en la fase 4).
 */
function sesionDeClub(clubes: ClubDirectory | undefined, deporte: string | undefined, sedeDeFuera: string | null, club: string): SesionDeClub {
  const c = deporte ? clubes?.list(deporte).find((x) => x.id === club || x.nombre === club) : undefined;
  if (c) return { weekdays: c.sesiones.weekdays, desde: c.sesiones.desde, hasta: c.sesiones.hasta, sede: c.sede };
  return { ...PATRONES_DE_SESION[Math.floor(azarDe('sesion', club) * PATRONES_DE_SESION.length)], sede: sedeDeFuera };
}

/** Qué tipo de persona sale antes en una lista de «Gente aquí» a igualdad de nivel. */
const RELEVANCIA: Record<string, number> = { profesor: 6, entrenador: 6, amigo: 5, club: 4, rival: 3, alumno: 2, vecino: 1 };

/**
 * Lo que pidió cada deporte de la gente: lo guardado en la partida (así sigue valiendo si el módulo del deporte ya no está) o, en una partida
 * anterior a guardarlo, lo que piden ahora los deportes cargados.
 */
const poblacionesGuardadas = (ctx: ReadContext): PoblacionGuardada[] => ctx.state<NpcsState>().poblaciones ?? poblacionesDe(ctx, ctx.state<NpcsState>().semilla ?? 0);

/** Consultas del servicio `npcs` ya resueltas, por lista de personas (cambia cuando cambia la población) y filtro. */
const CONSULTAS = new WeakMap<Npc[], Map<string, NpcView[]>>();
const POR_ID = new WeakMap<Npc[], Map<string, Npc>>();

/** Una persona por su id sin recorrer la lista (se pregunta por muchas en cada acción). */
function personaPorId(lista: Npc[], id: string): Npc | undefined {
  let porId = POR_ID.get(lista);
  if (!porId) POR_ID.set(lista, (porId = new Map(lista.map((x) => [x.id, x]))));
  return porId.get(id);
}

const SERVICIOS_DE_PRESENCIA = new WeakMap<Npc[], { minuto: number; servicio: PresenciaService }>();
const SIN_TIPOS: TipoAsignado[] = [];
/** La agenda depende de los tipos de la persona y de los datos del deporte del país: se monta una vez por lista de tipos (los acontecimientos con fecha de fin no se guardan). */
const AGENDAS = new WeakMap<TipoAsignado[], TramoDeAgenda[]>();
/** Las personas con los mismos tipos comparten la misma agenda (el mismo objeto): así lo que se calcula para una vale para todas. */
const AGENDAS_COMPARTIDAS = new Map<string, TramoDeAgenda[]>();

function agendaDePersona(n: Npc, datos: DatosDeAgenda, dia: number): TramoDeAgenda[] {
  const tipos = n.tipos ?? SIN_TIPOS;
  if (tipos.some((x) => x.hasta !== undefined)) return construirAgenda(tipos, datos, dia);
  let a = AGENDAS.get(tipos);
  if (!a) {
    // La agenda también depende de lo que da el deporte del país (la jornada de competición y las sesiones y sedes de los clubes): entra en la clave.
    const clave = JSON.stringify([tipos, tipos.map((x) => [typeof x.deporte === 'string' ? x.deporte : undefined, datos.jornada(typeof x.deporte === 'string' ? x.deporte : undefined), x.club ? datos.sesionDeClub(x.club, typeof x.deporte === 'string' ? x.deporte : undefined) : null])]);
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
        for (const [a, b] of x.ocupado ?? []) {
          set.add(a);
          set.add(b);
        }
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
const INDICES = new WeakMap<Npc[], { clave: string; version: number; lugares: Map<string, EnLugar[]>; ocupados: Map<string, { n: Npc; motivo: string }[]>; ordenados: Set<string> }>();

function indiceDePresencia(lista: Npc[], clave: string, ubicar: (n: Npc) => { sitio: string | null; nivel: number; tipo: string; atendiendo?: { sitio: string; motivo: string } }, dia: number) {
  let idx = INDICES.get(lista);
  if (!idx || idx.clave !== clave) {
    const lugares = new Map<string, EnLugar[]>();
    const ocupados = new Map<string, { n: Npc; motivo: string }[]>();
    for (const n of lista) {
      const u = ubicar(n);
      // Ocupado pero a la vista (en clase, durmiendo): no está «aquí» para hablar, pero se ve en el sitio con su estado.
      if (u.atendiendo) ocupados.set(u.atendiendo.sitio, [...(ocupados.get(u.atendiendo.sitio) ?? []), { n, motivo: u.atendiendo.motivo }]);
      if (u.sitio === null) continue;
      let l = lugares.get(u.sitio);
      if (!l) lugares.set(u.sitio, (l = []));
      l.push({ n, nivel: u.nivel, tipo: u.tipo });
    }
    INDICES.set(lista, (idx = { clave, version: ++versionDeIndices, lugares, ocupados, ordenados: new Set() }));
  }
  const actual = idx;
  return {
    version: actual.version,
    ocupadosEn: (lugar: string): { n: Npc; motivo: string }[] => actual.ocupados.get(lugar) ?? [],
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

  initState: (ctx) => {
    // Cada deporte de la partida pide su gente (y se guarda lo que pidió, para que siga viviendo sin su módulo).
    const poblaciones = poblacionesDe(ctx, ctx.seed);
    return { npcs: conPais(ctx.pais, () => generarTodos(ctx, poblaciones)), poblaciones, semilla: ctx.seed };
  },

  // Ponerle (o quitarle) un apodo a alguien que conoces: el texto va en el id de la acción (`idDePonerApodo`).
  resolverAccion: (ctx, id) => {
    const partes = id.split('.');
    if (partes[0] !== 'npcs' || partes[1] !== 'apodo' || partes.length !== 4) return undefined;
    const n = ctx.state<NpcsState>().npcs.find((x) => x.id === partes[2]);
    const apodo = apodoDeId(partes[3]);
    if (!n || apodo === undefined) return undefined;
    const pila = n.nombrePila ?? n.name.split(' ')[0];
    return {
      id,
      name: apodo ? `Llamarle «${apodo}»` : 'Quitarle el apodo',
      description: 'Cómo le llamas en los textos. No cambia lo que siente por ti.',
      tags: [],
      group: 'Gente',
      duration: 1,
      available: () => (n.known === false ? 'Todavía no sabes cómo se llama' : (n.apodo ?? '') === apodo ? 'Ya le llamas así' : true),
      run: (c) => {
        c.updateState<NpcsState>((st) => ({ ...st, npcs: st.npcs.map((x) => (x.id === n.id ? (apodo ? { ...x, apodo } : { ...x, apodo: undefined }) : x)) }));
        c.log(apodo ? `Desde ahora le llamas «${apodo}» a ${pila}.` : `Vuelves a llamarle ${pila}.`, 'info');
      },
    };
  },

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as { day: number };
      ctx.updateState<NpcsState>((s) => ({
        ...s,
        npcs: s.npcs.map((n) => {
          // Los que practican un deporte progresan solos hacia el techo de su edad.
          const entradas = Object.entries(n.levels);
          if (!entradas.length) return n;
          const levels = { ...n.levels };
          const edad = n.nacimiento === undefined ? undefined : (day - n.nacimiento) / 365;
          for (const [k, v] of entradas) {
            const pot = n.potential[k] ?? 80;
            // El techo de cada edad es el potencial por el desarrollo físico de esa edad: sin edad, el potencial entero.
            const ritmo = n.ritmo?.[k] ?? 1;
            // Rinde cada curso una parte distinta de su techo (su constancia y cómo le va el año), así que el orden entre ellos cambia con los años.
            const techo = edad === undefined ? pot : pot * desarrolloRival(edad + (n.desfase ?? 0)) * formaEn(n.id, k, day, ritmo);
            // Progresan con rendimientos decrecientes hacia el techo de su edad.
            // Su suerte de cada día es solo suya (id, disciplina y día): no cambia con lo que haga el jugador.
            if (v < techo) levels[k] = Math.min(techo, v + rngEstable('progreso', n.id, k, day).range(0, 0.35) * (1 - v / techo) * 2 * ritmo);
          }
          return { ...n, levels };
        }),
      }));
    },

    [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
      const { week } = ev.data as { week: number };
      // Si la semana que viene empieza un curso nuevo, se renueva la gente: los que acaban el colegio se van, entran niños nuevos y los equipos rellenan sus plazas.
      const proximo = ctx.timeAt((week + 1) * 7 * MINUTES_PER_DAY);
      if (proximo.schoolWeek !== 0) return;
      const pobs = poblacionesGuardadas(ctx);
      ctx.updateState<NpcsState>((s) => {
        const npcs = conPais(ctx.pais, () => actualizarHermanos(renovarDeportistas(renovarAlumnos(s.npcs, proximo.day, ctx.rng), pobs, proximo.day, ctx.rng), proximo.day));
        return { ...s, poblaciones: pobs, npcs };
      });
    },

    // Al entrar en un club conoces a su entrenador: se presenta el primer día.
    // Se añade un deporte a una partida empezada: sus equipos reclutan entre los niños que no juegan a nada (si ya estuvo, solo completan lo que falte).
    [SHARED_EVENTS.DEPORTE_ANADIDO]: (ctx, ev) => {
      const { deporte } = ev.data as DeporteAnadidoData;
      const ficha = fichasDeDeporte(ctx).find((f) => f.id === deporte);
      if (!ficha) return;
      const guardadas = poblacionesGuardadas(ctx);
      const previa = guardadas.find((p) => p.deporte === deporte);
      // Las edades se miran el primer día del curso en curso, como en la renovación de cada curso.
      const dia = (ctx.time.week - ctx.time.schoolWeek) * 7;
      ctx.updateState<NpcsState>((s) => {
        const pob = previa ?? poblacionDe(ctx, ficha, false, s.semilla ?? 0);
        const npcs = conPais(ctx.pais, () => (previa ? reclutarDeportistas(s.npcs, pob, dia) : añadirDeporte(s.npcs, pob, dia, ctx.rng)));
        return { ...s, poblaciones: previa ? guardadas : [...guardadas, pob], npcs };
      });
    },

    [SHARED_EVENTS.CLUB_JOIN]: (ctx, ev) => {
      const { clubId, sport } = ev.data as ClubJoinData;
      // El que entrena tu edad en ese club (los clubes tienen varios, cada uno con unas categorías).
      const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
      const pobs = poblacionesGuardadas(ctx);
      const delClub = ctx.state<NpcsState>().npcs.filter((n) => n.known === false && n.tipos?.some((t) => t.tipo === 'entrenador' && t.club === clubId && (t.deporte ?? pobs[0]?.deporte) === sport));
      const entrenador = delClub.find((n) => !n.edades || (edad >= n.edades[0] && edad <= n.edades[1])) ?? delClub[0];
      if (!entrenador) return;
      ctx.updateState<NpcsState>((st) => ({ ...st, npcs: st.npcs.map((x) => (x.id === entrenador.id ? { ...x, known: true, aprendido: [...(x.aprendido ?? []), 'profesion' as const] } : x)) }));
      ctx.log(`${entrenador.gender === 'f' ? 'Tu entrenadora' : 'Tu entrenador'} se presenta: ${entrenador.name}.`, 'info');
    },

    // Al ir a una clase, su profesor se presenta si todavía no lo conoces.
    [SHARED_EVENTS.CLASS_ATTENDED]: (ctx, ev) => {
      const { asignatura } = ev.data as ClassAttendedData;
      const numero = PROFESOR_DE_ASIGNATURA[asignatura];
      const profesor = numero === undefined ? undefined : ctx.state<NpcsState>().npcs.find((n) => n.id === `profesor_${numero}`);
      if (!profesor) return;
      const nuevo = profesor.known === false;
      // Ir a su clase es saber qué da (aunque ya lo conocieras por el nombre).
      if (!nuevo && profesor.aprendido?.includes('profesion')) return;
      ctx.updateState<NpcsState>((st) => ({ ...st, npcs: st.npcs.map((x) => (x.id === profesor.id ? { ...x, known: true, aprendido: [...new Set([...(x.aprendido ?? []), 'profesion' as const])] } : x)) }));
      if (nuevo) ctx.log(`${profesor.gender === 'f' ? 'La profesora' : 'El profesor'} se presenta al empezar la clase: ${profesor.name}.`, 'info');
    },

    // El personaje le ha preguntado algo a alguien (edad, colegio, clase): desde ahora lo sabe.
    [SHARED_EVENTS.DATO_PERSONAL]: (ctx, ev) => {
      const { npcId, dato } = ev.data as DatoPersonalData;
      const n = ctx.state<NpcsState>().npcs.find((x) => x.id === npcId);
      if (!n) return;
      const v = vista(n, (ctx.time.week - ctx.time.schoolWeek) * 7, ctx.time.day);
      if (v.sabe?.includes(dato)) return;
      ctx.updateState<NpcsState>((st) => ({ ...st, npcs: st.npcs.map((x) => (x.id === npcId ? { ...x, aprendido: [...(x.aprendido ?? []), dato] } : x)) }));
      const quien = nombreCortoDe(n);
      const respuesta =
        dato === 'edad' ? `${quien} tiene ${v.edadExacta} años y cumple el ${cumpleaños(n.nacimiento!).texto}.`
        : dato === 'colegio' ? `${quien} va a ${v.colegio === COLEGIO_DEL_PERSONAJE ? 'tu colegio' : v.colegio}.`
        : dato === 'profesion' ? `${quien} trabaja como ${v.profesion?.toLowerCase()}.`
        : dato === 'trabajo' ? `${quien} trabaja en ${v.trabajo}.`
        : dato === 'gustos' ? `A ${quien} le gusta: ${gustosDe(n.rasgos?.intereses ?? {}).map((g) => g.toLowerCase()).join(', ')}.`
        : `${quien} va a ${v.clase?.toLowerCase()}.`;
      ctx.log(respuesta, 'info');
    },

    [SHARED_EVENTS.PRESENTACION]: (ctx, ev) => {
      const { npcId } = ev.data as PresentacionData;
      const n = ctx.state<NpcsState>().npcs.find((x) => x.id === npcId);
      if (!n || n.known !== false) return;
      ctx.updateState<NpcsState>((s) => ({ ...s, npcs: s.npcs.map((x) => (x.id === npcId ? { ...x, known: true } : x)) }));
      ctx.log(`Se llama ${n.name}. ${n.description ?? ''}`.trim(), 'info');
    },

    [SHARED_EVENTS.COMPETITION_RESULT]: (ctx, ev) => {
      const r = ev.data as CompetitionResultData;
      ctx.updateState<NpcsState>((s) => ({
        ...s,
        // Competir contra alguien (sea de otro colegio, un compañero o un hermano) es conocerlo.
        npcs: s.npcs.map((n) => (n.known === false && r.participants.some((x) => x.npcId === n.id) ? { ...n, known: true } : n)),
      }));
    },
  },

  services: {
    [SERVICES.presencia]: (ctx): PresenciaService => {
      const lista = ctx.state<NpcsState>().npcs;
      const t = ctx.time;
      // Se pide muchas veces seguidas (en cada acción de relación): dentro del mismo minuto es el mismo servicio.
      const hecho = SERVICIOS_DE_PRESENCIA.get(lista);
      if (hecho?.minuto === t.minute) return hecho.servicio;
      const clubes = ctx.service<ClubDirectory>(SERVICES.clubes);
      // Cada persona sigue la jornada y los clubes de su deporte (el primero de la partida si no dice cuál); si el deporte ya no está cargado, no hay nada que seguir.
      const cargados = fichasDeDeporte(ctx).map((f) => f.id);
      const datosDe = (deporte: string | undefined) => {
        const id = deporte ?? cargados[0];
        return id !== undefined && cargados.includes(id) ? { id, datos: datosDeDeporte(ctx, id) } : undefined;
      };
      const datos: DatosDeAgenda = {
        sesionDeClub: (club, deporte) => {
          const d = datosDe(deporte);
          return sesionDeClub(clubes, d?.id, d?.datos.sedes.fuera ?? null, club);
        },
        jornada: (deporte) => datosDe(deporte)?.datos.competiciones.jornada,
      };
      const inicioCurso = (t.week - t.schoolWeek) * 7;
      const agendaDe = (n: Npc): TramoDeAgenda[] => agendaDePersona(n, datos, t.day);
      /**
       * Dónde está cada persona entre dos cambios de tramo de cualquier agenda: mientras no cambie ninguno, la presencia no cambia
       * (nadie aparece ni desaparece), así que se calcula una vez por intervalo (unas 10 veces al día) y no cada pocos minutos.
       */
      const intervalo = limitesDeTramos(lista, agendaDe).filter((m) => m <= t.minuteOfDay).length;
      const indice = indiceDePresencia(lista, `${t.day}:${intervalo}`, (n) => ubicacionEn(agendaDe(n), t, n.id), t.day);
      const servicio: PresenciaService = {
        version: indice.version,
        en: (lugar, max = Infinity) => indice.en(lugar).slice(0, max).map((e) => vista(e.n, inicioCurso, t.day)),
        ocupadosEn: (lugar) => indice.ocupadosEn(lugar).map((e) => ({ persona: vista(e.n, inicioCurso, t.day), motivo: e.motivo })),
        donde: (id) => {
          const n = personaPorId(lista, id);
          return n ? ubicacionEn(agendaDe(n), t, n.id).sitio : undefined;
        },
        agenda: (id) => {
          const n = personaPorId(lista, id);
          return n ? agendaDe(n) : [];
        },
      };
      SERVICIOS_DE_PRESENCIA.set(lista, { minuto: t.minute, servicio });
      return servicio;
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
              .map((n) => vista(n, inicioCurso, ctx.time.day));
            porFiltro.set(clave, vistas);
          }
          // Quien llama puede ordenar o modificar lo que recibe: se le da una copia.
          return [...vistas];
        },
        get: (id) => {
          const n = personaPorId(lista, id);
          return n ? vista(n, inicioCurso, ctx.time.day) : undefined;
        },
      };
    },
  },
});

export default npcs;
