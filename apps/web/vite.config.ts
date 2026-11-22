import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';

/** Qué compilación es: lo inyecta la compilación (en CI, `GITHUB_SHA` y la fecha del momento; en local, `git`; si no hay git, «desarrollo»). Ver `docs/relevo/version-visible.md`. */
export interface VersionDeLaCompilacion {
  /** Identificador único de la compilación (el commit entero; en local, con un sufijo si hay cambios sin confirmar). Es lo que se compara para saber si hay otra más nueva. */
  id: string;
  commit: string;
  /** ISO 8601, UTC. */
  fecha: string;
  rama: string;
  /** Número del pull request (si el mensaje del commit lo dice: «Merge pull request #128», «(#128)»). */
  pr: string;
}

const git = (args: string): string => {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

export function versionDeLaCompilacion(entorno: NodeJS.ProcessEnv = process.env): VersionDeLaCompilacion {
  const sha = entorno.DS_VERSION_ID || entorno.GITHUB_SHA || git('rev-parse HEAD');
  const sucio = !entorno.GITHUB_SHA && !entorno.DS_VERSION_ID && git('status --porcelain') !== '';
  const mensaje = git('log -1 --format=%s');
  const rama = entorno.DS_RAMA || entorno.GITHUB_HEAD_REF || entorno.GITHUB_REF_NAME || git('rev-parse --abbrev-ref HEAD');
  const pr = mensaje.match(/pull request #(\d+)/i)?.[1] ?? mensaje.match(/\(#(\d+)\)\s*$/)?.[1] ?? '';
  const fecha = entorno.DS_FECHA || new Date().toISOString();
  return {
    id: sha ? `${sha}${sucio ? `+local-${fecha}` : ''}` : `desarrollo-${fecha}`,
    commit: sha ? sha.slice(0, 7) : 'desarrollo',
    fecha,
    rama: rama === 'HEAD' ? '' : rama,
    pr,
  };
}

/** Publica `version.json` junto a la web: la app lo pide sin caché para saber si hay una compilación más nueva. */
const publicarVersion = (v: VersionDeLaCompilacion): Plugin => ({
  name: 'ds-version-json',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(v) });
  },
});

// base relativa: funciona igual en GitHub Pages, en local y empaquetado para móvil (Capacitor).
export default defineConfig(() => {
  const version = versionDeLaCompilacion();
  return {
    base: './',
    build: { outDir: 'dist', target: 'es2022' },
    define: { __DS_VERSION__: JSON.stringify(version) },
    plugins: [publicarVersion(version)],
  };
});
