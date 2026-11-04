import type { PuestoDeDeporte, PuestosDeDeporte } from '@ds/contracts';

/**
 * Los 16 puestos del fútbol (los del addon 2.1, `docs/diseno/addon_futbol_v2.1.json`), con las habilidades que pesan en cada uno y su parecido con los demás. **Adelanto de la F3**
 * (`CIUDAD_Y_LIGAS.md` §5): con esto se calcula el nivel de cada jugador en cada puesto y los clubes reparten la plantilla y deciden las plazas por puesto; los roles y la experiencia en
 * cada puesto siguen en la F3. Los pesos son una propuesta a calibrar: cada puesto pesa lo suyo (el central, marcaje, entrada y juego aéreo; el extremo, regate y velocidad...).
 */

/** Las afinidades del addon (porcentaje de experiencia que pasa de un puesto a otro, de 0 a 1): sirven para saber cuánto se parece un puesto a otro. */
const AFINIDADES: Record<string, Record<string, number>> = {
  GK: { CB: 0.2, LB: 0.05, RB: 0.05, CDM: 0.05 },
  CB: { GK: 0.05, LB: 0.4, RB: 0.4, CDM: 0.3, LCR: 0.2, RCR: 0.2, CM: 0.15 },
  LB: { CB: 0.3, RB: 0.2, LCR: 0.4, CDM: 0.2, CM: 0.2, LW: 0.3, LM: 0.2 },
  RB: { CB: 0.3, LB: 0.2, RCR: 0.4, CDM: 0.2, CM: 0.2, RW: 0.3, RM: 0.2 },
  CDM: { CB: 0.25, LCR: 0.3, RCR: 0.3, CM: 0.5, LM: 0.2, RM: 0.2 },
  LCR: { LB: 0.35, CDM: 0.3, CM: 0.3, LM: 0.3, LW: 0.35 },
  RCR: { RB: 0.35, CDM: 0.3, CM: 0.3, RM: 0.3, RW: 0.35 },
  CM: { CDM: 0.4, LCR: 0.25, RCR: 0.25, LM: 0.35, RM: 0.35, CAM: 0.35 },
  LM: { LCR: 0.3, CM: 0.35, CDM: 0.2, CAM: 0.3, LW: 0.3, LST: 0.15 },
  RM: { RCR: 0.3, CM: 0.35, CDM: 0.2, CAM: 0.3, RW: 0.3, RST: 0.15 },
  CAM: { CM: 0.35, LM: 0.25, RM: 0.25, LW: 0.25, RW: 0.25, ST: 0.25 },
  LW: { LCR: 0.25, LM: 0.3, CAM: 0.25, LB: 0.2, LST: 0.3 },
  RW: { RCR: 0.25, RM: 0.3, CAM: 0.25, RB: 0.2, RST: 0.3 },
  ST: { CAM: 0.25, LST: 0.4, RST: 0.4, LW: 0.2, RW: 0.2 },
  LST: { ST: 0.4, RST: 0.3, LW: 0.35, LM: 0.2, CAM: 0.2 },
  RST: { ST: 0.4, LST: 0.3, RW: 0.35, RM: 0.2, CAM: 0.2 },
};

/** Pesos por puesto: las habilidades propias llevan su clave sin el prefijo `futbol.`; las capacidades, su id `gen.*`. Se normalizan al usarlos. */
const PESOS: Record<string, Record<string, number>> = {
  GK: { reflejos: 3, mano_a_mano: 2, blocaje: 3, despeje: 1.5, alcance_aereo: 2, dominio_area: 2, posicionamiento: 1, decisiones: 1, salto: 0.5 },
  CB: { marcaje: 3, entrada: 2.5, cabeza: 2.5, posicionamiento: 2.5, anticipacion: 2, 'gen.fuerza': 1.5, salto: 1, pase: 1, decisiones: 1 },
  LB: { marcaje: 2, entrada: 2, arrancada: 2, centros: 1.5, 'gen.resistencia': 1.5, posicionamiento: 1.5, pase: 1, regate: 0.5, 'gen.velocidad': 1.5 },
  RB: { marcaje: 2, entrada: 2, arrancada: 2, centros: 1.5, 'gen.resistencia': 1.5, posicionamiento: 1.5, pase: 1, regate: 0.5, 'gen.velocidad': 1.5 },
  CDM: { entrada: 2.5, marcaje: 2, posicionamiento: 2.5, pase: 2, vision: 1.5, anticipacion: 2, 'gen.resistencia': 1.5, juego_colectivo: 1.5, decisiones: 1.5 },
  LCR: { 'gen.resistencia': 2, pase: 2, entrada: 1.5, arrancada: 1.5, control: 1.5, juego_colectivo: 2, posicionamiento: 1.5, centros: 1, 'gen.velocidad': 1 },
  RCR: { 'gen.resistencia': 2, pase: 2, entrada: 1.5, arrancada: 1.5, control: 1.5, juego_colectivo: 2, posicionamiento: 1.5, centros: 1, 'gen.velocidad': 1 },
  CM: { pase: 3, vision: 2.5, control: 2, decisiones: 2, juego_colectivo: 2, 'gen.resistencia': 1.5, tecnica: 1.5, posicionamiento: 1 },
  LM: { pase: 2, control: 2, regate: 1.5, vision: 1.5, 'gen.resistencia': 2, arrancada: 1.5, centros: 1.5, desmarque: 1, juego_colectivo: 1.5 },
  RM: { pase: 2, control: 2, regate: 1.5, vision: 1.5, 'gen.resistencia': 2, arrancada: 1.5, centros: 1.5, desmarque: 1, juego_colectivo: 1.5 },
  CAM: { vision: 3, pase: 3, regate: 2, control: 2.5, tecnica: 2.5, disparo_lejano: 1.5, decisiones: 2, desmarque: 1.5, definicion: 1 },
  LW: { regate: 3, arrancada: 3, 'gen.velocidad': 2.5, centros: 2, control: 1.5, definicion: 1.5, desmarque: 1.5, tecnica: 1 },
  RW: { regate: 3, arrancada: 3, 'gen.velocidad': 2.5, centros: 2, control: 1.5, definicion: 1.5, desmarque: 1.5, tecnica: 1 },
  ST: { definicion: 3.5, desmarque: 2.5, cabeza: 2, arrancada: 1.5, sangre_fria: 2, control: 1.5, posicionamiento: 1.5, 'gen.fuerza': 1, anticipacion: 1 },
  LST: { definicion: 3, desmarque: 2, regate: 1.5, arrancada: 2, control: 1.5, sangre_fria: 1.5, 'gen.velocidad': 1.5, tecnica: 1, disparo_lejano: 1 },
  RST: { definicion: 3, desmarque: 2, regate: 1.5, arrancada: 2, control: 1.5, sangre_fria: 1.5, 'gen.velocidad': 1.5, tecnica: 1, disparo_lejano: 1 },
};

const NOMBRES: readonly [string, string, number][] = [
  ['GK', 'Portero', 0],
  ['CB', 'Central', 1],
  ['LB', 'Lateral izquierdo', 1],
  ['RB', 'Lateral derecho', 1],
  ['CDM', 'Pivote', 2],
  ['LCR', 'Carrilero izquierdo', 2],
  ['RCR', 'Carrilero derecho', 2],
  ['CM', 'Mediocentro', 3],
  ['LM', 'Interior izquierdo', 3],
  ['RM', 'Interior derecho', 3],
  ['CAM', 'Mediapunta', 4],
  ['LW', 'Extremo izquierdo', 4],
  ['RW', 'Extremo derecho', 4],
  ['ST', 'Delantero centro', 5],
  ['LST', 'Delantero izquierdo', 5],
  ['RST', 'Delantero derecho', 5],
];

/** Los pesos con el prefijo del deporte puesto (`pase` → `futbol.pase`) y normalizados para que sumen 1. */
function pesosDe(id: string): Record<string, number> {
  const en = PESOS[id];
  const total = Object.values(en).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(en).map(([k, v]) => [k.startsWith('gen.') ? k : `futbol.${k}`, v / total]));
}

export const PUESTOS_DE_FUTBOL: PuestosDeDeporte = {
  // La pierna buena (decisión del 04/11): en torno a un 20 % de zurdos; el lado de su pierna vale ±0,25 de base; y la experiencia en un puesto de su lado crecerá un 25 % más deprisa (a calibrar).
  pierna: { proporcionDeZurdos: 0.2, ventajaDelLado: 0.25, factorDeExperienciaDelLado: 1.25 },
  // Cómo se forman los equipos: 11 titulares (un 4-3-3: 1 portero, 2 centrales, 2 laterales, 3 mediocentros, 2 de banda y 1 delantero) y 7 suplentes; y el listón de los de primer año (+4 puntos: con las posiciones obligadas, aun así entran en el A unos 3 o 4 primeros años por club y categoría).
  equipos: { titulares: { portero: 1, central: 2, lateral: 2, medio: 3, banda: 2, delantero: 1 }, listonDePrimerAno: 4 },
  puestos: NOMBRES.map(([id, nombre, linea]): PuestoDeDeporte => ({ id, nombre, linea, pesos: pesosDe(id), afinidades: AFINIDADES[id] ?? {} })),
  // Una plantilla de 18: 2 porteros, 3 centrales, 3 laterales, 4 mediocentros, 3 de banda o extremos y 3 delanteros.
  reparto: [
    { grupo: 'portero', nombre: 'Portero', puestos: ['GK'], jugadores: 2 },
    { grupo: 'central', nombre: 'Central', puestos: ['CB'], jugadores: 3 },
    { grupo: 'lateral', nombre: 'Lateral', puestos: ['LB', 'RB'], jugadores: 3 },
    { grupo: 'medio', nombre: 'Mediocentro', puestos: ['CDM', 'LCR', 'RCR', 'CM'], jugadores: 4 },
    { grupo: 'banda', nombre: 'Banda o extremo', puestos: ['LM', 'RM', 'LW', 'RW'], jugadores: 3 },
    { grupo: 'delantero', nombre: 'Delantero', puestos: ['CAM', 'ST', 'LST', 'RST'], jugadores: 3 },
  ],
};
