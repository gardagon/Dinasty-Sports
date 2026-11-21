import { describe, expect, it } from 'vitest';
import { viewMiEquipo } from './deporte';

describe('«Mi equipo» en la web', () => {
  const v = viewMiEquipo({
    titulo: 'Equipo B · Colegio de prueba',
    texto: 'Categoría benjamín.',
    companeros: [
      { id: 'personaje', nombre: 'Tú', aspecto: '', puesto: 'Central', yo: true },
      { id: 'a', nombre: 'Lucas Pérez', aspecto: 'un niño alto', puesto: 'Delantero centro' },
      { id: 'b', aspecto: 'un niño bajo, de pelo rizado' },
    ],
  });

  it('enseña el equipo, el nombre solo de quien se conoce y el puesto solo de quien se ha visto', () => {
    expect(v).toContain('Equipo B · Colegio de prueba');
    expect(v).toContain('Lucas Pérez');
    expect(v).toContain('Delantero centro');
    expect(v).toContain('un niño bajo, de pelo rizado (aún no sabes cómo se llama)');
    // Quien no se conoce y no se ha visto: guion en el puesto.
    expect(v).toMatch(/aún no sabes cómo se llama\)<\/td><td>—<\/td>/);
    // Tú, resaltado.
    expect(v).toContain('<tr class="me"><td>Tú</td><td>Central</td></tr>');
  });
});
