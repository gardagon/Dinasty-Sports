import { hilo } from '@ds/contracts';

/**
 * El cumpleaños de alguien con quien te llevas bien. Tres días antes te invita; puedes decir que sí (con regalo o sin él) o que no. Si dices que sí
 * y no apareces, queda un plantón con esa persona que dura meses y que otros eventos pueden leer. El hilo se abre una vez por persona.
 */
export default hilo({
  id: 'eventos.relaciones.cumple',
  nombre: 'El cumpleaños de un amigo',
  requiere: ['relaciones'],
  instancias: 'una_por_reparto',
  reparto: { cumple: { relacion: { afinidad: { min: 20 } }, cumpleEn: { dias: 3 }, edad: { max: 18 } } },
  sucesos: [
    {
      id: 'eventos.relaciones.cumple.invitacion',
      titulo: 'Una invitación',
      disparo: { cada: 'dia', prob: 1 },
      cuando: [{ no: { marca: 'planton', de: 'cumple' } }],
      repite: { espera: { dias: 300 }, porReparto: true },
      texto: '{cumple.Nombre} te busca. «El {cumple.diaDelCumple} es mi cumple. Hago una fiesta en casa por la tarde. ¿Te vienes?»',
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'no_ir' },
      opciones: [
        {
          id: 'ir_con_regalo',
          texto: 'Decir que sí y comprarle algo (10 €)',
          caracter: { sociabilidad: 2 },
          efectos: [
            { estado: 'gen.dinero', mas: -10 },
            { relacion: 'cumple', afinidad: 2 },
            { marca: 'lleva_regalo', de: 'cumple', dura: { dias: 5 } },
            { programa: 'eventos.relaciones.cumple.fiesta', en: { elCumpleDe: 'cumple' } },
          ],
          resultado: '«¡Genial!»',
        },
        {
          id: 'ir',
          texto: 'Decir que sí',
          caracter: { sociabilidad: 1 },
          efectos: [{ relacion: 'cumple', afinidad: 1 }, { programa: 'eventos.relaciones.cumple.fiesta', en: { elCumpleDe: 'cumple' } }],
          resultado: '«¡Genial!»',
        },
        {
          id: 'no_ir',
          texto: 'Decir que ese día no puedes',
          caracter: { sociabilidad: -1 },
          efectos: [{ relacion: 'cumple', afinidad: -2 }, { fin: true }],
          resultado: '«Ah… vale». Se le nota la decepción.',
        },
      ],
    },
    {
      id: 'eventos.relaciones.cumple.fiesta',
      titulo: 'La fiesta de {cumple.nombre}',
      disparo: { programado: true },
      cuando: [{ hora: { desde: 17 * 60, hasta: 20 * 60 } }],
      siSePierde: 'plantar',
      texto: 'Son más de las cinco: la fiesta de {cumple.nombre} ya ha empezado.',
      urgencia: 'pendiente',
      plazo: { hasta: { hora: 20 * 60 }, porDefecto: 'plantar' },
      opciones: [
        {
          id: 'ir',
          texto: 'Ir a la fiesta (2 horas)',
          minutos: 120,
          caracter: { sociabilidad: 1 },
          efectos: [
            { relacion: 'cumple', afinidad: 6, confianza: 3 },
            { si: [{ marca: 'lleva_regalo', de: 'cumple' }], entonces: [{ relacion: 'cumple', afinidad: 4 }] },
            { estado: 'gen.estres', mas: -8 },
            { estado: 'gen.motivacion', mas: 3 },
            { fin: true },
          ],
          resultado: 'Tarta, música y un rato largo de risas. {cumple.Nombre} no para de darte las gracias por venir.',
        },
        {
          id: 'plantar',
          texto: 'No ir',
          caracter: { sociabilidad: -2, honestidad: -1 },
          efectos: [
            { relacion: 'cumple', afinidad: -10, confianza: -8 },
            { marca: 'planton', de: 'cumple', dura: { dias: 180 } },
            { programa: 'eventos.relaciones.cumple.reproche', en: { dias: [2, 6] } },
          ],
          resultado: 'No has ido. No has avisado.',
        },
      ],
    },
    {
      id: 'eventos.relaciones.cumple.reproche',
      titulo: 'Te lo echa en cara',
      disparo: { programado: true },
      cuando: [{ presente: 'cumple' }],
      aguanta: { dias: 14 },
      texto: '{cumple.Nombre} te ve y se le cambia la cara. «Te estuve esperando. Dijiste que venías».',
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'nada' },
      opciones: [
        {
          id: 'disculparse',
          texto: 'Pedirle perdón de verdad',
          caracter: { honestidad: 2 },
          tirada: { con: 'gen.empatia', dificultad: 35 },
          exito: { efectos: [{ relacion: 'cumple', afinidad: 5 }, { quitaMarca: 'planton', de: 'cumple' }, { fin: true }], resultado: 'Tarda, pero acaba sonriendo. «Que no se repita».' },
          fallo: { efectos: [{ relacion: 'cumple', afinidad: 1 }, { fin: true }], resultado: '«Ya». No suena convencid{cumple:o|a}.' },
        },
        {
          id: 'excusa',
          texto: 'Inventarte una excusa',
          requiere: [{ stat: 'gen.picardia', min: 10 }],
          caracter: { honestidad: -2 },
          efectos: [{ entrena: 'gen.picardia', cantidad: 1 }, { relacion: 'cumple', afinidad: 2 }, { fin: true }],
          resultado: 'Te cree a medias.',
        },
        { id: 'nada', texto: 'Encogerte de hombros', efectos: [{ relacion: 'cumple', afinidad: -4 }, { fin: true }], resultado: 'Se da la vuelta y se va.' },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Dice que sí, lleva regalo y va',
      dado: { stats: { 'gen.dinero': 20 }, hora: 17 * 60 + 30 },
      pasos: [
        { sale: 'eventos.relaciones.cumple.invitacion', elige: 'ir_con_regalo' },
        { sale: 'eventos.relaciones.cumple.fiesta', elige: 'ir' },
        { espero: { hiloCerrado: true, sinMarca: 'planton' } },
      ],
    },
    {
      nombre: 'Sin dinero no hay regalo',
      dado: { stats: { 'gen.dinero': 0 } },
      pasos: [{ sale: 'eventos.relaciones.cumple.invitacion' }, { espero: { opcionNoDisponible: 'ir_con_regalo', opcionDisponible: 'ir' } }],
    },
    {
      nombre: 'Dice que sí, no va, y se lo echan en cara',
      dado: { hora: 17 * 60 + 30, presente: ['cumple'] },
      pasos: [
        { sale: 'eventos.relaciones.cumple.invitacion', elige: 'ir' },
        { sale: 'eventos.relaciones.cumple.fiesta', elige: 'plantar' },
        { espero: { marca: 'planton', programado: 'eventos.relaciones.cumple.reproche' } },
        { sale: 'eventos.relaciones.cumple.reproche', elige: 'disculparse', tirada: 'exito' },
        { espero: { hiloCerrado: true, sinMarca: 'planton' } },
      ],
    },
  ],
});
