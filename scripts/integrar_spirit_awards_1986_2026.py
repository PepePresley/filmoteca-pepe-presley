"""Integra las categorías cinematográficas de Film Independent Spirit Awards."""

import json
import re
import unicodedata
from collections import OrderedDict, defaultdict
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SOURCE = DATA / "festivals/sources/spirit_awards_filmaffinity_es_1986_2026_2026_11_10.json"
DETAILS = DATA / "festivals/sources/spirit_awards_fichas_filmaffinity_es_verificadas_2026_11_10.json"
OFFICIAL_URL = "https://www.filmindependent.org/spirit-awards/history/"
FESTIVAL = "Independent Spirit Awards"
EXCLUDED = {
    "spirit_someone_to_watch_award", "spirit_truer_than_fiction_award",
    "spirit_producers_award", "spirit_best_new_scripted_series",
    "spirit_best_actress_series", "spirit_best_actor_series",
    "spirit_best_ensemble_series", "spirit_best_new_documentary_series",
    "spirit_best_lead_performance_tv", "spirit_best_supporting_performance_tv",
    "spirit_best_breaktrhough_performance_tv",
    "spirit_best_lead_performance_new_series",
    "spirit_best_supporting_performance_new_series",
}


def normalize(value):
    value = unicodedata.normalize("NFKD", str(value or "").casefold())
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = value.translate(str.maketrans({"’": "'", "‘": "'", "–": "-", "—": "-"}))
    return " ".join(value.split())


def master_index(folder):
    index = defaultdict(set)
    evidence = defaultdict(list)
    for year in range(1983, 2026):
        filename = f"Catalogo_Telegram_{year}.xlsx"
        path = folder / filename
        if not path.exists():
            raise FileNotFoundError(path)
        book = load_workbook(path, read_only=True, data_only=True)
        sheet = book["Catálogo"]
        headers = next(sheet.values)
        fields = {str(h).strip(): i for i, h in enumerate(headers) if h}
        for row_number, row in enumerate(sheet.values, 1):
            if row_number == 1:
                continue
            year_value = row[fields["Año"]]
            director = str(row[fields["Director"]] or "").strip()
            if not isinstance(year_value, (int, float)) or not director:
                continue
            identity = (int(year_value), director)
            for field in ("Título (ES)", "Título original"):
                token = normalize(row[fields[field]])
                if token:
                    index[token].add(identity)
                    evidence[(token, identity)].append([filename, row_number])
        book.close()
    return index, evidence


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--masters-dir", type=Path, required=True)
    args = parser.parse_args()
    masters, evidence = master_index(args.masters_dir)
    editions = json.loads(SOURCE.read_text())
    details = {item["id"]: item for item in json.loads(DETAILS.read_text())}
    if [e["year"] for e in editions] != list(range(1986, 2027)):
        raise ValueError("La fuente no contiene las 41 ediciones consecutivas")
    index_path = DATA / "festivals/years/index.json"
    index = json.loads(index_path.read_text())
    report = {"years": [], "ambiguous": [], "missing_master": [], "identity_unverified": [],
              "identity_conflict": [], "excluded_categories": []}
    for edition in editions:
        year = edition["year"]
        annual_path = DATA / f"festivals/years/{year}.json"
        annual = json.loads(annual_path.read_text())
        if any(e["festival"] == FESTIVAL for e in annual["editions"]):
            raise ValueError(f"{FESTIVAL} {year} ya existe")
        grouped = OrderedDict()
        categories = []
        for category in edition["categories"]:
            category_id = category["id"]
            if category_id in EXCLUDED or "_tv" in category_id or "series" in category_id:
                report["excluded_categories"].append([year, category["category"]])
                continue
            name = category["category"]
            if category_id == "spirit_special_distinction_award" and year in (1986, 1987):
                name = "Mejor película extranjera"
            if not category["rows"]:
                continue
            categories.append(name)
            for row in category["rows"]:
                match = re.search(r"movie-id=(\d+)", row["href"] or "")
                if not match:
                    raise ValueError(f"Sin ID de película: {year} {name} {row['title']}")
                film_id = match.group(1)
                detail = details.get(film_id)
                if "(TV)" in row["title"] or (detail and re.search(r"\bTV\b", detail.get("heading") or "")):
                    report["excluded_categories"].append([year, name, row["title"]])
                    continue
                item = grouped.setdefault(film_id, {"title": row["title"], "nominations": [], "wins": [],
                                                "sourceUrl": row["href"]})
                if item["title"] != row["title"]:
                    raise ValueError(f"Título incoherente del ID {film_id} en {year}")
                if name not in item["nominations"]:
                    item["nominations"].append(name)
                if row["win"] and name not in item["wins"]:
                    item["wins"].append(name)
        films = []
        owned = []
        for item in grouped.values():
            title = item["title"]
            token = normalize(title)
            candidates = [identity for identity in masters.get(token, set())
                          if abs(identity[0] - (year - 1)) <= 2]
            detail = details.get(re.search(r"movie-id=(\d+)", item["sourceUrl"]).group(1))
            if len(candidates) == 1 and detail and normalize(detail["director"]) == normalize(candidates[0][1]) \
                    and abs(int(detail["year"]) - candidates[0][0]) <= 2:
                identity = candidates[0]
                director = identity[1]
                owned.append(title)
                item["masterEvidence"] = evidence[(token, identity)]
            else:
                director = ""
                if not candidates:
                    report["missing_master"].append([year, title])
                elif len(candidates) > 1:
                    report["ambiguous"].append([year, title, [list(c) for c in candidates]])
                elif not detail:
                    report["identity_unverified"].append([year, title, candidates[0][1]])
                else:
                    report["identity_conflict"].append([year, title, candidates[0][1],
                                                        detail["director"], detail["year"]])
            films.append({
                "title": title, "director": director, "aliases": [],
                "nominations": item["nominations"], "wins": item["wins"],
                "award": ("Ganador · " + str(len(item["wins"])) + " premios" if item["wins"]
                          else "Nominado · " + str(len(item["nominations"])) + " candidaturas"),
                "sourceUrl": item["sourceUrl"],
            })
        if len({(f["title"], f["director"]) for f in films}) != len(films):
            raise ValueError(f"Colisión de identidades en {year}")
        section = f"{year} · cine"
        annual["editions"].append({"festival": FESTIVAL, "year": year, "section": section,
                                   "sourceUrl": OFFICIAL_URL, "films": films})
        annual_path.write_text(json.dumps(annual, ensure_ascii=False, indent=2) + "\n")
        index["editionOrder"].append([FESTIVAL, year, section])
        owned_path = DATA / f"catalog/festival-owned-{year}.json"
        ownership = json.loads(owned_path.read_text()) if owned_path.exists() else {}
        ownership[f"{FESTIVAL}|{section}"] = owned
        owned_path.write_text(json.dumps(ownership, ensure_ascii=False, indent=2) + "\n")
        report["years"].append({"year": year, "categories": len(categories), "films": len(films),
                                "nominations": sum(len(f["nominations"]) for f in films),
                                "wins": sum(len(f["wins"]) for f in films), "owned": len(owned)})
    index["metadata"]["version"] += 1
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
    output = ROOT / "outputs/spirit_awards_oficial/integracion.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"years": len(report["years"]),
                      **{k: sum(y[k] for y in report["years"])
                         for k in ("categories", "films", "nominations", "wins", "owned")},
                      "ambiguous": len(report["ambiguous"]),
                      "missing_master": len(report["missing_master"]),
                      "identity_unverified": len(report["identity_unverified"]),
                      "identity_conflict": len(report["identity_conflict"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
