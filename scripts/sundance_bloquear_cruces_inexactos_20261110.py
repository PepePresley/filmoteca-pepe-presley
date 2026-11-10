"""Bloquea asociaciones Sundance cuya ficha generada contradice el maestro."""

import argparse
import json
from pathlib import Path

from openpyxl import load_workbook

from sundance_propiedad_maestros_20261110 import ROOT, norm


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--masters-dir", type=Path, required=True)
    args = parser.parse_args()
    report = json.loads((ROOT / "outputs/sundance_historico/propiedad_maestros.json").read_text())
    matches = json.loads((ROOT / "data/catalog/festival-matches.json").read_text())["matches"]
    rows = {}
    for _, _, _, evidence in report["verified"]:
        for filename, _ in evidence:
            if filename not in rows:
                book = load_workbook(args.masters_dir / filename, read_only=True, data_only=True)
                rows[filename] = list(book["Catálogo"].values)
                book.close()
    annuals = {year: json.loads((ROOT / f"data/festivals/years/{year}.json").read_text())
               for year in range(1985, 2016)}
    by_film = {
        (year, edition["section"], film["title"]): film
        for year, annual in annuals.items()
        for edition in annual["editions"] if edition["festival"] == "Sundance"
        for film in edition["films"]
    }
    blocked = []
    ownerships = {}
    for year, section, title, evidence in report["verified"]:
        film = by_film[(year, section, title)]
        key = json.dumps(["Sundance", year, title, film["director"]], ensure_ascii=False,
                         separators=(",", ":"))
        match = matches.get(key)
        if match is None:
            continue
        exact = False
        for filename, row_number in evidence:
            row = rows[filename][row_number - 1]
            if (int(row[4] or 0) == match["y"] and norm(row[7]) == norm(match["d"])
                    and norm(match["t"]) in {norm(row[2]), norm(row[3])}):
                exact = True
                break
        if exact:
            continue
        ownership = ownerships.setdefault(year, json.loads(
            (ROOT / f"data/catalog/festival-owned-{year}.json").read_text()))
        ownership[f"Sundance|{section}"].remove(title)
        blocked.append([year, section, title, match, evidence])
    for year, ownership in ownerships.items():
        (ROOT / f"data/catalog/festival-owned-{year}.json").write_text(
            json.dumps(ownership, ensure_ascii=False, indent=2) + "\n")
    output = ROOT / "outputs/sundance_historico/cruces_bloqueados.json"
    output.write_text(json.dumps(blocked, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"blocked": len(blocked), "years": len(ownerships)}))


if __name__ == "__main__":
    main()
