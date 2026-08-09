#!/usr/bin/env python3
"""worldline_veil — the VEILED worldline-root derivation (an identity-root that never leaks).

QA Pass-A C1b: `worldline_observe` rooted each braid at the BARE session basename (`run_id_of`), so the
worldline graph carried a stable, cross-referenceable session handle in the clear. Should the worldline
data exfiltrate, that bare handle rides out with it. This module VEILS the root:

    root = "wl-" + HMAC(local-secret, DOMAIN ‖ run ‖ context)[:N]

keyed by a LOCAL SECRET the owner holds in `<state>/identity/` — a dedicated worldline-salt
(env) or, failing that, the persona-group-root SIGNING key (the private persona-side half). NEVER the
vessel public key, NEVER a did (canon `persona-circle#the-block`: the vessel key MUST NEVER co-surface;
a did would re-expose the DreamNet identity the veil hides).

What the veil buys:
  · OPAQUE handles     — an exfiltrator reads only `wl-<hash>`; the run never rides out in the clear.
  · OWNER-RECOMPUTABLE — the owner re-derives the SAME root from the on-disk secret + the run, so a
                         drawer (carrying `source_file` = `<run>.jsonl`) still binds to its worldline.
  · DOMAIN-SEPARATED   — the DOMAIN tag walls this HMAC use off from any other use of the same key, so
                         reusing the persona signing key as a MAC key leaks nothing about the signer.

Root-shape B (per-worldline): each run mints its OWN veiled root; the handle keeps the `<root>.<agentId>`
shape (`worldline_observe.derive_handle`), now prefixed by the VEILED root rather than the bare run.

Clock-pure: this module imports no host clock (mirrors the sighting ward on the worldline edge path).

Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#veiled-root
"""
from __future__ import annotations

import glob
import hashlib
import hmac
import json
import os

# The domain-separation tag — walls this HMAC use off from any OTHER use of the same local secret, so a
# reused persona signing key leaks nothing about the signer (a versioned tag admits a later re-cut).
_DOMAIN = b"lar:worldline-root:v1"

# The truncation width: `wl-` + 16 hex = a 64-bit opaque handle (matches the local `_sha16` turn-key idiom).
_ROOT_HEX_LEN = 16

_PERSONA_ROOT_GLOB = ".persona-group-root-*.json"


def _identity_dir(identity_dir: "str | None" = None) -> str:
    """Resolve the on-disk identity dir — an explicit override, else `<data>/identity`, mirroring the
    TS `larIdentityDir()` (vessel-paths.ts): `LAR_ROOT/data/identity` for isolated instances, else
    `$XDG_DATA_HOME/lares/identity` (unset → `~/.local/share/lares/identity`).

    THIS MIRRORS A TS RESOLVER AND MUST FOLLOW IT. The two homes split on whether a thing can be
    re-made: the sovereign root cannot, so it gathers in the DATA home with the seal and the shelf,
    while the state home keeps watermarks alone. A mirror left on the old address reads a salt that
    is not there and veils against nothing. Guarded by test_identity_dir_mirrors_xdg_data."""
    if identity_dir:
        return identity_dir
    lar_root = os.environ.get("LAR_ROOT")
    if lar_root:
        data_home = os.path.join(lar_root, "data")
    else:
        xdg = (os.environ.get("XDG_DATA_HOME") or "").strip()
        data_home = os.path.join(xdg or os.path.join(os.path.expanduser("~"), ".local", "share"), "lares")
    return os.path.join(data_home, "identity")


def _persona_signing_secret(identity_dir: str) -> "bytes | None":
    """Read the persona-group-root SIGNING key (the private persona-side half) as raw HMAC-key bytes,
    else None when no persona root sits on disk. Reads `signingKey` ONLY — NEVER `verifyingKey` (public
    would let an exfiltrator recompute the root and defeat the veil). Decodes hex to the raw 32-byte
    secret when it parses, else keys on the string bytes. The secret never leaves this function."""
    matches = sorted(glob.glob(os.path.join(identity_dir, _PERSONA_ROOT_GLOB)))
    if not matches:
        return None
    try:
        with open(matches[0], encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return None
    signing = data.get("signingKey")
    if not isinstance(signing, str) or not signing:
        return None
    try:
        return bytes.fromhex(signing)          # the raw 32-byte secret when the key parses as hex
    except ValueError:
        return signing.encode("utf-8")         # else key on the string bytes (still a private secret)


def load_local_secret(identity_dir: "str | None" = None) -> bytes:
    """Load the local veil secret — FAILS LOUD when none sits on disk (a silent empty-key fallback would
    make the root PUBLICLY recomputable, the confused-deputy failure the veil exists to close).

    Resolution order:
      1. `LAR_WORLDLINE_SALT` (env)          — a DEDICATED worldline-salt, no key-reuse (the clean path).
      2. persona-group-root `signingKey`     — the private persona-side half (canon-sanctioned, veiled).
    """
    salt = os.environ.get("LAR_WORLDLINE_SALT")
    if salt:
        return salt.encode("utf-8")
    secret = _persona_signing_secret(_identity_dir(identity_dir))
    if secret is not None:
        return secret
    raise RuntimeError(
        "worldline_veil: no local secret found — set LAR_WORLDLINE_SALT or place a "
        "persona-group-root key under the .lararium-identity dir (the veil never falls back "
        "to a public/empty key, which would leak the worldline root)"
    )


def veiled_root(run: str, context: str = "", *, secret: "bytes | str | None" = None,
                identity_dir: "str | None" = None, hex_len: int = _ROOT_HEX_LEN) -> str:
    """Derive the OPAQUE veiled worldline-root `wl-<hash>` for a run.

    `root = "wl-" + HMAC-SHA256(secret, DOMAIN ‖ run ‖ context)[:hex_len]`. Owner-recomputable: the same
    (secret, run, context) re-derives the SAME root. `secret` injects the key (a witness passes an
    explicit test salt so it never touches the operator's real keys); None resolves the on-disk secret."""
    if secret is None:
        secret = load_local_secret(identity_dir)
    if isinstance(secret, str):
        secret = secret.encode("utf-8")
    msg = _DOMAIN + b"\x00" + run.encode("utf-8") + b"\x00" + context.encode("utf-8")
    digest = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    return "wl-" + digest[:hex_len]
