# Plan: deportes que se instalan y conviven, uno para competir

Plan por fases (29–30/10/2026), **revisado con las aclaraciones del usuario del 30/10** (§9; la última, paquetes firmados, datos por deporte y luego por país, e instalador desde GitHub Pages con otras fuentes posibles). Va **antes de nada del fútbol**. El diseño propio del fútbol sigue en [`ANALISIS_FUTBOL.md`](ANALISIS_FUTBOL.md) (§3.4 a §3.8) y empieza cuando terminen estas fases.

---

## 1. La idea

- Se pueden tener **instalados los deportes que se quiera** (4 o los que hagan falta) y **conviven** en la partida: su mundo existe y avanza (sus rivales crecen, sus clubes entrenan, sus categorías cambian con los cursos) aunque el personaje no los practique.
- El personaje **compite en un solo deporte**, el de la pestaña «Deporte», y **puede cambiarlo cuando quiera**.
- **Jugar a otros deportes de forma informal** (quedar con compañeros para jugar un partido) queda para más adelante, pero la estructura lo deja preparado: un deporte instalado y no practicado podrá ofrecer actividades sueltas.
- **Instalar un deporte es instalar su código** (su «motor de juego») y sus datos con el instalador: quien no juega al fútbol no descarga el fútbol.
- Son **dos juegos de rol que se encajan**: el del colegio y la vida (lo trae el **paquete de país**) y el del deporte (lo trae el **paquete del deporte**). Ver §4.

| Nivel | Qué es | Quién lo decide |
|---|---|---|
| **Catálogo** | Los deportes que se pueden instalar (de cada fuente: GitHub Pages, y más adelante una tienda o mods) | El desarrollo (o quien haga el mod), al publicar |
| **Instalado** | Descargado en el dispositivo con el instalador: código y datos por país | El jugador (Opciones → Deportes) |
| **En la partida** | Su mundo existe en esa partida: habilidades del personaje, gente, clubes, historial | Al crear la partida (todos los instalados) o al añadirlo a una empezada |
| **Practicado** | El que compite (solo uno, o ninguno) | El jugador, dentro del juego, cuando quiera |

## 2. Reglas de practicar y cambiar (aprobadas el 30/10)

- **Dejar el deporte:** se sale de su club (`club.salir`), sus acciones y su pestaña desaparecen y sus habilidades caen con la caída normal (gracia de 4 días y suelo del 70 % de lo máximo alcanzado). El conocimiento casi no se olvida (30 días de gracia, suelo del 95 %).
- **Empezar otro o volver:** a mitad de curso si se quiere, sin club al principio (se entrena por libre y se apunta después). Si ya se practicó, se recupera su historial.
- **No se pierde nada:** relaciones con entrenadores y compañeros, resultados de cursos anteriores, historial por deporte («Atletismo: cursos 1 a 3; fútbol: desde el curso 4»).
- **Sin coste por cambiar**, salvo el plantón de un club si no se deja antes (como hoy). **Sin ningún deporte** también vale.
- **Uno a la vez** (`MAX_DEPORTES_PRACTICADOS = 1`): empezar uno nuevo exige dejar el actual (la acción lo ofrece: «Dejar el atletismo y empezar fútbol»).

## 3. Paquetes de deporte e instalador

### 3.1 Qué es un paquete de deporte

El motor de un deporte **es código y llega como código**, dentro de un **paquete** con:

| Parte | Qué es |
|---|---|
| **Manifiesto** | Id, nombre, versión del paquete, **versión del juego con la que es compatible** (la del vocabulario común y el kit que usa), países que trae, tamaño y la huella de cada archivo |
| **Código** | El módulo del deporte (`GameModule`) compilado aparte. **No lleva su propia copia de `contracts` ni del kit:** usa las del juego instalado (así pesa poco y todos los deportes hablan el mismo idioma) |
| **Datos por país** | Un archivo por país con categorías, temporada, competiciones, clubes, lugares y población (ver §4). España siempre; los demás, cuando los haya |
| **Firma** | La firma de todo lo anterior |

- **Compatibilidad:** el juego rechaza un paquete hecho para otra versión del vocabulario común o del kit («Este fútbol es para la versión 3 del juego; actualiza el juego o el deporte»). Estas dos piezas pasan a ser la **interfaz pública de los deportes**: cambiarlas exige subir su versión y avisar (también a quien haga mods, §3.4).
- **Instalar** = descargar el paquete, comprobar firma, compatibilidad y huellas, y guardarlo en el dispositivo (para jugar sin conexión). **Desinstalar** = borrarlo. Al abrir o crear una partida se cargan los deportes instalados que usa (hoy la lista de módulos es fija en `packages/game/src/modulos.ts`; pasa a ser «base + los deportes cargados»).
- **Una partida que usa un deporte que no está instalado no se abre** hasta instalarlo (se avisa; no se borra), igual que con un país no cargado.

### 3.2 La firma: por qué un archivo con código sí puede instalarse

El riesgo de ejecutar código no es que sea código sino **quién lo ha hecho**: un deporte corre dentro de la página del juego y podría leer o borrar partidas o enviar datos fuera. Por eso:

- **Los paquetes oficiales se firman** al publicarlos con una clave privada que **no está en el repositorio** (se guarda como secreto de GitHub Actions). El juego lleva dentro la clave pública y comprueba la firma con las funciones criptográficas del navegador (Web Crypto) antes de instalar.
- **Firmado por nosotros = se instala, venga de donde venga** (GitHub, un archivo bajado a mano, una tienda). Sin firma o modificado = se rechaza (salvo los mods, §3.4).
- **La firma protege de paquetes falsos o manipulados, no de copias:** un paquete oficial copiado sigue siendo válido. Lo que evita copias es la venta con licencias (§3.4).

### 3.3 De dónde se instala: fuentes intercambiables (GitHub Pages primero)

El instalador no está atado a un sitio: habla con **fuentes de instalación**, todas con la misma forma (dar el catálogo, descargar un paquete y, si hace falta, comprobar una licencia). La firma y la compatibilidad se comprueban igual venga de la fuente que venga.

| Fuente | Para qué | Cuándo |
|---|---|---|
| **GitHub Pages** | Los paquetes en una carpeta de la misma web del juego (`deportes/<id>/<versión>/`) y un catálogo. Gratis, mismo sitio que el juego (el navegador no pone pegas al descargar) y se publica con el flujo que ya existe (`pages.yml`). Límites de Pages (1 GB de sitio, ~100 GB al mes de descarga) de sobra | **Ahora** (decidido el 30/10) |
| **Archivo local** | Instalar un paquete bajado a mano (sin conexión, o de otra fuente) | Con el instalador |
| **GitHub Releases** | Una descarga por versión de cada deporte | Opcional: hay que probar si el navegador deja leer las descargas desde la web del juego (redirigen a otro dominio) |
| **Tienda o servidor con licencias** | Vender deportes (§3.4) | Si se pone a la venta |
| **Tiendas de apps** (Capacitor) | Las normas de Apple, y en parte las de Google, limitan descargar código que cambie la app: ahí los deportes irían dentro de la app y «instalar» sería activarlo | Si se publica como app |

### 3.4 Venta y modding (para no cerrarnos)

- **Peso:** solo se descarga lo que se instala. El juego base lleva el motor, los módulos base y el kit.
- **Venta:** **todo lo que esté en GitHub Pages es público** (cualquiera puede descargarlo, sin necesidad de hackear nada). Los deportes de pago **no pueden ir en Pages**: irían en una fuente con licencias (una tienda como itch.io o Steam, o un servidor propio) que solo entrega el paquete a quien lo ha comprado, con una licencia firmada ligada a su cuenta que el juego comprueba al instalar. **Ninguna protección es total** en un juego que funciona sin conexión en el navegador: quien ha comprado un deporte puede copiar sus archivos. Lo realista es ponerlo incómodo (licencia por cuenta, comprobación al instalar y al actualizar), no imposible. Por eso el instalador se diseña con fuentes intercambiables desde el principio.
- **Modding:** otras personas podrán hacer deportes con el kit y el vocabulario común (la interfaz pública de §3.1). Un mod no está firmado por nosotros, así que hay que decidir cuánto se le deja hacer:
  1. **Avisar y confiar** (como muchos juegos de PC): se activa un «modo mods», cada mod se instala con un aviso claro («no es oficial: podría leer o borrar tus partidas») y sus partidas se marcan. Es lo más sencillo.
  2. **Mods firmados por su autor:** el juego dice quién lo ha hecho y avisa si cambia de autor.
  3. **Aislarlos** para que no puedan tocar partidas ni red: hoy el motor llama a las funciones de cada deporte directamente en cada acción, y aislarlas obligaría a cambiar el motor a fondo. Se valoraría cuando haya mods de verdad.

  Propuesta: empezar por 1 y 2. No hace falta decidirlo hasta la fase de modding.

## 4. Dos juegos de rol: el colegio (país) y el deporte (viabilidad)

Propuesta del usuario: el país se incorpora con su módulo de estudios, calendario y demás (con España por defecto); el deporte se instala aparte y trae **sus propios datos de cada país**, también con España por defecto hasta que una actualización traiga el país. **El paquete de país no sabe nada de deportes.**

| | Paquete de país (el colegio y la vida) | Paquete de deporte (el deporte) |
|---|---|---|
| Qué trae | Calendario escolar, cursos y asignaturas, jornada, horarios de los lugares comunes, gente (demografía, nombres, apellidos) | Código del deporte y sus datos **por país** (abajo) |
| Si falta un país | `copiaDeEspana` (ya existe) | **Los datos de España de ese deporte**, con el nombre del país, hasta una actualización |
| Cómo llega | Importar paquete de país (ya existe, `paquetes.ts`) | Instalador (§3); los datos de un país nuevo pueden llegar con una versión nueva del deporte o como archivo de datos |

**Los datos van por deporte y, dentro del deporte, por país** (decidido el 30/10). Una «sub-10» del atletismo de España puede no existir en Argentina, y eso lo sabe el atletismo, no Argentina:

```
atletismo
 └─ países
     ├─ España     → categorías, temporada, competiciones y federación, clubes y secciones, lugares, población
     └─ Argentina  → las suyas (si no están, se usan las de España)
```

Solo manda el deporte (se retira la propuesta anterior de que el paquete de país pudiera corregir datos de un deporte).

**Es viable**, y buena parte ya existe (`PaisDef`, `copiaDeEspana`, validación e importación, `ctx.pais`). Lo que hay que cambiar o cuidar:

1. **Las categorías salen del paquete de país.** Hoy `PaisDef.categorias` (del trabajo de países, ya en `main`) tiene las del atletismo: pasan a los datos del atletismo y `PaisDef` deja de saber de deportes. Hay que coordinarlo con el trabajo de países.
2. **La temporada no puede ir en semanas fijas.** Hoy el atletismo tiene la semifinal en la semana 37 del curso. Con el calendario real de Argentina (curso de marzo a diciembre) eso caería en otro sitio. La temporada se expresa **respecto al calendario escolar del país** («primera competición en la 5.ª semana de clase», «semifinales 3 semanas antes de acabar las clases del último trimestre», «sin competición en vacaciones») o al año natural si el deporte no sigue al colegio. Así **los datos de España de un deporte encajan solos en cualquier calendario**, que es lo que hace viable lo de «España por defecto». Es el punto más importante.
3. **Lo que el deporte pone en la ciudad** (un campo de fútbol, sus horarios, las agendas de su gente) lo aporta el deporte al instalarse, no el mapa base ni el país.
4. **Actualizaciones a mitad de partida:** si una actualización trae los datos reales de tu país para tu deporte, se aplican **al empezar el curso siguiente**, no a mitad de temporada (cambiar las categorías en medio rompería clasificaciones y resultados guardados). La partida recuerda qué datos usa cada deporte en la temporada en curso.
5. **Lo que queda en el país** y aún no cambia (ya anotado en `PAQUETES_DE_PAIS.md` §5): jornada escolar, agendas, catálogo de asignaturas. Es trabajo del juego del colegio, independiente de los deportes.

## 5. Un deporte que se quita y vuelve: sin archivar y sin datos desfasados

Decidido el 30/10: no se archiva nada. Para que al volver todo esté al día sin recrear nada:

- **Las habilidades del personaje siguen cayendo y envejeciendo.** Hoy el motor solo aplica la caída diaria a las stats registradas: si el deporte se quita un año, sus habilidades se quedarían congeladas y al volver valdrían lo mismo que el día que se quitó. Como la definición de una stat es un dato puro (sin funciones), **la partida guarda la definición de las stats del deporte quitado** y el motor les sigue aplicando caída y envejecimiento cada día. Al volver valen lo que valdrían si hubiera dejado el deporte. Nada se ve en la interfaz mientras tanto.
- **Su gente sigue viviendo.** El progreso diario de los niveles en `npcs` ya es genérico (no depende del módulo del deporte). Al añadir el deporte, `npcs` **guarda lo que ese deporte le pidió** (cuántos por edad, de qué capacidades sale su potencial…) y con eso sigue renovando a los rivales cada curso aunque el deporte no esté. Al volver, sus rivales tienen la edad y el nivel que tocan.
- **Su historial y su estado se conservan intactos.** Lo que caduca con el tiempo (plazas ofrecidas por un club, el campeonato de un curso) caduca solo, porque se compara con la semana actual. Hay que probarlo con un hueco de un año.
- **Si al volver el deporte trae una versión nueva** que pide más gente, se completa (se reclutan o crean las que falten), sin rehacer la que hay.

## 6. Opciones y guardado

**Hecho en la fase G (30/10).** Antes había tres botones bajo el nombre (Exportar, Importar y Menú); ahora hay «Opciones» y «Menú». Lo que se hizo:

- **Un botón «Opciones»** en la cabecera de la partida (y «Menú» al lado), con:
  - **Guardar partida** (y cuándo se guardó por última vez, en fecha del juego).
  - **Guardado automático:** tras cada acción (como ahora), cada día, cada semana, cada mes de juego o solo a mano. El juego mide cuánto tarda en guardar y recomienda una frecuencia según la máquina («tu partida tarda 0,4 s en guardarse: te recomendamos cada semana»). Por defecto, cada día.
  - **Exportar e importar una copia** (los botones de hoy).
  - **Deportes** (el instalador, §3; llegará con la fase 6) y **paquetes de país** (ya está «Importar un país»).
- **¿Preguntar si quiere guardar al cerrar la pestaña?** No es demasiado, pero el navegador no deja hacerlo bien: al cerrar una pestaña solo permite su aviso genérico («¿Salir del sitio? Puede que no se guarden los cambios»), sin botón de «Guardar», y en el móvil ni siquiera eso (el sistema cierra la pestaña sin avisar). Propuesta:
  1. Al salir **con nuestros botones** (Menú, Salir), preguntar: «Guardar y salir / Salir sin guardar / Cancelar».
  2. Al cerrar la pestaña con cambios sin guardar, el aviso genérico del navegador (en el ordenador).
  3. **Copia de recuperación:** al ocultarse o cerrarse la pestaña se guarda, sin tocar la partida guardada, una copia aparte. Al volver: «Hay una partida sin guardar más reciente (martes 14 de octubre, 17:30): ¿recuperarla?». Así el guardado a mano se respeta y no se pierde nada si el móvil cierra la pestaña.

Detalle técnico en `ALMACENAMIENTO.md` §8.

## 7. El kit de deporte (aprobado el 30/10)

Las piezas que necesita cualquier deporte con club (apuntarse al club del colegio, prueba de acceso y plaza ofrecida, entrenar con el club y llegar tarde, no entrenar por libre durante la sesión, pedir consejo al entrenador, campamento y amigos en verano, verlo en la tele, subir y volver de categoría, sobrecarga, conocimiento del deporte y lo que traes de casa) salen del atletismo a un paquete común, `packages/kit-deporte` (`@ds/kit-deporte`), que cada deporte usa con sus datos. **Cambia la regla 1:** un módulo puede importar `@ds/contracts` y `@ds/kit-deporte`; el kit solo `@ds/contracts`. El kit va en el juego base y no tiene estado propio: trabaja con el estado del deporte que lo usa.

## 8. Las fases

Estamos en alfa: las partidas empezadas se descartan cuando cambie la forma del estado (se sube `SAVE_VERSION`). En las fases de reorganización **`npm run sim` debe dar exactamente lo mismo**: es la prueba de que no se rompe nada.

| Fase | Qué deja hecho | `sim` |
|---|---|---|
| **G** ✅ | Botón «Opciones» con guardar, guardado automático elegible, exportar/importar y copia de recuperación (§6). Solo interfaz. **Hecha el 30/10** | Sin efecto |
| **K** ✅ | **Kit de deporte** y el atletismo reescrito encima (§7). **Hecho el 30/10:** huella exacta del estado igual antes y después (14 partidas de bots, 120 y 330 días) | Idéntico |
| **0** ✅ | **Deporte practicado** (uno): módulo `deportes`, servicio `practica`, eventos `deporte.empezar` y `deporte.dejar`, ocultar lo que no se practica, «Empezar / Dejar el atletismo», elegir deporte en la nueva partida. **Hecha el 30/10** (huella exacta de 14 partidas de bots a 120 días: igual salvo el bot que abandona) | Idéntico (salvo el bot que abandona, que pasa a dejarlo de verdad) |
| **1** | **Aportes** en el motor (`GameModule.aportes`, `ctx.aportes`) y ficha de cada deporte (catálogo) | Idéntico |
| **2** | **Datos de cada deporte, por país dentro del deporte** (§4): `DatosDeDeporte` (categorías, temporada relativa al calendario escolar, competiciones y federación); las categorías salen de `PaisDef`; España del deporte de respaldo; validación de los datos | Idéntico en España |
| **3** | **Lo que el deporte pone en el mundo:** clubes con secciones por deporte, lugares y agendas aportados por el deporte | Idéntico |
| **4** | **La gente de cada deporte:** lo que pide cada deporte como dato, reclutar personas que encajan y crear las que falten, guardar lo pedido para seguir viviendo sin el módulo (§5); generalizar `aptitudDe` y la lectura de `competicion.resultado` | Idéntico |
| **5** | **Deportes en la partida:** añadir uno a una partida empezada (con pantalla de espera) y quitarlo; stats del deporte quitado que siguen cayendo (§5) | Idéntico |
| **6** | **Paquetes e instalador** (§3): cada deporte compilado aparte (sin su copia del kit ni de `contracts`), manifiesto con versión compatible, firma (clave privada como secreto de GitHub Actions), fuentes intercambiables con **GitHub Pages** y archivo local, caché sin conexión, Opciones → Deportes | Sin efecto |
| **7** | **Validación:** dos deportes de prueba (solo en los tests) instalados con el atletismo; cambiar de uno a otro; quitar uno un año y volver; bots que cambian de deporte; medida con 4 instalados (tamaño, espera, coste por acción y día) | Chequeos nuevos |

Después, **el fútbol**: debería tocar solo su módulo y sus datos.

**Más adelante, sin fecha** (el instalador queda preparado para ellas):

| Fase | Qué |
|---|---|
| **V** | **Venta:** fuente de instalación con licencias (tienda o servidor propio) para los deportes de pago, que no pueden estar en GitHub Pages (§3.4) |
| **M** | **Modding:** documentar la interfaz pública (vocabulario común y kit) con sus versiones, «modo mods» con aviso, mods firmados por su autor; aislarlos si hace falta (§3.4) |

**Orden:** G y K no dependen de nada (K se hace ya: va en el juego base y todo lo demás se apoya en él). 0 da el cambio de deporte con lo que hay. 1–5 sueltan los nudos del atletismo uno a uno. 6 cambia cómo llega el código, cuando ya no hay nada atado. 7 lo demuestra. V y M se apoyan en las fuentes y la firma de la 6. Las fases 2 a 4 tocan `contracts/paises`, `clubes`, `npcs` y `relaciones`, que comparten el trabajo de países: PR cortos y fusionados pronto.

## 9. Decisiones del usuario (30/10/2026)

- **Instalados, los que se quiera; practicado, uno.** Los deportes instalados conviven; se compite solo en uno (el de «Deporte») y se puede cambiar cuando se quiera. Jugar a otros con compañeros, más adelante.
- **El código del deporte se instala con el deporte** (instalador), para no cargar todos los deportes en todos los jugadores.
- **Kit de deporte:** aprobado.
- **Alfa:** se pueden descartar las partidas empezadas.
- **Reglas de cambio:** valen, asegurando que no se rompe nada y que queda listo para futuros deportes.
- **Dos juegos de rol:** el paquete de país (colegio, calendario, gente) y el paquete de deporte (código y sus datos por país), cada uno con España por defecto hasta que una actualización traiga lo propio.
- **Opciones:** un botón de Opciones con los de exportar e importar y los del guardado.
- **Desinstalar no archiva:** hay que prever cómo vuelve un deporte sin recrear nada ni dejar datos desfasados (§5).
- **Al cerrar la pestaña:** preguntar si guardar (respondido en §6: con nuestros botones sí; al cerrar la pestaña, aviso del navegador y copia de recuperación).
- **El motor de cada deporte llega como código en su paquete**, firmado: lo firmado por nosotros se instala venga de donde venga (§3.2).
- **Los datos van por deporte y, dentro del deporte, por país**; el país no sabe del deporte (§4).
- **Instalador: GitHub Pages de momento**, sin cerrarse a otras fuentes, porque si se vende el juego los deportes de pago no pueden estar en un sitio público, porque así el juego base pesa poco y porque se quiere abrir a modding (§3.3 y §3.4).
