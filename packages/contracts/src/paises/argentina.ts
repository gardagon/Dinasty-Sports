import { ARGENTINA_CRIOLLA, ARGENTINA_ITALIANA } from '../culturas/argentina';
import type { OrigenDef } from '../rasgos';
import { copiaDeEspana } from './espana';

/** El origen «argentino» (criollo e italiano): aspecto de la población mayoritaria. Su peso en España es 0 (el de Argentina está en su demografía). */
const ORIGEN_ARGENTINA: OrigenDef = {
  id: 'argentina',
  reserva: 'argentina',
  nombre: 'Argentina',
  frecuencia: 0,
  peloColor: [0.3, 0.4, 0.2, 0.07, 0.02, 0.01],
  peloTipo: [0.4, 0.4, 0.17, 0.03],
  ojos: [0.35, 0.35, 0.15, 0.06, 0.02, 0.07],
  piel: [0.04, 0.38, 0.38, 0.16, 0.04, 0],
};

/**
 * Argentina. **Calendario, currículo, categorías y horarios: COPIA de España** con su nombre (a cambiar cuando se estudien: el curso empieza en
 * marzo, el verano es en enero y febrero, la escuela primaria y secundaria tienen otros cursos). **La gente sí es argentina:** demografía,
 * nombres (criollos y de origen italiano, con un solo apellido, el del padre) y aspecto.
 */
export const PAIS_ARGENTINA = copiaDeEspana('argentina', 'Argentina', {
  demografia: { argentina: 0.76, latinoamerica: 0.1, espana_norte: 0.01, espana_centro: 0.02, espana_sur: 0.01, europa_este: 0.01, europa_norte: 0.03, asia_oriental: 0.02, magreb: 0.01, africa_subsahariana: 0.01 },
  origenesLocales: ['argentina'],
  apellidosDeLosNacidosAqui: 1,
  origenes: [ORIGEN_ARGENTINA],
  reservasDeNombres: { argentina: [ARGENTINA_CRIOLLA, ARGENTINA_ITALIANA] },
});
