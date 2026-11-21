import { describe, expect, it } from 'vitest';
import { viewMiEquipo } from './deporte';

describe('«Mi equipo» en la web', () => {
  const v = viewMiEquipo({
    titulo: 'Equipo B · Colegio de prueba',
    texto: 'Categoría benjamín.',
    companeros: [
      { id: 'personaje', nombre: 'Tú', aspecto: '', puesto: 'Central', yo: true },
      { id: 'a', nombre: 'Lucas Pérez', aspecto: 'un niño alto', puesto: 'Delantero centro', dorsal: 9, comparacion: 'mejor' },
      { id: 'b', aspecto: 'un niño bajo, de pelo rizado' },
    ],
  });

  it('enseña el equipo, el nombre solo de quien se conoce y el puesto solo de quien se ha visto', () => {
    expect(v).toContain('Equipo B · Colegio de prueba');
    expect(v).toContain('Lucas Pérez');
    expect(v).toContain('Delantero centro');
    // El dorsal delante, la descripción entera y la comparación debajo.
    expect(v).toContain('<b class="dorsal">9</b> · Lucas Pérez<small class="frente-a-ti">Frente a ti: mejor</small>');
    expect(v).toContain('un niño bajo, de pelo rizado (aún no sabes cómo se llama)');
    // Quien no se conoce y no se ha visto: guion en el puesto.
    expect(v).toMatch(/aún no sabes cómo se llama\)<small class="frente-a-ti">Frente a ti: —<\/small><\/td><td>—<\/td>/);
    // Tú, resaltado.
    expect(v).toContain('<tr class="me"><td>Tú</td><td>Central</td></tr>');
  });
});
