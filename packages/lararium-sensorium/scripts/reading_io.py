#!/usr/bin/env python3
"""reading_io — an instrument reading recorded as a testimony on the persistence plane.

WHY A READING PERSISTS AT ALL, when nothing else derived does. The sensorium runs on re-derivation:
the durable source plus the durable sink make a write-ahead log unnecessary, and every derived view
(`rejim_io`, the mempalace projection) gets wiped and re-poured rather than accumulated. A reading
obeys that rule too — recompute it over the same ground and the same figure returns.

The rule holds while the ground stands. Re-pour a corpus-on-disk and its ground is gone, so a reading
taken over the old one can never be recomputed: not stale, UNREACHABLE. That case is what the
persistence plane covers, and it is the only reason a reading writes anything down.

WHAT A ROW MUST CARRY, or it records a number and loses its meaning. A figure detached from its
partition names a choice rather than a fact (the grain law: the unit manufactures the finding), so the
DECLARATION rides beside the value — which sensorium, which plane, which grain, which engine. Three
artifacts, three owners: the declaration says who counts, the measurement reports, and neither decides.

THE ASSERTION IS THE READING'S OWN NUMBERS. The persistence store indexes by its assertion vector, so
readings of one instrument land near each other and a reading that MOVES lands far. The admit gate then
does the right thing by construction — it scores a claim on whether it carries bits the store cannot
already predict, which for a series means it keeps the readings that changed and passes over the ticks
that did not.

Meme: lar:///ha.ka.ba/lararium/api/sensorium-runbook
"""

from __future__ import annotations

import hashlib
import json
import math

#: The kinds a reading may declare. Open by design — the roster names what the sensorium's own
#: instruments produce today, and an unlisted kind records fine; this exists to keep spellings stable
#: across callers, never to gate them.
KNOWN_KINDS = (
    "couple_streams",       # effective transfer entropy between plane streams
    "partition_entropy",    # a plane's native ceiling in bits
    "changepoint_tree",     # where content changes hands
    "branching_entropy",    # successor unpredictability
    "option_loss",          # reachable-future entropy spent
    "stability_gate",       # the reproduction grade over a cut set
)


def canonical_json(value) -> str:
    """Serialize the way `crypto.ts canonicalJson` does, so both sides hash a claim identically.

    Object keys sort; non-finite numbers raise rather than serialize to a token no JSON reader agrees
    on. A python row and a TS row for the same reading must collide on their id or the plane holds two
    records of one claim.
    """

    def _check(v):
        if isinstance(v, float) and not math.isfinite(v):
            raise ValueError(f"canonical_json: non-finite number {v}")
        if isinstance(v, dict):
            return {k: _check(v[k]) for k in sorted(v)}
        if isinstance(v, (list, tuple)):
            return [_check(x) for x in v]
        return v

    return json.dumps(_check(value), separators=(",", ":"), ensure_ascii=False)


def reading_claim_cid(signer: str, frontier: str, assertion: "list[float]") -> str:
    """The claim's content address — sha256 over {signer, frontier, assertion}.

    Mirrors `claimCidOf` in sensorium.ts. NOTE the kind sits OUTSIDE the hash on both sides: two
    readings of different kinds sharing one assertion and one provenance address the same claim.
    Distinct instruments produce distinct vectors in practice, so this holds today; a caller that
    needs them separated must vary the frontier.
    """
    payload = canonical_json({"signer": signer, "frontier": frontier, "assertion": assertion})
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def flatten_reading(payload) -> "list[float]":
    """Fold an instrument's result into the assertion vector, deterministically.

    Walks dicts in sorted-key order and lists in order, keeping every finite number and dropping
    everything else — a reading's strings name its engine and its channels, and those ride the
    declaration rather than the vector. `None` inside a matrix (a diagonal a transfer-entropy engine
    leaves empty) folds to 0.0 so a square matrix keeps its width.
    """
    out: "list[float]" = []

    def walk(v):
        if isinstance(v, bool):
            return
        if v is None:
            out.append(0.0)
        elif isinstance(v, (int, float)):
            out.append(float(v) if math.isfinite(float(v)) else 0.0)
        elif isinstance(v, dict):
            for k in sorted(v):
                walk(v[k])
        elif isinstance(v, (list, tuple)):
            for x in v:
                walk(x)

    walk(payload)
    return out


def record_reading(
    store,
    kind: str,
    payload,
    *,
    signer: str,
    frontier: str,
    sensorium: str,
    plane: str,
    grain: str,
    engine: str = "",
    document: str = "",
) -> dict:
    """Land one reading on the persistence plane, declaration and all.

    `store` takes any object carrying `persistence_io.PersistenceStore.put`. The reading's numbers
    become the assertion; the declaration rides `pubinfo`, where a later reader finds what the figure
    was computed OVER. Returns the store's receipt plus the assertion width the caller landed.

    A reading whose payload folds to no numbers raises: an empty assertion would address every other
    empty reading, so the plane would hold one row for every instrument that ever returned nothing.
    """
    assertion = flatten_reading(payload)
    if not assertion:
        raise ValueError(
            f"record_reading {kind}: the payload folded to no finite numbers — a reading with no "
            "measurement carries no claim, and an empty assertion collides with every other one"
        )
    claim_cid = reading_claim_cid(signer, frontier, assertion)
    pubinfo = {
        "sensorium": sensorium,
        "plane": plane,
        "grain": grain,
        "engine": engine,
        "kind": kind,
        "width": len(assertion),
    }
    receipt = store.put(
        claim_cid,
        kind,
        assertion,
        signer,
        frontier,
        pubinfo,
        document or canonical_json(payload),
    )
    return {**receipt, "width": len(assertion), "pubinfo": pubinfo}
