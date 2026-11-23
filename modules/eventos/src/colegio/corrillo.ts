import { suceso } from '@ds/contracts';

/**
 * Lote 2, tanda 3: el patio y la salida del colegio (detalles ligeros, `menor`). `rumor` se cuenta en el recreo, con una persona que cuenta y otra de quien se habla (las dos con relación contigo);
 * `salida_con_hermano` ocurre a la salida (14:00–14:30), cuando tu hermano en edad escolar te espera. Familia de rotación `patio` (el rumor). Cifras de partida, por calibrar.
 */
const AL_PATIO = { al: 'lugares.llegada', prob: 0.07 } as const;
const EN_EL_RECREO = [{ señal: 'hasta', es: 'patio' }, { hora: { desde: 10 * 60 + 30, hasta: 11 * 60 + 15 } }] as const;

export default [
  suceso({
    id: 'eventos.colegio.rumor',
    titulo: 'Dicen que…',
    categoria: 'menor',
    familia: 'patio',
    requiere: ['lugares', 'relaciones'],
    disparo: AL_PATIO,
    ejemploDeSeñal: { desde: 'aula', hasta: 'patio', minutos: 2 },
    cuando: EN_EL_RECREO,
    repite: { espera: { dias: 35 } },
    reparto: { cuenta: { rol: 'companero', conocido: true, presente: true }, rumor_de: { relacion: { afinidad: { min: 15 } }, presente: true } },
    textos: [
      '{cuenta.Nombre} baja la voz en el corrillo. «¿Os habéis enterado de lo de {rumor_de.nombre}? Dicen que ayer en la clase de Plástica se echó a llorar sin motivo».',
      'En el recreo, {cuenta.nombre} reúne a unos cuantos con un gesto. «Os cuento una cosa, pero no digáis que lo he dicho yo. Parece que {rumor_de.nombre} se ha dejado los deberes y le ha dicho una mentira enorme al profesor».',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'irte' },
    opciones: [
      {
        id: 'defender',
        texto: 'Decir que seguro que no es verdad',
        caracter: { honestidad: 1, agresividad: 1 },
        tirada: { con: 'gen.carisma', dificultad: 45 },
        exito: { efectos: [{ relacion: 'rumor_de', afinidad: 3 }, { entrena: 'gen.carisma', cantidad: 0.4 }], resultado: '«Pues tampoco tenéis pruebas», dices. Se hace un silencio incómodo y {cuenta.nombre} cambia de tema.' },
        fallo: { efectos: [{ relacion: 'cuenta', afinidad: -2 }], resultado: '«Tú qué sabrás». {cuenta.Nombre} te mira con cara de pocos amigos, y el corrillo se disuelve a medias.' },
      },
      {
        id: 'preguntar',
        texto: 'Ir a preguntarle a {rumor_de.nombre} qué hay de cierto',
        caracter: { honestidad: 1, sociabilidad: 1 },
        minutos: 5,
        efectos: [{ relacion: 'rumor_de', confianza: 2 }, { entrena: 'gen.empatia', cantidad: 0.3 }],
        resultado: '«Pues no, ni de lejos». Se le nota en la cara que lo agradece, aunque no lo dice.',
      },
      {
        id: 'sumarte',
        texto: 'Escuchar y reírte un poco con los demás',
        caracter: { honestidad: -1, sociabilidad: 1 },
        efectos: [{ relacion: 'cuenta', afinidad: 1 }, { relacion: 'rumor_de', afinidad: -1 }],
        resultado: 'Te ríes por no desentonar. Te quedas con un regusto raro, como de haber probado algo que no te pedía el cuerpo.',
      },
      { id: 'irte', texto: 'Irte sin decir nada', caracter: { prudencia: 1 }, efectos: [], resultado: 'Das media vuelta. Ni tanto ni tan poco: no es asunto tuyo.' },
    ],
    pruebas: [{ nombre: 'En el recreo, con dos personas, se puede defender a quien se habla', dado: { lugar: 'patio', hora: 10 * 60 + 45 }, espero: { opcionDisponible: 'defender' } }],
  }),
  suceso({
    id: 'eventos.colegio.salida_con_hermano',
    titulo: 'Te espera en la puerta',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.18 },
    ejemploDeSeñal: { desde: 'aula', hasta: 'colegio', minutos: 1 },
    cuando: [{ señal: 'hasta', es: 'colegio' }, { periodo: 'clase' }, { diaDeLaSemana: [0, 1, 2, 3, 4] }, { hora: { desde: 14 * 60, hasta: 14 * 60 + 30 } }],
    repite: { espera: { dias: 14 } },
    reparto: { hermano: { tipo: 'hermano', presente: true, edad: { min: 3, max: 17 } } },
    textos: [
      'Entre el barullo de la salida, {hermano.nombre} te agarra de la mochila. «¡Te estaba esperando! ¿Vamos juntos?»',
      '{hermano.Nombre} te saluda desde lejos, saltando para que lo veas entre los demás. «¡Eh! ¡Que hoy tengo una cosa que contarte!»',
      'A la salida, {hermano.nombre} te espera junto a la puerta con la mochila a la espalda. «¿Vas a casa ya, o te quedas con tus amigos?»',
      'Desde la verja, {hermano.nombre} te hace una seña con la barbilla. «Si vas a casa, voy contigo. Si no, no pasa nada».',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'tu_gente' },
    opciones: [
      { id: 'juntos', texto: 'Esperaros y salir juntos', caracter: { sociabilidad: 1, sacrificio: 1 }, minutos: 5, efectos: [{ relacion: 'hermano', afinidad: 2 }], resultados: ['Salís juntos, y por el camino te cuenta mil cosas de golpe sin respirar.', 'Os vais sin prisa, hablando de nada. Sin darte cuenta, es de lo mejor del día.'] },
      { id: 'escuchar', texto: 'Preguntarle cómo le ha ido el día', caracter: { sociabilidad: 1, optimismo: 1 }, minutos: 5, efectos: [{ relacion: 'hermano', afinidad: 1, confianza: 2 }, { entrena: 'gen.empatia', cantidad: 0.3 }], resultado: 'Te lo cuenta con pelos y señales: un examen, un amigo nuevo, una injusticia. Para {hermano.nombre} era importante y ahora lo sabes.' },
      { id: 'tu_gente', texto: 'Decirle que vas con tu gente', caracter: { sociabilidad: -1 }, efectos: [{ relacion: 'hermano', afinidad: -1 }], resultado: '«Vale». Se va sin discutir, con las manos en los bolsillos y los pies arrastrando.' },
    ],
    pruebas: [{ nombre: 'A la salida, con tu hermano esperando, puedes irte con él', dado: { lugar: 'colegio', hora: 14 * 60 + 10, periodo: 'clase', diaDeLaSemana: 1 }, espero: { opcionDisponible: 'juntos' } }],
  }),
];
