import { suceso } from '@ds/contracts';

/**
 * Los demás reaccionan a tu altura (E18.7). Son detalles ligeros (`menor`): un comentario de alguien que está contigo cuando eres
 * bastante más bajo o más alto de lo normal a tu edad. Umbrales en centímetros sobre lo típico de la edad (`altura_para_su_edad`).
 */
const QUIEN = { conocido: true, presente: true, edad: { max: 18 } } as const;

export default [
  suceso({
    id: 'eventos.cuerpo.bajito',
    titulo: 'Un comentario sobre tu altura',
    categoria: 'menor',
    disparo: { cada: 'dia', prob: 0.08 },
    cuando: [{ hecho: 'altura_para_su_edad', max: -6 }, { periodo: 'clase' }],
    repite: { espera: { dias: 45 } },
    reparto: { quien: QUIEN },
    texto: '{quien.Nombre} te mira de arriba abajo. «Oye, ¿tú no eres muy baj{yo:o|a} para tu edad?»',
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'callar' },
    opciones: [
      { id: 'reir', texto: 'Reírte: «Y tú muy alt{quien:o|a} para lo que piensas»', caracter: { optimismo: 1, sociabilidad: 1 }, efectos: [{ entrena: 'gen.carisma', cantidad: 0.5 }, { relacion: 'quien', afinidad: 2 }], resultado: 'Se ríe contigo. Tema zanjado.' },
      { id: 'encararse', texto: 'Decirle que se meta en sus asuntos', caracter: { agresividad: 2 }, efectos: [{ entrena: 'gen.autoridad', cantidad: 0.5 }, { relacion: 'quien', afinidad: -3 }], resultado: 'Levanta las manos. «Vale, vale».' },
      { id: 'callar', texto: 'No decir nada', efectos: [{ estado: 'gen.motivacion', mas: -2 }], resultado: 'Te quedas con el comentario dando vueltas.' },
    ],
  }),
  suceso({
    id: 'eventos.cuerpo.alto',
    titulo: 'Un comentario sobre tu altura',
    categoria: 'menor',
    disparo: { cada: 'dia', prob: 0.08 },
    cuando: [{ hecho: 'altura_para_su_edad', min: 6 }, { periodo: 'clase' }],
    repite: { espera: { dias: 45 } },
    reparto: { quien: QUIEN },
    presentacion: 'linea',
    texto: '{quien.Nombre} tiene que levantar la cabeza para hablarte. «¿Pero tú cuánto mides ya? Así cualquiera».',
    efectos: [{ estado: 'gen.motivacion', mas: 1 }],
  }),
];
