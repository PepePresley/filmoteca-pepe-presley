"""Incorpora premios y candidaturas de cine de Globos 1944–2015."""

import json
from collections import OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/festivals"
archive = json.loads((DATA / "sources/globos_historico_oficial_1944_2015_2026_11_10.json").read_text())
index_path = DATA / "years/index.json"
index = json.loads(index_path.read_text())

new_keys = []
total_films = 0
total_awards = 0
without_director = 0
conflicts = []
for year in range(1944, 2016):
    films = OrderedDict()
    for row in archive["years"][str(year)]:
        url, title = row["filmUrl"], row["film"].strip()
        category = row["category"].strip()
        people = [p.strip() for p in row["people"] if p.strip()]
        if not url or not title or not category:
            raise ValueError(f"Globos {year}: fila incompleta")
        record = films.setdefault(url, {
            "title": title, "director": "", "award": "Nominada",
            "nominations": [], "wins": [], "aliases": [], "sourceUrl": url,
        })
        if record["title"] != title:
            conflicts.append({"year": year, "url": url, "title": title, "previous": record["title"]})
            continue
        label = category + (" · " + " · ".join(people) if people else "")
        if label not in record["nominations"]:
            record["nominations"].append(label)
        if row["winner"] and label not in record["wins"]:
            record["wins"].append(label)
            total_awards += 1
        if "Director" in category and people and not record["director"]:
            record["director"] = " · ".join(people)
    if not films:
        raise ValueError(f"Globos {year}: ninguna película")
    seen = set()
    for film in films.values():
        identity = (film["title"], film["director"])
        if identity in seen:
            raise ValueError(f"Globos {year}: título y director duplicados: {identity}")
        seen.add(identity)
        if film["wins"]:
            film["award"] = film["wins"][0]
        without_director += not bool(film["director"])
    key = ["Globos de Oro", year, "Categorías cinematográficas"]
    annual_path = DATA / f"years/{year}.json"
    annual = json.loads(annual_path.read_text())
    if any(e["festival"] == "Globos de Oro" for e in annual["editions"]):
        raise ValueError(f"Globos {year} ya existe")
    annual["editions"].append({
        "festival": "Globos de Oro", "year": year, "section": key[2],
        "sourceUrl": f"https://goldenglobes.com/nominations/{year}",
        "films": list(films.values()),
    })
    annual_path.write_text(json.dumps(annual, ensure_ascii=False, indent=2) + "\n")
    new_keys.append(key)
    total_films += len(films)

index["editionOrder"].extend(new_keys)
index["metadata"]["version"] += 1
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
print(f"Globos: {len(new_keys)} ediciones, {total_films} películas, {total_awards} premios, {without_director} direcciones sin resolver")
print("Conflictos de título:", conflicts)
