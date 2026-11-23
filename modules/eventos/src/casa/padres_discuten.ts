import { hilo } from '@ds/contracts';

/**
 * Se oyen voces (lote 2, tanda 4). De noche, a veces, oyes a tus padres discutir. Solo ocurre en una casa donde el apoyo familiar es alto (≥ 50), para no cargar la mano donde ya hay tensión. Por defecto es una
 * tensión sorda (hablan bajo y rápido, y no entiendes nada); con el contenido duro de «familia» activado se oye una bronca de verdad y hay una opción más (salir y pedirles que paren). Al día siguiente hay un silencio
 * raro en el desayuno y, una o dos semanas después, la casa se calma (con una charla si preguntaste). Siempre se arregla. Cifras de partida, por calibrar.
 */
export default hilo({
  id: 'eventos.casa.padres_discuten',
  nombre: 'Se oyen voces',
  requiere: ['relaciones', 'familia'],
  reparto: { tutor: { tipo: 'progenitor', prefiere: 'mas_apoyo' } },
  sucesos: [
    {
      id: 'eventos.casa.padres_discuten.voces',
      titulo: 'Se oyen voces',
      disparo: { cada: 'dia', prob: 0.02 },
      cuando: [{ periodo: 'clase' }, { lugar: 'casa' }, { familia: 'tutor', apoyo: { min: 50 } }, { hora: { desde: 21 * 60 + 30, hasta: 23 * 60 + 30 } }],
      aguanta: { dias: 3 },
      repite: { espera: { dias: 180 } },
      variantes: [
        {
          id: 'bronca',
          si: [{ alguna: [{ marca: 'lo_pillaron_mintiendo_en_casa' }, { hecho: 'nota_media', max: 5 }] }],
          duro: ['familia'],
          textos: [
            'Desde tu cuarto oyes a tus padres en la cocina, y esta vez no hablan bajo. Se oye una frase entera, dicha con rabia: «…y siempre dices lo mismo». Después, un portazo.',
            'Las voces suben y bajan al otro lado de la pared. No distingues las palabras, pero sí el tono, y es el de las discusiones de verdad. Se te encoge el estómago.',
          ],
        },
        {
          id: 'tension',
          si: [],
          textos: [
            'Desde tu cama oyes a tus padres, en la cocina, hablar bajo y rápido. No entiendes las palabras, solo el tono. Algo les preocupa.',
            'Pasas por el pasillo camino del baño y oyes a tus padres discutir en voz baja, con mucho cuidado de que no los oigas. Se callan en cuanto cruje el suelo.',
          ],
        },
      ],
      urgencia: 'ahora',
      plazo: { hasta: { hora: 23 * 60 + 55 }, porDefecto: 'almohada' },
      opciones: [
        { id: 'asomarte', texto: 'Asomarte a ver qué pasa', caracter: { prudencia: -1, sociabilidad: 1 }, minutos: 5, tirada: { con: 'gen.empatia', dificultad: 40 }, exito: { efectos: [{ relacion: 'tutor', confianza: 2 }, { marca: 'se_acerco_a_sus_padres', dura: { dias: 14 } }, { programa: 'eventos.casa.padres_discuten.a_la_manana', en: { dias: [1, 1] } }], resultado: 'Solo te asomas un poco. {tutor.Nombre} te ve, se pasa una mano por la cara y baja el tono. «Vuelve a la cama, cielo. No pasa nada».' }, fallo: { efectos: [{ estado: 'gen.estres', mas: 3 }, { programa: 'eventos.casa.padres_discuten.a_la_manana', en: { dias: [1, 1] } }], resultado: 'Te quedas en el pasillo, sin atreverte a entrar ni a irte. Cuando las voces se apagan, vuelves a la cama con un nudo en el estómago.' } },
        { id: 'almohada', texto: 'Taparte con la almohada y esperar a que pase', caracter: { prudencia: 1 }, efectos: [{ estado: 'gen.estres', mas: 2 }, { programa: 'eventos.casa.padres_discuten.a_la_manana', en: { dias: [1, 1] } }], resultado: 'Cierras los ojos y cuentas hasta cien, dos veces. Al final las voces se apagan solas.' },
        { id: 'agua', texto: 'Salir a por un vaso de agua, para que sepan que estás despierto', caracter: { sociabilidad: 1, prudencia: 1 }, minutos: 5, efectos: [{ relacion: 'tutor', confianza: 1 }, { marca: 'se_acerco_a_sus_padres', dura: { dias: 14 } }, { programa: 'eventos.casa.padres_discuten.a_la_manana', en: { dias: [1, 1] } }], resultado: 'Cruzas la cocina sin mirar a nadie, con el vaso en la mano. Las voces se apagan al instante. «¿Te hemos despertado?», pregunta {tutor.nombre}, muy bajito.' },
        { id: 'parar', texto: 'Salir y pedirles que paren', duro: ['familia'], caracter: { agresividad: 1, sacrificio: 1, prudencia: -1 }, minutos: 5, tirada: { con: 'gen.autoridad', dificultad: 50 }, exito: { efectos: [{ relacion: 'tutor', afinidad: 2, confianza: 2 }, { familia: 'tutor', apoyo: 1 }, { marca: 'se_acerco_a_sus_padres', dura: { dias: 14 } }, { programa: 'eventos.casa.padres_discuten.a_la_manana', en: { dias: [1, 1] } }], resultado: 'Aparece tu cara en la puerta de la cocina y se hace un silencio inmediato. «Perdona», dice {tutor.nombre}. «Tienes razón. Hemos sido muy ruidosos».' }, fallo: { efectos: [{ estado: 'gen.estres', mas: 6 }, { relacion: 'tutor', afinidad: -2 }, { familia: 'tutor', apoyo: -1 }, { programa: 'eventos.casa.padres_discuten.a_la_manana', en: { dias: [1, 1] } }], resultado: '«¡Esto no es cosa tuya! ¡A la cama!». Te vas con los ojos llenos de lágrimas y la certeza de que no era el momento.' } },
      ],
    },
    {
      id: 'eventos.casa.padres_discuten.a_la_manana',
      titulo: 'Un silencio raro en la cocina',
      disparo: { programado: true },
      cuando: [{ periodo: 'clase' }, { diaDeLaSemana: [0, 1, 2, 3, 4] }, { lugar: 'casa' }, { presente: 'tutor' }, { hora: { desde: 6 * 60 + 30, hasta: 7 * 60 + 45 } }],
      aguanta: { dias: 2 },
      variantes: [
        { id: 'te_vio', si: [{ marca: 'se_acerco_a_sus_padres' }], texto: '{tutor.Nombre} te sirve la leche con una sonrisa cansada. «Anoche te vi despiert{yo:o|a}, ¿verdad? Siento que hayas tenido que oírnos».' },
        {
          id: 'silencio',
          si: [],
          textos: [
        'En el desayuno nadie dice gran cosa. {tutor.Nombre} se afana con las tostadas y evita tu mirada. La radio suena un poco más fuerte de lo normal, como para llenar el vacío.',
        'La cocina está demasiado limpia y demasiado callada. {tutor.Nombre} te sirve la leche con un «buenos días» más suave que de costumbre.',
          ],
        },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'normal' },
      opciones: [
        { id: 'preguntar', texto: 'Preguntarle si está bien', caracter: { honestidad: 1, sociabilidad: 1 }, minutos: 5, tirada: { con: 'gen.comunicacion', dificultad: 45 }, exito: { efectos: [{ relacion: 'tutor', afinidad: 2, confianza: 3 }, { marca: 'pregunto_a_sus_padres', dura: { dias: 30 } }, { programa: 'eventos.casa.padres_discuten.se_calma', en: { dias: [7, 14] } }], resultado: '«Estoy bien, de verdad. Los mayores a veces discutimos, y no por eso dejamos de querernos».' }, fallo: { efectos: [{ programa: 'eventos.casa.padres_discuten.se_calma', en: { dias: [7, 14] } }], resultado: '«Cosas de mayores», dice sin mirarte. No ha servido, pero ha sido un intento.' } },
        { id: 'normal', texto: 'Hacer como si nada y desayunar', caracter: { prudencia: 1 }, efectos: [{ programa: 'eventos.casa.padres_discuten.se_calma', en: { dias: [7, 14] } }], resultado: 'Desayunas despacio, sin preguntar. A veces el silencio también es una forma de acompañar.' },
        { id: 'gracioso', texto: 'Contar algo gracioso del colegio para romper el hielo', caracter: { optimismo: 2, sociabilidad: 1 }, tirada: { con: 'gen.carisma', dificultad: 45 }, exito: { efectos: [{ relacion: 'tutor', afinidad: 2 }, { estado: 'gen.estres', mas: -1 }, { programa: 'eventos.casa.padres_discuten.se_calma', en: { dias: [7, 14] } }], resultado: 'Se ríe por primera vez en toda la mañana, aunque sea por compromiso. La cocina parece más grande, más luminosa.' }, fallo: { efectos: [{ programa: 'eventos.casa.padres_discuten.se_calma', en: { dias: [7, 14] } }], resultado: 'Lo cuentas, y suena un poco forzado. {tutor.Nombre} sonríe de lado, agradecid{tutor:o|a} por el intento.' } },
      ],
    },
    {
      id: 'eventos.casa.padres_discuten.se_calma',
      titulo: 'La casa se calma',
      disparo: { programado: true },
      cuando: [{ lugar: 'casa' }, { presente: 'tutor' }, { hora: { desde: 19 * 60, hasta: 22 * 60 } }],
      aguanta: { dias: 6 },
      variantes: [
        { id: 'hablaron', si: [{ marca: 'pregunto_a_sus_padres' }], texto: 'En la cena se vuelve a reír. Al recoger los platos, {tutor.nombre} te pasa una mano por el pelo. «Lo del otro día… gracias por preguntar. Ya está todo arreglado».', efectos: [{ familia: 'tutor', apoyo: 3 }, { relacion: 'tutor', afinidad: 2, confianza: 2 }, { fin: true }] },
        { id: 'se_arreglo', si: [], texto: 'En la cena todo está como siempre: voces normales, bromas viejas y el mismo sitio en la mesa. Lo del otro día parece de otra casa.', efectos: [{ familia: 'tutor', apoyo: 1 }, { fin: true }] },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Tensión: preguntas y todo se arregla',
      dado: { lugar: 'casa', hora: 22 * 60, periodo: 'clase', diaDeLaSemana: 2, hechos: { nota_media: 7 } },
      pasos: [
        { sale: 'eventos.casa.padres_discuten.voces', variante: 'tension', elige: 'almohada' },
        { pasan: { dias: 1 }, dado: { lugar: 'colegio' } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa', hora: 7 * 60, diaDeLaSemana: 3 } },
        { sale: 'eventos.casa.padres_discuten.a_la_manana', elige: 'preguntar', tirada: 'exito' },
        { espero: { marca: 'pregunto_a_sus_padres' } },
        { pasan: { dias: 15 }, dado: { lugar: 'colegio' } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa', hora: 20 * 60 } },
        { sale: 'eventos.casa.padres_discuten.se_calma', variante: 'hablaron' },
        { espero: { hiloCerrado: true } },
      ],
    },
  ],
});
