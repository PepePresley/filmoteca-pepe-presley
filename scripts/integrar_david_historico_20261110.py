"""Incorpora candidaturas generales y cortos premiados de David 1956–2015."""

import json
import re
from collections import OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/festivals"
archive = json.loads((DATA / "sources/david_historico_oficial_1956_2015_2026_11_10.json").read_text())
index_path = DATA / "years/index.json"
index = json.loads(index_path.read_text())

new_keys = []
total_films = 0
total_awards = 0
without_director = 0
without_nominees = []
for year in range(1956, 2016):
    source = archive["years"][str(year)]
    films = OrderedDict()
    for row in source["winners"] + source["nominees"]:
        category = row["category"].strip()
        if any(text in category.casefold() for text in ("premio speciale", "alla carriera", "david speciale")):
            continue
        if "cortometraggio" in category.casefold() and not row["winner"]:
            continue
        film_id = re.search(r"idfilm=(\d+)", row["filmUrl"])
        if not film_id:
            raise ValueError(f"David {year}: enlace de película sin ID")
        film_id = film_id.group(1)
        title = row["film"].strip()
        if not title:
            raise ValueError(f"David {year}: película sin título")
        record = films.setdefault(film_id, {
            "title": title, "director": "", "award": "Nominada",
            "nominations": [], "wins": [], "aliases": [],
            "sourceUrl": row["filmUrl"],
        })
        if record["title"].casefold() != title.casefold():
            raise ValueError(f"David {year}: ID {film_id} con títulos incompatibles")
        if record["title"].isupper() and not title.isupper():
            record["title"] = title
        person = row.get("person", "").strip()
        if "Miglior film" in category or category.casefold().startswith("david giovani"):
            person = ""
        label = category + (" · " + person if person else "")
        if label not in record["nominations"]:
            record["nominations"].append(label)
        if row["winner"] and label not in record["wins"]:
            record["wins"].append(label)
            total_awards += 1
        if category.casefold() in ("migliore regia", "miglior regia") and person and not record["director"]:
            record["director"] = person
        if not record["director"] and "regia di:" in row["entryText"]:
            match = re.search(r"regia di:\s*(.*?)(?:\s+Prodotto da:|$)", row["entryText"], re.I)
            if match:
                record["director"] = match.group(1).strip()
    if not films:
        raise ValueError(f"David {year}: ninguna película")
    seen = set()
    for film in films.values():
        identity = (film["title"], film["director"])
        if identity in seen:
            raise ValueError(f"David {year}: título y director duplicados: {identity}")
        seen.add(identity)
        if film["wins"]:
            film["award"] = film["wins"][0]
        without_director += not bool(film["director"])
    key = ["David di Donatello", year, "Categorías generales y cortometrajes premiados"]
    annual_path = DATA / f"years/{year}.json"
    annual = json.loads(annual_path.read_text())
    if any(e["festival"] == "David di Donatello" for e in annual["editions"]):
        raise ValueError(f"David {year} ya existe")
    annual["editions"].append({
        "festival": "David di Donatello", "year": year, "section": key[2],
        "sourceUrl": "https://www.daviddidonatello.it/motore-di-ricerca/motore-di-ricerca.php",
        "coverage": "ganadores y candidatos" if source["nominees"] else "solo ganadores; fuente sin lista de candidatos",
        "films": list(films.values()),
    })
    annual_path.write_text(json.dumps(annual, ensure_ascii=False, indent=2) + "\n")
    new_keys.append(key)
    total_films += len(films)
    if not source["nominees"]:
        without_nominees.append(year)

index["editionOrder"].extend(new_keys)
index["metadata"]["version"] += 1
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
print(f"David: {len(new_keys)} ediciones, {total_films} películas, {total_awards} premios, {without_director} direcciones sin resolver")
print("Años con solo ganadores:", without_nominees)
