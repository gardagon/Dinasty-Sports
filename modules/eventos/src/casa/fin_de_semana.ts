import { suceso } from '@ds/contracts';

/**
 * Lote 2, tanda 1: el fin de semana y las vacaciones en casa. Son `menor`. Salen de un día a otro (`cada: 'dia'`) y esperan a su hora. La cena de domingo es la que
 * **lee** las marcas que otros sucesos dejan y hasta ahora nadie leía (`lesionado_hace_poco`, `mintio_a_sus_padres`, `lo_pillaron_mintiendo_en_casa`,
 * `rompio_una_promesa_en_casa`). Todos se prueban con `pruebas`: los bots casi no están en casa un sábado por la mañana ni un domingo por la noche.
 */
const TUTOR = { tutor: { tipo: 'progenitor', presente: true, prefiere: 'mas_apoyo' } } as const;

export default [
  suceso({
    id: 'eventos.casa.tarea_del_hogar',
    titulo: 'Sábado de limpieza',
    categoria: 'menor',
    requiere: ['relaciones'],
    disparo: { cada: 'dia', prob: 0.25 },
    cuando: [{ diaDeLaSemana: [5] }, { lugar: 'casa' }, { hora: { desde: 9 * 60 + 30, hasta: 14 * 60 } }],
    aguanta: { dias: 1 },
    repite: { espera: { dias: 21 } },
    reparto: TUTOR,
    textos: [
      '«Hoy te toca tu cuarto, que ya no se ve el suelo», dice {tutor.nombre} desde el pasillo, con la fregona en la mano.',
      'Sábado, y {tutor.nombre} ha puesto música para limpiar. «Hoy hay compra, y alguien tiene que ayudar a cargar las bolsas».',
      '«Las plantas del balcón se están muriendo y yo no puedo con todo», dice {tutor.nombre}. Te mira a ti. No hay nadie más en el pasillo.',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'bien' },
    opciones: [
      {
        id: 'bien',
        texto: 'Hacerlo bien, sin quejarte',
        caracter: { disciplina: 1, sacrificio: 1 },
        minutos: 40,
        efectos: [{ relacion: 'tutor', afinidad: 2 }, { familia: 'tutor', expectativas: 1 }, { estado: 'gen.estres', mas: 1 }],
        resultados: ['Cuando acabas, todo está en su sitio y {tutor.nombre} te mira con orgullo. «Pues sí que podías».', '{tutor.Nombre} comprueba el resultado, asiente y te pone una mano en el hombro. No dice nada más, y no hace falta.'],
      },
      {
        id: 'rapido',
        texto: 'Hacerlo rápido, a ver si cuela',
        caracter: { honestidad: -1, disciplina: -1 },
        minutos: 15,
        tirada: { con: 'gen.picardia', dificultad: 45 },
        exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.3 }], resultado: '{tutor.Nombre} echa un vistazo por encima. «Está bien». Te libras por los pelos.' },
        fallo: { efectos: [{ relacion: 'tutor', afinidad: -2 }], resultado: '«¿Esto es hecho? Anda, vuelve a empezar». Tardas más que si lo hubieras hecho bien desde el principio.' },
      },
      {
        id: 'negociar',
        texto: 'Negociar: «lo hago, pero luego salgo»',
        caracter: { ambicion: 1, sociabilidad: 1 },
        minutos: 35,
        tirada: { con: 'gen.comunicacion', dificultad: 50 },
        exito: { efectos: [{ relacion: 'tutor', afinidad: 1 }, { entrena: 'gen.comunicacion', cantidad: 0.4 }], resultado: '«Hecho. Pero lo haces bien». Lo haces bien, y esa tarde la tienes libre.' },
        fallo: { efectos: [{ relacion: 'tutor', afinidad: -1 }, { estado: 'gen.estres', mas: 2 }], resultado: '«Eso no se negocia». Lo haces igual, pero con peor cara.' },
      },
    ],
    pruebas: [{ nombre: 'Un sábado a las 11, en casa, hay tarea', dado: { lugar: 'casa', hora: 11 * 60, periodo: 'clase', diaDeLaSemana: 5 }, espero: { opcionDisponible: 'bien' } }],
  }),
  suceso({
    id: 'eventos.casa.cena_de_domingo',
    titulo: '¿Qué tal la semana?',
    categoria: 'menor',
    familia: 'cena',
    requiere: ['relaciones'],
    disparo: { cada: 'dia', prob: 0.3 },
    cuando: [{ diaDeLaSemana: [6] }, { lugar: 'casa' }, { hora: { desde: 19 * 60 + 30, hasta: 22 * 60 + 30 } }],
    aguanta: { dias: 2 },
    repite: { espera: { dias: 21 } },
    reparto: { ...TUTOR, hermano: { tipo: 'hermano', presente: true, opcional: true } },
    texto: 'Cenáis en la mesa de la cocina. {tutor.Nombre} sirve y pregunta, como cada domingo, qué tal ha ido la semana.',
    variantes: [
      {
        id: 'lesion',
        si: [{ marca: 'lesionado_hace_poco' }],
        texto: 'Cenáis en la mesa de la cocina. {tutor.Nombre} te mira el pie por debajo de la mesa. «¿Y qué te dijeron del tobillo, al final? ¿Cómo lo llevas?»',
      },
      {
        id: 'te_pillaron',
        si: [{ marca: 'lo_pillaron_mintiendo_en_casa' }],
        texto: '{tutor.Nombre} sirve la cena y, antes de que te sientes, dice sin dureza: «Esta semana me gustaría que me contaras las cosas como son. Aunque no sean buenas».',
      },
      {
        id: 'promesa_rota',
        si: [{ marca: 'rompio_una_promesa_en_casa' }],
        texto: 'La cena transcurre tranquila hasta el postre. «Oye», dice {tutor.nombre}, «lo de aquello que prometiste… ¿hablamos? No quiero castigarte, quiero entender».',
      },
      {
        id: 'mentiste',
        si: [{ marca: 'mintio_a_sus_padres' }],
        texto: '{tutor.Nombre} remueve la sopa con calma. «¿Todo bien en el colegio? Te noto como si tuvieras algo que contar».',
      },
      {
        id: 'levanto_la_nota',
        si: [{ marca: 'levanto_la_nota' }],
        texto: '{tutor.Nombre} sirve la cena con una sonrisa que intenta disimular. «Me ha dicho tu profesor que has mejorado mucho. No quería sacarlo, pero no he podido callármelo».',
      },
      {
        id: 'notas_flojas',
        si: [{ hecho: 'nota_media', max: 5 }],
        texto: '{tutor.Nombre} pregunta por la semana con voz muy normal. Pero lleva rato mirando el sobre del colegio en la encimera.',
      },
      {
        id: 'normal',
        si: [],
        peso: 1,
        textos: [
          'Cenáis en la mesa de la cocina. {tutor.Nombre} sirve y pregunta, como cada domingo, qué tal ha ido la semana.',
          'El domingo por la noche, la cocina es la de siempre. «Cuéntame algo bueno de esta semana», dice {tutor.nombre}, «aunque sea pequeño».',
          '{tutor.Nombre} pone la mesa para tres y se sienta con una sonrisa cansada. «A ver, la crónica de la semana».',
        ],
      },
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'cambiar_de_tema' },
    opciones: [
      {
        id: 'verdad',
        texto: 'Contarle las cosas como son',
        caracter: { honestidad: 2 },
        minutos: 20,
        efectos: [
          { relacion: 'tutor', afinidad: 2, confianza: 2 },
          { familia: 'tutor', apoyo: 1 },
          { si: [{ marca: 'lesionado_hace_poco' }], entonces: [{ quitaMarca: 'lesionado_hace_poco' }, { estado: 'gen.estres', mas: -2 }] },
        ],
        resultados: ['Hablas más de lo que pensabas. Cuando acabas, {tutor.nombre} te ha servido otra ración sin preguntar.', 'Se queda un rato callad{tutor:o|a}. «Gracias por decírmelo». Y cambia de tema con tacto.'],
      },
      {
        id: 'lo_bueno',
        texto: 'Contar lo bueno y callarte lo malo',
        caracter: { honestidad: -1, prudencia: 1 },
        minutos: 15,
        tirada: { con: 'gen.picardia', dificultad: 45 },
        exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.3 }], resultado: '{tutor.Nombre} asiente, satisfech{tutor:o|a}. Nunca sabrá lo que no dijiste.' },
        fallo: { efectos: [{ relacion: 'tutor', confianza: -2 }], resultado: 'Hay una pausa de más. «Ya… vale». No ha colado, y los dos lo saben.' },
      },
      { id: 'cambiar_de_tema', texto: 'Cambiar de tema', caracter: { prudencia: 1 }, efectos: [], resultado: 'Hablas del tiempo, del vecino de arriba, de lo que sea. {tutor.Nombre} te sigue la corriente.' },
    ],
    pruebas: [
      { nombre: 'Un domingo por la noche, lesionado, se habla del tobillo', dado: { lugar: 'casa', hora: 21 * 60, periodo: 'clase', diaDeLaSemana: 6, marcas: ['lesionado_hace_poco'] }, espero: { opcionDisponible: 'verdad' } },
      { nombre: 'Un domingo por la noche, sin nada que contar, hay cena', dado: { lugar: 'casa', hora: 21 * 60, periodo: 'clase', diaDeLaSemana: 6 }, espero: { opcionDisponible: 'cambiar_de_tema' } },
    ],
  }),
  suceso({
    id: 'eventos.casa.verano_aburrido',
    titulo: 'Una tarde sin nada',
    categoria: 'menor',
    requiere: ['lugares'],
    disparo: { cada: 'dia', prob: 0.12 },
    cuando: [{ periodo: 'verano' }, { lugar: 'casa' }, { hora: { desde: 15 * 60, hasta: 20 * 60 } }],
    aguanta: { dias: 2 },
    repite: { espera: { dias: 10 } },
    textos: [
      'Son las cuatro y el ventilador solo mueve el calor de un lado a otro. Nadie ha dicho nada de esta tarde.',
      'El verano, a estas horas, tiene el sonido de una mosca contra el cristal. No hay deberes ni planes. Ni siquiera ganas de buscarlos.',
      'La persiana está medio bajada y la casa, en silencio. Has contado las baldosas del pasillo dos veces.',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'tumbarte' },
    opciones: [
      {
        id: 'parque',
        texto: 'Salir al parque a ver quién anda por ahí',
        caracter: { sociabilidad: 1, optimismo: 1 },
        minutos: 10,
        efectos: [{ emite: 'lugares.ir_a', datos: { destino: 'parque' } }, { estado: 'gen.estres', mas: -1 }],
        resultado: 'Sales con el calor pegado a la espalda. En el parque siempre hay alguien.',
      },
      {
        id: 'tumbarte',
        texto: 'Tumbarte a leer o a dibujar',
        caracter: { disciplina: 1 },
        minutos: 45,
        efectos: [{ entrena: 'gen.creatividad', cantidad: 0.3 }, { estado: 'gen.estres', mas: -3 }],
        resultados: ['Se te pasa la tarde sin darte cuenta, que es lo que se le pide a una tarde de verano.', 'Dibujas el ventilador, el pasillo, tu propio pie. Peor de lo que querías, mejor de lo que esperabas.'],
      },
      {
        id: 'tele',
        texto: 'Poner la tele o la consola',
        caracter: { disciplina: -1 },
        minutos: 60,
        efectos: [{ estado: 'gen.energia', mas: 1 }, { estado: 'gen.motivacion', mas: -1 }],
        resultado: 'Cambias de canal diez veces y no ves nada. Al acabar, la tarde ha pasado y no sabes bien cómo.',
      },
    ],
    pruebas: [{ nombre: 'Una tarde de verano en casa, se puede salir al parque', dado: { lugar: 'casa', hora: 17 * 60, periodo: 'verano' }, espero: { opcionDisponible: 'parque' } }],
  }),
];
