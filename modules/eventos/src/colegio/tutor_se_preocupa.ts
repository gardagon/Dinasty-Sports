import { hilo } from '@ds/contracts';

/**
 * El profesor se preocupa (lote 2, tanda 2). Si la nota media baja de 5, el profesor de Lengua o de Matemáticas (el de la clase en que pasa, sin tutor fijo) te pide que te quedes
 * un momento. Puedes abrirte, poner excusas o aceptar un plan de repaso; un mes después se ve si la nota ha subido. Los caminos dependen de lo que elijas, y nada de esto es duro. Cifras de partida.
 */
const LENGUA_O_MATES = { alguna: [{ señal: 'asignatura', es: 'estudios.lengua' }, { señal: 'asignatura', es: 'estudios.matematicas' }] } as const;

export default hilo({
  id: 'eventos.colegio.tutor_se_preocupa',
  nombre: 'El profesor se preocupa',
  requiere: ['estudios', 'relaciones'],
  reparto: { profesor: { asignaturaDeLaSeñal: 'asignatura' } },
  sucesos: [
    {
      id: 'eventos.colegio.tutor_se_preocupa.llamada',
      titulo: '«Quédate un momento»',
      disparo: { al: 'clase.asistida' },
      ejemploDeSeñal: { asignatura: 'estudios.lengua', tarde: 0 },
      cuando: [LENGUA_O_MATES, { hecho: 'nota_media', max: 5 }, { periodo: 'clase' }],
      repite: { espera: { dias: 120 } },
      durante: false,
      textos: [
        'Suena el timbre y {profesor.nombre} te hace un gesto con la mano. «Tú, quédate un momento, por favor».',
        'Cuando la clase se vacía, {profesor.nombre} guarda los exámenes en la cartera y te mira por encima de las gafas. «¿Te puedo decir una cosa sin que te enfades?»',
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'excusas' },
      opciones: [
        {
          id: 'abrirte',
          texto: 'Decirle que te está costando',
          caracter: { honestidad: 2, sociabilidad: 1 },
          minutos: 5,
          efectos: [{ relacion: 'profesor', afinidad: 2, confianza: 3 }, { entrena: 'gen.comunicacion', cantidad: 0.4 }, { recuerda: { nota_al_hablar: 'nota_media' } }, { programa: 'eventos.colegio.tutor_se_preocupa.plan', en: { dias: [2, 4] } }],
          resultado: '«Gracias por decírmelo. Sé que puedes más que esto, y eso ya es un buen punto de partida».',
        },
        {
          id: 'excusas',
          texto: 'Poner excusas: que fue un mal día',
          caracter: { honestidad: -1 },
          minutos: 5,
          tirada: { con: 'gen.picardia', dificultad: 45 },
          exito: { efectos: [{ recuerda: { nota_al_hablar: 'nota_media' } }, { programa: 'eventos.colegio.tutor_se_preocupa.plan', en: { dias: [2, 4] } }], resultado: '{profesor.Nombre} asiente despacio. «Quizá. Pero lo hablaremos otra vez si se repite».' },
          fallo: { efectos: [{ relacion: 'profesor', afinidad: -2 }, { recuerda: { nota_al_hablar: 'nota_media' } }, { programa: 'eventos.colegio.tutor_se_preocupa.plan', en: { dias: [2, 4] } }], resultado: '«Un mal día, vale. ¿Y los tres anteriores?». No hay mucho que decir.' },
        },
        {
          id: 'callar',
          texto: 'No decir nada y mirar al suelo',
          caracter: { sociabilidad: -1 },
          minutos: 5,
          efectos: [{ estado: 'gen.estres', mas: 2 }, { recuerda: { nota_al_hablar: 'nota_media' } }, { programa: 'eventos.colegio.tutor_se_preocupa.plan', en: { dias: [2, 4] } }],
          resultado: 'El silencio se alarga hasta que {profesor.nombre} suspira. «Piénsatelo, y si quieres hablar, aquí estoy».',
        },
      ],
    },
    {
      id: 'eventos.colegio.tutor_se_preocupa.plan',
      titulo: 'Un plan de repaso',
      disparo: { programado: true },
      cuando: [{ lugar: 'aula' }, { periodo: 'clase' }],
      aguanta: { dias: 7 },
      texto: '{profesor.Nombre} te para a la salida de clase con un papel en la mano. «He pensado en algo: un repaso corto cada semana, en el recreo. Nada del otro mundo. ¿Qué te parece?»',
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'no' },
      opciones: [
        {
          id: 'si',
          texto: 'Aceptar el plan',
          caracter: { disciplina: 2, ambicion: 1 },
          minutos: 5,
          efectos: [
            { relacion: 'profesor', afinidad: 2 },
            { modificador: { tags: ['estudio'], eficiencia: 1.1, coste: 1, dias: 28, motivo: 'Plan de repaso con tu profesor' } },
            { estado: 'gen.estres', mas: 1 },
            { programa: 'eventos.colegio.tutor_se_preocupa.seguimiento', en: { dias: 28 } },
          ],
          resultado: '«Empezamos el martes. Tráete lo que no entiendas».',
        },
        {
          id: 'mitad',
          texto: 'Aceptar la mitad: un recreo cada dos semanas',
          caracter: { prudencia: 1 },
          minutos: 5,
          efectos: [{ modificador: { tags: ['estudio'], eficiencia: 1.05, coste: 1, dias: 28, motivo: 'Repasos de vez en cuando con tu profesor' } }, { programa: 'eventos.colegio.tutor_se_preocupa.seguimiento', en: { dias: 28 } }],
          resultado: '«Menos es peor que más, pero es mejor que nada. Lo dejamos así».',
        },
        {
          id: 'no',
          texto: 'Decir que prefieres arreglártelo solo',
          caracter: { disciplina: -1, ambicion: -1 },
          efectos: [{ relacion: 'profesor', afinidad: -2 }, { programa: 'eventos.colegio.tutor_se_preocupa.seguimiento', en: { dias: 28 } }],
          resultado: '«Como quieras. La oferta no caduca, pero mi paciencia, un poco sí».',
        },
      ],
    },
    {
      id: 'eventos.colegio.tutor_se_preocupa.seguimiento',
      titulo: 'Cómo van esas notas',
      disparo: { programado: true },
      cuando: [{ lugar: 'aula' }, { periodo: 'clase' }],
      aguanta: { dias: 10 },
      variantes: [
        {
          id: 'subio',
          si: [{ hecho: 'nota_media', min: 1, sobreRecuerdo: 'nota_al_hablar' }],
          texto: '{profesor.Nombre} te devuelve el último control con una sonrisa que no intenta disimular. «Mira esto. Se nota el esfuerzo. Así sí».',
          efectos: [{ relacion: 'profesor', afinidad: 3 }, { estado: 'gen.motivacion', mas: 4 }, { marca: 'levanto_la_nota', dura: { dias: 120 } }, { fin: true }],
        },
        {
          id: 'peor',
          si: [{ hecho: 'nota_media', max: -0.5, sobreRecuerdo: 'nota_al_hablar' }],
          texto: '{profesor.Nombre} deja tu control sobre la mesa y tarda en hablar. «Ha bajado un poco, y no te lo digo para agobiarte. Si quieres que volvamos a lo del repaso, mi oferta sigue en pie».',
          efectos: [{ relacion: 'profesor', confianza: 1 }, { estado: 'gen.estres', mas: 2 }, { fin: true }],
        },
        {
          id: 'igual',
          si: [],
          texto: '{profesor.Nombre} deja tu control sobre la mesa. «No ha cambiado mucho, y no pasa nada: esto va despacio. Pero no lo dejes».',
          efectos: [{ relacion: 'profesor', confianza: 1 }, { estado: 'gen.estres', mas: 1 }, { fin: true }],
        },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Te abres, aceptas el plan y la nota sube',
      dado: { lugar: 'aula', hechos: { nota_media: 4 } },
      pasos: [
        { señal: 'clase.asistida', datos: { asignatura: 'estudios.lengua', tarde: 0 } },
        { sale: 'eventos.colegio.tutor_se_preocupa.llamada', elige: 'abrirte' },
        { pasan: { dias: 5 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'aula' } },
        { sale: 'eventos.colegio.tutor_se_preocupa.plan', elige: 'si' },
        { pasan: { dias: 29 }, dado: { lugar: 'casa', hechos: { nota_media: 5.6 } } },
        { pasan: { dias: 0 }, dado: { lugar: 'aula' } },
        { sale: 'eventos.colegio.tutor_se_preocupa.seguimiento', variante: 'subio' },
        { espero: { hiloCerrado: true, marca: 'levanto_la_nota' } },
      ],
    },
    {
      nombre: 'Callas, rechazas el plan y todo sigue igual',
      dado: { lugar: 'aula', hechos: { nota_media: 4 } },
      pasos: [
        { señal: 'clase.asistida', datos: { asignatura: 'estudios.matematicas', tarde: 0 } },
        { sale: 'eventos.colegio.tutor_se_preocupa.llamada', elige: 'callar' },
        { pasan: { dias: 5 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'aula' } },
        { sale: 'eventos.colegio.tutor_se_preocupa.plan', elige: 'no' },
        { pasan: { dias: 29 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'aula' } },
        { sale: 'eventos.colegio.tutor_se_preocupa.seguimiento', variante: 'igual' },
        { espero: { hiloCerrado: true } },
      ],
    },
  ],
});
