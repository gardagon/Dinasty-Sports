/**
 * PRUEBA de tres cambios en el dibujo (pedida por el usuario el 16/11): niños que no parezcan adultos en miniatura, arrugas leves y progresivas, y cuerpos más
 * elaborados (hombre y mujer, complexiones, manos). `npm run retratos:prueba [semilla]` genera `docs/retratos/prueba.html`: una persona de cada sexo, con el retrato y la
 * figura entera a varias edades, **en la versión actual (`@ds/retrato`) y en la de prueba (`tools/retratos/prueba/`), una al lado de otra**. La base no se toca.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cuerpoDePersona, ID_DEL_PERSONAJE, type CuerpoDePersona } from '@ds/contracts';
import { nuevaPartida } from '@ds/game';
import * as actual from '@ds/retrato';
import * as prueba from './prueba/index';

const semilla = Number(process.argv[2] ?? 31);
const EDADES = [3, 8, 12, 15, 18, 30, 50, 70];
const g = nuevaPartida({ seed: semilla });
const persona = (id: string): CuerpoDePersona => { const c = cuerpoDePersona(g, id); if (!c) throw new Error(`«${id}» no tiene cuerpo.`); return c; };
const base: Partial<CuerpoDePersona> = {};
const inventada = (c: CuerpoDePersona, cambios: Partial<CuerpoDePersona>): CuerpoDePersona => ({ ...c, ...base, ...cambios });
const personas: [string, CuerpoDePersona][] = [['El personaje (hombre)', persona(ID_DEL_PERSONAJE)], ['Su madre (mujer)', persona('madre')]];
// Afeitado y sin cambios de look entre versiones: se compara el dibujo, no el peinado.
const look = { vello: 'afeitado' };

const celda = (svg: string, pie: string) => `<figure>${svg}<figcaption>${pie}</figcaption></figure>`;
const fila = (titulo: string, clase: string, celdas: string) => `<div class="fila ${clase}"><h4>${titulo}</h4><div class="ocho">${celdas}</div></div>`;

const bloques = personas.map(([nombre, c]) => {
  const retratos = (v: typeof actual) => EDADES.map((e) => celda(v.retratoSvg(c, e, { look }), `${e} años`)).join('');
  const figuras = (v: typeof actual) => v.figurasSvg(EDADES.map((e) => ({ cuerpo: c, edad: e, opciones: { look }, rotulo: `${e} años` })), { alturaMaxima: c.alturaAdulta + 12 });
  return `<section><h2>${nombre}</h2>
    ${fila('Retrato · versión actual', 'actual', retratos(actual))}
    ${fila('Retrato · prueba', 'prueba', retratos(prueba as unknown as typeof actual))}
    <div class="fila actual"><h4>Figura entera · versión actual</h4><div class="regla">${figuras(actual)}</div></div>
    <div class="fila prueba"><h4>Figura entera · prueba</h4><div class="regla">${figuras(prueba as unknown as typeof actual)}</div></div>
  </section>`;
});

// Complexiones y sexos a los 30 años y a los 8, en las dos versiones.
const tipos: [string, Partial<CuerpoDePersona>][] = [['delgado', { musculo: 18, grasa: 20 }], ['normal', { musculo: 30, grasa: 40 }], ['atlético', { musculo: 45, grasa: 35 }], ['musculado', { musculo: 85, grasa: 30 }], ['con sobrepeso', { musculo: 25, grasa: 80 }]];
const complexiones = (v: typeof actual, edad: number) => v.figurasSvg(personas.flatMap(([, c], i) => tipos.map(([t, cambios]) => ({ cuerpo: inventada(c, { ...cambios, historial: [] }), edad, opciones: { look }, rotulo: `${i ? 'ella' : 'él'} · ${t}` }))), { alturaMaxima: edad < 18 ? 145 : 185 });
bloques.push(`<section><h2>Complexiones, hombre y mujer</h2>
  <div class="fila actual"><h4>30 años · versión actual</h4><div class="regla">${complexiones(actual, 30)}</div></div>
  <div class="fila prueba"><h4>30 años · prueba</h4><div class="regla">${complexiones(prueba as unknown as typeof actual, 30)}</div></div>
  <div class="fila actual"><h4>8 años · versión actual</h4><div class="regla baja">${complexiones(actual, 8)}</div></div>
  <div class="fila prueba"><h4>8 años · prueba</h4><div class="regla baja">${complexiones(prueba as unknown as typeof actual, 8)}</div></div>
</section>`);

const css = `
:root{color-scheme:light;--paper:#eef2f7;--sheet:#f9fbfd;--ink:#17233d;--ink-soft:#55627a;--rule:#c9d3e0;--lane:#2f63c9;--fondo:#dfe7f2;--marca:#fff3b8}
@media (prefers-color-scheme:dark){:root:not([data-theme='light']){color-scheme:dark;--paper:#121a2b;--sheet:#18223a;--ink:#e6ecf6;--ink-soft:#9aa8c0;--rule:#2b3852;--lane:#6f9bf0;--fondo:#222e49;--marca:#4a431d}}
:root[data-theme='dark']{color-scheme:dark;--paper:#121a2b;--sheet:#18223a;--ink:#e6ecf6;--ink-soft:#9aa8c0;--rule:#2b3852;--lane:#6f9bf0;--fondo:#222e49;--marca:#4a431d}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif}
main{max-width:1300px;margin:0 auto;padding:14px}h1{font-size:1.4rem;margin:0 0 4px}h2{font-size:1.15rem;margin:0 0 6px}
h4{font-size:.85rem;margin:10px 0 4px;color:var(--ink-soft);font-weight:600}.prueba h4{color:var(--ink)}.prueba h4::after{content:' ← nuevo';background:var(--marca);border-radius:4px;padding:0 5px;font-weight:400}
p,li{margin:4px 0;color:var(--ink-soft);font-size:.9rem}ul{padding-left:18px;margin:4px 0}b{color:var(--ink)}
.barra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}button{font:inherit;color:var(--ink);background:var(--sheet);border:1px solid var(--rule);border-radius:6px;padding:6px 12px;cursor:pointer}
section{background:var(--sheet);border:1px solid var(--rule);border-radius:8px;padding:10px;margin:12px 0}
.fila{overflow-x:auto}.ocho{display:grid;grid-template-columns:repeat(8,minmax(104px,1fr));gap:5px}
figure{margin:0}figure svg{display:block;width:100%;height:auto;background:var(--fondo);border-radius:5px}figcaption{font-size:.72rem;color:var(--ink-soft);text-align:center}
.regla svg{display:block;height:330px;width:auto;max-width:none}.regla.baja svg{height:250px}
`;
const js = `document.getElementById('tema').addEventListener('click',()=>{const r=document.documentElement;const o=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=o?'light':'dark';});`;
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visualizador: prueba de niños, arrugas y cuerpos</title><style>${css}</style></head>
<body><main><div class="barra"><h1>Visualizador: prueba de niños, arrugas y cuerpos</h1><button id="tema" type="button">Tema claro / oscuro</button></div>
<p>Una persona de cada sexo de una partida (semilla ${semilla}), a los ${EDADES.join(', ')} años: arriba la <b>versión actual</b> y debajo la <b>prueba</b>. Los dos van afeitados y con su peinado de siempre: solo cambia lo de la prueba. En el móvil, cada fila se desliza de lado.</p>
<ul>
<li><b>1. Niños:</b> cara más redonda y con mofletes (rubor), ojos mayores y más bajos, nariz pequeña y chata sin puente marcado, boca más pequeña, cejas más finas, mandíbula sin marcar, cuello corto, brazos y piernas más cortos, barriga y sin cintura. Todo se pierde poco a poco hasta los 15 años (con el adelanto o retraso de cada uno).</li>
<li><b>2. Arrugas:</b> empiezan antes (a los 30 ya asoman el surco de la nariz a la boca y una pata de gallo) y cada una aparece a su tiempo y se alarga y se marca: bolsas, entrecejo, frente (una línea y luego tres), comisuras, mejilla, mandíbula y cuello.</li>
<li><b>3. Cuerpos:</b> hombros más anchos en el hombre; cintura más estrecha y alta, caderas y pecho en la mujer; pectorales con el músculo y barriga con la grasa; brazos con hombro y antebrazo; <b>manos con dedos</b>.</li>
</ul>
${bloques.join('')}</main><script>${js}</script></body></html>`;
const destino = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/retratos/prueba.html');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, html);
console.log(`Prueba: ${destino} (${(html.length / 1024).toFixed(0)} KB)`);
