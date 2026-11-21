/**
 * MUESTRAS DE ESTILO (etapa 2a de `docs/PLAN_VISUALIZADOR.md`): la lectura de los datos. Esto sí es de verdad: todo sale de una partida con semilla fija, a través
 * del `CuerpoService` (`cuerpoDePersona`) y de las reglas del cuerpo de contracts. El dibujo de las muestras (`dibujo.ts`) es código provisional.
 */
import { alturaEn, complexion, cuerpoDePersona, fotoDeEdad, ID_DEL_PERSONAJE, pesoDe, type CuerpoDePersona, type NpcDirectory, SERVICES } from '@ds/contracts';
import { nuevaPartida } from '@ds/game';

export interface PersonaDeMuestra {
  /** Qué papel tiene en la muestra («El personaje», «Una chica de su clase»…). */
  papel: string;
  nombre: string;
  /** Edad de hoy en la partida (años con decimales). */
  edadHoy: number;
  cuerpo: CuerpoDePersona;
}

/** El cuerpo de una persona a una edad: la altura de la curva, y el músculo y la grasa del historial (antes de la primera foto, la primera; sin historial o en el futuro, los de hoy). */
export function cuerpoALaEdad(c: CuerpoDePersona, edad: number, edadHoy: number): { altura: number; musculo: number; grasa: number; peso: number; complexion: string } {
  const foto = edad < Math.floor(edadHoy) ? fotoDeEdad(c.historial, edad) : undefined;
  const musculo = foto?.musculo ?? c.musculo;
  const grasa = foto?.grasa ?? c.grasa;
  const altura = alturaEn(c.alturaAdulta, edad, c.madurez);
  return { altura, musculo, grasa, peso: pesoDe(altura, edad, musculo, grasa), complexion: complexion(musculo, grasa) };
}

export interface DatosDeMuestra {
  semilla: number;
  personaje: PersonaDeMuestra;
  chica: PersonaDeMuestra;
  adulto: PersonaDeMuestra;
  padre: PersonaDeMuestra;
  madre: PersonaDeMuestra;
}

/**
 * Las personas de la muestra, de una partida nueva con esta semilla: el personaje (un chico), una chica de su clase y el adulto con más calvicie y canas más tempranas
 * (entre profesores, entrenadores y padres), más el padre y la madre del personaje para el parecido familiar.
 */
export function leerMuestra(semilla: number): DatosDeMuestra {
  const g = nuevaPartida({ seed: semilla });
  const hoy = g.time.day;
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  if (!dir) throw new Error('La partida no tiene directorio de personas.');
  const persona = (id: string, papel: string, nombre?: string): PersonaDeMuestra => {
    const cuerpo = cuerpoDePersona(g, id);
    if (!cuerpo) throw new Error(`«${id}» no tiene cuerpo.`);
    return { papel, nombre: nombre ?? dir.get(id)?.name ?? id, edadHoy: (hoy - cuerpo.nacimiento) / 365, cuerpo };
  };
  const personaje = persona(ID_DEL_PERSONAJE, 'El personaje', 'El personaje');
  // Una chica de su clase (los ids `clase_N` son sus compañeros de clase): la de piel y pelo más distintos de los del personaje, para que se vea variedad.
  const companeras = dir.list({ role: 'companero' }).filter((n) => n.gender === 'f' && n.id.startsWith('clase_') && cuerpoDePersona(g, n.id));
  const distinta = (id: string) => {
    const a = cuerpoDePersona(g, id)!.apariencia;
    const b = personaje.cuerpo.apariencia;
    return (a.piel !== b.piel ? 2 : 0) + (a.peloTipo !== b.peloTipo ? 2 : 0) + (a.peloColor !== b.peloColor ? 1 : 0) + a.distintivos.length;
  };
  const chica = companeras.sort((a, b) => distinta(b.id) - distinta(a.id))[0];
  if (!chica) throw new Error('No hay ninguna chica en la clase del personaje.');
  // Un adulto con canas tempranas y calvicie alta: entre los profesores y los entrenadores (hombres de 30 años o más).
  const adultos = [...dir.list({ role: 'profesor' }), ...dir.list({ role: 'entrenador' })]
    .filter((n) => n.gender === 'm')
    .map((n) => ({ n, c: cuerpoDePersona(g, n.id) }))
    .filter((x) => x.c && (hoy - x.c.nacimiento) / 365 >= 30)
    .sort((a, b) => b.c!.apariencia.calvicie - b.c!.apariencia.canas / 40 - (a.c!.apariencia.calvicie - a.c!.apariencia.canas / 40));
  const adulto = adultos[0]?.n;
  if (!adulto) throw new Error('No hay adultos entre los profesores y los entrenadores.');
  return {
    semilla,
    personaje,
    chica: persona(chica.id, 'Una chica de su clase'),
    adulto: persona(adulto.id, adulto.role === 'profesor' ? 'Un profesor' : 'Un entrenador'),
    padre: persona('padre', 'Su padre'),
    madre: persona('madre', 'Su madre'),
  };
}
