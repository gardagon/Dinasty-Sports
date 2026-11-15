import { cuerpoDePersona, type CuerpoDePersona } from '@ds/contracts';
import type { Game } from '@ds/core';
import { edadDeDibujo, evolucionDe, figuraDe, figurasSvg, cuerpoALaEdad, etapasVividas, retratoDe } from '@ds/retrato';

/**
 * El retrato de una persona y su evolución (capa 3 del visualizador: `docs/ANEXO_RETRATOS.md`): la web solo pide el SVG a `@ds/retrato` y lo coloca. El retrato va en la
 * ficha del personaje y en la de cada persona; al pulsarlo se despliega la evolución, con dos vistas: una fila de figuras por etapas junto a una regla y un deslizador
 * de edad con una figura grande. Solo se enseñan las edades ya vividas.
 */

/** De quién está desplegada la evolución y qué edad marca el deslizador (por defecto, la de hoy). */
let abierta: string | null = null;
let edadElegida: number | null = null;

const edadHoyDe = (g: Game, c: CuerpoDePersona): number => (g.time.day - c.nacimiento) / 365;
const textoDeEdad = (edad: number): string => (edad < 1 ? 'Menos de 1 año' : edad === 1 ? '1 año' : `${edad} años`);

/** La fila de etapas sin cifras (para quien no conoces lo bastante: ni su edad ni su altura exactas). */
function filaSinCifras(c: CuerpoDePersona, edadHoy: number): string {
  return figurasSvg(etapasVividas(edadHoy).map((e) => ({ cuerpo: c, edad: e, opciones: cuerpoALaEdad(c, e, edadHoy) })), { cifras: false });
}

/**
 * El retrato de una persona con el acceso a su evolución. `cifras`: si se enseñan su edad y su altura con números (el personaje y la familia; del resto solo
 * se ve la figura a escala, como en el resto de la ficha).
 */
export function viewRetrato(g: Game, id: string, opciones: { cifras?: boolean } = {}): string {
  const c = cuerpoDePersona(g, id);
  if (!c) return '';
  const cifras = opciones.cifras ?? true;
  const edadHoy = edadHoyDe(g, c);
  const hoy = edadDeDibujo(edadHoy);
  const desplegada = abierta === id;
  let evolucion = '';
  if (desplegada) {
    const edad = Math.min(hoy, edadElegida ?? hoy);
    evolucion = `<div class="evolucion">
      <h3>Evolución</h3>
      <div class="evolucion-fila">${cifras ? evolucionDe(c, edadHoy) : filaSinCifras(c, edadHoy)}</div>
      <label class="evolucion-edad"><span id="evolucion-texto">${cifras ? textoDeEdad(edad) : edad === hoy ? 'Hoy' : 'Antes'}</span>
        <input type="range" min="0" max="${hoy}" step="1" value="${edad}" data-retrato="edad" data-id="${id}" data-cifras="${cifras ? 1 : 0}" aria-label="Edad"></label>
      <div class="evolucion-figura" id="evolucion-figura">${figura(c, edad, edadHoy, cifras)}</div>
    </div>`;
  }
  return `<div class="retrato-caja">
    <button class="retrato-boton" data-retrato="evolucion" data-id="${id}" aria-expanded="${desplegada}" title="Ver su evolución">${retratoDe(c, hoy, edadHoy)}<span>${desplegada ? 'Ocultar evolución' : 'Ver evolución'}</span></button>
    ${evolucion}
  </div>`;
}

const figura = (c: CuerpoDePersona, edad: number, edadHoy: number, cifras: boolean): string =>
  cifras ? figuraDe(c, edad, edadHoy) : figurasSvg([{ cuerpo: c, edad, opciones: cuerpoALaEdad(c, edad, edadHoy) }], { alturaMaxima: c.alturaAdulta + 10, cifras: false });

/** Atiende los clics del retrato. `true` si hay que volver a dibujar. */
export function clicEnRetrato(el: HTMLElement): boolean {
  if (el.dataset.retrato !== 'evolucion') return false;
  abierta = abierta === el.dataset.id ? null : (el.dataset.id ?? null);
  edadElegida = null;
  return true;
}

/** El deslizador de edad: cambia solo la figura grande y su rótulo, sin redibujar la pantalla (para no perder el deslizador). `true` si era suyo. */
export function entradaEnRetrato(g: Game, el: HTMLElement, raiz: HTMLElement): boolean {
  if (!(el instanceof HTMLInputElement) || el.dataset.retrato !== 'edad') return false;
  const c = cuerpoDePersona(g, el.dataset.id ?? '');
  if (!c) return true;
  const cifras = el.dataset.cifras === '1';
  const edadHoy = edadHoyDe(g, c);
  edadElegida = Number(el.value);
  const caja = raiz.querySelector<HTMLElement>('#evolucion-figura');
  if (caja) caja.innerHTML = figura(c, edadElegida, edadHoy, cifras);
  const texto = raiz.querySelector<HTMLElement>('#evolucion-texto');
  if (texto) texto.textContent = cifras ? textoDeEdad(edadElegida) : edadElegida === edadDeDibujo(edadHoy) ? 'Hoy' : 'Antes';
  return true;
}

/** Al empezar otra partida, o al cambiar de ficha, se pliega. */
export function reiniciarRetrato(): void {
  abierta = null;
  edadElegida = null;
}
