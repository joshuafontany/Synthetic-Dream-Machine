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


def test_events_keep_optional_unreliable_clock_provenance(tmp_path):
    p = tmp_path / "observed.ndjson"
    p.write_text(json.dumps({"vessel": "mudlet", "island": "conn-a", "event_id": "1",
                             "sequence": 0, "direction": "in", "kind": "line", "payload": "look",
                             "unreliably_observed_at": "vessel-clock:42"}), encoding="utf-8")
    row = next(iter(stream_event_source(wing="wing_mudlet")(str(p))))
    assert row["metadata"]["lar_unreliably_observed_at"] == "vessel-clock:42"


def test_event_parse_fault_names_the_source_line(tmp_path):
    p = tmp_path / "torn.ndjson"
    p.write_text("{not-json}\n", encoding="utf-8")
    with pytest.raises(ValueError, match="stream event 1: invalid JSON"):
        read_events(str(p))


def test_stream_manifest_refuses_root_identity_drift(tmp_path):
    from sensorium import OrderCap, write_stream_manifest
    write_stream_manifest(str(tmp_path), name="stream", lar="lar:///x",
                          order=OrderCap("stream", "observed:connection-sequence"))
    with pytest.raises(ValueError, match="conflicts on order"):
        write_stream_manifest(str(tmp_path), name="stream", lar="lar:///x",
                              order=OrderCap("corpus", "declared:in-file"))


def test_stream_manifest_uses_the_rooted_transaction_lock(tmp_path):
    from sensorium import OrderCap, write_stream_manifest
    write_stream_manifest(str(tmp_path), name="stream", lar="lar:///x",
                          order=OrderCap("stream", "observed:connection-sequence"))
    locks = list((tmp_path / "locks").glob("sensorium_manifest_*.lock"))
    assert len(locks) == 1


def test_stream_manifest_preserves_an_unowned_cap_and_declaration_fields(tmp_path):
    from sensorium import OrderCap, write_stream_manifest
    (tmp_path / "manifest.json").write_text(json.dumps({
        "schema": 1, "sensorium": "stream", "lar": "lar:///x",
        "has": {"telemetry": {"dir": "telemetry", "engine": "mudlet", "variance": "sheaf"}},
        "persistencePolicy": {"halfLife": 12},
        "bands": {"grain": "native"}, "coupling": {"children": [{"sensorium": "other", "dir": "other"}]},
        "created": "2026-01-01T00:00:00.000Z",
    }), encoding="utf-8")

    write_stream_manifest(str(tmp_path), name="stream", lar="lar:///x",
                          order=OrderCap("stream", "observed:connection-sequence"))

    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["has"]["telemetry"]["engine"] == "mudlet"
    assert manifest["persistencePolicy"] == {"halfLife": 12}
    assert manifest["bands"] == {"grain": "native"}
    assert manifest["coupling"]["children"][0]["sensorium"] == "other"
    assert manifest["created"] == "2026-01-01T00:00:00.000Z"


@pytest.mark.parametrize(("first", "second", "field"), [
    ({"apertures": {"measure": "boundary-changepoint"}},
     {"apertures": {"beat": "worldline-dag"}}, "apertures"),
    ({"worldline": {"real": ["in-file"], "arbitrary": []}},
     {"worldline": {"real": ["containment"], "arbitrary": []}}, "worldline"),
    ({"ephemeral": True}, {"ephemeral": False}, "ephemeral"),
])
def test_stream_manifest_refuses_a_declared_ground_revision(tmp_path, first, second, field):
    from sensorium import OrderCap, write_stream_manifest
    write_stream_manifest(str(tmp_path), name="stream", lar="lar:///x",
                          order=OrderCap("stream", "observed:connection-sequence"), **first)
    with pytest.raises(ValueError, match=field):
        write_stream_manifest(str(tmp_path), name="stream", lar="lar:///x",
                              order=OrderCap("stream", "observed:connection-sequence"), **second)


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
