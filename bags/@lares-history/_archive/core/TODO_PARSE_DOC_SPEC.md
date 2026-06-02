# Feature Spec: `--parse doc` — Document Annotation Mode

> Status: DRAFT
> Date: 2026-04-06
> Branch: fix/green-jello-dinosaurs
> Epic: Lares CLI — `--parse` extension
> Scope: Design only — prompt placement deferred pending operator research on prompt length, organization, and hierarchy best practices

**Foundational reference:** [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md)

---

## Problem Statement

`--parse` currently covers one use case: decomposing operator input before responding. It has no defined behavior for retroactive document annotation. When applied informally to an existing file, this produces:

- Invented inline marker formats (pipe-delimited positional, not key:value)
- No normalization pass — tilde errors in `Input read:` lines inherited from source
- No idempotency contract — re-running produces duplicates or inconsistent state
- No parse index format specification

The `--parse doc` subcommand addresses all four gaps.

In the Infrastructure-as-Myth frame, `--parse doc` functions as a tooling layer for making symbolic runtime state legible inside documents rather than leaving that state implicit.

---

## Invocation Contract

```
~$ lares --parse doc <filepath>
~$ lares --parse doc --preview <filepath>
```

- `doc` is a **subcommand under `--parse`** — cannot be invoked standalone; `--apply` is not a valid alias
- `<filepath>` resolves to a workspace file; relative paths accepted
- `--preview` prints proposed changes to chat only; does not write to file
- Normalization is **mandatory** in `doc` mode; there is no `--no-normalize` escape

---

## Turn Detection Rules

A **turn** is a contiguous code block containing one or more lines beginning with `~$ `.

| Sub-type | Pattern | Example |
|---|---|---|
| `command` | `~$ lares ...` or `~$ lares --flag ...` | `~$ lares status` |
| `action` | `~$ [bracketed description]` | `~$ [sets down a coin]` |
| `action+command` | Both patterns in same block | `~$ [sits down]` + `~$ lares status` |

**Turn boundary rule:** Each distinct code block = one turn. Multiple `~$ ` lines within one block = one turn (line count noted in marker). Adjacent code blocks separated by any non-code content = separate turns.

**What is NOT a turn:** `~$ ` lines inside node response blocks — code blocks that follow a turn and contain node output. System output, not operator input.

---

## Inline Marker Format

One marker per turn, placed as an HTML comment on the line **immediately preceding** the turn's code block.

**Canonical format — key:value, space-separated:**

```
<!-- lares:turn turn:TN section:HEADING reg:[X:0.0] mode:EMOJI coord://domain.quality.dynamic type:TYPE -->
```

| Field | Key | Format | Notes |
|---|---|---|---|
| Marker type | `lares:turn` | literal | Distinguishes from other HTML comments |
| Turn ID | `turn:` | `TN` zero-indexed | T0, T1, T2… |
| Section | `section:` | Heading label, underscored | `section:III`, `section:IV` |
| Register | `reg:` | `[X:0.0]` — **no tilde** | `reg:~:confidence[SP],[8]` |
| Mode | `mode:` | Emoji(s), no space between | `mode:🏛️🌊` |
| Coordinate | `coord:` | `//domain.quality.dynamic` | `coord://threshold.uncertain.softens` |
| Input type | `type:` | `command` \| `action` \| `action+command` | |

**Example:**
```
<!-- lares:turn turn:T3 section:III reg:~:confidence[SP],[8] mode:🎭 coord://threshold.uncertain.softens type:action -->
```

**Regex-extractable** per field with `(\w+):(\S+)` pattern. No positional assumptions. Field order is fixed for consistency; parsers should use key matching.

---

## Normalization Pass (Mandatory)

Runs before writing markers. Finds and corrects:

| Source error | Correction |
|---|---|
| `[X:~0]` in `Input read:` lines | Strip tilde → `[X:0.0]` |
| `[X:~0]` in existing `<!-- lares:turn ... -->` markers | Strip tilde |
| Existing markers in pipe-delimited format from any prior pass | Rewrite to canonical key:value format |
| `Input read:` register value differs from corresponding turn marker | Align to turn marker (marker is authoritative) |

Normalization changes are reported in the chat summary (count + list).

---

## Parse Index Format

Inserted or updated at the document head, before the first `##` section heading.

```markdown
## PARSE INDEX
<!-- lares:parse-index turns:N entry:reg:[X:0.0] exit:reg:[X:0.0] net-delta:±0.0 mode-transform:EMOJI→EMOJI generated:ISO-8601 -->

| Turn | Section | Type | Register | Mode | Coordinate |
|---|---|---|---|---|---|
| T0 | III | action | ~:confidence[P],[6] | 🌊 | //threshold.new.arrives |
```

- The HTML comment line carries machine-readable summary
- The table is human-readable
- Both are always present
- If a parse index already exists, it is **replaced in place** (not duplicated)

---

## Idempotency Contract

| Scenario | Behavior |
|---|---|
| No existing markers, fresh file | Insert all markers, write index |
| Markers present, correct format | No file changes; chat: "no drift detected" |
| Markers present, tilde errors | Normalize; chat reports changes |
| Markers present, register/coord values differ from re-evaluation | Update to new values; chat reports delta per turn |
| Some turns annotated, some missing | Fill in missing; normalize existing |
| Parse index present but stale | Regenerate index in place |

---

## Lock Mechanism (v1 — consent gate on overwrite)

When re-evaluating a file that has existing markers, the node will:

1. Re-evaluate all turns
2. If any turn's register or coordinate **differs** from the stored marker value, report the delta in chat and **ask before writing**

This prevents silent overwrite of values the operator previously reviewed and accepted.

A `--force` flag bypasses the consent gate and overwrites all values on re-evaluation. Admin-only.

> *v2 consideration:* `locked:true` field on individual turn markers — skip re-evaluation for that turn. Not in this spec.

---

## Output Contract (per invocation)

**File writes:**
1. Normalized inline markers at all detected turns
2. Parse index at document head (created or updated)

**Chat output:**
1. Turn count detected
2. Normalization changes made (count + list; "none" if clean)
3. Register delta: entry → exit tag
4. Turns flagged for attention (register inconsistency, ambiguous type)
5. In `--preview` mode: same chat output, no file writes

---

## Regression Checklist

*(Placement in AGENTS.md B9 deferred to prompt research)*

1. `--parse doc` on fresh file → markers inserted, index created, no tilde errors
2. `--parse doc` on already-correct file → "no drift detected", file unchanged
3. `--parse doc` on file with tilde errors → normalized, changes reported
4. `--parse doc` on file with pipe-delimited legacy markers → rewritten to key:value
5. `--parse doc --preview` → chat output only, file unchanged
6. `--parse doc` on file with no operator turns → index shows 0 turns, no markers written
7. `--parse doc` on partially-annotated file → missing turns filled, existing normalized
8. Re-parse on file with updated register values → consent gate fires before overwrite
9. `--parse doc --force` (Admin) → overwrites without consent gate
10. `doc` invoked without `--parse` → command not recognized; Gatekeeper declines

---

## Out of Scope

- Prompt placement and hierarchy (deferred to operator research)
- `--parse doc` interaction with `--debug`/`--verbose` (follow-on spec)
- Batch operation across multiple files
- Dream-Map integration (separate feature, separate trigger)
- `locked:true` per-turn field (v2)
