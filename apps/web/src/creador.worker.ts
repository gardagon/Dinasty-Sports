import { INTERFAZ_DE_DEPORTES, PROGRESO_DE_CREACION, importarPais } from '@ds/contracts';
import { ANFITRION_DE_DEPORTES, MODULOS, nuevaPartida } from '@ds/game';
import { Instalador, almacenEnMemoria } from '@ds/paquetes';
import { CLAVE_PUBLICA } from './clave';
import './paises-propios';
import type { MensajeDelCreador, PeticionDeCreacion } from './creador';

/**
 * El trabajador que crea la partida **fuera del hilo de la página** (con la ciudad grande tarda unos 40 segundos: en la página congelaría todo): conoce los países y los deportes instalados que le pasa la página, crea la partida
 * avisando de cada paso y devuelve su estado en texto (la página lo abre con `cargarPartida`).
 */
const hablar = (m: MensajeDelCreador): void => (self as unknown as { postMessage(m: MensajeDelCreador): void }).postMessage(m);

(self as unknown as { onmessage: (e: { data: PeticionDeCreacion }) => void }).onmessage = async (e) => {
  try {
    for (const texto of e.data.paises) importarPais(texto);
    // Los deportes instalados se cargan como en la página: comprobando su firma y su versión.
    const almacen = almacenEnMemoria();
    for (const [id, texto] of Object.entries(e.data.deportes)) await almacen.guardar(id, texto);
    const { modulos, avisos } = await new Instalador(almacen, { clavePublica: CLAVE_PUBLICA, interfaz: INTERFAZ_DE_DEPORTES }, ANFITRION_DE_DEPORTES).modulos();
    if (avisos.length && !modulos.length && Object.keys(e.data.deportes).length) throw new Error(avisos[0]);
    const todos = [...MODULOS, ...modulos.filter((m) => !MODULOS.some((b) => b.id === m.id))];
    PROGRESO_DE_CREACION.alAvanzar = (texto, fraccion) => hablar({ tipo: 'progreso', texto, fraccion });
    const partida = nuevaPartida(e.data.opciones, todos);
    hablar({ tipo: 'listo', estado: partida.serializarJSON() });
  } catch (error) {
    hablar({ tipo: 'error', mensaje: error instanceof Error ? error.message : String(error) });
  }
};
