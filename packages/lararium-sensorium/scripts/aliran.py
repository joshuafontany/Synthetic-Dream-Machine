#!/usr/bin/env python3
"""aliran — DETECT the nameless flows in a stream, BEFORE naming them.

An `aliran` (Indonesian/Malay: a flow, a current — and a school, a lineage) is a nameless entity the
continuous pour DISCOVERS: a real characteristic scale/rhythm the stream's own structure holds,
distinguishable from noise and from an alias of the reading grain. Detection stands on the CONTENT
channel alone (no memetic-wikitext sigils), so the capability travels from the sigil-bearing test beds
(chat · pidgin · liturgical — one grammar-family) to sigil-less target corpuses. Naming rides LATER
(naming-by-condensation); an aliran stays nameless until then, carrying only its capability record — the
same way a content block is a nameless cid-keyed entity until a Voice reads it.

THE CROSS-SCALE COUPLING (the two-witness realness test, after cyclostratigraphy's TimeOpt): a real flow
shows an `aliran cepat` (a fast flow) whose amplitude envelope is MODULATED BY an `aliran lambat` (a slow
flow it nests in) — a nesting noise cannot counterfeit. On the sigil-bearing beds the lambat may ride the
sigil-frame cadence (red steers black); on a sigil-less corpus it is a content-internal slow flow. v0
reads the STRUCTURAL nesting; the amplitude-modulation witness rides v1.

Meme: lar:///ha.ka.ba/lararium/sensorium/aliran
"""
from __future__ import annotations

from ffz_continuous_pour import pour_ticks, probe_signal

# The channels a stream carries, each a distinct bearer of rhythm. Detection reads CONTENT by default —
# the only channel a sigil-less corpus carries — so the capability generalizes off the framed test beds.
CONTENT = "recurrence"       # the content-borne geology (black channel): refrains, genealogy, frozen pulse
SHAPE = "class-transition"   # the word/clause texture (line-blind)
FRAME = "sigil-event"        # the memetic-wikitext exchange-frame cadence (red channel; framed beds only)


def _as_aliran(row: dict, channel: str) -> dict:
    """A detected NAMELESS flow — its capability record, no name: everything the gate knows (the scale,
    the lock profile, the boundary-crest count, the span entities), minus a name. Naming-by-condensation
    reads this record LATER; detection never presumes what the flow IS, only that it holds."""
    return {
        "scale": row["scale_ticks"],
        "channel": channel,
        "lock": row.get("lock", {}),                 # locked_frac · beat · beat_ticks · lock_quality
        "reference_zoning": row.get("reference_zoning"),
        "n_boundaries": row.get("n_boundaries", 0),
        "spans": (row.get("entities") or {}).get("spans", []),
        "name": None,                                # NAMELESS — awaiting naming-by-condensation
    }


def detect_aliran(text: str, *, channel: str = CONTENT, n_surrogates: int = 3, seed: int = 4241) -> dict:
    """Pour a stream and DETECT its nameless aliran on one channel — the real characteristic scales the
    stream's own structure holds (the gate's REPRODUCED scales), each emitted as a nameless capability
    record, ordered cepat→lambat (fast→slow). Content-only by default, so the SAME detector runs on a
    sigil-less target as on a framed test bed — the sigils never enter detection, only its validation."""
    poured = pour_ticks([{"stream": "aliran", "text": text}])
    n = poured["n_ticks"]
    signals = poured["signals"]
    if channel not in signals:
        raise ValueError(f"aliran: channel {channel!r} unknown — one of {sorted(signals)}")
    read = probe_signal(channel, signals[channel], poured["classes"], poured["annotations"],
                        n_surrogates=n_surrogates, seed=seed)
    aliran = sorted((_as_aliran(r, channel) for r in read.get("reproduced", [])),
                    key=lambda a: a["scale"])
    return {"n_ticks": n, "channel": channel, "aliran": aliran,
            "refused": read.get("refused", []), "untestable": read.get("untestable", [])}


def couple_aliran(reading: dict) -> "list[dict]":
    """The cepat⊥lambat coupling — pair a FAST flow (aliran cepat) with a SLOWER flow (aliran lambat) it
    nests in. v0 reads the STRUCTURAL nesting (the ratio of periods a fast flow sits at inside a slow one);
    the amplitude-modulation witness — does the cepat's envelope track the lambat, the noise-proof
    two-witness of cyclostratigraphy — rides v1 (`modulation` stays None until then). Cepat-first."""
    al = reading.get("aliran", [])
    couples = []
    for i, cepat in enumerate(al):
        for lambat in al[i + 1:]:
            if lambat["scale"] > cepat["scale"]:
                couples.append({
                    "cepat": cepat["scale"], "lambat": lambat["scale"],
                    "ratio": lambat["scale"] / cepat["scale"],   # fast periods nested in one slow
                    "channel": cepat["channel"],
                    "modulation": None,   # v1: the amplitude-modulation witness (cepat envelope ~ lambat)
                })
    return couples
