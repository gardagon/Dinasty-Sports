# Paquetes de país

Un **paquete de país** (`PaisDef`, en `packages/contracts/src/paises/`) reúne todo lo que cambia al cambiar de país, como **dato** (JSON serializable): se puede importar de un archivo, igual que se hará con los deportes. El país se elige al crear la partida y **se guarda con ella** (`GameState.pais`); los módulos lo leen con `ctx.pais`. Decidido con el usuario el 29/10/2026 (ver `DECISIONES.md`); las reglas de nombres y orígenes están en `ANEXO_NOMBRES.md`.

## 1. Qué contiene

| Campo | Qué es | Quién lo usa |
|---|---|---|
| `id`, `nombre` | Identificador (minúsculas y guion bajo) y nombre en español | todo |
| `calendario` | Calendario escolar: semanas del curso, tramos (clase, Navidad, Semana Santa, verano), evaluaciones y parciales | el motor (`ctx.time`, `ctx.timeAt`) |
| `cursos`, `cursoDeModalidad` | Cursos desde los 8 años (nombre, etapa, asignaturas por curso, modalidades) | módulo `estudios` |
| `categorias` | Categorías por edad de cada deporte (`{ atletismo: [...] }`) | módulo `atletismo` |
| `horarios` | Horarios de apertura por id de lugar (colegio, biblioteca, supermercado…) | módulo `lugares` (servicio `lugares`) |
| `demografia` | Peso de cada origen familiar entre la gente del país | generación de personas (`origenAlAzar`) |
| `origenesLocales` | Orígenes «de aquí» (de ellos sale el nombre local de las mezclas) | `nombres.ts` |
| `apellidosDeLosNacidosAqui` | 1 o 2 apellidos (España 2; Argentina e Inglaterra 1) | `nombres.ts` |
| `origenes` (opcional) | Orígenes nuevos del catálogo, con su aspecto y su reserva de nombres | `rasgos.ts` |
| `reservasDeNombres` (opcional) | Culturas de nombres y apellidos que añade (`ANEXO_NOMBRES.md` §5) | `culturas/` |

**Lo que un paquete no trae lo pone España** (el módulo usa lo suyo por defecto): por ejemplo, sin `categorias.atletismo` valen las españolas.

## 2. Paquetes de serie

| País | Estado |
|---|---|
| **España** (`espana`) | El de partida. Es la copia de la que nacen los demás (`copiaDeEspana`). |
| **Argentina** (`argentina`) | **Gente propia** (demografía, nombres criollos e italianos, un solo apellido, aspecto) y **calendario, currículo, categorías y horarios copiados de España** con su nombre. |
| **Inglaterra** (`inglaterra`) | **Gente propia** (británicos, Asia del sur, afrocaribeños, polacos…, un solo apellido, aspecto) y el resto copiado de España con su nombre. |

Cuando se estudie la realidad de cada país, solo hay que **cambiar los datos del paquete** (`paises/argentina.ts`, `paises/inglaterra.ts`) sin tocar el código: el curso argentino empieza en marzo y el verano es en enero y febrero; en Inglaterra son *years* y tres *terms*, y las categorías son *under*.

## 3. Importar un paquete

- **Desde la interfaz:** Opciones → «Importar un paquete de país (.json)». Se **valida** (`validarPais`: los errores salen en español, todos a la vez), se registra y se **guarda en el navegador** (localStorage): al arrancar se vuelven a registrar, así que aparece en «Nueva partida» y sus partidas se pueden abrir. Una partida de un país que no está cargado **no se abre** (se avisa de qué falta; no se borra).
- **Desde código:** `importarPais(texto)` / `registrarPais(objeto)` (en `contracts`).
- **Crear uno:** parte de `copiaDeEspana('mi_pais', 'Mi país', { ...lo que cambie })` y exporta el objeto a JSON (`JSON.stringify`). Las asignaturas de los cursos son claves del catálogo del módulo de estudios (`lengua`, `matematicas`, `educacion_fisica`…).

## 4. Qué se valida

Forma de los datos (no su contenido de juego): `id` y `nombre`; calendario con tramos seguidos que cubren todas las semanas del curso; cursos con nombre y asignaturas; categorías con edades seguidas; horarios solo de lugares que existen; demografía con orígenes que existen (del catálogo o del propio paquete), `origenesLocales` dentro de la demografía; orígenes con listas de probabilidades de la longitud correcta; culturas de nombres con nombres de jóvenes y adultos de ambos sexos y apellidos.

## 5. Lo que todavía NO cambia con el país (pendiente)

- **Jornada escolar** (horas de clase y recreo, `JORNADA_ESCOLAR`) y las **agendas de las personas** (`agendas.ts`): siguen siendo las de España.
- **Asignaturas:** el catálogo (`ASIGNATURAS`) es único; un país solo elige cuáles se dan en cada curso.
- **Festivos y fechas** (el calendario no tiene fechas absolutas), **moneda**, **textos** (siguen en español) y los **deportes** distintos del atletismo.
- **Mapa:** la ciudad es la misma (calles y lugares); solo cambian los horarios de apertura.
- Los paquetes importados se guardan en el navegador (no dentro de las copias de seguridad de la partida).

## 6. Dónde cambiar cada cosa

| Qué | Dónde |
|---|---|
| Un paquete de serie | `packages/contracts/src/paises/<pais>.ts` |
| El país de partida y la copia de España | `paises/espana.ts` (`PAIS_ESPANA`, `copiaDeEspana`) |
| Validación e importación | `paises/index.ts` (`validarPais`, `registrarPais`, `importarPais`) |
| Nombres, apellidos, apodos por cultura | `packages/contracts/src/culturas/` |
| Currículo de España | `paises/curriculo.ts` (`CURSOS_ESPANA`) |
| Categorías del atletismo de España | `packages/contracts/src/categories.ts` (`CATEGORIAS_ESPANA`) |
| Horarios de España | `lugares.ts` (`HORARIOS_DE_ESPANA`) |
| Interfaz (selector, importar) | `apps/web/src/main.ts`, `apps/web/src/paquetes.ts` |
