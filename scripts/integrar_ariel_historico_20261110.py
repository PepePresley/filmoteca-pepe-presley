"""Incorpora candidaturas generales y cortos premiados del histórico Ariel."""

import json
from collections import OrderedDict, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/festivals"
archive = json.loads((DATA / "sources/ariel_historico_oficial_completo_2026_11_10.json").read_text())
index_path = DATA / "years/index.json"
index = json.loads(index_path.read_text())
by_year = defaultdict(list)
for row in archive["records"]:
    try:
        year = int(row["Año"])
    except (ValueError, TypeError):
        continue
    if year <= 2015:
        by_year[year].append(row)

new_keys = []
total_films = 0
total_awards = 0
without_director = 0
skipped = []
for year in sorted(by_year):
    if year < 1946:
        continue
    films = OrderedDict()
    for row in by_year[year]:
        winner = row["Ganador"].strip().upper() == "SI"
        nominated = row["Nominado"].strip().upper() == "SI"
        if not (winner or nominated):
            continue
        title = " ".join(row["Película"].split())
        category = " ".join(row["Categorías"].split())
        name = " ".join(row["Nombre"].split())
        if not title or not category:
            skipped.append({"year": year, "category": category, "title": title, "reason": "sin película o categoría"})
            continue
        if any(word in category.casefold() for word in ("ariel de oro", "premio especial", "trayectoria", "homenaje")):
            continue
        if "cortometraje" in category.casefold() and not winner:
            continue
        record = films.setdefault(title, {
            "title": title, "director": "", "award": "Nominada",
            "nominations": [], "wins": [], "aliases": [],
        })
        award = category + (" · " + name if name and category.casefold() not in ("película", "película iberoamericana") else "")
        if award not in record["nominations"]:
            record["nominations"].append(award)
        if winner and award not in record["wins"]:
            record["wins"].append(award)
            total_awards += 1
        if category.casefold() in ("dirección", "mejor dirección") and name:
            if record["director"] and name not in record["director"].split(" · "):
                record["director"] += " · " + name
            elif not record["director"]:
                record["director"] = name
    if not films:
        skipped.append({"year": year, "reason": "sin largometrajes premiados"})
        continue
    for film in films.values():
        if film["wins"]:
            film["award"] = film["wins"][0]
    key = ["Ariel", year, "Categorías generales y cortometrajes premiados"]
    annual_path = DATA / f"years/{year}.json"
    annual = json.loads(annual_path.read_text())
    if any(e["festival"] == "Ariel" for e in annual["editions"]):
        raise ValueError(f"Ariel {year} ya existe")
    annual["editions"].append({
        "festival": "Ariel", "year": year, "section": key[2],
        "sourceUrl": "https://www.amacc.org.mx/historico-ariel",
        "films": list(films.values()),
    })
    annual_path.write_text(json.dumps(annual, ensure_ascii=False, indent=2) + "\n")
    new_keys.append(key)
    total_films += len(films)
    without_director += sum(not f["director"] for f in films.values())

index["editionOrder"].extend(new_keys)
index["metadata"]["version"] += 1
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
print(f"Ariel: {len(new_keys)} ediciones, {total_films} películas, {total_awards} premios, {without_director} direcciones sin resolver")
print("Filas pendientes:", skipped[:15], "total", len(skipped))
