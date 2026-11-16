import { hilo } from '@ds/contracts';

/**
 * Las faltas llegan a casa. El colegio avisa a las 12 faltas del trimestre (señal `clase.faltas_excesivas`, de `estudios`); esa tarde, en casa,
 * uno de los padres saca el tema. Tres semanas después lo comprueba. Y una mentira se queda guardada para otros hilos.
 * Cifras de partida, por calibrar (`docs/DECISIONES.md`, 16/11/2026).
 */
const CASTIGO = 'Estás castigad{yo:o|a} sin salir';

export default hilo({
  id: 'eventos.familia.faltas',
  nombre: 'Las faltas llegan a casa',
  requiere: ['estudios', 'familia'],
  reparto: { tutor: { tipo: 'progenitor', prefiere: 'mas_expectativas' } },
  sucesos: [
    {
      id: 'eventos.familia.faltas.charla',
      titulo: 'Han llamado del colegio',
      disparo: { al: 'clase.faltas_excesivas' },
      ejemploDeSeñal: { faltas: 12, curso: 0, trimestre: 1 },
      cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
      aguanta: { dias: 3 },
      repite: 'una_vez_por_curso',
      texto: '{tutor.Nombre} te espera en el salón, muy seri{tutor:o|a}. «Han llamado del colegio. Dicen que llevas {señal.faltas} faltas este trimestre. ¿Me lo explicas?»',
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'callar' },
      opciones: [
        {
          id: 'prometer',
          texto: 'Reconocerlo y prometer que no volverás a faltar',
          caracter: { honestidad: 2, disciplina: 1 },
          minutos: 10,
          efectos: [
            { relacion: 'tutor', confianza: 2 },
            { estado: 'gen.estres', mas: 4 },
            { marca: 'prometio_no_faltar', dura: { dias: 30 } },
            { recuerda: { faltas_al_hablar: 'faltas' } },
            { programa: 'eventos.familia.faltas.revision', en: { dias: 21 } },
          ],
          resultado: '{tutor.Nombre} suspira. «Está bien. Pero voy a estar pendiente».',
        },
        {
          id: 'mentir',
          texto: 'Decir que es un error del colegio',
          requiere: [{ stat: 'gen.picardia', min: 12 }],
          caracter: { honestidad: -3 },
          minutos: 5,
          tirada: { con: 'gen.picardia', dificultad: 45 },
          exito: {
            efectos: [{ entrena: 'gen.picardia', cantidad: 2 }, { marca: 'mintio_a_sus_padres' }, { programa: 'eventos.familia.faltas.descubierto', en: { dias: [20, 45] } }],
            resultado: '{tutor.Nombre} duda, pero te cree. «Llamaré mañana para aclararlo».',
          },
          fallo: {
            efectos: [
              { entrena: 'gen.picardia', cantidad: 1 },
              { relacion: 'tutor', afinidad: -6, confianza: -10 },
              { familia: 'tutor', apoyo: -3 },
              { estado: 'gen.estres', mas: 10 },
              { restriccion: { tags: ['ocio'], dias: 7, motivo: CASTIGO } },
              { marca: 'lo_pillaron_mintiendo_en_casa' },
              { diario: 'Te han pillado mintiendo sobre las faltas: una semana de castigo.', tipo: 'aviso' },
              { fin: true },
            ],
            resultado: '«¿Me tomas por tont{tutor:o|a}? He hablado con tu tutor». Una semana sin salir.',
          },
        },
        {
          id: 'discutir',
          texto: 'Contestar que es tu vida',
          caracter: { disciplina: -2, agresividad: 2 },
          minutos: 10,
          efectos: [
            { relacion: 'tutor', afinidad: -8 },
            { familia: 'tutor', apoyo: -2 },
            { entrena: 'gen.autoridad', cantidad: 1 },
            { estado: 'gen.estres', mas: 8 },
            { restriccion: { tags: ['ocio'], dias: 7, motivo: CASTIGO } },
            { recuerda: { faltas_al_hablar: 'faltas' } },
            { programa: 'eventos.familia.faltas.revision', en: { dias: 21 } },
          ],
          resultado: 'La discusión acaba a gritos. Una semana sin salir.',
        },
        {
          id: 'callar',
          texto: 'Aguantar el chaparrón sin decir nada',
          minutos: 10,
          efectos: [
            { relacion: 'tutor', afinidad: -2 },
            { estado: 'gen.motivacion', mas: -3 },
            { recuerda: { faltas_al_hablar: 'faltas' } },
            { programa: 'eventos.familia.faltas.revision', en: { dias: 21 } },
          ],
          resultado: '{tutor.Nombre} habla un buen rato. Tú miras al suelo.',
        },
      ],
    },
    {
      id: 'eventos.familia.faltas.revision',
      titulo: 'Tres semanas después',
      disparo: { programado: true },
      cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
      aguanta: { dias: 5 },
      variantes: [
        {
          id: 'cumplio',
          si: [{ hecho: 'faltas', max: 1, sobreRecuerdo: 'faltas_al_hablar' }],
          texto: '{tutor.Nombre} deja el móvil. «He hablado con tu tutor: no has vuelto a faltar. Así sí».',
          efectos: [
            { relacion: 'tutor', afinidad: 4, confianza: 5 },
            { familia: 'tutor', apoyo: 2 },
            { estado: 'gen.motivacion', mas: 4 },
            { si: [{ marca: 'prometio_no_faltar' }], entonces: [{ caracter: { disciplina: 1 } }] },
            { fin: true },
          ],
        },
        {
          id: 'no_cumplio',
          si: [],
          texto: '«Has vuelto a faltar». {tutor.Nombre} no levanta la voz, y casi es peor.',
          efectos: [
            { relacion: 'tutor', afinidad: -5, confianza: -8 },
            { familia: 'tutor', apoyo: -3, expectativas: -2 },
            { restriccion: { tags: ['ocio'], dias: 14, motivo: CASTIGO } },
            { si: [{ marca: 'prometio_no_faltar' }], entonces: [{ marca: 'rompio_una_promesa_en_casa' }] },
            { fin: true },
          ],
        },
      ],
    },
    {
      id: 'eventos.familia.faltas.descubierto',
      titulo: 'La mentira sale a la luz',
      disparo: { programado: true },
      cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
      aguanta: { dias: 10 },
      texto: '{tutor.Nombre} ha estado en la reunión de padres. «No era un error del colegio. Me mentiste a la cara».',
      efectos: [
        { relacion: 'tutor', afinidad: -10, confianza: -20 },
        { familia: 'tutor', apoyo: -5 },
        { restriccion: { tags: ['ocio'], dias: 14, motivo: CASTIGO } },
        { marca: 'lo_pillaron_mintiendo_en_casa' },
        { fin: true },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Promete y cumple',
      dado: { lugar: 'casa', presente: ['tutor'], hechos: { faltas: 12 } },
      pasos: [
        { señal: 'clase.faltas_excesivas', datos: { faltas: 12, curso: 0, trimestre: 1 } },
        { sale: 'eventos.familia.faltas.charla', elige: 'prometer' },
        { espero: { marca: 'prometio_no_faltar', programado: 'eventos.familia.faltas.revision' } },
        { pasan: { dias: 21 } },
        { sale: 'eventos.familia.faltas.revision', variante: 'cumplio' },
        { espero: { hiloCerrado: true, sinMarca: 'rompio_una_promesa_en_casa' } },
      ],
    },
    {
      nombre: 'Promete y vuelve a faltar',
      dado: { lugar: 'casa', presente: ['tutor'], hechos: { faltas: 12 } },
      pasos: [
        { señal: 'clase.faltas_excesivas', datos: { faltas: 12, curso: 0, trimestre: 1 } },
        { sale: 'eventos.familia.faltas.charla', elige: 'prometer' },
        { pasan: { dias: 21 }, dado: { hechos: { faltas: 17 } } },
        { sale: 'eventos.familia.faltas.revision', variante: 'no_cumplio' },
        { espero: { hiloCerrado: true, marca: 'rompio_una_promesa_en_casa' } },
      ],
    },
    {
      nombre: 'Miente, cuela y semanas después se descubre',
      dado: { lugar: 'casa', presente: ['tutor'], hechos: { faltas: 12 }, stats: { 'gen.picardia': 30 } },
      pasos: [
        { señal: 'clase.faltas_excesivas', datos: { faltas: 12, curso: 0, trimestre: 1 } },
        { sale: 'eventos.familia.faltas.charla', elige: 'mentir', tirada: 'exito' },
        { espero: { marca: 'mintio_a_sus_padres', programado: 'eventos.familia.faltas.descubierto' } },
        { pasan: { dias: 45 } },
        { sale: 'eventos.familia.faltas.descubierto' },
        { espero: { hiloCerrado: true, marca: 'lo_pillaron_mintiendo_en_casa' } },
      ],
    },
    {
      nombre: 'Miente y le pillan en el momento',
      dado: { lugar: 'casa', presente: ['tutor'], hechos: { faltas: 12 }, stats: { 'gen.picardia': 30 } },
      pasos: [
        { señal: 'clase.faltas_excesivas', datos: { faltas: 12, curso: 0, trimestre: 1 } },
        { sale: 'eventos.familia.faltas.charla', elige: 'mentir', tirada: 'fallo' },
        { espero: { hiloCerrado: true, marca: 'lo_pillaron_mintiendo_en_casa' } },
      ],
    },
    {
      nombre: 'Sin picardía no se puede mentir; si no dice nada, vale la opción por defecto',
      dado: { lugar: 'casa', presente: ['tutor'], hechos: { faltas: 12 }, stats: { 'gen.picardia': 5 } },
      pasos: [
        { señal: 'clase.faltas_excesivas', datos: { faltas: 12, curso: 0, trimestre: 1 } },
        { espero: { opcionNoDisponible: 'mentir', opcionDisponible: 'prometer' } },
        { pasan: { dias: 2 } },
        { espero: { programado: 'eventos.familia.faltas.revision' } },
      ],
    },
  ],
});
