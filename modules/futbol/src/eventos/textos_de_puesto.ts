import type { TextosDePedirPuesto, TextosDePruebaDeAcceso } from '@ds/kit-deporte';

/**
 * Los textos de la prueba de acceso y de pedirle al entrenador otro puesto. Las reglas (huecos, tirada, dificultad) son comunes a todo deporte con puestos y viven en el kit
 * (`sucesoDePruebaDeAcceso`, `sucesoDePedirPuesto`); aquí solo lo que se lee. Los monta `index.ts` con la configuración del fútbol.
 */
export const TEXTOS_DE_PRUEBA_DE_ACCESO: TextosDePruebaDeAcceso = {
  titulo: 'La prueba en el club',
  pregunta:
    'Llegas al campo y un hombre o una mujer con un chándal del club se acerca. «Yo soy {entrenador.nombre}, el entrenador. Hoy vas a entrenar con nosotros». Mira la lista. «Nos faltan jugadores en varios puestos. ¿Dónde te ves tú?».',
  opcionDeHueco: 'Decirle que de {puesto}',
  resultadoDeHueco: '{entrenador.Nombre} asiente. «De {puesto}, pues. A ver qué tal».',
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
