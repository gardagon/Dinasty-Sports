import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tema: la página declara sus dos temas', () => {
  it('index.html lleva color-scheme «light dark» (que el navegador no oscurezca a la fuerza)', () => {
    expect(readFileSync(new URL('../index.html', import.meta.url), 'utf8')).toMatch(/<meta name="color-scheme" content="light dark"/);
  });
  it('el CSS no deja opacidad ni filtro sobre el dibujo de las personas', () => {
    expect(readFileSync(new URL('./style.css', import.meta.url), 'utf8')).toMatch(/\.retrato-boton svg[^{]*\{[^}]*opacity: 1; filter: none/);
  });
});
