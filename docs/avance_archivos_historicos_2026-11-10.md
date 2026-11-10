# Archivo histórico oficial · 10/11/2026

Alcance acordado: candidaturas y premios generales de largometrajes; en cortometrajes, solo premiados. Se omiten honoríficos, retrospectivas y televisión. Las identidades cinematográficas no se atribuyen por semejanza de título.

| Familia | Ediciones nuevas | Apariciones | Premios | Cruces exactos con catálogo | Dirección pendiente |
| --- | ---: | ---: | ---: | ---: | ---: |
| César, 1976–2015 | 40 | 1.285 | 762 | 131 | 507 |
| Ariel, 1946–1958 y 1972–2015 | 57 | 944 | 1.366 | 83 | 763 |
| Globos de Oro, 1944–2015 | 72 | 2.189 | 1.001 | 83 | 1.859 |
| David di Donatello, 1956–2015 | 60 | 1.106 | 1.017 | 51 | 337 |
| **Total** | **229** | **5.524** | **4.146** | **348** | **3.466** |

Fuentes oficiales completas conservadas en `data/festivals/sources/`:

- César: https://www.academie-cinema.org/palmares/
- Ariel: https://www.amacc.org.mx/historico-ariel
- Globos de Oro: https://goldenglobes.com/nominations/1944 (una página por año hasta 2015)
- David di Donatello: https://www.daviddidonatello.it/motore-di-ricerca/motore-di-ricerca.php

La propiedad se declara solo cuando el título y director de la fuente coinciden exactamente con una ficha del catálogo y el año de la ficha está a dos años o menos de la ceremonia. Los demás cruces permanecen `null` en `festival-matches.json`; no se asignan pósteres ni propiedad por título aislado. Ninguna asociación anterior cambió.

Pendientes de cobertura y revisión:

- Sundance 1985–2015: el archivo oficial sí permite consultar las páginas de cada edición desde `https://www.sundance.org/digital-archive/`. Se guardó una extracción inicial de las 31 páginas oficiales en `data/festivals/sources/sundance_archivo_oficial_1985_2015_2026_11_10.json`: 5.541 filas de programa y 746 filas de palmarés. La fuente contiene una película repetida en 2012 y tres filas de premios sin rótulo legible; requieren revisión. Falta clasificar largometrajes/secciones, limitar los cortos a premiados y verificar identidades antes de integrarlo. Sundance 1985–2015 aún no está publicado.
- David 1956–1980: el buscador oficial no devuelve listas de candidatos; estas ediciones incluyen solo ganadores y llevan indicación de cobertura limitada.
- César 1976–1977: cuatro filas de premios combinan títulos de varias películas bajo un mismo ID; quedan fuera de la asociación automática para no atribuir el premio a la obra equivocada.
- Ariel: la tabla oficial contiene filas con años futuros erróneos (2027–2029); no se importan. Los premios especiales sin película identificada quedan fuera.
- Las direcciones e identidades no resueltas de la tabla requieren verificación específica antes de confirmar propiedad. Los títulos permanecen en la grafía de la fuente oficial.

El bloque agrega solo años ausentes de estas cuatro familias. Se conservan todas las ediciones anteriores y sus asociaciones.
