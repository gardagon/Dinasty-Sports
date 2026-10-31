DISEÑO DE SISTEMA — STATS, PERKS Y PERSONALIDAD
RPG Deportivo Dinástico
Versión 0.2 — Stats globales cerrados
ESTADO DEL DOCUMENTO
Sección	Estado
1. Arquitectura de tres capas	✅ CERRADA
2. Stats globales — criterio de clasificación	✅ CERRADA
3. Conocimiento deportivo — canales de subida	✅ CERRADA
4. Presentación al jugador — filosofía UI	✅ CERRADA
5. Perks — definición y comportamiento	✅ CERRADA
6. Ejes de personalidad — mecánica	✅ CERRADA
7. Identidad visible del personaje — panel UI	✅ CERRADA
8. Composición corporal — tipo de cuerpo	✅ CERRADA
9. Lista completa de stats globales	✅ CERRADA
10. Lista concreta de perks heredables	✅ CERRADA
11. Lista concreta de ejes de personalidad	✅ CERRADA
12. Tabla relación global → técnico por stat	✅ CERRADA
13. Límites genéticos — valores concretos	✅ CERRADA
14. Rasgos adquiridos	⏸ APARCADO — revisar tras diseño de eventos
1. ARQUITECTURA DE TRES CAPAS

Decisión cerrada. No reabrir.

Capa	Nombre	Descripción
1	Stats globales	Capacidades del ser humano independientes del deporte. Existen antes de tocar un balón.
2	Conocimiento deportivo	Comprensión del deporte concreto. Actúa como techo práctico de las habilidades técnicas.
3	Habilidades técnicas	Expresión entrenada de los stats globales dentro de un deporte concreto. Definidas en el SportAddon.

Criterio definitivo para clasificar un stat:

Si lo tiene un niño antes de tocar un balón, es global. Si solo tiene sentido dentro de un deporte concreto, es técnico.

2. STATS GLOBALES — CRITERIO DE CLASIFICACIÓN

Decisión cerrada. No reabrir.

Speed, stamina, strength → globales. Son capacidades físicas que existen independientemente del deporte. El addon las referencia como base, no las duplica.

Leadership / Liderazgo → se expresa en el sistema social como Autoridad. Global con expresión técnica en el addon deportivo.

Criterio de relación global → técnico: El stat global pone el techo genético. El conocimiento deportivo actúa como segundo techo contextual. La habilidad técnica es lo que el jugador entrena dentro de ese doble techo.

techo_técnico = min(
    límite_genético_stat_global_relacionado,
    conocimiento_deportivo × 1.2
)
3. CONOCIMIENTO DEPORTIVO — CANALES DE SUBIDA

Decisión cerrada. No reabrir.

Tres canales con peso distinto:

Canal	Peso	Notas
Partidos	Principal	La experiencia competitiva real genera más conocimiento que cualquier otro canal.
Entrenamiento específico	Secundario	Solo entrenamientos con componente táctica o técnica colectiva. Correr físico no sube conocimiento deportivo.
Estudio pasivo	Terciario	Ver partidos, leer táctica, hablar con el entrenador. Único canal disponible durante lesiones graves.

Modificador de inteligencia: La inteligencia actúa como multiplicador del canal de estudio pasivo. Un jugador con inteligencia alta extrae más conocimiento del mismo partido visto que uno con inteligencia baja. No afecta al canal físico.

Implicación de diseño: Una lesión grave no es solo penalización. Es una bifurcación: el jugador que usa bien los módulos nocturnos durante la baja puede salir con más conocimiento deportivo que si hubiera seguido entrenando normal.

4. PRESENTACIÓN AL JUGADOR — FILOSOFÍA UI

Decisión cerrada. No reabrir.

El jugador siente los stats, no los gestiona.

Por detrás hay números. En la UI hay sensaciones. Referente: Persona 5, no Football Manager.

El filtro es la inteligencia del personaje:

Inteligencia	Información visible
Baja	Solo sensaciones muy vagas ("te notas lento")
Media-baja	Indicadores cualitativos básicos ("velocidad: regular")
Media-alta	Rangos aproximados ("entre buena y muy buena")
Alta	Descripción precisa ("destacada para tu edad")
Muy alta	Comparativas ("top 10% de tu categoría")

El entrenador con relación alta da pistas más precisas independientemente de la inteligencia del personaje. Esto conecta el sistema de información con el RelationSystem.

Implicación de diseño: Invertir en stats mentales y académicos no solo mejora al personaje. Cambia lo que el jugador puede ver sobre su propio personaje. Las decisiones del colegio tienen peso real aunque el jugador quiera centrarse en el deporte.

5. PERKS — DEFINICIÓN Y COMPORTAMIENTO

Decisión cerrada. No reabrir.

Qué son: Herencia genética pura. Físicos y morfológicos. Patizambo, constitución de toro, manos grandes, visión periférica excepcional. No son rasgos de personalidad —eso son los ejes de actitud.

Comportamiento:

No se ganan durante el juego
No se pierden
Se heredan con probabilidad de padres a hijos
Pueden estar latentes: el personaje los tiene pero no los expresa hasta que un evento específico los activa
El FamilyGenerator los genera todos al nacer pero no los activa todos
El sistema los revela progresivamente mediante eventos

Por qué los perks latentes: Convierte cada perk en un momento de descubrimiento narrativo, no en un dato de creación de personaje. Un niño puede llevar tres temporadas jugando y en un partido concreto se activa un perk de velocidad que tenía de su madre. Ese momento tiene que sentirse como un descubrimiento real.

Lista concreta de perks: 🔲 PENDIENTE

6. EJES DE PERSONALIDAD — MECÁNICA

Decisión cerrada. No reabrir.

Qué son: Skills del personaje que evolucionan con las decisiones del jugador. Distintos de los perks (genética) y de los stats (capacidades entrenables).

Mecánica:

Rango: -50 a +50
Valor inicial: 0 (salvo configuración de inicio elegida por el jugador)
Evolucionan con decisiones durante toda la vida del personaje
El jugador no ve su posición en el eje
Lo siente por las opciones que se abren o se cierran

Ejemplo de funcionamiento: Compañero solo en un partido, el jugador rodeado de rivales.

Opciones disponibles: Regatear / Tirar / Pasar (desactivado)
El jugador entiende por qué sin que ningún número se lo explique

Tres modos de inicio:

Modo	Descripción
Personalizado	El jugador distribuye puntos iniciales en los ejes antes de empezar
Equilibrado	Todo a 0. El primer día tomando decisiones hacia donde va.
Aleatorio	Modo hardcore. Ejes asignados aleatoriamente. Superdivertido si te gustan los retos.

Requisito de diseño del modo aleatorio: Ningún eje en ningún extremo puede ser trampa. Cada extremo tiene que tener su propio camino viable, con opciones que se abren y opciones que se cierran. El individualista extremo pierde opciones colectivas pero gana otras que un jugador equilibrado nunca ve.

Lista concreta de ejes: 🔲 PENDIENTE

7. IDENTIDAD VISIBLE DEL PERSONAJE — PANEL UI

Decisión cerrada. No reabrir.

Bloque 1 — Identidad Datos de quién es el personaje. Visibles siempre, sin filtro de inteligencia.

Dato	Naturaleza	Evolución
Nombre	Fijo	No cambia
Edad	Variable	Avanza con el tiempo
Altura	Variable hacia objetivo genético	Crece activamente en infancia y adolescencia. Se estabiliza en la veintena.
Peso	Variable por hábitos	Varía toda la vida. Rango saludable derivado de altura y constitución. Puede degradarse por descuido.
Tipo corporal	Variable por hábitos acumulados	Ver sección 8.

Bloque 2 — Capacidades Stats globales del personaje. Visibles con precisión variable según inteligencia. Ver sección 4.

Bloque 3 — Habilidades técnicas Específicas del addon deportivo activo. Solo visibles cuando sport_enrolled = true.

Qué no aparece en el panel de identidad:

Posición — la asigna el entrenador, no define al personaje
Stats técnicos del addon — van en bloque 3
Ejes de personalidad — nunca visibles como números

Implicación narrativa: El jugador siempre sabe exactamente quién es su personaje pero no necesariamente lo que vale. Identidad clara, capacidades inciertas. Coherente con tener ocho años.

8. COMPOSICIÓN CORPORAL — TIPO DE CUERPO

Decisión cerrada. No reabrir.

Qué es: Expresión visible de los hábitos acumulados del personaje. No es un stat que se entrena directamente —es el resultado de decisiones de entrenamiento, alimentación y descanso sostenidas en el tiempo.

Cómo se muestra: Descripción cualitativa en el bloque de Identidad. El jugador ve el resultado, no las variables internas.

Cinco tipos con sus modificadores:

Tipo	Cómo se llega	Modificadores
Delgado	Poco músculo, poca grasa. Poca comida, mucho cardio.	Velocidad +, Fuerza —
Normal	Equilibrio sin trabajar especialmente ninguno.	Sin modificadores
Atlético	Músculo moderado, poca grasa. Entrenamiento variado.	Equilibrio velocidad/fuerza
Musculado	Mucho músculo. Entrenamiento de fuerza intenso.	Fuerza ++, Velocidad —
Con sobrepeso	Grasa acumulada. Malos hábitos sostenidos.	Constitución —, Velocidad —

Comportamiento:

Cambia despacio. Es el resultado de decisiones acumuladas, no de una elección puntual.
El jugador ve el tipo corporal actual pero no las variables internas.
Coherente con la filosofía UI: siente las consecuencias, no gestiona las variables.
9. LISTA COMPLETA DE STATS GLOBALES

Decisión cerrada. No reabrir.

Total: 20 stats globales — 6 físicos / 6 mentales / 5 sociales / 1 académico

FÍSICOS — decaen sin entrenamiento, tienen límite genético
Stat	Descripción
Velocidad	Capacidad de desplazamiento puro. Qué tan rápido mueves el cuerpo de un punto a otro. Independiente del deporte: en los 100m lisos es la misma para un futbolista que para un tenista. Cómo se aplica en competición depende del conocimiento deportivo.
Fuerza	Capacidad de generar potencia muscular. Empujar, cargar, disputar un balón en el aire, resistir un choque físico. Base para cualquier habilidad técnica que requiera potencia.
Resistencia	Cuánto tiempo mantiene el cuerpo el esfuerzo antes de ceder. Distinta a Constitución: puedes ser físicamente robusto y fatigarte rápido, o ser fibroso y aguantar noventa minutos sin problema.
Constitución	Robustez estructural del cuerpo. Determina la predisposición a lesionarse, la velocidad de recuperación y la capacidad de absorber esfuerzo acumulado. No se entrena directamente sino a través de hábitos sostenidos en el tiempo.
Agilidad	Capacidad de cambiar de dirección con rapidez y control. Distinta a Velocidad: puedes ser muy rápido en línea recta pero lento girando. Un bailarín tiene agilidad alta y puede tener velocidad media.
Coordinación	Precisión del movimiento. Qué tan bien ejecuta el cuerpo lo que el cerebro ordena. Distinta a Agilidad: coordinación es exactitud de ejecución, agilidad es velocidad de reacción motora.
MENTALES — decaen muy lento, se mantienen en retiro
Stat	Descripción
Inteligencia	Velocidad y calidad del razonamiento. Qué tan rápido entiende conceptos nuevos, qué tan bien toma decisiones bajo presión. Es además el filtro que determina qué información ve el jugador sobre su propio personaje: a más inteligencia, más precisa y detallada es la información visible.
Concentración	Capacidad de mantener el foco durante períodos sostenidos. Un jugador con Concentración alta rinde igual en el minuto uno que en el ochenta. Uno con Concentración baja se desconecta en momentos de bajo estímulo y comete errores cuando menos se espera.
Determinación	Actitud proactiva ante el esfuerzo y la dificultad. Cuánto empuja el personaje cuando algo es duro, cuánto persiste cuando el progreso es lento o invisible. Afecta principalmente al rendimiento en entrenamiento sostenido y a las decisiones de largo plazo.
Resiliencia	Respuesta reactiva al golpe. Cómo se recupera el personaje después de un fracaso, una lesión, una humillación pública o una racha de malos resultados. Distinta a Determinación: Determinación es lo que te hace seguir empujando, Resiliencia es lo que te hace levantarte después de caer.
Atención	Capacidad de procesar y filtrar el entorno en tiempo real. Qué tan bien capta información relevante en situaciones de alta densidad —en clase, en el campo, en una conversación con mucho ruido de fondo. Base global sobre la que el deporte construye su propia visión de juego específica.
Creatividad	Capacidad de encontrar soluciones no convencionales. En el deporte se expresa en jugadas que nadie anticipa, en salidas inesperadas de situaciones de presión. Combina con Inteligencia: la Inteligencia razona bien dentro de los patrones conocidos, la Creatividad rompe los patrones.
SOCIALES — cambian por relaciones y eventos
Stat	Descripción
Carisma	Atracción y magnetismo natural. Gustar a la gente de forma espontánea y caer bien en situaciones uno a uno. La gente confía, quiere estar cerca, sin que el personaje haga nada especial para conseguirlo.
Comunicación	Claridad y eficacia al transmitir ideas. Distinta a Carisma: puedes ser muy carismático y comunicar mal, o tener poco carisma pero ser extraordinariamente claro y efectivo. Afecta a negociaciones, instrucciones tácticas y resolución de conflictos.
Autoridad	Capacidad de mando y liderazgo. El respeto que infundes y la obediencia que generas en el grupo. En el campo es la madera de capitán —organizar la defensa, levantar la moral. En la escuela es el rol de delegado o el tipo al que nadie se atreve a vacilar.
Empatía	Lectura emocional del entorno. Capacidad de descifrar qué sienten los demás para conectar con ellos o saber cuándo están al límite. Conecta con el RelationSystem: un personaje con Empatía alta tiene acceso a información sobre el estado emocional de otros que uno con Empatía baja no percibe.
Picardía	Astucia, psicología inversa y manipulación. Saber jugar al límite del reglamento, desestabilizar mentalmente al rival o salirte con la tuya frente a los profesores. Stat moralmente ambiguo por diseño: abre opciones que otros no tienen, pero algunas de esas opciones tienen consecuencias que otros no asumen. Combinada con Empatía crea un perfil psicológicamente muy sofisticado.
ACADÉMICO — stat independiente
Stat	Descripción
Rendimiento académico	Rango 0-100. No se hereda de los padres. Refleja el desempeño escolar acumulado. Lo modifican módulos escolares, estudio, faltar a clase y el nivel de energía durante los módulos. Tiene evaluación trimestral con consecuencias en semanas 12, 24 y 36.
DESCARTADOS — con razón documentada
Stat	Razón
Memoria	Redundante con el sistema de conocimiento deportivo. Los automatismos que describe ya están cubiertos por la Capa 2 y Capa 3.
Autocontrol	Cubierto entre Determinación y Resiliencia. Si ambas son altas, el autocontrol es consecuencia emergente.
Visión de juego	Técnica del deporte. Va en el addon, no en global.
Presencia	Sustituida por Autoridad, que es más precisa y tiene expresiones concretas en ambas fases del MVP.
PENDIENTES — ORDEN DE TRABAJO
Lista concreta de perks heredables — nombre, efecto, qué activa, bonus/malus
Lista concreta de ejes de personalidad — validar los 4 propuestos o añadir más
Tabla relación global → técnico — qué stat global alimenta cada habilidad técnica del addon
Límites genéticos — valores concretos de decay y techos
Rasgos adquiridos — si los hay, cómo se diferencian de los ejes

Documento vivo. Se actualiza con cada sesión de co-diseño antes de pasar a implementación.

10. EJES DE PERSONALIDAD — LISTA COMPLETA

Decisión cerrada. No reabrir.

Total: 8 ejes — rango -50 a +50 — valor inicial 0 salvo configuración de inicio

El jugador nunca ve su posición en el eje. Lo siente por las opciones que se abren o se cierran.

RELACIÓN CON EL MUNDO

Disciplinado ↔ Rebelde Cómo se relaciona el personaje con las normas y la autoridad externa. El disciplinado sigue las instrucciones del entrenador sin cuestionarlas, cumple los horarios, respeta las reglas aunque no le gusten. El rebelde las ignora, las cuestiona o las rompe activamente. Ejemplo: el entrenador ordena no salir la noche antes del partido. El disciplinado se queda en casa. El rebelde sale y asume las consecuencias.

Honesto ↔ Manipulador La tendencia del personaje a actuar con transparencia o con cálculo. Distinto de Picardía —que es una capacidad del stat social— este eje describe la elección: si el personaje usa o no lo que sabe hacer. Un personaje con Picardía alta y eje hacia Honesto es alguien que podría manipular pero no lo hace. Eso es narrativamente distinto de alguien que manipula porque no tiene otra herramienta. Ejemplo: el personaje sabe algo comprometido sobre un compañero. El honesto no lo usa. El manipulador lo guarda para cuando le convenga.

OBJETIVOS PERSONALES

Ambicioso ↔ Satisfecho Qué tan alto apunta el personaje y cuánto le importa llegar. El ambicioso nunca está satisfecho con lo que tiene —quiere más minutos, mejor equipo, más reconocimiento. El satisfecho acepta su lugar sin que eso le genere conflicto. Ejemplo: el entrenador le da el puesto de suplente. El ambicioso lo vive como una afrenta y busca la forma de cambiarlo. El satisfecho lo acepta y sigue. Nota: Satisfecho sustituye a Conformista. Más preciso, menos negativo por defecto.

Relajado ↔ Sacrificado La intensidad de la dedicación al objetivo. No es ambición —es disposición al coste personal. El relajado disfruta el proceso, no renuncia a nada que le guste por mejorar, tiene vida fuera del deporte. El sacrificado lo pone todo al servicio del objetivo: sueño, relaciones, ocio. Ejemplo: hay entrenamiento extra voluntario el mismo día que el cumpleaños de un amigo. El relajado va al cumpleaños. El sacrificado va al entrenamiento.

RELACIÓN CON LOS DEMÁS

Solitario ↔ Sociable Cómo gestiona el personaje su energía social y su tiempo libre. El solitario prefiere estar solo, recarga en silencio, las relaciones le cuestan. El sociable busca activamente estar con gente, se apaga si pasa demasiado tiempo solo. Distinto de Colectivo/Individual en el campo —ese es comportamiento táctico del addon deportivo, no un eje de personalidad global. Ejemplo: tarde libre sin planes. El solitario se queda en casa y está a gusto. El sociable llama a alguien aunque no tenga nada concreto que hacer.

Calmado ↔ Agresivo La respuesta emocional ante el conflicto y la frustración fuera del contexto táctico. No es agresividad deportiva —es cómo reacciona el personaje cuando algo le contraría en la vida. El calmado absorbe, no escala, gestiona la tensión sin explotar. El agresivo responde con intensidad, escala rápido, dice lo que piensa aunque cueste. Ejemplo: un profesor le castiga injustamente. El calmado acepta y lo procesa internamente. El agresivo lo dice en voz alta aunque le cueste una sanción mayor.

AFRONTAMIENTO

Temerario ↔ Prudente La relación del personaje con el riesgo calculado. El temerario lo intenta aunque no tenga garantías, se lanza sin calcular, acepta la posibilidad de fallar o lesionarse sin que le frene. El prudente evalúa antes de actuar, prefiere la opción segura, evita la exposición innecesaria. Ejemplo: disputa un balón dividido con riesgo de choque físico. El temerario va a por él sin pensarlo. El prudente cede si el riesgo es alto.

Optimista ↔ Pesimista Cómo interpreta el personaje los eventos que le ocurren. No describe rendimiento sino percepción: el optimista lee los mismos eventos como oportunidades, el pesimista como confirmaciones de sus peores expectativas. Una derrota para el optimista es un tropiezo. Para el pesimista es una confirmación de que no vale. Interacción con stats: el pesimismo reduce el efecto de Determinación —empujar cuando no crees en ti mismo cuesta más. Resiliencia es el contrapeso natural: un pesimista con Resiliencia alta aprende a funcionar con esa visión sin que le destruya. Esa combinación genera un arquetipo concreto —el jugador que nunca cree en sí mismo pero que siempre vuelve. Ejemplo: comete un error en un partido importante. El optimista lo procesa y sigue. El pesimista lo rumia y afecta a su rendimiento en los módulos siguientes.

MODOS DE INICIO
Modo	Descripción
Personalizado	El jugador distribuye puntos iniciales en los ocho ejes antes de empezar.
Equilibrado	Todo a 0. El primer día tomando decisiones hacia donde va.
Aleatorio	Modo hardcore. Ejes asignados aleatoriamente. Cada extremo tiene camino viable.
REQUISITO DE DISEÑO PARA TODOS LOS EJES

Ningún extremo de ningún eje puede ser trampa. Cada posición tiene opciones que se abren y opciones que se cierran. El jugador que llega a un extremo pierde algunas cosas y gana otras que el jugador equilibrado nunca ve. Esto es obligatorio para que el modo aleatorio funcione.

11. PERKS — LISTA COMPLETA Y SISTEMA DE HERENCIA

Decisión cerrada. No reabrir.

SISTEMA DE HERENCIA — ARQUITECTURA

Cada personaje tiene dos listas de perks:

perks_active — los que expresa el personaje. Máximo 2-3. Son los únicos que afectan al juego activamente.

perks_inherited_pool — los perks de sus padres que no se activaron en él pero que almacena en su genealogía. No le afectan. Cuando tenga hijos, el FamilyGenerator consulta este pool para calcular qué puede heredar la siguiente generación.

Implicación: un perk puede saltarse una generación sin desaparecer. El abuelo tenía Sangre fría activa. El padre no la heredó pero la tiene en perks_inherited_pool. El nieto puede heredarla del pool del padre aunque el padre nunca la expresara.

⚠ Deuda técnica para Equipo 1: FamilyGenerator ya implementado necesita dos modificaciones:

CharacterEntity añade campo perks_inherited_pool separado de perks_active
Al crear un hijo, FamilyGenerator consulta tanto perks_active como perks_inherited_pool del padre. Lo que no se activa en el hijo pasa a su propio perks_inherited_pool. No es urgente para MVP (un solo personaje, sin hijos). Bloqueante para Fase 4 — loop dinástico.
COMPORTAMIENTO DE LOS PERKS
No se ganan durante el juego
No se pierden una vez activos
Pueden estar latentes: el personaje los tiene pero no los expresa hasta que un evento específico los activa
El FamilyGenerator los genera todos al nacer pero no activa más de 2-3
Los negativos también pueden estar latentes —el personaje no sabe que es Asmático hasta el primer entrenamiento intenso, no sabe que es Miope hasta un evento que lo revela
Ambidiestro es el único perk sin par negativo. Es excepcional por exceso, no tiene defecto equivalente.
LISTA COMPLETA — 29 PERKS EN 14 PARES + 1 ÚNICO
Positivo	Negativo	Área	Efecto positivo	Efecto negativo
Zancada larga	Paticorto	Morfológico	Bonus Velocidad en carrera de fondo	Penaliza Velocidad en carrera de fondo
Manos grandes	Manos pequeñas	Morfológico	Bonus Coordinación en acciones de agarre y control fino. Relevante para porteros.	Penaliza Coordinación en esas mismas acciones
Visión periférica excepcional	Miope	Sensorial	Bonus Atención en situaciones de alta densidad. Percibe movimientos que otros no ven.	Penaliza Atención y visión en situaciones de alta densidad. Con gafas/lentillas se compensa parcialmente.
Constitución de toro	Endeble	Morfológico	Bonus Constitución y resistencia al impacto. Malus leve Velocidad por mayor peso estructural.	Penaliza Constitución. Mayor predisposición a lesiones y recuperación más lenta.
Fibroso	Flacucho	Físico	Bonus Velocidad explosiva y Agilidad. Cae antes en esfuerzos prolongados.	Penaliza Fuerza y capacidad de duelo físico
Pulmones grandes	Asmático	Físico	Bonus Resistencia. Se activa tras semanas de entrenamiento de fondo.	Penaliza Resistencia. Se revela en el primer entrenamiento intenso.
Recuperación rápida	Recuperación lenta	Físico	Reduce tiempo de recuperación tras esfuerzo y lesiones menores	Las lesiones duran más. La fatiga acumulada tarda más en desaparecer.
Reflejos felinos	Torpe	Sensoriomotor	Bonus Coordinación en situaciones reactivas. Relevante para porteros y duelos uno contra uno.	Lentitud de reacción ante estímulos inesperados. No es torpeza general, es lentitud reactiva.
Equilibrio natural	Desequilibrado	Sensoriomotor	Bonus Agilidad y recuperación de posición tras impacto. Cae menos, se recoloca más rápido.	Cae con más facilidad en duelos físicos. Tarda más en recomponerse tras impacto.
Memoria fotográfica motora	Memoria corta motora	Cognitivo	Aprende movimientos complejos tras verlos pocas veces. Acelera subida de habilidades técnicas por estudio pasivo.	Aprende movimientos más lento que la media. Los olvida si no los practica con frecuencia. Canal de estudio pasivo menos efectivo.
Sangre fría	Nervioso	Cognitivo	Bonus Concentración en momentos de alta tensión. Penaltis, últimos minutos, situaciones decisivas.	Dispara frecuencia cardíaca bajo presión. Penaliza Concentración exactamente en los momentos que más importan.
Suertudo	Gafe	Especial	Segunda oportunidad cuando una acción falla. Probabilidad baja por activación. Límite 1-2 por partido. No modifica probabilidad global —activa rama narrativa alternativa.	Cuando una acción sale bien, probabilidad pequeña de que algo salga mal de todas formas. Mismo límite y misma mecánica.
Ambidiestro	—	Físico único	Usa ambas manos y pies con eficacia similar. Abre opciones tácticas que ningún otro jugador tiene. Extremadamente raro.	Sin par negativo.
Gigante	Enano	Morfológico-Altura	Modifica el objetivo genético de altura al alza. Bonus a remate de cabeza, duelos aéreos, posiciones que requieren altura mínima. Se revela progresivamente entre los 10 y los 16 años.	Modifica el objetivo genético de altura a la baja. Malus en duelos aéreos y posiciones que requieren altura. Bonus compensatorio en Agilidad y centro de gravedad bajo.
—	Mano de palo	Físico único	—	Dominancia lateral tan marcada que el pie o mano no dominante es prácticamente inútil. Cierra opciones tácticas específicas.
NOTA SOBRE DOMINANCIA LATERAL

Diestro/Zurdo no es un perk —es un dato de identidad como la altura. Forma parte del personaje desde el principio, visible siempre en el panel de identidad, sin necesidad de activarse. Ambidiestro sí es perk porque es una excepción genética sobre esa base. Mano de palo es perk porque es una limitación genética extrema sobre esa misma base.

12. LÍMITES GENÉTICOS Y DECAIMIENTO

Decisión cerrada. No reabrir.

LÍMITES GENÉTICOS

Aplican a todos los stats globales sin excepción —físicos, mentales y sociales. La genética define el techo independientemente de la categoría. Un entorno rico puede acelerar el desarrollo pero no superar el límite.

Fórmula de cálculo:

límite = media_padres × factor_herencia × variación_aleatoria (±15%)

La variación aleatoria es el motor de sorpresas narrativas: un hijo que supera a ambos padres o que decepciona. Sin ella el sistema es predecible y pierde tensión.

Rendimiento decreciente al acercarse al límite:

Proximidad al límite	Multiplicador de ganancia
< 80% del límite	×1.0 — progresión normal
80–90% del límite	×0.5 — progresión lenta
90–95% del límite	×0.2 — progresión muy lenta
> 95% del límite	×0.05 — casi imposible

El jugador nunca ve el límite como número. Lo siente en que entrenar se vuelve progresivamente más duro sin entender exactamente por qué.

Perks y límite genético: Un perk puede empujar un stat más allá de su límite genético pero nunca superar 100. El perk escala sobre el límite, no lo ignora. Si el límite genético ya es 100, el perk en ese stat es inservible.

Fórmula con perk activo:

techo_real = min(100, límite_genético + bonus_perk)

Nota: La fórmula base y los valores de escala se validan en MVP y se ajustan con datos reales de juego. No son definitivos hasta prueba.

DECAIMIENTO DE STATS

Una única capa de decaimiento siempre activa con multiplicador por inactividad. No hay tolerancia a la inactividad por edad —hay distintos valores base y distintas velocidades de multiplicador según categoría y edad.

Mecánica:

Decaimiento base ocurre siempre, incluso entrenando. Imperceptible en el día a día.
Cada semana sin usar el stat el multiplicador sube.
El multiplicador tiene un techo — no puede convertirse en espiral irrecuperable.
Al retomar la actividad el multiplicador baja, pero gradualmente, no de golpe.

Comportamiento por categoría:

Físicos — categoría más sensible al decaimiento.

Edad	Decaimiento base semanal	Velocidad multiplicador por inactividad
6–12 años	Mínimo	Muy lento
12–18 años	Bajo	Lento
18–25 años	Moderado	Moderado
25–30 años	Moderado-alto	Rápido
30+ años	Alto	Muy rápido

La edad acelera tanto el decaimiento base como la velocidad a la que crece el multiplicador por inactividad. Un jugador de 32 años que para dos semanas lo nota al volver. Un niño de 10 años puede pasar un mes sin entrenar y apenas percibirlo.

Sociales — decaimiento base muy pequeño. El multiplicador crece por falta de interacción social, no por falta de entrenamiento específico. Se recupera rápido en cuanto el personaje vuelve a relacionarse. La edad apenas afecta a la curva.

Mentales — sin decaimiento práctico durante la vida activa del personaje. Se mantienen estables durante décadas. Su fluctuación durante el MVP se expresa a través del rendimiento académico —decisiones de estudio, energía en clase, módulos nocturnos. El decaimiento real aparece solo en fase de declive avanzado, fuera del alcance del MVP.

Implicación narrativa de los mentales: Son los únicos stats que el personaje puede desarrollar toda su vida sin miedo al decaimiento. Un exjugador de 45 años puede tener la Inteligencia y la Creatividad en su punto más alto. Eso da sentido real a la fase de entrenador: no es solo que ya no puede jugar físicamente, es que su perfil mental está en su mejor momento.

Lo que ve el jugador: Nunca números de decaimiento ni valores de multiplicador. Ve sensaciones: "después de las vacaciones de verano te notas algo oxidado" o "te cuesta más que antes llegar a los balones". Coherente con la filosofía UI de toda la sección 4.

13. HABILIDADES TÉCNICAS DE FÚTBOL — TABLA DEFINITIVA

Decisión cerrada por secciones. Ver notas de cada una.

Tres tipos de habilidad:

Entrenable — el jugador la mejora directamente con entrenamiento y partidos
Derivada — se calcula a partir de globales y otras técnicas. El MatchSimulator la consume precalculada sin recalcular en cada acción
Oculta — no visible para el jugador. Modificador interno del MatchSimulator
TÉCNICOS DE CAMPO
Habilidad	FM Original	Tipo	Global principal	Global secundario	Notas
Pase	Passing	Entrenable	Atención	Comunicación	Base de la construcción de juego
Control	First Touch	Entrenable	Coordinación	Atención	Calidad de recepción del balón
Regate	Dribbling	Entrenable	Agilidad	Creatividad	Movimiento con balón bajo presión
Definición	Finishing	Entrenable	Coordinación	Concentración	Precisión en situación de gol
Técnica	Technique	Entrenable	Coordinación	Creatividad	Base de ejecución técnica general
Centros	Crossing	Entrenable	Coordinación	Atención	Pase desde banda a área
Juego de cabeza	Heading	Entrenable	Fuerza	Coordinación	Combina con Salto y altura
Marcaje	Marking	Entrenable	Atención	Inteligencia	Identificar y anular al rival
Entrada	Tackling	Entrenable	Fuerza	Coordinación	Disputa del balón con contacto
Disparo lejano	Long Shots	Entrenable	Fuerza	Coordinación	Disparo desde fuera del área
Golpeo de falta	Free Kick Taking	Entrenable	Técnica	Coordinación	Habilidad específica en balón parado
Penaltis	Penalty Taking	Entrenable	Concentración	Sangre fría en partido	Ejecución bajo máxima presión
Saques de esquina	Corners	Entrenable	Técnica	Atención	Habilidad específica en balón parado
Saque de banda largo	Long Throws	Entrenable	Fuerza	Técnica	Distancia y precisión en saque lateral
MENTALES DE CAMPO
Habilidad	FM Original	Tipo	Global principal	Global secundario	Notas
Visión de juego	Vision	Entrenable	Inteligencia	Atención	Lectura táctica del espacio
Posicionamiento	Positioning	Entrenable	Atención	Inteligencia	Ubicación en el campo sin balón
Desmarque	Off the Ball	Entrenable	Inteligencia	Velocidad	Movimiento para recibir
Anticipación	Anticipation	Entrenable	Atención	Inteligencia	Leer la jugada antes de que ocurra
Toma de decisiones	Decisions	Entrenable	Inteligencia	Atención	Elegir la acción correcta bajo presión
Sangre fría en partido	Composure	Entrenable	Concentración	Resiliencia	Distinto del perk genético — versión entrenable
Agresividad en juego	Aggression	Derivada	Determinación	Eje Calmado/Agresivo	Intensidad competitiva. No es temperamento
Liderazgo en campo	Leadership	Derivada	Autoridad	Conocimiento deportivo	No puedes liderar sin autoridad ni sin conocer el deporte
Juego colectivo	Teamwork	Derivada	Eje Solitario/Sociable	Autoridad	Expresión del eje dentro del campo
Creatividad	Flair	Derivada	Creatividad global	Conocimiento deportivo	Expresión de la Creatividad global en contexto de partido
FÍSICOS DE CAMPO
Habilidad	FM Original	Tipo	Global principal	Global secundario	Notas
Arrancada	Acceleration	Entrenable	Velocidad	Agilidad	Explosividad inicial. Distinto de velocidad sostenida. En fútbol el arranque es específico del deporte
Salto	Jumping Reach	Entrenable	Fuerza	Coordinación	El alcance depende de altura y fuerza. El timing del salto es específico del fútbol

Eliminados de físicos con razón:

Habilidad	FM Original	Razón
Velocidad en campo	Pace	1:1 con global Velocidad
Agilidad en campo	Agility	1:1 con global Agilidad
Equilibrio en campo	Balance	1:1 con global Agilidad + perk Equilibrio natural
Forma física	Natural Fitness	1:1 con global Constitución + tipo corporal
Resistencia en partido	Stamina	1:1 con global Resistencia
Fuerza en campo	Strength	1:1 con global Fuerza
PORTERO
Habilidad	FM Original	Tipo	Global principal	Global secundario	Notas
Reflejos	Reflexes	Entrenable	Coordinación	Atención	Versión entrenable del perk Reflejos felinos
Mano a mano	One on Ones	Entrenable	Anticipación	Sangre fría en partido	Situación de máxima presión individual
Blocaje	Handling	Entrenable	Coordinación	Constitución	Seguridad en el agarre del balón
Despeje con pie	Kicking	Entrenable	Técnica	Fuerza	Distancia y precisión del despeje
Alcance aéreo	Aerial Reach	Entrenable	Salto	Coordinación	Combina con altura y fuerza
Dominio del área	Command of Area	Entrenable	Autoridad	Anticipación	Organización y decisión en el área
Comunicación de portero	Communication	Derivada	Comunicación global	Conocimiento deportivo	Organización verbal de la defensa
Excentricidad	Eccentricity	Derivada	Eje Temerario/Prudente	Creatividad en partido	Tendencia a salir del área. Se calcula, no se entrena
OCULTOS — modificadores internos del MatchSimulator
Habilidad	FM Original	Tipo	Se calcula desde	Efecto en partido
Consistencia	Consistency	Derivada oculta	Determinación + Resiliencia + Concentración	Varianza de rendimiento partido a partido. Alta = rendimiento estable. Baja = brillante o desastroso
Dureza	Dirtiness	Derivada oculta	Eje Calmado/Agresivo + Agresividad en juego	Tendencia a faltas, entradas duras, juego en el límite del reglamento
Partidos grandes	Important Matches	Derivada oculta	Sangre fría en partido + Resiliencia	Modificador de rendimiento en partidos de alta presión. Positivo o negativo
Rendimiento bajo presión	Pressure	Derivada oculta	Concentración global + Sangre fría en partido + Eje Optimista/Pesimista	Cómo rinde cuando el resultado importa. Distinto de Partidos grandes: este aplica a cualquier momento de tensión dentro de un partido

Eliminados de ocultos con razón:

Habilidad	FM Original	Razón
Propensión a lesiones	Injury Proneness	Ya cubierto por perk Endeble + global Constitución + InjurySystem
ELIMINADOS DE MENTALES CON RAZÓN
Habilidad	FM Original	Razón
Valentía	Bravery	Cubierto por eje Temerario/Prudente
Concentración	Concentration	1:1 con global mental Concentración
Determinación	Determination	1:1 con global mental Determinación
Liderazgo	Leadership	Pasa a Derivada — calculada desde Autoridad + conocimiento deportivo
Intensidad	Work Rate	Cubierto por eje Relajado/Sacrificado
14. FÓRMULAS DEL MATCH ENGINE

Decisión cerrada. No reabrir sin razón de peso.

FÓRMULA COMPLETA — VALOR EN PARTIDO

Todo se precalcula antes del pitido inicial. Durante el partido solo el modificador de energía puede actualizarse en el descanso. Ningún otro cálculo ocurre en tiempo real.

// PASO 1 — Valor efectivo de la habilidad técnica
valor_efectivo = valor_entrenado 
    × (secundaria_1/100 × 1.2) 
    × (secundaria_2/100 × 1.2)
    × (secundaria_N/100 × 1.2)

// El valor entrenado es el ancla principal.
// Las secundarias pueden reducirlo o amplificarlo máximo un 20% cada una.
// Un global en 100 aporta ×1.2. Un global en 0 aporta ×0.0.
// Los valores concretos de secundarias por habilidad: ver tabla sección 13.

// PASO 2 — Experiencia en posición efectiva (con afinidad)
experiencia_posicion_efectiva = min(100, 
    experiencia_posicion_actual + 
    Σ(experiencia_posicion_X × afinidad(X → posicion_actual)))

// PASO 3 — Experiencia en rol efectiva (con afinidad)
experiencia_rol_efectiva = min(100,
    experiencia_rol_actual +
    Σ(experiencia_rol_Y × afinidad_rol(Y → rol_actual)))

// PASO 4 — Experiencia combinada (posición pesa más que rol)
experiencia_combinada = (experiencia_posicion_efectiva × 0.7) + 
                        (experiencia_rol_efectiva × 0.3)

// PASO 5 — Valor final al MatchSimulator
valor_en_partido = valor_efectivo 
    × (experiencia_combinada / 100)
    × modificador_energia
    × normalizacion_categoria
TABLA DE MODIFICADOR DE ENERGÍA
Energía del jugador	Modificador	Efecto percibido
70–100%	×1.0	Sin penalización. Rendimiento normal.
50–70%	×0.9	Penalización leve. Apenas perceptible.
30–50%	×0.75	Penalización moderada. El jugador nota que no está al nivel.
10–30%	×0.55	Penalización severa. Errores visibles, decisiones lentas.
< 10%	×0.30	Al límite del colapso. Riesgo de lesión elevado.
NORMALIZACIÓN POR CATEGORÍA

El MatchSimulator no compara valores absolutos sino valores relativos a la categoría en la que juega el partido.

valor_normalizado = valor_en_partido / media_categoria × 100

Por qué: un niño de 8 años con Pase 12 rinde como buen pasador en categoría benjamín. El mismo Pase 12 en un partido profesional sería insuficiente. La normalización garantiza que los partidos de infancia sean jugables y que el salto de categoría se sienta como un reto real.

Implicación narrativa: el jugador que domina en infantiles y sube a juveniles se siente de repente mediocre aunque sus stats hayan crecido. Necesita seguir mejorando para mantener el mismo rendimiento relativo. Es exactamente lo que viven los jugadores reales.

TABLA DE AFINIDAD ENTRE POSICIONES

Porcentaje de experiencia que transfiere una posición a otra. Valores orientativos —se calibran con MVP.

Desde \ Hacia	Portero	Central	Lateral	Pivote	Mediocentro	Mediapunta	Extremo	Delantero
Portero	—	20%	5%	5%	0%	0%	0%	0%
Central	5%	—	40%	30%	15%	5%	5%	0%
Lateral	0%	30%	—	20%	20%	10%	30%	5%
Pivote	0%	25%	15%	—	50%	20%	5%	5%
Mediocentro	0%	10%	15%	40%	—	40%	20%	10%
Mediapunta	0%	0%	10%	15%	35%	—	30%	30%
Extremo	0%	0%	25%	5%	15%	25%	—	35%
Delantero	0%	0%	0%	0%	10%	30%	30%	—

Tabla de afinidad entre roles: pendiente de definir cuando se cierren los roles por posición.

DECISIONES DE DISEÑO CERRADAS EN ESTA SECCIÓN
Decisión	Resolución
Fórmula de valor efectivo	Multiplicativa. Las secundarias pueden amplificar hasta ×1.2 o reducir a ×0.
Peso del valor entrenado	Es el ancla principal. Las secundarias modulan sobre él, no lo sustituyen.
Cálculo en tiempo real	Solo el modificador de energía. Todo lo demás precalculado antes del partido.
Peso posición vs rol	70% posición, 30% rol en la experiencia combinada.
Umbrales de energía	5 umbrales. No lineal. Por encima del 70% sin penalización.
Normalización por categoría	Siempre activa. Valores relativos a la media de la categoría.
Amplificación máxima por global	×1.2 por secundaria. Sin límite de cuántas secundarias puede tener una habilidad.
15. MODELO DE ENTRENAMIENTO — TRANSFERENCIAS

Decisión cerrada. No reabrir sin razón de peso.

DOS CAMINOS DE MEJORA

El jugador puede invertir su tiempo de entrenamiento en globales o en habilidades técnicas. Son estrategias distintas con resultados distintos.

Camino ancho — entrenar globales: Sube el global y ese global amplifica todas las habilidades técnicas que lo tienen como secundaria. Un punto de Fuerza mejora simultáneamente Disparo lejano, Entrada, Juego de cabeza, Golpeo de falta, Centros, Saque de banda largo y Definición. Eficiente en amplitud, lento en profundidad.

Camino estrecho — entrenar habilidades técnicas: Sube principalmente esa habilidad específica con transferencia mínima al global. El valor efectivo de esa habilidad crece mucho más rápido que entrenando el global. Eficiente en profundidad, sin efecto de arrastre significativo sobre otras habilidades.

Implicación de diseño: La decisión de qué entrenar cada temporada es estratégica y real. Un delantero que invierte en Fuerza es más completo pero menos letal. Uno que invierte en Definición y Disparo lejano es más predecible pero más peligroso en su especialidad.

FÓRMULAS DE TRANSFERENCIA
// ENTRENAMIENTO DE GLOBAL
ganancia(global_X)                              = delta × 1.0
ganancia(tecnica_Y — X es secundaria de Y)      = delta × 0.10 a 0.20

// ENTRENAMIENTO DE TÉCNICA
ganancia(tecnica_X)                             = delta × 1.0
ganancia(tecnica_Y — relacionada con X)         = delta × 0.15 a 0.25
ganancia(global_Z — relacionado con X)          = delta × 0.03 a 0.05

Valores exactos: orientativos. Se calibran en MVP con datos reales de juego.

CONTROL DEL DESBALANCE
La transferencia de técnica → global es 20 veces menor que la ganancia principal
Los globales tienen límite genético — la transferencia no puede romperlo
Muchas técnicas transfieren al mismo global, pero la suma sigue siendo menor que entrenar el global directamente
El jugador que quiera subir Fuerza de forma significativa tiene que entrenar Fuerza, no Disparo lejano
CONOCIMIENTO DEPORTIVO — canal de entrenamiento

El conocimiento deportivo no sube con entrenamiento de globales. Solo sube por:

Partidos (canal principal)
Entrenamientos con componente táctica o técnica colectiva (canal secundario)
Estudio pasivo — ver partidos, leer táctica, hablar con el entrenador (canal terciario, amplificado por Inteligencia)

Un jugador que solo entrena globales puede tener stats físicos altos pero conocimiento deportivo bajo — su techo técnico estará limitado aunque sus capacidades físicas sean excepcionales.

16. TABLA DE SECUNDARIAS POR HABILIDAD TÉCNICA

Decisión cerrada. Valores calibrables durante MVP sin cambiar arquitectura.

TÉCNICOS DE CAMPO
#	Habilidad	Secundarias (orden de peso)
1	Pase	Atención, Visión de juego, Inteligencia
2	Control	Coordinación, Atención, Agilidad
3	Regate	Agilidad, Equilibrio, Creatividad
4	Definición	Coordinación, Concentración, Fuerza
5	Técnica	Coordinación, Creatividad
6	Centros	Coordinación, Fuerza, Atención
7	Juego de cabeza	Fuerza, Coordinación, Atención, Salto
8	Marcaje	Atención, Inteligencia, Anticipación
9	Entrada	Fuerza, Coordinación, Atención
10	Disparo lejano	Fuerza, Coordinación, Concentración
11	Golpeo de falta	Técnica, Fuerza, Coordinación
12	Penaltis	Concentración, Sangre fría en partido, Técnica, Fuerza, Coordinación
13	Saques de esquina	Técnica, Fuerza, Atención
14	Saque de banda largo	Fuerza, Técnica, Atención, Inteligencia
MENTALES DE CAMPO — entrenables
#	Habilidad	Secundarias (orden de peso)
1	Visión de juego	Inteligencia, Atención
2	Posicionamiento	Atención, Inteligencia
3	Desmarque	Inteligencia, Velocidad, Atención
4	Anticipación	Atención, Inteligencia, Concentración
5	Toma de decisiones	Inteligencia, Atención, Concentración
6	Sangre fría en partido	Concentración, Resiliencia
MENTALES DE CAMPO — derivadas
#	Habilidad	Se calcula desde
7	Agresividad en juego	Determinación × 0.6 + Eje Calmado/Agresivo × 0.4
8	Liderazgo en campo	Autoridad × 0.7 + Conocimiento deportivo × 0.3
9	Juego colectivo	Eje Solitario/Sociable × 0.6 + Autoridad × 0.4
10	Creatividad en partido	Creatividad global × 0.7 + Conocimiento deportivo × 0.3
FÍSICOS DE CAMPO
#	Habilidad	Secundarias (orden de peso)
1	Arrancada	Velocidad, Agilidad
2	Salto	Fuerza, Coordinación, Altura*

*Altura es dato de identidad, no stat entrenable. Actúa como modificador fijo en Salto.

PORTERO — entrenables
#	Habilidad	Secundarias (orden de peso)
1	Reflejos	Coordinación, Atención
2	Mano a mano	Anticipación, Sangre fría en partido
3	Blocaje	Coordinación, Constitución
4	Despeje con pie	Técnica, Fuerza
5	Alcance aéreo	Salto, Coordinación
6	Dominio del área	Autoridad, Anticipación
PORTERO — derivadas
#	Habilidad	Se calcula desde
7	Comunicación de portero	Comunicación global × 0.6 + Conocimiento deportivo × 0.4
8	Excentricidad	Eje Temerario/Prudente × 0.5 + Creatividad en partido × 0.5
OCULTOS — derivadas
#	Habilidad	Se calcula desde
1	Consistencia	Determinación × 0.4 + Resiliencia × 0.35 + Concentración × 0.25
2	Dureza	Eje Calmado/Agresivo × 0.6 + Agresividad en juego × 0.4
3	Partidos grandes	Sangre fría en partido × 0.6 + Resiliencia × 0.4
4	Rendimiento bajo presión	Concentración × 0.4 + Sangre fría × 0.35 + Eje Optimista/Pesimista × 0.25

Nota general: todos los pesos y valores son orientativos. Se calibran durante MVP sin necesidad de cambiar arquitectura — son datos, no código.

17. POSICIONES Y ROLES — ESTRUCTURA DEFINITIVA

Decisión cerrada. La estructura no cambia. Los roles y afinidades son calibrables sin tocar código.

ESTRUCTURA DE 5 LÍNEAS + PORTERO
Línea	Posiciones
Portero	Portero
Línea 1 — Defensa	Central, Lateral izquierdo, Lateral derecho
Línea 2 — Mediocampo defensivo	Pivote, Carrilero izquierdo, Carrilero derecho
Línea 3 — Mediocampo central	Mediocentro, Interior izquierdo, Interior derecho
Línea 4 — Mediocampo ofensivo	Mediapunta, Extremo izquierdo, Extremo derecho
Línea 5 — Ataque	Delantero centro, Delantero izquierdo, Delantero derecho

Total: 17 posiciones (16 + portero)

RESTRICCIONES DE FORMACIÓN
Zona	Restricción mínima
Portero	1 obligatorio siempre
Línea 1	Mínimo 3 jugadores
Líneas 2 + 3 combinadas	Mínimo 3 jugadores
Líneas 4 + 5 combinadas	Mínimo 1 jugador

Permite formaciones desde 3-4-3 hasta 5-4-1 sin romper el sistema.

ROLES POR POSICIÓN — 36 roles totales

PORTERO — 2 roles

Rol	Descripción
Portero tradicional	Prioriza la parada sobre la línea de gol. Conservador, pocas salidas.
Portero sweeper	Sale del área para anticipar. Actúa casi como un defensa adicional.

CENTRAL — 3 roles

Rol	Descripción
Central defensivo	Prioriza el marcaje y el duelo físico. Pocas salidas con balón.
Central constructor	Sale con balón, inicia el juego desde atrás. Requiere Pase y Visión altos.
Líbero	Sale con balón de forma más arriesgada. Más ofensivo que el constructor.

LATERAL IZQUIERDO / LATERAL DERECHO — 3 roles compartidos

Rol	Descripción
Lateral defensivo	Prioriza la cobertura y el marcaje. Pocas subidas al ataque.
Lateral ofensivo	Sube constantemente, genera superioridad en banda. Requiere Resistencia y Centros.
Lateral en apoyo	Más interior, combina con el carrilero de su banda.

CARRILERO IZQUIERDO / CARRILERO DERECHO — 2 roles compartidos

Rol	Descripción
Carrilero defensivo	Cubre el espacio entre lateral y pivote. Repliega con frecuencia.
Carrilero ofensivo	Sube con balón, casi un extremo por dentro. Requiere Resistencia y Arrancada.

PIVOTE — 2 roles

Rol	Descripción
Pivote destructor	Prioriza recuperar balones y cortar líneas de pase. Poco juego.
Pivote organizador	Distribuye el juego desde atrás. Requiere Pase y Visión altos.

MEDIOCENTRO — 3 roles

Rol	Descripción
Mediocentro organizador	Controla el tempo, distribuye. Requiere Pase y Toma de decisiones.
Mediocentro de caja a caja	Cubre todo el campo, llega al área rival. Requiere Resistencia alta.
Mediocentro defensivo	Se queda cerca de la defensa, cubre al pivote o lo sustituye.

INTERIOR IZQUIERDO / INTERIOR DERECHO — 3 roles compartidos

Rol	Descripción
Interior llegador	Llega al área desde segunda línea. Requiere Definición y Disparo lejano.
Interior organizador	Combina, da juego al extremo de su banda. Requiere Pase y Visión.
Interior defensivo	Repliega, cubre al mediocentro. Más defensivo que ofensivo.

MEDIAPUNTA — 3 roles

Rol	Descripción
Mediapunta clásico	Enlaza con los delanteros, genera ocasiones. Requiere Visión y Desmarque.
Mediapunta interior	Busca el disparo, casi un segundo delantero. Requiere Definición y Regate.
Mediapunta en apoyo	Baja a combinarse, casi un mediocentro ofensivo. Requiere Pase y Control.

EXTREMO IZQUIERDO / EXTREMO DERECHO — 3 roles compartidos

Rol	Descripción
Extremo desbordador	Va por fuera, centra. Requiere Velocidad, Regate y Centros.
Extremo interior	Corta hacia dentro, dispara con la pierna dominante. Requiere Definición y Regate.
Extremo de apoyo	Baja a combinarse, menos vertical. Requiere Pase y Control.

DELANTERO IZQUIERDO / DELANTERO DERECHO — 2 roles compartidos

Rol	Descripción
Delantero en banda	Mantiene amplitud, centra o desborda. Requiere Velocidad y Centros.
Delantero interior	Corta hacia el centro, busca el remate. Requiere Definición y Regate.

DELANTERO CENTRO — 3 roles

Rol	Descripción
Delantero referencia	Fija defensas, juega de espaldas, abre espacios. Requiere Fuerza y Juego de cabeza.
Delantero móvil	Busca profundidad, crea espacios. Requiere Velocidad y Desmarque.
Delantero asociativo	Baja a combinarse, casi un mediapunta adelantado. Requiere Pase y Control.
PRINCIPIO DE AFINIDAD ENTRE ROLES

La afinidad fluye principalmente en vertical — por el mismo carril — no en horizontal entre posiciones de la misma línea.

Ejemplo: Carrilero izquierdo tiene más afinidad con Extremo izquierdo e Interior izquierdo que con el Pivote, aunque compartan línea.

Tabla de afinidad entre roles: pendiente de definir. No bloqueante para MVP — se puede inicializar con valores neutrales y calibrar con datos reales de juego.

NOTA SOBRE PIERNA DOMINANTE

Diestro/Zurdo/Ambidiestro es dato de identidad, no rol. La pierna dominante modifica cómo se ejecutan ciertos roles pero no crea roles nuevos. Un Extremo interior zurdo jugando en la derecha y uno diestro jugando en la izquierda tienen el mismo rol pero distintas habilidades técnicas activas en partido.

18. NOTA SOBRE mentality Y SISTEMAS DE EVALUACIÓN

mentality fue descartado como stat de debut.

En el sistema anterior mentality aparecía en debut_requirements del addon de fútbol como stat de evaluación. Ha sido eliminado y sustituido por los cinco stats reales del personaje:

json
"debut_requirements": {
  "min_stats": {
    "constitucion": 12.0,
    "coordinacion": 10.0,
    "determinacion": 8.0,
    "concentracion": 6.0,
    "resiliencia": 5.0
  },
  "min_stats_threshold": 0.6
}

En el futuro, mentality será un stat derivado compuesto cuya fórmula está pendiente de diseño. Posibles inputs: concentracion, determinacion, resiliencia, atencion. No tiene fecha de implementación y no es bloqueante para el MVP.

Principio arquitectónico cerrado: Los sistemas de evaluación (LifePhaseSystem, debut_requirements, cualquier sistema genérico) usan siempre stats reales del personaje, nunca derivados. El LifePhaseSystem es genérico y no conoce la semántica del deporte. El addon define qué se evalúa con nombres reales de stats. El código itera y compara sin lógica de derivación.

Esto aplica a cualquier sistema futuro que evalúe requisitos sobre el personaje: siempre leer stats reales, nunca calcular derivados en tiempo de evaluación.