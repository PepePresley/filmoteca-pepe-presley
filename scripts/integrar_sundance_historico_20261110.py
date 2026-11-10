"""Incorpora selecciones generales y cortometrajes premiados de Sundance 1985–2015."""

import json
import re
from collections import OrderedDict, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/festivals"
EVENTS = json.loads((DATA / "sources/sundance_archivo_oficial_1985_2015_2026_11_10.json").read_text())
DETAILS = {
    row["url"]: row
    for row in json.loads((DATA / "sources/sundance_fichas_oficiales_1985_2015_2026_11_10.json").read_text())
}
INDEX_PATH = DATA / "years/index.json"

GENERAL = {
    "Dramatic Competition", "Documentary Competition", "World Cinema",
    "Premieres", "Premiere", "American Spectrum",
    "World Cinema Dramatic Competition", "Park City at Midnight",
    "World Cinema Documentary Competition", "Special Screenings",
    "U.S. Documentary Competition", "U.S. Dramatic Competition", "Spectrum",
    "Spotlight", "World Documentary", "NEXT", "Midnight", "Doc Premieres",
    "Frontier", "New Frontier Films", "Native Forum", "Special Events",
    "International Showcase", "Documentary", "American Showcase",
    "Documentary Non Competition", "Dramatic Non Competition", "New Frontier",
    "World Premiere", "U.S. Premiere", "Regional Premiere", "Opening Night",
    "Opening Night in Park City", "Opening Night in Salt Lake City",
    "Shorts with Features", "Indigenous Showcase",
}
GENERAL_PREFIXES = (
    "Premiere -", "Premieres -", "Opening Night", "World Cinema -",
    "Documentary Competition -",
)

# El propio archivo devuelve U+FFFD en ciertas fichas. Solo se reparan
# grafías inequívocas; los demás títulos permanecen pendientes.
TITLE_REPAIRS = {
    "Who the Hell Is Juliette? (�Quien diablos es Juliette?)": "Who the Hell Is Juliette?",
    "Coffin Joe - The Strange World Of Jos� Mojica Marins": "Coffin Joe - The Strange World of José Mojica Marins",
    "Shake Hands with the Devil: The Journey of Rom�o Dallaire": "Shake Hands with the Devil: The Journey of Roméo Dallaire",
    "Quincea�era": "Quinceañera",
    "Joan Rivers�A Piece Of Work": "Joan Rivers: A Piece of Work",
    "Brick Novax�Part 1": "Brick Novax: Part 1",
    "Brick Novax�Part 2": "Brick Novax: Part 2",
    "The Black Power Mixtape 1967�1975": "The Black Power Mixtape 1967–1975",
    "Pussy Riot�A Punk Prayer": "Pussy Riot: A Punk Prayer",
    "3� MINUTES": "3½ MINUTES",
    "Elvis �56": "Elvis '56",
    "Tie-Died: Rock�n�Roll�s Most Deadicated Fans": "Tie-Died: Rock 'n' Roll's Most Deadicated Fans",
    "Don�t Die without Telling Me Where You�re Going (No te mueras sin decirme donde vas)": "Don't Die without Telling Me Where You're Going (No te mueras sin decirme donde vas)",
    "Nobody Will Speak of Us When We�re Dead": "Nobody Will Speak of Us When We're Dead",
    "A True Story (Yek Dastan-e Vaghe�i)": "A True Story (Yek Dastan-e Vaghe'i)",
    "Six O�Clock News": "Six O'Clock News",
    "Life According to Muriel (La vida seg�n Muriel)": "Life According to Muriel (La vida según Muriel)",
    "Spudwrench�Kahnawake Man": "Spudwrench: Kahnawake Man",
    "We All Fall Down (Tuti gi� per terra)": "We All Fall Down (Tuti giù per terra)",
    "Little Thieves, Big Thieves (Cien a�os de perdon)": "Little Thieves, Big Thieves (Cien años de perdón)",
    "Hidden River (R�o Escondido)": "Hidden River (Río Escondido)",
    "Mundo Gr�a (Crane World)": "Mundo Grúa (Crane World)",
    "Karmen Ge�": "Karmen Geï",
    "Y Tu Mam� Tambi�n": "Y Tu Mamá También",
    "The Passion of Mar�a Elena": "The Passion of María Elena",
    "Chisholm '72�Unbought & Unbossed": "Chisholm '72: Unbought & Unbossed",
    "S�lo Dios Sabe": "Sólo Dios Sabe",
    "The Short Life of Jos� Antonio Gutierrez": "The Short Life of José Antonio Gutierrez",
    "CSNY D�j� Vu": "CSNY Déjà Vu",
    "M�ncora": "Máncora",
    "� REVOLUTION": "½ REVOLUTION",
    "99%�The Occupy Wall Street Collaborative Film": "99% – The Occupy Wall Street Collaborative Film",
    "SEPIDEH�Reaching for the Stars": "SEPIDEH: Reaching for the Stars",
}
DETAIL_OVERRIDES = {
    # Sundance's 2012 awards announcement names the directors; its archive
    # detail page for this film lacks the screening fields.
    "https://history.sundance.org/films/6685/detropia": {
        "director": "Heidi Ewing, Rachel Grady",
        "section": "U.S. Documentary Competition",
        "type": "Documentary Feature",
    },
    # The 2014 feature awards announcement identifies Craig Johnson and the
    # U.S. Dramatic prize; the archive detail page omits its section.
    "https://history.sundance.org/films/6032/the_skeleton_twins": {
        "director": "Craig Johnson",
        "section": "U.S. Dramatic Competition",
    },
}


def is_feature(kind):
    return "feature" in kind.casefold() or kind in {"Narrative", "Documentary"}


def is_short(kind):
    return "short" in kind.casefold()


def is_general(section):
    return section in GENERAL or section.startswith(GENERAL_PREFIXES)


def clean_title(project_title, detail_title):
    # The archive itself contains U+FFFD in some older titles. Do not publish a
    # replacement character or guess which original letter it represents.
    if project_title in TITLE_REPAIRS:
        return TITLE_REPAIRS[project_title]
    for title in (project_title, detail_title):
        if not title:
            continue
        if "\ufffd" not in title:
            return title
        repaired = re.sub(r"(?<=\w)\ufffd(?=(?:s|t|ve|m|ll|d)\b)", "'", title, flags=re.I)
        if "\ufffd" not in repaired:
            return repaired
    return ""


index = json.loads(INDEX_PATH.read_text())
new_keys = []
pending = defaultdict(list)
counts = defaultdict(int)
for event in EVENTS:
    year = event["year"]
    if not 1985 <= year <= 2015 or event["title"] != f"{year} Sundance Film Festival":
        raise ValueError(f"Página de edición inesperada: {event['url']}")
    annual_path = DATA / f"years/{year}.json"
    annual = json.loads(annual_path.read_text())
    if any(edition["festival"] == "Sundance" for edition in annual["editions"]):
        raise ValueError(f"Sundance {year} ya existe")

    awards = defaultdict(list)
    for row in event["awards"]:
        if row["award"]:
            if row["award"] not in awards[row["url"]]:
                awards[row["url"]].append(row["award"])
        else:
            pending["award_without_label"].append([year, row["title"], row["url"]])

    sections = OrderedDict()
    seen_urls = set()
    for project in event["projects"]:
        url = project["url"]
        if url in seen_urls:
            counts["source_duplicate_rows"] += 1
            continue
        seen_urls.add(url)
        detail = {**DETAILS[url], **DETAIL_OVERRIDES.get(url, {})}
        section, kind, wins = detail["section"], detail["type"], awards[url]
        if is_short(kind):
            if not wins:
                continue
            section = "Short Film Program · premiados"
        elif is_feature(kind):
            if not is_general(section) and not wins:
                continue
            if not section:
                section = "Premios oficiales · sección sin identificar"
        elif not kind and wins and not any("short" in prize.casefold() for prize in wins):
            section = "Premios oficiales · formato sin identificar"
            pending["format_missing_awarded"].append([year, project["title"], url])
        else:
            continue

        title = clean_title(project["title"], detail["title"])
        if not title:
            pending["title_damaged"].append([year, project["title"], url])
            continue
        director = detail["director"]
        if "\ufffd" in director:
            pending["director_damaged"].append([year, title, director, url])
            director = ""
        if not director:
            counts["director_pending"] += 1
        if not detail["section"]:
            pending["section_missing"].append([year, title, url])
        if section not in sections:
            sections[section] = OrderedDict()
        identity = (title, director)
        if identity in sections[section] and sections[section][identity]["sourceUrl"] != url:
            pending["identity_collision"].append([year, section, title, director, url])
            continue
        sections[section][identity] = {
            "title": title, "director": director,
            "award": " · ".join(wins) if wins else (
                "En competición" if "Competition" in section else "Selección oficial"
            ),
            "nominations": [], "wins": wins, "aliases": [], "sourceUrl": url,
        }
        counts["included"] += 1
        if wins:
            counts["awarded_films"] += 1
            counts["awards"] += len(wins)
        if is_short(kind):
            counts["short_winners"] += 1

    if not sections:
        raise ValueError(f"Sin selecciones para Sundance {year}")
    for section, films in sections.items():
        edition = {
            "festival": "Sundance", "year": year, "section": section,
            "sourceUrl": event["url"],
            "films": list(films.values()),
        }
        annual["editions"].append(edition)
        new_keys.append(["Sundance", year, section])
    annual_path.write_text(json.dumps(annual, ensure_ascii=False, indent=2) + "\n")

index["editionOrder"].extend(new_keys)
index["metadata"]["version"] += 1
INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
report = {"sections": len(new_keys), "counts": dict(counts), "pending": dict(pending)}
path = ROOT / "outputs/sundance_historico/integracion.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"sections": len(new_keys), "counts": dict(counts),
                  "pending": {key: len(value) for key, value in pending.items()}},
                 ensure_ascii=False))
