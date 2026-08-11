#!/usr/bin/env bash
# surface-parity-witness — every MCP tool answers to a CLI door, and neither surface enumerates the other.
#
# ── THE INVARIANT ───────────────────────────────────────────────────────────────────────────────
# The MCP seat and the CLI reach the same vessel, so a tool an agent may call and an operator may not is a
# surface the operator cannot audit by hand. Every MCP tool therefore answers to a CLI door — as its own
# verb, or as a sub-verb of one.
#
# The converse does NOT hold, and that asymmetry is the ruling rather than a gap. The CLI carries the
# KEY-HOLDING ceremonies — founding, persona minting, the charter quorum, the vault beyond a status read,
# the raise. MCP speaks stdio-per-client, so N sessions run N processes; handing that surface a signing
# verb would put N unsynchronised holders on one operator's keys. The operator's hand keeps those.
#
# ── WHY THIS WITNESS EXISTS AT ALL ──────────────────────────────────────────────────────────────
# Both descriptions of the MCP surface had drifted, each in the same direction: `mcp-resolve.ts` named
# nine verbs and `mcp-tool-registry.mem` named ten, while the live surface carried THIRTY. A hand-written
# list cannot notice what it missed, and both lists read as authoritative to anyone who found them. So the
# count is DERIVED here and nowhere transcribed.
#
# Exit 0 = every MCP tool has a CLI door.
set -uo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import pathlib, re, subprocess, sys

MCP = pathlib.Path("packages/lararium-sensorium/scripts/lares_mcp.py")
CLI = pathlib.Path("packages/lares-cli/dist/src/bin/lares.js")

if not MCP.exists():
    print(f"[surface-parity] no MCP surface at {MCP} — nothing to compare"); sys.exit(0)
if not CLI.exists():
    print(f"[surface-parity] no built CLI at {CLI} — run `pnpm build` first"); sys.exit(1)

tools = [t.replace("_", "-") for t in
         re.findall(r'@mcp\.tool\(\)\s*\n\s*(?:async )?def (\w+)', MCP.read_text())]

# The CLI's own answer, never a transcription of it: the top-level listing, plus each parent verb's own
# help. A door counts whether it stands at the top or one level in.
top = subprocess.run(["node", str(CLI), "help"], capture_output=True, text=True).stdout
doors = set(re.findall(r'^\s+(?:\S\s+)?([a-z][a-z0-9-]*)\s{2,}\S', top, re.M))

# THE SUB-VERB MAP COMES FROM SOURCE, NEVER FROM INVOKING ANYTHING. A first draft discovered sub-verbs by
# running each parent verb with no arguments — which is both slow and RECKLESS: `wake`, `regenesis` and
# `reset` are not questions, and a witness that mutates the vessel it audits is worse than no witness.
# So the sub-verbs get read out of each command module's own dispatch instead.
CMDS = pathlib.Path("packages/lares-cli/src/commands")
subverbs: set[str] = set()
for f in CMDS.glob("*.ts"):
    text = f.read_text()
    # THREE DISPATCH SHAPES, because the CLI genuinely uses three. A witness that read only the one it
    # first met would report a door missing that stands — which is how the surface came to be described
    # wrong in the first place.
    subverbs |= set(re.findall(r'case\s+"([a-z][a-z0-9_-]*)"', text))                    # switch
    subverbs |= set(re.findall(r'sub\s*(?:===|!==)\s*"([a-z][a-z0-9_-]*)"', text))       # explicit compare
    subverbs |= set(re.findall(r'^\s{2,}"?([a-z][a-z0-9_-]*)"?:\s*cmd[A-Z]\w*,', text, re.M))  # verb→handler map
    # A hyphenated verb rides as a QUOTED key (`"couple-r": cmdCoupleR`) because the bare form is no
    # identifier. Reading only the bare spelling reported three standing doors missing.
subverbs = {s.replace("_", "-") for s in subverbs}

def has_door(tool: str) -> str | None:
    if tool in doors:    return "top-level"
    if tool in subverbs: return "sub-verb"
    base = tool.split("-")[0]
    if base in doors:    return f"sub-verb of `{base}`"
    return None

# AN EXEMPTION MUST STATE WHY, AND IT PRINTS EVERY RUN. A silent allow-list decays into a surface nobody
# audits; a permanently-red witness trains a reader to skip it. Both failures end the same way, so an
# exemption stays visible and carries its reason where the next reader meets it.
EXEMPT = {
    "plane-record":
        "the cross-plane witness lives py-side (`plane_query.plane_record_witness`); a CLI door has to "
        "route through the palace holder the same way MCP does, which is a build rather than a listing",
}

missing = [t for t in tools if not has_door(t) and t not in EXEMPT]
exempt  = [t for t in tools if not has_door(t) and t in EXEMPT]

print(f"[surface-parity] MCP tools: {len(tools)}   CLI doors reachable: {len(tools) - len(missing) - len(exempt)}")
for t in exempt:
    print(f"  EXEMPT  {t}")
    print(f"          {EXEMPT[t]}")
if missing:
    print("  MCP tools with NO CLI door — an agent may call what an operator cannot:")
    for t in missing: print(f"    {t}")
    sys.exit(1)
print("  every MCP tool answers to a CLI door")
PY
