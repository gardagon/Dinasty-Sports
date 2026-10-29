import { idDeProponerPlan, type CuandoDePlan, type FormularioDePlan } from '@ds/contracts';

/**
 * «Proponer quedar para…»: el formulario con los desplegables de actividad, sitio y hora y el interruptor Hoy / Mañana.
 * Lo que se puede elegir lo da el motor (`RelationsService.formularioDePlan`); aquí solo se ajusta lo elegido a eso y se dibuja.
 */

export interface EleccionDePlan {
  actividad: string;
  lugar: string;
  cuando: CuandoDePlan;
  minuto: number;
}

/** La hora que se prefiere si está entre las posibles (la de estudiar de siempre). */
const HORA_PREFERIDA = 17 * 60;

export const hhmm = (m: number): string => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Ajusta lo elegido a lo que ofrece el formulario: lo que ya no existe o no tiene horas se cambia por lo más parecido que sí. `undefined` si no hay nada que elegir. */
export function ajustarEleccion(f: FormularioDePlan, e: Partial<EleccionDePlan> = {}): EleccionDePlan | undefined {
  const actividad = f.actividades.find((a) => a.id === e.actividad) ?? f.actividades[0];
  if (!actividad) return undefined;
  const conHoras = (l: (typeof actividad.lugares)[number]) => l.dias.hoy.horas.length + l.dias.manana.horas.length > 0;
  const lugar = actividad.lugares.find((l) => l.id === e.lugar) ?? actividad.lugares.find(conHoras) ?? actividad.lugares[0];
  const cuando: CuandoDePlan = e.cuando ?? (lugar.dias.hoy.horas.length ? 'hoy' : 'manana');
  const horas = lugar.dias[cuando].horas;
  const minuto = e.minuto !== undefined && horas.includes(e.minuto) ? e.minuto : horas.includes(HORA_PREFERIDA) ? HORA_PREFERIDA : (horas[0] ?? 0);
  return { actividad: actividad.id, lugar: lugar.id, cuando, minuto };
}

/** El formulario dibujado: desplegables (cada uno con `data-campo`), el interruptor y el botón que lanza la propuesta (con el id de la acción). */
export function viewFormularioDePlan(npcId: string, f: FormularioDePlan, e: EleccionDePlan | undefined, nombre: string): string {
  if (!e) return '';
  const actividad = f.actividades.find((a) => a.id === e.actividad)!;
  const lugar = actividad.lugares.find((l) => l.id === e.lugar)!;
  const dia = lugar.dias[e.cuando];
  const opciones = (xs: { valor: string | number; texto: string }[], elegido: string | number) =>
    xs.map((x) => `<option value="${esc(String(x.valor))}"${x.valor === elegido ? ' selected' : ''}>${esc(x.texto)}</option>`).join('');
  const select = (campo: string, etiqueta: string, xs: { valor: string | number; texto: string }[], elegido: string | number, desactivado = false) =>
    `<label class="campo-plan"><span>${etiqueta}</span><select data-gente="plan-campo" data-campo="${campo}"${desactivado ? ' disabled' : ''}>${opciones(xs, elegido)}</select></label>`;
  const interruptor = (['hoy', 'manana'] as const)
    .map((c) => `<button type="button" class="dia-plan" data-gente="plan-dia" data-id="${c}" aria-pressed="${e.cuando === c}">${c === 'hoy' ? 'Hoy' : 'Mañana'}</button>`)
    .join('');
  const motivo = f.motivo ?? dia.motivo;
  const lanzar = !f.motivo && dia.horas.length > 0;
  return `<div class="formulario-plan">
    ${select('actividad', 'Qué', f.actividades.map((a) => ({ valor: a.id, texto: `${a.nombre} (${a.duracion} min)` })), e.actividad)}
    ${select('lugar', 'Dónde', actividad.lugares.map((l) => ({ valor: l.id, texto: l.texto.replace(/^en /, '') })), e.lugar)}
    <div class="campo-plan"><span>Cuándo</span><div class="interruptor-plan">${interruptor}${select('minuto', 'A las', dia.horas.map((m) => ({ valor: m, texto: hhmm(m) })), e.minuto, !dia.horas.length)}</div></div>
    ${motivo ? `<p class="note">${esc(motivo)}</p>` : ''}
    <button class="action" data-do="${esc(idDeProponerPlan(npcId, e.actividad, e.lugar, e.cuando, e.minuto))}"${lanzar ? '' : ' disabled'}><span class="action-name">Proponer a ${esc(nombre)}</span><span class="action-time">5 min</span></button>
    <p class="note">Tú decides si puedes ir: si a esa hora tienes otra cosa, tendrás que elegir. ${esc(nombre)} aceptará o no según lo que tenga que hacer, lo que os llevéis y lo que confíe en ti.</p>
  </div>`;
}
