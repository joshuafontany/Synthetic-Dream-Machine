<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/local-clients >>
```toml iam
file-path       = "bags/@lares/v0.1/docs/lararium_mcp/local-clients.md"
mana            = 16
manao           = 16
manaoio         = 16
register        = "Synthesis-Canon"
role            = "canonical local client exposure contract for Lararium MCP"
source-consumes = ["packages/lares-core/memes/docs/mcp/sprints/SPRINT-02_LOCAL_CLIENTS.md", "packages/lares-core/memes/docs/mcp/stories/MCP-STORY-202_HYDRATION_PROMPTS.md", "packages/lares-core/memes/docs/mcp/stories/MCP-STORY-203_PORTABILITY_TOOLS.md", "packages/lares-core/memes/docs/mcp/stories/MCP-STORY-401_VSCODE_COPILOT.md", "packages/lares-core/memes/docs/mcp/stories/MCP-STORY-402_CLAUDE_CODE.md", "packages/lares-core/memes/docs/mcp/stories/MCP-STORY-403_CODEX.md"]
status-date     = "2026-04-23"
tags      = ["api/pono/meme", "api/pono/loci"]
tagspace        = "stable"
type            = "text/x-memetic-wikitext"
uri-path        = "ha.ka.ba/@lares/v0.1/docs/lararium_mcp/local-clients"
```

<<~ ahu #ooda-ha >>

✶ observe: Sprint-02 closed the local surfaces across resources, prompts, tools, and client configs.
⏿ orient: rich clients may prefer prompts/resources; tool-centric clients need equivalent read-only calls.
◇ decide: local client law should name the shared command and each workspace config surface.
▶ act: preserve the prompt catalog, tool façade, and VS Code / Claude Code / Codex wiring here.
↺ verify: prompt names use the `lararium-` dash convention, matching tools; adapt: remote examples remain Sprint-03 residue even though local Codex config closed.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #server-start >>

## Server Start

Canonical local command:

```bash
python3 -m lares.lararium_mcp
```

The server reads newline-delimited JSON-RPC on stdin and writes responses on stdout.
Repo root must sit on `PYTHONPATH`; module invocation satisfies that in normal local runs.
No external package dependency enters the core server.

<<~/ahu >>

<<~ ahu #client-wiring >>

## Client Wiring

| Client | Config surface | Scope | Reading |
|---|---|---|---|
| VS Code / Copilot | `.vscode/mcp.json` | workspace | auto-loads workspace-scoped `lararium` server in compatible VS Code builds |
| Claude Code | `.mcp.json` | project | loads local/project `lararium` server on session start |
| Codex | `.codex/config.toml` | local repo session | declares Lararium as an MCP server for Codex sessions |

All three use the same stdio command and read-only server behavior.

<<~/ahu >>

<<~ ahu #prompt-catalog >>

## Hydration Prompt Catalog

| Prompt | Arguments | Payload |
|---|---|---|
| `lararium-boot_minimal` | none | 14-locus required-core boot artifact |
| `lararium-hydrate_full` | none | full carrier closure summary |
| `lararium-boot_receipt` | none | sha256 boot receipt |
| `lararium-resolve_uri` | `uri` required | resolution record plus carrier metadata |
| `lararium-read_carrier` | `uri` required | raw carrier source text |
| `lararium-compare_hydration` | none | minimal/full comparison |

Prompt names use dash after `lararium` because MCP names here follow the same convention as tools.

<<~/ahu >>

<<~ ahu #tool-facade >>

## Read-Only Tool Façade

| Tool | Purpose |
|---|---|
| `lararium-resolve_lar_uri` | resolve a `lar:///` URI into a resolution record |
| `lararium-read_lar_resource` | read file-backed or virtual resource text |
| `lararium-list_lar_resources` | list all file-backed and virtual resources |
| `lararium-inspect_carrier` | report metadata, interface bundle, diagnostics, and depth state |
| `lararium-compile_minimal_boot` | compile required-core closure artifact |
| `lararium-compile_full_boot` | compile required-core plus indexed carriers |
| `lararium-compile_boot_receipt` | compile sha256 receipt for minimal boot |

Tool annotations: `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`.

<<~/ahu >>

<<~ ahu #closed-sprint-02 >>

## Sprint-02 Exit Markers Preserved

- hydration prompts exposed in `lares/lararium_mcp/prompts.py`
- prompt naming aligned to `lararium-` dash convention
- read-only tool façade exposed in `lares/lararium_mcp/tools.py`
- Claude Code local/project scope wired via `.mcp.json`
- VS Code / Copilot path documented and wired
- Codex local config documented and wired
- submodule adapter layer contract closed beyond original sprint scope
- story Status fields reconciled with backlog truth

<<~/ahu >>

<<~ ahu #residue >>

## Residue

- Remote Codex examples remain active Sprint-03 work.
- HTTP/SSE transport requires auth, scope, approval, and eval posture first.
- Clients with partial MCP support should call the read-only tools rather than receive weaker semantics.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/hydration >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
