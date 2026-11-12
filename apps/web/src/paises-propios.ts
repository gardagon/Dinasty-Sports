import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';

/**
 * Los países que la web ofrece además de los de serie: **España con la ciudad grande del diseño** (unas 6.000 personas, 9 clubes de la zona y unos 156 equipos de fútbol), con la que se juega el fútbol de verdad. Crearla tarda unos 40 segundos
 * (de ahí la pantalla de «creando el mundo»). Lo importan la interfaz y el trabajador que crea la partida, para que los dos conozcan el mismo país.
 */
export const ID_DE_LA_CIUDAD_GRANDE = PAIS_CIUDAD_GRANDE.id;
registrarPais({ ...PAIS_CIUDAD_GRANDE, nombre: 'España · ciudad grande (se tarda unos 40 s en crear)' });
