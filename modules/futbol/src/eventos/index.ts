import type { AporteDeSucesos } from '@ds/contracts';
import llegarTarde from './llegar_tarde';
import primerEntrenamiento from './primer_entrenamiento';

/** Los eventos deportivos del fútbol: llegan con el deporte y se van con él. Mismo formato que los eventos base (`docs/ANEXO_EVENTOS.md`). */
export const EVENTOS_DE_FUTBOL: readonly AporteDeSucesos[] = [primerEntrenamiento, ...llegarTarde];
