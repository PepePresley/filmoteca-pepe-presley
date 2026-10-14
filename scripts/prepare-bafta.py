"""Prepare a reviewable BAFTA draft from a saved FA DOM export and read-only masters.

No network access and no writes to production data. Categories must be selected
explicitly: historical FA editions mix film and television. Unresolved identities
and multi-film winning cards remain review items, never guessed winners.
"""
import argparse
import json
import re
import unicodedata
from pathlib import Path
import openpyxl


def norm(value):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower())


def variants(value):
    return {norm(value), norm(re.sub(r"\s*\([^)]*\)", "", str(value or "")))} - {""}


def prepare(categories, config, masters):
    films, review = {}, []
    labels = config.get("labels", {})
    available = [category["category"] for category in categories]
    if len(available) != len(set(available)) or not set(config["include"]).issubset(available):
        raise ValueError("Duplicate or missing source categories")
    for category in categories:
        name = category["category"]
        if name not in config["include"]:
            continue
        for row in category["rows"]:
            movies = {}
            for movie in row["movies"]:
                title = movie["title"].strip()
                if not title or title == "No image" or re.match(r"^\d+ (nominaciones|premios)", title):
                    continue
                fid = re.search(r"movie-id=(\d+)", movie["href"])[1]
                movies.setdefault(fid, {**movie, "title": title})
            correction = config.get("rowCorrections", {}).get(name + "|" + row["text"].strip().split("\n")[0])
            if correction:
                movies = {correction["id"]: correction}
            if not movies:
                raise ValueError("Category row without movie: " + name)
            if row["winner"] and len(movies) > 1:
                review.append({"reason": "multiple-winning-films", "category": name, "ids": list(movies)})
            prefix = row["text"].strip().split("\n")[0]
            detail = "" if prefix in {m["title"] for m in row["movies"]} else prefix
            for fid, movie in movies.items():
                film = films.setdefault(fid, {"id": fid, "title": movie["title"], "href": movie["href"], "nominations": [], "wins": []})
                nomination = labels.get(name, name)
                if detail and name not in config.get("filmOnlyCategories", []):
                    nomination += " · " + detail
                film["nominations"].append(nomination)
                if row["winner"] and len(movies) == 1:
                    film["wins"].append(nomination)
    for film in films.values():
        matches = [m for m in masters if any(variants(film["title"]) & variants(m.get(k)) for k in ("Título (ES)", "Título original"))]
        matches = list({(m.get("Título (ES)"), m.get("Año"), m.get("Director")): m for m in matches}.values())
        film["master_matches"] = [{"t": m.get("Título (ES)"), "ot": m.get("Título original"), "y": m.get("Año"), "d": m.get("Director"), "dur": m.get("Duración (min)"), "file": m["_file"], "row": m["_row"]} for m in matches]
        if len(matches) > 1:
            review.append({"reason": "ambiguous-master", "id": film["id"], "title": film["title"]})
    return {"films": list(films.values()), "review": review, "counts": {"films": len(films), "clearMatches": sum(len(f["master_matches"]) == 1 for f in films.values()), "unlocated": sum(not f["master_matches"] for f in films.values()), "candidatures": sum(len(f["nominations"]) for f in films.values()), "awards": sum(len(f["wins"]) for f in films.values())}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--masters", nargs="+", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    masters = []
    for filename in args.masters:
        workbook = openpyxl.load_workbook(filename, read_only=True, data_only=True)
        rows = iter(workbook.worksheets[0].values)
        headers = next(rows)
        for number, values in enumerate(rows, 2):
            master = dict(zip(headers, values))
            if config["minYear"] <= int(master.get("Año") or 0) <= config["maxYear"]:
                masters.append({**master, "_file": Path(filename).name, "_row": number})
        workbook.close()
    result = prepare(json.loads(Path(args.input).read_text()), config, masters)
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"counts": result["counts"], "review": result["review"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
