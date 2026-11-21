import { ENTRENAMIENTOS_DE_FUTBOL, ESCALA_DE_ENTRENAMIENTO, GRUPOS_DE_ENTRENAMIENTO, entrenaPorLibre, ejercicioDelClub } from '../modules/futbol/src/entrenamientos';
import { QUEDADAS_DE_FUTBOL } from '../modules/futbol/src/quedadas';

/**
 * La tabla del catálogo de 22 entrenamientos del fútbol con las cifras finales (`docs/ANEXO_DEPORTE.md`): lo que sube cada uno por libre y en el club, y los puntos por hora.
 *
 *   npm run entrenamientos:tabla
 */
const NOMBRES: Record<string, string> = { 'futbol.conocimiento': 'conocimiento', 'gen.coordinacion': 'coordinación', 'gen.agilidad': 'agilidad', 'gen.velocidad': 'velocidad', 'gen.resistencia': 'resistencia', 'gen.fuerza': 'fuerza', 'gen.concentracion': 'concentración', 'gen.comunicacion': 'comunicación' };
const nombre = (s: string) => NOMBRES[s] ?? s.replace(/^(futbol|gen)\./, '').replaceAll('_', ' ');
const num = (x: number) => x.toFixed(2).replace(/0$/, '').replace(/\.0$/, '').replace('.', ',');
const hab = (xs: readonly { stat: string; amount: number }[]) => xs.filter((x) => x.stat.startsWith('futbol.') && x.stat !== 'futbol.conocimiento').reduce((t, x) => t + x.amount, 0);

console.log(`Escala de entrenamiento: ${ESCALA_DE_ENTRENAMIENTO}\n`);
for (const g of Object.keys(GRUPOS_DE_ENTRENAMIENTO) as (keyof typeof GRUPOS_DE_ENTRENAMIENTO)[]) {
  console.log(`**${GRUPOS_DE_ENTRENAMIENTO[g]}**\n`);
  console.log('| # | Nombre | Sube (por libre, antes de ×0,85) | Dónde | Con quién | Min | Cansa | Hab./h solo | Hab./h club |\n|---|---|---|---|---|---|---|---|---|');
  for (const e of ENTRENAMIENTOS_DE_FUTBOL.filter((x) => x.grupo === g)) {
    const libre = entrenaPorLibre(e);
    const sube = libre.map((x) => `${nombre(x.stat)} ${num(x.amount)}`).join(', ');
    const club = e.quien.includes('club') ? num(hab(ejercicioDelClub(e).entrena)) : '—';
    const solo = e.quien.includes('solo') ? num((hab(libre) * 60 * 0.85) / e.minutos) : '—';
    console.log(`| ${e.clave} | ${e.nombre} | ${sube} | ${e.lugares.join(', ')} | ${e.quien.join(', ')} | ${e.minutos} | −${e.energia}${e.estres ? ` (estrés ${e.estres > 0 ? '+' : ''}${e.estres})` : ''} | ${solo} | ${club} |`);
  }
  console.log('');
}
console.log('**Quedadas**\n\n| Quedada | Sube | Dónde | Min |\n|---|---|---|---|');
for (const q of QUEDADAS_DE_FUTBOL) console.log(`| ${q.titulo} | ${q.entrena.map((x) => `${nombre(x.stat)} ${num(x.amount)}`).join(', ')} | ${Object.keys(q.lugares).join(', ')} | ${q.duracion} |`);
