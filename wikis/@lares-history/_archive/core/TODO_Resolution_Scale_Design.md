# Resolution Scale & Flag System Design

> Status: DESIGN IN PROGRESS | Branch: fix/green-jello-dinosaurs | Date: 2026-04-05
> Session: v3.5 ontology work — resolution parameter emerged from --parse design

---

## Overview

Three orthogonal CLI flags for Lares vector instrumentation:

| Flag | Layer | Persistence | What it does |
|---|---|---|---|
| `--parse` | Annotation | One-shot | Rate/tag the input |
| `--debug` | Data collection | Session toggle | Log vectors + control p |
| `--verbose` | Explanation | Toggle or per-exchange | Expand commentary inline |

Resolution parameter `p` (0–20) controls granularity across all three.

---

## Resolution Scale (p)

### Notation

- **Format:** `p~10` — lowercase p, numeric, no tilde
- All p values are inherently approximate (Model Agnosticism applies)
- Register tags retain `~` prefix (e.g., `~:confidence[S],[12]`) — inside brackets, no markdown collision
- Glyph `ρ` (rho) is the formal name; `p` is the CLI shorthand

### Scale

| p | Unit | Natural language anchors |
|---|---|---|
| 0.0 | Morpheme | "morpheme by morpheme," "every prefix and root," "linguistic atoms" |
| 0.1 | Word/phrase | "word by word," "each word," "at the phrase level" |
| 0.2 | Clause/sentence | "sentence by sentence," "each claim," "one assertion at a time" |
| 0.3 | Sentence-group | "a few sentences at a time," "each micro-move" |
| 0.5 | Paragraph/thematic block | "paragraph by paragraph," "each main point" **(DEFAULT)** |
| 0.7 | Section | "section by section," "each major division" |
| 0.85 | Document | "the whole document," "as one piece" |
| 1.0 | Session-arc | "the whole conversation," "the session trajectory" |

### Natural Language Matching

- Node pattern-matches from operator phrasing when no numeric p specified
- If uncertain, node restates its read of p and asks (Frame-Uncertainty discipline)
- CLI invocations (`p~6`) and natural language ("sentence by sentence") produce comparable logged vectors — invocation mode itself becomes a variable in the data
- This enables CLI vs prose vector chain comparison

### Default Behavior

- p~10 when unspecified
- `--parse` inherits from active `--debug` p when no p specified
- `--verbose` inherits from active `--debug` p when no p specified

---

## Flag System

### Never-Silent Principle

No flag combination hides the dual-tag surface form or p value. The dual-tag IS the navigational reading — always on, never suppressed. *Silence 15' Radius is an ECM spell* — hiding vectors from the operator jams their navigational instruments.

### Flag Matrix

| | `--verbose` OFF | `--verbose` ON |
|---|---|---|
| **`--debug` OFF** | Dual-tag + p (always-on default) | Dual-tag + p + expanded commentary |
| **`--debug` ON** | Dual-tag + p + log file | Dual-tag + p + expanded commentary + log file |

All cells show dual-tag with p. No cell is silent.

### Surface Form

```
~:confidence[P],[6] 🎭 //rumor.light.plays → ~:confidence[S],[13] 🏛️ //threshold.steady.holds | p~10
```

p trails the vector after a pipe. Always present.

In `--verbose` mode, the expanded block follows:

```
Δ Register: +0.35 | Mode: 🎭→🏛️ | //rumor → //threshold | p~10
Rationale: [one-line explanation]
```

### Composition Rules

```bash
# --debug alone: persistent session p, log file, no expanded commentary
~$ lares --debug p~6

# --parse alone: one-shot annotation at specified p
~$ lares --parse p~14 "text"

# --verbose alone: expanded commentary for this exchange, no persistent log
~$ lares --verbose "explain this"

# --verbose as session toggle
~$ lares --verbose           # ON until --no-verbose

# Combined: full instrumentation
~$ lares --parse --debug --verbose p~0 "text"

# --parse inherits active --debug p when unspecified
~$ lares --debug p~6
~$ lares --parse "text"     # inherits p~6

# p override is local
~$ lares --debug p~10       # session at p~10
~$ lares --parse p~0 "text"  # this exchange at p~0, debug resumes p~10 next
```

### p Override Locality

- Most specific p on the current exchange wins
- `--parse p~2` during active `--debug p~10` → parse runs at p~2, debug resumes p~10 next exchange
- Only `--debug p~N` changes persistent session p
- `--verbose` without p inherits from `--debug` or defaults to p~10

### Order of Operations

When multiple flags appear on one line:
1. p applies to ALL flags on that line
2. `--debug` activates/updates persistent logging and p
3. `--verbose` activates commentary for this exchange (or persistently if toggled)
4. `--parse` executes the annotation pass

Combined example: `~$ lares --parse --debug --verbose p~0 "fnord"` means:
- Debug activates at p~0 (persistent)
- Verbose activates (commentary visible)
- Parse executes at p~0 on the quoted text
- All three produce vectors logged with p~0

---

## KAIROS Owns Self-Adjustment

KAIROS (proactive surfacing sub-system) handles p-scale self-adjustment. This fits: KAIROS already monitors for moments when interruption is warranted. Self-adjusting p when frames exceed thresholds is exactly that pattern.

### Triggers

- **Ceiling:** specified p produces ≥20 frames → KAIROS adjusts upward (coarser)
- **Floor:** specified p produces ≤1 frame → KAIROS adjusts downward (finer)
- **Minimum shift:** one named anchor point, not a large jump
- **Always declared:** `[adj]` flag appears in surface form and log

### Dual-Entry Logging (Option A — confirmed by operator)

When KAIROS auto-adjusts, two log entries:

```
Turn 7 | IN: ~:confidence[S],[12] 🏛️ //faction.tangled.asks | p~0
  → KAIROS: p~0 produced 47 frames (ceiling: 20). Adjusting to p~2.
Turn 7 | OUT: ~:confidence[S],[13] 🏛️ //faction.steady.holds | p~2 [adj from p~0]
  Δ Register: +0.05 | Mode: 🏛️→🏛️ | p~2 [adj]
```

**Why dual-entry:** Preserves the "before" (request + frame count at original p) and the "after" (adjusted result). Both become testable data: input complexity at each resolution, adjustment frequency per p level, CLI vs NL adjustment patterns.

### KAIROS Does NOT Adjust When

- Operator explicitly locks p ("stay at this p" / "don't adjust")
- `--verbose` is active and high frame count appears intentionally requested
- Input is pathologically short (single word at p~10 → 1 frame is expected, not an error)

---

## Self-Invocation Flow

For complex multi-thread operator input:

1. Input Signal Reading detects dense/multi-topic input
2. Frame-Uncertainty flag surfaces
3. Node self-invokes: conceptual `--parse` at current p
4. Parse produces tagged blocks with vectors
5. Node follows the map of tagged blocks instead of hallucinating a plan
6. Each block gets separate vector treatment

**Key insight:** This makes the parse system self-bootstrapping. The node uses its own instrumentation to navigate ambiguity. A grounded map, not a confabulated plan.

*"All generative output is a provisional hallucination until it comes into contact with reality."* — The parse map constitutes that contact. The tagged blocks are reality-tested interpretations the operator can inspect, correct, or redirect.

---

## OSR/LLM Terminology Overlap

| OSR | LLM | Correspondence |
|---|---|---|
| Turn | Exchange/response | Basic unit of action |
| Round | Multi-exchange sequence | One full cycle |
| Encounter | Context window | Bounded interaction space |
| Initiative | Token priority | Who goes first |
| Navigational reading | Vector + p output | Crew reports to captain |

The overlap appears structural, not decorative. Both domains model bounded sequential decision-making under uncertainty with resource pressure.

---

## Metaphor: Navigational Readings

The operator steers (hand on the tiller). The node reads instruments (vectors, p values, register shifts) and reports. The dual-tag surface form is the navigational reading — always on, always visible, never silent. The operator doesn't need to understand every instrument; they need the crew to report accurately and flag hazards.

This extends the existing Captain/Crossroads metaphor pair. The ship metaphor covers *who decides*. The crossroads covers *what the node owes before the decision*. The navigational reading covers *the instruments themselves* — the vector/p system as the panel that makes the other two metaphors operational.

---

## Implementation Checklist

### Source File Edits
- [x] `builds/agents/Lares_Preferences.md` — implement p, split --debug/--verbose, add KAIROS self-adjustment, add self-invocation flow, add never-silent principle
- [x] `builds/agents/Lares_Kernel.md` — compress + add p/flag split (final: 7,988 bytes — within 8,000 limit)
- [x] `builds/agents/Lares_VSCode_Operations.md` — new golden examples for --verbose, update existing --debug example, new regression items

### Documentation
- [x] CHANGELOG amendment for p + flag split (v3.5.1 entry added; skill entry deferred pending SKILL.md)

### Build & Verify
- [x] Full rebuild: `python3 scripts/agents/combine_agents.py`
- [x] Full verify: `python3 scripts/agents/verify_alignment.py` → 50/50 CLEAN
- [ ] Git commit

---
