import { suceso } from '@ds/contracts';

/**
 * Lote 2, tanda 1: el parque en fin de semana, con un amigo de verdad (estado `amigo` o `mejor_amigo`: si no hay ninguno presente, no sale). Es `menor`. Los amigos
 * van al parque el 60 % de los días libres (`ANEXO_HORARIOS_PNJ.md`). Cifras de partida, por calibrar. Se prueba con `pruebas` (un sábado).
 */
const EJEMPLO = { desde: 'avenida_parque', hasta: 'parque', minutos: 1 };
const AMIGO = { amigo: { relacion: { estado: ['amigo', 'mejor_amigo'] }, presente: true } } as const;

export default suceso({
  id: 'eventos.amigos.parque_partido',
  titulo: 'Falta uno',
  categoria: 'menor',
  familia: 'parque',
  requiere: ['lugares', 'relaciones'],
  disparo: { al: 'lugares.llegada', prob: 0.25 },
  ejemploDeSeñal: EJEMPLO,
  cuando: [{ señal: 'hasta', es: 'parque' }, { diaDeLaSemana: [5, 6] }, { hora: { desde: 10 * 60, hasta: 19 * 60 } }],
  repite: { espera: { dias: 14 } },
  reparto: AMIGO,
  texto: 'En el parque ya hay un grupo con una pelota. {amigo.Nombre} te grita desde lejos: «¡Venga, que nos falta uno para cuadrar los equipos!»',
  variantes: [
    {
      id: 'pequenos',
      si: [{ hecho: 'edad', max: 10 }],
      textos: [
        'En la zona del césped juegan al pilla-pilla. {amigo.Nombre} te ve y se para en seco. «¡Tú te la quedas! ¡Ahora!»',
        'Unos cuantos juegan al escondite junto a los columpios. {amigo.Nombre} te hace señas: «¡Ven, que somos impares!»',
      ],
    },
    {
      id: 'mayores',
      si: [],
      textos: [
        'En el parque ya hay un grupo con una pelota. {amigo.Nombre} te grita desde lejos: «¡Venga, que nos falta uno para cuadrar los equipos!»',
        'Alguien ha traído una pelota y alguien ha traído un frisbi, y no hay manera de decidirse. {amigo.Nombre} te ve llegar. «Tú eliges. Pero rápido».',
        '{amigo.Nombre} está en el banco de siempre, con las zapatillas medio atadas. «Justo a tiempo. Faltaba uno. O dos».',
      ],
    },
  ],
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'mirar' },
  opciones: [
    {
      id: 'apuntarte',
      texto: 'Apuntarte',
      caracter: { sociabilidad: 1, optimismo: 1 },
      minutos: 30,
      efectos: [{ relacion: 'amigo', afinidad: 2 }, { estado: 'gen.energia', mas: -3 }, { estado: 'gen.estres', mas: -3 }, { entrena: 'gen.cooperacion', cantidad: 0.3 }],
      resultados: ['Acabáis sudados y sin saber quién ganó, que es la mejor manera de acabar.', 'Se te va una hora sin darte cuenta. {amigo.Nombre} propone otra, y otra más.'],
    },
    {
      id: 'mirar',
      texto: 'Mirar desde el banco',
      caracter: { sociabilidad: -1, prudencia: 1 },
      minutos: 10,
      efectos: [{ relacion: 'amigo', afinidad: 1 }],
      resultado: 'Te quedas viendo el partido con los pies subidos al banco. {amigo.Nombre} te saluda con un gesto cada vez que pasa.',
    },
    { id: 'irte', texto: 'Decir que hoy no puedes y seguir tu camino', caracter: { sociabilidad: -1 }, efectos: [{ relacion: 'amigo', afinidad: -1 }], resultado: '«Otro día, entonces». Se nota que esperaba otra cosa.' },
  ],
  pruebas: [{ nombre: 'Un sábado a las 12, en el parque, con un amigo, se puede unirse', dado: { lugar: 'parque', hora: 12 * 60, diaDeLaSemana: 5, hechos: { edad: 12 }, relacion: { amigo: { afinidad: 40 } } }, espero: { opcionDisponible: 'apuntarte' } }],
});
