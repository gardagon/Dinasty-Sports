import { hilo } from '@ds/contracts';

/**
 * «Pulmones grandes» se nota tras semanas de entrenamiento de fondo. Si hay entrenador, se da cuenta él y unas semanas después propone un plan de fondo.
 */
export default hilo({
  id: 'eventos.perks.pulmones',
  nombre: 'Pulmones grandes',
  reparto: { entrenador: { rol: 'entrenador', delDeportePrincipal: true, opcional: true } },
  sucesos: [
    {
      id: 'eventos.perks.pulmones.revelacion',
      titulo: 'No te cansas como los demás',
      disparo: { cada: 'semana', prob: 0.25 },
      cuando: [{ perk: 'pulmones_grandes', revelado: false }, { contador: 'eventos.cuenta.fondo', min: 20 }],
      repite: 'nunca',
      variantes: [
        {
          id: 'con_entrenador',
          si: [{ papel: 'entrenador' }],
          texto: 'Al acabar la sesión, {entrenador.nombre} te para. «Llevo semanas fijándome: los demás llegan ahogados y tú ni resoplas. Eso no se entrena, eso se trae de casa».',
          efectos: [
            { revelaPerk: 'pulmones_grandes' },
            { relacion: 'entrenador', afinidad: 3 },
            { estado: 'gen.motivacion', mas: 6 },
            { diario: 'Has descubierto algo de ti: Pulmones grandes.', tipo: 'logro' },
            { programa: 'eventos.perks.pulmones.propuesta', en: { dias: [14, 42] } },
          ],
        },
        {
          id: 'sin_entrenador',
          si: [],
          texto: 'Hoy te has dado cuenta: cuando los demás ya no pueden más, a ti todavía te queda aire. Siempre ha sido así.',
          efectos: [{ revelaPerk: 'pulmones_grandes' }, { estado: 'gen.motivacion', mas: 4 }, { diario: 'Has descubierto algo de ti: Pulmones grandes.', tipo: 'logro' }, { fin: true }],
        },
      ],
    },
    {
      id: 'eventos.perks.pulmones.propuesta',
      titulo: 'Una propuesta de tu entrenador',
      disparo: { programado: true },
      cuando: [{ presente: 'entrenador' }],
      aguanta: { dias: 14 },
      texto: '{entrenador.Nombre} lo ha estado pensando. «Con ese fuelle, quiero que hagas más fondo que el resto. Va a doler».',
      urgencia: 'ahora',
      plazo: { dias: 2, porDefecto: 'seguir_igual' },
      opciones: [
        {
          id: 'aceptar',
          texto: 'Aceptar el trabajo extra',
          caracter: { sacrificio: 2, ambicion: 1 },
          efectos: [{ modificador: { tags: ['cardio'], eficiencia: 1.15, coste: 1.1, dias: 56, motivo: 'Plan de fondo de tu entrenador' } }, { relacion: 'entrenador', afinidad: 4 }, { fin: true }],
          resultado: '«Eso quería oír». Las próximas ocho semanas, el fondo te cunde más… y te cansa más.',
        },
        {
          id: 'seguir_igual',
          texto: 'Decir que prefieres seguir como hasta ahora',
          caracter: { sacrificio: -1 },
          efectos: [{ relacion: 'entrenador', afinidad: -1 }, { fin: true }],
          resultado: '{entrenador.Nombre} se encoge de hombros. «Tú verás».',
        },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Con entrenador: se da cuenta él y semanas después propone el plan',
      dado: { perks: { pulmones_grandes: 'latente' }, contadores: { 'eventos.cuenta.fondo': 20 }, presente: ['entrenador'] },
      pasos: [
        { sale: 'eventos.perks.pulmones.revelacion', variante: 'con_entrenador' },
        { espero: { programado: 'eventos.perks.pulmones.propuesta' } },
        { sale: 'eventos.perks.pulmones.propuesta', elige: 'aceptar' },
        { espero: { hiloCerrado: true } },
      ],
    },
    {
      nombre: 'Sin entrenador: se da cuenta solo y el hilo acaba',
      dado: { perks: { pulmones_grandes: 'latente' }, contadores: { 'eventos.cuenta.fondo': 20 }, sinPapel: ['entrenador'] },
      pasos: [{ sale: 'eventos.perks.pulmones.revelacion', variante: 'sin_entrenador' }, { espero: { hiloCerrado: true } }],
    },
    {
      nombre: 'Sin bastante fondo, todavía no',
      dado: { perks: { pulmones_grandes: 'latente' }, contadores: { 'eventos.cuenta.fondo': 5 } },
      pasos: [{ espero: { sale: false } }],
    },
  ],
});
