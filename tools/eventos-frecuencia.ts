/**
 * Con qué frecuencia sale cada evento: los bots juegan N días con varias semillas y se cuenta cada suceso por año.
 *
 *   npm run sim:eventos -- 365 2          (días y semillas; por defecto 180 y 2)
 *
 * Sirve para calibrar probabilidades y cupos: un evento que no sale nunca en ninguna partida o que sale demasiado se ve aquí.
 * Los bots deciden cada evento como alguien con el carácter de su personaje.
 */
import { Banco } from './eventos/banco';
import { BOTS, frecuenciaDeSucesos, runBot } from '../sim/src/index';

const dias = Number(process.argv[2] ?? 180);
const semillas = Number(process.argv[3] ?? 2);
const banco = new Banco();
const porBot = new Map<string, ReturnType<typeof frecuenciaDeSucesos>>();
const todos: { days: number; sucesos: Record<string, number> }[] = [];
for (const bot of BOTS) {
  const rs = Array.from({ length: semillas }, (_, s) => runBot(bot, (s + 1) * 1000 + 17, dias));
  porBot.set(bot.id, frecuenciaDeSucesos(rs));
  todos.push(...rs);
  console.log(`  ${bot.id}: ${porBot.get(bot.id)!.porSemana.toFixed(1)} eventos por semana`);
}
const total = frecuenciaDeSucesos(todos);
console.log(`\nVeces por año (media de ${semillas} semillas × ${dias} días)\n`);
console.log(['suceso'.padEnd(46), ...BOTS.map((b) => b.id.slice(0, 9).padStart(10)), 'media'.padStart(8)].join(''));
for (const id of [...banco.catalogo.sucesos.keys()].sort()) {
  console.log([id.padEnd(46), ...BOTS.map((b) => (porBot.get(b.id)!.porAño[id] ?? 0).toFixed(1).padStart(10)), (total.porAño[id] ?? 0).toFixed(1).padStart(8)].join(''));
}
const nunca = [...banco.catalogo.sucesos.keys()].filter((id) => !total.porAño[id]);
console.log(`\n${total.porSemana.toFixed(1)} eventos por semana de media. ${nunca.length} de ${banco.catalogo.sucesos.size} no han salido en ninguna partida${nunca.length ? ' (los de perks solo salen a quien tiene ese perk; los programados, si se llega a ellos)' : ''}.`);
