"""Recupera ganadores y candidatos históricos del buscador oficial David.

Requiere BeautifulSoup 4. No atribuye identidad cinematográfica ni propiedad.
"""

import json
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/festivals/sources/david_historico_oficial_1956_2015_2026_11_10.json"
BASE = "https://www.daviddidonatello.it/motore-di-ricerca/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FilmotecaLAB/1.0)"}


def read_page(year, winner):
    endpoint = "schedaanno.php" if winner else "candidatianno.php"
    data = urllib.parse.urlencode({
        "quale": "1" if winner else "2", "annovinci": year,
        "anno": year, "visualizza1": " ",
    }).encode()
    request = urllib.request.Request(BASE + endpoint, data=data, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        soup = BeautifulSoup(response.read(), "lxml")
    category = None
    rows = []
    for element in soup.select("td.titolino-categoria-motore-24, a[href*='schedasola.php?idfilm=']"):
        if element.name == "td":
            category = element.get_text(" ", strip=True)
            continue
        if not category:
            continue
        title = element.get_text(" ", strip=True)
        if not title:
            continue
        tr = element.find_parent("tr")
        person = ""
        if not winner:
            previous = element.find_previous("div", class_="mt-20")
            if previous:
                person = previous.get_text(" ", strip=True)
        elif tr:
            person = tr.get_text(" ", strip=True).split("per il film:")[0].strip()
        if person.casefold() == title.casefold() or person.startswith("regia di:"):
            person = ""
        rows.append({
            "category": category,
            "film": title,
            "filmUrl": urllib.parse.urljoin(BASE, element["href"]),
            "entryText": tr.get_text(" ", strip=True) if tr else title,
            "person": person,
            "winner": winner,
        })
    return rows


def fetch_year(year):
    winners = read_page(year, True)
    nominees = read_page(year, False)
    if not winners:
        raise RuntimeError(f"David {year}: sin ganadores en la página oficial")
    return year, {"winners": winners, "nominees": nominees}


with ThreadPoolExecutor(max_workers=4) as pool:
    years = dict(pool.map(fetch_year, range(1956, 2016)))
OUTPUT.write_text(json.dumps({
    "source": BASE + "motore-di-ricerca.php",
    "retrieved": "2026-11-10",
    "scope": "Ganadores y candidatos oficiales por año; lista de candidatos ausente en algunas ediciones",
    "years": years,
}, ensure_ascii=False, separators=(",", ":")) + "\n")
print("David:", len(years), "años,", sum(len(v["winners"]) for v in years.values()), "premios,", sum(len(v["nominees"]) for v in years.values()), "candidaturas")
