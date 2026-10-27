# Añadir festivales y premios

Sitges, Seminci y César2025 se incorporan desde las mismas fuentes anuales que las familias anteriores. La presentación común está en `app/festival-config.js`: nombre, icono, modalidad festival/premios, enlaces directos y orden de categorías. Los menús de LAB y Lite se generan desde ese registro; no hay que mantener dos listas de botones.

Para otra familia: añadir su configuración, sus ediciones a `data/festivals/years/AAAA.json` y sus claves a `years/index.json`. Declarar la propiedad comprobada en `festival-owned-AAAA.json`. Construir el global y utilizar el planificador para calcular el alcance de asociaciones; no editar el mapa generado.

Las categorías César se guardan en español con detalles personales después de ` · `. Se conservan las 111 candidaturas, aunque una película tenga dos personas nominadas en la misma categoría, y24premios. La ceremonia es2025 y el año cinematográfico sigue siendo el de cada obra; la propiedad se contrastó con maestros2023–2025. Los honoríficos quedan conservados en la entrega de origen y fuera de categorías competitivas.

Sitges:34obras en competición y1corto premiado. Silencio figura en la competición oficial como una proyección de56min y conserva la etiqueta de miniserie. Seminci:24largometrajes en competición y6cortos premiados. No se amplían retrospectivas ni otras secciones.

El cruce acepta título original, título registrado y aliases consolidados, con dirección compatible. Los no localizados permanecen pendientes; la ausencia de ID de FilmAffinity no obliga a investigar casos inequívocos. No se asignan pósteres dudosos.

La corrección mínima de catálogo añade The Beast (La bestia), Bertrand Bonello, desde el maestro2023, con su enlaceTelegram. Esto también corrige una asociación previa de Venecia2023 que tenía un director ajeno; se bloqueó el cartel heredado de identidad dudosa. No se modificaron los maestros.

## Bloque 2022–2024

Las nueve ediciones añaden 321 entradas: 109 en 2022, 106 en 2023 y 106 en 2024. César conserva 126, 113 y 111 candidaturas respectivamente, con 24 categorías y 24 premios cada año. En 2023 Anouk Grinberg permanece candidata y Noémie Merlant gana; no se duplica el premio.

La propiedad se contrastó con maestros de 2019–2025 por los años de estreno desplazados. Son 189 apariciones disponibles en este bloque. Se recuperaron 32 direcciones de identidades locales; 25 entradas no localizadas conservan la dirección sin completar, sin inventarla ni convertirlas en propiedad.

`festival-references-2022-2024.json` contiene 177 identidades con referencias de maestros. La configuración compartida las recupera al abrir una ficha sin enlace, por título, director y año exactos, con una sola descarga en caché. Este archivo no participa en la selección de coincidencias ni modifica los índices del catálogo.

El overlay adicional recupera Emily y distingue El rapto/Rapito de Marco Bellocchio del homónimo de Daniela Goggi. Se conserva el enlace del maestro y se bloquea el cartel dudoso. La única asociación anterior corregida es Cannes 2023/Rapito; las demás permanecen iguales.

## Cinco familias adicionales · 2025

Globos de Oro (solo cine), David di Donatello y Ariel utilizan categorías y conservan las personas y canciones de cada candidatura. Locarno y Sundance utilizan secciones; los cortometrajes se incluyen únicamente cuando están premiados. Se añaden 237 entradas en 17 secciones, con 81 apariciones confirmadas en maestros de 2019–2025. Los años cinematográficos recuperados se conservan por película, independientemente de la ceremonia.

Se conservan 92 candidaturas y 15 premios en Globos; 127 candidaturas y 25 premios incluyendo David Giovani, más el David dello Spettatore separado; 127 candidaturas y 25 premios Ariel. En Ariel se unificaron las dos grafías de Párvulos sin perder sus candidaturas. Los honoríficos David sin película se conservan en el informe de fuentes.

Locarno incorpora 17 títulos internacionales y 15 Cineasti del Presente. La selección procede del paquete documentado con fuentes secundarias por bloqueo del PDF; el palmarés oficial se recuperó en copia CDN. Semaine de la Critique se consolida en una sección; el corto premiado de Open Doors conserva su sección real.

Sundance incorpora 48 títulos en las cinco secciones competitivas/NEXT, otras tres películas premiadas y siete cortos premiados. Se eliminó la repetición del premio de producción de Seeds, se restituyó el premio del público de Twinless y se corrigió la denominación Jonathan Oppenheim del premio de montaje de André is an Idiot según el palmarés oficial.

`festival-references-cinco-2025.json` aporta enlaces de maestros para identidades exactas que no estaban en el bloque de referencias anterior. No añade filas al catálogo ni modifica su resolvedor. Limónov conserva su identidad de director en cirílico; su equivalencia con Kirill Serebrennikov se reconoció al cotejar el maestro. Algunos títulos no localizados de Ariel mantienen director pendiente; no se les asigna propiedad ni póster por semejanza.

## Cinco familias · 2024 e iconos compartidos

El bloque 2024 añade 220 entradas en 14 secciones y confirma 75 apariciones de la colección mediante maestros 2019–2025. Globos conserva 92 candidaturas y 15 premios; David, 120 candidaturas y 24 premios competitivos/Giovani más el reconocimiento del espectador separado; Ariel, 126 candidaturas y 25 premios incluyendo empate. Los nombres de categorías se adaptan al vocabulario compartido de 2025.

Locarno conserva 17 títulos de Concorso Internazionale, 15 de Cineasti del Presente, 13 cortos premiados y la película premiada de Piazza Grande. Se excluye el corto cuya única distinción era una candidatura EFA y se separan los premios compuestos sin repetir películas. La limitación documental del programa final queda en las fuentes. Sundance conserva 46 obras en las cinco secciones principales/NEXT y siete cortos premiados. En festivales, una lista de premios ganados no se presenta como lista de candidaturas.

Cannes 2024/Emilia Pérez recupera el premio de interpretación compartido por Adriana Paz, Zoe Saldaña, Karla Sofía Gascón y Selena Gomez, además del premio del jurado. Es un ajuste de resultados sin cambio de identidad o propiedad.

El overlay mínimo `annual_2024_z_nuevos_festivales_overlay.json` recupera Familia, Perdidos en la noche, Tótem y Frida con datos y enlaces de los maestros, sin póster heredado. Su nombre lo sitúa después del reemplazo anual completo en el orden de carga. Tótem de Lila Avilés deja de heredar la ficha de Sander Burger; esa misma corrección alcanza Berlín 2023, la única asociación anterior modificada. Black Box Diaries conserva su ficha con director en escritura japonesa, reconocida como Shiori Ito al cotejar la referencia. No se cambia el resolvedor.

`festival-references-cinco-2024.json` añade 61 referencias exactas no incluidas en los bloques anteriores. Los iconos específicos de diez familias están en `app/festival-icons.svg`; los cinco símbolos anteriores se conservan. Cada una de las quince familias tiene un destino de icono distinto desde `app/festival-config.js`, sin duplicar dibujos entre LAB y Lite. Son pictogramas propios y ligeros, no imágenes externas.
