import type { AporteDeSucesos } from '@ds/contracts';
import llegarTarde from './llegar_tarde';

/** Los eventos deportivos del atletismo: llegan con el deporte y se van con él. Mismo formato que los eventos base (`docs/ANEXO_EVENTOS.md`). */
export const EVENTOS_DE_ATLETISMO: readonly AporteDeSucesos[] = [llegarTarde];
