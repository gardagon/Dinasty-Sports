/**
 * Análisis de las listas de acciones de la pantalla principal y de las fichas en distintos momentos (casa entre semana, colegio, club, verano, fin de semana): por cada grupo, cuántas acciones salen
 * (disponibles y no), cuáles son y cuáles ya van en un desplegable (`ActionDef.desplegable`). Sirve para decidir qué listas largas de acciones parecidas conviene agrupar.
 * `npm run listas` (o `npx tsx tools/listas-de-acciones.ts`). Tarda unos segundos (crea una partida con atletismo y fútbol).
 */
import { SERVICES, type LugaresService, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { advanceToWeek, type ActionOption, type Game } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { conocer, viajarA } from '../tests/ayudas';

/** Lo que enseña la pantalla principal: sin las acciones con personas (van en las fichas) ni los desplazamientos (van en el lugar). */
const delaPantalla = (g: Game): ActionOption[] =>
  g.listActions({ omitir: (d) => d.id.startsWith('relaciones.') && d.id !== 'relaciones.al_azar' && d.id !== 'relaciones.jugar_con_otros' }).filter((o) => o.module !== 'lugares');

/** Con `--detalle`, debajo de cada tabla sale cada acción de los grupos de más de 3 (id, nombre y si está disponible). */
const DETALLE = process.argv.includes('--detalle');

function tabla(titulo: string, lista: readonly ActionOption[]): void {
  const grupos = new Map<string, ActionOption[]>();
  for (const o of lista) grupos.set(o.group, [...(grupos.get(o.group) ?? []), o]);
  console.log(`\n### ${titulo}\n`);
  console.log('| Grupo | Acciones | Disponibles | En desplegable | Ejemplos |');
  console.log('|---|---|---|---|---|');
  for (const [grupo, os] of [...grupos].sort((a, b) => b[1].length - a[1].length)) {
    const ya = os.filter((o) => o.desplegable).length;
    const ejemplos = os.slice(0, 3).map((o) => o.name).join(' · ') + (os.length > 3 ? ' …' : '');
    console.log(`| ${grupo} | ${os.length} | ${os.filter((o) => o.available).length} | ${ya || ''} | ${ejemplos} |`);
  }
  if (DETALLE) for (const [grupo, os] of grupos) if (os.length > 3) console.log(`\n**${grupo}:**\n${os.map((o) => `- \`${o.id}\` «${o.name}»${o.available ? '' : ' (no)'}${o.desplegable ? ` [${o.desplegable.nombre}]` : ''}`).join('\n')}`);
}

const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const aqui = (): string => g.service<LugaresService>(SERVICES.lugares)!.actual().id;

advanceToWeek(g, 'gen.descansar', 2, 1, 17); // martes, 17:00
tabla(`Casa entre semana (martes 17:00, en ${aqui()})`, delaPantalla(g));

advanceToWeek(g, 'gen.descansar', 2, 2, 7); // miércoles, a las 7
viajarA(g, 'colegio');
tabla(`Colegio (miércoles a primera hora, en ${aqui()})`, delaPantalla(g));
while (g.time.minuteOfDay < 7 * 60 + 40) g.perform('gen.esperar'); // los compañeros llegan a las 7:30

// Una persona conocida a tu lado en el colegio: lo que se puede hacer con ella en su ficha.
const lugar = aqui();
const presencia = g.service<PresenciaService>(SERVICES.presencia)!;
const vecina = presencia.en(lugar, presencia.aforo(lugar)).find((n) => n.role === 'companero');
if (vecina) {
  conocer(g, vecina.id);
  const todas = g.listActions({ omitir: (d) => !(d.id.startsWith('relaciones.') && d.id.endsWith(`.${vecina.id}`)) }).filter((o) => o.id.startsWith('relaciones.') && o.id.endsWith(`.${vecina.id}`));
  tabla(`Ficha de un compañero a tu lado (${vecina.nombreCorto}, en ${lugar})`, todas);
}
void g.service<NpcDirectory>(SERVICES.npcs);

advanceToWeek(g, 'gen.descansar', 3, 2, 18); // miércoles, tarde: sesión del club y administración
viajarA(g, 'estadio');
tabla(`Estadio / club (miércoles por la tarde, en ${aqui()})`, delaPantalla(g));

advanceToWeek(g, 'gen.descansar', 3, 5, 11); // sábado a las 11
tabla(`Fin de semana (sábado 11:00, en ${aqui()})`, delaPantalla(g));

advanceToWeek(g, 'gen.descansar', 45, 1, 17); // verano
tabla(`Verano (semana 46, martes 17:00, en ${aqui()})`, delaPantalla(g));
