import { SHARED_EVENTS, suceso } from '@ds/contracts';

/**
 * Moverse con el grupo (21/11/2026, `docs/relevo/moverse-con-el-grupo.md`). La señal la emite `npcs` (dueño de la presencia) cuando, al acabar una acción, la mayoría de la gente que
 * tenías cerca se ha ido a un mismo sitio y tú sigues donde estabas: el recreo que acaba y se van todos al aula, el que empieza y se van al patio, la clase que acaba y salen a la entrada,
 * el vestuario y el campo... Aquí no hay ni un sitio ni una hora: todo viene en la señal (`desde`, `hacia`, `haciaTexto`, `minutos`).
 *
 * Se responde en el momento (`ahora`, sin aplazar: si haces otra cosa sin responder, te quedas) y, si dices que sí, es un viaje rápido que gasta lo que cuesta ir (`minutos` de la señal):
 * `lugares` te lleva con el evento compartido `lugares.ir_a`, y allí sigues con ellos (ya están allí por sus agendas).
 */
export default suceso({
  id: 'eventos.grupo.se_van',
  titulo: 'Se van en grupo',
  requiere: ['lugares'],
  disparo: { al: SHARED_EVENTS.GRUPO_SE_VA },
  repite: 'siempre',
  // Para probarlo sin esperar a que pase: del aula al patio, al empezar el recreo.
  ejemploDeSeñal: { desde: 'aula', hacia: 'patio', haciaTexto: 'al patio', minutos: 4, cuantos: 20, total: 34, muestra: [] },
  // Si conoces a alguien del grupo, ir con él te acerca un poco (si no conoces a ninguno, no hay a quién).
  reparto: { quien: { deLaSeñal: 'muestra', opcional: true } },
  texto: 'Todos se van {señal.haciaTexto}. ¿Les acompañas?',
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'quedarte' },
  opciones: [
    {
      id: 'acompanar',
      texto: 'Ir con ellos',
      caracter: { sociabilidad: 1 },
      minutos: { deLaSeñal: 'minutos' },
      efectos: [{ emite: 'lugares.ir_a', datos: { destino: '{señal.hacia}' } }, { relacion: 'quien', afinidad: 1 }, { estado: 'gen.estres', mas: -1 }],
      resultado: 'Vas con ellos {señal.haciaTexto}, charlando por el camino.',
    },
    { id: 'quedarte', texto: 'Quedarte aquí', caracter: { sociabilidad: -1 }, efectos: [], resultado: 'Te quedas donde estás y el grupo se va sin ti.' },
  ],
  pruebas: [
    { nombre: 'Sale con la señal y se puede ir con ellos o quedarse', espero: { opcionDisponible: 'acompanar' } },
    { nombre: 'Quedarse siempre se puede', espero: { opcionDisponible: 'quedarte' } },
  ],
});
