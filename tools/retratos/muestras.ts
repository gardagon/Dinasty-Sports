/**
 * MUESTRAS DE ESTILO del visualizador (etapa 2a de `docs/PLAN_VISUALIZADOR.md`): `npm run retratos:muestras [semilla]` genera `docs/muestras/retratos.html`, una página
 * autónoma (sin recursos externos) con las variantes de estilo dibujadas con personas reales de una partida de semilla fija, para que el usuario elija.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describirApariencia, RASGOS_DE_ROSTRO, rostroExpresado } from '@ds/contracts';
import { cuerpoALaEdad, leerMuestra, type PersonaDeMuestra } from './datos';
import { dibujar, ESTILOS, type Estilo } from './dibujo';
import { parametrosDe } from './parametros';

const semilla = Number(process.argv[2] ?? 31);
const EDADES = [8, 15, 30, 70];
const datos = leerMuestra(semilla);
const personas = [datos.personaje, datos.chica, datos.adulto];
const familia = [datos.padre, datos.personaje, datos.madre];

let cuenta = 0;
const NOMBRE_DE_COMPLEXION: Record<string, string> = { delgado: 'delgado', normal: 'normal', atletico: 'atlético', musculado: 'musculado', con_sobrepeso: 'con sobrepeso' };

function parametros(per: PersonaDeMuestra, edad: number) {
  const c = cuerpoALaEdad(per.cuerpo, edad, per.edadHoy);
  return { c, P: parametrosDe(per.cuerpo, edad, { musculo: c.musculo, grasa: c.grasa, altura: c.altura }) };
}

function retrato(per: PersonaDeMuestra, edad: number, E: Estilo, pie: string, clave: string): string {
  const { P } = parametros(per, edad);
  const d = dibujar(P, E, `r${(cuenta++).toString(36)}_`);
  const [x, y, w, h] = d.retrato;
  return `<figure class="retrato" data-clave="${clave}" data-estilo="${E.nombre}"><svg viewBox="${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}" role="img" aria-label="${per.nombre}, ${edad} años, estilo ${E.nombre}"><defs>${d.defs}</defs>${d.cuerpo}</svg><figcaption>${pie}</figcaption></figure>`;
}

function figuras(E: Estilo): string {
  const SUELO = 200, PASO = 62, X0 = 52;
  const o: string[] = [];
  const defs: string[] = [];
  // La regla: una marca cada 10 cm y un número cada 50.
  for (let cm = 0; cm <= 200; cm += 10) {
    const y = SUELO - cm, grande = cm % 50 === 0;
    o.push(`<line x1="${grande ? 8 : 13}" y1="${y}" x2="18" y2="${y}" class="marca"/>`);
    if (grande) o.push(`<line x1="18" y1="${y}" x2="${X0 + PASO * 2 + 34}" y2="${y}" class="guia"/><text x="6.5" y="${y + 2}" text-anchor="end" class="cifra">${cm}</text>`);
  }
  o.push(`<line x1="18" y1="0" x2="18" y2="${SUELO}" class="marca"/><text x="6.5" y="-6" text-anchor="end" class="cifra">cm</text>`);
  personas.forEach((per, i) => {
    const { c, P } = parametros(per, 30);
    const d = dibujar(P, E, `f${(cuenta++).toString(36)}_`);
    const x = X0 + PASO * i;
    defs.push(d.defs);
    o.push(`<g transform="translate(${x},${(SUELO - c.altura).toFixed(2)})">${d.cuerpo}</g>`);
    o.push(`<line x1="${x - 16}" y1="${(SUELO - c.altura).toFixed(2)}" x2="${x + 16}" y2="${(SUELO - c.altura).toFixed(2)}" class="tope"/>`);
    o.push(`<text x="${x}" y="${SUELO + 9}" text-anchor="middle" class="rotulo">${per.papel}</text><text x="${x}" y="${SUELO + 16}" text-anchor="middle" class="cifra">${c.altura.toFixed(0)} cm · ${c.peso.toFixed(0)} kg · ${NOMBRE_DE_COMPLEXION[c.complexion] ?? c.complexion}</text>`);
  });
  return `<figure class="figuras"><svg viewBox="-12 -24 ${X0 + PASO * 2 + 50} ${SUELO + 46}" role="img" aria-label="Figura entera a escala, estilo ${E.nombre}"><defs>${defs.join('')}</defs>${o.join('')}</svg><figcaption>Figura entera a escala: los tres a los 30 años junto a una regla.</figcaption></figure>`;
}

function variante(E: Estilo): string {
  const filas = personas.map((per, i) => `<div class="fila"><h4>${per.papel}${per.nombre !== per.papel ? ` · ${per.nombre}` : ''}</h4><div class="cuatro">${EDADES.map((e) => retrato(per, e, E, `${e} años`, `p${i}e${e}`)).join('')}</div></div>`).join('');
  const fam = `<div class="fila"><h4>Parecido familiar: los tres a los 30 años</h4><div class="tres">${familia.map((per, i) => retrato(per, 30, E, per.papel === 'El personaje' ? 'El personaje' : per.papel, `f${i}`)).join('')}</div></div>`;
  return `<section class="variante" id="${E.id}"><header><h3>${E.nombre}</h3><p>${E.resumen}</p></header>${filas}${fam}${figuras(E)}</section>`;
}

function ficha(per: PersonaDeMuestra): string {
  const a = per.cuerpo.apariencia;
  const r = rostroExpresado(a);
  const hoy = cuerpoALaEdad(per.cuerpo, per.edadHoy, per.edadHoy);
  const extra = [`canas desde los ${a.canas.toFixed(0)} años`, `calvicie ${a.calvicie.toFixed(2)}`, ...(per.cuerpo.sexo === 'm' ? [`barba ${a.barba.toFixed(2)}`] : [])].join(', ');
  return `<li><strong>${per.papel}</strong>${per.nombre !== per.papel ? ` (${per.nombre})` : ''}: ${per.cuerpo.sexo === 'f' ? 'mujer' : 'hombre'}, ${Math.floor(per.edadHoy)} años hoy, ${hoy.altura.toFixed(0)} cm (de adulto, ${per.cuerpo.alturaAdulta.toFixed(0)} cm), ${NOMBRE_DE_COMPLEXION[hoy.complexion]}. ${describirApariencia(a)[0].toUpperCase() + describirApariencia(a).slice(1)}; ${extra}. <span class="rasgos">Rasgos de la cara (0 a 1): ${RASGOS_DE_ROSTRO.map((k) => `${k} ${r[k].toFixed(2)}`).join(' · ')}</span></li>`;
}

const css = `
:root{color-scheme:light;--paper:#eef2f7;--sheet:#f9fbfd;--ink:#17233d;--ink-soft:#55627a;--rule:#c9d3e0;--lane:#2f63c9;--lane-soft:#d6e2f7;--fondo:#e3eaf4}
@media (prefers-color-scheme:dark){:root:not([data-theme='light']){color-scheme:dark;--paper:#121a2b;--sheet:#18223a;--ink:#e6ecf6;--ink-soft:#9aa8c0;--rule:#2b3852;--lane:#6f9bf0;--lane-soft:#23345a;--fondo:#222e49}}
:root[data-theme='dark']{color-scheme:dark;--paper:#121a2b;--sheet:#18223a;--ink:#e6ecf6;--ink-soft:#9aa8c0;--rule:#2b3852;--lane:#6f9bf0;--lane-soft:#23345a;--fondo:#222e49}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif}
main{max-width:1500px;margin:0 auto;padding:16px}
h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.15rem;margin:22px 0 8px}h3{font-size:1.2rem;margin:0}h4{font-size:.82rem;margin:10px 0 5px;color:var(--ink-soft);font-weight:600}
p{margin:4px 0}.nota{color:var(--ink-soft);font-size:.88rem}
.barra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:6px}
button{font:inherit;color:var(--ink);background:var(--sheet);border:1px solid var(--rule);border-radius:6px;padding:6px 12px;cursor:pointer}
nav{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}nav a{color:var(--lane);text-decoration:none;border:1px solid var(--rule);border-radius:999px;padding:3px 11px;background:var(--sheet);font-size:.88rem}
ul.personas{padding-left:18px;margin:6px 0;font-size:.88rem}ul.personas li{margin:4px 0}.rasgos{color:var(--ink-soft);font-size:.78rem;display:block}
.variantes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr));gap:14px}
.variante{background:var(--sheet);border:1px solid var(--rule);border-radius:8px;padding:12px}
.variante header p{color:var(--ink-soft);font-size:.86rem;min-height:2.6em}
.cuatro{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.tres{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:78%}
figure{margin:0}.retrato{cursor:zoom-in}.retrato svg,.figuras svg{display:block;width:100%;height:auto;background:var(--fondo);border-radius:6px}
figcaption{font-size:.74rem;color:var(--ink-soft);text-align:center;padding-top:2px}
.figuras{margin-top:12px}.figuras svg{background:var(--sheet);border:1px solid var(--rule)}
.marca{stroke:var(--ink-soft);stroke-width:.5}.guia{stroke:var(--rule);stroke-width:.4;stroke-dasharray:2 2}.tope{stroke:var(--lane);stroke-width:.5;stroke-dasharray:1.5 1.5}
.cifra{fill:var(--ink-soft);font:5.2px system-ui,sans-serif}.rotulo{fill:var(--ink);font:600 5.6px system-ui,sans-serif}
dialog{border:1px solid var(--rule);border-radius:10px;background:var(--sheet);color:var(--ink);padding:12px;width:min(96vw,1100px);max-height:96vh}
dialog::backdrop{background:rgba(8,12,22,.7)}
.compara{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media (max-width:700px){.compara{grid-template-columns:repeat(2,1fr)}}
.compara figure{cursor:default}.compara figcaption{font-size:.85rem;color:var(--ink)}
`;

const js = `
const raiz=document.documentElement;
document.getElementById('tema').addEventListener('click',()=>{const oscuro=raiz.dataset.theme?raiz.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;raiz.dataset.theme=oscuro?'light':'dark';});
const dlg=document.getElementById('lupa'),caja=dlg.querySelector('.compara');
document.addEventListener('click',(e)=>{const f=e.target.closest('.variante .retrato');if(!f)return;caja.innerHTML='';document.querySelectorAll('.variante .retrato[data-clave="'+f.dataset.clave+'"]').forEach((x)=>{const c=x.cloneNode(true);c.querySelector('figcaption').textContent=x.dataset.estilo+' · '+x.querySelector('figcaption').textContent;caja.appendChild(c);});dlg.showModal();});
dlg.addEventListener('click',(e)=>{if(e.target===dlg||e.target.closest('button'))dlg.close();});
`;

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visualizador de personas: muestras de estilo</title><style>${css}</style></head>
<body><main>
<div class="barra"><h1>Visualizador de personas: muestras de estilo</h1><button id="tema" type="button">Tema claro / oscuro</button></div>
<p>Etapa 2a del plan del visualizador: ${ESTILOS.length} variantes de estilo vectorial con volumen, con detalle alto en las caras, para elegir una. Todo está dibujado por código (SVG, sin imágenes) con <strong>personas reales de una partida</strong> (semilla ${semilla}).</p>
<p class="nota">Toca un retrato para ver a esa persona a esa edad en las ${ESTILOS.length} variantes, una al lado de otra. La altura sale de la curva de crecimiento de cada persona; el músculo y la grasa, de su historial (sin historial o en edades futuras, los de hoy). El peinado y la barba se eligen solos con la semilla de la persona, el sexo, la edad, el tipo de pelo y la calvicie; son provisionales (pocos modelos) y son los mismos en las cuatro variantes: lo que se compara es el estilo.</p>
<h2>Las personas</h2>
<ul class="personas">${[...personas, datos.padre, datos.madre].map(ficha).join('')}</ul>
<nav>${ESTILOS.map((e) => `<a href="#${e.id}">${e.nombre}</a>`).join('')}</nav>
<div class="variantes">${ESTILOS.map(variante).join('')}</div>
<dialog id="lupa"><div class="barra"><strong>La misma persona en las ${ESTILOS.length} variantes</strong><button type="button">Cerrar</button></div><div class="compara"></div></dialog>
</main><script>${js}</script></body></html>
`;

const destino = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/muestras/retratos.html');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, html);
console.log(`Muestras de estilo (semilla ${semilla}): ${destino} (${(html.length / 1024).toFixed(0)} KB)`);
for (const per of [...personas, datos.padre, datos.madre]) console.log(`  ${per.papel}: ${per.nombre} (${per.cuerpo.id})`);
