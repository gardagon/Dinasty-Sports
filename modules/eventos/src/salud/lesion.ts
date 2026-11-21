import { suceso } from '@ds/contracts';

/**
 * Una lesión, contada y con consecuencias. Las lesiones de la gente del mundo ya salen de su estado de juego cada semana (`estado-de-jugador.ts`);
 * `npcs` avisa de cada una (`persona.lesion`) y este suceso es lo que le pasa después a quien se lesiona: el golpe de moral y cómo lleva la baja,
 * que decide por su carácter. Es el único suceso que hoy viven también los PNJ (clase `lesion`). Cifras de partida, por calibrar.
 */
export default suceso({
  id: 'eventos.salud.lesion',
  titulo: 'Una lesión',
  para: 'cualquiera',
  clase: 'lesion',
  disparo: { al: 'persona.lesion' },
  sujeto: { deLaSeñal: 'npcId' },
  ejemploDeSeñal: { npcId: 'prueba_sujeto', semanas: 3, deporte: 'atletismo' },
  repite: 'siempre',
  texto: 'El médico es claro: {señal.semanas} semanas sin entrenar ni competir.',
  textoDeCercano: '{sujeto.Nombre} se ha lesionado: estará {señal.semanas} semanas de baja.',
  efectos: [{ estadoDeJugador: { moral: -6 } }, { marca: 'lesionado_hace_poco', dura: { dias: 60 } }],
  plazo: { dias: 2, porDefecto: 'recuperarse_bien' },
  opciones: [
    {
      id: 'recuperarse_bien',
      texto: 'Hacer la recuperación completa, sin prisas',
      caracter: { prudencia: 2, disciplina: 1 },
      efectos: [{ estadoDeJugador: { salud: 5 } }],
      resultado: 'Toca tener paciencia.',
    },
    {
      id: 'forzar',
      texto: 'Forzar para volver una semana antes',
      requiere: [{ señal: 'semanas', min: 2 }],
      caracter: { prudencia: -2, ambicion: 2 },
      efectos: [{ estadoDeJugador: { baja: -1, salud: -8, moral: 2 } }],
      resultado: 'Volverás antes, pero sin estar del todo bien.',
    },
  ],
});
