import { GEN, type StatDef } from '@ds/contracts';
import { conocimientoDelDeporte, habilidadDeportiva, type Apoyo } from '@ds/kit-deporte';

/**
 * Las 29 habilidades entrenables del fútbol: las 28 del addon 2.1 (`docs/diseno/addon_futbol_v2.1.json`, con sus ids en español) más
 * `futbol.juego_colectivo`, que pasa de derivada a entrenable (decisión del 31/10: apoyada en la cooperación, la comunicación y la autoridad).
 * Cada una sube con sus secundarias del addon (las genéricas del juego y las otras habilidades del fútbol) y su tope sale de las genéricas
 * que la apoyan más una aptitud propia (el kit). Las derivadas y las ocultas del addon no son habilidades: llegan en la F4.
 */

export const DEPORTE = 'futbol';
export const CONOCIMIENTO = `${DEPORTE}.conocimiento`;

/** Una secundaria del addon: una genérica del juego o una habilidad del propio fútbol. */
type Secundaria = string;

/** Genéricas del juego que corresponden a las secundarias del addon (en inglés) que no son habilidades del fútbol. */
const GENERICA: Readonly<Record<string, string>> = {
  attention: GEN.atencion,
  intelligence: GEN.inteligencia,
  coordination: GEN.coordinacion,
  agility: GEN.agilidad,
  balance: GEN.coordinacion,
  creativity: GEN.creatividad,
  concentration: GEN.concentracion,
  strength: GEN.fuerza,
  speed: GEN.velocidad,
  constitution: GEN.constitucion,
  resilience: GEN.resiliencia,
  authority: GEN.autoridad,
};

/** Secundarias del addon que son habilidades del propio fútbol. */
const PROPIA: Readonly<Record<string, string>> = {
  game_vision: 'futbol.vision',
  anticipation: 'futbol.anticipacion',
  composure: 'futbol.sangre_fria',
  technique: 'futbol.tecnica',
  jumping: 'futbol.salto',
};

/** Peso de cada secundaria en el ritmo de subida, por su orden en el addon (la primera pesa más). */
const PESOS = [0.4, 0.3, 0.2, 0.15, 0.1];

interface Def {
  key: string;
  nombre: string;
  grupo: 'técnica' | 'mental' | 'física' | 'portería';
  descripcion: string;
  /** Las secundarias del addon, en su orden. `altura` no tiene stat en el juego y se ignora. */
  secundarias: readonly Secundaria[];
}

const TECNICAS: readonly Def[] = [
  { key: 'pase', nombre: 'Pase', grupo: 'técnica', descripcion: 'Dar el balón al compañero con precisión y a tiempo.', secundarias: ['attention', 'game_vision', 'intelligence'] },
  { key: 'control', nombre: 'Control', grupo: 'técnica', descripcion: 'Dominar el balón al recibirlo, de primeras o con un toque.', secundarias: ['coordination', 'attention', 'agility'] },
  { key: 'regate', nombre: 'Regate', grupo: 'técnica', descripcion: 'Superar a un rival con el balón pegado al pie.', secundarias: ['agility', 'balance', 'creativity'] },
  { key: 'definicion', nombre: 'Definición', grupo: 'técnica', descripcion: 'Acabar la jugada: tirar a puerta con precisión delante del portero.', secundarias: ['coordination', 'concentration', 'strength'] },
  { key: 'tecnica', nombre: 'Técnica', grupo: 'técnica', descripcion: 'La calidad general con el balón: golpeos, toques y malabares.', secundarias: ['coordination', 'creativity'] },
  { key: 'centros', nombre: 'Centros', grupo: 'técnica', descripcion: 'Poner el balón al área desde la banda.', secundarias: ['coordination', 'strength', 'attention'] },
  { key: 'cabeza', nombre: 'Juego de cabeza', grupo: 'técnica', descripcion: 'Rematar, despejar y ganar los balones por alto.', secundarias: ['strength', 'coordination', 'attention', 'jumping'] },
  { key: 'marcaje', nombre: 'Marcaje', grupo: 'técnica', descripcion: 'Seguir al rival y no dejarle recibir con comodidad.', secundarias: ['attention', 'intelligence', 'anticipation'] },
  { key: 'entrada', nombre: 'Entrada', grupo: 'técnica', descripcion: 'Quitar el balón al rival sin hacer falta.', secundarias: ['strength', 'coordination', 'attention'] },
  { key: 'disparo_lejano', nombre: 'Disparo lejano', grupo: 'técnica', descripcion: 'Tirar a puerta desde fuera del área.', secundarias: ['strength', 'coordination', 'concentration'] },
  { key: 'faltas', nombre: 'Golpeo de falta', grupo: 'técnica', descripcion: 'Lanzar faltas directas con colocación y potencia.', secundarias: ['technique', 'strength', 'coordination'] },
  { key: 'penaltis', nombre: 'Penaltis', grupo: 'técnica', descripcion: 'Lanzar penaltis con el pulso firme.', secundarias: ['concentration', 'composure', 'technique', 'strength', 'coordination'] },
  { key: 'corners', nombre: 'Saques de esquina', grupo: 'técnica', descripcion: 'Sacar córners al lugar justo.', secundarias: ['technique', 'strength', 'attention'] },
  { key: 'saque_banda', nombre: 'Saque de banda largo', grupo: 'técnica', descripcion: 'Lanzar el balón con las manos desde la banda, lejos y con intención.', secundarias: ['strength', 'technique', 'attention', 'intelligence'] },
];

const MENTALES: readonly Def[] = [
  { key: 'vision', nombre: 'Visión de juego', grupo: 'mental', descripcion: 'Ver lo que va a pasar y dónde está el pase que rompe la defensa.', secundarias: ['intelligence', 'attention'] },
  { key: 'posicionamiento', nombre: 'Posicionamiento', grupo: 'mental', descripcion: 'Estar donde hace falta, con el balón y sin él.', secundarias: ['attention', 'intelligence'] },
  { key: 'desmarque', nombre: 'Desmarque', grupo: 'mental', descripcion: 'Moverse sin balón para recibirlo libre.', secundarias: ['intelligence', 'speed', 'attention'] },
  { key: 'anticipacion', nombre: 'Anticipación', grupo: 'mental', descripcion: 'Llegar antes que el rival a la jugada.', secundarias: ['attention', 'intelligence', 'concentration'] },
  { key: 'decisiones', nombre: 'Toma de decisiones', grupo: 'mental', descripcion: 'Elegir bien en un segundo: pasar, regatear o tirar.', secundarias: ['intelligence', 'attention', 'concentration'] },
  { key: 'sangre_fria', nombre: 'Sangre fría en partido', grupo: 'mental', descripcion: 'Mantener la calma cuando el partido aprieta.', secundarias: ['concentration', 'resilience'] },
];

const FISICAS: readonly Def[] = [
  { key: 'arrancada', nombre: 'Arrancada', grupo: 'física', descripcion: 'Ganar metros en los primeros pasos.', secundarias: ['speed', 'agility'] },
  // La altura (tercera secundaria del addon) no es una stat del juego: se ignora.
  { key: 'salto', nombre: 'Salto', grupo: 'física', descripcion: 'Impulso para llegar arriba en los balones aéreos.', secundarias: ['strength', 'coordination', 'height'] },
];

const PORTERIA: readonly Def[] = [
  { key: 'reflejos', nombre: 'Reflejos', grupo: 'portería', descripcion: 'Reaccionar a un tiro a bocajarro.', secundarias: ['coordination', 'attention'] },
  { key: 'mano_a_mano', nombre: 'Mano a mano', grupo: 'portería', descripcion: 'Salir al delantero que se planta solo delante.', secundarias: ['anticipation', 'composure'] },
  { key: 'blocaje', nombre: 'Blocaje', grupo: 'portería', descripcion: 'Atrapar el balón y no dar rechace.', secundarias: ['coordination', 'constitution'] },
  { key: 'despeje', nombre: 'Despeje con pie', grupo: 'portería', descripcion: 'Sacar el balón de puerta con el pie, fuerte y largo.', secundarias: ['technique', 'strength'] },
  { key: 'alcance_aereo', nombre: 'Alcance aéreo', grupo: 'portería', descripcion: 'Llegar a los centros y a los balones por alto.', secundarias: ['jumping', 'coordination'] },
  { key: 'dominio_area', nombre: 'Dominio del área', grupo: 'portería', descripcion: 'Mandar en el área: salir, ordenar y cortar los centros.', secundarias: ['authority', 'anticipation'] },
];

/** Las 28 del addon, en el orden del addon (técnicas, mentales, físicas, portería). */
export const DEFINICIONES_DEL_ADDON: readonly Def[] = [...TECNICAS, ...MENTALES, ...FISICAS, ...PORTERIA];

/** Juego colectivo: no está en el addon como entrenable (allí era derivada); se apoya en la cooperación, la comunicación y la autoridad. */
const JUEGO_COLECTIVO: Def = {
  key: 'juego_colectivo',
  nombre: 'Juego colectivo',
  grupo: 'mental',
  descripcion: 'Jugar para el equipo: ayudas, coberturas, pases al compañero mejor colocado.',
  // Sin equivalentes en inglés en el addon: va directo con ids de genéricas.
  secundarias: [GEN.cooperacion, GEN.comunicacion, GEN.autoridad],
};

const NOMBRE_DE_GRUPO: Readonly<Record<Def['grupo'], string>> = {
  técnica: 'Fútbol · técnica',
  mental: 'Fútbol · mentales',
  física: 'Fútbol · físicas',
  portería: 'Fútbol · portería',
};

/** Una secundaria del addon como id de stat del juego (o `undefined` si no tiene: la altura). */
const comoStat = (s: Secundaria): string | undefined => PROPIA[s] ?? GENERICA[s] ?? (s.startsWith('gen.') ? s : undefined);

/** Las secundarias de una habilidad como ids de stats del juego, con su peso, en el orden del addon. */
export function apoyosDe(d: Pick<Def, 'secundarias'>): Apoyo[] {
  const ids = d.secundarias.map(comoStat).filter((x): x is string => !!x);
  return ids.map((stat, i) => ({ stat, weight: PESOS[Math.min(i, PESOS.length - 1)] }));
}

/**
 * El tope de la habilidad: sale solo de las genéricas que la apoyan (80 %) y de la determinación (20 %). Las secundarias que son otra habilidad
 * del fútbol suben el ritmo, pero no marcan el tope: eso sería heredar un tope de algo que ya depende del tope.
 */
function topeDe(d: Pick<Def, 'secundarias'>): Apoyo[] {
  const genericas = apoyosDe(d).filter((a) => a.stat.startsWith('gen.'));
  const suma = genericas.reduce((t, a) => t + a.weight, 0);
  return [...genericas.map((a) => ({ stat: a.stat, weight: (0.8 * a.weight) / suma })), { stat: GEN.determinacion, weight: 0.2 }];
}

function habilidad(d: Def): StatDef {
  const base = habilidadDeportiva(DEPORTE, NOMBRE_DE_GRUPO[d.grupo], d.key, d.nombre, apoyosDe(d), d.descripcion, topeDe(d));
  const growth = base.growth!;
  // Lo físico se desarrolla con el cuerpo y lo mental con la cabeza; las mentales casi no se olvidan (decisión del 31/10).
  if (d.grupo === 'física') return { ...base, growth: { ...growth, potentialFactor: GEN.vigorFisico } };
  if (d.grupo === 'mental') return { ...base, growth: { ...growth, potentialFactor: GEN.vigorMental }, decay: { graceDays: 14, ratePerDay: 0.004, floorRatio: 0.85 } };
  return base;
}

/** Los 29 `StatDef` entrenables del fútbol, más el conocimiento. */
export const STATS_DE_FUTBOL: readonly StatDef[] = [
  ...DEFINICIONES_DEL_ADDON.map(habilidad),
  habilidad(JUEGO_COLECTIVO),
  conocimientoDelDeporte(
    DEPORTE,
    'Conocimiento de fútbol',
    'Entender el juego: posiciones, desmarques, cuándo apretar y cuándo esperar. Sube entrenando, jugando y, en menor medida, viendo fútbol; casi no se olvida.',
  ),
];

/** Ids de las 29 habilidades entrenables (sin el conocimiento). */
export const HABILIDADES_DE_FUTBOL: readonly string[] = [...DEFINICIONES_DEL_ADDON, JUEGO_COLECTIVO].map((d) => `${DEPORTE}.${d.key}`);
