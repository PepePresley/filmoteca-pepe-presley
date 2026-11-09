"""Recupera las candidaturas cinematográficas oficiales de Globos 1944–2015.

Requiere BeautifulSoup 4. Conserva títulos, categoría, persona y resultado
tal como aparecen en las páginas de Golden Globes; no cruza identidades.
"""

import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/festivals/sources/globos_historico_oficial_1944_2015_2026_11_10.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FilmotecaLAB/1.0)"}


def fetch_year(year):
    url = f"https://goldenglobes.com/nominations/{year}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as response:
        soup = BeautifulSoup(response.read(), "lxml")
    categories = soup.select(".c-nominations-category")
    if not categories:
        raise RuntimeError(f"Globos {year}: página oficial sin categorías")
    rows = []
    for section in categories:
        heading = section.select_one("h3")
        if not heading:
            continue
        category = heading.get_text(" ", strip=True)
        if "Television" in category or "TV" in category or "Cecil B." in category:
            continue
        for detail in section.select(".c-nomination-details"):
            film_links = [a for a in detail.select("a[href]") if "/film/" in a["href"]]
            if len(film_links) != 1:
                continue
            title = film_links[0].get_text(" ", strip=True)
            if not title:
                continue
            person_links = [a for a in detail.select("a[href]") if "/person/" in a["href"]]
            people = [a.get_text(" ", strip=True) for a in person_links]
            status = detail.select_one(".c-nomination-details__status")
            rows.append({
                "category": category,
                "film": title,
                "filmUrl": film_links[0]["href"],
                "people": people,
                "winner": bool(status and "winner" in status.get_text(" ", strip=True).casefold()),
            })
    if not rows:
        raise RuntimeError(f"Globos {year}: ninguna candidatura de cine")
    return year, rows


with ThreadPoolExecutor(max_workers=4) as pool:
    years = dict(pool.map(fetch_year, range(1944, 2016)))
OUTPUT.write_text(json.dumps({
    "source": "https://goldenglobes.com/nominations/{year}",
    "retrieved": "2026-11-10",
    "scope": "Candidaturas de cine; categorías de televisión excluidas",
    "years": years,
}, ensure_ascii=False, separators=(",", ":")) + "\n")
print("Globos:", len(years), "años,", sum(map(len, years.values())), "filas")
