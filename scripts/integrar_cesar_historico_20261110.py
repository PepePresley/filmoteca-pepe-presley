"""Incorpora candidaturas generales y cortos premiados de César 1976–2015."""

import json
from collections import OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/festivals"
archive = json.loads((DATA / "sources/cesar_palmares_oficial_completo_2026_11_10.json").read_text())
index_path = DATA / "years/index.json"
index = json.loads(index_path.read_text())


def person_name(person):
    if person.get("useAlias") and person.get("aliasNom"):
        return person["aliasNom"].strip()
    return " ".join(part.strip() for part in (person.get("prenom", ""), person.get("nom", "")) if part)


new_keys = []
total_films = 0
total_awards = 0
without_director = 0
ambiguous = []
for year in range(1976, 2016):
    films = OrderedDict()
    for prize in archive["years"][str(year)]:
        category = prize["nomPrix"].strip()
        if category == "César d'Honneur":
            continue
        for entry in prize.get("palmares", []):
            film = entry.get("film")
            if not film or not entry.get("visible", True):
                continue
            winner = bool(entry.get("recompense"))
            if "Court Métrage" in category and not winner:
                continue
            title = film["titre"].strip()
            film_id = film["id"]
            if not title:
                raise ValueError(f"César {year}: película sin título")
            record = films.setdefault(film_id, {
                "title": title,
                "director": "",
                "award": "Nominada",
                "nominations": [],
                "wins": [],
                "aliases": [],
            })
            if record["title"] != title:
                ambiguous.append({"year": year, "filmId": film_id, "title": title, "category": category})
                continue
            people = []
            if isinstance(entry.get("personne"), dict):
                people.append(person_name(entry["personne"]))
            people.extend(person_name(p) for p in entry.get("personnes", []) if isinstance(p, dict))
            label = category + (" · " + " · ".join(p for p in people if p) if people else "")
            if label not in record["nominations"]:
                record["nominations"].append(label)
            if winner and label not in record["wins"]:
                record["wins"].append(label)
                total_awards += 1
            credits = entry.get("credits") or {}
            directors = credits.get("réalisé par") or credits.get("réalisée par") or []
            director = " · ".join(person_name(person) for person in directors)
            if director and not record["director"]:
                record["director"] = director
            if category == "Meilleur Réalisateur" and people and not record["director"]:
                record["director"] = " · ".join(people)
    if not films:
        raise ValueError(f"César {year}: ningún largometraje premiado")
    seen = set()
    for film in films.values():
        if film["wins"]:
            film["award"] = film["wins"][0]
        identity = (film["title"], film["director"])
        if identity in seen:
            raise ValueError(f"César {year}: título y director duplicados: {identity}")
        seen.add(identity)
        without_director += not bool(film["director"])
    key = ["César", year, "Categorías generales y cortometrajes premiados"]
    annual_path = DATA / f"years/{year}.json"
    annual = json.loads(annual_path.read_text())
    if any(e["festival"] == "César" for e in annual["editions"]):
        raise ValueError(f"César {year} ya existe")
    annual["editions"].append({
        "festival": "César", "year": year, "section": key[2],
        "sourceUrl": f"https://www.academie-cinema.org/palmares/?annee={year}",
        "films": list(films.values()),
    })
    annual_path.write_text(json.dumps(annual, ensure_ascii=False, indent=2) + "\n")
    new_keys.append(key)
    total_films += len(films)

index["editionOrder"].extend(new_keys)
index["metadata"]["version"] += 1
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
print(f"César: {len(new_keys)} ediciones, {total_films} películas, {total_awards} premios, {without_director} direcciones sin resolver")
print("Premios compuestos pendientes:", ambiguous)
