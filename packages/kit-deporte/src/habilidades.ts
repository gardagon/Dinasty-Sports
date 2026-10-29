import { GEN, type ReadContext, type StatDef } from '@ds/contracts';

/** Genérica que apoya a una habilidad y su peso sobre el ritmo de subida (el techo pesa la mitad). */
export type Apoyo = { stat: string; weight: number };

/** Id del conocimiento de un deporte (`atletismo.conocimiento`). */
export const idDeConocimiento = (deporte: string): string => `${deporte}.conocimiento`;

/**
 * Una habilidad propia de un deporte: sube con las genéricas que la apoyan (y la determinación), su techo crece con el
 * desarrollo por la edad y su tope no se hereda: sale de las genéricas de `tope` más una aptitud propia (±15 %).
 */
export function habilidadDeportiva(deporte: string, grupo: string, key: string, name: string, apoyos: Apoyo[], description: string, tope: Apoyo[]): StatDef {
  return {
    id: `${deporte}.${key}`,
    name,
    description,
    group: grupo,
    category: 'habilidad',
    initial: { min: 5, max: 15 },
    talentSpread: 0.2,
    genetics: { derivedFrom: tope, aptitude: 0.15 },
    growth: {
      rate: 0.36,
      curve: 1.5,
      speedFrom: [...apoyos, { stat: GEN.determinacion, weight: 0.2 }],
      potentialFactor: GEN.vigorTecnico,
      cap: {
        // El techo de una habilidad deportiva crece con el desarrollo por la edad: nadie llega a su máximo antes de madurar.
        base: 0.15,
        from: [
          ...apoyos.map((a) => ({ stat: a.stat, weight: a.weight / 2 })),
          { stat: GEN.determinacion, weight: 0.15 },
          { stat: GEN.madurez, weight: 0.45 },
        ],
      },
    },
    decay: { graceDays: 4, ratePerDay: 0.012, floorRatio: 0.7 },
  };
}

/**
 * El conocimiento de un deporte: no es una habilidad sino un bonus/malus. Sube rápido al principio y cada vez más despacio
 * (todo el mundo puede llegar a 100, pero el último tramo cuesta años) y casi no se olvida.
 */
export function conocimientoDelDeporte(deporte: string, name: string, description: string): StatDef {
  return {
    id: idDeConocimiento(deporte),
    name,
    description,
    group: 'Conocimiento',
    category: 'conocimiento',
    initial: 0,
    talentSpread: 0,
    growth: {
      rate: 0.3,
      curve: 2.5,
      // Quien presta atención y razona bien aprende más de lo mismo.
      speedFrom: [
        { stat: GEN.atencion, weight: 0.9 },
        { stat: GEN.inteligencia, weight: 0.6 },
      ],
    },
    decay: { graceDays: 30, ratePerDay: 0.003, floorRatio: 0.95 },
  };
}

/**
 * Efecto del conocimiento en competición sobre una habilidad táctica: de ×0,85 (no conoces el deporte) a ×1,15 (lo conoces
 * a fondo), multiplicado por lo que esa habilidad depende de entender el deporte (`sensibilidad`, de 0 a 1). Lo puramente
 * físico no se pasa por aquí: saber del deporte no te hace más lento.
 */
const CONOCIMIENTO_EN_COMPETICION = { min: 0.85, rango: 0.3 };

/** Valor efectivo de una habilidad en competición: su nivel por el efecto del conocimiento del deporte. */
export function valorEfectivo(ctx: ReadContext, deporte: string, stat: string, sensibilidad: number): number {
  const f = CONOCIMIENTO_EN_COMPETICION.min + CONOCIMIENTO_EN_COMPETICION.rango * ctx.norm(idDeConocimiento(deporte));
  return ctx.stat(stat) * (1 + sensibilidad * (f - 1));
}
