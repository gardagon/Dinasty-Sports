/**
 * Diagnóstico de dónde está la gente en el mapa (encargo `docs/relevo/gente-por-la-calle.md`): a cada hora de un día de clase, de un sábado y de un día de vacaciones, cuántas personas hay en cada sitio y de qué tipo.
 * Solo mide: no cambia el juego. Usa las agendas reales que da el servicio de presencia (con los clubes y los horarios de la partida) y `ubicacionEn` a cualquier minuto.
 *
 *   npx tsx tools/gente-por-la-calle.ts [--pais prueba|actual|grande] [--horas 7:00,7:30,...]   (por defecto, las tres ciudades; salida en Markdown)
 */
import { PAIS_CIUDAD_DE_PRUEBA, PAIS_CIUDAD_GRANDE, SERVICES, registrarPais, tipoDeSitio, timeView, ubicacionEn, type LugaresService, type PresenciaService } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';

const args = process.argv.slice(2);
const arg = (k: string): string | undefined => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const quePaises = (arg('--pais') ?? 'prueba,actual,grande').split(',');
const hm = (s: string): number => { const [a, b = '0'] = s.split(':'); return Number(a) * 60 + Number(b); };
const HORAS = (arg('--horas') ?? '6:30,7:00,7:30,7:55,8:30,9:00,10:00,10:50,12:00,13:50,14:10,14:40,15:30,17:00,18:00,19:00,20:00,21:00,22:00').split(',');

/** Los tres tipos de día: lectivo (miércoles de la semana 4), sábado (de esa semana) y vacaciones (miércoles de la semana 45, verano). */
const DIAS = [
  { nombre: 'Día de clase (miércoles)', dia: 4 * 7 + 2 },
  { nombre: 'Sábado', dia: 4 * 7 + 5 },
  { nombre: 'Vacaciones (miércoles de verano)', dia: 45 * 7 + 2 },
] as const;

const PAISES = { prueba: PAIS_CIUDAD_DE_PRUEBA, actual: undefined, grande: PAIS_CIUDAD_GRANDE } as const;

function categoria(n: { id: string; role: string; nacimiento?: number; tipos?: { tipo: string; recoge?: boolean; escolar?: boolean }[] }, tipo: string, dia: number, inicioCurso: number): string {
  const edad = n.nacimiento === undefined ? undefined : edadNpc(n as never, inicioCurso);
  if (tipo === 'vecino') {
    const t = n.tipos?.find((x) => x.tipo === 'vecino');
    if (edad !== undefined && edad < 18) return 'niño del barrio / otro colegio';
    if (/^vecino_\d+$/.test(n.id)) return t?.recoge ? 'vecino adulto (recoge)' : (edad ?? 0) >= 67 ? 'vecino jubilado' : 'vecino adulto';
    return 'joven 18–19 (sin colegio)';
  }
  return ({ alumno: 'alumno del colegio', hermano: 'hermano', profesor: 'profesor', entrenador: 'entrenador', club: 'club', rival: 'rival', amigo: 'amigo', progenitor: 'padre/madre', bibliotecario: 'bibliotecario' } as Record<string, string>)[tipo] ?? tipo;
}

function medir(nombre: string, pais: (typeof PAISES)[keyof typeof PAISES]): void {
  if (pais) registrarPais(pais);
  const g = nuevaPartida({ seed: 31, ...(pais ? { pais: pais.id, deportes: ['atletismo', 'futbol'] } : { deportes: ['atletismo', 'futbol'] }) }, [...MODULOS, futbol]);
  const lista = (g.moduleState('npcs') as NpcsState).npcs;
  const pres = g.service<PresenciaService>(SERVICES.presencia)!;
  const mapa = g.service<LugaresService>(SERVICES.lugares)!.mapa();
  const sitios = mapa.lugares.filter((l) => l.id !== undefined);
  const adultos = lista.filter((n) => /^vecino_\d+$/.test(n.id) && (n.nacimiento === undefined || (edadNpc(n, 0) ?? 99) >= 18));
  console.log(`\n## Ciudad «${nombre}»: ${lista.length} personas; vecinos adultos (vecino_N de 18+): ${adultos.length}; con la marca «recoge»: ${adultos.filter((n) => n.tipos?.some((t) => t.recoge)).length}; desconocidos: ${lista.filter((n) => n.known === false).length}\n`);
  const agendas = new Map(lista.map((n) => [n.id, pres.agenda(n.id)]));
  const cal = undefined;
  for (const d of DIAS) {
    console.log(`### ${nombre} — ${d.nombre}\n`);
    const tabla: { hora: string; porSitio: Map<string, Map<string, number>>; fuera: Map<string, number>; ocupados: number }[] = [];
    for (const h of HORAS) {
      const t = timeView(d.dia * 1440 + hm(h), cal);
      const porSitio = new Map<string, Map<string, number>>();
      const fuera = new Map<string, number>();
      let ocupados = 0;
      for (const n of lista) {
        const u = ubicacionEn(agendas.get(n.id)!, t, n.id);
        const cat = categoria(n as never, u.tipo, t.day, 0);
        if (u.ocupado) { ocupados++; continue; }
        if (u.sitio === null) { fuera.set(cat, (fuera.get(cat) ?? 0) + 1); continue; }
        const m = porSitio.get(u.sitio) ?? new Map<string, number>();
        m.set(cat, (m.get(cat) ?? 0) + 1);
        porSitio.set(u.sitio, m);
      }
      tabla.push({ hora: h, porSitio, fuera, ocupados });
    }
    // Totales por sitio.
    const ids = sitios.map((s) => s.id);
    const nom = (id: string) => `${id}${tipoDeSitio(sitios.find((s) => s.id === id)!) === 'calle' ? ' (calle)' : ''}`;
    console.log(`| hora | ${ids.map(nom).join(' | ')} | en el mapa | vecinos adultos en el mapa / de ${adultos.length} |`);
    console.log(`|---|${ids.map(() => '---:').join('|')}|---:|---:|`);
    for (const f of tabla) {
      const tot = (id: string) => [...(f.porSitio.get(id)?.values() ?? [])].reduce((a, b) => a + b, 0);
      const enMapa = ids.reduce((a, id) => a + tot(id), 0);
      const va = ids.reduce((a, id) => a + (f.porSitio.get(id)?.get('vecino adulto') ?? 0) + (f.porSitio.get(id)?.get('vecino jubilado') ?? 0) + (f.porSitio.get(id)?.get('vecino adulto (recoge)') ?? 0), 0);
      console.log(`| ${f.hora} | ${ids.map((id) => tot(id) || '·').join(' | ')} | ${enMapa} | ${va} |`);
    }
    // Desglose por tipo en cada sitio de la calle (sin los del colegio que ya salen arriba).
    console.log('\nDe qué tipo (sitio: tipo n, ...), solo sitios con gente y fuera del colegio y los clubes:\n');
    for (const f of tabla) {
      const partes: string[] = [];
      for (const id of ids) {
        if (['aula', 'pista_colegio', 'campo_colegio', 'sala_profesores', 'administracion'].includes(id)) continue;
        const m = f.porSitio.get(id);
        if (!m) continue;
        partes.push(`**${id}**: ${[...m].sort((a, b) => b[1] - a[1]).map(([c, k]) => `${c} ${k}`).join(', ')}`);
      }
      console.log(`- ${f.hora} — ${partes.join(' · ') || '(nadie)'}`);
    }
    console.log('');
  }
}

for (const p of quePaises) medir(p, PAISES[p as keyof typeof PAISES]);
