# mempalace integration — operator + dev reference

Practical reference for the `lares` CLI ↔ mempalace memory integration.
Design/canon: `lar:///ha.ka.ba/@lararium/v0.1/api/mempalace-integration`.

**Two layers, one boundary.** mempalace holds verbatim session-history (drawers, behind a
causal-island boundary). The lararium maps the domain knowledge graph. Curated flat-MD
(CLAUDE.md / MEMORY.md / AGENTS.md) carries the DO/conclusions layer — left in place.
Our integration adds a declared `lar_*` metadata net over the drawers (the tensegrity)
and sweeps every harness's transcripts into per-project wings.

---

## Quick start — blank-slate refresh

```bash
rm -rf ~/.mempalace ~/.lares ~/.mempalace.bak.pre350   # palace + derived stage + stale backup
pnpm -r build                                          # CLI reflects latest (no-op if current)
lares wake --init --claude --codex --copilot --vscode  # palace up + every surface wired
lares harvest --all                                    # sweep every transcript surface → wings
# reload the editor / fresh session so the live Stop/SessionEnd hooks activate
```

On **Windows 11** swap the nukes for `Remove-Item -Recurse -Force` (the wiring underneath
already branches platform; mcp.json lands under `%APPDATA%\Code[ - Insiders]\User`).

---

## `lares wake` flags

| flag | does |
|---|---|
| `--init` | install mempalace deps (submodule + pip, venv-aware) · `mempalace init --yes --no-llm` if absent · pin **`hooks.auto_save=false`** (the re-pollution gate) · vessel standup |
| `--claude` | wire `~/.claude/settings.json` — SessionStart wake hook + Stop/SessionEnd **ingest hook** (our two-leg, NOT the submodule's `--wing sessions`) + mempalace MCP |
| `--codex` | append `[mcp_servers.mempalace]` + `[[hooks.Stop]]` to `~/.codex/config.toml` |
| `--copilot` | write `~/.copilot/mcp-config.json` (MCP) + `~/.copilot/hooks/lares.json` (sessionEnd ingest) |
| `--vscode` | register mempalace MCP (`servers` key) into every present VS Code variant's `mcp.json` — stable + Insiders, remote-server (`~/.vscode-server*/data/User`) + local (`~/.config/Code*/User`) / Win11 `%APPDATA%` |

Every flag **composes and stays idempotent** (deep-merge, back up, preserve existing config;
re-runs no-op), and degrades gracefully when its tool isn't installed.

> **Recall vs capture:** `--claude/--codex/--copilot` wire both MCP recall *and* a session
> ingest hook. `--vscode` wires recall only (MCP) — `lares harvest --all` *captures* VS Code
> editor sessions (editors fire no CLI hooks); no hook fires there.

---

## `lares harvest`

| invocation | does |
|---|---|
| `lares harvest --all [--dry-run]` | sweep **every transcript surface** → group by project wing → mine convos + write `lar_*`. Idempotent. **Transcripts only** (never curated MD). |
| `lares harvest --writeback --wing <w> [--limit N]` | enrich one wing's existing drawers with `lar_*` + hall routing. Idempotent (`lar_hv`). |
| `lares harvest <path> --wing <w> [--dry-run]` | default: read transcript turns → gradient parser → watermarked bearing index (`~/.lares/harvest/<wing>.ndjson`). |

**Sources swept by `--all`** (each drawer tagged `lar_surface`):

| surface | store | routing | format |
|---|---|---|---|
| `claude` | `~/.claude/projects/<enc>/*.jsonl` (CLI + VS Code ext) | `cwd` field | native |
| `codex` | `~/.codex/sessions/**/rollout-*.jsonl` (CLI + VS Code ChatGPT ext) | `session_meta.payload.cwd` | native |
| `copilot-vscode` | `…/workspaceStorage/<hash>/GitHub.copilot-chat/transcripts/*.jsonl` (all variants) | path-scrape (no cwd) | normalize → Claude-shape |
| `copilot-cli` | `~/.copilot/session-state/<id>/events.jsonl` | path-scrape | normalize → Claude-shape |

Each entry stages into `~/.lares/harvest-stage/<wing>/<surface>__<file>` (stable path →
mempalace `source_file` dedup → idempotent; the prefix → `lar_surface`).

> **Run `--all` on a FRESH palace.** Existing drawers mined from an older stage path would
> duplicate (different `source_file`). The blank-slate flow handles this.

---

## The `lar_*` schema (declared in `mempalace_source_lares`)

`lar_hv` (version gate) · `lar_surface` (origin harness) · `lar_band` · `lar_bearing_conf`
· `lar_sigils` · `lar_water` · `lar_aim` · `lar_yield` · `lar_voices` · `lar_confidence`
· `lar_drift` · `lar_hall`. All flat scalars (chroma's constraint); declared + validated +
adapter-stamped on every write (RFC-002 contract — declared, not smuggled).

Bumping the enrichment logic ⇒ bump `lar_hv` in **lockstep**:
`harvest.ts buildPatch` and `drawer_io.py HARVEST_VERSION`. The next `--writeback`/`--all`
re-enriches exactly the stale drawers (Kappa upgrade gate). *Current: 3.*

---

## File map

| file | role |
|---|---|
| `packages/lararium-mesh/src/turn-harvest.ts` | the sovereign gradient parser (island grammar; isomorphic; the one `enrich()`) |
| `packages/lares-cli/src/commands/harvest.ts` | `lares harvest` — `--all` multi-source sweep, `--writeback`, default bearing index |
| `packages/lararium-mempalace/scripts/drawer_io.py` | substrate boundary I/O — export drawers / apply `lar_*` patches (validates + stamps) |
| `packages/lararium-mempalace/mempalace_source_lares/` | the declared schema (RFC-002 `BaseSourceAdapter`) |
| `packages/lararium-mempalace/scripts/copilot_normalize.py` | Copilot `events.jsonl` → Claude-shaped jsonl |
| `packages/lares-cli/.claude-plugin/hooks/lares-mempalace-ingest-hook.sh` | the live two-leg hook (mine + writeback), harness-aware + surface-prefixing |
| `packages/lares-cli/src/{claude,codex,copilot,vscode}-wire.ts` | per-harness MCP + hook wiring |
| `packages/lares-cli/src/setup-mempalace.ts` | `--init` palace setup (init + `auto_save=false`) |

---

## Verify

```bash
mempalace status                                        # wings + drawer counts
lares harvest --all --dry-run                           # discovery + wing routing, no writes
# lar_surface distribution on a wing:
python3 -c "from mempalace.palace import get_collection;import os,collections;\
c=get_collection(os.path.expanduser('~/.mempalace/palace'),_skip_identity_check=True);\
g=c.get(where={'wing':'wing_synthetic_dream_machine'},include=['metadatas']);\
print(collections.Counter(m.get('lar_surface') for m in g['metadatas']))"
```

Recall: in any wired harness, query the mempalace MCP (`mempalace_search`, filter by
`wing`/`lar_surface`) or run `mempalace search "<query>" --wing <w>`.
