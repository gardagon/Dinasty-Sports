import { MODULOS } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { deportistaDe } from './bots';
import { runBot } from './runner';

/** Cuánto sube cada habilidad del fútbol en un curso (media de semillas) y de qué tipo de acción vienen los minutos: para calibrar el catálogo de entrenamientos. */
const dias = Number(process.argv[2] ?? 365);
const semillas = Number(process.argv[3] ?? 3);
const res = Array.from({ length: semillas }, (_, i) => runBot(deportistaDe('futbol'), i + 1, dias, { modulos: [...MODULOS, futbol], deportes: ['futbol'] }));
const ids = Object.keys(res[0].final.stats).filter((id) => id.startsWith('futbol.') && id !== 'futbol.conocimiento');
const filas = ids.map((id) => [id.replace('futbol.', ''), res.reduce((t, r) => t + (r.final.stats[id] - r.snapshots[0].stats[id]), 0) / res.length, res.reduce((t, r) => t + r.final.stats[id], 0) / res.length] as const);
filas.sort((a, b) => b[1] - a[1]);
for (const [id, d, v] of filas) console.log(`${id.padEnd(18)} +${d.toFixed(1).padStart(5)}  (final ${v.toFixed(1)})`);
console.log('minutos por etiqueta:', JSON.stringify(Object.fromEntries(Object.entries(res[0].minutesByTag).map(([k, v]) => [k, Math.round(v)]))));
