#!/usr/bin/env python3
"""Build the themed vocabulary corpus from the MIT-licensed bilingual source.

The source is intentionally kept outside the repository. Run this script with
the downloaded JSON path to reproduce the generated topic files.
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

try:
    from wordfreq import zipf_frequency
except ImportError as exc:
    raise SystemExit("Install wordfreq before running this script.") from exc


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "vocabulary"
THEMES = {
    "food": "food eat drink meal recipe cook kitchen restaurant ingredient vegetable fruit meat fish bread rice pasta soup sauce dessert taste sweet salty spicy breakfast lunch dinner".split(),
    "home": "home house room bedroom bathroom kitchen furniture door window roof garden garage apartment rent clean wash repair bed chair table sofa lamp".split(),
    "people": "person people family friend child adult man woman baby body face hair eye hand personality kind happy sad angry honest funny age relationship".split(),
    "work": "work job office company business boss employee manager career meeting project salary interview customer client team colleague factory engineer lawyer doctor".split(),
    "travel": "travel trip journey holiday vacation hotel airport flight train bus ticket passport luggage tourist beach mountain map reservation".split(),
    "health": "health body doctor hospital medicine medical illness disease pain symptom treatment blood heart skin bone muscle mental exercise sleep diet injury".split(),
    "shopping": "shop shopping buy sell price cost money clothes clothing shirt dress shoe coat size fashion market store customer cash bag".split(),
    "technology": "technology computer phone mobile internet website email software hardware app screen keyboard mouse data digital online network password camera".split(),
    "nature": "nature weather climate environment earth world animal plant tree flower forest river sea ocean mountain rain snow wind sun energy pollution".split(),
    "education": "school study learn student teacher lesson class course book university exam test homework subject language knowledge education research".split(),
    "money": "money bank pay payment price cost bill tax loan debt credit card cash account budget finance financial insurance investment profit".split(),
    "social": "social friend party music film movie game sport club conversation talk invite visit date wedding weekend event community culture".split(),
}
THEME_NAMES = tuple(THEMES)
WORD_RE = re.compile(r"[A-Za-zÀ-ÿ'-]+")
POS_RE = re.compile(r"\s*\([^)]*\)")


def load_source(path: Path) -> list[dict]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return json.loads(raw) if isinstance(raw, str) else raw


def english_headword(translation: str) -> str:
    value = POS_RE.sub("", translation.split(";")[0]).strip()
    value = value.split(",")[0].strip()
    return value.lower()


def clean_entry(source: dict) -> dict | None:
    translation = (source.get("translation") or "").strip()
    spanish = (source.get("word") or "").strip()
    english = english_headword(translation)
    example = (source.get("example_translation_1") or "").strip()
    if not spanish or not english or not example:
        return None
    if len(english) < 2 or len(english) > 48 or not WORD_RE.fullmatch(english):
        return None
    if english in {"a", "an", "the", "of", "to", "and", "or", "is", "it"}:
        return None
    return {"english": english, "spanish": spanish, "example": example, "source": source}


def score(entry: dict, keywords: list[str]) -> int:
    tokens = set(WORD_RE.findall(entry["english"].lower()))
    return sum(1 for keyword in keywords if keyword in tokens)


def choose(entries: list[dict]) -> dict[str, list[dict]]:
    candidates = [item for source in entries if (item := clean_entry(source))]
    unique: dict[str, dict] = {}
    for item in candidates:
        current = unique.get(item["english"])
        if current is None or zipf_frequency(item["english"], "en") > zipf_frequency(current["english"], "en"):
            unique[item["english"]] = item
    ranked = sorted(unique.values(), key=lambda item: (-zipf_frequency(item["english"], "en"), item["english"]))
    available = set(unique)
    selected: dict[str, list[dict]] = defaultdict(list)

    # First take clear thematic matches. The remaining places are filled with
    # common, useful communication vocabulary rather than invented words.
    for theme, keywords in THEMES.items():
        matches = sorted(
            (item for item in ranked if item["english"] in available and score(item, keywords)),
            key=lambda item: (-score(item, keywords), -zipf_frequency(item["english"], "en"), item["english"]),
        )
        for item in matches[:1000]:
            selected[theme].append(item)
            available.discard(item["english"])

    remaining = [item for item in ranked if item["english"] in available]
    cursor = 0
    for theme in THEME_NAMES:
        while len(selected[theme]) < 1000:
            if cursor >= len(remaining):
                raise SystemExit("The source does not contain 12,000 distinct usable English headwords.")
            selected[theme].append(remaining[cursor])
            cursor += 1
    return selected


def write_theme(theme: str, entries: list[dict]) -> None:
    rows = []
    for index, item in enumerate(entries, start=1):
        source = item["source"]
        row = {
            "id": f"{theme}-corpus-{index:04d}",
            "theme": theme,
            "subtopic": "core communication",
            "word": item["english"],
            "meaning": item["spanish"],
            "type": "word",
            "cefr": "A2" if zipf_frequency(item["english"], "en") >= 4 else "B1",
            "frequency": "high" if zipf_frequency(item["english"], "en") >= 4.5 else "medium",
            "priority": 1 if index <= 300 else 2,
            "example": item["example"],
            "exercises": [{"type": "recall", "prompt": f"Traduce: {item['english']}"}],
        }
        rows.append(row)
    target = OUTPUT / f"{theme}-corpus.js"
    payload = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
    target.write_text(
        "window.BIMBA_VOCABULARY = window.BIMBA_VOCABULARY || [];\n"
        f"window.BIMBA_VOCABULARY.push(...{payload});\n",
        encoding="utf-8",
    )


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/build-vocabulary-corpus.py /path/to/en_es_aidict.json")
    selected = choose(load_source(Path(sys.argv[1])))
    for theme, entries in selected.items():
        write_theme(theme, entries)
    print("Generated:", ", ".join(f"{theme}=1000" for theme in THEME_NAMES))


if __name__ == "__main__":
    main()
