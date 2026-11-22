import { suceso } from '@ds/contracts';
import { ajustesDePedirPuesto } from '@ds/kit-deporte';

/**
 * El primer entrenamiento con el equipo: el entrenador le dice dónde le va a poner de inicio, sin lado («de interior»), el otro puesto en que también encaja («a lo mejor más adelante te pongo de…») y, si es otro que el que pidió en la prueba de acceso, se lo recuerda: la frase es `hecho futbol.frase_del_puesto` y sus textos son datos del deporte (`pistas-de-puestos.ts`). El puesto ya lo tiene (el que pidió o le dieron al
 * entrar: `FutbolState.puesto`) y lo que vale en cada uno lo calcula el fútbol (`hechos.futbol`); aquí se cuenta y se puede pedir otro. El entrenador
 * decide: pedir no garantiza conseguirlo. Si lo concede, el cambio es el mismo de siempre (señal `club.cambio_de_puesto`). Cifras de partida, por calibrar. La dificultad de pedir el cambio depende de la relación con el entrenador y de lo que vale en el puesto que pide (ajustes de la tirada).
 */
export default suceso({
  id: 'futbol.primer_entrenamiento',
  titulo: 'Tu primer entrenamiento',
  deporte: 'futbol',
  disparo: { al: 'accion.realizada' },
  ejemploDeSeñal: { actionId: 'futbol.club_sesion', module: 'futbol', tags: ['futbol', 'club'], duration: 90, efficiency: 1 },
  ejemploDeHechos: { 'futbol.puesto': 'lateral derecho', 'futbol.mejor_puesto': 'extremo derecho', 'futbol.mejor_puesto_id': 'RW', 'futbol.juega_donde_mas_vale': false, 'futbol.ventaja_del_mejor_puesto': 6, 'futbol.frase_del_puesto': 'De inicio vas a jugar de lateral, pero a lo mejor más adelante te pongo de extremo.', 'futbol.calendario': 'la liga empieza el sábado 13 de octubre; el calendario de partidos se publica ese día, cuando empiece' },
  cuando: [{ señal: 'actionId', es: 'futbol.club_sesion' }, { hecho: 'futbol.puesto' }, { hecho: 'futbol.frase_del_puesto' }],
  repite: 'nunca',
  reparto: { entrenador: { rol: 'entrenador', delDeportePrincipal: true } },
  // Pasa dentro del entrenamiento (la señal es la de cualquier acción): sin minutos propios y sin aplazar.
  durante: true,
  urgencia: 'ahora',
  plazo: { dias: 1, porDefecto: 'aceptar' },
  variantes: [
    {
      id: 'donde_mas_vale',
      si: [{ hecho: 'futbol.juega_donde_mas_vale', es: true }],
      texto: 'Al acabar, {entrenador.nombre} te llama aparte. «Te he estado mirando. {hecho.futbol.frase_del_puesto} Es donde mejor te veo. Una cosa más: {hecho.futbol.calendario}».',
      opciones: [
        { id: 'aceptar', texto: 'Decir que ahí estarás a gusto', caracter: { disciplina: 1 }, efectos: [{ relacion: 'entrenador', afinidad: 2 }, { estado: 'gen.motivacion', mas: 3 }], resultado: '«Pues a trabajar».' },
        {
          id: 'preguntar',
          texto: 'Preguntar qué tienes que mejorar para ser titular',
          caracter: { ambicion: 2 },
          efectos: [{ relacion: 'entrenador', afinidad: 3, confianza: 1 }, { entrena: 'futbol.conocimiento', cantidad: 1 }, { estado: 'gen.motivacion', mas: 2 }],
          resultado: '{entrenador.Nombre} sonríe. «Eso me gusta. Ven a todos los entrenamientos y luego hablamos de lo demás».',
        },
      ],
    },
    {
      id: 'en_otro_sitio',
      si: [],
      texto:
        'Al acabar, {entrenador.nombre} te llama aparte. «{hecho.futbol.frase_del_puesto} Ya sé que a lo mejor te ves más de {hecho.futbol.mejor_puesto}, pero ahora mismo te necesito ahí. Una cosa más: {hecho.futbol.calendario}».',
      opciones: [
        { id: 'aceptar', texto: 'Aceptarlo: donde haga falta', caracter: { disciplina: 2 }, efectos: [{ relacion: 'entrenador', afinidad: 3 }], resultado: '«Así me gusta. Ya habrá tiempo de moverte».' },
        {
          id: 'pedir_cambio',
          texto: 'Pedirle jugar de {hecho.futbol.mejor_puesto}',
          caracter: { ambicion: 2, disciplina: -1 },
          // Dificultad de partida 55, PROVISIONAL (tabla en docs/relevo/futbol-pedir-puesto.md). Escalones acumulados que suman:
          // la relación con el entrenador (mejor, más fácil) y cuánto más vale en el puesto que pide que en el que tiene (`ventaja_del_mejor_puesto`, en puntos de valor; negativo = vale menos).
          tirada: {
            con: 'gen.comunicacion',
            dificultad: 55,
            ajustes: ajustesDePedirPuesto((r) => ({ hecho: 'futbol.ventaja_del_mejor_puesto', ...r })),
          },
          exito: {
            efectos: [{ emite: 'club.peticion_de_puesto', datos: { sport: 'futbol' } }, { emite: 'club.cambio_de_puesto', datos: { sport: 'futbol', puesto: '{hecho.futbol.mejor_puesto_id}' } }, { estado: 'gen.motivacion', mas: 4 }],
            resultado: '{entrenador.Nombre} se lo piensa. «Vale. Te pruebo ahí. Pero si no funciona, vuelves donde yo diga».',
          },
          fallo: { efectos: [{ emite: 'club.peticion_de_puesto', datos: { sport: 'futbol' } }, { relacion: 'entrenador', afinidad: -2 }], resultado: '«Aquí las posiciones las pongo yo». No ha sentado bien.' },
        },
        {
          id: 'preguntar',
          texto: 'Preguntar qué tienes que mejorar para jugar donde quieres',
          caracter: { ambicion: 1, prudencia: 1 },
          efectos: [{ relacion: 'entrenador', afinidad: 2, confianza: 1 }, { entrena: 'futbol.conocimiento', cantidad: 1 }, { marca: 'futbol_quiere_cambiar_de_puesto', dura: { dias: 120 } }],
          resultado: '{entrenador.Nombre} te explica qué mira en ese puesto. «Enséñamelo en los entrenamientos y lo hablamos».',
        },
      ],
    },
  ],
  pruebas: [
    { nombre: 'Si ya juega donde más vale, el entrenador se lo dice y no hay nada que pedir', dado: { hechos: { 'futbol.puesto': 'lateral derecho', 'futbol.juega_donde_mas_vale': true } }, espero: { opcionDisponible: 'preguntar' } },
    {
      nombre: 'Pedir el cambio y que lo conceda',
      dado: { hechos: { 'futbol.puesto': 'lateral derecho', 'futbol.juega_donde_mas_vale': false, 'futbol.mejor_puesto': 'extremo derecho', 'futbol.mejor_puesto_id': 'RW' } },
      elige: 'pedir_cambio',
      tirada: 'exito',
      espero: { sale: true },
    },
    { nombre: 'Sin puesto en el equipo no hay charla', dado: { hechos: {} }, espero: { sale: false } },
  ],
});
