import json
import pytest
from stream_events import compose_event_stream_sensorium, read_events, stream_event_source


def _embed_factory():
    return (lambda text: [float(len(text)), 0.0, 1.0, 0.0]), "stub-stream/4"


def test_mudlet_shaped_events_hold_island_local_order(tmp_path):
    p = tmp_path / "mudlet.ndjson"
    p.write_text("\n".join(json.dumps(e) for e in [
        {"vessel":"mudlet","island":"conn-a","event_id":"1","sequence":0,"direction":"in","kind":"line","payload":"look"},
        {"vessel":"mudlet","island":"conn-a","event_id":"2","sequence":1,"direction":"out","kind":"command","payload":"north"}]), encoding="utf-8")
    rows = list(stream_event_source(wing="wing_mudlet")(str(p)))
    assert [row["metadata"]["lar_sequence"] for row in rows] == [0, 1]
    assert rows[0]["metadata"]["lar_island"] == "conn-a"


def test_events_refuse_reconnect_order_fusion(tmp_path):
    p = tmp_path / "bad.ndjson"
    p.write_text(json.dumps({"vessel":"ue6","island":"world-a","event_id":"1","sequence":1,"direction":"in","kind":"telemetry","payload":"x"}) + "\n" + json.dumps({"vessel":"ue6","island":"world-a","event_id":"2","sequence":1,"direction":"in","kind":"telemetry","payload":"y"}), encoding="utf-8")
    with pytest.raises(ValueError, match="non-monotonic"):
        read_events(str(p))


def test_events_refuse_boolean_sequence(tmp_path):
    p = tmp_path / "bad-sequence.ndjson"
    p.write_text(json.dumps({"vessel": "mudlet", "island": "conn-a", "event_id": "1",
                             "sequence": True, "direction": "in", "kind": "line", "payload": "look"}),
                 encoding="utf-8")
    with pytest.raises(ValueError, match="non-negative integer"):
        read_events(str(p))


def test_event_stream_composes_the_generic_rooted_cap_stack(tmp_path):
    pointer = tmp_path / "events.ndjson"
    pointer.write_text("\n".join(json.dumps(event) for event in [
        {"vessel": "mudlet", "island": "conn-a", "event_id": "1", "sequence": 0,
         "direction": "in", "kind": "line", "payload": "look", "payload_ref": "mudlet://conn-a/1"},
        {"vessel": "mudlet", "island": "conn-a", "event_id": "2", "sequence": 1,
         "direction": "out", "kind": "command", "payload": "north"},
    ]), encoding="utf-8")
    root = tmp_path / "sensorium"
    stream, _store, paths = compose_event_stream_sensorium(str(root), wing="wing_mudlet",
                                                             embed_factory=_embed_factory)
    first = stream.capture(str(pointer))
    second = stream.capture(str(pointer))
    assert first["landed"] == 2 and second["landed"] == 0 and second["skipped"] == 2
    assert stream._order.projector == "stream"
    assert stream._order.basis == "observed:connection-sequence"
    assert paths.content == str(root / "content")
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["order"] == {"projector": "stream", "basis": "observed:connection-sequence"}
