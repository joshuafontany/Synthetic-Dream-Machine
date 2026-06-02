> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# TiddlyWiki Filter Language — Direct-Import Boundary

Status date: **April 23, 2026**
Source of truth: `packages/lares-core/memes/api/v0.1/grammars/tiddlywiki-filter.md`
Grammar key: `x-tiddlywiki-filter`

Deliverable for: `MCP-TASK-013`

---

## Boundary statement

TiddlyWiki Filter Language enters the Lararium as a **guest grammar**, not as a constitutional center.
It enters only through bounded `hana` worksites.
Full TiddlyWiki runtime boot, UI semantics, storage semantics, and render DOM are **out of scope for v1**.

---

## What enters — v1 import surface

| Surface | In scope | Notes |
|---|---|---|
| Grammar key `x-tiddlywiki-filter` | yes | registered as the first imported function-sigil grammar |
| `hana` worksite admission via `grammar = "x-tiddlywiki-filter"` | yes | only admitted inside bounded `hana` blocks |
| Boot feature set (see below) | yes | minimum preserved family for lawful boot profile |
| Host term translation (tiddler → sigil, currentTiddler → +currentMeme) | yes | deterministic, not stylistic |
| AST node preserving guest body, priming, and source span | yes | one node per admitted `hana` region |
| Degradation posture: no-op or empty-set + one boundary warning | yes | malformed input degrades locally |
| `tiddlywiki5` submodule as fixture and comparison corpus | yes | source grammar, parse-tree examples, boot comparison |
| `text → parse tree → widget tree → DOM` as architectural comparison pattern | yes | comparative reference for Lararium AST / execution-graph design |

---

## What stays out — v1 exclusions

| Surface | Out of scope | Reason |
|---|---|---|
| Full TiddlyWiki runtime import as constitutional center | no | Lararium keeps its own graph, metaphysics, and hydration law |
| Full TiddlyWiki UI, storage, and render semantics | no | not in v1 scope |
| Full parser implementation of every function sigil | no | boot feature set, not exhaustive completeness |
| TiddlyWiki authn/authz `operator` vocabulary | no | `operator` reserved for authn/authz in this host; use "function sigil" |
| Ambient guest body execution outside `hana` | no | guest body stays bounded |

---

## Boot feature set

A lawful `x-tiddlywiki-filter` boot profile preserves at least:

- all-sigils traversal
- relation queries against the current Sigil (`+currentMeme`)
- tag-based filtering
- field or metadata extraction
- list or hierarchy access through explicit fields
- negative filtering: exclusion of the active Sigil or system objects

Full legality and completeness of individual function sigils remain parser territory.
This boundary names the preserved boot family only.

---

## Lawful admission pattern

```text
<<~ hana #work >>
```toml
grammar = "x-tiddlywiki-filter"
context = "+currentMeme"
profile = "canonical"
degrade = "no-op"
result-shape = "set"
```

[all[sigils]links:to[+currentMeme]]
<<~/hana >>
```

A lawful boot profile names `grammar`, `context`, and `degrade` explicitly.
The guest filter body stays inside the `hana` worksite and does not execute ambiently.

---

## Lowering contract

A lawful `x-tiddlywiki-filter` region lowers into at least:

1. one surface `hana` region tagged `grammar = "x-tiddlywiki-filter"`
2. one AST node preserving guest body text, local priming, and source span
3. one widget or render seed preserving result-shape intent
4. one trace path from result or residue back to the admitted guest region

Surface, AST, widget/execution, and landed output stay distinct.
The imported grammar does not force the render target to become the constitutional center.

---

## `tiddlywiki5` submodule role

| Submodule use | Role in v1 |
|---|---|
| Filter Language source files and grammar spec | fixture and reference |
| Parse-node and module family inventory | input for AST envelope mapping (MCP-TASK-016) |
| Self-booting graph comparison | architectural comparison for boot closure design |
| `text → parse tree → widget tree → DOM` stack | main comparative pattern for Lararium `source → AST → execution → render` |

The submodule does **not** run as a live runtime inside the MCP server.
Its role stays at corpus and fixture level.

---

## Residue

- Full AST envelope mapping for guest grammar nodes is SPRINT-01 work (MCP-TASK-016).
- Parser implementation beyond boot feature set is post-v1.
- Full widget lifecycle for filter results lives in execution-graph contract (MCP-TASK-017).
