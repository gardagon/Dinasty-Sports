import { suceso } from '@ds/contracts';

/**
 * El primer día de Educación física, el profesor le dice al personaje en qué deporte le ve y en qué puestos. Es lo mismo que le diría si fuera a
 * preguntárselo a la sala de profesores (acción `estudios.consejo_educacion_fisica`: la frase la da `estudios`, hecho `estudios.consejo_deportivo`);
 * aquí llega solo, la primera vez que va a su clase. Cifras de partida, por calibrar.
 */
export default suceso({
  id: 'eventos.estudios.primer_dia_de_educacion_fisica',
  titulo: 'Tu primera clase de Educación física',
  requiere: ['estudios'],
  disparo: { al: 'clase.asistida' },
  ejemploDeSeñal: { asignatura: 'estudios.educacion_fisica', tarde: 0 },
  ejemploDeHechos: { 'estudios.consejo_deportivo': 'en fútbol te veo bien de lateral derecho o extremo derecho; te veo bien en atletismo' },
  cuando: [{ señal: 'asignatura', es: 'estudios.educacion_fisica' }],
  repite: 'nunca',
  reparto: { profesor: { asignatura: 'estudios.educacion_fisica' } },
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'nada' },
  variantes: [
    {
      id: 'te_ve_en_algo',
      si: [{ hecho: 'estudios.consejo_deportivo' }],
      texto: 'Al acabar la clase, {profesor.nombre} te para antes de que salgas. «Te he estado mirando. Yo creo que {hecho.estudios.consejo_deportivo}. ¿Haces algún deporte?»',
      opciones: [
        {
          id: 'interesarse',
          texto: 'Decir que te gustaría probar',
          caracter: { ambicion: 1, optimismo: 1 },
          efectos: [{ relacion: 'profesor', afinidad: 3 }, { estado: 'gen.motivacion', mas: 5 }, { marca: 'le_recomendaron_un_deporte' }],
          resultado: '«Pues apúntate a un club: en el colegio o en la ciudad. Y si dudas del puesto, ven a verme a la sala de profesores».',
        },
        {
          id: 'preguntar',
          texto: 'Preguntarle en qué te ha fijado',
          caracter: { prudencia: 1 },
          minutos: 5,
          efectos: [{ relacion: 'profesor', afinidad: 4, confianza: 2 }, { entrena: 'gen.comunicacion', cantidad: 0.5 }, { estado: 'gen.motivacion', mas: 3 }, { marca: 'le_recomendaron_un_deporte' }],
          resultado: '{profesor.Nombre} te lo explica con calma: cómo te mueves, qué se te da mejor. «Eso no lo tiene todo el mundo. Aprovéchalo».',
        },
        { id: 'nada', texto: 'Encogerte de hombros', caracter: { ambicion: -1 }, efectos: [{ marca: 'le_recomendaron_un_deporte' }], resultado: '«Bueno, piénsatelo». Y te deja ir.' },
      ],
    },
    {
      id: 'no_te_ve_claro',
      si: [],
      texto: 'Al acabar la clase, {profesor.nombre} te para un momento. «Todavía no te veo claro en ningún deporte. Sigue moviéndote y pregúntame más adelante, ¿vale?»',
      opciones: [
        { id: 'interesarse', texto: 'Decir que lo harás', caracter: { disciplina: 1 }, efectos: [{ relacion: 'profesor', afinidad: 2 }, { estado: 'gen.motivacion', mas: 2 }], resultado: '«Eso es. Aquí estaré».' },
        { id: 'nada', texto: 'Asentir y salir', efectos: [], resultado: 'Sales al pasillo con los demás.' },
      ],
    },
  ],
  pruebas: [
    { nombre: 'Si el profesor le ve en algo, se lo dice y puede preguntarle más', dado: { hechos: { 'estudios.consejo_deportivo': 'en fútbol te veo bien de lateral o extremo' } }, elige: 'preguntar', espero: { marca: 'le_recomendaron_un_deporte' } },
    { nombre: 'Si no le ve claro, se lo dice igual', dado: { hechos: {} }, espero: { opcionDisponible: 'interesarse', sinMarca: 'le_recomendaron_un_deporte' } },
  ],
});
