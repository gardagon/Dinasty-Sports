# Dinasty Sports

RPG de decisiones: tu personaje vive un curso escolar mientras desarrolla un deporte.
Cada acción cuesta tiempo de juego, y todo lo que haces sube o baja sus características.
El calendario sigue el curso escolar: trimestres, Navidad, Semana Santa y verano.

Este es el MVP. Incluye el motor modular y los módulos de contenido (estudios, atletismo, clubes, personas, relaciones y familia)
sobre el módulo base del personaje, un equipo de simulación que vigila el balance y una interfaz web pensada para móvil.

## Empezar

Necesitas Node 20 o superior.

```bash
npm install
npm run dev        # abre la URL que aparece en la terminal
```

## Qué hay dentro

| Carpeta | Qué es |
|---|---|
| `packages/contracts` | Interfaces que cumplen todos los módulos, y los datos comunes: paquetes de país (calendario, currículo, categorías, horarios), culturas de nombres y reglas de nombres |
| `packages/core` | Motor: registro de módulos, pipeline de acciones, tiempo, subida y caída, eventos |
| `packages/game` | Ensamblador: la lista de módulos del juego |
| `modules/personaje` | Características genéricas, estado (energía, salud, estrés, motivación) e identidad (edad, altura, peso, complexión), genética heredada de los padres, perks, apariencia, origen, carácter e intereses |
| `modules/estudios` | Currículo de España por cursos (de 3.º de primaria a 2.º de bachillerato), preparación de cada asignatura con nivel en texto, clases con horario semanal, estudio, dos parciales y un global por trimestre |
| `modules/atletismo` | Primer deporte: 400 m, categorías de la federación española, entrenamiento libre y con club, carrera los sábados con hasta 18 corredores, semifinales y final, conocimiento del deporte |
| `modules/npcs` | Entrenador, tutor, compañeros, 108 rivales de atletismo por edad que progresan por su cuenta y se renuevan cada curso, y la población del colegio y del barrio (~410 personas con horarios, profesiones y gustos) |
| `modules/relaciones` | Vínculos con las personas (afinidad, confianza y estado: conocido, amigo, antipatía...) y sus acciones: quedar, charlar, ayudar, hacer planes, tener un detalle, discutir y hacer las paces |
| `modules/familia` | Padre y madre del personaje (edad, altura, deporte, apoyo y expectativas) y su ficha con los hermanos |
| `modules/clubes` | Clubes deportivos: el del colegio y los de fuera, con pruebas de acceso |
| `sim` | Bots con estrategias distintas, chequeos de balance, informe HTML |
| `apps/web` | Interfaz web (mobile-first) |

La arquitectura y cómo añadir módulos están en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).
Las decisiones tomadas y lo pendiente, en [`docs/DECISIONES.md`](docs/DECISIONES.md).
El plan para ampliar características, personalidad y perks, en [`docs/BACKLOG_STATS.md`](docs/BACKLOG_STATS.md).
Los anexos con las cifras: horarios y población de personas y lugares ([`docs/ANEXO_HORARIOS_PNJ.md`](docs/ANEXO_HORARIOS_PNJ.md)), relaciones ([`docs/ANEXO_RELACIONES.md`](docs/ANEXO_RELACIONES.md)) deporte ([`docs/ANEXO_DEPORTE.md`](docs/ANEXO_DEPORTE.md)), nombres y orígenes ([`docs/ANEXO_NOMBRES.md`](docs/ANEXO_NOMBRES.md)) y paquetes de país ([`docs/PAQUETES_DE_PAIS.md`](docs/PAQUETES_DE_PAIS.md)).

## Comandos

```bash
npm test             # tests unitarios, de integración y de arquitectura
npm run typecheck
npm run sim          # simula un año con 7 estrategias × 5 semillas → sim/reports/ultimo/informe.html
npm run sim:largo    # simula tres años (cursos completos con vacaciones y temporadas); con --dias 3650, de los 8 a los 18
npm run sim:vida     # lleva a un bot que lo entrena todo muchos años (70 por defecto) y enseña su nivel frente a su tope por edad y cuánto del tope han alcanzado sus 6 mejores capacidades
npm run sim:notas    # banco de notas: nota media de alumnos flojos, típicos y brillantes según su rutina de estudio, frente a los objetivos
npm run check        # todo lo anterior en versión rápida
npm run build        # compila la web en apps/web/dist
npm run nuevo-modulo -- natacion "Natación"
```

## Publicar la web

1. Una sola vez, en GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Después se publica sola en cada cambio que llega a `main`. También se puede lanzar a mano desde
   **Actions → "Publicar web (GitHub Pages)" → Run workflow**.

## Instalarla en el móvil

La web es una PWA (manifiesto, iconos y service worker): funciona sin conexión y se instala desde el navegador.
En Android (Chrome), **Instalar aplicación**; en iPhone (Safari), **Compartir → Añadir a pantalla de inicio**.
Si cambias `apps/web/public/sw.js`, sube `VERSION` para que los móviles limpien la caché antigua.
La web compila a estáticos con rutas relativas, así que también puede empaquetarse con
[Capacitor](https://capacitorjs.com/) como app de tienda si hiciera falta.
