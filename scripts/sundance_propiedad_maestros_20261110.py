"""Confirma propiedad Sundance contra los Excel maestros aprobados, sin editarlos."""

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]


def norm(value):
    text = unicodedata.normalize("NFKD", str(value or "").casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(text.translate(str.maketrans({"’": "'", "‘": "'", "–": "-", "—": "-"})).split())


def master_index(folder):
    index = defaultdict(set)
    evidence = defaultdict(list)
    for year in range(1983, 2018):
        path = folder / f"Catalogo_Telegram_{year}.xlsx"
        if not path.exists():
            raise FileNotFoundError(path)
        book = load_workbook(path, read_only=True, data_only=True)
        sheet = book["Catálogo"]
        headers = next(sheet.values)
        fields = {str(label).strip(): position for position, label in enumerate(headers) if label}
        required = ("Título original", "Título (ES)", "Año", "Director")
        if any(field not in fields for field in required):
            raise ValueError(f"Columnas incompletas en {path.name}")
        for row_number, row in enumerate(sheet.values, 1):
            if row_number == 1:
                continue
            film_year = row[fields["Año"]]
            director = str(row[fields["Director"]] or "").strip()
            if not isinstance(film_year, (int, float)) or not director:
                continue
            identity = (int(film_year), norm(director))
            for field in ("Título original", "Título (ES)"):
                title = norm(row[fields[field]])
                if title:
                    index[(title, norm(director))].add(identity)
                    evidence[(title, norm(director), identity)].append((path.name, row_number))
        book.close()
    return index, evidence


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--masters-dir", type=Path, required=True)
    args = parser.parse_args()
    lookup, evidence = master_index(args.masters_dir)
    counts = defaultdict(int)
    verified = []
    ambiguous = []
    for year in range(1985, 2016):
        annual = json.loads((ROOT / f"data/festivals/years/{year}.json").read_text())
        path = ROOT / f"data/catalog/festival-owned-{year}.json"
        ownership = json.loads(path.read_text()) if path.exists() else {}
        for edition in annual["editions"]:
            if edition["festival"] != "Sundance":
                continue
            key = f"Sundance|{edition['section']}"
            owned = []
            for film in edition["films"]:
                if not film["director"]:
                    continue
                token = (norm(film["title"]), norm(film["director"]))
                candidates = [identity for identity in lookup.get(token, set())
                              if abs(identity[0] - year) <= 2]
                if len(candidates) == 1:
                    owned.append(film["title"])
                    verified.append((year, edition["section"], film["title"],
                                     evidence[(token[0], token[1], candidates[0])]))
                    counts["confirmed"] += 1
                elif len(candidates) > 1:
                    ambiguous.append((year, edition["section"], film["title"], candidates))
                    counts["ambiguous"] += 1
            ownership[key] = owned
            counts["sections"] += 1
        path.write_text(json.dumps(ownership, ensure_ascii=False, indent=2) + "\n")
    report = ROOT / "outputs/sundance_historico/propiedad_maestros.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps({"counts": counts, "verified": verified,
                                  "ambiguous": ambiguous}, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(dict(counts), ensure_ascii=False))


if __name__ == "__main__":
    main()
