"""mempalace-source-lares — the DECLARATION half of the @admin memory-shore.

RFC 002 (BaseSourceAdapter) supplies the schema and source contract. This
adapter decodes the queue-shaped NDJSON records that the source boundary hands
it; the live capture route remains Python-owned and pointer-driven.

The maintainer anti-pattern smuggles undeclared writes past the schema/transform
contract. Every `lar_*` field enrichment writes appears here as a FieldSpec, and
`loci_io.apply` validates each write against it and stamps the adapter
identity. A declared write carries sovereign enrichment; an undeclared write
refuses the boundary.

Byte-preserving: we touch only metadata, never drawer content
(`declared_transformations` stays empty).
"""
from __future__ import annotations

import json
import logging
from typing import Iterator, Optional

from mempalace.sources.base import (
    AdapterSchema,
    BaseSourceAdapter,
    DrawerRecord,
    FieldSpec,
    IngestResult,
    RouteHint,
    SourceItemMetadata,  # noqa: F401  (part of the contract vocabulary)
    SourceRef,
    SourceSummary,
)

logger = logging.getLogger(__name__)

ADAPTER_NAME = "lares"
ADAPTER_VERSION = "0.1.0"

# The declared lar_* schema — MUST stay in lockstep with buildPatch() in
# packages/lares-cli/src/commands/harvest.ts. Every key harvest writes appears
# here; loci_io validates the write set against it.
LAR_SCHEMA = AdapterSchema(
    version=ADAPTER_VERSION,
    fields={
        "lar_hv": FieldSpec(type="int", required=True,
                            description="harvest version (idempotency/upgrade gate)"),
        "lar_band": FieldSpec(type="string", required=True, indexed=True,
                              description="confidence band: canon|synthesis|provisional|raw"),
        "lar_bearing_conf": FieldSpec(type="int", required=True, indexed=True,
                                      description="overall 0..20 gradient confidence"),
        "lar_sigils": FieldSpec(type="int", required=True,
                                description="recognized sigil-island count in the drawer"),
        "lar_water": FieldSpec(type="int", required=True,
                               description="unrecognized <<~ openers (panic-synced water)"),
        "lar_aim": FieldSpec(type="string", required=False, indexed=True,
                             description="lares aim bearing payload (verbatim)"),
        "lar_yield": FieldSpec(type="string", required=False, indexed=True,
                               description="lares yield forward-vector payload (verbatim)"),
        "lar_voices": FieldSpec(type="delimiter_joined_string", required=False, indexed=True,
                                delimiter="|", description="Voices that surfaced in the drawer"),
        "lar_confidence": FieldSpec(type="delimiter_joined_string", required=False,
                                    delimiter="|",
                                    description="all confidence marks: register:value/max"),
        "lar_drift": FieldSpec(type="delimiter_joined_string", required=False, delimiter="|",
                               description="drift flags from the gradient parse"),
        "lar_hall": FieldSpec(type="string", required=False, indexed=True,
                              description="function-hall routed by sigil: hall_facts|events|discoveries"),
        "lar_surface": FieldSpec(type="string", required=False, indexed=True,
                                 description="originating harness surface: claude|codex|copilot-vscode|copilot-cli"),
        "lar_agent": FieldSpec(type="string", required=False, indexed=True,
                               description="tasked-spirit pet-name LABEL on sidechain drawers (not the identity)"),
        "lar_sidechain": FieldSpec(type="int", required=False, indexed=True,
                                   description="1 = a tasked-spirit (sub-agent) turn, distinct from the main agent"),
        "lar_agent_handle": FieldSpec(type="string", required=False, indexed=True,
                                      description="worldline lineage-path handle <run>.<agentId> — derived at spawn, no registry; carries identity (pet-name only labels)"),
        "lar_parent_handle": FieldSpec(type="string", required=False, indexed=True,
                                       description="projected attribution edge: the appointed-by parent handle (immediate parent; flat subagents = the run)"),
        "lar_root_handle": FieldSpec(type="string", required=False, indexed=True,
                                     description="projected attribution edge: the root-principal handle (paramount; flat subagents = the run)"),
        "lar_turn_ordinal": FieldSpec(type="int", required=False, indexed=True,
                                      description="the turn's POSITION in its source stream (producer-given index; the hash-derived dedup pseudo-chunk never stamps) — recall's self-discount grades same-root hits by this distance against the caller's horizon"),
        "lar_ffz": FieldSpec(type="string", required=False, indexed=True,
                             description="rhythmic ADDRESS — the worldline clock's phase frozen at this turn's grounding boundary: Theme.Arc.Measure.Beat.Segment[.block], prefix-truncatable (segment ticks, block offsets; ffz-clock#rhythmic-address)"),
        # ── kapae down-weight (strand C) — the rewind salience the FFZ Measure servo reads ──────────
        "lar_salience": FieldSpec(type="float", required=False, indexed=True,
                                  description="kapae down-weight in (0,1] (default 1.0): a rewound / road-not-taken drawer rides a floor salience so it barely bends the Measure rhythm (ffz-orchestrator#kapae-down-weight)"),
        "lar_kapae": FieldSpec(type="string", required=False, indexed=True,
                               description="the rewind LIVENESS stamp: iso whole-seconds of kapae detection (legacy drawers carry int 1) — set aside, never erased/hidden; readers RANK by it (any truthy = rewound) — the convergence twin of the KG valid-close + the structurepalace tally-decrement"),
        "lar_frontier": FieldSpec(type="string", required=False, indexed=True,
                                  description="the turn-DAG fork-frontier token (head turn-uuids) keying a same-session fork to a distinct worldline handle (build-patch#BranchContext)"),
    },
)


def declared_field_names() -> frozenset[str]:
    """The lar_* keys this adapter declares — loci_io validates against this."""
    return frozenset(LAR_SCHEMA.fields)


class LaresAdapter(BaseSourceAdapter):
    """Declares the lar_* domain-metadata contract for Lares session harvest.

    `describe_schema()` declares the metadata contract. `ingest()` decodes the
    NDJSON source shape without reinterpreting its content; routing remains a
    producer declaration on each record.
    """

    name = ADAPTER_NAME
    adapter_version = ADAPTER_VERSION
    capabilities = frozenset({"adapter_owns_routing", "supports_incremental"})
    supported_modes = frozenset({"chunked_content"})
    declared_transformations = frozenset()  # metadata-only; drawer content untouched
    default_privacy_class = "pii_potential"

    def describe_schema(self) -> AdapterSchema:
        return LAR_SCHEMA

    def source_summary(self, *, source: SourceRef) -> SourceSummary:
        return SourceSummary(description=f"Lares session harvest: {source.local_path or source.uri}")

    def ingest(self, *, source: SourceRef, palace) -> Iterator[IngestResult]:  # noqa: ARG002
        """Drain an NDJSON nalu-queue file into ``DrawerRecord``s (the forward flush).

        The forward-facing capture writer — a SEPARATE local non-federated worker-VM —
        processes each turn forward (verbatim + ``lar_*`` gradient + handle/edge/ffz
        born together) and enqueues ONE JSON object per line::

            {"content": "...", "source_file": "...", "metadata": {...}, "chunk_index": 0}

        The daemon's 20 Hz server-tick flush rotates the queue and runs
        ``mine --source lares <queue>`` to drain it. This adapter touches ONLY metadata;
        the drawer content rides verbatim (``declared_transformations`` stays empty —
        byte-preserving). Routing rides ``adapter_owns_routing``: the ``RouteHint`` comes
        from the record's ``metadata.wing/room/hall`` or an explicit ``route_hint``.
        Depth: lar:///ha.ka.ba/lararium/api/capture-annotation-model#forward-facing-nalu.
        """
        queue_path = source.local_path or source.uri
        if not queue_path:
            raise FileNotFoundError("lares ingest needs a queue path (SourceRef.local_path)")
        with open(queue_path, encoding="utf-8", errors="replace") as fh:
            for lineno, raw in enumerate(fh, 1):
                line = raw.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    logger.warning("lares ingest: skipping malformed NDJSON at %s:%d", queue_path, lineno)
                    continue
                content = rec.get("content")
                source_file = rec.get("source_file")
                if not isinstance(content, str) or not isinstance(source_file, str):
                    logger.warning("lares ingest: record missing content/source_file at %s:%d", queue_path, lineno)
                    continue
                meta = dict(rec.get("metadata") or {})
                hint = rec.get("route_hint") or {}
                route = RouteHint(
                    wing=meta.get("wing") or hint.get("wing"),
                    room=meta.get("room") or hint.get("room"),
                    hall=meta.get("hall") or hint.get("hall"),
                )
                yield DrawerRecord(
                    content=content,
                    source_file=source_file,
                    chunk_index=int(rec.get("chunk_index", 0) or 0),
                    metadata=meta,
                    route_hint=route,
                )
