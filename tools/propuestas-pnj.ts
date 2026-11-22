/**
 * Activa, solo para medir, las propuestas de `docs/relevo/pnj-entrenan-y-abandono.md` (en el juego están desactivadas). Se llama antes de crear la partida:
 *   PNJ_LIBRE=1                  que los PNJ entrenen por su cuenta y queden a jugar (`PNJ_POR_LIBRE`); con un JSON (`PNJ_LIBRE='{"maximoPorSemana":4,"propension":{"base":0.2}}'`) cambia sus cifras.
 *   PNJ_ABANDONO='{"pesos":{"nivel":0.6},"suelo":0.04}'   mezcla esas cifras con las del abandono por edad (`ABANDONO_PROPUESTO`).
 */
import { ABANDONO_PROPUESTO, DATOS_FUTBOL, PNJ_POR_LIBRE } from '@ds/mod-futbol';

export function aplicarPropuestas(): void {
  const poblacion = (DATOS_FUTBOL as any).paises.espana.poblacion;
  if (process.env.PNJ_LIBRE) {
    const extra = process.env.PNJ_LIBRE.startsWith('{') ? JSON.parse(process.env.PNJ_LIBRE) : {};
    poblacion.rutina.porLibre = { ...PNJ_POR_LIBRE, ...extra, propension: { ...PNJ_POR_LIBRE.propension, ...(extra.propension ?? {}) } };
  }
  if (process.env.PNJ_ABANDONO) {
    const rec = poblacion.reclutamiento;
    const extra = process.env.PNJ_ABANDONO === '1' ? ABANDONO_PROPUESTO : JSON.parse(process.env.PNJ_ABANDONO);
    rec.abandono = { ...rec.abandono, ...extra, pesos: { ...rec.abandono.pesos, ...(extra.pesos ?? {}) } };
  }
}
