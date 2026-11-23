import { hilo } from '@ds/contracts';

/**
 * Un compañero nuevo (lote 2, tanda 2). En el primer trimestre, a veces, la profesora presenta a alguien que no conocías (un compañero de clase al que aún no habías hablado):
 * te pide que lo ayudes. Lo que hagas ese día decide cómo lo ves una semana después en el patio y qué es de él un mes más tarde: amigo, conocido o alguien que se fue con otros.
 * Camino con lo que elige el jugador, sin nada duro. Cifras de partida, por calibrar.
 */
export default hilo({
  id: 'eventos.colegio.companero_nuevo',
  nombre: 'Un compañero nuevo',
  requiere: ['estudios', 'relaciones'],
  reparto: { nuevo: { rol: 'companero', conocido: false }, profesor: { asignaturaDeLaSeñal: 'asignatura' } },
  sucesos: [
    {
      id: 'eventos.colegio.companero_nuevo.llegada',
      titulo: '{nuevo:Un compañero nuevo|Una compañera nueva}',
      disparo: { al: 'clase.asistida', prob: 0.03 },
      ejemploDeSeñal: { asignatura: 'estudios.lengua', tarde: 0 },
      cuando: [{ hecho: 'trimestre', max: 1 }, { periodo: 'clase' }],
      repite: 'una_vez_por_curso',
      durante: false,
      textos: [
        '«Un momento, por favor». {profesor.Nombre} abre la puerta y entra seguid{profesor:o|a} de {nuevo.nombreCompleto}, con la mochila abrazada. «Se incorpora hoy a la clase. ¿Quién se ofrece a ayudar{nuevo:lo|la} los primeros días?»',
        'A media clase llaman a la puerta. {profesor.Nombre} sale y vuelve con {nuevo.nombreCompleto}. «Os presento a {nuevo.nombre}. No conoce a nadie, así que os pido paciencia. ¿Algún voluntario?»',
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'esperar' },
      opciones: [
        {
          id: 'ofrecerte',
          texto: 'Levantar la mano y ofrecerte',
          caracter: { sociabilidad: 2, optimismo: 1 },
          efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: 2 }, { relacion: 'profesor', afinidad: 1 }, { marca: 'sento_a_nuevo', de: 'nuevo', dura: { dias: 60 } }, { programa: 'eventos.colegio.companero_nuevo.primera_semana', en: { dias: [5, 8] } }],
          resultado: '{nuevo.Nombre} se sienta a tu lado con una sonrisa de alivio. «Gracias. De verdad».',
        },
        {
          id: 'esperar',
          texto: 'Esperar a ver si se ofrece otra persona',
          caracter: { prudencia: 1, sociabilidad: -1 },
          efectos: [{ presenta: 'nuevo' }, { marca: 'ignoro_a_nuevo', de: 'nuevo', dura: { dias: 60 } }, { programa: 'eventos.colegio.companero_nuevo.primera_semana', en: { dias: [5, 8] } }],
          resultado: 'Nadie se mueve durante unos segundos incómodos. Al final, {profesor.nombre} lo sienta en un hueco libre del fondo.',
        },
        {
          id: 'tu_amigo',
          texto: 'Decir que ya tienes con quién sentarte',
          caracter: { sociabilidad: -1, honestidad: 1 },
          efectos: [{ presenta: 'nuevo' }, { relacion: 'nuevo', afinidad: -1 }, { marca: 'ignoro_a_nuevo', de: 'nuevo', dura: { dias: 60 } }, { programa: 'eventos.colegio.companero_nuevo.primera_semana', en: { dias: [5, 8] } }],
          resultado: '«Ya, claro». {nuevo.Nombre} asiente sin mirarte y se sienta donde le dicen.',
        },
      ],
    },
    {
      id: 'eventos.colegio.companero_nuevo.primera_semana',
      titulo: 'En el patio',
      disparo: { programado: true },
      cuando: [{ lugar: 'patio' }, { presente: 'nuevo' }],
      aguanta: { dias: 6 },
      variantes: [
        {
          id: 'con_ayuda',
          si: [{ marca: 'sento_a_nuevo', de: 'nuevo' }],
          textos: [
            '{nuevo.Nombre} te ve entre la gente del patio y se acerca casi corriendo. «¿Puedo almorzar contigo? Si no te molesta».',
            '{nuevo.Nombre} viene hacia ti con su bocadillo en la mano. «Esta semana no me he perdido ni una vez, y es gracias a ti. ¿Te importa si me siento?»',
          ],
        },
        {
          id: 'esperaste',
          si: [{ marca: 'ignoro_a_nuevo', de: 'nuevo' }],
          textos: [
            'En el escalón del fondo, {nuevo.nombre} mira el suelo con el bocadillo sin abrir. Cuando alzas la vista, {nuevo:lo|la} pillas mirándote, y apartas la mirada. Ese día, en clase, no te ofreciste.',
            'Entre el barullo del recreo, {nuevo.nombre} está sol{nuevo:o|a} junto a la valla. Te acuerdas de que levantaste la mano tarde, o no la levantaste, y te pesa un poco.',
          ],
        },
        {
          id: 'solo',
          si: [],
          textos: [
            'En el escalón del fondo, {nuevo.nombre} mira el suelo con el bocadillo sin abrir. Lleva toda la semana así, y se nota.',
            'Entre el barullo del recreo, {nuevo.nombre} está sol{nuevo:o|a} junto a la valla, mirando cómo juegan los demás.',
          ],
        },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'seguir' },
      opciones: [
        {
          id: 'sentaros',
          texto: 'Sentarte con {nuevo:él|ella}',
          caracter: { sociabilidad: 1, optimismo: 1 },
          minutos: 15,
          efectos: [{ relacion: 'nuevo', afinidad: 3, confianza: 2 }, { entrena: 'gen.empatia', cantidad: 0.4 }, { programa: 'eventos.colegio.companero_nuevo.un_mes_despues', en: { dias: [21, 30] } }],
          resultado: 'Habláis de las cosas de siempre: lo que echa de menos de su otro colegio, lo que ha descubierto en este. Se le va soltando la lengua.',
        },
        {
          id: 'presentarle',
          texto: 'Presentarle a tu grupo',
          caracter: { sociabilidad: 2 },
          minutos: 10,
          tirada: { con: 'gen.carisma', dificultad: 45 },
          exito: { efectos: [{ relacion: 'nuevo', afinidad: 3, confianza: 1 }, { entrena: 'gen.carisma', cantidad: 0.4 }, { programa: 'eventos.colegio.companero_nuevo.un_mes_despues', en: { dias: [21, 30] } }], resultado: 'Os hacéis sitio unos a otros y a los cinco minutos {nuevo.nombre} ya se ríe de un chiste que no entiende del todo.' },
          fallo: { efectos: [{ relacion: 'nuevo', afinidad: 1 }, { programa: 'eventos.colegio.companero_nuevo.un_mes_despues', en: { dias: [21, 30] } }], resultado: 'Los saludos salen torpes y cada uno mira a otro lado. No ha sido un desastre, pero tampoco ha cuajado.' },
        },
        { id: 'seguir', texto: 'Seguir a lo tuyo', caracter: { sociabilidad: -1 }, efectos: [{ relacion: 'nuevo', afinidad: -1 }, { programa: 'eventos.colegio.companero_nuevo.un_mes_despues', en: { dias: [21, 30] } }], resultado: 'Sigues con lo tuyo. Cuando miras otra vez, {nuevo.nombre} ya se ha ido a otro rincón.' },
      ],
    },
    {
      id: 'eventos.colegio.companero_nuevo.un_mes_despues',
      titulo: 'Cómo le va a {nuevo.nombre}',
      disparo: { programado: true },
      cuando: [{ periodo: 'clase' }, { lugar: 'aula' }],
      aguanta: { dias: 10 },
      presentacion: 'linea',
      variantes: [
        {
          id: 'amigos',
          si: [{ relacion: 'nuevo', afinidad: { min: 25 } }],
          texto: 'Ya ni te acuerdas de cuándo llegó {nuevo.nombre}: parece que siempre ha estado en la clase. Os guardáis sitio en el patio sin decirlo.',
          efectos: [{ fin: true }],
        },
        {
          id: 'conocidos',
          si: [{ relacion: 'nuevo', afinidad: { min: 8 } }],
          texto: '{nuevo.Nombre} se ha hecho su sitio en la clase y te saluda cada mañana. No sois uña y carne, pero os lleváis bien.',
          efectos: [{ fin: true }],
        },
        {
          id: 'otros',
          si: [],
          texto: '{nuevo.Nombre} se ha juntado con otro grupo y ya casi no coincidís. Te saluda al cruzaros, con cierta distancia.',
          efectos: [{ fin: true }],
        },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Te ofreces, os sentáis y acabáis siendo amigos',
      dado: { lugar: 'aula', hechos: { trimestre: 1 } },
      pasos: [
        { señal: 'clase.asistida', datos: { asignatura: 'estudios.lengua', tarde: 0 } },
        { sale: 'eventos.colegio.companero_nuevo.llegada', elige: 'ofrecerte' },
        { espero: { marca: 'sento_a_nuevo', programado: 'eventos.colegio.companero_nuevo.primera_semana' } },
        { pasan: { dias: 9 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio' } },
        { sale: 'eventos.colegio.companero_nuevo.primera_semana', variante: 'con_ayuda', elige: 'sentaros' },
        { pasan: { dias: 31 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'aula', relacion: { nuevo: { afinidad: 30 } } } },
        { sale: 'eventos.colegio.companero_nuevo.un_mes_despues', variante: 'amigos' },
        { espero: { hiloCerrado: true } },
      ],
    },
    {
      nombre: 'No te ofreces y se va con otros',
      dado: { lugar: 'aula', hechos: { trimestre: 1 } },
      pasos: [
        { señal: 'clase.asistida', datos: { asignatura: 'estudios.lengua', tarde: 0 } },
        { sale: 'eventos.colegio.companero_nuevo.llegada', elige: 'esperar' },
        { pasan: { dias: 9 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio' } },
        { sale: 'eventos.colegio.companero_nuevo.primera_semana', variante: 'esperaste', elige: 'seguir' },
        { pasan: { dias: 31 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'aula', relacion: { nuevo: { afinidad: 0 } } } },
        { sale: 'eventos.colegio.companero_nuevo.un_mes_despues', variante: 'otros' },
        { espero: { hiloCerrado: true } },
      ],
    },
  ],
});
