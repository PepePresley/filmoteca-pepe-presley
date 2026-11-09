"""Declara propiedad solo para cruces exactos título/director/año con el catálogo."""

import json
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
editions = json.loads((DATA / "festivals/festivals.json").read_text())["editions"]
matches = json.loads((DATA / "catalog/festival-matches.json").read_text())["matches"]
families = {"César", "Ariel", "Globos de Oro", "David di Donatello"}


def norm(text):
    return " ".join(unicodedata.normalize("NFC", text or "").casefold().split())


by_year = defaultdict(dict)
counts = Counter()
for edition in editions:
    family, year, section = edition["festival"], edition["year"], edition["section"]
    if family not in families or year > 2015:
        continue
    owned = []
    for film in edition["films"]:
        counts[(family, "films")] += 1
        director = film.get("director", "")
        if not director:
            counts[(family, "director_pending")] += 1
        key = json.dumps([family, year, film["title"], director], ensure_ascii=False, separators=(",", ":"))
        match = matches.get(key)
        if (match and director and norm(film["title"]) == norm(match["t"])
                and norm(director) == norm(match["d"]) and abs(year - match["y"]) <= 2):
            owned.append(film["title"])
            counts[(family, "exact_owned")] += 1
    by_year[year][family + "|" + section] = owned

for year, sections in by_year.items():
    path = DATA / f"catalog/festival-owned-{year}.json"
    current = json.loads(path.read_text()) if path.exists() else {}
    for section, titles in sections.items():
        if section in current:
            raise ValueError(f"Propiedad ya declarada: {year} {section}")
        current[section] = titles
    path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")

print({family: {label: counts[(family, label)] for label in ("films", "exact_owned", "director_pending")}
       for family in sorted(families)})
