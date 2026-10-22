import './style.css';
import {
  GEN,
  MINUTES_PER_DAY,
  NOMBRE_PERIODO,
  SERVICES,
  timeView,
  type BodyType,
  type ClubDirectory,
  type IdentityService,
  type LogTable,
  type NpcDirectory,
  type StudiesService,
} from '@ds/contracts';
import type { ActionOption, ActionResult, Game, GameState } from '@ds/core';
import { cargarPartida, nuevaPartida } from '@ds/game';

/**
 * Interfaz web mínima. Solo habla con el motor (@ds/game / @ds/core): no conoce
 * la lógica de ningún módulo, así que cada módulo nuevo aparece aquí solo.
 */

// ------------------------------------------------------------------ estado de la UI

interface AgendaItem {
  start: number;
  duration: number;
  name: string;
  rest: boolean;
}
interface SaveFile {
  state: GameState;
  agenda: AgendaItem[];
}
type Tab = 'hacer' | 'personaje' | 'relaciones' | 'diario';

const SAVE_KEY = 'dinasty-sports:partida';
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ESTADO = [GEN.energia, GEN.salud, GEN.estres, GEN.motivacion];
/** Stats en las que subir es malo (se pintan al revés). */
const MALO_SI_SUBE = new Set<string>([GEN.estres]);

let game: Game | null = null;
let agenda: AgendaItem[] = [];
let tab: Tab = 'hacer';
let lastResult: { name: string; result: ActionResult; fresh: boolean } | null = null;
let showUnavailable = false;

const app = document.getElementById('app')!;

// ------------------------------------------------------------------ guardado

function save(): void {
  if (!game) return;
  try {
    const data: SaveFile = { state: game.serialize(), agenda: agenda.slice(-60) };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* sin almacenamiento disponible: la partida sigue en memoria */
  }
}

function load(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as SaveFile;
    game = cargarPartida(data.state);
    agenda = data.agenda ?? [];
  } catch (e) {
    console.warn('No se pudo cargar la partida guardada', e);
    game = null;
  }
}

// ------------------------------------------------------------------ utilidades

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const hhmm = (minuteOfDay: number) =>
  `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
const fmtDur = (m: number) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
};
const statName = (id: string) => game?.registry.stats.get(id)?.def.name ?? id;
const pct = (v: number) => `${Math.round(v * 100)} %`;

function signedChange(id: string, d: number): string {
  const bueno = MALO_SI_SUBE.has(id) ? d < 0 : d > 0;
  const txt = `${d > 0 ? '+' : '−'}${Math.abs(d) < 1 ? Math.abs(d).toFixed(2) : Math.abs(d).toFixed(1)}`;
  return `<span class="${bueno ? 'gain' : 'loss'}">${esc(statName(id))} ${txt}</span>`;
}

// ------------------------------------------------------------------ vistas

function viewStart(): string {
  return `<main class="app"><section class="start">
    <h1>Dinasty Sports</h1>
    <p>Un curso escolar, un deporte y cada hora cuenta. Decide en qué inviertes tu tiempo.</p>
    <form data-form="nueva">
      <label for="nombre">Nombre de tu personaje</label>
      <input id="nombre" name="nombre" maxlength="24" autocomplete="off" value="Alex" required />
      <button class="primary" type="submit">Empezar el curso</button>
    </form>
  </section></main>`;
}

function viewDay(g: Game): string {
  const t = g.time;
  const dayStart = t.day * MINUTES_PER_DAY;
  const blocks = agenda
    .map((a) => {
      const s = Math.max(a.start, dayStart);
      const e = Math.min(a.start + a.duration, dayStart + MINUTES_PER_DAY);
      if (e <= s) return '';
      const left = ((s - dayStart) / MINUTES_PER_DAY) * 100;
      const width = ((e - s) / MINUTES_PER_DAY) * 100;
      return `<span class="lane-block${a.rest ? ' descanso' : ''}" style="left:${left}%;width:${width}%" title="${esc(a.name)} · ${hhmm(s - dayStart)}–${hhmm(e - dayStart)}"></span>`;
    })
    .join('');
  const now = (t.minuteOfDay / MINUTES_PER_DAY) * 100;

  const meters = ESTADO.map((id) => {
    const v = g.stat(id);
    const warn = MALO_SI_SUBE.has(id) ? v > 60 : v < 30;
    return `<div class="meter${warn ? ' warn' : ''}">
      <div class="meter-head">${esc(statName(id))}<b>${Math.round(v)}</b></div>
      <div class="bar"><i style="width:${v}%"></i></div>
    </div>`;
  }).join('');

  return `<header class="day">
    <div class="day-top">
      <h1 class="clock">${hhmm(t.minuteOfDay)}<small>${DIAS[t.weekday]} · curso ${t.schoolYear + 1}, semana ${t.schoolWeek + 1}<br>${t.period === 'clase' ? `${t.term}.º trimestre` : NOMBRE_PERIODO[t.period]}</small></h1>
      <div class="who"><strong>${esc(g.playerName)}</strong><button data-act="reiniciar">Nueva partida</button></div>
    </div>
    <div class="lane" role="img" aria-label="Lo que has hecho hoy">${blocks}<span class="lane-now" style="left:calc(${now}% - 1px)"></span></div>
    <div class="lane-hours"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>
    <div class="meters">${meters}</div>
  </header>`;
}

function viewTable(t: LogTable): string {
  const cls = (i: number) => (t.align?.[i] === 'right' ? ' class="num"' : '');
  const head = t.header.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('');
  const rows = t.rows
    .map((r, i) => `<tr${i === t.highlight ? ' class="me"' : ''}>${r.map((c, j) => `<td${cls(j)}>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<details class="table" open><summary>${t.header[0] === 'Pos.' ? 'Clasificación' : 'Detalle'}</summary><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></details>`;
}

function viewResult(): string {
  if (!lastResult) return '';
  const { name, result } = lastResult;
  const fresh = lastResult.fresh ? ' fresh' : '';
  lastResult.fresh = false; // la animación solo marca lo que acaba de cambiar
  if (!result.ok) return `<section class="sheet result${fresh}"><p><b>${esc(name)}</b>: ${esc(result.reason ?? '')}</p></section>`;
  const changes = Object.entries(result.changes)
    .filter(([, d]) => Math.abs(d) >= 0.05)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([id, d]) => signedChange(id, d))
    .join('');
  const log = result.log
    .map((l) => `<p class="${l.kind === 'aviso' ? 'loss' : ''}">${esc(l.text)}</p>${l.table ? viewTable(l.table) : ''}`)
    .join('');
  return `<section class="sheet result${fresh}" aria-live="polite">
    <p><b>${esc(name)}</b> <span class="note">${fmtDur(result.duration)}${result.efficiency !== 1 ? `, rendimiento ${pct(result.efficiency)}` : ''}</span></p>
    ${changes ? `<div class="changes">${changes}</div>` : ''}
    ${log}
  </section>`;
}

function actionButton(o: ActionOption): string {
  const why: string[] = [];
  if (!o.available) why.push(esc(o.reason ?? 'No disponible'));
  else {
    if (Math.abs(o.efficiency - 1) >= 0.01) why.push(`Rendimiento ${pct(o.efficiency)}`);
    for (const m of o.modifiers) {
      const e = m.result.efficiency ?? 1;
      const cls = e > 1 || (m.result.cost ?? 1) < 1 ? 'up' : 'down';
      if (m.result.reason) why.push(`<span class="${cls}">${esc(m.result.reason)}</span>`);
    }
  }
  return `<button class="action" data-do="${esc(o.id)}" ${o.available ? '' : 'disabled'}>
    <span class="action-name">${esc(o.name)}</span>
    <span class="action-time">${fmtDur(o.duration)}</span>
    ${why.length ? `<span class="action-why">${why.join(' · ')}</span>` : ''}
  </button>`;
}

function viewActions(g: Game): string {
  const opts = g.listActions();
  const groups = new Map<string, ActionOption[]>();
  for (const o of opts) {
    if (!o.available && !showUnavailable) continue;
    groups.set(o.group, [...(groups.get(o.group) ?? []), o]);
  }
  const hidden = opts.filter((o) => !o.available).length;
  const html = [...groups]
    .map(([group, list]) => `<h3>${esc(group)}</h3><div class="actions">${list.map(actionButton).join('')}</div>`)
    .join('');
  return `<section class="sheet">
    ${html || '<p class="note">Ahora mismo no puedes hacer nada. Descansa un rato para que pase el tiempo.</p>'}
    ${hidden ? `<button class="toggle-unavailable" data-act="toggle">${showUnavailable ? 'Ocultar lo que no está disponible' : `Ver lo que no está disponible ahora (${hidden})`}</button>` : ''}
  </section>`;
}

const COMPLEXION: Record<BodyType, string> = {
  delgado: 'Delgada',
  normal: 'Normal',
  atletico: 'Atlética',
  musculado: 'Musculosa',
  con_sobrepeso: 'Con sobrepeso',
};

function viewIdentity(g: Game): string {
  const id = g.service<IdentityService>(SERVICES.identidad)?.view();
  if (!id) return '';
  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const curso = g.service<StudiesService>(SERVICES.estudios)?.courseName();
  const clubes = g.service<ClubDirectory>(SERVICES.clubes);
  const club = clubes ? (clubes.membership('atletismo')?.nombre ?? 'Sin club') : undefined;
  return `<section class="sheet"><h2>${esc(g.playerName)}</h2>
    <dl class="identity">
      <div><dt>Edad</dt><dd>${id.age} años</dd></div>
      <div><dt>Altura</dt><dd>${fmt(id.heightCm)} cm</dd></div>
      <div><dt>Peso</dt><dd>${fmt(id.weightKg)} kg</dd></div>
      <div><dt>Dominancia</dt><dd>${id.leftHanded ? 'Zurdo' : 'Diestro'}</dd></div>
      <div><dt>Complexión</dt><dd>${COMPLEXION[id.bodyType]}</dd></div>
      ${curso ? `<div><dt>Curso</dt><dd>${esc(curso)}</dd></div>` : ''}
      ${club ? `<div><dt>Club de atletismo</dt><dd>${esc(club)}</dd></div>` : ''}
    </dl>
  </section>`;
}

function viewCharacter(g: Game): string {
  const groups = new Map<string, string[]>();
  // Solo se muestran las asignaturas del curso actual.
  const activas = g.service<StudiesService>(SERVICES.estudios)?.activeSubjects();
  for (const s of g.registry.statList) {
    if (s.def.category === 'estado' || s.def.hidden) continue;
    if (activas && s.module === 'estudios' && !activas.includes(s.def.id)) continue;
    const key = s.def.group ?? g.registry.moduleNames.get(s.module) ?? s.module;
    groups.set(key, [...(groups.get(key) ?? []), s.def.id]);
  }
  const rows = [...groups]
    .map(([group, ids]) => {
      const items = ids
        .map((id) => {
          const info = g.registry.stats.get(id)!;
          const v = g.stat(id);
          const span = info.max - info.min;
          const cap = ((g.cap(id) - info.min) / span) * 100;
          return `<div class="stat" title="Techo actual: ${Math.round(g.cap(id))}">
            <span>${esc(info.def.name)}</span>
            <div class="bar"><i style="width:${((v - info.min) / span) * 100}%"></i>${cap < 99.5 ? `<span class="cap" style="left:${cap}%"></span>` : ''}</div>
            <span class="stat-val">${Math.round(v)}</span>
          </div>`;
        })
        .join('');
      return `<h3>${esc(group)}</h3>${items}`;
    })
    .join('');
  return `<section class="sheet"><h2>Características</h2>${rows}
    <p class="note">La marca vertical es tu techo actual: sube cuando mejoran las características genéricas que lo apoyan.</p>
  </section>`;
}

function viewResults(g: Game): string {
  const parts: string[] = [];
  const est = g.service<StudiesService>(SERVICES.estudios);
  if (est) {
    const m = est.average();
    parts.push(`<p>Nota media reciente: <b>${m === null ? 'sin exámenes aún' : m.toFixed(1)}</b><br><span class="note">Faltas: ${est.absences()}. Controles cada viernes.</span></p>`);
  }
  const atl = g.moduleState<{ mejorMarca: number | null; carreras: { position: number; total: number }[] } | undefined>('atletismo');
  if (atl) {
    const ult = atl.carreras[atl.carreras.length - 1];
    parts.push(`<p>Mejor marca en 400 m: <b>${atl.mejorMarca === null ? 'sin carreras aún' : `${atl.mejorMarca.toFixed(2)} s`}</b><br><span class="note">${ult ? `Última carrera: ${ult.position}º de ${ult.total}.` : 'Las carreras son los sábados por la mañana.'}</span></p>`);
  }
  return parts.length ? `<section class="sheet"><h2>Resultados</h2>${parts.join('')}</section>` : '';
}

function viewPeople(g: Game): string {
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  if (!dir) return '<section class="sheet"><p class="note">No hay módulo de relaciones cargado.</p></section>';
  const ROL: Record<string, [string, string]> = {
    entrenador: ['Entrenadora', 'Entrenador'],
    profesor: ['Tutora', 'Tutor'],
    companero: ['Compañera', 'Compañero'],
    amigo: ['Amiga', 'Amigo'],
    rival: ['Rival', 'Rival'],
    familia: ['Familia', 'Familia'],
  };
  const items = dir
    .list()
    .filter((n) => n.known !== false)
    .map((n) => {
      const lvl = Object.entries(n.levels).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
      const ayuda = n.supports.length ? `Con buena relación (40+) te ayuda en: ${n.supports.join(', ')}.` : '';
      return `<div class="npc">
        <div class="npc-head"><b>${esc(n.name)}</b><span>${ROL[n.role]?.[n.gender === 'f' ? 0 : 1] ?? n.role}</span></div>
        <div class="bar" title="Afinidad ${Math.round(n.affinity)}"><i style="width:${n.affinity}%"></i></div>
        <div class="note">Afinidad ${Math.round(n.affinity)}${lvl ? ` · nivel ${esc(lvl)}` : ''}. ${esc(n.description ?? '')} ${esc(ayuda)}</div>
      </div>`;
    })
    .join('');
  return `<section class="sheet"><h2>Relaciones</h2>${items}</section>`;
}

function viewLog(g: Game): string {
  const items = [...g.log]
    .reverse()
    .map((l) => {
      const t = timeView(l.minute);
      return `<li><time>${DIAS[t.weekday].slice(0, 3)} ${hhmm(t.minuteOfDay)}</time><span class="${l.kind ?? ''}">${esc(l.text)}${l.table ? viewTable({ ...l.table }).replace(' open>', '>') : ''}</span></li>`;
    })
    .join('');
  return `<section class="sheet"><h2>Diario</h2>${items ? `<ul class="log">${items}</ul>` : '<p class="note">Aún no ha pasado nada destacable.</p>'}</section>`;
}

function viewGame(g: Game): string {
  const tabs: [Tab, string][] = [
    ['hacer', 'Qué hacer'],
    ['personaje', 'Personaje'],
    ['relaciones', 'Relaciones'],
    ['diario', 'Diario'],
  ];
  let main = '';
  let side = '';
  if (tab === 'hacer') {
    main = viewResult() + viewActions(g);
    side = viewResults(g);
  } else if (tab === 'personaje') {
    main = viewIdentity(g) + viewCharacter(g);
    side = viewResults(g);
  } else if (tab === 'relaciones') main = viewPeople(g);
  else main = viewLog(g);

  return `<main class="app">
    ${viewDay(g)}
    <nav class="tabs" role="tablist">${tabs
      .map(([id, label]) => `<button class="tab" role="tab" aria-selected="${tab === id}" data-tab="${id}">${label}</button>`)
      .join('')}</nav>
    <div class="layout"><div class="main">${main}</div><aside class="side">${side}</aside></div>
  </main>`;
}

function render(): void {
  app.innerHTML = game ? viewGame(game) : viewStart();
}

// ------------------------------------------------------------------ interacción

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-do],[data-tab],[data-act]');
  if (!el || !game) return;
  if (el.dataset.tab) {
    tab = el.dataset.tab as Tab;
    render();
    return;
  }
  if (el.dataset.act === 'toggle') {
    showUnavailable = !showUnavailable;
    render();
    return;
  }
  if (el.dataset.act === 'reiniciar') {
    if (confirm('¿Empezar una partida nueva? Se perderá la actual.')) {
      try { localStorage.removeItem(SAVE_KEY); } catch { /* nada */ }
      game = null;
      agenda = [];
      lastResult = null;
      render();
    }
    return;
  }
  const id = el.dataset.do;
  if (id) {
    const opt = game.preview(id);
    const start = game.time.minute;
    const result = game.perform(id);
    if (result.ok && opt) agenda.push({ start, duration: result.duration, name: opt.name, rest: opt.tags.includes('descanso') });
    lastResult = { name: opt?.name ?? id, result, fresh: true };
    save();
    render();
  }
});

app.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  if (form.dataset.form !== 'nueva') return;
  e.preventDefault();
  const nombre = (new FormData(form).get('nombre') as string).trim() || 'Alex';
  game = nuevaPartida({ playerName: nombre });
  agenda = [];
  lastResult = null;
  tab = 'hacer';
  save();
  render();
});

load();
render();

// ------------------------------------------------------------------ PWA (instalable y sin conexión)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('No se pudo registrar el service worker', e));
  });
}
