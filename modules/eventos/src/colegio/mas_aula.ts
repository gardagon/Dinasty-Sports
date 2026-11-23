import { suceso } from '@ds/contracts';

/**
 * Más detalles del aula (segundo lote, mismo estilo que `aula.ts`): una cosa pequeña que pasa en clase, dos o tres salidas y consecuencias pequeñas.
 * Son `menor` y espontáneos (al entrar en clase, a veces). Cifras de partida, por calibrar.
 */
const EN_CLASE = { al: 'clase.asistida', prob: 0.03 } as const;
const EJEMPLO = { asignatura: 'estudios.lengua', tarde: 0 };
const PROFESOR = { profesor: { asignaturaDeLaSeñal: 'asignatura' } } as const;

export default [
  suceso({
    id: 'eventos.colegio.cabeceo_en_clase',
    titulo: 'Los ojos se te cierran',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios'],
    disparo: EN_CLASE,
    ejemploDeSeñal: EJEMPLO,
    cuando: [{ stat: 'gen.energia', max: 50 }],
    repite: { espera: { dias: 12 } },
    reparto: PROFESOR,
    texto: 'La voz de {profesor.nombre} se vuelve un zumbido. La cabeza te pesa y los párpados, más. Un cabeceo más y te quedas dormid{yo:o|a} sobre la mesa.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'aguantar' },
    opciones: [
      {
        id: 'aguantar',
        texto: 'Aguantar con los ojos como platos',
        caracter: { disciplina: 1 },
        tirada: { con: 'gen.concentracion', dificultad: 40 },
        exito: { efectos: [{ entrena: 'gen.concentracion', cantidad: 0.4 }, { estado: 'gen.estres', mas: 1 }], resultado: 'Te clavas el bolígrafo en la palma y aguantas hasta el timbre. Cansad{yo:o|a}, pero entero.' },
        fallo: { efectos: [{ relacion: 'profesor', afinidad: -1 }, { estado: 'gen.estres', mas: 2 }], resultado: 'La cabeza se te cae de golpe. «¿Hemos dormido bien?», pregunta {profesor.nombre}. Se ríen.' },
      },
      { id: 'agua', texto: 'Pedir permiso para ir a beber agua', caracter: { prudencia: 1 }, efectos: [{ estado: 'gen.energia', mas: 2 }, { estado: 'gen.estres', mas: -1 }], resultado: 'El pasillo vacío y el agua fría te despejan. Vuelves con otra cara.' },
      { id: 'dormir', texto: 'Apoyar la cabeza en el brazo un momento', caracter: { disciplina: -1 }, efectos: [{ estado: 'gen.energia', mas: 3 }, { relacion: 'profesor', afinidad: -2 }], resultado: 'Descansas un minuto bueno, hasta que un golpecito en la mesa te trae de vuelta. «Mañana, a la cama antes».' },
    ],
    pruebas: [
      { nombre: 'Con la energía alta no sale', dado: { stats: { 'gen.energia': 90 } }, señal: EJEMPLO, espero: { sale: false } },
      { nombre: 'Agotado: sale', dado: { stats: { 'gen.energia': 20 } }, señal: EJEMPLO, espero: { opcionDisponible: 'agua' } },
    ],
  }),
  suceso({
    id: 'eventos.colegio.profesor_se_equivoca',
    titulo: 'El profesor se equivoca',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios', 'relaciones'],
    disparo: EN_CLASE,
    ejemploDeSeñal: EJEMPLO,
    repite: { espera: { dias: 45 } },
    reparto: PROFESOR,
    texto: '{profesor.Nombre} acaba de escribir un resultado en la pizarra y tú estás casi segur{yo:o|a} de que está mal. Nadie dice nada.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'callar' },
    opciones: [
      {
        id: 'avisar',
        texto: 'Levantar la mano y decírselo',
        caracter: { honestidad: 1, ambicion: 1 },
        tirada: { con: 'gen.inteligencia', dificultad: 45 },
        exito: { efectos: [{ relacion: 'profesor', afinidad: 2 }, { estado: 'gen.motivacion', mas: 3 }, { entrena: 'gen.inteligencia', cantidad: 0.3 }], resultado: '«Tienes razón, gracias». Lo corrige sonriendo. Alguien te mira con respeto.' },
        fallo: { efectos: [{ estado: 'gen.estres', mas: 3 }], resultado: '«Está bien. Mira otra vez». Lo estaba. Notas cómo se te sube el calor a la cara.' },
      },
      { id: 'nota', texto: 'Apuntarlo y comentárselo al acabar la clase', caracter: { prudencia: 1 }, efectos: [{ relacion: 'profesor', afinidad: 1 }], resultado: 'Se lo dices al salir, en voz baja. «Buen ojo. Lo arreglo mañana».' },
      { id: 'callar', texto: 'Dejarlo estar', caracter: { sociabilidad: -1 }, efectos: [], resultado: 'Copias el resultado equivocado y sigues. Ya se dará cuenta alguien.' },
    ],
  }),
  suceso({
    id: 'eventos.colegio.trabajo_en_grupo',
    titulo: 'Un trabajo en grupo',
    categoria: 'menor',
    familia: 'aula',
    requiere: ['estudios', 'relaciones'],
    disparo: EN_CLASE,
    ejemploDeSeñal: EJEMPLO,
    repite: { espera: { dias: 40 } },
    reparto: { quien: { rol: 'companero', conocido: true } },
    texto: '«Os pongo por parejas». {quien.Nombre} ya te está mirando. En su lado de la mesa solo hay un folio en blanco.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'repartir' },
    opciones: [
      { id: 'repartir', texto: 'Proponer repartiros el trabajo a medias', caracter: { disciplina: 1 }, efectos: [{ relacion: 'quien', afinidad: 1 }, { entrena: 'gen.cooperacion', cantidad: 0.3 }], resultado: 'Cada cual su mitad, y a juntarlas al final. Sale decente.' },
      { id: 'liderar', texto: 'Cogerlo tú y decir qué hace cada uno', requiere: [{ stat: 'gen.autoridad', min: 12 }], caracter: { ambicion: 1 }, efectos: [{ entrena: 'gen.autoridad', cantidad: 0.4 }, { relacion: 'quien', afinidad: -1 }, { estado: 'gen.motivacion', mas: 2 }], resultado: 'Sale mejor de lo esperado, aunque {quien.nombre} se queda con cara de «¿y yo qué pinto?».' },
      { id: 'dejarle', texto: 'Dejar que lo haga {quien.nombre}, que tiene más ganas', caracter: { disciplina: -1 }, efectos: [{ relacion: 'quien', afinidad: -2 }], resultado: 'Lo hace sin rechistar, pero se nota que no le ha hecho gracia.' },
    ],
  }),
];
