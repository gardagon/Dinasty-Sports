/**
 * LA CUADRÍCULA DE CAPTURAS del visualizador (`npm run retratos:cuadricula [semilla]`): personas × edades × sexos que cubren todos los valores de cada catálogo de la
 * apariencia, los extremos de cada rasgo de la cara, una familia, los peinados y el vello facial con su largo, y los casos extremos. Genera `docs/retratos/cuadricula.html`
 * y la captura con el Chromium del entorno en tema claro y oscuro (`cuadricula-claro.png`, `cuadricula-oscuro.png`). Quien cambie el dibujo o amplíe los catálogos la
 * regenera, la mira y la compara con la anterior (`docs/ANEXO_RETRATOS.md`). Con `--sin-capturas` solo escribe la página.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aparienciaHeredada, CARA, cuerpoDePersona, DISTINTIVOS, empaquetarRostro, ID_DEL_PERSONAJE, NOMBRE_RASGO, OJOS, PEINADOS, PELO_COLOR, PELO_TIPO, PIEL, RASGOS_DE_ROSTRO, rngEstable,
  SERVICES, VELLOS, type Apariencia, type CuerpoDePersona, type Look, type NpcDirectory, type Rostro,
} from '@ds/contracts';
import { nuevaPartida } from '@ds/game';
import { figurasSvg, retratoDe, retratoSvg, type FiguraEnRegla } from '@ds/retrato';

const args = process.argv.slice(2);
const semilla = Number(args.find((a) => /^\d+$/.test(a)) ?? 31);
const g = nuevaPartida({ seed: semilla });
const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
const cuerpo = (id: string): CuerpoDePersona => { const c = cuerpoDePersona(g, id); if (!c) throw new Error(`«${id}» no tiene cuerpo.`); return c; };
const edadHoy = (c: CuerpoDePersona) => (g.time.day - c.nacimiento) / 365;

// ---- personas inventadas para cubrir los catálogos y los extremos (las de verdad salen de la partida)
const rostro = (valores: Partial<Record<(typeof RASGOS_DE_ROSTRO)[number], number>> = {}): string => empaquetarRostro(Object.fromEntries(RASGOS_DE_ROSTRO.map((k) => [k, [valores[k] ?? 0.5, 0.5]])) as unknown as Rostro);
const BASE: Apariencia = { peloColor: 'castano', peloTipo: 'ondulado', ojos: 'marron', piel: 'media', cara: 'ovalada', distintivos: [], canas: 38, calvicie: 0.1, barba: 0.7, rostro: rostro() };
let cuenta = 0;
function inventada(sexo: 'f' | 'm', a: Partial<Apariencia> = {}, c: Partial<CuerpoDePersona> = {}): CuerpoDePersona {
  return { id: `inventada_${cuenta++}`, sexo, nacimiento: 0, alturaAdulta: sexo === 'f' ? 163 : 176, madurez: 0, musculo: 30, grasa: 40, metabolismo: 0, musculatura: 0, historial: [], semilla: 1000 + cuenta, ...c, apariencia: { ...BASE, ...a } };
}

const celda = (svg: string, pie: string) => `<figure>${svg}<figcaption>${pie}</figcaption></figure>`;
const ret = (c: CuerpoDePersona, edad: number, pie: string, look?: Partial<Look>) => celda(retratoSvg(c, edad, { look }), pie);
const seccion = (titulo: string, nota: string, contenido: string, clase = '') => `<section><h2>${titulo}</h2>${nota ? `<p>${nota}</p>` : ''}<div class="rejilla ${clase}">${contenido}</div></section>`;
const figuras = (fs: FiguraEnRegla[]) => `<div class="regla">${figurasSvg(fs)}</div>`;
const EDADES = [1, 3, 8, 12, 15, 18, 30, 50, 70, 95];
const secciones: string[] = [];

// ---- 1. Personas de la partida a todas las edades (el músculo y la grasa, de su historial o de hoy)
const chica = dir.list({ role: 'companero' }).find((x) => x.gender === 'f' && x.id.startsWith('clase_'))!;
const adultos = [...dir.list({ role: 'profesor' }), ...dir.list({ role: 'entrenador' }), ...dir.list({ role: 'vecino' })].filter((x) => { const c = cuerpoDePersona(g, x.id); return c && edadHoy(c) >= 30; });
const hombre = adultos.filter((x) => x.gender === 'm').sort((a, b) => cuerpo(b.id).apariencia.calvicie - cuerpo(a.id).apariencia.calvicie)[0];
const mujer = adultos.filter((x) => x.gender === 'f')[0];
const reales: [string, CuerpoDePersona][] = [['El personaje', cuerpo(ID_DEL_PERSONAJE)], [chica.name, cuerpo(chica.id)], [hombre.name, cuerpo(hombre.id)], [mujer.name, cuerpo(mujer.id)]];
secciones.push(seccion('1. Personas de la partida, de la cuna a los 95', `Semilla ${semilla}. Se debe reconocer a la misma persona a todas las edades.`, reales.map(([nombre, c]) => EDADES.map((e) => celda(retratoDe(c, e, edadHoy(c)), `${nombre.split(' ')[0]} · ${e}`)).join('')).join(''), 'diez'));

// ---- 2. Una familia: padres, hijos y un nieto (el parecido)
const padre = cuerpo('padre'), madre = cuerpo('madre'), yo = cuerpo(ID_DEL_PERSONAJE);
const hermanos = dir.list({ role: 'familia' }).filter((x) => x.tags.includes('hermano')).map((x) => cuerpo(x.id));
const pareja = cuerpo(mujer.id);
const nieto: CuerpoDePersona = { ...inventada('m'), semilla: 4242, alturaAdulta: 174, apariencia: aparienciaHeredada(yo.apariencia, pareja.apariencia, rngEstable('cuadricula', semilla, 'nieto'), 'm') };
secciones.push(seccion('2. Una familia, todos a los 30 años', 'El padre y la madre; sus hijos (el personaje y sus hermanos); la pareja del personaje (una mujer de la partida) y su hijo, el nieto. Los rasgos de la cara son heredados.',
  [ret(padre, 30, 'Padre'), ret(madre, 30, 'Madre'), ret(yo, 30, 'El personaje'), ...hermanos.map((h, i) => ret(h, 30, `Hermano ${i + 1}`)), ret(pareja, 30, 'Su pareja'), ret(nieto, 30, 'El nieto'), ret(nieto, 8, 'El nieto · 8'), ret(yo, 8, 'El personaje · 8'), ret(padre, 70, 'Padre · 70'), ret(madre, 70, 'Madre · 70')].join(''), 'diez'));

// ---- 3. Todos los valores de cada catálogo de la apariencia, en los dos sexos
const catalogo = (titulo: string, campo: keyof Apariencia, valores: readonly string[], extra: Partial<Apariencia> = {}, look?: Partial<Look>) =>
  secciones.push(seccion(titulo, '', (['f', 'm'] as const).map((s) => valores.map((v) => ret(inventada(s, { ...extra, [campo]: campo === 'distintivos' ? [v] : v }, { semilla: 77 }), 30, `${NOMBRE_RASGO[v] ?? v}`, look)).join('')).join(''), 'seis'));
catalogo('3a. Piel', 'piel', PIEL);
catalogo('3b. Color del pelo', 'peloColor', PELO_COLOR);
catalogo('3c. Tipo de pelo', 'peloTipo', PELO_TIPO);
catalogo('3d. Ojos', 'ojos', OJOS, { piel: 'clara' });
catalogo('3e. Forma de la cara', 'cara', CARA, {}, { peinado: 'coleta', vello: 'afeitado' });
catalogo('3f. Distintivos', 'distintivos', DISTINTIVOS, { piel: 'clara' });

// ---- 4. Los extremos de cada rasgo de la cara (0 y 1; el resto a 0,5)
secciones.push(seccion('4. Rasgos de la cara: 0 y 1', 'Cada pareja es el mismo rasgo a 0 y a 1, en una mujer y en un hombre.',
  RASGOS_DE_ROSTRO.map((k) => (['f', 'm'] as const).map((s) => [0, 1].map((v) => ret(inventada(s, { rostro: rostro({ [k]: v }) }, { semilla: 77 }), 30, `${k} ${v}`, { peinado: s === 'f' ? 'coleta' : 'corto', vello: 'afeitado' })).join('')).join('')).join(''), 'ocho'));

// ---- 5. Peinados: cada estilo con cada tipo de pelo, y el pelo que crece
secciones.push(seccion('5a. Peinados × tipo de pelo (recién hechos)', '', (['f', 'm'] as const).map((s) => PEINADOS.map((e) => PELO_TIPO.map((t) => ret(inventada(s, { peloTipo: t }, { semilla: 77 }), 30, `${e.nombre} · ${NOMBRE_RASGO[t]}`, { peinado: e.id, largoDelPelo: e.largo, vello: 'afeitado' })).join('')).join('')).join(''), 'ocho'));
secciones.push(seccion('5b. Un corte que crece', 'Corto y flequillo con 0, 3, 6, 12, 20 y 35 cm de más, en pelo liso y rizado.',
  ['corto', 'flequillo'].map((e) => ['liso', 'rizado'].map((t) => [0, 3, 6, 12, 20, 35].map((mas) => ret(inventada('m', { peloTipo: t }, { semilla: 77 }), 30, `${e} +${mas} cm`, { peinado: e, largoDelPelo: PEINADOS.find((x) => x.id === e)!.largo + mas, vello: 'afeitado' })).join('')).join('')).join(''), 'seis'));

// ---- 6. Vello facial: cada estilo, el largo y la densidad
secciones.push(seccion('6a. Estilos de vello facial (recién hechos), con densidad alta y con la mínima', '', [0.95, 0].map((d) => VELLOS.map((e) => ret(inventada('m', { barba: Math.max(d, e.densidadMinima), peloColor: 'castano_oscuro' }, { semilla: 77 }), 35, `${e.nombre}`, { vello: e.id, largoDelVello: e.largo, peinado: 'corto' })).join('')).join(''), 'seis'));
secciones.push(seccion('6b. La barba que crece', 'Sin afeitarse (0, 1, 3, 8, 20 y 50 mm), la perilla y el bigote; y barba 0 y 1 a los 14, 16, 18 y 30 años.',
  [...['afeitado', 'perilla', 'bigote'].map((e) => [0, 1, 3, 8, 20, 50].map((mm) => ret(inventada('m', { barba: 0.8, peloColor: 'negro', piel: 'clara' }, { semilla: 77 }), 35, `${e} ${mm} mm`, { vello: e, largoDelVello: mm, peinado: 'corto' })).join('')),
    [0, 1].map((d) => [14, 16, 18].map((e) => ret(inventada('m', { barba: d, peloColor: 'negro' }, { semilla: 77 }), e, `barba ${d} · ${e} años`, { vello: 'barba_corta', peinado: 'corto' })).join('')).join('')].join(''), 'seis'));

// ---- 7. Casos extremos
secciones.push(seccion('7a. Calvicie máxima y canas a los 20', 'Calvicie 1 (hombre) y 0,4 (mujer, el máximo) a los 20, 25, 30, 40, 55 y 75; canas desde los 20.',
  [(['m', 'f'] as const).map((s) => [20, 25, 30, 40, 55, 75].map((e) => ret(inventada(s, { calvicie: s === 'm' ? 1 : 0.4, peloColor: 'castano_oscuro' }, { semilla: 78 }), e, `calvicie · ${e}`, { peinado: s === 'm' ? 'corto' : 'melena' })).join('')).join(''),
    (['m', 'f'] as const).map((s) => [20, 25, 30, 40, 55, 75].map((e) => ret(inventada(s, { canas: 20, peloColor: 'negro' }, { semilla: 79 }), e, `canas · ${e}`, { vello: 'barba_corta' })).join('')).join('')].join(''), 'seis'));
const tipos: [string, Partial<CuerpoDePersona>][] = [['delgado', { musculo: 18, grasa: 20 }], ['normal', {}], ['atlético', { musculo: 45, grasa: 35 }], ['musculado', { musculo: 85, grasa: 30 }], ['con sobrepeso', { musculo: 25, grasa: 80 }], ['muy alto', { alturaAdulta: 205 }], ['muy bajo', { alturaAdulta: 148 }]];
secciones.push(`<section><h2>7b. Complexión y altura (figura entera a escala)</h2>${(['m', 'f'] as const).map((s) => figuras(tipos.map(([nombre, c]) => ({ cuerpo: inventada(s, {}, { semilla: 77, ...c }), edad: 30, opciones: { look: { peinado: s === 'm' ? 'corto' : 'melena', vello: 'afeitado' } }, rotulo: nombre })))).join('')}
${figuras(tipos.slice(0, 5).map(([nombre, c]) => ({ cuerpo: inventada('m', {}, { semilla: 77, ...c }), edad: 9, rotulo: `${nombre} · 9` })))}</section>`);
secciones.push(`<section><h2>7c. La evolución: de la cuna a los 95 (figura entera a escala)</h2>${reales.slice(0, 3).map(([, c]) => figuras([1, 3, 8, 12, 15, 18, 30, 50, 70, 95].map((e) => ({ cuerpo: c, edad: e, rotulo: `${e}` })))).join('')}</section>`);

const css = `
:root{color-scheme:light;--paper:#eef2f7;--sheet:#f9fbfd;--ink:#17233d;--ink-soft:#55627a;--rule:#c9d3e0;--fondo:#dfe7f2}
:root[data-theme='dark']{color-scheme:dark;--paper:#121a2b;--sheet:#18223a;--ink:#e6ecf6;--ink-soft:#9aa8c0;--rule:#2b3852;--fondo:#222e49}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:13px/1.4 system-ui,sans-serif}main{width:1280px;margin:0 auto;padding:14px}
h1{font-size:1.3rem;margin:0 0 4px}h2{font-size:1rem;margin:0 0 4px}p{margin:0 0 6px;color:var(--ink-soft)}
section{background:var(--sheet);border:1px solid var(--rule);border-radius:8px;padding:10px;margin:10px 0}
.rejilla{display:grid;gap:5px}.diez{grid-template-columns:repeat(10,1fr)}.ocho{grid-template-columns:repeat(8,1fr)}.seis{grid-template-columns:repeat(6,1fr)}
figure{margin:0}figure svg{display:block;width:100%;height:auto;background:var(--fondo);border-radius:5px}figcaption{font-size:.68rem;color:var(--ink-soft);text-align:center}
.regla svg{display:block;width:100%;height:auto;max-height:520px}
`;
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visualizador de personas: cuadrícula</title><style>${css}</style></head>
<body><main><h1>Visualizador de personas: cuadrícula de referencia</h1><p>Generada con <code>npm run retratos:cuadricula</code> (semilla ${semilla}). Para ver el tema oscuro: <code>document.documentElement.dataset.theme = 'dark'</code>.</p>${secciones.join('')}</main></body></html>`;

const carpeta = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/retratos');
mkdirSync(carpeta, { recursive: true });
writeFileSync(resolve(carpeta, 'cuadricula.html'), html);
console.log(`Cuadrícula: ${resolve(carpeta, 'cuadricula.html')} (${(html.length / 1024).toFixed(0)} KB)`);

if (!args.includes('--sin-capturas')) {
  const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<any> } };
  const navegador = await chromium.launch();
  for (const tema of ['claro', 'oscuro']) {
    const pagina = await navegador.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 1 });
    await pagina.goto(`file://${resolve(carpeta, 'cuadricula.html')}`);
    if (tema === 'oscuro') await pagina.evaluate("document.documentElement.dataset.theme = 'dark'");
    await pagina.screenshot({ path: resolve(carpeta, `cuadricula-${tema}.png`), fullPage: true });
    // Además, cada sección por separado (para mirarlas de cerca), fuera del repositorio si se pide con --secciones=carpeta.
    const destino = args.find((a) => a.startsWith('--secciones='))?.slice(12);
    if (destino && tema === 'claro') { const ss = pagina.locator('section'); for (let i = 0; i < (await ss.count()); i++) await ss.nth(i).screenshot({ path: resolve(destino, `s${i}.png`) }); }
    await pagina.close();
    console.log(`  captura: ${resolve(carpeta, `cuadricula-${tema}.png`)}`);
  }
  await navegador.close();
}
