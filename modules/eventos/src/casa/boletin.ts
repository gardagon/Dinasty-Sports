import { hilo } from '@ds/contracts';

/**
 * Las notas de la evaluación (lote 2, tanda 4). Con la señal `estudios.boletin` (la media y si has aprobado) pasa por el colegio, por casa (lo que se habla según lo que traes y lo que hubo antes: promesas rotas,
 * mentiras) y, semanas después, lo que sale de aquello. Un hilo por trimestre (`repite: una_vez_por_curso`, tres señales al año: sale cada una). Camino con lo que elige el jugador. Cifras de partida, por calibrar.
 */
const EJEMPLO = { curso: 0, trimestre: 1, media: 6.8, aprobado: true };
const EN_CASA = [{ lugar: 'casa' }, { presente: 'tutor' }, { hora: { desde: 16 * 60, hasta: 22 * 60 } }] as const;

export default hilo({
  id: 'eventos.casa.boletin',
  nombre: 'Las notas de la evaluación',
  requiere: ['estudios', 'relaciones', 'familia'],
  reparto: { tutor: { tipo: 'progenitor', prefiere: 'mas_expectativas' } },
  sucesos: [
    {
      id: 'eventos.casa.boletin.se_entregan',
      titulo: 'Las notas de la evaluación',
      disparo: { al: 'estudios.boletin' },
      ejemploDeSeñal: EJEMPLO,
      cuando: [{ alguna: [{ lugar: 'colegio' }, { lugar: 'aula' }, { lugar: 'patio' }] }],
      aguanta: { dias: 3 },
      variantes: [
        { id: 'suspendes', si: [{ señal: 'aprobado', es: false }], texto: 'Te dan el sobre con las notas de la evaluación. Pesa lo mismo que siempre, pero hoy lo notas más: algo no ha ido como debía.' },
        { id: 'buenas', si: [{ señal: 'media', min: 7 }], texto: 'El sobre con las notas de la evaluación te quema en las manos, pero esta vez por lo bueno. Lo abres a medias, sin poder evitar sonreír.' },
        { id: 'normal', si: [], texto: 'Te dan el sobre con las notas de la evaluación. Dentro hay lo de siempre, ni mejor ni peor de lo que esperabas.' },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'guardar' },
      opciones: [
        { id: 'mirar', texto: 'Abrirlo ahora y mirarlo con calma', caracter: { prudencia: 1, honestidad: 1 }, minutos: 5, efectos: [{ estado: 'gen.estres', mas: 1 }, { programa: 'eventos.casa.boletin.en_casa', en: { dias: [0, 1] } }], resultado: 'Lo lees entero, asignatura por asignatura. Es mejor saberlo que imaginárselo.' },
        { id: 'guardar', texto: 'Guardarlo sin mirar hasta llegar a casa', caracter: { prudencia: 1 }, efectos: [{ programa: 'eventos.casa.boletin.en_casa', en: { dias: [0, 1] } }], resultado: 'Lo metes en la mochila y no lo piensas… o lo intentas, durante todo el camino.' },
        { id: 'enseñar', texto: 'Enseñárselo a un amigo', caracter: { sociabilidad: 1 }, minutos: 5, efectos: [{ estado: 'gen.estres', mas: -1 }, { programa: 'eventos.casa.boletin.en_casa', en: { dias: [0, 1] } }], resultado: 'Os las enseñáis el uno al otro, con una mano sobre la cara. Aunque salgan mal, hacerlo acompañado es otra cosa.' },
      ],
    },
    {
      id: 'eventos.casa.boletin.en_casa',
      titulo: 'Las notas, en casa',
      disparo: { programado: true },
      cuando: EN_CASA,
      aguanta: { dias: 3 },
      variantes: [
        { id: 'suspensos', si: [{ hecho: 'nota_media', max: 4.99 }], texto: '{tutor.Nombre} te espera en la cocina, con el sobre sobre la mesa. «Siéntate. Quiero que hablemos de esto sin gritar, ¿vale?»' },
        { id: 'con_promesa', si: [{ marca: 'rompio_una_promesa_en_casa' }], texto: '{tutor.Nombre} te mira un buen rato antes de hablar. «Las notas. Y lo que me prometiste. A ver cómo ha ido».' },
        { id: 'buenas', si: [{ hecho: 'nota_media', min: 7 }], texto: '{tutor.Nombre} aparece con las gafas en la frente y una sonrisa enorme. «Me han dicho que hoy había notas. ¿Dónde está ese boletín?»' },
        { id: 'normal', si: [], texto: '{tutor.Nombre} deja lo que estaba haciendo cuando ve el sobre en tus manos. «Venga, a ver esas notas».' },
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'enseñar' },
      opciones: [
        { id: 'enseñar', texto: 'Enseñárselas sin esperar a que pregunte', caracter: { honestidad: 2 }, minutos: 15, efectos: [{ relacion: 'tutor', afinidad: 2, confianza: 2 }, { si: [{ hecho: 'nota_media', max: 4.99 }], entonces: [{ familia: 'tutor', expectativas: 4 }], sino: [{ familia: 'tutor', apoyo: 2 }] }, { programa: 'eventos.casa.boletin.consecuencia', en: { dias: [14, 21] } }], resultado: 'Las lee con atención, sin interrumpir. Al final no dice nada durante un momento. Luego, lo que dice es justo.' },
        { id: 'esconder', texto: 'Decir que aún no las han dado', caracter: { honestidad: -2 }, minutos: 5, tirada: { con: 'gen.picardia', dificultad: 50 }, exito: { efectos: [{ estado: 'gen.estres', mas: 2 }, { programa: 'eventos.casa.boletin.consecuencia', en: { dias: [14, 21] } }], resultado: '«Ah, vale, ya me las enseñarás». Respiras. Por ahora.' }, fallo: { efectos: [{ relacion: 'tutor', afinidad: -5, confianza: -8 }, { marca: 'lo_pillaron_mintiendo_en_casa' }, { programa: 'eventos.casa.boletin.consecuencia', en: { dias: [14, 21] } }], resultado: '«Qué raro: el colegio me ha mandado un mensaje con las notas». Habías dicho una mentira que no aguantaba ni una tarde.' } },
        { id: 'perdon', texto: 'Pedirle perdón antes de que las vea', caracter: { honestidad: 1, prudencia: 1 }, minutos: 10, efectos: [{ relacion: 'tutor', afinidad: 1, confianza: 3 }, { programa: 'eventos.casa.boletin.consecuencia', en: { dias: [14, 21] } }], resultado: '«Todavía no sé de qué te estás disculpando». Se las pasas. Y la charla es más suave de lo que esperabas.' },
      ],
    },
    {
      id: 'eventos.casa.boletin.consecuencia',
      titulo: 'Lo que dejaron las notas',
      disparo: { programado: true },
      cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
      aguanta: { dias: 7 },
      variantes: [
        { id: 'premio', si: [{ hecho: 'nota_media', min: 7 }], texto: '{tutor.Nombre} deja un papel doblado en tu escritorio: una entrada para algo que querías. «No te lo diré más veces, pero estoy orgullos{tutor:o|a} de ti».', efectos: [{ estado: 'gen.motivacion', mas: 5 }, { relacion: 'tutor', afinidad: 3 }, { fin: true }] },
        { id: 'plan', si: [{ hecho: 'nota_media', max: 4.99 }], texto: 'Esta semana, {tutor.nombre} te ha propuesto un trato: una hora de estudio antes de cenar, juntos. Sin gritos, sin castigos. Lo hace por ti, y lo sabes.', efectos: [{ modificador: { tags: ['estudio'], eficiencia: 1.08, coste: 1, dias: 21, motivo: 'Una hora de estudio antes de cenar' } }, { fin: true }] },
        { id: 'normal', si: [], texto: 'Las notas van quedando atrás, como todo. En casa se vuelve a hablar de otras cosas.', efectos: [{ fin: true }] },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Buenas notas, se las enseñas y hay premio',
      dado: { lugar: 'colegio', hechos: { nota_media: 8 } },
      pasos: [
        { señal: 'estudios.boletin', datos: { ...EJEMPLO, media: 8 } },
        { sale: 'eventos.casa.boletin.se_entregan', variante: 'buenas', elige: 'guardar' },
        { pasan: { dias: 1 }, dado: { lugar: 'colegio' } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa', hora: 18 * 60 } },
        { sale: 'eventos.casa.boletin.en_casa', variante: 'buenas', elige: 'enseñar' },
        { pasan: { dias: 22 }, dado: { lugar: 'colegio' } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa' } },
        { sale: 'eventos.casa.boletin.consecuencia', variante: 'premio' },
        { espero: { hiloCerrado: true } },
      ],
    },
    {
      nombre: 'Suspendes, escondes el boletín y te pillan',
      dado: { lugar: 'colegio', hechos: { nota_media: 3.5 }, stats: { 'gen.picardia': 30 } },
      pasos: [
        { señal: 'estudios.boletin', datos: { ...EJEMPLO, media: 3.5, aprobado: false } },
        { sale: 'eventos.casa.boletin.se_entregan', variante: 'suspendes', elige: 'mirar' },
        { pasan: { dias: 1 }, dado: { lugar: 'colegio' } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa', hora: 18 * 60 } },
        { sale: 'eventos.casa.boletin.en_casa', variante: 'suspensos', elige: 'esconder', tirada: 'fallo' },
        { espero: { marca: 'lo_pillaron_mintiendo_en_casa' } },
        { pasan: { dias: 22 }, dado: { lugar: 'colegio' } },
        { pasan: { dias: 0 }, dado: { lugar: 'casa' } },
        { sale: 'eventos.casa.boletin.consecuencia', variante: 'plan' },
        { espero: { hiloCerrado: true } },
      ],
    },
  ],
});
