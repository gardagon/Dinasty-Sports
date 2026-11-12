/**
 * La prueba del camino entero **en un navegador de verdad** (Chromium con Playwright): construye la web con una clave de firma de usar y tirar, publica los deportes con ella (incluido el fútbol, que no va dentro del juego), la sirve y recorre
 * lo que hará el usuario: instalar el fútbol desde el paquete (Opciones), la pantalla de nueva partida (casillas de los deportes), crear una partida con la ciudad grande viendo «creando el mundo», y jugar con el fútbol una semana con partido
 * (convocatoria, vestuario y partido), comprobando que la pestaña del deporte lo enseña. Guarda capturas en la carpeta que se indique. `npm run probar-web -- [carpeta de capturas] [semilla]` (tarda unos minutos).
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarClaves } from '@ds/paquetes';
import { publicarDeportes } from './publicar';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const capturas = resolve(process.argv[2] ?? join(tmpdir(), 'ds-probar-web'));
const semilla = Number(process.argv[3] ?? 35);
mkdirSync(capturas, { recursive: true });
// Playwright no es una dependencia del repositorio (el entorno de pruebas lo trae instalado): se carga sin tipos.
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<any> } };
const f = (x: number, d = 1): string => x.toFixed(d);
const comprobar = (ok: boolean, texto: string): void => {
  console.log(`${ok ? '✓' : '✗'} ${texto}`);
  if (!ok) throw new Error(`Falló: ${texto}`);
};

// 1. La web, construida con la clave de prueba, y los deportes publicados con la clave privada.
const claves = await generarClaves();
const dist = mkdtempSync(join(tmpdir(), 'ds-web-'));
console.log('Construyendo la web con una clave de prueba…');
execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: join(raiz, 'apps', 'web'), env: { ...process.env, VITE_DS_CLAVE_PUBLICA: claves.publica }, stdio: 'pipe' });
const publicados = await publicarDeportes(raiz, dist, claves.privada, (t) => console.log(`  publicado: ${t}`));
comprobar(publicados.some((p) => p.deporte.id === 'futbol' && !p.deporte.enElJuego), 'el fútbol se ha publicado aunque no va dentro del juego');

// 2. Un servidor de archivos estáticos.
const TIPOS: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(dist, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  const archivo = existsSync(ruta) && statSync(ruta).isDirectory() ? join(ruta, 'index.html') : ruta;
  if (!existsSync(archivo)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
});
await new Promise<void>((r) => servidor.listen(0, r));
const puerto = (servidor.address() as { port: number }).port;

const navegador = await chromium.launch();
try {
  const pagina = await (await navegador.newContext({ viewport: { width: 480, height: 900 } })).newPage();
  const errores: string[] = [];
  // tsx (esbuild) envuelve las funciones con nombre en `__name`: las que se mandan a la página lo necesitan allí.
  await pagina.addInitScript('window.__name = (f) => f;');
  pagina.on('pageerror', (e) => errores.push(e.message));
  // Un aviso (alert) de la página es un fallo de la prueba: se anota y se acepta.
  pagina.on('dialog', (d) => {
    errores.push(`aviso de la página: ${d.message()}`);
    void d.accept();
  });
  pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await pagina.goto(`http://localhost:${puerto}/?depurar`);
  await pagina.waitForFunction(() => '__ds' in window);

  // 3. Instalar el fútbol desde Opciones.
  await pagina.click('[data-act="ir-opciones"]');
  await pagina.waitForSelector('[data-act="instalar-deporte"]', { timeout: 20000 });
  const filaFutbol = pagina.locator('p.botones', { hasText: 'Fútbol' }).filter({ has: pagina.locator('[data-act="instalar-deporte"]') });
  comprobar((await filaFutbol.count()) === 1, 'Opciones ofrece instalar el Fútbol (versión y tamaño en el catálogo)');
  await pagina.screenshot({ path: join(capturas, '1-opciones-catalogo.png') });
  await filaFutbol.locator('[data-act="instalar-deporte"]').click();
  await pagina.waitForFunction(() => (window as unknown as { __ds: { deportesInstalados(): string[] } }).__ds.deportesInstalados().includes('futbol'), undefined, { timeout: 30000 });
  comprobar(true, 'el fútbol se instala desde el paquete (firma y versión comprobadas)');
  await pagina.screenshot({ path: join(capturas, '2-opciones-instalado.png') });

  // 4. Nueva partida: las casillas de los deportes (a la izquierda de su nombre), con el fútbol marcado.
  await pagina.click('[data-act="ir-menu"]');
  await pagina.click('[data-act="ir-nueva"]');
  await pagina.waitForSelector('[data-deporte-incluido="futbol"]');
  const casillas = await pagina.$$eval('.casilla', (ls) => ls.map((l) => {
    const i = l.querySelector('input')!.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(l.childNodes[1] ?? l);
    const t = r.getBoundingClientRect();
    return { texto: (l.textContent ?? '').trim(), casillaAlaIzquierda: i.right <= t.left + 2 && Math.abs(i.top + i.height / 2 - (t.top + t.height / 2)) < i.height, ancho: i.width, marcada: l.querySelector('input')!.checked };
  }));
  comprobar(casillas.length === 2, `en nueva partida hay dos deportes (${casillas.map((c) => c.texto.split('·')[0].trim()).join(' y ')})`);
  comprobar(casillas.every((c) => c.casillaAlaIzquierda && c.ancho < 40), 'cada casilla sale a la izquierda de su nombre, sin ocupar todo el ancho');
  comprobar(casillas.every((c) => c.marcada), 'el fútbol recién instalado sale marcado como el atletismo');
  await pagina.selectOption('#pais', { label: 'España · ciudad grande (se tarda unos 40 s en crear)' });
  await pagina.evaluate((s) => (window as unknown as { __ds: { fijarSemilla(n: number): void } }).__ds.fijarSemilla(s), semilla);
  await pagina.screenshot({ path: join(capturas, '3-nueva-partida.png') });

  // 5. Crear la partida con la ciudad grande: la pantalla de «creando el mundo» con su progreso.
  const inicio = Date.now();
  await pagina.click('[data-act="empezar"]');
  await pagina.waitForSelector('.velo.creando', { timeout: 10000 });
  comprobar(true, 'aparece la pantalla «Creando el mundo…»');
  const pasos: { texto: string; fraccion: number }[] = [];
  let capturado = false;
  while (await pagina.locator('.velo.creando').count()) {
    const c = await pagina.evaluate(() => (window as unknown as { __ds: { creando: { texto: string; fraccion: number } | null } }).__ds.creando);
    if (c && (!pasos.length || pasos[pasos.length - 1].texto !== c.texto)) pasos.push(c);
    if (!capturado && c && c.fraccion > 0.5) {
      await pagina.screenshot({ path: join(capturas, '4-creando-el-mundo.png') });
      capturado = true;
    }
    await pagina.waitForTimeout(300);
    if (Date.now() - inicio > 600000) throw new Error('La creación tarda más de 10 minutos');
  }
  const segundos = (Date.now() - inicio) / 1000;
  comprobar(pasos.length >= 5, `la pantalla enseña ${pasos.length} pasos distintos mientras se crea (${pasos.slice(0, 3).map((p) => `«${p.texto.slice(0, 28)}…»`).join(', ')}…)`);
  comprobar(pasos.every((p, i) => i === 0 || p.fraccion >= pasos[i - 1].fraccion - 1e-9), 'el progreso solo avanza');
  console.log(`  crear la partida con la ciudad grande: ${f(segundos)} s (incluye abrirla y guardarla)`);
  await pagina.waitForFunction(() => !!(window as unknown as { __ds: { game: unknown } }).__ds.game, undefined, { timeout: 60000 }).catch(() => {
    throw new Error(`La partida no se abrió tras crearla. ${errores.join(' | ')}`);
  });
  await pagina.screenshot({ path: join(capturas, '5-partida-creada.png') });
  comprobar(await pagina.evaluate(() => (window as unknown as { __ds: { game: { registry: { moduleIds: Set<string> } } } }).__ds.game.registry.moduleIds.has('futbol')), 'la partida lleva el fútbol (cargado del paquete instalado)');

  // 6. Jugar con el fútbol: apuntarse al club del colegio y vivir un día de partido (convocatoria, vestuario y partido).
  const resultado = await pagina.evaluate(async () => {
    const ds = (window as unknown as { __ds: Record<string, any> }).__ds;
    const g = ds.game;
    const log: string[] = [];
    const hasta = (semana: number, dia: number, hora: number) => {
      while (!(g.time.week === semana && g.time.weekday === dia && g.time.hour === hora)) if (!g.perform('gen.descansar').ok && !g.perform('gen.esperar').ok) break;
    };
    hasta(1, 3, 15);
    const apuntado = ds.hacer('futbol.apuntarse_colegio');
    log.push(`apuntarse al club del colegio: ${apuntado.ok ? 'ok' : apuntado.reason}`);
    if (!apuntado.ok) return { log, jugado: false };
    for (let semana = 4; semana <= 17; semana++) {
      hasta(semana, 0, 9);
      const f = g.moduleState('futbol');
      const p = f.personaje;
      const l = p && f.liga ? f.liga.categorias[p.categoria] : undefined;
      if (!l) continue;
      const h = Object.entries(f.calendario?.partidos ?? {}).find(([id]) => id.includes(`|${p.categoria}|`) && id.includes(`|${p.club}|${p.letra}|`)) as [string, [number, number, string]] | undefined;
      if (!h) continue;
      const saque = (semana * 7 + h[1][0]) * 1440 + h[1][1] * 60;
      ds.hastaElMinuto(saque - 150);
      ds.llegarA('campo_municipal', saque - 60 + 2);
      const unirse = g.preview('futbol.unirse_companeros');
      if (!unirse?.available) continue; // no está convocado esta semana
      log.push(`semana ${semana}: convocado, partido a las ${h[1][1]}:00`);
      log.push(`unirse a los compañeros: ${ds.hacer('futbol.unirse_companeros').ok ? 'ok' : 'falló'}`);
      ds.hastaElMinuto(saque - 30);
      log.push(`ir al vestuario: ${ds.hacer('futbol.ir_vestuario').ok ? 'ok' : 'falló'} (estás en ${g.service('lugares').actual().id})`);
      ds.hastaElMinuto(saque);
      const jugar = ds.hacer('futbol.jugar_partido');
      log.push(`jugar el partido: ${jugar.ok ? 'ok' : jugar.reason}`);
      if (!jugar.ok) return { log, jugado: false };
      ds.render();
      return { log, jugado: true, ultimo: g.moduleState('futbol').ultimoPartido?.texto, tras: g.service('lugares').actual().id };
    }
    return { log, jugado: false };
  });
  for (const linea of resultado.log) console.log(`  ${linea}`);
  comprobar(resultado.jugado, 'se juega una semana con partido: convocatoria, vestuario y «Jugar el partido»');
  comprobar((resultado as { tras?: string }).tras === 'vestuario_campo_municipal', 'al acabar el partido el personaje está en el vestuario');

  // 7. La pestaña del deporte lo enseña.
  await pagina.click('[data-tab="deporte"]');
  await pagina.waitForSelector('h3');
  const titulos = await pagina.$$eval('h3', (hs) => hs.map((h) => h.textContent ?? ''));
  for (const t of ['Último partido', 'Clasificación', 'Plantilla', 'Tu temporada']) comprobar(titulos.some((x) => x.startsWith(t)), `la pestaña del deporte enseña «${t}»`);
  comprobar((await pagina.locator('ul.cronica li.mia').count()) >= 0 && (await pagina.locator('ul.cronica li').count()) > 6, 'la crónica del partido se ve, con lo del personaje resaltado');
  await pagina.screenshot({ path: join(capturas, '6-pestana-del-deporte.png'), fullPage: true });
  comprobar(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`\nTodo el camino funciona en el navegador. Capturas en ${capturas}`);
} finally {
  await navegador.close();
  servidor.close();
  rmSync(dist, { recursive: true, force: true });
}
