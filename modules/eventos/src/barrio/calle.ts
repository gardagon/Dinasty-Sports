import { suceso } from '@ds/contracts';

/**
 * Gente por la calle (23/11, F1 y F2 de `docs/relevo/gente-por-la-calle.md`): lo que pasa al cruzarte con quien vive o trabaja en el barrio. Son `menor`, espontáneos al llegar a una calle, y piden a alguien **que está allí**
 * (`presente: true`). Nadie empieza conocido: la primera vez es un desconocido (papel `nuevo`, `conocido: false`, que se presenta en el suceso) y las siguientes ya lo conoces (papel `viejo`); cada suceso lleva las dos
 * versiones como variantes. Los textos de entrada y de resultado tienen varias versiones. Cifras de partida, por calibrar.
 */
const EJEMPLO_CASA = { desde: 'casa', hasta: 'calle_casa', minutos: 1 };
const EJEMPLO_AVENIDA = { desde: 'calle_casa', hasta: 'avenida_parque', minutos: 4 };
const A_LA_CALLE_DE_CASA = { señal: 'hasta', es: 'calle_casa' } as const;
const ENTRE = (desde: number, hasta: number) => ({ hora: { desde, hasta } }) as const;
const h = (horas: number, minutos = 0) => horas * 60 + minutos;
/** Cualquier adulto que pase (vecino, portero, repartidor): para el saludo de la primera vez. */
const ADULTO_NUEVO = { rol: 'vecino', edad: { min: 25 }, presente: true, conocido: false } as const;

export default [
  suceso({
    id: 'eventos.barrio.buenos_dias',
    titulo: 'Buenos días',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.18 },
    ejemploDeSeñal: EJEMPLO_CASA,
    cuando: [A_LA_CALLE_DE_CASA, ENTRE(h(6, 30), h(9))],
    repite: { espera: { dias: 12 } },
    reparto: { vecino: ADULTO_NUEVO },
    textos: [
      'Sales a la calle y {vecino:él|ella} ya está allí, con las llaves en la mano. «Buenos días», dice, y te mira como si te conociera de algo.',
      'Cruzas la acera justo cuando {vecino:un vecino que no sabes cómo se llama|una vecina que no sabes cómo se llama} abre su coche. Os cruzáis la mirada y {vecino:él|ella} levanta la barbilla, a modo de saludo.',
      'A estas horas la calle huele a pan y a café. Alguien viene de frente, {vecino:cargado de bolsas|cargada de bolsas}, y te regala un «buenos días» en voz bien alta.',
    ],
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'seguir' },
    opciones: [
      {
        id: 'saludar',
        texto: 'Devolver el saludo y preguntarle cómo se llama',
        caracter: { sociabilidad: 1, optimismo: 1 },
        minutos: 3,
        efectos: [{ presenta: 'vecino' }, { relacion: 'vecino', afinidad: 1, confianza: 1 }],
        resultados: [
          'Se llama {vecino.nombreCompleto} y vive a dos portales del tuyo. «Pues nada, hasta luego, vecin{yo:o|a}», dice, y se va con una sonrisa.',
          '{vecino.Nombre} te cuenta que lleva años en la calle y que te ha visto crecer, más o menos. Te despides sin prisa.',
        ],
      },
      {
        id: 'sonreir',
        texto: 'Sonreír y devolver el saludo con la cabeza',
        caracter: { prudencia: 1 },
        efectos: [{ relacion: 'vecino', afinidad: 1 }],
        resultados: ['Os sonreís sin pararos. Es un detalle de nada, pero la calle se te hace un poco más tuya.', 'Contestas con un «buenas» a medias. {vecino.Nombre} sigue su camino, satisfech{vecino:o|a}.'],
      },
      { id: 'seguir', texto: 'Seguir andando, con prisa', caracter: { sociabilidad: -1 }, efectos: [], resultados: ['Aprietas el paso. Detrás, el saludo se queda en el aire.', 'Haces como que no lo has oído. A lo mejor otro día.'] },
    ],
    pruebas: [
      { nombre: 'Por la mañana, al salir de casa, con un desconocido en la calle', dado: { lugar: 'calle_casa', hora: h(7, 20) }, señal: EJEMPLO_CASA, espero: { opcionDisponible: 'saludar' } },
      { nombre: 'De noche no sale', dado: { lugar: 'calle_casa', hora: h(22) }, señal: EJEMPLO_CASA, espero: { sale: false } },
    ],
  }),

  suceso({
    id: 'eventos.barrio.perro_suelto',
    titulo: 'Un perro suelto',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.03 },
    ejemploDeSeñal: EJEMPLO_AVENIDA,
    cuando: [{ alguna: [{ señal: 'hasta', es: 'parque' }, { señal: 'hasta', es: 'avenida_parque' }, { señal: 'hasta', es: 'calle_casa' }] }],
    repite: { espera: { dias: 45 } },
    // Quien lo saca a pasear (marca `perro` en un vecino que está allí). Si no hay nadie, el perro anda suelto como siempre.
    reparto: { dueno: { tipo: 'perro', presente: true, conocido: false, opcional: true } },
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'quieto' },
    variantes: [
      {
        id: 'con_dueno',
        si: [{ papel: 'dueno' }],
        textos: [
          'Un perro sin correa viene directo hacia ti con la lengua fuera. Detrás, {dueno:un hombre|una mujer} corre con la correa en la mano: «¡Quieto! ¡Quieto, te digo!».',
          'Un perro te sale al paso con una pelota en la boca y la deja a tus pies, muy serio. {dueno.Nombre} llega sin aliento: «Perdona, es que no sabe lo que hace».',
          'Algo peludo te choca en las rodillas. Es un perro que no para de mover el rabo; su dueño llega detrás, riendo y pidiendo perdón a la vez.',
        ],
        opciones: [
          {
            id: 'quieto',
            texto: 'Quedarte quiet{yo:o|a} y no mirarlo',
            caracter: { prudencia: 1 },
            efectos: [{ estado: 'gen.estres', mas: 1 }, { presenta: 'dueno' }],
            resultados: ['El perro te huele los zapatos, se aburre y se va. {dueno.Nombre} se disculpa dos veces y te dice su nombre sin que se lo preguntes.', 'No te mueves. {dueno.Nombre} ya lo ha atrapado: «No muerde, de verdad», dice. Tarda un rato en convencerte.'],
          },
          {
            id: 'acariciar',
            texto: 'Agacharte y dejar que se acerque',
            caracter: { optimismo: 1, prudencia: -1 },
            minutos: 5,
            tirada: { con: 'gen.empatia', dificultad: 40 },
            exito: {
              efectos: [{ estado: 'gen.estres', mas: -3 }, { estado: 'gen.motivacion', mas: 2 }, { presenta: 'dueno' }, { relacion: 'dueno', afinidad: 2, confianza: 1 }],
              resultados: ['Te lame la mano y mueve el rabo como loco. {dueno.Nombre} sonríe: «Le caes bien, y a este no le cae bien casi nadie». Os presentáis.', 'El perro se te tumba encima de los pies. {dueno.Nombre} te cuenta cómo se llama, cuántos años tiene y que se come los calcetines.'],
            },
            fallo: {
              efectos: [{ estado: 'gen.estres', mas: 2 }, { presenta: 'dueno' }],
              resultado: 'Se te echa encima con las patas y te deja la camiseta perdida de barro. {dueno.Nombre} no sabe dónde meterse y te dice su nombre entre disculpas.',
            },
          },
          {
            id: 'devolver_pelota',
            texto: 'Recoger la pelota y lanzársela lejos',
            caracter: { sociabilidad: 1 },
            minutos: 5,
            efectos: [{ estado: 'gen.motivacion', mas: 1 }, { presenta: 'dueno' }, { relacion: 'dueno', afinidad: 1 }],
            resultados: ['El perro sale disparado detrás de la pelota. {dueno.Nombre} se ríe: «Ahora sí que no te vas a librar de él». Os quedáis charlando mientras vuelve.', 'La lanzas bien lejos. Mientras el perro la busca, {dueno.Nombre} te pregunta si eres de por aquí.'],
          },
        ],
      },
      {
        id: 'sin_dueno',
        si: [],
        texto: 'Un perro sin correa viene directo hacia ti con la lengua fuera. A lo lejos, alguien grita su nombre. No sabes si quiere jugar o algo peor.',
        opciones: [
          { id: 'quieto', texto: 'Quedarte quiet{yo:o|a} y no mirarlo', caracter: { prudencia: 1 }, efectos: [{ estado: 'gen.estres', mas: 1 }], resultado: 'Te huele los zapatos, se aburre y se va. El corazón te va a mil.' },
          {
            id: 'acariciar',
            texto: 'Agacharte y dejar que se acerque',
            caracter: { optimismo: 1, prudencia: -1 },
            tirada: { con: 'gen.empatia', dificultad: 40 },
            exito: { efectos: [{ estado: 'gen.estres', mas: -3 }, { estado: 'gen.motivacion', mas: 2 }], resultado: 'Te lame la mano y mueve el rabo como loco. Su dueño llega pidiendo perdón; tú ya estás sonriendo.' },
            fallo: { efectos: [{ estado: 'gen.estres', mas: 3 }], resultado: 'Se te echa encima con las patas y te deja la camiseta perdida de barro. Te asustas más que otra cosa.' },
          },
          { id: 'correr', texto: 'Echar a correr', caracter: { prudencia: 1 }, minutos: 3, efectos: [{ estado: 'gen.energia', mas: -2 }, { estado: 'gen.estres', mas: 2 }, { entrena: 'gen.velocidad', cantidad: 0.2 }], resultado: 'Corres hasta la esquina sin mirar atrás. Cuando te giras, el perro está sentado, mirándote, sin entender nada.' },
        ],
      },
    ],
    pruebas: [
      { nombre: 'Con su dueño en la avenida', dado: { lugar: 'avenida_parque', hora: h(7, 15) }, señal: EJEMPLO_AVENIDA, espero: { opcionDisponible: 'devolver_pelota' } },
      { nombre: 'Sin nadie que lo saque (nadie con perro en el lugar)', dado: { lugar: 'avenida_parque', hora: h(12), sinPapel: ['dueno'] }, señal: EJEMPLO_AVENIDA, espero: { opcionDisponible: 'correr' } },
    ],
  }),

  suceso({
    id: 'eventos.barrio.banco_al_sol',
    titulo: 'Un banco al sol',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.1 },
    ejemploDeSeñal: EJEMPLO_AVENIDA,
    cuando: [{ alguna: [{ señal: 'hasta', es: 'parque' }, { señal: 'hasta', es: 'avenida_parque' }] }, { alguna: [ENTRE(h(10), h(13)), ENTRE(h(17), h(19, 30))] }],
    repite: { espera: { dias: 20 } },
    // Un jubilado sentado en un banco: la primera vez no sabes quién es (`nuevo`); después, ya le conoces (`viejo`).
    reparto: { nuevo: { tipo: 'jubilado', presente: true, conocido: false, opcional: true }, viejo: { tipo: 'jubilado', presente: true, opcional: true } },
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'seguir' },
    variantes: [
      {
        id: 'primera_vez',
        si: [{ papel: 'nuevo' }],
        textos: [
          'En un banco, {nuevo:un señor mayor|una señora mayor} da migas a las palomas con mucha ceremonia. Cuando pasas, te hace un gesto con la mano para que te acerques.',
          '{nuevo:Un abuelo|Una abuela} te llama desde un banco. «Eh, tú, ¿tienes hora?». Es evidente que ya la sabe: lo que quiere es hablar con alguien.',
          'Al sol, en un banco, {nuevo:un jubilado|una jubilada} lee el periódico en voz baja. Levanta la vista y te estudia por encima de las gafas.',
        ],
        opciones: [
          {
            id: 'sentarte',
            texto: 'Sentarte un rato a su lado',
            caracter: { sociabilidad: 1, optimismo: 1 },
            minutos: 15,
            efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 2, confianza: 1 }, { estado: 'gen.estres', mas: -2 }],
            resultados: ['Se llama {nuevo.nombreCompleto}. Te cuenta cómo era el barrio hace cuarenta años, cuando donde ahora está el parque había solo descampado.', '{nuevo.Nombre} te cuenta que viene aquí cada día. «Si no vengo, no habla nadie conmigo», dice, y se ríe de su propia broma.'],
          },
          {
            id: 'ajedrez',
            texto: 'Aceptar una partida de ajedrez que te propone',
            caracter: { prudencia: -1 },
            minutos: 20,
            tirada: { con: 'gen.inteligencia', dificultad: 45 },
            exito: { efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 3, confianza: 2 }, { entrena: 'gen.inteligencia', cantidad: 0.5 }], resultado: 'Le ganas en el último momento. {nuevo.Nombre} se queda mirando el tablero: «Esta no me la esperaba». Quiere la revancha mañana.' },
            fallo: { efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 1 }, { entrena: 'gen.inteligencia', cantidad: 0.3 }], resultado: 'En cinco jugadas te ha comido la dama. {nuevo.Nombre} te explica el error con paciencia y te promete otra oportunidad.' },
          },
          { id: 'seguir', texto: 'Decirle la hora y seguir tu camino', caracter: { sociabilidad: -1 }, efectos: [], resultados: ['Das la hora y sigues. A tu espalda, las palomas vuelven a lo suyo.', '«Gracias, hijo», dice, y vuelve a su periódico. Te queda la sensación de haber dejado algo a medias.'] },
        ],
      },
      {
        id: 'ya_le_conoces',
        si: [{ papel: 'viejo' }],
        textos: [
          '{viejo.Nombre} está en su banco de siempre y te hace sitio sin decir nada, dando unas palmaditas en la madera.',
          'Desde el banco, {viejo.nombre} te saluda con el periódico doblado en la mano. «Justo a quien quería ver», dice.',
          'Al pasar por el banco, {viejo.nombre} te guarda el sitio y te ofrece unas pipas. Parece que hoy tiene ganas de hablar.',
        ],
        opciones: [
          { id: 'sentarte', texto: 'Sentarte un rato a charlar', caracter: { sociabilidad: 1 }, minutos: 15, efectos: [{ relacion: 'viejo', afinidad: 2, confianza: 1 }, { estado: 'gen.estres', mas: -2 }], resultados: ['Habláis de todo y de nada. Cuando te levantas, {viejo.nombre} te dice: «Vuelve cuando quieras».', '{viejo.Nombre} te cuenta una historia que ya conocías, pero esta vez la tiene distinta. Te quedas hasta el final.'] },
          { id: 'ajedrez', texto: 'Echar una partida de ajedrez', caracter: { prudencia: -1 }, minutos: 20, tirada: { con: 'gen.inteligencia', dificultad: 45 }, exito: { efectos: [{ relacion: 'viejo', afinidad: 2 }, { entrena: 'gen.inteligencia', cantidad: 0.5 }], resultado: 'Esta vez le ganas tú. {viejo.Nombre} protesta, pero está contento: hay quien por fin le da guerra.' }, fallo: { efectos: [{ relacion: 'viejo', afinidad: 1 }, { entrena: 'gen.inteligencia', cantidad: 0.3 }], resultado: 'Pierdes otra vez, pero ahora entiendes mejor por qué. {viejo.Nombre} te da una palmada en el hombro.' } },
          { id: 'seguir', texto: 'Saludar con la mano y seguir', efectos: [{ relacion: 'viejo', afinidad: -1 }], resultado: 'Levantas la mano. {viejo.Nombre} asiente y vuelve a su periódico, aunque tarda en pasar la página.' },
        ],
      },
    ],
    pruebas: [
      { nombre: 'Por la mañana, en la avenida, con un jubilado que no conoces', dado: { lugar: 'avenida_parque', hora: h(11), sinPapel: ['viejo'] }, señal: EJEMPLO_AVENIDA, espero: { opcionDisponible: 'sentarte' } },
      { nombre: 'Con uno que ya conoces', dado: { lugar: 'parque', hora: h(18), sinPapel: ['nuevo'] }, señal: { desde: 'calle_casa', hasta: 'parque', minutos: 5 }, espero: { opcionDisponible: 'ajedrez' } },
      { nombre: 'A mediodía de los días libres sale también, pero a las 15:00 no', dado: { lugar: 'parque', hora: h(15) }, señal: { desde: 'calle_casa', hasta: 'parque', minutos: 5 }, espero: { sale: false } },
    ],
  }),

  suceso({
    id: 'eventos.barrio.el_portero',
    titulo: 'El portero',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.1 },
    ejemploDeSeñal: EJEMPLO_CASA,
    cuando: [A_LA_CALLE_DE_CASA, { alguna: [ENTRE(h(7), h(14)), ENTRE(h(16), h(20))] }],
    repite: { espera: { dias: 14 } },
    reparto: { nuevo: { tipo: 'portero', presente: true, conocido: false, opcional: true }, viejo: { tipo: 'portero', presente: true, opcional: true } },
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'seguir' },
    variantes: [
      {
        id: 'primera_vez',
        si: [{ papel: 'nuevo' }],
        textos: [
          'Frente a tu portal, {nuevo:un hombre|una mujer} con un cubo y una fregona te mira de arriba abajo. «Tú eres de los de casa, ¿no? Yo soy el portero. Si pasa algo, aquí estoy».',
          '{nuevo:Un hombre mayor|Una mujer mayor} barre la acera con paciencia. Al pasar, se apoya en la escoba: «¿Eres de los nuevos del tercero? Yo cuido de este portal».',
          'En la puerta del edificio, {nuevo:un hombre|una mujer} de uniforme te hace una señal. «Buenas. Soy el portero. Cualquier cosa, ya sabes dónde encontrarme».',
        ],
        opciones: [
          { id: 'presentarte', texto: 'Presentarte y darle la mano', caracter: { sociabilidad: 1, honestidad: 1 }, minutos: 3, efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 2, confianza: 2 }], resultados: ['Se llama {nuevo.nombreCompleto}. «Pues ya está, ahora sabes con quién hablar si se atasca el ascensor», dice, y vuelve a la fregona.', '{nuevo.Nombre} te estrecha la mano con una mano mojada y una sonrisa seca. Parece un buen tipo.'] },
          { id: 'preguntar', texto: 'Preguntarle cómo es el barrio', caracter: { sociabilidad: 1 }, minutos: 8, efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 1, confianza: 1 }, { estado: 'gen.motivacion', mas: 1 }], resultado: '{nuevo.Nombre} te cuenta quién vive en cada piso, dónde está la mejor panadería y a qué hora deja de pasar el camión de la basura.' },
          { id: 'seguir', texto: 'Saludar y entrar rápido', caracter: { sociabilidad: -1 }, efectos: [], resultados: ['Dices «hola» y te metes en el portal. Detrás, la fregona sigue su ritmo.', 'Asientes con la cabeza y subes. Ya habrá otro día para las presentaciones.'] },
        ],
      },
      {
        id: 'ya_le_conoces',
        si: [{ papel: 'viejo' }],
        textos: [
          '{viejo.Nombre}, el portero, te abre la puerta del portal antes de que saques las llaves. «Hoy se te ve con prisa», dice.',
          'Frente al portal, {viejo.nombre} te hace un gesto. «Ha llegado un paquete para vuestra casa. Lo tengo dentro, ¿lo quieres ya?».',
          '{viejo.Nombre} está sacando la basura. Al verte, baja la voz: «El del cuarto ha vuelto a dar la lata con el ruido. Menos mal que vosotros sois tranquilos».',
        ],
        opciones: [
          { id: 'charlar', texto: 'Pararte a charlar con {viejo:él|ella}', caracter: { sociabilidad: 1 }, minutos: 8, efectos: [{ relacion: 'viejo', afinidad: 2, confianza: 1 }, { estado: 'gen.estres', mas: -1 }], resultados: ['Os quedáis un rato en la puerta. Es de esas personas que se enteran de todo y lo cuentan con cariño.', '{viejo.Nombre} te pregunta por el colegio y por tus cosas, y se acuerda de lo que le dijiste la última vez.'] },
          { id: 'ayudar', texto: 'Echarle una mano con lo que lleva', caracter: { sociabilidad: 1, honestidad: 1 }, minutos: 6, efectos: [{ relacion: 'viejo', afinidad: 3, confianza: 1 }, { estado: 'gen.energia', mas: -1 }], resultado: 'Entre los dos, acabáis antes. «Esto no se me olvida», dice {viejo.nombre}, y lo dice en serio.' },
          { id: 'seguir', texto: 'Agradecerle con un gesto y subir', efectos: [], resultado: 'Das las gracias de camino. {viejo.Nombre} cierra la puerta con cuidado tras de ti.' },
        ],
      },
    ],
    pruebas: [
      { nombre: 'La primera vez, un desconocido en el portal', dado: { lugar: 'calle_casa', hora: h(8), sinPapel: ['viejo'] }, señal: EJEMPLO_CASA, espero: { opcionDisponible: 'presentarte' } },
      { nombre: 'Después, ya lo conoces', dado: { lugar: 'calle_casa', hora: h(18), sinPapel: ['nuevo'] }, señal: EJEMPLO_CASA, espero: { opcionDisponible: 'ayudar' } },
      { nombre: 'A la hora de comer, con el portal cerrado, no sale', dado: { lugar: 'calle_casa', hora: h(14, 30) }, señal: EJEMPLO_CASA, espero: { sale: false } },
    ],
  }),

  suceso({
    id: 'eventos.barrio.repartidor_se_equivoca',
    titulo: 'Un reparto',
    categoria: 'menor',
    requiere: ['lugares', 'relaciones'],
    disparo: { al: 'lugares.llegada', prob: 0.12 },
    ejemploDeSeñal: EJEMPLO_CASA,
    cuando: [{ alguna: [{ señal: 'hasta', es: 'calle_casa' }, { señal: 'hasta', es: 'calle_colegio' }] }, { alguna: [ENTRE(h(10), h(13)), ENTRE(h(17), h(20))] }],
    repite: { espera: { dias: 25 } },
    reparto: { nuevo: { tipo: 'repartidor', presente: true, conocido: false, opcional: true }, viejo: { tipo: 'repartidor', presente: true, opcional: true } },
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'seguir' },
    variantes: [
      {
        id: 'primera_vez',
        si: [{ papel: 'nuevo' }],
        textos: [
          'Una furgoneta con las luces de emergencia puestas bloquea medio carril. {nuevo:Un repartidor|Una repartidora} sale con una caja en brazos y mira el móvil, el portal, el móvil otra vez. «Perdona, ¿es por aquí el número 14?».',
          '{nuevo:Un repartidor|Una repartidora} baja de la furgoneta con tres paquetes y ninguna idea de adónde ir. Te ve y te hace un gesto: «¡Eh! ¿Sabes dónde es esta dirección?».',
          'Con las manos ocupadas, {nuevo:un repartidor|una repartidora} intenta pulsar un timbre con el codo. «¿Me echas una mano? Voy tardísimo hoy».',
        ],
        opciones: [
          { id: 'indicar', texto: 'Indicarle el portal y ayudarle a encontrarlo', caracter: { sociabilidad: 1, honestidad: 1 }, minutos: 4, tirada: { con: 'gen.inteligencia', dificultad: 30 }, exito: { efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 2, confianza: 1 }, { estado: 'gen.motivacion', mas: 1 }], resultado: 'Lo encuentras a la primera. {nuevo.Nombre} te lo agradece de corazón y te dice su nombre: «Hoy me has salvado la ruta».' }, fallo: { efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 1 }], resultado: 'Os equivocáis de portal y tenéis que dar la vuelta a la manzana. Aun así, {nuevo.nombre} se ríe y te agradece el intento.' } },
          { id: 'ayudar', texto: 'Llevarle una de las cajas hasta la puerta', caracter: { sociabilidad: 1 }, minutos: 6, efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 3, confianza: 1 }, { estado: 'gen.energia', mas: -1 }], resultado: 'La caja pesa más de lo que parece. {nuevo.Nombre} te dice su nombre y te promete «un favor de repartidor» para cuando lo necesites.' },
          { id: 'seguir', texto: 'Decirle que no lo sabes y seguir', caracter: { sociabilidad: -1 }, efectos: [], resultados: ['Te encoges de hombros. {nuevo.Nombre} resopla y vuelve a mirar el móvil.', 'Dices que no eres de aquí (aunque sí lo eres) y sigues andando.'] },
        ],
      },
      {
        id: 'ya_le_conoces',
        si: [{ papel: 'viejo' }],
        textos: [
          '{viejo.Nombre}, el repartidor, te saluda desde la furgoneta: «¡Eh, tú! ¿Esto es para tu casa? Me ahorras la escalera».',
          'Ves a {viejo.nombre} descargando cajas con prisa. Al verte, sonríe: «¿Me das cinco minutos de tu vida? Hoy voy fatal».',
          '{viejo.Nombre} aparca en doble fila otra vez y se pone a buscar un número en el móvil. «¡Ey, vecin{yo:o|a}! ¿Me indicas?».',
        ],
        opciones: [
          { id: 'ayudar', texto: 'Echarle una mano con las cajas', caracter: { sociabilidad: 1 }, minutos: 6, efectos: [{ relacion: 'viejo', afinidad: 2, confianza: 1 }, { estado: 'gen.energia', mas: -1 }], resultado: 'Entre los dos, acabáis rápido. {viejo.Nombre} te da las gracias con un choque de manos.' },
          { id: 'charlar', texto: 'Charlar un momento mientras descarga', caracter: { sociabilidad: 1 }, minutos: 4, efectos: [{ relacion: 'viejo', afinidad: 1 }], resultado: 'Te cuenta qué calle es la peor para aparcar y quién siempre pide el mismo paquete. Es como un mapa del barrio con patas.' },
          { id: 'seguir', texto: 'Saludar con la mano y seguir', efectos: [], resultado: 'Levantas la mano y {viejo.nombre} te responde con el claxon. Es su forma de decir gracias.' },
        ],
      },
    ],
    pruebas: [
      { nombre: 'Por la mañana, un repartidor que no conoces', dado: { lugar: 'calle_casa', hora: h(11), sinPapel: ['viejo'] }, señal: EJEMPLO_CASA, espero: { opcionDisponible: 'indicar' } },
      { nombre: 'Por la tarde, uno que ya conoces', dado: { lugar: 'calle_colegio', hora: h(18), sinPapel: ['nuevo'] }, señal: { desde: 'calle_casa', hasta: 'calle_colegio', minutos: 8 }, espero: { opcionDisponible: 'charlar' } },
      { nombre: 'A las 15:00 no hay repartos', dado: { lugar: 'calle_casa', hora: h(15) }, señal: EJEMPLO_CASA, espero: { sale: false } },
    ],
  }),
];
