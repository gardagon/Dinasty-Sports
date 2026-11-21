import { suceso } from '@ds/contracts';

/**
 * Llegar tarde a clase. La mecánica ya existe y no cambia (solo se aprovecha la parte de clase a la que se asiste); este suceso cuenta lo que pasa al
 * entrar con la clase empezada y deja decir algo. Como mucho una vez cada diez días, para no repetirse (un bot que llega tarde casi siempre lo veía 67 veces al año con cuatro días). Cifras de partida, por calibrar.
 */
export default suceso({
  id: 'eventos.estudios.tarde_a_clase',
  titulo: 'Llegas tarde a clase',
  requiere: ['estudios'],
  disparo: { al: 'clase.asistida' },
  ejemploDeSeñal: { asignatura: 'estudios.lengua', tarde: 12 },
  cuando: [{ señal: 'tarde', min: 5 }],
  repite: { espera: { dias: 10 } },
  reparto: { profesor: { asignaturaDeLaSeñal: 'asignatura' } },
  texto: 'Abres la puerta con la clase empezada, {señal.tarde} minutos tarde. Todos se giran. {profesor.Nombre} deja de escribir en la pizarra y espera.',
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'nada' },
  opciones: [
    { id: 'disculparse', texto: 'Pedir perdón y sentarte', caracter: { disciplina: 1, honestidad: 1 }, efectos: [{ relacion: 'profesor', afinidad: -1 }], resultado: '«Siéntate. Y que sea la última».' },
    {
      id: 'excusa',
      texto: 'Inventarte una excusa',
      caracter: { honestidad: -2 },
      tirada: { con: 'gen.picardia', dificultad: 40 },
      exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.5 }], resultado: '{profesor.Nombre} suspira y sigue con la clase.' },
      fallo: { efectos: [{ relacion: 'profesor', afinidad: -3 }, { estado: 'gen.estres', mas: 3 }], resultado: '«Esa ya me la sé». Se oyen risas por el fondo.' },
    },
    {
      id: 'gracia',
      texto: 'Soltar una broma para salir del paso',
      requiere: [{ stat: 'gen.carisma', min: 15 }],
      caracter: { sociabilidad: 2, prudencia: -1 },
      tirada: { con: 'gen.carisma', dificultad: 45 },
      exito: { efectos: [{ entrena: 'gen.carisma', cantidad: 0.5 }, { estado: 'gen.estres', mas: -2 }], resultado: 'La clase se ríe y hasta {profesor.nombre} sonríe. «Anda, siéntate».' },
      fallo: { efectos: [{ relacion: 'profesor', afinidad: -3 }], resultado: 'Nadie se ríe. «Muy gracios{yo:o|a}. Siéntate».' },
    },
    { id: 'nada', texto: 'Ir a tu sitio sin decir nada', efectos: [{ relacion: 'profesor', afinidad: -2 }], resultado: 'Caminas hasta tu mesa notando todas las miradas.' },
  ],
  pruebas: [
    { nombre: 'Entrando a su hora no pasa nada', señal: { asignatura: 'estudios.lengua', tarde: 0 }, espero: { sale: false } },
    { nombre: 'Sin carisma no hay broma', dado: { stats: { 'gen.carisma': 5 } }, espero: { opcionNoDisponible: 'gracia', opcionDisponible: 'disculparse' } },
  ],
});
