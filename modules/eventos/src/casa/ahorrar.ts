import { hilo } from '@ds/contracts';

/**
 * Lo que quieres de verdad (lote 2, tanda 4). Un fin de semana quieres algo que cuesta 20 €. Se lo propones a tu madre o a tu padre; un trato de tareas te da 10 € y, con lo que vayas juntando, puedes comprarlo semanas después.
 * Usa `gen.dinero` tal cual: **el personaje empieza con 0 € y no tiene ingresos** (deuda técnica: la economía del personaje), así que aquí el dinero llega solo por el trato de este hilo. No inventa sistemas ni tiendas: la compra es una
 * opción de un suceso. Nada duro. Cifras de partida (20 € y 10 €), por calibrar.
 */
export default hilo({
  id: 'eventos.casa.ahorrar',
  nombre: 'Lo que quieres de verdad',
  requiere: ['relaciones', 'familia'],
  reparto: { tutor: { tipo: 'progenitor', prefiere: 'mas_apoyo' } },
  sucesos: [
    {
      id: 'eventos.casa.ahorrar.deseo',
      titulo: 'Lo que quieres de verdad',
      disparo: { cada: 'semana', prob: 0.12 },
      cuando: [{ lugar: 'casa' }, { presente: 'tutor' }, { diaDeLaSemana: [5, 6] }, { hora: { desde: 10 * 60, hasta: 20 * 60 } }],
      aguanta: { dias: 2 },
      repite: { espera: { dias: 120 } },
      textos: [
        'Llevas toda la semana mirando unas zapatillas en el escaparate de la avenida. Hoy, en la cocina, te animas: «{tutor.Nombre}… ¿podemos hablar de una cosa?»',
        'Hay algo que quieres de verdad: esas zapatillas del escaparate de la avenida. Cuestan veinte euros, que es un mundo. «{tutor.Nombre}…», empiezas.',
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'olvidarlo' },
      opciones: [
        { id: 'pedir', texto: 'Pedírselo directamente', caracter: { ambicion: 1, sociabilidad: 1 }, minutos: 10, tirada: { con: 'gen.comunicacion', dificultad: 45 }, exito: { efectos: [{ relacion: 'tutor', afinidad: 1 }, { estado: 'gen.dinero', mas: 10 }, { programa: 'eventos.casa.ahorrar.la_paga', en: { dias: [7, 7] } }], resultado: '«Te doy la mitad ahora, y la otra mitad te la ganas», dice, ablandándose. Te guardas el billete como si fuera de cristal.' }, fallo: { efectos: [{ programa: 'eventos.casa.ahorrar.la_paga', en: { dias: [7, 7] } }], resultado: '«Ya veremos», dice, que es una forma suave de decir «no». Pero no cierra la puerta del todo.' } },
        { id: 'ahorrar', texto: 'Proponerle un trato: tú ahorras y {tutor:él|ella} pone la otra mitad', caracter: { disciplina: 1, ambicion: 1 }, minutos: 10, efectos: [{ relacion: 'tutor', afinidad: 2, confianza: 1 }, { familia: 'tutor', expectativas: 1 }, { marca: 'trato_a_mitades', dura: { dias: 90 } }, { programa: 'eventos.casa.ahorrar.la_paga', en: { dias: [7, 7] } }], resultado: '«Eso me gusta más que pedir sin más», dice con una sonrisa. «Hablamos el sábado que viene de cómo lo hacemos».' },
        { id: 'olvidarlo', texto: 'Olvidarlo: tampoco lo necesitas tanto', caracter: { prudencia: 1, ambicion: -1 }, efectos: [{ fin: true }], resultado: '«Nada, nada. Era una tontería». Y vuelves a tu cuarto con las manos vacías y la cabeza ocupada.' },
      ],
    },
    {
      id: 'eventos.casa.ahorrar.la_paga',
      titulo: 'Un trato con tareas',
      disparo: { programado: true },
      cuando: [{ lugar: 'casa' }, { presente: 'tutor' }, { diaDeLaSemana: [5, 6] }, { hora: { desde: 10 * 60, hasta: 20 * 60 } }],
      aguanta: { dias: 3 },
      texto: '{tutor.Nombre} te llama a la cocina. «Lo de las zapatillas. He pensado en algo: si ayudas en casa estas semanas, te voy dando una paga. Nada de otro mundo. ¿Te parece?»',
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'si' },
      opciones: [
        { id: 'si', texto: 'Aceptar el trato de tareas', caracter: { disciplina: 1, sacrificio: 1 }, minutos: 30, efectos: [{ estado: 'gen.dinero', mas: 10 }, { relacion: 'tutor', afinidad: 2 }, { familia: 'tutor', expectativas: 1 }, { programa: 'eventos.casa.ahorrar.la_compra', en: { dias: [14, 28] } }], resultado: 'Pasas la tarde barriendo, ordenando, sacando la basura. Al final, {tutor.nombre} te da un billete de diez con un guiño.' },
        { id: 'mas', texto: 'Intentar que sea más a cambio de menos', caracter: { ambicion: 1, honestidad: -1 }, minutos: 20, tirada: { con: 'gen.carisma', dificultad: 50 }, exito: { efectos: [{ estado: 'gen.dinero', mas: 10 }, { programa: 'eventos.casa.ahorrar.la_compra', en: { dias: [14, 28] } }], resultado: '«Eres un negociador nato». Aceptas por la misma cantidad, con la mitad de las tareas.' }, fallo: { efectos: [{ relacion: 'tutor', afinidad: -1 }, { estado: 'gen.dinero', mas: 5 }, { programa: 'eventos.casa.ahorrar.la_compra', en: { dias: [14, 28] } }], resultado: '«Así no funcionan los tratos». Te quedas con la mitad, y la lección.' } },
        { id: 'no', texto: 'Decir que ya no lo quieres tanto', caracter: { ambicion: -1 }, efectos: [{ fin: true }], resultado: '«Como quieras». La idea de las zapatillas se te va quedando atrás.' },
      ],
    },
    {
      id: 'eventos.casa.ahorrar.la_compra',
      titulo: 'Las zapatillas',
      disparo: { programado: true },
      cuando: [{ lugar: 'casa' }, { diaDeLaSemana: [5, 6] }, { hora: { desde: 10 * 60, hasta: 20 * 60 } }],
      aguanta: { dias: 7 },
      texto: 'Hoy hace tres semanas que hablaste de las zapatillas. Cuentas lo que tienes, y lo que te falta, y lo que has aguantado sin gastar.',
      urgencia: 'ahora',
      plazo: { dias: 2, porDefecto: 'esperar' },
      opciones: [
        { id: 'comprar', texto: 'Comprarlas con lo que has juntado (20 €)', caracter: { ambicion: 1, disciplina: 1 }, minutos: 30, requiere: [{ stat: 'gen.dinero', min: 20 }], efectos: [{ estado: 'gen.dinero', mas: -20 }, { estado: 'gen.motivacion', mas: 6 }, { relacion: 'tutor', afinidad: 1 }, { fin: true }], resultado: 'Las estrenas en la tienda misma, y caminas por la avenida con la sensación de que son tuyas de verdad, porque te las has ganado.' },
        { id: 'mitad', texto: 'Comprarlas con tus 10 € y lo que pone {tutor:él|ella} (el trato)', caracter: { ambicion: 1, sociabilidad: 1 }, minutos: 30, requiere: [{ marca: 'trato_a_mitades' }, { stat: 'gen.dinero', min: 10 }], efectos: [{ estado: 'gen.dinero', mas: -10 }, { estado: 'gen.motivacion', mas: 6 }, { relacion: 'tutor', afinidad: 3 }, { fin: true }], resultado: '{tutor.Nombre} pone la otra mitad en el mostrador sin decir nada y te guiña un ojo. Las estrenas ahí mismo.' },
        { id: 'esperar', texto: 'Esperar un poco más: aún no llegas', caracter: { prudencia: 1 }, efectos: [{ fin: true }], resultado: 'Todavía te falta. Pero no pasa nada: ya sabes lo que cuesta, y eso también se aprende.' },
        { id: 'otra_cosa', texto: 'Gastarlo en otra cosa que te apetece más', caracter: { prudencia: -1, ambicion: -1 }, requiere: [{ stat: 'gen.dinero', min: 3 }], efectos: [{ estado: 'gen.dinero', mas: -3 }, { estado: 'gen.estres', mas: -2 }, { relacion: 'tutor', afinidad: -1 }, { fin: true }], resultado: 'Te compras algo pequeño, y lo disfrutas. Pero cuando pasas por el escaparate, las zapatillas siguen ahí, mirándote.' },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Pides, aceptas las tareas y compras',
      dado: { lugar: 'casa', hora: 12 * 60, diaDeLaSemana: 5, stats: { 'gen.dinero': 0 } },
      pasos: [
        { sale: 'eventos.casa.ahorrar.deseo', elige: 'pedir', tirada: 'exito' },
                { pasan: { dias: 8 }, dado: { lugar: 'colegio' } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa', hora: 12 * 60, diaDeLaSemana: 5 } },
        { sale: 'eventos.casa.ahorrar.la_paga', elige: 'si' },
        { pasan: { dias: 29 }, dado: { lugar: 'colegio', stats: { 'gen.dinero': 25 } } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa', hora: 12 * 60, diaDeLaSemana: 5 } },
        { sale: 'eventos.casa.ahorrar.la_compra', elige: 'comprar' },
        { espero: { hiloCerrado: true } },
      ],
    },
    {
      nombre: 'Sin dinero no se pueden comprar: se espera',
      dado: { lugar: 'casa', hora: 12 * 60, diaDeLaSemana: 5, stats: { 'gen.dinero': 0 } },
      pasos: [
        { sale: 'eventos.casa.ahorrar.deseo', elige: 'ahorrar' },
        { pasan: { dias: 8 }, dado: { lugar: 'colegio' } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa', hora: 12 * 60, diaDeLaSemana: 5 } },
        { sale: 'eventos.casa.ahorrar.la_paga', elige: 'no' },
        { espero: { hiloCerrado: true } },
      ],
    },
  ],
});
