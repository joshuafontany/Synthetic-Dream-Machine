"""C1b witness — the VEILED worldline-root derivation (worldline_veil).

Proves the veil's contract:
  · DETERMINISTIC   — the same (secret, run, context) re-derives the SAME opaque `wl-<hash>` root.
  · UNLINKABLE      — a foreign secret (or a changed run/context) yields a DIFFERENT root.
  · OWNER-KEYED     — resolves a DEDICATED salt (env) ahead of the persona signing key; reads `signingKey`
                      NEVER `verifyingKey` (public would defeat the veil), NEVER a did.
  · FAILS LOUD      — no secret on disk raises, never silently falls back to a public/empty key.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_worldline_veil.py -q
"""
import json

import pytest

import worldline_veil as wv


def test_root_is_opaque_and_deterministic():
    r1 = wv.veiled_root("sess-xyz", secret=b"salt")
    r2 = wv.veiled_root("sess-xyz", secret=b"salt")
    assert r1 == r2                                    # deterministic — owner re-derivation matches
    assert r1.startswith("wl-") and len(r1) == len("wl-") + 16
    assert "sess-xyz" not in r1                        # the bare run never rides the handle


def test_a_foreign_secret_or_changed_input_shifts_the_root():
    base = wv.veiled_root("sess-xyz", secret=b"salt")
    assert wv.veiled_root("sess-xyz", secret=b"other") != base   # a foreign secret cannot recompute it
    assert wv.veiled_root("sess-abc", secret=b"salt") != base    # per-worldline: a new run, a new root
    assert wv.veiled_root("sess-xyz", "ctx", secret=b"salt") != base  # context folds into the root


def test_env_salt_takes_precedence(monkeypatch):
    monkeypatch.setenv("LAR_WORLDLINE_SALT", "dedicated-salt")
    assert wv.load_local_secret() == b"dedicated-salt"
    # the env salt drives the same root an explicit-secret call would mint
    assert wv.veiled_root("r") == wv.veiled_root("r", secret=b"dedicated-salt")


def test_persona_signing_key_keyed_never_the_public_key(tmp_path, monkeypatch):
    monkeypatch.delenv("LAR_WORLDLINE_SALT", raising=False)
    idd = tmp_path / ".lararium-identity"
    idd.mkdir()
    # a persona-group-root with BOTH halves — the veil MUST key on the private signingKey only
    signing = "aa" * 32
    (idd / ".persona-group-root-witness.json").write_text(
        json.dumps({"verifyingKey": "bb" * 32, "signingKey": signing, "gitEmail": "w@x"}),
        encoding="utf-8")
    got = wv.load_local_secret(identity_dir=str(idd))
    assert got == bytes.fromhex(signing)               # keyed on the PRIVATE half, decoded to raw bytes
    assert got != bytes.fromhex("bb" * 32)             # never the public verifyingKey


def test_no_secret_fails_loud(tmp_path, monkeypatch):
    monkeypatch.delenv("LAR_WORLDLINE_SALT", raising=False)
    empty = tmp_path / ".empty-identity"
    empty.mkdir()
    with pytest.raises(RuntimeError):
        wv.load_local_secret(identity_dir=str(empty))  # never a silent public/empty-key fallback


# --- the XDG-state parity guard (identity-home caller-lag, healed 2026-07-15) ------------
# The salt dir MUST resolve the SAME XDG-STATE rule the TS larIdentityDir() (vessel-paths.ts)
# holds — the vessel WRITES the persona-group-root there. The identity-home move once left this
# default at the pre-XDG ~/.lares/.lararium-identity scatter (which held no file post-move).

def test_identity_dir_mirrors_xdg_data(monkeypatch):
    monkeypatch.delenv("LAR_ROOT", raising=False)
    monkeypatch.setenv("XDG_DATA_HOME", "/x/state")
    assert wv._identity_dir() == "/x/state/lares/identity"


def test_identity_dir_honors_xdg_state_unset(monkeypatch):
    import os
    monkeypatch.delenv("LAR_ROOT", raising=False)
    monkeypatch.delenv("XDG_DATA_HOME", raising=False)
    expect = os.path.join(os.path.expanduser("~"), ".local", "share", "lares", "identity")
    assert wv._identity_dir() == expect


def test_identity_dir_isolated_instance(monkeypatch):
    monkeypatch.setenv("LAR_ROOT", "/iso")
    monkeypatch.delenv("XDG_DATA_HOME", raising=False)
    assert wv._identity_dir() == "/iso/data/identity"


def test_identity_dir_explicit_override_wins(monkeypatch):
    monkeypatch.setenv("XDG_DATA_HOME", "/x/state")
    assert wv._identity_dir("/explicit/dir") == "/explicit/dir"


def test_identity_dir_never_the_prexdg_scatter(monkeypatch):
    monkeypatch.delenv("LAR_ROOT", raising=False)
    monkeypatch.delenv("XDG_DATA_HOME", raising=False)
    assert ".lararium-identity" not in wv._identity_dir()
    assert "/.lares/" not in wv._identity_dir()
