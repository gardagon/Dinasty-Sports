import type { ActionOption } from '@ds/core';

/**
 * Acciones agrupadas en un botón con desplegable (`ActionDef.desplegable`: «Entrenar…»). La interfaz no sabe de qué tratan: agrupa las opciones de un mismo grupo y
 * `desplegable.id`, dibuja el botón que abre el desplegable y, debajo, el botón que lanza la elegida (con su duración y, si no se puede, el motivo).
 */
const abiertos = new Set<string>();
const elegidas = new Map<string, string>();
const clave = (group: string, id: string): string => `${group}|${id}`;

export function reiniciarDesplegables(): void {
  abiertos.clear();
  elegidas.clear();
}

/** Las opciones de la lista en el orden en que salen, con las agrupadas juntas en el sitio de la primera. */
export type Entrada = { opcion: ActionOption } | { clave: string; opciones: ActionOption[] };

/**
 * `todas` son todas las acciones que hay (disponibles o no): si de un desplegable solo existe una acción, no hay nada que elegir y se dibuja como un botón normal (el atletismo solo:
 * «Practicar con los amigos» a secas). Sin `todas`, se agrupa siempre.
 */
export function agruparEnDesplegables(lista: readonly ActionOption[], todas: readonly ActionOption[] = lista): Entrada[] {
  const salida: Entrada[] = [];
  const grupos = new Map<string, ActionOption[]>();
  const cuantas = new Map<string, number>();
  for (const o of todas) if (o.desplegable) cuantas.set(clave(o.group, o.desplegable.id), (cuantas.get(clave(o.group, o.desplegable.id)) ?? 0) + 1);
  for (const o of lista) {
    if (!o.desplegable || cuantas.get(clave(o.group, o.desplegable.id)) === 1) {
      salida.push({ opcion: o });
      continue;
    }
    const k = clave(o.group, o.desplegable.id);
    const g = grupos.get(k);
    if (g) g.push(o);
    else {
      const nuevo = [o];
      grupos.set(k, nuevo);
      salida.push({ clave: k, opciones: nuevo });
    }
  }
  return salida;
}

/** El botón del desplegable y, abierto, su formulario. `boton` dibuja el botón que lanza una acción (nombre, duración y motivo). */
export function viewDesplegable(k: string, opciones: readonly ActionOption[], esc: (s: string) => string, boton: (o: ActionOption, texto: string) => string, duracion: (minutos: number, o: ActionOption) => string): string {
  const d = opciones[0].desplegable!;
  const abierto = abiertos.has(k);
  const elegida = opciones.find((o) => o.id === elegidas.get(k)) ?? opciones.find((o) => o.available) ?? opciones[0];
  const etiquetaDe = (o: ActionOption): string => o.desplegable?.opcion ?? o.name;
  const select = opciones.map((o) => `<option value="${esc(o.id)}"${o.id === elegida.id ? ' selected' : ''}>${esc(`${etiquetaDe(o)} · ${duracion(o.duration, o)}${o.available ? '' : ' (no disponible)'}`)}</option>`).join('');
  return `<button class="action" data-desplegable="${esc(k)}"><span class="action-name">${esc(d.nombre)}</span><span class="action-time">${abierto ? '▲' : '▼'}</span></button>
    ${abierto ? `<div class="formulario-plan">
      <label class="campo-plan"><span>${esc(d.etiqueta)}</span><select data-desplegable-campo="${esc(k)}">${select}</select></label>
      ${elegida.description ? `<p class="note">${esc(elegida.description)}</p>` : ''}
      ${boton(elegida, d.boton.replace('{opcion}', etiquetaDe(elegida).toLowerCase()).replace('{nombre}', elegida.name))}
    </div>` : ''}`;
}

/** Un clic en un botón de desplegable. `true` si hay que volver a dibujar. */
export function clicEnDesplegable(el: HTMLElement): boolean {
  const k = el.dataset.desplegable;
  if (!k) return false;
  if (!abiertos.delete(k)) abiertos.add(k);
  return true;
}

/** Cambia lo elegido en un desplegable. `true` si hay que volver a dibujar. */
export function cambioEnDesplegable(el: HTMLSelectElement): boolean {
  const k = el.dataset.desplegableCampo;
  if (!k) return false;
  elegidas.set(k, el.value);
  return true;
}
