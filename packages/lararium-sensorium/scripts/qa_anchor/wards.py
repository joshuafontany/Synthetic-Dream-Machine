#!/usr/bin/env python3
"""wards — the circularity wards that keep the gold-anchor honest.

Two instruments, both guarding against "the thinker thinks, then the prover
proves" — a judge that scores a construct high merely because it was told the
construct matters.

NULL-CONSTRUCT DECOY (the nameless-entity sink)
===============================================
A plausible-sounding but REFERENT-LESS construct ("flux-resonance" — no
definition, no markers, no operationalization). Artifacts labeled with it SHOULD
score near the floor (alpha approx 0, sensitivity d' approx 0). If a real
construct and the null construct score alike, the rig is measuring the act of
labeling, not the construct — and the read is void. The decoy is the pre-
registered floor: name the predicted near-zero BEFORE scoring (see sealed/prereg).

ABLATION (the ritual-stripped twin)
===================================
Produce a content-equal twin of a real artifact with the sigil/ward/oracle/HUD
ritual grammar removed (QA-rig ablation-rig.md, grading line 1: "de-glyph before
the judge reads"). Pairing original vs stripped lets a downstream test ask: does
the score read the PROSE, or the ritual ornament? A judge that scores the twins
alike has dissociated content from ornament — the ablation-dissociation control.

Pure stdlib. No LLM, no palace, no judge — these are the structural wards the
scoring stage rides on.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# the null-construct decoy
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Construct:
    """A rateable construct. A REAL construct carries a referent + operational
    markers; a NULL construct carries a name and nothing the name points at."""

    name: str
    definition: str
    referent: str | None  # what the construct points at in the world; None == nameless sink
    markers: tuple[str, ...] = ()  # operational cues a grader could key on

    def is_null(self) -> bool:
        """A construct is NULL iff nothing grounds it: no referent AND no operational
        markers. A name alone — however plausible — does not ground a construct."""
        return self.referent is None and len(self.markers) == 0


# The decoy. Plausible register, zero referent — the operator's nameless-entity sink.
NULL_CONSTRUCT = Construct(
    name="flux-resonance",
    definition=(
        "the degree to which a passage achieves flux-resonance — the resonant flux "
        "by which the text attains its flux-resonance"  # deliberately circular, no referent
    ),
    referent=None,
    markers=(),
)

# A real construct, for contrast in the decoy/ablation tests (the Syad poet facet).
REAL_CONSTRUCT_EXAMPLE = Construct(
    name="poet-resonance",
    definition="analogical resonance — does an image or analogy land and carry meaning across",
    referent="the reader's felt sense that an analogy connects two domains",
    markers=("simile", "metaphor", "analogy", "image", "resonance with the source domain"),
)


def is_null_construct(c: Construct) -> bool:
    """Module-level alias mirroring Construct.is_null (read-site convenience)."""
    return c.is_null()


@dataclass(frozen=True)
class DecoyItem:
    """One artifact tagged with the null construct — predicted to score at floor."""

    item_id: str
    text: str
    construct: str  # the construct name the judge is told to rate against
    is_decoy: bool


def decoy_set(texts: list[str], *, construct: Construct = NULL_CONSTRUCT,
              prefix: str = "decoy") -> list[DecoyItem]:
    """Label real passages with the NULL construct. These ride the panel alongside
    real items; the pre-registered prediction is that their alpha/d' sits at floor.
    The texts are real prose (so length/fluency cannot separate them) — only the
    construct label is bogus."""
    return [
        DecoyItem(item_id=f"{prefix}-{i:03d}", text=t, construct=construct.name, is_decoy=True)
        for i, t in enumerate(texts)
    ]


# Pre-registered floor for the null construct: reliability indistinguishable from
# chance. Stored as a band, not a point — the gate reads the bootstrap LOWER bound.
NULL_CONSTRUCT_PREDICTED_ALPHA_CEILING = 0.20  # a real construct must beat THIS, not just 0


# ---------------------------------------------------------------------------
# the ablation harness — ritual-stripped twins
# ---------------------------------------------------------------------------

# Ritual grammar the ablation removes (the "ornament" under test). Order matters:
# spans first, then whole ritual lines, so a stripped line's residue cannot survive.
_SIGIL_SPAN_RE = re.compile(r"<<~.*?>>", re.DOTALL)  # any sharktooth sigil span
_RITUAL_LINE_RE = re.compile(
    r"^\s*(?:<<~|lares\s+(?:aim|yield)|hud\b|ward\b|oracle\b|->\s*[✶⛅◇▶↺✱]).*$",
    re.IGNORECASE | re.MULTILINE,
)
# Inline OODA-HA phase markers (->observe/->orient/... and their glyphs) and the
# bare oracle drain glyphs, scrubbed inline so prose around them survives clean.
_PHASE_MARKER_RE = re.compile(r"->\s*(?:✶|⛅|◇|▶|↺)")
_ORACLE_GLYPH_RE = re.compile(r"[↯S]+\d*\s*✲")  # the ↯S ✲ drain head


@dataclass(frozen=True)
class AblationPair:
    """A real artifact and its ritual-stripped twin — content held, ornament removed."""

    item_id: str
    original: str
    stripped: str
    removed_tokens: tuple[str, ...] = field(default_factory=tuple)


def ritual_tokens(text: str) -> list[str]:
    """The ritual spans/lines an ablation would remove from `text` (for inspection
    and for the test that asserts the stripper targets the right tokens)."""
    found = []
    found += _SIGIL_SPAN_RE.findall(text)
    found += [m.group(0).strip() for m in _RITUAL_LINE_RE.finditer(text)]
    found += _PHASE_MARKER_RE.findall(text)
    return found


def ablate(text: str) -> str:
    """Strip the sigil/ward/oracle/HUD/lares ritual grammar, leaving the propositional
    prose. Collapses the whitespace the removed spans leave behind so the twin reads
    as clean prose — the de-glyphed surface a blind judge would see."""
    t = _SIGIL_SPAN_RE.sub(" ", text)
    t = _RITUAL_LINE_RE.sub("", t)
    t = _ORACLE_GLYPH_RE.sub(" ", t)
    t = _PHASE_MARKER_RE.sub(" ", t)
    # collapse blank-line runs and trailing spaces left by the removals
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", t)
    return t.strip()


def ablation_pair(item_id: str, text: str) -> AblationPair:
    """Build the (original, ritual-stripped) twin for one artifact."""
    return AblationPair(
        item_id=item_id,
        original=text,
        stripped=ablate(text),
        removed_tokens=tuple(ritual_tokens(text)),
    )
