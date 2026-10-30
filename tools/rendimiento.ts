/**
 * Dónde se va el tiempo en una partida: crear, guardar, un día cualquiera y una acción cualquiera, y cuánto pesa cada parte del estado.
 * `npm run rendimiento` (o `npx tsx tools/rendimiento.ts [días]`); con `node --cpu-prof` se ve el perfil por función.
 */
import { SERVICES, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { cargarPartida, nuevaPartida } from '@ds/game';
import { BOTS, runBot } from '../sim/src/index';

const t = <T>(f: () => T): [T, number] => {
  const t0 = performance.now();
  const r = f();
  return [r, performance.now() - t0];
};
const ms = (x: number) => `${x.toFixed(1)} ms`;
const kb = (x: number) => `${(x / 1024).toFixed(0)} KB`;

const [g, creacion] = t(() => nuevaPartida({ seed: 31 }));
console.log(`Crear la partida: ${ms(creacion)}`);
const [json, serializar] = t(() => JSON.stringify(g.serialize()));
const [, clonar] = t(() => g.serialize());
const [, guardar] = t(() => g.serializarJSON());
console.log(`Estado: ${kb(json.length)} · copiar ${ms(clonar)} · a texto ${ms(guardar)} (copiar+texto ${ms(serializar)})`);
const [, cargar] = t(() => cargarPartida(JSON.parse(json), undefined, { copiar: false }));
console.log(`Cargar una partida guardada (leer el texto y montarla): ${ms(cargar)}`);
const estado = g.serialize();
const partes = Object.entries(estado.modules).map(([m, s]) => [m, JSON.stringify(s).length] as const).sort((a, b) => b[1] - a[1]);
console.log('Por módulo:', partes.map(([m, n]) => `${m} ${kb(n)}`).join(' · '));
const npcs = (estado.modules.npcs as { npcs: Record<string, unknown>[] }).npcs;
const campos = new Map<string, number>();
for (const n of npcs) for (const [k, v] of Object.entries(n)) campos.set(k, (campos.get(k) ?? 0) + JSON.stringify(v).length);
console.log(`Personas: ${npcs.length}; por campo:`, [...campos].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} ${kb(n)}`).join(' · '));

// Un día entero sin acciones (esperar) y acciones sueltas.
const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
const pres = g.service<PresenciaService>(SERVICES.presencia)!;
const [, lista] = t(() => dir.list({}));
const [, aqui] = t(() => pres.en('patio'));
const [, aqui2] = t(() => pres.en('parque'));
console.log(`Servicios: lista de todos ${ms(lista)} · quién hay en el patio ${ms(aqui)} · en el parque ${ms(aqui2)}`);
// Cuánto cuesta saber quién hay en un sitio justo después de que pase el tiempo (se rehace el índice de presencia por minuto).
const presencia: number[] = [];
for (let i = 0; i < 12; i++) {
  g.perform('gen.esperar');
  presencia.push(t(() => pres.en('patio')).at(-1) as number);
}
console.log(`Quién hay en un sitio tras pasar el tiempo: media ${ms(presencia.reduce((a, b) => a + b, 0) / presencia.length)} · máx ${ms(Math.max(...presencia))}`);
const horas: number[] = [];
for (let i = 0; i < 24; i++) horas.push(t(() => g.perform('gen.esperar')).at(-1) as number);
console.log(`Acción «esperar»: media ${ms(horas.reduce((a, b) => a + b, 0) / horas.length)} · máx ${ms(Math.max(...horas))}`);
const dias = Number(process.argv[2] ?? 30);
const [bot, msBot] = t(() => runBot(BOTS.find((b) => b.id === 'equilibrado')!, 1, dias));
console.log(`Bot equilibrado ${dias} días: ${bot.actions} acciones en ${ms(msBot)} → ${(msBot / bot.actions).toFixed(2)} ms/acción`);
