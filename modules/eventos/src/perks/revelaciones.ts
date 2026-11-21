import type { Condicion } from '@ds/contracts';
import { revelaciones } from './_ayuda';

/**
 * Revelación de los perks latentes (E5.3). El efecto de cada perk cuenta desde que se nace; aquí solo se decide cuándo se entera el personaje.
 * «Pulmones grandes» tiene su propio hilo (`pulmones.ts`). Probabilidades y umbrales de partida, por calibrar con `npm run sim`.
 */
const ENTRENADO = (n: number): Condicion => ({ contador: 'eventos.cuenta.entrenamientos', min: n });
const FISICO = (n: number): Condicion => ({ contador: 'eventos.cuenta.fisico', min: n });
const COMPETIDO = (n: number): Condicion => ({ contador: 'eventos.cuenta.competiciones', min: n });
const CADA_SEMANA = (prob: number) => ({ cada: 'semana' as const, prob });

export default revelaciones([
  { perk: 'asmatico', nombre: 'Asmático', titulo: 'Te falta el aire', disparo: { al: 'accion.realizada' }, cuando: [{ señal: 'tags', incluye: 'cardio' }, { contador: 'eventos.cuenta.fondo', min: 3 }], motivacion: -4,
    texto: 'A mitad del rodaje te falta el aire de una forma que no es normal: te tienes que parar, con un pitido en el pecho. El médico lo confirma unos días después: asma. Se puede hacer deporte con ello, pero el fondo te va a costar más que a los demás.' },
  { perk: 'vision_periferica', nombre: 'Visión periférica excepcional', titulo: 'Lo ves todo', disparo: CADA_SEMANA(0.15), cuando: [COMPETIDO(3)], motivacion: 5,
    texto: 'Te das cuenta de que, cuando hay mucha gente alrededor, tú sabes dónde está cada uno sin girar la cabeza. Creías que le pasaba a todo el mundo. No.' },
  { perk: 'miope', nombre: 'Miope', titulo: 'La pizarra, borrosa', disparo: CADA_SEMANA(0.15), cuando: [{ hecho: 'edad', min: 9 }, { periodo: 'clase' }], motivacion: -2,
    texto: 'Llevas semanas entornando los ojos para leer la pizarra. En la revisión te lo dicen claro: miopía. Con gafas verás bien de cerca y de lejos, pero cuando hay mucho movimiento alrededor se te escapan cosas.' },
  { perk: 'recuperacion_rapida', nombre: 'Recuperación rápida', titulo: 'Al día siguiente, como nuev{yo:o|a}', disparo: CADA_SEMANA(0.15), cuando: [ENTRENADO(30)], motivacion: 5,
    texto: 'Tus compañeros se quejan de agujetas dos días después de cada sesión dura. Tú, a la mañana siguiente, estás como si nada. Siempre ha sido así.' },
  { perk: 'recuperacion_lenta', nombre: 'Recuperación lenta', titulo: 'Te cuesta recuperarte', disparo: CADA_SEMANA(0.15), cuando: [ENTRENADO(30)], motivacion: -3,
    texto: 'Después de una sesión dura, los demás vuelven al día siguiente como si nada. A ti el cansancio se te queda en las piernas varios días. Tendrás que medir mejor tus esfuerzos.' },
  { perk: 'reflejos_felinos', nombre: 'Reflejos felinos', titulo: 'Lo has cogido al vuelo', disparo: CADA_SEMANA(0.15), cuando: [FISICO(25)], motivacion: 5,
    texto: 'Se cae un vaso de la mesa y lo tienes en la mano antes de pensar en ello. No es la primera vez. Reaccionas antes que nadie.' },
  { perk: 'torpe', nombre: 'Torpe', titulo: 'Siempre un segundo tarde', disparo: CADA_SEMANA(0.15), cuando: [FISICO(25)], motivacion: -3,
    texto: 'Cuando algo pasa de repente —un balón que viene, alguien que se cruza—, tú reaccionas un segundo más tarde que los demás. No es falta de atención: es que eres así.' },
  { perk: 'equilibrio_natural', nombre: 'Equilibrio natural', titulo: 'No hay quien te tire', disparo: CADA_SEMANA(0.15), cuando: [FISICO(25)], motivacion: 5,
    texto: 'Te empujan, tropiezas, resbalas… y sigues de pie. Donde otros acaban en el suelo, tú te recolocas sin darte cuenta.' },
  { perk: 'desequilibrado', nombre: 'Desequilibrado', titulo: 'Otra vez al suelo', disparo: CADA_SEMANA(0.15), cuando: [FISICO(25)], motivacion: -3,
    texto: 'Otra caída tonta. Ya no puedes decir que es mala suerte: pierdes el equilibrio con más facilidad que los demás.' },
  { perk: 'memoria_motora_fotografica', nombre: 'Memoria motora fotográfica', titulo: 'Con verlo una vez te basta', disparo: CADA_SEMANA(0.15), cuando: [ENTRENADO(40)], motivacion: 6,
    texto: 'Te enseñan un gesto nuevo y a la segunda repetición ya te sale. Los demás necesitan una semana. Tu cuerpo se queda con los movimientos casi sin querer.' },
  { perk: 'memoria_motora_corta', nombre: 'Memoria corta motora', titulo: 'Lo que aprendes se te va', disparo: CADA_SEMANA(0.15), cuando: [ENTRENADO(40)], motivacion: -3,
    texto: 'Lo que el lunes te salía, el jueves hay que volver a aprenderlo. A ti los gestos se te olvidan si no los repites mucho. Constancia: no hay otra.' },
  { perk: 'sangre_fria', nombre: 'Sangre fría', titulo: 'Cuando más aprieta, mejor estás', disparo: { al: 'competicion.resultado' }, cuando: [COMPETIDO(4)], motivacion: 6,
    texto: 'Hoy te has fijado: en el momento que decidía todo, mientras a los demás les temblaban las piernas, tú estabas tranquil{yo:o|a}. No es la primera vez.' },
  { perk: 'nervioso', nombre: 'Nervioso', titulo: 'Los nervios te pueden', disparo: { al: 'competicion.resultado' }, cuando: [COMPETIDO(4)], motivacion: -4,
    texto: 'Otra vez: en los entrenamientos te sale, y cuando llega el momento de verdad se te hace un nudo en el estómago. Vas a tener que aprender a vivir con esos nervios.' },
  { perk: 'suertudo', nombre: 'Suertudo', titulo: 'Qué suerte tienes', disparo: CADA_SEMANA(0.04), cuando: [{ hecho: 'edad', min: 10 }], motivacion: 4,
    texto: 'Se te cae el bocadillo y cae de pie. Llegas tarde y el autobús también. Empiezas a pensar que las cosas, a ti, te suelen salir bien por los pelos.' },
  { perk: 'gafe', nombre: 'Gafe', titulo: 'Qué mala pata', disparo: CADA_SEMANA(0.04), cuando: [{ hecho: 'edad', min: 10 }], motivacion: -2,
    texto: 'Si algo puede torcerse en el último momento, a ti se te tuerce. Tus amigos ya bromean con ello. Tú no le ves tanta gracia.' },
  { perk: 'gigante', nombre: 'Gigante', titulo: 'Otra vez te quedan cortos los pantalones', disparo: CADA_SEMANA(0.1), cuando: [{ hecho: 'edad', min: 10, max: 16 }], motivacion: 3,
    texto: 'El pediatra mira la curva de crecimiento y levanta las cejas. «Vas a ser muy alt{yo:o|a}. Mucho».' },
  { perk: 'enano', nombre: 'Enano', titulo: 'Los demás han pegado el estirón', disparo: CADA_SEMANA(0.1), cuando: [{ hecho: 'edad', min: 10, max: 16 }], motivacion: -3,
    texto: 'En la foto de clase ya eres de l{yo:os|as} más baj{yo:os|as}. El pediatra lo dice con tacto: no vas a crecer mucho más que tus padres. A cambio, nadie se revuelve tan rápido como tú.' },
]);
