/**
 * Capturas de «Mi equipo» (`docs/relevo/mi-equipo.md`): la pestaña del deporte (habilidades agrupadas), la subpestaña «Mi equipo» con compañeros conocidos y por conocer (antes y después de entrenar con el club) y
 * la ficha de Gente con «Comparado contigo». Playwright con el Chromium instalado, deviceScaleFactor 1.
 *
 *   npx tsx tools/capturas-mi-equipo.ts <carpeta> [semilla]
 *
 * Sirve también en una versión anterior (sin «Mi equipo»): saca lo que haya (pestaña del deporte con la plantilla). Construye la web con una clave de usar y tirar, instala el fútbol y crea la partida con la ciudad grande.
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
  const pagina = await (await navegador.newContext({ viewport: { width: 480, height: 900 }, deviceScaleFactor: 1 })).newPage();
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

  // Apuntarse al club del colegio y llegar a unas semanas de curso, a media mañana de un martes (antes del primer entrenamiento).
  const hasta = (semana: number, diaSemana: number, hora: number) => ds(`(d) => { const g = d.game; let n = 0; while (n++ < 20000 && !(g.time.week > ${semana} || (g.time.week === ${semana} && (g.time.weekday > ${diaSemana} || (g.time.weekday === ${diaSemana} && g.time.minuteOfDay >= ${hora * 60}))))) { if (!d.hacer('gen.descansar').ok && !d.hacer('gen.esperar').ok) break; } }`);
  await hasta(1, 2, 15);
  const unido = await ds<{ ok: boolean; reason?: string }>(`(d) => d.hacer('futbol.apuntarse_colegio')`);
  if (!unido.ok) throw new Error(`No se pudo apuntar al club: ${unido.reason}`);
  await hasta(4, 1, 12);
  // Para la captura, el personaje ya conoce a algunos compañeros (como tras presentarse): se les marca como conocidos.
  const conocidos = await ds<string[]>(`(d) => {
    const g = d.game; const dir = g.service('npcs'); const s = g.moduleState('npcs');
    const eq = g.moduleState('futbol').personaje ?? dir.equipoDelPersonaje('futbol'); const base = dir.plantillaDelEquipo('futbol', eq.club, eq.categoria, eq.letra).map((j) => j.id).filter((id) => id !== 'personaje');
    const ids = base.slice(0, 4);
    s.npcs = s.npcs.map((n) => (ids.includes(n.id) ? { ...n, known: true } : n));
    d.render();
    return ids;
  }`);
  // Si sale una ventana de suceso (tras entrenar, por ejemplo), se resuelve con la primera opción o se acepta el aviso.
  const despejar = async () => {
    for (let i = 0; i < 6 && (await pagina.locator('.ventana.suceso').count()); i++) {
      const b = pagina.locator('.ventana.suceso .suceso-opciones button:not([disabled])');
      if (await b.count()) await b.first().click();
      else await pagina.click('.ventana.suceso [data-act="aviso-visto"]');
    }
  };
  const irADeporte = async () => { await pagina.click('[data-tab="deporte"]'); await despejar(); await pagina.waitForSelector('.sheet.deporte'); };
  await irADeporte();
  await foto('1-deporte-habilidades-y-plantilla.png');
  const hayMiEquipo = (await pagina.locator('[data-subdeporte="equipo"]').count()) > 0;
  if (hayMiEquipo) {
    await pagina.click('[data-subdeporte="equipo"]');
    await foto('2-mi-equipo-antes-de-entrenar.png');
    await pagina.click('[data-subdeporte="deporte"]');
  }
  // Entrenar con el club (el jueves a las 15) para ver jugar a los compañeros.
  await hasta(4, 3, 14);
  await ds(`(d) => { const g = d.game; let n = 0; while (n++ < 100 && g.time.minuteOfDay < 15 * 60 - 20) if (!d.hacer('gen.esperar').ok) break; return d.llegarA('campo_colegio', g.time.day * 1440 + 15 * 60); }`);
  const sesion = await ds<{ ok: boolean; reason?: string }>(`(d) => d.hacer('futbol.club_sesion')`);
  if (!sesion.ok) throw new Error(`No se pudo entrenar con el club: ${sesion.reason}`);
  await irADeporte();
  if (hayMiEquipo) {
    await pagina.click('[data-subdeporte="equipo"]');
    await foto('3-mi-equipo-tras-entrenar.png');
    // La ficha de un compañero conocido, en Gente (filtro «Compañeros»).
    await pagina.click('[data-tab="gente"]');
    await pagina.click('[data-gente="filtro"][data-id="companeros"]');
    const nombre = await ds<string>(`(d) => d.game.service('npcs').get(${JSON.stringify(conocidos[0])}).name`);
    await pagina.locator('.tarjeta-gente', { hasText: nombre }).first().click();
    await pagina.waitForSelector('.comparacion-gente');
    await foto('4-ficha-con-comparacion.png');
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
