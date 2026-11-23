import { hilo } from '@ds/contracts';

/**
 * Un préstamo entre amigos (lote 2, tanda 2). Un amigo te pide unos euros. Si se los dejas, a veces los devuelve y a veces «se le olvida»; si se le olvida puedes reclamarlos con calma,
 * dejarlo correr o discutir. Usa `gen.dinero` tal cual (cifras de 2 a 5 €); no inventa ingresos ni compras (deuda técnica: la economía del personaje). Un hilo por amigo.
 * El azar de si lo devuelve es del suceso (variantes con `peso`). Nada duro. Cifras de partida.
 */
const DEVUELVE = '{amigo.Nombre} te para en el patio con la mano en el bolsillo. «Toma. Gracias por lo del otro día, me salvaste».';
const OLVIDO = '{amigo.Nombre} pasa a tu lado, te saluda con la mano y sigue. De lo que te debía, ni una palabra.';
const DEVOLUCION = [
  { si: [{ marca: 'presto_poco', de: 'amigo' }], entonces: [{ estado: 'gen.dinero', mas: 2 }], sino: [{ estado: 'gen.dinero', mas: 5 }] },
  { relacion: 'amigo', afinidad: 2, confianza: 2 },
  { fin: true },
] as const;
const CERCA = [{ alguna: [{ lugar: 'patio' }, { lugar: 'colegio' }] }] as const;

export default hilo({
  id: 'eventos.amigos.prestado',
  nombre: 'Un préstamo entre amigos',
  requiere: ['relaciones'],
  instancias: 'una_por_reparto',
  reparto: { amigo: { relacion: { afinidad: { min: 30 } }, presente: true } },
  sucesos: [
    {
      id: 'eventos.amigos.prestado.peticion',
      titulo: '¿Me dejas unos euros?',
      disparo: { al: 'lugares.llegada', prob: 0.03 },
      ejemploDeSeñal: { desde: 'aula', hasta: 'patio', minutos: 2 },
      cuando: [{ señal: 'hasta', es: 'patio' }, { stat: 'gen.dinero', min: 2 }, { hora: { desde: 10 * 60 + 30, hasta: 11 * 60 + 15 } }],
      repite: { espera: { dias: 120 }, porReparto: true },
      variantes: [
        { id: 'de_confianza', si: [{ marca: 'guardo_el_secreto', de: 'amigo' }], texto: '{amigo.Nombre} se acerca con cara de apuro. «Eres la persona en la que más confío, así que te lo pido a ti: ¿me dejas cinco euros? Te los devuelvo, lo sabes».' },
        { id: 'normal', si: [] },
      ],
      textos: [
        '{amigo.Nombre} se acerca con cara de apuro. «Oye, se me ha olvidado el dinero de la merienda y no me da la vida. ¿Me dejas cinco euros? Te los devuelvo, te lo juro».',
        '{amigo.Nombre} te saca a un lado, mirando al suelo. «Es que quiero comprar una cosa y me faltan unos euros… ¿me los adelantas? Esta semana te lo doy».',
      ],
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'no_puedo' },
      opciones: [
        {
          id: 'prestar',
          texto: 'Dejarle los 5 €',
          caracter: { sacrificio: 1, sociabilidad: 1 },
          minutos: 2,
          efectos: [{ estado: 'gen.dinero', mas: -5 }, { relacion: 'amigo', afinidad: 3 }, { programa: 'eventos.amigos.prestado.devolucion', en: { dias: [10, 20] } }],
          resultado: '«Eres un crack». Te da un apretón en el hombro y sale disparad{amigo:o|a} hacia la cantina.',
        },
        {
          id: 'menos',
          texto: 'Dejarle solo 2 €',
          caracter: { prudencia: 1 },
          minutos: 2,
          efectos: [{ estado: 'gen.dinero', mas: -2 }, { relacion: 'amigo', afinidad: 1 }, { marca: 'presto_poco', de: 'amigo', dura: { dias: 60 } }, { programa: 'eventos.amigos.prestado.devolucion', en: { dias: [10, 20] } }],
          resultado: '«Con eso me apaño. Gracias». Se nota que hubiera preferido más, pero no lo dice.',
        },
        {
          id: 'no_puedo',
          texto: 'Decirle que no puedes, que vas justo',
          caracter: { prudencia: 1, honestidad: -1 },
          minutos: 2,
          efectos: [{ relacion: 'amigo', afinidad: -1 }, { fin: true }],
          resultado: '«Vale, no pasa nada». Se va a pedírselo a otra persona.',
        },
      ],
    },
    {
      id: 'eventos.amigos.prestado.devolucion',
      titulo: 'Lo que te debe',
      disparo: { programado: true },
      cuando: [{ periodo: 'clase' }, ...CERCA, { presente: 'amigo' }],
      aguanta: { dias: 8 },
      variantes: [
        // Cuanto más cerca estáis, más fiable: con poca afinidad se le olvida siempre; con mucha, siempre lo devuelve; en medio, depende del día.
        { id: 'se_le_olvida', si: [{ relacion: 'amigo', afinidad: { max: 40 } }], texto: OLVIDO, efectos: [{ programa: 'eventos.amigos.prestado.reclamar', en: { dias: [7, 12] } }] },
        { id: 'devuelve', si: [{ relacion: 'amigo', afinidad: { min: 55 } }], texto: DEVUELVE, efectos: DEVOLUCION },
        { id: 'devuelve_a_veces', si: [], peso: 3, texto: DEVUELVE, efectos: DEVOLUCION },
        { id: 'olvida_a_veces', si: [], peso: 2, texto: OLVIDO, efectos: [{ programa: 'eventos.amigos.prestado.reclamar', en: { dias: [7, 12] } }] },
      ],
    },
    {
      id: 'eventos.amigos.prestado.reclamar',
      titulo: 'Lo que no te ha devuelto',
      disparo: { programado: true },
      cuando: [{ periodo: 'clase' }, ...CERCA, { presente: 'amigo' }],
      aguanta: { dias: 8 },
      texto: 'Hace semanas que {amigo.nombre} te debe dinero y ni lo ha mencionado. Lo ves reír con otros, con una bolsa de golosinas en la mano.',
      urgencia: 'ahora',
      plazo: { dias: 1, porDefecto: 'dejarlo' },
      opciones: [
        {
          id: 'reclamar',
          texto: 'Recordárselo con tranquilidad',
          caracter: { honestidad: 1, ambicion: 1 },
          minutos: 5,
          tirada: { con: 'gen.comunicacion', dificultad: 45 },
          exito: {
            efectos: [{ si: [{ marca: 'presto_poco', de: 'amigo' }], entonces: [{ estado: 'gen.dinero', mas: 2 }], sino: [{ estado: 'gen.dinero', mas: 5 }] }, { relacion: 'amigo', afinidad: 1 }, { fin: true }],
            resultado: '«¡Es verdad, perdona! Se me fue por completo». Te lo da en el acto, y se disculpa dos veces más.',
          },
          fallo: { efectos: [{ relacion: 'amigo', afinidad: -2 }, { fin: true }], resultado: '«Ya te lo daré, no seas pesad{yo:o|a}». Se te queda un mal sabor de boca.' },
        },
        {
          id: 'dejarlo',
          texto: 'Dejarlo correr: no merece la pena',
          caracter: { sacrificio: 1, optimismo: 1 },
          efectos: [{ relacion: 'amigo', afinidad: 2 }, { marca: 'perdono_una_deuda', de: 'amigo', dura: { dias: 180 } }, { fin: true }],
          resultado: 'Decides que es más importante la amistad que el dinero. Y a lo mejor, algún día, se acuerda.',
        },
        {
          id: 'discutir',
          texto: 'Reclamárselo delante de todos',
          caracter: { agresividad: 2, ambicion: 1 },
          minutos: 5,
          efectos: [{ si: [{ marca: 'presto_poco', de: 'amigo' }], entonces: [{ estado: 'gen.dinero', mas: 2 }], sino: [{ estado: 'gen.dinero', mas: 5 }] }, { relacion: 'amigo', afinidad: -6, confianza: -4 }, { estado: 'gen.estres', mas: 3 }, { fin: true }],
          resultado: '«¡Pues ahí tienes tu dinero!», dice por fin entre dientes, y te lo planta en la mano. Más de uno se ha dado la vuelta a mirar.',
        },
      ],
    },
  ],
  escenarios: [
    {
      nombre: 'Le dejas 5 € a quien está muy cerca de ti y te los devuelve',
      dado: { lugar: 'patio', hora: 10 * 60 + 45, stats: { 'gen.dinero': 20 }, relacion: { amigo: { afinidad: 60 } } },
      pasos: [
        { sale: 'eventos.amigos.prestado.peticion', elige: 'prestar' },
        { espero: { programado: 'eventos.amigos.prestado.devolucion' } },
        { pasan: { dias: 21 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.amigos.prestado.devolucion', variante: 'devuelve' },
        { espero: { hiloCerrado: true } },
      ],
    },
    {
      nombre: 'Se le olvida a quien no está tan cerca y lo dejas correr',
      dado: { lugar: 'patio', hora: 10 * 60 + 45, stats: { 'gen.dinero': 20 }, relacion: { amigo: { afinidad: 35 } } },
      pasos: [
        { sale: 'eventos.amigos.prestado.peticion', elige: 'prestar' },
        { pasan: { dias: 21 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.amigos.prestado.devolucion', variante: 'se_le_olvida' },
        { espero: { programado: 'eventos.amigos.prestado.reclamar' } },
        { pasan: { dias: 13 }, dado: { lugar: 'casa' } },
        { pasan: { dias: 0 }, dado: { lugar: 'patio', periodo: 'clase' } },
        { sale: 'eventos.amigos.prestado.reclamar', elige: 'dejarlo' },
        { espero: { hiloCerrado: true, marca: 'perdono_una_deuda' } },
      ],
    },
    {
      nombre: 'Sin dinero no se puede prestar: la petición ni sale',
      dado: { lugar: 'patio', hora: 10 * 60 + 45, stats: { 'gen.dinero': 1 } },
      pasos: [{ espero: { sale: false } }],
    },
  ],
});
