# Preparación de BAFTA

`prepare-bafta.py` reutiliza una lectura guardada de FilmAffinity y copias de
solo lectura de los maestros. Genera una propuesta local, sin consultar la red,
modificar los Excel ni escribir las fuentes publicadas.

La exportación tiene categorías con `category` y `rows`; cada fila contiene
`text`, `winner` y `movies` (`title`, `href` con `movie-id`). La configuración
selecciona `include` por nombre, define `minYear`/`maxYear`, etiquetas canónicas
en `labels` y categorías sin nombres personales en `filmOnlyCategories`.
No asumir que animación o documental pertenecen a cine: las páginas históricas
mezclan televisión. Consultar BAFTA solo cuando exista esa duda.

```sh
python3 scripts/prepare-bafta.py --input <exportacion.json> --config <config.json> \
  --masters <copias-maestros.xlsx> --output <propuesta.json>
```

Se agrupan películas por identidad FA y se conservan candidaturas diferentes
por persona. Los cruces exactos por título ES/original se proponen en bloque.
Homónimos y tarjetas ganadoras con varias películas requieren revisión; no se
elige una identidad ni un ganador por posición. Las ausencias no abren una
investigación individual. `rowCorrections` permite registrar una discrepancia
resuelta, por clave `categoría|primera línea`, con identidad, título y URL.
Documentar siempre la fuente de cada corrección en la evidencia de la edición.

Tras resolver las dudas, incorporar solo la edición y su propiedad a la fuente
anual. Compilar el global y ejecutar el planificador una vez contra el commit
aprobado, con informe del bloque. Comprobar preservación de datos anteriores,
casos nuevos dudosos y navegación. Una ejecución de pruebas pertinentes, un PR
y una comprobación del despliegue. No repetir pruebas de interfaz inalterada
salvo fallo concreto. Si una herramienta no aplica el tamaño móvil, registrar
esa limitación y evitar intentos idénticos.

Las propuestas y copias de maestros se mantienen en `outputs/` y no se publican.
La herramienta requiere `openpyxl` en el entorno de preparación; los workflows
de generación de LAB conservan sus dependencias actuales.
