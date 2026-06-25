"""mempalace-source-lares — the DECLARATION half of the @admin memory-shore.

RFC 002 (BaseSourceAdapter) ships as schema scaffolding: the ABC + registry +
PalaceContext exist, but `mempalace mine --source` is unwired and live-per-turn
is an explicit non-goal. So we keep our OWN runner (the TS gradient parser via
`lares harvest`) and use this adapter for what it IS ready for today: the
**declared schema contract**.

The maintainers' anti-pattern is not "writing chroma" — it is SMUGGLING
undeclared writes past the schema/transform contract. This module closes that:
every `lar_*` field our enrichment writes is declared here as a FieldSpec, and
`drawer_io.apply` validates each write against it and stamps the adapter
identity. A declared write is sovereign enrichment; the same write undeclared is
the anti-pattern. When upstream wires `--source`, `ingest()` gets fleshed out
(via the NDJSON parser bridge) and our runner swaps for theirs with zero drawer
re-shaping.

Byte-preserving: we touch only metadata, never drawer content
(`declared_transformations` stays empty).
"""
from __future__ import annotations

from typing import Iterator, Optional

from mempalace.sources.base import (
    AdapterSchema,
    BaseSourceAdapter,
    FieldSpec,
    IngestResult,
    SourceItemMetadata,  # noqa: F401  (part of the contract vocabulary)
    SourceRef,
    SourceSummary,
)

ADAPTER_NAME = "lares"
ADAPTER_VERSION = "0.1.0"

# The declared lar_* schema — MUST stay in lockstep with buildPatch() in
# packages/lares-cli/src/commands/harvest.ts. Every key harvest writes appears
# here; drawer_io validates the write set against it.
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
    },
)


def declared_field_names() -> frozenset[str]:
    """The lar_* keys this adapter declares — drawer_io validates against this."""
    return frozenset(LAR_SCHEMA.fields)


class LaresAdapter(BaseSourceAdapter):
    """Declares the lar_* domain-metadata contract for Lares session harvest.

    Today this serves describe_schema() (the live, load-bearing role). ingest()
    is reserved for when upstream wires `mempalace mine --source`; until then the
    sovereign runner is the TS gradient parser invoked via `lares harvest`.
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
        raise NotImplementedError(
            "lares ingest() is not wired: the sovereign runner is the TS gradient "
            "parser via `lares harvest --writeback --wing <w>` (RFC 002 `--source` "
            "is not yet connected to `mempalace mine`). This adapter supplies the "
            "declared schema (describe_schema); flesh ingest() in when `--source` lands."
        )
