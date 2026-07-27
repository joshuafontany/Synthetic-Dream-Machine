"""kumulipo_sections — the wa-sectioner + Kalakaua extractor over the Kumulipo triple.

The Kumulipo corpus carries THREE renderings of one chant: Liliuokalani's 1897 English
translation (its own meme file), Beckwith's 1951 translation-with-commentary, and the
Kalakaua 1889 Hawaiian text riding INSIDE the Beckwith file's Appendix I. This module
splits each rendering into its wa (era/section) units by that rendering's OWN native
markers — never one imposed grid — so a sectioned capture lands one record per wa per
rendering:

  · liliuokalani — the `## … Era` headings (16: First..Sixteenth; the thirteenth stands
    as "A Branch of the Twelfth Era" in the queen's own numbering);
  · beckwith     — the `CHANT ONE`..`CHANT SIXTEEN` marker lines inside the commentary
    chapters (17 occurrences: no CHANT TWELVE translation appears — Beckwith summarizes
    that genealogy in prose — and chants THIRTEEN and FIFTEEN each arrive in two PARTs);
  · kalakaua     — the `KA WA …` headings of Appendix I (16), pulled out of the Beckwith
    carrier as its own logical source (`kumulipo/kalakaua-appendix`).

Each rendering also lands a `preamble` record (the matter before its first wa marker) and,
where trailing matter stands, a `postscript` record — so the wa units stay pure chant while
front/back matter keeps its own address.

THE DUAL-RUN ABLATION this feeds: the SAME marker boundaries cut BOTH the wrapped meme
(the memetic-wikitext file as it stands, envelope sigils riding the preamble/postscript)
and the extracted bare text (the `#source-text` ahu interior only), so the wrapped and
extracted beds hold aligned units — a unit keeps ONE cid across both beds, and the delta
between their sweeps reads the memetic red channel and nothing else.

Meme: lar:///ha.ka.ba/lararium/sensorium/kumulipo-sections
"""
from __future__ import annotations

import os
import re

# ── the #source-text carrier (the extraction shore) ──────────────────────────────────────
# The house wraps a witness meme's bare text in ONE `<<~ ahu #source-text >> … <<~/ahu >>`
# block; envelope matter (doctype, iam TOML, #meme-header, #provenance, #edges) rides
# outside it. Extraction takes the block's interior — the cleanest mechanical shore the
# wrapping reserves for the source text.

_SOURCE_TEXT_OPEN_RE = re.compile(r"^\s*<<~\s*ahu\s+#source-text\b")
_AHU_OPEN_RE = re.compile(r"^\s*<<~\s*ahu\b")
_AHU_CLOSE_RE = re.compile(r"^\s*<<~/ahu\b")


def source_text_span(lines: list) -> "tuple | None":
    """Locate the `#source-text` ahu interior as a half-open line span (start, stop) —
    the first line INSIDE the block to the line OF its balanced `<<~/ahu >>` closer.
    Nested ahu blocks balance; an absent or unclosed block returns None."""
    for i, line in enumerate(lines):
        if not _SOURCE_TEXT_OPEN_RE.match(line):
            continue
        depth = 1
        for j in range(i + 1, len(lines)):
            if _AHU_OPEN_RE.match(lines[j]):
                depth += 1
            elif _AHU_CLOSE_RE.match(lines[j]):
                depth -= 1
                if depth == 0:
                    return (i + 1, j)
        return None
    return None


def extract_source_text(text: str) -> str:
    """Pull the bare source text out of a wrapped meme: the `#source-text` ahu interior
    when one stands, else the whole text unchanged (a bare file carries no wrapping to
    shed). A leading slot-level `toml iam` fence inside the block (the interior's
    dialect declaration — e.g. `type = "text/markdown"`) reads as envelope and sheds;
    the extraction hands back SOURCE alone. The general extraction rule the sectioned
    corpus cap falls back on."""
    lines = text.split("\n")
    span = source_text_span(lines)
    if span is None:
        return text
    start, stop = span
    while start < stop and not lines[start].strip():
        start += 1
    if start < stop and lines[start].startswith("```toml iam"):
        for j in range(start + 1, stop):
            if lines[j].startswith("```"):
                start = j + 1
                break
    return "\n".join(lines[start:stop])


# ── the native wa markers, one grammar per rendering ────────────────────────────────────

# Liliuokalani: `## The First Era` · `## Second Era` · `## A Branch of the Twelfth Era` …
_LILI_ERA_RE = re.compile(r"^##\s+(?:(?:The\s+)?[A-Za-z]+\s+Era|A Branch of the Twelfth Era)\s*$")
# … and the trailing genealogy heading opens her postscript.
_LILI_POST_RE = re.compile(r"^##\s+Kalakaua and Liliuokalani")

# Beckwith translation: bare `CHANT <ORDINAL>` lines (a trailing parenthetical — the
# Textual Notes' `CHANT TWO (CHANT THREE IN MS)` style — never matches).
_CHANT_RE = re.compile(
    r"^CHANT (?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE"
    r"|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN)\s*$")
# The appendix shores inside the Beckwith carrier.
_KALAKAUA_HEAD_RE = re.compile(r"^##\s+The Kalakaua Text\b")
_NOTES_HEAD_RE = re.compile(r"^##\s+Textual Notes\b")

# Kalakaua appendix: `KA WA AKAHI` … `KA WA UMIKUMAMAONO` (the branch note
# `(HE LALA NO KA WA UMIKUMAMALUA)` wears parens and stays inside its wa).
_KAWA_RE = re.compile(r"^KA WA [A-Z]+\s*$")


def _slug(line: str) -> str:
    """A marker line as a stable lowercase-hyphen label (`CHANT ONE` -> `chant-one`)."""
    s = re.sub(r"[^a-z0-9]+", "-", line.strip().lower()).strip("-")
    return s or "section"


def _find(lines: list, pattern, start: int, stop: int) -> int:
    """The first line index in [start, stop) the pattern matches, else -1."""
    for i in range(start, stop):
        if pattern.match(lines[i]):
            return i
    return -1


def _split(lines: list, body: tuple, marker_re, *, post: "tuple | None" = None) -> list:
    """Cut a body span at its marker lines into (label, text) sections: a `preamble`
    ahead of the first marker (when non-blank), one section per marker to the next
    marker (the last running to the body's stop), and a trailing `postscript` span when
    one rides in. Duplicate marker labels take an occurrence ordinal (`-2`, `-3` …) —
    Beckwith's two-PART chants stay distinct units. Blank sections drop."""
    start, stop = body
    marks = [i for i in range(start, stop) if marker_re.match(lines[i])]
    raw: list = []
    if marks and start < marks[0]:
        raw.append(("preamble", start, marks[0]))
    for k, i in enumerate(marks):
        raw.append((_slug(lines[i]), i, marks[k + 1] if k + 1 < len(marks) else stop))
    if post is not None:
        raw.append(("postscript", post[0], post[1]))
    seen: dict = {}
    out: list = []
    for label, a, b in raw:
        text = "\n".join(lines[a:b]).strip("\n")
        if not text.strip():
            continue
        seen[label] = seen.get(label, 0) + 1
        if seen[label] > 1:
            label = f"{label}-{seen[label]}"
        out.append((label, text))
    return out


# ── the per-file sectioners ──────────────────────────────────────────────────────────────


def _require_span(lines: list, basename: str) -> tuple:
    """The `#source-text` span, failing LOUD when the named meme carries none —
    designation carries authority; a silent whole-file fallback would fake the ablation."""
    span = source_text_span(lines)
    if span is None:
        raise ValueError(f"kumulipo_sections: {basename!r} carries no balanced "
                         "<<~ ahu #source-text >> block — the extraction shore stands broken")
    return span


def _section_liliuokalani(text: str, *, extract: bool) -> list:
    """Section the Liliuokalani meme by her era headings. Wrapped mode spans the whole
    file (the meme envelope rides the preamble/postscript); extracted mode spans the
    `#source-text` interior only. The genealogy heading opens the postscript."""
    lines = text.split("\n")
    s0, s1 = _require_span(lines, "kumulipo-liliuokalani.md")
    lo, hi = (s0, s1) if extract else (0, len(lines))
    post_i = _find(lines, _LILI_POST_RE, s0, s1)
    if post_i >= 0:
        return _split(lines, (lo, post_i), _LILI_ERA_RE, post=(post_i, hi))
    return _split(lines, (lo, hi), _LILI_ERA_RE)


def _section_beckwith(text: str, *, extract: bool) -> tuple:
    """Section the Beckwith carrier into ITS TWO renderings: (beckwith-translation
    sections, kalakaua-appendix sections). The translation body runs to the Appendix I
    heading; its postscript picks up at the Textual Notes heading (notes + references,
    plus the envelope tail in wrapped mode). The Kalakaua appendix spans the SAME lines
    in both modes — its interior carries no sigils, a built-in control for the ablation."""
    lines = text.split("\n")
    s0, s1 = _require_span(lines, "kumulipo-beckwith.md")
    kal_i = _find(lines, _KALAKAUA_HEAD_RE, s0, s1)
    notes_i = _find(lines, _NOTES_HEAD_RE, kal_i if kal_i >= 0 else s0, s1)
    if kal_i < 0 or notes_i < 0:
        raise ValueError("kumulipo_sections: the Beckwith carrier lost its appendix shores "
                         "(## The Kalakaua Text / ## Textual Notes) — refusing a blind cut")
    lo, hi = (s0, s1) if extract else (0, len(lines))
    beckwith = _split(lines, (lo, kal_i), _CHANT_RE, post=(notes_i, hi))
    kalakaua = _split(lines, (kal_i, notes_i), _KAWA_RE)
    return beckwith, kalakaua


def section_corpus_file(basename: str, text: str, *, extract: bool) -> "list | None":
    """Route a corpus file to its sectioner. Returns a list of logical sources —
    `{"source": <stable key>, "sections": [(label, text), …]}` — or None for a file no
    rule names (the caller lands it whole). The Beckwith carrier yields TWO sources:
    its own translation and the Kalakaua appendix under its own address."""
    # dispatch by STEM: the carrier extension flipped once already (.md → .mem, the
    # registered carrier rename) and silently landed the chant whole at chunk 0 —
    # a rule keyed to the name, never the suffix, survives the next flip too.
    stem = os.path.splitext(basename)[0]
    if stem == "kumulipo-liliuokalani":
        return [{"source": "kumulipo/liliuokalani",
                 "sections": _section_liliuokalani(text, extract=extract)}]
    if stem == "kumulipo-beckwith":
        beckwith, kalakaua = _section_beckwith(text, extract=extract)
        return [{"source": "kumulipo/beckwith", "sections": beckwith},
                {"source": "kumulipo/kalakaua-appendix", "sections": kalakaua}]
    return None
