import { CIUDAD_ACTUAL, PAIS_ESPANA, conCiudad, registrarPais } from '@ds/contracts';

/**
 * La ciudad de ahora pero con tres clubes de fútbol en la zona (grande, mediano y pequeño) en lugar de los dos que le tocan por su población (`personasPorClub`, `CIUDAD_Y_LIGAS.md` §3): los tests
 * de los clubes (las plazas, los fichajes, el reparto por tamaño) necesitan los tres, y así no cambian con el número de clubes que pida la ciudad por defecto.
 */
export const PAIS_TRES_CLUBES = conCiudad(PAIS_ESPANA, { ...CIUDAD_ACTUAL, personasPorClub: 480 }, '_tres_clubes');
registrarPais(PAIS_TRES_CLUBES);
export const ID_TRES_CLUBES = PAIS_TRES_CLUBES.id;
