import { suceso } from '@ds/contracts';

/**
 * Llegar tarde al entrenamiento del atletismo. La mecánica ya existe y no se toca (la señal `club.sesion_tarde` la emite el kit de deporte para
 * cualquier deporte: quien se incorpora tarde entrena solo la parte que queda). Este suceso cuenta lo que pasa en la pista y deja decir algo, como
 * el del fútbol; lo propio del atletismo es la tercera salida: calentar a toda prisa y entrar directo en la serie, que sale bien o pasa factura.
 * Cifras de partida, por calibrar.
 */
export default suceso({
  id: 'atletismo.tarde_al_entrenamiento',
  titulo: 'Llegas tarde al entrenamiento',
  deporte: 'atletismo',
  disparo: { al: 'club.sesion_tarde' },
  ejemploDeSeñal: { sport: 'atletismo', minutos: 25 },
  cuando: [{ señal: 'sport', es: 'atletismo' }],
  repite: { espera: { dias: 21 } },
  reparto: { entrenador: { rol: 'entrenador', delDeportePrincipal: true } },
  texto: 'Cuando llegas a la pista, el grupo ya ha acabado el rodaje suave. Vas {señal.minutos} minutos tarde. {entrenador.Nombre} mira el cronómetro y luego a ti.',
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'nada' },
  opciones: [
    { id: 'disculparse', texto: 'Pedir perdón y empezar a calentar', caracter: { disciplina: 1, honestidad: 1 }, efectos: [{ relacion: 'entrenador', afinidad: -1 }], resultado: '«Que no se repita. Los estiramientos, bien hechos». Y a trotar.' },
    {
      id: 'excusa',
      texto: 'Decir que se alargó la última clase',
      caracter: { honestidad: -2 },
      tirada: { con: 'gen.picardia', dificultad: 40 },
      exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.5 }], resultado: '{entrenador.Nombre} se encoge de hombros. «Pues a la cuerda, que vamos con las series».' },
      fallo: { efectos: [{ relacion: 'entrenador', afinidad: -3, confianza: -1 }], resultado: '«Hoy ha salido todo el colegio a su hora. Una vuelta más a la pista, por la excusa».' },
    },
    {
      id: 'recuperar',
      texto: 'Calentar a toda prisa y meterte en la serie',
      caracter: { ambicion: 1, prudencia: -1 },
      tirada: { con: 'gen.resistencia', dificultad: 40 },
      exito: { efectos: [{ relacion: 'entrenador', afinidad: 1 }, { entrena: 'gen.resistencia', cantidad: 0.3 }], resultado: 'Sales con las piernas frías, pero aguantas el ritmo. «Así me gusta. Y mañana, a tu hora».' },
      fallo: { efectos: [{ relacion: 'entrenador', afinidad: -2 }, { estado: 'gen.energia', mas: -3 }], resultado: 'A la segunda repetición notas un tirón. «Esto es lo que pasa por no calentar. Siéntate un rato».' },
    },
    { id: 'nada', texto: 'Unirte al grupo sin decir nada', efectos: [{ relacion: 'entrenador', afinidad: -2 }], resultado: 'Nadie dice nada. {entrenador.Nombre} lo apunta en su libreta.' },
  ],
  pruebas: [{ nombre: 'Sale al llegar tarde y se puede pedir perdón', espero: { opcionDisponible: 'disculparse' } }],
});
