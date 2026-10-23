import { AFINIDAD_MAX, AFINIDAD_MIN, NIVEL_ESTADO, type EstadoVinculo } from '@ds/contracts';

/**
 * Vínculo con una persona: funciones puras (sin motor) para poder probarlas y ajustarlas sin tocar el módulo.
 * Escala de afinidad de −100 a 100; el 0 es "conocido".
 */

export interface Vinculo {
  npcId: string;
  /** −100..100 */
  afinidad: number;
  /** 0..100 */
  confianza: number;
  estado: EstadoVinculo;
  /** Día en que se conocieron. */
  desde: number;
  /** Día del último contacto (−1 si ninguno). */
  ultimoContacto: number;
  /** Días de los últimos contactos (los 8 más recientes). */
  contactos: number[];
}

/** Umbrales para entrar en cada estado. Salir exige cruzarlos con un margen, para que el estado no parpadee. */
export const UMBRALES = {
  margen: 8,
  antipatia: -15,
  enemigo: -45,
  antagonista: -75,
  amigo: { afinidad: 40, confianza: 30, contactos: 3, ventanaDias: 14 },
  mejorAmigo: { afinidad: 75, confianza: 60 },
} as const;

/** Hacia dónde se suaviza una antipatía con el tiempo: nunca llega a "conocido" por sí sola. */
export const SUELO_NEGATIVO = -20;

/** Cuánto se enfría cada estado sin contacto: días de gracia y puntos de afinidad por día. */
export const ENFRIAMIENTO: Record<EstadoVinculo, { graciaDias: number; porDia: number }> = {
  antagonista: { graciaDias: 30, porDia: 0.15 },
  enemigo: { graciaDias: 30, porDia: 0.15 },
  antipatia: { graciaDias: 30, porDia: 0.15 },
  conocido: { graciaDias: 7, porDia: 0.4 },
  amigo: { graciaDias: 21, porDia: 0.3 },
  mejor_amigo: { graciaDias: 45, porDia: 0.2 },
};
/** La confianza se pierde mucho más despacio. */
const CONFIANZA_GRACIA = 30;
const CONFIANZA_POR_DIA = 0.1;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const nuevoVinculo = (npcId: string, dia: number): Vinculo => ({
  npcId,
  afinidad: 0,
  confianza: 0,
  estado: 'conocido',
  desde: dia,
  ultimoContacto: -1,
  contactos: [],
});

/** Estado que corresponde a las cifras del vínculo, con margen de histéresis respecto al estado actual. */
export function estadoSegun(v: Vinculo, dia: number): EstadoVinculo {
  const a = v.afinidad;
  const actual = NIVEL_ESTADO[v.estado];
  const m = UMBRALES.margen;
  if (a > 0) {
    const recientes = v.contactos.filter((d) => dia - d <= UMBRALES.amigo.ventanaDias).length;
    const mejor = UMBRALES.mejorAmigo;
    if (actual >= 2 ? a >= mejor.afinidad - m : actual >= 1 && a >= mejor.afinidad && v.confianza >= mejor.confianza) return 'mejor_amigo';
    const amigo = UMBRALES.amigo;
    if (actual >= 1 ? a >= amigo.afinidad - m : a >= amigo.afinidad && v.confianza >= amigo.confianza && recientes >= amigo.contactos) return 'amigo';
    return 'conocido';
  }
  // Los niveles negativos se evalúan de peor a mejor.
  if (a <= UMBRALES.antagonista + (actual <= -3 ? m : 0)) return 'antagonista';
  if (a <= UMBRALES.enemigo + (actual <= -2 ? m : 0)) return 'enemigo';
  if (a <= UMBRALES.antipatia + (actual <= -1 ? m : 0)) return 'antipatia';
  return 'conocido';
}

/** Un contacto: cambia la afinidad y la confianza (puede ser negativo) y lo recuerda. */
export function conContacto(v: Vinculo, dia: number, dAfinidad: number, dConfianza = 0): Vinculo {
  const siguiente: Vinculo = {
    ...v,
    afinidad: clamp(v.afinidad + dAfinidad, AFINIDAD_MIN, AFINIDAD_MAX),
    confianza: clamp(v.confianza + dConfianza, 0, 100),
    ultimoContacto: dia,
    contactos: [...v.contactos.filter((d) => d !== dia), dia].slice(-8),
  };
  return { ...siguiente, estado: estadoSegun(siguiente, dia) };
}

/** Cambio sin contacto (p. ej. lo que pasa en una carrera): no cuenta como haber estado juntos. */
export function conCambio(v: Vinculo, dia: number, dAfinidad: number, dConfianza = 0): Vinculo {
  const siguiente: Vinculo = {
    ...v,
    afinidad: clamp(v.afinidad + dAfinidad, AFINIDAD_MIN, AFINIDAD_MAX),
    confianza: clamp(v.confianza + dConfianza, 0, 100),
  };
  return { ...siguiente, estado: estadoSegun(siguiente, dia) };
}

/**
 * Paso de un día: sin contacto, lo positivo se enfría hacia "conocido" (0) y lo negativo se suaviza solo hasta
 * la primera antipatía (−20). Devuelve el mismo objeto si no cambia nada.
 */
export function pasarDia(v: Vinculo, dia: number): Vinculo {
  const sinVer = dia - v.ultimoContacto;
  const { graciaDias, porDia } = ENFRIAMIENTO[v.estado];
  let { afinidad, confianza } = v;
  if (sinVer > graciaDias) {
    if (afinidad > 0) afinidad = Math.max(0, afinidad - porDia);
    else if (afinidad < SUELO_NEGATIVO) afinidad = Math.min(SUELO_NEGATIVO, afinidad + porDia);
  }
  if (sinVer > CONFIANZA_GRACIA && confianza > 0) confianza = Math.max(0, confianza - CONFIANZA_POR_DIA);
  if (afinidad === v.afinidad && confianza === v.confianza) return v;
  const siguiente = { ...v, afinidad, confianza };
  return { ...siguiente, estado: estadoSegun(siguiente, dia) };
}
