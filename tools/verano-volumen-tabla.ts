/**
 * Agrega las líneas `#V` de `tools/verano-volumen.ts` en tablas (por categoría y año; media y rango entre semillas).
 * `npx tsx tools/verano-volumen-tabla.ts <archivo> [archivo…]` (los archivos con la salida de la herramienta).
 */
import { readFileSync } from 'node:fs';

type Fila = Record<string, number>;
const datos = process.argv.slice(2).flatMap((f) => readFileSync(f, 'utf8').split('\n').filter((l) => l.startsWith('#V ')).map((l) => JSON.parse(l.slice(3)) as { seed: number; ciudad: string; extra: Record<string, number>; filas: Record<string, Fila> }));
const CLAVES = ['benjamin|1', 'benjamin|2', 'alevin|1', 'alevin|2', 'infantil|1', 'infantil|2', 'cadete|1', 'cadete|2', 'juvenil|1', 'juvenil|2', 'juvenil|3'];
const CATS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const v = (d: (typeof datos)[number], k: string, campo: string): number => d.filas[k]?.[campo] ?? 0;
const porCat = (d: (typeof datos)[number], cat: string, campo: string): number => CLAVES.filter((k) => k.startsWith(cat)).reduce((t, k) => t + v(d, k, campo), 0);
const fmt = (xs: number[], dec = 0): string => (xs.length === 1 ? xs[0].toFixed(dec) : `${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(dec)} (${Math.min(...xs).toFixed(dec)}–${Math.max(...xs).toFixed(dec)})`);
const pct = (a: number, b: number): string => (b ? `${((100 * a) / b).toFixed(0)} %` : '—');
const salida: string[] = [];
const say = (s = ''): void => { salida.push(s); };
const tabla = (cab: string[], filas: (string | number)[][]): void => { say(`| ${cab.join(' | ')} |`); say(`|${cab.map(() => '---').join('|')}|`); for (const f of filas) say(`| ${f.join(' | ')} |`); say(); };

for (const modo of ['una', 'media'] as const) {
  const ds = modo === 'una' ? datos.filter((d) => d.seed === 33 && d.ciudad === 'grande') : datos.filter((d) => d.ciudad === 'grande');
  if (!ds.length) continue;
  say(`## ${modo === 'una' ? 'Semilla 33 (ciudad grande con hogares)' : `Media y rango de ${ds.length} semillas (${ds.map((d) => d.seed).join(', ')})`}`);
  say();
  const unidades = modo === 'una' ? CLAVES.map((k) => [k, (d: (typeof datos)[number], c: string) => v(d, k, c)] as const) : CATS.map((c) => [c, (d: (typeof datos)[number], campo: string) => porCat(d, c, campo)] as const);
  const nom = (k: string): string => k.replace('|', ' ').replace('benjamin', 'benjamín').replace('alevin', 'alevín').replace(/ (\d)$/, ' · $1.º año');
  say('### 1–3. Los que había, los que lo dejan y los que buscan club');
  say();
  tabla(['', 'Jugaban', 'Abandonan', '%', 'Se retiran por edad', 'Quedan libres al acabar el colegio', 'Buscan cambiar', '%', 'Lo consiguen', 'Cambian de club (en total)', 'Sin club al final (apartados)'], unidades.map(([k, f]) => {
    const h = ds.map((d) => f(d, 'habia'));
    const sum = (campo: string): number[] => ds.map((d) => f(d, campo));
    const m = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    return [nom(k), fmt(h), fmt(sum('abandona')), pct(m(sum('abandona')), m(h)), fmt(sum('sale_por_arriba')), fmt(sum('libre_fin_colegio')), fmt(sum('busca')), pct(m(sum('busca')), m(h)), fmt(sum('busca_consigue')), fmt(sum('cambia_club')), fmt(ds.map((d) => f(d, 'apartado_sin_club') + f(d, 'dejan_sin_club_dos_plazos')))];
  }));
  say('Buscan cambiar, por motivo (un niño puede tener más de uno):');
  say();
  tabla(['', 'A probar fuera (hacia un club mejor)', 'Suplente que baja a uno menor', 'Pierde la plaza por mérito', 'Sobra al recolocar', 'Cierra su equipo', 'Fin del colegio'], unidades.map(([k, f]) => [nom(k), fmt(ds.map((d) => f(d, 'busca_probar_sube'))), fmt(ds.map((d) => f(d, 'busca_probar_baja'))), fmt(ds.map((d) => f(d, 'busca_merito'))), fmt(ds.map((d) => f(d, 'busca_sobra'))), fmt(ds.map((d) => f(d, 'busca_cierre'))), fmt(ds.map((d) => f(d, 'busca_colegio')))]));
  say('### 4. Flujo entre categorías por edad (los que siguen jugando pasan al año siguiente)');
  say();
  const destinos = new Map<string, Map<string, number[]>>();
  for (const k of CLAVES) for (const d of ds) for (const [campo, n] of Object.entries(d.filas[k] ?? {})) if (campo.startsWith('a:')) { const m = destinos.get(k) ?? destinos.set(k, new Map()).get(k)!; (m.get(campo.slice(2)) ?? m.set(campo.slice(2), []).get(campo.slice(2))!).push(n); }
  tabla(['De', 'Pasan a (media)'], CLAVES.map((k) => [nom(k), [...(destinos.get(k) ?? [])].map(([dest, xs]) => `${nom(dest)}: ${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(0)}`).join('; ') || '—']));
  say('### 5. Quién entra (no jugaban al final del curso y juegan al empezar el siguiente)');
  say();
  const entra = (cat: string, campo: string, f: (d: (typeof datos)[number]) => number): void => void [cat, campo, f];
  void entra;
  tabla(['', 'De 8 años (benjamín, 1.er año)', 'Familias que se mudan', 'Niños nuevos (existían, no jugaban)', 'Apartados que vuelven'], unidades.map(([k, f]) => [nom(k), fmt(ds.map((d) => f(d, 'entra_8_anos'))), fmt(ds.map((d) => f(d, 'entra_mudanza'))), fmt(ds.map((d) => f(d, 'entra_no_jugaba'))), fmt(ds.map((d) => f(d, 'entra_apartado_vuelve')))]));
  say(`De 8 años en el mundo: ${fmt(ds.map((d) => d.extra.de8))}, de ellos juegan ${fmt(ds.map((d) => d.extra.de8Juegan))}. Personas nuevas por mudanza (todas las edades, jueguen o no): ${fmt(ds.map((d) => d.extra.mudadosSinJugar))}.`);
  say();
  say('### 6. Quién sale por arriba (los que dejan juvenil por edad)');
  say();
  const upar = (d: (typeof datos)[number], c: string): number => v(d, 'juvenil|3', c);
  tabla(['', 'Terminan juvenil (3.º año)', 'De ellos siguen jugando al empezar el curso (sin categoría)', 'Abandonan antes (ya contados arriba)'], [['juvenil · 3.º año', fmt(ds.map((d) => upar(d, 'habia'))), fmt(ds.map((d) => upar(d, 'a:senior|1'))), fmt(ds.map((d) => upar(d, 'abandona')))]]);
  say('### 7. El balance neto, por año y por categoría (curso que acaba frente a curso que empieza)');
  say();
  const m = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  say('Por año de la categoría (personas que había en ese año frente a las que habrá en él: no son las mismas personas, son los tamaños de cada «promoción»):');
  say();
  tabla(['', 'Había al final del curso', 'Habrá al empezar, antes de rehacer los equipos (los que suben y siguen)', 'Habrá tras todo el verano (con las llegadas)'], CLAVES.map((k) => [nom(k), fmt(ds.map((d) => v(d, k, 'habia'))), fmt(ds.map((d) => v(d, k, 'empieza_sin_rehacer'))), fmt(ds.map((d) => v(d, k, 'empieza_final')))]));
  say('Por categoría:');
  say();
  tabla(['', 'Había al final del curso', 'Al empezar, antes de rehacer los equipos', 'Tras todo el verano', 'Balance neto (tras todo el verano frente a había)'], CATS.map((c) => {
    const h = ds.map((d) => porCat(d, c, 'habia')), sr = ds.map((d) => porCat(d, c, 'empieza_sin_rehacer')), fi = ds.map((d) => porCat(d, c, 'empieza_final'));
    return [c, fmt(h), fmt(sr), fmt(fi), `${m(fi) - m(h) >= 0 ? '+' : ''}${(m(fi) - m(h)).toFixed(0)} (${pct(m(fi) - m(h), m(h))})`];
  }));
  if (modo === 'media') {
    say('### Por sexo, desde infantil (solo como dato: hoy ~50 % de chicas)');
    say();
    const porSexo = (d: (typeof datos)[number], cat: string, sx: string, campo: string): number => CLAVES.filter((k) => k.startsWith(cat)).reduce((t, k) => t + (d.filas[`${k}@${sx}`]?.[campo] ?? 0), 0);
    const mm = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    tabla(['', 'Sexo', 'Jugaban', 'Abandonan', '%', 'Buscan cambiar', '%', 'Entran', 'Tras todo el verano', 'Balance'], ['infantil', 'cadete', 'juvenil'].flatMap((c) => ['f', 'm'].map((sx) => {
      const h = ds.map((d) => porSexo(d, c, sx, 'habia')), ab = ds.map((d) => porSexo(d, c, sx, 'abandona')), bu = ds.map((d) => porSexo(d, c, sx, 'busca'));
      const en = ds.map((d) => ['entra_8_anos', 'entra_mudanza', 'entra_no_jugaba', 'entra_apartado_vuelve'].reduce((t, k) => t + porSexo(d, c, sx, k), 0));
      const fi = ds.map((d) => porSexo(d, c, sx, 'empieza_final'));
      return [c, sx === 'f' ? 'chicas' : 'chicos', fmt(h), fmt(ab), pct(mm(ab), mm(h)), fmt(bu), pct(mm(bu), mm(h)), fmt(en), fmt(fi), `${mm(fi) - mm(h) >= 0 ? '+' : ''}${(mm(fi) - mm(h)).toFixed(0)} (${pct(mm(fi) - mm(h), mm(h))})`];
    })));
  }
}
console.log(salida.join('\n'));
