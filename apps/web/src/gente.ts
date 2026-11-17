import {
  aforoCercano,
  idDePonerApodo,
  LONGITUD_MAXIMA_DE_APODO,
  PREFIJO_DE_CONVERSACION,
  SERVICES,
  type ClubDirectory,
  descripcionDeDesconocido,
  edadAparente,
  edadRelativa,
  alturaRelativa,
  type IdentityService,
  nombreSegunEdad,
  NOMBRE_RASGO,
  nombreEstado,
  type ConversacionService,
  type LugaresService,
  type PeticionDeConversacion,
  type NpcDirectory,
  type NpcRole,
  type NpcView,
  type PresenciaService,
  type RelationsService,
  type RelationView,
  type SucesosService,
  fechaDelDia,
} from '@ds/contracts';
import type { Game } from '@ds/core';
import { ajustarEleccion, hhmm, viewFormularioDePlan, type EleccionDePlan } from './planes';
import { reiniciarRetrato, viewRetrato } from './retrato';

/**
 * Panel «Gente»: las personas del juego con filtros, tarjetas paginadas y una ficha. Quien no conoces sale sin nombre y con la
 * descripción de su aspecto (y lo que es para ti: compañero, rival...) hasta que hables con él o con ella.
 */

type Filtro = 'aqui' | 'familia' | 'conocidos' | 'companeros' | 'profesorado' | 'rivales' | 'vecinos';
type Pestana = 'resumen' | 'aspecto';

const FILTROS: [Filtro, string][] = [
  ['aqui', 'Aquí'],
  ['familia', 'Familia'],
  ['conocidos', 'Conocidos'],
  ['companeros', 'Compañeros'],
  ['profesorado', 'Profesorado'],
  ['rivales', 'Rivales'],
  ['vecinos', 'Vecinos'],
];
const POR_PAGINA = 12;

const ROL: Record<NpcRole, [string, string]> = {
  companero: ['Compañera', 'Compañero'],
  profesor: ['Profesora', 'Profesor'],
  entrenador: ['Entrenadora', 'Entrenador'],
  rival: ['Rival', 'Rival'],
  vecino: ['Vecina', 'Vecino'],
  amigo: ['Amiga', 'Amigo'],
  familia: ['Familia', 'Familia'],
};

let filtro: Filtro = 'aqui';
let pagina = 0;
let seleccionada: string | null = null;
let pestana: Pestana = 'resumen';
/** «Proponer quedar para…»: si está desplegado y lo que se ha ido eligiendo con cada persona. */
let planAbierto = false;
const eleccionesDePlan = new Map<string, Partial<EleccionDePlan>>();
/** Las peticiones de la conversación («Pedir jugar…»): cuál está desplegada y lo que se ha elegido en cada desplegable (por persona y petición). */
let peticionAbierta: string | null = null;
const eleccionesDePeticion = new Map<string, string>();
const claveDePeticion = (npcId: string, id: string): string => `${npcId}|${id}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const rol = (n: NpcView) =>
  n.tags.includes('progenitor') ? (n.gender === 'f' ? 'Madre' : 'Padre') : n.tags.includes('hermano') ? (n.gender === 'f' ? 'Hermana' : 'Hermano') : ROL[n.role][n.gender === 'f' ? 0 : 1];
const conocida = (n: NpcView) => n.known !== false;
const aspecto = (n: NpcView) => (n.rasgos ? descripcionDeDesconocido(n.rasgos.apariencia, n.gender, edadAparente(n)) : nombreSegunEdad(n.gender, edadAparente(n)));

/**
 * Orden de todas las listas: de mayor a menor relación (mejor amigo, amigo, conocido, antipatía...), luego amistad y luego confianza.
 * A quien aún no conoces (sin vínculo) se le deja al final; a igualdad, por nombre.
 */
export function ordenarPorRelacion<T extends Pick<NpcView, 'id' | 'name'>>(personas: readonly T[], vinculo: (id: string) => Pick<RelationView, 'nivel' | 'afinidad' | 'confianza'> | undefined): T[] {
  const clave = (n: T) => {
    const v = vinculo(n.id);
    return v ? [v.nivel, v.afinidad, v.confianza] : [-Infinity, 0, 0];
  };
  return [...personas].sort((a, b) => {
    const x = clave(a), y = clave(b);
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2] || a.name.localeCompare(b.name, 'es');
  });
}

/** Qué hace quien está aquí pero no está disponible (`id` → «atendiendo en clase», «durmiendo»). */
function ocupadosAqui(g: Game): Map<string, string> {
  const lugar = g.service<LugaresService>(SERVICES.lugares)?.actual().id;
  const presencia = g.service<PresenciaService>(SERVICES.presencia);
  return new Map(lugar && presencia ? presencia.ocupadosEn(lugar).map((o) => [o.persona.id, o.motivo]) : []);
}
const ocupadaTexto = (motivo: string) => motivo.charAt(0).toUpperCase() + motivo.slice(1);

/**
 * Orden de las acciones con una persona: de menos a más tiempo (preguntar el nombre o la edad, 2 minutos, antes que hablar, 5, y esto
 * antes que quedar, 120). A igualdad, lo más habitual primero (hablar, jugar, un detalle...) y después por nombre.
 */
const PRIORIDAD_DE_ACCION = ['charlar', 'hablar', 'saludar', 'jugar', 'detalle'];
export function ordenarAcciones<T extends { id: string; name: string; duration: number }>(acciones: readonly T[]): T[] {
  const prioridad = (id: string) => {
    const i = PRIORIDAD_DE_ACCION.indexOf(id.split('.')[1] ?? '');
    return i < 0 ? PRIORIDAD_DE_ACCION.length : i;
  };
  return [...acciones].sort((a, b) => a.duration - b.duration || prioridad(a.id) - prioridad(b.id) || a.name.localeCompare(b.name, 'es'));
}

/** Cuánta gente tienes cerca ahora (la de «Aquí»): es el número que lleva la pestaña. */
/** Los niveles de una persona con el nombre del juego de cada deporte («Fútbol 15»), no su identificador interno. */
export function textoDeNiveles(g: Game, levels: Readonly<Record<string, number>>): string {
  return Object.entries(levels).map(([k, v]) => `${g.registry.moduleNames.get(k) ?? k} ${Math.round(v)}`).join(', ');
}

/** El nombre de un club para enseñarlo («Club deportivo del colegio»): el entrenador lleva el identificador del club (`colegio`, `club_grande`); los jugadores, ya su nombre. */
export function nombreDeClub(g: Game, club: string): string {
  const clubes = g.service<ClubDirectory>(SERVICES.clubes);
  if (clubes) for (const deporte of g.registry.moduleNames.keys()) {
    const c = clubes.list(deporte).find((x) => x.id === club);
    if (c) return c.nombre;
  }
  return club;
}

/**
 * ¿Está a tu lado? Entre la gente que tienes cerca, o aquí pero ocupada (atendiendo en clase, durmiendo: se la ve y se dice por qué no se
 * puede hablar con ella). Es lo mismo que mira el motor para hablar con alguien. Sin servicios de lugares y presencia no se restringe nada.
 */
export function aTuLado(g: Game, n: NpcView): boolean {
  const lugar = g.service<LugaresService>(SERVICES.lugares)?.actual().id;
  const presencia = g.service<PresenciaService>(SERVICES.presencia);
  if (!lugar || !presencia) return true;
  return presencia.en(lugar, aforoCercano(lugar, presencia.version)).some((x) => x.id === n.id) || presencia.ocupadosEn(lugar).some((o) => o.persona.id === n.id);
}

export function genteAqui(g: Game): number {
  return personasDe(g, 'aqui').length;
}

/** Las personas del filtro elegido, ordenadas por relación, amistad y confianza. */
function personasDe(g: Game, f: Filtro): NpcView[] {
  const relaciones = g.service<RelationsService>(SERVICES.relaciones);
  return ordenarPorRelacion(personasSinOrdenar(g, f), (id) => relaciones?.get(id));
}

/** Las personas del filtro elegido: en «Aquí» las que tienes cerca (conocidas o no) y en los demás solo las que conoces. */
function personasSinOrdenar(g: Game, f: Filtro): NpcView[] {
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  if (!dir) return [];
  if (f === 'aqui') {
    const lugar = g.service<LugaresService>(SERVICES.lugares)?.actual().id;
    const presencia = g.service<PresenciaService>(SERVICES.presencia);
    // Quien está pero ocupado (atendiendo en clase, durmiendo) también se ve, con su estado: no desaparece.
    return lugar && presencia ? [...presencia.en(lugar, aforoCercano(lugar, presencia.version)), ...presencia.ocupadosEn(lugar).map((o) => o.persona)] : [];
  }
  // Fuera de «Aquí» solo se guardan las personas que ya conoces: a quien no conoces solo lo ves cuando lo tienes cerca.
  const conocidas = { known: true };
  return f === 'conocidos' ? dir.list(conocidas)
    : f === 'familia' ? dir.list({ role: 'familia', ...conocidas })
    : f === 'companeros' ? dir.list({ role: 'companero', ...conocidas })
    : f === 'rivales' ? dir.list({ role: 'rival', ...conocidas })
    : f === 'vecinos' ? dir.list({ role: 'vecino', ...conocidas })
    : [...dir.list({ role: 'profesor', ...conocidas }), ...dir.list({ role: 'entrenador', ...conocidas })];
}

const barra = (nombre: string, pct: number, clase: string) =>
  `<div class="barra-gente"><span>${nombre}</span><div class="bar ${clase}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div></div>`;

const avisoDeOcupado = (motivo?: string) => (motivo ? `<span class="ocupado">${esc(ocupadaTexto(motivo))}: no puedes hablar</span>` : '');

function tarjeta(g: Game, n: NpcView, ocupado?: string): string {
  const rel = g.service<RelationsService>(SERVICES.relaciones)?.get(n.id);
  if (!conocida(n)) {
    return `<button class="tarjeta-gente desconocida" data-gente="ver" data-id="${esc(n.id)}"><b>???</b><span class="rol">${esc(rol(n))}</span><span>${esc(aspecto(n))}</span>${avisoDeOcupado(ocupado)}${barra('Amistad', 0, 'amistad')}${barra('Confianza', 0, 'confianza')}</button>`;
  }
  const estado = rel ? nombreEstado(rel.estado, n.gender) : rol(n);
  return `<button class="tarjeta-gente" data-gente="ver" data-id="${esc(n.id)}"><b>${esc(n.name)}</b><span class="rol">${esc(estado)}</span><span>${esc(rol(n) === estado ? '' : rol(n))}</span>${avisoDeOcupado(ocupado)}${barra('Amistad', rel ? Math.max(0, rel.afinidad) : 0, 'amistad')}${barra('Confianza', rel ? rel.confianza : 0, 'confianza')}</button>`;
}

/** Todo lo que puedes hacer con esta persona (hablar, quedar, proponer planes...): lo disponible ahora y, aparte, lo que no con el motivo. */
function accionesCon(g: Game, n: NpcView): string {
  const todas = g.listActions({ omitir: (d) => !(d.id.startsWith('relaciones.') && d.id.endsWith(`.${n.id}`)) }).filter((o) => o.id.startsWith('relaciones.') && o.id.endsWith(`.${n.id}`));
  const boton = (o: (typeof todas)[number]) =>
    `<button class="action" data-do="${esc(o.id)}"${o.available ? '' : ' disabled'}><span class="action-name">${esc(o.name)}</span><span class="action-time">${o.duration} min</span>${o.available ? '' : `<span class="action-why">${esc(o.reason ?? '')}</span>`}</button>`;
  const ahora = ordenarAcciones(todas.filter((o) => o.available));
  const luego = ordenarAcciones(todas.filter((o) => !o.available));
  return `<h3>Qué hacer con ${esc(n.nombreCorto)}</h3>
    <div class="actions">${ahora.map(boton).join('') || '<p class="note">Ahora mismo no puedes hacer nada con esta persona.</p>'}</div>
    ${luego.length ? `<details class="viaje-rapido"><summary>Lo que no se puede ahora (${luego.length})</summary><div class="actions">${luego.map(boton).join('')}</div></details>` : ''}`;
}

/**
 * Lo que se le puede pedir a esta persona con un desplegable («Pedir jugar…» a tu entrenador): lo publican los módulos como servicios `conversacion.<id>` y aquí se dibuja sin saber de qué trata.
 * Cada petición es un botón que despliega su desplegable y el botón que la lanza (con el id de la acción: prefijo + lo elegido).
 */
function bloqueDePeticiones(g: Game, n: NpcView): string {
  const todas: PeticionDeConversacion[] = [...g.registry.services.keys()]
    .filter((k) => k.startsWith(PREFIJO_DE_CONVERSACION))
    .flatMap((k) => g.service<ConversacionService>(k)?.peticiones(n.id) ?? []);
  if (!todas.length) return '';
  return `<h3>Hablar con ${esc(n.nombreCorto)}</h3>${todas.map((p) => {
    const clave = claveDePeticion(n.id, p.id);
    const abierta = peticionAbierta === clave;
    const elegida = p.opciones.find((o) => o.valor === eleccionesDePeticion.get(clave))?.valor ?? p.sugerida ?? p.opciones[0]?.valor;
    const texto = p.opciones.find((o) => o.valor === elegida)?.texto.toLowerCase() ?? '';
    const opciones = p.opciones.map((o) => `<option value="${esc(o.valor)}"${o.valor === elegida ? ' selected' : ''}>${esc(o.texto)}</option>`).join('');
    return `<button class="action" data-gente="peticion-abrir" data-id="${esc(clave)}"><span class="action-name">${esc(p.nombre)}</span><span class="action-time">${abierta ? '▲' : '▼'}</span></button>
      ${abierta ? `<div class="formulario-plan">
        ${p.descripcion ? `<p class="note">${esc(p.descripcion)}</p>` : ''}
        <label class="campo-plan"><span>${esc(p.etiqueta)}</span><select data-gente="peticion-campo" data-id="${esc(clave)}">${opciones}</select></label>
        ${p.motivo ? `<p class="note">${esc(p.motivo)}</p>` : ''}
        <button class="action" data-do="${esc(p.prefijoDeAccion + (elegida ?? ''))}"${p.motivo || !elegida ? ' disabled' : ''}><span class="action-name">${esc(p.boton.replace('{opcion}', texto))}</span><span class="action-time">${p.minutos} min</span></button>
      </div>` : ''}`;
  }).join('')}`;
}

/** Cómo le llamas: el apodo (puesto por ti o con el que ya viene) y un cuadro para cambiarlo. El botón lleva el id de la acción (lo actualiza `main.ts` al escribir). */
function bloqueDeApodo(n: NpcView): string {
  return `<div class="apodo-gente">
    <label class="campo-plan"><span>Apodo${n.apodo ? `: «${esc(n.apodo)}»` : ''}</span>
      <input type="text" id="apodo-texto" data-gente="apodo-campo" data-npc="${esc(n.id)}" maxlength="${LONGITUD_MAXIMA_DE_APODO}" value="${esc(n.apodo ?? '')}" placeholder="${esc(n.nombrePila ?? n.nombreCorto)}" autocomplete="off">
    </label>
    <button class="action" id="apodo-boton" data-do="${esc(idDePonerApodo(n.id, n.apodo ?? ''))}"><span class="action-name">Llamarle así en los textos</span><span class="action-time">1 min</span></button>
    <p class="note">Déjalo vacío para quitarlo. Sale en las acciones y los diarios en lugar de su nombre.</p>
  </div>`;
}

/** Los planes que tienes con esta persona (con su botón de cancelar) y el formulario para proponerle otro: actividad, sitio, día y hora. */
function bloqueDePlanes(g: Game, n: NpcView, soloAcordados = false): string {
  const rel = g.service<RelationsService>(SERVICES.relaciones);
  if (!rel) return '';
  const lugares = g.service<LugaresService>(SERVICES.lugares);
  const cuando = (d: number) => (d === g.time.day ? 'hoy' : d === g.time.day + 1 ? 'mañana' : `dentro de ${d - g.time.day} días`);
  const pendientes = rel.planes().filter((p) => p.npcId === n.id);
  const f = rel.formularioDePlan(n.id);
  if (!pendientes.length && (soloAcordados || !f.actividades.length)) return '';
  const nombre = n.nombreCorto;
  const lista = pendientes
    .map((p) => `<li>${esc(p.nombre)} ${cuando(p.dia)} a las ${hhmm(p.minuto)} (${esc(lugares?.lugar(p.lugar)?.name.toLowerCase() ?? p.lugar)}) <button class="action" data-do="${esc(p.cancelar)}"><span class="action-name">Cancelar plan</span><span class="action-time">5 min</span></button></li>`)
    .join('');
  const eleccion = ajustarEleccion(f, eleccionesDePlan.get(n.id));
  return `<h3>Quedar con ${esc(nombre)}</h3>
    ${lista ? `<ul class="planes">${lista}</ul>` : ''}
    ${!soloAcordados && f.actividades.length ? `<button class="action" data-gente="plan-abrir"><span class="action-name">Proponer quedar para…</span><span class="action-time">${planAbierto ? '▲' : '▼'}</span></button>${planAbierto ? viewFormularioDePlan(n.id, f, eleccion, nombre) : ''}` : ''}`;
}

/** Edad, cumpleaños y altura: lo que sabes (la familia, o lo que has preguntado) con cifras; lo demás, a simple vista respecto a ti. */
function datosDeCuerpo(g: Game, n: NpcView): string {
  const yo = g.service<IdentityService>(SERVICES.identidad)?.view();
  const filas: string[] = [];
  if (n.edadExacta !== undefined) {
    const sabe = n.sabe?.includes('edad');
    const texto = sabe ? `${n.edadExacta} años` : yo ? edadRelativa(n.edadExacta, yo.age) : '';
    if (texto) filas.push(`<div><dt>Edad</dt><dd>${esc(texto)}</dd></div>`);
    // El cumpleaños, aparte (día/mes del calendario): se sabe junto con la edad.
    if (sabe && n.cumple) filas.push(`<div><dt>Cumpleaños</dt><dd>${esc(n.cumple)}</dd></div>`);
  }
  if (n.alturaCm !== undefined && yo) {
    // La altura se ve a ojo respecto a la tuya; la cifra exacta solo la sabes de la familia.
    const texto = n.role === 'familia' ? `${Math.round(n.alturaCm)} cm` : alturaRelativa(n.alturaCm, yo.heightCm, n.gender);
    filas.push(`<div><dt>Altura</dt><dd>${esc(texto)}</dd></div>`);
  }
  return filas.length ? `<dl class="identity">${filas.join('')}</dl>` : '';
}

/** Colegio (si aplica: el tuyo por defecto si es compañero; si no, desconocido hasta que lo preguntes) y clase (solo si es de tu colegio). */
function datosDeEstudios(n: NpcView): string {
  const filas: string[] = [];
  // Los adultos: a qué se dedican (lo que se ve sin preguntar y, preguntando, el detalle) y dónde trabajan.
  if (n.profesion !== undefined) filas.push(`<div><dt>Profesión</dt><dd>${esc(n.sabe?.includes('profesion') ? n.profesion : (n.profesionBasica ?? 'Desconocida'))}</dd></div>`);
  if (n.trabajo !== undefined) filas.push(`<div><dt>Trabajo</dt><dd>${esc(n.sabe?.includes('trabajo') ? n.trabajo : 'Desconocido')}</dd></div>`);
  if (n.gustos?.length && n.sabe?.includes('gustos')) filas.push(`<div><dt>Le gusta</dt><dd>${esc(n.gustos.join(', '))}</dd></div>`);
  if (n.colegio !== undefined) filas.push(`<div><dt>Colegio</dt><dd>${esc(n.sabe?.includes('colegio') ? n.colegio : 'Desconocido')}</dd></div>`);
  if (n.clase !== undefined) filas.push(`<div><dt>Clase</dt><dd>${esc(n.sabe?.includes('clase') ? n.clase : 'Desconocida')}</dd></div>`);
  return filas.length ? `<dl class="identity">${filas.join('')}</dl>` : '';
}

/** Lo que el personaje ha vivido con esta persona (los sucesos en los que salió), del más reciente al más antiguo. */
function vividoCon(g: Game, n: NpcView): string {
  const lista = g.service<SucesosService>(SERVICES.sucesos)?.recuerdos(n.id) ?? [];
  if (!lista.length) return '';
  return `<h3>Lo que habéis vivido</h3><ul>${[...lista].reverse().slice(0, 12).map((r) => `<li>${esc(fechaDelDia(r.dia).texto)}: ${esc(r.titulo)}${r.opcionTexto ? ` <span class="note">(${esc(r.opcionTexto)})</span>` : ''}</li>`).join('')}</ul>`;
}

function ficha(g: Game, n: NpcView): string {
  const rel = g.service<RelationsService>(SERVICES.relaciones)?.get(n.id);
  const nombre = conocida(n) ? esc(n.name) : '???';
  const pestanas: [Pestana, string][] = [['resumen', 'Resumen'], ['aspecto', 'Aspecto']];
  let cuerpo: string;
  if (pestana === 'aspecto') {
    // La frase ya dice el pelo, los ojos, la piel y los distintivos: aquí solo se añade lo que no dice (la forma de la cara).
    cuerpo = `<p>${esc(aspecto(n))}.</p>${n.rasgos ? `<p class="note">Cara ${esc(NOMBRE_RASGO[n.rasgos.apariencia.cara])}.</p>` : ''}${datosDeCuerpo(g, n)}`;
  } else if (!conocida(n)) {
    // Preguntar el nombre solo se puede a quien tienes cerca (el motor lo dice en la disponibilidad de la acción).
    // Si no está a tu lado no se enseña nada que hacer con ella: se entiende que es imposible, no que falte algo.
    const pregunta = aTuLado(g, n) ? g.preview(`relaciones.presentarse.${n.id}`) : undefined;
    const boton = !pregunta ? ''
      : pregunta.available
        ? `<button class="action" data-do="${esc(pregunta.id)}"><span class="action-name">Preguntar su nombre</span><span class="action-time">${pregunta.duration} min</span></button>`
        : `<p class="note">${esc(pregunta.reason ?? '')}</p>`;
    cuerpo = `<p>${esc(aspecto(n))}.</p><p class="note">Todavía no sabes cómo se llama. ${n.description ? esc(n.description) : ''}</p>${barra('Amistad', 0, 'amistad')}${barra('Confianza', 0, 'confianza')}${boton}`;
  } else {
    const nivel = textoDeNiveles(g, n.levels);
    cuerpo = `<p>${esc(n.description ?? '')}</p>${rel ? `<p class="note"><b>${esc(nombreEstado(rel.estado, n.gender))}</b></p>` : ''}${barra('Amistad', rel ? Math.max(0, rel.afinidad) : 0, 'amistad')}${barra('Confianza', rel ? rel.confianza : 0, 'confianza')}${nivel ? `<p class="note">Nivel: ${esc(nivel)}</p>` : ''}${n.club ? `<p class="note">Club: ${esc(nombreDeClub(g, n.club))}</p>` : ''}${datosDeEstudios(n)}`;
  }
  const motivo = ocupadosAqui(g).get(n.id);
  const aviso = motivo && pestana === 'resumen' ? `<p class="note ocupado">${esc(ocupadaTexto(motivo))}: ahora no puedes hablar con ${n.gender === 'f' ? 'ella' : 'él'}.</p>` : '';
  // Quien no está a tu lado: nada de lo que se podría hacer con esa persona (ni en gris). Se quedan los planes ya acordados (para poder cancelarlos) y el apodo, que no es hablar con nadie.
  const cerca = aTuLado(g, n);
  const acciones = pestana === 'resumen' && conocida(n)
    ? (cerca ? bloqueDePlanes(g, n) + bloqueDePeticiones(g, n) + accionesCon(g, n) : bloqueDePlanes(g, n, true)) + bloqueDeApodo(n)
    : '';
  return `<section class="sheet ficha-gente">
    <button data-gente="volver">← Volver</button>
    <h2>${nombre} <small>${esc(rol(n))}</small></h2>
    <nav class="tabs">${pestanas.map(([id, label]) => `<button class="tab" aria-selected="${pestana === id}" data-gente="pestana" data-id="${id}">${label}</button>`).join('')}</nav>
    ${viewRetrato(g, n.id, { cifras: n.role === 'familia', nombre: conocida(n) ? n.nombreCorto : '???' })}
    ${aviso}
    ${cuerpo}
    ${acciones}
    ${pestana === 'resumen' && conocida(n) ? vividoCon(g, n) : ''}
  </section>`;
}

export function viewPanelGente(g: Game): string {
  if (!g.service<NpcDirectory>(SERVICES.npcs)) return '<section class="sheet"><p class="note">No hay módulo de personas cargado.</p></section>';
  if (seleccionada) {
    const n = g.service<NpcDirectory>(SERVICES.npcs)!.get(seleccionada);
    if (n) return ficha(g, n);
    seleccionada = null;
  }
  const todas = personasDe(g, filtro);
  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  pagina = Math.min(pagina, paginas - 1);
  const visibles = todas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const lugar = g.service<LugaresService>(SERVICES.lugares)?.actual().name;
  const ocupados = ocupadosAqui(g);
  return `<section class="sheet panel-gente">
    <h2>Gente</h2>
    <nav class="filtros-gente">${FILTROS.map(([id, label]) => `<button class="tab" aria-selected="${filtro === id}" data-gente="filtro" data-id="${id}">${label}</button>`).join('')}</nav>
    <p class="note">${filtro === 'aqui' && lugar ? `En ${esc(lugar.toLowerCase())}: ` : ''}${todas.length} ${todas.length === 1 ? 'persona' : 'personas'}. Pulsa una para ver más.</p>
    <div class="gente-grid">${visibles.map((n) => tarjeta(g, n, ocupados.get(n.id))).join('') || '<p class="note">No hay nadie.</p>'}</div>
    <div class="paginas-gente"><button data-gente="pagina" data-id="-1" ${pagina === 0 ? 'disabled' : ''}>←</button><span>Página ${pagina + 1} de ${paginas}</span><button data-gente="pagina" data-id="1" ${pagina >= paginas - 1 ? 'disabled' : ''}>→</button></div>
  </section>`;
}

/** Atiende los clics del panel. Devuelve `true` si ha cambiado algo que haya que volver a dibujar. */
export function clicEnGente(el: HTMLElement): boolean {
  const id = el.dataset.id ?? '';
  switch (el.dataset.gente) {
    case 'filtro':
      filtro = id as Filtro;
      pagina = 0;
      return true;
    case 'pagina':
      pagina = Math.max(0, pagina + Number(id));
      return true;
    case 'ver':
      reiniciarRetrato();
      seleccionada = id;
      pestana = 'resumen';
      return true;
    case 'volver':
      seleccionada = null;
      return true;
    case 'pestana':
      pestana = id as Pestana;
      return true;
    case 'plan-abrir':
      planAbierto = !planAbierto;
      return true;
    case 'peticion-abrir':
      peticionAbierta = peticionAbierta === id ? null : id;
      return true;
    case 'plan-dia':
      if (seleccionada) eleccionesDePlan.set(seleccionada, { ...eleccionesDePlan.get(seleccionada), cuando: id as EleccionDePlan['cuando'], minuto: undefined });
      return true;
    default:
      return false;
  }
}

/** Cambia un desplegable del formulario de proponer un plan (actividad, sitio u hora). `true` si hay que volver a dibujar. */
export function cambioEnGente(el: HTMLSelectElement): boolean {
  if (el.dataset.gente === 'peticion-campo' && el.dataset.id) {
    eleccionesDePeticion.set(el.dataset.id, el.value);
    return true;
  }
  if (el.dataset.gente !== 'plan-campo' || !seleccionada) return false;
  const campo = el.dataset.campo;
  const previo = eleccionesDePlan.get(seleccionada) ?? {};
  if (campo === 'actividad') eleccionesDePlan.set(seleccionada, { ...previo, actividad: el.value, lugar: undefined, minuto: undefined });
  else if (campo === 'lugar') eleccionesDePlan.set(seleccionada, { ...previo, lugar: el.value, minuto: undefined });
  else if (campo === 'minuto') eleccionesDePlan.set(seleccionada, { ...previo, minuto: Number(el.value) });
  else return false;
  return true;
}

/** Al empezar otra partida se vuelve al principio. */
export function reiniciarGente(): void {
  filtro = 'aqui';
  pagina = 0;
  seleccionada = null;
  pestana = 'resumen';
  planAbierto = false;
  eleccionesDePlan.clear();
  reiniciarRetrato();
}
