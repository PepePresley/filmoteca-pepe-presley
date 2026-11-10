# Archivo histórico oficial · 10/11/2026

Alcance acordado: candidaturas y premios generales de largometrajes; en cortometrajes, solo premiados. Se omiten honoríficos, retrospectivas y televisión. Las identidades cinematográficas no se atribuyen por semejanza de título.

| Familia | Ediciones nuevas | Apariciones | Premios | Cruces exactos con catálogo | Dirección pendiente |
| --- | ---: | ---: | ---: | ---: | ---: |
| César, 1976–2015 | 40 | 1.285 | 762 | 131 | 507 |
| Ariel, 1946–1958 y 1972–2015 | 57 | 944 | 1.366 | 83 | 763 |
| Globos de Oro, 1944–2015 | 72 | 2.189 | 1.001 | 83 | 1.859 |
| David di Donatello, 1956–2015 | 60 | 1.106 | 1.017 | 51 | 337 |
| Sundance, 1985–2015 | 31 años, 335 secciones | 3.070 | 743 | 530 asociaciones seguras | 112 |
| **Total** | **260 años** | **8.594** | **4.889** | **878** | **3.578** |

Fuentes oficiales completas conservadas en `data/festivals/sources/`:

- César: https://www.academie-cinema.org/palmares/
- Ariel: https://www.amacc.org.mx/historico-ariel
- Globos de Oro: https://goldenglobes.com/nominations/1944 (una página por año hasta 2015)
- David di Donatello: https://www.daviddidonatello.it/motore-di-ricerca/motore-di-ricerca.php
- Sundance: https://history.sundance.org/search (31 páginas de edición y 5.504 fichas enlazadas)

La propiedad se declara solo cuando el título y director de la fuente coinciden exactamente con una ficha del catálogo y el año de la ficha está a dos años o menos de la ceremonia. Los demás cruces permanecen `null` en `festival-matches.json`; no se asignan pósteres ni propiedad por título aislado. Ninguna asociación anterior cambió.

Pendientes de cobertura y revisión:

- Sundance 1985–2015: se conservaron las 31 páginas oficiales de edición (5.541 filas de programa y 746 de palmarés) y 5.504 fichas enlazadas. Se publican las selecciones generales de largometraje y los 170 cortos premiados. Los 743 premios con rótulo quedan representados. Tres filas del palmarés carecen de nombre de premio y no se inventa su categoría. En 112 películas la dirección no consta o aparece dañada en el archivo; se muestran sin atribución. La propiedad se contrastó con los Excel maestros aprobados: 886 coincidencias exactas, de las que 39 asociaciones generadas apuntaban a una ficha distinta y se bloquearon; 530 cruces nuevos llegaron a una ficha segura. Siete coincidencias ambiguas quedan sin propiedad automática. No se cambió ninguna asociación anterior. La incorporación y el cotejo se documentan en `scripts/integrar_sundance_historico_20261110.py`, `scripts/sundance_propiedad_maestros_20261110.py` y `scripts/sundance_bloquear_cruces_inexactos_20261110.py`.
- David 1956–1980: el buscador oficial no devuelve listas de candidatos; estas ediciones incluyen solo ganadores y llevan indicación de cobertura limitada.
- César 1976–1977: cuatro filas de premios combinan títulos de varias películas bajo un mismo ID; quedan fuera de la asociación automática para no atribuir el premio a la obra equivocada.
- Ariel: la tabla oficial contiene filas con años futuros erróneos (2027–2029); no se importan. Los premios especiales sin película identificada quedan fuera.
- Las direcciones e identidades no resueltas de la tabla requieren verificación específica antes de confirmar propiedad. Los títulos permanecen en la grafía de la fuente oficial.

Cada bloque agrega ediciones ausentes de su familia. Se conservan todas las ediciones anteriores y sus asociaciones.
