import { suceso } from '@ds/contracts';

/**
 * Lote 2, tanda 3: la entrada del colegio y la clase (detalles ligeros, `menor`). Los de clase salen al entrar en la clase (`clase.asistida`: son «durante», sin minutos); el de la entrada, al llegar
 * al colegio antes de las 8. `copiar_deberes` lee la marca de `cambio_de_sitios` (quien se sienta a tu lado). Familias de rotación: `aula` y `camino`. Cifras de partida; los de antes de las 8 se prueban con `pruebas`.
 */
const AMIGO_O_CONOCIDO = [{ relacion: 'quien', estado: ['amigo', 'mejor_amigo'] }] as const;
const COMPAÑERO = { quien: { rol: 'companero', conocido: true } } as const;
const EJEMPLO_CLASE = { asignatura: 'estudios.lengua', tarde: 0 };

export default [
  suceso({
    id: 'eventos.colegio.en_la_puerta',
    titulo: 'Ya están en la entrada',
    categoria: 'menor',
    familia: 'camino',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.25 },
    ejemploDeSeñal: { desde: 'calle_colegio', hasta: 'colegio', minutos: 1 },
    cuando: [{ señal: 'hasta', es: 'colegio' }, { periodo: 'clase' }, { diaDeLaSemana: [0, 1, 2, 3, 4] }, { hora: { desde: 7 * 60 + 30, hasta: 7 * 60 + 50 } }],
    repite: { espera: { dias: 10 } },
    reparto: { quien: { conocido: true, presente: true, edad: { max: 18 } } },
    variantes: [
      {
        id: 'amigo',
        si: AMIGO_O_CONOCIDO,
        textos: [
          '{quien.Nombre} te espera junto a la verja, con la mochila a medio cerrar. «Hoy hay examen sorpresa, me lo han dicho. Es mentira, pero me ha dado un vuelco el estómago. ¿Te lo crees?»',
          'Desde lejos ves a {quien.nombre} agitando el brazo. «¡Eh! ¡Corre, que te he guardado un sitio en la cola de la fuente!»',
        ],
      },
      {
        id: 'conocido',
        si: [],
        textos: [
          'En la entrada, {quien.nombre} está atándose un zapato con la mochila en el suelo. Te ve y levanta una mano en un saludo medio dormido.',
          'La verja del colegio todavía está fresca de la mañana. {quien.Nombre} está apoyad{quien:o|a} en ella, esperando a que abran. «Hola. ¿Tú también has madrugado?»',
        ],
      },
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'saludar' },
    opciones: [
      { id: 'charlar', texto: 'Quedarte un rato charlando', caracter: { sociabilidad: 1 }, minutos: 5, efectos: [{ relacion: 'quien', afinidad: 1.5, confianza: 1 }, { estado: 'gen.estres', mas: -1 }], resultados: ['Habláis de nada en particular, que a esas horas es lo mejor de que hablar.', 'Se te pasan los cinco minutos entre un chiste y una queja sobre la primera clase.'] },
      { id: 'saludar', texto: 'Saludar y entrar', efectos: [{ relacion: 'quien', afinidad: 0.5 }], resultado: 'Un «hola» a la carrera y cada cual a lo suyo. Eso también es una forma de empezar el día.' },
      { id: 'evitar', texto: 'Hacer como que no lo has visto', caracter: { sociabilidad: -1 }, efectos: [{ si: AMIGO_O_CONOCIDO, entonces: [{ relacion: 'quien', afinidad: -1 }] }], resultado: 'Miras el móvil con muchísimo interés hasta que cruzas la puerta.' },
    ],
    pruebas: [{ nombre: 'Al llegar al colegio a las 7:35 se puede charlar', dado: { lugar: 'colegio', hora: 7 * 60 + 35, periodo: 'clase', diaDeLaSemana: 2 }, espero: { opcionDisponible: 'charlar' } }],
  }),
  suceso({
    id: 'eventos.colegio.copiar_deberes',
    titulo: '¿Me dejas los deberes?',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.2 },
    ejemploDeSeñal: { desde: 'colegio', hasta: 'aula', minutos: 1 },
    cuando: [{ señal: 'hasta', es: 'aula' }, { periodo: 'clase' }, { diaDeLaSemana: [0, 1, 2, 3, 4] }, { hora: { desde: 7 * 60 + 50, hasta: 8 * 60 + 5 } }],
    repite: { espera: { dias: 14 } },
    reparto: { quien: { rol: 'companero', conocido: true, presente: true } },
    variantes: [
      {
        id: 'de_al_lado',
        si: [{ marca: 'vecino_de_mesa', de: 'quien' }],
        textos: [
          'Antes de que llegue el profesor, {quien.nombre}, que se sienta a tu lado, te enseña su libreta en blanco. «Se me pasó, de verdad. ¿Me dejas la tuya cinco minutos?»',
          '{quien.Nombre} desliza su silla hacia la tuya. «Como estamos juntos… ¿me dejas copiar lo de ayer? Te debo una».',
        ],
      },
      {
        id: 'normal',
        si: [],
        textos: [
          'Antes de que llegue el profesor, {quien.nombre} se inclina hacia tu mesa y te enseña su libreta en blanco. «Se me pasó, de verdad. ¿Me dejas la tuya cinco minutos?»',
          '«Psst». {quien.Nombre} te hace señas desde dos filas más allá. «¿Tienes hechos los deberes? Dime que sí».',
        ],
      },
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'no' },
    opciones: [
      { id: 'dejar', texto: 'Dejarle copiar', caracter: { honestidad: -1, sociabilidad: 1 }, efectos: [{ relacion: 'quien', afinidad: 2 }, { entrena: 'gen.cooperacion', cantidad: 0.2 }], resultados: ['Se pone a copiar a toda velocidad. «Eres un as». Cuando llega el profesor ya ha acabado.', 'Copia con la lengua entre los dientes. Menos mal que el profesor tarda en llegar.'] },
      { id: 'no', texto: 'Decirle que no', caracter: { honestidad: 1 }, efectos: [{ relacion: 'quien', afinidad: -1 }], resultado: '«Qué tacaño». Pero lo dice sin rencor, y se pone a hacerlo a toda prisa.' },
      {
        id: 'juntos',
        texto: 'Ofrecerte a hacerlo juntos en el recreo',
        caracter: { disciplina: 1, sociabilidad: 1 },
        tirada: { con: 'gen.comunicacion', dificultad: 45 },
        exito: { efectos: [{ relacion: 'quien', afinidad: 3, confianza: 1 }, { entrena: 'gen.comunicacion', cantidad: 0.3 }], resultado: '«Eso sí que no me lo esperaba». Aceptáis, y por una vez lo hace con más ganas que tú.' },
        fallo: { efectos: [{ relacion: 'quien', afinidad: 1 }], resultado: '«Mejor otro día, que en el recreo tengo cosas». Se queda con la libreta en blanco y la cara larga.' },
      },
    ],
    pruebas: [{ nombre: 'Al entrar en el aula antes de la primera clase, se puede ayudar', dado: { lugar: 'aula', hora: 7 * 60 + 55, periodo: 'clase', diaDeLaSemana: 1 }, espero: { opcionDisponible: 'juntos' } }],
  }),
  suceso({
    id: 'eventos.colegio.capitan_de_equipo',
    titulo: 'Hacen los equipos',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios', 'relaciones'],
    disparo: { al: 'clase.asistida', prob: 0.1 },
    ejemploDeSeñal: { asignatura: 'estudios.educacion_fisica', tarde: 0 },
    cuando: [{ señal: 'asignatura', es: 'estudios.educacion_fisica' }],
    repite: { espera: { dias: 30 } },
    reparto: { capitan: { rol: 'companero', conocido: true } },
    variantes: [
      {
        id: 'primero',
        si: [{ alguna: [{ stat: 'gen.velocidad', min: 16 }, { stat: 'gen.coordinacion', min: 17 }] }],
        textos: [
          'Hoy toca partido en Educación física y {capitan.nombre} hace de capitán. Tarda un segundo en decidir. «A ver… tú. Te quiero en mi equipo».',
          '{capitan.Nombre} echa un vistazo a la fila de gente y te señala sin dudar. «Tú conmigo. Los demás, ya veremos».',
        ],
        opciones: [
          { id: 'ir', texto: 'Ir con {capitan:él|ella}', caracter: { sociabilidad: 1 }, efectos: [{ relacion: 'capitan', afinidad: 1 }, { estado: 'gen.motivacion', mas: 2 }], resultado: 'Chocáis la mano. Se nota que a {capitan.nombre} le gusta tenerte en el equipo.' },
          { id: 'amigo', texto: 'Pedir que elija antes a alguien que está esperando', caracter: { sacrificio: 1, sociabilidad: 1 }, efectos: [{ relacion: 'capitan', afinidad: 1 }, { estado: 'gen.estres', mas: -1 }, { entrena: 'gen.empatia', cantidad: 0.4 }], resultado: '«Vale, vale». Elige a quien lleva más tiempo esperando, que te da las gracias con la mirada.' },
        ],
      },
      {
        id: 'ultimo',
        si: [{ stat: 'gen.velocidad', max: 10 }, { stat: 'gen.coordinacion', max: 10 }],
        textos: [
          'Hoy toca partido en Educación física y {capitan.nombre} hace de capitán. Quedáis tres sin elegir. {capitan.Nombre} se rasca la cabeza y señala al fondo. «Va, tú, que ya no hay más».',
          'Los capitanes eligen deprisa y la fila se acorta. Cuando solo quedas tú, {capitan.nombre} suspira como si le tocase un castigo. «Anda, ven».',
        ],
        opciones: [
          { id: 'ir', texto: 'Ir con ellos sin decir nada', efectos: [{ estado: 'gen.motivacion', mas: -2 }], resultado: 'Ocupas tu hueco en la defensa, que es donde menos estorbas. Pero te escuece un poco.' },
          { id: 'portero', texto: 'Pedir ser portero', caracter: { ambicion: 1, prudencia: -1 }, tirada: { con: 'gen.coordinacion', dificultad: 40 }, exito: { efectos: [{ estado: 'gen.motivacion', mas: 3 }, { entrena: 'gen.coordinacion', cantidad: 0.4 }], resultado: 'Paras un tiro casi sin querer. Se te quedan mirando. «Pues no lo haces mal».' }, fallo: { efectos: [{ estado: 'gen.motivacion', mas: -2 }], resultado: 'El primer balón te pasa entre las piernas. Alguien se ríe. Tú, no.' } },
          { id: 'bromear', texto: 'Hacer una broma sobre ser el último', caracter: { optimismo: 1, sociabilidad: 1 }, tirada: { con: 'gen.carisma', dificultad: 45 }, exito: { efectos: [{ relacion: 'capitan', afinidad: 2 }, { estado: 'gen.estres', mas: -2 }], resultado: '«El mejor para el final», dices. Todos se ríen, y la risa pesa menos que el silencio.' }, fallo: { efectos: [{ estado: 'gen.estres', mas: 1 }], resultado: 'Nadie se ríe. Te toca el peor puesto del campo, con el chiste aún colgando.' } },
        ],
      },
      {
        id: 'mitad',
        si: [],
        textos: [
          'Hoy toca partido en Educación física y {capitan.nombre} hace de capitán. Te elige a mitad de la fila, sin demasiado entusiasmo pero sin disgusto. «Tú. Ponte por allí».',
          'Hacen los equipos. No eres de los primeros ni de los últimos: {capitan.nombre} te señala después de pensarlo un poco. «Va, tú también».',
        ],
        opciones: [
          { id: 'ir', texto: 'Ponerte donde te dicen', efectos: [{ estado: 'gen.motivacion', mas: 1 }], resultado: 'Te colocas en el lugar que te toca y juegas lo mejor que sabes.' },
          { id: 'pedir', texto: 'Pedir jugar en otra posición', caracter: { ambicion: 1 }, tirada: { con: 'gen.comunicacion', dificultad: 45 }, exito: { efectos: [{ relacion: 'capitan', afinidad: 1 }, { estado: 'gen.motivacion', mas: 2 }], resultado: '«Pues vale, prueba». Y te sale mejor de lo que esperabas.' }, fallo: { efectos: [{ relacion: 'capitan', afinidad: -1 }], resultado: '«Aquí mando yo». Te quedas donde estabas.' } },
        ],
      },
    ],
    texto: 'Hacen los equipos en Educación física.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'ir' },
    opciones: [{ id: 'ir', texto: 'Ir con ellos', efectos: [], resultado: 'Te pones donde te dicen.' }],
    pruebas: [{ nombre: 'Con poca velocidad y coordinación te eligen el último y puedes pedir ser portero', dado: { lugar: 'aula', periodo: 'clase', stats: { 'gen.velocidad': 8, 'gen.coordinacion': 8 } }, espero: { opcionDisponible: 'portero' } }],
  }),
  suceso({
    id: 'eventos.colegio.cambio_de_sitios',
    titulo: 'Nuevos sitios',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.03 },
    ejemploDeSeñal: { desde: 'colegio', hasta: 'aula', minutos: 1 },
    cuando: [{ señal: 'hasta', es: 'aula' }, { periodo: 'clase' }, { diaDeLaSemana: [0, 1, 2, 3, 4] }, { hora: { desde: 7 * 60 + 50, hasta: 8 * 60 + 5 } }],
    repite: { espera: { dias: 60 } },
    reparto: { quien: { rol: 'companero', conocido: true, presente: true } },
    variantes: [
      {
        id: 'amigo',
        si: AMIGO_O_CONOCIDO,
        texto: 'En la pizarra hay una lista nueva de sitios, de dos en dos. Te toca con {quien.nombre}, que ya está sentad{quien:o|a} y se vuelve hacia ti con una sonrisa enorme. «¡Por fin!»',
      },
      {
        id: 'mal',
        si: [{ relacion: 'quien', estado: ['antipatia', 'enemigo', 'antagonista'] }],
        texto: 'En la pizarra hay una lista nueva de sitios, de dos en dos. Tu mesa, esta vez, compartida con {quien.nombreCompleto}. Os miráis sin gracia.',
      },
      {
        id: 'normal',
        si: [],
        textos: [
          'En la pizarra hay una lista nueva de sitios, de dos en dos. Te toca con {quien.nombre}, a quien apenas conoces. «Bueno… hola, supongo».',
          'Cambio de sitios: la lista de la pizarra ha puesto la clase patas arriba, y a ti te toca la mesa junto a {quien.nombre}.',
        ],
      },
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'aceptar' },
    opciones: [
      { id: 'aceptar', texto: 'Sentarte donde dice la lista', efectos: [{ marca: 'vecino_de_mesa', de: 'quien', dura: { dias: 60 } }, { relacion: 'quien', afinidad: 0.5 }], resultado: 'Recoges tus cosas y te cambias de mesa. Los primeros días son los más raros.' },
      {
        id: 'pedir',
        texto: 'Intentar cambiarte con otra persona',
        caracter: { ambicion: 1 },
        minutos: 2,
        tirada: { con: 'gen.comunicacion', dificultad: 50 },
        exito: { efectos: [{ entrena: 'gen.comunicacion', cantidad: 0.3 }], resultado: '«Vale, a mí me da igual». Cambiáis los papeles sin gran drama.' },
        fallo: { efectos: [{ marca: 'vecino_de_mesa', de: 'quien', dura: { dias: 60 } }, { relacion: 'quien', afinidad: -1 }], resultado: '«Pues yo no me muevo». Te quedas donde te han puesto, con alguna mirada de más.' },
      },
      { id: 'mirar', texto: 'Sentarte sin decir nada y esperar a ver', caracter: { prudencia: 1 }, efectos: [{ marca: 'vecino_de_mesa', de: 'quien', dura: { dias: 60 } }, { relacion: 'quien', afinidad: 0.5 }], resultado: 'Te sientas, abres la libreta y dejas que sea la clase la que rompa el hielo.' },
    ],
    pruebas: [{ nombre: 'Al entrar en el aula a primera hora hay cambio de sitios', dado: { lugar: 'aula', hora: 7 * 60 + 55, periodo: 'clase', diaDeLaSemana: 1 }, espero: { opcionDisponible: 'aceptar' } }],
  }),
];
