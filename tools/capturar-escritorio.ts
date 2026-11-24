/**
 * Capturas de la web en pantallas de ordenador, para el diagnóstico y los prototipos del diseño de escritorio (`docs/relevo/diseno-escritorio.md`).
 *
 * Dos pasos, porque crear la partida (ciudad grande, fútbol, varias semanas con partidos) tarda unos minutos y las capturas se repiten muchas veces:
 *  1. `npx tsx tools/capturar-escritorio.ts preparar [semilla]`: construye la web, instala el fútbol, crea la partida, entra en un club, juega
 *     ~8 semanas con sus partidos y lo deja todo guardado (IndexedDB + claves de firma) en la carpeta de trabajo.
 *  2. `npx tsx tools/capturar-escritorio.ts capturar <carpeta> [--disenos movil,a,b,c] [--anchos 1366,1920,390] [--temas claro,oscuro] [--solo hacer,deporte,…]`:
 *     reconstruye la web (con las mismas claves), abre esa partida y saca las capturas (deviceScaleFactor 2) de todas las pestañas, de una ventana de suceso y de una ficha.
 *
 * La carpeta de trabajo es `DS_TRABAJO` (por defecto `/tmp/ds-escritorio`).
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarClaves } from '@ds/paquetes';
import { publicarDeportes } from './publicar';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trabajo = resolve(process.env.DS_TRABAJO ?? '/tmp/ds-escritorio');
mkdirSync(trabajo, { recursive: true });
const modo = process.argv[2] ?? 'capturar';
const args = process.argv.slice(3);
const opcion = (nombre: string, defecto: string): string => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? (args[i + 1] ?? defecto) : defecto;
};
const PUERTO = 4793; // fijo: el origen (localhost:puerto) es el de IndexedDB
const pw = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<any> } };

// Las claves se guardan: el fútbol instalado en IndexedDB se firmó con ellas.
const archivoClaves = join(trabajo, 'claves.json');
const claves = existsSync(archivoClaves) ? (JSON.parse(readFileSync(archivoClaves, 'utf8')) as { publica: string; privada: string }) : await generarClaves();
writeFileSync(archivoClaves, JSON.stringify(claves));
const dist = mkdtempSync(join(tmpdir(), 'ds-web-'));
console.log('Construyendo la web…');
execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: join(raiz, 'apps', 'web'), env: { ...process.env, VITE_DS_CLAVE_PUBLICA: claves.publica }, stdio: 'pipe' });
await publicarDeportes(raiz, dist, claves.privada, () => {});
const TIPOS: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(dist, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  const archivo = existsSync(ruta) && statSync(ruta).isDirectory() ? join(ruta, 'index.html') : ruta;
  if (!existsSync(archivo)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
});
await new Promise<void>((r) => servidor.listen(PUERTO, r));
const navegador = await pw.chromium.launch();
const estado = join(trabajo, 'estado.json');

/** Cierra las ventanas de sucesos como lo haría el jugador (la primera opción elegible o «Seguir»). */
async function cerrarSucesos(pagina: any): Promise<void> {
  for (let i = 0; i < 12 && (await pagina.locator('.ventana.suceso').count()) > 0; i++) {
    const opcionElegible = pagina.locator('.ventana.suceso .suceso-opciones button:not([disabled])').first();
    if (await opcionElegible.count()) await opcionElegible.click();
    else await pagina.click('.ventana.suceso [data-act="aviso-visto"]');
    await pagina.waitForTimeout(250);
  }
}

try {
  if (modo === 'preparar') {
    const semilla = Number(args[0] ?? 35);
    const contexto = await navegador.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: 'light' });
    const pagina = await contexto.newPage();
    await pagina.addInitScript('window.__name = (f) => f;');
    pagina.on('dialog', (d: any) => void d.accept());
    await pagina.goto(`http://localhost:${PUERTO}/?depurar`);
    await pagina.waitForFunction(() => '__ds' in window);
    await pagina.click('[data-act="ir-opciones"]');
    await pagina.waitForSelector('[data-act="instalar-deporte"]', { timeout: 20000 });
    await pagina.locator('p.botones', { hasText: 'Fútbol' }).locator('[data-act="instalar-deporte"]').click();
    await pagina.waitForFunction(() => (window as any).__ds.deportesInstalados().includes('futbol'), undefined, { timeout: 30000 });
    await pagina.click('[data-act="ir-menu"]');
    await pagina.click('[data-act="ir-nueva"]');
    await pagina.waitForSelector('[data-deporte-incluido="futbol"]');
    await pagina.selectOption('#pais', { label: 'España · ciudad grande' });
    await pagina.evaluate((s: number) => (window as any).__ds.fijarSemilla(s), semilla);
    await pagina.click('[data-act="empezar"]');
    await pagina.waitForFunction(() => !!(window as any).__ds.game, undefined, { timeout: 600000 });
    console.log('Partida creada. Entrando en un club y jugando…');
    // La prueba de acceso a un club y varias semanas de entrenamientos y partidos (como `probar-web`, pero sin parar en el primer partido).
    const log: string[] = await pagina.evaluate(async () => {
      const ds = (window as any).__ds;
      const g = ds.game;
      const log: string[] = [];
      let club: any;
      for (const c of g.service('clubes').list('futbol').filter((x: any) => !x.esColegio)) {
        let dia = g.time.day;
        while (!c.sesiones.weekdays.includes(((dia % 7) + 7) % 7) || dia * 1440 + Math.ceil(c.sesiones.desde) * 60 < g.time.minute) dia++;
        ds.hastaElMinuto(dia * 1440 + Math.ceil(c.sesiones.desde) * 60);
        if (!ds.hacer(`futbol.pedir_prueba.${c.id}`).ok) continue;
        if (!ds.hacer(`futbol.prueba.${c.id}`).ok) continue;
        ds.hacer(`futbol.prueba_entrenar.${c.id}`);
        club = g.service('clubes').membership('futbol');
        log.push(`prueba en ${c.id}: ${club ? 'entra' : 'no da plaza'}`);
        break;
      }
      const hasta = (semana: number, dia: number, hora: number) => {
        if (((semana * 7 + dia) * 24 + hora) * 60 < g.time.minute) return;
        while (!(g.time.week === semana && g.time.weekday === dia && g.time.hour === hora)) if (!g.perform('gen.descansar').ok && !g.perform('gen.esperar').ok) break;
      };
      if (!club) {
        hasta(g.time.week + (g.time.weekday >= 3 ? 1 : 0), 3, 15);
        log.push(`apuntarse al colegio: ${ds.hacer('futbol.apuntarse_colegio').ok}`);
        club = g.service('clubes').membership('futbol');
      }
      if (!club) return log;
      let jugados = 0;
      for (let semana = g.time.week + 1; semana <= 9; semana++) {
        hasta(semana, 0, 9);
        for (const dia of club.sesiones.weekdays) {
          hasta(semana, dia, Math.ceil(club.sesiones.desde));
          ds.hacer('futbol.club_sesion');
        }
        const f = g.moduleState('futbol');
        const p = f.personaje;
        const l = p && f.liga ? f.liga.categorias[p.categoria] : undefined;
        if (!l) continue;
        const h = Object.entries(f.calendario?.partidos ?? {}).find(([id]) => {
          const q = id.split('|');
          return q[1] === p.categoria && [`${q[3]}|${q[4]}`, `${q[5]}|${q[6]}`].includes(`${p.club}|${p.letra}`);
        }) as [string, [number, number, string]] | undefined;
        if (!h) continue;
        const saque = (semana * 7 + h[1][0]) * 1440 + h[1][1] * 60;
        ds.hastaElMinuto(saque - 150);
        ds.llegarA('campo_municipal', saque - 60 + 2);
        if (!g.preview('futbol.unirse_companeros')?.available) continue;
        ds.hacer('futbol.unirse_companeros');
        ds.hastaElMinuto(saque - 30);
        ds.hacer('futbol.ir_vestuario');
        ds.hastaElMinuto(saque);
        if (ds.hacer('futbol.jugar_partido').ok) jugados++;
      }
      log.push(`semana ${g.time.week}, partidos jugados: ${jugados}`);
      // Dejarlo descansado, en casa, el lunes por la mañana (un día de colegio).
      ds.llegarA('casa', g.time.minute + 1);
      for (let i = 0; i < 40 && (g.stat('gen.energia') < 85 || g.stat('gen.estres') > 40); i++) if (!g.perform('gen.dormir').ok) break;
      hasta(g.time.week + (g.time.weekday === 0 && g.time.hour < 7 ? 0 : 1), 0, 7);
      log.push(`energía ${Math.round(g.stat('gen.energia'))}, salud ${Math.round(g.stat('gen.salud'))}, estrés ${Math.round(g.stat('gen.estres'))}, motivación ${Math.round(g.stat('gen.motivacion'))}; día ${g.time.weekday}, ${g.time.hour} h`);
      ds.render();
      return log;
    });
    console.log(log.join('\n'));
    await cerrarSucesos(pagina);
    const r = await pagina.evaluate(() => (window as any).__ds.guardarAhora());
    console.log('guardado', JSON.stringify(r));
    // Se exporta la partida (copia de seguridad): la restauración de IndexedDB de Playwright no conserva los Blob.
    await pagina.click('[data-act="opciones"]');
    const [descarga] = await Promise.all([pagina.waitForEvent('download'), pagina.click('.ventana [data-act="exportar"]')]);
    await descarga.saveAs(estado);
    console.log(`Estado guardado en ${estado}`);
  } else {
    const salida = resolve(args[0] ?? join(trabajo, 'capturas'));
    mkdirSync(salida, { recursive: true });
    const disenos = opcion('disenos', 'movil').split(',');
    // Los tamaños: «1366» (el alto sale del ancho) o «1280x620».
    const tamanos = opcion('anchos', '1366,1920').split(',').map((t) => (t.includes('x') ? t.split('x').map(Number) : [Number(t)]));
    const medir = args.includes('--medir');
    const temas = opcion('temas', 'claro,oscuro').split(',');
    const solo = opcion('solo', '').split(',').filter(Boolean);
    const quiere = (x: string): boolean => !solo.length || solo.includes(x);
    for (const diseno of disenos) {
      for (const tema of temas) {
        for (const [ancho, altoPedido] of tamanos) {
          const alto = altoPedido ?? (ancho >= 1900 ? 1080 : ancho >= 1300 ? 768 : 844);
          const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: ancho < 600 ? 3 : 2, colorScheme: tema === 'oscuro' ? 'dark' : 'light' });
          const pagina = await contexto.newPage();
          await pagina.addInitScript(`window.__name = (f) => f; try { localStorage.setItem('ds.diseno', ${JSON.stringify(diseno === 'movil' ? 'movil' : diseno === 'escritorio' ? 'escritorio' : 'automatico')}); localStorage.setItem('ds.prototipo', ${JSON.stringify(['b', 'c'].includes(diseno) ? diseno : 'a')}); } catch (e) {}`);
          pagina.on('dialog', (d: any) => void d.accept());
          const errores: string[] = [];
          pagina.on('pageerror', (e: any) => errores.push(e.message));
          pagina.on('console', (m: any) => ['warning', 'error'].includes(m.type()) && console.log(`  [consola] ${m.text().slice(0, 300)}`));
          await pagina.goto(`http://localhost:${PUERTO}/?depurar`);
          await pagina.waitForFunction(() => '__ds' in window);
          // Se instala el fútbol y se carga la copia de la partida.
          await pagina.click('[data-act="ir-opciones"]');
          await pagina.waitForSelector('[data-act="instalar-deporte"]', { timeout: 20000 });
          await pagina.locator('p.botones', { hasText: 'Fútbol' }).locator('[data-act="instalar-deporte"]').click();
          await pagina.waitForFunction(() => (window as any).__ds.deportesInstalados().includes('futbol'), undefined, { timeout: 30000 });
          await pagina.click('[data-act="ir-menu"]');
          const [selector] = await Promise.all([pagina.waitForEvent('filechooser'), pagina.click('[data-act="importar"]')]);
          await selector.setFiles(estado);
          await pagina.waitForFunction(() => !!(window as any).__ds.game);
          await cerrarSucesos(pagina);
          const nombre = (x: string): string => `${diseno}-${altoPedido ? `${ancho}x${altoPedido}` : ancho}-${tema === 'oscuro' ? 'oscuro' : 'claro'}-${x}.png`;
          const foto = async (x: string, completa = false): Promise<void> => {
            await pagina.waitForTimeout(250);
            await pagina.screenshot({ path: join(salida, nombre(x)), fullPage: completa });
          };
          const pestana = async (id: string): Promise<boolean> => {
            const t = pagina.locator(`[data-tab="${id}"]:not([disabled])`).first();
            if (!(await t.count())) return false;
            await t.click();
            await pagina.waitForTimeout(150);
            return true;
          };
          if (medir) {
            // Lo que cuesta redibujar la página (A con el diario de 30 entradas): media de 20 redibujos, con el tamaño del diario de la partida.
            const r = await pagina.evaluate(() => {
              const ds = (window as any).__ds;
              const t0 = performance.now();
              for (let i = 0; i < 20; i++) ds.render();
              return { ms: (performance.now() - t0) / 20, diario: ds.game.log.length };
            });
            console.log(`  render ${diseno} ${ancho}: ${r.ms.toFixed(1)} ms (diario de ${r.diario} entradas)`);
          }
          if (args.includes('--foco')) {
            // El orden del foco con el teclado: qué se enfoca con cada Tab desde el principio de la página.
            await pagina.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            const orden: string[] = [];
            for (let i = 0; i < 14; i++) {
              await pagina.keyboard.press('Tab');
              orden.push(await pagina.evaluate(() => { const e = document.activeElement as HTMLElement; return `${e.tagName.toLowerCase()}${e.dataset.escScroll ? `[zona ${e.dataset.escScroll}]` : e.dataset.tab ? `[pestaña ${e.dataset.tab}]` : e.dataset.act ? `[${e.dataset.act}]` : ''}`; }));
            }
            console.log(`  foco: ${orden.join(' → ')}`);
          }
          for (const id of ['hacer', 'personaje', 'estudios', 'deporte', 'gente', 'relaciones', 'diario']) {
            if (!quiere(id) || !(await pestana(id))) continue;
            await foto(id, ancho < 600 || diseno === 'movil');
            if (id === 'deporte' && quiere('equipo') && (await pagina.locator('[data-subdeporte="equipo"]').count())) {
              await pagina.locator('[data-subdeporte="equipo"]').first().click();
              await foto('equipo', ancho < 600 || diseno === 'movil');
              await pagina.locator('[data-subdeporte="deporte"]').first().click();
            }
          }
          if (quiere('ficha') && (await pestana('gente')) && (await pagina.locator('.tarjeta-gente').count())) {
            await pagina.locator('.tarjeta-gente').first().click();
            await pagina.waitForTimeout(300);
            await foto('ficha', ancho < 600 || diseno === 'movil');
          }
          if (quiere('suceso')) {
            // Un suceso con decisión: se fuerza el primero del catálogo de pruebas que salga con opciones.
            await pestana('hacer');
            const salio: boolean = await pagina.evaluate(() => {
              const g = (window as any).__ds.game;
              const svc = g.service('sucesos');
              for (const x of svc.catalogo()) {
                g.perform(`sucesos.forzar.${x.id}`);
                if (svc.pendientes().some((p: any) => p.urgencia !== 'pendiente' && p.opciones.length > 2)) return true;
              }
              return false;
            });
            await pagina.evaluate(() => (window as any).__ds.render());
            if (salio && (await pagina.locator('.ventana.suceso').count())) await foto('suceso');
          }
          if (quiere('opciones')) {
            // La ventana de Opciones de la partida y, después, la pantalla de Opciones del menú.
            await pagina.click('[data-act="opciones"]');
            await foto('opciones-ventana');
            await pagina.click('[data-act="cerrar-opciones"]');
            await pagina.click('[data-act="menu"]');
            await pagina.click('[data-act="ir-opciones"]');
            await foto('opciones-pantalla', true);
          }
          if (errores.length) console.log(`  ⚠ errores en ${diseno}-${ancho}-${tema}: ${errores.slice(0, 2).join(' | ')}`);
          console.log(`  hecho: ${diseno} ${ancho} ${tema}`);
          await contexto.close();
        }
      }
    }
    console.log(`Capturas en ${salida}`);
  }
} finally {
  await navegador.close();
  servidor.close();
}
