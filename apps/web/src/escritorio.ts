import './escritorio.css';
import { GEN, ID_DEL_PERSONAJE, SERVICES, deportePrincipal, type ClubDirectory, type DeporteView, type IdentityService, type LogTable } from '@ds/contracts';
import type { Game } from '@ds/core';
import { deportesDe } from './deporte';
import { viewRetrato } from './retrato';

/**
 * Composición para pantallas anchas (DISEÑO DE ESCRITORIO A, decidido el 23/11: `docs/DECISIONES.md`). No dibuja nada nuevo de la partida: coloca de otra
 * forma las mismas funciones `view*` de `main.ts` (que le llegan en `Vistas`) y añade dos resúmenes pequeños (el personaje y el deporte) hechos solo con
 * datos que ya publican los módulos. Por defecto («Automático») se usa desde 1280 px de ancho; por debajo, o con «Móvil», no pasa por aquí.
 *
 *  - **A · Tres columnas** (el diseño): barra del día arriba, siempre visible; a la izquierda una columna de piezas (personaje, dinero, pendientes, planes,
 *    deporte: `PIEZAS_IZQUIERDA`, se añade una pieza —comida, inventario…— con una línea); la pestaña elegida en el centro; el diario reciente a la derecha.
 *  - B (dos pestañas a la vez) y C (un panel con todo a la vista) se probaron como prototipos y **ya no se ofrecen en Opciones**: su código sigue aquí detrás de
 *    `OFRECER_PROTOTIPOS`, por si se retoman (C podría ser la pestaña de inicio de A).
 */

export type Diseno = 'automatico' | 'escritorio' | 'movil';
export type Prototipo = 'a' | 'b' | 'c';
export const DISENOS: readonly { id: Diseno; nombre: string }[] = [
  { id: 'automatico', nombre: 'Automático (escritorio desde 1280 px)' },
  { id: 'escritorio', nombre: 'Escritorio (siempre, si cabe)' },
  { id: 'movil', nombre: 'Móvil (la disposición de siempre)' },
];
/** Si Opciones ofrece, además del diseño A, los prototipos B y C (apagado: solo A). */
export const OFRECER_PROTOTIPOS = false;
export const PROTOTIPOS: readonly { id: Prototipo; nombre: string }[] = [
  { id: 'a', nombre: 'A · Tres columnas' },
  { id: 'b', nombre: 'B · Dos pestañas a la vez' },
  { id: 'c', nombre: 'C · Panel' },
];
/** Ancho (px) desde el que «Automático» usa la composición de escritorio, y mínimo para «Escritorio». */
export const ANCHO_AUTOMATICO = 1280;
const ANCHO_MINIMO = 1000;

const CLAVE_DISENO = 'ds.diseno';
const CLAVE_PROTOTIPO = 'ds.prototipo';

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function escribir(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: la elección dura hasta recargar */
  }
}

let diseno: Diseno = (DISENOS.find((d) => d.id === leer(CLAVE_DISENO))?.id ?? 'automatico') as Diseno;
/** Sin `OFRECER_PROTOTIPOS` siempre es el A (lo que se hubiera guardado de las pruebas no cuenta). */
let prototipo: Prototipo = OFRECER_PROTOTIPOS ? ((PROTOTIPOS.find((p) => p.id === leer(CLAVE_PROTOTIPO))?.id ?? 'a') as Prototipo) : 'a';

export const disenoActual = (): Diseno => diseno;
export const prototipoActual = (): Prototipo => prototipo;

/** ¿Se usa ahora la composición de escritorio? Con «Móvil» nunca; con «Automático» desde 1280 px; con «Escritorio» desde 1000 px. */
export function usaEscritorio(): boolean {
  return disenoParaAncho(diseno, typeof window === 'undefined' ? 0 : window.innerWidth);
}

/** Qué diseño toca con un ancho: «Móvil» nunca escritorio; «Automático» desde 1280 px; «Escritorio» desde 1000 px. */
export function disenoParaAncho(d: Diseno, ancho: number): boolean {
  if (d === 'movil') return false;
  return ancho >= (d === 'automatico' ? ANCHO_AUTOMATICO : ANCHO_MINIMO);
}

/** El atributo `data-esc` de la página dice si se usa el escritorio (para el CSS de las pantallas de fuera de la partida: menú y opciones). */
export function marcarEscritorio(): void {
  if (typeof document !== 'undefined') document.documentElement.toggleAttribute('data-esc', usaEscritorio());
}

/** Avisa cuando la ventana cruza el ancho en que cambia el diseño (para volver a dibujar). */
export function vigilarAncho(redibujar: () => void): void {
  let antes = usaEscritorio();
  marcarEscritorio();
  window.addEventListener('resize', () => {
    const ahora = usaEscritorio();
    if (ahora !== antes) {
      antes = ahora;
      marcarEscritorio();
      redibujar();
    }
  });
}

/** Los dos selectores de Opciones: el diseño y el prototipo de escritorio. */
export function viewOpcionesDeDiseno(): string {
  const lista = (id: string, xs: readonly { id: string; nombre: string }[], actual: string) =>
    `<select id="${id}">${xs.map((x) => `<option value="${x.id}"${x.id === actual ? ' selected' : ''}>${x.nombre}</option>`).join('')}</select>`;
  return `<h3>Diseño</h3>
    <p><label>Diseño ${lista('diseno-modo', DISENOS, diseno)}</label></p>
    ${OFRECER_PROTOTIPOS ? `<p><label>Prototipo de escritorio ${lista('diseno-prototipo', PROTOTIPOS, prototipo)}</label></p>` : ''}
    <p class="note">En «Automático», desde 1280 px de ancho se usa la disposición de escritorio (tres columnas); por debajo, la de siempre.</p>`;
}

/** Atiende los cambios de esos selectores. `true` si hay que volver a dibujar. */
export function cambioEnDiseno(el: HTMLElement): boolean {
  if (!(el instanceof HTMLSelectElement)) return false;
  if (el.id === 'diseno-modo') return elegirDiseno(el.value);
  if (el.id === 'diseno-prototipo') return elegirPrototipo(el.value);
  return false;
}

/** Cambia el diseño (y lo recuerda en el navegador). `false` si el valor no es de los que hay. */
export function elegirDiseno(valor: string): boolean {
  if (!DISENOS.some((d) => d.id === valor)) return false;
  diseno = valor as Diseno;
  escribir(CLAVE_DISENO, diseno);
  marcarEscritorio();
  return true;
}

/** Cambia el prototipo; solo si se ofrecen (`OFRECER_PROTOTIPOS`). */
export function elegirPrototipo(valor: string): boolean {
  if (!OFRECER_PROTOTIPOS || !PROTOTIPOS.some((p) => p.id === valor)) return false;
  prototipo = valor as Prototipo;
  escribir(CLAVE_PROTOTIPO, prototipo);
  return true;
}

// ------------------------------------------------------------------ composición

type Vista = (g: Game) => string;
/** Las funciones que dibujan cada pieza (las de `main.ts`, `deporte.ts` y `gente.ts`). */
export interface Vistas {
  dia: Vista;
  lugar: Vista;
  resultado: () => string;
  pendientes: Vista;
  acciones: Vista;
  viaje: Vista;
  planes: Vista;
  identidad: Vista;
  personaje: Vista;
  estudios: Vista;
  deporte: Vista;
  gente: Vista;
  relaciones: Vista;
  recuerdos: Vista;
  diario: Vista;
  /** El diario con solo las últimas `max` entradas (el de la columna derecha: dibujar todo el diario en cada redibujo costaría). */
  diarioReciente: (g: Game, max: number) => string;
  pruebas: Vista;
}
export type Pestana = 'hacer' | 'personaje' | 'estudios' | 'deporte' | 'gente' | 'relaciones' | 'diario';
export interface ContextoDeEscritorio {
  tab: string;
  tabs: readonly (readonly [string, string, string?])[];
  vistas: Vistas;
}

/** El contenido de una pestaña a pantalla ancha (en el prototipo C, «Qué hacer» es el panel). */
function contenido(g: Game, id: string, c: ContextoDeEscritorio): string {
  const v = c.vistas;
  switch (id) {
    case 'hacer':
      return prototipo === 'c' ? panel(g, v) : `<div class="esc-dos">${`<div>${v.lugar(g)}${v.acciones(g)}</div>`}<div>${v.viaje(g)}${prototipo === 'a' ? '' : v.planes(g)}</div></div>`;
    case 'personaje':
      return `<div class="esc-personaje-pag">${v.identidad(g)}${v.personaje(g)}</div>`;
    case 'estudios':
      return `<div class="esc-estudios-pag">${v.estudios(g)}</div>`;
    case 'deporte':
      return `<div class="esc-deporte-pag">${v.deporte(g)}</div>`;
    case 'gente':
      return v.gente(g);
    case 'relaciones':
      return `<div class="esc-relaciones-pag">${v.relaciones(g)}</div>`;
    default:
      return `<div class="esc-dos esc-diario-pag">${v.recuerdos(g)}${v.diario(g)}${v.pruebas(g)}</div>`;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function tablaCompacta(t: LogTable, filas = 8): string {
  // Si es larga y hay una fila marcada (la del personaje), solo las de alrededor.
  let desde = 0;
  let hasta = t.rows.length;
  if (t.rows.length > filas && t.highlight !== undefined) {
    desde = Math.max(0, Math.min(t.highlight - Math.floor(filas / 2), t.rows.length - filas));
    hasta = desde + filas;
  } else if (t.rows.length > filas) hasta = filas;
  const cls = (i: number) => (t.align?.[i] === 'right' ? ' class="num"' : '');
  const head = t.header.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('');
  const rows = t.rows
    .slice(desde, hasta)
    .map((r, i) => `<tr${desde + i === t.highlight ? ' class="me"' : ''}>${r.map((x, j) => `<td${cls(j)}>${esc(x)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** El deporte que se practica (el del club al que se pertenece, o el primero activo). */
function deporteActivo(g: Game): DeporteView | undefined {
  const todos = deportesDe(g).filter((d) => !d.inactivo);
  const principal = deportePrincipal(g.service<ClubDirectory>(SERVICES.clubes), todos.map((d) => d.id));
  return todos.find((d) => d.id === principal) ?? todos[0];
}

/** Resumen del deporte: sus datos, la próxima prueba, el último partido y la clasificación alrededor del personaje. */
function resumenDeDeporte(g: Game): string {
  const d = deporteActivo(g);
  if (!d) return '';
  const t = d.temporada;
  const ultima = [...t.pruebas].reverse()[0];
  const clasificacion = d.clasificaciones[0];
  return `<section class="sheet esc-deporte-resumen">
    <h3>${esc(d.nombre)} <small>${esc(t.etiqueta)}</small></h3>
    <p class="note"><b>Próxima prueba:</b> ${esc(t.proxima)}</p>
    ${ultima ? `<p class="note"><b>Última:</b> semana ${ultima.semana} · ${esc(ultima.titulo)} · <b>${ultima.resultado ? esc(ultima.resultado) : `${ultima.posicion}º de ${ultima.total}`}</b></p>` : ''}
    <dl class="identity">${d.resumen.filter((r) => r.valor.length <= 24).slice(0, 4).map((r) => `<div><dt>${esc(r.etiqueta)}</dt><dd>${esc(r.valor)}</dd></div>`).join('')}</dl>
    ${clasificacion ? `<h4>${esc(clasificacion.titulo)}</h4>${tablaCompacta(clasificacion.tabla)}` : ''}
  </section>`;
}

/** El personaje en pequeño: su retrato y lo esencial. */
function resumenDelPersonaje(g: Game): string {
  const id = g.service<IdentityService>(SERVICES.identidad)?.view();
  const dato = (e: string, x: string) => `<div><dt>${e}</dt><dd>${x}</dd></div>`;
  return `<section class="sheet esc-yo">
    <h3>${esc(g.playerName)}</h3>
    <div class="esc-yo-cuerpo">${viewRetrato(g, ID_DEL_PERSONAJE)}
    ${id ? `<dl class="identity">${dato('Edad', `${id.age} años`)}${dato('Altura', `${Math.round(id.heightCm)} cm`)}${dato('Peso', `${Math.round(id.weightKg)} kg`)}</dl>` : ''}</div>
  </section>`;
}

const euros = (g: Game): string => `${g.stat(GEN.dinero).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`;

/** El dinero: una pieza pequeña de la columna izquierda (la barra del día ya no lo enseña en escritorio). */
function piezaDinero(g: Game): string {
  return `<section class="sheet esc-dinero" aria-label="Dinero"><h3>Dinero</h3><p class="esc-cifra">${euros(g)}</p></section>`;
}

type Pieza = (g: Game, v: Vistas) => string;
/** Las piezas de la columna izquierda, de arriba abajo. **Para añadir algo (comida, inventario…) se añade una pieza aquí**: el resto no cambia. */
export const PIEZAS_IZQUIERDA: readonly Pieza[] = [(g) => resumenDelPersonaje(g), (g) => piezaDinero(g), (g, v) => v.pendientes(g), (g, v) => v.planes(g), (g) => resumenDeDeporte(g)];

/** Una zona que se desplaza: se puede recorrer con el teclado (`tabindex`), tiene nombre para los lectores de pantalla y una clave con la que `main` conserva su posición al redibujar. */
const zona = (clave: string, clase: string, etiqueta: string): string => `class="esc-scroll ${clase}" data-esc-scroll="${esc(clave)}" tabindex="0" role="region" aria-label="${esc(etiqueta)}"`;

/** Antes de redibujar: cuánto se había desplazado cada zona (para que al pulsar una acción no salte arriba). */
export function guardarScroll(raiz: ParentNode): Record<string, number> {
  const r: Record<string, number> = {};
  raiz.querySelectorAll<HTMLElement>('[data-esc-scroll]').forEach((z) => {
    r[z.dataset.escScroll!] = z.scrollTop;
  });
  return r;
}

/** Después de redibujar: cada zona recupera su posición (una pestaña distinta tiene otra clave, así que empieza arriba). */
export function restaurarScroll(raiz: ParentNode, r: Record<string, number>): void {
  raiz.querySelectorAll<HTMLElement>('[data-esc-scroll]').forEach((z) => {
    const y = r[z.dataset.escScroll!];
    if (y) z.scrollTop = y;
  });
}

function barraDePestanas(c: ContextoDeEscritorio, activa: string, atributo: 'data-tab' | 'data-esc-tab', excluir?: string): string {
  return `<div class="tabs-wrap"><nav class="tabs" role="tablist" aria-label="Pestañas">${c.tabs
    .filter(([id]) => id !== excluir)
    .map(([id, etiqueta, inactivo]) => `<button class="tab" role="tab" aria-selected="${activa === id}" ${atributo}="${id}"${inactivo ? ` disabled title="${esc(inactivo)}"` : ''}>${etiqueta}</button>`)
    .join('')}</nav></div>`;
}

/** El prototipo C: «Qué hacer» como tablero con todo a la vista. */
function panel(g: Game, v: Vistas): string {
  return `<div class="esc-panel">
    <div class="esc-tarjeta esc-t-acciones">${v.lugar(g)}${v.pendientes(g)}${v.acciones(g)}</div>
    <div class="esc-tarjeta">${v.viaje(g)}${v.planes(g)}</div>
    <div class="esc-tarjeta">${resumenDelPersonaje(g)}${resumenDeDeporte(g)}</div>
    <div class="esc-tarjeta esc-t-gente">${v.gente(g)}</div>
    <div class="esc-tarjeta esc-t-diario">${v.diarioReciente(g, ENTRADAS_DEL_DIARIO_RECIENTE)}</div>
  </div>`;
}

// B: la pestaña del segundo panel (la del primero es la de siempre, `tab`).
let segunda = 'deporte';

/** La página entera de escritorio. */
export function viewEscritorio(g: Game, c: ContextoDeEscritorio): string {
  const v = c.vistas;
  const barra = `<div class="esc-barra">${v.dia(g)}</div>`;
  const ultimo = v.resultado();
  if (prototipo === 'b') {
    const ids = c.tabs.filter(([, , inactivo]) => !inactivo).map(([id]) => id);
    if (segunda === c.tab || !ids.includes(segunda)) segunda = ids.find((id) => id !== c.tab) ?? c.tab;
    return `<main class="app esc esc-b">${barra}
      ${ultimo || v.pendientes(g) ? `<div class="esc-tira">${ultimo}${v.pendientes(g)}</div>` : ''}
      <div class="esc-cuerpo">
        <section class="esc-panel-b">${barraDePestanas(c, c.tab, 'data-tab', segunda)}<div ${zona(`b1-${c.tab}`, '', 'Primer panel')}>${contenido(g, c.tab, c)}</div></section>
        <section class="esc-panel-b">${barraDePestanas(c, segunda, 'data-esc-tab', c.tab)}<div ${zona(`b2-${segunda}`, '', 'Segundo panel')}>${contenido(g, segunda, c)}</div></section>
      </div></main>`;
  }
  if (prototipo === 'c') {
    return `<main class="app esc esc-c">${barra}
      ${barraDePestanas({ ...c, tabs: c.tabs.map(([id, e, i]) => (id === 'hacer' ? [id, 'Panel', i] : [id, e, i])) as ContextoDeEscritorio['tabs'] }, c.tab, 'data-tab')}
      ${c.tab === 'hacer' ? `${ultimo ? `<div class="esc-tira">${ultimo}</div>` : ''}<div class="esc-cuerpo esc-sin-scroll">${contenido(g, 'hacer', c)}</div>` : `${ultimo ? `<div class="esc-tira">${ultimo}</div>` : ''}<div ${zona(`c-${c.tab}`, 'esc-cuerpo', 'Contenido de la pestaña')}>${contenido(g, c.tab, c)}</div>`}
    </main>`;
  }
  // A. En el HTML primero va el centro y después las columnas (así el foco del teclado empieza por lo que se está haciendo); en pantalla, con `grid-template-areas`, van izquierda, centro y derecha.
  return `<main class="app esc esc-a">${barra}
    <div class="esc-cuerpo">
      <div class="esc-centro">${barraDePestanas(c, c.tab, 'data-tab')}<div ${zona(`centro-${c.tab}`, '', 'Contenido de la pestaña')}>${ultimo}${contenido(g, c.tab, c)}</div></div>
      <aside ${zona('izq', 'esc-izq', 'Tú y lo que tienes')}>${PIEZAS_IZQUIERDA.map((p) => p(g, v)).join('')}</aside>
      <aside ${zona('der', 'esc-der', 'Diario reciente')}><div class="esc-diario-reciente">${v.diarioReciente(g, ENTRADAS_DEL_DIARIO_RECIENTE)}<p class="note">Lo anterior, en la pestaña Diario.</p></div></aside>
    </div></main>`;
}

/** Cuántas entradas del diario se dibujan en la columna derecha. */
export const ENTRADAS_DEL_DIARIO_RECIENTE = 30;

/** Clics propios de la composición (la pestaña del segundo panel). `true` si hay que volver a dibujar. */
export function clicEnEscritorio(el: HTMLElement): boolean {
  if (el.dataset.escTab) {
    segunda = el.dataset.escTab;
    return true;
  }
  return false;
}
