import { suceso } from '@ds/contracts';

/**
 * Lote 2, tanda 1: la vida en casa con la familia, de la mañana a la noche y el fin de semana. Son `menor` (cupo propio). Los de la mañana, la noche y el
 * fin de semana salen de un día a otro (`cada: 'dia'`) y esperan a que llegue su hora (`aguanta`); los de la tarde, al llegar a casa. Los frecuentes llevan
 * varias versiones del texto y de los resultados. Cifras de partida, por calibrar. Lo que los bots no ven (antes de las 8, de noche, fin de semana) se prueba
 * con `pruebas`.
 */
const TUTOR = { tutor: { tipo: 'progenitor', presente: true, prefiere: 'mas_apoyo' } } as const;
const EJEMPLO = { desde: 'calle_casa', hasta: 'casa', minutos: 1 };
const AL_LLEGAR = [{ señal: 'hasta', es: 'casa' }] as const;
const DIA_DE_CLASE = [{ periodo: 'clase' }, { diaDeLaSemana: [0, 1, 2, 3, 4] }] as const;

export default [
  suceso({
    id: 'eventos.casa.desayuno',
    titulo: 'El desayuno de las prisas',
    categoria: 'menor',
    requiere: ['relaciones'],
    disparo: { cada: 'dia', prob: 0.04 },
    cuando: [...DIA_DE_CLASE, { lugar: 'casa' }, { hora: { desde: 6 * 60 + 30, hasta: 7 * 60 + 30 } }],
    aguanta: { dias: 1 },
    repite: { espera: { dias: 21 } },
    reparto: TUTOR,
    textos: [
      '{tutor.Nombre} ya está en la cocina cuando bajas, con el café humeando y la radio muy bajita. «Siéntate, que hoy sí llegas a tiempo».',
      'Huele a tostadas. {tutor.Nombre} te ha dejado el vaso de leche en tu sitio y mira el reloj de la pared. «Tienes diez minutos, ¿eh?»',
      'La cocina está a medias entre la noche y el día. {tutor.Nombre} te pasa la mantequilla sin decir nada, con esa cara de antes del primer café.',
    ],
    variantes: [
      { id: 'cansado', si: [{ stat: 'gen.energia', max: 45 }], texto: 'Bajas arrastrando los pies, con los ojos a medio abrir. {tutor.Nombre} te mira por encima de la taza. «Pareces un zombi. ¿Has dormido algo?»' },
      { id: 'normal', si: [] },
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'tostada' },
    opciones: [
      {
        id: 'calma',
        texto: 'Desayunar con calma',
        caracter: { disciplina: 1, prudencia: 1 },
        minutos: 10,
        efectos: [{ relacion: 'tutor', afinidad: 1 }, { estado: 'gen.energia', mas: 2 }, { estado: 'gen.estres', mas: -1 }],
        resultados: ['Desayunáis sin hablar mucho, y es de los buenos silencios. Sales de casa con el estómago contento.', '«Así da gusto». {tutor.Nombre} te acaba rellenando el vaso sin que lo pidas.'],
      },
      {
        id: 'tostada',
        texto: 'Coger una tostada y salir corriendo',
        caracter: { prudencia: -1 },
        efectos: [{ estado: 'gen.estres', mas: 1 }],
        resultados: ['Sales mordiendo la tostada. «¡La mochila!», oyes detrás, y vuelves a por ella.', 'Te vas con media tostada en la mano y las migas en la sudadera.'],
      },
      {
        id: 'discutir',
        texto: 'Discutir por la mochila o por la ropa',
        caracter: { agresividad: 1, disciplina: -1 },
        minutos: 5,
        efectos: [{ relacion: 'tutor', afinidad: -1 }, { estado: 'gen.estres', mas: 2 }],
        resultados: ['«Pues haberla preparado anoche». Tienes razón en que no la preparaste, y eso no ayuda.', 'Sales con un portazo más fuerte de lo que querías y arrepentid{yo:o|a} a media escalera.'],
      },
    ],
    pruebas: [{ nombre: 'Un día de clase a las 6:45, en casa, hay desayuno', dado: { lugar: 'casa', hora: 6 * 60 + 45, periodo: 'clase' }, espero: { opcionDisponible: 'calma' } }],
  }),
  suceso({
    id: 'eventos.casa.deberes_con_padre',
    titulo: '¿Y esos deberes?',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.06 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [...AL_LLEGAR, ...DIA_DE_CLASE, { hora: { desde: 17 * 60, hasta: 20 * 60 } }],
    repite: { espera: { dias: 20 } },
    reparto: TUTOR,
    texto: '{tutor.Nombre} deja el móvil sobre la mesa cuando te ve entrar. «¿Qué tal el cole? ¿Tienes deberes?»',
    variantes: [
      {
        id: 'promesa_rota',
        si: [{ marca: 'rompio_una_promesa_en_casa' }],
        textos: [
          '{tutor.Nombre} te espera en el pasillo, con los brazos cruzados pero sin enfado. «A ver si esta vez los deberes de verdad. Me lo prometiste, ¿te acuerdas?»',
          'Al verte entrar, {tutor.nombre} deja lo que estaba haciendo. «Hoy me gustaría ver esa libreta, si no te importa. Tú sabes por qué».',
        ],
      },
      {
        id: 'flojas',
        si: [{ hecho: 'nota_media', max: 5 }],
        textos: [
          '{tutor.Nombre} guarda el móvil cuando te ve llegar. «¿Qué tal el cole? ¿Y esa libreta?». Sabe más de lo que dice, y se nota.',
          '«¿Tienes deberes?», pregunta {tutor.nombre}, muy tranquil{tutor:o|a}. Es la pregunta que más teme quien trae notas flojas.',
        ],
      },
      {
        id: 'buenas',
        si: [{ hecho: 'nota_media', min: 7 }],
        textos: [
          '«¿Deberes?», pregunta {tutor.nombre} desde el sofá, sin mucha preocupación. «Vas tan bien que casi me da miedo preguntar».',
          '{tutor.Nombre} sonríe al verte llegar. «Cuando acabes, ¿me enseñas lo de Lengua? Me dijeron que lo estás haciendo muy bien».',
        ],
      },
      { id: 'normal', si: [] },
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'ya_hechos' },
    opciones: [
      {
        id: 'sentarte',
        texto: 'Sentarte con {tutor:él|ella} a hacerlos',
        caracter: { disciplina: 1 },
        minutos: 30,
        efectos: [{ relacion: 'tutor', afinidad: 2 }, { familia: 'tutor', expectativas: 1 }, { entrena: 'gen.concentracion', cantidad: 0.3 }],
        resultado: 'Acabáis más rápido de lo que esperabas. «Ves, no era tanto». {tutor.Nombre} te revuelve el pelo al irse.',
      },
      {
        id: 'ya_hechos',
        texto: 'Decir que ya los has hecho',
        caracter: { honestidad: -1 },
        tirada: { con: 'gen.picardia', dificultad: 45 },
        exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.3 }], resultado: '«Bien, pues». Y no pregunta más.' },
        fallo: { efectos: [{ relacion: 'tutor', afinidad: -3 }, { estado: 'gen.estres', mas: 2 }, { marca: 'mintio_a_sus_padres' }], resultado: '«¿Ah, sí? Pues enséñamelos». No hay nada que enseñar, y {tutor.nombre} lo sabe antes que tú.' },
      },
      {
        id: 'pedir_ayuda',
        texto: 'Pedirle ayuda con algo concreto',
        caracter: { honestidad: 1, sociabilidad: 1 },
        minutos: 20,
        efectos: [{ relacion: 'tutor', afinidad: 3, confianza: 2 }],
        resultado: 'Te lo explica con un ejemplo de cuando era pequeñ{tutor:o|a}. Es una explicación peor que la del libro, pero mucho más divertida.',
      },
    ],
    pruebas: [
      { nombre: 'Con una promesa rota, sale esa versión', dado: { lugar: 'casa', hora: 18 * 60, periodo: 'clase', marcas: ['rompio_una_promesa_en_casa'] }, espero: { opcionDisponible: 'sentarte' } },
      { nombre: 'Con notas flojas, sale esa versión', dado: { lugar: 'casa', hora: 18 * 60, periodo: 'clase', hechos: { nota_media: 4 } }, espero: { opcionDisponible: 'pedir_ayuda' } },
    ],
  }),
  suceso({
    id: 'eventos.casa.hermano_no_duerme',
    titulo: 'Ruidos en el pasillo',
    categoria: 'menor',
    requiere: ['relaciones'],
    disparo: { cada: 'dia', prob: 0.03 },
    cuando: [{ periodo: 'clase' }, { lugar: 'casa' }, { hora: { desde: 21 * 60, hasta: 22 * 60 + 55 } }],
    aguanta: { dias: 1 },
    repite: { espera: { dias: 21 } },
    reparto: { hermano: { tipo: 'hermano', presente: true, edad: { max: 10 } } },
    textos: [
      'Alguien arrastra los pies junto a tu puerta. Se abre un poco. «¿Estás despiert{yo:o|a}? He tenido un sueño raro…» Es {hermano.nombre}.',
      '{hermano.Nombre} se asoma a tu cuarto con la manta como una capa. «No me puedo dormir. ¿Me dejas quedarme un rato?»',
      'Oyes pasitos en el pasillo y luego nada. Luego, un susurro: «{yo.nombre}… ¿estás ahí?». {hermano.Nombre}, otra vez con miedo a la oscuridad.',
    ],
    urgencia: 'ahora',
    plazo: { hasta: { hora: 23 * 60 }, porDefecto: 'a_su_cuarto' },
    opciones: [
      {
        id: 'hueco',
        texto: 'Dejarle un hueco en la cama',
        caracter: { sociabilidad: 1, sacrificio: 1 },
        minutos: 15,
        efectos: [{ relacion: 'hermano', afinidad: 3 }, { estado: 'gen.energia', mas: -2 }],
        resultados: ['Se duerme en cinco minutos, con un pie en tu costado. Tú tardas bastante más.', 'Te cuenta medio sueño, se queda dormid{hermano:o|a} a la mitad y tú te quedas con la otra mitad sin saber cómo acaba.'],
      },
      {
        id: 'con_los_padres',
        texto: 'Llevarlo con tus padres',
        caracter: { prudencia: 1 },
        minutos: 5,
        efectos: [{ relacion: 'hermano', afinidad: 1 }],
        resultado: 'Lo acompañas hasta la puerta del dormitorio y {hermano.nombre} se cuela dentro sin hacer ruido. Tú vuelves a tu cama enseguida.',
      },
      {
        id: 'a_su_cuarto',
        texto: 'Decirle que se vuelva a su cuarto',
        caracter: { sacrificio: -1, agresividad: 1 },
        efectos: [{ relacion: 'hermano', afinidad: -2 }],
        resultado: '«Venga, vete». Se oyen los pasos alejarse, más despacio que al venir.',
      },
    ],
    pruebas: [{ nombre: 'De noche, en casa, con el hermano pequeño, se le puede hacer hueco', dado: { lugar: 'casa', hora: 22 * 60, periodo: 'clase' }, espero: { opcionDisponible: 'hueco' } }],
  }),
  suceso({
    id: 'eventos.casa.tele_con_el_hermano',
    titulo: '¿Qué vemos?',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.04 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [...AL_LLEGAR, { hora: { desde: 18 * 60, hasta: 21 * 60 } }],
    repite: { espera: { dias: 30 } },
    reparto: { hermano: { tipo: 'hermano', presente: true, edad: { min: 5 } } },
    textos: [
      'El mando está en el suelo y {hermano.nombre} y tú os habéis lanzado a por él a la vez.',
      'Os cruzáis frente a la tele. {hermano.Nombre} ya ha puesto lo suyo; tú traías otra idea.',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'lo_suyo' },
    opciones: [
      { id: 'lo_suyo', texto: 'Ver lo que quiere {hermano:él|ella}', caracter: { sacrificio: 1 }, minutos: 30, efectos: [{ relacion: 'hermano', afinidad: 2 }, { estado: 'gen.estres', mas: -1 }], resultados: ['Resulta que el dibujo no está mal. No lo dirás en voz alta.', 'Veis el capítulo entero, con {hermano.nombre} riéndose medio segundo antes de cada chiste.'] },
      { id: 'lo_tuyo', texto: 'Ver lo tuyo', caracter: { sacrificio: -1, agresividad: 1 }, minutos: 30, efectos: [{ relacion: 'hermano', afinidad: -1 }], resultado: 'Ganas el mando, pero {hermano.nombre} se queda de brazos cruzados y no se ríe ni una vez.' },
      {
        id: 'turnos',
        texto: 'Proponer un trato: uno cada uno',
        caracter: { honestidad: 1, prudencia: 1 },
        minutos: 30,
        tirada: { con: 'gen.comunicacion', dificultad: 45 },
        exito: { efectos: [{ relacion: 'hermano', afinidad: 3 }, { entrena: 'gen.comunicacion', cantidad: 0.3 }], resultado: '«Trato hecho». Acordáis hasta quién elige mañana.' },
        fallo: { efectos: [{ relacion: 'hermano', afinidad: -1 }], resultado: '«Pero primero yo». «No, primero yo». El trato dura lo que tarda en volar el cojín.' },
      },
    ],
  }),
];
