import { hilo } from '@ds/contracts';

/**
 * Los exámenes (lote 2, tanda 4). Tres pasos con las señales nuevas de `estudios`: la víspera (`estudios.examen_aviso`), el día en que lo haces (`estudios.examen_hecho`: la nota decide qué versión) y,
 * una semana después, cómo se comentan las notas en el patio. Un hilo por semana de exámenes (`instancias: 'una'` y espera de 5 días: sin eso salía un hilo por cada examen, hasta 61 al año). Repasar de verdad sigue siendo cosa de las acciones de estudiar: aquí se decide con qué ánimo
 * se afronta (y un modificador de estudio de un día si te pones a repasar). La nota que se comenta es la de las marcas que deja el segundo paso. Cifras de partida, por calibrar.
 */
const EJEMPLO_AVISO = { asignatura: 'estudios.matematicas', nombre: 'Matemáticas', tipo: 'parcial1', curso: 0, trimestre: 1, totalMañana: 1 };
const EJEMPLO_HECHO = { asignatura: 'estudios.matematicas', nombre: 'Matemáticas', tipo: 'parcial1', nota: 6.5, presentado: true, curso: 0, trimestre: 1 };
const EN_CASA_POR_LA_TARDE = [{ lugar: 'casa' }, { hora: { desde: 15 * 60, hasta: 22 * 60 + 30 } }] as const;

export default hilo({
  id: 'eventos.colegio.examen',
  nombre: 'Un examen',
  requiere: ['estudios', 'relaciones'],
  instancias: 'una',
  reparto: { profesor: { asignaturaDeLaSeñal: 'asignatura' }, quien: { rol: 'companero', conocido: true } },
  sucesos: [
    {
      id: 'eventos.colegio.examen.aviso',
      titulo: 'Mañana, examen de {señal.nombre}',
      disparo: { al: 'estudios.examen_aviso' },
      ejemploDeSeñal: EJEMPLO_AVISO,
      cuando: EN_CASA_POR_LA_TARDE,
      aguanta: { dias: 1 },
      repite: { espera: { dias: 5 } },
      textos: [
        '«Mañana, el examen de {señal.nombre}», recordó {profesor.nombre} al salir. En la mochila, el libro sigue cerrado y la tarde se va acortando.',
        'En la puerta de la nevera hay una nota con letra tuya: «Mañana, {señal.nombre}». Llevas toda la tarde sin mirarla de frente.',
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'repaso' },
      opciones: [
        {
          id: 'noche',
          texto: 'Quedarte repasando hasta tarde',
          caracter: { disciplina: 2, sacrificio: 1 },
          minutos: 60,
          efectos: [{ estado: 'gen.energia', mas: -4 }, { estado: 'gen.estres', mas: 3 }, { entrena: 'gen.concentracion', cantidad: 0.4 }, { modificador: { tags: ['estudio'], eficiencia: 1.15, coste: 1, dias: 1, motivo: 'Repasas con el examen encima' } }, { marca: 'repaso_a_fondo', dura: { dias: 3 } }],
          resultado: 'A las once tienes los apuntes subrayados y la cabeza hecha un lío. Pero algo se te ha quedado.',
        },
        {
          id: 'repaso',
          texto: 'Repasar un rato y acostarte pronto',
          caracter: { prudencia: 1 },
          minutos: 30,
          efectos: [{ estado: 'gen.estres', mas: 1 }, { estado: 'gen.energia', mas: 1 }],
          resultado: 'Lees el resumen una vez, cierras el libro y apagas la luz a una hora decente. Mañana se verá.',
        },
        {
          id: 'pasar',
          texto: 'Dejarlo estar: sea lo que sea',
          caracter: { disciplina: -1, optimismo: 1 },
          efectos: [{ estado: 'gen.estres', mas: -3 }, { marca: 'no_estudio_para_el_examen', dura: { dias: 3 } }],
          resultado: 'Pones música, te tumbas en el sofá y te dices que ya has hecho lo que podías. No es del todo verdad, pero se agradece.',
        },
      ],
    },
    {
      id: 'eventos.colegio.examen.hecho',
      titulo: 'El examen de {señal.nombre}',
      disparo: { al: 'estudios.examen_hecho' },
      ejemploDeSeñal: EJEMPLO_HECHO,
      aguanta: { dias: 1 },
      repite: { espera: { dias: 5 } },
      variantes: [
        {
          id: 'no_presentado',
          si: [{ señal: 'presentado', es: false }],
          texto: 'Hoy había examen de {señal.nombre} y no estabas. Ya te lo apuntarán para otro día, pero se te queda dentro una sensación incómoda.',
          efectos: [{ estado: 'gen.estres', mas: 2 }, { marca: 'mal_en_examen', dura: { dias: 12 } }, { programa: 'eventos.colegio.examen.comentan', en: { dias: [6, 9] } }],
        },
        {
          id: 'bien_tras_repasar',
          si: [{ señal: 'nota', min: 7 }, { marca: 'repaso_a_fondo' }],
          texto: 'La nota del examen de {señal.nombre} llega, y es de las que justifican la noche en vela. Te quedas un momento mirándola: sí, ha merecido la pena.',
          efectos: [{ estado: 'gen.motivacion', mas: 5 }, { estado: 'gen.estres', mas: -3 }, { marca: 'bien_en_examen', dura: { dias: 12 } }, { programa: 'eventos.colegio.examen.comentan', en: { dias: [6, 9] } }],
        },
        {
          id: 'mal_sin_repasar',
          si: [{ señal: 'nota', max: 4.9 }, { marca: 'no_estudio_para_el_examen' }],
          texto: 'La nota del examen de {señal.nombre} no te sorprende, y eso es lo peor. Sabías perfectamente cómo iba a salir, y la tarde del sofá ahora pesa un poco más.',
          efectos: [{ estado: 'gen.motivacion', mas: -2 }, { estado: 'gen.estres', mas: 2 }, { marca: 'mal_en_examen', dura: { dias: 12 } }, { programa: 'eventos.colegio.examen.comentan', en: { dias: [6, 9] } }],
        },
        {
          id: 'bien',
          si: [{ señal: 'nota', min: 7 }],
          texto: 'La nota del examen de {señal.nombre} llega y es mejor de lo que esperabas. Te quedas un momento mirándola, por si acaso hay algún error.',
          efectos: [{ estado: 'gen.motivacion', mas: 4 }, { estado: 'gen.estres', mas: -3 }, { marca: 'bien_en_examen', dura: { dias: 12 } }, { programa: 'eventos.colegio.examen.comentan', en: { dias: [6, 9] } }],
        },
        {
          id: 'regular',
          si: [{ señal: 'nota', min: 5 }],
          texto: 'La nota del examen de {señal.nombre} es de las de siempre: ni para tirar cohetes ni para llorar. Te encoges de hombros, aunque por dentro hubieras querido algo más.',
          efectos: [{ estado: 'gen.motivacion', mas: 1 }, { programa: 'eventos.colegio.examen.comentan', en: { dias: [6, 9] } }],
        },
        {
          id: 'mal',
          si: [],
          texto: 'La nota del examen de {señal.nombre} te cae como un cubo de agua fría. Repasas mentalmente qué hiciste mal, y son demasiadas cosas.',
          efectos: [{ estado: 'gen.motivacion', mas: -3 }, { estado: 'gen.estres', mas: 3 }, { marca: 'mal_en_examen', dura: { dias: 12 } }, { programa: 'eventos.colegio.examen.comentan', en: { dias: [6, 9] } }],
        },
      ],
    },
    {
      id: 'eventos.colegio.examen.comentan',
      titulo: 'Las notas, en el patio',
      disparo: { programado: true },
      cuando: [{ lugar: 'patio' }, { presente: 'quien' }],
      aguanta: { dias: 6 },
      variantes: [
        { id: 'presumir', si: [{ marca: 'bien_en_examen' }], texto: '{quien.Nombre} te pregunta por la nota de {profesor.nombre}, medio en broma, medio en serio. «Venga, di la verdad: ¿has sacado más que yo?»' },
        { id: 'preocupado', si: [{ marca: 'mal_en_examen' }], texto: '{quien.Nombre} te pregunta por la nota del examen, y se lleva una mano a la boca al ver tu cara. «Vaya. ¿Quieres hablar de ello, o prefieres que cambie de tema?»' },
        { id: 'normal', si: [], texto: '{quien.Nombre} saca el tema de las notas del examen, como todo el mundo estos días. «¿Cómo te ha ido a ti? A mí, regular».' },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'contar' },
      opciones: [
        { id: 'contar', texto: 'Contárselo tal cual', caracter: { honestidad: 1 }, minutos: 5, efectos: [{ relacion: 'quien', afinidad: 1.5, confianza: 1 }, { fin: true }], resultado: 'Lo cuentas sin adornos. «Pues es lo que hay», dice {quien.nombre}, y es un alivio que lo diga así.' },
        { id: 'presumir', texto: 'Decir que has sacado mucho más de lo que sacaste', caracter: { honestidad: -1, ambicion: 1 }, tirada: { con: 'gen.picardia', dificultad: 45 }, exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 0.3 }, { fin: true }], resultado: '«¡Qué crack!». Cuela, esta vez.' }, fallo: { efectos: [{ relacion: 'quien', afinidad: -2 }, { fin: true }], resultado: 'Alguien cerca lo oye y se ríe. «Ya, ya… ¿y yo soy la reina de Saba?». Mala idea.' } },
        { id: 'cambiar', texto: 'Cambiar de tema', caracter: { prudencia: 1 }, efectos: [{ fin: true }], resultado: 'Hablas de otra cosa y {quien.nombre} te sigue sin preguntar más.' },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Repasas, te sale bien y lo cuentas',
      dado: { lugar: 'casa', hora: 18 * 60 },
      pasos: [
        { señal: 'estudios.examen_aviso', datos: EJEMPLO_AVISO },
        { sale: 'eventos.colegio.examen.aviso', elige: 'noche' },
        { espero: { marca: 'repaso_a_fondo' } },
        { señal: 'estudios.examen_hecho', datos: { ...EJEMPLO_HECHO, nota: 8 } },
        { sale: 'eventos.colegio.examen.hecho', variante: 'bien_tras_repasar' },
        { espero: { marca: 'bien_en_examen', programado: 'eventos.colegio.examen.comentan' } },
        { pasan: { dias: 10 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio' } },
        { sale: 'eventos.colegio.examen.comentan', variante: 'presumir', elige: 'contar' },
        { espero: { hiloCerrado: true } },
      ],
    },
    {
      nombre: 'No te presentas y cambias de tema',
      dado: { lugar: 'casa', hora: 18 * 60 },
      pasos: [
        { señal: 'estudios.examen_aviso', datos: EJEMPLO_AVISO },
        { sale: 'eventos.colegio.examen.aviso', elige: 'pasar' },
        { señal: 'estudios.examen_hecho', datos: { ...EJEMPLO_HECHO, nota: 0, presentado: false } },
        { sale: 'eventos.colegio.examen.hecho', variante: 'no_presentado' },
        { pasan: { dias: 10 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio' } },
        { sale: 'eventos.colegio.examen.comentan', variante: 'preocupado', elige: 'cambiar' },
        { espero: { hiloCerrado: true } },
      ],
    },
  ],
});
