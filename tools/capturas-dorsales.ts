/**
 * Capturas de «Mi equipo» y de la crónica de un partido (`docs/relevo/dorsales.md`), en ancho de móvil (390) y de escritorio (1280). Playwright con el Chromium instalado, deviceScaleFactor 1.
 *
 *   npx tsx tools/capturas-dorsales.ts <carpeta> [semilla]
 *
 * Sirve también en la versión anterior (sin dorsales). Construye la web con una clave de usar y tirar, instala el fútbol y crea la partida con la ciudad grande.
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarClaves } from '@ds/paquetes';
import { publicarDeportes } from './publicar';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const capturas = resolve(process.argv[2] ?? join(tmpdir(), 'ds-mi-equipo'));
const semilla = Number(process.argv[3] ?? 35);
mkdirSync(capturas, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<any> } };

const claves = await generarClaves();
const dist = mkdtempSync(join(tmpdir(), 'ds-web-cap-'));
execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: join(raiz, 'apps', 'web'), env: { ...process.env, VITE_DS_CLAVE_PUBLICA: claves.publica }, stdio: 'pipe' });
await publicarDeportes(raiz, dist, claves.privada, () => undefined);
const TIPOS: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(dist, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  const archivo = existsSync(ruta) && statSync(ruta).isDirectory() ? join(ruta, 'index.html') : ruta;
  if (!existsSync(archivo)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
});
await new Promise<void>((r) => servidor.listen(0, r));
const url = `http://localhost:${(servidor.address() as { port: number }).port}/?depurar`;

const navegador = await chromium.launch();
try {
  const pagina = await (await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
  await pagina.addInitScript('window.__name = (f) => f;');
  pagina.on('dialog', (d: { accept(): Promise<void> }) => void d.accept());
  const ds = <T>(fn: string): Promise<T> => pagina.evaluate(`(${fn})(window.__ds)`) as Promise<T>;
  const depurar = () => pagina.screenshot({ path: join(capturas, 'error.png') });
  const foto = (nombre: string) => pagina.screenshot({ path: join(capturas, nombre), fullPage: true });
  await pagina.goto(url);
  await pagina.waitForFunction(() => '__ds' in window);
  await pagina.click('[data-act="ir-opciones"]');
  await pagina.waitForSelector('[data-act="instalar-deporte"]', { timeout: 60000 });
  await pagina.locator('p.botones', { hasText: 'Fútbol' }).locator('[data-act="instalar-deporte"]').click();
  await pagina.waitForFunction(() => (window as any).__ds.deportesInstalados().includes('futbol'), undefined, { timeout: 120000 });
  await pagina.click('[data-act="ir-menu"]');
  await pagina.click('[data-act="ir-nueva"]');
  await pagina.waitForSelector('[data-deporte-incluido="futbol"]');
  const etiqueta = await pagina.evaluate(() => [...document.querySelectorAll('#pais option')].map((o) => o.textContent ?? '').find((t) => /ciudad grande/.test(t)));
  await pagina.selectOption('#pais', { label: etiqueta });
  await pagina.evaluate((s: number) => (window as any).__ds.fijarSemilla(s), semilla);
  await pagina.click('[data-act="empezar"]');
  await pagina.waitForFunction(() => !!(window as any).__ds.game, undefined, { timeout: 1800000, polling: 200 });

  // Apuntarse al club del colegio y entrenar hasta tener partido; unos compañeros ya conocidos (como tras presentarse) para que la crónica y la tabla enseñen nombres y dorsales.
  const hasta = (semana: number, diaSemana: number, hora: number) => ds(`(d) => { const g = d.game; let n = 0; while (n++ < 20000 && !(g.time.week > ${semana} || (g.time.week === ${semana} && (g.time.weekday > ${diaSemana} || (g.time.weekday === ${diaSemana} && g.time.minuteOfDay >= ${hora * 60}))))) { if (!d.hacer('gen.descansar').ok && !d.hacer('gen.esperar').ok) break; } }`);
  await hasta(1, 2, 15);
  const unido = await ds<{ ok: boolean; reason?: string }>(`(d) => d.hacer('futbol.apuntarse_colegio')`);
  if (!unido.ok) throw new Error(`No se pudo apuntar al club: ${unido.reason}`);
  const conocidos = await ds<string[]>(`(d) => {
    const g = d.game; const dir = g.service('npcs'); const s = g.moduleState('npcs');
    const eq = g.moduleState('futbol').personaje ?? dir.equipoDelPersonaje('futbol'); const base = dir.plantillaDelEquipo('futbol', eq.club, eq.categoria, eq.letra).map((j) => j.id).filter((id) => id !== 'personaje');
    const ids = base.slice(0, 3);
    s.npcs = s.npcs.map((n) => (ids.includes(n.id) ? { ...n, known: true } : n));
    d.render();
    return ids;
  }`);
  const resultado = await ds<{ jugado: boolean; log: string[] }>(`(d) => {
    const g = d.game; const log = [];
    const hastaDia = (semana, dia, hora) => { while (!(g.time.week === semana && g.time.weekday === dia && g.time.hour === hora)) if (!g.perform('gen.descansar').ok && !g.perform('gen.esperar').ok) break; };
    const club = g.service('clubes').membership('futbol');
    for (let semana = g.time.week + 1; semana <= 20; semana++) {
      hastaDia(semana, 0, 9);
      for (const dia of club.sesiones.weekdays) { hastaDia(semana, dia, Math.ceil(club.sesiones.desde)); d.hacer('futbol.club_sesion'); }
      const f = g.moduleState('futbol'); const p = f.personaje;
      if (!p || !f.liga || !f.liga.categorias[p.categoria]) continue;
      const h = Object.entries(f.calendario?.partidos ?? {}).find(([id]) => { const q = id.split('|'); return q[1] === p.categoria && [q[3] + '|' + q[4], q[5] + '|' + q[6]].includes(p.club + '|' + p.letra); });
      if (!h) continue;
      const saque = (semana * 7 + h[1][0]) * 1440 + h[1][1] * 60;
      d.hastaElMinuto(saque - 150); d.llegarA('campo_municipal', saque - 60 + 2);
      if (!g.preview('futbol.unirse_companeros')?.available) continue;
      d.hacer('futbol.unirse_companeros'); d.hastaElMinuto(saque - 30); d.hacer('futbol.ir_vestuario'); d.hastaElMinuto(saque);
      const j = d.hacer('futbol.jugar_partido'); log.push('semana ' + semana + ': ' + (j.ok ? 'jugado' : j.reason));
      d.render();
      return { jugado: j.ok, log };
    }
    return { jugado: false, log };
  }`);
  console.log(resultado.log.join('\n'));
  if (!resultado.jugado) throw new Error('No se pudo jugar un partido');
  for (let i = 0; i < 10 && (await pagina.locator('.ventana.suceso').count()) > 0; i++) {
    const b = pagina.locator('.ventana.suceso .suceso-opciones button:not([disabled])');
    if (await b.count()) await b.first().click();
    else await pagina.click('.ventana.suceso [data-act="aviso-visto"]');
    await pagina.waitForTimeout(300);
  }
  await pagina.click('[data-tab="deporte"]');
  await pagina.waitForSelector('.sheet.deporte');
  for (const [nombre, ancho, alto] of [['movil', 390, 844], ['escritorio', 1280, 900]] as const) {
    await pagina.setViewportSize({ width: ancho, height: alto });
    await pagina.click('[data-subdeporte="deporte"]');
    await pagina.waitForSelector('ul.cronica');
    await pagina.locator('ul.cronica').first().screenshot({ path: join(capturas, `cronica-${nombre}.png`) });
    if (await pagina.locator('[data-subdeporte="equipo"]').count()) {
      await pagina.click('[data-subdeporte="equipo"]');
      await foto(`mi-equipo-${nombre}.png`);
    }
  }
  console.log(`Capturas en ${capturas}`);
} catch (e) {
  console.error(String(e).split('\n')[0]);
  await (await navegador.contexts()[0].pages())[0].screenshot({ path: join(capturas, 'error.png') });
  process.exitCode = 1;
} finally {
  await navegador.close();
  servidor.close();
}
