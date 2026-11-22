import { empaquetarRostro, RASGOS_DE_ROSTRO, type Apariencia, type CuerpoDePersona, type Rostro } from '@ds/contracts';
import { retratoSvg } from '@ds/retrato';

/**
 * Página de prueba del retrato en Samsung Internet con su modo oscuro (`?prueba-retrato`; sin enlace desde ningún menú). Enseña el MISMO retrato de varias
 * formas para ver cuáles reajusta el navegador y cuáles no. Notas: `docs/relevo/retrato-samsung.md`.
 */

const rostro = empaquetarRostro(Object.fromEntries(RASGOS_DE_ROSTRO.map((k) => [k, [0.5, 0.5]])) as unknown as Rostro);
const apariencia: Apariencia = { peloColor: 'castano', peloTipo: 'ondulado', ojos: 'marron', piel: 'media', cara: 'ovalada', distintivos: [], canas: 0, calvicie: 0, barba: 0, rostro, envejecimiento: 0.5 };
const persona: CuerpoDePersona = { id: 'prueba', sexo: 'f', nacimiento: 0, alturaAdulta: 165, madurez: 0, musculo: 40, grasa: 35, metabolismo: 0, musculatura: 0, historial: [], semilla: 77, apariencia };
const EDAD = 16;

/** El SVG con tamaño propio (un `<img>` o un lienzo lo necesitan; el del juego solo trae viewBox). */
function svgConTamano(ancho: number): { texto: string; ancho: number; alto: number } {
  const svg = retratoSvg(persona, EDAD);
  const [, , w, h] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 1 1').split(' ').map(Number) as [number, number, number, number];
  const alto = Math.round((ancho * h) / w);
  return { texto: svg.replace('<svg ', `<svg width="${ancho}" height="${alto}" `), ancho, alto };
}

const dpr = (): number => Math.max(1, Math.min(3, window.devicePixelRatio || 1));
const TAM = 180;

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => mal(new Error('no carga'));
    i.src = url;
  });
}

/** Dibuja el SVG en un lienzo con la resolución de la pantalla (`ancho * dpr` píxeles) y lo deja en `CSS ancho × alto`. */
async function lienzoDesdeSvg(): Promise<HTMLCanvasElement> {
  const { texto, ancho, alto } = svgConTamano(TAM);
  const k = dpr();
  const img = await cargarImagen(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(texto)}`);
  const c = document.createElement('canvas');
  c.width = Math.round(ancho * k);
  c.height = Math.round(alto * k);
  c.style.width = `${ancho}px`;
  c.style.height = `${alto}px`;
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

interface Variante { id: string; nombre: string; nota: string; fondo?: string; poner: (caja: HTMLElement) => void | Promise<void> }

const VARIANTES: Variante[] = [
  { id: 'A', nombre: 'A · SVG en línea', nota: 'Como está ahora en el juego.', poner: (c) => { c.innerHTML = svgConTamano(TAM).texto; } },
  { id: 'B', nombre: 'B · <img> con SVG (data URL)', nota: 'El SVG como imagen: sin DOM propio.', poner: (c) => {
    const i = new Image(); i.alt = 'retrato'; i.width = TAM; i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgConTamano(TAM).texto)}`; c.append(i);
  } },
  { id: 'B2', nombre: 'B2 · <img> con SVG (Blob)', nota: 'Igual, con una dirección blob:.', poner: (c) => {
    const i = new Image(); i.alt = 'retrato'; i.width = TAM; i.src = URL.createObjectURL(new Blob([svgConTamano(TAM).texto], { type: 'image/svg+xml' })); c.append(i);
  } },
  { id: 'C', nombre: 'C · <canvas> desde el SVG', nota: 'Dibujado a la resolución de la pantalla.', poner: async (c) => { c.append(await lienzoDesdeSvg()); } },
  { id: 'D', nombre: 'D · PNG generado (data URL)', nota: 'Un lienzo pasado a PNG y puesto en un <img>.', poner: async (c) => {
    const l = await lienzoDesdeSvg(); const i = new Image(); i.alt = 'retrato'; i.style.width = l.style.width; i.style.height = l.style.height; i.src = l.toDataURL('image/png'); c.append(i);
  } },
  { id: 'D2', nombre: 'D2 · PNG generado (Blob)', nota: 'Igual, con blob: en lugar de data:.', poner: async (c) => {
    const l = await lienzoDesdeSvg();
    const b = await new Promise<Blob | null>((ok) => l.toBlob(ok, 'image/png'));
    if (!b) { c.textContent = 'no se pudo generar'; return; }
    const i = new Image(); i.alt = 'retrato'; i.style.width = l.style.width; i.style.height = l.style.height; i.src = URL.createObjectURL(b); c.append(i);
  } },
  { id: 'E', nombre: 'E · SVG en línea sobre fondo oscuro propio', nota: 'Contenedor con fondo #10131c fijo (por si no toca lo que ya es oscuro).', fondo: '#10131c', poner: (c) => { c.innerHTML = svgConTamano(TAM).texto; } },
  { id: 'F', nombre: 'F · fondo CSS (background-image)', nota: 'El SVG como imagen de fondo de un <div>.', poner: (c) => {
    const { texto, ancho, alto } = svgConTamano(TAM);
    const d = document.createElement('div'); d.style.cssText = `width:${ancho}px;height:${alto}px;background:url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(texto)}") center/contain no-repeat`; c.append(d);
  } },
  { id: 'G', nombre: 'G · SVG en línea con doble inversión', nota: 'filter: invert(1) hue-rotate(180deg) en el contenedor y de nuevo en el dibujo (se anulan si el navegador no aplica nada más).', poner: (c) => {
    c.style.filter = 'invert(1) hue-rotate(180deg)'; c.innerHTML = `<div style="filter:invert(1) hue-rotate(180deg)">${svgConTamano(TAM).texto}</div>`;
  } },
  { id: 'H', nombre: 'H · <img> con SVG dentro de <picture> y color-scheme claro', nota: 'color-scheme: light en la imagen y su contenedor.', poner: (c) => {
    c.style.colorScheme = 'light'; const p = document.createElement('picture'); const i = new Image(); i.alt = 'retrato'; i.width = TAM; i.style.colorScheme = 'light';
    i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgConTamano(TAM).texto)}`; p.append(i); c.append(p);
  } },
];

export async function paginaDePrueba(raiz: HTMLElement): Promise<void> {
  const css = `
    .pr{max-width:640px;margin:0 auto;padding:16px;font:16px/1.4 system-ui,sans-serif}
    .pr h1{font-size:22px;margin:0 0 6px}.pr p{margin:4px 0 10px}
    .pr section{border:2px solid #888;border-radius:10px;padding:10px;margin:14px 0}
    .pr h2{font-size:26px;margin:0 0 4px}
    .pr .caja{display:inline-block;padding:8px;background:#e7ecf3;border-radius:8px;min-height:60px}
    .pr .ref{display:flex;gap:6px;margin:6px 0}.pr .ref i{flex:1;height:34px;border-radius:6px}
    .pr .estado{font-size:13px;color:#888}`;
  const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const marco = (v: Variante): string => `<section><h2>${esc(v.nombre)}</h2><p>${esc(v.nota)}</p><div class="caja" id="caja-${v.id}" style="${v.fondo ? `background:${v.fondo}` : ''}"></div><div class="estado" id="estado-${v.id}"></div></section>`;
  raiz.innerHTML = `<style>${css}</style><main class="pr">
    <h1>Prueba del retrato (modo oscuro de Samsung Internet)</h1>
    <p>El mismo retrato de varias formas. Dime cuáles se ven con colores plenos y tinta oscura bien visible (pelo castaño, piel, ojos) y cuáles desvaídas o pastel.</p>
    <p><b>Referencia de colores</b> (si se ven apagados, el navegador está reajustando incluso esto):</p>
    <div class="ref"><i style="background:#8b5a2b"></i><i style="background:#d9a066"></i><i style="background:#1a1a1a"></i><i style="background:#c0392b"></i><i style="background:#2e6fdb"></i></div>
    <p class="estado">Pantalla: ${window.devicePixelRatio || 1}× · ${navigator.userAgent}</p>
    ${VARIANTES.map(marco).join('')}</main>`;
  for (const v of VARIANTES) {
    const caja = raiz.querySelector<HTMLElement>(`#caja-${v.id}`)!;
    const estado = raiz.querySelector<HTMLElement>(`#estado-${v.id}`)!;
    try { await v.poner(caja); } catch (e) { estado.textContent = `Falló: ${(e as Error).message}`; }
  }
}

/** ¿Se ha pedido la página de prueba? (`?prueba-retrato`, también `#prueba-retrato`). */
export const pidenPruebaRetrato = (): boolean => /(^|[?&#])prueba-retrato(=|&|$)/.test(location.search + location.hash);
