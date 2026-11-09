"""Conserva instantáneas de dos archivos oficiales para ediciones ausentes."""

import json
import re
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "data/festivals/sources"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FilmotecaLAB/1.0)"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as response:
        return response.read().decode("utf-8")


def save(name, payload):
    (SOURCE_DIR / name).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")


cesar_url = "https://www.academie-cinema.org/palmares/"
cesar_html = get(cesar_url)
match = re.search(r"var palmares_year_list = (\{.*?\});</script>", cesar_html, re.S)
if not match:
    raise RuntimeError("No se encontró el archivo oficial de César")
cesar = json.loads(match.group(1))
save("cesar_palmares_oficial_completo_2026_11_10.json", {
    "source": cesar_url,
    "retrieved": "2026-11-10",
    "scope": "Palmarès oficial 1976–2026; datos tal como aparecen en la página",
    "years": cesar,
})

ariel_url = "https://www.amacc.org.mx/historico-ariel"
ariel_html = get(ariel_url)
api = re.search(r'const URL_API\s*=\s*"([^"]+)"', ariel_html)
if not api:
    raise RuntimeError("No se encontró la fuente oficial de Ariel")
callback = "recibirDatosPremios"
jsonp = get(api.group(1) + "?format=jsonp&callback=" + callback)
prefix = callback + "("
if not jsonp.startswith(prefix) or not jsonp.rstrip().endswith(");"):
    raise RuntimeError("Respuesta oficial de Ariel inesperada")
ariel = json.loads(jsonp[len(prefix):].rstrip()[:-2])
if ariel.get("ok") is not True or not isinstance(ariel.get("data"), list):
    raise RuntimeError("Archivo oficial de Ariel incompleto")
save("ariel_historico_oficial_completo_2026_11_10.json", {
    "source": ariel_url,
    "retrieved": "2026-11-10",
    "scope": "Histórico oficial de Ariel; contiene errores de año en algunas filas futuras",
    "records": ariel["data"],
})

print("César:", len(cesar), "años; Ariel:", len(ariel["data"]), "registros")
