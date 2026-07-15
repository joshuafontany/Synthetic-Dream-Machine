"""stream_events — vessel-neutral event envelopes and a pointer source cap."""
from __future__ import annotations

import hashlib
import json


def _cid(event: dict) -> str:
    """Key an event by its source identity, never by mutable text."""
    ground = "\x1f".join((event["vessel"], event["island"], event["event_id"],
                            event["direction"], event["kind"]))
    return hashlib.sha256(ground.encode("utf-8")).hexdigest()


def read_events(pointer: str) -> list[dict]:
    """Read newline-delimited vessel events and refuse ambiguous island-local order."""
    events = []
    seen, last = set(), {}
    with open(pointer, encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, start=1):
            if not line.strip():
                continue
            try:
                raw = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"stream event {line_no}: invalid JSON") from exc
            required = ("vessel", "island", "event_id", "sequence", "direction", "kind", "payload")
            if not isinstance(raw, dict) or any(not isinstance(raw.get(key), str) or not raw[key] for key in required if key != "sequence"):
                raise ValueError(f"stream event {line_no}: missing string envelope field")
            if isinstance(raw["sequence"], bool) or not isinstance(raw["sequence"], int) or raw["sequence"] < 0:
                raise ValueError(f"stream event {line_no}: sequence must be a non-negative integer")
            if "unreliably_observed_at" in raw and (not isinstance(raw["unreliably_observed_at"], str)
                                                    or not raw["unreliably_observed_at"]):
                raise ValueError(f"stream event {line_no}: unreliably_observed_at must carry a non-empty provenance string")
            island = (raw["vessel"], raw["island"])
            key = (*island, raw["event_id"])
            if key in seen or raw["sequence"] <= last.get(island, -1):
                raise ValueError(f"stream event {line_no}: duplicate event or non-monotonic island sequence")
            seen.add(key)
            last[island] = raw["sequence"]
            events.append(raw)
    return events


def stream_event_source(*, wing: str, room: str = "stream"):
    """Compose a generic source cap from a vessel event pointer."""
    def source(pointer: str):
        predecessors = {}
        for seq, event in enumerate(read_events(pointer)):
            island = (event["vessel"], event["island"])
            chain_ground = "\x1f".join((predecessors.get(island, ""), _cid(event), event["payload"]))
            chain = hashlib.sha256(chain_ground.encode("utf-8")).hexdigest()
            predecessors[island] = chain
            metadata = {
                "wing": wing, "room": room, "lar_vessel": event["vessel"],
                "lar_island": event["island"], "lar_event_id": event["event_id"],
                "lar_sequence": event["sequence"], "lar_direction": event["direction"],
                "lar_kind": event["kind"], "source_file": f"{event['vessel']}:{event['island']}",
                "chunk_index": event["sequence"], "lar_turn_key": f"{event['island']}:{event['event_id']}",
                "lar_chain": chain}
            if isinstance(event.get("payload_ref"), str) and event["payload_ref"]:
                metadata["lar_payload_ref"] = event["payload_ref"]
            # An island may report its own clock reading; it never carries a global-now claim.
            if "unreliably_observed_at" in event:
                metadata["lar_unreliably_observed_at"] = event["unreliably_observed_at"]
            yield {"seq": seq, "cid": _cid(event), "text": event["payload"], "metadata": metadata}
    return source


def compose_event_stream_sensorium(root: str, *, wing: str, room: str = "stream", embed_factory=None):
    """Compose a rooted generic text-stream sensorium from vessel event envelopes.

    Vessels write pointers to newline-delimited events.  This function consumes
    those pointers through the same warm content, fresh plane, dormant
    persistence, and declared-order caps that other text streams carry.
    """
    import content_io as cio
    from capture_session import stamp_embedder
    from capture_stream import ContentStoreLandCap
    from plane_fanout import compose_text_planes
    from sensorium import (OrderCap, compose_persistence_cap, compose_stream_sensorium,
                           sensorium_paths, write_stream_manifest)

    if embed_factory is None:
        from embed_cap import make_embed_cap
        embed_factory = make_embed_cap
    embed_one, model = embed_factory()
    dim = len(embed_one("probe"))
    paths = sensorium_paths(root)
    order = OrderCap("stream", "observed:connection-sequence")
    write_stream_manifest(
        paths.root,
        name="stream",
        lar="lar:///ha.ka.ba/lares/api/lares/stream#event-capture",
        order=order,
        apertures={"measure": "boundary-changepoint"},
    )
    source = stamp_embedder(stream_event_source(wing=wing, room=room), model)
    store = cio.ContentStore(paths.content, required_keys={"wing", "room"}, expected_dim=dim,
                             expected_model=model, append_only=True)
    stream = compose_stream_sensorium(
        kind="stream", land=ContentStoreLandCap(store), embed=embed_one,
        source_factory=lambda **_route: source,
        planes_factory=lambda **_route: compose_text_planes(paths.root),
        persistence=compose_persistence_cap(paths.root),
        order=order,
    )
    return stream, store, paths
