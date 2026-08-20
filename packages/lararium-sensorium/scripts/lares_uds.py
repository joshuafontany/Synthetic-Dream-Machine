#!/usr/bin/env python3
"""lares_uds — the PY side of the @daemon cap-wire: speak a verb to the lares daemon over its
Unix-domain socket.

WHY A WIRE AND NOT A STORE HANDLE. The palace serve-holders (`content_io serve`, `search_io serve`,
…) speak NDJSON over raw **stdin** — so only the process that SPAWNED a holder can reach it, and a
per-palace flock makes a second holder exit rather than pile up. A py process that opens a store
directly therefore cannot share the vessel's holder; it opens its OWN chroma client beside it, and N
harness sessions become N unsynchronized clients on one index. No lock cures that; only ONE OWNER does.

So the shape holds: the @daemon owns exactly one set of py holders, and every other process — this one
included — reaches memory THROUGH it, over this socket. All the COMPUTE stays py (the holders embed,
search, and store); the TS @daemon only ROUTES. Routing a verb counts as coordination, never compute:
`@daemon coordinates, py computes`.

THE WIRE (mirrors the TS `invokeLocal`): connect `<dataDir>/lares.sock`, write ONE JSON line
`{verb, args, requestedBy[, requestId]}`, read ONE outcome line back. 0600 owner-only perms gate
presence; the `requestedBy` did rides the invocation for the daemon's verify-then-delegate.

ON THE WAIT. Entrance-block canon forbids a stream WAITING on the coordinator to advance its own
rhythm — a handler that blocks on the centre has made the centre its clock. That law governs
RHYTHM-BEARING streams (a capture body recovering a beat from its own data), not reads. A recall
recovers no beat and carries no phase, so blocking on the owner costs it nothing it has. Capture must
never come through here; reads may.

  from lares_uds import call, LaresDaemonUnreachable
  hits = call("recall", {"query": "entrance block", "limit": 5})
"""
from __future__ import annotations

import json
import os
import socket


class LaresDaemonUnreachable(Exception):
    """No daemon holds the socket. The caller renders it; it never falls back to opening a store."""


class LaresVerbError(Exception):
    """The daemon ran the verb and it failed. Carries the daemon's own message."""


def data_dir() -> str:
    """`<lares>/vessel` — the ONE env contract both sides resolve the socket under, mirroring TS
    `larDataDir()` (vessel-paths.ts): `LAR_ROOT/data/lares/vessel` for an isolated instance, else
    `$XDG_DATA_HOME/lares/vessel` (unset -> `~/.local/share/lares/vessel`).

    THE CRITERION IS WHOSE IT IS. The vessel substrate belongs to the SPIRITS, so it stands in the
    spirits' house; what belongs to the HOUSE stands at `<lararium>`. Under an isolated root every
    directory names an XDG KIND and the two HOUSES nest inside the data kind, exactly as under XDG —
    so a resolver one segment short opens an absent directory and reports a daemon that never answered."""
    root = os.environ.get("LAR_ROOT")
    if root:
        return os.path.join(root, "data", "lares", "vessel")
    xdg = os.environ.get("XDG_DATA_HOME") or os.path.join(os.path.expanduser("~"), ".local", "share")
    return os.path.join(xdg, "lares", "vessel")


def socket_path() -> str:
    return os.path.join(data_dir(), "lares.sock")


def available() -> bool:
    return os.path.exists(socket_path())


def identity_dir() -> str:
    """`<lares>/identity` — the SIBLING of the vessel store, mirroring TS `larIdentityDir()`.

    A Lar's keys ARE that Lar, so the sovereign root belongs to the SPIRITS and stands beside the
    substrate rather than inside it: every substrate verb (`reset`/`regenesis`/`rebuild`) reforges the
    store while identity survives untouched. The dir derives from the SAME house the socket does, which
    keeps the did this side sends and the daemon that answers agreed on ONE keypair — a second spelling
    reads a keypair the TS side never wrote and sends a did no cap resolves.
    """
    return os.path.join(os.path.dirname(data_dir()), "identity")


def operator_did() -> str:
    """The `requestedBy` did — `0x` + the vessel's VERIFYING key (the public half).

    The signing key lives in the same file and is NEVER read here: this wire carries authority by
    DESIGNATION (the did the daemon derives caps from), not by proof-of-possession, so the secret has
    no business in this process.
    """
    import glob

    ident = identity_dir()
    for f in sorted(glob.glob(os.path.join(ident, ".vessel-key-*.json"))):
        with open(f) as fh:
            key = json.load(fh).get("verifyingKey")
        if key:
            return "0x" + key
    raise LaresDaemonUnreachable(
        f"no vessel identity under {ident} — run `lares vessel stand --init` to found this node"
    )


def call(verb: str, args: "dict | None" = None, *, timeout: float = 30.0,
         requested_by: "str | None" = None) -> dict:
    """Run one verb through the @daemon and return its `output`.

    Raises LaresDaemonUnreachable when no daemon holds the socket, and LaresVerbError when the daemon
    ran the verb and it failed. NEITHER falls back to opening a store: a fallback would put a second
    writer on the palace — the one thing this wire stands to prevent.
    """
    path = socket_path()
    if not os.path.exists(path):
        raise LaresDaemonUnreachable(f"no lares daemon at {path} — start one with `lares vessel stand --foreground`")

    line = json.dumps({
        "verb": verb,
        "args": args or {},
        "requestedBy": requested_by or operator_did(),
    }) + "\n"

    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        try:
            s.connect(path)
        except (ConnectionRefusedError, FileNotFoundError) as e:
            raise LaresDaemonUnreachable(f"lares daemon not answering at {path}: {e}") from e
        s.sendall(line.encode())
        buf = b""
        while b"\n" not in buf:
            chunk = s.recv(65536)
            if not chunk:
                raise LaresDaemonUnreachable("daemon closed the socket without an outcome line")
            buf += chunk
    finally:
        s.close()

    out = json.loads(buf.split(b"\n", 1)[0].decode())
    if out.get("status") == "error":
        raise LaresVerbError(out.get("errorMessage") or f"verb {verb!r} failed")
    return out


def output(verb: str, args: "dict | None" = None, **kw) -> dict:
    """`call` unwrapped to the verb's own payload.

    The daemon returns a RECEIPT, not a bare value: `{status, requestId, results: {summary: {ok,
    output}}}`. The receipt carries the durable record (it lands at @daemon/outcomes/<id>); `output` carries
    what the verb actually computed. Callers want the latter, so the envelope peels HERE — once — rather
    than in every caller, each reaching through four keys and each getting it subtly wrong.
    """
    out = call(verb, args, **kw)
    summary = ((out.get("results") or {}).get("summary")) or {}
    if summary.get("ok") is False:
        raise LaresVerbError(str(summary.get("error") or f"verb {verb!r} failed"))
    payload = summary.get("output")
    return payload if isinstance(payload, dict) else out


if __name__ == "__main__":  # a probe: `python lares_uds.py recall '{"query":"x","limit":2}'`
    import sys

    verb = sys.argv[1] if len(sys.argv) > 1 else "recall"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    try:
        print(json.dumps(output(verb, a), indent=1)[:2000])
    except (LaresDaemonUnreachable, LaresVerbError) as e:
        print(f"{type(e).__name__}: {e}", file=sys.stderr)
        raise SystemExit(1)
