/**
 * MUESTRAS DE ESTILO (etapa 2a): de los datos de una persona y una edad a lo que el dibujo necesita. Función pura; lo poco que se decide al azar (qué peinado, dónde caen
 * las pecas) sale solo de la semilla de dibujo de la persona. Provisional: la versión de verdad será `parametrosDe` de `@ds/retrato` (etapa 2b).
 */
import { interpola, rngEstable, rostroExpresado, type CuerpoDePersona, type Rng, type RostroExpresado } from '@ds/contracts';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;

// ------------------------------------------------------------------------------------------------------------ colores

export type Rgb = [number, number, number];
export const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
export const hex = (c: Rgb): string => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a: string, b: string, t: number): string => { const x = rgb(a); const y = rgb(b); return hex([mezcla(x[0], y[0], t), mezcla(x[1], y[1], t), mezcla(x[2], y[2], t)]); };

/** Paletas (catálogos como datos): un color por cada valor de cada catálogo de la apariencia. */
export const COLOR_DE_PIEL: Record<string, string> = { muy_clara: '#f7dfd0', clara: '#eecaae', media: '#dfb08a', oliva: '#c99a6b', morena: '#a5714a', oscura: '#6f4732' };
export const COLOR_DE_PELO: Record<string, string> = { negro: '#211c1d', castano_oscuro: '#3f2b20', castano: '#6d4830', rubio_oscuro: '#9c7a4c', rubio: '#d6b571', pelirrojo: '#b1542a' };
export const COLOR_DE_OJOS: Record<string, string> = { marron_oscuro: '#402818', marron: '#70471f', avellana: '#94763a', verde: '#5f8f58', gris: '#8494a2', azul: '#4a82bd' };
const CANA = '#d9d8d4';

// ------------------------------------------------------------------------------------------------------------ parámetros

export type EstiloDePelo = 'rapado' | 'corto' | 'flequillo' | 'melena' | 'largo' | 'coleta';
export type EstiloDeBarba = 'ninguna' | 'afeitado' | 'bigote' | 'perilla' | 'barba_corta' | 'barba';

export interface Parametros {
  semilla: number;
  edad: number;
  sexo: 'f' | 'm';
  /** Cuánto se ha formado la cara (0 a los 3 años, 1 a los 18, con su adelanto o retraso), cuánto ha envejecido (0 a los 40, 1 a los 85) y cuánto se ha masculinizado (solo hombres, con la pubertad). */
  madura: number;
  vejez: number;
  masc: number;
  /** Grasa y músculo en relativo: 0 es lo de referencia; la grasa va de −0,5 a 1 y el músculo de −0,3 a 1. */
  gordo: number;
  fuerte: number;
  rostro: RostroExpresado;
  forma: string;
  // Medidas en centímetros.
  altura: number;
  cabeza: number;
  /** Colores: piel (con sombra y luz), labios, pelo (con sombra y luz, ya con las canas mezcladas), ceja, iris y ropa. */
  piel: string; pielSombra: string; pielLuz: string; labios: string; rubor: string;
  pelo: string; peloSombra: string; peloLuz: string; ceja: string; iris: string;
  camiseta: string; pantalon: string; zapato: string;
  peinado: { estilo: EstiloDePelo; tipo: string; lado: 1 | -1; /** 0 a 1: cuánto pelo se ha perdido y qué parte del pelo es cana. */ calvicie: number; canas: number };
  barba: { estilo: EstiloDeBarba; densidad: number; color: string };
  /** Arrugas de 0 a 1. */
  arrugas: number;
  distintivos: string[];
}

export interface Opciones {
  /** Músculo y grasa a esa edad (0 a 100) y altura (cm): los da quien lee los datos (historial o los de hoy). */
  musculo: number;
  grasa: number;
  altura: number;
  camiseta?: string;
  pantalon?: string;
}

/** Altura de la cabeza (cm, del mentón a la coronilla) a cada edad, para una persona de 170 cm de adulta. */
const CABEZA: readonly (readonly [number, number])[] = [[3, 18.6], [8, 20.6], [12, 21.6], [15, 22.4], [18, 23]];

/** Cuánto pelo ha perdido (0 a 1) con su tendencia y su edad: quien tiene mucha empieza en la juventud; quien tiene poca, tarde o nunca. Nunca retrocede. */
export function calvicieA(tendencia: number, edad: number): number {
  const inicio = 18 + 40 * (1 - tendencia);
  return tendencia * clamp((edad - inicio) / 30) ** 0.7;
}

/** Qué parte del pelo es cana (0 a 1): empiezan a su edad y aumentan poco a poco durante unos 30 años. */
export function canasA(desde: number, edad: number): number {
  return clamp((edad - desde) / 30) ** 1.15;
}

function peinadoDe(rng: Rng, sexo: 'f' | 'm', edad: number, tipo: string, calvicie: number): EstiloDePelo {
  const r = rng.next();
  if (sexo === 'm') {
    if (calvicie > 0.55) return 'rapado';
    if (edad < 13) return r < 0.6 ? 'flequillo' : 'corto';
    if (edad < 22) return r < 0.35 ? 'flequillo' : 'corto';
    return r < 0.2 ? 'rapado' : 'corto';
  }
  if (edad < 12) return r < 0.4 ? 'coleta' : r < 0.7 ? 'melena' : 'largo';
  if (edad < 45) return r < 0.5 ? 'largo' : r < 0.8 ? 'melena' : 'coleta';
  return r < 0.75 ? 'melena' : 'coleta';
}

function barbaDe(rng: Rng, densidad: number, edad: number): EstiloDeBarba {
  // Aparece en la pubertad: nada hasta los 15, pelusa hasta los 18.
  if (edad < 15) return 'ninguna';
  if (edad < 18 || densidad < 0.2) return 'afeitado';
  const r = rng.next();
  if (r < 0.4) return 'afeitado';
  if (r < 0.55) return 'bigote';
  if (r < 0.7) return 'perilla';
  return densidad > 0.5 && r > 0.85 ? 'barba' : 'barba_corta';
}

export function parametrosDe(c: CuerpoDePersona, edad: number, o: Opciones): Parametros {
  const a = c.apariencia;
  const sexo = c.sexo;
  const edadFisica = edad < 24 ? edad + c.madurez : edad;
  const madura = clamp((edadFisica - 3) / 15);
  const vejez = clamp((edad - 40) / 45);
  const masc = sexo === 'm' ? clamp((edadFisica - 12) / 7) : 0;
  const rng = (parte: string) => rngEstable('retrato', c.semilla, parte);

  // Piel: algo más pálida y apagada en la vejez. Labios y rubor a partir de la piel.
  const base = COLOR_DE_PIEL[a.piel] ?? COLOR_DE_PIEL.media;
  const piel = mix(base, '#cdbfb6', 0.12 * vejez);
  const oscura = rgb(piel)[0] < 150;
  const pielSombra = mix(piel, oscura ? '#2a1410' : '#7c3f2c', oscura ? 0.42 : 0.34);
  const pielLuz = mix(piel, '#fff4e6', oscura ? 0.22 : 0.45);
  const labios = mix(piel, sexo === 'f' && madura > 0.8 ? '#b23f4c' : '#a8504e', oscura ? 0.4 : mezcla(0.34, 0.26, vejez));
  const rubor = mix(piel, '#d8553f', 0.45);

  // Pelo: su color con las canas mezcladas.
  const canas = canasA(a.canas, edad);
  const calvicie = calvicieA(a.calvicie, edad);
  const natural = COLOR_DE_PELO[a.peloColor] ?? COLOR_DE_PELO.castano;
  const pelo = mix(natural, CANA, canas * 0.92);
  const peinado = { estilo: peinadoDe(rng('peinado'), sexo, edad, a.peloTipo, calvicie), tipo: a.peloTipo, lado: (rng('lado').chance(0.5) ? 1 : -1) as 1 | -1, calvicie, canas };
  // La barba encanece algo antes que el pelo.
  const barbaColor = mix(natural, CANA, clamp(canas * 1.25) * 0.92);
  const densidad = a.barba * masc;

  return {
    semilla: c.semilla, edad, sexo, madura, vejez, masc,
    gordo: clamp((o.grasa - 40) / 40, -0.5, 1),
    fuerte: clamp((o.musculo - 30) / 60, -0.34, 1),
    rostro: rostroExpresado(a),
    forma: a.cara,
    altura: o.altura,
    cabeza: interpola(CABEZA, edadFisica) * (c.alturaAdulta / 170) ** 0.4 * (sexo === 'f' ? 0.985 : 1),
    piel, pielSombra, pielLuz, labios, rubor,
    pelo, peloSombra: mix(pelo, '#120d10', 0.45), peloLuz: mix(pelo, '#fff1d6', 0.3),
    ceja: mix(mix(natural, '#1c1513', 0.25), CANA, clamp(canas * 0.8 - 0.1) * 0.8),
    iris: COLOR_DE_OJOS[a.ojos] ?? COLOR_DE_OJOS.marron,
    camiseta: o.camiseta ?? '#5b7a99', pantalon: o.pantalon ?? '#3a4252', zapato: '#2b2d33',
    peinado,
    barba: { estilo: sexo === 'm' ? barbaDe(rng('barba'), a.barba, edadFisica) : 'ninguna', densidad, color: barbaColor },
    arrugas: clamp((edad - 32) / 45) ** 1.3,
    distintivos: a.distintivos,
  };
}
