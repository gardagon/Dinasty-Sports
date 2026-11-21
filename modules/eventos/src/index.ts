import { APORTE_DE_SUCESOS, defineModule } from '@ds/contracts';
import { CATALOGO } from './catalogo';

/**
 * MÓDULO EVENTOS (id `eventos`): los EVENTOS BASE del juego, como datos, en una carpeta por área (familia, perks, relaciones, cuerpo…).
 * No tiene código de juego ni estado: solo aporta su catálogo al director (módulo `sucesos`), que decide cuándo sale cada uno y aplica lo
 * que deja. Los eventos de cada deporte van dentro del paquete del deporte, con el mismo formato.
 *
 * Añadir un evento: `npm run eventos:nuevo -- eventos.<área>.<nombre> "Título"`, escribirlo y `npm run eventos:validar`.
 * Formato y herramienta: `docs/PLAN_EVENTOS.md` y `docs/ANEXO_EVENTOS.md`.
 */
export const eventos = defineModule({
  id: 'eventos',
  name: 'Eventos',
  description: 'Los eventos base del juego: lo que pasa en casa, en el colegio, con los amigos y con uno mismo.',
  aportes: { [APORTE_DE_SUCESOS]: CATALOGO },
});

export default eventos;
