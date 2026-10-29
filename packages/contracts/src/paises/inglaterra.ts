import { BRITANICA } from '../culturas/europa_norte';
import { ASIA_SUR_INDIA, ASIA_SUR_MUSULMANA, AFROCARIBENO_BRITANICO } from '../culturas/inglaterra';
import type { OrigenDef } from '../rasgos';
import { copiaDeEspana } from './espana';

const ORIGENES_INGLATERRA: OrigenDef[] = [
  { id: 'britanico', reserva: 'britanica', nombre: 'Reino Unido e Irlanda', frecuencia: 0, peloColor: [0.06, 0.22, 0.3, 0.2, 0.16, 0.06], peloTipo: [0.5, 0.33, 0.15, 0.02], ojos: [0.05, 0.18, 0.15, 0.1, 0.12, 0.4], piel: [0.12, 0.6, 0.22, 0.06, 0, 0] },
  { id: 'asia_sur', reserva: 'asia_sur', nombre: 'Asia del sur', frecuencia: 0, peloColor: [0.9, 0.09, 0.01, 0, 0, 0], peloTipo: [0.45, 0.4, 0.13, 0.02], ojos: [0.7, 0.25, 0.04, 0.01, 0, 0], piel: [0, 0.02, 0.18, 0.3, 0.42, 0.08] },
  { id: 'afrocaribeno', reserva: 'afrocaribeno_britanico', nombre: 'Caribe y África (británicos)', frecuencia: 0, peloColor: [0.9, 0.09, 0.01, 0, 0, 0], peloTipo: [0.02, 0.08, 0.3, 0.6], ojos: [0.85, 0.13, 0.02, 0, 0, 0], piel: [0, 0, 0.02, 0.06, 0.32, 0.6] },
];

/**
 * Inglaterra. **Calendario, currículo, categorías y horarios: COPIA de España** con su nombre (a cambiar cuando se estudien: los «years», los tres
 * «terms», las categorías «under», los horarios). **La gente sí es inglesa:** demografía (británicos, asiáticos del sur, afrocaribeños, polacos…),
 * nombres con un solo apellido y aspecto.
 */
export const PAIS_INGLATERRA = copiaDeEspana('inglaterra', 'Inglaterra', {
  demografia: { britanico: 0.72, asia_sur: 0.09, afrocaribeno: 0.04, europa_este: 0.05, europa_norte: 0.04, africa_subsahariana: 0.02, asia_oriental: 0.015, magreb: 0.01, latinoamerica: 0.005, espana_centro: 0.01 },
  origenesLocales: ['britanico', 'afrocaribeno'],
  apellidosDeLosNacidosAqui: 1,
  origenes: ORIGENES_INGLATERRA,
  reservasDeNombres: {
    britanica: [BRITANICA],
    asia_sur: [ASIA_SUR_INDIA, ASIA_SUR_MUSULMANA],
    afrocaribeno_britanico: [AFROCARIBENO_BRITANICO],
  },
});
