"""corpus_testbed — the bed's IaC manifest declares the GEOLOGY mood, idempotently."""
import json
import os
import subprocess
import sys

from corpus_testbed import write_bed_manifest

# the core scripts this suite subprocess-invokes (worldline_ffz.py) stay in the
# parent scripts/ dir, one level up from this testbeds/ home
_HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_bed_manifest_declares_geology(tmp_path):
    p = write_bed_manifest(str(tmp_path), name="bed-x")
    m = json.load(open(p))
    assert m["apertures"] == {"measure": "boundary-changepoint"}
    assert "beat" not in m["apertures"]  # nobody grounded a corpus — beat stays unearnable
    assert m["ephemeral"] is True
    assert set(m["has"]) == {"content", "structure", "form", "worldline", "persistence"}
    assert m["worldline"] == {"real": ["in-file"], "arbitrary": ["walk-order"]}
    assert m["persistencePolicy"] == {"halfLife": None}


def test_bed_manifest_re_stand_stays_byte_identical(tmp_path):
    p = write_bed_manifest(str(tmp_path))
    first = open(p, "rb").read()
    write_bed_manifest(str(tmp_path))
    assert open(p, "rb").read() == first  # the mint time survives; nothing churns


def test_geology_bed_refuses_the_beat_fill(tmp_path):
    # the declaration law, witnessed end-to-end: a geology manifest → the enricher
    # refuses loud, naming the law — never a silent no-op, never a fabricated beat.
    write_bed_manifest(str(tmp_path))
    os.makedirs(tmp_path / "content", exist_ok=True)
    r = subprocess.run(
        [sys.executable, os.path.join(_HERE, "worldline_ffz.py"),
         "enrich", "--sensorium", str(tmp_path)],
        capture_output=True, text=True)
    assert r.returncode == 3
    assert "earns measure, never beat" in r.stderr
