import { it, vi } from 'vitest';
import { SERVICES, type SucesosService, type LugaresService } from '@ds/contracts';
import { nuevaPartida } from '@ds/game';
import { llegarA } from './ayudas';
vi.setConfig({ testTimeout: 240000 });
it('explora', () => {
  const g = nuevaPartida({ seed: 11 });
  const sucesos = () => g.service<SucesosService>(SERVICES.sucesos)!;
  const lugares = () => g.service<LugaresService>(SERVICES.lugares)!;
  const out: string[] = [];
  for (let d = 0; d < 8; d++) {
    while (g.time.minuteOfDay > 6 * 60 || !g.time.isSchoolDay) { g.perform('gen.esperar'); if (g.time.minuteOfDay < 60 && g.time.isSchoolDay) break; }
    llegarA(g, 'colegio', 7, 30);
    const dia = g.time.day;
    let sitio = 'colegio';
    for (let k = 0; k < 400 && g.time.day === dia; k++) {
      const antes = g.time.minuteOfDay;
      if (k === 4) { llegarA(g, 'aula', 0, 0); }
      else g.perform('gen.esperar');
      const p = sucesos().pendientes().find((x) => x.suceso === 'eventos.grupo.se_van');
      if (p) {
        out.push(`d${dia} ${Math.floor(antes/60)}:${String(antes%60).padStart(2,'0')}->${Math.floor(g.time.minuteOfDay/60)}:${String(g.time.minuteOfDay%60).padStart(2,'0')} en ${lugares().actual().id}: ${p.texto}`);
        g.perform(p.opciones[1].accion);
      }
    }
  }
  console.log(out.join('\n'));
});
