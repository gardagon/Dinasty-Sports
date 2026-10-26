import { GEN, INTERESES, agradoPorCaracter, type InteresesJugador, type NpcRole, type PerfilDelPersonaje, type RasgosDe } from '@ds/contracts';

/**
 * Reglas puras de las acciones de relación (sin motor): cuánto duele una discusión, qué probabilidad hay de hacer las
 * paces y qué intereses tienen en común dos personas. Se prueban y se ajustan sin tocar el módulo.
 */

/** Días que hay que esperar para repetir una acción con la misma persona. */
export const ESPERA = { detalle: 7, paces: 5 } as const;

/** Afinidad mínima para pedirle ayuda a alguien o ayudarle: hace falta algo de confianza previa. */
export const AFINIDAD_PARA_AYUDAR = 5;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const eje = (r: RasgosDe | undefined, id: string) => r?.caracter[id] ?? 0;

/**
 * Afinidad que se pierde al discutir (valor positivo). Un carácter calmado lo encaja mejor (6) y uno agresivo peor (14);
 * discutir con quien manda (entrenador, tutor) duele un 50 % más.
 */
export function perdidaPorDiscusion(rasgos: RasgosDe | undefined, rol: NpcRole): number {
  const base = 10 + (4 * eje(rasgos, 'agresividad')) / 50;
  return base * (rol === 'entrenador' || rol === 'profesor' ? 1.5 : 1);
}

/**
 * Probabilidad (0,08 a 0,85) de que la otra persona acepte las paces. Ayudan su sociabilidad, optimismo y honestidad y que se
 * lleven bien por carácter e intereses (`compat`, de 0 a 1); lo dificulta lo enconado que esté el vínculo (`nivel`: −1 antipatía,
 * −2 enemigo, −3 antagonista).
 */
export function probabilidadDePaces(rasgos: RasgosDe | undefined, nivel: number, compat: number, habilidad: number = HABILIDAD.tipico): number {
  const p =
    0.35 +
    // Quien sabe disculparse y escuchar (empatía y comunicación) lo consigue más: de −0,15 (muy poca) a +0,22 (muchísima).
    (0.15 * (habilidad - HABILIDAD.tipico)) / HABILIDAD.tipico +
    (0.2 * eje(rasgos, 'sociabilidad')) / 50 +
    (0.15 * eje(rasgos, 'optimismo')) / 50 +
    (0.1 * eje(rasgos, 'honestidad')) / 50 -
    0.15 * (Math.abs(nivel) - 1) +
    0.2 * (compat - 0.4);
  return clamp(p, 0.08, 0.85);
}

/** El interés que más disfrutaría la otra persona de los que ya tiene el personaje (nivel ≥ 15), o nada si no coinciden. */
export function mejorInteresEnComun(
  rasgos: RasgosDe | undefined,
  jugador: InteresesJugador,
): { id: string; nombre: string; intensidad: number; tags: readonly string[] } | undefined {
  let mejor: { id: string; nombre: string; intensidad: number; tags: readonly string[]; puntos: number } | undefined;
  for (const [id, intensidad] of Object.entries(rasgos?.intereses ?? {})) {
    const mio = jugador[id] ?? 0;
    const def = INTERESES.find((i) => i.id === id);
    if (!def || mio < 15) continue;
    const puntos = intensidad * (0.5 + mio / 100);
    if (!mejor || puntos > mejor.puntos) mejor = { id, nombre: def.nombre, intensidad, tags: def.tags, puntos };
  }
  return mejor && { id: mejor.id, nombre: mejor.nombre, intensidad: mejor.intensidad, tags: mejor.tags };
}

/** Su interés favorito (el de mayor intensidad), para elegir un detalle que le guste. */
export function interesFavorito(rasgos: RasgosDe | undefined): { id: string; nombre: string; intensidad: number } | undefined {
  const orden = Object.entries(rasgos?.intereses ?? {}).sort((a, b) => b[1] - a[1]);
  const [id, intensidad] = orden[0] ?? [];
  const def = INTERESES.find((i) => i.id === id);
  return id && def ? { id, nombre: def.nombre, intensidad } : undefined;
}

// ---------------------------------------------------------------------------------------------------- hablar con la gente

/**
 * Cuánto cuesta o ayuda hablar con alguien. Tres cosas se multiplican sobre lo que sube una acción de relación (la eficiencia):
 *  - la **compatibilidad** (intereses en común y carácter parecido, ×0,7 a ×1,4; vive en contracts);
 *  - la **habilidad** del personaje para ese tipo de conversación (comunicación, carisma, empatía...);
 *  - la **disposición** de la otra persona (sociabilidad y optimismo) y la primera impresión que le causa el personaje (sus gustos).
 * Todas las cifras están en `docs/ANEXO_RELACIONES.md`.
 */

/** Habilidades del personaje que cuentan en cada acción (los pesos suman 1). La clave es el sufijo del id de la acción. */
export const HABILIDADES_DE_ACCION: Readonly<Record<string, readonly { stat: string; peso: number }[]>> = {
  charlar: [{ stat: GEN.comunicacion, peso: 0.6 }, { stat: GEN.carisma, peso: 0.4 }],
  quedar: [{ stat: GEN.carisma, peso: 0.5 }, { stat: GEN.empatia, peso: 0.3 }, { stat: GEN.comunicacion, peso: 0.2 }],
  ayudar: [{ stat: GEN.empatia, peso: 0.5 }, { stat: GEN.cooperacion, peso: 0.5 }],
  planes: [{ stat: GEN.carisma, peso: 0.5 }, { stat: GEN.comunicacion, peso: 0.5 }],
  detalle: [{ stat: GEN.empatia, peso: 0.5 }, { stat: GEN.creatividad, peso: 0.5 }],
  hablar: [{ stat: GEN.comunicacion, peso: 0.6 }, { stat: GEN.carisma, peso: 0.4 }],
};

/** Habilidad de las paces: empatía y comunicación a partes iguales. */
export const HABILIDADES_DE_PACES = [{ stat: GEN.empatia, peso: 0.5 }, { stat: GEN.comunicacion, peso: 0.5 }] as const;

/**
 * El nivel de las habilidades es el normalizado «para su edad»: el típico de su edad vale 0,4. Con el típico el factor es ×1; cada
 * 0,1 de nivel por encima suma 0,06 y por debajo resta 0,06, con tope en ×0,8 y ×1,3.
 */
export const HABILIDAD = { tipico: 0.4, pendiente: 0.6, min: 0.8, max: 1.3 } as const;

export const factorDeHabilidad = (nivel: number): number => clamp(1 + HABILIDAD.pendiente * (nivel - HABILIDAD.tipico), HABILIDAD.min, HABILIDAD.max);

/** Cuánto pesa cada cosa en la disposición de la otra persona, y los topes del factor. */
export const DISPOSICION = { sociabilidad: 0.2, optimismo: 0.05, primeraImpresion: 0.16, min: 0.75, max: 1.3 } as const;

/**
 * Disposición de la otra persona a hablar con el personaje: ×1 con una persona normal. Suma `sociabilidad × eje/50` (±0,2: un solitario
 * habla poco, un sociable mucho), `optimismo × eje/50` (±0,05) y `primeraImpresion × (agrado − 0,5)` (±0,08), donde el agrado es lo que
 * encaja el CARÁCTER del personaje con lo que a esa persona le gusta en los demás (sus gustos de carácter; sin preferencias, 0,5). Los
 * gustos de aspecto físico no cuentan (ver `EDAD_ATRACCION_FISICA`). Devuelve también una frase con lo que más pesa, para enseñarla.
 */
export function disposicion(rasgos: RasgosDe | undefined, perfil: PerfilDelPersonaje | undefined): { factor: number; motivo?: string } {
  if (!rasgos) return { factor: 1 };
  const social = (DISPOSICION.sociabilidad * eje(rasgos, 'sociabilidad')) / 50;
  const animo = (DISPOSICION.optimismo * eje(rasgos, 'optimismo')) / 50;
  const agrado = perfil && rasgos.gustos?.caracter ? agradoPorCaracter(rasgos.gustos, perfil.caracter) : 0.5;
  const impresion = DISPOSICION.primeraImpresion * (agrado - 0.5);
  const factor = clamp(1 + social + animo + impresion, DISPOSICION.min, DISPOSICION.max);
  let motivo: string | undefined;
  if (Math.abs(social) >= Math.abs(impresion) && Math.abs(social) >= 0.06) motivo = social > 0 ? 'Le encanta hablar' : 'Es de pocas palabras';
  else if (Math.abs(impresion) >= 0.03) motivo = impresion > 0 ? 'Congeniáis de primeras' : 'No congeniáis de primeras';
  return { factor, motivo };
}
