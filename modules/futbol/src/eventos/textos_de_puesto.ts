import type { TextosDePlazaPerdida, TextosDeEquipoSinNinos, TextosDePedirPuesto, TextosDePlazaExtra, TextosDePruebaDeAcceso } from '@ds/kit-deporte';

/**
 * Los textos de la prueba de acceso y de pedirle al entrenador otro puesto. Las reglas (huecos, tirada, dificultad) son comunes a todo deporte con puestos y viven en el kit
 * (`sucesoDePruebaDeAcceso`, `sucesoDePedirPuesto`); aquí solo lo que se lee. Los monta `index.ts` con la configuración del fútbol.
 */
export const TEXTOS_DE_PRUEBA_DE_ACCESO: TextosDePruebaDeAcceso = {
  titulo: 'La prueba en el club',
  pregunta:
    'Llegas al campo y un hombre o una mujer con un chándal del club se acerca. «Yo soy {entrenador.nombre}, el entrenador. Hoy vas a entrenar con nosotros». Mira la lista. «Nos faltan jugadores en varios puestos. ¿Dónde te ves tú?».',
  preguntaConNecesidad:
    'Llegas al campo y un hombre o una mujer con un chándal del club se acerca. «Yo soy {entrenador.nombre}, el entrenador. Hoy vas a entrenar con nosotros». Mira la lista. «Lo que más necesito ahora son {señal.necesita}. ¿Dónde te ves tú?».',
  opcionDePuesto: 'Decirle que de {puesto}',
  resultadoDeHueco: '{entrenador.Nombre} asiente. «De {puesto}, pues. A ver qué tal».',
  resultadoSinHueco: '{entrenador.Nombre} niega con la cabeza. «De {puesto} no me hace falta nadie. Pero quédate, entrena con nosotros y veamos qué tal. Te pondré donde yo vea».',
  resultadoSinHuecoDicho: '{entrenador.Nombre} niega con la cabeza. «De {puesto} no es ninguno de los que te he dicho. Pero quédate, entrena con nosotros y veamos qué tal. Te pondré donde yo vea».',
  opcionQueDecida: 'Decirle que donde él vea',
  resultadoQueDecida: '«Eso me gusta. Ya te pondré donde mejor te vea».',
  presentacion: 'Llegas al campo y {entrenador.nombre}, el entrenador, se presenta. «Hoy entrenas con nosotros. Te pondré donde mejor te vea».',
};

export const TEXTOS_DE_PEDIR_PUESTO: TextosDePedirPuesto = {
  titulo: 'Pedirle a {entrenador.nombre} jugar de {señal.puestoNombre}',
  planteamiento: 'Esperas a que acabe el entrenamiento y se lo planteas con tus palabras.',
  concede: '{entrenador.Nombre} se lo piensa. «Vale. Te pruebo de {señal.puestoNombre}. Pero si no funciona, vuelves donde yo diga».',
  niega: '«Aquí las posiciones las pongo yo». {entrenador.Nombre} no cambia de idea.',
  pocoTiempo: 'Hace muy poco que le pedías algo parecido y a {entrenador.nombre} no le ha hecho gracia.',
};

export const TEXTOS_DE_PLAZA_EXTRA: TextosDePlazaExtra = {
  titulo: 'Una plaza de más en el equipo',
  texto:
    'Antes de empezar el curso, {entrenador.nombre} te llama aparte. «Han llegado jugadores que valen más que tú en tu puesto y el equipo está completo. No quiero dejarte fuera, así que te hago una plaza de más. Pero te lo digo claro: voy a contar menos contigo, y si no das el nivel, jugarás poco».',
  opcionQuedarse: 'Quedarte en el equipo de todos modos',
  resultadoQuedarse: '«Me alegra que te quedes. Entrena fuerte y ya veremos». {entrenador.Nombre} te da una palmada en el hombro.',
  opcionProbar: 'Decirle que vas a probar en otros clubes',
  resultadoProbar: '{entrenador.Nombre} asiente. «Estás en tu derecho. Tu plaza sigue aquí hasta que otro club te coja, y si no te cogen, sigues con nosotros».',
  opcionMejorar: 'Preguntarle qué tienes que mejorar para volver a contar',
  resultadoMejorar: '{entrenador.Nombre} te explica con calma qué echa en falta. «Enséñamelo en los entrenamientos y volveré a contar contigo».',
};

export const TEXTOS_DE_EQUIPO_SIN_NINOS: TextosDeEquipoSinNinos = {
  titulo: 'Tu equipo no sale este año',
  pocos:
    'Antes de empezar el curso te llega la noticia: con los que han subido de categoría y los que se han ido a probar a otros clubes, en tu categoría solo quedan {señal.jugadores} niños contándote a ti, y para formar un equipo hacen falta {señal.minimo}. Este año no habrá equipo. Si quieres seguir jugando, tendrás que buscarte uno, como todos los demás.',
  sinCategoria:
    'Antes de empezar el curso te llega la noticia: tu club no tiene equipo en la categoría a la que subes este año. Si quieres seguir jugando, tendrás que buscarte uno, como todos los demás.',
  finDeCategorias:
    'Antes de empezar el curso te llega la noticia: se acaba el fútbol base en tu club. Con tu edad ya no hay categoría en la que puedas jugar aquí, así que este año no hay equipo para ti. Si quieres seguir jugando, tendrás que buscarte uno por tu cuenta, como todos los demás.',
  opcionBuscar: 'Moverte ya para buscar otro equipo',
  resultadoBuscar: 'No te lo piensas mucho: pides pruebas en otros clubes mientras el plazo está abierto.',
  opcionEsperar: 'Esperar a ver qué pasa',
  resultadoEsperar: 'Te quedas dándole vueltas. El plazo de fichajes sigue abierto, pero no vas a esperar mucho más.',
};

export const TEXTOS_DE_PLAZA_PERDIDA: TextosDePlazaPerdida = {
  titulo: 'Te quedas sin plaza en el equipo',
  texto:
    'Antes de empezar el curso, {entrenador.nombre} te para al salir del campo. «Tengo que decirte algo que no me gusta. Han llegado jugadores que valen más que tú en tu puesto y el equipo no da para más: este año no hay sitio para ti». Se pasa la mano por la nuca. «Estás fuera de la plantilla. Las pruebas de otros clubes siguen abiertas hasta {señal.plazoHasta}. Si te mueves ahora, aún estás a tiempo. O, si prefieres, sigue entrenando por tu cuenta y vuelve a intentarlo en el siguiente plazo».',
  opcionBuscar: 'Buscar otro club mientras las pruebas siguen abiertas',
  resultadoBuscar: '«Eso es. Hacen pruebas {señal.clubes}, hasta {señal.plazoHasta}. Pasa por los trámites del club que quieras y pide hacer una prueba: la tienes en «Prueba de acceso…», «Pedir hacer una prueba…», y allí te dicen cuándo entrenan». {entrenador.Nombre} te da la mano. «Y si te falta algo, ya sabes dónde estoy».',
  opcionPorMiCuenta: 'Quedarte entrenando por tu cuenta y volver a intentarlo el año que viene',
  resultadoPorMiCuenta: '{entrenador.Nombre} asiente despacio. «Es un camino más largo, pero también vale. Trabaja duro y verás cómo cambian las cosas».',
  opcionMejorar: 'Preguntarle qué tienes que mejorar para volver',
  resultadoMejorar: '{entrenador.Nombre} te explica con calma qué ha pesado en la decisión. «Hazlo bien y cuando haya un hueco, tú eres el primero al que llamo».',
};
