"""lares_mcp — the /mcp surface mirroring the `lares` CLI (ISOMORPHIC verb parity: CLI commands <-> MCP
tools, one verb-ontology across two surfaces). A fresh py FastMCP server routing to the lares house's own
py sensorium backend (capture_session · content_io · worldline_io). The coordinator-seat ruling: the MCP
verb-surface lives py; the TS @daemon supervises the fleet + keeps the surface-wiring. The vendored
mempalace mcp_server.py stays for the upstream nakama on their causal island — this serves the lares house.

The isomorphism lives in `LaresCoordinator` (the verb-router both surfaces call); the CLI commands and the
MCP tools stay thin skins over it, each verb named the same on both — harvest · recall · status · worldline
· kapae · un_kapae (Phase-6a lifecycle floor; the extensions declare/attach/reconcile/release/daydream/
deep-dream + the HITL/HOTL grid ride in at 6b).

Meme: lar:///ha.ka.ba/@lararium/sensorium/lares-mcp (the isomorphic surface).
"""
from __future__ import annotations

import content_io as cio
import worldline_io as wl
from capture_session import drive_capture
from embed_cap import make_embed_cap

# The lifecycle-floor verbs the MCP surface mirrors from the `lares` CLI. Each name reads identically on
# both surfaces (the isomorphism contract); a parity test asserts the two sets agree.
LIFECYCLE_VERBS = ("harvest", "recall", "status", "worldline", "kapae", "un_kapae")

# The reversibility×trust GRID: each verb declares (reversible, trust_crossing). The seat follows —
# HOTL (reversible AND trusted) runs on the operator's loop, no pause; HITL (irreversible OR trust-
# crossing) blocks for the operator's hand. One grid across both surfaces (CLI + MCP). The @daemon holds
# the LaresCoordinator cap in its wiki-island VM worker; it reads a verb's seat and grants the operator-
# authorized approval capability an HITL verb needs (capability-based — the @daemon is the cap-holder).
VERB_SEATS = {
    "harvest": (True, False),    # append-only capture — reversible (an edit rides kapae), trusted
    "recall": (True, False),     # read — reversible, trusted
    "status": (True, False),     # read — reversible, trusted
    "worldline": (True, False),  # read — reversible, trusted
    "kapae": (True, False),      # move-not-delete mute — reversible, trusted
    "un_kapae": (True, False),   # restore — reversible, trusted
    # 6b control verbs — the SEAT stands now; execution rides in after the HITL talk-story locks.
    "purge": (False, False),     # HARD-delete — IRREVERSIBLE → HITL
    "attach": (True, True),      # admit a guest sensorium — TRUST-CROSSING → HITL
}


def seat_of(verb: str) -> str:
    """HOTL when a verb runs reversible AND trusted; HITL (needs the operator's hand) when it turns
    irreversible OR crosses a trust boundary."""
    reversible, trust_crossing = VERB_SEATS[verb]
    return "HOTL" if (reversible and not trust_crossing) else "HITL"


def guard_hitl(verb: str, approval=None) -> None:
    """Gate a verb by its seat: a HOTL verb passes freely; an HITL verb needs a truthy operator-approval
    capability (the @daemon grants it out-of-band). Raise when an HITL verb rides without one."""
    if seat_of(verb) == "HITL" and not approval:
        why = "irreversible" if not VERB_SEATS[verb][0] else "trust-crossing"
        raise PermissionError(f"{verb} sits HITL ({why}) — an operator-approval capability is required; "
                              "the @daemon grants it out-of-band. A reversible verb (e.g. kapae) needs none.")


class LaresCoordinator:
    """The verb-router BOTH surfaces (CLI + MCP) call — it holds a warm embedder + a content-store and a
    worldline handle on ONE sensorium palace, and drives the capture engine. Naming each method for its
    CLI verb keeps the isomorphism honest; the surfaces stay thin skins."""

    def __init__(self, palace_path: str, *, wing: str = "wing_default", embed_factory=None) -> None:
        self._palace = palace_path
        self._wing = wing
        embed_factory = embed_factory or make_embed_cap
        self._embed_one, self._model = embed_factory()
        self._dim = len(self._embed_one("probe"))           # pin the width off the warm cap
        self._content = cio.ContentStore(palace_path, expected_dim=self._dim, expected_model=self._model)
        self._worldline = wl.WorldlineStore(palace_path)

    def harvest(self, surface: str, pointer: str, *, wing: "str | None" = None,
                room: str = "conversations") -> dict:
        """Capture a surface's transcript into the Memory sensorium (mirrors `lares harvest`). Idempotent
        re-derivation — a re-run lands only the un-landed tail (the crash-cure)."""
        return drive_capture(self._palace, surface, pointer, wing=wing or self._wing, room=room,
                             embed_factory=lambda: (self._embed_one, self._model))

    def recall(self, query: str, k: int = 8) -> dict:
        """Recall the nearest turns to a query (mirrors `lares recall`); kapae-muted turns stay excluded."""
        return self._content.search(self._embed_one(query), k)

    def status(self) -> dict:
        """What the sensorium holds — the taxonomy over the palace (mirrors `lares status`)."""
        return self._content.taxonomy()

    def worldline(self, as_of=None) -> dict:
        """The fork-DAG rhizome (mirrors `lares worldline`)."""
        return self._worldline.dag(as_of=as_of)

    def kapae(self, branch: str, tick) -> dict:
        """Mute a worldline branch + cascade the mute across the sensorium (mirrors `lares worldline kapae`).
        Reversible — un_kapae restores; move-not-delete throughout."""
        return wl.cascade_kapae(self._worldline, [self._content], branch, tick)

    def un_kapae(self, branch: str, tick) -> dict:
        """Restore a muted branch across the sensorium (mirrors `lares worldline un-kapae`)."""
        return wl.cascade_un_kapae(self._worldline, [self._content], branch, tick)


def build_mcp(coordinator: LaresCoordinator):
    """Wrap the coordinator in a FastMCP server — one @tool per lifecycle verb, each a thin skin that
    routes straight to the coordinator (the isomorphism holds because both surfaces share it)."""
    from mcp.server.fastmcp import FastMCP

    mcp = FastMCP("lares")

    @mcp.tool()
    def harvest(surface: str, pointer: str, wing: "str | None" = None) -> dict:
        """Capture a surface's transcript (claude/codex/copilot) into the Memory sensorium."""
        return coordinator.harvest(surface, pointer, wing=wing)

    @mcp.tool()
    def recall(query: str, k: int = 8) -> dict:
        """Recall the nearest turns to a query from the Memory sensorium."""
        return coordinator.recall(query, k)

    @mcp.tool()
    def status() -> dict:
        """Report what the sensorium holds (the taxonomy)."""
        return coordinator.status()

    @mcp.tool()
    def worldline() -> dict:
        """Render the fork-DAG rhizome of turns."""
        return coordinator.worldline()

    @mcp.tool()
    def kapae(branch: str, tick: int) -> dict:
        """Mute a worldline branch (a fork-path-dead-end) + cascade the mute across the sensorium."""
        return coordinator.kapae(branch, tick)

    @mcp.tool()
    def un_kapae(branch: str, tick: int) -> dict:
        """Restore a previously kapae-muted branch across the sensorium."""
        return coordinator.un_kapae(branch, tick)

    return mcp


def main() -> None:
    import argparse

    ap = argparse.ArgumentParser(description="lares_mcp — the isomorphic /mcp surface over the lares sensorium")
    ap.add_argument("--palace", required=True, help="the sensorium palace dir this surface serves")
    ap.add_argument("--wing", default="wing_default", help="the default wing for captures lacking one")
    args = ap.parse_args()
    build_mcp(LaresCoordinator(args.palace, wing=args.wing)).run()   # stdio MCP serve


if __name__ == "__main__":
    main()
