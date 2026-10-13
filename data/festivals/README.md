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
`festival-matches.json` continúa generándose mediante su script y workflow;
no editarlo manualmente. Regenerar las asociaciones una sola vez con el
alcance del bloque. La migración de fuentes usa `--labels-only` para conservar
íntegro el mapa aprobado, porque su contenido y sus identidades no cambian.

```sh
node --test scripts/build-festivals.test.mjs
```

`sources/` conserva la evidencia documental. Los antiguos archivos parciales
del directorio raíz y `manifest.json` son material histórico; no alimentan
la construcción actual ni la interfaz.

La existencia de fuentes para años ya publicados no autoriza construir años
nuevos. Se mantiene la pausa solicitada tras 2015.
