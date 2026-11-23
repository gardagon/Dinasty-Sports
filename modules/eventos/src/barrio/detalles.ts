import { suceso } from '@ds/contracts';

/**
 * Detalles del barrio: lo que pasa por la calle y el parque. Son `menor` y espontáneos (al llegar a un sitio, a veces). Cifras de partida, por calibrar.
 */
const EJEMPLO = { desde: 'calle_casa', hasta: 'avenida_parque', minutos: 3 };

export default [
  suceso({
    id: 'eventos.barrio.musico_en_la_avenida',
    titulo: 'Música en la avenida',
    categoria: 'menor',
    familia: 'parque',
    requiere: ['lugares'],
    disparo: { al: 'lugares.llegada', prob: 0.03 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [{ señal: 'hasta', es: 'avenida_parque' }, { hora: { desde: 16 * 60, hasta: 20 * 60 } }],
    repite: { espera: { dias: 40 } },
    texto: 'En un banco de la avenida, alguien toca la guitarra con el estuche abierto a los pies. Toca bien, y hay algo en la melodía que te suena de siempre.',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'seguir' },
    opciones: [
      { id: 'escuchar', texto: 'Pararte a escuchar un rato', caracter: { optimismo: 1 }, minutos: 10, efectos: [{ estado: 'gen.estres', mas: -3 }, { estado: 'gen.motivacion', mas: 1 }], resultado: 'Cierras los ojos en la última canción. Cuando los abres, el día parece un poco menos pesado.' },
      { id: 'moneda', texto: 'Dejar una moneda en el estuche', caracter: { sociabilidad: 1 }, minutos: 3, efectos: [{ estado: 'gen.dinero', mas: -1 }, { estado: 'gen.motivacion', mas: 2 }], resultado: '«¡Gracias!», dice sin dejar de tocar. Sigues tu camino tarareando.' },
      { id: 'seguir', texto: 'Seguir tu camino', efectos: [], resultado: 'La música se va apagando a tu espalda.' },
    ],
  }),
  suceso({
    id: 'eventos.barrio.moneda_en_la_acera',
    titulo: 'Una moneda en la acera',
    categoria: 'menor',
    familia: 'parque',
    requiere: ['lugares'],
    disparo: { al: 'lugares.llegada', prob: 0.01 },
    ejemploDeSeñal: EJEMPLO,
    cuando: [{ alguna: [{ señal: 'hasta', es: 'calle_casa' }, { señal: 'hasta', es: 'avenida_parque' }, { señal: 'hasta', es: 'calle_colegio' }] }],
    repite: { espera: { dias: 90 } },
    presentacion: 'linea',
    texto: 'Entre dos baldosas brilla una moneda. Nadie la ha echado en falta, así que te la guardas en el bolsillo.',
    efectos: [{ estado: 'gen.dinero', mas: 1 }],
  }),
];
