/**
 * Lo que cuestan los sucesos (eventos): con un catálogo grande y con los sucesos de los PNJ activados o no.
 *
 *   npm run eventos:rendimiento               (500 sucesos generados; 8 semanas por medida)
 *   npm run eventos:rendimiento -- 1000 12    (sucesos del catálogo grande y semanas)
 *
 * 1. Catálogo grande: arranque (compilar e indexar), coste añadido por acción y por día de juego, frente a la partida sin esos sucesos.
 * 2. PNJ: una semana de juego con las clases de los PNJ desactivadas, solo con `lesion` (lo decidido) y con todas las clases, con la
 *    ciudad pequeña y con la ciudad de prueba con fútbol (más gente). Cada medida se repite y se queda con la mejor (menos ruido).
 * Los objetivos están en docs/PLAN_EVENTOS.md §5.1.
 */
import { APORTE_DE_CONFIG_DE_SUCESOS, APORTE_DE_SUCESOS, PAIS_CIUDAD_DE_PRUEBA, SERVICES, contador, defineModule, registrarPais, suceso, type AporteDeSucesos, type GameModule, type NpcDirectory, type SucesosService } from '@ds/contracts';
import { type Game, type GameState } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import type { SucesosState } from '@ds/mod-sucesos';

const N = Number(process.argv[2] ?? 500);
const SEMANAS = Number(process.argv[3] ?? 8);
const ms = (f: () => void): number => {
  const t = performance.now();
  f();
  return performance.now() - t;
};
const mejorDe = (veces: number, f: () => number): number => Math.min(...Array.from({ length: veces }, f));

/** Un catálogo generado de `n` sucesos del personaje, con la mezcla de disparos y condiciones de un catálogo de verdad. La mayoría no sale casi nunca (como debe ser). */
function catalogoGrande(n: number): AporteDeSucesos[] {
  const tags = ['cardio', 'estudio', 'social', 'ocio', 'entrenamiento', 'descanso'];
  const out: AporteDeSucesos[] = Array.from({ length: 10 }, (_, k) => contador({ id: `medida.cuenta_${k}`, cuenta: { accion: { tags: [tags[k % tags.length]] } } }));
  for (let k = 0; k < n; k++) {
    const id = `medida.s${k}`;
    const base = { id, titulo: `Suceso ${k}`, texto: 'Pasa algo.', efectos: [{ marca: `medida_m${k % 40}`, dura: { dias: 20 } }] } as const;
    const clase = k % 10;
    if (clase < 3) out.push(suceso({ ...base, categoria: k % 2 ? 'menor' : 'importante', disparo: { cada: 'dia', prob: 0.02 }, cuando: [{ stat: 'gen.estres', min: 20 + (k % 50) }, { periodo: 'clase' }, { no: { marca: `medida_m${(k + 7) % 40}` } }], repite: { espera: { dias: 30 } } }));
    else if (clase < 5) out.push(suceso({ ...base, disparo: { cada: 'semana', prob: 0.05 }, cuando: [{ hecho: 'edad', min: 8 + (k % 8) }, { contador: `medida.cuenta_${k % 10}`, min: 50 + k }], repite: { espera: { dias: 60 } } }));
    else if (clase < 8) out.push(suceso({ ...base, disparo: { al: 'accion.realizada' }, cuando: [{ marca: `medida_m${(k + 3) % 40}` }, { señal: 'tags', incluye: tags[k % tags.length] }, { stat: 'gen.energia', max: 10 + (k % 20) }], repite: { espera: { dias: 90 } } }));
    else if (clase < 9) out.push(suceso({ ...base, disparo: { al: 'competicion.resultado' }, cuando: [{ señal: 'position', max: 3 }], repite: { espera: { dias: 30 } } }));
    else out.push(suceso({ ...base, disparo: { umbral: [{ stat: 'gen.salud', max: 5 + (k % 30) }, { hecho: 'edad', min: 9 }] }, repite: 'nunca' }));
  }
  return out;
}

/** `k` sucesos espontáneos que pueden pasarle a cualquiera, de una clase que no es `lesion` (para medir qué costaría activar más clases). */
function catalogoDePnj(k: number): AporteDeSucesos[] {
  const ejes = ['disciplina', 'ambicion', 'sociabilidad', 'prudencia', 'optimismo'];
  return Array.from({ length: k }, (_, j) =>
    suceso({
      id: `medida.pnj${j}`,
      titulo: `Vida ${j}`,
      para: 'cualquiera',
      clase: 'vida',
      disparo: { cada: 'semana', prob: 0.01 },
      cuando: [{ hecho: 'edad', min: 8, max: 19 }, { caracter: ejes[j % ejes.length], min: -10 }, { no: { marca: `vida_${j % 10}` } }],
      texto: 'Le pasa algo.',
      efectos: [{ estadoDeJugador: { moral: j % 2 ? 2 : -2 } }, { marca: `vida_${j % 10}`, dura: { dias: 30 } }],
      plazo: { dias: 1, porDefecto: 'a' },
      opciones: [
        { id: 'a', texto: 'Una cosa', caracter: { prudencia: 1 }, efectos: [{ estadoDeJugador: { forma: 1 } }] },
        { id: 'b', texto: 'Otra', caracter: { ambicion: 1 }, efectos: [{ estadoDeJugador: { forma: -1 } }] },
      ],
    }),
  );
}

const medida = (aportes: AporteDeSucesos[], clases?: string[]): GameModule =>
  defineModule({ id: 'medida', name: 'Medida', aportes: { [APORTE_DE_SUCESOS]: aportes, [APORTE_DE_CONFIG_DE_SUCESOS]: clases ? [{ pnj: { clases } }] : [] } });

const avanzar = (g: Game, dias: number): void => {
  const hasta = g.time.day + dias;
  while (g.time.day < hasta) if (!g.perform('gen.descansar').ok && !g.perform('gen.esperar').ok) throw new Error('No se puede esperar');
};

// ------------------------------------------------------------------ 1. Catálogo grande
console.log(`\n1. Catálogo grande: ${N} sucesos generados (además de los del juego)\n`);
const base = nuevaPartida({ seed: 11 }).serialize();
const grande = catalogoGrande(N);
const partida = (extra: GameModule[]): Game => cargarPartida(structuredClone(base), [...MODULOS, ...extra]);
const pendientes = (g: Game) => g.service<SucesosService>(SERVICES.sucesos)!.pendientes().length;

const arranque = mejorDe(5, () => ms(() => pendientes(partida([medida(catalogoGrande(N))])))) - mejorDe(5, () => ms(() => pendientes(partida([medida([])]))));
// Acciones dentro del mismo día (sin pasada diaria): 150 esperas de 5 minutos.
const porAccion = (extra: GameModule[]): number =>
  mejorDe(5, () => {
    const g = partida(extra);
    pendientes(g);
    return ms(() => {
      for (let k = 0; k < 150; k++) g.perform('gen.esperar');
    }) / 150;
  });
const accionSin = porAccion([medida([])]);
const accionCon = porAccion([medida(grande)]);
// Días enteros (24 acciones y una pasada diaria cada uno).
let salidos = 0;
const porDia = (extra: GameModule[]): number =>
  mejorDe(3, () => {
    const g = partida(extra);
    pendientes(g);
    const t = ms(() => avanzar(g, 28)) / 28;
    salidos = g.service<SucesosService>(SERVICES.sucesos)!.recuerdos().length;
    return t;
  });
const diaSin = porDia([medida([])]);
const diaCon = porDia([medida(grande)]);
const estadoCon = (() => {
  const g = partida([medida(grande)]);
  avanzar(g, 28);
  return JSON.stringify(g.moduleState<SucesosState>('sucesos')).length;
})();
console.log(`  Arranque (compilar e indexar)            ${arranque.toFixed(1)} ms            objetivo < 50 ms`);
console.log(`  Por acción, sin cambio de día            ${accionSin.toFixed(3)} → ${accionCon.toFixed(3)} ms   añade ${(accionCon - accionSin).toFixed(3)} ms   objetivo < 0,02 ms`);
console.log(`  Por día de juego (24 acciones + pasada)  ${diaSin.toFixed(2)} → ${diaCon.toFixed(2)} ms     añade ${(diaCon - diaSin).toFixed(2)} ms   objetivo de la pasada diaria < 1 ms`);
console.log(`  En 28 días han salido ${salidos} sucesos; la memoria del director pesa ${(estadoCon / 1024).toFixed(1)} KB`);

// ------------------------------------------------------------------ 2. Sucesos de los PNJ
console.log(`\n2. Sucesos de los PNJ: coste de una semana de juego (${SEMANAS} semanas por medida)\n`);
registrarPais(PAIS_CIUDAD_DE_PRUEBA);
const ciudades: { nombre: string; estado: GameState; modulos: GameModule[] }[] = [
  { nombre: 'Ciudad del juego (atletismo)', estado: base, modulos: [...MODULOS] },
  { nombre: 'Ciudad de prueba con fútbol', estado: nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_DE_PRUEBA.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]).serialize(), modulos: [...MODULOS, futbol] },
];
const configuraciones: { nombre: string; aportes: AporteDeSucesos[]; clases: string[] }[] = [
  { nombre: 'Todo desactivado', aportes: [], clases: [] },
  { nombre: 'Solo lesiones (lo decidido)', aportes: [], clases: ['lesion'] },
  { nombre: 'Todas las clases: 20 sucesos de vida', aportes: catalogoDePnj(20), clases: ['lesion', 'vida'] },
  { nombre: 'Todas las clases: 100 sucesos de vida', aportes: catalogoDePnj(100), clases: ['lesion', 'vida'] },
];
for (const c of ciudades) {
  let personas = 0;
  let referencia = 0;
  console.log(`  ${c.nombre}`);
  // La primera pasada calienta el motor (sin ella, la primera medida sale más lenta que las demás).
  for (const cfg of [configuraciones[3], ...configuraciones]) {
    let marcas = 0;
    const calentando = !referencia && cfg === configuraciones[3];
    const t = mejorDe(calentando ? 1 : 6, () => {
      const g = cargarPartida(structuredClone(c.estado), [...c.modulos, medida(cfg.aportes, cfg.clases)]);
      personas = g.service<NpcDirectory>(SERVICES.npcs)!.list().length;
      // Solo se cronometra la acción que cierra cada semana (la rutina semanal del mundo y, con ella, la pasada de los PNJ): el resto de la semana no cambia.
      let total = 0;
      for (let w = 0; w < SEMANAS; w++) {
        const semana = g.time.week;
        for (;;) {
          const cruza = g.time.weekday === 6 && g.time.minuteOfDay + 60 >= 1440;
          const t0 = performance.now();
          if (!g.perform('gen.descansar').ok) g.perform('gen.esperar');
          if (cruza || g.time.week !== semana) {
            total += performance.now() - t0;
            break;
          }
        }
      }
      marcas = Object.keys(g.moduleState<SucesosState>('sucesos').marcas).filter((m) => m.includes('@')).length;
      return total / SEMANAS;
    });
    if (calentando) continue;
    if (!referencia) referencia = t;
    console.log(`    ${cfg.nombre.padEnd(40)} ${t.toFixed(1).padStart(7)} ms el cierre de semana   ${t === referencia ? '' : `(${t - referencia >= 0 ? '+' : ''}${(t - referencia).toFixed(1)} ms, ${(((t - referencia) / referencia) * 100).toFixed(1)} %)`}   ${marcas} marcas de personas`);
  }
  console.log(`    ${personas} personas en el mundo\n`);
}
