import { GEN, type Entrenamiento, type StatDef } from '@ds/contracts';
import { conocimientoDelDeporte, habilidadDeportiva, idDeConocimiento, type Apoyo } from '@ds/kit-deporte';

/**
 * Las habilidades del atletismo y lo que entrena cada práctica, en un solo sitio: las usan las acciones del personaje (`index.ts`) y la rutina de los PNJ (`datos.ts`),
 * que entrenan **con las mismas listas** (plan `docs/MISMAS_REGLAS.md`).
 */

export const DEPORTE = 'atletismo';
export const CONOCIMIENTO = idDeConocimiento(DEPORTE);

const habilidad = (key: string, name: string, apoyos: Apoyo[], description: string, tope: Apoyo[]) => habilidadDeportiva(DEPORTE, 'Atletismo', key, name, apoyos, description, tope);

export const STATS_DE_ATLETISMO: readonly StatDef[] = [
  habilidad('tecnica', 'Técnica de carrera', [{ stat: GEN.coordinacion, weight: 0.4 }, { stat: GEN.agilidad, weight: 0.2 }], 'Zancada eficiente y postura.', [{ stat: GEN.coordinacion, weight: 0.5 }, { stat: GEN.agilidad, weight: 0.3 }, { stat: GEN.determinacion, weight: 0.2 }]),
  habilidad('ritmo', 'Gestión del ritmo', [{ stat: GEN.resistencia, weight: 0.4 }, { stat: GEN.inteligencia, weight: 0.2 }], 'Repartir el esfuerzo en la vuelta.', [{ stat: GEN.resistencia, weight: 0.5 }, { stat: GEN.inteligencia, weight: 0.25 }, { stat: GEN.determinacion, weight: 0.25 }]),
  conocimientoDelDeporte(
    DEPORTE,
    'Conocimiento de atletismo',
    'Entender el deporte: ritmos, tácticas, quién sale mejor. Sube entrenando, compitiendo y, en menor medida, viendo atletismo; casi no se olvida.',
  ),
  habilidad('salida', 'Salida y aceleración', [{ stat: GEN.velocidad, weight: 0.4 }, { stat: GEN.fuerza, weight: 0.2 }], 'Arrancar rápido desde los tacos.', [{ stat: GEN.velocidad, weight: 0.5 }, { stat: GEN.fuerza, weight: 0.3 }, { stat: GEN.coordinacion, weight: 0.2 }]),
];

/** Una sesión con el club: técnica, ritmo y salida, lo físico que las apoya y mucho conocimiento (con entrenador y grupo se aprende el deporte como en ningún otro entrenamiento). */
export const SESION_DE_CLUB: readonly Entrenamiento[] = [
  { stat: 'atletismo.tecnica', amount: 2 },
  { stat: 'atletismo.ritmo', amount: 2 },
  { stat: 'atletismo.salida', amount: 2 },
  { stat: GEN.velocidad, amount: 0.6 },
  { stat: GEN.resistencia, amount: 0.6 },
  { stat: GEN.coordinacion, amount: 0.4 },
  { stat: CONOCIMIENTO, amount: 1.6 },
];

/** Practicar con los amigos (juego informal): sienta bien, pero no se mejora igual que entrenando. */
export const JUEGO_INFORMAL: readonly Entrenamiento[] = [
  { stat: 'atletismo.tecnica', amount: 0.4 },
  { stat: 'atletismo.ritmo', amount: 0.4 },
  { stat: 'atletismo.salida', amount: 0.4 },
  { stat: GEN.carisma, amount: 0.4 },
  { stat: GEN.cooperacion, amount: 0.3 },
];
