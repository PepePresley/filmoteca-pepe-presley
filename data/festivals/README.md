# Construcción de festivales

Las fuentes de construcción están en `years/AAAA.json`: un archivo por año
de edición con todas sus familias y secciones. `years/index.json` conserva
la versión de los datos y el orden establecido de las ediciones.

LAB y Lite siguen leyendo `festivals.json`. Es un archivo generado: para
actualizar contenido, editar la fuente anual y después ejecutar:

```sh
node scripts/build-festivals.mjs
node scripts/build-festivals.mjs --check
```

Si se añade una edición autorizada, añadir también su clave
`[festival, año, sección]` a `editionOrder` en `years/index.json`, en la
posición deseada. Las modificaciones de películas o premios dentro de una
edición existente solo requieren editar su archivo anual. Actualizar
`metadata.version` en el índice cuando cambie contenido publicado.

El generador comprueba años, ediciones ausentes o duplicadas, películas
duplicadas y la cobertura completa del índice antes de sustituir el global.
Conserva el orden de películas, todos sus campos y las categorías de premios.
`--check` detecta un global desactualizado sin escribir archivos. CI ejecuta
las pruebas y esta comprobación.

La propiedad procede de los maestros aprobados y de `festival-owned-AAAA.json`.
`festival-matches.json` es generado; no editarlo manualmente. El alcance se
calcula comparando los datos actuales con un commit aprobado, sin depender
del nombre de la rama:

```sh
node scripts/plan-festival-matches.mjs --base=origin/main --plan-only
node scripts/plan-festival-matches.mjs --base=origin/main
```

La primera orden muestra el plan sin escribir. La segunda ejecuta una única
generación final usando el mapa aprobado del commit base. Conviene terminar
todos los cambios del bloque antes de ejecutarla.

Los cambios de identidad, aliases, sección o propiedad afectan a sus años de
edición. Los cambios del catálogo se comparan con las mismas reglas del
generador: solo afectan a años donde cambia el resultado, incluyendo premios
del año siguiente, identidades con año desplazado, empates y carátulas de
fallback. La comparación contempla la sustitución de un año por un maestro
anual y los overlays históricos. Los metadatos técnicos ajenos al mapa no
provocan reconstrucciones.

Las etiquetas visibles, premios, categorías y cambios de presentación
conservan las asociaciones aprobadas mediante `--labels-only`. Los cambios
de reglas del generador se anuncian con motivo `matching-rules` y requieren
regenerar todos los años existentes; revisar ese alcance antes de publicarlos.
La extracción inicial de las reglas solo se considera neutra si conserva
literalmente el resolver anterior.

CI usa el commit de main de la PR como base, verifica las fuentes anuales,
ejecuta las pruebas y exige que el mapa generado coincida con el presentado.
En las ramas de staging existentes usa el commit anterior del push. Un mapa
modificado a mano no se convierte en la referencia aprobada de su propia PR.
Si otro commit llega durante la generación en staging, el push falla en vez
de mezclar resultados de dos estados distintos: repetir sobre el último commit.

```sh
node --test scripts/build-festivals.test.mjs
node --test scripts/plan-festival-matches.test.mjs
```

`sources/` conserva la evidencia documental. Los antiguos archivos parciales
del directorio raíz y `manifest.json` son material histórico; no alimentan
la construcción actual ni la interfaz.

La existencia de fuentes para años ya publicados no autoriza construir años
nuevos. Se mantiene la pausa solicitada tras 2015.
