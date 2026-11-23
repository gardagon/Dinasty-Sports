import { suceso } from '@ds/contracts';

/**
 * Lote 2, tanda 3: detalles con amigos (`menor`). Cada uno usa un papel que depende del estado del vínculo: `amigo` (estado `amigo` o `mejor_amigo`) o alguien a quien conoces a medias. `regalo_inesperado` lee
 * la marca `perdono_una_deuda` del hilo del préstamo. Familia de rotación `patio`. Cifras de partida, por calibrar.
 */
const AL_PATIO = { al: 'lugares.llegada', prob: 0.07 } as const;
const EJEMPLO = { desde: 'aula', hasta: 'patio', minutos: 2 };
const EN_EL_RECREO = [{ señal: 'hasta', es: 'patio' }, { hora: { desde: 10 * 60 + 30, hasta: 11 * 60 + 15 } }] as const;
const AMIGO = { amigo: { relacion: { estado: ['amigo', 'mejor_amigo'] }, presente: true } } as const;

export default [
  suceso({
    id: 'eventos.amigos.regalo_inesperado',
    titulo: 'Esto es para ti',
    categoria: 'menor',
    familia: 'patio',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.06 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [{ señal: 'hasta', es: 'patio' }, { relacion: 'amigo', afinidad: { min: 45 } }],
    repite: { espera: { dias: 30 } },
    reparto: AMIGO,
    variantes: [
      {
        id: 'por_la_deuda',
        si: [{ marca: 'perdono_una_deuda', de: 'amigo' }],
        texto: '{amigo.Nombre} te pone un cromo en la mano, con la cara muy seria. «Esto es por lo del otro día. Sé que no me lo reclamaste, y no se me ha olvidado».',
      },
      {
        id: 'normal',
        si: [],
        textos: [
          '{amigo.Nombre} rebusca en la mochila y te pone un cromo en la mano, con la cara muy seria. «Lo tenía repetido. Es tuyo».',
          '{amigo.Nombre} te tiende algo envuelto en una servilleta. «Es la mitad de mi bocadillo. Hoy mi madre se ha pasado haciéndolo».',
          'Sin decir nada, {amigo.nombre} deja un dibujo sobre tu mesa. Es un coche con alas. Está firmado, y todo.',
        ],
      },
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'aceptar' },
    opciones: [
      { id: 'aceptar', texto: 'Aceptarlo y darle las gracias', caracter: { sociabilidad: 1 }, efectos: [{ relacion: 'amigo', afinidad: 2 }, { estado: 'gen.estres', mas: -1 }], resultados: ['«De nada». Se encoge de hombros, pero se le escapa una sonrisa que no puede disimular.', 'Lo guardas con cuidado. Hay regalos que valen más por quién los hace que por lo que son.'] },
      { id: 'devolver', texto: 'Darle tú algo a cambio', caracter: { sacrificio: 1, sociabilidad: 1 }, efectos: [{ relacion: 'amigo', afinidad: 3, confianza: 1 }, { entrena: 'gen.empatia', cantidad: 0.3 }], resultado: 'Le tiendes algo de tu mochila. Se queda mirándolo un momento. «Anda, ¿en serio?». Los dos os reís por no emocionaros.' },
      { id: 'sin_mas', texto: 'Decir que no hacía falta', caracter: { prudencia: 1 }, efectos: [{ relacion: 'amigo', afinidad: 1, confianza: -1 }], resultado: '«Ya lo sé, por eso lo he hecho». Pero la sonrisa le dura un poco menos.' },
    ],
    pruebas: [
      { nombre: 'Un amigo con afinidad alta te hace un regalo', dado: { lugar: 'patio', relacion: { amigo: { afinidad: 60 } } }, espero: { opcionDisponible: 'devolver' } },
      { nombre: 'Si le perdonaste una deuda, lo recuerda', dado: { lugar: 'patio', relacion: { amigo: { afinidad: 60 } }, marcas: ['perdono_una_deuda'] }, espero: { opcionDisponible: 'aceptar' } },
    ],
  }),
  suceso({
    id: 'eventos.amigos.apuesta_en_el_patio',
    titulo: 'Te reto',
    categoria: 'menor',
    familia: 'patio',
    requiere: ['lugares', 'relaciones'],
    disparo: AL_PATIO,
    ejemploDeSeñal: EJEMPLO,
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 30 } },
    reparto: { retador: { rol: 'companero', conocido: true, presente: true } },
    textos: [
      '{retador.Nombre} señala la valla del fondo. «Te echo una carrera hasta ahí. El que pierda se lleva la mochila del otro hasta la clase».',
      '{retador.Nombre} te corta el paso con una sonrisa de medio lado. «A que no eres capaz de saltar los tres escalones del tirón. Yo sí».',
      '«A ver quién da antes la vuelta entera al patio», dice {retador.nombre}, ya en posición. «Tres, dos…»',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'pasar' },
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar el reto',
        caracter: { ambicion: 1, prudencia: -1 },
        minutos: 5,
        tirada: { con: 'gen.velocidad', dificultad: 48 },
        exito: { efectos: [{ relacion: 'retador', afinidad: 1 }, { estado: 'gen.motivacion', mas: 3 }, { estado: 'gen.energia', mas: -2 }], resultados: ['Cruzas la raya un paso antes. {retador.Nombre} se tira al suelo, boca arriba, y levanta una mano. «Vale. Esta vez, tuya».', 'Por poco, pero ganas. Te sale una risa nerviosa.'] },
        fallo: { efectos: [{ relacion: 'retador', afinidad: 1 }, { estado: 'gen.motivacion', mas: -1 }, { estado: 'gen.energia', mas: -2 }], resultados: ['Te gana por una zancada. Pero {retador.nombre} te da la mano con respeto. «Casi, casi».', 'Pierdes, y encima te toca llevar dos mochilas. Se te ve la cara roja del esfuerzo, y la de {retador.nombre}, de satisfacción.'] },
      },
      {
        id: 'otra',
        texto: 'Proponer otra cosa: un pulso, o pierdas o ganes',
        caracter: { sociabilidad: 1, prudencia: 1 },
        minutos: 5,
        tirada: { con: 'gen.carisma', dificultad: 45 },
        exito: { efectos: [{ relacion: 'retador', afinidad: 2 }, { entrena: 'gen.carisma', cantidad: 0.3 }], resultado: '«Vale, pero me pido ser el que gana». Acabáis riéndoos a carcajadas antes de que acabe el pulso.' },
        fallo: { efectos: [{ relacion: 'retador', afinidad: -1 }], resultado: '«Qué miedoso». No lo dice con maldad, pero se le nota la decepción.' },
      },
      { id: 'pasar', texto: 'Decir que hoy no', caracter: { prudencia: 1 }, efectos: [{ relacion: 'retador', afinidad: -1 }], resultado: '«Gallina», dice, riéndose. Y se va a buscar a otro con quien competir.' },
    ],
  }),
  suceso({
    id: 'eventos.amigos.un_amigo_de_un_amigo',
    titulo: 'Te presento a…',
    categoria: 'menor',
    familia: 'patio',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.06 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [{ señal: 'hasta', es: 'patio' }, { hora: { desde: 10 * 60 + 30, hasta: 11 * 60 + 15 } }],
    repite: { espera: { dias: 30 } },
    reparto: { ...AMIGO, nuevo: { rol: 'companero', conocido: false, presente: true } },
    textos: [
      '{amigo.Nombre} tira de ti hacia un corrillo. «Mira, este es {nuevo.nombre}, el de otra clase. Ya te hablé de {nuevo:él|ella}».',
      '«¡Ven, ven!», te llama {amigo.nombre} con la mano. «Quiero que conozcas a {nuevo.nombre}. Os vais a llevar bien, seguro».',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'saludar' },
    opciones: [
      { id: 'saludar', texto: 'Darle la mano y charlar un rato', caracter: { sociabilidad: 1, optimismo: 1 }, minutos: 5, efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 1, confianza: 1 }, { relacion: 'amigo', afinidad: 1 }], resultado: '{nuevo.Nombre} te cae bien enseguida. Cuando suena el timbre, os despedís con un «hasta luego» de los de verdad.' },
      { id: 'callar', texto: 'Saludar con un gesto y quedarte callad{yo:o|a}', caracter: { sociabilidad: -1, prudencia: 1 }, efectos: [{ presenta: 'nuevo' }], resultado: 'Apenas dices hola. {amigo.Nombre} te mira como diciendo «¿en serio?», y los tres os quedáis un momento sin saber qué hacer.' },
      { id: 'broma', texto: 'Soltar una broma para romper el hielo', caracter: { sociabilidad: 2, prudencia: -1 }, tirada: { con: 'gen.carisma', dificultad: 50 }, exito: { efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 2 }, { relacion: 'amigo', afinidad: 1 }, { entrena: 'gen.carisma', cantidad: 0.4 }], resultado: 'Os reís los tres. {nuevo.Nombre} dice que le ha caído bien tu chiste, y nadie se acuerda de lo incómodo que era empezar.' }, fallo: { efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: -1 }], resultado: 'El chiste cae como una piedra. {nuevo.Nombre} sonríe por cortesía y {amigo.nombre} carraspea.' } },
    ],
    pruebas: [{ nombre: 'Un amigo te presenta a alguien que no conocías', dado: { lugar: 'patio', hora: 10 * 60 + 45 }, espero: { opcionDisponible: 'saludar' } }],
  }),
  suceso({
    id: 'eventos.amigos.amigo_que_se_enfria',
    titulo: 'Hace días que no hablas',
    categoria: 'menor',
    familia: 'patio',
    requiere: ['relaciones'],
    disparo: { cada: 'semana', prob: 0.25 },
    cuando: [{ periodo: 'clase' }, { diaDeLaSemana: [0, 1, 2, 3, 4] }, { alguna: [{ lugar: 'patio' }, { lugar: 'colegio' }] }],
    aguanta: { dias: 5 },
    repite: { espera: { dias: 45 } },
    reparto: { amigo: { relacion: { estado: 'amigo', afinidad: { min: 20, max: 35 } }, presente: true } },
    textos: [
      'Te das cuenta de que con {amigo.nombre} hace semanas que solo cruzas un «hola». Antes os contabais todo.',
      '{amigo.Nombre} pasa por delante con otro grupo y te saluda con la mano, sin parar. Hubo un tiempo en que os sentabais siempre juntos.',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'dejarlo' },
    opciones: [
      { id: 'buscarlo', texto: 'Ir a buscarlo y charlar', caracter: { sociabilidad: 1, optimismo: 1 }, minutos: 5, efectos: [{ relacion: 'amigo', afinidad: 2, confianza: 1 }], resultado: '«¡Estaba pensando justo en ti!», dice, y es medio mentira, pero te hace sentir bien.' },
      { id: 'nota', texto: 'Escribirle una nota y dejársela en la mesa', caracter: { sociabilidad: 1 }, tirada: { con: 'gen.creatividad', dificultad: 40 }, exito: { efectos: [{ relacion: 'amigo', afinidad: 3 }, { entrena: 'gen.creatividad', cantidad: 0.4 }], resultado: 'La lee dos veces y te busca con la mirada. «Gracias por esto», te dice por fin, sin que haga falta más.' }, fallo: { efectos: [{ relacion: 'amigo', afinidad: -1 }], resultado: 'No sabe muy bien qué responder. La nota se queda en su mochila, doblada por la mitad.' } },
      { id: 'dejarlo', texto: 'Dejarlo pasar', caracter: { sociabilidad: -1 }, efectos: [{ relacion: 'amigo', afinidad: -1 }], resultado: 'Ya habrá otra ocasión, te dices. Pero son más las ocasiones que se pierden que las que llegan.' },
    ],
    pruebas: [{ nombre: 'Con un amigo enfriado, se puede ir a buscarlo', dado: { lugar: 'patio', periodo: 'clase', diaDeLaSemana: 1, relacion: { amigo: { afinidad: 28, estado: 'amigo' } } }, espero: { opcionDisponible: 'buscarlo' } }],
  }),
];
