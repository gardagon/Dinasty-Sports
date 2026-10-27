import { azarDe } from './agendas';
import { DIAS_DE_ENERO_AL_INICIO_DEL_CURSO, anioNatural, primerDiaDelAnio } from './calendar';

/**
 * Lo que se sabe de una persona más allá de su nombre y su aspecto: cuántos años tiene y cuándo cumple, a qué colegio va y a qué clase.
 * Todas las personas tienen fecha de nacimiento (y por tanto cumpleaños), pero el personaje solo conoce lo que ve (su edad aproximada
 * respecto a la suya, su altura) o lo que ha preguntado. Las cifras de las bandas están en `docs/ANEXO_RELACIONES.md`.
 */

/** Datos que se pueden saber de alguien (y preguntarle). */
export type DatoPersonal = 'edad' | 'colegio' | 'clase';

/** El colegio del personaje (todavía sin nombre propio) y los de fuera (nombres provisionales, como los clubes de fuera). */
export const COLEGIO_DEL_PERSONAJE = 'Tu colegio';
export const COLEGIOS_DE_FUERA = ['colegio1', 'colegio2', 'colegio3', 'colegio4'] as const;

/** Hasta qué edad (inclusive) se va al colegio, de 3 a 17 años. */
export const EDAD_DE_COLEGIO = { desde: 3, hasta: 17 } as const;

/** A qué colegio de fuera va alguien (estable por persona: no se guarda). */
export const colegioDeFuera = (id: string): string => COLEGIOS_DE_FUERA[Math.floor(azarDe('colegio', id) * COLEGIOS_DE_FUERA.length)];

// ------------------------------------------------------------------------------------------------------------ cumpleaños

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_DEL_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Día y mes del cumpleaños de quien nació en el día `nacimiento` (relativo al inicio de la partida; el año tiene 365 días). */
export function cumpleaños(nacimiento: number): { dia: number; mes: number; texto: string } {
  let d = (((nacimiento + DIAS_DE_ENERO_AL_INICIO_DEL_CURSO) % 365) + 365) % 365;
  let mes = 0;
  while (d >= DIAS_DEL_MES[mes]) d -= DIAS_DEL_MES[mes++];
  return { dia: d + 1, mes: mes + 1, texto: `${d + 1} de ${MESES[mes]}` };
}

/** Años cumplidos el día `hoy` por quien nació el día `nacimiento`. */
export const edadCumplida = (nacimiento: number, hoy: number): number => Math.floor((hoy - nacimiento) / 365);

/** Día de nacimiento de alguien que tiene `edad` años (cumplidos al empezar el curso, en un día del año estable por persona). */
export const nacimientoParaEdad = (id: string, edad: number, hoy = 0): number => primerDiaDelAnio(anioNatural(hoy) - edad) + Math.floor(azarDe('cumple', id) * 365);

/** Edad de un adulto (entre `min` y `max`) estable por persona. */
export const edadAdultaDe = (id: string, min: number, max: number): number => min + Math.floor(azarDe('edad', id) * (max - min + 1));

/** Nacimiento del padre o la madre, fijo para una semilla (así lo usan `familia` y `npcs` sin depender uno del otro): de 38 a 54 años. */
export function nacimientoDeProgenitor(seed: number, id: 'padre' | 'madre'): number {
  return -Math.round((38 + 16 * azarDe('progenitor', seed, id)) * 365);
}

// ------------------------------------------------------------------------------------------------------------ estatura

const ADULTA = {
  m: { media: 178, sd: 7, min: 160, max: 200 },
  f: { media: 165, sd: 6.5, min: 148, max: 185 },
} as const;
/** Fracción de la altura adulta a cada edad (media aproximada). */
const CRECIMIENTO: readonly (readonly [number, number])[] = [[0, 0.3], [2, 0.5], [4, 0.58], [6, 0.66], [8, 0.73], [10, 0.8], [12, 0.87], [14, 0.94], [16, 0.98], [18, 1]];

function fraccionDeAltura(edad: number): number {
  if (edad >= 18) return 1;
  for (let i = 1; i < CRECIMIENTO.length; i++) {
    const [e1, f1] = CRECIMIENTO[i];
    if (edad <= e1) {
      const [e0, f0] = CRECIMIENTO[i - 1];
      return f0 + ((f1 - f0) * (edad - e0)) / (e1 - e0);
    }
  }
  return 1;
}

/** Altura adulta (cm) para una puntuación típica `z` (media 0, desviación 1). */
export const alturaAdulta = (gender: 'f' | 'm', z: number): number => {
  const a = ADULTA[gender];
  return Math.min(a.max, Math.max(a.min, a.media + a.sd * z));
};

/** Altura (cm, con un decimal) a una edad (años, con decimales) con esa puntuación típica de estatura. */
export const alturaDe = (gender: 'f' | 'm', edad: number, z: number): number => Math.round(alturaAdulta(gender, z) * fraccionDeAltura(edad) * 10) / 10;

/** Puntuación típica de estatura estable por persona (aproximadamente normal; para quien no la hereda de unos padres concretos). */
export function estaturaZ(id: string): number {
  const u1 = Math.max(1e-9, azarDe('estatura', id, 1));
  const u2 = azarDe('estatura', id, 2);
  return Math.max(-2.5, Math.min(2.5, Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)));
}

// ------------------------------------------------------------------------------------------------------------ bandas respecto a ti

/**
 * Lo que se ve a simple vista cuando no sabes los años de alguien: si es de tu edad o más o menos mayor o menor que tú. Bandas por
 * diferencia de años: 0 a 1 de tu edad; 2 a 3 «un poco»; 4 a 7 «bastante más»; 8 o más «mucho más».
 */
export const BANDAS_DE_EDAD = { igual: 1, poco: 3, bastante: 7 } as const;

export function edadRelativa(suya: number, tuya: number): string {
  const d = suya - tuya;
  const a = Math.abs(d);
  if (a <= BANDAS_DE_EDAD.igual) return 'De tu edad, más o menos';
  const lado = d > 0 ? 'mayor' : 'menor';
  if (a <= BANDAS_DE_EDAD.poco) return `Un poco ${lado} que tú`;
  if (a <= BANDAS_DE_EDAD.bastante) return `Bastante más ${lado} que tú`;
  return `Mucho más ${lado} que tú`;
}

/** Lo mismo con la altura (cm): de tu altura hasta 3 cm; «un poco» hasta 9; «bastante» hasta 19; «mucho» desde 20. */
export const BANDAS_DE_ALTURA = { igual: 3, poco: 9, bastante: 19 } as const;

export function alturaRelativa(suyaCm: number, tuyaCm: number, gender: 'f' | 'm'): string {
  const d = suyaCm - tuyaCm;
  const a = Math.abs(d);
  if (a <= BANDAS_DE_ALTURA.igual) return 'De tu altura, más o menos';
  const lado = d > 0 ? (gender === 'f' ? 'alta' : 'alto') : gender === 'f' ? 'baja' : 'bajo';
  if (a <= BANDAS_DE_ALTURA.poco) return `Un poco más ${lado} que tú`;
  if (a <= BANDAS_DE_ALTURA.bastante) return `Bastante más ${lado} que tú`;
  return `Mucho más ${lado} que tú`;
}
