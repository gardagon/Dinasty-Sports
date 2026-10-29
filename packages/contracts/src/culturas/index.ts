import { CHINA, JAPON_COREA_VIETNAM } from './asia_oriental';
import { AFRICA_CENTRAL_Y_GOLFO, OESTE_AFRICANO } from './africa_subsahariana';
import { BULGARIA_Y_BALCANES, POLONIA_Y_ESLAVOS, RUMANIA } from './europa_este';
import { BRITANICA, CONTINENTAL } from './europa_norte';
import { ESPANA } from './espana';
import { LATINOAMERICA } from './latinoamerica';
import { MAGREB } from './magreb';
import type { Cultura } from './tipos';

export * from './tipos';

/**
 * Las reservas de nombres: cada origen familiar (`OrigenDef.reserva`) apunta a una. Una reserva reúne las culturas de esa parte del mundo;
 * un país nuevo o un mod puede añadir las suyas con `registrarReserva`.
 */
const RESERVAS: Record<string, readonly Cultura[]> = {
  espana: [ESPANA],
  latinoamerica: [LATINOAMERICA],
  magreb: [MAGREB],
  africa_subsahariana: [OESTE_AFRICANO, AFRICA_CENTRAL_Y_GOLFO],
  europa_este: [RUMANIA, POLONIA_Y_ESLAVOS, BULGARIA_Y_BALCANES],
  europa_norte: [BRITANICA, CONTINENTAL],
  asia_oriental: [CHINA, JAPON_COREA_VIETNAM],
};

export const reservaDeNombres = (id: string): readonly Cultura[] => RESERVAS[id] ?? RESERVAS.espana;

/** Añade (o sustituye) una reserva de nombres: la usa un paquete de país o un mod. */
export function registrarReserva(id: string, culturas: readonly Cultura[]): void {
  RESERVAS[id] = culturas;
}

/** Los apodos habituales de un nombre de pila (de cualquier cultura): vacío si no hay. */
export function apodosDe(pila: string): readonly string[] {
  return Object.values(RESERVAS).flat().flatMap((c) => c.apodos?.[pila] ?? []);
}

/** Una cultura por su id (en cualquier reserva). */
export const culturaPorId = (id: string): Cultura | undefined => Object.values(RESERVAS).flat().find((c) => c.id === id);
