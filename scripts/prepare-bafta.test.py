"""Regression cases for historical cards that can create false awards/ownership."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("prepare_bafta", Path(__file__).with_name("prepare-bafta.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def movie(fid, title):
    return {"href": "https://www.filmaffinity.com/es/award-edition-movie.php?movie-id=" + fid, "title": title}


class HistoricalCards(unittest.TestCase):
    def test_combined_winner_requires_review(self):
        result = module.prepare([{"category": "Guion", "rows": [{"text": "David Leland", "winner": True, "movies": [movie("1", "Si estuvieras aquí"), movie("2", "Servicios muy personales")]}]}], {"include": ["Guion"]}, [])
        self.assertEqual(result["counts"]["awards"], 0)
        self.assertEqual(result["review"][0]["reason"], "multiple-winning-films")

    def test_repeated_links_and_actor_candidates(self):
        rows = [{"text": actor, "winner": actor == "John Cleese", "movies": [movie("1", "Un pez llamado Wanda"), movie("1", "Un pez llamado Wanda"), movie("1", "9 nominaciones")]} for actor in ["John Cleese", "Kevin Kline"]]
        result = module.prepare([{"category": "Actor", "rows": rows}], {"include": ["Actor"]}, [])
        self.assertEqual(result["counts"], {"films": 1, "clearMatches": 0, "unlocated": 1, "candidatures": 2, "awards": 1})

    def test_homonyms_stay_ambiguous(self):
        masters = [{"Título (ES)": "La misión", "Año": 1986, "Director": director, "_file": "maestro.xlsx", "_row": n} for n, director in enumerate(["Roland Joffé", "Cuentos asombrosos"], 2)]
        result = module.prepare([{"category": "Film", "rows": [{"text": "La misión", "winner": False, "movies": [movie("1", "La misión")]}]}], {"include": ["Film"]}, masters)
        self.assertEqual(result["counts"]["clearMatches"], 0)
        self.assertEqual(result["review"][0]["reason"], "ambiguous-master")

    def test_missing_category_blocks_incomplete_export(self):
        with self.assertRaises(ValueError):
            module.prepare([], {"include": ["Film"]}, [])


if __name__ == "__main__":
    unittest.main()
